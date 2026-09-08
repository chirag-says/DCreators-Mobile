-- Re-assert the two security-critical RLS states from the June audit.
--
-- WHY THIS EXISTS: the migrations that first fixed these were applied by hand
-- in the SQL editor, and the remote migration history table was empty, so
-- there is no record proving either one actually landed. Rather than guess,
-- this migration makes both states true unconditionally. It is idempotent and
-- safe to run any number of times, on a database where the fixes already
-- applied and on one where they never did.
--
-- Supersedes, without replacing:
--   20260629120400_fix_notifications_insert_policy.sql
--   20260629120500_fix_payments_overpermissive_policy.sql

-- ── 1. payments: kill the over-permissive catch-all ───────────────
-- add_cashfree_columns.sql created "Service role manages all payments" as
-- FOR ALL USING (true) WITH CHECK (true) with no `TO service_role`, so it
-- applied to every role. Postgres ORs permissive policies together, so that
-- one policy handed every authenticated user SELECT/UPDATE/DELETE on every
-- other user's payment rows (amounts, Cashfree order and payment IDs).
-- The webhook uses the service-role key, which bypasses RLS anyway, so the
-- policy was redundant for its stated purpose. The per-payer policies remain.
DROP POLICY IF EXISTS "Service role manages all payments" ON payments;

-- ── 2. notifications: restore the missing INSERT policy ───────────
-- notifications had RLS enabled with SELECT/UPDATE policies but no INSERT
-- policy, so default-deny silently blocked every cross-user notification.
-- src/lib/notifications.ts swallows the error, so all 16 sendNotification()
-- call sites had been failing invisibly.
--
-- Postgres has no CREATE POLICY IF NOT EXISTS, so drop-then-create is the
-- only idempotent form.
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
CREATE POLICY "Authenticated users can create notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── 3. verify RLS is actually enabled on both ─────────────────────
-- Policies are inert if RLS itself is off. Cheap to assert, expensive to miss.
ALTER TABLE payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
