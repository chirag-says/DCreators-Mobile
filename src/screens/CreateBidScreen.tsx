/**
 * CREATE_BID_SCREEN
 * owner_role: CLIENT
 * "Get Quotes from Multiple Consultants" — first step of the bidding flow.
 * Client states what they want (category, brief, date, budget); the next
 * screen (BidCandidates) shows matching consultants to rank.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, radii } from '../styles/theme';
import MonthCalendar from '../components/MonthCalendar';
import { createBidRequest } from '../services/bidService';
import { creativeItemsFor } from '../lib/assignment';
import type { ConsultantCategory } from '../types';

const NAVY = '#1B3A5C';
const BG = '#EDF1F5';

const CATEGORIES: { key: ConsultantCategory; label: string }[] = [
  { key: 'photographer', label: 'Photographer' },
  { key: 'videographer', label: 'Videographer' },
  { key: 'designer', label: 'Designer' },
  { key: 'sculptor', label: 'Artist' },
  { key: 'artisan', label: 'Artisan' },
];

export default function CreateBidScreen({ navigation }: any) {
  const profile = useAuthStore(s => s.profile);

  const [category, setCategory] = useState<ConsultantCategory | null>(null);
  // The concrete deliverable. Becomes the assignment title the consultant sees
  // on every screen, so a bid-born project is no longer called "Hire Designer".
  const [creativeItem, setCreativeItem] = useState<string | null>(null);
  const [brief, setBrief] = useState('');
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [budget, setBudget] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Step 2's options come from step 1. Changing the discipline clears the
  // deliverable, otherwise a client could carry "Wedding film" over from
  // Videographer into Photographer and submit a job nobody in that category
  // has priced.
  const itemsForCategory = creativeItemsFor(category);
  function selectCategory(next: ConsultantCategory) {
    if (next === category) return;
    setCategory(next);
    setCreativeItem(null);
  }

  const budgetNum = Number(budget.replace(/[^0-9]/g, '')) || 0;
  const canSubmit = !!category && !!creativeItem && brief.trim().length > 10 && !!eventDate && budgetNum > 0;

  async function handleSubmit() {
    if (!profile?.id || !canSubmit || !category || !creativeItem) {
      Alert.alert('Missing Info', 'Pick a category, what you need made, a date, a budget, and add a brief (10+ characters).');
      return;
    }
    setSubmitting(true);
    try {
      const bidRequest = await createBidRequest({
        client_id: profile.id,
        category,
        creative_item: creativeItem,
        assignment_brief: brief.trim(),
        event_date: eventDate,
        budget: budgetNum,
      });
      navigation.navigate('BidCandidates', { bidRequest });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={18} color={NAVY} />
        </TouchableOpacity>
        <Text style={s.tagline}>HIRE CREATIVES. BUY ART. BUILD IDEAS</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={s.heroTitle}>Get Quotes from{'\n'}Multiple Consultants</Text>
        <Text style={s.heroSub}>
          Tell us what you need — we'll show consultants who are free on your date and
          priced near your budget, so you can pick who to ask first.
        </Text>

        {/* ── Step 1: the discipline ─────────────────────────── */}
        <Text style={s.stepLabel}>STEP 1 — WHAT DO YOU NEED?</Text>
        <View style={s.chipWrap}>
          {CATEGORIES.map(c => {
            const active = category === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[s.chip, active && s.chipActive]}
                onPress={() => selectCategory(c.key)}
                activeOpacity={0.8}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Step 2: the deliverable, narrowed by step 1 ─────
            Hidden until a category exists, because the catalogue is
            per-discipline: offering a client "Wedding film" under Photographer
            is how they end up commissioning something nobody prices. */}
        {!category ? (
          <Text style={s.awaitingHint}>Pick a discipline to see what you can commission.</Text>
        ) : (
          <>
            <Text style={s.stepLabel}>STEP 2 — WHAT SHOULD WE CALL IT?</Text>
            <View style={s.chipWrap}>
              {itemsForCategory.map(item => {
                const active = creativeItem === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[s.chip, active && s.chipActive]}
                    onPress={() => setCreativeItem(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={s.hint}>This becomes the assignment title your consultant sees.</Text>
          </>
        )}

        {/* ── Step 3: the specifics ───────────────────────────── */}
        {category && creativeItem && (
          <>
            <Text style={s.stepLabel}>STEP 3 — THE DETAILS</Text>

            <Text style={s.sectionLabel}>ASSIGNMENT BRIEF</Text>
            <TextInput
              style={s.textarea}
              placeholder="Describe the event, deliverables, and any specifics..."
              placeholderTextColor={colors.textTertiary}
              value={brief}
              onChangeText={setBrief}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <Text style={[s.sectionLabel, { marginTop: 20 }]}>EVENT DATE</Text>
            <MonthCalendar
              takenDates={new Set()}
              selectedDate={eventDate}
              onSelectDate={setEventDate}
            />

            <Text style={[s.sectionLabel, { marginTop: 20 }]}>YOUR BUDGET (₹)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 50000"
              placeholderTextColor={colors.textTertiary}
              value={budget}
              onChangeText={v => setBudget(v.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
            />
            <Text style={s.hint}>
              We'll show consultants priced between ₹{budgetNum ? Math.floor(budgetNum * 0.8).toLocaleString('en-IN') : '—'} and
              {' '}₹{budgetNum ? Math.ceil(budgetNum * 1.2).toLocaleString('en-IN') : '—'}.
            </Text>
          </>
        )}

        <TouchableOpacity
          style={[s.submitBtn, (!canSubmit || submitting) && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Send size={16} color="#fff" /><Text style={s.submitBtnText}>Find Consultants</Text></>
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
  scroll: { paddingHorizontal: 20, paddingBottom: 50 },
  heroTitle: { fontSize: 30, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY, lineHeight: 34, marginTop: 10, marginBottom: 6 },
  heroSub: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20, marginBottom: 20 },

  sectionLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.8, marginBottom: 10 },
  stepLabel: { fontSize: 11, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY, letterSpacing: 0.8, marginTop: 24, marginBottom: 10 },
  awaitingHint: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textTertiary, fontStyle: 'italic', marginTop: 24 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radii.full, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.borderInput },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: fontSizes.sm + 1, fontFamily: fonts.medium, color: colors.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '700', fontFamily: fonts.heavy },

  textarea: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.borderInput, paddingHorizontal: 16, paddingVertical: 14, fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textPrimary, minHeight: 110 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.borderInput, paddingHorizontal: 16, paddingVertical: 14, fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary },
  hint: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 8 },

  submitBtn: { backgroundColor: NAVY, borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 24 },
  submitBtnText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy },
});
