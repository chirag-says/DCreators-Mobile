/**
 * Cashfree Payment Service
 * 
 * Client-side module to interact with the Cashfree payment gateway.
 * Uses Supabase Edge Functions for secure order creation.
 * Never exposes secret keys to the client.
 */

import { supabase } from './supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

/**
 * What the client is allowed to decide.
 *
 * The amount and the customer details used to be sent from here. They are not
 * anymore: the Edge Function reads the agreed price off the project and the
 * name and email off the profile, because a number posted by the client is a
 * number the client can change. All this says is which project, and which
 * half of it.
 */
export interface CreateOrderParams {
  projectId: string;
  paymentType: 'advance' | 'balance';
}

export interface CashfreeOrder {
  order_id: string;
  payment_session_id: string;
  cf_order_id: string;
  order_status: string;
  environment: 'TEST' | 'PROD';
  /** What the server decided to charge. Authoritative. */
  amount: number;
}

/**
 * Create a Cashfree order via the secure Edge Function.
 * Returns the payment_session_id needed for the checkout page.
 */
export async function createCashfreeOrder(params: CreateOrderParams): Promise<CashfreeOrder> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Please sign in to make a payment.');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-cashfree-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify({
      project_id: params.projectId,
      payment_type: params.paymentType,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create payment order');
  }

  return data as CashfreeOrder;
}

/**
 * Build the Cashfree checkout URL for WebView.
 * This is the hosted payment page where the user completes the payment.
 */
export function getCashfreeCheckoutUrl(paymentSessionId: string, environment: 'TEST' | 'PROD'): string {
  const baseUrl = environment === 'PROD'
    ? 'https://api.cashfree.com/pg/orders/sessions'
    : 'https://sandbox.cashfree.com/pg/orders/sessions';

  // Cashfree's hosted checkout page
  return `${baseUrl}/${paymentSessionId}`;
}

/**
 * Verify payment status after user returns from checkout.
 * Checks our local DB for the updated status (set by webhook).
 */
export async function verifyPaymentStatus(orderId: string): Promise<{
  status: 'pending' | 'completed' | 'failed';
  cashfreePaymentId?: string;
}> {
  // Poll the payment record in our DB (the webhook would have updated it).
  // Exponential backoff (1.5s -> 8s cap) over ~20 attempts gives the webhook
  // a realistic ~2 minute window before we surface a "still processing" state.
  const maxAttempts = 20;
  let delayMs = 1500;

  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    const { data, error } = await supabase
      .from('payments')
      .select('status, cashfree_payment_id')
      .eq('cashfree_order_id', orderId)
      .single();

    if (!error && data && data.status !== 'pending') {
      return {
        status: data.status,
        cashfreePaymentId: data.cashfree_payment_id,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    delayMs = Math.min(delayMs * 1.4, 8000);
  }

  return { status: 'pending' };
}
