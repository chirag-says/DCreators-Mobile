/**
 * BOOK_CONSULTANT_SCREEN
 * owner_role: CLIENT
 * "Hire Now" destination from CreatorProfileScreen — calendar-based direct
 * booking. Client picks a real available date (checked against the
 * consultant's existing bookings + manually blocked days), writes a brief,
 * confirms the budget, and the project is created exactly the way
 * AssignProjectScreen's direct-hire path does (status: 'assigned',
 * consultant pre-attached) so it plugs into the existing accept → advance
 * payment → work order → delivery pipeline unchanged.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { sendNotification } from '../lib/notifications';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import MonthCalendar from '../components/MonthCalendar';

const NAVY = '#1B3A5C';
const TEAL = '#3D9B8F';
const BG = '#EDF1F5';

const CATEGORY_LABELS: Record<string, string> = {
  photographer: 'Photographer',
  videographer: 'Videographer',
  designer: 'Designer',
  sculptor: 'Artist',
  artisan: 'Artisan',
};

export default function BookConsultantScreen({ navigation, route }: any) {
  const consultant = route?.params?.consultant;
  const profile = useAuthStore(s => s.profile);

  const [takenDates, setTakenDates] = useState<Set<string>>(new Set());
  const [loadingDates, setLoadingDates] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [brief, setBrief] = useState('');
  const [budget, setBudget] = useState(consultant?.base_price ? String(consultant.base_price) : '');
  const [submitting, setSubmitting] = useState(false);

  const categoryLabel = CATEGORY_LABELS[consultant?.category] ?? 'Creative Consultant';

  useEffect(() => { fetchTakenDates(); }, [consultant?.user_id]);

  async function fetchTakenDates() {
    if (!consultant?.user_id) { setLoadingDates(false); return; }
    setLoadingDates(true);
    try {
      const { data, error } = await supabase.rpc('get_consultant_taken_dates', {
        p_consultant_user_id: consultant.user_id,
      });
      if (error) throw error;
      setTakenDates(new Set((data ?? []).map((row: any) => row.taken_date)));
    } catch (e: any) {
      console.warn('[BookConsultant] taken-dates fetch error:', e.message);
      setTakenDates(new Set());
    } finally {
      setLoadingDates(false);
    }
  }

  const budgetNum = Number(budget.replace(/[^0-9.]/g, '')) || 0;
  const canSubmit = !!selectedDate && brief.trim().length > 10 && budgetNum > 0;

  async function handleSubmit() {
    if (!profile?.id || !consultant?.user_id) return;
    if (!canSubmit) {
      Alert.alert('Missing Info', 'Pick a date, add a brief (10+ characters), and confirm the budget.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          client_id: profile.id,
          consultant_id: consultant.user_id,
          assignment_type: `Hire ${categoryLabel}`,
          assignment_details: null,
          assignment_brief: brief.trim(),
          budget: budgetNum,
          event_date: selectedDate,
          status: 'assigned',
          progress_percent: 0,
          work_order_data: null,
          final_offer: null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23503') {
          Alert.alert('Error', 'Consultant profile not found. Please try again.');
        } else {
          Alert.alert('Error', error.message);
        }
        return;
      }

      sendNotification({
        userId: consultant.user_id,
        title: 'New Booking Request',
        message: `${profile.name ?? 'A client'} wants to book you for ${new Date(selectedDate!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
        type: 'assignment',
      });

      navigation.navigate('Main', { screen: 'CreatorWorkorder', params: { project: data } });
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
        <Text style={s.heroTitle}>Book{'\n'}{consultant?.name ?? 'Consultant'}</Text>
        <Text style={s.heroSub}>Pick an available date, share your brief, and confirm the budget.</Text>

        {/* Consultant summary */}
        <View style={s.consultantCard}>
          {consultant?.avatar_url
            ? <Image source={{ uri: consultant.avatar_url }} style={s.avatar} />
            : <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarInit}>{(consultant?.name ?? 'C').charAt(0).toUpperCase()}</Text>
              </View>
          }
          <View>
            <Text style={s.consultantName}>{consultant?.name}</Text>
            <Text style={s.consultantRole}>{categoryLabel}</Text>
          </View>
        </View>

        <Text style={s.sectionLabel}>SELECT A DATE</Text>
        {loadingDates ? (
          <ActivityIndicator size="small" color={TEAL} style={{ marginVertical: 20 }} />
        ) : (
          <MonthCalendar
            takenDates={takenDates}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        )}

        <Text style={[s.sectionLabel, { marginTop: 20 }]}>ASSIGNMENT BRIEF</Text>
        <TextInput
          style={s.textarea}
          placeholder="Tell them about the event, deliverables, and any specifics..."
          placeholderTextColor={colors.textTertiary}
          value={brief}
          onChangeText={setBrief}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        <Text style={[s.sectionLabel, { marginTop: 20 }]}>BUDGET (₹)</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. 25000"
          placeholderTextColor={colors.textTertiary}
          value={budget}
          onChangeText={v => setBudget(v.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={[s.submitBtn, (!canSubmit || submitting) && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Send size={16} color="#fff" /><Text style={s.submitBtnText}>Send Booking Request</Text></>
          }
        </TouchableOpacity>
        <Text style={s.submitHint}>
          You'll pay the advance once {consultant?.name ?? 'the consultant'} accepts.
        </Text>
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
  heroTitle: { fontSize: 32, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY, lineHeight: 36, marginTop: 10, marginBottom: 6 },
  heroSub: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20, marginBottom: 18 },

  consultantCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: colors.borderCard, padding: 14, marginBottom: 22 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  avatarInit: { color: '#fff', fontSize: 18, fontWeight: '800', fontFamily: fonts.heavy },
  consultantName: { fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  consultantRole: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary, marginTop: 2 },

  sectionLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.8, marginBottom: 10 },
  textarea: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.borderInput, paddingHorizontal: 16, paddingVertical: 14, fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textPrimary, minHeight: 110 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.borderInput, paddingHorizontal: 16, paddingVertical: 14, fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary },

  submitBtn: { backgroundColor: NAVY, borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 24, marginBottom: 10 },
  submitBtnText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy },
  submitHint: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textTertiary, textAlign: 'center', marginBottom: 10 },
});
