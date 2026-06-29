import React, { useRef, useEffect, useState } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Text, Animated, Platform } from 'react-native';
import { Search, User } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';
import SideMenu from './SideMenu';
import HamburgerIcon from './HamburgerIcon';

// ─── Design tokens ───────────────────────────────────────────
const NAVY = '#1B3A5C';
const TEAL = '#2D8B7F';
const SWITCH_BG = '#F3F4F6';
const ACTIVE_BG = NAVY;
const SWITCH_WIDTH = 190;
const TAB_WIDTH = SWITCH_WIDTH / 2;
const PILL_HEIGHT = 34;

/**
 * TopHeader — Global navigation header
 *
 * Features:
 * - Hamburger menu + D icon (left)
 * - Role switch toggle: Client ↔ Consultant (center, only if has_consultant_profile)
 * - Search + User circle (right)
 */
export default function TopHeader() {
  const navigation = useNavigation<any>();
  const currentRole = useAuthStore((s) => s.currentRole);
  const setRole = useAuthStore((s) => s.setRole);
  const profile = useAuthStore((s) => s.profile);
  const consultantProfile = useAuthStore((s) => s.consultantProfile);
  const [menuVisible, setMenuVisible] = useState(false);

  // Only show switch if user has a consultant profile
  const canSwitch = !!consultantProfile;

  // Animated slide position for the pill
  const slideAnim = useRef(new Animated.Value(currentRole === 'client' ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: currentRole === 'client' ? 0 : 1,
      useNativeDriver: true,
      tension: 300,
      friction: 25,
    }).start();
  }, [currentRole]);

  // Hamburger ⇄ X morph: top/bottom lines rotate and slide to center, middle line fades out
  const morphProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(morphProgress, {
      toValue: menuVisible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [menuVisible]);

  function toggleRole(role: 'client' | 'consultant') {
    if (role === currentRole) return;
    setRole(role);
  }

  const pillTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, TAB_WIDTH - 2],
  });

  return (
    <View style={styles.header}>
      {/* Left: Hamburger + D icon */}
      <View style={styles.leftGroup}>
        <HamburgerIcon progress={morphProgress} onPress={() => setMenuVisible((v) => !v)} />

        <Image 
          source={{ uri: RemoteAssets.dIcon }} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Center: Role Switch (only if consultant profile exists) */}
      {canSwitch && (
        <View style={styles.switchContainer}>
          {/* Animated sliding pill */}
          <Animated.View
            style={[
              styles.slidingPill,
              { transform: [{ translateX: pillTranslateX }] },
            ]}
          />
          
          {/* Client tab */}
          <TouchableOpacity
            style={styles.switchTab}
            onPress={() => toggleRole('client')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.switchText,
              currentRole === 'client' && styles.switchTextActive,
            ]}>
              Client
            </Text>
          </TouchableOpacity>

          {/* Consultant tab */}
          <TouchableOpacity
            style={styles.switchTab}
            onPress={() => toggleRole('consultant')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.switchText,
              currentRole === 'consultant' && styles.switchTextActive,
            ]}>
              Creator
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Right: Search + User circle */}
      <View style={styles.rightGroup}>
        <TouchableOpacity onPress={() => navigation.navigate('Search')}>
          <Search size={26} color={colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.userCircle}
          onPress={() => navigation.navigate(currentRole === 'consultant' ? 'EditConsultantProfile' : 'EditProfile')}
        >
          <User size={20} color={colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <SideMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        navigation={navigation}
        progress={morphProgress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    backgroundColor: 'transparent',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: 40,
    height: 40,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  userCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Role Switch ────────────────────────────────
  switchContainer: {
    width: SWITCH_WIDTH,
    height: PILL_HEIGHT + 4,
    backgroundColor: SWITCH_BG,
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  slidingPill: {
    position: 'absolute',
    width: TAB_WIDTH - 4,
    height: PILL_HEIGHT,
    backgroundColor: ACTIVE_BG,
    borderRadius: radii.full,
    top: 2,
    left: 0,
  },
  switchTab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  switchText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    fontFamily: fonts.medium,
    color: '#6B7280',
  },
  switchTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
