import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Image, ScrollView,
  Alert, Modal, Animated, Dimensions, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User, ShoppingBag, Bell, Bookmark, Settings, FileText,
  MessageCircle, ChevronRight, LogOut, Package, Repeat2,
} from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useRoleSwitch } from '../hooks/useRoleSwitch';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';
import HamburgerIcon from './HamburgerIcon';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PANEL_W = SCREEN_W;
const HEADER_HEIGHT = 70;

// Static menu items — consultant-only/clientOnly items are filtered at render time.
// Home, Search, and the role's work tabs (Activity/History/Shop or Bids/Projects/Sales)
// already live in the bottom nav, so they're deliberately left out of this list.
const MENU_SECTIONS = [
  {
    title: 'Workspace',
    items: [
      { title: 'Messages', icon: MessageCircle, route: 'MessagesList', color: '#8B5CF6' },
      { title: 'Notifications', icon: Bell, route: 'Notifications', color: '#F59E0B' },
    ],
  },
  {
    title: 'Marketplace',
    items: [
      { title: 'My Products', icon: Package, route: 'MyProducts', color: '#7C3AED', consultantOnly: true },
      // Consultants can also buy from the marketplace; clients already have a Shop tab
      { title: 'Creative Shop', icon: ShoppingBag, route: 'Shop', color: '#EC4899', consultantOnly: true },
      // Bookmarking creators to hire is a buyer action — consultants have nothing to save here
      { title: 'Saved Creators', icon: Bookmark, route: 'SavedCreators', color: '#10B981', clientOnly: true },
    ],
  },
  {
    title: 'Account',
    items: [
      { title: 'Settings', icon: Settings, route: 'Settings', color: '#6B7280' },
      { title: 'Terms & Conditions', icon: FileText, route: 'Terms', color: '#6B7280' },
    ],
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  navigation: any;
  // Same Animated.Value driving TopHeader's hamburger⇄X morph — shared so the
  // in-menu close control is the identical icon, not a second/different X.
  progress: Animated.Value;
}

export default function SideMenu({ visible, onClose, navigation, progress }: Props) {
  const { profile, currentRole, consultantProfile } = useAuthStore();
  const insets = useSafeAreaInsets();
  const isConsultant = currentRole === 'consultant';
  const displayName = profile?.name || 'User';
  const displayRole = isConsultant ? 'Creative Consultant' : 'Client';
  const consultantCode = consultantProfile?.code || '';
  const { canSwitch, toggle: toggleRole } = useRoleSwitch(navigation);

  // Anchor the panel's grow-from-button animation at the hamburger's actual
  // on-screen position: insets.top + the header's own paddingTop/centering math.
  const anchorX = spacing.xl + 13;
  const anchorY = insets.top + spacing.sm + (HEADER_HEIGHT - spacing.sm - 19.5) / 2;

  // Kept mounted slightly past `visible=false` so the close animation can play
  // before the Modal unmounts (Modal's own `visible` prop has no exit transition).
  const [rendered, setRendered] = useState(visible);
  const panelAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.spring(panelAnim, {
        toValue: 1, useNativeDriver: true, tension: 260, friction: 24,
      }).start();
    } else if (rendered) {
      Animated.timing(panelAnim, {
        toValue: 0, duration: 200, useNativeDriver: true,
      }).start(({ finished }) => { if (finished) setRendered(false); });
    }
  }, [visible]);

  if (!rendered) return null;

  const backdropOpacity = panelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  // Linear across the full range (rather than front-loaded) so the fade is the
  // dominant, clearly-visible effect through the whole open/close motion.
  const panelOpacity = panelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const panelScale = panelAnim.interpolate({ inputRange: [0, 1], outputRange: [0.05, 1] });
  const panelTranslateX = panelAnim.interpolate({
    inputRange: [0, 1], outputRange: [anchorX - PANEL_W / 2, 0],
  });
  const panelTranslateY = panelAnim.interpolate({
    inputRange: [0, 1], outputRange: [anchorY - SCREEN_H / 2, 0],
  });

  async function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut();
          onClose();
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        }
      },
    ]);
  }

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          {
            opacity: panelOpacity,
            transform: [
              { translateX: panelTranslateX },
              { translateY: panelTranslateY },
              { scale: panelScale },
            ],
          },
        ]}
      >
        <View style={styles.safe}>
          {/* insets.top spacer mirrors the SafeAreaView TopHeader sits inside on every
              screen — keeping it separate from the header row below (rather than folding
              it into one padding value) is what makes HamburgerIcon land at the exact
              spot the real hamburger occupies, instead of getting clipped on tall-notch
              devices. */}
          <View style={{ height: insets.top }} />
          <View style={styles.header}>
            <HamburgerIcon progress={progress} onPress={onClose} />
            <Image source={{ uri: RemoteAssets.dcreatorsLogo }} style={styles.fullLogo} resizeMode="contain" />
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

            {/* ── Profile Card ── */}
            <TouchableOpacity
              style={styles.profileCard}
              onPress={() => { onClose(); navigation.navigate(isConsultant ? 'EditConsultantProfile' : 'EditProfile'); }}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <User size={22} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileSub}>
                  {displayRole}{consultantCode ? ` · ${consultantCode}` : ''}
                </Text>
              </View>
              <ChevronRight size={18} color="#C7CCD4" />
            </TouchableOpacity>

            {/* ── Role switch ──
                Directly under the profile card, which already states which
                role is active — so the control to change it sits next to the
                thing it changes. Was a pill in TopHeader until the client
                review flagged it as not belonging on every screen. */}
            {canSwitch && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Role</Text>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => { onClose(); toggleRole(); }}
                  activeOpacity={0.6}
                >
                  <View style={[styles.iconCircle, { backgroundColor: colors.primary + '12' }]}>
                    <Repeat2 size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuText}>
                      Switch to {isConsultant ? 'Client' : 'Creator'}
                    </Text>
                    <Text style={styles.menuSubText}>
                      Currently browsing as {isConsultant ? 'a Creator' : 'a Client'}
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#CCC" />
                </TouchableOpacity>
              </View>
            )}

            {/* ── Menu Sections ── */}
            {MENU_SECTIONS.map((section, si) => {
              const visibleItems = section.items.filter(
                (item: any) =>
                  (!item.consultantOnly || isConsultant) &&
                  (!item.clientOnly || !isConsultant)
              );
              if (visibleItems.length === 0) return null;

              return (
                <View key={si} style={styles.section}>
                  {section.title && <Text style={styles.sectionTitle}>{section.title}</Text>}
                  {visibleItems.map((item: any, index: number) => {
                    const Icon = item.icon;
                    const isLast = index === visibleItems.length - 1;
                    return (
                      <TouchableOpacity
                        key={item.title}
                        style={[styles.menuItem, !isLast && styles.menuItemBorder]}
                        onPress={() => { onClose(); navigation.navigate(item.route); }}
                        activeOpacity={0.6}
                      >
                        <View style={[styles.iconCircle, { backgroundColor: item.color + '12' }]}>
                          <Icon size={18} color={item.color} />
                        </View>
                        <Text style={styles.menuText}>{item.title}</Text>
                        <ChevronRight size={16} color="#CCC" />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}

            {/* ── Logout ── */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
              <LogOut size={18} color={colors.error} />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>

            <Text style={styles.version}>DCreators v1.0.0</Text>
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.overlay,
  },
  panel: {
    position: 'absolute', top: 0, left: 0,
    width: PANEL_W, height: SCREEN_H,
    backgroundColor: '#F2F2F7',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.2, shadowRadius: 16 },
      android: { elevation: 16 },
    }),
  },
  safe: { flex: 1 },

  // Header — height matches TopHeader's header row exactly (see HEADER_HEIGHT)
  header: {
    height: HEADER_HEIGHT,
    backgroundColor: '#F2F2F7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  fullLogo: { height: 56, width: 150, marginLeft: -4 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 20, paddingBottom: 40 },

  // Profile
  profileCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#1B3A5C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 2 },
    }),
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#F0F3F8',
    borderWidth: 1.5, borderColor: '#E2E8F2',
    alignItems: 'center', justifyContent: 'center',
  },
  profileInfo: { flex: 1 },
  profileName: { color: colors.textPrimary, fontSize: 17, fontWeight: '700', fontFamily: fonts.heavy },
  profileSub: { color: '#8A93A3', fontSize: 13, fontFamily: fonts.body, marginTop: 1 },

  // Sections — no card background, just grouped rows with a section label
  section: { marginBottom: 16, marginHorizontal: 16 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', letterSpacing: 0.5,
    color: '#9CA3AF', fontFamily: fonts.medium,
    textTransform: 'uppercase',
    marginHorizontal: 4, marginBottom: 6,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 4,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DADDE2',
  },
  iconCircle: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  menuText: {
    flex: 1, fontSize: 16, fontWeight: '400',
    color: colors.textPrimary, fontFamily: fonts.body,
  },
  // Only the role row carries a subtitle: switching modes reshuffles the whole
  // bottom nav, so it should say what state you are in before you tap it.
  menuSubText: {
    fontSize: 12, color: '#8A93A3', fontFamily: fonts.body, marginTop: 1,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#FFF', borderRadius: 12,
    marginBottom: 16,
  },
  logoutText: { fontSize: 16, fontWeight: '500', color: colors.error, fontFamily: fonts.medium },

  // Version
  version: {
    textAlign: 'center', fontSize: 12,
    color: '#AEAEB2', fontFamily: fonts.body,
  },
});
