-- Performance indexes for foreign-key / filter+sort columns.
--
-- Postgres auto-indexes PRIMARY KEY and UNIQUE columns, but NOT foreign keys.
-- Every column below is something the app filters on (.eq) and/or RLS policies
-- join on (`... IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid())`)
-- — so these indexes speed up both client queries and row-level-security checks.
--
-- Where a screen filters by a FK *and* sorts by created_at, the index is a
-- composite (filter col first, sort col second) so Postgres can satisfy both
-- from one index scan.
--
-- Deliberately OMITTED (already covered by an existing index, do not duplicate):
--   consultant_service_pricing.consultant_id  → leading col of UNIQUE(consultant_id, category, service_name)
--   consultant_blocked_dates.consultant_id    → leading col of UNIQUE(consultant_id, blocked_date)
--   bid_candidates.bid_request_id             → leading col of UNIQUE(bid_request_id, consultant_id)
--   bid_candidates (bid_request_id, priority_rank) ordering → UNIQUE(bid_request_id, priority_rank)
--   consultant_profiles.user_id               → UNIQUE
--
-- All statements are idempotent (IF NOT EXISTS) and safe to re-run.
-- NOTE: tables are small today so a plain CREATE INDEX takes a brief lock and is
-- fine. On a large production table, run each as CREATE INDEX CONCURRENTLY
-- OUTSIDE a transaction instead (CONCURRENTLY cannot run inside a txn block).

-- ── projects ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_projects_client_created
  ON projects (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_consultant_created
  ON projects (consultant_id, created_at DESC);
-- get_consultant_taken_dates() filters consultant_id + event_date + status
CREATE INDEX IF NOT EXISTS idx_projects_consultant_event_date
  ON projects (consultant_id, event_date)
  WHERE event_date IS NOT NULL;

-- ── submissions ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_submissions_project_created
  ON submissions (project_id, created_at DESC);

-- ── payments ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payments_payer_created
  ON payments (payer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_project
  ON payments (project_id);

-- ── notifications ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

-- ── messages (project chat + bid negotiation chat) ──────────────
CREATE INDEX IF NOT EXISTS idx_messages_project_created
  ON messages (project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_bid_candidate_created
  ON messages (bid_candidate_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender
  ON messages (sender_id);

-- ── floating_queries ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_floating_queries_client_created
  ON floating_queries (client_id, created_at DESC);
-- consultants browse open queries: status = 'open'
CREATE INDEX IF NOT EXISTS idx_floating_queries_open
  ON floating_queries (created_at DESC)
  WHERE status = 'open';

-- ── floating_query_responses ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fq_responses_query
  ON floating_query_responses (query_id);
CREATE INDEX IF NOT EXISTS idx_fq_responses_consultant
  ON floating_query_responses (consultant_id);

-- ── shop_products ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_shop_products_consultant_created
  ON shop_products (consultant_id, created_at DESC);

-- ── reviews ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reviews_consultant_created
  ON reviews (consultant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_project
  ON reviews (project_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer
  ON reviews (reviewer_id);

-- ── bid_requests ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bid_requests_client_created
  ON bid_requests (client_id, created_at DESC);

-- ── bid_candidates (bid_request_id already covered by UNIQUE) ────
CREATE INDEX IF NOT EXISTS idx_bid_candidates_consultant
  ON bid_candidates (consultant_id);
CREATE INDEX IF NOT EXISTS idx_bid_candidates_project
  ON bid_candidates (project_id)
  WHERE project_id IS NOT NULL;

-- ── consultant_profiles (matching / browse by category + price) ──
-- ConsultantMatching & bidService filter category and sort base_price,
-- over only approved+active consultants (matches the public-read RLS policy).
CREATE INDEX IF NOT EXISTS idx_consultant_profiles_category_price
  ON consultant_profiles (category, base_price)
  WHERE is_approved = true AND is_active = true;
