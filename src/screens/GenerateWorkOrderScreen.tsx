/**
 * CLIENT_GENERATE_WORK_ORDER_SCREEN
 *
 * owner_role: CLIENT
 * previous_screen: CLIENT_ADVANCE_PAYMENT_SCREEN (on advance success)
 * next_screen: CONSULTANT_WORK_ORDER_SCREEN (consultant receives WO notification)
 * workflow_stage: advance_paid → work_order_generated
 *
 * Figma: CLIENT_GENERATE_WORK_ORDER_SCREEN.png
 *
 * Shows:
 *  - ✅ Payment Confirmed header
 *  - Transaction ID / Amount / Date
 *  - Context paragraph
 *  - Support contact info tip
 *  - "Generate Work Order" button → creates WO record, notifies consultant
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Info, ArrowLeft } from 'lucide-react-native';
import { Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { updateProjectStatus } from '../services/projectService';
import { sendNotification } from '../lib/notifications';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';

const NAVY = '#1B3A5C';
const TEAL = '#0D7F7A';

export default function GenerateWorkOrderScreen({ navigation, route }: any) {
  const { project, txnId, payAmount } = route?.params ?? {};

  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const formattedAmount = payAmount
    ? Number(payAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    : '0.00';

  const formattedDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  }) + ', ' + new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  async function handleGenerateWorkOrder() {
    if (!project?.id) {
      Alert.alert('Error', 'Project not found.'); return;
    }
    setGenerating(true);
    try {
      // Build immutable work order snapshot
      const workOrderData = {
        wo_number: `WO-${Date.now().toString(36).toUpperCase()}`,
        generated_at: new Date().toISOString(),
        project_id: project.id,
        client_id: project.client_id,
        consultant_id: project.consultant_id,
        assignment_type: project.assignment_type,
        assignment_details: project.assignment_details,
        assignment_brief: project.assignment_brief,
        budget: project.budget,
        final_offer: project.final_offer,
        advance_paid: payAmount,
        balance_due: (project.final_offer || project.budget) - (payAmount || 0),
        deadline: project.deadline,
        txn_id: txnId,
      };

      // advance_paid → work_order_generated; attach the WO snapshot as extraFields
      await updateProjectStatus(project.id, 'work_order_generated', { work_order_data: workOrderData });

      // Notify consultant to review and accept WO
      if (project.consultant_id) {
        sendNotification({
          userId: project.consultant_id,
          title: 'Work Order Generated',
          message: 'A Work Order has been generated for your project. Please review and accept it to begin work.',
          type: 'assignment',
        });
      }

      setGenerated(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Top header */}
      <View style={styles.topRow}>
        <Image source={{ uri: RemoteAssets.dIcon }} style={styles.dIcon} resizeMode="contain" />
        <Text style={styles.headerTagline}>Hire creatives. Buy art. Build ideas.</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Payment Confirmed header ─────────────────── */}
        <View style={styles.successHeader}>
          <View style={styles.checkCircle}>
            <CheckCircle size={40} color="#fff" fill={TEAL} />
          </View>
          <Text style={styles.confirmedTitle}>Payment Confirmed</Text>
          <Text style={styles.confirmedSubtitle}>
            Thank you! Your payment has been{'\n'}successfully received.
          </Text>
        </View>

        {/* ── Transaction receipt card ─────────────────── */}
        <View style={styles.receiptCard}>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>TRANSACTION ID</Text>
            <Text style={styles.receiptValue} numberOfLines={1}>
              {txnId || 'DC-77XC-901'}
            </Text>
          </View>
          <View style={styles.receiptDivider} />
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>AMOUNT PAID</Text>
            <Text style={[styles.receiptValue, { color: TEAL }]}>₹{formattedAmount}</Text>
          </View>
          <View style={styles.receiptDivider} />
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>DATE & TIME</Text>
            <Text style={styles.receiptValue}>{formattedDate}</Text>
          </View>
        </View>

        {/* ── Context paragraph ────────────────────────── */}
        <Text style={styles.contextPara}>
          This confirms receipt of the advance payment for the project. Artwork development is underway, and design variations will be shared periodically for review. The final deliverables will be completed within the agreed timeline. Thank you for your trust and support.
        </Text>

        {/* ── Support tip ──────────────────────────────── */}
        <View style={styles.supportTip}>
          <Info size={16} color={TEAL} />
          <Text style={styles.supportTipText}>
            For any queries, please contact our support team.
          </Text>
        </View>

        {/* ── Generate Work Order button ────────────────── */}
        {generated ? (
          <View style={styles.generatedCard}>
            <CheckCircle size={28} color={TEAL} />
            <Text style={styles.generatedTitle}>Work Order Generated!</Text>
            <Text style={styles.generatedSubtitle}>
              The consultant has been notified to review and accept the Work Order.
            </Text>
            <TouchableOpacity
              style={styles.dashboardBtn}
              onPress={() => navigation.navigate('Main', { screen: 'Dashboard' })}
              activeOpacity={0.85}
            >
              <Text style={styles.dashboardBtnText}>Go to Dashboard</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.generateBtn, generating && { opacity: 0.6 }]}
            onPress={handleGenerateWorkOrder}
            disabled={generating}
            activeOpacity={0.85}
          >
            {generating
              ? <ActivityIndicator color={NAVY} size="small" />
              : <Text style={styles.generateBtnText}>Generate{'\n'}Work Order</Text>
            }
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Bottom nav */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={16} color={colors.textSecondary} />
          <Text style={styles.bottomBtnLabel}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomHomeBtn}
          onPress={() => navigation.navigate('Main', { screen: 'Dashboard' })}
          activeOpacity={0.85}
        >
          <Text style={styles.bottomHomeBtnLabel}>🏠  Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomBtn}
          onPress={() => navigation.navigate('Main', { screen: 'Search' })}
          activeOpacity={0.7}
        >
          <Text style={styles.bottomBtnLabel}>🔍 Search</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F2F8' },

  topRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
  },
  dIcon: { width: 36, height: 36 },
  headerTagline: {
    fontSize: fontSizes.sm, fontFamily: fonts.body,
    color: colors.textSecondary, flex: 1,
  },

  scroll: { paddingHorizontal: 24, paddingBottom: 24 },

  // ── Success header ──────────────────────────────────────────
  successHeader: { alignItems: 'center', paddingVertical: 28, gap: 12 },
  checkCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: TEAL, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  confirmedTitle: {
    fontSize: 28, fontWeight: '800', fontFamily: fonts.heavy,
    color: NAVY, textAlign: 'center',
  },
  confirmedSubtitle: {
    fontSize: fontSizes.base, fontFamily: fonts.body,
    color: colors.textSecondary, textAlign: 'center', lineHeight: 22,
  },

  // ── Receipt card ────────────────────────────────────────────
  receiptCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E4EE',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  receiptRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 14,
  },
  receiptDivider: { height: 1, backgroundColor: '#F0F2F8' },
  receiptLabel: {
    fontSize: 11, fontWeight: '700', fontFamily: fonts.heavy,
    color: colors.textTertiary, letterSpacing: 0.5,
  },
  receiptValue: {
    fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy,
    color: NAVY, maxWidth: '55%', textAlign: 'right',
  },

  // ── Context ─────────────────────────────────────────────────
  contextPara: {
    fontSize: fontSizes.sm, fontFamily: fonts.body,
    color: colors.textSecondary, lineHeight: 22,
    textAlign: 'center', marginBottom: 16,
  },

  // ── Support tip ─────────────────────────────────────────────
  supportTip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#EEF4FF', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 24,
  },
  supportTipText: {
    flex: 1, fontSize: fontSizes.base, fontFamily: fonts.body,
    color: TEAL, lineHeight: 22,
  },

  // ── Generate button ─────────────────────────────────────────
  generateBtn: {
    backgroundColor: '#EAEDF4',
    borderRadius: 16, paddingVertical: 28,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#CBD2E8',
    minHeight: 100,
  },
  generateBtnText: {
    fontSize: 26, fontStyle: 'italic', fontFamily: fonts.heavy,
    color: NAVY, textAlign: 'center', lineHeight: 32,
  },

  // ── Generated state ─────────────────────────────────────────
  generatedCard: {
    backgroundColor: '#F0FDF4', borderRadius: 16, padding: 24,
    alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#86EFAC',
  },
  generatedTitle: {
    fontSize: fontSizes.xl, fontWeight: '700', fontFamily: fonts.heavy, color: '#166534',
  },
  generatedSubtitle: {
    fontSize: fontSizes.base, fontFamily: fonts.body, color: '#166534',
    textAlign: 'center', lineHeight: 22,
  },
  dashboardBtn: {
    marginTop: 12, backgroundColor: NAVY, borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  dashboardBtnText: {
    color: '#fff', fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy,
  },

  // ── Bottom nav ──────────────────────────────────────────────
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E8EAF0',
  },
  bottomBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  bottomBtnLabel: { fontSize: 12, fontFamily: fonts.medium, color: colors.textSecondary },
  bottomHomeBtn: {
    backgroundColor: NAVY, borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  bottomHomeBtnLabel: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: fonts.heavy },
});
