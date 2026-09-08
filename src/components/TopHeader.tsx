import React, { useRef, useEffect, useState } from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Animated } from 'react-native';
import { Search, User } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { colors, spacing } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';
import SideMenu from './SideMenu';
import HamburgerIcon from './HamburgerIcon';

/**
 * TopHeader — Global navigation header
 *
 * Features:
 * - Hamburger menu + D icon (left)
 * - Search + User circle (right)
 *
 * The Client ↔ Creator pill used to sit in the centre here. It has moved to
 * SideMenu and SettingsScreen (see useRoleSwitch): this header renders on
 * pushed detail screens too, where changing role mid-task is not something
 * anyone means to do, and the client's review flagged it as out of place.
 */
export default function TopHeader() {
  const navigation = useNavigation<any>();
  const currentRole = useAuthStore((s) => s.currentRole);
  const [menuVisible, setMenuVisible] = useState(false);

  // Hamburger ⇄ X morph: top/bottom lines rotate and slide to center, middle line fades out
  const morphProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(morphProgress, {
      toValue: menuVisible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [menuVisible]);

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
});
