import { supabase } from './supabase';

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
