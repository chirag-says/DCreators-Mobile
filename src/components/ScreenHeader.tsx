// ============================================
// ScreenHeader — the header every pushed detail screen wears
//
// Before this there were four: TopHeader (hamburger + logo + avatar) on some
// detail screens, a circular white back button on others, a bare ChevronLeft on
// others, and CreatorProfileScreen wearing TopHeader *and* its own chevron at
// the same time — two competing ways back on one screen. The client review
// called out the inconsistency; this is the one answer.
//
// TopHeader stays where it belongs: the role's home tabs, where a hamburger and
// a global search actually apply. A pushed screen's job is to be left, so the
// back affordance is the thing that gets the weight.
//
// The circular white button is the shape that already won on volume —
// BookConsultant, CreateCreatorAccount and ConsultantServicePricing all had it.
// ============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { colors, fonts, fontSizes, spacing } from '../styles/theme';

const CONTROL_SIZE = 34;

interface ScreenHeaderProps {
  /** Centred title. Falls back to the brand tagline, as the bare headers did. */
  title?: string;
  /** Overrides goBack — for screens that must land somewhere specific. */
  onBack?: () => void;
  /** Trailing slot: a bell, an edit action, a favourite toggle. */
  right?: React.ReactNode;
  /** Off for screens with nothing to pop back to. */
  showBack?: boolean;
}

export default function ScreenHeader({
  title,
  onBack,
  right,
  showBack = true,
}: ScreenHeaderProps) {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.header}>
      {showBack ? (
        <TouchableOpacity
          style={styles.control}
          onPress={onBack ?? (() => navigation.goBack())}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color={colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.control} />
      )}

      {title ? (
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      ) : (
        <Text style={styles.tagline}>HIRE CREATIVES. BUY ART. BUILD IDEAS</Text>
      )}

      {/* Reserved even when empty, so the title stays optically centred. */}
      {right ?? <View style={styles.control} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  control: {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: CONTROL_SIZE / 2,
    backgroundColor: colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSizes.lg,
    fontWeight: '800',
    fontFamily: fonts.heavy,
    color: colors.primary,
  },
  tagline: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9,
    fontFamily: fonts.body,
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },
});
