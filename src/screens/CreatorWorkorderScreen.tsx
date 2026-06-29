// CreatorWorkorderScreen — Consultant Project Dashboard (consolidated)
// CONSULTANT-only. Renders the correct state based on project status:
//   NEGOTIATION (assigned/advance_pending) → Submit Offer
//   COLLABORATION (in_progress + collab tab) → Search & invite consultant
//   REVIEW-UPLOAD (in_progress/review_1/review_2/final_review) → Upload designs
// Figma: Negotition.png | Collaboration Deshboard.png | Project Dashboard.png

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Platform, Alert, ActivityIndicator, Image, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopHeader from '../components/TopHeader';
import { updateProjectStatus, fetchProjectSubmissions, createSubmission, createCollaborationRequest } from '../services/projectService';
import { fetchApprovedConsultants } from '../services/consultantService';
import { sendNotification } from '../lib/notifications';
import * as ImagePicker from 'expo-image-picker';
import {
  FileText, ImageIcon, Info, X, ImagePlus, Upload,
  MessageCircle, Download, Users, BadgeCheck,
  CalendarClock, CheckCircle2, Handshake,
} from 'lucide-react-native';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';
import type { Submission, ConsultantProfile } from '../types';

const NEGOTIATION_STATUSES = ['assigned', 'advance_pending'];
const UPLOAD_STATUSES = ['in_progress', 'review_1', 'review_2', 'final_review', 'work_order_accepted'];

const ROUND_META: Record<string, { label: string; uploadLabel: string; submitLabel: string }> = {
  review_1: {
    label: '1ST FEEDBACK',
    uploadLabel: 'Upload Design for 2nd Review',
    submitLabel: 'Submit for 2nd Design Review',
  },
  review_2: {
    label: '2ND FEEDBACK',
    uploadLabel: 'Upload Design final Review',
    submitLabel: 'Submit for final Review',
  },
  final: {
    label: 'FINAL FEEDBACK',
    uploadLabel: 'Upload Design For Final Approval',
    submitLabel: 'Release The Final Design',
  },
};

export default function CreatorWorkorderScreen({ navigation, route }: any) {
  const project = route?.params?.project;
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const [proposedAmount, setProposedAmount] = useState(project?.final_offer ? String(project.final_offer) : '');
  const [proposedDeadline, setProposedDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showNegotiateForm, setShowNegotiateForm] = useState(false);
  const [collaborators, setCollaborators] = useState<ConsultantProfile[]>([]);
  const [selectedCollab, setSelectedCollab] = useState<ConsultantProfile | null>(null);
  const [loadingCollab, setLoadingCollab] = useState(false);
  const [showCollab, setShowCollab] = useState(false);

  const [uploadRound, setUploadRound] = useState<'review_1' | 'review_2' | 'final' | null>(null);
  const [uploadFiles, setUploadFiles] = useState<string[]>([]);
  const [uploadNote, setUploadNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const projectCode = project
    ? `D/${new Date(project.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '/')}`
    : 'D/--/--/--';

  const status = project?.status || 'assigned';
  const assignmentType = project?.assignment_type
    ? project.assignment_type.charAt(0).toUpperCase() + project.assignment_type.slice(1).replace(/_/g, ' ')
    : 'Creative Service';
  const budget = project?.budget ? Number(project.budget) : 0;
  const deadlineFormatted = (() => {
    if (!project?.deadline) return 'Not set';
    const d = new Date(project.deadline);
    const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
    return `${d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} ${new Date().getFullYear()} — (${Math.max(0, diff)} Days)`;
  })();

  const fetchSubmissions = useCallback(async () => {
    if (!project?.id) return;
    setLoading(true);
    try {
      const data = await fetchProjectSubmissions(project.id);
      setSubmissions(data);
    } catch (err) { console.log('[CreatorWO] fetch err:', err); }
    finally { setLoading(false); }
  }, [project?.id]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const round1 = submissions.find(s => s.round === 'review_1');
  const round2 = submissions.find(s => s.round === 'review_2');
  const roundFinal = submissions.find(s => s.round === 'final');

  // Which round slot is next for the consultant to fill?
  // After a revert the status returns to in_progress; re-upload always uses review_1 internally.
  const nextUploadRound: 'review_1' | 'review_2' | 'final' | null = (() => {
    if (!round1 || status === 'work_order_accepted' || status === 'in_progress') return 'review_1';
    if (status === 'review_2') return 'review_2';  // client approved R1, waiting for R2 upload
    if (status === 'final_review') return 'final'; // client approved R2, waiting for final upload
    return null;
  })();

  // ── Upload logic ──────────────────────────────────────────
  async function pickImage() {
    if (uploadFiles.length >= 3) { Alert.alert('Limit', 'Max 3 files per round.'); return; }
    const { status: perm } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      setUploadFiles(prev => [...prev, result.assets[0].uri]);
    }
  }

  async function uploadToCloud(localUri: string): Promise<string> {
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
    if (!cloudName) return localUri;
    try {
      const formData = new FormData();
      const filename = localUri.split('/').pop() || 'design.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('file', { uri: localUri, name: filename, type } as any);
      formData.append('upload_preset', 'dcreators_unsigned');
      formData.append('folder', 'dcreators/submissions');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      return data.secure_url || localUri;
    } catch { return localUri; }
  }

  async function handleSubmitDesign() {
    if (!project?.id || !uploadRound) return;
    if (uploadFiles.length === 0) { Alert.alert('No files', 'Add at least one design image.'); return; }
    // Enforce max 3 rounds
    const roundCount = submissions.filter(s => s.round !== undefined).length;
    if (roundCount >= 3 && !submissions.find(s => s.round === uploadRound)) {
      Alert.alert('Max Rounds', 'Maximum 3 design rounds allowed.'); return;
    }
    setIsUploading(true);
    try {
      const urls = await Promise.all(uploadFiles.map(uri => uploadToCloud(uri)));
      await createSubmission({
        project_id: project.id,
        round: uploadRound,
        files: urls,
        consultant_note: uploadNote || undefined,
      });

      // From in_progress only review_1 is valid in the machine.
      // When status is review_2/final_review the status is already set; no transition needed.
      const currentStatus = project.status ?? status;
      if (currentStatus === 'in_progress' || currentStatus === 'work_order_accepted') {
        const progress = uploadRound === 'review_1' ? 33 : 66;
        await updateProjectStatus(project.id, 'review_1', { progress_percent: progress });
      }
      // If status is review_2 or final_review, client already advanced it; no-op on status.

      if (project.client_id) {
        sendNotification({
          userId: project.client_id,
          title: 'Design Ready for Review',
          message: `Your consultant has submitted ${uploadRound === 'final' ? 'the final' : 'a'} design for review.`,
          type: 'review',
        });
      }
      Alert.alert('✅ Submitted!', 'Design sent to client for review.');
      setUploadRound(null); setUploadFiles([]); setUploadNote('');
      fetchSubmissions();
    } catch (err: any) { Alert.alert('Error', err.message || 'Something went wrong.'); }
    finally { setIsUploading(false); }
  }


  async function handleSubmitOffer() {
    const amount = parseFloat(proposedAmount.replace(/[^0-9.]/g, ''));
    if (!amount || amount <= 0) { Alert.alert('Invalid', 'Enter a valid proposed amount.'); return; }
    if (!project?.id) return;
    setSubmitting(true);
    try {
      // assigned → advance_pending; merge final_offer in the same atomic update
      await updateProjectStatus(project.id, 'advance_pending', { final_offer: amount });
      if (project.client_id) {
        sendNotification({
          userId: project.client_id,
          title: 'Consultant Offer Received',
          message: `Your consultant submitted an offer of ₹${amount.toLocaleString('en-IN')}. Please pay the advance.`,
          type: 'assignment',
        });
      }
      Alert.alert('Offer Submitted ✅', `Offer of ₹${amount.toLocaleString('en-IN')} sent. Awaiting client advance payment.`, [
        { text: 'OK', onPress: () => navigation.navigate('Main', { screen: 'Dashboard' }) },
      ]);
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setSubmitting(false); }
  }

  async function fetchCollaborators() {
    setLoadingCollab(true);
    try {
      const data = await fetchApprovedConsultants(10);
      setCollaborators(data);
      if (data.length > 0) setSelectedCollab(data[0]);
    } catch {} finally { setLoadingCollab(false); }
  }

  async function handleCollaborate() {
    if (!selectedCollab || !project) return;
    Alert.alert('Initiate Collaboration?', `Request ${selectedCollab.display_name} to collaborate?`, [
      { text: 'Cancel' },
      { text: 'Send Request', onPress: async () => {
        try {
          await createCollaborationRequest({
            project_id: project.id,
            requester_id: project.consultant_id,
            collaborator_id: selectedCollab.user_id,
          });
          Alert.alert('Request Sent ✅', `${selectedCollab.display_name} has been invited.`);
        } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  }

  const isNegotiation = NEGOTIATION_STATUSES.includes(status);
  const isUpload = UPLOAD_STATUSES.includes(status);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopHeader />
      {loading ? (
        <View style={styles.loadingWrap}><ActivityIndicator size="large" color={colors.orange} /></View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Screen title */}
          <Text style={styles.screenTitle}>Project{'\n'}Dashboard</Text>
          <View style={styles.headerSection}>
            <Text style={styles.projectTitle}>Project Assignment - {projectCode}</Text>
            <Text style={styles.projectSubtitle}>Incoming Request from "{project?.client_name || 'Client'}"</Text>
          </View>

          {/* Mode banner */}
          {isNegotiation && (
            <View style={styles.negotiationBanner}>
              <Text style={styles.negotiationBannerText}>
                The project is open for Negotiation in{'\n'}Project Cost and Project Deadline
              </Text>
            </View>
          )}
          {isUpload && showCollab && (
            <View style={[styles.negotiationBanner, { backgroundColor: '#7B3F00' }]}>
              <Text style={styles.negotiationBannerText}>The project is open for Collaboration</Text>
            </View>
          )}

          {/* ── Project info card (Figma screen 10 layout) ── */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {(project?.assignment_type ?? 'CREATIVE SERVICE').toUpperCase()}
            </Text>
          </View>

          <Text style={styles.projectMainTitle}>
            {project?.assignment_details?.[0] || assignmentType}
          </Text>

          {/* Budget card */}
          <View style={styles.budgetCard}>
            <Text style={styles.budgetLabel}>ESTIMATED BUDGET</Text>
            <Text style={styles.budgetValue}>₹{budget.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>

          {/* Assignment brief quote */}
          {project?.assignment_brief && (
            <View style={styles.briefBlock}>
              <View style={styles.briefBlockHeader}>
                <FileText size={14} color={colors.primary} />
                <Text style={styles.briefBlockTitle}>ASSIGNMENT BRIEF</Text>
              </View>
              <Text style={styles.briefQuote}>“{project.assignment_brief}”</Text>
            </View>
          )}

          {/* Key Deliverables */}
          {(project?.assignment_details?.length > 0) && (
            <View style={styles.deliverablesBlock}>
              <Text style={styles.deliverablesTitle}>KEY DELIVERABLES</Text>
              {(project.assignment_details as string[]).map((d: string, i: number) => (
                <View key={i} style={styles.deliverableRow}>
                  <View style={styles.deliverableIcon} />
                  <Text style={styles.deliverableText}>{d}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Deadline row */}
          <View style={styles.deadlineRow}>
            <View style={styles.deadlineIcon}>
              <CalendarClock size={16} color={colors.textSecondary} />
            </View>
            <View>
              <Text style={styles.deadlineLabel}>DEADLINE</Text>
              <Text style={styles.deadlineValue}>{deadlineFormatted}</Text>
            </View>
          </View>

          {/* ── 4 ACTION BUTTONS (Figma screen 10) ── */}
          {status === 'assigned' && (
            <View style={styles.actionBtnGroup}>
              {/* Accept Project — navy filled pill */}
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnAccept, submitting && { opacity: 0.6 }]}
                onPress={handleSubmitOffer}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                <CheckCircle2 size={18} color="#fff" />
                      <Text style={styles.actionBtnAcceptText}>Accept Project</Text>
                    </>
                }
              </TouchableOpacity>

              {/* Negotiate — teal outline pill */}
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnNegotiate]}
                onPress={() => setShowNegotiateForm(v => !v)}
                activeOpacity={0.85}
              >
                <Handshake size={18} color={colors.teal} />
                <Text style={styles.actionBtnNegotiateText}>Negotiate</Text>
              </TouchableOpacity>

              {/* Collaborate — gray outline pill */}
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnCollab]}
                onPress={() => { setShowCollab(true); if (collaborators.length === 0) fetchCollaborators(); }}
                activeOpacity={0.85}
              >
                <Users size={18} color={colors.primary} />
                <Text style={styles.actionBtnCollabText}>Collaborate</Text>
              </TouchableOpacity>

              {/* Pass on — red outline chip */}
              <TouchableOpacity
                style={styles.actionBtnPassOn}
                onPress={() => Alert.alert('Pass on Project', 'Decline this assignment?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Pass on', style: 'destructive', onPress: async () => {
                    try {
                      await updateProjectStatus(project.id, 'assigned');
                      navigation.goBack();
                    } catch {}
                  }},
                ])}
                activeOpacity={0.85}
              >
                <X size={16} color="#EF4444" />
                <Text style={styles.actionBtnPassOnText}>Pass on</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Negotiate form (shown inline when Negotiate tapped) */}
          {(isNegotiation && showNegotiateForm) && (
            <View style={styles.negotiationCard}>
              <Text style={styles.sectionLabel}>Negotiable amount</Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.rupee}>₹</Text>
                <TextInput
                  style={styles.amountField}
                  placeholder="Enter your proposed amount"
                  placeholderTextColor={colors.textTertiary}
                  value={proposedAmount}
                  onChangeText={setProposedAmount}
                  keyboardType="decimal-pad"
                />
              </View>
              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Suggested Deadline</Text>
              <TextInput
                style={styles.deadlineField}
                placeholder="00/00/2026 — Day — 00"
                placeholderTextColor={colors.textTertiary}
                value={proposedDeadline}
                onChangeText={setProposedDeadline}
              />
              <TouchableOpacity
                style={[styles.submitOfferBtn, submitting && { opacity: 0.6 }]}
                onPress={handleSubmitOffer}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.submitOfferBtnText}>Submit Offer</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* ── COLLABORATION TAB (toggle visible in upload mode) ── */}
          {isUpload && (
            <View style={styles.collabToggleRow}>
              <TouchableOpacity
                style={[styles.collabTab, !showCollab && styles.collabTabActive]}
                onPress={() => setShowCollab(false)}
              >
                <Text style={[styles.collabTabText, !showCollab && styles.collabTabTextActive]}>Upload Work</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.collabTab, showCollab && styles.collabTabActive]}
                onPress={() => { setShowCollab(true); if (collaborators.length === 0) fetchCollaborators(); }}
              >
                <Users size={13} color={showCollab ? '#fff' : colors.textSecondary} />
                <Text style={[styles.collabTabText, showCollab && styles.collabTabTextActive]}>Collaboration</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── COLLABORATION PANEL ── */}
          {isUpload && showCollab && (
            <View style={styles.collabPanel}>
              <Text style={styles.collabSearchLabel}>SEARCH CREATIVE CONSULTANT{'\n'}FOR COLLABORATION</Text>
              {loadingCollab
                ? <ActivityIndicator size="small" color={colors.teal} style={{ marginTop: 16 }} />
                : <>
                    <View style={styles.candidateRow}>
                      <Text style={styles.candidateText}>Total Candidates ({collaborators.length})</Text>
                    </View>
                    {collaborators.slice(0, 3).map(c => {
                      const sel = selectedCollab?.id === c.id;
                      return (
                        <TouchableOpacity key={c.id} style={[styles.consultantCard, sel && styles.consultantCardSel]} onPress={() => setSelectedCollab(c)}>
                          {c.avatar_url
                            ? <Image source={{ uri: c.avatar_url }} style={styles.consultantAvatar} />
                            : <View style={[styles.consultantAvatar, styles.consultantAvatarFb]}>
                                <Text style={styles.consultantAvatarInit}>{c.display_name.charAt(0).toUpperCase()}</Text>
                              </View>
                          }
                          <View style={{ flex: 1 }}>
                            <Text style={styles.consultantName}>{c.display_name}</Text>
                            <Text style={styles.consultantCode}>Code: {c.code}</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                              {c.experience && <View style={styles.badge}><Text style={styles.badgeText}>{c.experience} Years</Text></View>}
                              {c.is_approved && (
                                <View style={[styles.badge, { backgroundColor: '#EEF9F8', flexDirection: 'row', gap: 4 }]}>
                                  <BadgeCheck size={10} color={colors.teal} />
                                  <Text style={[styles.badgeText, { color: colors.teal }]}>Verified Pro</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          {sel && (
                            <TouchableOpacity style={styles.collaborateBtn} onPress={handleCollaborate}>
                              <Text style={styles.collaborateBtnText}>Collaborate Now</Text>
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </>
              }
            </View>
          )}

          {/* ── REVIEW-UPLOAD MODE ── */}
          {isUpload && !showCollab && (
            <View style={styles.timelineContainer}>
              {round1?.client_action === 'revert' && <FeedbackRoundCard round="review_1" submission={round1} />}
              {nextUploadRound === 'review_2' && <UploadSlotCard round="review_2" onUpload={() => setUploadRound('review_2')} />}
              {round2 && <SubmittedCard submission={round2} round="review_2" navigation={navigation} />}
              {round2?.client_action === 'revert' && <FeedbackRoundCard round="review_2" submission={round2} />}
              {nextUploadRound === 'final' && <UploadSlotCard round="final" onUpload={() => setUploadRound('final')} />}
              {roundFinal && <SubmittedCard submission={roundFinal} round="final" navigation={navigation} />}
              {roundFinal?.client_action && <FeedbackRoundCard round="final" submission={roundFinal} />}
              {nextUploadRound === 'review_1' && (
                <UploadSlotCard round="review_1" onUpload={() => setUploadRound('review_1')} isFirst />
              )}
              {round1 && !round1.client_action && <SubmittedCard submission={round1} round="review_1" navigation={navigation} />}
              {roundFinal?.client_action === 'approve' && (
                <View style={styles.releaseSection}>
                  <Text style={styles.releaseNote}>Final payment received — release your designs</Text>
                  <TouchableOpacity style={styles.releaseBtn}>
                    <Download size={16} color={colors.textOnPrimary} />
                    <Text style={styles.releaseBtnText}>Release The Final Design</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

        </ScrollView>
      )}

      <Modal visible={!!uploadRound} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{uploadRound ? ROUND_META[uploadRound]?.uploadLabel : 'Upload'}</Text>
              <TouchableOpacity onPress={() => { setUploadRound(null); setUploadFiles([]); setUploadNote(''); }}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.uploadHint}>
              <Info size={14} color={colors.teal} />
              <Text style={styles.uploadHintText}>
                Upload per{'\n'}{uploadRound === 'review_2' ? '1st client review' : uploadRound === 'final' ? '2nd client review' : 'assignment brief'}
              </Text>
            </View>
            <Text style={styles.modalLabel}>Design Files ({uploadFiles.length}/3)</Text>
            <View style={styles.fileGrid}>
              {uploadFiles.map((uri, i) => (
                <View key={i} style={styles.fileThumbWrap}>
                  <Image source={{ uri }} style={styles.fileThumb} />
                  <TouchableOpacity style={styles.fileRemove} onPress={() => setUploadFiles(prev => prev.filter((_, j) => j !== i))}>
                    <X size={10} color={colors.textOnPrimary} />
                  </TouchableOpacity>
                </View>
              ))}
              {uploadFiles.length < 3 && (
                <TouchableOpacity style={styles.addFileBtn} onPress={pickImage}>
                  <ImagePlus size={22} color={colors.textTertiary} />
                  <Text style={styles.addFileText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.modalLabel}>Note to Client</Text>
            <TextInput
              style={styles.noteInput}
              value={uploadNote}
              onChangeText={setUploadNote}
              placeholder="Describe your design choices..."
              placeholderTextColor={colors.textTertiary}
              multiline
            />
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSubmitDesign} disabled={isUploading}>
              {isUploading ? <ActivityIndicator color={colors.textOnPrimary} size="small" /> : (
                <Text style={styles.modalSubmitText}>{uploadRound ? ROUND_META[uploadRound]?.submitLabel : 'Submit'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


// ═══ Sub-components ═══════════════════════════════════════════

function FeedbackRoundCard({ round, submission }: { round: string; submission: Submission }) {
  const meta = ROUND_META[round];
  const date = new Date(submission.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  return (
    <View style={styles.feedbackCard}>
      <View style={styles.feedbackHeader}>
        <FileText size={14} color={colors.orange} />
        <Text style={styles.feedbackHeaderText}>{meta.label} - {date}</Text>
      </View>
      {submission.feedback_text && (
        <Text style={styles.feedbackBodyText}>{submission.feedback_text}</Text>
      )}
    </View>
  );
}

function UploadSlotCard({ round, onUpload, isFirst }: { round: string; onUpload: () => void; isFirst?: boolean }) {
  const meta = ROUND_META[round];
  return (
    <View style={styles.uploadSlotCard}>
      <View style={styles.uploadSlotIcon}>
        <ImageIcon size={28} color={colors.textTertiary} />
      </View>
      <Text style={styles.uploadSlotTitle}>{meta.uploadLabel}</Text>
      <Text style={styles.uploadSlotHint}>Drag & drop or click to browse</Text>
      <TouchableOpacity style={styles.uploadSlotBtn} onPress={onUpload}>
        <Upload size={14} color={colors.textOnPrimary} />
        <Text style={styles.uploadSlotBtnText}>{isFirst ? 'Upload First Design' : meta.submitLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function SubmittedCard({ submission, round, navigation }: { submission: Submission; round: string; navigation: any }) {
  const status = submission.client_action;
  return (
    <View style={styles.submittedCard}>
      <View style={styles.submittedBadge}>
        <Text style={styles.submittedBadgeText}>
          {status === 'approve' ? '✅ Approved' : status === 'revert' ? '🔄 Revisions Requested' : '⏳ Awaiting Review'}
        </Text>
      </View>
      {submission.files?.[0] && (
        <TouchableOpacity onPress={() => navigation.navigate('PortfolioGallery', { images: submission.files, initialIndex: 0 })}>
          <Image source={{ uri: submission.files[0] }} style={styles.submittedThumb} resizeMode="cover" />
        </TouchableOpacity>
      )}
    </View>
  );
}


// ═══ Styles ═══════════════════════════════════════════════════
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.screenBg },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 100 },

  screenTitle: { fontSize: 32, fontWeight: '800', fontFamily: fonts.heavy, color: '#1B3A5C', paddingHorizontal: spacing.xl, paddingTop: 16, lineHeight: 40 },
  headerSection: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md },
  projectTitle: { fontSize: fontSizes['2xl'], fontWeight: '700', fontFamily: fonts.heavy, color: colors.orange, marginBottom: spacing.xs },
  projectSubtitle: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textSecondary },

  negotiationBanner: { backgroundColor: '#1B3A5C', marginHorizontal: spacing.xl, borderRadius: 12, padding: 16, marginBottom: 14 },
  negotiationBannerText: { color: '#fff', fontSize: fontSizes.sm, fontFamily: fonts.medium, lineHeight: 20 },

  infoRow: { marginBottom: 10 },
  infoLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.7, marginBottom: 2 },
  infoValue: { fontSize: fontSizes.lg, fontWeight: '700', fontFamily: fonts.heavy, color: '#1B3A5C' },

  negotiationCard: { backgroundColor: '#fff', marginHorizontal: spacing.xl, borderRadius: 16, padding: 20, marginBottom: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 3 } }) },
  sectionLabel: { fontSize: 11, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textSecondary, letterSpacing: 0.5, marginBottom: 8 },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.borderInput, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#FAFAFA', gap: 6 },
  rupee: { fontSize: 20, fontWeight: '700', fontFamily: fonts.heavy, color: '#1B3A5C' },
  amountField: { flex: 1, fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary },
  deadlineField: { borderWidth: 1, borderColor: colors.borderInput, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary, backgroundColor: '#FAFAFA' },
  submitOfferBtn: { backgroundColor: '#1B3A5C', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  submitOfferBtnText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },

  collabToggleRow: { flexDirection: 'row', marginHorizontal: spacing.xl, marginBottom: 12, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderLight },
  collabTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: '#F3F4F6' },
  collabTabActive: { backgroundColor: '#1B3A5C' },
  collabTabText: { fontSize: fontSizes.sm, fontFamily: fonts.medium, color: colors.textSecondary },
  collabTabTextActive: { color: '#fff', fontWeight: '700' },

  collabPanel: { marginHorizontal: spacing.xl, marginBottom: 16 },
  collabSearchLabel: { fontSize: 13, fontWeight: '700', fontFamily: fonts.heavy, color: '#1B3A5C', lineHeight: 20, marginBottom: 12 },
  candidateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  candidateText: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary },
  consultantCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderColor: colors.borderLight, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 2 } }) },
  consultantCardSel: { borderColor: '#1B3A5C', borderWidth: 1.5 },
  consultantAvatar: { width: 48, height: 48, borderRadius: 24 },
  consultantAvatarFb: { backgroundColor: '#1B3A5C', alignItems: 'center', justifyContent: 'center' },
  consultantAvatarInit: { color: '#fff', fontSize: 18, fontWeight: '700', fontFamily: fonts.heavy },
  consultantName: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: '#1B3A5C' },
  consultantCode: { fontSize: fontSizes.xs, fontFamily: fonts.body, color: colors.textSecondary },
  badge: { backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 10, fontFamily: fonts.medium, color: colors.textSecondary },
  collaborateBtn: { backgroundColor: '#E87B35', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'center' },
  collaborateBtnText: { color: '#fff', fontSize: fontSizes.xs, fontWeight: '700', fontFamily: fonts.heavy },



  briefCard: { marginHorizontal: spacing.xl, backgroundColor: colors.cardBg, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  briefTitle: { fontSize: fontSizes.xl, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textPrimary, marginBottom: spacing.sm },
  briefText: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20 },

  acceptBtn: { marginHorizontal: spacing.xl, backgroundColor: colors.success, paddingVertical: 16, borderRadius: radii.lg, alignItems: 'center', marginBottom: spacing.xl },
  acceptBtnText: { color: colors.textOnPrimary, fontSize: fontSizes.lg, fontWeight: '700', fontFamily: fonts.heavy },

  timelineContainer: { paddingHorizontal: spacing.xl },

  // Feedback card
  feedbackCard: { marginBottom: spacing.lg, paddingLeft: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.orange },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  feedbackHeaderText: { fontSize: fontSizes.sm, fontWeight: '700', fontFamily: fonts.heavy, color: colors.orange },
  feedbackBodyText: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary, fontStyle: 'italic', lineHeight: 22 },

  // Upload slot
  uploadSlotCard: { backgroundColor: '#F0F4F8', borderRadius: radii.lg, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  uploadSlotIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  uploadSlotTitle: { fontSize: fontSizes.base, fontWeight: '600', fontFamily: fonts.medium, color: colors.textPrimary, marginBottom: 2 },
  uploadSlotHint: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textTertiary, marginBottom: spacing.lg },
  uploadSlotBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.teal, paddingVertical: 12, paddingHorizontal: spacing.xl, borderRadius: radii.lg },
  uploadSlotBtnText: { color: colors.textOnPrimary, fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.heavy },

  // Submitted card
  submittedCard: { marginBottom: spacing.lg },
  submittedBadge: { backgroundColor: '#E0F5F1', alignSelf: 'flex-start', paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.md, marginBottom: spacing.sm },
  submittedBadgeText: { fontSize: fontSizes.xs + 1, fontFamily: fonts.medium, color: colors.teal },
  submittedThumb: { width: '100%', height: 120, borderRadius: radii.md },

  // Release section
  releaseSection: { paddingTop: spacing.md },
  releaseNote: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textTertiary, textAlign: 'center', marginBottom: spacing.md },
  releaseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.teal, paddingVertical: 16, borderRadius: radii.lg },
  releaseBtnText: { color: colors.textOnPrimary, fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },

  // ── NEW Figma screen 10 styles ────────────────────────────
  categoryBadge: {
    alignSelf: 'flex-start', marginLeft: spacing.xl, marginBottom: spacing.sm,
    backgroundColor: '#E0F5F1', paddingVertical: 5, paddingHorizontal: 12,
    borderRadius: 20, borderWidth: 1, borderColor: '#3D9B8F',
  },
  categoryBadgeText: { fontSize: fontSizes.xs, fontWeight: '700', fontFamily: fonts.heavy, color: '#3D9B8F', letterSpacing: 0.5 },

  projectMainTitle: {
    fontSize: 22, fontWeight: '800', fontFamily: fonts.heavy, color: colors.primary,
    lineHeight: 30, paddingHorizontal: spacing.xl, marginBottom: 16,
  },

  budgetCard: {
    marginHorizontal: spacing.xl, backgroundColor: '#fff', borderRadius: 14, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: colors.border,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }, android: { elevation: 1 } }),
  },
  budgetLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.8, marginBottom: 6 },
  budgetValue: { fontSize: 28, fontWeight: '900', fontFamily: fonts.heavy, color: colors.primary },

  briefBlock: {
    marginHorizontal: spacing.xl, backgroundColor: '#fff', borderRadius: 14, padding: 18,
    marginBottom: 14, borderWidth: 1, borderColor: colors.border,
  },
  briefBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  briefBlockTitle: { fontSize: 11, fontWeight: '700', fontFamily: fonts.heavy, color: colors.primary, letterSpacing: 0.5 },
  briefQuote: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 24, fontStyle: 'italic' },

  deliverablesBlock: {
    marginHorizontal: spacing.xl, backgroundColor: '#fff', borderRadius: 14, padding: 18,
    marginBottom: 14, borderWidth: 1, borderColor: colors.border,
  },
  deliverablesTitle: { fontSize: 11, fontWeight: '700', fontFamily: fonts.heavy, color: '#3D9B8F', letterSpacing: 0.5, marginBottom: 12 },
  deliverableRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  deliverableIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EEF9F8', borderWidth: 1, borderColor: '#3D9B8F' },
  deliverableText: { flex: 1, fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textPrimary, lineHeight: 20 },

  deadlineRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: spacing.xl, marginBottom: 20,
  },
  deadlineIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  deadlineLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: '#3D9B8F', letterSpacing: 0.8, marginBottom: 2 },
  deadlineValue: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: colors.primary },

  // Action button group
  actionBtnGroup: { paddingHorizontal: spacing.xl, marginBottom: 20, gap: 12 },
  actionBtn: {
    width: '100%', borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  actionBtnAccept: { backgroundColor: colors.primary },
  actionBtnAcceptText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy },
  actionBtnNegotiate: { borderWidth: 1.5, borderColor: '#3D9B8F', backgroundColor: '#fff' },
  actionBtnNegotiateText: { color: '#3D9B8F', fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },
  actionBtnCollab: { borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#fff' },
  actionBtnCollabText: { color: colors.primary, fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },
  actionBtnPassOn: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 18, backgroundColor: '#fff',
  },
  actionBtnPassOnText: { color: '#EF4444', fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.heavy },


  // Modal
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.cardBg, borderTopLeftRadius: radii['2xl'], borderTopRightRadius: radii['2xl'], padding: spacing['2xl'], paddingBottom: Platform.OS === 'ios' ? spacing['4xl'] : spacing['2xl'], maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { fontSize: fontSizes.xl, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textPrimary },
  modalLabel: { fontSize: fontSizes.sm, fontWeight: '600', fontFamily: fonts.medium, color: colors.textSecondary, marginTop: 14, marginBottom: spacing.sm },
  uploadHint: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: '#E0F5F1', borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md },
  uploadHintText: { fontSize: fontSizes.xs + 1, fontFamily: fonts.medium, color: colors.teal, flex: 1, lineHeight: 16 },
  fileGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  fileThumbWrap: { width: 80, height: 80, borderRadius: radii.md, overflow: 'hidden', position: 'relative' },
  fileThumb: { width: '100%', height: '100%' },
  fileRemove: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(239,68,68,0.85)', borderRadius: radii.md, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  addFileBtn: { width: 80, height: 80, borderRadius: radii.md, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.borderInput, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  addFileText: { fontSize: fontSizes.xs, fontFamily: fonts.medium, color: colors.textTertiary },
  noteInput: { backgroundColor: colors.sectionBg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textPrimary, height: 70, textAlignVertical: 'top' },
  modalSubmitBtn: { backgroundColor: colors.teal, paddingVertical: 14, borderRadius: radii.md, alignItems: 'center', marginTop: spacing.xl },
  modalSubmitText: { color: colors.textOnPrimary, fontSize: fontSizes.md, fontWeight: '700', fontFamily: fonts.heavy },
});
