// ============================================
// Consultant Service
// All Supabase queries related to consultant profiles
// ============================================

import { supabase } from '../lib/supabase';
import type { ConsultantProfile } from '../types';

export interface ConsultantRating {
  average_rating: number;
  review_count: number;
}

/**
 * Average rating + review count for a set of consultants, keyed by user_id.
 *
 * Batched on purpose: a client browsing a list would otherwise fire one query
 * per card. Consultants with no reviews are simply absent from the map, which
 * callers render as "New" rather than a misleading 0.0.
 *
 * Reads the `consultant_ratings` view (20260826120300). Never throws — a
 * missing rating must not take down a profile or a booking screen.
 */
export async function fetchConsultantRatings(
  consultantUserIds: string[],
): Promise<Record<string, ConsultantRating>> {
  const ids = Array.from(new Set(consultantUserIds.filter(Boolean)));
  if (ids.length === 0) return {};

  const { data, error } = await supabase
    .from('consultant_ratings')
    .select('consultant_user_id, average_rating, review_count')
    .in('consultant_user_id', ids);

  if (error) {
    console.error('[ConsultantService] fetchConsultantRatings error:', error.message);
    return {};
  }

  const map: Record<string, ConsultantRating> = {};
  for (const row of data ?? []) {
    map[(row as any).consultant_user_id] = {
      average_rating: Number((row as any).average_rating) || 0,
      review_count: Number((row as any).review_count) || 0,
    };
  }
  return map;
}

/**
 * Fetch all active consultant profiles for the dashboard.
 * Returns typed ConsultantProfile array, never throws.
 */
export async function fetchActiveConsultants(): Promise<ConsultantProfile[]> {
  const { data, error } = await supabase
    .from('consultant_profiles')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[ConsultantService] fetchActiveConsultants error:', error.message);
    return [];
  }

  return (data ?? []) as ConsultantProfile[];
}

/**
 * Fetch trending consultants (most recent active profiles).
 */
export async function fetchTrendingConsultants(limit = 6): Promise<ConsultantProfile[]> {
  const { data, error } = await supabase
    .from('consultant_profiles')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[ConsultantService] fetchTrendingConsultants error:', error.message);
    return [];
  }

  return (data ?? []) as ConsultantProfile[];
}

/**
 * Search consultants by query and/or category.
 */
export async function searchConsultants(params: {
  query?: string;
  category?: string | null;
  limit?: number;
}): Promise<ConsultantProfile[]> {
  const { query, category, limit = 20 } = params;

  let request = supabase
    .from('consultant_profiles')
    .select('*')
    .eq('is_active', true);

  if (category) {
    request = request.eq('category', category);
  }

  if (query?.trim()) {
    request = request.or(
      `display_name.ilike.%${query}%,expertise.ilike.%${query}%,subtitle.ilike.%${query}%`
    );
  }

  const { data, error } = await request.limit(limit);

  if (error) {
    console.error('[ConsultantService] searchConsultants error:', error.message);
    return [];
  }

  return (data ?? []) as ConsultantProfile[];
}

/**
 * Find approved, active consultants matching categories and a budget band,
 * for the bidding-path consultant-matching screen.
 */
export async function fetchMatchingConsultants(params: {
  categories: string[];
  minPrice: number;
  maxPrice: number;
  limit?: number;
}): Promise<ConsultantProfile[]> {
  const { data, error } = await supabase
    .from('consultant_profiles')
    .select('id, user_id, display_name, code, experience, avatar_url, base_price, category, is_approved')
    .in('category', params.categories)
    .eq('is_approved', true)
    .eq('is_active', true)
    .gte('base_price', params.minPrice)
    .lte('base_price', params.maxPrice)
    .order('base_price', { ascending: true })
    .limit(params.limit ?? 20);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ConsultantProfile[];
}

/** Fetch a consultant's per-service prices for a category. */
export async function fetchConsultantServicePricing(consultantId: string, category: string): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('consultant_service_pricing')
    .select('service_name, price')
    .eq('consultant_id', consultantId)
    .eq('category', category);

  if (error) {
    console.error('[ConsultantService] fetchConsultantServicePricing error:', error.message);
    return {};
  }

  const map: Record<string, string> = {};
  (data ?? []).forEach((row: any) => { map[row.service_name] = String(row.price ?? 0); });
  return map;
}

/** Upsert a consultant's per-service prices for a category. */
export async function upsertConsultantServicePricing(rows: Array<{
  consultant_id: string;
  category: string;
  service_name: string;
  price: number;
  is_submitted: boolean;
}>): Promise<void> {
  const { error } = await supabase
    .from('consultant_service_pricing')
    .upsert(
      rows.map(r => ({ ...r, updated_at: new Date().toISOString() })),
      { onConflict: 'consultant_id,category,service_name' },
    );

  if (error) {
    throw new Error(error.message);
  }
}

/** Update arbitrary fields on a consultant profile (category details, pricing, etc.). */
export async function updateConsultantProfile(consultantId: string, payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('consultant_profiles').update(payload).eq('id', consultantId);
  if (error) {
    throw new Error(error.message);
  }
}

/** Update a consultant profile keyed by auth user_id rather than profile id. */
export async function updateConsultantProfileByUserId(userId: string, payload: Record<string, unknown>) {
  return supabase.from('consultant_profiles').update(payload).eq('user_id', userId);
}

/** Resolve a consultant_profiles row's auth user_id, for notification targeting. */
export async function fetchConsultantUserId(consultantProfileId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('consultant_profiles')
    .select('user_id')
    .eq('id', consultantProfileId)
    .single();

  if (error) {
    console.error('[ConsultantService] fetchConsultantUserId error:', error.message);
    return null;
  }

  return data?.user_id ?? null;
}

/** Fetch active consultant profiles by ID (e.g. a user's locally-saved/bookmarked list). */
export async function fetchConsultantsByIds(ids: string[]): Promise<ConsultantProfile[]> {
  const { data, error } = await supabase
    .from('consultant_profiles')
    .select('*')
    .in('id', ids)
    .eq('is_active', true);

  if (error) {
    console.error('[ConsultantService] fetchConsultantsByIds error:', error.message);
    return [];
  }

  return (data ?? []) as ConsultantProfile[];
}

/**
 * Fetch approved, active consultants for collaboration invites (most recently joined first).
 */
export async function fetchApprovedConsultants(limit = 10): Promise<ConsultantProfile[]> {
  const { data, error } = await supabase
    .from('consultant_profiles')
    .select('*')
    .eq('is_approved', true)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[ConsultantService] fetchApprovedConsultants error:', error.message);
    return [];
  }

  return (data ?? []) as ConsultantProfile[];
}

/**
 * Sync a consultant's portfolio thumbnail/card/banner images on their profile,
 * derived from their most recent shop_products. Client-facing screens read
 * portfolio images off consultant_profiles, not shop_products directly.
 */
export async function syncConsultantPortfolioImages(consultantId: string, maxSlots: number): Promise<void> {
  const { data } = await supabase
    .from('shop_products')
    .select('images, image_variants')
    .eq('consultant_id', consultantId)
    // Showcase only: the public profile carousel, featured card and explore
    // banner are meant to show curated best work, not whatever was last put
    // up for sale.
    .eq('kind', 'showcase')
    .order('created_at', { ascending: false })
    .limit(maxSlots);

  const rows = data ?? [];
  const squareImages = rows.map((p: any) => p.image_variants?.square ?? p.images?.[0]).filter(Boolean);
  const primary = rows[0] as any;
  const cardImage = primary?.image_variants?.card ?? primary?.images?.[0] ?? null;
  const bannerImage = primary?.image_variants?.banner ?? primary?.images?.[0] ?? null;

  const { error } = await supabase.from('consultant_profiles').update({
    portfolio_images: squareImages,
    portfolio_card_image: cardImage,
    portfolio_banner_image: bannerImage,
  }).eq('id', consultantId);

  if (error) {
    console.error('[ConsultantService] syncConsultantPortfolioImages error:', error.message);
  }
}

/**
 * Create or update a consultant profile during onboarding (KYC + banking details).
 * Keyed on user_id; safe to call again if onboarding is retried.
 *
 * This writes two tables. The browsable half lives on consultant_profiles,
 * which carries a public read policy; the Aadhaar, PAN and bank details live
 * on consultant_kyc, which is readable only by the creator they belong to.
 * See 20260830120200_move_kyc_out_of_public_table.sql for why they were split.
 */
export async function upsertConsultantProfile(profile: {
  user_id: string;
  display_name: string;
  code: string;
  experience: string | null;
  institution_name: string | null;
  avatar_url: string | null;
  aadhar_number: string;
  pan_number: string;
  bank_name: string;
  ifsc_code: string;
  bank_account_number: string;
  terms_pdf_url: string | null;
}): Promise<void> {
  const {
    aadhar_number, pan_number, bank_name, ifsc_code, bank_account_number,
    ...publicProfile
  } = profile;

  // `is_approved` is deliberately absent. On insert the column default (false)
  // applies; on a retry or a later edit the existing value is left alone, so
  // an approved creator does not silently lose their approval by saving their
  // own profile. It is not a field the app may write at all — see
  // 20260830120100_lock_consultant_approval.sql.
  const { data: saved, error } = await supabase
    .from('consultant_profiles')
    .upsert({ ...publicProfile, is_active: true }, { onConflict: 'user_id', ignoreDuplicates: false })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  const { error: kycError } = await supabase.from('consultant_kyc').upsert({
    consultant_id: saved.id,
    aadhar_number,
    pan_number,
    bank_name,
    ifsc_code,
    bank_account_number,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'consultant_id', ignoreDuplicates: false });

  if (kycError) throw new Error(kycError.message);
}

// approveConsultantProfile lived here and set is_approved = true from the app.
// Finishing your own portfolio upload is not vetting, so the only caller
// (ConsultantPortfolioUpdateScreen, at the end of onboarding) was approving
// every creator the moment they signed up, while the success alert told them
// they were "pending admin approval". Approval is now a service-role action.
