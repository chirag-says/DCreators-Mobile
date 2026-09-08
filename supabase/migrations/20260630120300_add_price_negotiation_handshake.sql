-- Symmetric price-negotiation handshake (direct hire + bid flow).
--
-- Before this, "negotiation" was free-text chat only: the consultant's
-- `final_offer` was write-only (the client never saw or approved it) and the
-- client had no way to accept or counter a price. This migration adds the
-- minimal state needed for a real Propose -> Accept / Counter / Decline
-- handshake on both sides:
--
--   * projects.offer_by      -- who made the CURRENT proposed price
--   * projects.price_agreed  -- true once both sides agreed (gates advance pay)
--   * bid_candidates.offer_by-- same idea, pre-project, on the candidate row
--
-- Price semantics after this migration:
--   projects.budget        = client's original budget (reference, immutable)
--   projects.final_offer   = the CURRENT proposed/agreed price under negotiation
--   bid_candidates.quoted_price = the CURRENT proposed/agreed price for that bid
--
-- Purely additive (migration ladder L1: safe). DOWN section at the bottom.

-- ── projects ────────────────────────────────────────────────────
ALTER TABLE projects ADD COLUMN IF NOT EXISTS offer_by TEXT
  CHECK (offer_by IN ('client', 'consultant'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS price_agreed BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing rows so the handshake reads correctly:
--  * A project still in negotiation ('assigned') carries the client's opening
--    price; seed final_offer from budget where it was never set, mark the
--    pending offer as the client's, not yet agreed.
UPDATE projects
  SET final_offer = COALESCE(final_offer, budget),
      offer_by    = 'client'
  WHERE status = 'assigned' AND offer_by IS NULL;

--  * Anything already past negotiation (advance_pending and beyond) had its
--    price effectively settled, so treat it as agreed and seed final_offer.
UPDATE projects
  SET price_agreed = true,
      final_offer  = COALESCE(final_offer, budget)
  WHERE status NOT IN ('draft', 'assigned', 'cancelled', 'rejected');

-- ── bid_candidates ──────────────────────────────────────────────
-- quoted_price is set by the client when they build the priority list, so the
-- opening offer always belongs to the client until a consultant counters.
ALTER TABLE bid_candidates ADD COLUMN IF NOT EXISTS offer_by TEXT
  NOT NULL DEFAULT 'client'
  CHECK (offer_by IN ('client', 'consultant'));

-- ── RLS: let the client counter / accept on their own bid candidates ──
-- The original policy set only let the *consultant* update candidate rows
-- ("Consultant manages own candidate rows" FOR ALL). The symmetric handshake
-- needs the client to write quoted_price/offer_by/status on candidates of
-- their own bid_requests too (counter a consultant's price, or accept it).
DROP POLICY IF EXISTS "Client updates candidates for own bid" ON bid_candidates;
CREATE POLICY "Client updates candidates for own bid" ON bid_candidates
  FOR UPDATE USING (
    bid_request_id IN (SELECT id FROM bid_requests WHERE client_id = auth.uid())
  )
  WITH CHECK (
    bid_request_id IN (SELECT id FROM bid_requests WHERE client_id = auth.uid())
  );

-- ── DOWN (manual rollback) ──────────────────────────────────────
-- DROP POLICY IF EXISTS "Client updates candidates for own bid" ON bid_candidates;
-- ALTER TABLE projects        DROP COLUMN IF EXISTS offer_by;
-- ALTER TABLE projects        DROP COLUMN IF EXISTS price_agreed;
-- ALTER TABLE bid_candidates  DROP COLUMN IF EXISTS offer_by;
