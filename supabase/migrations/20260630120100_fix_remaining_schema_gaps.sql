-- Remaining schema gaps identified during post-audit code verification.
-- Run date: 2026-06-29
--
-- Fixes applied:
-- 1. projects.work_order_data JSONB column (contract generation flow)
-- 2. projects.progress_percent range CHECK
-- 3. collaboration_requests table (multi-consultant assignments)
-- 4. consultant_project_notes table (calendar quick-entry notes)
-- 5. projects.status CHECK constraint synced to match TypeScript ProjectStatus
-- 6. projects.consultant_id FK corrected: was referencing consultant_profiles(id)
--    but code stores auth user_id (profiles.id) everywhere

-- ── 1. projects.work_order_data ─────────────────────────────────
ALTER TABLE projects ADD COLUMN IF NOT EXISTS work_order_data JSONB;

-- ── 2. progress_percent range ───────────────────────────────────
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_progress_percent_check;
ALTER TABLE projects ADD CONSTRAINT projects_progress_percent_check
  CHECK (progress_percent >= 0 AND progress_percent <= 100);

-- ── 3. collaboration_requests ───────────────────────────────────
CREATE TABLE IF NOT EXISTS collaboration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE collaboration_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Involved parties read collabs" ON collaboration_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = collaborator_id);
CREATE POLICY "Requester creates collabs" ON collaboration_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE INDEX IF NOT EXISTS idx_collaboration_requests_project
  ON collaboration_requests (project_id);

-- ── 4. consultant_project_notes ─────────────────────────────────
CREATE TABLE IF NOT EXISTS consultant_project_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultant_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  client_name TEXT,
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE consultant_project_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Consultant manages own notes" ON consultant_project_notes
  FOR ALL USING (
    consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_consultant_project_notes_consultant
  ON consultant_project_notes (consultant_id, target_date);

-- ── 5. projects.status CHECK sync ───────────────────────────────
-- Migrate stale status values to their new equivalents first:
--   pending → draft, accepted → assigned, approved → final_approved, expired → cancelled
UPDATE projects SET status = 'draft' WHERE status = 'pending';
UPDATE projects SET status = 'assigned' WHERE status = 'accepted';
UPDATE projects SET status = 'final_approved' WHERE status = 'approved';
UPDATE projects SET status = 'cancelled' WHERE status = 'expired';

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects ADD CONSTRAINT projects_status_check CHECK (
  status IN (
    'draft', 'assigned', 'advance_pending', 'advance_paid',
    'work_order_generated', 'work_order_accepted', 'in_progress',
    'review_1', 'review_2', 'final_review', 'final_approved',
    'balance_pending', 'balance_paid', 'delivered', 'completed',
    'cancelled', 'rejected'
  )
);

-- ── 6. Fix projects.consultant_id FK ────────────────────────────
-- The base schema had: consultant_id REFERENCES consultant_profiles(id)
-- But ALL code paths (bidService.acceptBidCandidate, assignConsultantToProject,
-- RLS policies in fix_projects_consultant_rls.sql) store and compare against
-- the consultant's auth user_id (profiles.id), not consultant_profiles.id.
--
-- Data migration: convert any existing consultant_profiles.id values to user_id
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_consultant_id_fkey;

UPDATE projects p
SET consultant_id = cp.user_id
FROM consultant_profiles cp
WHERE p.consultant_id = cp.id;

ALTER TABLE projects ADD CONSTRAINT projects_consultant_id_fkey
  FOREIGN KEY (consultant_id) REFERENCES profiles(id);
