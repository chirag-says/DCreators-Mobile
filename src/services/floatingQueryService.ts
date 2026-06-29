// ============================================
// Floating Query Service
// All Supabase queries related to floating_queries
// ============================================

import { supabase } from '../lib/supabase';
import type { FloatingQuery } from '../types';

/**
 * Fetch floating queries for a client (their own) or a consultant (open ones).
 */
export async function fetchFloatingQueries(params: {
  role: 'client' | 'consultant';
  clientId?: string;
}): Promise<FloatingQuery[]> {
  let request = supabase.from('floating_queries').select('*').order('created_at', { ascending: false });

  if (params.role === 'client' && params.clientId) {
    request = request.eq('client_id', params.clientId);
  } else {
    request = request.eq('status', 'open');
  }

  const { data, error } = await request;

  if (error) {
    console.error('[FloatingQueryService] fetchFloatingQueries error:', error.message);
    return [];
  }

  return (data ?? []) as FloatingQuery[];
}

/**
 * Create a new floating query for a client.
 */
export async function createFloatingQuery(query: {
  client_id: string;
  assignment_type: string;
  assignment_brief: string;
  budget_min: number;
  budget_max: number;
  deadline: string | null;
}): Promise<void> {
  const { error } = await supabase.from('floating_queries').insert({
    ...query,
    status: 'open',
  });

  if (error) {
    throw new Error(error.message);
  }
}
