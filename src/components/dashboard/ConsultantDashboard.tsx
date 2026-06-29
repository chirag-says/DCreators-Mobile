// ============================================
// ConsultantDashboard — Sales Dashboard purchase-requests section
// Role: CONSULTANT | Product: B (Artwork Marketplace)
// Reads: artwork_orders (NOT projects table)
// Rendered inline inside CreatorDashboardScreen's Sales Dashboard tab
// (no own header/background — that's handled by the parent screen)
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { FileText, Truck, CreditCard, CheckSquare } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchArtworkOrdersForArtist, updateArtworkOrderStatus } from '../../services/artworkService';
import { colors, fonts, fontSizes, spacing, radii } from '../../styles/theme';
import type { ArtworkOrder } from '../../types';
import type { MainTabScreenProps } from '../../types/navigation';

const ORANGE_TITLE = '#E87B35';
const NAVY = '#1B3A5C';
const ACCEPT_BG = NAVY;
const DECLINE_COLOR = '#E87B35';

interface ConsultantDashboardProps {
  navigation: MainTabScreenProps<'Dashboard'>['navigation'];
}

export default function ConsultantDashboard({ navigation }: ConsultantDashboardProps) {
  const profile = useAuthStore((s) => s.profile);
  const consultantProfile = useAuthStore((s) => s.consultantProfile);

  const [orders, setOrders] = useState<ArtworkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [agreedOrders, setAgreedOrders] = useState<Set<string>>(new Set());

  const artistId = consultantProfile?.user_id ?? profile?.id;

  // Fetch incoming artwork purchase requests from artwork_orders (Product B)
  // Never falls back to projects table
  async function fetchOrders() {
    if (!artistId) { setLoading(false); return; }
    try {
      const data = await fetchArtworkOrdersForArtist(artistId, 'requested');
      setOrders(data);
    } catch (e: any) {
      console.warn('[ConsultantDashboard] artwork_orders fetch error:', e.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchOrders(); }, [artistId]);

  useEffect(() => {
    const unsub = (navigation as any)?.addListener?.('focus', fetchOrders);
    return unsub;
  }, [navigation, artistId]);

  function toggleTerms(orderId: string) {
    setAgreedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  async function onAccept(order: ArtworkOrder) {
    if (!agreedOrders.has(order.id)) {
      Alert.alert('Terms Required', 'Please agree to the Terms and Conditions first.');
      return;
    }
    try {
      await updateArtworkOrderStatus(order.id, 'accepted');
      Alert.alert('Done', 'Request accepted! The buyer has been notified.');
      fetchOrders();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong.');
    }
  }

  async function onDecline(order: ArtworkOrder) {
    Alert.alert('Decline Request', 'Are you sure you want to decline this request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateArtworkOrderStatus(order.id, 'declined');
            Alert.alert('Done', 'Request declined.');
            fetchOrders();
          } catch (e: any) {
            Alert.alert('Error', e.message ?? 'Something went wrong.');
          }
        },
      },
    ]);
  }

  function formatCurrency(amount: number) {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  }

  function renderPendingCard({ item }: { item: ArtworkOrder }) {
    const isAgreed = agreedOrders.has(item.id);
    const artwork = item.shop_products;
    const coverImage = artwork?.images?.[0] ?? null;
    const buyerName = (item.buyer_profile as any)?.name ?? 'Collector';

    return (
      <View style={styles.requestCard}>
        <Text style={styles.requestTitle}>{'Request received\nfor Purchase'}</Text>

        <Text style={styles.sectionLabel}>ARTWORK DETAIL</Text>
        <View style={styles.artworkImageContainer}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.artworkImage} resizeMode="cover" />
          ) : (
            <View style={styles.artworkPlaceholder}>
              <Text style={styles.artworkName}>{artwork?.title ?? 'Untitled'}</Text>
              <Text style={styles.artworkCategory}>{artwork?.category ?? 'Artwork'}</Text>
            </View>
          )}
          {coverImage && (
            <View style={styles.artworkOverlay}>
              <Text style={styles.artworkName}>{artwork?.title ?? 'Untitled'}</Text>
              <Text style={styles.artworkCategory}>{artwork?.category ?? 'Artwork'}</Text>
            </View>
          )}
        </View>

        <View style={styles.infoRow}>
          <Truck size={18} color={ORANGE_TITLE} strokeWidth={2} />
          <Text style={styles.infoLabel}>DELIVERY ADDRESS</Text>
        </View>
        <Text style={styles.infoText}>
          {item.delivery_address || 'Address will be confirmed by buyer'}
        </Text>

        <View style={[styles.infoRow, { marginTop: spacing.xl }]}>
          <CreditCard size={18} color={ORANGE_TITLE} strokeWidth={2} />
          <Text style={styles.infoLabel}>PAYMENT STATUS</Text>
        </View>
        <View style={styles.paymentInfo}>
          <View style={styles.bulletRow}>
            <View style={styles.bullet} />
            <Text style={styles.infoText}>Invoice will be raised on acceptance</Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={styles.bullet} />
            <Text style={styles.infoText}>Artwork cost: ({formatCurrency(item.artwork_price ?? 0)})</Text>
          </View>
          <Text style={styles.paymentNote}>
            Funds will be released upon delivery confirmation.
          </Text>
        </View>

        {/* About the buyer */}
        <Text style={styles.sectionLabel}>ABOUT THE BUYER</Text>
        <View style={styles.buyerRow}>
          <View style={styles.buyerAvatar}>
            <Text style={styles.buyerInitial}>{buyerName.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.buyerName}>{buyerName}</Text>
            <Text style={styles.buyerTag}>Verified Collector since 2021</Text>
          </View>
        </View>
        {!!(item as any).buyer_message && (
          <Text style={styles.buyerQuote}>"{(item as any).buyer_message}"</Text>
        )}

        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => toggleTerms(item.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, isAgreed && styles.checkboxChecked]}>
            {isAgreed && <CheckSquare size={16} color="#fff" strokeWidth={2.5} />}
          </View>
          <Text style={styles.termsText}>
            I agree to the <Text style={styles.termsLink}>Terms and condition</Text>
          </Text>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.acceptBtn, !isAgreed && { opacity: 0.5 }]}
            onPress={() => onAccept(item)}
            disabled={!isAgreed}
            activeOpacity={0.85}
          >
            <Text style={styles.acceptText}>Accept Request</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={() => onDecline(item)}
            activeOpacity={0.85}
          >
            <Text style={styles.declineText}>Pass on</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Pure content — no own header/background. Rendered inline by
  // CreatorDashboardScreen inside the shared Sales Dashboard tab.
  return (
    <View>
      <Text style={styles.sectionTitle}>Purchase Requests</Text>
      <Text style={styles.dashboardSubtitle}>
        Manage incoming artwork purchase requests and fulfillment status for your collectors.
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
      ) : orders.length === 0 ? (
        <View style={styles.emptyState}>
          <FileText size={40} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No purchase requests yet</Text>
          <Text style={styles.emptySubtitle}>
            Incoming artwork purchase requests will appear here
          </Text>
        </View>
      ) : (
        orders.map((order) => (
          <View key={order.id}>{renderPendingCard({ item: order })}</View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    fontFamily: fonts.heavy,
    color: NAVY,
    marginBottom: 4,
  },
  dashboardSubtitle: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: 'left',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },

  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  requestTitle: {
    fontSize: fontSizes['3xl'] + 2,
    fontWeight: '800',
    fontFamily: fonts.heavy,
    color: NAVY,
    lineHeight: 34,
    marginBottom: spacing.lg,
  },

  sectionLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  artworkImageContainer: {
    borderRadius: radii.md,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    height: 200,
    position: 'relative',
  },
  artworkImage: { width: '100%', height: '100%' },
  artworkPlaceholder: {
    flex: 1,
    backgroundColor: '#2D2D2D',
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  artworkOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: spacing.lg,
  },
  artworkName: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    color: '#fff',
  },
  artworkCategory: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.body,
    color: '#D1D5DB',
    marginTop: 2,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: fontSizes.xs + 1,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  infoText: {
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  paymentInfo: { marginBottom: spacing.lg },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: 4,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: NAVY,
    marginTop: 8,
  },
  paymentNote: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.body,
    color: ORANGE_TITLE,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    lineHeight: 20,
  },

  buyerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  buyerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2D8B7F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyerInitial: { fontSize: 18, fontWeight: '800', color: '#fff', fontFamily: fonts.heavy },
  buyerName: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  buyerTag: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textSecondary },
  buyerQuote: {
    fontSize: fontSizes.sm + 1, fontFamily: fonts.body, fontStyle: 'italic',
    color: colors.textSecondary, lineHeight: 20, marginBottom: 12,
  },

  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.borderInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: NAVY, borderColor: NAVY },
  termsText: {
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    flex: 1,
  },
  termsLink: { color: colors.primary, textDecorationLine: 'underline' },

  actionRow: { flexDirection: 'row', gap: spacing.md },
  acceptBtn: {
    backgroundColor: ACCEPT_BG,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1.5,
  },
  acceptText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },
  declineBtn: {
    borderWidth: 1.5,
    borderColor: DECLINE_COLOR,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  declineText: { color: DECLINE_COLOR, fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#9CA3AF' },
  emptySubtitle: { fontSize: 13, fontFamily: fonts.body, color: '#D1D5DB', textAlign: 'center' },
});
