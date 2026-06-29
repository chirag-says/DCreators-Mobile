-- Archive + drop the legacy `creators` + `portfolios` tables.
--
-- Background: these came from the initial scaffold (scripts/create-tables.sql +
-- seed-creators.sql). The app moved to `consultant_profiles` and no longer reads
-- them (no `.from('creators')`/`.from('portfolios')` in src). BUT they are the
-- ONLY copy of 8 demo creators + 24 portfolio images — none of those 8 exist in
-- consultant_profiles (verified by code), and the old `code` column even has
-- duplicates (D207 x3) that the UNIQUE consultant_profiles.code would reject.
-- So this is a deliberate, backed-up removal of obsolete demo data, not a no-op.
--
-- This runs as a single atomic DO block: if any step fails, the whole thing
-- rolls back and the originals are untouched. The drop only proceeds AFTER the
-- archive copies are verified to hold every source row.
--
-- Recovery: data lives in public._archive_creators / _archive_portfolios until
-- you choose to drop those too (DROP TABLE _archive_portfolios, _archive_creators;).

DO $$
DECLARE
  src_creators   BIGINT;
  arc_creators   BIGINT;
  src_portfolios BIGINT;
  arc_portfolios BIGINT;
BEGIN
  -- Already removed? Then this migration has run before — no-op.
  IF to_regclass('public.creators') IS NULL
     AND to_regclass('public.portfolios') IS NULL THEN
    RAISE NOTICE 'Legacy tables already removed; nothing to do.';
    RETURN;
  END IF;

  -- 1. Archive data into plain tables. CREATE TABLE AS copies rows + column
  --    types only (no constraints/FKs), so the archives add no FK noise of
  --    their own. Errors out if an archive already exists -> never silently
  --    clobbers a previous backup.
  CREATE TABLE public._archive_creators   AS TABLE public.creators;
  CREATE TABLE public._archive_portfolios AS TABLE public.portfolios;

  -- 2. Verify the backup is complete BEFORE destroying anything.
  SELECT count(*) INTO src_creators   FROM public.creators;
  SELECT count(*) INTO arc_creators   FROM public._archive_creators;
  SELECT count(*) INTO src_portfolios FROM public.portfolios;
  SELECT count(*) INTO arc_portfolios FROM public._archive_portfolios;

  IF src_creators <> arc_creators OR src_portfolios <> arc_portfolios THEN
    RAISE EXCEPTION
      'Archive mismatch (creators %/%, portfolios %/%); aborting, originals kept.',
      arc_creators, src_creators, arc_portfolios, src_portfolios;
  END IF;

  -- 3. Drop originals (portfolios first — it FKs into creators).
  DROP TABLE public.portfolios;
  DROP TABLE public.creators;

  RAISE NOTICE 'Archived % creators + % portfolios to _archive_* and dropped originals.',
    arc_creators, arc_portfolios;
END $$;
