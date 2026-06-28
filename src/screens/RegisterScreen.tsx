/**
 * RegisterScreen — "Create Your Account"
 * Matches Figma: "Sign Up with Brand Assets.png"
 * 
 * Layout (top→bottom):
 * 1. DCreators logo + tagline
 * 2. White card with:
 *    - "Create Your Account" heading
 *    - Google / Facebook social auth placeholders
 *    - OR divider
 *    - Profile photo upload circle
 *    - Full Name input
 *    - Email input
 *    - Mobile No. + inline "Send OTP" button
 *    - Enter Pin (OTP) + "Resend OTP" link
 *    - Address multiline input
 *    - "Sign in" CTA button (navy)
 */
import React, { useState, useRef } from 'react';
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
import { Camera } from 'lucide-react-native';
import { AntDesign, FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';

const { width } = Dimensions.get('window');

// ─── Color tokens from Figma ────────────────────────────────
const NAVY_CTA = '#1B3A5C';        // Navy "Sign in" button
const FACEBOOK_BLUE = '#1877F2';    // Facebook brand blue
const SEND_OTP_BG = '#7DD3C0';     // Teal/mint "Send OTP" pill

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [address, setAddress] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  const { signInWithOTP, verifyOTP, isLoading } = useAuthStore();

  const canSendOTP =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    email.includes('@');

  const canVerify = otpSent && otp.trim().length >= 6;

  // ── Avatar picker ──────────────────────────────
  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  // ── Send OTP ───────────────────────────────────
  async function handleSendOTP() {
    if (!canSendOTP) return;
    const result = await signInWithOTP(email.trim().toLowerCase());
    if (result.success) {
      setOtpSent(true);
      Alert.alert('OTP Sent', `A verification code has been sent to ${email.trim()}`);
    } else {
      Alert.alert('Error', result.error || 'Failed to send OTP.');
    }
  }

  // ── Verify & register ─────────────────────────
  async function handleSignIn() {
    if (!canVerify) return;
    const result = await verifyOTP(email.trim().toLowerCase(), otp.trim());
    if (result.success) {
      // Update profile with name, phone, address
      const { updateProfile } = useAuthStore.getState();
      await updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
      } as any);
      navigation.navigate('Intro');
    } else {
      Alert.alert('Verification Failed', result.error || 'Invalid OTP. Please try again.');
    }
  }

  // ── Social auth placeholder ────────────────────
  function handleSocialPress(provider: string) {
    Alert.alert(`${provider} Sign In`, 'Coming soon! Use email to sign in for now.');
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
            <Text style={styles.cardTitle}>Create Your Account</Text>

            {/* ── Social auth buttons ──────────────── */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={() => handleSocialPress('Google')}
              activeOpacity={0.8}
            >
              <AntDesign name="google" size={20} color="#4285F4" />
              <Text style={styles.googleText}>Create Your Account with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.facebookBtn}
              onPress={() => handleSocialPress('Facebook')}
              activeOpacity={0.8}
            >
              <FontAwesome name="facebook" size={20} color="#fff" />
              <Text style={styles.facebookText}>Facebook</Text>
            </TouchableOpacity>

            {/* ── OR divider ──────────────────────── */}
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>

            {/* ── Profile photo upload ────────────── */}
            <TouchableOpacity style={styles.avatarRow} onPress={pickAvatar} activeOpacity={0.8}>
              <View style={styles.avatarCircle}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <Camera size={28} color={colors.textTertiary} strokeWidth={1.5} />
                )}
              </View>
              <View style={styles.avatarTextCol}>
                <Text style={styles.avatarTitle}>Upload profile photograph</Text>
                <Text style={styles.avatarHint}>
                  PNG, JPG up to 5MB.{'\n'}Recommended square aspect ratio.
                </Text>
              </View>
            </TouchableOpacity>

            {/* ── Form fields ─────────────────────── */}
            <View style={styles.fieldStack}>
              {/* Full Name */}
              <View>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Alex Rivera"
                  placeholderTextColor={colors.textTertiary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              {/* Email */}
              <View>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="alex.rivera@example.com"
                  placeholderTextColor={colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Mobile No. + Send OTP */}
              <View>
                <Text style={styles.fieldLabel}>Mobile No.</Text>
                <View style={styles.mobileRow}>
                  <TextInput
                    style={[styles.input, styles.mobileInput]}
                    placeholder="+1 234 567 890"
                    placeholderTextColor={colors.textTertiary}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                  <TouchableOpacity
                    style={[styles.sendOtpBtn, (!canSendOTP || isLoading) && { opacity: 0.5 }]}
                    onPress={handleSendOTP}
                    disabled={!canSendOTP || isLoading}
                    activeOpacity={0.8}
                  >
                    {isLoading && !otpSent ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.sendOtpText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Enter Pin (OTP) */}
              <View>
                <View style={styles.otpLabelRow}>
                  <Text style={styles.fieldLabel}>Enter Pin (OTP)</Text>
                  <TouchableOpacity onPress={handleSendOTP} disabled={!canSendOTP || isLoading}>
                    <Text style={styles.resendLink}>Resend OTP</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="6-digit code"
                  placeholderTextColor={colors.textTertiary}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={8}
                />
              </View>

              {/* Address */}
              <View>
                <Text style={styles.fieldLabel}>Address</Text>
                <TextInput
                  style={[styles.input, styles.addressInput]}
                  placeholder="Your studio or home address"
                  placeholderTextColor={colors.textTertiary}
                  value={address}
                  onChangeText={setAddress}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* ── Sign in CTA (navy) ──────────────── */}
            <TouchableOpacity
              style={[styles.signInBtn, (!canVerify || isLoading) && { opacity: 0.5 }]}
              onPress={handleSignIn}
              activeOpacity={0.85}
              disabled={!canVerify || isLoading}
            >
              {isLoading && otpSent ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.signInBtnText}>Sign in</Text>
              )}
            </TouchableOpacity>

            {/* ── Already have account ─────────────── */}
            <TouchableOpacity
              style={styles.loginRow}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.7}
            >
              <Text style={styles.loginPrompt}>Already have an account?  </Text>
              <Text style={styles.loginLink}>Sign in</Text>
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
    paddingTop: spacing.xl,
    paddingBottom: spacing['3xl'],
  },

  // ── Logo ─────────────────────────────────────
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: width * 0.55,
    height: 60,
    marginBottom: spacing.xs,
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
    paddingHorizontal: spacing.xl,
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
  cardTitle: {
    fontSize: fontSizes['3xl'] + 4,
    fontWeight: '800',
    fontFamily: fonts.heavy,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 36,
  },

  // ── Social buttons ───────────────────────────
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#fff',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  googleText: {
    fontSize: fontSizes.base,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  facebookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FACEBOOK_BLUE,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  facebookText: {
    fontSize: fontSizes.base,
    fontFamily: fonts.medium,
    fontWeight: '600',
    color: '#fff',
  },

  // ── OR divider ───────────────────────────────
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
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

  // ── Avatar upload ────────────────────────────
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarTextCol: {
    flex: 1,
  },
  avatarTitle: {
    fontSize: fontSizes.base,
    fontWeight: '600',
    fontFamily: fonts.medium,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  avatarHint: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.body,
    color: colors.textTertiary,
    lineHeight: 18,
  },

  // ── Form fields ──────────────────────────────
  fieldStack: {
    gap: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  fieldLabel: {
    fontSize: fontSizes.base,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    backgroundColor: '#fff',
  },

  // ── Mobile + OTP row ─────────────────────────
  mobileRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mobileInput: {
    flex: 1,
  },
  sendOtpBtn: {
    backgroundColor: SEND_OTP_BG,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendOtpText: {
    fontSize: fontSizes.base,
    fontWeight: '600',
    fontFamily: fonts.medium,
    color: '#fff',
  },

  // ── OTP label row ────────────────────────────
  otpLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  resendLink: {
    fontSize: fontSizes.base,
    fontFamily: fonts.medium,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Address ──────────────────────────────────
  addressInput: {
    minHeight: 80,
    paddingTop: 13,
  },

  // ── Sign in CTA ──────────────────────────────
  signInBtn: {
    backgroundColor: NAVY_CTA,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  signInBtnText: {
    color: '#fff',
    fontSize: fontSizes.lg,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    letterSpacing: 0.3,
  },

  // ── Login link ───────────────────────────────
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginPrompt: {
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  loginLink: {
    fontSize: fontSizes.base,
    fontFamily: fonts.medium,
    color: colors.primary,
    fontWeight: '600',
  },
});
