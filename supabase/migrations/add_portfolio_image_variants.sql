-- The same artwork photo is displayed at different aspect ratios across the
-- app (square in the profile/shop, portrait in FeaturedCreatorCard, wide in
-- the ExploreConsultantsScreen banner). Store one cropped variant per shape
-- instead of forcing a single crop to be reused (and mangled by `cover`)
-- everywhere.

ALTER TABLE shop_products
  ADD COLUMN IF NOT EXISTS image_variants JSONB;

ALTER TABLE consultant_profiles
  ADD COLUMN IF NOT EXISTS portfolio_card_image TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_banner_image TEXT;
