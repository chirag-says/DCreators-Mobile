import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Platform, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopHeader from '../components/TopHeader';
import { supabase } from '../lib/supabase';
import { updateProjectStatus } from '../services/projectService';
import { sendNotification } from '../lib/notifications';
import { ArrowLeft, Check, RotateCcw, Pause, X, MessageSquare } from 'lucide-react-native';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';

// Next status per round when client approves
const APPROVE_NEXT: Record<string, string> = {
  review_1: 'review_2',
  review_2: 'final_review',
  final:    'final_approved',
};

export default function ClientReviewScreen({ navigation, route }: any) {
  const project = route?.params?.project;
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeFile, setActiveFile] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const [colourChecked, setColourChecked] = useState(false);
  const [conceptChecked, setConceptChecked] = useState(false);
  const [designChecked, setDesignChecked] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchSubmission(); }, []);

  async function fetchSubmission() {
    if (!project?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') console.log('[Review] fetch:', error.message);
      if (data) { setSubmission(data); setSelectedOption(data.selected_option || null); }
    } catch (err) { console.log('[Review]', err); }
    finally { setLoading(false); }
  }

  async function handleApprove() {
    if (!submission?.id || !project?.id) return;
    Alert.alert('Approve Design?', 'This will approve the design and move the project forward.', [
      { text: 'Cancel' },
      { text: 'Approve', onPress: async () => {
        setIsSaving(true);
        try {
          await supabase.from('submissions').update({
            client_action: 'approve',
            selected_option: selectedOption || 1,
          }).eq('id', submission.id);

          // round-specific next status: review_1→review_2, review_2→final_review, final→final_approved
          const nextStatus = APPROVE_NEXT[submission.round] as any;
          const nextProgress = submission.round === 'review_1' ? 40 : submission.round === 'review_2' ? 70 : 100;
          await updateProjectStatus(project.id, nextStatus, { progress_percent: nextProgress });

          if (project.consultant_id) {
            sendNotification({
              userId: project.consultant_id,
              title: submission.round === 'final' ? 'Design Approved! 🎉' : 'Design Approved',
              message: submission.round === 'final'
                ? 'Client approved your final design. Project complete!'
                : `Client approved your ${submission.round === 'review_1' ? 'Round 1' : 'Round 2'} design.`,
              type: 'review',
            });
          }

          Alert.alert('✅ Approved!', submission.round === 'final'
            ? 'Final design approved! Proceed to balance payment.'
            : 'Design approved. Consultant will upload the next round.',
            [{ text: 'OK', onPress: () => {
              if (submission.round === 'final') {
                navigation.replace('Payment', { project, paymentType: 'balance' });
              } else {
                navigation.goBack();
              }
            }}]
          );
        } catch (err: any) { Alert.alert('Error', err.message || 'Something went wrong.'); }
        finally { setIsSaving(false); }
      }},
    ]);
  }

  async function handleRevert() {
    if (!submission?.id || !project?.id) return;
    if (!feedbackText.trim() && !colourChecked && !conceptChecked && !designChecked) {
      Alert.alert('Feedback Required', 'Please check at least one area or type your feedback.');
      return;
    }
    setIsSaving(true);
    try {
      await supabase.from('submissions').update({
        client_action: 'revert',
        feedback_colour: colourChecked,
        feedback_concept: conceptChecked,
        feedback_design_look: designChecked,
        feedback_text: feedbackText || null,
      }).eq('id', submission.id);

      // Any review round → in_progress on revert
      await updateProjectStatus(project.id, 'in_progress');

      if (project.consultant_id) {
        const areas = [colourChecked && 'Colour', conceptChecked && 'Concept', designChecked && 'Design Look']
          .filter(Boolean).join(', ');
        sendNotification({
          userId: project.consultant_id,
          title: 'Changes Requested',
          message: `Client requested revisions${areas ? ` on: ${areas}` : ''}. ${feedbackText || ''}`.trim(),
          type: 'review',
        });
      }
      Alert.alert('Changes Requested', 'Feedback sent to consultant.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) { Alert.alert('Error', err.message || 'Something went wrong.'); }
    finally { setIsSaving(false); }
  }

  async function handleHold() {
    if (!submission?.id) return;
    // Hold: freeze review, no status change
    setIsSaving(true);
    try {
      await supabase.from('submissions').update({ client_action: 'hold' }).eq('id', submission.id);
      Alert.alert('On Hold', 'Review paused. Project stays at current status.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) { Alert.alert('Error', err.message || 'Something went wrong.'); }
    finally { setIsSaving(false); }
  }

  async function handleCancel() {
    if (!submission?.id) return;
    Alert.alert('Cancel Review?', 'This only dismisses the review — it does not cancel the project.', [
      { text: 'Back', style: 'cancel' },
      { text: 'Dismiss', onPress: () => navigation.goBack() },
    ]);
  }

  const roundLabel = submission?.round === 'review_1' ? '1st Review'
    : submission?.round === 'review_2' ? '2nd Review' : 'Final Review';
  const files = submission?.files || [];

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopHeader />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>

            <View style={styles.titleRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <ArrowLeft size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.pageTitle}>Review Design</Text>
              <View style={{ width: 36 }} />
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
            ) : !submission ? (
              <View style={styles.emptyState}>
                <MessageSquare size={48} color={colors.borderInput} />
                <Text style={styles.emptyTitle}>No submissions yet</Text>
                <Text style={styles.emptySubtitle}>The consultant hasn't uploaded designs yet</Text>
              </View>
            ) : (
              <>
                <View style={styles.roundBadgeRow}>
                  <View style={styles.roundBadge}>
                    <Text style={styles.roundBadgeText}>{roundLabel}</Text>
                  </View>
                  <Text style={styles.dateText}>
                    {new Date(submission.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>

                {/* Design Image Carousel */}
                {files.length > 0 && (
                  <View style={styles.carouselSection}>
                    <Text style={styles.sectionLabel}>Submitted Designs ({files.length})</Text>
                    <View style={styles.mainPreview}>
                      <Image source={{ uri: files[activeFile] }} style={styles.mainImage} resizeMode="contain" />
                      <View style={styles.optionBadge}>
                        <Text style={styles.optionBadgeText}>Option {activeFile + 1}</Text>
                      </View>
                    </View>
                    {files.length > 1 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
                        {files.map((uri: string, i: number) => (
                          <TouchableOpacity key={i} style={[styles.thumbWrap, activeFile === i && styles.thumbActive]} onPress={() => setActiveFile(i)}>
                            <Image source={{ uri }} style={styles.thumbImg} />
                            <Text style={styles.thumbLabel}>Option {i + 1}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                )}

                {/* Option Select — 2B.2 Figma spec */}
                {files.length > 0 && (
                  <View style={styles.selectSection}>
                    <Text style={styles.selectLabel}>SELECT PREFERRED OPTION</Text>
                    <View style={styles.selectRow}>
                      {files.map((_: string, i: number) => (
                        <TouchableOpacity
                          key={i}
                          style={[styles.selectChip, selectedOption === i + 1 && styles.selectChipActive]}
                          onPress={() => setSelectedOption(i + 1)}
                        >
                          <Text style={[styles.selectChipText, selectedOption === i + 1 && styles.selectChipTextActive]}>
                            Option {i + 1}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Consultant Note */}
                {submission.consultant_note && (
                  <View style={styles.noteCard}>
                    <Text style={styles.noteLabel}>Consultant's Note</Text>
                    <Text style={styles.noteText}>{submission.consultant_note}</Text>
                  </View>
                )}

                {/* Feedback Toggles — 2B.2 */}
                <View style={styles.reviewCard}>
                  <Text style={styles.reviewTitle}>Request Changes</Text>
                  <Text style={styles.reviewHint}>Check areas that need revision:</Text>
                  <View style={styles.checkGroup}>
                    <TouchableOpacity style={styles.checkRow} onPress={() => setColourChecked(!colourChecked)}>
                      <View style={[styles.checkbox, colourChecked && styles.checkboxChecked]} />
                      <Text style={styles.checkLabel}>Colour</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.checkRow} onPress={() => setConceptChecked(!conceptChecked)}>
                      <View style={[styles.checkbox, conceptChecked && styles.checkboxChecked]} />
                      <Text style={styles.checkLabel}>Concept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.checkRow} onPress={() => setDesignChecked(!designChecked)}>
                      <View style={[styles.checkbox, designChecked && styles.checkboxChecked]} />
                      <Text style={styles.checkLabel}>Design Look</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.feedbackInput}
                    placeholder="Describe the changes you'd like..."
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    textAlignVertical="top"
                    value={feedbackText}
                    onChangeText={setFeedbackText}
                  />
                </View>
              </>
            )}
          </View>
        </ScrollView>

        {/* Four-action bar — Approve / Revert / Hold / Cancel */}
        {submission && !submission.client_action && (
          <View style={styles.actionBar}>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.revertBtn]} onPress={handleRevert} disabled={isSaving}>
                <RotateCcw size={15} color={colors.primary} />
                <Text style={styles.revertBtnText}>Revert</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.holdBtn]} onPress={handleHold} disabled={isSaving}>
                <Pause size={15} color="#92400E" />
                <Text style={styles.holdBtnText}>Hold</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={handleCancel} disabled={isSaving}>
                <X size={15} color={colors.textTertiary} />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.approveBtn} onPress={handleApprove} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color={colors.textOnPrimary} size="small" /> : (
                <>
                  <Check size={18} color={colors.textOnPrimary} />
                  <Text style={styles.approveBtnText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Already actioned — show status */}
        {submission?.client_action && (
          <View style={styles.actionedBar}>
            <Text style={styles.actionedText}>
              {submission.client_action === 'approve' ? '✅ Design Approved'
                : submission.client_action === 'revert' ? '🔄 Changes Requested'
                : submission.client_action === 'hold' ? '⏸ Review On Hold'
                : '↩ Review Dismissed'}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.screenBg },
  safe: { flex: 1 },
  container: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },

  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: fontSizes.xl, fontFamily: fonts.heavy, color: colors.textPrimary },

  emptyState: { alignItems: 'center', marginTop: spacing['5xl'], gap: spacing.sm },
  emptyTitle: { fontSize: fontSizes.lg, fontFamily: fonts.heavy, color: colors.textSecondary },
  emptySubtitle: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textTertiary },

  roundBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  roundBadge: { backgroundColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: 14, borderRadius: radii.sm },
  roundBadgeText: { color: colors.textOnPrimary, fontSize: fontSizes.sm, fontWeight: '700', fontFamily: fonts.heavy },
  dateText: { fontSize: fontSizes.xs + 1, color: colors.textSecondary, fontFamily: fonts.medium },

  carouselSection: { marginBottom: spacing.lg },
  sectionLabel: { fontSize: fontSizes.sm + 1, fontFamily: fonts.heavy, color: colors.textPrimary, marginBottom: 10 },
  mainPreview: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, position: 'relative' },
  mainImage: { width: '100%', height: '100%' },
  optionBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: colors.overlay, paddingHorizontal: 10, paddingVertical: spacing.xs, borderRadius: radii.md },
  optionBadgeText: { color: colors.textOnPrimary, fontSize: fontSizes.xs, fontWeight: '700', fontFamily: fonts.heavy },

  thumbRow: { gap: 10, paddingVertical: 10 },
  thumbWrap: { width: 70, alignItems: 'center', opacity: 0.5 },
  thumbActive: { opacity: 1 },
  thumbImg: { width: 70, height: 70, borderRadius: radii.md, borderWidth: 2, borderColor: 'transparent' },
  thumbLabel: { fontSize: 9, fontFamily: fonts.medium, color: colors.textSecondary, marginTop: spacing.xs },

  // Option select — 2B.2
  selectSection: { marginBottom: spacing.lg },
  selectLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.7, marginBottom: spacing.sm },
  selectRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  selectChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.xl, borderWidth: 1.5, borderColor: colors.borderInput, backgroundColor: colors.sectionBg },
  selectChipActive: { borderColor: colors.success, backgroundColor: '#ECFDF5' },
  selectChipText: { fontSize: fontSizes.xs + 1, fontFamily: fonts.medium, color: colors.textSecondary },
  selectChipTextActive: { color: colors.success, fontWeight: '700' },

  noteCard: { backgroundColor: '#FFF9F0', borderWidth: 1, borderColor: colors.warning, borderRadius: radii.md, padding: 14, marginBottom: spacing.lg },
  noteLabel: { fontSize: fontSizes.xs + 1, fontWeight: '700', color: '#92400E', fontFamily: fonts.heavy, marginBottom: spacing.xs },
  noteText: { fontSize: fontSizes.sm, color: '#78350F', fontFamily: fonts.body, lineHeight: 18 },

  reviewCard: { backgroundColor: 'rgba(255,255,255,0.75)', borderWidth: 1, borderColor: '#E6E6E6', borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.lg, ...shadows.card },
  reviewTitle: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy, marginBottom: spacing.xs },
  reviewHint: { fontSize: fontSizes.xs + 1, color: colors.textTertiary, fontFamily: fonts.body, marginBottom: spacing.md },
  checkGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginBottom: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: { width: 18, height: 18, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 3, backgroundColor: colors.cardBg },
  checkboxChecked: { backgroundColor: colors.primary },
  checkLabel: { fontSize: fontSizes.sm, color: colors.textSecondary, fontWeight: '600', fontFamily: fonts.medium },
  feedbackInput: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderInput, height: 80, borderRadius: radii.md, padding: 10, fontSize: fontSizes.sm, color: colors.textPrimary, fontFamily: fonts.body },

  // Four-action bar
  actionBar: {
    paddingHorizontal: spacing.xl, paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    backgroundColor: colors.cardBg, borderTopWidth: 1, borderTopColor: colors.borderCard,
    gap: spacing.sm,
  },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: radii.md, borderWidth: 1.5 },
  revertBtn: { borderColor: colors.primary, backgroundColor: colors.cardBg },
  revertBtnText: { color: colors.primary, fontSize: fontSizes.sm, fontWeight: '700', fontFamily: fonts.heavy },
  holdBtn: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  holdBtnText: { color: '#92400E', fontSize: fontSizes.sm, fontWeight: '700', fontFamily: fonts.heavy },
  cancelBtn: { borderColor: colors.borderInput, backgroundColor: colors.cardBg },
  cancelBtnText: { color: colors.textTertiary, fontSize: fontSizes.sm, fontWeight: '700', fontFamily: fonts.heavy },
  approveBtn: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 16, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success },
  approveBtnText: { color: colors.textOnPrimary, fontSize: fontSizes.md, fontWeight: '700', fontFamily: fonts.heavy },

  actionedBar: { paddingHorizontal: spacing.xl, paddingVertical: 14, paddingBottom: Platform.OS === 'ios' ? 28 : 14, backgroundColor: colors.cardBg, borderTopWidth: 1, borderTopColor: colors.borderCard, alignItems: 'center' },
  actionedText: { fontSize: fontSizes.base, fontFamily: fonts.heavy, color: colors.textPrimary },
});
