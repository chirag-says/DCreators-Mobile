import { supabase } from './supabase';
import type { Notification } from '../types';

/**
 * Send a notification to a user.
 * Call this whenever a key action happens (assignment, payment, review, etc.)
 */
export async function sendNotification({
  userId,
  title,
  message,
  type = 'system',
}: {
  userId: string;
  title: string;
  message: string;
  type?: 'assignment' | 'payment' | 'review' | 'system';
}) {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
    });
  } catch (err) {
    console.log('[Notification] Failed to send:', err);
  }
}

/** Fetch the most recent notifications for a user. */
export async function fetchNotifications(userId: string, limit = 30): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Notification] fetchNotifications error:', error.message);
    return [];
  }

  return (data ?? []) as Notification[];
}

/** Mark a single notification as read. */
export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Mark all of a user's unread notifications as read. */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw new Error(error.message);
}

/** Delete all notifications for a user. */
export async function clearAllNotifications(userId: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('user_id', userId);
  if (error) throw new Error(error.message);
}
