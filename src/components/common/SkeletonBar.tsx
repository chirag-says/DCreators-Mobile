// ============================================
// SkeletonBar — Reusable shimmer placeholder
// ============================================

import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

interface SkeletonBarProps {
  width: number;
  height: number;
  borderRadius?: number;
}

export default function SkeletonBar({ width, height, borderRadius = 4 }: SkeletonBarProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#6B7280',
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] }),
      }}
    />
  );
}
