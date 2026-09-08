import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Alert, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Shield, FileText, LogOut, Trash2, ChevronRight, ChevronLeft, Repeat2 } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useRoleSwitch } from '../hooks/useRoleSwitch';
import { LegalUrls } from '../lib/legal';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';


export default function SettingsScreen({ navigation }: any) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { profile, signOut, deleteAccount, currentRole } = useAuthStore();
  const displayName = profile?.name || 'User';
  const displayEmail = profile?.email || 'user@example.com';
  const { canSwitch, toggle: toggleRole } = useRoleSwitch(navigation);

  async function handleLogout() {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  // Two taps and a typed-out consequence, because this one is final. Play
  // requires the path to exist in the app; the same thing is reachable from
  // dcreators.in/delete-account for people who have already uninstalled.
  function handleDeleteAccount() {
    Alert.alert(
      'Delete account?',
      'Your profile, portfolio, and messages will be erased and you will not be able to sign in again. ' +
        'Payment records are kept as long as tax law requires, with your name removed.',
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            const result = await deleteAccount();
            setIsDeleting(false);

            if (result.success) {
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
              return;
            }
            Alert.alert('Account not deleted', result.error ?? 'Please try again.');
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.cardBg }]} edges={['top']}>
      <View style={styles.backgroundImage}>
      
        
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

            {/* IntroScreen tells people "You can switch roles later in
                settings" at signup. Until now that promise led nowhere —
                the only switch was a pill in the header. */}
            {canSwitch && (
              <View style={styles.settingsGroup}>
                <Text style={styles.groupTitle}>Role</Text>
                <TouchableOpacity style={styles.settingRow} onPress={toggleRole} activeOpacity={0.7}>
                  <View style={styles.settingIconBg}>
                    <Repeat2 size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingText}>
                      Switch to {currentRole === 'consultant' ? 'Client' : 'Creator'}
                    </Text>
                    <Text style={styles.settingSubText}>
                      Currently browsing as {currentRole === 'consultant' ? 'a Creator' : 'a Client'}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Every row here goes somewhere. The old Personal Information,
                Privacy & Security and Help Center rows had no onPress at all,
                and the Push Notifications switch toggled a piece of local
                state with no push infrastructure behind it. */}
            <View style={styles.settingsGroup}>
              <Text style={styles.groupTitle}>Account</Text>

              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => navigation.navigate(currentRole === 'consultant' ? 'EditConsultantProfile' : 'EditProfile')}
                activeOpacity={0.7}
              >
                <View style={styles.settingIconBg}>
                  <User size={20} color={colors.primary} />
                </View>
                <Text style={styles.settingText}>Personal Information</Text>
                <ChevronRight size={20} color={colors.textTertiary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => Linking.openURL(LegalUrls.privacy)}
                activeOpacity={0.7}
              >
                <View style={styles.settingIconBg}>
                  <Shield size={20} color={colors.primary} />
                </View>
                <Text style={styles.settingText}>Privacy Policy</Text>
                <ChevronRight size={20} color={colors.textTertiary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => Linking.openURL(LegalUrls.terms)}
                activeOpacity={0.7}
              >
                <View style={styles.settingIconBg}>
                  <FileText size={20} color={colors.primary} />
                </View>
                <Text style={styles.settingText}>Terms of Service</Text>
                <ChevronRight size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut size={20} color={colors.error} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.textTertiary} />
              ) : (
                <Trash2 size={18} color={colors.textTertiary} />
              )}
              <Text style={styles.deleteText}>
                {isDeleting ? 'Deleting your account…' : 'Delete account'}
              </Text>
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
  settingSubText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontFamily: fonts.body,
    marginTop: 2,
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

  // Deliberately quieter than Logout: it sits below the thing people
  // actually came for, and nobody should reach for it by accident.
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  deleteText: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.medium,
    color: colors.textTertiary,
  },
});
