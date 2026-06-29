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
  const { creators, loading: creatorsLoading, error: creatorsError, refresh: refreshCreators } = useCreators();

  const onRefresh = useCallback(async () => {
    await refreshCreators();
  }, [refreshCreators]);

  function getCreatorsForSection(section: typeof SECTIONS[0]): CreatorCardViewModel[] {
    if (!section.category) {
      // "Creators in Demand" — first 4 unique categories
      const seen = new Set<string>();
      return creators.filter((c) => {
        if (seen.has(c.category)) return false;
        seen.add(c.category);
        return true;
      }).slice(0, 4);
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
                        <TouchableOpacity style={styles.viewAllBtn} activeOpacity={0.7}>
                          <Text style={styles.viewAllText}>View All</Text>
                          <ChevronRight size={14} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.cardsScrollContent}
                      >
                        {sectionCreators.map((c, i) => (
                          <FeaturedCreatorCard key={c.id} creator={c} index={i} onPress={goToProfile} />
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
                <Text style={styles.footerBold}>Mr. Shoumik Mazumder</Text> and
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
  exploreSubtitle: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    color: NAVY,
    textAlign: 'center',
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerText: {
    fontWeight: '700', fontSize: fontSizes.lg, fontFamily: fonts.heavy,
    color: colors.orange,
  },
  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
  },
  viewAllText: {
    fontSize: fontSizes.xs + 1, fontFamily: fonts.medium, fontWeight: '600',
    color: colors.textSecondary,
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
