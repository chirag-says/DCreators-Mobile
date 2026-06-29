import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Star, Send } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { sendNotification } from '../lib/notifications';
import { createReview } from '../services/projectService';
import { fetchConsultantUserId } from '../services/consultantService';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';


const QUICK_TAGS = ['Professional', 'On Time', 'Creative', 'Responsive', 'Great Value', 'Would Rehire'];

export default function RatingReviewScreen({ navigation, route }: any) {
  const project = route?.params?.project;
  const profile = useAuthStore((s) => s.profile);

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit() {
    if (rating === 0) {
      Alert.alert('Rating required', 'Please select at least 1 star.');
      return;
    }
    if (!profile?.id || !project?.id) {
      Alert.alert('Error', 'Missing user or project info.');
      return;
    }

    setSubmitting(true);
    try {
      await createReview({
        project_id: project.id,
        reviewer_id: profile.id,
        consultant_id: project.consultant_id || null,
        rating,
        review_text: review.trim() || null,
        tags: selectedTags.length > 0 ? selectedTags : null,
      });

      // Notify consultant
      if (project.consultant_id) {
        const consultantUserId = await fetchConsultantUserId(project.consultant_id);
        if (consultantUserId) {
          sendNotification({
            userId: consultantUserId,
            title: `${rating}★ Review Received`,
            message: review.trim()
              ? `"${review.trim().substring(0, 80)}..."`
              : `Client rated your work ${rating}/5 stars.`,
            type: 'review',
          });
        }
      }

      Alert.alert(
        'Thank you! 🎉',
        'Your review has been submitted successfully.',
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  const assignmentNo = project?.id
    ? `${project.id.slice(0, 4).toUpperCase()}/${new Date(project.created_at || Date.now()).getMonth() + 1}/${new Date(project.created_at || Date.now()).getFullYear().toString().slice(2)}`
    : '----/--/--';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.cardBg }]} edges={['top']}>
      <View style={styles.bg}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rate & Review</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>

            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Assignment Completed!</Text>
              <Text style={styles.summarySub}>Assignment No: {assignmentNo}</Text>
              {project?.assignment_type && (
                <Text style={styles.summarySub}>
                  {project.assignment_type.charAt(0).toUpperCase() + project.assignment_type.slice(1)}
                </Text>
              )}
            </View>

            {/* Star Rating */}
            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>How was your experience?</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <TouchableOpacity key={s} onPress={() => setRating(s)}>
                    <Star
                      size={40}
                      color="#EAB308"
                      fill={s <= rating ? '#EAB308' : 'transparent'}
                      strokeWidth={1.5}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              {rating > 0 && (
                <Text style={styles.ratingHint}>
                  {rating <= 2 ? 'We\'re sorry to hear that' : rating <= 3 ? 'Fair enough' : rating === 4 ? 'Great!' : 'Excellent! 🎉'}
                </Text>
              )}
            </View>

            {/* Review Text */}
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Write a review (optional)</Text>
              <TextInput
                style={styles.reviewInput}
                placeholder="Share your experience..."
                placeholderTextColor={colors.textTertiary}
                value={review}
                onChangeText={setReview}
                multiline
                textAlignVertical="top"
                maxLength={300}
              />
              <Text style={styles.charCount}>{review.length}/300</Text>
            </View>

            {/* Quick Tags */}
            <View style={{ gap: 12 }}>
              <Text style={styles.label}>Quick feedback</Text>
              <View style={styles.tagsWrap}>
                {QUICK_TAGS.map((t) => {
                  const isActive = selectedTags.includes(t);
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.tag, isActive && styles.tagActive]}
                      onPress={() => toggleTag(t)}
                    >
                      <Text style={[styles.tagText, isActive && styles.tagTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={[styles.submitBtn, rating === 0 && { backgroundColor: colors.borderInput }]}
            disabled={rating === 0 || submitting}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Send size={18} color="#FFF" />
                <Text style={styles.submitText}>Submit Review</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.screenBg },
  safe: { flex: 1 },
  container: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: 24 },
  header: {
    backgroundColor: colors.cardBg, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.borderCard,
  },
  headerTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy },

  summaryCard: {
    backgroundColor: '#111', padding: 20, borderRadius: radii.lg, alignItems: 'center',
    ...shadows.lg,
  },
  summaryTitle: { fontSize: fontSizes.xl, fontWeight: '700', color: '#FACC15', fontFamily: fonts.heavy, marginBottom: 6 },
  summarySub: { fontSize: fontSizes.xs + 1, color: '#D1D5DB', fontFamily: fonts.medium },

  ratingSection: { alignItems: 'center', gap: 12 },
  ratingLabel: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy },
  starsRow: { flexDirection: 'row', gap: 8 },
  ratingHint: { fontSize: fontSizes.sm, color: colors.textSecondary, fontFamily: fonts.medium },

  label: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy },
  reviewInput: {
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderInput,
    borderRadius: radii.md, padding: spacing.lg, height: 120,
    fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary,
  },
  charCount: { textAlign: 'right', fontSize: fontSizes.xs, color: colors.textTertiary, fontFamily: fonts.medium },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderInput,
    borderRadius: radii.full, paddingHorizontal: 14, paddingVertical: 8,
  },
  tagActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tagText: { fontSize: fontSizes.xs + 1, color: colors.textSecondary, fontFamily: fonts.medium },
  tagTextActive: { color: colors.textOnPrimary, fontWeight: '700' },

  actionsBar: {
    padding: spacing.lg, paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
    backgroundColor: colors.cardBg, borderTopWidth: 1, borderTopColor: colors.borderCard,
  },
  submitBtn: {
    backgroundColor: colors.success, paddingVertical: 14, borderRadius: radii.md,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  submitText: { color: '#FFF', fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },
});
