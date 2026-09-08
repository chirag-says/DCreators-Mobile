/**
 * CONSULTANT_WORK_ORDER_SCREEN
 *
 * owner_role: CONSULTANT
 * previous_screen: Notification → navigated when work_order_generated
 * next_screen: CONSULTANT_NEGOTIATION_SCREEN (upload section, now in_progress)
 * workflow_stage: work_order_generated → work_order_accepted
 *
 * Figma: CONSULTANT_WORK_ORDER_SCREEN.png
 *
 * Shows a formal Work Order document:
 *  - WO Number / Date
 *  - Project title, Client ↔ Designer
 *  - Project Overview (04)
 *  - Detailed Deliverables (Scope)
 *  - Project Cost breakdown (Total / Advance / Balance)
 *  - Timeline + FINAL DEADLINE
 *  - Deliverables, Revisions, Acceptance legal text
 *  - Accept Work Order button → work_order_accepted → in_progress
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Pencil, Users, BookOpen, Layers,
  CheckCircle2, DollarSign, CalendarClock,
} from 'lucide-react-native';
import { Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { updateProjectStatus } from '../services/projectService';
import { sendNotification } from '../lib/notifications';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';
import { getAssignmentTitle } from '../lib/assignment';
import { formatSchedule } from '../lib/booking';
import FigmaBottomBar from '../components/FigmaBottomBar';

const NAVY = '#1B3A5C';
const TEAL = '#0D7F7A';
const ORANGE = '#E87B35';

// Section header badge colours matching Figma teal circles
const SECTION_BG = '#D9F0EE';
const SECTION_COLOR = TEAL;

function SectionBadge({ number, label, icon }: { number: string; label: string; icon: React.ReactNode }) {
  return (
    <View style={badge.row}>
      <View style={badge.circle}>
        <Text style={badge.number}>{number}</Text>
      </View>
      {icon}
      <Text style={badge.label}>{label}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  circle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: SECTION_BG, alignItems: 'center', justifyContent: 'center',
  },
  number: { fontSize: 13, fontWeight: '800', fontFamily: fonts.heavy, color: TEAL },
  label: { fontSize: 16, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
});

export default function ConsultantWorkOrderScreen({ navigation, route }: any) {
  const { project } = route?.params ?? {};
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(project?.status === 'work_order_accepted');

  const wo = project?.work_order_data ?? {};
  const woNumber = wo.wo_number ?? 'WO-2026-001';
  const woDate = wo.generated_at
    ? new Date(wo.generated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : '09 June 2026';

  const totalFee = wo.final_offer ?? project?.final_offer ?? project?.budget ?? 0;
  const advancePaid = wo.advance_paid ?? Math.round(Number(totalFee) * 0.5);
  const balanceDue = wo.balance_due ?? (Number(totalFee) - Number(advancePaid));

  // Null on bidding-path projects and anything created before the schedule
  // columns existed, in which case the card falls back to the deadline alone.
  const bookedSlot = formatSchedule(project);

  const deadline = (() => {
    const raw = wo.deadline ?? project?.deadline;
    if (!raw) return '15 September 2026';
    return new Date(raw).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  })();

  const clientName = project?.client_name ?? 'Client';
  const designerName = project?.consultant_profiles?.display_name ?? 'Designer';
  const projectTitle = getAssignmentTitle(project);
  const overview = project?.assignment_brief ??
    'The objective is to develop a comprehensive brand identity system for the startup. The visual language must modernize the brand while maintaining long-term credibility.';

  const deliverables: Array<{ key: string; title: string; desc: string }> = (() => {
    const items = project?.assignment_details ?? [];
    const defaults = [
      { key: 'A', title: 'Primary Logo Design', desc: 'Main mark, color/mono variants, horizontal and vertical orientations.' },
      { key: 'B', title: 'Secondary Brand Marks', desc: 'Iconography sets, secondary marks, and specific lockups for UI/UX elements.' },
      { key: 'C', title: 'Brand Guidelines', desc: '20-page comprehensive document covering usage, palette, and typography.' },
      { key: 'D', title: 'Social Media Templates', desc: '5 editable high-fidelity templates for Instagram, LinkedIn, and Twitter.' },
    ];
    if (items.length === 0) return defaults;
    return items.map((item: string, i: number) => ({
      key: String.fromCharCode(65 + i),
      title: item,
      desc: '',
    }));
  })();

  async function handleAccept() {
    if (!project?.id) { Alert.alert('Error', 'Project not found.'); return; }
    setAccepting(true);
    try {
      // Flow A step 5: work_order_generated → work_order_accepted
      await updateProjectStatus(project.id, 'work_order_accepted');

      if (project.client_id) {
        sendNotification({
          userId: project.client_id,
          title: 'Work Order Accepted',
          message: `${designerName} has accepted the Work Order. Please approve to start the project.`,
          type: 'assignment',
        });
      }

      setAccepted(true);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setAccepting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Top header */}
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={18} color={NAVY} />
        </TouchableOpacity>
        <Image source={{ uri: RemoteAssets.dIcon }} style={styles.dIcon} resizeMode="contain" />
        <Text style={styles.headerTagline}>HIRE CREATIVES. BUY ART. BUILD IDEAS</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── WO title block ───────────────────────────── */}
        <View style={styles.woTitleBlock}>
          <Text style={styles.woTitle}>WORK{'\n'}ORDER</Text>
          <Text style={styles.woSubtitle}>FORMAL ASSIGNMENT DOCUMENT</Text>
          <Text style={styles.woNumber}>Work Order No.: {woNumber}</Text>
          <Text style={styles.woDate}>Date: {woDate}</Text>
        </View>

        {/* ── PROJECT TITLE ────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>PROJECT TITLE</Text>
          <Text style={styles.projectTitle}>{projectTitle}</Text>
          <View style={styles.clientDesignerRow}>
            <View style={styles.clientDesignerCol}>
              <Text style={styles.fieldLabel}>CLIENT</Text>
              <Text style={styles.fieldValue}>{clientName}</Text>
            </View>
            <View style={styles.clientDesignerCol}>
              <Text style={styles.fieldLabel}>DESIGNER</Text>
              <Text style={styles.fieldValue}>{designerName}</Text>
            </View>
          </View>
        </View>

        {/* ── 04 Project Overview ───────────────────────── */}
        <View style={styles.section}>
          <SectionBadge number="04" label="Project Overview" icon={<BookOpen size={16} color={TEAL} />} />
          <Text style={styles.overviewText}>{overview}</Text>
        </View>

        {/* ── Scope / Detailed Deliverables ─────────────── */}
        <View style={styles.section}>
          <View style={styles.scopeHeader}>
            <View style={styles.scopeTag}><Text style={styles.scopeTagText}>Scop</Text></View>
            <Text style={[badge.label, { marginLeft: 10 }]}>Detailed Deliverables</Text>
          </View>
          {deliverables.map((d, i) => (
            <View key={d.key} style={styles.deliverableCard}>
              <View style={styles.deliverableHeader}>
                <Text style={styles.deliverableKey}>{d.key}.</Text>
                <Text style={styles.deliverableTitle}>{d.title}</Text>
                <Pencil size={14} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
              </View>
              {d.desc ? <Text style={styles.deliverableDesc}>{d.desc}</Text> : null}
            </View>
          ))}
        </View>

        {/* ── 05 Project Cost ───────────────────────────── */}
        <View style={styles.section}>
          <SectionBadge number="05" label="Project Cost" icon={<DollarSign size={16} color={TEAL} />} />
          <View style={styles.costTable}>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Total Project Fee</Text>
              <Text style={styles.costTotalValue}>{Number(totalFee).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Advance Paid</Text>
              <Text style={[styles.costValue, { color: TEAL }]}>
                ₹{Number(advancePaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Balance Due</Text>
              <Text style={[styles.costValue, { color: ORANGE }]}>
                ₹{Number(balanceDue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>

        {/* ── 08 Timeline ───────────────────────────────── */}
        <View style={styles.section}>
          <SectionBadge number="08" label="Timeline" icon={<CalendarClock size={16} color={TEAL} />} />
          <View style={styles.timelineCard}>
            {/* The booked slot, above the delivery deadline: they are different
                dates and the work order only ever showed the second one. */}
            {bookedSlot && (
              <>
                <Text style={styles.timelineFinalLabel}>BOOKED SLOT</Text>
                <Text style={styles.timelineFinalDate}>{bookedSlot}</Text>
                <View style={{ height: 12 }} />
              </>
            )}
            <Text style={styles.timelineFinalLabel}>FINAL DEADLINE</Text>
            <Text style={styles.timelineFinalDate}>{deadline}</Text>
            <Text style={styles.timelineMilestone}>Milestone updates every 14 days.</Text>
          </View>
        </View>

        {/* ── Legal text blocks ─────────────────────────── */}
        <View style={styles.legalSection}>
          {[
            {
              icon: <Layers size={14} color={NAVY} />,
              label: 'DELIVERABLES',
              text: '• Ai / EPS / SVG (Vector)\n• PNG / JPG (Raster)\n• PDF Brand Guidelines\n• Editable Templates',
            },
            {
              icon: <Users size={14} color={NAVY} />,
              label: 'REVISIONS',
              text: 'Includes up to two (2) rounds of professional revisions. Additional rounds billed at hourly rates.',
            },
            {
              icon: <CheckCircle2 size={14} color={NAVY} />,
              label: 'ACCEPTANCE',
              text: 'Full intellectual property and usage rights transfer to the client upon final payment settlement.',
            },
          ].map((item) => (
            <View key={item.label} style={styles.legalBlock}>
              <View style={styles.legalLabelRow}>
                {item.icon}
                <Text style={styles.legalLabel}>{item.label}</Text>
              </View>
              <Text style={styles.legalText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* ── Acceptance clause ─────────────────────────── */}
        <Text style={styles.acceptanceClause}>
          By clicking "Accept", you acknowledge and agree to the terms, scope, and financial obligations outlined in this Work Order.
        </Text>

        {/* ── Accept Work Order button ──────────────────── */}
        {accepted ? (
          <View style={styles.acceptedBadge}>
            <CheckCircle2 size={22} color={TEAL} />
            <Text style={styles.acceptedText}>Work Order Accepted — Project is now In Progress</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.acceptBtn, accepting && { opacity: 0.6 }]}
            onPress={handleAccept}
            disabled={accepting}
            activeOpacity={0.85}
          >
            {accepting
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <CheckCircle2 size={18} color="#fff" />
                  <Text style={styles.acceptBtnText}>Accept Work Order ✓</Text>
                </>
            }
          </TouchableOpacity>
        )}

        {accepted && (
          <TouchableOpacity
            style={styles.startWorkBtn}
            onPress={() => navigation.navigate('Main', { screen: 'CreatorWorkorder', params: { project: { ...project, status: 'work_order_accepted' } } })}
            activeOpacity={0.85}
          >
            <Text style={styles.startWorkBtnText}>Go to Project Dashboard →</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <FigmaBottomBar navigation={navigation} activeTab="sales" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6FB' },

  topRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 }, android: { elevation: 2 } }),
  },
  dIcon: { width: 32, height: 32 },
  headerTagline: { flex: 1, fontSize: 9, fontFamily: fonts.body, color: colors.textTertiary, letterSpacing: 0.4 },

  scroll: { paddingBottom: 28, paddingHorizontal: 20 },

  // ── WO title block ──────────────────────────────────────────
  woTitleBlock: { paddingTop: 10, paddingBottom: 20 },
  woTitle: { fontSize: 44, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY, lineHeight: 48, letterSpacing: -1 },
  woSubtitle: { fontSize: 9, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 1.5, marginTop: 6, marginBottom: 6 },
  woNumber: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textPrimary, marginBottom: 2 },
  woDate: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary },

  // ── Sections ────────────────────────────────────────────────
  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    marginBottom: 14,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 }, android: { elevation: 1 } }),
  },

  // ── Project title / Client / Designer ───────────────────────
  fieldLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.8, marginBottom: 4 },
  fieldValue: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  projectTitle: { fontSize: 22, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY, lineHeight: 28, marginBottom: 16 },
  clientDesignerRow: { flexDirection: 'row', gap: 20 },
  clientDesignerCol: { flex: 1 },

  // ── Overview ─────────────────────────────────────────────────
  overviewText: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 22 },

  // ── Scope / Deliverables ─────────────────────────────────────
  scopeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  scopeTag: { backgroundColor: '#F59E0B', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  scopeTagText: { fontSize: 11, fontWeight: '800', fontFamily: fonts.heavy, color: '#fff' },

  deliverableCard: {
    borderWidth: 1, borderColor: '#EEF0F6', borderRadius: 12,
    padding: 14, marginBottom: 10, backgroundColor: '#FAFBFD',
  },
  deliverableHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  deliverableKey: { fontSize: 12, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary },
  deliverableTitle: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY, flex: 1 },
  deliverableDesc: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20 },

  // ── Project Cost ──────────────────────────────────────────────
  costTable: { gap: 10 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F2F8' },
  costLabel: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary },
  costTotalValue: { fontSize: fontSizes.xl, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY },
  costValue: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },

  // ── Timeline ──────────────────────────────────────────────────
  timelineCard: { borderLeftWidth: 3, borderLeftColor: TEAL, paddingLeft: 14, gap: 4 },
  timelineFinalLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: TEAL, letterSpacing: 1 },
  timelineFinalDate: { fontSize: 22, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  timelineMilestone: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary },

  // ── Legal ──────────────────────────────────────────────────────
  legalSection: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14,
    gap: 16,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 }, android: { elevation: 1 } }),
  },
  legalBlock: { gap: 4 },
  legalLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legalLabel: { fontSize: 11, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY, letterSpacing: 0.5 },
  legalText: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20 },

  // ── Accept ───────────────────────────────────────────────────
  acceptanceClause: {
    fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: 18, paddingHorizontal: 10,
  },
  acceptBtn: {
    backgroundColor: NAVY, borderRadius: 14, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12,
  },
  acceptBtnText: { color: '#fff', fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy },
  acceptedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#86EFAC', marginBottom: 12,
  },
  acceptedText: { flex: 1, fontSize: fontSizes.base, fontWeight: '600', fontFamily: fonts.medium, color: '#166534' },
  startWorkBtn: {
    borderWidth: 2, borderColor: NAVY, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginBottom: 6,
  },
  startWorkBtnText: { color: NAVY, fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },

  // ── Bottom nav ────────────────────────────────────────────────
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E8EAF0',
  },
  bottomBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  bottomBtnLabel: { fontSize: 12, fontFamily: fonts.medium, color: colors.textSecondary },
  bottomHomeBtn: { backgroundColor: NAVY, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  bottomHomeBtnLabel: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: fonts.heavy },
});
