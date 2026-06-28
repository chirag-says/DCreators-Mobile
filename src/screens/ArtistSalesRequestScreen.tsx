/**
 * ARTIST_SALES_REQUEST_SCREEN  (Phase 4.1)
 * Figma: ARTIST_SALES_REQUEST_SCREEN.png + DETAIL.png
 * Status: requested → accepted | declined
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Truck, CreditCard, CheckCircle2, ShieldCheck } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { sendNotification } from '../lib/notifications';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import type { ArtworkOrder } from '../types';

const NAVY = '#1B3A5C';
const ORANGE = '#E87B35';
const TEAL = '#3D9B8F';

export default function ArtistSalesRequestScreen({ navigation, route }: any) {
  const { orderId } = route?.params ?? {};
  const [order, setOrder] = useState<ArtworkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchOrder(); }, [orderId]);

  async function fetchOrder() {
    if (!orderId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('artwork_orders')
        .select('*, shop_products(title,description,price,images,category), buyer_profile:profiles!buyer_id(name,avatar_url)')
        .eq('id', orderId).single();
      if (error) throw error;
      setOrder(data as ArtworkOrder);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setLoading(false); }
  }

  async function handleAccept() {
    if (!agreed) { Alert.alert('Terms Required', 'Please agree to the Terms and Conditions.'); return; }
    if (!order) return;
    setSaving(true);
    try {
      await supabase.from('artwork_orders').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', order.id);
      sendNotification({ userId: order.buyer_id, title: '🎨 Purchase Request Accepted!', message: `Artist accepted your request. Please complete the advance payment.`, type: 'payment' });
      Alert.alert('Request Accepted ✅', 'Buyer notified to pay advance.', [
        { text: 'OK', onPress: () => navigation.replace('ArtistOrderDispatch', { orderId: order.id }) },
      ]);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  }

  async function handleDecline() {
    if (!order) return;
    Alert.alert('Decline Request?', 'The buyer will be notified.', [
      { text: 'Cancel' },
      { text: 'Decline', style: 'destructive', onPress: async () => {
        setSaving(true);
        try {
          await supabase.from('artwork_orders').update({ status: 'declined', updated_at: new Date().toISOString() }).eq('id', order.id);
          sendNotification({ userId: order.buyer_id, title: 'Request Declined', message: `The artist has declined your purchase request.`, type: 'system' });
          navigation.goBack();
        } catch (e: any) { Alert.alert('Error', e.message); }
        finally { setSaving(false); }
      }},
    ]);
  }

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator size="large" color={NAVY} style={{ flex: 1 }} /></SafeAreaView>;
  if (!order)  return <SafeAreaView style={s.safe}><View style={s.center}><Text style={s.emptyText}>Order not found.</Text></View></SafeAreaView>;

  const artwork    = order.shop_products;
  const coverImage = artwork?.images?.[0] ?? null;
  const buyerName  = (order.buyer_profile as any)?.name ?? 'Collector';
  const isNew      = order.status === 'requested';

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.headerRow}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={18} color={NAVY} />
        </TouchableOpacity>
        <Text style={s.tagline}>HIRE CREATIVES. BUY ART. BUILD IDEAS</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.heroTitle}>Sales{'\n'}Dashboard</Text>
        <Text style={s.heroSub}>Manage your creative transactions, pending artwork requests, and fulfillment status for your global collectors.</Text>

        {/* ── Request card ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>{isNew ? 'Request received\nfor Purchase' : 'Request for Purchase'}</Text>
          <Text style={s.sectionLabel}>ARTWORK DETAIL</Text>
          <View style={s.imgWrap}>
            {coverImage
              ? <Image source={{ uri: coverImage }} style={s.artImg} resizeMode="cover" />
              : <View style={[s.artImg, s.artPlaceholder]} />
            }
            <View style={s.imgOverlay}>
              <Text style={s.artTitle}>{artwork?.title ?? 'Untitled'}</Text>
              <Text style={s.artCategory}>{artwork?.category ?? 'Artwork'}</Text>
            </View>
          </View>

          <View style={s.infoRow}>
            <Truck size={18} color={TEAL} />
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>DELIVERY ADDRESS</Text>
              <Text style={s.infoValue}>{order.delivery_address || 'Not provided'}</Text>
            </View>
          </View>

          <View style={s.infoRow}>
            <CreditCard size={18} color={TEAL} />
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>PAYMENT STATUS</Text>
              {isNew ? (
                <>
                  <Text style={s.infoValue}>• Invoice will be raised on acceptance</Text>
                  <Text style={s.infoValue}>• Artwork cost: (₹{order.artwork_price?.toLocaleString('en-IN') ?? '—'})</Text>
                  <Text style={s.infoHint}>Funds will be released upon delivery confirmation.</Text>
                </>
              ) : (
                <>
                  <Text style={s.infoValue}>Payment release against acceptance of terms and conditions:</Text>
                  <Text style={s.priceHL}>(₹{order.artwork_price?.toLocaleString('en-IN') ?? '—'})</Text>
                </>
              )}
            </View>
          </View>

          {(order.status === 'accepted' || order.status === 'advance_paid') && (
            <View style={s.dispatchBox}>
              <Text style={s.dispatchTitle}>Artwork Couriered on {new Date(order.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/')}</Text>
              <View style={s.consignBox}>
                <Text style={s.consignText}>{order.consignment_no || 'Consignment No.:'}</Text>
              </View>
            </View>
          )}

          {isNew && (
            <>
              <TouchableOpacity style={s.termsRow} onPress={() => setAgreed(v => !v)} activeOpacity={0.8}>
                <View style={[s.checkbox, agreed && s.checkboxOn]}>
                  {agreed && <CheckCircle2 size={12} color="#fff" />}
                </View>
                <Text style={s.termsText}>
                  I agree to the{' '}
                  <Text style={s.termsLink} onPress={() => Linking.openURL('https://dcreators.in/terms')}>Terms and condition</Text>
                </Text>
              </TouchableOpacity>
              <View style={s.ctaRow}>
                <TouchableOpacity style={[s.acceptBtn, saving && { opacity: 0.6 }]} onPress={handleAccept} disabled={saving} activeOpacity={0.85}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.acceptTxt}>Accept Request</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={s.declineBtn} onPress={handleDecline} disabled={saving} activeOpacity={0.85}>
                  <Text style={s.declineTxt}>Pass on</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* ── Buyer card ── */}
        <View style={s.buyerCard}>
          <Text style={s.sectionLabel}>ABOUT THE {isNew ? 'BUYER' : 'COLLECTOR'}</Text>
          <View style={s.buyerRow}>
            <View style={s.buyerAvatar}>
              <Text style={s.buyerInitial}>{buyerName.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={s.buyerName}>{buyerName}</Text>
              <Text style={s.buyerTag}>Verified Collector since 2021</Text>
            </View>
          </View>
          {order.buyer_message && (
            <View style={s.buyerQuote}>
              <Text style={s.buyerQuoteTxt}>"{order.buyer_message}"</Text>
            </View>
          )}
        </View>

        <View style={s.secBadge}>
          <ShieldCheck size={14} color={TEAL} />
          <Text style={s.secText}>All transactions secured by DCreators Escrow Protection</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screenBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: fontSizes.lg, fontFamily: fonts.heavy, color: colors.textSecondary },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  tagline: { fontSize: 9, fontFamily: fonts.body, color: colors.textTertiary, letterSpacing: 0.5 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  heroTitle: { fontSize: 42, fontWeight: '900', fontFamily: fonts.heavy, color: ORANGE, lineHeight: 46, marginTop: 12, marginBottom: 10 },
  heroSub: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 22, marginBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: colors.borderCard },
  cardTitle: { fontSize: fontSizes['2xl'], fontWeight: '800', fontFamily: fonts.heavy, color: NAVY, lineHeight: 32, marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.8, marginBottom: 10 },
  imgWrap: { borderRadius: 14, overflow: 'hidden', marginBottom: 20, height: 200, position: 'relative' },
  artImg: { width: '100%', height: '100%' },
  artPlaceholder: { backgroundColor: '#E5E7EB' },
  imgOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', padding: 12 },
  artTitle: { fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: '#fff' },
  artCategory: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: 'rgba(255,255,255,0.8)' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  infoLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.6, marginBottom: 4 },
  infoValue: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textPrimary, lineHeight: 20 },
  infoHint: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textTertiary, fontStyle: 'italic', marginTop: 4 },
  priceHL: { fontSize: fontSizes.xl, fontWeight: '800', fontFamily: fonts.heavy, color: ORANGE, marginTop: 4 },
  dispatchBox: { paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 8 },
  dispatchTitle: { fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY, marginBottom: 12 },
  consignBox: { backgroundColor: '#F8F9FB', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  consignText: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textTertiary, fontStyle: 'italic' },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 16 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: NAVY },
  termsText: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary, flex: 1 },
  termsLink: { color: TEAL, fontWeight: '700', textDecorationLine: 'underline' },
  ctaRow: { flexDirection: 'row', gap: 12 },
  acceptBtn: { flex: 1.5, backgroundColor: NAVY, borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  acceptTxt: { color: '#fff', fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy },
  declineBtn: { flex: 1, borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.error },
  declineTxt: { color: colors.error, fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },
  buyerCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.borderCard },
  buyerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  buyerAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  buyerInitial: { fontSize: 20, fontWeight: '800', color: '#fff', fontFamily: fonts.heavy },
  buyerName: { fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  buyerTag: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textSecondary, marginTop: 2 },
  buyerQuote: { backgroundColor: '#F8F9FB', borderRadius: 10, padding: 14, borderLeftWidth: 3, borderLeftColor: TEAL },
  buyerQuoteTxt: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 20 },
  secBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  secText: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textTertiary },
});
