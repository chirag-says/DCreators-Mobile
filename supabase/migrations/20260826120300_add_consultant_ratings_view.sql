-- Aggregate rating per consultant, so clients can see a score before they book.
--
-- Reviews have been collected since add_reviews_table.sql and read back on the
-- consultant's own earnings screen, but no client-facing surface (creator
-- profile, featured cards, booking screen) showed a single star. A client was
-- being asked to commit money on portfolio images alone.
--
-- A view rather than denormalised columns on consultant_profiles: an average
-- that lives in two places drifts the first time a review is deleted or
-- edited, and there is no volume here that would justify that risk.
--
-- reviews.consultant_id is the consultant's auth user_id (profiles.id) since
-- fix_reviews_consultant_id_fk.sql, so this keys on user_id throughout.

CREATE OR REPLACE VIEW consultant_ratings
WITH (security_invoker = true) AS
  SELECT
    r.consultant_id                      AS consultant_user_id,
    ROUND(AVG(r.rating)::numeric, 2)     AS average_rating,
    COUNT(*)::int                        AS review_count
  FROM reviews r
  WHERE r.consultant_id IS NOT NULL
  GROUP BY r.consultant_id;

COMMENT ON VIEW consultant_ratings IS
  'Average rating and review count per consultant user_id. security_invoker so the caller''s RLS on reviews applies.';

-- reviews already carries a permissive "Anyone can read reviews" SELECT policy,
-- so an invoker-rights view is readable by both roles without widening anything.
GRANT SELECT ON consultant_ratings TO authenticated, anon;
