// ============================================
// DCreators TypeScript Types
// Master type definitions for all entities
// ============================================

import type { PriceUnit, DurationUnit } from '../lib/booking';

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  pin: string | null;
  avatar_url: string | null;
  has_consultant_profile: boolean;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConsultantProfile {
  id: string;
  user_id: string;
  display_name: string;
  code: string;
  category: ConsultantCategory | null;
  subtitle: string | null;
  experience: string | null;
  expertise: string | null;
  bio: string | null;
  avatar_url: string | null;
  portfolio_images: string[] | null;
  // Per-placement crops of the primary (most recent) artwork — see
  // ImageCropModal for which screen reads which shape.
  portfolio_card_image: string | null;
  portfolio_banner_image: string | null;
  base_price: number | null;
  /** What base_price is quoted against. NOT NULL in the DB, defaults per_project. */
  price_unit: PriceUnit;
  is_approved: boolean;
  is_active: boolean;
  institution_name: string | null;
  terms_pdf_url: string | null;
  // Aadhaar, PAN and bank details are NOT here. consultant_profiles is
  // publicly readable for approved creators, so they live on consultant_kyc
  // instead, behind an owner-only policy. The app writes them during
  // onboarding and never reads them back.
  // Category-specific onboarding answers — see src/config/categoryQuestions.ts
  // for the question schema each category's answers are keyed against.
  category_details: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type ConsultantCategory = 'photographer' | 'videographer' | 'designer' | 'sculptor' | 'artisan';

export type UserRole = 'client' | 'consultant';

// ── Spec-locked status machine (DO NOT ADD STATUSES WITHOUT SPEC UPDATE) ────
export type ProjectStatus =
  | 'draft'               // CLIENT_ASSIGN_PROJECT_SCREEN — saved but not submitted
  | 'assigned'            // CLIENT_CONSULTANT_MATCHING_SCREEN — consultant selected
  | 'advance_pending'     // CLIENT_ADVANCE_PAYMENT_SCREEN — awaiting advance payment
  | 'advance_paid'        // CLIENT_ADVANCE_PAYMENT_SUCCESS — advance confirmed
  | 'work_order_generated'// CLIENT_GENERATE_WORK_ORDER_SCREEN — WO created, immutable
  | 'work_order_accepted' // CONSULTANT_WORK_ORDER_SCREEN — consultant accepted WO
  | 'in_progress'         // CLIENT_WORK_ORDER_APPROVAL_SCREEN — both parties approved
  | 'review_1'            // CONSULTANT_FIRST_REVIEW_UPLOAD_SCREEN round 1
  | 'review_2'            // round 2
  | 'final_review'        // round 3 (FINAL — no round 4)
  | 'final_approved'      // CLIENT_DESIGN_REVIEW_SCREEN — client approved final
  | 'balance_pending'     // CLIENT_BALANCE_PAYMENT_SCREEN — awaiting balance payment
  | 'balance_paid'        // CLIENT_FINAL_PAYMENT_SUCCESS_SCREEN — balance confirmed
  | 'delivered'           // Download unlocked after balance_paid
  | 'completed'           // CLIENT_REVIEW_CONSULTANT_SCREEN — review submitted
  | 'cancelled'
  | 'rejected';

export interface Project {
  id: string;
  client_id: string;
  consultant_id: string | null;  // null until assigned (bidding path)
  assignment_type: string;
  assignment_details: string[] | null;
  assignment_brief: string;
  deadline: string | null;
  // The date being booked (e.g. the wedding/shoot day) — distinct from
  // `deadline`, which is the delivery deadline for the finished work.
  event_date: string | null;
  // Call time on event_date, and how long the consultant is held for. All null
  // on the bidding path and on rows predating 20260829120100 — the direct
  // booking screen is the only flow that collects them.
  start_time: string | null;
  duration_value: number | null;
  duration_unit: DurationUnit | null;
  budget: number;
  // The CURRENT proposed/agreed price under negotiation. Starts equal to
  // `budget` (client's opening offer); updated as either side counters; frozen
  // once `price_agreed` is true. Read as `final_offer ?? budget` everywhere.
  final_offer: number | null;
  // Who made the current pending price proposal. null only on drafts.
  offer_by: 'client' | 'consultant' | null;
  // True once both parties accepted the same price. Gates advance payment:
  // `assigned -> advance_pending` is only legal when this is true.
  price_agreed: boolean;
  status: ProjectStatus;
  progress_percent: number;
  work_order_data: Record<string, unknown> | null; // immutable after work_order_generated
  milestone_1_date: string | null;
  milestone_2_date: string | null;
  final_date: string | null;
  created_at: string;
  updated_at: string;
}

export type BidRequestStatus = 'open' | 'fulfilled' | 'unfulfilled' | 'cancelled';
export type BidCandidateStatus = 'queued' | 'pending' | 'negotiating' | 'accepted' | 'declined' | 'skipped';

export interface BidRequest {
  id: string;
  client_id: string;
  category: ConsultantCategory;
  /** Concrete deliverable ("Logo Design"). Null on rows created before the column existed. */
  creative_item: string | null;
  assignment_brief: string;
  event_date: string | null;
  budget: number;
  status: BidRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface BidCandidate {
  id: string;
  bid_request_id: string;
  consultant_id: string; // consultant_profiles.id — NOT auth user_id
  priority_rank: number;
  quoted_price: number;        // CURRENT proposed/agreed price for this candidate
  offer_by: 'client' | 'consultant'; // who made the current pending proposal
  status: BidCandidateStatus;
  project_id: string | null; // set once accepted
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  project_id: string;
  round: 'review_1' | 'review_2' | 'final';
  files: string[];
  consultant_note: string | null;
  selected_option: number | null;
  feedback_colour: boolean;
  feedback_concept: boolean;
  feedback_design_look: boolean;
  feedback_text: string | null;
  client_action: 'approve' | 'revert' | 'hold' | 'cancel' | null;
  created_at: string;
}

export interface Payment {
  id: string;
  project_id: string;
  payer_id: string;
  amount: number;
  payment_type: 'advance' | 'balance' | 'shop_purchase';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'assignment' | 'payment' | 'review' | 'system';
  is_read: boolean;
  data: Record<string, unknown> | null;
  created_at: string;
}

export interface ShopProduct {
  id: string;
  consultant_id: string;
  title: string;
  description: string | null;
  price: number;
  images: string[] | null;
  category: string | null;
  is_active: boolean;
  /** 'showcase' = portfolio piece (home Profile tab); 'listing' = for sale (SALES tab). */
  kind: 'showcase' | 'listing';
  created_at: string;
}

export interface FloatingQuery {
  id: string;
  client_id: string;
  assignment_type: string;
  assignment_brief: string;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  status: 'open' | 'closed' | 'expired';
  created_at: string;
}

export interface FloatingQueryResponse {
  id: string;
  query_id: string;
  consultant_id: string;
  proposed_price: number | null;
  proposed_timeline: string | null;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  display_name: string;
  is_active: boolean;
  sort_order: number;
}

// ── Product B: Artwork Marketplace ──────────────────────────────
// Status machine: requested → accepted → advance_paid → dispatched → delivered → completed
export type ArtworkOrderStatus =
  | 'requested'    // Buyer submitted purchase request; artist must accept/decline
  | 'accepted'     // Artist accepted; buyer pays advance
  | 'declined'     // Artist declined the request
  | 'advance_paid' // Buyer paid advance; artist ships artwork
  | 'dispatched'   // Artist entered consignment number; in transit
  | 'delivered'    // Buyer confirms receipt; pays balance
  | 'completed'    // Balance paid; order closed
  | 'cancelled';   // Either party cancelled

export interface ArtworkOrder {
  id: string;
  artwork_id: string;          // FK → shop_products
  buyer_id: string;            // FK → profiles
  artist_id: string;           // FK → profiles (or consultant_profiles)
  status: ArtworkOrderStatus;
  artwork_price: number;       // Full price of artwork
  advance_amount: number;      // Typically 2/3 of price
  balance_amount: number;      // Remaining 1/3
  delivery_address: string;
  consignment_no: string | null;
  buyer_message: string | null;
  declined_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  shop_products?: {
    title: string;
    description: string | null;
    price: number;
    images: string[] | null;
    category: string | null;
  };
  buyer_profile?: {
    name: string;
    avatar_url: string | null;
  };
  artist_profile?: {
    name: string;
    avatar_url: string | null;
  };
}
