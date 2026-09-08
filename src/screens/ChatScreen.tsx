import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, FlatList, KeyboardAvoidingView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Send, Paperclip } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';
import { supabase } from '../lib/supabase';
import PriceNegotiationCard from '../components/PriceNegotiationCard';
import { acceptBidCandidate, declineBidCandidate, counterBidPrice, fetchBidCandidateById } from '../services/bidService';
import {
  fetchMessages as fetchMessagesService,
  sendMessage,
  subscribeToMessages,
  unsubscribeFromMessages,
  type Message,
  type MessageScopeColumn,
} from '../services/messageService';

type ChatRow =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'message'; key: string; msg: Message; isMe: boolean };

const MessageBubble = React.memo(function MessageBubble({ msg, isMe }: { msg: Message; isMe: boolean }) {
  return (
    <View style={[styles.messageWrapper, isMe ? styles.messageMe : styles.messageThem]}>
      <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[styles.messageText, isMe && styles.messageTextMe]}>{msg.text}</Text>
      </View>
      <Text style={styles.timeText}>{formatTime(msg.created_at)}</Text>
    </View>
  );
});

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function ChatScreen({ navigation, route }: any) {
  const project = route?.params?.project;
  // Negotiation mode: chat scoped to a bid_candidate instead of a project —
  // same messages table, same realtime pattern, different scope column.
  const bidCandidateId: string | undefined = route?.params?.bidCandidateId;
  const quotedPrice: number | undefined = route?.params?.quotedPrice;
  const isBidMode = !!bidCandidateId;
  const entityId = isBidMode ? bidCandidateId : project?.id;
  const entityColumn: MessageScopeColumn = isBidMode ? 'bid_candidate_id' : 'project_id';

  const otherName = route?.params?.otherName || 'Participant';
  const profile = useAuthStore((s) => s.profile);
  const currentRole = useAuthStore((s) => s.currentRole);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deciding, setDeciding] = useState(false);
  // Live bid-candidate state (price + who proposed) for the negotiation handshake.
  const [candidate, setCandidate] = useState<{ id: string; quoted_price: number; offer_by: 'client' | 'consultant'; status: string } | null>(null);
  const listRef = useRef<FlatList<ChatRow>>(null);

  useEffect(() => {
    fetchMessages();
    // Subscribe to new messages via realtime
    const channel = subscribeToMessages(entityColumn, entityId, (message) => {
      setMessages((prev) => [...prev, message]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });

    return () => { unsubscribeFromMessages(channel); };
  }, []);

  // Bid mode: load the candidate's live price/offer state and keep it in sync
  // (realtime) so both sides see counter-offers as they happen.
  useEffect(() => {
    if (!isBidMode || !bidCandidateId) return;
    let active = true;
    const loadCandidate = () => {
      fetchBidCandidateById(bidCandidateId).then(c => { if (active) setCandidate(c as any); });
    };
    loadCandidate();
    const ch = supabase
      .channel(`bid_candidate:${bidCandidateId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bid_candidates', filter: `id=eq.${bidCandidateId}` }, loadCandidate)
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [isBidMode, bidCandidateId]);

  async function fetchMessages() {
    if (!entityId) { setLoading(false); return; }
    try {
      const data = await fetchMessagesService(entityColumn, entityId);
      setMessages(data);
    } catch {}
    finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 200);
    }
  }

  async function handleSend() {
    if (!input.trim() || !entityId || !profile?.id) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      await sendMessage({ scopeColumn: entityColumn, scopeId: entityId, senderId: profile.id, text });
      // Message will appear via realtime subscription
    } catch (e: any) { console.log('[Chat] Send error:', e.message); }
    finally { setSending(false); }
  }

  // Accept the price on the table (either party). Creates the project at
  // advance_pending; route each role to their own project surface.
  async function handleAccept() {
    if (!bidCandidateId || deciding) return;
    setDeciding(true);
    try {
      const newProject = await acceptBidCandidate(bidCandidateId);
      if (currentRole === 'consultant') {
        navigation.navigate('Main', { screen: 'CreatorWorkorder', params: { project: newProject } });
      } else {
        navigation.navigate('ClientWorkorder', { project: newProject });
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not accept this offer.');
    } finally {
      setDeciding(false);
    }
  }

  // Counter with a new price (either party). Stays in negotiation.
  async function handleCounter(amount: number) {
    if (!bidCandidateId || !currentRole || deciding) return;
    setDeciding(true);
    try {
      await counterBidPrice(bidCandidateId, amount, currentRole);
      const c = await fetchBidCandidateById(bidCandidateId);
      setCandidate(c as any);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not send counter-offer.');
    } finally {
      setDeciding(false);
    }
  }

  function handleDecline() {
    if (!bidCandidateId || deciding) return;
    Alert.alert('Decline This Bid?', 'The client\'s request will move to the next consultant on their list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive', onPress: async () => {
          setDeciding(true);
          try {
            await declineBidCandidate(bidCandidateId);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e.message ?? 'Could not decline this bid.');
          } finally {
            setDeciding(false);
          }
        },
      },
    ]);
  }

  function formatDateHeader(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Flatten messages into date-header + message rows for FlatList rendering
  const rows = useMemo<ChatRow[]>(() => {
    const out: ChatRow[] = [];
    let lastDate = '';
    messages.forEach((msg) => {
      const dateKey = new Date(msg.created_at).toDateString();
      if (dateKey !== lastDate) {
        out.push({ kind: 'header', key: `header-${dateKey}`, label: formatDateHeader(msg.created_at) });
        lastDate = dateKey;
      }
      out.push({ kind: 'message', key: msg.id, msg, isMe: msg.sender_id === profile?.id });
    });
    return out;
  }, [messages, profile?.id]);

  const renderRow = useCallback(({ item }: { item: ChatRow }) => {
    if (item.kind === 'header') {
      return (
        <View style={styles.dateHeader}>
          <Text style={styles.dateHeaderText}>{item.label}</Text>
        </View>
      );
    }
    return <MessageBubble msg={item.msg} isMe={item.isMe} />;
  }, []);

  const assignmentLabel = isBidMode
    ? `Negotiating · ₹${(quotedPrice ?? 0).toLocaleString('en-IN')}`
    : project
      ? `${project.assignment_type?.charAt(0).toUpperCase()}${project.assignment_type?.slice(1) || ''}`
      : 'Assignment';

  // Symmetric handshake: whoever is looking at the OTHER party's pending offer
  // can Accept or Counter; the consultant can additionally pass to the next
  // candidate. Only while the candidate is still open (pending/negotiating).
  const showOfferCard = isBidMode && !!candidate && ['pending', 'negotiating'].includes(candidate.status);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.cardBg }]} edges={['top']}>
      <View style={styles.bg}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <ChevronLeft size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerName}>{otherName}</Text>
              <Text style={styles.headerSub}>{assignmentLabel}</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          {showOfferCard && (
            <PriceNegotiationCard
              amount={candidate!.quoted_price}
              offerBy={candidate!.offer_by}
              myRole={(currentRole as 'client' | 'consultant') ?? 'client'}
              otherName={otherName}
              busy={deciding}
              onAccept={handleAccept}
              onCounter={handleCounter}
              onDecline={currentRole === 'consultant' ? handleDecline : undefined}
              declineLabel="Decline & pass to next"
            />
          )}

          {/* Messages */}
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
          ) : (
            <FlatList
              ref={listRef}
              style={styles.chatScroll}
              contentContainerStyle={styles.chatContainer}
              showsVerticalScrollIndicator={false}
              data={rows}
              keyExtractor={(item) => item.key}
              renderItem={renderRow}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={styles.emptyChat}>
                  <Text style={styles.emptyChatText}>No messages yet. Start the conversation! 💬</Text>
                </View>
              }
            />
          )}

          {/* Input Area */}
          <View style={styles.inputArea}>
            <TouchableOpacity style={styles.attachBtn}>
              <Paperclip size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TextInput
              style={styles.inputField}
              placeholder="Type a message..."
              placeholderTextColor={colors.textTertiary}
              value={input}
              onChangeText={setInput}
              multiline
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Send size={18} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.screenBg },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderCard, backgroundColor: colors.cardBg,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center' },
  headerName: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy },
  headerSub: { fontSize: fontSizes.xs + 1, color: colors.textSecondary, fontFamily: fonts.medium },

  decisionStrip: {
    flexDirection: 'row', gap: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    backgroundColor: colors.cardBg, borderBottomWidth: 1, borderBottomColor: colors.borderCard,
  },
  decisionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: radii.md,
  },
  acceptBtn: { backgroundColor: colors.success },
  declineBtn: { backgroundColor: colors.error },
  decisionBtnText: { color: '#fff', fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.heavy },

  chatScroll: { flex: 1 },
  chatContainer: { padding: spacing.lg, paddingBottom: spacing.xl },

  emptyChat: { alignItems: 'center', marginTop: 60, padding: spacing.xl },
  emptyChatText: { fontSize: fontSizes.base, color: colors.textTertiary, fontFamily: fonts.body, textAlign: 'center' },

  dateHeader: { alignItems: 'center', marginVertical: spacing.md },
  dateHeaderText: {
    fontSize: fontSizes.xs + 1, color: colors.textSecondary, fontFamily: fonts.medium,
    backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.md,
  },

  messageWrapper: { maxWidth: '80%', marginBottom: spacing.xs },
  messageMe: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  messageThem: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  messageBubble: { paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: 18, marginBottom: 2 },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  messageText: { fontSize: fontSizes.base, color: colors.textPrimary, fontFamily: fonts.body, lineHeight: 20 },
  messageTextMe: { color: colors.textOnPrimary },
  timeText: { fontSize: 9, color: colors.textTertiary, fontFamily: fonts.medium, marginHorizontal: spacing.xs },

  inputArea: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: spacing.lg, paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.md,
    backgroundColor: colors.cardBg, borderTopWidth: 1, borderTopColor: colors.border, gap: 10,
  },
  attachBtn: { padding: 10 },
  inputField: {
    flex: 1, backgroundColor: colors.inputBg, borderRadius: radii['2xl'],
    paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 10,
    maxHeight: 100, minHeight: 40, fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  sendBtnDisabled: { backgroundColor: colors.borderInput },
});
