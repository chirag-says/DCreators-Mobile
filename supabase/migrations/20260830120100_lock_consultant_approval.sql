-- Stop consultants approving themselves.
--
-- `consultant_profiles` has exactly one UPDATE policy:
--
--   CREATE POLICY "Own consultant update" ON consultant_profiles
--     FOR UPDATE USING (auth.uid() = user_id);
--
-- which is correct for the fields a creator owns (bio, portfolio, price) and
-- catastrophic for the one they do not. `is_approved` is what gates the search
-- listings, the bid pool, and the direct-hire picker, so a single PATCH from
-- any signed-up account turned an unvetted stranger into a verified creator.
--
-- Row-level security has no column granularity, so the guard is a trigger.
-- The policy stays as it is; this narrows what an UPDATE through it may touch.

CREATE OR REPLACE FUNCTION guard_consultant_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- `current_user` is the Postgres role the request arrived under: `anon` or
  -- `authenticated` for anything holding the anon key, `service_role` for the
  -- Edge Functions, `postgres` for the SQL editor. Only the last two approve.
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved
     AND current_user NOT IN ('service_role', 'postgres')
  THEN
    RAISE EXCEPTION
      'is_approved is set by DCreators after review; it cannot be changed from the app.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_consultant_approval ON consultant_profiles;

CREATE TRIGGER trg_guard_consultant_approval
  BEFORE UPDATE ON consultant_profiles
  FOR EACH ROW
  EXECUTE FUNCTION guard_consultant_approval();

-- Anyone who already self-approved keeps their flag. Audit before trusting it:
--
--   SELECT id, display_name, category, is_approved, created_at
--   FROM consultant_profiles
--   WHERE is_approved = true
--   ORDER BY created_at DESC;
--
-- Approvals now happen with the service role. From the SQL editor:
--
--   UPDATE consultant_profiles SET is_approved = true WHERE id = '<uuid>';
--
-- The admin panel cannot do this: it holds the anon key and has no login, so
-- its Approve button was already failing silently before this trigger existed.
