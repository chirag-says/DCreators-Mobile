import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';

const { width } = Dimensions.get('window');

// ─── Color tokens (from Figma) ──────────────────────────────
const CLIENT_BG   = '#E8ECF4';  // muted blue-gray tint for icon zone
const CONSULT_BG  = '#FDF0E4';  // warm peach tint for icon zone
const CLIENT_PILL = '#1A2560';  // dark navy pill
const CONSULT_PILL = '#C84B0F'; // burnt orange pill

// ─────────────────────────────────────────────────────────────
export default function IntroScreen({ navigation, route }: any) {
  const { setRole, consultantProfile, profile } = useAuthStore();

  function handleRole(role: 'viewer' | 'creator') {
    if (role === 'creator') {
      setRole('consultant');
      if (!consultantProfile) {
        navigation.navigate('CreateCreatorAccount');
      } else if (!consultantProfile.is_approved) {
        // Resume onboarding at the step they left off on.
        const hasCategoryDetails = consultantProfile.category_details
          && Object.keys(consultantProfile.category_details).length > 0;
        if (!consultantProfile.category) {
          navigation.navigate('ConsultantServicePricing', { fromOnboarding: true });
        } else if (!hasCategoryDetails) {
          navigation.navigate('ConsultantCategoryDetails', { fromOnboarding: true });
        } else {
          navigation.navigate('ConsultantPortfolioUpdate', { fromOnboarding: true });
        }
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Dashboard' } }] });
      }
    } else {
      setRole('client');
      navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Dashboard' } }] });
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
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

        {/* ── Divider ─────────────────────────────── */}
        <View style={styles.divider} />

        {/* ── Headline ────────────────────────────── */}
        <Text style={styles.headline}>
          How would you like to use Dcreators?
        </Text>
        <Text style={styles.subheadline}>
          Select your path. You can switch roles later in settings.
        </Text>

        {/* ── CLIENT PORTAL card ──────────────────── */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleRole('viewer')}
          activeOpacity={0.88}
        >
          {/* Icon zone — blue-gray tint */}
          <View style={[styles.iconZone, { backgroundColor: CLIENT_BG }]}>
            <Image
              source={require('../../assets/client.png')}
              style={styles.roleIcon}
              resizeMode="contain"
            />
            <View style={[styles.pill, { backgroundColor: CLIENT_PILL }]}>
              <Text style={styles.pillText}>CLIENT PORTAL</Text>
            </View>
          </View>

          {/* Text zone — white */}
          <View style={styles.textZone}>
            <Text style={styles.cardDesc}>
              I want to hire creative consultant/Assign Project/ Buy Artwork
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── CONSULTANT PORTAL card ──────────────── */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleRole('creator')}
          activeOpacity={0.88}
        >
          {/* Icon zone — warm peach tint */}
          <View style={[styles.iconZone, { backgroundColor: CONSULT_BG }]}>
            <Image
              source={require('../../assets/consultant.png')}
              style={styles.roleIcon}
              resizeMode="contain"
            />
            <View style={[styles.pill, { backgroundColor: CONSULT_PILL }]}>
              <Text style={styles.pillText}>CONSULTANT PORTAL</Text>
            </View>
          </View>

          {/* Text zone — white */}
          <View style={styles.textZone}>
            <Text style={styles.cardDesc}>
              I want to explore the Creative Projects/ grow my creative business
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── Footer attribution ───────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            A Joint Venture of{' '}
            <Text style={styles.footerBold}>Ishisoft Pvt.Ltd</Text>,{' '}
            <Text style={styles.footerBold}>Mr. Shoumik Mazumder</Text> and
          </Text>
          <Text style={styles.footerText}>
            <Text style={styles.footerBold}>Design &amp; Animation Club</Text>,
            Department of Visual Arts, AUS
          </Text>
          <Text style={styles.footerText}>
            Honorary Design Mentor -{' '}
            <Text style={styles.footerBold}>Dr. Gautam Dutta</Text>,
            Department of Visual Arts, AUS
          </Text>
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
    paddingBottom: spacing['3xl'],
  },

  // ── Logo ─────────────────────────────────────
  logoSection: {
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingTop: 0,
    marginBottom: spacing.md,
  },
  logo: {
    width: width * 0.85,
    height: 100,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: fontSizes.xs,
    fontFamily: fonts.medium,
    color: colors.textTertiary,
    letterSpacing: 1.4,
  },

  // ── Divider ──────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing['2xl'],
  },

  // ── Headline ─────────────────────────────────
  headline: {
    fontSize: fontSizes['3xl'] + 2,
    fontWeight: '800',
    fontFamily: fonts.heavy,
    color: CLIENT_PILL,            // dark navy — matches Figma exactly
    textAlign: 'center',
    lineHeight: 40,
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.lg,
  },
  subheadline: {
    fontSize: fontSizes.base + 1,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing['3xl'],
    marginBottom: spacing['3xl'],
  },

  // ── Cards ────────────────────────────────────
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
    }),
  },

  // Top tinted icon zone
  iconZone: {
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.xl,
  },
  roleIcon: {
    width: 72,
    height: 72,
  },

  // Pill label
  pill: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.sm,
    borderRadius: 4,
  },
  pillText: {
    color: '#fff',
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    letterSpacing: 1.2,
  },

  // Bottom white text zone
  textZone: {
    backgroundColor: '#fff',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.xl,
  },
  cardDesc: {
    fontSize: fontSizes.md,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },

  // ── Footer ────────────────────────────────────
  footer: {
    alignItems: 'center',
    gap: 3,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing['2xl'],
  },
  footerText: {
    fontSize: fontSizes.xs + 1,
    fontFamily: fonts.body,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerBold: {
    fontFamily: fonts.heavy,
    color: colors.textSecondary,
    fontWeight: '700',
  },
});
