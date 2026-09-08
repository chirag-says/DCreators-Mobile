-- Fixes bid acceptance silently failing: when a consultant accepts a bid,
-- acceptBidCandidate() inserts the resulting projects row with client_id =
-- the bidding client's id (not the consultant's own id), but the original
-- INSERT policy only allowed a client to insert their own row
-- (auth.uid() = client_id). A consultant-initiated insert never satisfied
-- that check, so the insert was rejected by RLS every time — the bid stayed
-- "pending" forever with no project ever created.

DROP POLICY IF EXISTS "Client creates projects" ON projects;
CREATE POLICY "Client or assigned consultant creates projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = client_id OR auth.uid() = consultant_id);
