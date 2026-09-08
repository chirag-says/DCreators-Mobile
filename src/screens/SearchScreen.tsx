import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, FlatList, Platform, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal, ChevronLeft, User } from 'lucide-react-native';
import { fetchTrendingConsultants, searchConsultants } from '../services/consultantService';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';


const fontMedium = fonts.medium;
const fontBody = fonts.body;
const fontHeavy = fonts.heavy;

const CATEGORY_FILTERS = [
  { label: 'All', value: null },
  { label: 'Photographer', value: 'photographer' },
  { label: 'Designer', value: 'designer' },
  { label: 'Sculptor', value: 'sculptor' },
  { label: 'Artisan', value: 'artisan' },
];

const CATEGORY_COLORS: Record<string, string> = {
  photographer: '#A64B3B',
  designer: colors.success,
  sculptor: '#6B21A8',
  artisan: colors.primary,
};

// Local images for fallback avatars
const LOCAL_IMAGES: Record<string, any> = {
  'dcreators/photographer': { uri: RemoteAssets.photographer },
  'dcreators/designer': { uri: RemoteAssets.designer },
  'dcreators/sculptor': { uri: RemoteAssets.sculptor },
  'dcreators/artisan': { uri: RemoteAssets.artisan },
};

const ConsultantCard = React.memo(function ConsultantCard({
  consultant,
  onPress,
}: {
  consultant: any;
  onPress: (consultant: any) => void;
}) {
  const hasRealAvatar = consultant.avatar_url && consultant.avatar_url.startsWith('http');
  const avatarSource = hasRealAvatar
    ? { uri: consultant.avatar_url }
    : LOCAL_IMAGES[`dcreators/${consultant.category}`];

  return (
    <TouchableOpacity
      style={styles.resultCard}
      activeOpacity={0.85}
      onPress={() => onPress(consultant)}
    >
      <View style={styles.resultAvatar}>
        {avatarSource ? (
          <Image source={avatarSource} style={styles.resultAvatarImg} />
        ) : (
          <User size={32} color="#9CA3AF" />
        )}
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>{consultant.display_name}</Text>
        <Text style={styles.resultSub} numberOfLines={1}>{consultant.subtitle || consultant.expertise}</Text>
        <View style={styles.resultMeta}>
          <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[consultant.category] || '#666' }]}>
            <Text style={styles.categoryBadgeText}>
              {consultant.category.charAt(0).toUpperCase() + consultant.category.slice(1)}
            </Text>
          </View>
          {consultant.experience && (
            <Text style={styles.resultExp}>{consultant.experience}</Text>
          )}
          {!consultant.is_approved && (
            <Text style={styles.pendingBadge}>Pending</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function SearchScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [trendingCreators, setTrendingCreators] = useState<any[]>([]);

  // Fetch trending creators on mount
  useEffect(() => {
    fetchTrending();
  }, []);

  // Search when query or category changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length > 0 || selectedCategory) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 400); // Debounce 400ms

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  async function fetchTrending() {
    try {
      const data = await fetchTrendingConsultants();
      setTrendingCreators(data);
    } catch {}
  }

  async function performSearch() {
    setIsSearching(true);
    try {
      const data = await searchConsultants({ query: searchQuery, category: selectedCategory, limit: 20 });
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  const handleCardPress = useCallback((consultant: any) => {
    navigation.navigate('CreatorProfile', { creator: {
      id: consultant.id,
      name: consultant.display_name,
      code: consultant.code,
      subtitle: consultant.subtitle,
      experience: consultant.experience,
      expertise: consultant.expertise,
      category: consultant.category,
      base_price: consultant.base_price,
      price_unit: consultant.price_unit,
      avatar_url: consultant.avatar_url,
      portfolio_images: consultant.portfolio_images,
    }});
  }, [navigation]);

  const showTrending = !searchQuery && !selectedCategory && trendingCreators.length > 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#FFF' }]} edges={['top']}>
      <View style={styles.backgroundImage}>
        {/* Search Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={28} color="#111" />
          </TouchableOpacity>
          
          <View style={styles.searchContainer}>
            <Search size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search Consultants, Skills..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>

          <TouchableOpacity style={styles.filterButton} onPress={() => navigation.navigate('Filter')}>
            <SlidersHorizontal size={24} color="#111" />
          </TouchableOpacity>
        </View>

        {/* Category Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryBar} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {CATEGORY_FILTERS.map((cat) => (
            <TouchableOpacity
              key={cat.label}
              style={[styles.categoryPill, selectedCategory === cat.value && styles.categoryPillActive]}
              onPress={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)}
            >
              <Text style={[styles.categoryPillText, selectedCategory === cat.value && styles.categoryPillTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isSearching ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#1B3A5C" />
          </View>
        ) : (
          <FlatList
            style={styles.mainScroll}
            contentContainerStyle={[styles.container, { paddingBottom: 8 }]}
            data={showTrending ? trendingCreators : results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ConsultantCard consultant={item} onPress={handleCardPress} />}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            ListHeaderComponent={
              showTrending ? (
                <Text style={styles.sectionTitle}>Trending Creators</Text>
              ) : results.length > 0 ? (
                <Text style={styles.sectionTitle}>{results.length} Consultant{results.length > 1 ? 's' : ''} found</Text>
              ) : null
            }
            ListEmptyComponent={
              !searchQuery && !selectedCategory ? (
                <View style={{ paddingVertical: 60, alignItems: 'center' }}>
                  <Search size={48} color="#D1D5DB" />
                  <Text style={{ marginTop: 16, color: '#9CA3AF', fontSize: 15, fontFamily: fontBody }}>
                    Search for consultants by name or skill
                  </Text>
                </View>
              ) : (
                <View style={{ paddingVertical: 60, alignItems: 'center' }}>
                  <Search size={48} color="#D1D5DB" />
                  <Text style={{ marginTop: 16, color: '#9CA3AF', fontSize: 15, fontFamily: fontBody }}>
                    No consultants found
                  </Text>
                </View>
              )
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, backgroundColor: '#ededed' },
  safeArea: { flex: 1 },
  mainScroll: { flex: 1 },
  
  header: {
    backgroundColor: colors.cardBg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderCard,
  },
  backButton: { paddingRight: 12 },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    height: 40,
    borderWidth: 1,
    borderColor: colors.borderInput,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: fontSizes.base,
    fontFamily: fontMedium,
    color: colors.textPrimary,
  },
  filterButton: { paddingLeft: 16 },

  // Category pills
  categoryBar: {
    backgroundColor: colors.cardBg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderCard,
    maxHeight: 52,
  },
  categoryPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillText: {
    fontSize: fontSizes.base - 1,
    fontFamily: fontMedium,
    color: colors.textSecondary,
  },
  categoryPillTextActive: {
    color: colors.textOnPrimary,
  },

  container: { padding: spacing.xl },
  recentSection: { marginTop: spacing.md, gap: spacing.md },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    fontFamily: fontHeavy,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  resultsSection: { marginTop: spacing.md, gap: spacing.md },

  // Result cards
  resultCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderRadius: radii.lg,
    padding: spacing.md + 2,
    gap: spacing.md + 2,
    borderWidth: 1,
    borderColor: colors.borderCard,
    ...shadows.sm,
  },
  resultAvatar: {
    width: 60,
    height: 60,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  resultAvatarImg: {
    width: 60,
    height: 60,
    borderRadius: radii.sm,
  },
  resultInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  resultName: {
    fontSize: fontSizes.lg,
    fontFamily: fontHeavy,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  resultSub: {
    fontSize: fontSizes.sm,
    fontFamily: fontBody,
    color: colors.textSecondary,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  categoryBadgeText: {
    fontSize: fontSizes.xs,
    fontFamily: fontMedium,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
  resultExp: {
    fontSize: fontSizes.xs + 1,
    fontFamily: fontBody,
    color: colors.textTertiary,
  },
  pendingBadge: {
    fontSize: fontSizes.xs,
    fontFamily: fontMedium,
    color: colors.warning,
    fontWeight: '600',
  },
});
