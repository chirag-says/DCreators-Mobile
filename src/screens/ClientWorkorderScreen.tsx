// ============================================================
// ClientWorkorderScreen — Project Flow Timeline (Figma Match)
// ============================================================
// Matches: "Project Flow - Final.png" & "Open Source Project Flow -.png"
//
// Shows the full project lifecycle as a vertical timeline:
//   1ST DESIGN OPTION → Client Feedback → Submit Reviews
//   2ND DESIGN CHANGES → Client Feedback → Submit Reviews
//   FINAL DESIGN CHANGES → Approve → Pay → Download → Rate
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Platform, ActivityIndicator, Image, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopHeader from '../components/TopHeader';
import { updateProjectStatus, fetchProjectSubmissions } from '../services/projectService';
import {
  FileText, ImageIcon, ChevronRight, Info,
  ArrowLeft, Lock, Download, Star, MessageCircle,
} from 'lucide-react-native';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';
import type { Submission } from '../types';


// ─── Constants ───────────────────────────────────────────────
const ROUND_META: Record<string, { label: string; uploadLabel: string; feedbackLabel: string }> = {
  review_1: {
    label: '1ST DESIGN OPTION UPLOADED',
    uploadLabel: '1st Design Options',
    feedbackLabel: 'Your 1st review/ required changes on uploaded design',
  },
  review_2: {
    label: '2ND DESIGN CHANGES UPLOADED',
    uploadLabel: '2nd Design Options',
    feedbackLabel: 'Your 2nd review/ required changes on uploaded design',
  },
  final: {
    label: 'FINAL DESIGN CHANGES UPLOADED',
    uploadLabel: 'Final Design Changes',
    feedbackLabel: 'Your Final review/ required changes on uploaded design',
  },
};


export default function ClientWorkorderScreen({ navigation, route }: any) {
  const project = route?.params?.project;
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const projectCode = project
    ? `D/${new Date(project.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '/')}`
    : 'D/--/--/--';

  const status = project?.status || 'assigned';
  const isCompleted = status === 'completed' || status === 'balance_paid' || status === 'delivered';
  const isApproved = status === 'final_approved' || isCompleted;

  // ─── Fetch all submissions ────────────────────────────────
  const fetchSubmissions = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const data = await fetchProjectSubmissions(project.id);
      setSubmissions(data);
    } catch (err) {
      console.log('[ClientWorkorder] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [project?.id]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // ─── Derived data ─────────────────────────────────────────
  const round1 = submissions.find(s => s.round === 'review_1');
  const round2 = submissions.find(s => s.round === 'review_2');
  const roundFinal = submissions.find(s => s.round === 'final');

  const assignmentType = project?.assignment_type
    ? project.assignment_type.charAt(0).toUpperCase() + project.assignment_type.slice(1).replace(/_/g, ' ')
    : 'Creative Service';

  const clientName = project?.client_name || 'Client';

  async function handleApproveWorkOrder() {
    if (!project?.id) return;
    try {
      // work_order_accepted → in_progress validated by status machine
      await updateProjectStatus(project.id, 'in_progress');
      if (project.consultant_id) {
        const { sendNotification } = await import('../lib/notifications');
        sendNotification({
          userId: project.consultant_id,
          title: 'Project Started',
          message: 'The client has approved the Work Order. Your project is now in progress!',
          type: 'assignment',
        });
      }
      Alert.alert('Project Started ✅', 'Work Order approved. Project is now in progress.');
    } catch (err: any) { Alert.alert('Error', err.message); }
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopHeader />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.orange} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header Section ─────────────────────────────── */}
          <View style={styles.headerSection}>
            <Text style={styles.projectTitle}>
              Project Assignment - {projectCode}
            </Text>
            <Text style={styles.projectSubtitle}>
              Incoming Request from "{project?.client_name || 'Client'}"
            </Text>
          </View>

          {/* Step 6: Work Order Accepted — client approves to start */}
          {status === 'work_order_accepted' && (
            <View style={styles.approvalBanner}>
              <Text style={styles.approvalTitle}>Work Order Accepted by Consultant</Text>
              <Text style={styles.approvalSubtitle}>Review the Work Order and approve to officially start the project.</Text>
              <TouchableOpacity style={styles.approvalBtn} onPress={handleApproveWorkOrder}>
                <Text style={styles.approvalBtnText}>Approve &amp; Start Project →</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.viewWoBtn} onPress={() => navigation.navigate('ClientWorkorder', { project })}>
                <Text style={styles.viewWoBtnText}>View Work Order Details</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{assignmentType.toUpperCase()}</Text>
          </View>

          {/* ── Timeline Container ─────────────────────────── */}
          <View style={styles.timelineContainer}>

            {/* ═══ ROUND 1 ═══ */}
            <RoundSection
              submission={round1}
              round="review_1"
              status={status}
              navigation={navigation}
              project={project}
            />

            {/* ═══ ROUND 2 ═══ */}
            {(round1?.client_action === 'revert' || round2) && (
              <RoundSection
                submission={round2}
                round="review_2"
                status={status}
                navigation={navigation}
                project={project}
                previousFeedback={round1}
              />
            )}

            {/* ═══ FINAL ROUND ═══ */}
            {(round2?.client_action === 'revert' || roundFinal || round2?.client_action === 'approve') && (
              <RoundSection
                submission={roundFinal}
                round="final"
                status={status}
                navigation={navigation}
                project={project}
                previousFeedback={round2}
                isFinal
              />
            )}

            {/* ═══ POST-FINAL ACTIONS ═══ */}
            {isApproved && (
              <View style={styles.postFinalSection}>
                {/* Approve Design Card */}
                <View style={styles.approveDesignCard}>
                  <ImageIcon size={28} color={colors.teal} />
                  <Text style={styles.approveDesignLabel}>Approve Design</Text>
                  <Text style={styles.approveDesignHint}>Click to View</Text>
                </View>

                {/* Pay Done Button */}
                <TouchableOpacity
                  style={styles.payDoneBtn}
                  onPress={() => {
                    // Spec: final_approved → balance_pending (client pays balance)
                    if (status === 'final_approved') {
                      navigation.navigate('Payment', { project, paymentType: 'balance' });
                    }
                  }}
                >
                  <Text style={styles.payDoneBtnText}>Pay Done</Text>
                  <Lock size={14} color={colors.textOnPrimary} />
                </TouchableOpacity>

                {/* Download Final Design */}
                {isCompleted && (
                  <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => {
                      const finalFiles = roundFinal?.files;
                      if (finalFiles?.[0]) {
                        Linking.openURL(finalFiles[0]);
                      }
                    }}
                  >
                    <Download size={16} color={colors.primary} />
                    <Text style={styles.downloadBtnText}>Download the Final Design</Text>
                  </TouchableOpacity>
                )}

                {/* Rate Experience CTA */}
                {isCompleted && (
                  <TouchableOpacity
                    style={styles.rateCta}
                    onPress={() => navigation.navigate('RateConsultant', { project })}
                  >
                    <Text style={styles.rateCtaText}>RATE YOUR EXPERIENCE</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

          </View>

          {/* ── Empty state when no submissions ────────────── */}
          {submissions.length === 0 && (
            <View style={styles.emptyState}>
              <FileText size={48} color={colors.borderInput} />
              <Text style={styles.emptyTitle}>Awaiting First Submission</Text>
              <Text style={styles.emptySubtitle}>
                Your consultant will upload the first design options here once work begins.
              </Text>
            </View>
          )}

        </ScrollView>
      )}

      {/* ── Bottom Action Bar ────────────────────────────────── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.bottomBackBtn}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={18} color={colors.textPrimary} />
          <Text style={styles.bottomBackText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomChatBtn}
          onPress={() => navigation.navigate('Chat', {
            project,
            otherName: project?.consultant_profiles?.display_name || 'Consultant',
          })}
        >
          <MessageCircle size={16} color={colors.textOnPrimary} />
          <Text style={styles.bottomChatText}>Chat</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}


// ═══════════════════════════════════════════════════════════════
// RoundSection — A single round in the timeline
// ═══════════════════════════════════════════════════════════════
function RoundSection({
  submission,
  round,
  status,
  navigation,
  project,
  previousFeedback,
  isFinal = false,
}: {
  submission: Submission | undefined;
  round: 'review_1' | 'review_2' | 'final';
  status: string;
  navigation: any;
  project: any;
  previousFeedback?: Submission;
  isFinal?: boolean;
}) {
  const meta = ROUND_META[round];
  const uploadDate = submission
    ? new Date(submission.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : null;

  const hasSubmission = !!submission;
  const hasFeedback = !!submission?.client_action;
  const feedbackText = submission?.feedback_text;
  const isReviewPhase = round === 'review_1'
    ? status === 'review_1'
    : round === 'review_2'
      ? status === 'review_2'
      : status === 'final_review';

  // For the Figma: Show the previous round's feedback text when present
  const previousFeedbackText = previousFeedback?.feedback_text;

  return (
    <View style={styles.roundSection}>
      {/* ── Timeline dot + line ──────────────────────────── */}
      <View style={styles.timelineDotCol}>
        <View style={[
          styles.timelineDot,
          hasSubmission && styles.timelineDotActive,
        ]} />
        <View style={[
          styles.timelineVertLine,
          hasSubmission && styles.timelineVertLineActive,
        ]} />
      </View>

      {/* ── Round Content ────────────────────────────────── */}
      <View style={styles.roundContent}>
        {/* Upload header */}
        {hasSubmission ? (
          <View style={styles.uploadHeader}>
            <FileText size={16} color={colors.orange} />
            <View style={{ flex: 1 }}>
              <Text style={styles.uploadHeaderText}>
                {meta.label}
              </Text>
              <Text style={styles.uploadHeaderDate}>ON - {uploadDate}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.uploadHeaderPending}>
            <FileText size={16} color={colors.textTertiary} />
            <Text style={styles.uploadHeaderTextPending}>
              {meta.label}
            </Text>
          </View>
        )}

        {/* Design preview card */}
        {hasSubmission && (
          <TouchableOpacity
            style={styles.designPreviewCard}
            onPress={() => {
              if (submission?.files?.length) {
                navigation.navigate('PortfolioGallery', {
                  images: submission.files,
                  initialIndex: 0,
                });
              }
            }}
          >
            {submission?.files?.[0] ? (
              <Image
                source={{ uri: submission.files[0] }}
                style={styles.designPreviewImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.designPreviewPlaceholder}>
                <ImageIcon size={32} color={colors.textTertiary} />
              </View>
            )}
            <Text style={styles.designPreviewLabel}>{meta.uploadLabel}</Text>
            <Text style={styles.designPreviewHint}>Click to View</Text>
          </TouchableOpacity>
        )}

        {/* Feedback info bubble — shows when round needs review */}
        {hasSubmission && isReviewPhase && !hasFeedback && (
          <View style={styles.feedbackInfoBubble}>
            <Info size={14} color={colors.teal} />
            <Text style={styles.feedbackInfoText}>{meta.feedbackLabel}</Text>
          </View>
        )}

        {/* Previous feedback display (text from prior round's revert) */}
        {previousFeedbackText && (
          <View style={styles.previousFeedbackCard}>
            <Text style={styles.previousFeedbackText}>
              {previousFeedbackText}
            </Text>
          </View>
        )}

        {/* Client's feedback on this round (after they've submitted) */}
        {hasFeedback && feedbackText && (
          <View style={styles.clientFeedbackCard}>
            <View style={styles.feedbackInfoBubble}>
              <Info size={14} color={colors.orange} />
              <Text style={[styles.feedbackInfoText, { color: colors.orange }]}>
                {round === 'final'
                  ? 'Your Final review/ required changes on uploaded design'
                  : `Your ${round === 'review_1' ? '1st' : '2nd'} review/ required changes on uploaded design`
                }
              </Text>
            </View>
            <Text style={styles.feedbackDisplayText}>{feedbackText}</Text>
          </View>
        )}

        {/* Submit Reviews/Changes CTA */}
        {hasSubmission && isReviewPhase && !hasFeedback && (
          <TouchableOpacity
            style={styles.submitReviewBtn}
            onPress={() => navigation.navigate('ClientReview', { project })}
          >
            <MessageCircle size={14} color={colors.textOnPrimary} />
            <Text style={styles.submitReviewBtnText}>
              Submit your {round === 'review_1' ? '' : round === 'review_2' ? '2nd ' : 'final '}reviews/ Changes
            </Text>
          </TouchableOpacity>
        )}

        {/* Final approval section */}
        {isFinal && submission?.client_action === 'approve' && (
          <View style={styles.finalApprovalNote}>
            <Text style={styles.finalApprovalText}>
              Final Approval : Upload all the designs
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}


// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screenBg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 100 },

  approvalBanner: { marginHorizontal: spacing.xl, marginBottom: spacing.lg, backgroundColor: '#EFF6FF', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#BFDBFE' },
  approvalTitle: { fontSize: fontSizes.lg, fontWeight: '700', fontFamily: fonts.heavy, color: '#1E3A5F', marginBottom: 6 },
  approvalSubtitle: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20, marginBottom: 14 },
  approvalBtn: { backgroundColor: '#1B3A5C', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  approvalBtnText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },
  viewWoBtn: { borderWidth: 1, borderColor: '#1B3A5C', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  viewWoBtnText: { color: '#1B3A5C', fontSize: fontSizes.base, fontWeight: '600', fontFamily: fonts.medium },

  // ── Header ──────────────────────────────────────────────────
  headerSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  projectTitle: {
    fontSize: fontSizes['2xl'],
    fontWeight: '700',
    fontFamily: fonts.heavy,
    color: colors.orange,
    marginBottom: spacing.xs,
  },
  projectSubtitle: {
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // ── Category badge ──────────────────────────────────────────
  categoryBadge: {
    alignSelf: 'flex-start',
    marginLeft: spacing.xl,
    marginBottom: spacing.xl,
    backgroundColor: '#E0F5F1',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.teal,
  },
  categoryBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    color: colors.teal,
    letterSpacing: 0.5,
  },

  // ── Timeline Container ──────────────────────────────────────
  timelineContainer: {
    paddingHorizontal: spacing.xl,
  },

  // ── Round Section ───────────────────────────────────────────
  roundSection: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },

  // Timeline dot column
  timelineDotCol: {
    alignItems: 'center',
    width: 24,
    marginRight: spacing.md,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.borderInput,
    marginTop: 4,
  },
  timelineDotActive: {
    backgroundColor: colors.orange,
  },
  timelineVertLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.borderInput,
    marginTop: spacing.xs,
  },
  timelineVertLineActive: {
    backgroundColor: '#E8854A50',
  },

  // Round content
  roundContent: {
    flex: 1,
    paddingBottom: spacing.xl,
  },

  // Upload header
  uploadHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  uploadHeaderText: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    color: colors.orange,
    letterSpacing: 0.3,
  },
  uploadHeaderDate: {
    fontSize: fontSizes.xs + 1,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  uploadHeaderPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    opacity: 0.5,
  },
  uploadHeaderTextPending: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    fontFamily: fonts.medium,
    color: colors.textTertiary,
    letterSpacing: 0.3,
  },

  // Design preview card (matching Figma — light card with image icon)
  designPreviewCard: {
    backgroundColor: '#F0F4F8',
    borderRadius: radii.lg,
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 120,
  },
  designPreviewImage: {
    width: '100%',
    height: 140,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  designPreviewPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: radii.md,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  designPreviewLabel: {
    fontSize: fontSizes.base,
    fontWeight: '600',
    fontFamily: fonts.medium,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  designPreviewHint: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.body,
    color: colors.textTertiary,
  },

  // Feedback info bubble
  feedbackInfoBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#E0F5F1',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  feedbackInfoText: {
    fontSize: fontSizes.xs + 1,
    fontFamily: fonts.medium,
    color: colors.teal,
    flex: 1,
    lineHeight: 16,
  },

  // Previous feedback card (italic text from prior round)
  previousFeedbackCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  previousFeedbackText: {
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: 22,
  },

  // Client feedback after submission
  clientFeedbackCard: {
    marginBottom: spacing.md,
  },
  feedbackDisplayText: {
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  // Submit reviews button
  submitReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.teal,
    paddingVertical: 14,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  submitReviewBtnText: {
    color: colors.textOnPrimary,
    fontSize: fontSizes.sm + 1,
    fontWeight: '700',
    fontFamily: fonts.heavy,
  },

  // Final approval note
  finalApprovalNote: {
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  finalApprovalText: {
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // ── Post-final actions ──────────────────────────────────────
  postFinalSection: {
    paddingLeft: 36, // indent past the timeline
    paddingTop: spacing.md,
  },

  // Approve design card
  approveDesignCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    minHeight: 100,
  },
  approveDesignLabel: {
    fontSize: fontSizes.base,
    fontWeight: '600',
    fontFamily: fonts.medium,
    color: colors.teal,
    marginTop: spacing.sm,
  },
  approveDesignHint: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.body,
    color: colors.textTertiary,
    marginTop: 2,
  },

  // Pay Done button
  payDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    paddingVertical: 16,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  payDoneBtnText: {
    color: colors.textOnPrimary,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    fontFamily: fonts.heavy,
  },

  // Download button
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardBg,
    paddingVertical: 14,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  downloadBtnText: {
    color: colors.primary,
    fontSize: fontSizes.base,
    fontWeight: '700',
    fontFamily: fonts.heavy,
  },

  // Rate CTA
  rateCta: {
    backgroundColor: colors.orange,
    paddingVertical: 16,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  rateCtaText: {
    color: colors.textOnPrimary,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    fontFamily: fonts.heavy,
    letterSpacing: 1,
  },

  // ── Empty state ─────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing['5xl'],
    paddingHorizontal: spacing['3xl'],
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    color: colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: fontSizes.sm + 1,
    fontFamily: fonts.body,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── Bottom Bar ──────────────────────────────────────────────
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 30 : spacing.md,
    backgroundColor: colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: colors.borderCard,
    gap: spacing.md,
  },
  bottomBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  bottomBackText: {
    fontSize: fontSizes.base,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  bottomChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.lg,
  },
  bottomChatText: {
    color: colors.textOnPrimary,
    fontSize: fontSizes.base,
    fontWeight: '700',
    fontFamily: fonts.heavy,
  },
});
