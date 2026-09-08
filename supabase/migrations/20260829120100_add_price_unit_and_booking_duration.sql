-- What a consultant's rate is quoted against, and when/how long a booking runs.
--
-- Two gaps the client review found, which turn out to be the same gap:
--
--   1. CreatorProfileScreen rendered "₹ 4,900 (INR)". The "(INR)" carries no
--      information next to a ₹ symbol, and the number carries no unit — a
--      client could not tell a day rate from a whole-project fee. Two
--      consultants quoting the same figure meant different money.
--   2. BookConsultantScreen collected a date and nothing else. A consultant
--      accepting a booking knew which day but not what time to turn up or how
--      long they were being held for.
--
-- Both are the same missing idea: a price is a rate over a span, and neither
-- the rate's unit nor the span was recorded anywhere.
--
-- price_unit is NOT NULL DEFAULT 'per_project' rather than nullable. Every
-- existing base_price was implicitly a project fee, that is exactly what the
-- default backfills them to, and a nullable unit would force every display
-- site to invent a fallback. Same reasoning as `kind` in
-- split_showcase_and_listings.sql.
--
-- The projects columns are nullable on purpose: projects created through the
-- bidding path never collect a time, and every row predating this migration
-- has neither. NULL means "not specified", not "zero".
--
-- Ladder rung M1 (purely additive, constant defaults, no backfill pass, no
-- rewrite on PG 11+). If `projects` ever grows past a few thousand rows, add
-- the CHECK constraints as NOT VALID and VALIDATE them separately; at current
-- volume the scan is not worth the ceremony.
--
-- Constraints are added separately from the columns and guarded on
-- pg_constraint so a partial apply can be re-run: ADD COLUMN IF NOT EXISTS
-- skips its inline CHECK when the column already exists, which would silently
-- leave the column unconstrained.

-- ── consultant_profiles.price_unit ──────────────────────────────────────────

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

-- ── projects.start_time / duration_value / duration_unit ────────────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS start_time     TIME,
  ADD COLUMN IF NOT EXISTS duration_value INTEGER,
  ADD COLUMN IF NOT EXISTS duration_unit  TEXT;

DO $$
BEGIN
  -- A CHECK is satisfied by NULL, so this permits "not specified" without an
  -- explicit IS NULL branch. Do not "fix" it by adding one.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_duration_unit_check'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_duration_unit_check
      CHECK (duration_unit IN ('hours', 'days'));
  END IF;

  -- A zero or negative duration would silently produce a wrong opening budget
  -- wherever the rate is multiplied by the span.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_duration_value_check'
  ) THEN
    ALTER TABLE projects
      ADD CONSTRAINT projects_duration_value_check
      CHECK (duration_value IS NULL OR duration_value > 0);
  END IF;

  -- "3" with no unit renders as a bare 3, and "days" with no value renders as
  -- nothing. Neither half is meaningful alone.
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
