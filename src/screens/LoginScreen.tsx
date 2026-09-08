/**
 * LoginScreen — Returning user sign-in
 * Shows social auth options + "Continue with Email" which navigates to EmailLoginScreen
 * 
 * Layout (per established card-based design):
 * 1. DCreators logo + tagline
 * 2. White card:
 *    - "Welcome Back!" heading
 *    - "Sign in to continue your creative journey"
 *    - Email button (outline) → navigates to EmailLoginScreen
 *    - OR divider
 *    - "New to Dcreators? Create an account" link
 *
 * The Google and Facebook buttons that used to sit above Email are gone.
 * Neither provider was ever configured, so both only raised a "Coming soon"
 * alert — a dead control on the first screen a Play reviewer opens. They can
 * come back the day the OAuth providers are actually wired in Supabase.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail } from 'lucide-react-native';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
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
          <Text style={styles.cardTitle}>Welcome Back!</Text>
          <Text style={styles.cardSubtitle}>Sign in to continue your creative journey</Text>

          <View style={styles.btnStack}>
            {/* Email → existing OTP flow */}
            <TouchableOpacity
              style={styles.socialOutline}
              onPress={() => navigation.navigate('EmailLogin')}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <Mail size={20} color={colors.textPrimary} strokeWidth={1.8} />
              </View>
              <Text style={styles.btnTextDark}>Continue with Email</Text>
            </TouchableOpacity>
          </View>

          {/* OR divider */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>

          {/* New user CTA */}
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
    justifyContent: 'center',
  },

  // ── Logo ─────────────────────────────────────
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logo: {
    width: width * 0.55,
    height: 64,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: fontSizes.xs,
    fontFamily: fonts.medium,
    color: colors.textTertiary,
    letterSpacing: 1.4,
    textAlign: 'center',
  },

  // ── Card ─────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['3xl'],
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
  cardTitle: {
    fontSize: fontSizes['3xl'] + 2,
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
    lineHeight: 22,
  },

  // ── Buttons ──────────────────────────────────
  btnStack: {
    gap: spacing.md,
  },
  socialOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#fff',
  },
  iconContainer: {
    width: 32,
    alignItems: 'center',
  },
  btnTextDark: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSizes.base,
    fontWeight: '500',
    fontFamily: fonts.medium,
    color: colors.textPrimary,
    marginRight: 32, // balance the icon width for centering
  },

  // ── OR ───────────────────────────────────────
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
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

  // ── Create account ────────────────────────────
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
