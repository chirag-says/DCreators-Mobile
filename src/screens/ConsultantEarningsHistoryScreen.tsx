/**
 * CONSULTANT_EARNINGS_HISTORY_SCREEN  (Phase 5.1)
 * owner_role: CONSULTANT
 * Figma: CONSULTANT_EARNINGS_HISTORY_SCREEN.png
 * — Sales / Projects tab toggle
 * — Artwork sales list (from artwork_orders where artist_id = consultant.user_id, status = completed)
 * — Overall Earnings card with breakdown
 * — Recent Feedback section (from reviews table)
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, ShoppingBag, Star, Tag, Plus, Edit3, Trash2 } from 'lucide-react-native';
import TopHeader from '../components/TopHeader';
import { useAuthStore } from '../store/useAuthStore';
import { fetchCompletedArtworkSales } from '../services/artworkService';
import { fetchRecentReviewsWithReviewer } from '../services/projectService';
import { fetchConsultantProducts, deleteShopProduct } from '../services/shopService';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import ConsultantDashboard from '../components/dashboard/ConsultantDashboard';

const NAVY   = '#1B3A5C';
const ORANGE = '#E87B35';
const TEAL   = '#3D9B8F';
const BG     = '#EDF1F5';

// This screen is about selling artwork and nothing else. Project work lives on
// the home Project Dashboard and the PROJECTS tab; it used to be duplicated
// here behind a toggle, which meant two places disagreed about the same jobs.
export default function ConsultantEarningsHistoryScreen({ navigation }: any) {
  const consultantProfile = useAuthStore(s => s.consultantProfile);

  const [sales,     setSales]     = useState<any[]>([]);
  const [listings,  setListings]  = useState<any[]>([]);
  const [reviews,   setReviews]   = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);

  const artSalesTotal = sales.reduce((acc, s) => acc + (s.artwork_price ?? 0), 0);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchAll);
    return unsub;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll().finally(() => setRefreshing(false));
  }, []);

  async function fetchAll() {
    if (!consultantProfile?.user_id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [salesData, listingData, reviewData] = await Promise.all([
        fetchCompletedArtworkSales(consultantProfile.user_id),
        consultantProfile.id
          ? fetchConsultantProducts(consultantProfile.id, undefined, 'listing')
          : Promise.resolve([]),
        fetchRecentReviewsWithReviewer(consultantProfile.user_id),
      ]);

      setSales(salesData);
      setListings(listingData);
      setReviews(reviewData);
    } catch {}
    finally { setLoading(false); }
  }

  async function handleDeleteListing(p: any) {
    Alert.alert('Delete Listing', `Remove "${p.title}" from sale?`, [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteShopProduct(p.id);
        setListings(prev => prev.filter(x => x.id !== p.id));
      }},
    ]);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function formatAmount(n: number) {
    if (n >= 100000) return `₹ ${(n / 100000).toFixed(1)}L`;
    if (n >= 1000)   return `₹ ${(n / 1000).toFixed(2)}K`;
    return `₹ ${n.toLocaleString('en-IN')}`;
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <TopHeader />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
      >
        {/* ── Hero ── */}
        <Text style={s.heroTitle}>Sales</Text>
        <Text style={s.heroSub}>
          Everything about selling your artwork: incoming requests, what you have
          listed, and what has sold. Project work lives on your Projects tab.
        </Text>

        {/* ── Incoming purchase requests ──
            Moved here from the Creator's Dashboard sales tab. Requests need an
            answer, so they sit above the history rather than under it. */}
        <View style={s.pendingBlock}>
          <ConsultantDashboard navigation={navigation} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={TEAL} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* ── What's up for sale ──
                The creator's own add-and-manage surface for sale listings.
                Separate from the five showcase pieces on the home Profile tab:
                those exist to win a hire, these exist to be bought. */}
            <View style={s.listingsBlock}>
              <View style={s.sectionHeader}>
                <View style={s.sectionHeaderLeft}>
                  <Tag size={18} color={NAVY} />
                  <Text style={s.sectionTitle}>My Artwork Listings</Text>
                </View>
                <TouchableOpacity
                  style={s.addBtn}
                  onPress={() => navigation.navigate('AddEditProduct')}
                  activeOpacity={0.85}
                >
                  <Plus size={15} color="#fff" />
                  <Text style={s.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              {listings.length === 0 ? (
                <View style={s.emptyCard}>
                  <Text style={s.emptyText}>
                    Nothing listed for sale yet. Add a piece and buyers can request it.
                  </Text>
                </View>
              ) : (
                listings.map(p => (
                  <View key={p.id} style={s.saleCard}>
                    <View style={s.saleIconWrap}>
                      {p.images?.[0]
                        ? <Image source={{ uri: p.images[0] }} style={s.saleImg} />
                        : <View style={s.saleIconCircle}><Tag size={18} color={TEAL} /></View>
                      }
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.saleTitle} numberOfLines={1}>{p.title}</Text>
                      <Text style={s.saleDate}>{p.size ?? 'Size not set'}</Text>
                      <Text style={[s.saleDate, { color: p.available === false ? colors.error : TEAL }]}>
                        {p.available === false ? 'Not for sale' : 'Available for sale'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 8 }}>
                      <Text style={s.saleAmount}>₹ {Number(p.price ?? 0).toLocaleString('en-IN')}</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity onPress={() => navigation.navigate('AddEditProduct', { product: p })}>
                          <Edit3 size={16} color={NAVY} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteListing(p)}>
                          <Trash2 size={16} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* ── Completed artwork sales ── */}
            {(
              <View>
                <View style={s.sectionHeader}>
                  <View style={s.sectionHeaderLeft}>
                    <ShoppingBag size={18} color={NAVY} />
                    <Text style={s.sectionTitle}>Artw<Text style={s.sectionTitleAccent}>ů</Text>rk Sales</Text>
                  </View>
                  <View style={s.totalBadge}>
                    <Text style={s.totalBadgeText}>Total: {formatAmount(artSalesTotal)}</Text>
                  </View>
                </View>

                {sales.length === 0 ? (
                  <View style={s.emptyCard}>
                    <Text style={s.emptyText}>No completed artwork sales yet.</Text>
                  </View>
                ) : (
                  sales.map(item => (
                    <View key={item.id} style={s.saleCard}>
                      <View style={s.saleIconWrap}>
                        {item.shop_products?.images?.[0]
                          ? <Image source={{ uri: item.shop_products.images[0] }} style={s.saleImg} />
                          : <View style={s.saleIconCircle}><ShoppingBag size={18} color={TEAL} /></View>
                        }
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.saleTitle}>{item.shop_products?.title ?? 'Artwork'}</Text>
                        <Text style={s.saleDate}>Sold on {formatDate(item.updated_at)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <Text style={s.saleAmount}>₹ {item.artwork_price?.toLocaleString('en-IN')}</Text>
                        <View style={s.completedBadge}>
                          <Text style={s.completedBadgeText}>Completed</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ── Overall Earnings card ── */}
            <View style={s.earningsCard}>
              {/* Artwork only. Project earnings belong to the project surfaces;
                  totalling them here is what made this screen look like a
                  second, competing project dashboard. */}
              <Text style={s.earningsLabel}>ARTWORK EARNINGS</Text>
              <Text style={s.earningsValue}>{formatAmount(artSalesTotal)}</Text>
              <View style={s.growthBadge}>
                <TrendingUp size={14} color="#fff" />
                <Text style={s.growthText}>{sales.length} piece{sales.length === 1 ? '' : 's'} sold</Text>
              </View>
              <View style={s.earningsDivider} />
              <View style={s.earningsBreakdown}>
                <View>
                  <Text style={s.breakdownLabel}>LISTED</Text>
                  <Text style={s.breakdownValue}>{listings.length}</Text>
                </View>
                <View>
                  <Text style={s.breakdownLabel}>SOLD</Text>
                  <Text style={s.breakdownValue}>{sales.length}</Text>
                </View>
              </View>
            </View>

            {/* ── Recent Feedback ── */}
            <View style={s.feedbackCard}>
              <Text style={s.feedbackTitle}>Recent Feedback</Text>
              {reviews.length === 0 ? (
                <Text style={s.emptyText}>No reviews yet.</Text>
              ) : (
                reviews.map((r, i) => {
                  const name    = r.reviewer?.name ?? 'Anonymous';
                  const initials= name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase();
                  const avatarColors = ['#3D9B8F', '#E87B35', '#4338CA', '#10B981', '#F59E0B'];
                  const bgColor = avatarColors[i % avatarColors.length];
                  return (
                    <View key={r.id} style={s.reviewRow}>
                      <View style={[s.reviewAvatar, { backgroundColor: bgColor }]}>
                        <Text style={s.reviewAvatarText}>{initials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.reviewText}>"{r.feedback_text ?? 'Great work!'}"</Text>
                        <Text style={[s.reviewAuthor, { color: bgColor }]}>— {name}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  heroTitle: { fontSize: 40, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY, marginTop: 14, marginBottom: 10, lineHeight: 44 },
  heroSub: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 22, marginBottom: 20 },
  pendingBlock: { marginBottom: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.08)' },
  listingsBlock: { marginBottom: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.08)' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: NAVY, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontSize: fontSizes.sm, fontWeight: '700', fontFamily: fonts.heavy },
  // Tab
  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  sectionTitleAccent: { color: ORANGE },
  totalBadge: { backgroundColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  totalBadgeText: { fontSize: fontSizes.sm, fontFamily: fonts.medium, color: colors.textSecondary },
  // Sale cards
  saleCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.borderCard },
  saleIconWrap: {},
  saleImg: { width: 44, height: 44, borderRadius: 10 },
  saleIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF9F8', alignItems: 'center', justifyContent: 'center' },
  saleTitle: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  saleDate: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 2 },
  saleAmount: { fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy, color: TEAL },
  completedBadge: { backgroundColor: '#EEF9F8', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  completedBadgeText: { fontSize: fontSizes.xs, fontWeight: '700', fontFamily: fonts.heavy, color: TEAL },
  // Earnings card
  earningsCard: { backgroundColor: NAVY, borderRadius: 20, padding: 22, marginTop: 20, marginBottom: 16 },
  earningsLabel: { fontSize: 11, fontWeight: '700', fontFamily: fonts.heavy, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8, marginBottom: 6 },
  earningsValue: { fontSize: 44, fontWeight: '900', fontFamily: fonts.heavy, color: '#fff', marginBottom: 14 },
  growthBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'flex-start' },
  growthText: { fontSize: fontSizes.sm, fontFamily: fonts.medium, color: '#fff' },
  earningsDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 16 },
  earningsBreakdown: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.6, marginBottom: 4 },
  breakdownValue: { fontSize: fontSizes.xl, fontWeight: '800', fontFamily: fonts.heavy, color: '#fff' },
  // Feedback
  feedbackCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.borderCard },
  feedbackTitle: { fontSize: fontSizes.xl, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY, marginBottom: 16 },
  reviewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { fontSize: fontSizes.sm, fontWeight: '800', color: '#fff', fontFamily: fonts.heavy },
  reviewText: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textPrimary, lineHeight: 20, fontStyle: 'italic' },
  reviewAuthor: { fontSize: fontSizes.sm, fontWeight: '700', fontFamily: fonts.heavy, marginTop: 4 },
  // Empty
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: colors.borderCard },
  emptyText: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textTertiary },
});
