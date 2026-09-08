/**
 * CreatorDashboardScreen — Consultant Home
 * Role: CONSULTANT | Figma: "Creators Dashboard - Final.png"
 *
 * Toggle at top:
 *   "Profile"           → how the creator presents themselves: a preview of
 *                          their public profile plus the showcase, up to five
 *                          best works (shop_products where kind='showcase')
 *   "Project Dashboard" → things being worked on: active project/service
 *                          assignments (projects table)
 *
 * Selling is NOT here. Sale listings and purchase requests live on the SALES
 * tab (ConsultantEarningsHistoryScreen); this screen is about winning work,
 * that one is about moving artwork.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Edit3, Trash2, Plus, Briefcase, Eye } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import TopHeader from '../components/TopHeader';
import { getAssignmentTitle } from '../lib/assignment';
import { toPriceUnit } from '../lib/booking';
import { fetchConsultantProducts, deleteShopProduct } from '../services/shopService';
import { fetchConsultantDashboardProjects } from '../services/projectService';

const NAVY   = '#1B3A5C';
const ORANGE = '#E87B35';
const TEAL   = '#3D9B8F';
const BG     = '#EDF1F5';

/** Showcase cap. Mirrors MAX_SLOTS in ConsultantPortfolioUpdateScreen. */
const MAX_SHOWCASE = 5;

/**
 * Badge text per project status. "assigned" reads ACTIVE because the section
 * is already called Active Project Assignments — the client asked for the
 * badge to say the project is live, not to restate the section heading.
 */
const STATUS_LABELS: Record<string, string> = {
  assigned: 'ACTIVE',
};

const STATUS_COLORS: Record<string, string> = {
  assigned: '#E87B35', advance_pending: '#F59E0B', in_progress: '#0D7F7A',
  review_1: '#6366F1', review_2: '#8B5CF6', final_review: '#EC4899',
  work_order_generated: '#3B82F6', work_order_accepted: '#10B981',
  advance_paid: '#14B8A6',
};

/** "12 Mar 2026", or a dash when the date is not set. */
function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CreatorDashboardScreen({ navigation }: any) {
  const consultantProfile = useAuthStore(s => s.consultantProfile);
  const profile           = useAuthStore(s => s.profile);

  // "Profile" | "Project Dashboard" toggle. The left pill used to be "Sales
  // Dashboard"; selling moved to the SALES tab in the bottom nav, and what
  // remains here is the creator's showcase — the work that convinces a client
  // to hire them.
  const [activeTab, setActiveTab] = useState<'profile' | 'portfolio'>('portfolio');

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
      // Showcase only. Sale listings live on the SALES tab now.
      const data = await fetchConsultantProducts(consultantProfile.id, undefined, 'showcase');
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

  const firstName = (consultantProfile?.display_name || profile?.name || '').trim().split(/\s+/)[0];
  const dashboardTitle = firstName ? `${firstName}'s Dashboard` : "Creator's Dashboard";

  // Shaped exactly like the view model CreatorProfileScreen receives from the
  // client dashboard and search, so the preview renders the real screen with
  // real data rather than an approximation of it.
  const publicProfilePreview = {
    id: consultantProfile?.id ?? '',
    user_id: consultantProfile?.user_id ?? profile?.id ?? '',
    name: consultantProfile?.display_name ?? profile?.name ?? 'Creator',
    code: consultantProfile?.code ?? '',
    subtitle: consultantProfile?.subtitle ?? '',
    experience: consultantProfile?.experience != null ? String(consultantProfile.experience) : '',
    expertise: consultantProfile?.expertise ?? '',
    avatar_public_id: consultantProfile?.category ?? 'designer',
    avatar_url: profile?.avatar_url ?? null,
    portfolio_images: consultantProfile?.portfolio_images ?? null,
    portfolio_card_image: consultantProfile?.portfolio_card_image ?? null,
    portfolio_banner_image: consultantProfile?.portfolio_banner_image ?? null,
    category: consultantProfile?.category ?? 'designer',
    base_price: consultantProfile?.base_price ?? null,
    price_unit: toPriceUnit(consultantProfile?.price_unit),
    is_approved: consultantProfile?.is_approved ?? false,
  };

  // How many artwork slots are left of the five. At zero the Add button goes
  // grey and stops responding, so the cap is visible before it is hit.
  const showcaseSlotsLeft = Math.max(0, MAX_SHOWCASE - products.length);
  const canAddShowcase = showcaseSlotsLeft > 0;

  // ── Shared header used by both tabs (Figma "Project Dashboard" look) ──
  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* Header: same TopHeader used on the client side (hamburger + role switch + search/user) */}
      <TopHeader />
      {/* Personalised: "Gautam's Dashboard". Falls back to the generic title
          when the profile has no name yet (fresh signup, offline first load). */}
      <Text style={s.dashTitle}>{dashboardTitle}</Text>

      {/* Profile / Project Dashboard toggle pills */}
      <View style={s.toggleRow}>
        <TouchableOpacity
          style={[s.toggleBtn, activeTab === 'profile' && s.toggleBtnActive]}
          onPress={() => setActiveTab('profile')}
          activeOpacity={0.8}
        >
          <Text style={[s.toggleLabel, activeTab === 'profile' && s.toggleLabelActive]}>Profile</Text>
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

        {activeTab === 'profile' ? (
          <>
            {/* See yourself the way a client sees you, before deciding what to
                change. Reuses the real client-facing profile screen rather than
                a mock of it, so the preview cannot drift from the thing. */}
            <TouchableOpacity
              style={s.previewBtn}
              onPress={() => navigation.navigate('CreatorProfile', { creator: publicProfilePreview })}
              activeOpacity={0.85}
            >
              <Eye size={16} color={NAVY} />
              <View style={{ flex: 1 }}>
                <Text style={s.previewTitle}>View my public profile</Text>
                <Text style={s.previewSub}>See exactly what clients see before you hire out</Text>
              </View>
            </TouchableOpacity>

            {/* The showcase: best work, there to win the hire. Not the shop. */}
            <View style={s.listHeader}>
              <Text style={s.listTitle}>My Showcase</Text>
              <TouchableOpacity
                style={[s.addBtn, !canAddShowcase && s.addBtnDisabled]}
                onPress={() => navigation.navigate('ConsultantPortfolioUpdate')}
                disabled={!canAddShowcase}
                activeOpacity={0.85}
              >
                <Plus size={16} color={canAddShowcase ? '#fff' : '#9CA3AF'} />
                <Text style={[s.addBtnText, !canAddShowcase && s.addBtnTextDisabled]}>
                  {canAddShowcase ? `${showcaseSlotsLeft} Add` : 'All 5 added'}
                </Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={TEAL} style={{ marginTop: 40 }} />
            ) : products.length === 0 ? (
              <View style={s.emptyWrap}>
                <Text style={s.emptyTitle}>No showcase work yet</Text>
                <Text style={s.emptySub}>Add up to five of your best pieces so clients can judge your work</Text>
                <TouchableOpacity
                  style={s.emptyBtn}
                  onPress={() => navigation.navigate('ConsultantPortfolioUpdate')}
                  activeOpacity={0.85}
                >
                  <Plus size={16} color="#fff" />
                  <Text style={s.emptyBtnText}>Add Showcase Work</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.productList}>
                {products.map(p => {
                  const coverUri = p.images?.[0] ?? null;
                  return (
                    <View key={p.id} style={s.productCard}>
                      {/* Full-width image (Figma) */}
                      {coverUri
                        ? <Image source={{ uri: coverUri }} style={s.productImg} resizeMode="cover" />
                        : <View style={[s.productImg, s.productImgPlaceholder]} />
                      }

                      {/* Info. No price and no sale status: showcase work is
                          not merchandise, and showing "Available for Sale"
                          here is what conflated the two in the first place. */}
                      <View style={s.productBody}>
                        <View style={s.productTitleRow}>
                          <Text style={s.productTitle} numberOfLines={1}>{p.title}</Text>
                        </View>

                        <Text style={s.productCategory}>{p.medium || p.category || 'Artwork'}</Text>

                        <TouchableOpacity>
                          <Text style={s.productBrief}>
                            {p.description ? 'Artwork Brief...' : 'No description'}
                          </Text>
                        </TouchableOpacity>

                        {/* Size + edit/delete. Editing goes to the showcase
                            form, not the sale form — this piece is not a
                            product and has no price to set. */}
                        <View style={s.productMetaRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.productSize}>Size: {p.size ?? 'Open'}</Text>
                          </View>
                          <TouchableOpacity
                            style={s.actionBtn}
                            onPress={() => navigation.navigate('ConsultantPortfolioUpdate')}
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

            {/* Purchase Requests used to sit here. It moved to the SALES tab
                (ConsultantEarningsHistoryScreen) so this dashboard shows only
                what the creator owns, and every incoming sale lives in one
                place alongside the sales history. */}
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
                  const badgeColor = STATUS_COLORS[proj.status] ?? '#9CA3AF';
                  const badgeLabel = STATUS_LABELS[proj.status] ?? proj.status.replace(/_/g, ' ').toUpperCase();
                  // The live number: what was agreed if they have agreed, else
                  // the client's opening budget.
                  const price = Number(proj.final_offer ?? proj.budget ?? 0);
                  return (
                    <TouchableOpacity
                      key={proj.id}
                      style={s.projectCard}
                      onPress={() => navigation.navigate('Main', { screen: 'CreatorWorkorder', params: { project: proj } })}
                      activeOpacity={0.85}
                    >
                      <View style={s.projectCardHead}>
                        <Text style={s.projectCardTitle} numberOfLines={1}>
                          {getAssignmentTitle(proj)}
                        </Text>
                        <View style={[s.statusBadge, { backgroundColor: badgeColor + '22' }]}>
                          <Text style={[s.statusBadgeText, { color: badgeColor }]}>{badgeLabel}</Text>
                        </View>
                      </View>

                      <Text style={s.projectCardClient}>From: {clientName}</Text>
                      <Text style={s.projectCardBudget}>₹{price.toLocaleString('en-IN')}</Text>

                      <View style={s.projectMetaRow}>
                        <View style={s.projectMetaCell}>
                          <Text style={s.projectMetaLabel}>DEADLINE</Text>
                          <Text style={s.projectMetaValue}>{formatDate(proj.deadline)}</Text>
                        </View>
                        <View style={s.projectMetaCell}>
                          <Text style={s.projectMetaLabel}>ASSIGNED</Text>
                          <Text style={s.projectMetaValue}>{formatDate(proj.created_at)}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        <Text style={s.footer}>
          A joint venture of Ishisoft Pvt.Ltd, Mr. Shoumik Mazumdar and{'\n'}
          Design & Animation Club, Department of Visual Arts, AUS{'\n'}
          Honorary Design Mentor — Dr. Gautam Dutta, Department of Visual Arts, AUS
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  // No marginHorizontal here: the ScrollView already pads 20, and the second
  // 20 was indenting the cards past the "Active Project Assignments" heading.
  inboxSection: { marginBottom: 16, marginTop: 8 },
  projectCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E8EAF0', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 2 } }) },
  projectCardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  projectCardTitle: { flex: 1, fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  projectCardClient: { fontSize: fontSizes.xs, fontFamily: fonts.body, color: colors.textSecondary, marginTop: 2 },
  projectCardBudget: { fontSize: fontSizes.sm, fontWeight: '700', fontFamily: fonts.heavy, color: ORANGE, marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 9, fontWeight: '700', fontFamily: fonts.heavy, letterSpacing: 0.3 },

  projectMetaRow: { flexDirection: 'row', gap: 20, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F3F7' },
  projectMetaCell: { flex: 1 },
  projectMetaLabel: { fontSize: 9, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.6, marginBottom: 2 },
  projectMetaValue: { fontSize: fontSizes.xs + 1, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },

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
  addBtnDisabled: { backgroundColor: '#E5E7EB' },
  addBtnTextDisabled: { color: '#9CA3AF' },

  previewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 18,
    borderWidth: 1, borderColor: '#E8EAF0',
  },
  previewTitle: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  previewSub: { fontSize: fontSizes.xs, fontFamily: fonts.body, color: colors.textSecondary, marginTop: 2 },

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
