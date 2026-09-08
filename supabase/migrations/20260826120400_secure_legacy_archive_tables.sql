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
