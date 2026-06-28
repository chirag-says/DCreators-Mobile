/**
 * EmailLoginScreen — the "Continue with Email" OTP flow
 * Reached from LoginScreen when user taps "Continue with Email"
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';

// ─── DEV BYPASS CONFIG ──────────────────────────────────────
// Set to true to enable fast login for test accounts.
// REMOVE BEFORE PRODUCTION BUILD.
const DEV_BYPASS_ENABLED = true;
const DEV_TEST_EMAIL = 'test@gmail.com';
const DEV_TEST_PASSWORD = 'test123456';
// ─────────────────────────────────────────────────────────────

const { width } = Dimensions.get('window');

export default function EmailLoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const { signInWithOTP, isLoading } = useAuthStore();

  const canSubmit = email.trim().length > 0 && email.includes('@');

  async function handleSubmit() {
    if (!canSubmit) return;
    const trimmedEmail = email.trim().toLowerCase();

    // ── DEV BYPASS: Skip OTP for test account ───────────
    if (DEV_BYPASS_ENABLED && trimmedEmail === DEV_TEST_EMAIL) {
      try {
        useAuthStore.setState({ isLoading: true });
        const { data, error } = await supabase.auth.signInWithPassword({
          email: DEV_TEST_EMAIL,
          password: DEV_TEST_PASSWORD,
        });
        if (error) {
          // If password login fails, try creating the account first
          const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
            email: DEV_TEST_EMAIL,
            password: DEV_TEST_PASSWORD,
          });
          if (signUpErr) {
            Alert.alert('Dev Bypass Failed', signUpErr.message);
            useAuthStore.setState({ isLoading: false });
            return;
          }
          if (signUpData.user) {
            useAuthStore.setState({
              user: { id: signUpData.user.id, email: signUpData.user.email ?? '' },
            });
          }
        } else if (data.user) {
          useAuthStore.setState({
            user: { id: data.user.id, email: data.user.email ?? '' },
          });
        }
        // Fetch profiles and go straight to Intro
        await useAuthStore.getState().fetchProfile();
        await useAuthStore.getState().fetchConsultantProfile();
        useAuthStore.setState({ isLoading: false });
        navigation.navigate('Intro', { userName: 'Tester' });
        return;
      } catch (err: any) {
        Alert.alert('Dev Bypass Error', err.message);
        useAuthStore.setState({ isLoading: false });
        return;
      }
    }
    // ── END DEV BYPASS ──────────────────────────────────

    const result = await signInWithOTP(trimmedEmail);
    if (result.success) {
      navigation.navigate('OTPVerification', {
        email: trimmedEmail,
        userName: '',
      });
    } else {
      Alert.alert('Error', result.error || 'Failed to send OTP. Please try again.');
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={10}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* ── Logo + tagline ──────────────────────── */}
          <View style={styles.logoSection}>
            <Image
              source={{ uri: RemoteAssets.dcreatorsLogo }}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>HIRE CREATIVES. BUY ART. BUILD IDEAS</Text>
          </View>

          {/* ── White card ─────────────────────────── */}
          <View style={styles.card}>
            {/* Back button */}
            <TouchableOpacity
              style={styles.backRow}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <ChevronLeft size={20} color={colors.textSecondary} strokeWidth={2} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.cardTitle}>Sign in with Email</Text>
            <Text style={styles.cardSubtitle}>
              We'll send a one-time code to your email
            </Text>

            {/* Email input */}
            <View style={styles.inputRow}>
              <Mail size={18} color={colors.textTertiary} strokeWidth={1.8} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
            </View>

            {/* Send OTP */}
            <TouchableOpacity
              style={[styles.sendBtn, (!canSubmit || isLoading) && { opacity: 0.5 }]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={!canSubmit || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sendBtnText}>Send Code</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>

            {/* Create account */}
            <TouchableOpacity
              style={styles.createRow}
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.7}
            >
              <Text style={styles.createPrompt}>New to Dcreators?  </Text>
              <Text style={styles.createLink}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['3xl'],
  },

  logoSection: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logo: {
    width: width * 0.62,
    height: 72,
    marginBottom: spacing.md,
  },
  tagline: {
    fontSize: fontSizes.xs + 1,
    fontFamily: fonts.medium,
    color: colors.textTertiary,
    letterSpacing: 1.5,
    textAlign: 'center',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['2xl'],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
    }),
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xl,
  },
  backText: {
    fontSize: fontSizes.base,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  cardTitle: {
    fontSize: fontSizes['2xl'],
    fontWeight: '800',
    fontFamily: fonts.heavy,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  cardSubtitle: {
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    lineHeight: 20,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    backgroundColor: '#fff',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  input: {
    flex: 1,
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    padding: 0,
    margin: 0,
  },

  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: fontSizes.base,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    letterSpacing: 0.3,
  },

  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  orText: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.medium,
    color: colors.textTertiary,
    letterSpacing: 0.5,
  },

  createRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createPrompt: {
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  createLink: {
    fontSize: fontSizes.base,
    fontFamily: fonts.medium,
    color: colors.primary,
    fontWeight: '600',
  },
});
