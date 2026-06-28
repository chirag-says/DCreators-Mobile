import React, { useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Image } from 'expo-image';
import { getCloudinaryUrl } from '../lib/cloudinary';

type Props = {
  publicId: string;
  width: number;
  height: number;
  style?: any;
  borderRadius?: number;
  contentFit?: 'cover' | 'contain' | 'fill';
};

/**
 * Image component that loads from Cloudinary with skeleton shimmer.
 * Uses expo-image for aggressive caching + blurhash placeholder.
 */
export default function CloudImage({ publicId, width, height, style, borderRadius = 0, contentFit = 'cover' }: Props) {
  const [loaded, setLoaded] = useState(false);

  const uri = getCloudinaryUrl(publicId, { width: width * 2, height: height * 2 }); // 2x for retina

  return (
    <View style={[{ width, height, borderRadius, overflow: 'hidden' }, style]}>
      {/* Skeleton shimmer while loading */}
      {!loaded && <SkeletonShimmer width={width} height={height} />}

      <Image
        source={{ uri }}
        style={{ width, height, position: loaded ? 'relative' : 'absolute' }}
        contentFit={contentFit}
        transition={300}
        cachePolicy="memory-disk"
        onLoad={() => setLoaded(true)}
      />
    </View>
  );
}

/** Simple animated skeleton shimmer placeholder */
function SkeletonShimmer({ width, height }: { width: number; height: number }) {
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: '#D1D5DB',
          opacity,
          width,
          height,
        },
      ]}
    />
  );
}
