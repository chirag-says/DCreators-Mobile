/**
 * CLIENT_GENERATE_WORK_ORDER_SCREEN
 *
 * owner_role: CLIENT
 * previous_screen: CLIENT_ADVANCE_PAYMENT_SCREEN (on advance success)
 * next_screen: CONSULTANT_WORK_ORDER_SCREEN (consultant receives WO notification)
 * workflow_stage: advance_paid → work_order_generated
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
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, Info } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { updateProjectStatus } from '../services/projectService';
import { sendNotification } from '../lib/notifications';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';

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
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Generate Work Order" />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Payment Confirmed header ─────────────────── */}
          <View style={styles.successHeader}>
            <View style={styles.checkCircle}>
              <CheckCircle size={40} color="#fff" fill={colors.teal} />
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
                {txnId || '—'}
              </Text>
            </View>
            <View style={styles.receiptDivider} />
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>AMOUNT PAID</Text>
              <Text style={[styles.receiptValue, { color: colors.teal }]}>₹{formattedAmount}</Text>
            </View>
            <View style={styles.receiptDivider} />
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>DATE & TIME</Text>
              <Text style={styles.receiptValue}>{formattedDate}</Text>
            </View>
          </View>

          {/* ── Context paragraph ────────────────────────── */}
          <Text style={styles.contextPara}>
            This confirms receipt of the advance payment for the project. Once the Work Order is generated, the consultant will review and accept it to begin work.
          </Text>

          {/* ── Support tip ──────────────────────────────── */}
          <View style={styles.supportTip}>
            <Info size={16} color={colors.teal} />
            <Text style={styles.supportTipText}>
              For any queries, please contact our support team.
            </Text>
          </View>

          {/* ── Generate Work Order button ────────────────── */}
          {generated ? (
            <View style={styles.generatedCard}>
              <CheckCircle size={28} color={colors.success} />
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
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.generateBtnText}>Generate Work Order</Text>
              }
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.screenBg },
  safe: { flex: 1 },

  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 100 },


  // ── Success header ──────────────────────────────────────────
  successHeader: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md },
  checkCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.teal,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.lg,
  },
  confirmedTitle: {
    fontSize: fontSizes['3xl'], fontWeight: '800', fontFamily: fonts.heavy,
    color: colors.textPrimary, textAlign: 'center',
  },
  confirmedSubtitle: {
    fontSize: fontSizes.base, fontFamily: fonts.body,
    color: colors.textSecondary, textAlign: 'center', lineHeight: 22,
  },

  // ── Receipt card ────────────────────────────────────────────
  receiptCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  receiptRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: spacing.md + 2,
  },
  receiptDivider: { height: 1, backgroundColor: colors.borderLight },
  receiptLabel: {
    fontSize: fontSizes.xs + 1, fontWeight: '700', fontFamily: fonts.heavy,
    color: colors.textTertiary, letterSpacing: 0.5,
  },
  receiptValue: {
    fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy,
    color: colors.textPrimary, maxWidth: '55%', textAlign: 'right',
  },

  // ── Context ─────────────────────────────────────────────────
  contextPara: {
    fontSize: fontSizes.sm + 1, fontFamily: fonts.body,
    color: colors.textSecondary, lineHeight: 22,
    textAlign: 'center', marginBottom: spacing.lg,
  },

  // ── Support tip ─────────────────────────────────────────────
  supportTip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 2,
    backgroundColor: '#EEF4FF', borderRadius: radii.lg,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2,
    marginBottom: spacing['2xl'],
  },
  supportTipText: {
    flex: 1, fontSize: fontSizes.base, fontFamily: fonts.body,
    color: colors.tealDark, lineHeight: 22,
  },

  // ── Generate button ─────────────────────────────────────────
  generateBtn: {
    backgroundColor: colors.btnPrimary,
    borderRadius: radii.xl, paddingVertical: spacing.xl,
    alignItems: 'center', justifyContent: 'center',
    minHeight: 56, ...shadows.md,
  },
  generateBtnText: {
    fontSize: fontSizes.lg, fontFamily: fonts.heavy,
    color: '#fff', textAlign: 'center',
  },

  // ── Generated state ─────────────────────────────────────────
  generatedCard: {
    backgroundColor: '#F0FDF4', borderRadius: radii.xl, padding: spacing['2xl'],
    alignItems: 'center', gap: spacing.md,
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
    marginTop: spacing.md, backgroundColor: colors.btnPrimary, borderRadius: radii.lg,
    paddingHorizontal: spacing['2xl'], paddingVertical: spacing.lg,
  },
  dashboardBtnText: {
    color: '#fff', fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy,
  },
});

