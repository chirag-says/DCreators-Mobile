-- ============================================================================
-- DCreators — one-off manual apply script
-- Generated 2026-08-26. Paste into the Supabase SQL editor and run ONCE.
--
-- Equivalent to:
--   supabase migration repair --status applied <the 22 pre-August versions>
--   supabase db push
--
-- Safe to re-run and safe to fail: everything is inside one transaction and
-- every statement is idempotent (IF EXISTS / IF NOT EXISTS / CREATE OR
-- REPLACE / ON CONFLICT DO NOTHING). An aborted run changes nothing.
--
-- PART 0 creates the migration history table the CLI expects.
-- PART A records the 22 migrations applied by hand months ago but never
--        recorded, so the CLI stops seeing them as pending. No DDL.
-- PART B applies the four new migrations.
-- PART C records those four.
-- ============================================================================

BEGIN;

-- ── PART 0: bootstrap the migration history table ───────────────────────────
-- The CLI creates this on its first successful `db push`. This project has
-- never had one (every migration was applied by hand), so the schema and table
-- do not exist yet and PART A would fail with:
--   ERROR 42P01: relation "supabase_migrations.schema_migrations" does not exist
--
-- Only `version` is required; the rest are added separately so this also
-- repairs a partially-created table.
CREATE SCHEMA IF NOT EXISTS supabase_migrations;

CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version text NOT NULL PRIMARY KEY
);

ALTER TABLE supabase_migrations.schema_migrations ADD COLUMN IF NOT EXISTS statements text[];
ALTER TABLE supabase_migrations.schema_migrations ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE supabase_migrations.schema_migrations ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE supabase_migrations.schema_migrations ADD COLUMN IF NOT EXISTS idempotency_key text;

-- ── PART A: baseline the existing history ───────────────────────────────────
-- These migrations are already live. This only writes their version numbers
-- into the history table. It changes no schema and no data.
INSERT INTO supabase_migrations.schema_migrations (version) VALUES
  ('20260628120100'), ('20260628120200'), ('20260628120300'), ('20260628120400'),
  ('20260628120500'), ('20260628120600'), ('20260628120700'), ('20260628120800'),
  ('20260628120900'), ('20260628121000'), ('20260628121100'), ('20260628121200'),
  ('20260628121300'), ('20260628121400'),
  ('20260629120100'), ('20260629120200'), ('20260629120300'), ('20260629120400'),
  ('20260629120500'),
  ('20260630120100'), ('20260630120200'), ('20260630120300')
ON CONFLICT (version) DO NOTHING;

-- ── PART B: 20260826120100_add_bid_creative_item ─────────────────
-- Give bid requests a creative item, so a project born from a bid has a real
-- assignment title instead of falling back to the role ("Hire Designer").
--
-- AssignProjectScreen and HireConsultantScreen already ask the client to pick
-- a creative item and write it to projects.assignment_details[0]. CreateBid
-- did not, so acceptBidCandidate() inserted assignment_details: null and every
-- downstream surface degraded to assignment_type. Same gap on the booking
-- flow, but BookConsultantScreen builds its project payload client-side and
-- needs no column of its own.
--
-- Additive and nullable: existing rows stay valid, no backfill required,
-- no rewrite of the table. Safe to run on a live database.

ALTER TABLE bid_requests ADD COLUMN IF NOT EXISTS creative_item TEXT;

COMMENT ON COLUMN bid_requests.creative_item IS
  'Concrete deliverable chosen by the client (e.g. "Logo Design"). Copied into projects.assignment_details[0] when a candidate accepts.';

-- ── PART B: 20260826120200_assert_rls_baseline ─────────────────
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

-- ── PART B: 20260826120300_add_consultant_ratings_view ─────────────────
-- Aggregate rating per consultant, so clients can see a score before they book.
--
-- Reviews have been collected since add_reviews_table.sql and read back on the
-- consultant's own earnings screen, but no client-facing surface (creator
-- profile, featured cards, booking screen) showed a single star. A client was
-- being asked to commit money on portfolio images alone.
--
-- A view rather than denormalised columns on consultant_profiles: an average
-- that lives in two places drifts the first time a review is deleted or
-- edited, and there is no volume here that would justify that risk.
--
-- reviews.consultant_id is the consultant's auth user_id (profiles.id) since
-- fix_reviews_consultant_id_fk.sql, so this keys on user_id throughout.

CREATE OR REPLACE VIEW consultant_ratings
WITH (security_invoker = true) AS
  SELECT
    r.consultant_id                      AS consultant_user_id,
    ROUND(AVG(r.rating)::numeric, 2)     AS average_rating,
    COUNT(*)::int                        AS review_count
  FROM reviews r
  WHERE r.consultant_id IS NOT NULL
  GROUP BY r.consultant_id;

COMMENT ON VIEW consultant_ratings IS
  'Average rating and review count per consultant user_id. security_invoker so the caller''s RLS on reviews applies.';

-- reviews already carries a permissive "Anyone can read reviews" SELECT policy,
-- so an invoker-rights view is readable by both roles without widening anything.
GRANT SELECT ON consultant_ratings TO authenticated, anon;

-- ── PART B: 20260826120400_secure_legacy_archive_tables ─────────────────
-- Close the hole left by the legacy archive tables.
--
-- drop_legacy_creators_portfolios.sql preserved the old data with
--   CREATE TABLE public._archive_creators   AS TABLE public.creators;
--   CREATE TABLE public._archive_portfolios AS TABLE public.portfolios;
-- which was the right call for recoverability, but CREATE TABLE AS does not
-- enable row level security, and Supabase's default privileges on schema
-- public grant anon and authenticated on newly created tables. Both archives
-- therefore sit in an exposed schema, readable through PostgREST by anyone
-- with a session — the same failure shape as the payments policy in June,
-- arrived at from the opposite direction.
--
-- Deny rather than drop: the archives exist so the legacy rows can be
-- recovered, and destroying a backup to fix an access-control bug trades one
-- problem for a worse one. RLS enabled with zero policies is default-deny for
-- every role except service_role and the table owner, which is exactly the
-- access the recovery path needs.
--
-- To actually discard the data later:
--   DROP TABLE IF EXISTS public._archive_portfolios, public._archive_creators;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['_archive_creators', '_archive_portfolios'] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
      RAISE NOTICE 'Secured public.% (revoked grants, RLS on, no policies).', t;
    ELSE
      RAISE NOTICE 'public.% not present — nothing to secure.', t;
    END IF;
  END LOOP;
END $$;

-- ── PART C: record the four new migrations ──────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version) VALUES
  ('20260826120100'), ('20260826120200'), ('20260826120300'), ('20260826120400')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ── Verify (run these separately, AFTER the COMMIT succeeds) ────────────────
-- 1. Expect 26 rows, newest last:
--    SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
--
-- 2. Expect NO "Service role manages all payments" row, and one notifications
--    INSERT policy:
--    SELECT tablename, policyname, cmd FROM pg_policies
--     WHERE tablename IN ('payments','notifications') ORDER BY tablename, policyname;
--
-- 3. Expect the ratings view to answer (0 rows is fine — no reviews yet):
--    SELECT * FROM consultant_ratings;
--
-- 4. Expect rowsecurity = true for both archive tables:
--    SELECT tablename, rowsecurity FROM pg_tables
--     WHERE schemaname='public' AND tablename LIKE '\_archive%';


-- ============================================================================
-- ADDENDUM 2026-08-29 — 20260829120100_add_price_unit_and_booking_duration
--
-- Self-contained: its own transaction, its own idempotency, no dependency on
-- the block above. Run it whether or not the 2026-08-26 script has been
-- applied. Safe to re-run.
--
-- NOTE before running: 20260826120500_split_showcase_and_listings and
-- 20260826120600_showcase_has_no_price exist in supabase/migrations/ but were
-- never added to this file — they landed in a later commit than the script.
-- If shop_products has no `kind` column, apply those two first; the app's
-- showcase/listing split already depends on them. Check with:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'shop_products' AND column_name = 'kind';
-- ============================================================================

BEGIN;

ALTER TABLE consultant_profiles
  ADD COLUMN IF NOT EXISTS price_unit TEXT NOT NULL DEFAULT 'per_project';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'consultant_profiles_price_unit_check'
  ) THEN
    ALTER TABLE consultant_profiles
      ADD CONSTRAINT consultant_profiles_price_unit_check
      CHECK (price_unit IN ('per_project', 'per_day', 'per_hour'));
  END IF;
END $$;

COMMENT ON COLUMN consultant_profiles.price_unit IS
  'What base_price is quoted against. Rendered as the suffix on the profile price row.';

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS start_time     TIME,
  ADD COLUMN IF NOT EXISTS duration_value INTEGER,
  ADD COLUMN IF NOT EXISTS duration_unit  TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_duration_unit_check'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_duration_unit_check
      CHECK (duration_unit IN ('hours', 'days'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_duration_value_check'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_duration_value_check
      CHECK (duration_value IS NULL OR duration_value > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_duration_pair_check'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_duration_pair_check
      CHECK ((duration_value IS NULL) = (duration_unit IS NULL));
  END IF;
END $$;

COMMENT ON COLUMN projects.start_time IS
  'Call time on event_date. NULL where the booking flow never asked (bidding path, pre-migration rows).';
COMMENT ON COLUMN projects.duration_value IS
  'How long the consultant is held for, in duration_unit. Set together or both NULL.';

INSERT INTO supabase_migrations.schema_migrations (version) VALUES
  ('20260829120100')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ── Verify the addendum (run AFTER the COMMIT succeeds) ─────────────────────
-- 1. Expect price_unit = 'per_project' on every existing row:
--    SELECT price_unit, count(*) FROM consultant_profiles GROUP BY price_unit;
--
-- 2. Expect four columns back:
--    SELECT column_name, data_type, is_nullable
--      FROM information_schema.columns
--     WHERE (table_name = 'consultant_profiles' AND column_name = 'price_unit')
--        OR (table_name = 'projects' AND column_name IN
--            ('start_time','duration_value','duration_unit'))
--     ORDER BY table_name, column_name;
--
-- 3. Expect four CHECK constraints:
--    SELECT conname FROM pg_constraint
--     WHERE conname IN ('consultant_profiles_price_unit_check',
--                       'projects_duration_unit_check',
--                       'projects_duration_value_check',
--                       'projects_duration_pair_check');
