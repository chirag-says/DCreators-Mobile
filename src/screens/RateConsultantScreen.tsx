/**
 * CLIENT_REVIEW_CONSULTANT_SCREEN  (Phase 3.8)
 * owner_role: CLIENT
 * previous: PaymentConfirmedScreen (delivered)
 * next: ClientDashboard
 * workflow: delivered → completed
 *
 * Figma: Client Review.png ("Rate Your Experience")
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Zap, MessageSquare, Gem, Star } from 'lucide-react-native';
import FigmaBottomBar from '../components/FigmaBottomBar';
import { supabase } from '../lib/supabase';
import { updateProjectStatus } from '../services/projectService';
import { sendNotification } from '../lib/notifications';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';

const NAVY   = '#1B3A5C';
const TEAL   = '#0D7F7A';
const ORANGE = '#E87B35';
const STAR_ON  = '#F59E0B';
const STAR_OFF = '#D1D5DB';

const QUICK_CHIPS = [
  { key: 'fast_delivery',          label: 'Fast Delivery',          icon: Zap },
  { key: 'great_comms',            label: 'Great Comms',            icon: MessageSquare },
  { key: 'exceeded_expectation',   label: 'Exceeded Expectation',   icon: Gem },
];

export default function RateConsultantScreen({ navigation, route }: any) {
  const { project } = route?.params ?? {};

  const consultantName   = project?.consultant_profiles?.display_name ?? 'the Consultant';
  const consultantAvatar = project?.consultant_profiles?.profile_picture_url ?? null;

  const [rating,    setRating]    = useState(0);
  const [feedback,  setFeedback]  = useState('');
  const [chips,     setChips]     = useState<Record<string, boolean>>({});
  const [saving,    setSaving]    = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function toggleChip(key: string) {
    setChips(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit() {
    if (rating === 0) { Alert.alert('Rating Required', 'Please select a star rating.'); return; }
    if (!project?.id)  { Alert.alert('Error', 'Project not found.'); return; }

    setSaving(true);
    try {
      // Insert review record
      await supabase.from('reviews').insert({
        project_id:          project.id,
        client_id:           project.client_id,
        consultant_id:       project.consultant_id,
        rating,
        feedback_text:       feedback.trim() || null,
        fast_delivery:       !!chips['fast_delivery'],
        great_comms:         !!chips['great_comms'],
        exceeded_expectation: !!chips['exceeded_expectation'],
        created_at:          new Date().toISOString(),
      });

      // delivered → completed via the status machine
      await updateProjectStatus(project.id, 'completed');

      // Notify consultant
      if (project.consultant_id) {
        sendNotification({
          userId:  project.consultant_id,
          title:   `⭐ ${rating}/5 Review Received`,
          message: feedback.trim() || `Client left a ${rating}-star review on your project.`,
          type:    'review',
        });
      }

      setSubmitted(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not submit review.');
    } finally {
      setSaving(false);
    }
  }

  /* ── Submitted state ── */
  if (submitted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.successWrap}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>Thank You!</Text>
          <Text style={styles.successSub}>
            Your review helps {consultantName} maintain high creative standards.
          </Text>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.navigate('Main', { screen: 'Dashboard' })}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Main form ── */
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={18} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.topTagline}>HIRE CREATIVES. BUY ART. BUILD IDEAS</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Page title */}
        <Text style={styles.pageTitle}>RATE YOUR{'\n'}EXPERIENCE</Text>
        <Text style={styles.pageSubtitle}>
          Your feedback helps {consultantName} maintain{'\n'}high creative standards.
        </Text>

        {/* Consultant card */}
        <View style={styles.consultantCard}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            {consultantAvatar
              ? <Image source={{ uri: consultantAvatar }} style={styles.avatar} />
              : <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>
                    {consultantName.charAt(0).toUpperCase()}
                  </Text>
                </View>
            }
          </View>

          {/* Name + tag */}
          <View style={{ flex: 1 }}>
            <Text style={styles.consultantName}>{consultantName}</Text>
            <Text style={styles.consultantTag}>CREATIVE CONSULTANT • PROJECT COMPLETED</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Star rating */}
        <Text style={styles.ratingQuestion}>How would you rate the service?</Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity key={n} onPress={() => setRating(n)} activeOpacity={0.75}>
              <Star
                size={40}
                color={n <= rating ? STAR_ON : STAR_OFF}
                fill={n <= rating ? STAR_ON : 'transparent'}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Feedback text */}
        <Text style={styles.feedbackLabel}>SHARE YOUR FEEDBACK</Text>
        <TextInput
          style={styles.feedbackInput}
          placeholder={`${consultantName} was incredible to work with. The attention to detail in the brand guidelines exceeded my expectations...`}
          placeholderTextColor={colors.textTertiary}
          multiline
          textAlignVertical="top"
          value={feedback}
          onChangeText={setFeedback}
        />

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.submitBtn, saving && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.submitBtnText}>SUBMIT REVIEW</Text>
          }
        </TouchableOpacity>

        {/* Quick-pick chips */}
        <View style={styles.chipsGrid}>
          {QUICK_CHIPS.map(({ key, label, icon: Icon }) => (
            <TouchableOpacity
              key={key}
              style={[styles.chip, chips[key] && styles.chipActive]}
              onPress={() => toggleChip(key)}
              activeOpacity={0.8}
            >
              <Icon size={14} color={chips[key] ? TEAL : colors.textSecondary} />
              <Text style={[styles.chipText, chips[key] && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      <FigmaBottomBar navigation={navigation} activeTab="profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F2F8' },

  topRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 }, android: { elevation: 2 } }),
  },
  topTagline: { fontSize: 9, fontFamily: fonts.body, color: colors.textTertiary, letterSpacing: 0.5 },

  scroll: { paddingHorizontal: 24, paddingBottom: 32 },

  pageTitle: {
    fontSize: 36, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY,
    lineHeight: 42, textAlign: 'center', marginTop: 12, marginBottom: 10,
  },
  pageSubtitle: {
    fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },

  // Consultant card
  consultantCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: '#E8EAF0',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 2 } }),
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarFallback: { backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 24, fontWeight: '800', color: '#fff', fontFamily: fonts.heavy },
  consultantName: { fontSize: fontSizes.xl, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  consultantTag: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.5, marginTop: 2 },

  divider: { height: 1, backgroundColor: '#E8EAF0', marginVertical: 22 },

  // Star rating
  ratingQuestion: {
    fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy,
    color: NAVY, textAlign: 'center', marginBottom: 14,
  },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 24 },

  // Feedback
  feedbackLabel: {
    fontSize: 11, fontWeight: '700', fontFamily: fonts.heavy,
    color: colors.textTertiary, letterSpacing: 0.8, marginBottom: 10,
  },
  feedbackInput: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E0E4EE',
    borderRadius: 14, padding: 16, minHeight: 120,
    fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary,
    lineHeight: 22, marginBottom: 20,
  },

  // Submit
  submitBtn: {
    backgroundColor: NAVY, borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    ...Platform.select({ ios: { shadowColor: NAVY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 }, android: { elevation: 4 } }),
  },
  submitBtnText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy, letterSpacing: 1 },

  // Quick chips
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: {
    flex: 1, minWidth: '44%', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#E0E4EE',
  },
  chipActive: { borderColor: TEAL, backgroundColor: '#EEF9F8' },
  chipText: { fontSize: fontSizes.sm, fontFamily: fonts.medium, color: colors.textSecondary },
  chipTextActive: { color: TEAL, fontWeight: '700', fontFamily: fonts.heavy },

  // Success state
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  successEmoji: { fontSize: 60 },
  successTitle: { fontSize: 32, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY },
  successSub: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  doneBtn: { backgroundColor: NAVY, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 16, marginTop: 8 },
  doneBtnText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },

  // Bottom nav
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
