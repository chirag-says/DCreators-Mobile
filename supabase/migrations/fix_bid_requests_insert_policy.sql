-- Fixes "new row violates row-level security policy for table bid_requests".
--
-- The previous "Client manages own bid requests" policy used FOR ALL with
-- only a USING clause, relying on Postgres defaulting WITH CHECK to the
-- same expression for INSERT. Replacing it with explicit per-command
-- policies removes any ambiguity about that default.

DROP POLICY IF EXISTS "Client manages own bid requests" ON bid_requests;

CREATE POLICY "Client selects own bid requests" ON bid_requests
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Client inserts own bid requests" ON bid_requests
  FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Client updates own bid requests" ON bid_requests
  FOR UPDATE USING (auth.uid() = client_id);
CREATE POLICY "Client deletes own bid requests" ON bid_requests
  FOR DELETE USING (auth.uid() = client_id);
