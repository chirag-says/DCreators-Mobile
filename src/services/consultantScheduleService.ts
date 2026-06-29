// ============================================
// Consultant Schedule Service
// Blocked dates + project notes for the consultant project-management calendar
// ============================================

import { supabase } from '../lib/supabase';

/** Fetch a consultant's blocked (blackout) dates as 'YYYY-MM-DD' strings. */
export async function fetchBlockedDates(consultantId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('consultant_blocked_dates')
    .select('blocked_date')
    .eq('consultant_id', consultantId);

  if (error) {
    console.error('[ConsultantScheduleService] fetchBlockedDates error:', error.message);
    return [];
  }

  return (data ?? []).map((row: any) => row.blocked_date as string);
}

export async function addBlockedDate(consultantId: string, date: string): Promise<void> {
  const { error } = await supabase.from('consultant_blocked_dates').insert({
    consultant_id: consultantId,
    blocked_date: date,
  });
  if (error) throw new Error(error.message);
}

export async function removeBlockedDate(consultantId: string, date: string): Promise<void> {
  const { error } = await supabase
    .from('consultant_blocked_dates')
    .delete()
    .eq('consultant_id', consultantId)
    .eq('blocked_date', date);
  if (error) throw new Error(error.message);
}

/** Fetch dates already booked (via confirmed projects) for a consultant, as 'YYYY-MM-DD' strings. */
export async function fetchConsultantTakenDates(consultantUserId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_consultant_taken_dates', {
    p_consultant_user_id: consultantUserId,
  });

  if (error) {
    console.error('[ConsultantScheduleService] fetchConsultantTakenDates error:', error.message);
    return [];
  }

  return (data ?? []).map((row: any) => row.taken_date as string);
}

/** Create a quick-entry project note (lightweight reminder, not a full project row). */
export async function createProjectNote(note: {
  consultant_id: string;
  title: string;
  client_name: string | null;
  target_date: string | null;
}): Promise<void> {
  const { error } = await supabase.from('consultant_project_notes').insert({
    ...note,
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}
