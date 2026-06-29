import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import TopHeader from '../components/TopHeader';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';


const { width } = Dimensions.get('window');

const AVATAR_IMAGES: Record<string, any> = {
  photographer: { uri: RemoteAssets.photographer },
  designer: { uri: RemoteAssets.designer },
  sculptor: { uri: RemoteAssets.sculptor },
  artisan: { uri: RemoteAssets.artisan },
  photo_archive_1: { uri: RemoteAssets.photoArchive1 },
  photo_archive_2: { uri: RemoteAssets.photoArchive2 },
  photo_archive_3: { uri: RemoteAssets.photoArchive3 },
  design_hub_1: { uri: RemoteAssets.designHub1 },
  design_hub_2: { uri: RemoteAssets.designHub2 },
  design_hub_3: { uri: RemoteAssets.designHub3 },
};

const CATEGORY_LABELS: Record<string, string> = {
  photographer: 'Photography',
  designer: 'Design',
  sculptor: 'Sculpture',
  artisan: 'Traditional Craft',
};

export default function CreatorProfileScreen({ route, navigation }: any) {
  const creator = route?.params?.creator;
  const [activeImage, setActiveImage] = useState(0);
  const currentRole = useAuthStore((s) => s.currentRole);

  const name = creator?.name || 'Creator';
  const code = creator?.code || 'D000';
  const subtitle = creator?.subtitle || '';
  const experience = creator?.experience || '';
  const expertise = creator?.expertise || '';
  const category = creator?.category || 'photographer';
  const basePrice = creator?.base_price;
  const avatarKey = creator?.avatarKey || category;
  const portfolioKeys: string[] = creator?.portfolioKeys || getDefaultPortfolio(category);

  // Derive display fields matching the Figma layout
  const categoryLabel = CATEGORY_LABELS[category] || category.charAt(0).toUpperCase() + category.slice(1);
  const productCode = `${code.replace('D', 'BB')}/01`;

  function getDefaultPortfolio(cat: string): string[] {
    switch (cat) {
      case 'photographer': return ['photo_archive_1', 'photo_archive_2', 'photo_archive_3'];
      case 'designer': return ['design_hub_1', 'design_hub_2', 'design_hub_3'];
      default: return [cat, cat, cat];
    }
  }

  const hasRealAvatar = creator?.avatar_url && creator.avatar_url.startsWith('http');
  const avatarSource = hasRealAvatar
    ? { uri: creator.avatar_url }
    : (AVATAR_IMAGES[avatarKey] || AVATAR_IMAGES.photographer);

  const realPortfolioImages = creator?.portfolio_images?.filter((uri: string) => uri && uri.length > 0) || [];
  const portfolioImages = realPortfolioImages.length > 0
    ? realPortfolioImages.map((uri: string) => ({ uri }))
    : portfolioKeys.map((key: string) => AVATAR_IMAGES[key] || AVATAR_IMAGES.photographer);

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <TopHeader />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>

          {/* ── Category Title (top center, italic like Figma) ── */}
          <Text style={styles.categoryTitle}>{categoryLabel}</Text>

          {/* ── Large Artwork Image Card ── */}
          <View style={styles.artworkCard}>
            <Image
              source={portfolioImages[activeImage]}
              style={styles.artworkImage}
              resizeMode="cover"
            />
            {/* Navigation arrows */}
            {portfolioImages.length > 1 && (
              <>
                <TouchableOpacity style={styles.arrowL} activeOpacity={0.7} onPress={() => setActiveImage(p => p > 0 ? p - 1 : portfolioImages.length - 1)}>
                  <ChevronLeft size={32} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.arrowR} activeOpacity={0.7} onPress={() => setActiveImage(p => p < portfolioImages.length - 1 ? p + 1 : 0)}>
                  <ChevronRight size={32} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Dots indicator */}
          {portfolioImages.length > 1 && (
            <View style={styles.dotsRow}>
              {portfolioImages.map((_: any, i: number) => (
                <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
              ))}
            </View>
          )}

          {/* ── Creator Info Section (Figma: circular avatar + details) ── */}
          <View style={styles.creatorSection}>
            {/* Circular Avatar */}
            <View style={styles.avatarCircleWrap}>
              <Image source={avatarSource} style={styles.avatarCircle} resizeMode="cover" />
            </View>

            {/* Details Block */}
            <View style={styles.detailsBlock}>
              <Text style={styles.creatorName}>{name}</Text>
              {subtitle ? (
                <Text style={styles.creatorSubtitle} numberOfLines={1}>{subtitle}</Text>
              ) : (
                <Text style={styles.creatorSubtitle}>Creative Consultant</Text>
              )}
              <Text style={styles.detailLine}>Code : {code}</Text>
              <Text style={styles.detailLine}>Product Code : {productCode}</Text>
              {expertise ? (
                <Text style={styles.detailLine}>Expertise : {expertise.split(',')[0]?.trim()}</Text>
              ) : null}
              {experience ? (
                <Text style={styles.detailLine}>Experience : {experience}</Text>
              ) : null}

              {/* Price in green/teal — matching Figma */}
              {basePrice ? (
                <Text style={styles.priceLabel}>
                  Price : <Text style={styles.priceValue}>{basePrice.toLocaleString()} (INR)</Text>
                </Text>
              ) : null}
            </View>
          </View>

          {/* ── Hire Now CTA (client / buyer view only) ── */}
          {currentRole !== 'consultant' && (
            <TouchableOpacity
              style={styles.hireBtn}
              onPress={() => navigation.navigate('BookConsultant', { consultant: creator })}
              activeOpacity={0.85}
            >
              <Text style={styles.hireBtnText}>Hire Now →</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.screenBg },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: 20,
  },

  /* ── Category title (Figma: centered, italic-like, dark teal/indigo) ── */
  categoryTitle: {
    fontSize: fontSizes.md,
    fontFamily: fonts.heavy,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },

  /* ── Large artwork card ── */
  artworkCard: {
    width: '100%',
    aspectRatio: 1.05,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...shadows.lg,
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  arrowL: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 44,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  arrowR: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: 44,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },

  /* ── Dots ── */
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
    gap: 6,
  },
  dot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: colors.borderInput,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 18,
  },

  /* ── Creator info section (Figma: avatar circle left + text right) ── */
  creatorSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  avatarCircleWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    ...shadows.sm,
  },
  avatarCircle: {
    width: '100%',
    height: '100%',
  },

  detailsBlock: {
    flex: 1,
    marginLeft: spacing.md,
    paddingTop: 2,
  },
  creatorName: {
    fontSize: fontSizes.md,
    fontFamily: fonts.heavy,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 1,
  },
  creatorSubtitle: {
    fontSize: fontSizes.xs + 1,
    fontFamily: fonts.body,
    fontStyle: 'italic',
    color: colors.textSecondary,
    marginBottom: spacing.xs + 2,
  },
  detailLine: {
    fontSize: fontSizes.xs + 1,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  priceLabel: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.heavy,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs + 2,
  },
  priceValue: {
    color: colors.teal,
    fontWeight: '700',
    fontStyle: 'italic',
  },

  /* ── Hire Now CTA ── */
  hireBtn: {
    backgroundColor: '#1B3A5C',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  hireBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    fontFamily: fonts.heavy,
  },
});
