/**
 * BottomNavigation — Figma exact replica
 * Screen 33: BottomNavBar.png
 *
 * Style: white background, navy active, gray inactive, rounded top border
 *
 * Tab visibility depends on role:
 *   - client:     HOME | SEARCH | ACTIVITY | HISTORY | SHOP
 *   - consultant: HOME | SEARCH | BIDS | PROJECTS | SALES
 *
 * Neither role has a PROFILE tab — the avatar in TopHeader already opens
 * the user's own profile directly, so a duplicate tab isn't needed. Service
 * Pricing and Update Portfolio live inside the profile screen / sidebar menu
 * instead of the bottom nav, since they're occasional edits, not daily use.
 *
 * No BACK tab — native iOS/Android swipe-back gesture (and the hardware/edge
 * swipe) handles backwards navigation; a dedicated button duplicated that.
 */
import React, { useEffect, useRef } from 'react';
import {
  View, TouchableOpacity, Text, StyleSheet, Platform, LayoutAnimation, UIManager,
} from 'react-native';
import {
  Home, Search, ShoppingBag, Clock, ClipboardList, FileText, Briefcase, TrendingUp,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/useAuthStore';
import { fonts, fontSizes } from '../styles/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Figma tokens
const NAVY   = '#1B3A5C';
const GRAY   = '#9CA3AF';
const WHITE  = '#FFFFFF';
const BORDER = '#E5E7EB';

interface TabDef {
  name: string;
  label: string;
  Icon: React.FC<{ size: number; color: string; strokeWidth?: number }>;
}

export default function BottomNavigation({ state, navigation: tabNavigation }: any) {
  const stackNavigation = useNavigation<any>();
  const navigation = tabNavigation || stackNavigation;
  const insets     = useSafeAreaInsets();
  const currentRole = useAuthStore((s) => s.currentRole);

  const currentRouteName = state ? state.routes[state.index].name : '';

  // ── Tab definitions per role ────────────────────────────────
  const clientTabs: TabDef[] = [
    { name: 'Dashboard', label: 'HOME',   Icon: Home },
    { name: 'Search',    label: 'SEARCH', Icon: Search },
    { name: 'MyActivity', label: 'ACTIVITY', Icon: ClipboardList },
    { name: 'History',   label: 'HISTORY',Icon: Clock },
    { name: 'Shop',      label: 'SHOP',   Icon: ShoppingBag },
  ];

  const consultantTabs: TabDef[] = [
    { name: 'Dashboard', label: 'HOME',     Icon: Home },
    { name: 'Search',    label: 'SEARCH',   Icon: Search },
    { name: 'ConsultantBidInbox', label: 'BIDS', Icon: FileText },
    { name: 'ConsultantProjectManagement', label: 'PROJECTS', Icon: Briefcase },
    { name: 'ConsultantEarningsHistory', label: 'SALES', Icon: TrendingUp },
  ];

  const tabs = currentRole === 'consultant' ? consultantTabs : clientTabs;

  // Smooth out the tab-count reflow (4 consultant tabs vs 5 client tabs)
  // when the Client ↔ Creator switch is toggled, instead of an instant snap.
  const prevRole = useRef(currentRole);
  useEffect(() => {
    if (prevRole.current !== currentRole) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      prevRole.current = currentRole;
    }
  }, [currentRole]);

  function handlePress(tab: TabDef) {
    // Use tab navigator if available, else stack navigate
    if (tabNavigation) {
      try { tabNavigation.navigate(tab.name); } catch { stackNavigation.navigate(tab.name); }
    } else {
      stackNavigation.navigate(tab.name);
    }
  }

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(8, insets.bottom) }]}>
      {/* Top border */}
      <View style={styles.topBorder} />

      {tabs.map((tab) => {
        const isActive = currentRouteName === tab.name;
        const iconColor = isActive ? NAVY : GRAY;

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => handlePress(tab)}
            activeOpacity={0.7}
            accessibilityLabel={tab.label}
          >
            <tab.Icon
              size={22}
              color={iconColor}
              strokeWidth={isActive ? 2.5 : 2}
            />
            <Text style={[styles.tabLabel, { color: iconColor, fontWeight: isActive ? '800' : '600' }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: WHITE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: BORDER,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingBottom: 4,
  },
  tabLabel: {
    fontSize: fontSizes.xs,
    fontFamily: fonts.heavy,
    letterSpacing: 0.3,
    marginTop: 2,
  },
});
