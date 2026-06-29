// ============================================
// DCreators Navigation Types
// Strict type definitions for all route params
// ============================================

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { Project, ConsultantProfile, ShopProduct, BidRequest } from './index';

// ─── Dashboard Creator View Model ────────────────────────────
export interface CreatorCardViewModel {
  id: string;
  name: string;
  code: string;
  subtitle: string;
  experience: string;
  expertise: string;
  avatar_public_id: string;
  avatar_url?: string | null;
  portfolio_images?: string[] | null;
  portfolio_card_image?: string | null;
  portfolio_banner_image?: string | null;
  category: string;
  base_price: number | null;
  is_approved: boolean;
  user_id: string;
}

// ─── Root Stack (all screens) ────────────────────────────────
export type RootStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  Login: undefined;
  EmailLogin: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  OTPVerification: { email: string };
  Intro: undefined;
  CreateCreatorAccount: undefined;

  // Main tab navigator
  Main: NavigatorScreenParams<MainTabParamList>;

  // Sub-screens
  Settings: undefined;
  EditProfile: undefined;
  EditConsultantProfile: undefined;
  AssignMultiple: { consultantIds?: string[] };
  Terms: undefined;
  ClientWorkorder: { project: Project };
  ClientReview: { project: Project };
  Payment: { project: Project; paymentType: 'advance' | 'balance' };

  // Phase 3 — Creative Services Workflow (Product A)
  // owner_role: CLIENT  previous: CLIENT_ASSIGN_PROJECT_SCREEN  next: CLIENT_CONSULTANT_MATCHING_SCREEN
  ConsultantMatching: { project: Project };
  // owner_role: CLIENT  previous: CLIENT_ADVANCE_PAYMENT_SCREEN  next: CONSULTANT_WORK_ORDER_SCREEN
  GenerateWorkOrder: { project: Project; txnId: string; payAmount: number };
  // owner_role: CONSULTANT  previous: notification  next: CreatorWorkorder (work_order_accepted)
  ConsultantWorkOrder: { project: Project };
  // owner_role: CLIENT  previous: PaymentScreen (balance_paid)  next: Main/Dashboard
  RateConsultant: { project: Project };

  // Phase 4 — Product B: Artwork Marketplace
  // owner_role: ARTIST  previous: notification (purchase_request)
  ArtistSalesRequest: { orderId: string };
  // owner_role: ARTIST  previous: ArtistSalesRequest (accepted)
  ArtistOrderDispatch: { orderId: string };
  // owner_role: BUYER  previous: Shop / notification
  ArtworkOrderTracking: { orderId: string };
  // owner_role: BUYER  previous: ArtworkOrderTracking  covers advance + balance payment
  ArtworkPayment: { order: any; paymentType: 'artwork_advance' | 'artwork_balance' };
  // owner_role: CONSULTANT/ARTIST  Figma: ARTIST_DASHBOARD_SCREEN
  CreatorDashboard: undefined;

  // Phase 5 — Consultant Management
  ConsultantServicePricing: { fromOnboarding?: boolean } | undefined;
  // owner_role: CONSULTANT  previous: ConsultantServicePricing (onboarding)  next: ConsultantPortfolioUpdate
  ConsultantCategoryDetails: { fromOnboarding?: boolean } | undefined;

  // Phase 6 — Remaining Figma Screens
  HireConsultant: { consultant?: any } | undefined;
  // owner_role: CLIENT  previous: CreatorProfile "Hire Now"  next: Main/CreatorWorkorder (status: assigned)
  BookConsultant: { consultant: CreatorCardViewModel };
  ConsultantPortfolioUpdate: { fromOnboarding?: boolean } | undefined;
  PaymentConfirmed: { transactionId?: string; amountPaid?: number; paidAt?: string; projectId?: string } | undefined;
  ArtistSalesRequestDetail: { order: any };

  // Phase 7 — Bidding with priority list + negotiation chat
  // owner_role: CLIENT  next: BidCandidates
  CreateBid: undefined;
  // owner_role: CLIENT  previous: CreateBid  next: BidStatus
  BidCandidates: { bidRequest: BidRequest };
  // owner_role: CLIENT  previous: BidCandidates  next: Chat (negotiating) | Main/CreatorWorkorder (accepted)
  BidStatus: { bidRequestId: string };

  Filter: undefined;
  PortfolioGallery: { images: string[]; initialIndex?: number };

  // Full-screen features
  Notifications: undefined;
  Chat:
    | { project: Project; otherName: string }
    | { bidCandidateId: string; otherName: string; quotedPrice: number };
  Invoice: { project: Project };
  SavedCreators: undefined;
  RatingReview: { project: Project };
  Shop: undefined;
  ProductDetails: { product: ShopProduct & { consultant_profiles?: { display_name: string; code: string } } };
  MessagesList: undefined;
  MyProducts: undefined;
  AddEditProduct: { product?: ShopProduct } | undefined;
};

// ─── Main Tab Navigator ──────────────────────────────────────
export type MainTabParamList = {
  Dashboard: undefined;
  Search: undefined;
  History: undefined;
  CreatorProfile: { creator: CreatorCardViewModel };
  // owner_role: CLIENT  workflow: BIDDING PATH (no consultant pre-selected)
  // owner_role: CLIENT  workflow: DIRECT HIRE (consultant pre-loaded via creator param)
  AssignProject: { consultant?: CreatorCardViewModel } | undefined;
  FloatingQuery: undefined;
  CreatorWorkorder: { project: Project };
  // owner_role: CLIENT  bottom-nav tab: bidding entry point + active projects/bids
  MyActivity: undefined;
  // owner_role: CONSULTANT  bottom-nav tab: incoming bid requests (Accept/Negotiate/Reject)
  ConsultantBidInbox: undefined;
  // owner_role: CONSULTANT  bottom-nav tab: ongoing/delivered service projects + calendar
  ConsultantProjectManagement: undefined;
  // owner_role: CONSULTANT  bottom-nav tab: artwork sales earnings/history
  ConsultantEarningsHistory: undefined;
};

// ─── Screen Props Helpers ────────────────────────────────────
// Use these to type individual screen components.
//
// Example:
//   function DashboardScreen({ navigation, route }: MainTabScreenProps<'Dashboard'>) { ... }

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;
