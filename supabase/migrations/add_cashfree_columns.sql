-- ============================================
-- PAYMENTS TABLE UPDATE FOR CASHFREE
-- Run this in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================

-- Add Cashfree columns to payments table (run this if table already exists)
-- If the columns already exist, these will safely error — that's OK.

ALTER TABLE payments ADD COLUMN IF NOT EXISTS cashfree_order_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS cashfree_payment_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_response JSONB;

-- Drop old Razorpay columns if they exist (optional cleanup)
-- ALTER TABLE payments DROP COLUMN IF EXISTS razorpay_order_id;
-- ALTER TABLE payments DROP COLUMN IF EXISTS razorpay_payment_id;

-- Allow service role to insert/update payments (for webhook)
-- The existing RLS policies should work, but add one for the edge function
CREATE POLICY IF NOT EXISTS "Service role manages all payments" ON payments
  FOR ALL USING (true) WITH CHECK (true);
