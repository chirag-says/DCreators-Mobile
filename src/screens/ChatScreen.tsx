import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, ScrollView, KeyboardAvoidingView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Send, Paperclip, Check, X } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';
import { acceptBidCandidate, declineBidCandidate } from '../services/bidService';

export default function ChatScreen({ navigation, route }: any) {
  const project = route?.params?.project;
  // Negotiation mode: chat scoped to a bid_candidate instead of a project —
  // same messages table, same realtime pattern, different scope column.
  const bidCandidateId: string | undefined = route?.params?.bidCandidateId;
  const quotedPrice: number | undefined = route?.params?.quotedPrice;
  const isBidMode = !!bidCandidateId;
  const entityId = isBidMode ? bidCandidateId : project?.id;
  const entityColumn = isBidMode ? 'bid_candidate_id' : 'project_id';

  const otherName = route?.params?.otherName || 'Participant';
  const profile = useAuthStore((s) => s.profile);
  const currentRole = useAuthStore((s) => s.currentRole);

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchMessages();
    // Subscribe to new messages via realtime
    const channel = supabase
      .channel(`messages:${entityColumn}:${entityId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `${entityColumn}=eq.${entityId}`,
      }, (payload: any) => {
        setMessages((prev) => [...prev, payload.new]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchMessages() {
    if (!entityId) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq(entityColumn, entityId)
        .order('created_at', { ascending: true });
      if (!error && data) setMessages(data);
    } catch {}
    finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 200);
    }
  }

  async function handleSend() {
    if (!input.trim() || !entityId || !profile?.id) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        [entityColumn]: entityId,
        sender_id: profile.id,
        text,
      });
      if (error) console.log('[Chat] Send error:', error.message);
      // Message will appear via realtime subscription
    } catch {}
    finally { setSending(false); }
  }

  async function handleAccept() {
    if (!bidCandidateId || deciding) return;
    setDeciding(true);
    try {
      const newProject = await acceptBidCandidate(bidCandidateId);
      navigation.navigate('Main', { screen: 'CreatorWorkorder', params: { project: newProject } });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not accept this bid.');
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

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
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

  // Group messages by date
  const groupedMessages: { date: string; msgs: any[] }[] = [];
  let lastDate = '';
  messages.forEach((msg) => {
    const dateKey = new Date(msg.created_at).toDateString();
    if (dateKey !== lastDate) {
      groupedMessages.push({ date: dateKey, msgs: [msg] });
      lastDate = dateKey;
    } else {
      groupedMessages[groupedMessages.length - 1].msgs.push(msg);
    }
  });

  const assignmentLabel = isBidMode
    ? `Negotiating · ₹${(quotedPrice ?? 0).toLocaleString('en-IN')}`
    : project
      ? `${project.assignment_type?.charAt(0).toUpperCase()}${project.assignment_type?.slice(1) || ''}`
      : 'Assignment';

  // Per spec, accept/decline on a negotiation belongs to the consultant —
  // the client's role here is to discuss, not unilaterally close it out.
  const showDecisionStrip = isBidMode && currentRole === 'consultant';

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

          {showDecisionStrip && (
            <View style={styles.decisionStrip}>
              <TouchableOpacity
                style={[styles.decisionBtn, styles.declineBtn, deciding && { opacity: 0.6 }]}
                onPress={handleDecline}
                disabled={deciding}
                activeOpacity={0.85}
              >
                <X size={15} color="#fff" />
                <Text style={styles.decisionBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.decisionBtn, styles.acceptBtn, deciding && { opacity: 0.6 }]}
                onPress={handleAccept}
                disabled={deciding}
                activeOpacity={0.85}
              >
                {deciding ? <ActivityIndicator size="small" color="#fff" /> : <><Check size={15} color="#fff" /><Text style={styles.decisionBtnText}>Accept</Text></>}
              </TouchableOpacity>
            </View>
          )}

          {/* Messages */}
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
          ) : (
            <ScrollView
              ref={scrollRef}
              style={styles.chatScroll}
              contentContainerStyle={styles.chatContainer}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            >
              {messages.length === 0 && (
                <View style={styles.emptyChat}>
                  <Text style={styles.emptyChatText}>No messages yet. Start the conversation! 💬</Text>
                </View>
              )}

              {groupedMessages.map((group) => (
                <View key={group.date}>
                  <View style={styles.dateHeader}>
                    <Text style={styles.dateHeaderText}>{formatDateHeader(group.msgs[0].created_at)}</Text>
                  </View>
                  {group.msgs.map((msg) => {
                    const isMe = msg.sender_id === profile?.id;
                    return (
                      <View key={msg.id} style={[styles.messageWrapper, isMe ? styles.messageMe : styles.messageThem]}>
                        <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                          <Text style={[styles.messageText, isMe && styles.messageTextMe]}>{msg.text}</Text>
                        </View>
                        <Text style={styles.timeText}>{formatTime(msg.created_at)}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
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
  chatContainer: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl },

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
