/**
 * ARTIST_ORDER_DISPATCH_SCREEN  (Phase 4.2)
 * owner_role: ARTIST
 * previous: ArtistSalesRequestScreen (accepted)
 * next: ArtistOrderCompletion (delivered)
 * Figma: ARTIST_ORDER_DISPATCH_SCREEN.png
 * Status: accepted / advance_paid → dispatched
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Package, Truck, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { sendNotification } from '../lib/notifications';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import type { ArtworkOrder } from '../types';

const NAVY = '#1B3A5C';
const ORANGE = '#E87B35';
const TEAL = '#3D9B8F';

export default function ArtistOrderDispatchScreen({ navigation, route }: any) {
  const { orderId } = route?.params ?? {};
  const [order, setOrder] = useState<ArtworkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [consignNo, setConsignNo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchOrder(); }, [orderId]);

  async function fetchOrder() {
    if (!orderId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('artwork_orders')
        .select('*, shop_products(title,images,category,price), buyer_profile:profiles!buyer_id(name,avatar_url)')
        .eq('id', orderId).single();
      if (error) throw error;
      setOrder(data as ArtworkOrder);
      setConsignNo((data as ArtworkOrder).consignment_no ?? '');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  }

  async function handleDispatch() {
    if (!consignNo.trim()) { Alert.alert('Required', 'Please enter the consignment number.'); return; }
    if (!order) return;
    setSaving(true);
    try {
      await supabase.from('artwork_orders').update({
        status: 'dispatched',
        consignment_no: consignNo.trim(),
        updated_at: new Date().toISOString(),
      }).eq('id', order.id);

      sendNotification({
        userId: order.buyer_id,
        title: '📦 Your Artwork Is On Its Way!',
        message: `Consignment No: ${consignNo.trim()}. Track your delivery.`,
        type: 'system',
      });

      Alert.alert('Dispatched! 🚚', 'Buyer has been notified. Await delivery confirmation.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator size="large" color={NAVY} style={{ flex: 1 }} /></SafeAreaView>;

  const artwork     = order?.shop_products;
  const coverImage  = artwork?.images?.[0] ?? null;
  const dispatched  = order?.status === 'dispatched';

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.headerRow}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={18} color={NAVY} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Order Dispatch</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Status banner */}
        <View style={[s.statusBanner, dispatched ? s.statusBannerDone : s.statusBannerPending]}>
          {dispatched ? <CheckCircle2 size={18} color={TEAL} /> : <Package size={18} color={ORANGE} />}
          <Text style={[s.statusBannerText, dispatched ? { color: TEAL } : { color: ORANGE }]}>
            {dispatched ? 'Artwork Dispatched' : 'Ready to Ship'}
          </Text>
        </View>

        {/* Artwork summary */}
        <View style={s.artCard}>
          {coverImage
            ? <Image source={{ uri: coverImage }} style={s.artImg} resizeMode="cover" />
            : <View style={[s.artImg, s.artPlaceholder]} />
          }
          <View style={s.artInfo}>
            <Text style={s.artTitle}>{artwork?.title ?? 'Untitled'}</Text>
            <Text style={s.artCategory}>{artwork?.category ?? 'Artwork'}</Text>
            <Text style={s.artPrice}>₹{artwork?.price?.toLocaleString('en-IN') ?? '—'}</Text>
          </View>
        </View>

        {/* Delivery address */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Truck size={16} color={TEAL} />
            <Text style={s.sectionTitle}>Delivery Address</Text>
          </View>
          <Text style={s.addressText}>{order?.delivery_address || 'Not provided'}</Text>
        </View>

        {/* Consignment form */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Package size={16} color={TEAL} />
            <Text style={s.sectionTitle}>
              {dispatched ? 'Artwork Couriered on ' + new Date(order!.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/') : 'Enter Consignment Details'}
            </Text>
          </View>
          <Text style={s.fieldLabel}>Consignment / Tracking Number</Text>
          <TextInput
            style={[s.input, dispatched && s.inputDisabled]}
            placeholder="Consignment No."
            placeholderTextColor={colors.textTertiary}
            value={consignNo}
            onChangeText={setConsignNo}
            editable={!dispatched}
            autoCapitalize="characters"
          />
          {!dispatched && (
            <Text style={s.hint}>Enter the tracking number provided by your courier partner.</Text>
          )}
        </View>

        {/* Payment info */}
        <View style={s.payCard}>
          <Text style={s.payLabel}>PAYMENT SUMMARY</Text>
          <View style={s.payRow}>
            <Text style={s.payItem}>Advance Received</Text>
            <Text style={s.payAmount}>₹{order?.advance_amount?.toLocaleString('en-IN') ?? '—'}</Text>
          </View>
          <View style={s.payRow}>
            <Text style={s.payItem}>Balance on Delivery</Text>
            <Text style={s.payAmount}>₹{order?.balance_amount?.toLocaleString('en-IN') ?? '—'}</Text>
          </View>
          <View style={[s.payRow, s.payTotal]}>
            <Text style={s.payTotalLabel}>Total</Text>
            <Text style={s.payTotalAmount}>₹{order?.artwork_price?.toLocaleString('en-IN') ?? '—'}</Text>
          </View>
          <Text style={s.escrowNote}>Balance released after buyer confirms delivery.</Text>
        </View>

      </ScrollView>

      {!dispatched && (
        <View style={s.actionBar}>
          <TouchableOpacity
            style={[s.dispatchBtn, saving && { opacity: 0.6 }]}
            onPress={handleDispatch}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Truck size={18} color="#fff" />
                  <Text style={s.dispatchBtnText}>Mark as Dispatched</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screenBg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.borderCard },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.screenBg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  scroll: { paddingHorizontal: 20, paddingBottom: 100 },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 16, borderRadius: 12, padding: 14 },
  statusBannerPending: { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FDE68A' },
  statusBannerDone: { backgroundColor: '#EEF9F8', borderWidth: 1, borderColor: TEAL },
  statusBannerText: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },
  artCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', gap: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.borderCard },
  artImg: { width: 80, height: 80, borderRadius: 12 },
  artPlaceholder: { backgroundColor: '#E5E7EB' },
  artInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  artTitle: { fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  artCategory: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary },
  artPrice: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: ORANGE },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.borderCard },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  addressText: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textPrimary, lineHeight: 22 },
  fieldLabel: { fontSize: fontSizes.xs + 1, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: colors.inputBg, borderRadius: 10, borderWidth: 1.5, borderColor: colors.borderInput, padding: 14, fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary },
  inputDisabled: { backgroundColor: '#F3F4F6', color: colors.textSecondary },
  hint: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 6 },
  payCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.borderCard },
  payLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.8, marginBottom: 12 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  payItem: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary },
  payAmount: { fontSize: fontSizes.sm + 1, fontFamily: fonts.medium, color: colors.textPrimary },
  payTotal: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10, marginTop: 4 },
  payTotalLabel: { fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  payTotalAmount: { fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  escrowNote: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textTertiary, fontStyle: 'italic', marginTop: 8 },
  actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.borderCard, padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20 },
  dispatchBtn: { backgroundColor: NAVY, borderRadius: 14, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  dispatchBtnText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy },
});
