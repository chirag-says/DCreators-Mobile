// @ts-nocheck
// Supabase Edge Function: delete-account
// Deploy: supabase functions deploy delete-account
//
// Google Play requires any app that lets users create an account to offer
// account deletion from inside the app as well as from a public web page.
// This does the deleting. It needs the service role key, which must never
// reach the client, so the work happens here.
//
// The caller proves who they are with their own access token. There is no
// user_id parameter on purpose: this function can only ever act on the
// account belonging to whoever called it.
//
// WHY THIS SCRUBS RATHER THAN DROPS THE ROW
// -----------------------------------------
// `profiles.id` cascades from `auth.users`, but `payments.payer_id`,
// `reviews.reviewer_id`, `projects.client_id`, `artwork_orders.buyer_id` and
// friends all reference `profiles(id)` with no ON DELETE clause. A hard
// delete therefore raises a foreign key violation for any user who ever
// transacted, and forcing it through would delete the counterparty's
// financial history along with them. So instead:
//
//   1. every piece of personal data is overwritten,
//   2. the login is permanently disabled and the email freed for reuse,
//   3. the payment rows survive, pointing at a row that no longer names
//      anyone, because Indian tax law requires keeping them.
//
// The privacy policy at dcreators.in/privacy says exactly this. If you change
// the behaviour here, change that page too.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    // ── Identify the caller ────────────────────────────────────────────────
    const authHeader = req.headers.get('authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Not signed in.' }, 401);

    const asUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await asUser.auth.getUser();
    if (userErr || !user) return json({ error: 'Not signed in.' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const uid = user.id;

    // ── Refuse while a deal is in flight ───────────────────────────────────
    // A half-finished project has an unpaid consultant or an undelivered
    // client on the other side of it. Vanishing mid-project would strand
    // them, so the user is asked to settle up first.
    const { data: openProjects, error: projErr } = await admin
      .from('projects')
      .select('id')
      .or(`client_id.eq.${uid},consultant_id.eq.${uid}`)
      .not('status', 'in', '("completed","cancelled","draft")')
      .limit(1);
    if (projErr) return json({ error: projErr.message }, 500);
    if (openProjects?.length) {
      return json({
        error: 'You have a project still in progress. Please complete or cancel it before deleting your account.',
      }, 409);
    }

    const { data: openOrders, error: orderErr } = await admin
      .from('artwork_orders')
      .select('id')
      .or(`buyer_id.eq.${uid},artist_id.eq.${uid}`)
      .not('status', 'in', '("completed","cancelled","declined")')
      .limit(1);
    if (orderErr) return json({ error: orderErr.message }, 500);
    if (openOrders?.length) {
      return json({
        error: 'You have an artwork order still in progress. Please complete or cancel it before deleting your account.',
      }, 409);
    }

    // ── Scrub ──────────────────────────────────────────────────────────────
    const tombstone = `deleted-${uid.slice(0, 8)}`;

    // Content that is purely the user's own and names them.
    await admin.from('notifications').delete().eq('user_id', uid);
    await admin.from('messages').delete().eq('sender_id', uid);

    // The creator side: delist first so nothing they made stays browsable,
    // then blank the identifying fields. `code` is UNIQUE, so it takes the
    // tombstone rather than a constant.
    const { data: consultant } = await admin
      .from('consultant_profiles')
      .select('id')
      .eq('user_id', uid)
      .maybeSingle();

    if (consultant) {
      await admin.from('shop_products').update({ is_active: false }).eq('consultant_id', consultant.id);
      await admin.from('consultant_profiles').update({
        display_name: 'Deleted creator',
        code: tombstone,
        subtitle: null,
        bio: null,
        expertise: null,
        avatar_url: null,
        portfolio_images: null,
        is_approved: false,
        is_active: false,
      }).eq('id', consultant.id);
    }

    // The person. `email` is UNIQUE and NOT NULL, so it gets a tombstone
    // address rather than a null, which also frees the real address for a
    // fresh signup later.
    const { error: scrubErr } = await admin.from('profiles').update({
      name: 'Deleted user',
      email: `${tombstone}@deleted.dcreators.in`,
      phone: null,
      address: null,
      pin: null,
      avatar_url: null,
      has_consultant_profile: false,
    }).eq('id', uid);
    if (scrubErr) return json({ error: scrubErr.message }, 500);

    // ── Close the login for good ───────────────────────────────────────────
    // Releases the real email address and makes the credentials unusable.
    // 100 years, since Supabase has no "forever" ban.
    const { error: banErr } = await admin.auth.admin.updateUserById(uid, {
      email: `${tombstone}@deleted.dcreators.in`,
      phone: null,
      user_metadata: {},
      ban_duration: '876000h',
    });
    if (banErr) return json({ error: banErr.message }, 500);

    return json({ deleted: true });
  } catch (err: any) {
    console.error('delete-account error:', err?.message);
    return json({ error: 'Could not delete the account. Please contact support.' }, 500);
  }
});
