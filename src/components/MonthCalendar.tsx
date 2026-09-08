/**
 * MonthCalendar — reusable month-grid date picker.
 * Pure presentational: caller owns availability data and selection state.
 * Four visual states per day: available (white), booked (grey fill, struck
 * through), past (no fill, recessive text), selected (navy).
 * Used by BookConsultantScreen for picking a booking date.
 *
 * Booked and past used to be #E5E7EB and #F8F9FB — two near-whites on a white
 * card, telling the client nothing about why a day could not be tapped. Booked
 * now carries a strikethrough as well as a fill, so the "unavailable" signal
 * does not depend on distinguishing two greys or on seeing colour at all.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, fonts, fontSizes, radii } from '../styles/theme';
import { toDateKey, getDaysInMonth, getFirstWeekday } from '../lib/calendar';

const NAVY = '#1B3A5C';

// Booked: 6.3:1 text-on-fill, comfortably past WCAG AA. Past: 2.2:1 and
// deliberately so — it is an inactive control (WCAG 1.4.3 exempts those) and
// recessing it is the whole point, so long as booked stays legible.
const BOOKED_FILL = '#C7CDD6';
const BOOKED_TEXT = '#374151';
const PAST_TEXT = '#A9B0BC';
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface MonthCalendarProps {
  takenDates: Set<string>;
  /** Single-select API (CreateBidScreen). */
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
  /** Multi-select API (BookConsultantScreen). When passed, a tap toggles the
   *  day in/out of the set and every member renders selected. */
  selectedDates?: Set<string>;
  onToggleDate?: (date: string) => void;
  disablePast?: boolean;
}

export default function MonthCalendar({
  takenDates, selectedDate, onSelectDate, selectedDates, onToggleDate, disablePast = true,
}: MonthCalendarProps) {
  const multi = !!selectedDates;
  function isSelected(key: string) {
    return multi ? selectedDates!.has(key) : selectedDate === key;
  }
  function handlePress(key: string) {
    if (multi) onToggleDate?.(key);
    else onSelectDate?.(key);
  }
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const todayKey = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());
  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month);

  function goPrevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); } else { setMonth(m => m - 1); }
  }
  function goNextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); } else { setMonth(m => m + 1); }
  }

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <View style={s.wrap}>
      <View style={s.navRow}>
        <TouchableOpacity style={s.navBtn} onPress={goPrevMonth} activeOpacity={0.7}>
          <ChevronLeft size={18} color={NAVY} />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{MONTH_LABELS[month]} {year}</Text>
        <TouchableOpacity style={s.navBtn} onPress={goNextMonth} activeOpacity={0.7}>
          <ChevronRight size={18} color={NAVY} />
        </TouchableOpacity>
      </View>

      <View style={s.weekRow}>
        {DAY_LABELS.map((d, i) => (
          <Text key={i} style={s.weekLabel}>{d}</Text>
        ))}
      </View>

      <View style={s.grid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={i} style={s.cell} />;
          const key = toDateKey(year, month, day);
          const isPast = disablePast && key < todayKey;
          const isTaken = takenDates.has(key);
          const selected = isSelected(key);
          const disabled = isPast || isTaken;

          return (
            <TouchableOpacity
              key={i}
              style={s.cell}
              disabled={disabled}
              onPress={() => handlePress(key)}
              activeOpacity={0.7}
            >
              {/* Inner circle carries the fill so the tap target can span the
                  full column while the selected/booked pip stays round. */}
              <View style={[
                s.dayCell,
                isTaken && s.dayCellTaken,
                isPast && s.dayCellPast,
                selected && s.dayCellSelected,
              ]}>
                <Text style={[
                  s.dayText,
                  isTaken && s.dayTextTaken,
                  // Past wins over taken: a day already gone is unbookable for a
                  // reason the client can act on, so don't dress it as "booked".
                  isPast && s.dayTextPast,
                  selected && s.dayTextSelected,
                ]}>
                  {day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={s.legendRow}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.borderInput }]} />
          <Text style={s.legendText}>Available</Text>
        </View>
        {/* CreateBidScreen passes an empty set — no consultant is chosen yet,
            so there is nothing to be booked and no key to explain. */}
        {takenDates.size > 0 && (
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: BOOKED_FILL }]} />
            <Text style={s.legendText}>Booked</Text>
          </View>
        )}
        {/* Past days were greyed out with no legend entry, so a client seeing a
            dead first week had no way to tell it apart from a fully booked one. */}
        {disablePast && (
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: '#fff', borderWidth: 1, borderColor: PAST_TEXT }]} />
            <Text style={s.legendText}>Past</Text>
          </View>
        )}
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: NAVY }]} />
          <Text style={s.legendText}>Selected</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: '#fff', borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderInput, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: fontSizes.xs, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  // A row height a touch under the cell width keeps the grid from towering: the
  // square-cell version left a band of empty card below the last week of dates.
  cell: { width: `${100 / 7}%`, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  dayCell: { width: 38, height: 38, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  dayCellTaken: { backgroundColor: BOOKED_FILL },
  // No fill at all: past days recede into the card instead of competing with
  // booked ones for the same near-white.
  dayCellPast: { backgroundColor: 'transparent' },
  dayCellSelected: { backgroundColor: NAVY },
  dayText: { fontSize: fontSizes.sm + 1, fontFamily: fonts.medium, color: colors.textPrimary },
  dayTextTaken: { color: BOOKED_TEXT, textDecorationLine: 'line-through' },
  dayTextPast: { color: PAST_TEXT, textDecorationLine: 'none' },
  dayTextSelected: { color: '#fff', fontWeight: '800', fontFamily: fonts.heavy },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 8, marginTop: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textSecondary },
});
