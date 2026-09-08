/**
 * Bottom padding for a pinned action bar or the tail of a scroll, corrected for
 * the Android system navigation bar.
 *
 * Screens used to hardcode `Platform.OS === 'ios' ? 34 : 12`, which threw the
 * real inset away — so on any Android phone with a gesture pill or 3-button bar
 * the Save / Next / Submit button sat *under* the system nav and could not be
 * tapped. Trust the measured inset instead, and never fall below `minPad` so a
 * button is never flush against the screen edge on a device that reports 0.
 */
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useSafeBottomPadding(minPad = 12): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, minPad);
}
