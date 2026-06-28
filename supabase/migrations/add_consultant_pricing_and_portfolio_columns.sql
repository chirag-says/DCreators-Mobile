-- Fixes for the consultant onboarding flow (Steps 2 & 3):
--
-- 1. `consultant_service_pricing` was referenced by ConsultantServicePricingScreen
--    but never actually created in any prior migration/schema file.
-- 2. `shop_products` is missing columns ConsultantPortfolioUpdateScreen writes
--    (size, medium, available, brief, updated_at) — AddEditProductScreen never
--    used these so they were never added.

CREATE TABLE IF NOT EXISTS consultant_service_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES consultant_profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  service_name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (consultant_id, category, service_name)
);

ALTER TABLE consultant_service_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads service pricing" ON consultant_service_pricing
  FOR SELECT USING (true);
CREATE POLICY "Consultant manages own service pricing" ON consultant_service_pricing
  FOR ALL USING (
    consultant_id IN (SELECT id FROM consultant_profiles WHERE user_id = auth.uid())
  );

ALTER TABLE shop_products
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS medium TEXT,
  ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS brief TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
