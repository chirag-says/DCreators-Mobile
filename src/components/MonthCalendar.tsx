/**
 * MonthCalendar — reusable month-grid date picker.
 * Pure presentational: caller owns availability data and selection state.
 * Three visual states per day: available (white), taken (gray, disabled),
 * selected (navy). Used by BookConsultantScreen for picking a booking date.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, fonts, fontSizes, radii } from '../styles/theme';

const NAVY = '#1B3A5C';
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function getDaysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
function getFirstWeekday(y: number, m: number) {
  const d = new Date(y, m, 1).getDay();
  return d === 0 ? 6 : d - 1; // 0=Mon
}

interface MonthCalendarProps {
  takenDates: Set<string>;
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
  disablePast?: boolean;
}

export default function MonthCalendar({
  takenDates, selectedDate, onSelectDate, disablePast = true,
}: MonthCalendarProps) {
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
          const isSelected = selectedDate === key;
          const disabled = isPast || isTaken;

          return (
            <TouchableOpacity
              key={i}
              style={[
                s.cell, s.dayCell,
                isTaken && s.dayCellTaken,
                isPast && s.dayCellPast,
                isSelected && s.dayCellSelected,
              ]}
              disabled={disabled}
              onPress={() => onSelectDate?.(key)}
              activeOpacity={0.7}
            >
              <Text style={[
                s.dayText,
                (isTaken || isPast) && s.dayTextDisabled,
                isSelected && s.dayTextSelected,
              ]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={s.legendRow}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.borderInput }]} />
          <Text style={s.legendText}>Available</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: '#E5E7EB' }]} />
          <Text style={s.legendText}>Booked</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: NAVY }]} />
          <Text style={s.legendText}>Selected</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: '#fff', borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderInput, padding: 16 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: fontSizes.xs, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  dayCell: { borderRadius: radii.full },
  dayCellTaken: { backgroundColor: '#E5E7EB' },
  dayCellPast: { backgroundColor: '#F8F9FB' },
  dayCellSelected: { backgroundColor: NAVY },
  dayText: { fontSize: fontSizes.sm + 1, fontFamily: fonts.medium, color: colors.textPrimary },
  dayTextDisabled: { color: colors.textTertiary },
  dayTextSelected: { color: '#fff', fontWeight: '800', fontFamily: fonts.heavy },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textSecondary },
});
