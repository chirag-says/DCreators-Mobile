import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ImageBackground, TouchableOpacity, Platform, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Share2, Heart, ShoppingBag, CheckCircle, ShieldCheck, ChevronRight } from 'lucide-react-native';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';


const { width } = Dimensions.get('window');

export default function ProductDetailsScreen({ navigation, route }: any) {
  const product = route?.params?.product;
  const [isFav, setIsFav] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const title = product?.title || 'Product';
  const description = product?.description || 'No description available.';
  const price = product?.price ? Number(product.price) : 0;
  const category = product?.category || 'General';
  const images = product?.images?.filter((url: string) => url && url.length > 0) || [];
  const consultantName = product?.consultant_profiles?.display_name || 'Consultant';
  const consultantCode = product?.consultant_profiles?.code || '---';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.cardBg }]} edges={['top']}>
      <ImageBackground source={{ uri: RemoteAssets.bgTexture }} style={styles.bg} imageStyle={{ opacity: 1 }}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setIsFav(!isFav)}>
              <Heart size={20} color={isFav ? colors.primary : colors.textPrimary} fill={isFav ? colors.primary : 'transparent'} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

          {/* Product Image */}
          {images.length > 0 ? (
            <View style={styles.imagePlaceholder}>
              <Image source={{ uri: images[activeImage] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              {images.length > 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.navArrow, { left: 10 }]}
                    onPress={() => setActiveImage(p => p > 0 ? p - 1 : images.length - 1)}
                  >
                    <ChevronLeft size={24} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.navArrow, { right: 10 }]}
                    onPress={() => setActiveImage(p => p < images.length - 1 ? p + 1 : 0)}
                  >
                    <ChevronRight size={24} color="#FFF" />
                  </TouchableOpacity>
                  <View style={styles.dotsRow}>
                    {images.map((_: string, i: number) => (
                      <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
                    ))}
                  </View>
                </>
              )}
            </View>
          ) : (
            <View style={[styles.imagePlaceholder, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sectionBg }]}>
              <ShoppingBag size={48} color={colors.borderInput} />
              <Text style={{ marginTop: 8, color: colors.textTertiary, fontFamily: fonts.body }}>No images</Text>
            </View>
          )}

          {/* Content */}
          <View style={styles.contentContainer}>
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryLabel}>{category}</Text>
                <Text style={styles.productTitle}>{title}</Text>
              </View>
              <Text style={styles.price}>₹{price.toLocaleString()}</Text>
            </View>

            <Text style={styles.creatorInfo}>
              by <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{consultantCode} / {consultantName}</Text>
            </Text>

            <View style={styles.badgesRow}>
              <View style={styles.badge}><CheckCircle size={14} color="#059669" /><Text style={styles.badgeText}>Verified Creator</Text></View>
              <View style={styles.badge}><ShieldCheck size={14} color="#059669" /><Text style={styles.badgeText}>Secure Purchase</Text></View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{description}</Text>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.fileInfoRow}><Text style={styles.fileInfoLabel}>Category</Text><Text style={styles.fileInfoValue}>{category}</Text></View>
            <View style={styles.fileInfoRow}><Text style={styles.fileInfoLabel}>Images</Text><Text style={styles.fileInfoValue}>{images.length} photo(s)</Text></View>
            <View style={styles.fileInfoRow}><Text style={styles.fileInfoLabel}>Seller</Text><Text style={styles.fileInfoValue}>{consultantName}</Text></View>
          </View>
        </ScrollView>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ fontSize: fontSizes.xs + 1, color: colors.textTertiary, fontFamily: fonts.body }}>Price</Text>
            <Text style={{ fontSize: fontSizes.xl, fontWeight: '800', color: colors.textPrimary, fontFamily: fonts.heavy }}>₹{price.toLocaleString()}</Text>
          </View>
          <TouchableOpacity style={styles.buyBtn}>
            <Text style={styles.buyBtnText}>Buy Now</Text>
          </TouchableOpacity>
        </View>

      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.screenBg },
  safeArea: { flex: 1 },
  header: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 25, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, zIndex: 10 },
  headerRight: { flexDirection: 'row', gap: spacing.md },
  iconBtn: { width: 40, height: 40, borderRadius: radii['2xl'], backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', ...shadows.sm },
  imagePlaceholder: { width, height: width * 0.85, backgroundColor: colors.borderInput, position: 'relative' },
  navArrow: { position: 'absolute', top: '45%', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  dotsRow: { position: 'absolute', bottom: 14, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#FFF', width: 18 },
  contentContainer: { padding: spacing.xl, backgroundColor: colors.cardBg, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], marginTop: -24, paddingBottom: spacing['4xl'] },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  categoryLabel: { fontSize: fontSizes.xs + 1, color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 1, marginBottom: spacing.xs, fontFamily: fonts.heavy },
  productTitle: { fontSize: fontSizes['2xl'], fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy, lineHeight: 28 },
  price: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, fontFamily: fonts.heavy },
  creatorInfo: { fontSize: fontSizes.sm + 1, color: colors.textSecondary, fontFamily: fonts.medium, marginBottom: spacing.xl },
  badgesRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: spacing.sm, borderRadius: radii.md, gap: spacing.sm },
  badgeText: { fontSize: fontSizes.xs + 1, fontWeight: '600', color: '#059669', fontFamily: fonts.medium },
  divider: { height: 1, backgroundColor: colors.sectionBg, marginVertical: spacing.xl },
  sectionTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy, marginBottom: spacing.md },
  descriptionText: { fontSize: fontSizes.base, color: colors.textSecondary, fontFamily: fonts.body, lineHeight: 24 },
  fileInfoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.sectionBg },
  fileInfoLabel: { fontSize: fontSizes.sm + 1, color: colors.textSecondary, fontFamily: fonts.medium },
  fileInfoValue: { fontSize: fontSizes.sm + 1, fontWeight: '600', color: colors.textPrimary, fontFamily: fonts.medium },
  bottomBar: { flexDirection: 'row', paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg, backgroundColor: colors.cardBg, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.lg },
  buyBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  buyBtnText: { color: colors.textOnPrimary, fontSize: fontSizes.lg, fontWeight: '700', fontFamily: fonts.heavy },
});
