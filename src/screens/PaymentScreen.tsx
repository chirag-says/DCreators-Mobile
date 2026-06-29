import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Platform, Alert, ActivityIndicator, Animated, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import {
  ArrowLeft, CheckCircle, CreditCard, Smartphone, Building2,
  Shield, Lock, X, AlertCircle,
} from 'lucide-react-native';
import TopHeader from '../components/TopHeader';
import { supabase } from '../lib/supabase';
import { updateProjectStatus } from '../services/projectService';
import { createCashfreeOrder, verifyPaymentStatus } from '../lib/cashfree';
import { sendNotification } from '../lib/notifications';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';


export default function PaymentScreen({ navigation, route }: any) {
  const project = route?.params?.project;
  const paymentType = route?.params?.paymentType || 'balance';
  const profile = useAuthStore((s) => s.profile);

  const [isPaying, setIsPaying] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [txnId, setTxnId] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const totalCost = project?.final_offer || project?.budget || 0;
  const budget = project?.budget ? Number(project.budget) : 0;
  const advance = Math.round(budget * 0.5);
  const balance = totalCost - advance;
  const payAmount = paymentType === 'advance' ? advance : balance;

  useEffect(() => {
    if (isPaid) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start();
    }
  }, [isPaid]);

  async function handlePayPress() {
    if (!profile?.email) {
      Alert.alert('Error', 'User profile not found. Please log in again.');
      return;
    }

    // For balance payment: transition final_approved → balance_pending before opening gateway
    if (paymentType === 'balance' && project?.id) {
      try { await updateProjectStatus(project.id, 'balance_pending'); }
      catch (err: any) { Alert.alert('Error', err.message); return; }
    }

    setIsPaying(true);
    try {
      const order = await createCashfreeOrder({
        projectId: project?.id,
        amount: payAmount,
        paymentType,
        customerName: profile.name || 'User',
        customerEmail: profile.email,
        customerPhone: profile.phone || undefined,
      });

      setCurrentOrderId(order.order_id);
      const env = order.environment === 'PROD' ? 'production' : 'sandbox';
      const checkoutPage = buildCheckoutHtml(order.payment_session_id, env);
      setCheckoutUrl(checkoutPage);
      setShowWebView(true);
    } catch (err: any) {
      Alert.alert('Payment Error', err.message || 'Could not create payment order. Please try again.');
    } finally {
      setIsPaying(false);
    }
  }

  function buildCheckoutHtml(sessionId: string, env: string): string {
    // Generate an HTML page that loads Cashfree's JS SDK and triggers checkout
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
        <style>
          body { margin: 0; padding: 20px; background: #F5F5F5; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          .loading { text-align: center; color: #666; }
          .loading h3 { color: #1B3A5C; margin-bottom: 8px; }
          .spinner { width: 40px; height: 40px; border: 4px solid #E5E7EB; border-top: 4px solid #1B3A5C; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto; }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="loading">
          <div class="spinner"></div>
          <h3>Opening Payment Gateway...</h3>
          <p>Please wait while we redirect you to Cashfree</p>
        </div>
        <script>
          const cashfree = Cashfree({ mode: "${env}" });
          
          cashfree.checkout({
            paymentSessionId: "${sessionId}",
            redirectTarget: "_self",
          }).then(function(result) {
            if (result.error) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: result.error.message }));
            }
            if (result.paymentDetails) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', data: result.paymentDetails }));
            }
          }).catch(function(err) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: err.message || 'Payment failed' }));
          });
        </script>
      </body>
      </html>
    `;
  }

  async function handleWebViewMessage(event: any) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'success') {
        setShowWebView(false);
        await handlePaymentComplete();
      } else if (data.type === 'error') {
        setShowWebView(false);
        Alert.alert('Payment Failed', data.message || 'Something went wrong.');
      }
    } catch {}
  }

  function handleWebViewNavigationChange(navState: any) {
    const { url } = navState;
    // Detect return URL — Cashfree redirects back after payment
    if (url.includes('payment/callback') || url.includes('order_id=')) {
      setShowWebView(false);
      handlePaymentComplete();
    }
  }

  async function handlePaymentComplete() {
    setVerifying(true);
    try {
      const result = await verifyPaymentStatus(currentOrderId);

      if (result.status === 'completed') {
        setTxnId(result.cashfreePaymentId || currentOrderId);

        if (project?.id) {
          // advance path: advance_pending → advance_paid
          // balance path: balance_pending → balance_paid (balance_pending was set in handlePayPress)
          const newStatus = paymentType === 'advance' ? 'advance_paid' : 'balance_paid';
          await updateProjectStatus(project.id, newStatus);

          if (project.consultant_id) {
            sendNotification({
              userId: project.consultant_id,
              title: paymentType === 'advance' ? 'Advance Payment Received' : 'Balance Payment Received',
              message: paymentType === 'advance'
                ? `Client paid the advance of ₹${payAmount.toLocaleString('en-IN')}. Please generate the Work Order.`
                : `Client paid the balance of ₹${payAmount.toLocaleString('en-IN')}. Deliver the final files!`,
              type: 'payment',
            });
          }
        }

        setIsPaid(true);
      } else if (result.status === 'failed') {
        Alert.alert('Payment Failed', 'Your payment was not successful. Please try again.');
      } else {
        Alert.alert(
          'Still Processing',
          "We haven't received confirmation from the bank yet. This can take a few minutes — we'll send you a notification the moment it's confirmed. No need to retry the payment.",
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (err: any) {
      Alert.alert('Verification Error', err.message || 'Could not verify payment status.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopHeader />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>

            <View style={styles.titleRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <ArrowLeft size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.pageTitle}>
                {paymentType === 'advance' ? 'Advance Payment' : 'Balance Payment'}
              </Text>
              <View style={{ width: 36 }} />
            </View>

            {isPaid ? (
              <Animated.View style={[styles.successCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                <CheckCircle size={56} color={colors.success} />
                <Text style={styles.successTitle}>Payment Successful!</Text>
                <Text style={styles.successAmount}>₹{payAmount.toLocaleString()}</Text>
                <View style={styles.receiptBox}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Order ID</Text>
                    <Text style={styles.receiptValue} numberOfLines={1}>{currentOrderId}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Payment ID</Text>
                    <Text style={styles.receiptValue} numberOfLines={1}>{txnId}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Gateway</Text>
                    <Text style={styles.receiptValue}>Cashfree</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Status</Text>
                    <Text style={[styles.receiptValue, { color: colors.success }]}>Completed ✓</Text>
                  </View>
                </View>
                <Text style={styles.successNote}>
                  {paymentType === 'advance'
                    ? 'Advance paid. Generate the Work Order to begin the project.'
                    : 'Balance paid. Your project is complete! 🎉'}
                </Text>
                {paymentType === 'advance' ? (
                  <TouchableOpacity
                    style={styles.doneBtn}
                    onPress={() => {
                      navigation.replace('PaymentConfirmed', {
                        transactionId: txnId || `DC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
                        amountPaid: payAmount,
                        paidAt: new Date().toISOString(),
                        projectId: project?.id,
                        paymentType: 'advance',
                        project,
                      });
                    }}
                  >
                    <Text style={styles.doneBtnText}>View Confirmation →</Text>
                  </TouchableOpacity>
                ) : (
                  // balance: PaymentConfirmedScreen fires balance_paid→delivered then shows Rate CTA
                  <TouchableOpacity
                    style={styles.doneBtn}
                    onPress={() => navigation.replace('PaymentConfirmed', {
                      transactionId: txnId || `DC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
                      amountPaid: payAmount,
                      paidAt: new Date().toISOString(),
                      projectId: project?.id,
                      paymentType: 'balance',
                      project,
                    })}
                  >
                    <Text style={styles.doneBtnText}>View Confirmation →</Text>
                  </TouchableOpacity>
                )}

              </Animated.View>
            ) : verifying ? (
              <View style={styles.verifyingCard}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.verifyingTitle}>Verifying Payment...</Text>
                <Text style={styles.verifyingSubtitle}>
                  Please wait while we confirm your payment with Cashfree.
                </Text>
              </View>
            ) : (
              <>
                {/* Cost Breakdown */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Payment Summary</Text>
                  {/* Project title row */}
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Project</Text>
                    <Text style={[styles.costValue, { maxWidth: '60%' }]} numberOfLines={1}>
                      {project?.assignment_details?.[0] || project?.assignment_type || 'Creative Service'}
                    </Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Total Project Fee</Text>
                    <Text style={styles.costValue}>₹{Number(totalCost).toLocaleString()}</Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Advance (50%)</Text>
                    <Text style={styles.costValue}>₹{advance.toLocaleString()}</Text>
                  </View>
                  {paymentType === 'balance' && (
                    <View style={styles.costRow}>
                      <Text style={styles.costLabel}>Advance Received</Text>
                      <Text style={[styles.costValue, { color: colors.success }]}>- ₹{advance.toLocaleString()}</Text>
                    </View>
                  )}
                  <View style={styles.divider} />
                  <View style={styles.costRow}>
                    <Text style={styles.totalLabel}>Pay Now</Text>
                    <Text style={styles.totalValue}>₹{payAmount.toLocaleString()}</Text>
                  </View>
                </View>

                {/* Payment Info */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Payment Gateway</Text>
                  <View style={styles.gatewayInfo}>
                    <View style={styles.gatewayBadge}>
                      <Text style={styles.gatewayBadgeText}>Cashfree</Text>
                    </View>
                    <Text style={styles.gatewayDesc}>
                      You'll be redirected to Cashfree's secure payment page where you can pay using UPI, Cards, Net Banking, or Wallets.
                    </Text>
                  </View>
                  <View style={styles.methodsList}>
                    <View style={styles.methodChip}>
                      <Smartphone size={16} color={colors.primary} />
                      <Text style={styles.methodChipText}>UPI</Text>
                    </View>
                    <View style={styles.methodChip}>
                      <CreditCard size={16} color={colors.primary} />
                      <Text style={styles.methodChipText}>Cards</Text>
                    </View>
                    <View style={styles.methodChip}>
                      <Building2 size={16} color={colors.primary} />
                      <Text style={styles.methodChipText}>Net Banking</Text>
                    </View>
                  </View>
                </View>

                {/* Security Badge */}
                <View style={styles.securityRow}>
                  <Shield size={16} color={colors.success} />
                  <Text style={styles.securityText}>PCI DSS Compliant · Secured by Cashfree</Text>
                  <Lock size={14} color={colors.success} />
                </View>
              </>
            )}
          </View>
        </ScrollView>

        {/* Pay Button */}
        {!isPaid && !verifying && (
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={[styles.payBtn, isPaying && { opacity: 0.6 }]}
              onPress={handlePayPress}
              disabled={isPaying}
            >
              {isPaying ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Lock size={18} color={colors.textOnPrimary} />
                  <Text style={styles.payBtnText}>  Pay ₹{payAmount.toLocaleString()}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Cashfree WebView Checkout Modal ── */}
        <Modal visible={showWebView} animationType="slide" onRequestClose={() => setShowWebView(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
            <View style={styles.webViewHeader}>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Cancel Payment?',
                    'Are you sure you want to cancel this payment?',
                    [
                      { text: 'No', style: 'cancel' },
                      { text: 'Yes, Cancel', style: 'destructive', onPress: () => setShowWebView(false) },
                    ]
                  );
                }}
              >
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.webViewTitle}>Cashfree Checkout</Text>
              <Lock size={18} color={colors.success} />
            </View>
            <WebView
              source={{ html: checkoutUrl }}
              style={{ flex: 1 }}
              onMessage={handleWebViewMessage}
              onNavigationStateChange={handleWebViewNavigationChange}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FFF' }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={{ marginTop: 12, color: colors.textSecondary, fontFamily: fonts.body }}>Loading payment page...</Text>
                </View>
              )}
            />
          </SafeAreaView>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.screenBg },
  safe: { flex: 1 },
  container: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },

  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: fontSizes.xl, fontFamily: fonts.heavy, color: colors.textPrimary },

  card: {
    backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: '#E6E6E6',
    borderRadius: radii.lg, padding: spacing.xl - 2, marginBottom: spacing.xl - 2, ...shadows.card,
  },
  cardTitle: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textPrimary, marginBottom: 14 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  costLabel: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary },
  costValue: { fontSize: fontSizes.sm + 1, fontFamily: fonts.medium, color: colors.textPrimary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  totalLabel: { fontSize: fontSizes.md, fontFamily: fonts.heavy, color: colors.primary, fontWeight: '700' },
  totalValue: { fontSize: fontSizes.lg + 1, fontFamily: fonts.heavy, color: colors.primary, fontWeight: '700' },

  // Gateway info
  gatewayInfo: { marginBottom: spacing.md },
  gatewayBadge: {
    alignSelf: 'flex-start', backgroundColor: '#EEF2FF',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.md, marginBottom: spacing.sm,
  },
  gatewayBadgeText: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.primary, fontFamily: fonts.heavy },
  gatewayDesc: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20 },

  methodsList: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  methodChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.full,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: colors.borderInput,
  },
  methodChipText: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.textSecondary, fontFamily: fonts.medium },

  securityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  securityText: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textTertiary },

  // Success
  successCard: {
    alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radii.xl, padding: spacing['2xl'], marginTop: spacing.xl, gap: spacing.md, ...shadows.card,
  },
  successTitle: { fontSize: 22, fontFamily: fonts.heavy, color: colors.success },
  successAmount: { fontSize: 32, fontFamily: fonts.heavy, color: colors.textPrimary },
  successNote: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  receiptBox: { width: '100%', backgroundColor: colors.sectionBg, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between' },
  receiptLabel: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textTertiary },
  receiptValue: { fontSize: fontSizes.sm, fontFamily: fonts.heavy, color: colors.textPrimary, maxWidth: '60%' },
  doneBtn: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: spacing['4xl'], borderRadius: radii.md, marginTop: spacing.md },
  doneBtnText: { color: colors.textOnPrimary, fontSize: fontSizes.md, fontWeight: '700', fontFamily: fonts.heavy },

  // Verifying
  verifyingCard: {
    alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radii.xl, padding: spacing['2xl'], marginTop: spacing.xl, gap: spacing.md, ...shadows.card,
  },
  verifyingTitle: { fontSize: fontSizes.xl, fontFamily: fonts.heavy, color: colors.textPrimary },
  verifyingSubtitle: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center' },

  actionBar: {
    paddingHorizontal: spacing.xl, paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 14,
    backgroundColor: colors.cardBg, borderTopWidth: 1, borderTopColor: colors.borderCard,
  },
  payBtn: {
    backgroundColor: colors.success, paddingVertical: spacing.lg, borderRadius: radii.lg,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
  },
  payBtnText: { color: colors.textOnPrimary, fontSize: fontSizes.lg + 1, fontWeight: '700', fontFamily: fonts.heavy },

  // WebView Modal
  webViewHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderCard,
    backgroundColor: '#FFF',
  },
  webViewTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy },
});
