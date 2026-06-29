// ============================================
// Consultant Service
// All Supabase queries related to consultant profiles
// ============================================

import { supabase } from '../lib/supabase';
import type { ConsultantProfile } from '../types';

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
  const { error } = await supabase.from('consultant_profiles').upsert({
    ...profile,
    is_approved: false,
    is_active: true,
  }, { onConflict: 'user_id', ignoreDuplicates: false });

  if (error) {
    throw new Error(error.message);
  }
}

/** Mark a consultant profile as approved (e.g. after completing onboarding). */
export async function approveConsultantProfile(consultantId: string): Promise<void> {
  const { error } = await supabase.from('consultant_profiles').update({ is_approved: true }).eq('id', consultantId);
  if (error) {
    throw new Error(error.message);
  }
}
