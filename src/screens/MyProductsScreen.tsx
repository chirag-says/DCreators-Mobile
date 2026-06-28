import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ImageBackground, Platform, ActivityIndicator, RefreshControl, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, Package, Edit3, Trash2, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';


export default function MyProductsScreen({ navigation }: any) {
  const consultantProfile = useAuthStore((s) => s.consultantProfile);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  // Refresh when returning from add/edit
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => { fetchProducts(); });
    return unsub;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts().finally(() => setRefreshing(false));
  }, []);

  async function fetchProducts() {
    if (!consultantProfile?.id) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('shop_products')
        .select('*')
        .eq('consultant_id', consultantProfile.id)
        .order('created_at', { ascending: false });

      if (!error && data) setProducts(data);
      else setProducts([]);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(product: any) {
    const newState = !product.is_active;
    try {
      const { error } = await supabase
        .from('shop_products')
        .update({ is_active: newState })
        .eq('id', product.id);

      if (!error) {
        setProducts((prev) => prev.map((p) =>
          p.id === product.id ? { ...p, is_active: newState } : p
        ));
      }
    } catch {}
  }

  function handleDelete(product: any) {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              const { error } = await supabase
                .from('shop_products')
                .delete()
                .eq('id', product.id);
              if (!error) {
                setProducts((prev) => prev.filter((p) => p.id !== product.id));
              } else {
                Alert.alert('Error', error.message);
              }
            } catch {
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        },
      ]
    );
  }

  const activeCount = products.filter((p) => p.is_active).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.cardBg }]} edges={['top']}>
      <ImageBackground source={{ uri: RemoteAssets.bgTexture }} style={styles.bg} imageStyle={{ opacity: 1 }}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>My Products</Text>
            <Text style={styles.headerSub}>{activeCount} active · {products.length} total</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddEditProduct')}
          >
            <Plus size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
        ) : products.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={56} color={colors.borderInput} />
            <Text style={styles.emptyTitle}>No products yet</Text>
            <Text style={styles.emptySubtitle}>Start selling by adding your first product</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('AddEditProduct')}
            >
              <Plus size={18} color="#FFF" />
              <Text style={styles.emptyBtnText}>Add Product</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          >
            {products.map((product) => (
              <View key={product.id} style={[styles.productCard, !product.is_active && styles.productCardInactive]}>
                {/* Image */}
                <View style={styles.productImageWrap}>
                  {product.images?.[0] ? (
                    <Image source={{ uri: product.images[0] }} style={styles.productImage} />
                  ) : (
                    <View style={[styles.productImage, styles.productImagePlaceholder]}>
                      <Package size={28} color={colors.borderInput} />
                    </View>
                  )}
                  {!product.is_active && (
                    <View style={styles.inactiveBadge}>
                      <Text style={styles.inactiveBadgeText}>Hidden</Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={styles.productInfo}>
                  <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>
                  <Text style={styles.productCategory}>{product.category || 'Uncategorized'}</Text>
                  <Text style={styles.productPrice}>₹{Number(product.price).toLocaleString()}</Text>
                </View>

                {/* Actions */}
                <View style={styles.actionsColumn}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('AddEditProduct', { product })}
                  >
                    <Edit3 size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => toggleActive(product)}
                  >
                    {product.is_active
                      ? <EyeOff size={16} color="#F59E0B" />
                      : <Eye size={16} color={colors.success} />
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDelete(product)}
                  >
                    <Trash2 size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  bg: { flex: 1, backgroundColor: colors.screenBg },

  header: {
    backgroundColor: colors.cardBg, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderCard,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSizes.lg + 1, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy },
  headerSub: { fontSize: fontSizes.xs, color: colors.textTertiary, fontFamily: fonts.medium, marginTop: 1 },
  addBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },

  emptyState: { alignItems: 'center', marginTop: 80, gap: spacing.sm, paddingHorizontal: 40 },
  emptyTitle: { fontSize: fontSizes.xl, fontFamily: fonts.heavy, color: colors.textSecondary },
  emptySubtitle: { fontSize: fontSizes.base - 1, fontFamily: fonts.body, color: colors.textTertiary, textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: radii.md, marginTop: spacing.lg,
  },
  emptyBtnText: { color: '#FFF', fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },

  listContainer: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },

  productCard: {
    flexDirection: 'row', backgroundColor: colors.cardBg,
    borderRadius: radii.lg, padding: spacing.md, gap: spacing.md,
    borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm,
  },
  productCardInactive: { opacity: 0.6 },

  productImageWrap: { position: 'relative' },
  productImage: { width: 80, height: 80, borderRadius: radii.md },
  productImagePlaceholder: { backgroundColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  inactiveBadge: {
    position: 'absolute', bottom: 4, left: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4,
    paddingVertical: 2, alignItems: 'center',
  },
  inactiveBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '700' },

  productInfo: { flex: 1, justifyContent: 'center', gap: 3 },
  productTitle: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy },
  productCategory: { fontSize: fontSizes.xs, color: colors.textTertiary, fontFamily: fonts.medium, textTransform: 'uppercase' },
  productPrice: { fontSize: fontSizes.base, fontWeight: '800', color: colors.success, fontFamily: fonts.heavy, marginTop: 2 },

  actionsColumn: { justifyContent: 'space-between', gap: 4 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
});
