/**
 * CreatorDashboardScreen — Consultant Home
 * Role: CONSULTANT | Figma: "Creators Dashboard - Final.png"
 *
 * Toggle at top:
 *   "Sales Dashboard"   → things for sale: artwork listings (shop_products) +
 *                          incoming purchase requests (artwork_orders)
 *   "Project Dashboard" → things being worked on: active project/service
 *                          assignments (projects table)
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Edit3, Trash2, Plus, Briefcase } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import ConsultantDashboard from '../components/dashboard/ConsultantDashboard';
import TopHeader from '../components/TopHeader';
import { fetchConsultantProducts, deleteShopProduct } from '../services/shopService';
import { fetchConsultantDashboardProjects } from '../services/projectService';

const NAVY   = '#1B3A5C';
const ORANGE = '#E87B35';
const TEAL   = '#3D9B8F';
const BG     = '#EDF1F5';

export default function CreatorDashboardScreen({ navigation }: any) {
  const consultantProfile = useAuthStore(s => s.consultantProfile);
  const profile           = useAuthStore(s => s.profile);

  // "Sales Dashboard" | "Project Dashboard" toggle (Figma top pills)
  const [activeTab, setActiveTab] = useState<'sales' | 'portfolio'>('portfolio');

  const [products,   setProducts]   = useState<any[]>([]);
  const [projects,   setProjects]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchProducts(); fetchProjects(); }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => { fetchProducts(); fetchProjects(); });
    return unsub;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchProducts(), fetchProjects()]).finally(() => setRefreshing(false));
  }, []);

  async function fetchProducts() {
    if (!consultantProfile?.id) { setLoading(false); return; }
    try {
      const data = await fetchConsultantProducts(consultantProfile.id);
      setProducts(data);
    } catch { setProducts([]); }
    finally { setLoading(false); }
  }

  async function fetchProjects() {
    const userId = consultantProfile?.user_id ?? profile?.id;
    if (!userId) return;
    try {
      const data = await fetchConsultantDashboardProjects(userId);
      setProjects(data);
    } catch { setProjects([]); }
  }

  async function handleDelete(p: any) {
    Alert.alert('Delete Product', `Delete "${p.title}"?`, [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteShopProduct(p.id);
        setProducts(prev => prev.filter(x => x.id !== p.id));
      }},
    ]);
  }

  function getAvailabilityLabel(p: any): string {
    if (p.is_active === false) return 'Not for Sale';
    return 'Available for Sale';
  }

  function getAvailabilityColor(p: any): string {
    const label = getAvailabilityLabel(p);
    if (label === 'Not for Sale') return '#DC2626';
    return '#059669';
  }

  // ── Shared header used by both tabs (Figma "Project Dashboard" look) ──
  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* Header: same TopHeader used on the client side (hamburger + role switch + search/user) */}
      <TopHeader />
      <Text style={s.dashTitle}>Creator's Dashboard</Text>

      {/* Sales Dashboard / Project Dashboard toggle pills */}
      <View style={s.toggleRow}>
        <TouchableOpacity
          style={[s.toggleBtn, activeTab === 'sales' && s.toggleBtnActive]}
          onPress={() => setActiveTab('sales')}
          activeOpacity={0.8}
        >
          <Text style={[s.toggleLabel, activeTab === 'sales' && s.toggleLabelActive]}>Sales Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.toggleBtn, activeTab === 'portfolio' && s.toggleBtnActive]}
          onPress={() => setActiveTab('portfolio')}
          activeOpacity={0.8}
        >
          <Text style={[s.toggleLabel, activeTab === 'portfolio' && s.toggleLabelActive]}>Project Dashboard</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
      >

        {activeTab === 'sales' ? (
          <>
            {/* Things for sale: artwork listings */}
            <View style={s.listHeader}>
              <Text style={s.listTitle}>My Artwork Listings</Text>
              <TouchableOpacity
                style={s.addBtn}
                onPress={() => navigation.navigate('ConsultantPortfolioUpdate')}
                activeOpacity={0.85}
              >
                <Plus size={16} color="#fff" />
                <Text style={s.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={TEAL} style={{ marginTop: 40 }} />
            ) : products.length === 0 ? (
              <View style={s.emptyWrap}>
                <Text style={s.emptyTitle}>No listings yet</Text>
                <Text style={s.emptySub}>Add your first artwork to start selling</Text>
                <TouchableOpacity
                  style={s.emptyBtn}
                  onPress={() => navigation.navigate('ConsultantPortfolioUpdate')}
                  activeOpacity={0.85}
                >
                  <Plus size={16} color="#fff" />
                  <Text style={s.emptyBtnText}>Add Artwork</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.productList}>
                {products.map(p => {
                  const coverUri = p.images?.[0] ?? null;
                  const availLabel = getAvailabilityLabel(p);
                  const availColor = getAvailabilityColor(p);
                  return (
                    <View key={p.id} style={s.productCard}>
                      {/* Full-width image (Figma) */}
                      {coverUri
                        ? <Image source={{ uri: coverUri }} style={s.productImg} resizeMode="cover" />
                        : <View style={[s.productImg, s.productImgPlaceholder]} />
                      }

                      {/* Info */}
                      <View style={s.productBody}>
                        {/* Title + price row */}
                        <View style={s.productTitleRow}>
                          <Text style={s.productTitle} numberOfLines={1}>{p.title}</Text>
                          <Text style={s.productPrice}>
                            ₹{Number(p.price ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Text>
                        </View>

                        <Text style={s.productCategory}>{p.category ?? 'Artwork'}</Text>

                        <TouchableOpacity>
                          <Text style={s.productBrief}>
                            {p.description ? 'Artwork Brief...' : 'No description'}
                          </Text>
                        </TouchableOpacity>

                        {/* Size + availability + edit pencil row */}
                        <View style={s.productMetaRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.productSize}>Size: {p.size ?? 'Open'}</Text>
                            <Text style={[s.availLabel, { color: availColor }]}>{availLabel}</Text>
                          </View>
                          <TouchableOpacity
                            style={s.actionBtn}
                            onPress={() => navigation.navigate('AddEditProduct', { product: p })}
                            activeOpacity={0.7}
                          >
                            <Edit3 size={16} color={NAVY} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={s.actionBtn}
                            onPress={() => handleDelete(p)}
                            activeOpacity={0.7}
                          >
                            <Trash2 size={16} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Incoming purchase requests for the above listings */}
            <View style={s.salesDivider} />
            <ConsultantDashboard navigation={navigation} />
          </>
        ) : (
          <>
            {/* Things being worked on: active project/service assignments */}
            <View style={s.listHeader}>
              <Text style={s.listTitle}>Active Project Assignments</Text>
            </View>

            {projects.length === 0 ? (
              <View style={s.emptyWrap}>
                <Briefcase size={40} color="#D1D5DB" />
                <Text style={s.emptyTitle}>No active projects yet</Text>
                <Text style={s.emptySub}>Project and service assignments from clients will appear here</Text>
              </View>
            ) : (
              <View style={s.inboxSection}>
                {projects.map((proj: any) => {
                  const clientName = (proj.profiles as any)?.name ?? 'Client';
                  const STATUS_COLORS: Record<string, string> = {
                    assigned: '#E87B35', advance_pending: '#F59E0B', in_progress: '#0D7F7A',
                    review_1: '#6366F1', review_2: '#8B5CF6', final_review: '#EC4899',
                    work_order_generated: '#3B82F6', work_order_accepted: '#10B981',
                    advance_paid: '#14B8A6',
                  };
                  const badgeColor = STATUS_COLORS[proj.status] ?? '#9CA3AF';
                  return (
                    <TouchableOpacity
                      key={proj.id}
                      style={s.projectCard}
                      onPress={() => navigation.navigate('Main', { screen: 'CreatorWorkorder', params: { project: proj } })}
                      activeOpacity={0.85}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={s.projectCardTitle} numberOfLines={1}>
                          {proj.assignment_details?.[0] ?? proj.assignment_type ?? 'Creative Project'}
                        </Text>
                        <Text style={s.projectCardClient}>From: {clientName}</Text>
                        {proj.budget && <Text style={s.projectCardBudget}>₹{Number(proj.budget).toLocaleString('en-IN')}</Text>}
                      </View>
                      <View style={[s.statusBadge, { backgroundColor: badgeColor + '22' }]}>
                        <Text style={[s.statusBadgeText, { color: badgeColor }]}>{proj.status.replace(/_/g, ' ').toUpperCase()}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        <Text style={s.footer}>
          A joint venture of Ishisoft Pvt.Ltd, Mr. Shoumik Mazumder and{'\n'}
          Design & Animation Club, Department of Visual Arts, AUS{'\n'}
          Honorary Design Mentor — Dr. Gautam Dutta, Department of Visual Arts, AUS
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  inboxSection: { marginHorizontal: 20, marginBottom: 16, marginTop: 8 },
  inboxTitle: { fontSize: 13, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY, marginBottom: 10, letterSpacing: 0.3 },
  projectCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E8EAF0', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 2 } }) },
  projectCardTitle: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  projectCardClient: { fontSize: fontSizes.xs, fontFamily: fonts.body, color: colors.textSecondary, marginTop: 2 },
  projectCardBudget: { fontSize: fontSizes.sm, fontWeight: '700', fontFamily: fonts.heavy, color: ORANGE, marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginLeft: 8 },
  statusBadgeText: { fontSize: 9, fontWeight: '700', fontFamily: fonts.heavy, letterSpacing: 0.3 },

  dashTitle: { fontSize: 28, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY, lineHeight: 34, textAlign: 'center', marginTop: 6, marginBottom: 2 },

  // Toggle pills (Figma "Sales Dashboard | Project Dashboard")
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: BG,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  toggleBtnActive: {
    backgroundColor: '#fff',
    borderColor: NAVY,
  },
  toggleLabel: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  toggleLabelActive: {
    color: NAVY,
    fontWeight: '800',
  },

  salesDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.08)', marginVertical: 24 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  listHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  listTitle: { fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: NAVY, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontSize: fontSizes.sm, fontWeight: '700', fontFamily: fonts.heavy },

  productList: { gap: 16 },
  productCard: {
    backgroundColor: '#fff', borderRadius: radii.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  productImg: { width: '100%', height: 170 },
  productImgPlaceholder: { backgroundColor: '#E5E7EB' },
  productBody: { padding: 14, gap: 3 },
  productTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  productCategory: { fontSize: fontSizes.xs + 1, fontWeight: '700', fontFamily: fonts.heavy, color: ORANGE, letterSpacing: 0.3 },
  productTitle: { flex: 1, fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  productBrief: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: TEAL },
  productSize: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textTertiary },
  productPrice: { fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  availLabel: { fontSize: fontSizes.xs, fontWeight: '700', fontFamily: fonts.heavy, marginTop: 2 },
  productMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },

  emptyWrap: { alignItems: 'center', marginTop: 40, gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: fontSizes.xl, fontFamily: fonts.heavy, color: colors.textSecondary },
  emptySub: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textTertiary, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: NAVY, paddingHorizontal: 20, paddingVertical: 12, borderRadius: radii.md, marginTop: 12 },
  emptyBtnText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },

  footer: {
    fontSize: 9, fontFamily: fonts.body, color: colors.textTertiary,
    textAlign: 'center', lineHeight: 14, marginTop: 32,
  },
});
