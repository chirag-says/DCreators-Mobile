/**
 * ARTWORK_PAYMENT_SCREEN  (Phase 4.4)
 * owner_role: BUYER
 * Figma: ARTIST_ORDER_COMPLETION_SCREEN.png (V1 = balance, V2 = advance)
 * Covers both paymentType: 'artwork_advance' and 'artwork_balance'
 * Status transitions:
 *   advance: accepted → advance_paid  (artist can now ship)
 *   balance:  delivered → completed
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, ActivityIndicator, Alert, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, CreditCard, Smartphone, ShieldCheck, Lock,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { sendNotification } from '../lib/notifications';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import type { ArtworkOrder } from '../types';

const NAVY = '#1B3A5C';
const TEAL = '#3D9B8F';

type PaymentType = 'artwork_advance' | 'artwork_balance';
type PaymentMethod = 'card' | 'wallet';

export default function ArtworkPaymentScreen({ navigation, route }: any) {
  const order: ArtworkOrder = route?.params?.order;
  const paymentType: PaymentType = route?.params?.paymentType ?? 'artwork_advance';

  const isBalance  = paymentType === 'artwork_balance';
  const totalDue   = isBalance ? (order?.balance_amount ?? 0) : (order?.advance_amount ?? 0);
  const platformFee = Math.round(totalDue * 0.05);
  const tax         = Math.round(totalDue * 0.01);
  const grandTotal  = totalDue + platformFee + tax;

  const [method,      setMethod]      = useState<PaymentMethod>('card');
  const [cardName,    setCardName]    = useState('');
  const [cardNumber,  setCardNumber]  = useState('');
  const [expiry,      setExpiry]      = useState('');
  const [cvv,         setCvv]         = useState('');
  const [paying,      setPaying]      = useState(false);
  const [paid,        setPaid]        = useState(false);

  async function handlePay() {
    if (method === 'card') {
      if (!cardName.trim() || cardNumber.length < 16 || expiry.length < 5 || cvv.length < 3) {
        Alert.alert('Incomplete Details', 'Please fill in all card details correctly.'); return;
      }
    }
    if (!order?.id) { Alert.alert('Error', 'Order data missing.'); return; }
    setPaying(true);
    try {
      const newStatus = isBalance ? 'completed' : 'advance_paid';
      await supabase.from('artwork_orders').update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', order.id);

      // Record payment
      await supabase.from('artwork_payments').insert({
        order_id:     order.id,
        payer_id:     order.buyer_id,
        amount:       grandTotal,
        payment_type: paymentType,
        status:       'completed',
        created_at:   new Date().toISOString(),
      });

      // Notify artist
      sendNotification({
        userId: order.artist_id,
        title: isBalance ? '💰 Balance Payment Received!' : '💳 Advance Payment Received!',
        message: isBalance
          ? `Buyer completed the balance payment of ₹${grandTotal.toLocaleString('en-IN')}. Funds released.`
          : `Buyer paid the advance of ₹${grandTotal.toLocaleString('en-IN')}. Please ship the artwork.`,
        type: 'payment',
      });

      setPaid(true);
    } catch (e: any) { Alert.alert('Payment Error', e.message); }
    finally { setPaying(false); }
  }

  /* ── Success view ── */
  if (paid) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.successWrap}>
          <Text style={s.successEmoji}>{isBalance ? '🎉' : '✅'}</Text>
          <Text style={s.successTitle}>{isBalance ? 'Order Completed!' : 'Advance Paid!'}</Text>
          <Text style={s.successSub}>
            {isBalance
              ? 'The artist has been paid. Your order is now closed.'
              : 'The artist has been notified and will ship your artwork shortly.'}
          </Text>
          <View style={s.successReceipt}>
            <Text style={s.receiptRow}><Text style={s.receiptLabel}>Amount Paid  </Text>₹{grandTotal.toLocaleString('en-IN')}</Text>
            <Text style={s.receiptRow}><Text style={s.receiptLabel}>Order ID       </Text>ART-{order.id.slice(0,8).toUpperCase()}</Text>
          </View>
          <TouchableOpacity
            style={s.doneBtn}
            onPress={() => navigation.navigate('ArtworkOrderTracking', { orderId: order.id })}
            activeOpacity={0.85}
          >
            <Text style={s.doneBtnText}>{isBalance ? 'Close Order' : 'Track Artwork'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Card number formatter ── */
  function formatCard(val: string) {
    const digits = val.replace(/\D/g,'').slice(0,16);
    return digits.replace(/(.{4})/g,'$1 ').trim();
  }
  function formatExpiry(val: string) {
    const digits = val.replace(/\D/g,'').slice(0,4);
    if (digits.length > 2) return digits.slice(0,2) + '/' + digits.slice(2);
    return digits;
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.headerRow}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={18} color={NAVY} />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Complete Payment for{'\n'}{isBalance ? 'Buy Product' : 'Hire & Assign Project'}</Text>
        </View>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <Text style={s.subtitle}>
          Review your order details and select a secure payment method to finalize the acquisition.
        </Text>

        {/* Payment Method card */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Payment Method</Text>

          <TouchableOpacity
            style={[s.methodOption, method === 'card' && s.methodOptionActive]}
            onPress={() => setMethod('card')}
            activeOpacity={0.85}
          >
            <CreditCard size={20} color={method === 'card' ? NAVY : colors.textTertiary} />
            <View style={{ flex: 1 }}>
              <Text style={[s.methodLabel, method === 'card' && { color: NAVY }]}>CREDIT / DEBIT CARD</Text>
              <Text style={s.methodSub}>Visa, Mastercard, AMEX</Text>
            </View>
            <View style={[s.radioOuter, method === 'card' && s.radioOuterActive]}>
              {method === 'card' && <View style={s.radioInner} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.methodOption, method === 'wallet' && s.methodOptionActive]}
            onPress={() => setMethod('wallet')}
            activeOpacity={0.85}
          >
            <Smartphone size={20} color={method === 'wallet' ? NAVY : colors.textTertiary} />
            <View style={{ flex: 1 }}>
              <Text style={[s.methodLabel, method === 'wallet' && { color: NAVY }]}>DIGITAL WALLET</Text>
              <Text style={s.methodSub}>Apple Pay, Google Pay</Text>
            </View>
            <View style={[s.radioOuter, method === 'wallet' && s.radioOuterActive]}>
              {method === 'wallet' && <View style={s.radioInner} />}
            </View>
          </TouchableOpacity>

          {method === 'card' && (
            <View style={s.cardForm}>
              <Text style={s.fieldLabel}>Cardholder Name</Text>
              <TextInput
                style={s.input}
                placeholder="Alex Rivera"
                placeholderTextColor={colors.textTertiary}
                value={cardName}
                onChangeText={setCardName}
                autoCapitalize="words"
              />
              <Text style={s.fieldLabel}>Card Number</Text>
              <View style={s.inputRow}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  placeholder="**** **** **** 4421"
                  placeholderTextColor={colors.textTertiary}
                  value={cardNumber}
                  onChangeText={v => setCardNumber(formatCard(v))}
                  keyboardType="numeric"
                  maxLength={19}
                />
                <CreditCard size={18} color={colors.textTertiary} style={{ position: 'absolute', right: 14, top: 14 }} />
              </View>
              <View style={s.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Expiry Date</Text>
                  <TextInput
                    style={s.input}
                    placeholder="MM/YY"
                    placeholderTextColor={colors.textTertiary}
                    value={expiry}
                    onChangeText={v => setExpiry(formatExpiry(v))}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>CVV</Text>
                  <TextInput
                    style={s.input}
                    placeholder="***"
                    placeholderTextColor={colors.textTertiary}
                    value={cvv}
                    onChangeText={v => setCvv(v.replace(/\D/g,'').slice(0,4))}
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={4}
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Security banner */}
        <View style={s.secBanner}>
          <ShieldCheck size={16} color={TEAL} />
          <Text style={s.secText}>
            Your transaction is encrypted and secured by high-standard industry protocols.
          </Text>
        </View>

        {/* Order Summary */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Order Summary</Text>
          <View style={s.summaryProduct}>
            {order?.shop_products?.images?.[0]
              ? <Image source={{ uri: order.shop_products.images[0] }} style={s.summaryImg} />
              : <View style={[s.summaryImg, s.summaryImgPlaceholder]} />
            }
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.summaryTitle}>{order?.shop_products?.title ?? 'Untitled'}</Text>
              <Text style={s.summaryDesc} numberOfLines={2}>{order?.shop_products?.description ?? 'Artwork'}</Text>
              <Text style={s.summaryId}>ID: ART-{order?.id?.slice(0,8).toUpperCase() ?? '—'}</Text>
            </View>
          </View>
          <View style={s.divider} />
          <View style={s.feeRow}><Text style={s.feeLabel}>Artwork Price</Text><Text style={s.feeValue}>₹{totalDue.toLocaleString('en-IN')}</Text></View>
          <View style={s.feeRow}><Text style={s.feeLabel}>Platform Fee (5%)</Text><Text style={s.feeValue}>₹{platformFee.toLocaleString('en-IN')}</Text></View>
          <View style={s.feeRow}><Text style={s.feeLabel}>Estimated Tax</Text><Text style={s.feeValue}>₹{tax.toLocaleString('en-IN')}</Text></View>
          <View style={[s.feeRow, s.totalRow]}>
            <Text style={s.totalLabel}>Total Amount</Text>
            <Text style={s.totalValue}>{grandTotal.toLocaleString('en-IN')}</Text>
          </View>

          <TouchableOpacity
            style={[s.payBtn, paying && { opacity: 0.6 }]}
            onPress={handlePay}
            disabled={paying}
            activeOpacity={0.85}
          >
            {paying
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Lock size={16} color="#fff" />
                  <Text style={s.payBtnText}>Pay Now</Text>
                </>
            }
          </TouchableOpacity>

          <Text style={s.termsNote}>
            By clicking Pay Now, you agree to the{' '}
            <Text style={s.termsLink} onPress={() => Linking.openURL('https://dcreators.in/terms')}>
              Terms of Service
            </Text>.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screenBg },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.borderCard },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.screenBg, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: fontSizes['2xl'], fontWeight: '900', fontFamily: fonts.heavy, color: NAVY, lineHeight: 30 },
  subtitle: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20, marginHorizontal: 20, marginTop: 16, marginBottom: 20 },
  scroll: { paddingBottom: 40 },
  section: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 20, marginBottom: 16, padding: 20, borderWidth: 1, borderColor: colors.borderCard },
  sectionTitle: { fontSize: fontSizes.lg, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY, marginBottom: 16 },
  methodOption: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: colors.borderInput, borderRadius: 12, padding: 14, marginBottom: 10 },
  methodOptionActive: { borderColor: NAVY, backgroundColor: '#F0F2F8' },
  methodLabel: { fontSize: fontSizes.sm, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textSecondary },
  methodSub: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 2 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.borderInput, alignItems: 'center', justifyContent: 'center' },
  radioOuterActive: { borderColor: NAVY },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: NAVY },
  cardForm: { marginTop: 8, gap: 4 },
  fieldLabel: { fontSize: fontSizes.xs + 1, fontWeight: '600', fontFamily: fonts.medium, color: colors.textPrimary, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: colors.inputBg, borderRadius: 10, borderWidth: 1, borderColor: colors.borderInput, paddingHorizontal: 14, paddingVertical: 13, fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary },
  inputRow: { position: 'relative' },
  twoCol: { flexDirection: 'row', gap: 12 },
  secBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 20, marginBottom: 16, backgroundColor: '#EEF9F8', borderRadius: 12, padding: 14 },
  secText: { flex: 1, fontSize: fontSizes.sm, fontFamily: fonts.body, color: TEAL, lineHeight: 18 },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 12 },
  summaryProduct: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryImg: { width: 60, height: 60, borderRadius: 10 },
  summaryImgPlaceholder: { backgroundColor: '#E5E7EB' },
  summaryTitle: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  summaryDesc: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 16 },
  summaryId: { fontSize: fontSizes.xs + 1, fontWeight: '700', fontFamily: fonts.heavy, color: TEAL },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  feeLabel: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary },
  feeValue: { fontSize: fontSizes.sm + 1, fontFamily: fonts.medium, color: colors.textPrimary },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 12, marginTop: 4, marginBottom: 0 },
  totalLabel: { fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  totalValue: { fontSize: fontSizes.xl, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY },
  payBtn: { backgroundColor: NAVY, borderRadius: 12, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  payBtnText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy },
  termsNote: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textTertiary, textAlign: 'center', marginTop: 10 },
  termsLink: { textDecorationLine: 'underline', color: TEAL },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  successEmoji: { fontSize: 60 },
  successTitle: { fontSize: 32, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY },
  successSub: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  successReceipt: { backgroundColor: '#F8F9FB', borderRadius: 14, padding: 16, width: '100%', gap: 8 },
  receiptRow: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textPrimary },
  receiptLabel: { fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  doneBtn: { backgroundColor: NAVY, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 16, marginTop: 8 },
  doneBtnText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },
});
