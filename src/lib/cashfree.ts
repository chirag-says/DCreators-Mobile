/**
 * Cashfree Payment Service
 * 
 * Client-side module to interact with the Cashfree payment gateway.
 * Uses Supabase Edge Functions for secure order creation.
 * Never exposes secret keys to the client.
 */

import { supabase } from './supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

export interface CreateOrderParams {
  projectId?: string;
  amount: number;
  paymentType: 'advance' | 'balance' | 'shop_purchase';
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}

export interface CashfreeOrder {
  order_id: string;
  payment_session_id: string;
  cf_order_id: string;
  order_status: string;
  environment: 'TEST' | 'PROD';
}

/**
 * Create a Cashfree order via the secure Edge Function.
 * Returns the payment_session_id needed for the checkout page.
 */
export async function createCashfreeOrder(params: CreateOrderParams): Promise<CashfreeOrder> {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-cashfree-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || ''}`,
      'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify({
      project_id: params.projectId,
      amount: params.amount,
      payment_type: params.paymentType,
      customer_name: params.customerName,
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone,
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
  // Poll the payment record in our DB (the webhook would have updated it)
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
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

    // Wait 2 seconds before next check
    await new Promise((resolve) => setTimeout(resolve, 2000));
    attempts++;
  }

  return { status: 'pending' };
}
