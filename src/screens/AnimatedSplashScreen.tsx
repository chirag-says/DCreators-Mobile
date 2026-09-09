import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { RemoteAssets } from '../lib/assets';
import { useAuthStore } from '../store/useAuthStore';


export default function AnimatedSplashScreen({ navigation }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Wait for auth initialization, then navigate based on session state.
  // We also enforce a minimum 2.5s splash so the animation plays out.
  useEffect(() => {
    const minSplash = new Promise((r) => setTimeout(r, 2500));

    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.isInitialized) {
        minSplash.then(() => {
          if (state.user) {
            navigation.replace('Main');
          } else {
            navigation.replace('Welcome');
          }
        });
        unsubscribe();
      }
    });

    // If already initialized by the time we subscribe (unlikely but safe)
    const current = useAuthStore.getState();
    if (current.isInitialized) {
      minSplash.then(() => {
        if (current.user) {
          navigation.replace('Main');
        } else {
          navigation.replace('Welcome');
        }
      });
      unsubscribe();
    }

    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={{ uri: RemoteAssets.dcreatorsLogo }}
        style={[
          styles.logo,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ededed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 340,
    height: 130,
  },
});

