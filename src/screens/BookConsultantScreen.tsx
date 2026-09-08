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
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Minus, Plus } from 'lucide-react-native';
import ScreenHeader from '../components/ScreenHeader';
import { sendNotification } from '../lib/notifications';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import MonthCalendar from '../components/MonthCalendar';
import { toggleInSet, sortedDateKeys } from '../lib/calendar';
import { fetchConsultantTakenDates } from '../services/consultantScheduleService';
import { createProject } from '../services/projectService';
import { creativeItemsFor } from '../lib/assignment';
import {
  TIME_SLOTS, formatStartTime, seedBudget,
  DURATION_UNITS, DURATION_UNIT_LABELS, type DurationUnit,
} from '../lib/booking';
import RatingStars from '../components/RatingStars';
import { fetchConsultantRatings, type ConsultantRating } from '../services/consultantService';

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
  // Multiple discrete days can be booked in one request. Kept as a Set for O(1)
  // toggle from the calendar; sorted only where order matters (the primary
  // event_date and the human-readable summary).
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  // Concrete deliverable — becomes assignment_details[0], i.e. the title the
  // consultant sees. Without it a booked project degrades to "Hire Designer".
  const [creativeItem, setCreativeItem] = useState<string | null>(null);
  const [brief, setBrief] = useState('');
  // Call time and span. A consultant used to accept a booking knowing the day
  // and nothing else — not when to turn up, not how long they were held for.
  const [startTime, setStartTime] = useState<string | null>(null);
  // Pre-filled rather than empty: one day is the common case, and a required
  // blank stepper is friction for a field that has a sensible default.
  const [durationValue, setDurationValue] = useState(1);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('days');
  const [budget, setBudget] = useState(consultant?.base_price ? String(consultant.base_price) : '');
  // Once the client edits the budget it is theirs; the rate-derived seed below
  // must not overwrite a number they typed.
  const [budgetTouched, setBudgetTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const categoryLabel = CATEGORY_LABELS[consultant?.category] ?? 'Creative Consultant';

  const [rating, setRating] = useState<ConsultantRating | null>(null);

  useEffect(() => { fetchTakenDates(); }, [consultant?.user_id]);

  useEffect(() => {
    const userId = consultant?.user_id;
    if (!userId) return;
    let cancelled = false;
    fetchConsultantRatings([userId]).then(map => {
      if (!cancelled) setRating(map[userId] ?? null);
    });
    return () => { cancelled = true; };
  }, [consultant?.user_id]);

  // Re-seed the budget as the span changes, so a 3-day booking of a ₹5,000/day
  // consultant opens at ₹15,000 rather than ₹5,000.
  useEffect(() => {
    if (budgetTouched) return;
    const seeded = seedBudget(consultant?.base_price, consultant?.price_unit, durationValue, durationUnit);
    setBudget(seeded ? String(seeded) : '');
  }, [budgetTouched, consultant?.base_price, consultant?.price_unit, durationValue, durationUnit]);

  async function fetchTakenDates() {
    if (!consultant?.user_id) { setLoadingDates(false); return; }
    setLoadingDates(true);
    try {
      const data = await fetchConsultantTakenDates(consultant.user_id);
      setTakenDates(new Set(data));
    } catch (e: any) {
      console.warn('[BookConsultant] taken-dates fetch error:', e.message);
      setTakenDates(new Set());
    } finally {
      setLoadingDates(false);
    }
  }

  const budgetNum = Number(budget.replace(/[^0-9.]/g, '')) || 0;
  const creativeItems = creativeItemsFor(consultant?.category);

  // Chronological list of the chosen days. The first is the primary
  // `event_date` the booking pipeline keys off; the rest ride along in the
  // brief so the consultant sees every day requested.
  const sortedDates = sortedDateKeys(selectedDates);
  const primaryDate = sortedDates[0] ?? null;

  function toggleDate(date: string) {
    setSelectedDates(prev => toggleInSet(prev, date));
  }

  function labelDate(date: string): string {
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Named rather than a bare boolean: four independent preconditions gate this
  // form, and a dimmed button tells the client which zero of them they missed.
  // Reported in the order the form reads, so the reason always points at the
  // topmost thing still outstanding.
  //
  // Don't hold a booking hostage to a picker that has nothing in it: a
  // consultant with no category set still needs to be bookable, and the brief
  // carries the intent in that case.
  const blockReason =
    selectedDates.size === 0 ? 'Pick at least one date to continue'
    : !startTime ? 'Pick a start time'
    : creativeItems.length > 0 && !creativeItem ? `Choose what you need this ${categoryLabel.toLowerCase()} for`
    : brief.trim().length <= 10 ? 'Add a brief of at least 10 characters'
    : budgetNum <= 0 ? 'Enter your budget'
    : null;
  const canSubmit = !blockReason;

  async function handleSubmit() {
    if (!profile?.id || !consultant?.user_id) return;
    if (blockReason) {
      Alert.alert('Missing Info', blockReason);
      return;
    }

    setSubmitting(true);
    try {
      // Every requested day, spelled out at the top of the brief. `event_date`
      // can only hold the first, so the consultant reads the rest here until
      // the schedule can block a full set of days (backend follow-up).
      const datesLine = sortedDates.length > 1
        ? `Requested dates: ${sortedDates.map(labelDate).join(', ')}\n\n`
        : '';
      const fullBrief = `${datesLine}${brief.trim()}`;

      const data = await createProject({
        client_id: profile.id,
        consultant_id: consultant.user_id,
        assignment_type: `Hire ${categoryLabel}`,
        assignment_details: creativeItem ? [creativeItem] : null,
        assignment_brief: fullBrief,
        budget: budgetNum,
        event_date: primaryDate,
        start_time: startTime,
        duration_value: durationValue,
        duration_unit: durationUnit,
        status: 'assigned',
        progress_percent: 0,
        work_order_data: null,
        // Client's budget is the opening offer in the price handshake.
        final_offer: budgetNum,
        offer_by: 'client',
        price_agreed: false,
      });

      sendNotification({
        userId: consultant.user_id,
        title: 'New Booking Request',
        message: `${profile.name ?? 'A client'} wants to book you for ${sortedDates.length > 1 ? `${sortedDates.length} days (${sortedDates.map(labelDate).join(', ')})` : labelDate(primaryDate!)} at ${formatStartTime(startTime)}.`,
        type: 'assignment',
      });

      // CLIENT waits on their own project view for the consultant's response.
      navigation.navigate('ClientWorkorder', { project: data });
    } catch (e: any) {
      if (e?.code === '23503') {
        Alert.alert('Error', 'Consultant profile not found. Please try again.');
      } else {
        Alert.alert('Error', e.message ?? 'Something went wrong.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScreenHeader title="Book a Consultant" />

      {/* Wraps the scroll AND the pinned CTA: the numeric keypad used to sit on
          top of the BUDGET field the client was typing into. Same behavior pair
          AssignProjectScreen uses. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
              {/* The commit point. A client about to enter a budget should see
                  what previous clients scored this consultant. */}
              <View style={s.ratingRow}>
                <RatingStars average={rating?.average_rating} count={rating?.review_count} />
              </View>
            </View>
          </View>

          <Text style={s.sectionLabel}>SELECT ONE OR MORE DATES</Text>
          {loadingDates ? (
            <ActivityIndicator size="small" color={TEAL} style={{ marginVertical: 20 }} />
          ) : (
            <MonthCalendar
              takenDates={takenDates}
              selectedDates={selectedDates}
              onToggleDate={toggleDate}
            />
          )}

          {/* Tap-to-remove chips so the client can see and prune the full set
              of days they picked without hunting back through the grid. */}
          {sortedDates.length > 0 && (
            <View style={s.dateChips}>
              {sortedDates.map(d => (
                <TouchableOpacity key={d} style={s.dateChip} onPress={() => toggleDate(d)} activeOpacity={0.8}>
                  <Text style={s.dateChipText}>{labelDate(d)}</Text>
                  <Minus size={13} color={NAVY} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Half-hour chips rather than a native clock: same visual language
              as the creative-item chips below, and no new dependency for a
              field whose realistic range is sixteen hours. */}
          <Text style={[s.sectionLabel, { marginTop: 20 }]}>START TIME</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.timeRow}
            keyboardShouldPersistTaps="handled"
          >
            {TIME_SLOTS.map(slot => {
              const active = startTime === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[s.timeChip, active && s.chipActive]}
                  onPress={() => setStartTime(slot)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>{formatStartTime(slot)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[s.sectionLabel, { marginTop: 20 }]}>HOW LONG DO YOU NEED THEM?</Text>
          <View style={s.durationRow}>
            <View style={s.stepper}>
              <TouchableOpacity
                style={[s.stepperBtn, durationValue <= 1 && s.stepperBtnOff]}
                onPress={() => setDurationValue(v => Math.max(1, v - 1))}
                disabled={durationValue <= 1}
                activeOpacity={0.7}
              >
                <Minus size={16} color={durationValue <= 1 ? colors.textTertiary : NAVY} />
              </TouchableOpacity>
              <Text style={s.stepperValue}>{durationValue}</Text>
              <TouchableOpacity
                style={s.stepperBtn}
                onPress={() => setDurationValue(v => v + 1)}
                activeOpacity={0.7}
              >
                <Plus size={16} color={NAVY} />
              </TouchableOpacity>
            </View>
            <View style={s.unitToggle}>
              {DURATION_UNITS.map(unit => {
                const active = durationUnit === unit;
                return (
                  <TouchableOpacity
                    key={unit}
                    style={[s.unitBtn, active && s.chipActive]}
                    onPress={() => setDurationUnit(unit)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>{DURATION_UNIT_LABELS[unit]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Only what this consultant actually does. The discipline is already
              settled by whose profile you opened, so there is no category step
              here and no reason to offer the other four catalogues. */}
          <Text style={[s.sectionLabel, { marginTop: 20 }]}>
            WHAT DO YOU NEED {categoryLabel.toUpperCase()} FOR?
          </Text>
          {creativeItems.length === 0 ? (
            <Text style={s.chipHint}>
              This consultant has not set a discipline yet. Describe what you need in the brief below.
            </Text>
          ) : (
            <>
              <View style={s.chipWrap}>
                {creativeItems.map(item => {
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
              <Text style={s.chipHint}>This becomes the assignment title your consultant sees.</Text>
            </>
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
            onChangeText={v => { setBudgetTouched(true); setBudget(v.replace(/[^0-9]/g, '')); }}
            keyboardType="numeric"
          />

        </ScrollView>

        {/* Pinned rather than parked at the end of a long scroll — the client
            should never have to hunt for the commit action. */}
        <View style={s.ctaBar}>
          <Text style={blockReason ? s.ctaBlocked : s.submitHint}>
            {blockReason ?? `You'll pay the advance once ${consultant?.name ?? 'the consultant'} accepts.`}
          </Text>
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  heroTitle: { fontSize: 32, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY, lineHeight: 36, marginTop: 10, marginBottom: 6 },
  heroSub: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20, marginBottom: 18 },

  consultantCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: colors.borderCard, padding: 14, marginBottom: 22 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  avatarInit: { color: '#fff', fontSize: 18, fontWeight: '800', fontFamily: fonts.heavy },
  consultantName: { fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  ratingRow: { marginTop: 5 },
  consultantRole: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary, marginTop: 2 },

  sectionLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.8, marginBottom: 10 },

  // Same chip vocabulary as CreateBidScreen — one visual language for
  // "pick a creative item" wherever the client is asked for one.
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radii.full, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.borderInput },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: fontSizes.sm + 1, fontFamily: fonts.medium, color: colors.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '700', fontFamily: fonts.heavy },
  chipHint: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 8 },

  // Selected-date chips under the calendar (tap to remove).
  dateChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 9, paddingVertical: 8, borderRadius: radii.full, backgroundColor: '#fff', borderWidth: 1.5, borderColor: NAVY },
  dateChipText: { fontSize: fontSizes.sm, fontFamily: fonts.medium, fontWeight: '700', color: NAVY },

  // Start time + duration — same chip skin as above, laid out for a horizontal
  // scroll and a stepper rather than a wrapping grid.
  timeRow: { gap: 8, paddingRight: 4 },
  timeChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radii.full, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.borderInput },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radii.full, borderWidth: 1.5, borderColor: colors.borderInput, paddingHorizontal: 4 },
  stepperBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepperBtnOff: { opacity: 0.5 },
  stepperValue: { minWidth: 28, textAlign: 'center', fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  unitToggle: { flexDirection: 'row', gap: 8 },
  unitBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radii.full, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.borderInput },
  textarea: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.borderInput, paddingHorizontal: 16, paddingVertical: 14, fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textPrimary, minHeight: 110 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.borderInput, paddingHorizontal: 16, paddingVertical: 14, fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary },

  ctaBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.border },
  submitBtn: { backgroundColor: NAVY, borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitBtnText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy },
  submitHint: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textTertiary, textAlign: 'center', marginBottom: 8 },
  // Carries information the dimmed button can't, so it gets weight the neutral
  // hint doesn't.
  ctaBlocked: { fontSize: fontSizes.xs + 1, fontFamily: fonts.medium, fontWeight: '600', color: colors.textSecondary, textAlign: 'center', marginBottom: 8 },
});
