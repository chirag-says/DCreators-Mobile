/**
 * RatingStars — the one way a consultant's score is drawn.
 *
 * Used on the creator profile, the booking screen and the browse cards so a
 * client sees the same shape everywhere. A consultant with no reviews shows
 * "New" rather than an empty five-star row, which reads as a bad score.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors, fonts, fontSizes } from '../styles/theme';

const GOLD = '#F5A623';

interface Props {
  average: number | null | undefined;
  count: number | null | undefined;
  /** `sm` for cards and dense rows, `md` for a profile header. */
  size?: 'sm' | 'md';
  /** Hide the "(12)" count when space is tight. */
  showCount?: boolean;
}

export default function RatingStars({ average, count, size = 'sm', showCount = true }: Props) {
  const reviews = Number(count ?? 0);
  const score = Number(average ?? 0);
  const starSize = size === 'md' ? 16 : 13;

  if (!reviews || !score) {
    return (
      <View style={st.row}>
        <Star size={starSize} color={colors.textTertiary} />
        <Text style={[st.newLabel, size === 'md' && st.newLabelMd]}>New</Text>
      </View>
    );
  }

  // Round to the nearest half so a 4.3 does not paint a full fifth star.
  const filled = Math.round(score * 2) / 2;

  return (
    <View style={st.row}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={starSize}
          color={GOLD}
          fill={i <= filled ? GOLD : 'transparent'}
        />
      ))}
      <Text style={[st.score, size === 'md' && st.scoreMd]}>{score.toFixed(1)}</Text>
      {showCount && (
        <Text style={[st.count, size === 'md' && st.countMd]}>
          ({reviews})
        </Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  score: { fontSize: fontSizes.xs + 1, fontWeight: '800', fontFamily: fonts.heavy, color: colors.textPrimary, marginLeft: 4 },
  scoreMd: { fontSize: fontSizes.base },
  count: { fontSize: fontSizes.xs, fontFamily: fonts.body, color: colors.textTertiary },
  countMd: { fontSize: fontSizes.sm },
  newLabel: { fontSize: fontSizes.xs, fontFamily: fonts.medium, color: colors.textTertiary, marginLeft: 3 },
  newLabelMd: { fontSize: fontSizes.sm },
});
