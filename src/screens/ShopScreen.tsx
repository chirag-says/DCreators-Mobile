import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, ScrollView, StyleSheet, ImageBackground, TouchableOpacity, TextInput, Platform, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, Filter, ShoppingBag, Heart } from 'lucide-react-native';
import { fetchShopProducts } from '../services/shopService';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';


const fontMedium = fonts.medium;
const fontBody = fonts.body;
const fontHeavy = fonts.heavy;

const CATEGORIES = ['All', 'Templates', 'Digital Prints', 'UI Kits', 'Branding', 'Photography'];

/* ── Memoized product card for the FlatList grid ────────────── */
const ShopProductCard = React.memo(function ShopProductCard({
  product,
  onPress,
}: {
  product: any;
  onPress: (product: any) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => onPress(product)}
      activeOpacity={0.9}
    >
      <ImageBackground
        source={product.image}
        style={styles.productImagePlaceholder}
        resizeMode="cover"
      >
        <TouchableOpacity style={styles.favBtn}>
          <Heart size={16} color={colors.primary} />
        </TouchableOpacity>
      </ImageBackground>
      <View style={styles.productInfo}>
        <Text style={styles.productCategory}>{product.category}</Text>
        <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>
        <Text style={styles.productCreator}>by {product.creator}</Text>
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>₹{Number(product.price).toLocaleString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function ShopScreen({ navigation, route }: any) {
  // Scoped to one creator when opened from their profile's Shop button; the
  // whole catalogue otherwise. One screen rather than a near-duplicate
  // CreatorShopScreen, so product cards keep one style.
  const consultantId: string | undefined = route?.params?.consultantId;
  const consultantName: string | undefined = route?.params?.consultantName;
  const isCreatorShop = !!consultantId;

  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchProducts(); }, [consultantId]);

  async function fetchProducts() {
    try {
      const data = await fetchShopProducts(consultantId);
      const dbProducts = data.map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category || 'Other',
        price: Number(p.price),
        images: p.images || [],
        consultant_profiles: p.consultant_profiles,
        creator: `${p.consultant_profiles?.code || '---'} / ${p.consultant_profiles?.display_name?.split(' ')[0] || 'Creator'}`,
        image: p.images?.[0] ? { uri: p.images[0] } : { uri: RemoteAssets.designer },
      }));
      setProducts(dbProducts);
    } catch {
      setProducts([]);
    }
    finally { setLoading(false); }
  }

  const filteredProducts = useMemo(() => products.filter(p => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    const matchSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  }), [products, activeCategory, searchQuery]);

  const handleProductPress = useCallback((product: any) => {
    navigation.navigate('ProductDetails', { product });
  }, [navigation]);

  const renderProduct = useCallback(({ item }: { item: any }) => (
    <ShopProductCard product={item} onPress={handleProductPress} />
  ), [handleProductPress]);

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isCreatorShop ? `${consultantName ?? 'Creator'}'s Shop` : 'Creative Shop'}
          </Text>
          <TouchableOpacity style={styles.cartBtn}>
            <ShoppingBag size={24} color="#111" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Search size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search assets, templates..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Filter size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryPill, activeCategory === cat && styles.categoryPillActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16, gap: 20 }}
          showsVerticalScrollIndicator={false}
          data={loading ? [] : filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          renderItem={renderProduct}
          ListHeaderComponent={
            <>
              {/* A global promo bundle has nothing to do with one creator's
                  work, so the banner is catalogue-only. */}
              {!isCreatorShop && (
                <View style={styles.featuredSection}>
                  <ImageBackground source={{ uri: RemoteAssets.photographer }} style={styles.featuredCard} imageStyle={{ opacity: 0.6 }}>
                    <View style={[styles.featuredContent, { backgroundColor: 'rgba(67, 56, 202, 0.7)' }]}>
                      <Text style={styles.featuredBadge}>FEATURED BUNDLE</Text>
                      <Text style={styles.featuredTitle}>The Ultimate Designer's Toolkit 2026</Text>
                      <Text style={styles.featuredPrice}>₹4,999 <Text style={styles.strikethrough}>₹9,999</Text></Text>
                      <TouchableOpacity style={styles.buyBtn}>
                        <Text style={styles.buyBtnText}>Shop Now</Text>
                      </TouchableOpacity>
                    </View>
                  </ImageBackground>
                </View>
              )}

              {/* Section Header */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {activeCategory !== 'All' ? activeCategory : isCreatorShop ? 'For Sale' : 'Trending Assets'}
                </Text>
                <Text style={styles.countText}>{filteredProducts.length} items</Text>
              </View>
            </>
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator size="large" color="#1B3A5C" style={{ marginTop: 40 }} />
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <ShoppingBag size={56} color={colors.borderInput} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textSecondary, marginTop: 16, fontFamily: fontHeavy }}>No products yet</Text>
                <Text style={{ fontSize: 13, color: colors.textTertiary, fontFamily: fontBody, marginTop: 4 }}>
                  {isCreatorShop
                    ? `${consultantName ?? 'This creator'} has nothing listed for sale right now`
                    : 'Products listed by creators will appear here'}
                </Text>
              </View>
            )
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.screenBg },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { fontSize: fontSizes.xl, fontWeight: '700', color: colors.textPrimary, fontFamily: fontHeavy },
  cartBtn: { position: 'relative', padding: 4 },

  searchContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderInput,
    borderRadius: radii.sm, paddingHorizontal: spacing.md, height: 48, gap: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: fontSizes.base, fontFamily: fontBody, color: colors.textPrimary },
  filterBtn: {
    width: 48, height: 48, borderRadius: radii.sm, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  categoriesContainer: { marginBottom: 16 },
  categoriesScroll: { paddingHorizontal: 16, gap: 10 },
  categoryPill: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.cardBg,
    borderRadius: radii.full, borderWidth: 1, borderColor: colors.borderInput,
  },
  categoryPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { fontSize: fontSizes.base - 1, color: colors.textSecondary, fontFamily: fontMedium, fontWeight: '600' },
  categoryTextActive: { color: colors.textOnPrimary },

  container: { paddingHorizontal: 16, gap: 20 },

  featuredSection: { width: '100%' },
  featuredCard: {
    backgroundColor: '#4338CA', borderRadius: 16, overflow: 'hidden', height: 180,
  },
  featuredContent: { padding: 20, flex: 1, justifyContent: 'center' },
  featuredBadge: { color: '#FACC15', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
  featuredTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', fontFamily: fontHeavy, marginBottom: 12, lineHeight: 26 },
  featuredPrice: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  strikethrough: { fontSize: 14, textDecorationLine: 'line-through', opacity: 0.7 },
  buyBtn: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  buyBtnText: { color: '#4338CA', fontSize: 13, fontWeight: '700' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111', fontFamily: fontHeavy },
  countText: { fontSize: 12, color: '#6B7280', fontFamily: fontMedium },

  productRow: { justifyContent: 'space-between', gap: 14 },
  productCard: {
    flex: 1, maxWidth: '48%', backgroundColor: colors.cardBg, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    ...shadows.sm,
  },
  productImagePlaceholder: {
    height: 130, backgroundColor: colors.borderInput, padding: spacing.sm, alignItems: 'flex-end',
  },
  favBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.cardBg,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.sm,
  },
  productInfo: { padding: spacing.md },
  productCategory: { fontSize: fontSizes.xs, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: 4, fontWeight: '600' },
  productTitle: { fontSize: fontSizes.base - 1, fontWeight: '700', color: colors.textPrimary, fontFamily: fontMedium, marginBottom: 4, height: 36 },
  productCreator: { fontSize: fontSizes.xs + 1, color: colors.textTertiary, fontFamily: fontMedium, marginBottom: spacing.md },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontSize: fontSizes.base, fontWeight: '800', color: colors.textPrimary },
});
