import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Bell, Shield, HelpCircle, LogOut, ChevronRight, ChevronLeft } from 'lucide-react-native';
import TopHeader from '../components/TopHeader';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';


export default function SettingsScreen({ navigation }: any) {
  const [notifications, setNotifications] = React.useState(true);
  const { profile, signOut, currentRole } = useAuthStore();
  const displayName = profile?.name || 'User';
  const displayEmail = profile?.email || 'user@example.com';

  async function handleLogout() {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.cardBg }]} edges={['top']}>
      <View style={styles.bg}>
      
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings & Profile</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.mainScroll} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            
            {/* User Info Card */}
            <View style={styles.profileCard}>
              <View style={styles.avatarPlaceholder}>
                <User size={32} color={colors.textTertiary} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileEmail}>{displayEmail}</Text>
              </View>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => navigation.navigate(currentRole === 'consultant' ? 'EditConsultantProfile' : 'EditProfile')}
              >
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* Settings Options */}
            <View style={styles.settingsGroup}>
              <Text style={styles.groupTitle}>Account</Text>
              
              <TouchableOpacity style={styles.settingRow}>
                <View style={styles.settingIconBg}>
                  <User size={20} color={colors.primary} />
                </View>
                <Text style={styles.settingText}>Personal Information</Text>
                <ChevronRight size={20} color={colors.textTertiary} />
              </TouchableOpacity>

              <View style={styles.settingRow}>
                <View style={styles.settingIconBg}>
                  <Bell size={20} color={colors.primary} />
                </View>
                <Text style={styles.settingText}>Push Notifications</Text>
                <Switch 
                  value={notifications} 
                  onValueChange={setNotifications} 
                  trackColor={{ false: colors.borderInput, true: colors.primary }}
                />
              </View>
              
              <TouchableOpacity style={styles.settingRow}>
                <View style={styles.settingIconBg}>
                  <Shield size={20} color={colors.primary} />
                </View>
                <Text style={styles.settingText}>Privacy & Security</Text>
                <ChevronRight size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsGroup}>
              <Text style={styles.groupTitle}>Support</Text>
              
              <TouchableOpacity style={styles.settingRow}>
                <View style={styles.settingIconBg}>
                  <HelpCircle size={20} color={colors.primary} />
                </View>
                <Text style={styles.settingText}>Help Center & FAQ</Text>
                <ChevronRight size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut size={20} color={colors.error} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>

              </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, backgroundColor: colors.screenBg },
  safeArea: { flex: 1 },
  mainScroll: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  
  header: {
    backgroundColor: colors.cardBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderCard,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: fonts.heavy,
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing['2xl'],
    ...shadows.card,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: fonts.heavy,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: fonts.body,
  },
  editBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: '#EEF2FF',
    borderRadius: radii.full,
  },
  editBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fonts.medium,
  },

  settingsGroup: {
    marginBottom: spacing['2xl'],
  },
  groupTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
    fontFamily: fonts.medium,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  settingIconBg: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  settingText: {
    flex: 1,
    fontSize: fontSizes.base,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  logoutText: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: colors.error,
    fontFamily: fonts.heavy,
  },
});
