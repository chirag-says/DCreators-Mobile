/**
 * PaymentConfirmedScreen  (Phase 6.4)
 * Figma: CLIENT_PROJECT_STARTED_SCREEN.png
 * "Payment Confirmed" — post-advance-payment success screen
 * — Large teal checkmark circle
 * — Transaction ID, Amount Paid, Date & Time
 * — Confirmation copy + support link
 * — "View Project Dashboard" CTA
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Bell, Info, Download, Star } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes } from '../styles/theme';
import { updateProjectStatus } from '../services/projectService';

const NAVY   = '#1B3A5C';
const TEAL   = '#3D9B8F';
const BG     = '#F0F4F8';

interface Props {
  navigation: any;
  route: {
    params?: {
      transactionId?: string;
      amountPaid?: number;
      paidAt?: string;
      projectId?: string;
      paymentType?: 'advance' | 'balance';
      project?: any;
    };
  };
}

export default function PaymentConfirmedScreen({ navigation, route }: Props) {
  const profile       = useAuthStore(s => s.profile);
  const transactionId = route?.params?.transactionId ?? 'DC-77XC-901';
  const amountPaid    = route?.params?.amountPaid ?? 1300;
  const paidAt        = route?.params?.paidAt ?? new Date().toISOString();
  const projectId     = route?.params?.projectId;
  const paymentType   = route?.params?.paymentType ?? 'advance';
  const project       = route?.params?.project;
  const [delivered, setDelivered] = useState(false);

  const scaleAnim  = useRef(new Animated.Value(0)).current;
  const opacityAnim= useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 6, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    // balance_paid → delivered: final files now accessible
    if (paymentType === 'balance' && projectId) {
      updateProjectStatus(projectId, 'delivered')
        .then(() => setDelivered(true))
        .catch((e) => console.log('[PaymentConfirmed] delivered transition:', e.message));
    }
  }, []);

  const formattedDate = new Date(paidAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  }) + ', ' + new Date(paidAt).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.logoWrap}>
          <Text style={s.logoText}>D</Text>
        </View>
        <Text style={s.tagline}>Hire creatives. Buy art. Build ideas.</Text>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.7}>
            <Bell size={18} color={NAVY} />
          </TouchableOpacity>
          {profile?.avatar_url
            ? <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
            : <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarInit}>{(profile?.name ?? 'U').charAt(0).toUpperCase()}</Text>
              </View>
          }
        </View>
      </View>

      {/* Body */}
      <View style={s.body}>
        {/* Checkmark */}
        <Animated.View style={[s.checkWrap, { transform: [{ scale: scaleAnim }] }]}>
          <CheckCircle size={72} color="#fff" strokeWidth={2.5} />
        </Animated.View>

        <Animated.View style={{ opacity: opacityAnim, alignItems: 'center', width: '100%' }}>
          <Text style={s.title}>Payment Confirmed</Text>
          <Text style={s.subtitle}>
            Thank you! Your payment has been{'\n'}successfully received.
          </Text>

          {/* Transaction details card */}
          <View style={s.detailsCard}>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>TRANSACTION ID</Text>
              <Text style={s.detailValue}>{transactionId}</Text>
            </View>
            <View style={s.detailDivider} />
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>AMOUNT PAID</Text>
              <Text style={[s.detailValue, s.detailValueTeal]}>
                ₹{amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={s.detailDivider} />
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>DATE & TIME</Text>
              <Text style={s.detailValue}>{formattedDate}</Text>
            </View>
          </View>

          {/* Confirmation copy */}
          <Text style={s.confirmCopy}>
            Your order has been confirmed{'\n'}
            and is now being processed. A confirmation{'\n'}
            receipt has been sent to your registered email{'\n'}
            address.
          </Text>

          {/* Support note */}
          <View style={s.supportBanner}>
            <Info size={16} color={NAVY} />
            <Text style={s.supportText}>
              For any queries, please{' '}
              <Text style={s.supportLink}>contact our support team</Text>.
            </Text>
          </View>

          {/* CTA */}
          {paymentType === 'balance' ? (
            <>
              {/* Download gating: enabled only after balance_paid→delivered */}
              <TouchableOpacity
                style={[s.dashboardBtn, !delivered && { opacity: 0.5 }]}
                disabled={!delivered}
                onPress={() => navigation.navigate('RateConsultant', { project })}
                activeOpacity={0.85}
              >
                <Text style={s.dashboardBtnText}>⭐ Rate Your Experience</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.dashboardBtn, { marginTop: 10, backgroundColor: '#0D7F7A' }]}
                onPress={() => navigation.navigate('Main', { screen: 'Dashboard' })}
                activeOpacity={0.85}
              >
                <Text style={s.dashboardBtnText}>Back to Dashboard</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={s.dashboardBtn}
              onPress={() => navigation.navigate('Dashboard')}
              activeOpacity={0.85}
            >
              <Text style={s.dashboardBtnText}>View Project Dashboard</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, gap: 10 },
  logoWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontSize: 18, fontWeight: '900', fontFamily: fonts.heavy },
  tagline: { flex: 1, fontSize: 11, fontFamily: fonts.body, color: colors.textTertiary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: { backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  avatarInit: { color: '#fff', fontSize: 14, fontWeight: '800', fontFamily: fonts.heavy },
  // Body
  body: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 30 },
  // Checkmark
  checkWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  title: { fontSize: 30, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY, textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  // Details card
  detailsCard: { width: '100%', backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', padding: 20, marginBottom: 22, gap: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { fontSize: fontSizes.xs + 1, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.5 },
  detailValue: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  detailValueTeal: { color: TEAL, fontSize: fontSizes.xl },
  detailDivider: { height: 1, backgroundColor: '#F3F4F6' },
  // Copy
  confirmCopy: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 18 },
  // Support
  supportBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EEF2FF', borderRadius: 12, padding: 14, marginBottom: 28, width: '100%' },
  supportText: { flex: 1, fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: NAVY, lineHeight: 20 },
  supportLink: { color: NAVY, fontWeight: '700', fontFamily: fonts.heavy, textDecorationLine: 'underline' },
  // CTA
  dashboardBtn: { width: '100%', backgroundColor: NAVY, borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  dashboardBtnText: { color: '#fff', fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy },
});
