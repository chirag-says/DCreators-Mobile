// ============================================
// Message Service
// All Supabase queries + realtime related to the messages table
// ============================================

import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type MessageScopeColumn = 'project_id' | 'bid_candidate_id';

export interface Message {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
  project_id?: string;
  bid_candidate_id?: string;
}

/** Fetch all messages scoped to a project or bid candidate, oldest first. */
export async function fetchMessages(scopeColumn: MessageScopeColumn, scopeId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq(scopeColumn, scopeId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[MessageService] fetchMessages error:', error.message);
    return [];
  }

  return (data ?? []) as Message[];
}

/** Fetch the most recent message for a project (for chat list previews). */
export async function fetchLatestMessage(projectId: string): Promise<Message | null> {
  const { data, error } = await supabase
    .from('messages')
    .select('text, created_at, sender_id')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !data?.length) {
    return null;
  }

  return data[0] as Message;
}

/** Count messages on a project not sent by the given user (rough unread proxy). */
export async function countUnreadMessages(projectId: string, excludeSenderId: string): Promise<number> {
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .neq('sender_id', excludeSenderId);

  return count ?? 0;
}

/** Send a new message scoped to a project or bid candidate. */
export async function sendMessage(params: {
  scopeColumn: MessageScopeColumn;
  scopeId: string;
  senderId: string;
  text: string;
}): Promise<void> {
  const { error } = await supabase.from('messages').insert({
    [params.scopeColumn]: params.scopeId,
    sender_id: params.senderId,
    text: params.text,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/** Subscribe to new messages for a scope; returns the channel for cleanup via unsubscribeFromMessages. */
export function subscribeToMessages(
  scopeColumn: MessageScopeColumn,
  scopeId: string,
  onInsert: (message: Message) => void,
): RealtimeChannel {
  return supabase
    .channel(`messages:${scopeColumn}:${scopeId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `${scopeColumn}=eq.${scopeId}`,
    }, (payload: any) => {
      onInsert(payload.new as Message);
    })
    .subscribe();
}

export function unsubscribeFromMessages(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}
