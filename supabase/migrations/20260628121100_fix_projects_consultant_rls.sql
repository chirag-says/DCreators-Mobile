-- Fixes a pre-existing bug: consultants could never actually see or update
-- their own assigned projects via RLS.
--
-- The original policies checked
--   consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid())
-- i.e. they assumed projects.consultant_id stores consultant_profiles.id.
-- But every write/read path in the app (AssignProjectScreen,
-- ConsultantMatchingScreen, BookConsultantScreen, bidService, and the
-- consultant's own project queries in ConsultantProjectManagementScreen /
-- CreatorDashboardScreen) stores and looks up consultant_id as the
-- consultant's auth user_id directly. RLS never matched that, so a
-- consultant could create a row as a client could see it, but never read
-- it back as the consultant.

DROP POLICY IF EXISTS "Consultant reads assigned projects" ON projects;
CREATE POLICY "Consultant reads assigned projects" ON projects
  FOR SELECT USING (auth.uid() = consultant_id);

DROP POLICY IF EXISTS "Involved parties update projects" ON projects;
CREATE POLICY "Involved parties update projects" ON projects
  FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = consultant_id);

-- Same bug, same root cause: submissions' policies subquery projects via
-- the same wrong consultant_profiles.id assumption, so a consultant could
-- never read or upload review-round submissions for their own projects.
DROP POLICY IF EXISTS "Project parties read submissions" ON submissions;
CREATE POLICY "Project parties read submissions" ON submissions
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE client_id = auth.uid() OR consultant_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Consultant creates submissions" ON submissions;
CREATE POLICY "Consultant creates submissions" ON submissions
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE consultant_id = auth.uid())
  );

-- `payments` never had a consultant-read policy at all — only "Payer reads
-- own payments" (the client). projectService.fetchConsultantEarnings /
-- fetchProjectPayments are used by ConsultantEarningsHistoryScreen and the
-- consultant view of HistoryScreen, and would silently return zero rows
-- under RLS even though the app-side query is correct.
CREATE POLICY "Consultant reads payments for own projects" ON payments
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE consultant_id = auth.uid())
  );
