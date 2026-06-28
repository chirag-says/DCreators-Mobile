// @ts-nocheck
// Supabase Edge Function: create-cashfree-order
// Deploy: supabase functions deploy create-cashfree-order
//
// This function creates a Cashfree payment order securely on the server side.
// The CASHFREE_APP_ID and CASHFREE_SECRET_KEY are stored as Supabase secrets.
//
// Set secrets via Supabase Dashboard → Edge Functions → Secrets:
//   CASHFREE_APP_ID = your_app_id
//   CASHFREE_SECRET_KEY = your_secret_key
//   CASHFREE_ENV = TEST  (or PROD for production)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CASHFREE_ENV = Deno.env.get('CASHFREE_ENV') || 'TEST';
const CASHFREE_APP_ID = Deno.env.get('CASHFREE_APP_ID') || '';
const CASHFREE_SECRET_KEY = Deno.env.get('CASHFREE_SECRET_KEY') || '';

// Cashfree API base URL
const CF_BASE = CASHFREE_ENV === 'PROD'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { project_id, amount, payment_type, customer_name, customer_email, customer_phone } = await req.json();

    // Validate required fields
    if (!amount || !customer_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, customer_email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique order ID
    const orderId = `DCR_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create Cashfree order
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
        order_amount: Number(amount),
        order_currency: 'INR',
        customer_details: {
          customer_id: customer_email.split('@')[0] + '_' + Date.now(),
          customer_name: customer_name || 'DCreators User',
          customer_email: customer_email,
          customer_phone: customer_phone || '9999999999',
        },
        order_meta: {
          return_url: `https://dcreators.app/payment/callback?order_id=${orderId}`,
          notify_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/cashfree-webhook`,
        },
        order_note: `DCreators ${payment_type || 'payment'} for project ${project_id || 'N/A'}`,
      }),
    });

    const cfData = await cfResponse.json();

    if (!cfResponse.ok) {
      console.error('Cashfree error:', cfData);
      return new Response(
        JSON.stringify({ error: cfData.message || 'Failed to create Cashfree order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store pending payment record in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract user from auth header
    const authHeader = req.headers.get('authorization');
    let payerId = null;
    if (authHeader) {
      const { data: { user } } = await createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { authorization: authHeader } },
      }).auth.getUser();
      payerId = user?.id;
    }

    await supabase.from('payments').insert({
      project_id: project_id || null,
      payer_id: payerId,
      amount: Number(amount),
      payment_type: payment_type || 'balance',
      status: 'pending',
      cashfree_order_id: orderId,
    });

    // Return the payment session ID and order ID to the client
    return new Response(
      JSON.stringify({
        order_id: orderId,
        payment_session_id: cfData.payment_session_id,
        cf_order_id: cfData.cf_order_id,
        order_status: cfData.order_status,
        environment: CASHFREE_ENV,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
