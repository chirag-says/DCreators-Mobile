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
