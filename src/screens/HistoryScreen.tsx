/**
 * HistoryScreen — role-aware project history
 * Matches Figma: "My History Dashboard.png" (consultant variant)
 *
 * Consultant ("Sales History"):
 * - Sales / Projects tab toggle, Artwork Sales section, Overall Earnings
 *   card, Recent Feedback — these are all seller-side concepts.
 * Client ("My Projects"):
 * - Just the project list (Completed / All), no earnings or reviews —
 *   a client never sells anything, so "Sales History" / earnings / reviews
 *   ABOUT them don't apply.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopHeader from '../components/TopHeader';
import { TrendingUp, Palette, PenTool } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { fetchProjectHistory, fetchConsultantEarnings, fetchConsultantReviews } from '../services/projectService';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import type { Project } from '../types';

// ─── Figma tokens ────────────────────────────────────────────
const NAVY = '#1B3A5C';
const TEAL = '#2D8B7F';
const EARNINGS_BG = '#1A2C4E';

type TabKey = 'sales' | 'projects';

export default function HistoryScreen({ navigation }: any) {
  const profile = useAuthStore((s) => s.profile);
  const consultantProfile = useAuthStore((s) => s.consultantProfile);
  const role = useAuthStore((s) => s.currentRole);

  const [activeTab, setActiveTab] = useState<TabKey>('sales');
  const [history, setHistory] = useState<Project[]>([]);
  const [earnings, setEarnings] = useState({ total: 0, pending: 0, thisMonth: 0 });
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Use auth user_id for consultant — consultant_id in projects = auth UID
  const consultantUserId = consultantProfile?.user_id ?? profile?.id;
  const userId = role === 'consultant' ? consultantUserId : profile?.id;

  const loadData = useCallback(async () => {
    if (!userId) return;
    try {
      const [historyData, earningsData, reviewsData] = await Promise.all([
        fetchProjectHistory(userId, role === 'consultant' ? 'consultant' : 'client'),
        role === 'consultant' && consultantUserId
          ? fetchConsultantEarnings(consultantUserId)
          : Promise.resolve({ total: 0, pending: 0, thisMonth: 0 }),
        role === 'consultant' && consultantUserId
          ? fetchConsultantReviews(consultantUserId)
          : Promise.resolve([]),
      ]);
      setHistory(historyData);
      setEarnings(earningsData);
      setReviews(reviewsData);
    } catch (e) {
      console.error('[HistoryScreen] loadData error:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, role, consultantUserId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function formatAmount(amount: number): string {
    if (amount >= 100000) return `₹ ${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹ ${(amount / 1000).toFixed(0)}K`;
    return `₹ ${amount.toLocaleString('en-IN')}`;
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const isConsultant = role === 'consultant';

  const salesProjects = history.filter(p => p.status === 'completed' || p.status === 'balance_paid');
  const allProjects = history;

  const displayProjects = activeTab === 'sales' ? salesProjects : allProjects;

  if (loading) {
    return (
      <View style={styles.bg}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <TopHeader />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopHeader />
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* ── Title ──────────────────────────────── */}
          <Text style={styles.title}>{isConsultant ? 'Sales History' : 'My Projects'}</Text>
          <Text style={styles.subtitle}>
            {isConsultant
              ? 'Track your artistic legacy and consultant milestones across the Dcreators ecosystem.'
              : 'Track the status and progress of every project and artwork you\'ve commissioned.'}
          </Text>

          {/* ── Tab Toggle ─────────────────────────── */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'sales' && styles.tabActive]}
              onPress={() => setActiveTab('sales')}
            >
              <Text style={[styles.tabText, activeTab === 'sales' && styles.tabTextActive]}>
                {isConsultant ? 'Sales' : 'Completed'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'projects' && styles.tabActive]}
              onPress={() => setActiveTab('projects')}
            >
              <Text style={[styles.tabText, activeTab === 'projects' && styles.tabTextActive]}>All</Text>
            </TouchableOpacity>
          </View>

          {/* ── Project/sales list ─────────────────── */}
          <View style={styles.salesSection}>
            <View style={styles.salesHeader}>
              <View style={styles.salesHeaderLeft}>
                <Palette size={18} color={NAVY} />
                <Text style={styles.salesTitle}>
                  {isConsultant
                    ? (activeTab === 'sales' ? 'Artwork Sales' : 'All Projects')
                    : (activeTab === 'sales' ? 'Completed Projects' : 'All Projects')}
                </Text>
              </View>
              <Text style={styles.salesTotalBadge}>
                Total: {formatAmount(displayProjects.reduce((sum, p) => sum + p.budget, 0))}
              </Text>
            </View>

            {displayProjects.length === 0 ? (
              <View style={styles.emptySection}>
                <Text style={styles.emptyText}>No {activeTab === 'sales' ? (isConsultant ? 'sales' : 'completed') : 'project'} history yet</Text>
              </View>
            ) : (
              displayProjects.slice(0, 10).map((project) => (
                <View key={project.id} style={styles.salesItem}>
                  <View style={styles.salesItemIcon}>
                    <PenTool size={16} color={TEAL} />
                  </View>
                  <View style={styles.salesItemInfo}>
                    <Text style={styles.salesItemName} numberOfLines={1}>
                      {project.assignment_type || 'Creative Project'}
                    </Text>
                    <Text style={styles.salesItemDate}>
                      {project.status === 'completed' ? 'Completed' : (isConsultant ? 'Sold' : 'Updated')} on {formatDate(project.updated_at)}
                    </Text>
                  </View>
                  <View style={styles.salesItemRight}>
                    <Text style={styles.salesItemAmount}>{formatAmount(project.budget)}</Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: project.status === 'completed' ? '#DCFCE7' : '#FEF3C7' }
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        { color: project.status === 'completed' ? '#16A34A' : '#D97706' }
                      ]}>
                        {project.status === 'completed' ? 'Completed' : project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* ── Overall Earnings + Recent Feedback ───
               Seller-side concepts — a client never sells anything or
               gets reviewed, so neither applies to them. */}
          {isConsultant && (
            <>
              <View style={styles.earningsCard}>
                <Text style={styles.earningsLabel}>OVERALL EARNINGS</Text>
                <Text style={styles.earningsAmount}>{formatAmount(earnings.total)}</Text>
                <View style={styles.growthBadge}>
                  <TrendingUp size={14} color="#fff" />
                  <Text style={styles.growthText}>
                    {earnings.thisMonth > 0 ? `₹${(earnings.thisMonth / 1000).toFixed(0)}K` : '0'} this month
                  </Text>
                </View>
                <View style={styles.earningsSplit}>
                  <View>
                    <Text style={styles.splitLabel}>ART SALES</Text>
                    <Text style={styles.splitValue}>{formatAmount(Math.floor(earnings.total * 0.52))}</Text>
                  </View>
                  <View>
                    <Text style={styles.splitLabel}>PROJECTS</Text>
                    <Text style={styles.splitValue}>{formatAmount(Math.floor(earnings.total * 0.48))}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackTitle}>Recent Feedback</Text>
                {reviews.length === 0 ? (
                  <Text style={styles.emptyText}>No reviews yet</Text>
                ) : (
                  reviews.map((r) => (
                    <View key={r.id} style={styles.feedbackItem}>
                      <View style={[styles.feedbackAvatar, { backgroundColor: '#E8F4FE' }]}>
                        <Text style={styles.feedbackInitials}>
                          {r.profiles?.name ? r.profiles.name.substring(0, 2).toUpperCase() : '??'}
                        </Text>
                      </View>
                      <View style={styles.feedbackContent}>
                        <Text style={styles.feedbackQuote}>
                          {r.review_text ? `"${r.review_text}"` : '(No text review)'}
                        </Text>
                        <Text style={styles.feedbackAuthor}>
                          {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} — {r.profiles?.name || 'Client'}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.screenBg },
  safe: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['3xl'],
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: fonts.heavy,
    color: NAVY,
    lineHeight: 38,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.md,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },

  tabRow: {
    flexDirection: 'row',
    gap: 0,
    marginBottom: spacing.xl,
    backgroundColor: '#F3F4F6',
    borderRadius: radii.full,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radii.full,
  },
  tabActive: { backgroundColor: NAVY },
  tabText: {
    fontSize: fontSizes.base,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  salesSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  salesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  salesHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  salesTitle: { fontSize: fontSizes.lg, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  salesTotalBadge: {
    fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary,
    backgroundColor: '#F3F4F6', paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.full,
  },
  salesItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  salesItemIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0FDF4',
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  salesItemInfo: { flex: 1 },
  salesItemName: { fontSize: fontSizes.base, fontWeight: '600', fontFamily: fonts.medium, color: colors.textPrimary },
  salesItemDate: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 2 },
  salesItemRight: { alignItems: 'flex-end' },
  salesItemAmount: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: TEAL, marginBottom: 4 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.full },
  statusBadgeText: { fontSize: fontSizes.xs, fontWeight: '700', fontFamily: fonts.heavy },
  emptySection: { paddingVertical: spacing['3xl'], alignItems: 'center' },
  emptyText: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textTertiary },

  earningsCard: {
    backgroundColor: EARNINGS_BG, borderRadius: 16, padding: spacing['2xl'], marginBottom: spacing.xl,
  },
  earningsLabel: {
    fontSize: fontSizes.xs + 1, fontWeight: '700', fontFamily: fonts.heavy,
    color: '#9CA3AF', letterSpacing: 1, marginBottom: spacing.sm,
  },
  earningsAmount: { fontSize: 42, fontWeight: '800', fontFamily: fonts.heavy, color: '#FFFFFF', marginBottom: spacing.md },
  growthBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(45,139,127,0.4)', alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg, paddingVertical: 6, borderRadius: radii.full, marginBottom: spacing.xl,
  },
  growthText: { fontSize: fontSizes.sm, fontFamily: fonts.medium, color: '#7DD3C0' },
  earningsSplit: { flexDirection: 'row', justifyContent: 'space-between' },
  splitLabel: { fontSize: fontSizes.xs, fontWeight: '700', fontFamily: fonts.heavy, color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 4 },
  splitValue: { fontSize: fontSizes.lg, fontWeight: '700', fontFamily: fonts.heavy, color: '#FFFFFF' },

  feedbackSection: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: spacing.xl,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  feedbackTitle: { fontSize: fontSizes.xl, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY, marginBottom: spacing.lg },
  feedbackItem: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  feedbackAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  feedbackInitials: { fontSize: fontSizes.sm, fontWeight: '700', color: NAVY },
  feedbackContent: { flex: 1 },
  feedbackQuote: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary, fontStyle: 'italic', lineHeight: 22 },
  feedbackAuthor: { fontSize: fontSizes.sm, fontWeight: '700', fontFamily: fonts.heavy, color: TEAL, marginTop: 4 },
});
