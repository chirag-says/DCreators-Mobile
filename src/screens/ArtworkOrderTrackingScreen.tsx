/**
 * ARTWORK_ORDER_TRACKING_SCREEN  (Phase 4.3)
 * owner_role: BUYER
 * Figma: ARTIST_ORDER_TRACKING_SCREEN.png
 * Status machine view: requested → accepted → advance_paid → dispatched → delivered → completed
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Package, Truck, CheckCircle2, Clock, CreditCard, Star } from 'lucide-react-native';
import { fetchArtworkOrderById, updateArtworkOrderStatus } from '../services/artworkService';
import { sendNotification } from '../lib/notifications';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import type { ArtworkOrder, ArtworkOrderStatus } from '../types';

const NAVY = '#1B3A5C';
const ORANGE = '#E87B35';
const TEAL = '#3D9B8F';

const STEPS: { key: ArtworkOrderStatus; label: string }[] = [
  { key: 'requested',    label: 'Request Sent' },
  { key: 'accepted',     label: 'Accepted by Artist' },
  { key: 'advance_paid', label: 'Advance Paid' },
  { key: 'dispatched',   label: 'Artwork Dispatched' },
  { key: 'delivered',    label: 'Delivered' },
  { key: 'completed',    label: 'Completed' },
];

const STATUS_ORDER: ArtworkOrderStatus[] = ['requested','accepted','advance_paid','dispatched','delivered','completed'];

function stepIndex(s: ArtworkOrderStatus) { return STATUS_ORDER.indexOf(s); }

export default function ArtworkOrderTrackingScreen({ navigation, route }: any) {
  const { orderId } = route?.params ?? {};
  const [order, setOrder] = useState<ArtworkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => { fetchOrder(); }, [orderId]);

  async function fetchOrder() {
    if (!orderId) return;
    setLoading(true);
    try {
      const data = await fetchArtworkOrderById(
        orderId,
        '*, shop_products(title,images,category,price,description), artist_profile:profiles!artist_id(name,avatar_url)'
      );
      setOrder(data);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }

  async function handleConfirmDelivery() {
    if (!order) return;
    Alert.alert('Confirm Delivery?', 'Confirming receipt will release the balance payment to the artist.', [
      { text: 'Cancel' },
      { text: 'Confirm', onPress: async () => {
        setConfirming(true);
        try {
          await updateArtworkOrderStatus(order.id, 'delivered');
          sendNotification({ userId: order.artist_id, title: '✅ Delivery Confirmed!', message: 'Buyer confirmed receipt. Balance will be released.', type: 'payment' });
          Alert.alert('Delivery Confirmed!', 'Please proceed to pay the balance.', [
            { text: 'Pay Balance', onPress: () => navigation.replace('ArtworkPayment', { order: { ...order, status: 'delivered' }, paymentType: 'balance' }) },
          ]);
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setConfirming(false); }
      }},
    ]);
  }

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator size="large" color={NAVY} style={{ flex: 1 }} /></SafeAreaView>;
  if (!order)  return <SafeAreaView style={s.safe}><View style={s.center}><Text style={s.emptyText}>Order not found.</Text></View></SafeAreaView>;

  const artwork     = order.shop_products;
  const coverImage  = artwork?.images?.[0] ?? null;
  const currIdx     = stepIndex(order.status);
  const isDispatched = currIdx >= stepIndex('dispatched');
  const isDelivered  = currIdx >= stepIndex('delivered');
  const isCompleted  = order.status === 'completed';

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.headerRow}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={18} color={NAVY} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Order Tracking</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Artwork card */}
        <View style={s.artCard}>
          {coverImage
            ? <Image source={{ uri: coverImage }} style={s.artImg} resizeMode="cover" />
            : <View style={[s.artImg, s.artPlaceholder]} />
          }
          <View style={s.artInfo}>
            <Text style={s.artTitle}>{artwork?.title ?? 'Untitled'}</Text>
            <Text style={s.artCategory}>{artwork?.category ?? 'Artwork'}</Text>
            <Text style={s.artDesc} numberOfLines={2}>{artwork?.description ?? ''}</Text>
            <Text style={s.artId}>ID: ART-{order.id.slice(0, 8).toUpperCase()}</Text>
          </View>
        </View>

        {/* Progress timeline */}
        <View style={s.timelineCard}>
          <Text style={s.timelineHeading}>Order Status</Text>
          {STEPS.map((step, i) => {
            const done    = i <= currIdx;
            const current = i === currIdx;
            const isLast  = i === STEPS.length - 1;
            return (
              <View key={step.key} style={s.stepRow}>
                <View style={s.stepLeft}>
                  <View style={[s.stepDot, done ? s.stepDotDone : s.stepDotPending, current && s.stepDotCurrent]}>
                    {done && !current && <CheckCircle2 size={12} color="#fff" />}
                    {current && <Clock size={12} color="#fff" />}
                  </View>
                  {!isLast && <View style={[s.stepLine, done && s.stepLineDone]} />}
                </View>
                <Text style={[s.stepLabel, done ? s.stepLabelDone : s.stepLabelPending, current && s.stepLabelCurrent]}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Consignment info */}
        {isDispatched && order.consignment_no && (
          <View style={s.consignCard}>
            <View style={s.consignHeader}>
              <Truck size={16} color={TEAL} />
              <Text style={s.consignTitle}>Tracking Info</Text>
            </View>
            <Text style={s.consignLabel}>Consignment Number</Text>
            <Text style={s.consignNo}>{order.consignment_no}</Text>
          </View>
        )}

        {/* Payment summary */}
        <View style={s.payCard}>
          <View style={s.payHeader}>
            <CreditCard size={16} color={TEAL} />
            <Text style={s.payHeading}>Payment Summary</Text>
          </View>
          <View style={s.payRow}><Text style={s.payLabel}>Artwork Price</Text><Text style={s.payValue}>₹{order.artwork_price?.toLocaleString('en-IN') ?? '—'}</Text></View>
          <View style={s.payRow}><Text style={s.payLabel}>Platform Fee (5%)</Text><Text style={s.payValue}>₹{Math.round((order.artwork_price ?? 0) * 0.05).toLocaleString('en-IN')}</Text></View>
          <View style={s.payRow}><Text style={s.payLabel}>Advance Paid</Text><Text style={[s.payValue, { color: colors.success }]}>₹{order.advance_amount?.toLocaleString('en-IN') ?? '—'}</Text></View>
          <View style={[s.payRow, s.payTotal]}>
            <Text style={s.payTotalLabel}>Balance Due</Text>
            <Text style={s.payTotalValue}>₹{order.balance_amount?.toLocaleString('en-IN') ?? '—'}</Text>
          </View>
        </View>

        {/* Delivery address */}
        <View style={s.addrCard}>
          <Text style={s.addrLabel}>DELIVERY ADDRESS</Text>
          <Text style={s.addrText}>{order.delivery_address}</Text>
        </View>

      </ScrollView>

      {/* Bottom CTA */}
      <View style={s.actionBar}>
        {isDispatched && !isDelivered && (
          <TouchableOpacity
            style={[s.primaryBtn, confirming && { opacity: 0.6 }]}
            onPress={handleConfirmDelivery}
            disabled={confirming}
            activeOpacity={0.85}
          >
            {confirming
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Package size={18} color="#fff" />
                  <Text style={s.primaryBtnText}>Confirm Delivery Received</Text>
                </>
            }
          </TouchableOpacity>
        )}
        {isDelivered && !isCompleted && (
          <TouchableOpacity
            style={s.payBtn}
            onPress={() => navigation.navigate('ArtworkPayment', { order, paymentType: 'balance' })}
            activeOpacity={0.85}
          >
            <CreditCard size={18} color="#fff" />
            <Text style={s.primaryBtnText}>Pay Balance ₹{order.balance_amount?.toLocaleString('en-IN')}</Text>
          </TouchableOpacity>
        )}
        {isCompleted && (
          <TouchableOpacity
            style={s.rateBtn}
            onPress={() => navigation.navigate('RateConsultant', { project: null, artworkOrder: order })}
            activeOpacity={0.85}
          >
            <Star size={18} color="#fff" />
            <Text style={s.primaryBtnText}>Rate Your Experience</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screenBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: fontSizes.lg, fontFamily: fonts.heavy, color: colors.textSecondary },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.borderCard },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.screenBg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  scroll: { paddingHorizontal: 20, paddingBottom: 120 },
  artCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', gap: 14, marginTop: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.borderCard },
  artImg: { width: 90, height: 90, borderRadius: 12 },
  artPlaceholder: { backgroundColor: '#E5E7EB' },
  artInfo: { flex: 1, gap: 4 },
  artTitle: { fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  artCategory: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary },
  artDesc: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textTertiary, lineHeight: 16 },
  artId: { fontSize: fontSizes.xs + 1, fontWeight: '700', fontFamily: fonts.heavy, color: TEAL },
  timelineCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.borderCard },
  timelineHeading: { fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY, marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepLeft: { alignItems: 'center', width: 24 },
  stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepDotDone: { backgroundColor: TEAL },
  stepDotPending: { backgroundColor: '#E5E7EB' },
  stepDotCurrent: { backgroundColor: ORANGE },
  stepLine: { width: 2, height: 28, backgroundColor: '#E5E7EB', marginTop: 2 },
  stepLineDone: { backgroundColor: TEAL },
  stepLabel: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, paddingTop: 4, paddingBottom: 20 },
  stepLabelDone: { color: colors.textPrimary },
  stepLabelPending: { color: colors.textTertiary },
  stepLabelCurrent: { fontWeight: '700', fontFamily: fonts.heavy, color: ORANGE },
  consignCard: { backgroundColor: '#EEF9F8', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: TEAL },
  consignHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  consignTitle: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  consignLabel: { fontSize: fontSizes.xs + 1, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.5, marginBottom: 4 },
  consignNo: { fontSize: fontSizes.xl, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  payCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.borderCard },
  payHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  payHeading: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  payLabel: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary },
  payValue: { fontSize: fontSizes.sm + 1, fontFamily: fonts.medium, color: colors.textPrimary },
  payTotal: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10, marginTop: 4 },
  payTotalLabel: { fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  payTotalValue: { fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  addrCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.borderCard },
  addrLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.6, marginBottom: 6 },
  addrText: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textPrimary, lineHeight: 22 },
  actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.borderCard, padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20 },
  primaryBtn: { backgroundColor: NAVY, borderRadius: 14, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  payBtn: { backgroundColor: TEAL, borderRadius: 14, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  rateBtn: { backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryBtnText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy },
});
