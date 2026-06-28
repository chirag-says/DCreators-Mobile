-- Migration: Update payments table to use Cashfree instead of Razorpay
-- Run this in Supabase SQL Editor

-- Add Cashfree columns
ALTER TABLE payments ADD COLUMN IF NOT EXISTS cashfree_order_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS cashfree_payment_id TEXT;

-- Copy existing Razorpay data (if any) to new columns
UPDATE payments SET cashfree_order_id = razorpay_order_id WHERE razorpay_order_id IS NOT NULL AND cashfree_order_id IS NULL;
UPDATE payments SET cashfree_payment_id = razorpay_payment_id WHERE razorpay_payment_id IS NOT NULL AND cashfree_payment_id IS NULL;

-- NOTE: Don't drop razorpay columns yet, in case you need historical data.
-- When ready: ALTER TABLE payments DROP COLUMN razorpay_order_id;
-- When ready: ALTER TABLE payments DROP COLUMN razorpay_payment_id;
