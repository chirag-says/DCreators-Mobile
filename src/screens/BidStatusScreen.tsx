/**
 * BID_STATUS_SCREEN
 * owner_role: CLIENT
 * Live view of a submitted priority list — realtime-subscribed so it
 * updates as consultants accept/decline/negotiate without a manual refresh.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MessageCircle, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { colors, fonts, fontSizes, radii } from '../styles/theme';
import { fetchBidCandidates, type BidCandidateWithConsultant } from '../services/bidService';
import { fetchProjectById } from '../services/projectService';

const NAVY = '#1B3A5C';
const TEAL = '#3D9B8F';
const BG = '#EDF1F5';

const STATUS_LABELS: Record<string, string> = {
  queued: 'Waiting in line',
  pending: 'Awaiting response',
  negotiating: 'Negotiating',
  accepted: 'Accepted',
  declined: 'Declined',
  skipped: 'Not contacted',
};
const STATUS_COLORS: Record<string, string> = {
  queued: '#9CA3AF',
  pending: '#F59E0B',
  negotiating: '#6366F1',
  accepted: '#10B981',
  declined: '#EF4444',
  skipped: '#D1D5DB',
};

export default function BidStatusScreen({ navigation, route }: any) {
  const bidRequestId = route?.params?.bidRequestId;

  const [candidates, setCandidates] = useState<BidCandidateWithConsultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!bidRequestId) { setLoading(false); return; }
    try {
      const data = await fetchBidCandidates(bidRequestId);
      setCandidates(data);
    } catch {}
    finally { setLoading(false); }
  }, [bidRequestId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`bid_candidates:${bidRequestId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bid_candidates',
        filter: `bid_request_id=eq.${bidRequestId}`,
      }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, bidRequestId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  function openChat(candidate: BidCandidateWithConsultant) {
    navigation.navigate('Chat', {
      bidCandidateId: candidate.id,
      otherName: candidate.consultant_profiles?.display_name ?? 'Consultant',
      quotedPrice: candidate.quoted_price,
    });
  }

  async function viewProject(candidate: BidCandidateWithConsultant) {
    if (!candidate.project_id) return;
    const project = await fetchProjectById(candidate.project_id);
    if (!project) return;
    navigation.navigate('Main', { screen: 'CreatorWorkorder', params: { project } });
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.navigate('Main', { screen: 'MyActivity' })} activeOpacity={0.7}>
          <ArrowLeft size={18} color={NAVY} />
        </TouchableOpacity>
        <Text style={s.tagline}>HIRE CREATIVES. BUY ART. BUILD IDEAS</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
      >
        <Text style={s.heroTitle}>Your Priority List</Text>
        <Text style={s.heroSub}>We contact one consultant at a time, in the order you set.</Text>

        {loading ? (
          <ActivityIndicator size="large" color={TEAL} style={{ marginTop: 30 }} />
        ) : (
          candidates.map((c, i) => {
            const statusColor = STATUS_COLORS[c.status] ?? '#9CA3AF';
            return (
              <View key={c.id} style={s.card}>
                <View style={s.rankBadge}><Text style={s.rankBadgeText}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{c.consultant_profiles?.display_name ?? 'Consultant'}</Text>
                  <Text style={s.price}>₹{Number(c.quoted_price).toLocaleString('en-IN')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <View style={[s.statusBadge, { backgroundColor: statusColor + '22' }]}>
                    <Text style={[s.statusBadgeText, { color: statusColor }]}>{STATUS_LABELS[c.status] ?? c.status}</Text>
                  </View>
                  {c.status === 'negotiating' && (
                    <TouchableOpacity style={s.actionBtn} onPress={() => openChat(c)} activeOpacity={0.8}>
                      <MessageCircle size={13} color="#fff" />
                      <Text style={s.actionBtnText}>Open Chat</Text>
                    </TouchableOpacity>
                  )}
                  {c.status === 'accepted' && (
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#10B981' }]} onPress={() => viewProject(c)} activeOpacity={0.8}>
                      <CheckCircle2 size={13} color="#fff" />
                      <Text style={s.actionBtnText}>View Project</Text>
                    </TouchableOpacity>
                  )}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  tagline: { fontSize: 9, fontFamily: fonts.body, color: colors.textTertiary, letterSpacing: 0.5 },
  scroll: { paddingHorizontal: 20, paddingBottom: 50 },
  heroTitle: { fontSize: 28, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY, marginTop: 10, marginBottom: 4 },
  heroSub: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20, marginBottom: 20 },

  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: colors.borderCard, padding: 14, marginBottom: 12 },
  rankBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  rankBadgeText: { color: '#fff', fontSize: fontSizes.sm, fontWeight: '800', fontFamily: fonts.heavy },
  name: { fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  price: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.full },
  statusBadgeText: { fontSize: fontSizes.xs, fontWeight: '700', fontFamily: fonts.heavy },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#6366F1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.full },
  actionBtnText: { color: '#fff', fontSize: fontSizes.xs + 1, fontWeight: '700', fontFamily: fonts.heavy },
});
