-- 1. "Institution / Organization" was collected nowhere in the signup flow —
--    add a dedicated column for it (kept separate from `subtitle`, which
--    ConsultantServicePricingScreen already writes a different value into).
ALTER TABLE consultant_profiles
  ADD COLUMN IF NOT EXISTS institution_name TEXT;

-- 2. ConsultantPortfolioUpdateScreen previously wrote the "Artwork
--    description" textarea into shop_products.brief, but every screen that
--    displays a product (ProductDetailsScreen, ShopScreen,
--    CreatorDashboardScreen) reads shop_products.description instead — so
--    every description ever entered was silently discarded. The app code
--    now writes to `description` (which already exists); no column change
--    needed for that fix, but backfill anything already stored in `brief`
--    so existing artwork descriptions aren't lost.
UPDATE shop_products
SET description = brief
WHERE description IS NULL AND brief IS NOT NULL;
