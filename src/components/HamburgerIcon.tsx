import React from 'react';
import { Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../styles/theme';

interface Props {
  // 0 = hamburger (closed), 1 = X (open) — shared between TopHeader and SideMenu
  // so the trigger button and the in-menu close control are the exact same icon.
  progress: Animated.Value;
  onPress: () => void;
}

export default function HamburgerIcon({ progress, onPress }: Props) {
  const topLineTransform = [
    { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 8.5] }) },
    { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) },
  ];
  const bottomLineTransform = [
    { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -8.5] }) },
    { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-45deg'] }) },
  ];
  const middleLineOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <TouchableOpacity
      style={styles.hamburger}
      onPress={onPress}
      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
    >
      <Animated.View style={[styles.hamLine, styles.hamLineTop, { transform: topLineTransform }]} />
      <Animated.View style={[styles.hamLine, styles.hamLineMiddle, { opacity: middleLineOpacity }]} />
      <Animated.View style={[styles.hamLine, styles.hamLineBottom, { transform: bottomLineTransform }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  hamburger: { width: 26, height: 19.5 },
  hamLine: {
    position: 'absolute',
    left: 0,
    width: 26,
    height: 2.5,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  hamLineTop: { top: 0 },
  hamLineMiddle: { top: 8.5 },
  hamLineBottom: { top: 17 },
});
