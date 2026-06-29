import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';


export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const handleReset = () => { if (email.includes('@')) setIsSent(true); };

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40, height: 40, justifyContent: 'center' }}>
              <ChevronLeft size={28} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            <Text style={styles.title}>Reset Password</Text>
            {!isSent ? (
              <>
                <Text style={styles.subtitle}>Enter your registered email address and we'll send you a link to reset your password.</Text>
                <View style={styles.inputContainer}>
                  <Mail size={20} color={colors.textSecondary} style={{ marginRight: spacing.md }} />
                  <TextInput style={styles.input} placeholder="Email Address" placeholderTextColor={colors.textTertiary} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                </View>
                <TouchableOpacity style={[styles.primaryBtn, !email && styles.disabledBtn]} onPress={handleReset} disabled={!email}>
                  <Text style={styles.primaryBtnText}>Send Reset Link</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.subtitle}>A password reset link has been sent to {email}. Please check your inbox.</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.primaryBtnText}>Back to Login</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.screenBg },
  safe: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  content: { flex: 1, paddingHorizontal: spacing['2xl'], paddingTop: spacing['4xl'] },
  title: { fontSize: 28, fontWeight: '700', color: colors.primary, fontFamily: fonts.heavy, marginBottom: spacing.md },
  subtitle: { fontSize: fontSizes.base, color: colors.textSecondary, fontFamily: fonts.body, marginBottom: spacing['3xl'], lineHeight: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderWidth: 1.5, borderColor: colors.borderInput, borderRadius: radii.md, height: 50, marginBottom: spacing['2xl'], paddingHorizontal: spacing.md },
  input: { flex: 1, height: '100%', fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary },
  primaryBtn: { backgroundColor: colors.primary, height: 50, borderRadius: radii.md, justifyContent: 'center', alignItems: 'center' },
  disabledBtn: { backgroundColor: colors.btnDisabled },
  primaryBtnText: { color: colors.textOnPrimary, fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },
});
