// ============================================
// Shop Service
// All Supabase queries related to shop products
// ============================================

import { supabase } from '../lib/supabase';
import type { ShopProduct } from '../types';

/** Shop product with joined consultant info */
export interface ShopProductWithConsultant extends ShopProduct {
  consultant_profiles?: {
    user_id: string;
    display_name: string;
    code: string;
  } | null;
}

/**
 * Fetch active shop products with consultant info.
 *
 * Pass `consultantId` (a consultant_profiles.id) to scope it to one creator's
 * shop. Both the Shop button on CreatorProfileScreen and the shop view it
 * opens go through here, so the button cannot appear over an empty shop —
 * `is_active` and `kind` are applied once, in one place.
 */
export async function fetchShopProducts(consultantId?: string): Promise<ShopProductWithConsultant[]> {
  let request = supabase
    .from('shop_products')
    .select('*, consultant_profiles(user_id, display_name, code)')
    .eq('is_active', true)
    // The shop sells things. Showcase pieces have no price and are not for
    // sale, so they belong on the creator's profile, not on a buying surface.
    .eq('kind', 'listing');

  if (consultantId) {
    request = request.eq('consultant_id', consultantId);
  }

  const { data, error } = await request.order('created_at', { ascending: false });

  if (error) {
    console.error('[ShopService] fetchShopProducts error:', error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as ShopProductWithConsultant[];
}

/**
 * Fetch a consultant's own portfolio products (most recent first).
 * Pass `limit` to cap results (e.g. portfolio slots); omit for the full list.
 */
export async function fetchConsultantProducts(
  consultantId: string,
  limit?: number,
  /**
   * 'showcase' = portfolio pieces (home Profile tab), 'listing' = artwork for
   * sale (SALES tab). Omit to get both, which is what the public-facing
   * profile surfaces want.
   */
  kind?: 'showcase' | 'listing',
): Promise<ShopProduct[]> {
  let request = supabase
    .from('shop_products')
    .select('*')
    .eq('consultant_id', consultantId)
    .order('created_at', { ascending: false });

  if (kind) {
    request = request.eq('kind', kind);
  }

  if (limit) {
    request = request.limit(limit);
  }

  const { data, error } = await request;

  if (error) {
    console.error('[ShopService] fetchConsultantProducts error:', error.message);
    return [];
  }

  return (data ?? []) as ShopProduct[];
}

/** Update an existing shop product. */
export async function updateShopProduct(id: string, payload: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('shop_products').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Insert a new shop product and return its ID. */
export async function createShopProduct(payload: Record<string, unknown>): Promise<ShopProduct> {
  const { data, error } = await supabase
    .from('shop_products')
    .insert({ ...payload, created_at: new Date().toISOString() })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ShopProduct;
}

/** Delete a shop product. */
export async function deleteShopProduct(id: string): Promise<void> {
  const { error } = await supabase.from('shop_products').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
