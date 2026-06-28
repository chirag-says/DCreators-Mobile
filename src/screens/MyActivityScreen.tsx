/**
 * MY_ACTIVITY_SCREEN
 * owner_role: CLIENT
 * Bottom-nav tab: where a client starts a new bid and checks on everything
 * already in progress (open bids + active projects) — kept off the home
 * dashboard so that screen stays focused on browsing creators.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight } from 'lucide-react-native';
import TopHeader from '../components/TopHeader';
import { useAuthStore } from '../store/useAuthStore';
import { useClientProjects } from '../hooks/useProjects';
import { fetchClientBidRequests } from '../services/bidService';
import { colors, fonts, fontSizes } from '../styles/theme';
import ClientProjectRow from '../components/dashboard/ClientProjectRow';
import type { ProjectWithConsultant } from '../services/projectService';
import type { BidRequest } from '../types';

const NAVY = '#1B3A5C';
const BG = '#EDF1F5';

export default function MyActivityScreen({ navigation }: any) {
  const profile = useAuthStore(s => s.profile);
  const { projects: clientProjects, refresh: refreshProjects } = useClientProjects(profile?.id);

  const [openBids, setOpenBids] = useState<BidRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const refreshBids = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const all = await fetchClientBidRequests(profile.id);
      setOpenBids(all.filter(b => b.status === 'open'));
    } catch {}
  }, [profile?.id]);

  useEffect(() => { refreshBids(); }, [refreshBids]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => { refreshProjects(); refreshBids(); });
    return unsub;
  }, [navigation, refreshProjects, refreshBids]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([refreshProjects(), refreshBids()]).finally(() => setRefreshing(false));
  }, [refreshProjects, refreshBids]);

  function goToWorkorder(project: ProjectWithConsultant) {
    const status = project.status;
    if (status === 'advance_pending') {
      navigation.navigate('Payment', { project, paymentType: 'advance' });
    } else if (status === 'advance_paid') {
      navigation.navigate('GenerateWorkOrder', { project, txnId: '', payAmount: project.final_offer ?? project.budget });
    } else {
      navigation.navigate('ClientWorkorder', { project });
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <TopHeader />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={NAVY} />}
      >
        <Text style={s.heroTitle}>My Activity</Text>
        <Text style={s.heroSub}>Start a new bid, or check on everything already in progress.</Text>

        {/* ── Bidding entry point ───────────────────── */}
        <TouchableOpacity
          style={s.bidCard}
          onPress={() => navigation.navigate('CreateBid')}
          activeOpacity={0.85}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.bidCardTitle}>Get Quotes from Multiple Consultants</Text>
            <Text style={s.bidCardSub}>Set a budget and date — we'll line up consultants for you to pick from.</Text>
          </View>
          <ChevronRight size={18} color="#fff" />
        </TouchableOpacity>

        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>My Bid Requests</Text>
            <Text style={s.sectionCount}>{openBids.length}</Text>
          </View>
          {openBids.length === 0 ? (
            <Text style={s.emptyText}>No open bid requests.</Text>
          ) : (
            openBids.map((bid) => (
              <TouchableOpacity
                key={bid.id}
                style={s.bidRow}
                onPress={() => navigation.navigate('BidStatus', { bidRequestId: bid.id })}
                activeOpacity={0.85}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.bidRowTitle} numberOfLines={1}>
                    {bid.category.charAt(0).toUpperCase() + bid.category.slice(1)} · ₹{Number(bid.budget).toLocaleString('en-IN')}
                  </Text>
                  <Text style={s.bidRowBrief} numberOfLines={1}>{bid.assignment_brief}</Text>
                </View>
                <ChevronRight size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>My Active Projects</Text>
            <Text style={s.sectionCount}>{clientProjects.length}</Text>
          </View>
          {clientProjects.length === 0 ? (
            <Text style={s.emptyText}>No active projects.</Text>
          ) : (
            clientProjects.map((proj) => (
              <ClientProjectRow key={proj.id} project={proj} onPress={goToWorkorder} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 20, paddingBottom: 50 },
  heroTitle: { fontSize: 28, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY, marginTop: 6, marginBottom: 4 },
  heroSub: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20, marginBottom: 18 },

  bidCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: NAVY, borderRadius: 14, padding: 16, marginBottom: 20,
  },
  bidCardTitle: { fontSize: 15, fontWeight: '800', fontFamily: fonts.heavy, color: '#fff' },
  bidCardSub: { fontSize: 12, fontFamily: fonts.body, color: 'rgba(255,255,255,0.75)', marginTop: 4, lineHeight: 17 },

  section: {
    marginBottom: 16, backgroundColor: '#fff',
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.borderCard,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', fontFamily: fonts.heavy, color: '#1F2937' },
  sectionCount: {
    fontSize: 13, fontWeight: '700', color: '#6B7280', fontFamily: fonts.heavy,
    backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10,
  },
  emptyText: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textTertiary, paddingVertical: 8 },

  bidRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  bidRowTitle: { fontSize: 13.5, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  bidRowBrief: { fontSize: 12, fontFamily: fonts.body, color: colors.textSecondary, marginTop: 2 },
});
