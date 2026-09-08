-- Separate a creator's showcase from what they actually sell.
--
-- shop_products has been carrying two different ideas in one table:
--
--   1. PORTFOLIO / SHOWCASE — the five best works a creator uploads through
--      "Update Creative Portfolio". Their job is to prove skill so a client
--      decides to hire. Whether they are purchasable is beside the point.
--   2. SALE LISTINGS — artwork put up for sale, with a price, that a buyer
--      can send a purchase request for.
--
-- Because both lived in one undifferentiated set, the consultant's home
-- dashboard showed portfolio pieces under the heading "My Artwork Listings"
-- and a single Add button had to mean both things at once.
--
-- `kind` makes the distinction explicit: the home Profile tab shows
-- 'showcase', the SALES tab shows 'listing', and each gets its own add flow.
--
-- Existing rows all came from the portfolio upload screen, so the NOT NULL
-- DEFAULT backfills them to 'showcase' in one pass with no separate UPDATE.
-- The public shop is unaffected: fetchShopProducts filters on is_active, not
-- on kind, so anything already visible to buyers stays visible.

ALTER TABLE shop_products
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'showcase';

-- Guard the vocabulary. Added separately and idempotently because
-- ADD COLUMN ... CHECK would re-fail on a second run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shop_products_kind_check'
  ) THEN
    ALTER TABLE shop_products
      ADD CONSTRAINT shop_products_kind_check CHECK (kind IN ('showcase', 'listing'));
  END IF;
END $$;

COMMENT ON COLUMN shop_products.kind IS
  'showcase = portfolio piece proving skill (max 5, home Profile tab); listing = artwork for sale (SALES tab).';

-- Both screens read "this consultant's rows of this kind, newest first".
CREATE INDEX IF NOT EXISTS idx_shop_products_consultant_kind
  ON shop_products (consultant_id, kind, created_at DESC);
