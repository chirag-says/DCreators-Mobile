/**
 * CONSULTANT_BID_INBOX_SCREEN
 * owner_role: CONSULTANT
 * Incoming bid requests where this consultant is the currently-active
 * candidate. Accept / Negotiate / Reject, per spec.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText } from 'lucide-react-native';
import TopHeader from '../components/TopHeader';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, radii } from '../styles/theme';
import {
  fetchConsultantBidInbox, acceptBidCandidate, declineBidCandidate, proposeNegotiation,
  type BidCandidateWithRequest,
} from '../services/bidService';

const NAVY = '#1B3A5C';
const TEAL = '#3D9B8F';
const ORANGE = '#E87B35';
const BG = '#EDF1F5';

export default function ConsultantBidInboxScreen({ navigation }: any) {
  const consultantProfile = useAuthStore(s => s.consultantProfile);

  const [items, setItems] = useState<BidCandidateWithRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!consultantProfile?.id) { setLoading(false); return; }
    try {
      const data = await fetchConsultantBidInbox(consultantProfile.id);
      setItems(data);
    } catch {}
    finally { setLoading(false); }
  }, [consultantProfile?.id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  async function handleAccept(c: BidCandidateWithRequest) {
    setBusyId(c.id);
    try {
      const project = await acceptBidCandidate(c.id);
      navigation.navigate('Main', { screen: 'CreatorWorkorder', params: { project } });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not accept this bid.');
    } finally {
      setBusyId(null);
    }
  }

  function handleReject(c: BidCandidateWithRequest) {
    Alert.alert('Reject This Bid?', 'This request will move to the next consultant on the client\'s list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: async () => {
          setBusyId(c.id);
          try {
            await declineBidCandidate(c.id);
            load();
          } catch (e: any) {
            Alert.alert('Error', e.message ?? 'Could not reject this bid.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  }

  async function handleNegotiate(c: BidCandidateWithRequest) {
    setBusyId(c.id);
    try {
      await proposeNegotiation(c.id);
      navigation.navigate('Chat', {
        bidCandidateId: c.id,
        otherName: c.bid_requests?.profiles?.name ?? 'Client',
        quotedPrice: c.quoted_price,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not start negotiation.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <TopHeader />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
      >
        <Text style={s.heroTitle}>Bid Requests</Text>
        <Text style={s.heroSub}>Clients who'd like a quote from you.</Text>

        {loading ? (
          <ActivityIndicator size="large" color={TEAL} style={{ marginTop: 30 }} />
        ) : items.length === 0 ? (
          <View style={s.emptyWrap}>
            <FileText size={40} color="#D1D5DB" />
            <Text style={s.emptyTitle}>No bid requests right now</Text>
            <Text style={s.emptySub}>New requests will show up here.</Text>
          </View>
        ) : (
          items.map(c => {
            const busy = busyId === c.id;
            const req = c.bid_requests;
            return (
              <View key={c.id} style={s.card}>
                <Text style={s.cardTitle}>
                  {c.status === 'negotiating' ? 'Negotiating with' : 'Request from'} {req?.profiles?.name ?? 'Client'}
                </Text>
                {req?.event_date && (
                  <Text style={s.cardMeta}>
                    For {new Date(req.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                )}
                <Text style={s.cardBrief} numberOfLines={3}>{req?.assignment_brief}</Text>
                <Text style={s.cardPrice}>Quoted: ₹{Number(c.quoted_price).toLocaleString('en-IN')}</Text>

                <View style={s.actionRow}>
                  <TouchableOpacity
                    style={[s.actionBtn, s.rejectBtn, busy && { opacity: 0.6 }]}
                    onPress={() => handleReject(c)}
                    disabled={busy}
                    activeOpacity={0.85}
                  >
                    <Text style={s.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, s.negotiateBtn, busy && { opacity: 0.6 }]}
                    onPress={() => handleNegotiate(c)}
                    disabled={busy}
                    activeOpacity={0.85}
                  >
                    <Text style={s.negotiateBtnText}>Negotiate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, s.acceptBtn, busy && { opacity: 0.6 }]}
                    onPress={() => handleAccept(c)}
                    disabled={busy}
                    activeOpacity={0.85}
                  >
                    {busy
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={s.acceptBtnText}>Accept</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 20, paddingBottom: 50 },
  heroTitle: { fontSize: 28, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY, marginTop: 10, marginBottom: 4 },
  heroSub: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20, marginBottom: 20 },

  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: colors.borderCard, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  cardMeta: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary, marginTop: 2 },
  cardBrief: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textPrimary, marginTop: 8, lineHeight: 20 },
  cardPrice: { fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: ORANGE, marginTop: 10 },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  actionBtn: { flex: 1, paddingVertical: 11, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { borderWidth: 1.5, borderColor: '#EF4444' },
  rejectBtnText: { color: '#EF4444', fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.heavy },
  negotiateBtn: { borderWidth: 1.5, borderColor: NAVY },
  negotiateBtnText: { color: NAVY, fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.heavy },
  acceptBtn: { backgroundColor: '#10B981' },
  acceptBtnText: { color: '#fff', fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.heavy },

  emptyWrap: { alignItems: 'center', marginTop: 40, gap: 10 },
  emptyTitle: { fontSize: fontSizes.lg, fontFamily: fonts.heavy, color: colors.textSecondary },
  emptySub: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textTertiary },
});
