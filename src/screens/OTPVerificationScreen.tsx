import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Responsive OTP box: 8 boxes + 7 gaps, within horizontal padding
const H_PADDING = spacing['2xl'] * 2; // left + right content padding
const OTP_GAP = 6;
const OTP_BOX_SIZE = Math.floor((SCREEN_WIDTH - H_PADDING - OTP_GAP * 7) / 8);

export default function OTPVerificationScreen({ navigation, route }: any) {
  const email = route?.params?.email || '';
  const userName = route?.params?.userName || '';
  const registerData = route?.params?.registerData || null;

  const [otp, setOtp] = useState(['', '', '', '', '', '', '', '']);
  const [resendCount, setResendCount] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const { verifyOTP, signInWithOTP, isLoading } = useAuthStore();

  const otpString = otp.join('');
  const canVerify = otpString.length === 8;

  async function handleVerify() {
    if (!canVerify) return;

    const result = await verifyOTP(email, otpString);
    if (result.success) {
      // Update profile with registration data if provided
      const profileUpdate: Record<string, string> = {};
      if (userName) profileUpdate.name = userName;
      if (registerData?.address) profileUpdate.address = registerData.address;
      if (registerData?.pin) profileUpdate.pin = registerData.pin;
      if (registerData?.phone) profileUpdate.phone = registerData.phone;

      if (Object.keys(profileUpdate).length > 0) {
        await useAuthStore.getState().updateProfile(profileUpdate);
      }

      // Navigate to role selection (IntroScreen)
      navigation.navigate('Intro', { userName: userName || 'User' });
    } else {
      Alert.alert('Verification Failed', result.error || 'Invalid OTP. Please try again.');
    }
  }

  async function handleResendOTP() {
    if (resendCount >= 3) {
      Alert.alert('Limit Reached', 'Maximum OTP resend attempts reached. Please try again later.');
      return;
    }

    const result = await signInWithOTP(email);
    if (result.success) {
      setResendCount(prev => prev + 1);
      setOtp(['', '', '', '', '', '', '', '']);
      Alert.alert('OTP Sent', `A new OTP has been sent to ${email}`);
    } else {
      Alert.alert('Error', result.error || 'Failed to resend OTP.');
    }
  }

  function handleOTPChange(value: string, index: number) {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(key: string, index: number) {
    // Handle backspace - go to previous input
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <ChevronLeft size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <Text style={styles.title}>Verify your email</Text>
              <Text style={styles.subtitle}>
                {"We've sent a verification code to\n"}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>

              {/* OTP Inputs */}
              <View style={styles.inputSection}>
                <Text style={styles.label}>Enter OTP</Text>
                <View style={styles.otpContainer}>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => { inputRefs.current[index] = ref; }}
                      style={[
                        styles.otpInput,
                        otp[index] ? styles.otpInputFilled : null,
                      ]}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={otp[index]}
                      onChangeText={(val) => handleOTPChange(val, index)}
                      onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                      textAlign="center"
                      autoFocus={index === 0}
                    />
                  ))}
                </View>

                {/* Resend OTP */}
                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={handleResendOTP}
                  disabled={isLoading || resendCount >= 3}
                >
                  <Text style={[
                    styles.resendText,
                    resendCount >= 3 && { color: colors.textTertiary },
                  ]}>
                    {resendCount >= 3
                      ? 'Max attempts reached'
                      : `Resend OTP${resendCount > 0 ? ` (${3 - resendCount} left)` : ''}`}
                  </Text>
                </TouchableOpacity>

                {/* Verify Button */}
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    (!canVerify || isLoading) && styles.disabledBtn,
                  ]}
                  onPress={handleVerify}
                  disabled={!canVerify || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.textOnPrimary} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Verify & Proceed</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.screenBg },
  safeArea: { flex: 1 },
  container: { flex: 1 },

  scrollContent: {
    flexGrow: 1,
  },

  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },

  content: {
    flex: 1,
    paddingHorizontal: spacing['2xl'],
    paddingTop: Platform.OS === 'android' ? spacing['2xl'] : spacing['4xl'],
  },
  title: {
    fontSize: fontSizes['3xl'],
    fontFamily: fonts.heavy,
    color: colors.primary,
    marginBottom: spacing.sm,
    // Android: fontWeight must NOT be combined with a custom fontFamily
    ...(Platform.OS === 'ios' ? { fontWeight: '700' } : {}),
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    fontFamily: fonts.body,
    marginBottom: spacing['3xl'],
    lineHeight: 22,
  },
  emailHighlight: {
    fontFamily: fonts.heavy,
    color: colors.textPrimary,
    ...(Platform.OS === 'ios' ? { fontWeight: '700' } : {}),
  },

  inputSection: {
    width: '100%',
  },
  label: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    ...(Platform.OS === 'ios' ? { fontWeight: '700' } : {}),
  },

  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: OTP_GAP,
  },
  otpInput: {
    width: OTP_BOX_SIZE,
    height: OTP_BOX_SIZE + 4, // slightly taller than wide for a nice aspect ratio
    backgroundColor: colors.cardBg,
    borderWidth: 1.5,
    borderColor: colors.borderInput,
    borderRadius: radii.sm,
    fontSize: fontSizes.xl,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
    // Prevent Android from adding extra padding inside the text input
    includeFontPadding: false,
    paddingVertical: 0,
  },
  otpInputFilled: {
    borderColor: colors.primary,
    backgroundColor: '#EEF2FF',
  },

  resendBtn: {
    alignSelf: 'flex-end',
    marginBottom: spacing['2xl'],
    paddingVertical: spacing.xs,
  },
  resendText: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontFamily: fonts.medium,
    ...(Platform.OS === 'ios' ? { fontWeight: '600' } : {}),
  },

  primaryBtn: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: colors.btnDisabled,
  },
  primaryBtnText: {
    color: colors.textOnPrimary,
    fontSize: fontSizes.base,
    fontFamily: fonts.medium,
    ...(Platform.OS === 'ios' ? { fontWeight: '700' } : {}),
  },
});
