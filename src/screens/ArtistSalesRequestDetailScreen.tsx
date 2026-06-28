/**
 * ArtistSalesRequestDetailScreen  (Phase 6.5)
 * Figma: ARTIST_SALES_REQUEST_SCREEN_DETAIL.png
 * Full-screen detail of a single sales request:
 * — "Sales Dashboard" heading
 * — "Request for Purchase" card:
 *    • Artwork image with title/category overlay
 *    • Delivery Address
 *    • Payment Status (invoice note + cost + funds note)
 *    • Terms checkbox + Accept / Decline
 * — "About the Collector" section
 *    • Buyer avatar + name + verified badge + quote
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, Truck, CreditCard, BadgeCheck } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes } from '../styles/theme';

const NAVY   = '#1B3A5C';
const ORANGE = '#E87B35';
const TEAL   = '#3D9B8F';
const BG     = '#F7F8FA';

interface Props {
  navigation: any;
  route: { params: { order: any } };
}

export default function ArtistSalesRequestDetailScreen({ navigation, route }: Props) {
  const order   = route?.params?.order;
  const profile = useAuthStore(s => s.profile);

  const [agreed,     setAgreed]     = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const artwork  = order?.shop_products ?? {};
  const buyer    = order?.buyer ?? order?.profiles ?? {};
  const imgUrl   = artwork?.images?.[0];
  const artTitle = artwork?.title ?? order?.artwork_title ?? 'Untitled';
  const artCat   = artwork?.category ?? 'Artwork';
  const price    = order?.artwork_price ?? order?.advance_amount ?? 0;

  async function handleAccept() {
    if (!agreed) { Alert.alert('Terms Required', 'Please agree to the Terms and Conditions first.'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('artwork_orders')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', order.id);
      if (error) throw error;
      Alert.alert('Accepted ✅', 'The buyer has been notified. Awaiting advance payment.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSubmitting(false); }
  }

  async function handleDecline() {
    Alert.alert('Decline Request', 'Are you sure you want to decline this purchase request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive', onPress: async () => {
          setSubmitting(true);
          try {
            const { error } = await supabase
              .from('artwork_orders')
              .update({ status: 'declined', updated_at: new Date().toISOString() })
              .eq('id', order.id);
            if (error) throw error;
            Alert.alert('Declined', 'Request declined.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } catch (e: any) { Alert.alert('Error', e.message); }
          finally { setSubmitting(false); }
        },
      },
    ]);
  }

  // Buyer initials
  const buyerName    = buyer?.name ?? buyer?.full_name ?? 'Collector';
  const buyerInitials= buyerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={18} color={NAVY} />
        </TouchableOpacity>
        <Text style={s.tagline}>HIRE CREATIVES. BUY ART. BUILD IDEAS</Text>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.7}>
            <Bell size={18} color={NAVY} />
          </TouchableOpacity>
          {profile?.avatar_url
            ? <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
            : <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarInit}>{(profile?.name ?? 'A').charAt(0).toUpperCase()}</Text>
              </View>
          }
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.heroTitle}>Sales{'\n'}Dashboard</Text>

        {/* ── Request for Purchase card ── */}
        <View style={s.requestCard}>
          <Text style={s.requestTitle}>Request for Purchase</Text>

          {/* Artwork image */}
          <Text style={s.sectionLabel}>ARTWORK DETAIL</Text>
          <View style={s.artworkWrap}>
            {imgUrl
              ? <Image source={{ uri: imgUrl }} style={s.artworkImg} />
              : <View style={[s.artworkImg, s.artworkImgPlaceholder]}>
                  <Text style={s.artworkPlaceholderText}>{artTitle.charAt(0)}</Text>
                </View>
            }
            <View style={s.artworkOverlay}>
              <Text style={s.artworkTitle}>{artTitle}</Text>
              <Text style={s.artworkCategory}>{artCat}</Text>
            </View>
          </View>

          {/* Delivery Address */}
          <View style={s.infoBlock}>
            <View style={s.infoIconRow}>
              <Truck size={18} color={ORANGE} strokeWidth={2} />
              <Text style={s.sectionLabel}>DELIVERY ADDRESS</Text>
            </View>
            <Text style={s.infoBody}>
              {order?.delivery_address ?? buyer?.address ?? 'Address will be confirmed by buyer'}
            </Text>
          </View>

          {/* Payment Status */}
          <View style={s.infoBlock}>
            <View style={s.infoIconRow}>
              <CreditCard size={18} color={ORANGE} strokeWidth={2} />
              <Text style={s.sectionLabel}>PAYMENT STATUS</Text>
            </View>
            <View style={s.bulletRow}>
              <View style={s.bullet} />
              <Text style={s.infoBody}>Invoice will be raised on acceptance</Text>
            </View>
            <View style={s.bulletRow}>
              <View style={s.bullet} />
              <Text style={s.infoBody}>Artwork cost: (₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })})</Text>
            </View>
            <Text style={s.paymentNote}>
              Product will be released for delivery upon Payment.
            </Text>
          </View>

          {/* Terms */}
          <TouchableOpacity style={s.termsRow} onPress={() => setAgreed(v => !v)} activeOpacity={0.8}>
            <View style={[s.checkbox, agreed && s.checkboxChecked]}>
              {agreed && <Text style={s.checkmark}>✓</Text>}
            </View>
            <Text style={s.termsText}>
              I agree to the{' '}
              <Text style={s.termsLink}>Terms and condition</Text>
            </Text>
          </TouchableOpacity>

          {/* Accept / Decline */}
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.acceptBtn, (!agreed || submitting) && { opacity: 0.5 }]}
              onPress={handleAccept}
              disabled={!agreed || submitting}
              activeOpacity={0.85}
            >
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.acceptText}>Accept Request</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={s.declineBtn}
              onPress={handleDecline}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text style={s.declineText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── About the Collector ── */}
        <View style={s.collectorCard}>
          <Text style={s.collectorLabel}>ABOUT THE COLLECTOR</Text>
          <View style={s.collectorRow}>
            {buyer?.avatar_url
              ? <Image source={{ uri: buyer.avatar_url }} style={s.collectorAvatar} />
              : <View style={[s.collectorAvatar, s.collectorAvatarFallback]}>
                  <Text style={s.collectorAvatarInit}>{buyerInitials}</Text>
                </View>
            }
            <View>
              <Text style={s.collectorName}>{buyerName}</Text>
              <Text style={s.collectorMeta}>
                {buyer?.is_verified ? '✓ Verified Collector' : 'Collector'}{' '}
                since {buyer?.created_at ? new Date(buyer.created_at).getFullYear() : '2024'}
              </Text>
            </View>
          </View>
          {buyer?.quote && (
            <Text style={s.collectorQuote}>"{buyer.quote}"</Text>
          )}
          {!buyer?.quote && (
            <Text style={s.collectorQuote}>
              "I've been following your artwork for months. This piece perfectly fits the palette of my new space."
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  tagline: { fontSize: 9, fontFamily: fonts.body, color: colors.textTertiary, letterSpacing: 0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: { backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  avatarInit: { color: '#fff', fontSize: 14, fontWeight: '800', fontFamily: fonts.heavy },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  heroTitle: { fontSize: 44, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY, lineHeight: 50, marginTop: 10, marginBottom: 20 },
  // Request card
  requestCard: { backgroundColor: '#FFFDF7', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E9E5D8', marginBottom: 16 },
  requestTitle: { fontSize: fontSizes['2xl'], fontWeight: '800', fontFamily: fonts.heavy, color: NAVY, marginBottom: 16 },
  sectionLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.8, marginBottom: 10 },
  // Artwork
  artworkWrap: { position: 'relative', borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  artworkImg: { width: '100%', height: 220 },
  artworkImgPlaceholder: { backgroundColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  artworkPlaceholderText: { fontSize: 48, fontWeight: '900', fontFamily: fonts.heavy, color: '#fff' },
  artworkOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 16, paddingVertical: 12 },
  artworkTitle: { fontSize: fontSizes.xl, fontWeight: '800', fontFamily: fonts.heavy, color: '#fff' },
  artworkCategory: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  // Info blocks
  infoBlock: { marginBottom: 20 },
  infoIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoBody: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary, lineHeight: 22 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: NAVY, marginTop: 8 },
  paymentNote: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textTertiary, fontStyle: 'italic', marginTop: 6 },
  // Terms
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 18 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: NAVY, borderColor: NAVY },
  checkmark: { color: '#fff', fontSize: 11, fontWeight: '900' },
  termsText: { flex: 1, fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20 },
  termsLink: { color: NAVY, fontWeight: '700', fontFamily: fonts.heavy, textDecorationLine: 'underline' },
  // Action row
  actionRow: { flexDirection: 'row', gap: 12 },
  acceptBtn: { flex: 1, backgroundColor: NAVY, borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  acceptText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy },
  declineBtn: { flex: 1, borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: ORANGE },
  declineText: { color: ORANGE, fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy },
  // Collector card
  collectorCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E9E5D8' },
  collectorLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.8, marginBottom: 14 },
  collectorRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  collectorAvatar: { width: 52, height: 52, borderRadius: 26 },
  collectorAvatarFallback: { backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  collectorAvatarInit: { color: '#fff', fontSize: 18, fontWeight: '800', fontFamily: fonts.heavy },
  collectorName: { fontSize: fontSizes.xl, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  collectorMeta: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary, marginTop: 2 },
  collectorQuote: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20, fontStyle: 'italic', backgroundColor: '#F8F9FB', borderRadius: 10, padding: 14 },
});
