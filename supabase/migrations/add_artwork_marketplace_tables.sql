-- Product B: Artwork Marketplace tables.
--
-- `artwork_orders` and `artwork_payments` are referenced throughout the code
-- (ArtistOrderDispatchScreen, ArtistSalesRequestScreen, ArtworkOrderTrackingScreen,
-- ArtworkPaymentScreen, ConsultantDashboard, ConsultantEarningsHistoryScreen) but
-- were never created in any prior migration — same class of gap as
-- consultant_service_pricing before add_consultant_pricing_and_portfolio_columns.sql.
--
-- Status machine (see src/types/index.ts ArtworkOrderStatus):
--   requested -> accepted|declined -> advance_paid -> dispatched -> delivered -> completed
--
-- artist_id/buyer_id reference profiles(id) (the auth user), not
-- consultant_profiles(id) — confirmed by ConsultantDashboard.tsx using
-- `consultantProfile.user_id ?? profile.id` as the artist_id filter value.

CREATE TABLE IF NOT EXISTS artwork_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  artist_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'accepted', 'declined', 'advance_paid', 'dispatched', 'delivered', 'completed', 'cancelled')),
  artwork_price DECIMAL(10,2) NOT NULL,
  advance_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_address TEXT,
  consignment_no TEXT,
  buyer_message TEXT,
  declined_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE artwork_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer reads own artwork orders" ON artwork_orders
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = artist_id);

CREATE POLICY "Buyer creates artwork orders" ON artwork_orders
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyer or artist updates own artwork orders" ON artwork_orders
  FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = artist_id);

CREATE TABLE IF NOT EXISTS artwork_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES artwork_orders(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('artwork_advance', 'artwork_balance')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE artwork_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payer reads own artwork payments" ON artwork_payments
  FOR SELECT USING (
    auth.uid() = payer_id
    OR auth.uid() IN (SELECT artist_id FROM artwork_orders WHERE id = order_id)
  );

CREATE POLICY "Payer creates own artwork payments" ON artwork_payments
  FOR INSERT WITH CHECK (auth.uid() = payer_id);

CREATE INDEX IF NOT EXISTS idx_artwork_orders_artist_status ON artwork_orders (artist_id, status);
CREATE INDEX IF NOT EXISTS idx_artwork_orders_buyer ON artwork_orders (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artwork_payments_order ON artwork_payments (order_id);
