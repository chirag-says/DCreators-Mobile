-- Category-specific onboarding intake (Flow 1 of 3 — see plan doc).
--
-- 1. `category_details` stores the answers to each category's question set
--    (defined in src/config/categoryQuestions.ts) as flexible JSON — one
--    column serves every category instead of N category-specific columns.
-- 2. `videographer` is a new allowed category value, alongside the existing
--    photographer/designer/sculptor/artisan. Painters stay under the existing
--    `sculptor` category (UI label "Artist") via category_details fields
--    rather than a rename of a live enum value.

ALTER TABLE consultant_profiles
  ADD COLUMN IF NOT EXISTS category_details JSONB DEFAULT '{}'::jsonb;

ALTER TABLE consultant_profiles DROP CONSTRAINT IF EXISTS consultant_profiles_category_check;
ALTER TABLE consultant_profiles ADD CONSTRAINT consultant_profiles_category_check
  CHECK (category IN ('photographer', 'videographer', 'designer', 'sculptor', 'artisan'));
