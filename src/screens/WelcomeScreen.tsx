/**
 * WelcomeScreen — "Welcome to Dcreators"
 * Canonical Figma: claudereferfigma/Welcome to Dcreators.png
 *
 * Layout (top → bottom):
 * 1. DCreators logo (centered) + tagline caps "HIRE CREATIVES. BUY ART. BUILD IDEAS."
 * 2. Orange two-line headline: "Unparallel Creative Ecosystem"
 * 3. Vertical icon-trail image (assets/welcomescreenasset.png):
 *    camera (photographer) → bulb (designer) → easel (artist) → pottery (artisan)
 *    → navy-filled magnifier (explore)
 * 4. Sub-copy: "User can Assign Projects, Buy Artwork and collaborate with ..."
 * 5. "Sign up" button (outline, full-width, pill)
 * 6. Footer attribution (Joint Venture credits)
 *
 * No scrolling: all sizes scale down on short screens via `s()`. The top
 * stack (logo → button → sign-in) keeps tight natural margins; a flexible
 * spacer absorbs leftover room on tall screens and shrinks toward zero on
 * short ones, pinning the footer to the bottom without stretching every gap.
 *
 * Background: light lavender per Figma (colors.screenBg)
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing, radii } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';

/** Design was sized for a ~760pt-tall screen; shrink everything below that, never grow it. */
const BASE_HEIGHT = 760;

export default function WelcomeScreen({ navigation }: any) {
  const { width, height } = useWindowDimensions();
  const scale = Math.min(1, height / BASE_HEIGHT);
  const s = (value: number) => value * scale;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={[styles.content, { paddingVertical: s(spacing.xl) }]}>
        {/* ── Main stack (tight, natural spacing) ──────── */}
        <View>
          {/* Logo + tagline */}
          <View style={[styles.logoWrapper, { marginBottom: s(spacing['2xl']) }]}>
            <Image
              source={{ uri: RemoteAssets.dcreatorsLogo }}
              style={{ width: width * 0.55, height: s(56) }}
              resizeMode="contain"
            />
            <Text style={[styles.tagline, { fontSize: s(11), marginTop: s(spacing.sm) }]}>
              HIRE CREATIVES. BUY ART. BUILD IDEAS.
            </Text>
          </View>

          {/* Orange headline */}
          <Text
            style={[
              styles.headline,
              { fontSize: s(20), lineHeight: s(26), marginBottom: s(spacing.lg) },
            ]}
          >
            Unparallel Creative{'\n'}Ecosystem
          </Text>

          {/* Vertical icon trail — the visual centerpiece, sized larger than the headline */}
          <Image
            source={require('../../assets/welcomescreenasset.png')}
            style={{
              width: s(130),
              height: s(323),
              alignSelf: 'center',
              marginBottom: s(spacing.lg),
            }}
            resizeMode="contain"
          />

          {/* Sub-copy */}
          <Text
            style={[
              styles.subCopy,
              { fontSize: s(13), lineHeight: s(19), marginBottom: s(spacing.xl) },
            ]}
          >
            User can Assign Projects, Buy Artwork and collaborate with
            photographers, designers, artists, and artisans.
          </Text>

          {/* Sign Up Button (outline, full-width, pill) */}
          <TouchableOpacity
            style={[
              styles.signUpButton,
              { paddingVertical: s(14), marginBottom: s(spacing.md) },
            ]}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.8}
          >
            <Text style={[styles.signUpText, { fontSize: s(16) }]}>Sign up</Text>
          </TouchableOpacity>

          {/* Sign-in link (not in Figma, but the only path to Login) */}
          <TouchableOpacity
            style={styles.signInRow}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={[styles.signInPrompt, { fontSize: s(13) }]}>Already have an account? </Text>
            <Text style={[styles.signInLink, { fontSize: s(13) }]}>Sign in</Text>
          </TouchableOpacity>
        </View>

        {/* Flexible spacer: absorbs leftover room on tall screens, shrinks to ~0 on short ones */}
        <View style={{ flex: 1, minHeight: s(spacing.lg) }} />

        {/* ── Footer Attribution ───────────────────────── */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { fontSize: s(9), lineHeight: s(13) }]}>
            A Joint Venture of{' '}
            <Text style={styles.footerBold}>Ishisoft Pvt.Ltd</Text>,{' '}
            <Text style={styles.footerBold}>Mr. Shoumik Mazumder</Text> and
          </Text>
          <Text style={[styles.footerText, { fontSize: s(9), lineHeight: s(13) }]}>
            <Text style={styles.footerBold}>Design &amp; Animation Club</Text>,
            Department of Visual Arts, AUS
          </Text>
          <Text style={[styles.footerText, { fontSize: s(9), lineHeight: s(13) }]}>
            Honorary Design Mentor -{' '}
            <Text style={styles.footerBold}>Dr. Gautam Dutta</Text>,
            Department of Visual Arts, AUS
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing['3xl'],
  },

  // ── Logo + tagline ────────────────────────────
  logoWrapper: {
    alignItems: 'center',
  },
  tagline: {
    fontFamily: fonts.medium,
    color: colors.textTertiary,
    letterSpacing: 2,
  },

  // ── Headline ──────────────────────────────────
  headline: {
    fontWeight: '600',
    fontFamily: fonts.heavy,
    color: colors.orange,
    textAlign: 'center',
  },

  // ── Sub-copy ──────────────────────────────────
  subCopy: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // ── Sign Up Button (outline per Figma) ────────
  signUpButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.full,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  signUpText: {
    fontWeight: '500',
    fontFamily: fonts.medium,
    color: colors.textBody,
    letterSpacing: 0.2,
  },

  // ── Sign-in row ───────────────────────────────
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInPrompt: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  signInLink: {
    fontFamily: fonts.medium,
    color: colors.primary,
    fontWeight: '600',
  },

  // ── Footer ────────────────────────────────────
  footer: {
    alignItems: 'center',
    gap: 2,
  },
  footerText: {
    fontFamily: fonts.body,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  footerBold: {
    fontFamily: fonts.heavy,
    color: colors.textSecondary,
    fontWeight: '700',
  },
});
