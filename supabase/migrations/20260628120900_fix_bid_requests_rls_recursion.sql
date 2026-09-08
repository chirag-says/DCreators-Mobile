-- Fixes "infinite recursion detected in policy for relation bid_requests".
--
-- bid_requests' consultant-read policy queried bid_candidates, and
-- bid_candidates' policies query back into bid_requests (client_id check) —
-- Postgres applies RLS recursively on policy subqueries, so the two tables'
-- policies looped on each other. Moving the cross-table check into a
-- SECURITY DEFINER function bypasses RLS for that one inner lookup and
-- breaks the cycle.

CREATE OR REPLACE FUNCTION is_bid_request_candidate(p_bid_request_id UUID, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bid_candidates bc
    JOIN consultant_profiles cp ON cp.id = bc.consultant_id
    WHERE bc.bid_request_id = p_bid_request_id AND cp.user_id = p_user_id
  );
$$ LANGUAGE sql STABLE;

DROP POLICY IF EXISTS "Consultant reads bid requests they're a candidate for" ON bid_requests;
CREATE POLICY "Consultant reads bid requests they're a candidate for" ON bid_requests
  FOR SELECT USING (is_bid_request_candidate(id, auth.uid()));
