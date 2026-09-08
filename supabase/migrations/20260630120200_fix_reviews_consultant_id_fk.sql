-- Fix reviews.consultant_id FK to match the same semantics fixed for
-- projects.consultant_id in fix_remaining_schema_gaps.sql item 6.
--
-- reviews.consultant_id was REFERENCES consultant_profiles(id), but every
-- write site (RateConsultantScreen.tsx, RatingReviewScreen.tsx) inserts
-- project.consultant_id, which is the consultant's auth user_id (profiles.id)
-- since the projects FK fix. Every read site (fetchRecentReviewsWithReviewer,
-- fetchConsultantReviews in projectService.ts) also filters by user_id.
-- The column itself was the only thing still pointing at consultant_profiles.

ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_consultant_id_fkey;

-- Data migration: convert any existing consultant_profiles.id values to user_id
UPDATE reviews r
SET consultant_id = cp.user_id
FROM consultant_profiles cp
WHERE r.consultant_id = cp.id;

ALTER TABLE reviews ADD CONSTRAINT reviews_consultant_id_fkey
  FOREIGN KEY (consultant_id) REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_reviews_consultant_id ON reviews (consultant_id, created_at DESC);
