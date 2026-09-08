// ============================================
// ClientDashboard — "Explore Creative Consultant's Portfolio"
// Role: CLIENT | Figma: "Explore Creative Consultant's Portfolio.png"
// 5 creator browse sections + active projects summary
// ============================================

import React, { useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight } from 'lucide-react-native';
import TopHeader from '../TopHeader';
import SkeletonBar from '../common/SkeletonBar';
import FeaturedCreatorCard from './FeaturedCreatorCard';
import { useCreators } from '../../hooks/useCreators';
import { colors, fonts, fontSizes, spacing, radii } from '../../styles/theme';
import type { CreatorCardViewModel, MainTabScreenProps } from '../../types/navigation';

// ─── Figma color tokens ──────────────────────────────────────
const NAVY = '#1B3A5C';

interface ClientDashboardProps {
  navigation: MainTabScreenProps<'Dashboard'>['navigation'];
}

// "Creators in Demand" is ranked by review score, so it needs a rule for what
// counts as demand. Bayesian average rather than a raw mean: a lone 5.0 from
// one client should not outrank a 4.6 earned over a dozen jobs.
const DEMAND_PRIOR_WEIGHT = 3;   // worth this many reviews
const DEMAND_PRIOR_MEAN = 3.5;
const IN_DEMAND_LIMIT = 4;

// Section configuration for the creator browsing cards
const SECTIONS = [
  { title: 'Creators in Demand', category: null as string | null },
  { title: "Photographer's Archive", category: 'photographer' },
  { title: "Designer's Desk", category: 'designer' },
  { title: "Artist's Gallery", category: 'sculptor' },
  { title: "Artisan's Hub", category: 'artisan' },
];

// Category tabs shown above the "Explore Creative Consultant's Portfolio" subtitle
const CATEGORY_TABS = [
  { key: 'photographer', label: 'Photographer', icon: require('../../../assets/Photographer 1.png') },
  { key: 'designer', label: 'Designer', icon: require('../../../assets/Designer 1.png') },
  { key: 'sculptor', label: 'Artist', icon: require('../../../assets/Artist 1.png') },
  { key: 'artisan', label: 'Artisans', icon: require('../../../assets/Artisans 1.png') },
] as const;

export default function ClientDashboard({ navigation }: ClientDashboardProps) {
  const [activeCat, setActiveCat] = React.useState<string | null>(null);
  const { creators, ratings, loading: creatorsLoading, error: creatorsError, refresh: refreshCreators } = useCreators();

  const onRefresh = useCallback(async () => {
    await refreshCreators();
  }, [refreshCreators]);

  /** Unreviewed creators score -1: no reviews is no evidence of demand. */
  function demandScore(c: CreatorCardViewModel): number {
    const r = ratings[c.user_id];
    if (!r || r.review_count === 0) return -1;
    return (r.average_rating * r.review_count + DEMAND_PRIOR_MEAN * DEMAND_PRIOR_WEIGHT)
      / (r.review_count + DEMAND_PRIOR_WEIGHT);
  }

  function getCreatorsForSection(section: typeof SECTIONS[0]): CreatorCardViewModel[] {
    if (!section.category) {
      // Was "first creator of each category", which meant the leading
      // photographer headed this row and headed Photographer's Archive
      // directly below it — the same person twice on one screen. Ranking by
      // review score makes the row a genuinely different set, and one whose
      // title is true.
      return creators
        .map((c, joinOrder) => ({ c, joinOrder, score: demandScore(c) }))
        .sort((a, b) => b.score - a.score || a.joinOrder - b.joinOrder)
        .slice(0, IN_DEMAND_LIMIT)
        .map(({ c }) => c);
    }
    return creators.filter((c) => c.category === section.category);
  }

  function goToProfile(creator: CreatorCardViewModel) {
    navigation.navigate('CreatorProfile', { creator });
  }


  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopHeader />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <View style={styles.container}>
            {/* ── Category tabs + subtitle (Figma order: icons, then subtitle) ─── */}
            <View style={styles.tabsRow}>
              {CATEGORY_TABS.map(({ key, label, icon }) => {
                const active = activeCat === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.tabItem}
                    activeOpacity={0.7}
                    onPress={() => setActiveCat(active ? null : key)}
                  >
                    <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
                      <Image source={icon} style={styles.tabIcon} resizeMode="contain" />
                    </View>
                    <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.exploreSubtitle}>Explore Creative Consultant's Portfolio</Text>

            {/* Entry point to the bidding flow. It existed end to end in the
                services but was reachable from exactly one button buried on
                the Activity screen, so nobody found it. */}
            <TouchableOpacity
              style={styles.bidCta}
              onPress={() => navigation.navigate('CreateBid')}
              activeOpacity={0.88}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.bidCtaTitle}>Have a budget in mind?</Text>
                <Text style={styles.bidCtaSub}>
                  Name your price and we'll line up consultants who fit it. Rank them,
                  and we'll ask your first choice first.
                </Text>
              </View>
              <View style={styles.bidCtaArrow}>
                <ChevronRight size={18} color="#fff" />
              </View>
            </TouchableOpacity>

            {/* The other half of the same decision: name a budget and let
                consultants come to you, or pick one and brief them directly.
                AssignProject was previously reachable only through the Terms &
                Conditions page, which nobody would ever look for it behind. */}
            <TouchableOpacity
              style={styles.hireCta}
              onPress={() => navigation.navigate('AssignProject')}
              activeOpacity={0.88}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.hireCtaTitle}>Know who you want?</Text>
                <Text style={styles.hireCtaSub}>
                  Brief a consultant directly and skip the bidding round.
                </Text>
              </View>
              <View style={styles.hireCtaArrow}>
                <ChevronRight size={18} color={NAVY} />
              </View>
            </TouchableOpacity>

            {/* Error Banner */}
            {creatorsError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>⚠ {creatorsError}</Text>
              </View>
            )}

            {/* Creator Sections — each scrolls horizontally through that section's creators */}
            {creatorsLoading ? (
              <>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={styles.sectionWrap}>
                    <SkeletonBar width={160} height={16} />
                    <View style={{ flexDirection: 'row', gap: spacing.md }}>
                      {[0, 1].map((j) => (
                        <SkeletonBar key={j} width={220} height={260} borderRadius={radii.lg} />
                      ))}
                    </View>
                  </View>
                ))}
              </>
            ) : (
              SECTIONS
                .filter((section) => !activeCat || section.category === activeCat)
                .map((section) => {
                  const sectionCreators = getCreatorsForSection(section);
                  if (sectionCreators.length === 0) return null;
                  return (
                    <View key={section.title} style={styles.sectionWrap}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.headerText}>{section.title}</Text>
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.cardsScrollContent}
                      >
                        {sectionCreators.map((c) => (
                          <FeaturedCreatorCard key={c.id} creator={c} onPress={goToProfile} />
                        ))}
                      </ScrollView>
                    </View>
                  );
                })
            )}

            {/* ── Footer attribution ───────────────────── */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                A Joint Venture of{' '}
                <Text style={styles.footerBold}>Ishisoft Pvt.Ltd</Text>,{' '}
                <Text style={styles.footerBold}>Mr. Shoumik Mazumdar</Text> and
              </Text>
              <Text style={styles.footerText}>
                <Text style={styles.footerBold}>Design &amp; Animation Club</Text>,
                Department of Visual Arts, AUS
              </Text>
              <Text style={styles.footerText}>
                Honorary Design Mentor -{' '}
                <Text style={styles.footerBold}>Dr. Gautam Dutta</Text>,
                Department of Visual Arts, AUS
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.screenBg },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 0, gap: 16 },

  // ── Category tabs + subtitle ──────────────────
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  tabIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tabIconWrapActive: {
    borderColor: NAVY,
  },
  tabIcon: {
    width: 60,
    height: 60,
  },
  tabLabel: {
    fontSize: fontSizes.xs + 1,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: NAVY,
    fontWeight: '700',
    fontFamily: fonts.heavy,
  },
  // A page title, not a second section header. At fontSizes.base bold navy it
  // sat one weight-step from the orange section headers below and read as a
  // peer of them; nothing on the screen said which level you were at.
  exploreSubtitle: {
    fontSize: fontSizes['2xl'],
    fontWeight: '800',
    fontFamily: fonts.heavy,
    color: NAVY,
    textAlign: 'center',
    lineHeight: 26,
  },

  // ── Bidding CTA ───────────────────────────────
  bidCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: NAVY,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  bidCtaTitle: {
    fontSize: fontSizes.base,
    fontWeight: '800',
    fontFamily: fonts.heavy,
    color: '#fff',
  },
  bidCtaSub: {
    fontSize: fontSizes.xs + 1,
    fontFamily: fonts.body,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 17,
    marginTop: 4,
  },
  bidCtaArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Direct hire CTA ───────────────────────────
  // Outlined against the bid CTA's navy fill: the two are peers, but bidding
  // is the path a client without a shortlist takes, so it keeps the emphasis.
  hireCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.cardBg,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: NAVY,
    padding: spacing.lg,
    marginHorizontal: spacing.xl,
    marginTop: -8,
  },
  hireCtaTitle: {
    fontSize: fontSizes.base,
    fontWeight: '800',
    fontFamily: fonts.heavy,
    color: NAVY,
  },
  hireCtaSub: {
    fontSize: fontSizes.xs + 1,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 4,
  },
  hireCtaArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(27,58,92,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Error ─────────────────────────────────────
  errorBanner: {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 8, padding: 12,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontFamily: fonts.body },

  // ── Creator sections (light header + single featured card) ────
  sectionWrap: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
  },
  headerText: {
    fontWeight: '700', fontSize: fontSizes.lg, fontFamily: fonts.heavy,
    color: colors.orange,
  },
  cardsScrollContent: {
    gap: spacing.md,
    paddingRight: spacing.xs,
  },

  // ── Footer ────────────────────────────────────
  footer: {
    alignItems: 'center', gap: 3,
    paddingTop: spacing.sm, paddingBottom: spacing.lg,
  },
  footerText: {
    fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textTertiary,
    textAlign: 'center', lineHeight: 18,
  },
  footerBold: {
    fontFamily: fonts.heavy, color: colors.textSecondary, fontWeight: '700',
  },
});
