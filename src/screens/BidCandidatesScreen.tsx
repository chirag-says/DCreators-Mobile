/**
 * BID_CANDIDATES_SCREEN
 * owner_role: CLIENT
 * Step 2 of the bidding flow — shows consultants matching the category,
 * available on the chosen date, and priced within ±20% of budget. Client
 * taps to build an ordered priority list (1st choice, 2nd choice, ...);
 * the app will contact them one at a time in that order.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { colors, fonts, fontSizes, radii } from '../styles/theme';
import { findMatchingConsultants, submitBidPriorityList, type MatchedConsultant } from '../services/bidService';

const NAVY = '#1B3A5C';
const TEAL = '#3D9B8F';
const BG = '#EDF1F5';

export default function BidCandidatesScreen({ navigation, route }: any) {
  const bidRequest = route?.params?.bidRequest;

  const [candidates, setCandidates] = useState<MatchedConsultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityIds, setPriorityIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchCandidates(); }, []);

  async function fetchCandidates() {
    if (!bidRequest) { setLoading(false); return; }
    setLoading(true);
    try {
      const matches = await findMatchingConsultants(bidRequest.category, bidRequest.budget, bidRequest.event_date);
      setCandidates(matches);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not load matching consultants.');
    } finally {
      setLoading(false);
    }
  }

  function toggleRank(id: string) {
    setPriorityIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  async function handleSubmit() {
    if (priorityIds.length === 0) {
      Alert.alert('Pick at least one', 'Tap consultants in the order you\'d like us to ask them.');
      return;
    }
    setSubmitting(true);
    try {
      const ranked = priorityIds.map(id => {
        const c = candidates.find(cand => cand.id === id)!;
        return {
          consultantId: c.id,
          consultantUserId: c.user_id,
          quotedPrice: c.base_price ?? bidRequest.budget,
        };
      });
      await submitBidPriorityList(bidRequest.id, ranked);
      navigation.navigate('BidStatus', { bidRequestId: bidRequest.id });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={18} color={NAVY} />
        </TouchableOpacity>
        <Text style={s.tagline}>HIRE CREATIVES. BUY ART. BUILD IDEAS</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.heroTitle}>Build Your{'\n'}Priority List</Text>
        <Text style={s.heroSub}>
          Tap consultants in the order you'd like us to ask them — we'll contact your 1st
          choice first, and move down the list if they're unavailable.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={TEAL} style={{ marginTop: 30 }} />
        ) : candidates.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyTitle}>No matches found</Text>
            <Text style={s.emptySub}>Try a wider budget or a different date.</Text>
          </View>
        ) : (
          candidates.map(c => {
            const rank = priorityIds.indexOf(c.id);
            const isSelected = rank !== -1;
            return (
              <TouchableOpacity
                key={c.id}
                style={[s.card, isSelected && s.cardSelected]}
                onPress={() => toggleRank(c.id)}
                activeOpacity={0.85}
              >
                {isSelected && (
                  <View style={s.rankBadge}>
                    <Text style={s.rankBadgeText}>{rank + 1}</Text>
                  </View>
                )}
                {c.avatar_url
                  ? <Image source={{ uri: c.avatar_url }} style={s.avatar} />
                  : <View style={[s.avatar, s.avatarFallback]}>
                      <Text style={s.avatarInit}>{c.display_name.charAt(0).toUpperCase()}</Text>
                    </View>
                }
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{c.display_name}</Text>
                  <Text style={s.code}>#{c.code}</Text>
                </View>
                <Text style={s.price}>₹{Number(c.base_price ?? 0).toLocaleString('en-IN')}</Text>
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity
          style={[s.submitBtn, (priorityIds.length === 0 || submitting) && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={priorityIds.length === 0 || submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Send size={16} color="#fff" /><Text style={s.submitBtnText}>Send to Priority List ({priorityIds.length})</Text></>
          }
        </TouchableOpacity>
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
  heroTitle: { fontSize: 30, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY, lineHeight: 34, marginTop: 10, marginBottom: 6 },
  heroSub: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20, marginBottom: 20 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff',
    borderRadius: 14, borderWidth: 1.5, borderColor: colors.borderCard, padding: 14, marginBottom: 12,
  },
  cardSelected: { borderColor: NAVY, backgroundColor: '#F0F4FF' },
  rankBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  rankBadgeText: { color: '#fff', fontSize: fontSizes.sm, fontWeight: '800', fontFamily: fonts.heavy },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  avatarInit: { color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: fonts.heavy },
  name: { fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  code: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textSecondary, marginTop: 2 },
  price: { fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },

  emptyWrap: { alignItems: 'center', marginTop: 40, gap: 8 },
  emptyTitle: { fontSize: fontSizes.lg, fontFamily: fonts.heavy, color: colors.textSecondary },
  emptySub: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textTertiary },

  submitBtn: { backgroundColor: NAVY, borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 },
  submitBtnText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy },
});
