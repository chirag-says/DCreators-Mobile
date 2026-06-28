// ============================================
// Shop Service
// All Supabase queries related to shop products
// ============================================

import { supabase } from '../lib/supabase';
import type { ShopProduct } from '../types';

/** Shop product with joined consultant info */
export interface ShopProductWithConsultant extends ShopProduct {
  consultant_profiles?: {
    display_name: string;
    code: string;
  } | null;
}

/**
 * Fetch all active shop products with consultant info.
 */
export async function fetchShopProducts(): Promise<ShopProductWithConsultant[]> {
  const { data, error } = await supabase
    .from('shop_products')
    .select('*, consultant_profiles(display_name, code)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ShopService] fetchShopProducts error:', error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as ShopProductWithConsultant[];
}
