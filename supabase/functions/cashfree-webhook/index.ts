// @ts-nocheck
// Supabase Edge Function: cashfree-webhook
// Deploy: supabase functions deploy cashfree-webhook --no-verify-jwt
//
// This handles Cashfree's server-to-server webhook notification
// when a payment succeeds, fails, or is refunded.
// IMPORTANT: Deploy with --no-verify-jwt since Cashfree won't send a JWT.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CASHFREE_SECRET_KEY = Deno.env.get('CASHFREE_SECRET_KEY') || '';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.text();

    // ── Verify the signature BEFORE parsing or trusting anything ───────────
    // This check used to compute the HMAC, log a mismatch, and carry on. That
    // meant anyone who could POST here could mark any order paid, because the
    // order id is the only thing needed to find the row. Nothing below runs
    // now unless Cashfree actually signed the request.
    const timestamp = req.headers.get('x-webhook-timestamp') || '';
    const signature = req.headers.get('x-webhook-signature') || '';

    if (!timestamp || !signature) {
      console.error('Webhook rejected: missing signature headers');
      return new Response('Missing signature', { status: 401 });
    }

    // Reject anything older than five minutes so a captured payload cannot be
    // replayed later. Cashfree sends the timestamp in seconds.
    const sentAtMs = Number(timestamp) * 1000;
    if (!Number.isFinite(sentAtMs) || Math.abs(Date.now() - sentAtMs) > 5 * 60 * 1000) {
      console.error('Webhook rejected: stale or unparseable timestamp');
      return new Response('Stale timestamp', { status: 401 });
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(CASHFREE_SECRET_KEY),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(timestamp + body));
    const computedSignature = btoa(String.fromCharCode(...new Uint8Array(sig)));

    // Length-independent compare, so a wrong signature cannot be narrowed down
    // by timing how long the rejection takes.
    const a = encoder.encode(signature);
    const b = encoder.encode(computedSignature);
    let diff = a.length ^ b.length;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
    }
    if (diff !== 0) {
      console.error('Webhook rejected: signature mismatch');
      return new Response('Invalid signature', { status: 401 });
    }

    const payload = JSON.parse(body);
    const eventType = payload.type; // PAYMENT_SUCCESS_WEBHOOK, PAYMENT_FAILED_WEBHOOK, etc.
    const orderData = payload.data?.order;
    const paymentData = payload.data?.payment;

    if (!orderData?.order_id) {
      return new Response('Missing order_id', { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const orderId = orderData.order_id;

    if (eventType === 'PAYMENT_SUCCESS_WEBHOOK') {
      // Update payment record
      const { data: payment, error: fetchErr } = await supabase
        .from('payments')
        .select('*, projects(*)')
        .eq('cashfree_order_id', orderId)
        .single();

      if (fetchErr || !payment) {
        console.error('Payment not found for order:', orderId);
        return new Response('Payment not found', { status: 404 });
      }

      // Cashfree retries until it gets a 2xx, so the same success event can
      // arrive several times. Without this the consultant gets a duplicate
      // "payment received" notification on every retry.
      if (payment.status === 'completed') {
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Update payment status
      await supabase.from('payments').update({
        status: 'completed',
        cashfree_payment_id: paymentData?.cf_payment_id?.toString() || null,
        payment_method: paymentData?.payment_group || null,
        gateway_response: paymentData || null,
      }).eq('cashfree_order_id', orderId);

      // Update project status based on payment type
      if (payment.project_id) {
        const newStatus = payment.payment_type === 'advance' ? 'advance_paid' : 'completed';
        const newProgress = payment.payment_type === 'advance' ? 10 : 100;

        await supabase.from('projects').update({
          status: newStatus,
          progress_percent: newProgress,
          updated_at: new Date().toISOString(),
        }).eq('id', payment.project_id);

        // Notify consultant
        const { data: project } = await supabase
          .from('projects')
          .select('consultant_id')
          .eq('id', payment.project_id)
          .single();

        if (project?.consultant_id) {
          await supabase.from('notifications').insert({
            user_id: project.consultant_id,
            title: payment.payment_type === 'advance' ? 'Advance Payment Received' : 'Balance Payment Received',
            message: `Client paid ₹${Number(payment.amount).toLocaleString()} via Cashfree. Order: ${orderId}`,
            type: 'payment',
            is_read: false,
          });
        }
      }

      console.log(`Payment SUCCESS for order ${orderId}`);
    } else if (eventType === 'PAYMENT_FAILED_WEBHOOK') {
      await supabase.from('payments').update({
        status: 'failed',
        gateway_response: paymentData || null,
      }).eq('cashfree_order_id', orderId);

      console.log(`Payment FAILED for order ${orderId}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
