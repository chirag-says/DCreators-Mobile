-- KYC + banking fields collected on the "Create Creator's Account" onboarding
-- screen. Category is now chosen one step later (Consultancy Details screen),
-- so it must be nullable until then.
ALTER TABLE consultant_profiles
  ALTER COLUMN category DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS aadhar_number TEXT,
  ADD COLUMN IF NOT EXISTS pan_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS ifsc_code TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS terms_pdf_url TEXT;
