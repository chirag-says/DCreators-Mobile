// ============================================
// useCreators Hook
// Manages creator data for the client dashboard
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { fetchActiveConsultants, fetchConsultantRatings, type ConsultantRating } from '../services/consultantService';
import type { CreatorCardViewModel } from '../types/navigation';
import { toPriceUnit } from '../lib/booking';
import type { ConsultantProfile, ConsultantCategory } from '../types';

/** Fallback avatar mapping when consultant has no avatar_url */
const CATEGORY_FALLBACK_AVATAR: Record<ConsultantCategory, string> = {
  photographer: 'dcreators/photographer',
  // No dedicated videographer asset uploaded yet — reuse photographer's
  // fallback until one is added to Cloudinary.
  videographer: 'dcreators/photographer',
  designer: 'dcreators/designer',
  sculptor: 'dcreators/sculptor',
  artisan: 'dcreators/artisan',
};

/** Transform a raw DB profile into a view-model for the UI */
function toViewModel(cp: ConsultantProfile): CreatorCardViewModel {
  return {
    id: cp.id,
    name: cp.display_name,
    code: cp.code,
    subtitle: cp.subtitle ?? '',
    experience: cp.experience ?? '',
    expertise: cp.expertise ?? '',
    avatar_public_id: cp.avatar_url ?? (cp.category ? CATEGORY_FALLBACK_AVATAR[cp.category] : null) ?? 'dcreators/designer',
    avatar_url: cp.avatar_url,
    portfolio_images: cp.portfolio_images,
    portfolio_card_image: cp.portfolio_card_image,
    portfolio_banner_image: cp.portfolio_banner_image,
    category: cp.category ?? 'designer',
    base_price: cp.base_price,
    price_unit: toPriceUnit(cp.price_unit),
    is_approved: cp.is_approved,
    user_id: cp.user_id,
  };
}

export interface UseCreatorsReturn {
  creators: CreatorCardViewModel[];
  /** Keyed by user_id. Consultants with no reviews are absent, not zero. */
  ratings: Record<string, ConsultantRating>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCreators(): UseCreatorsReturn {
  const [creators, setCreators] = useState<CreatorCardViewModel[]>([]);
  const [ratings, setRatings] = useState<Record<string, ConsultantRating>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchActiveConsultants();
      const models = data.map(toViewModel);
      setCreators(models);
      // Ordering the dashboard's "Creators in Demand" row needs a demand
      // signal, and this is the only one a browsing client is allowed to read.
      // One batched query off the ids just loaded; it swallows its own errors
      // and returns {}, so a ratings outage costs the ordering, not the row.
      setRatings(await fetchConsultantRatings(models.map(m => m.user_id)));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load creators';
      setError(message);
      console.error('[useCreators]', message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { creators, ratings, loading, error, refresh: fetch };
}
