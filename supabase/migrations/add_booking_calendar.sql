-- Calendar-based direct booking (Flow 2 of 3 — see plan doc).
--
-- 1. `projects.event_date` is the date being booked (e.g. the wedding day),
--    distinct from `deadline` (delivery deadline for the finished work).
-- 2. `consultant_blocked_dates` lets a consultant mark personal blackout
--    days (vacation, already committed elsewhere) independent of projects.
-- 3. `get_consultant_taken_dates` is the only way a client's calendar reads
--    another consultant's commitments — it returns dates only, never the
--    underlying project's brief/budget/client, which a plain SELECT policy
--    on `projects` would otherwise leak to every other client.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS event_date DATE;

CREATE TABLE IF NOT EXISTS consultant_blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultant_profiles(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (consultant_id, blocked_date)
);

ALTER TABLE consultant_blocked_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Consultant manages own blocked dates" ON consultant_blocked_dates
  FOR ALL USING (
    consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION get_consultant_taken_dates(p_consultant_user_id UUID)
RETURNS TABLE(taken_date DATE)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT event_date FROM projects
    WHERE consultant_id = p_consultant_user_id
      AND event_date IS NOT NULL
      AND status NOT IN ('cancelled', 'rejected', 'draft')
  UNION
  SELECT blocked_date FROM consultant_blocked_dates
    WHERE consultant_id IN (
      SELECT id FROM consultant_profiles WHERE user_id = p_consultant_user_id
    );
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION get_consultant_taken_dates(UUID) TO authenticated;
