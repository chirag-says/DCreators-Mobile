-- Give bid requests a creative item, so a project born from a bid has a real
-- assignment title instead of falling back to the role ("Hire Designer").
--
-- AssignProjectScreen and HireConsultantScreen already ask the client to pick
-- a creative item and write it to projects.assignment_details[0]. CreateBid
-- did not, so acceptBidCandidate() inserted assignment_details: null and every
-- downstream surface degraded to assignment_type. Same gap on the booking
-- flow, but BookConsultantScreen builds its project payload client-side and
-- needs no column of its own.
--
-- Additive and nullable: existing rows stay valid, no backfill required,
-- no rewrite of the table. Safe to run on a live database.

ALTER TABLE bid_requests ADD COLUMN IF NOT EXISTS creative_item TEXT;

COMMENT ON COLUMN bid_requests.creative_item IS
  'Concrete deliverable chosen by the client (e.g. "Logo Design"). Copied into projects.assignment_details[0] when a candidate accepts.';
