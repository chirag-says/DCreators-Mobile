/**
 * FigmaBottomBar — Figma-exact white bottom bar for stack screens
 * Screen 33: BottomNavBar.png
 *
 * 5-tab layout: ← BACK | 🏠 HOME | 🔍 SEARCH | 📸 SALES | 👤 PROFILE
 * Used by stack screens (not tab screens) where BottomNavigation isn't mounted.
 * Pass `activeTab` to highlight a specific icon.
 */
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import {
  ChevronLeft, Home, Search, ShoppingBag, User, Clock,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/useAuthStore';
import { fonts, fontSizes } from '../styles/theme';

const NAVY  = '#1B3A5C';
const GRAY  = '#9CA3AF';
const WHITE = '#FFFFFF';

type TabKey = 'back' | 'home' | 'search' | 'sales' | 'profile';

interface FigmaBottomBarProps {
  navigation: any;
  activeTab?: TabKey;
  /** Override the sales tab (e.g. 'History' for client role) */
  saltsTabName?: string;
}

export default function FigmaBottomBar({
  navigation,
  activeTab,
  saltsTabName,
}: FigmaBottomBarProps) {
  const insets = useSafeAreaInsets();
  const currentRole = useAuthStore((s) => s.currentRole);

  // Sales tab screen name depends on role
  const salesScreen = saltsTabName
    ?? (currentRole === 'consultant' ? 'CreatorDashboard' : 'History');
  const salesLabel = currentRole === 'consultant' ? 'SALES' : 'HISTORY';
  const SalesIcon  = currentRole === 'consultant' ? ShoppingBag : Clock;

  // Profile tab
  const profileScreen = currentRole === 'consultant' ? 'EditConsultantProfile' : 'EditProfile';

  type Tab = {
    key: TabKey;
    label: string;
    Icon: any;
    onPress: () => void;
  };

  const tabs: Tab[] = [
    {
      key: 'back',
      label: 'BACK',
      Icon: ChevronLeft,
      onPress: () => navigation.goBack(),
    },
    {
      key: 'home',
      label: 'HOME',
      Icon: Home,
      onPress: () => navigation.navigate('Main', { screen: 'Dashboard' }),
    },
    {
      key: 'search',
      label: 'SEARCH',
      Icon: Search,
      onPress: () => navigation.navigate('Main', { screen: 'Search' }),
    },
    {
      key: 'sales',
      label: salesLabel,
      Icon: SalesIcon,
      onPress: () => navigation.navigate(salesScreen),
    },
    {
      key: 'profile',
      label: 'PROFILE',
      Icon: User,
      onPress: () => navigation.navigate(profileScreen),
    },
  ];

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(10, insets.bottom) }]}>
      <View style={styles.topBorder} />
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const color = isActive ? NAVY : GRAY;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={tab.onPress}
            activeOpacity={0.7}
            accessibilityLabel={tab.label}
          >
            <tab.Icon
              size={tab.key === 'back' ? 20 : 22}
              color={color}
              strokeWidth={isActive ? 2.5 : 2}
            />
            <Text style={[
              styles.label,
              { color, fontWeight: isActive ? '800' : '600' },
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
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
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingBottom: 4,
  },
  label: {
    fontSize: fontSizes.xs,
    fontFamily: fonts.heavy,
    letterSpacing: 0.3,
    marginTop: 2,
  },
});
