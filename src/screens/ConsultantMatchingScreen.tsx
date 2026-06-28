/**
 * CLIENT_CONSULTANT_MATCHING_SCREEN
 *
 * owner_role: CLIENT
 * previous_screen: CLIENT_ASSIGN_PROJECT_SCREEN (bidding path only)
 * next_screen: CLIENT_DASHBOARD (consultant notified; negotiation happens in CreatorWorkorderScreen)
 * workflow_stage: DRAFT → ASSIGNED
 *
 * Logic:
 *  - Fetches consultant_profiles where category matches the project's assignment_type
 *  - Filters to those with base_price within ±5% of project budget
 *  - Shows "X consultants available within (5% +/- of budget)" banner
 *  - "Hire Now" → assigns consultant_id to project (status: 'assigned') → client goes back to Dashboard
 *  - "View Portfolio" → CreatorProfile screen
 *
 * Figma: CLIENT_CONSULTANT_MATCHING_SCREEN.png
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SlidersHorizontal, Megaphone, ArrowLeft, ExternalLink } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { updateProjectStatus } from '../services/projectService';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';
import type { Project } from '../types';

// ─── Design tokens ────────────────────────────────────────────
const NAVY = '#1B3A5C';
const TEAL = '#0D5C5A';
const TEAL_DARK = '#0A4A48';
const BG = '#F0F2F8';

// ─── How we compute ±5% budget range ──────────────────────────
function getBudgetRange(budget: number) {
  const low = Math.floor(budget * 0.95);
  const high = Math.ceil(budget * 1.05);
  return { low, high };
}

// ─── Budget deviation label ────────────────────────────────────
function getBudgetLabel(
  consultantPrice: number,
  projectBudget: number,
): { label: string; color: string } {
  if (consultantPrice === 0 || projectBudget === 0) {
    return { label: 'ON BUDGET', color: '#555' };
  }
  const pct = Math.round(((consultantPrice - projectBudget) / projectBudget) * 100);
  if (pct === 0) return { label: 'ON BUDGET', color: '#555' };
  if (pct > 0) return { label: `+${pct}% OF BUDGET`, color: '#E87B35' };
  return { label: `${pct}% OF BUDGET`, color: TEAL };
}

interface MatchedConsultant {
  id: string;
  user_id: string;
  display_name: string;
  code: string;
  experience: string | null;
  avatar_url: string | null;
  base_price: number | null;
  category: string;
  is_approved: boolean;
}

export default function ConsultantMatchingScreen({ navigation, route }: any) {
  const project: Project = route.params.project;
  const budget = project.budget ?? 0;
  const { low, high } = getBudgetRange(budget);

  const [consultants, setConsultants] = useState<MatchedConsultant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hiringId, setHiringId] = useState<string | null>(null);

  // ── FETCH MATCHING CONSULTANTS ──────────────────────────────
  const loadConsultants = useCallback(async () => {
    setIsLoading(true);
    try {
      // Category matching: map hire role to consultant category
      const roleToCategory: Record<string, string[]> = {
        'Hire Creative Consultant': ['photographer', 'videographer', 'designer', 'sculptor', 'artisan'],
        'Hire Photographer': ['photographer'],
        'Hire Videographer': ['videographer'],
        'Hire Designer': ['designer'],
        'Hire Sculptor': ['sculptor'],
        'Hire Artisan': ['artisan'],
      };
      const allowedCategories =
        roleToCategory[project.assignment_type] ??
        ['photographer', 'videographer', 'designer', 'sculptor', 'artisan'];

      const { data, error } = await supabase
        .from('consultant_profiles')
        .select('id, user_id, display_name, code, experience, avatar_url, base_price, category, is_approved')
        .in('category', allowedCategories)
        .eq('is_approved', true)
        .eq('is_active', true)
        // ±5% budget filter: base_price between low and high
        .gte('base_price', low)
        .lte('base_price', high)
        .order('base_price', { ascending: true })
        .limit(20);

      if (error) throw new Error(error.message);
      setConsultants((data ?? []) as MatchedConsultant[]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load consultants.');
    } finally {
      setIsLoading(false);
    }
  }, [project, low, high]);

  useEffect(() => {
    loadConsultants();
  }, [loadConsultants]);

  // ── HIRE NOW: assign consultant → status 'assigned' ─────────
  async function handleHireNow(consultant: MatchedConsultant) {
    if (hiringId) return;
    setHiringId(consultant.id);

    try {
      // First patch consultant_id (not a status field, extraFields handles it)
      const { error: patchErr } = await supabase
        .from('projects')
        .update({ consultant_id: consultant.user_id })
        .eq('id', project.id);
      if (patchErr) throw new Error(patchErr.message);

      // Validate draft → assigned through the status machine
      await updateProjectStatus(project.id, 'assigned');

      Alert.alert('Consultant Assigned ✅', `${consultant.display_name} has been notified and will review your project.`, [
        { text: 'OK', onPress: () => navigation.navigate('Main', { screen: 'Dashboard' }) },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to assign consultant.');
    } finally {
      setHiringId(null);
    }
  }

  // ── VIEW PORTFOLIO ──────────────────────────────────────────
  function handleViewPortfolio(consultant: MatchedConsultant) {
    navigation.navigate('Main', {
      screen: 'CreatorProfile',
      params: {
        creator: {
          id: consultant.id,
          user_id: consultant.user_id,
          name: consultant.display_name,
          code: consultant.code,
          experience: consultant.experience ?? '',
          avatar_url: consultant.avatar_url,
          category: consultant.category,
          base_price: consultant.base_price,
          is_approved: consultant.is_approved,
          subtitle: '',
          expertise: '',
          avatar_public_id: '',
        },
      },
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* ── Top header ─────────────────────────── */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={NAVY} />
        </TouchableOpacity>
        <Image
          source={{ uri: RemoteAssets.dIcon }}
          style={styles.dIcon}
          resizeMode="contain"
        />
        <Text style={styles.headerTagline}>Hire creatives. Buy art. Build ideas</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page Title ───────────────────────── */}
        <Text style={styles.pageTitle}>Assignment{'\n'}Status</Text>
        <Text style={styles.pageSubtitle}>
          Manage your project proposals and select the ideal talent.
        </Text>

        {/* ── Availability Banner ──────────────── */}
        <View style={styles.availabilityBanner}>
          <Megaphone size={18} color="#fff" />
          <Text style={styles.availabilityText}>
            {isLoading
              ? 'Finding creative consultants...'
              : `${consultants.length} Creative consultant${consultants.length !== 1 ? 's' : ''} available within\n(5% +/- of budget)`}
          </Text>
        </View>

        {/* ── Filter Dropdown Row ──────────────── */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>SELECT CREATIVE CONSULTANT</Text>
          <View style={styles.filterDropdown}>
            <Text style={styles.filterDropdownText}>
              All Candidates ({consultants.length})
            </Text>
            <Text style={styles.filterDropdownCaret}>⌄</Text>
          </View>
        </View>

        {/* ── Refine Search Button ─────────────── */}
        <TouchableOpacity
          style={styles.refineBtn}
          onPress={() => navigation.navigate('Filter')}
          activeOpacity={0.85}
        >
          <SlidersHorizontal size={16} color="#fff" />
          <Text style={styles.refineBtnText}>Refine Search</Text>
        </TouchableOpacity>

        {/* ── Consultant Cards ─────────────────── */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={NAVY} />
            <Text style={styles.loadingText}>Finding matches within ±5% of ₹{budget.toLocaleString('en-IN')}…</Text>
          </View>
        ) : consultants.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Matches Found</Text>
            <Text style={styles.emptySubtitle}>
              No consultants found within ±5% of your ₹{budget.toLocaleString('en-IN')} budget for
              this category. Try adjusting your budget or refining the search.
            </Text>
            <TouchableOpacity
              style={styles.adjustBudgetBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.adjustBudgetBtnText}>Adjust Budget</Text>
            </TouchableOpacity>
          </View>
        ) : (
          consultants.map((c, index) => {
            const price = c.base_price ?? 0;
            const { label: budgetLabel, color: budgetColor } = getBudgetLabel(price, budget);
            const isSelected = index === 0; // first card highlighted per Figma
            const isHiring = hiringId === c.id;

            return (
              <View
                key={c.id}
                style={[styles.consultantCard, isSelected && styles.consultantCardSelected]}
              >
                {/* ── Avatar + Name row ─────── */}
                <View style={styles.cardHeader}>
                  {c.avatar_url ? (
                    <Image source={{ uri: c.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitial}>
                        {(c.display_name || 'C').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.consultantName}>{c.display_name}</Text>
                    <Text style={styles.consultantCode}>Code: {c.code}</Text>
                  </View>
                </View>

                {/* ── Tags row ──────────────── */}
                <View style={styles.tagsRow}>
                  {c.experience && (
                    <View style={styles.experienceTag}>
                      <Text style={styles.experienceTagText}>{c.experience}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.portfolioBtn}
                    onPress={() => handleViewPortfolio(c)}
                    activeOpacity={0.7}
                  >
                    <ExternalLink size={11} color={NAVY} />
                    <Text style={styles.portfolioBtnText}>View Portfolio</Text>
                  </TouchableOpacity>
                </View>

                {/* ── Price row ─────────────── */}
                <View style={styles.priceRow}>
                  <View>
                    <Text style={styles.priceValue}>
                      ₹{price.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.budgetLabel, { color: budgetColor }]}>
                      {budgetLabel}
                    </Text>
                  </View>

                  {/* Hire Now CTA */}
                  <TouchableOpacity
                    style={[
                      styles.hireNowBtn,
                      isSelected && styles.hireNowBtnSelected,
                      isHiring && { opacity: 0.6 },
                    ]}
                    onPress={() => handleHireNow(c)}
                    disabled={!!hiringId}
                    activeOpacity={0.85}
                  >
                    {isHiring ? (
                      <ActivityIndicator size="small" color={isSelected ? '#fff' : NAVY} />
                    ) : (
                      <Text
                        style={[
                          styles.hireNowBtnText,
                          isSelected && styles.hireNowBtnTextSelected,
                        ]}
                      >
                        Hire Now
                      </Text>
                    )}
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },

  // ── Top Header ─────────────────────────────────────────────
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: BG,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  dIcon: { width: 32, height: 32 },
  headerTagline: {
    flex: 1,
    fontSize: 9,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // ── Page Title ─────────────────────────────────────────────
  pageTitle: {
    fontSize: 34,
    fontWeight: '800',
    fontFamily: fonts.heavy,
    color: NAVY,
    lineHeight: 40,
    marginBottom: 8,
    marginTop: 4,
  },
  pageSubtitle: {
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },

  // ── Availability Banner ────────────────────────────────────
  availabilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: NAVY,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  availabilityText: {
    flex: 1,
    color: '#fff',
    fontSize: fontSizes.sm,
    fontWeight: '600',
    fontFamily: fonts.medium,
    lineHeight: 20,
  },

  // ── Filter Section ─────────────────────────────────────────
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    color: colors.textTertiary,
    letterSpacing: 1.0,
    marginBottom: 8,
  },
  filterDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: '#fff',
  },
  filterDropdownText: {
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textPrimary,
  },
  filterDropdownCaret: {
    fontSize: 20,
    color: colors.textTertiary,
    lineHeight: 22,
  },

  // ── Refine Search ──────────────────────────────────────────
  refineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 20,
  },
  refineBtnText: {
    color: '#fff',
    fontSize: fontSizes.base,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    letterSpacing: 0.3,
  },

  // ── Loading / Empty ────────────────────────────────────────
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  loadingText: {
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 16,
    gap: 12,
  },
  emptyTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    color: NAVY,
  },
  emptySubtitle: {
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  adjustBudgetBtn: {
    marginTop: 8,
    backgroundColor: NAVY,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  adjustBudgetBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontFamily: fonts.heavy,
    fontSize: fontSizes.base,
  },

  // ── Consultant Cards ───────────────────────────────────────
  consultantCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E0E4EE',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  consultantCardSelected: {
    borderWidth: 2,
    borderColor: NAVY,
    ...Platform.select({
      ios: { shadowColor: NAVY, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },

  // Avatar + name
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8ECF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 20, fontWeight: '700', color: NAVY },
  cardHeaderText: { flex: 1 },
  consultantName: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    color: colors.textPrimary,
  },
  consultantCode: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Tags row
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  experienceTag: {
    backgroundColor: '#F0F2F8',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  experienceTagText: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  portfolioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: NAVY,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  portfolioBtnText: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.medium,
    color: NAVY,
    fontWeight: '600',
  },

  // Price + Hire Now
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: fonts.heavy,
    color: NAVY,
  },
  budgetLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  hireNowBtn: {
    borderWidth: 1.5,
    borderColor: NAVY,
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  hireNowBtnSelected: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  hireNowBtnText: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    color: NAVY,
  },
  hireNowBtnTextSelected: {
    color: '#fff',
  },
});
