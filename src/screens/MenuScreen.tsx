import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X, User, ShoppingBag, Bell, Bookmark, Settings, FileText,
  Briefcase, MessageCircle, ChevronRight, LogOut, Clock, Package,
} from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';


// Static menu items — consultant-only items are filtered at render time
const MENU_SECTIONS = [
  {
    title: null,
    items: [
      { title: 'Dashboard', icon: Briefcase, route: 'Dashboard', color: '#4F46E5' },
      { title: 'My Projects', icon: Clock, route: 'History', color: '#0EA5E9' },
      { title: 'Messages', icon: MessageCircle, route: 'MessagesList', color: '#8B5CF6' },
      { title: 'Notifications', icon: Bell, route: 'Notifications', color: '#F59E0B' },
    ],
  },
  {
    title: null,
    items: [
      { title: 'My Products', icon: Package, route: 'MyProducts', color: '#7C3AED', consultantOnly: true },
      { title: 'Creative Shop', icon: ShoppingBag, route: 'Shop', color: '#EC4899' },
      // Bookmarking creators to hire is a buyer action — consultants have nothing to save here
      { title: 'Saved Creators', icon: Bookmark, route: 'SavedCreators', color: '#10B981', clientOnly: true },
    ],
  },
  {
    title: null,
    items: [
      { title: 'Settings', icon: Settings, route: 'Settings', color: '#6B7280' },
      { title: 'Terms & Conditions', icon: FileText, route: 'Terms', color: '#6B7280' },
    ],
  },
];

export default function MenuScreen({ navigation }: any) {
  const { profile, currentRole, consultantProfile } = useAuthStore();
  const displayName = profile?.name || 'User';
  const displayEmail = profile?.email || '';
  const isConsultant = currentRole === 'consultant';
  const displayRole = isConsultant ? 'Creative Consultant' : 'Client';
  const consultantCode = consultantProfile?.code || '';

  async function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut();
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        }
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Image source={{ uri: RemoteAssets.dcreatorsLogo }} style={styles.fullLogo} resizeMode="contain" />
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <X size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Profile Card ── */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => navigation.navigate(isConsultant ? 'EditConsultantProfile' : 'EditProfile')}
          activeOpacity={0.85}
        >
          <View style={styles.avatar}>
            <User size={24} color="#FFF" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileSub}>
              {displayRole}{consultantCode ? ` · ${consultantCode}` : ''}
            </Text>
          </View>
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>Edit</Text>
          </View>
        </TouchableOpacity>

        {/* ── Menu Sections ── */}
        {MENU_SECTIONS.map((section, si) => {
          // Filter out consultant-only items for clients, and client-only items for consultants
          const visibleItems = section.items.filter(
            (item: any) =>
              (!item.consultantOnly || isConsultant) &&
              (!item.clientOnly || !isConsultant)
          );
          if (visibleItems.length === 0) return null;

          return (
            <View key={si} style={styles.sectionCard}>
              {visibleItems.map((item: any, index: number) => {
                const Icon = item.icon;
                const isLast = index === visibleItems.length - 1;
                return (
                  <TouchableOpacity
                    key={item.title}
                    style={[styles.menuItem, !isLast && styles.menuItemBorder]}
                    onPress={() => {
                      if (item.route === 'Dashboard' || item.route === 'History') {
                        navigation.navigate('Main', { screen: item.route });
                      } else {
                        navigation.navigate(item.route);
                      }
                    }}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2F2F7' },

  // Header
  header: {
    backgroundColor: '#F2F2F7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  fullLogo: { height: 80, width: 300, marginLeft: -40 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center', justifyContent: 'center',
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 20, paddingBottom: 40 },

  // Profile
  profileCard: {
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  profileInfo: { flex: 1 },
  profileName: { color: '#FFF', fontSize: 17, fontWeight: '700', fontFamily: fonts.heavy },
  profileSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontFamily: fonts.body, marginTop: 1 },
  editBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  editBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '600', fontFamily: fonts.medium },

  // Section cards
  sectionCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 14,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  iconCircle: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  menuText: {
    flex: 1, fontSize: 16, fontWeight: '400',
    color: colors.textPrimary, fontFamily: fonts.body,
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
