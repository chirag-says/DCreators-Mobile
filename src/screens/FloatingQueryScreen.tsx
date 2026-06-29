import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Platform, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, X, ChevronDown, Clock, MessageSquare, Plus } from 'lucide-react-native';
import TopHeader from '../components/TopHeader';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';


const DISCIPLINES = ['Photography', 'Design', 'Videography', 'Sculpture', 'Artisan', 'Other'];
const BUDGET_RANGES = ['Under ₹10,000', '₹10,000 - ₹25,000', '₹25,000 - ₹50,000', '₹50,000 - ₹1,00,000', 'Above ₹1,00,000'];
const BUDGET_VALUES: Record<string, { min: number; max: number }> = {
  'Under ₹10,000': { min: 0, max: 10000 },
  '₹10,000 - ₹25,000': { min: 10000, max: 25000 },
  '₹25,000 - ₹50,000': { min: 25000, max: 50000 },
  '₹50,000 - ₹1,00,000': { min: 50000, max: 100000 },
  'Above ₹1,00,000': { min: 100000, max: 500000 },
};

export default function FloatingQueryScreen({ navigation }: any) {
  const profile = useAuthStore((s) => s.profile);
  const currentRole = useAuthStore((s) => s.currentRole);

  const [myQueries, setMyQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [discipline, setDiscipline] = useState('');
  const [brief, setBrief] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown state
  const [showDisciplineDropdown, setShowDisciplineDropdown] = useState(false);
  const [showBudgetDropdown, setShowBudgetDropdown] = useState(false);

  useEffect(() => { fetchQueries(); }, []);

  async function fetchQueries() {
    if (!profile?.id) { setLoading(false); return; }
    try {
      let query = supabase.from('floating_queries').select('*').order('created_at', { ascending: false });

      if (currentRole === 'client') {
        query = query.eq('client_id', profile.id);
      } else {
        query = query.eq('status', 'open');
      }

      const { data, error } = await query;
      if (!error && data) setMyQueries(data);
    } catch {}
    finally { setLoading(false); }
  }

  async function handleSubmitQuery() {
    if (!discipline || !brief.trim()) {
      Alert.alert('Missing Info', 'Please select a discipline and describe your brief.');
      return;
    }
    if (!profile?.id) return;

    setIsSubmitting(true);
    try {
      const budgetVals = BUDGET_VALUES[budgetRange] || { min: 0, max: 0 };
      const { error } = await supabase.from('floating_queries').insert({
        client_id: profile.id,
        assignment_type: discipline.toLowerCase(),
        assignment_brief: brief,
        budget_min: budgetVals.min,
        budget_max: budgetVals.max,
        deadline: deadline || null,
        status: 'open',
      });

      if (error) { Alert.alert('Error', error.message); setIsSubmitting(false); return; }

      Alert.alert('✅ Query Floated!', 'Your query is now visible to consultants. You\'ll be notified when someone responds.');
      setShowForm(false);
      setDiscipline('');
      setBrief('');
      setBudgetRange('');
      setDeadline('');
      fetchQueries();
    } catch { Alert.alert('Error', 'Something went wrong.'); }
    finally { setIsSubmitting(false); }
  }

  function resetForm() {
    setDiscipline('');
    setBrief('');
    setBudgetRange('');
    setDeadline('');
  }

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopHeader />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>

            <Text style={styles.screenTitle}>
              {currentRole === 'consultant' ? 'Open Queries' : 'Float a Query'}
            </Text>
            <Text style={styles.screenSubtitle}>
              {currentRole === 'consultant'
                ? 'Browse open queries from clients and respond'
                : 'Describe your need and let consultants come to you'}
            </Text>

            {/* New Query Form (Client only) */}
            {currentRole !== 'consultant' && !showForm && (
              <TouchableOpacity style={styles.newQueryBtn} onPress={() => setShowForm(true)}>
                <Plus size={18} color={colors.textOnPrimary} />
                <Text style={styles.newQueryBtnText}>New Query</Text>
              </TouchableOpacity>
            )}

            {showForm && (
              <View style={styles.formCard}>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>New Query</Text>
                  <TouchableOpacity onPress={() => setShowForm(false)}>
                    <X size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Discipline Picker */}
                <Text style={styles.formLabel}>Discipline *</Text>
                <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowDisciplineDropdown(!showDisciplineDropdown)}>
                  <Text style={[styles.pickerText, !discipline && { color: colors.textTertiary }]}>
                    {discipline || 'Select discipline'}
                  </Text>
                  <ChevronDown size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                {showDisciplineDropdown && (
                  <View style={styles.dropdownList}>
                    {DISCIPLINES.map((d) => (
                      <TouchableOpacity key={d} style={styles.dropdownItem} onPress={() => { setDiscipline(d); setShowDisciplineDropdown(false); }}>
                        <Text style={[styles.dropdownText, discipline === d && { color: colors.primary, fontWeight: '700' }]}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Brief */}
                <Text style={styles.formLabel}>Project Brief *</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Describe what you need..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  textAlignVertical="top"
                  value={brief}
                  onChangeText={setBrief}
                />

                {/* Budget */}
                <Text style={styles.formLabel}>Budget Range</Text>
                <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowBudgetDropdown(!showBudgetDropdown)}>
                  <Text style={[styles.pickerText, !budgetRange && { color: colors.textTertiary }]}>
                    {budgetRange || 'Select budget'}
                  </Text>
                  <ChevronDown size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                {showBudgetDropdown && (
                  <View style={styles.dropdownList}>
                    {BUDGET_RANGES.map((b) => (
                      <TouchableOpacity key={b} style={styles.dropdownItem} onPress={() => { setBudgetRange(b); setShowBudgetDropdown(false); }}>
                        <Text style={[styles.dropdownText, budgetRange === b && { color: colors.primary, fontWeight: '700' }]}>{b}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Deadline */}
                <Text style={styles.formLabel}>Deadline (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 15th June 2026"
                  placeholderTextColor={colors.textTertiary}
                  value={deadline}
                  onChangeText={setDeadline}
                />

                {/* Action Buttons */}
                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.resetBtn} onPress={resetForm}>
                    <Text style={styles.resetBtnText}>Reset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.submitQueryBtn} onPress={handleSubmitQuery} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator color={colors.textOnPrimary} size="small" /> : (
                      <>
                        <Send size={14} color={colors.textOnPrimary} />
                        <Text style={styles.submitQueryBtnText}>Submit Query</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Queries List */}
            <Text style={styles.sectionTitle}>
              {currentRole === 'consultant' ? 'Available Queries' : 'My Queries'}
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
            ) : myQueries.length === 0 ? (
              <View style={styles.emptyState}>
                <MessageSquare size={48} color={colors.borderInput} />
                <Text style={styles.emptyTitle}>
                  {currentRole === 'consultant' ? 'No open queries' : 'No queries yet'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {currentRole === 'consultant' ? 'Check back later for client requests' : 'Float a query to get started'}
                </Text>
              </View>
            ) : (
              myQueries.map((q) => (
                <View key={q.id} style={styles.queryCard}>
                  <View style={styles.queryHeader}>
                    <View style={[styles.typeBadge, { backgroundColor: q.status === 'open' ? '#ECFDF5' : '#FEF2F2' }]}>
                      <Text style={[styles.typeBadgeText, { color: q.status === 'open' ? colors.success : colors.error }]}>
                        {q.assignment_type?.charAt(0).toUpperCase()}{q.assignment_type?.slice(1)}
                      </Text>
                    </View>
                    <View style={styles.statusRow}>
                      <Clock size={12} color={colors.textTertiary} />
                      <Text style={styles.timeText}>
                        {new Date(q.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.queryBrief} numberOfLines={3}>{q.assignment_brief}</Text>
                  {(q.budget_min || q.budget_max) && (
                    <Text style={styles.queryBudget}>
                      Budget: ₹{Number(q.budget_min).toLocaleString()} – ₹{Number(q.budget_max).toLocaleString()}
                    </Text>
                  )}
                  <View style={[styles.queryStatusBar, { backgroundColor: q.status === 'open' ? colors.success : colors.textSecondary }]}>
                    <Text style={styles.queryStatusText}>
                      {q.status === 'open' ? '● Open — awaiting responses' : '● Closed'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.screenBg },
  safe: { flex: 1 },
  container: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },

  screenTitle: {
    fontSize: fontSizes['2xl'], fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy, textAlign: 'center',
  },
  screenSubtitle: {
    fontSize: fontSizes.sm, color: colors.textSecondary, fontFamily: fonts.body, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.xl,
  },

  newQueryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radii.md, marginBottom: spacing.xl,
  },
  newQueryBtnText: { color: colors.textOnPrimary, fontSize: fontSizes.md, fontWeight: '700', fontFamily: fonts.heavy },

  // Form
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: radii.lg, padding: spacing.xl - 2,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl, ...shadows.card,
  },
  formHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  formTitle: { fontSize: fontSizes.lg, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textPrimary },
  formLabel: {
    fontSize: fontSizes.xs + 1, fontWeight: '600', fontFamily: fonts.medium, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.sm,
  },
  pickerBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.sectionBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  pickerText: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textPrimary },
  dropdownList: {
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, marginTop: spacing.xs, overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.sectionBg },
  dropdownText: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary },
  input: {
    backgroundColor: colors.sectionBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: fontSizes.sm + 1,
    fontFamily: fonts.body, color: colors.textPrimary,
  },
  textArea: {
    backgroundColor: colors.sectionBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md, padding: spacing.md, fontSize: fontSizes.sm + 1, fontFamily: fonts.body,
    color: colors.textPrimary, height: 80, textAlignVertical: 'top',
  },
  formActions: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
  resetBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.borderInput,
  },
  resetBtnText: { fontSize: fontSizes.sm + 1, fontWeight: '600', color: colors.textSecondary, fontFamily: fonts.medium },
  submitQueryBtn: {
    flex: 2, flexDirection: 'row', gap: 6, paddingVertical: spacing.md, borderRadius: radii.md,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success,
  },
  submitQueryBtnText: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textOnPrimary, fontFamily: fonts.heavy },

  // Section
  sectionTitle: {
    fontSize: fontSizes.md, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textPrimary, marginBottom: spacing.md,
  },

  emptyState: { alignItems: 'center', marginTop: spacing['4xl'], gap: spacing.sm },
  emptyTitle: { fontSize: fontSizes.lg, fontFamily: fonts.heavy, color: colors.textSecondary },
  emptySubtitle: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textTertiary },

  // Query Cards
  queryCard: {
    backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: '#E6E6E6',
    borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm,
  },
  queryHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: 10, paddingVertical: spacing.xs, borderRadius: radii.md,
  },
  typeBadgeText: { fontSize: fontSizes.xs + 1, fontWeight: '700', fontFamily: fonts.medium },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  timeText: { fontSize: fontSizes.xs, color: colors.textTertiary, fontFamily: fonts.medium },
  queryBrief: { fontSize: fontSizes.sm + 1, color: colors.textPrimary, fontFamily: fonts.body, lineHeight: 19, marginBottom: spacing.sm },
  queryBudget: { fontSize: fontSizes.xs + 1, color: colors.textSecondary, fontFamily: fonts.medium, marginBottom: spacing.sm },
  queryStatusBar: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.sm,
  },
  queryStatusText: { fontSize: fontSizes.xs, color: colors.textOnPrimary, fontWeight: '700', fontFamily: fonts.medium },
});
