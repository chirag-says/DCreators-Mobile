// ============================================
// DashboardScreen — Thin router
// Branches on currentRole:
//   consultant → CreatorDashboardScreen  ("Creators Dashboard - Final" portfolio grid)
//   client     → ClientDashboard          ("Explore Creative Consultant's Portfolio")
//
// ⚠️ PART A RULE: "Creator's Dashboard" = CONSULTANT only.
//               "Open Gallery Dashboard"  = CLIENT only.
//               Never swap these.
// ============================================

import React, { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import CreatorDashboardScreen from './CreatorDashboardScreen';
import ClientDashboard from '../components/dashboard/ClientDashboard';
import type { MainTabScreenProps } from '../types/navigation';

const FADE_OUT_MS = 120;
const FADE_IN_MS = 200;

export default function DashboardScreen({ navigation }: MainTabScreenProps<'Dashboard'>) {
  const currentRole = useAuthStore((s) => s.currentRole);

  // Crossfade the whole dashboard when the Client ↔ Creator switch is toggled,
  // instead of an instant unmount/mount jump-cut.
  const [displayedRole, setDisplayedRole] = useState(currentRole);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (currentRole === displayedRole) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_OUT_MS,
      useNativeDriver: true,
    }).start(() => {
      setDisplayedRole(currentRole);
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_IN_MS,
        useNativeDriver: true,
      }).start();
    });
  }, [currentRole, displayedRole, opacity]);

  return (
    <Animated.View style={{ flex: 1, opacity }}>
      {displayedRole === 'consultant'
        // Consultant home = "Creators Dashboard - Final" (portfolio grid + Sales/Project toggle)
        ? <CreatorDashboardScreen navigation={navigation} />
        // Client home = "Explore Creative Consultant's Portfolio" hub
        : <ClientDashboard navigation={navigation} />}
    </Animated.View>
  );
}
