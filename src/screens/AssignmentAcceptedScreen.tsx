/**
 * ASSIGNMENT_ACCEPTED_SCREEN
 * owner_role: CONSULTANT
 * previous_screen: CREATOR_WORKORDER (price handshake — Accept)
 * next_screen: ASSIGNMENT_PAYMENT | CHAT | CONSULTANT_DASHBOARD
 * workflow_stage: ASSIGNED → ADVANCE_PENDING
 *
 * Accepting a price used to fire an Alert and drop the consultant back on the
 * dashboard, which gave them no record of what they had just committed to and
 * no idea what happens next. This is that missing confirmation: the terms they
 * accepted, then the three steps between here and starting work.
 *
 * Read-only. The state transition already happened in acceptProjectPrice()
 * before this screen is reached — nothing here can fail or need retrying.
 */
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CheckCircle2, MessageCircle, IndianRupee, CalendarClock,
  Wallet, FileSignature, Palette, ArrowRight,
} from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import { getAssignmentTitle } from '../lib/assignment';

const NAVY = '#1B3A5C';
const TEAL = '#3D9B8F';
const BG = '#EDF1F5';

/** What stands between accepting and actually starting the work. */
const NEXT_STEPS = [
  {
    Icon: Wallet,
    title: 'Client pays the advance',
    body: 'Half the agreed amount. You are notified the moment it lands.',
  },
  {
    Icon: FileSignature,
    title: 'Work Order is issued',
    body: 'A formal record of scope, price and deadline for both of you to accept.',
  },
  {
    Icon: Palette,
    title: 'You start the first design round',
    body: 'Three review rounds are included before final delivery.',
  },
];

export default function AssignmentAcceptedScreen({ navigation, route }: any) {
  const project = route?.params?.project;
  // Passed explicitly by the caller: the number that was actually accepted,
  // which is the counter-offer when one side countered, not the opening budget.
  const agreedAmount = Number(
    route?.params?.agreedAmount ?? project?.final_offer ?? project?.budget ?? 0,
  );

  const title = getAssignmentTitle(project);
  const clientName = project?.client_name || 'the client';

  const deadline = (() => {
    if (!project?.deadline) return 'To be agreed';
    const d = new Date(project.deadline);
    if (Number.isNaN(d.getTime())) return 'To be agreed';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  function goToDashboard() {
    navigation.navigate('Main', { screen: 'Dashboard' });
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScreenHeader title="Assignment Accepted" />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Confirmation ── */}
        <View style={s.markWrap}>
          <CheckCircle2 size={54} color={TEAL} />
        </View>
        <Text style={s.heroTitle}>Assignment Accepted</Text>
        <Text style={s.heroSub}>
          You and {clientName} agreed on the price. The project is now yours.
        </Text>

        {/* ── Terms accepted ── */}
        <View style={s.card}>
          <Text style={s.cardEyebrow}>YOU ACCEPTED</Text>
          <Text style={s.assignmentTitle}>{title}</Text>

          <View style={s.termRow}>
            <View style={s.termIcon}><IndianRupee size={15} color={NAVY} /></View>
            <View style={s.termBody}>
              <Text style={s.termLabel}>AGREED PRICE</Text>
              <Text style={s.termValueStrong}>₹{agreedAmount.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          <View style={s.termRow}>
            <View style={s.termIcon}><CalendarClock size={15} color={NAVY} /></View>
            <View style={s.termBody}>
              <Text style={s.termLabel}>DEADLINE</Text>
              <Text style={s.termValue}>{deadline}</Text>
            </View>
          </View>

          <View style={s.termRow}>
            <View style={s.termIcon}><MessageCircle size={15} color={NAVY} /></View>
            <View style={s.termBody}>
              <Text style={s.termLabel}>CLIENT</Text>
              <Text style={s.termValue}>{clientName}</Text>
            </View>
          </View>
        </View>

        {/* ── What happens next ── */}
        <Text style={s.sectionLabel}>WHAT HAPPENS NEXT</Text>
        <View style={s.stepsCard}>
          {NEXT_STEPS.map((step, i) => (
            <View key={step.title} style={[s.stepRow, i === NEXT_STEPS.length - 1 && s.stepRowLast]}>
              <View style={s.stepIcon}>
                <step.Icon size={16} color={TEAL} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.stepBody}>{step.body}</Text>
              </View>
              <Text style={s.stepIndex}>{i + 1}</Text>
            </View>
          ))}
        </View>

        <View style={s.waitingNote}>
          <Text style={s.waitingText}>
            Nothing is needed from you until the advance is paid. You will get a
            notification, and the project will move to your Projects tab.
          </Text>
        </View>

        {/* ── Actions ── */}
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => navigation.navigate('AssignmentPayment', { project, agreedAmount })}
          activeOpacity={0.85}
        >
          <Wallet size={16} color="#fff" />
          <Text style={s.primaryBtnText}>Track Payment</Text>
          <ArrowRight size={16} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={s.tealBtn}
          onPress={() => navigation.navigate('Chat', { project, otherName: clientName })}
          activeOpacity={0.85}
        >
          <MessageCircle size={16} color="#fff" />
          <Text style={s.primaryBtnText}>Message {clientName}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.ghostBtn} onPress={goToDashboard} activeOpacity={0.85}>
          <Text style={s.ghostBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 60 },

  markWrap: { alignItems: 'center', marginTop: 28, marginBottom: 14 },
  heroTitle: { fontSize: 28, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY, textAlign: 'center', lineHeight: 34 },
  heroSub: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, marginTop: 8, marginBottom: 26 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 }, android: { elevation: 2 } }),
  },
  cardEyebrow: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.8 },
  assignmentTitle: { fontSize: 22, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY, lineHeight: 29, marginTop: 6, marginBottom: 18 },

  termRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  termIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F3F5F9', alignItems: 'center', justifyContent: 'center' },
  termBody: { flex: 1 },
  termLabel: { fontSize: 9, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.7, marginBottom: 2 },
  termValue: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  termValueStrong: { fontSize: 22, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY },

  sectionLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.8, marginTop: 26, marginBottom: 10 },
  stepsCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 18 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F3F7' },
  stepRowLast: { borderBottomWidth: 0 },
  stepIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E0F5F1', alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  stepBody: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 18, marginTop: 3 },
  stepIndex: { fontSize: fontSizes.sm, fontWeight: '900', fontFamily: fonts.heavy, color: '#D5DBE5' },

  waitingNote: { backgroundColor: '#E0F5F1', borderRadius: radii.lg, padding: 16, marginTop: 18, borderWidth: 1, borderColor: TEAL },
  waitingText: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: '#1F5F58', lineHeight: 19 },

  primaryBtn: { backgroundColor: NAVY, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 26 },
  tealBtn: { backgroundColor: TEAL, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 },
  primaryBtnText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy },
  ghostBtn: { paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  ghostBtnText: { color: colors.textSecondary, fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.heavy },
});
