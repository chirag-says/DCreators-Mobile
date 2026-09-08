-- Take Aadhaar, PAN and bank details off the publicly readable table.
--
-- consultant_profiles carries this policy:
--
--   CREATE POLICY "Public read approved consultants" ON consultant_profiles
--     FOR SELECT USING (is_approved = true AND is_active = true);
--
-- Row-level security has no column granularity. That policy grants SELECT on
-- the whole row, and since 20260628120100 the row has included
-- aadhar_number, pan_number, ifsc_code and bank_account_number. So any caller
-- holding the anon key could read the Aadhaar number and bank account of
-- every approved creator on the platform:
--
--   supabase.from('consultant_profiles')
--     .select('display_name, aadhar_number, pan_number, bank_account_number')
--
-- The app never reads these fields back (they are written once during
-- onboarding and only ever looked at for payouts), so they move to a table
-- with no public policy at all. Several services call select('*') on
-- consultant_profiles, which is exactly how this leaked to clients that never
-- asked for it.

-- No explicit BEGIN/COMMIT: `supabase db push` already runs each migration
-- inside a transaction, and an inner COMMIT would end the outer one early,
-- leaving the history insert outside it.

CREATE TABLE IF NOT EXISTS consultant_kyc (
  consultant_id UUID PRIMARY KEY
    REFERENCES consultant_profiles(id) ON DELETE CASCADE,
  aadhar_number       TEXT,
  pan_number          TEXT,
  bank_name           TEXT,
  ifsc_code           TEXT,
  bank_account_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE consultant_kyc ENABLE ROW LEVEL SECURITY;

-- Owner only, in both directions. There is deliberately no public SELECT
-- policy and no policy for other users: a client hiring a photographer has no
-- business reading that photographer's bank account. Admin review runs under
-- the service role, which bypasses RLS.
CREATE POLICY "Own KYC read" ON consultant_kyc
  FOR SELECT USING (
    consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Own KYC insert" ON consultant_kyc
  FOR INSERT WITH CHECK (
    consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Own KYC update" ON consultant_kyc
  FOR UPDATE USING (
    consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid())
  );

-- Carry across whatever has already been collected.
INSERT INTO consultant_kyc (consultant_id, aadhar_number, pan_number, bank_name, ifsc_code, bank_account_number)
SELECT id, aadhar_number, pan_number, bank_name, ifsc_code, bank_account_number
FROM consultant_profiles
WHERE aadhar_number IS NOT NULL
   OR pan_number IS NOT NULL
   OR bank_name IS NOT NULL
   OR ifsc_code IS NOT NULL
   OR bank_account_number IS NOT NULL
ON CONFLICT (consultant_id) DO NOTHING;

ALTER TABLE consultant_profiles
  DROP COLUMN IF EXISTS aadhar_number,
  DROP COLUMN IF EXISTS pan_number,
  DROP COLUMN IF EXISTS bank_name,
  DROP COLUMN IF EXISTS ifsc_code,
  DROP COLUMN IF EXISTS bank_account_number;

-- Verify: expect zero rows back, i.e. the columns are gone from the readable
-- table and the data survived the move.
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'consultant_profiles'
--     AND column_name IN ('aadhar_number','pan_number','bank_name','ifsc_code','bank_account_number');
--
--   SELECT count(*) FROM consultant_kyc;
--
-- Anyone who held the anon key before this ran could already have copied the
-- old values. Treat every Aadhaar and bank account collected up to now as
-- having been exposed, and judge whether that needs disclosing to the
-- creators concerned under the DPDP Act.
