// @ts-nocheck
// Supabase Edge Function: create-cashfree-order
// Deploy: supabase functions deploy create-cashfree-order
//
// Creates a Cashfree payment order. CASHFREE_APP_ID and CASHFREE_SECRET_KEY
// are Supabase secrets and never reach the client.
//
// Set secrets via Supabase Dashboard → Edge Functions → Secrets:
//   CASHFREE_APP_ID = your_app_id
//   CASHFREE_SECRET_KEY = your_secret_key
//   CASHFREE_ENV = TEST  (or PROD for production)
//
// WHAT THE CLIENT IS AND IS NOT TRUSTED WITH
// ------------------------------------------
// It says which project it wants to pay for and whether that is the advance
// or the balance. Everything else is read from the database here: the amount,
// the payer, and the customer details. This function used to take `amount`
// straight off the request body without checking who was asking, so any
// caller could open a one rupee order against any project.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CASHFREE_ENV = Deno.env.get('CASHFREE_ENV') || 'TEST';
const CASHFREE_APP_ID = Deno.env.get('CASHFREE_APP_ID') || '';
const CASHFREE_SECRET_KEY = Deno.env.get('CASHFREE_SECRET_KEY') || '';

const CF_BASE = CASHFREE_ENV === 'PROD'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

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
    // ── Who is asking ──────────────────────────────────────────────────────
    const authHeader = req.headers.get('authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Please sign in to make a payment.' }, 401);
    }

    const asUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await asUser.auth.getUser();
    if (userErr || !user) return json({ error: 'Please sign in to make a payment.' }, 401);

    const { project_id, payment_type } = await req.json();

    if (payment_type !== 'advance' && payment_type !== 'balance') {
      return json({ error: 'payment_type must be "advance" or "balance".' }, 400);
    }
    if (!project_id) {
      return json({ error: 'project_id is required.' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // ── What is actually owed ──────────────────────────────────────────────
    const { data: project, error: projErr } = await admin
      .from('projects')
      .select('id, client_id, consultant_id, budget, final_offer, status')
      .eq('id', project_id)
      .single();

    if (projErr || !project) return json({ error: 'Project not found.' }, 404);

    if (project.client_id !== user.id) {
      return json({ error: 'This is not your project.' }, 403);
    }

    // Same rule as the app: the agreed price is the negotiated offer if there
    // is one, else the original budget, and the advance is half of it.
    // See PaymentScreen.tsx, which must stay in step with this.
    const total = Number(project.final_offer ?? project.budget ?? 0);
    if (!(total > 0)) {
      return json({ error: 'This project has no agreed price yet.' }, 409);
    }
    const advance = Math.round(total * 0.5);
    const amount = payment_type === 'advance' ? advance : total - advance;
    if (!(amount > 0)) {
      return json({ error: 'Nothing left to pay on this project.' }, 409);
    }

    // ── Do not let the same leg be paid twice ──────────────────────────────
    const { data: existing } = await admin
      .from('payments')
      .select('id, status')
      .eq('project_id', project_id)
      .eq('payment_type', payment_type)
      .in('status', ['pending', 'completed']);

    if (existing?.some((p) => p.status === 'completed')) {
      return json({ error: 'This payment has already been made.' }, 409);
    }
    // A stale pending row means an abandoned checkout. Retire it so the
    // webhook cannot later attach a success to the wrong attempt.
    if (existing?.length) {
      await admin.from('payments').update({ status: 'failed' })
        .in('id', existing.map((p) => p.id));
    }

    // ── Customer details come from the profile, not the request ────────────
    const { data: profile } = await admin
      .from('profiles')
      .select('name, email, phone')
      .eq('id', user.id)
      .single();

    const orderId = `DCR_${Date.now()}_${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const cfResponse = await fetch(`${CF_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01',
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: user.id,
          customer_name: profile?.name || 'DCreators User',
          customer_email: profile?.email || user.email,
          customer_phone: profile?.phone || '9999999999',
        },
        order_meta: {
          return_url: `https://dcreators.in/payment/callback?order_id=${orderId}`,
          notify_url: `${supabaseUrl}/functions/v1/cashfree-webhook`,
        },
        order_note: `DCreators ${payment_type} for project ${project_id}`,
      }),
    });

    const cfData = await cfResponse.json();

    if (!cfResponse.ok) {
      console.error('Cashfree error:', cfData);
      return json({ error: cfData.message || 'Failed to create Cashfree order' }, 502);
    }

    await admin.from('payments').insert({
      project_id,
      payer_id: user.id,
      amount,
      payment_type,
      status: 'pending',
      cashfree_order_id: orderId,
    });

    return json({
      order_id: orderId,
      payment_session_id: cfData.payment_session_id,
      cf_order_id: cfData.cf_order_id,
      order_status: cfData.order_status,
      environment: CASHFREE_ENV,
      // The client shows what it is about to charge, so it needs to hear the
      // number this function settled on rather than the one it guessed.
      amount,
    });
  } catch (err: any) {
    console.error('Edge function error:', err?.message);
    return json({ error: 'Could not start the payment. Please try again.' }, 500);
  }
});
