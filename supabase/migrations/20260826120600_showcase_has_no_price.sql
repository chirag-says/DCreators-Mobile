-- A showcase piece is not merchandise, so it has no price.
--
-- 20260826120500 split shop_products into 'showcase' and 'listing' but left
-- price NOT NULL, which forced the portfolio upload flow to keep asking for a
-- price and an "available for sale" toggle on work that exists only to be
-- looked at. Relaxing the column lets the showcase form drop both fields.
--
-- Dropping NOT NULL is non-breaking: every existing row already has a value,
-- and no read path requires one (the surfaces that show a price all coalesce).
-- The CHECK then puts the requirement back where it belongs — on listings,
-- which cannot be sold without a price.
--
-- Existing showcase rows keep whatever price was typed before the split. It is
-- no longer displayed anywhere and is not worth a destructive UPDATE to erase.

ALTER TABLE shop_products ALTER COLUMN price DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shop_products_listing_needs_price'
  ) THEN
    ALTER TABLE shop_products
      ADD CONSTRAINT shop_products_listing_needs_price
      CHECK (kind <> 'listing' OR (price IS NOT NULL AND price >= 0));
  END IF;
END $$;

COMMENT ON COLUMN shop_products.price IS
  'Required for kind=''listing''. Null for kind=''showcase'' — portfolio work is not for sale.';
