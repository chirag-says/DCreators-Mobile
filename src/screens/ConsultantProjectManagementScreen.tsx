/**
 * CONSULTANT_PROJECT_MANAGEMENT_SCREEN  (Phase 5.3)
 * owner_role: CONSULTANT
 * Figma: CONSULTANT_PROJECT_MANAGEMENT_SCREEN.png
 * — Ongoing Projects list (with progress bars + budget)
 * — Delivered Projects table
 * — Mini month calendar with milestone dots
 * — Add Project quick-entry form
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MoreVertical, Edit3, ChevronLeft, ChevronRight,
  Plus, Save,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import type { Project } from '../types';
import TopHeader from '../components/TopHeader';

const NAVY   = '#1B3A5C';
const TEAL   = '#3D9B8F';
const ORANGE = '#E87B35';
const BROWN  = '#8B4513';
const BG     = '#EDF1F5';

const DAYS   = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y: number, m: number) {
  const d = new Date(y, m, 1).getDay();
  return d === 0 ? 6 : d - 1; // 0=Mon
}

export default function ConsultantProjectManagementScreen({ navigation }: any) {
  const consultantProfile = useAuthStore(s => s.consultantProfile);

  const [ongoing,    setOngoing]    = useState<Project[]>([]);
  const [delivered,  setDelivered]  = useState<Project[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  // Add project form
  const [showForm,   setShowForm]   = useState(false);
  const [formTitle,  setFormTitle]  = useState('');
  const [formDate,   setFormDate]   = useState('');
  const [formClient, setFormClient] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Milestone dates for calendar dots
  const milestoneDates: Set<number> = new Set(
    [...ongoing, ...delivered]
      .flatMap(p => [p.milestone_1_date, p.milestone_2_date, p.final_date])
      .filter(Boolean)
      .map(d => new Date(d!).getDate())
  );

  // Consultant-managed blackout days (vacation, already committed elsewhere) —
  // 'YYYY-MM-DD' keys, tap a day below to toggle.
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());

  useEffect(() => { fetchProjects(); fetchBlockedDates(); }, []);

  async function fetchBlockedDates() {
    if (!consultantProfile?.id) return;
    try {
      const { data } = await supabase
        .from('consultant_blocked_dates')
        .select('blocked_date')
        .eq('consultant_id', consultantProfile.id);
      setBlockedDates(new Set((data ?? []).map((row: any) => row.blocked_date)));
    } catch {}
  }

  function dateKey(y: number, m: number, d: number) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  async function toggleBlockedDate(day: number) {
    if (!consultantProfile?.id) return;
    const key = dateKey(calYear, calMonth, day);
    const isBlocked = blockedDates.has(key);
    try {
      if (isBlocked) {
        await supabase.from('consultant_blocked_dates')
          .delete()
          .eq('consultant_id', consultantProfile.id)
          .eq('blocked_date', key);
        setBlockedDates(prev => { const next = new Set(prev); next.delete(key); return next; });
      } else {
        await supabase.from('consultant_blocked_dates')
          .insert({ consultant_id: consultantProfile.id, blocked_date: key });
        setBlockedDates(prev => new Set(prev).add(key));
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not update that date.');
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProjects().finally(() => setRefreshing(false));
  }, []);

  async function fetchProjects() {
    if (!consultantProfile?.user_id) { setLoading(false); return; }
    setLoading(true);
    try {
      const ONGOING_STATUSES = ['work_order_accepted','in_progress','review_1','review_2','final_review','final_approved','balance_pending','balance_paid'];
      const { data: onData } = await supabase
        .from('projects')
        .select('*, client:profiles!client_id(name)')
        .eq('consultant_id', consultantProfile.user_id)
        .in('status', ONGOING_STATUSES)
        .order('created_at', { ascending: false });

      const { data: delData } = await supabase
        .from('projects')
        .select('*, client:profiles!client_id(name)')
        .eq('consultant_id', consultantProfile.user_id)
        .in('status', ['delivered','completed'])
        .order('updated_at', { ascending: false })
        .limit(10);

      setOngoing(onData  ?? []);
      setDelivered(delData ?? []);
    } catch {}
    finally { setLoading(false); }
  }

  async function handleAddProject() {
    if (!formTitle.trim()) { Alert.alert('Required', 'Please enter a project title.'); return; }
    if (!consultantProfile?.user_id) return;
    setFormSaving(true);
    try {
      const { error } = await supabase.from('consultant_project_notes').insert({
        consultant_id: consultantProfile.user_id,
        title: formTitle.trim(),
        client_name: formClient.trim() || null,
        target_date: formDate || null,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      setFormTitle(''); setFormDate(''); setFormClient('');
      setShowForm(false);
      Alert.alert('Added', 'Project note created.');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setFormSaving(false); }
  }

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  }

  const daysInMonth  = getDaysInMonth(calYear, calMonth);
  const firstDayIdx  = getFirstDayOfMonth(calYear, calMonth);
  const calCells     = [...Array(firstDayIdx).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const today        = calYear === now.getFullYear() && calMonth === now.getMonth() ? now.getDate() : -1;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <TopHeader />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
      >
        {/* Ongoing Projects */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Ongoing Projects</Text>
          <View style={s.activeBadge}>
            <Text style={s.activeBadgeText}>{ongoing.length} Active</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={TEAL} style={{ marginTop: 24 }} />
        ) : ongoing.length === 0 ? (
          <View style={s.emptyCard}><Text style={s.emptyText}>No ongoing projects.</Text></View>
        ) : (
          ongoing.map((p, i) => (
            <TouchableOpacity
              key={p.id}
              style={s.projectCard}
              onPress={() => navigation.navigate('ClientWorkorder', { project: p })}
              activeOpacity={0.9}
            >
              <View style={s.projectTopRow}>
                <View>
                  <Text style={s.projectNum}>PROJECT #{String(i + 204).padStart(3,'0')}</Text>
                  <Text style={s.projectTitle}>{p.assignment_brief?.slice(0,30) ?? 'Untitled'}{p.assignment_brief?.length > 30 ? '…' : ''}</Text>
                </View>
                <TouchableOpacity activeOpacity={0.7}><MoreVertical size={18} color={colors.textTertiary} /></TouchableOpacity>
              </View>
              <Text style={s.projectClient}>Client: {(p as any).client?.name ?? '—'}</Text>
              <View style={s.progressLabelRow}>
                <Text style={s.progressLabel}>Progress</Text>
              </View>
              <View style={s.progressBar}>
                <View style={[s.progressFill, { width: `${p.progress_percent ?? 0}%` }]} />
              </View>
              <Text style={s.projectBudget}>
                {(p.final_offer ?? p.budget ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </Text>
            </TouchableOpacity>
          ))
        )}

        {/* Delivered Projects table */}
        {delivered.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>Delivered Projects</Text>
            <View style={s.deliveredTable}>
              <View style={[s.tableRow, s.tableHeader]}>
                <Text style={[s.tableCell, s.tableHeaderCell, { flex: 2 }]}>Project Name</Text>
                <Text style={[s.tableCell, s.tableHeaderCell]}>Client</Text>
                <Text style={[s.tableCell, s.tableHeaderCell]}>Date Completed</Text>
              </View>
              {delivered.map((p) => (
                <View key={p.id} style={s.tableRow}>
                  <Text style={[s.tableCell, { flex: 2, fontFamily: fonts.heavy }]} numberOfLines={2}>
                    {p.assignment_brief?.slice(0,24) ?? 'Project'}
                  </Text>
                  <Text style={s.tableCell}>{(p as any).client?.name ?? '—'}</Text>
                  <Text style={s.tableCell}>
                    {p.updated_at ? new Date(p.updated_at).toLocaleDateString('en-IN', { month:'short', day:'2-digit', year:'2-digit' }) : '—'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Calendar */}
        <Text style={[s.sectionTitle, { marginTop: 28, marginBottom: 12 }]}>Project Management</Text>
        <View style={s.calendarCard}>
          <View style={s.calNavRow}>
            <TouchableOpacity onPress={prevMonth} activeOpacity={0.7}>
              <ChevronLeft size={20} color={NAVY} />
            </TouchableOpacity>
            <Text style={s.calMonthLabel}>{MONTHS[calMonth]} {calYear}</Text>
            <TouchableOpacity onPress={nextMonth} activeOpacity={0.7}>
              <ChevronRight size={20} color={NAVY} />
            </TouchableOpacity>
          </View>
          <View style={s.calDaysHeader}>
            {DAYS.map(d => <Text key={d} style={s.calDayLabel}>{d}</Text>)}
          </View>
          <View style={s.calGrid}>
            {calCells.map((day, idx) => {
              const isBlocked = day ? blockedDates.has(dateKey(calYear, calMonth, day)) : false;
              return (
                <TouchableOpacity
                  key={idx}
                  style={s.calCell}
                  activeOpacity={day ? 0.7 : 1}
                  disabled={!day}
                  onPress={() => day && toggleBlockedDate(day)}
                >
                  {day && (
                    <>
                      <Text style={[
                        s.calDay,
                        day === today && s.calDayToday,
                        isBlocked && s.calDayBlocked,
                      ]}>{day}</Text>
                      {milestoneDates.has(day) && <View style={s.calDot} />}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={s.calHint}>Tap a day to mark yourself unavailable (vacation, already booked elsewhere).</Text>
        </View>

        {/* Add Project */}
        <View style={s.addProjectCard}>
          <TouchableOpacity
            style={s.addProjectHeader}
            onPress={() => setShowForm(v => !v)}
            activeOpacity={0.8}
          >
            <Plus size={18} color={NAVY} />
            <Text style={s.addProjectTitle}>Add Project</Text>
          </TouchableOpacity>
          {showForm && (
            <View style={s.formBody}>
              <Text style={s.fieldLabel}>Project Title</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Logo Design"
                placeholderTextColor={colors.textTertiary}
                value={formTitle}
                onChangeText={setFormTitle}
              />
              <Text style={s.fieldLabel}>Date Selection</Text>
              <TextInput
                style={s.input}
                placeholder="mm/dd/yyyy"
                placeholderTextColor={colors.textTertiary}
                value={formDate}
                onChangeText={setFormDate}
                keyboardType="numeric"
              />
              <Text style={s.fieldLabel}>Client Name</Text>
              <TextInput
                style={s.input}
                placeholder="Enter name"
                placeholderTextColor={colors.textTertiary}
                value={formClient}
                onChangeText={setFormClient}
              />
              <View style={s.formBtnRow}>
                <TouchableOpacity
                  style={[s.saveBtn, formSaving && { opacity: 0.6 }]}
                  onPress={handleAddProject}
                  disabled={formSaving}
                  activeOpacity={0.85}
                >
                  {formSaving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <><Save size={14} color="#fff" /><Text style={s.saveBtnText}>Save</Text></>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.editBtn}
                  onPress={() => setShowForm(false)}
                  activeOpacity={0.85}
                >
                  <Text style={s.editBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, marginBottom: 14 },
  sectionTitle: { fontSize: fontSizes.xl, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  activeBadge: { backgroundColor: TEAL, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  activeBadgeText: { fontSize: fontSizes.xs + 1, fontWeight: '700', fontFamily: fonts.heavy, color: '#fff' },
  // Project card
  projectCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: colors.borderCard },
  projectTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  projectNum: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.5 },
  projectTitle: { fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY, lineHeight: 22, marginTop: 2 },
  projectClient: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, marginBottom: 10 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: fontSizes.xs + 1, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textSecondary },
  progressBar: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: NAVY, borderRadius: 4 },
  projectBudget: { fontSize: fontSizes['2xl'], fontWeight: '900', fontFamily: fonts.heavy, color: NAVY },
  // Delivered table
  deliveredTable: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderCard, marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tableHeader: { backgroundColor: '#F8F9FB' },
  tableCell: { flex: 1, fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textPrimary },
  tableHeaderCell: { fontWeight: '700', fontFamily: fonts.heavy, color: NAVY, fontSize: fontSizes.xs + 1 },
  // Calendar
  calendarCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.borderCard, marginBottom: 20 },
  calNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  calMonthLabel: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  calDaysHeader: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  calDayLabel: { width: `${100/7}%`, textAlign: 'center', fontSize: 9, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.3 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100/7}%`, alignItems: 'center', paddingVertical: 6 },
  calDay: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textPrimary, textAlign: 'center' },
  calDayToday: { backgroundColor: NAVY, color: '#fff', borderRadius: 14, width: 26, height: 26, lineHeight: 26, textAlign: 'center', fontWeight: '700', fontFamily: fonts.heavy },
  calDayBlocked: { backgroundColor: '#E5E7EB', color: colors.textTertiary, borderRadius: 14, width: 26, height: 26, lineHeight: 26, textAlign: 'center' },
  calDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: ORANGE, marginTop: 2 },
  calHint: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textTertiary, textAlign: 'center', marginTop: 10 },
  // Add project
  addProjectCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: colors.borderCard },
  addProjectHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addProjectTitle: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  formBody: { marginTop: 16, gap: 4 },
  fieldLabel: { fontSize: fontSizes.xs + 1, fontWeight: '600', fontFamily: fonts.medium, color: colors.textPrimary, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: colors.inputBg, borderRadius: 10, borderWidth: 1, borderColor: colors.borderInput, paddingHorizontal: 14, paddingVertical: 12, fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary },
  formBtnRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  saveBtn: { flex: 1, backgroundColor: NAVY, borderRadius: 10, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },
  editBtn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E5E7EB' },
  editBtnText: { color: colors.textSecondary, fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: colors.borderCard },
  emptyText: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textTertiary },
});
