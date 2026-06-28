/**
 * CONSULTANT_CATEGORY_DETAILS_SCREEN
 * owner_role: CONSULTANT
 * Onboarding Step 3 of 4 — category-specific intake questions.
 *
 * Renders whichever question block from src/config/categoryQuestions.ts
 * matches the consultant's chosen category (set in ConsultantServicePricing)
 * and writes the answers into consultant_profiles.category_details.
 * One dynamic form serves every category — no per-category screens.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Bell } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import { CATEGORY_QUESTIONS, type CategoryQuestion } from '../config/categoryQuestions';

const NAVY = '#1B3A5C';
const TEAL = '#3D9B8F';
const BG = '#EDF1F5';

export default function ConsultantCategoryDetailsScreen({ navigation, route }: any) {
  const fromOnboarding = route?.params?.fromOnboarding === true;
  const consultantProfile = useAuthStore(s => s.consultantProfile);
  const fetchConsultantProfile = useAuthStore(s => s.fetchConsultantProfile);

  const category = consultantProfile?.category ?? null;
  const questions: CategoryQuestion[] = category ? (CATEGORY_QUESTIONS[category] ?? []) : [];

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (consultantProfile?.category_details) {
      setAnswers(consultantProfile.category_details as Record<string, unknown>);
    }
  }, [consultantProfile?.category_details]);

  function setAnswer(key: string, value: unknown) {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }

  function toggleChip(key: string, option: string, multi: boolean) {
    if (multi) {
      const current = (answers[key] as string[]) ?? [];
      const next = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option];
      setAnswer(key, next);
    } else {
      setAnswer(key, answers[key] === option ? undefined : option);
    }
  }

  function validate(): string | null {
    for (const q of questions) {
      if (!q.required) continue;
      const v = answers[q.key];
      const isEmpty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
      if (isEmpty) return `"${q.label}" is required.`;
    }
    return null;
  }

  async function handleSubmit() {
    if (!consultantProfile?.id) return;
    const err = validate();
    if (err) { Alert.alert('Missing info', err); return; }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('consultant_profiles')
        .update({ category_details: answers })
        .eq('id', consultantProfile.id);
      if (error) throw error;
      await fetchConsultantProfile();

      if (fromOnboarding) {
        navigation.navigate('ConsultantPortfolioUpdate', { fromOnboarding: true });
      } else {
        Alert.alert('Saved', 'Your details have been updated.');
        navigation.goBack();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  function renderQuestion(q: CategoryQuestion) {
    switch (q.type) {
      case 'chips-multi':
      case 'chips-single': {
        const multi = q.type === 'chips-multi';
        const selected: string[] = multi
          ? ((answers[q.key] as string[]) ?? [])
          : (answers[q.key] ? [answers[q.key] as string] : []);
        return (
          <View style={s.chipWrap}>
            {(q.options ?? []).map(opt => {
              const active = selected.includes(opt);
              return (
                <TouchableOpacity
                  key={opt}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => toggleChip(q.key, opt, multi)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      }
      case 'boolean':
        return (
          <View style={s.switchRow}>
            <Text style={s.switchLabel}>{(answers[q.key] as boolean) ? 'Yes' : 'No'}</Text>
            <Switch
              value={Boolean(answers[q.key])}
              onValueChange={v => setAnswer(q.key, v)}
              trackColor={{ false: '#D1D5DB', true: TEAL }}
              thumbColor="#fff"
            />
          </View>
        );
      case 'number':
        return (
          <TextInput
            style={s.textInput}
            value={answers[q.key] !== undefined ? String(answers[q.key]) : ''}
            onChangeText={v => setAnswer(q.key, v.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            placeholder={q.placeholder}
            placeholderTextColor={colors.textTertiary}
          />
        );
      case 'text':
      default:
        return (
          <TextInput
            style={s.textInput}
            value={(answers[q.key] as string) ?? ''}
            onChangeText={v => setAnswer(q.key, v)}
            placeholder={q.placeholder}
            placeholderTextColor={colors.textTertiary}
          />
        );
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={18} color={NAVY} />
        </TouchableOpacity>
        <Text style={s.tagline}>HIRE CREATIVES. BUY ART. BUILD IDEAS</Text>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.7}>
          <Bell size={18} color={NAVY} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.heroTitle}>Tell Clients{'\n'}What You{'\n'}Offer</Text>
        {fromOnboarding ? (
          <Text style={s.stepHint}>
            Step 3 of 4 — a few questions specific to{' '}
            {category ? category.charAt(0).toUpperCase() + category.slice(1) : 'your'} work, so clients
            know exactly what they're hiring.
          </Text>
        ) : (
          <View style={{ marginBottom: 14 }} />
        )}

        {!category ? (
          <Text style={s.emptyText}>
            Choose a category in Consultancy Services first — these questions depend on it.
          </Text>
        ) : questions.length === 0 ? (
          <Text style={s.emptyText}>No additional questions for this category yet.</Text>
        ) : (
          questions.map(q => (
            <View key={q.key} style={s.questionBlock}>
              <Text style={s.questionLabel}>
                {q.label}{q.required ? ' *' : ''}
              </Text>
              {renderQuestion(q)}
            </View>
          ))
        )}

        <TouchableOpacity
          style={[s.submitBtn, saving && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={saving || !category}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Send size={16} color="#fff" /><Text style={s.submitBtnText}>{fromOnboarding ? 'Next' : 'Save'}</Text></>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  tagline: { fontSize: 9, fontFamily: fonts.body, color: colors.textTertiary, letterSpacing: 0.5 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  heroTitle: { fontSize: 38, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY, lineHeight: 42, marginTop: 12, marginBottom: 8 },
  stepHint: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20, marginBottom: 18 },
  emptyText: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20, marginTop: 8, marginBottom: 20 },

  questionBlock: { marginBottom: 22 },
  questionLabel: { fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textPrimary, marginBottom: 10 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: radii.full,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.borderInput,
  },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: fontSizes.sm + 1, fontFamily: fonts.medium, color: colors.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '700', fontFamily: fonts.heavy },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.borderInput, paddingHorizontal: 16, paddingVertical: 12 },
  switchLabel: { fontSize: fontSizes.base, fontFamily: fonts.medium, color: colors.textPrimary },

  textInput: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.borderInput,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary,
  },

  submitBtn: { backgroundColor: NAVY, borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, marginBottom: 12 },
  submitBtnText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy },
});
