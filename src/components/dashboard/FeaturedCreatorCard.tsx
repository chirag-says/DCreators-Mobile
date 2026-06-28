// ============================================
// FeaturedCreatorCard — portfolio card for a horizontal-scrolling section
// Figma: "Explore Creative Consultant's Portfolio" — a full-bleed work-sample
// image with a white nameplate overlaid at the bottom; the avatar peeks
// above the nameplate so it never sits on top of (and clips) the name text.
// ============================================

import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors, fonts, spacing, radii } from '../../styles/theme';
import { RemoteAssets } from '../../lib/assets';
import type { CreatorCardViewModel } from '../../types/navigation';

/** Cloudinary image map for default creator avatars */
const AVATAR_FALLBACK: Record<string, string> = {
  'dcreators/photographer': RemoteAssets.photographer,
  'dcreators/designer': RemoteAssets.designer,
  'dcreators/sculptor': RemoteAssets.sculptor,
  'dcreators/artisan': RemoteAssets.artisan,
};

/**
 * Work-sample placeholders per category, used when a consultant hasn't
 * uploaded portfolio_images yet — keeps the big image distinct from the
 * avatar instead of just repeating the same headshot in both places.
 */
const WORK_SAMPLE_FALLBACK: Record<string, string[]> = {
  photographer: [RemoteAssets.photoArchive1, RemoteAssets.photoArchive2, RemoteAssets.photoArchive3],
  designer: [RemoteAssets.designHub1, RemoteAssets.designHub2, RemoteAssets.designHub3],
  sculptor: [RemoteAssets.page1, RemoteAssets.page3],
  artisan: [RemoteAssets.page3, RemoteAssets.page1],
};

const CARD_WIDTH = 220;
const CARD_HEIGHT = 260;
const AVATAR_SIZE = 36;
const CAPTION_HEIGHT = 54;

interface FeaturedCreatorCardProps {
  creator: CreatorCardViewModel;
  /** Position within its section's horizontal scroll — cycles the work-sample fallback so cards don't repeat the same placeholder. */
  index?: number;
  onPress: (creator: CreatorCardViewModel) => void;
}

export default function FeaturedCreatorCard({ creator, index = 0, onPress }: FeaturedCreatorCardProps) {
  const hasRealAvatar = creator.avatar_url && creator.avatar_url.startsWith('http');
  const avatarUrl = hasRealAvatar
    ? creator.avatar_url!
    : AVATAR_FALLBACK[creator.avatar_public_id] ||
      (creator.avatar_public_id?.startsWith('http') ? creator.avatar_public_id : undefined);

  const workSamples = WORK_SAMPLE_FALLBACK[creator.category];
  const workSampleFallback = workSamples?.[index % workSamples.length];

  // Ordered candidates for the big image: the portrait-cropped variant made
  // for this exact card shape → a square portfolio shot → category
  // placeholder → avatar. If a candidate's URL 404s (e.g. a placeholder that
  // was referenced in code but never actually uploaded), onError advances to
  // the next one instead of leaving the card blank.
  const candidates = [creator.portfolio_card_image, creator.portfolio_images?.[0], workSampleFallback, avatarUrl].filter(
    (u): u is string => !!u
  );
  const [candidateIdx, setCandidateIdx] = useState(0);
  const featureUrl = candidates[candidateIdx];

  const [avatarFailed, setAvatarFailed] = useState(false);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(creator)} style={styles.wrap}>
      {featureUrl ? (
        <Image
          source={{ uri: featureUrl }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setCandidateIdx((i) => i + 1)}
        />
      ) : (
        <View style={[styles.image, styles.imageFallback]} />
      )}

      <View style={styles.captionBar}>
        <View style={styles.captionTextCol}>
          <Text style={styles.name} numberOfLines={1}>
            {creator.name}
          </Text>
          <View style={styles.idPill}>
            <Text style={styles.idPillText} numberOfLines={1}>
              {creator.code}
            </Text>
          </View>
        </View>
      </View>

      {/* Avatar sits above the caption bar, on top of both layers, peeking into the image */}
      {avatarUrl && !avatarFailed ? (
        <Image
          source={{ uri: avatarUrl }}
          style={styles.avatar}
          onError={() => setAvatarFailed(true)}
        />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>{creator.name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  // Image fills the entire card — the caption bar overlays it, it doesn't push it up.
  image: { width: '100%', height: '100%' },
  imageFallback: { backgroundColor: '#E5E7EB' },

  // White nameplate overlaid on the bottom of the image, fixed height so the
  // avatar below can be positioned to straddle its top edge exactly.
  captionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: CAPTION_HEIGHT,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  captionTextCol: { alignItems: 'center' },

  // Avatar — absolutely positioned so it peeks above the caption bar's top edge
  avatar: {
    position: 'absolute',
    left: spacing.md,
    bottom: CAPTION_HEIGHT - AVATAR_SIZE / 2,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarFallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontWeight: '700',
    fontFamily: fonts.heavy,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: fonts.heavy,
    textAlign: 'center',
  },
  idPill: {
    marginTop: 2,
    backgroundColor: 'rgba(27,58,92,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: radii.full,
  },
  idPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fonts.heavy,
    letterSpacing: 0.5,
  },
});
