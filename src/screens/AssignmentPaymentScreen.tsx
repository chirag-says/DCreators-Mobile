/**
 * ASSIGNMENT_PAYMENT_SCREEN
 * owner_role: CONSULTANT
 * previous_screen: ASSIGNMENT_ACCEPTED | CREATOR_WORKORDER
 * workflow_stage: ADVANCE_PENDING → COMPLETED (read-only view of both halves)
 *
 * The consultant could see lifetime earnings on the Sales tab and design rounds
 * on the project screen, but nowhere could they answer "where is my money on
 * THIS job?". This puts the two halves of the fee and the submission rounds
 * that unlock them on one screen.
 *
 * Read-only by design: the client initiates every payment. Showing a pay
 * button here would imply the consultant can trigger one, which they cannot.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Wallet, CheckCircle2, Clock, MessageCircle, Upload, AlertCircle,
} from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { fetchProjectPayments, fetchProjectSubmissions } from '../services/projectService';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import { getAssignmentTitle } from '../lib/assignment';
import type { Payment, Submission } from '../types';

const NAVY = '#1B3A5C';
const TEAL = '#3D9B8F';
const ORANGE = '#E87B35';
const BG = '#EDF1F5';

/** The fee splits in half: advance up front, balance on final approval. */
const ADVANCE_SHARE = 0.5;

const ROUND_LABELS: Record<string, string> = {
  review_1: '1st Design Round',
  review_2: '2nd Design Round',
  final: 'Final Delivery',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AssignmentPaymentScreen({ navigation, route }: any) {
  const project = route?.params?.project;
  const projectId = project?.id;

  const agreedAmount = Number(
    route?.params?.agreedAmount ?? project?.final_offer ?? project?.budget ?? 0,
  );
  const advanceDue = Math.round(agreedAmount * ADVANCE_SHARE);
  const balanceDue = agreedAmount - advanceDue;

  const [payments, setPayments] = useState<Payment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setFailed(false);
    try {
      const [pay, subs] = await Promise.all([
        fetchProjectPayments(projectId),
        fetchProjectSubmissions(projectId),
      ]);
      setPayments(pay);
      setSubmissions(subs);
    } catch (e: any) {
      console.warn('[AssignmentPayment] load error:', e?.message);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  /** A milestone is settled only when a matching payment row is completed. */
  function settled(type: 'advance' | 'balance'): Payment | undefined {
    return payments.find(p => p.payment_type === type && p.status === 'completed');
  }

  const advancePaid = settled('advance');
  const balancePaid = settled('balance');
  const receivedSoFar =
    (advancePaid ? Number(advancePaid.amount) : 0) + (balancePaid ? Number(balancePaid.amount) : 0);

  const clientName = project?.client_name || 'the client';

  function renderMilestone(
    label: string,
    amount: number,
    paid: Payment | undefined,
    pendingHint: string,
  ) {
    return (
      <View style={s.milestone}>
        <View style={[s.milestoneIcon, paid ? s.milestoneIconPaid : s.milestoneIconPending]}>
          {paid
            ? <CheckCircle2 size={17} color={TEAL} />
            : <Clock size={17} color={ORANGE} />
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.milestoneLabel}>{label}</Text>
          <Text style={[s.milestoneStatus, { color: paid ? TEAL : ORANGE }]}>
            {paid ? `Received ${formatDate(paid.created_at)}` : pendingHint}
          </Text>
        </View>
        <Text style={[s.milestoneAmount, !paid && s.milestoneAmountPending]}>
          ₹{amount.toLocaleString('en-IN')}
        </Text>
      </View>
    );
  }

  if (!projectId) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScreenHeader title="Assignment Payment" />
        <View style={s.centred}>
          <AlertCircle size={40} color="#D1D5DB" />
          <Text style={s.emptyTitle}>No assignment selected</Text>
          <TouchableOpacity style={s.ghostBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={s.ghostBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScreenHeader title="Assignment Payment" />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
      >
        <Text style={s.eyebrow}>SUBMISSION &amp; PAYMENT</Text>
        <Text style={s.heroTitle}>{getAssignmentTitle(project)}</Text>
        <Text style={s.heroSub}>For {clientName}</Text>

        {/* ── Money summary ── */}
        <View style={s.totalCard}>
          <View style={s.totalRow}>
            <Wallet size={16} color="#fff" />
            <Text style={s.totalLabel}>AGREED FEE</Text>
          </View>
          <Text style={s.totalValue}>₹{agreedAmount.toLocaleString('en-IN')}</Text>
          <Text style={s.totalSub}>
            ₹{receivedSoFar.toLocaleString('en-IN')} received
            {' · '}
            ₹{Math.max(0, agreedAmount - receivedSoFar).toLocaleString('en-IN')} outstanding
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={TEAL} style={{ marginTop: 40 }} />
        ) : failed ? (
          <View style={s.errorCard}>
            <AlertCircle size={18} color={colors.error} />
            <Text style={s.errorText}>
              Could not load payment status. Pull down to try again.
            </Text>
          </View>
        ) : (
          <>
            {/* ── Payment milestones ── */}
            <Text style={s.sectionLabel}>PAYMENT MILESTONES</Text>
            <View style={s.card}>
              {renderMilestone(
                'Advance (50%)',
                advancePaid ? Number(advancePaid.amount) : advanceDue,
                advancePaid,
                `Waiting for ${clientName} to pay`,
              )}
              <View style={s.divider} />
              {renderMilestone(
                'Balance (50%)',
                balancePaid ? Number(balancePaid.amount) : balanceDue,
                balancePaid,
                'Released after final approval',
              )}
            </View>

            {/* ── Submission rounds ── */}
            <Text style={s.sectionLabel}>SUBMISSION ROUNDS</Text>
            <View style={s.card}>
              {submissions.length === 0 ? (
                <View style={s.emptyRounds}>
                  <Upload size={28} color="#D1D5DB" />
                  <Text style={s.emptyRoundsTitle}>Nothing submitted yet</Text>
                  <Text style={s.emptyRoundsSub}>
                    Design rounds appear here once you upload them from the project screen.
                  </Text>
                </View>
              ) : (
                submissions.map((sub, i) => {
                  const action = sub.client_action;
                  const statusText =
                    action === 'approve' ? 'Approved'
                    : action === 'revert' ? 'Revisions requested'
                    : 'Awaiting client review';
                  const statusColor =
                    action === 'approve' ? TEAL
                    : action === 'revert' ? ORANGE
                    : colors.textSecondary;
                  return (
                    <View key={sub.id} style={[s.roundRow, i === submissions.length - 1 && s.roundRowLast]}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.roundLabel}>{ROUND_LABELS[sub.round] ?? sub.round}</Text>
                        <Text style={s.roundDate}>Submitted {formatDate(sub.created_at)}</Text>
                      </View>
                      <Text style={[s.roundStatus, { color: statusColor }]}>{statusText}</Text>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}

        <TouchableOpacity
          style={s.tealBtn}
          onPress={() => navigation.navigate('Chat', { project, otherName: clientName })}
          activeOpacity={0.85}
        >
          <MessageCircle size={16} color="#fff" />
          <Text style={s.tealBtnText}>Message {clientName}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 60 },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },

  eyebrow: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.9, marginTop: 18 },
  heroTitle: { fontSize: 26, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY, lineHeight: 33, marginTop: 6 },
  heroSub: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, marginTop: 4, marginBottom: 20 },

  totalCard: { backgroundColor: NAVY, borderRadius: 16, padding: 20 },
  totalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.8 },
  totalValue: { fontSize: 32, fontWeight: '900', fontFamily: fonts.heavy, color: '#fff', marginTop: 8 },
  totalSub: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: 'rgba(255,255,255,0.8)', marginTop: 6 },

  sectionLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.8, marginTop: 26, marginBottom: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: colors.border,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 5 }, android: { elevation: 1 } }),
  },
  divider: { height: 1, backgroundColor: '#F1F3F7', marginVertical: 14 },

  milestone: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  milestoneIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  milestoneIconPaid: { backgroundColor: '#E0F5F1' },
  milestoneIconPending: { backgroundColor: '#FFF1E6' },
  milestoneLabel: { fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  milestoneStatus: { fontSize: fontSizes.xs, fontFamily: fonts.body, marginTop: 2 },
  milestoneAmount: { fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  milestoneAmountPending: { color: colors.textTertiary },

  roundRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F3F7' },
  roundRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  roundLabel: { fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  roundDate: { fontSize: fontSizes.xs, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 2 },
  roundStatus: { fontSize: fontSizes.xs + 1, fontWeight: '700', fontFamily: fonts.heavy },

  emptyRounds: { alignItems: 'center', gap: 6, paddingVertical: 14 },
  emptyRoundsTitle: { fontSize: fontSizes.base, fontFamily: fonts.heavy, fontWeight: '700', color: colors.textSecondary, marginTop: 4 },
  emptyRoundsSub: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textTertiary, textAlign: 'center', lineHeight: 18 },

  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF2F2', borderRadius: radii.lg, borderWidth: 1, borderColor: '#FECACA', padding: 16, marginTop: 24 },
  errorText: { flex: 1, fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.error, lineHeight: 18 },

  emptyTitle: { fontSize: fontSizes.lg, fontFamily: fonts.heavy, color: colors.textSecondary },

  tealBtn: { backgroundColor: TEAL, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 26 },
  tealBtnText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy },
  ghostBtn: { paddingVertical: 14, paddingHorizontal: 22 },
  ghostBtnText: { color: colors.textSecondary, fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.heavy },
});
