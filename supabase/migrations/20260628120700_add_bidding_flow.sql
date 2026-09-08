-- Bidding with priority list + negotiation chat (Flow 3 of 3 — see plan doc).
--
-- 1. `bid_requests` is what a client posts (category/brief/date/budget).
-- 2. `bid_candidates` is the client's ranked priority list of consultants
--    for that request — only one is ever 'pending' (actively being asked)
--    at a time; declining advances to the next by `priority_rank`.
-- 3. `messages` gets a second optional scope (`bid_candidate_id`, alongside
--    the existing `project_id`) so the same chat infrastructure carries
--    negotiation conversations. This migration also fixes a pre-existing
--    gap: `messages` had ZERO row level security before this — any
--    authenticated user could read/write any project's messages.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS bid_candidate_id UUID;

-- Batched sibling of Flow 2's get_consultant_taken_dates — lets the bid flow
-- check availability for every matching consultant in one round trip
-- instead of one RPC call per candidate.
CREATE OR REPLACE FUNCTION get_taken_dates_for_consultants(p_consultant_user_ids UUID[])
RETURNS TABLE(consultant_user_id UUID, taken_date DATE)
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT consultant_id, event_date FROM projects
    WHERE consultant_id = ANY(p_consultant_user_ids)
      AND event_date IS NOT NULL
      AND status NOT IN ('cancelled', 'rejected', 'draft')
  UNION
  SELECT cp.user_id, cbd.blocked_date FROM consultant_blocked_dates cbd
    JOIN consultant_profiles cp ON cp.id = cbd.consultant_id
    WHERE cp.user_id = ANY(p_consultant_user_ids);
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION get_taken_dates_for_consultants(UUID[]) TO authenticated;

CREATE TABLE IF NOT EXISTS bid_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id),
  category TEXT NOT NULL CHECK (category IN ('photographer', 'videographer', 'designer', 'sculptor', 'artisan')),
  assignment_brief TEXT NOT NULL,
  event_date DATE,
  budget DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'fulfilled', 'unfulfilled', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bid_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_request_id UUID NOT NULL REFERENCES bid_requests(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES consultant_profiles(id),
  priority_rank INTEGER NOT NULL,
  quoted_price DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'pending', 'negotiating', 'accepted', 'declined', 'skipped')),
  -- Set when accepted, so the client's BidStatus screen can link straight
  -- to the resulting project without a fragile reverse lookup.
  project_id UUID REFERENCES projects(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (bid_request_id, consultant_id),
  UNIQUE (bid_request_id, priority_rank)
);

ALTER TABLE messages ADD CONSTRAINT messages_fk_bid_candidate
  FOREIGN KEY (bid_candidate_id) REFERENCES bid_candidates(id) ON DELETE CASCADE;

-- ── RLS: bid_requests ──────────────────────────────────────────
ALTER TABLE bid_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client manages own bid requests" ON bid_requests
  FOR ALL USING (auth.uid() = client_id);
CREATE POLICY "Consultant reads bid requests they're a candidate for" ON bid_requests
  FOR SELECT USING (
    id IN (
      SELECT bid_request_id FROM bid_candidates
      WHERE consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid())
    )
  );

-- ── RLS: bid_candidates ─────────────────────────────────────────
ALTER TABLE bid_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client reads own bid candidates" ON bid_candidates
  FOR SELECT USING (
    bid_request_id IN (SELECT id FROM bid_requests WHERE client_id = auth.uid())
  );
CREATE POLICY "Client creates candidates for own bid" ON bid_candidates
  FOR INSERT WITH CHECK (
    bid_request_id IN (SELECT id FROM bid_requests WHERE client_id = auth.uid())
  );
CREATE POLICY "Consultant manages own candidate rows" ON bid_candidates
  FOR ALL USING (
    consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid())
  );

-- ── RLS: messages (was previously unprotected) ──────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Involved parties read messages" ON messages
  FOR SELECT USING (
    (project_id IS NOT NULL AND project_id IN (
      SELECT id FROM projects WHERE client_id = auth.uid() OR consultant_id = auth.uid()
    ))
    OR
    (bid_candidate_id IS NOT NULL AND bid_candidate_id IN (
      SELECT bc.id FROM bid_candidates bc
      JOIN bid_requests br ON br.id = bc.bid_request_id
      WHERE br.client_id = auth.uid()
         OR bc.consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid())
    ))
  );

CREATE POLICY "Involved parties send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND (
      (project_id IS NOT NULL AND project_id IN (
        SELECT id FROM projects WHERE client_id = auth.uid() OR consultant_id = auth.uid()
      ))
      OR
      (bid_candidate_id IS NOT NULL AND bid_candidate_id IN (
        SELECT bc.id FROM bid_candidates bc
        JOIN bid_requests br ON br.id = bc.bid_request_id
        WHERE br.client_id = auth.uid()
           OR bc.consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid())
      ))
    )
  );
