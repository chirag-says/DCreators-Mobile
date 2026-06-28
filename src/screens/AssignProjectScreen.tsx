/**
 * CLIENT_ASSIGN_PROJECT_SCREEN
 *
 * owner_role: CLIENT
 * previous_screen: CLIENT_DISCOVER_CONSULTANTS_SCREEN (direct hire) | CLIENT_HOME (bidding)
 * next_screen: CLIENT_CONSULTANT_MATCHING_SCREEN (bidding) | CONSULTANT_NEGOTIATION_SCREEN (direct hire)
 * workflow_stage: DRAFT → ASSIGNED
 *
 * Two entry paths:
 *  A) Bidding  — no consultant pre-selected. route.params?.consultant = undefined
 *  B) Direct   — consultant passed via route.params.consultant (from CreatorProfileScreen)
 *
 * Figma: CLIENT_ASSIGN_PROJECT_SCREEN.png
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, Calendar, DollarSign, ArrowLeft } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';

// ─── Figma design tokens ──────────────────────────────────────
const NAVY = '#1B3A5C';
const TEAL = '#0D7F7A';
const ORANGE = '#E87B35';
const ORANGE_LIGHT = '#FFF5ED';
const BG = '#F5F6FA';

// ─── Creative Items per Figma CONSULTANT_SERVICE_PRICING_SCREEN ─
const HIRE_ROLES = [
  'Hire Creative Consultant',
  'Hire Photographer',
  'Hire Videographer',
  'Hire Designer',
  'Hire Sculptor',
  'Hire Artisan',
];

const CREATIVE_ITEMS = [
  'Academic Event Photography',
  'Accessories & Jewelleries',
  'App Design',
  'Architectural Photography',
  'Birthday Photography',
  'Brand Identity',
  'Logo Design',
  'Social Media Kit',
  'Packaging Design',
  'Illustration',
  'UI/UX Design',
  'Product Photography',
  'Corporate Photography',
  'Art Direction',
  'Video Production',
];

export default function AssignProjectScreen({ navigation, route }: any) {
  // Direct hire path passes a consultant; bidding path does not
  const consultant = route?.params?.consultant ?? null;
  const profile = useAuthStore((s) => s.profile);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);

  // Form state — pre-populate budget from consultant base price on direct hire
  const [hireRole, setHireRole] = useState(HIRE_ROLES[0]);
  const [creativeItem, setCreativeItem] = useState(CREATIVE_ITEMS[6]); // default: Logo Design
  const [deadline, setDeadline] = useState('');
  const [budget, setBudget] = useState(
    consultant?.base_price ? String(consultant.base_price) : '',
  );
  const [brief, setBrief] = useState('');

  // Dropdown open states
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  const budgetNum = parseFloat(budget) || 0;

  // Suggested deadline: 15 days from assignment date
  const suggestedDeadline = useMemo(() => {
    if (!deadline.trim()) return null;
    try {
      const d = new Date(deadline);
      if (isNaN(d.getTime())) return null;
      d.setDate(d.getDate() + 15);
      return `${d.toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })} (15 Days)`;
    } catch {
      return null;
    }
  }, [deadline]);

  const canSubmit =
    brief.trim().length > 10 &&
    budgetNum > 0 &&
    agreedTerms;

  // ── BUILD PROJECT PAYLOAD ─────────────────────────────────────
  function buildProjectPayload(status: 'draft' | 'assigned') {
    const payload: Record<string, unknown> = {
      client_id: profile?.id,
      assignment_type: hireRole,
      assignment_details: [creativeItem],
      assignment_brief: brief.trim(),
      budget: budgetNum,
      status,
      progress_percent: 0,
      work_order_data: null,
      final_offer: null,
    };
    if (deadline.trim()) {
      payload.deadline = deadline.trim();
    }
    // Direct hire: attach consultant immediately → status = 'assigned'
    if (consultant?.user_id) {
      payload.consultant_id = consultant.user_id;
    }
    return payload;
  }

  // ── SUBMIT ASSIGNMENT (bidding → ConsultantMatching | direct hire → Negotiation) ──
  async function handleSubmit() {
    if (!canSubmit) {
      Alert.alert('Missing Info', 'Fill all required fields and agree to Terms.');
      return;
    }
    if (!profile?.id) {
      Alert.alert('Error', 'You must be logged in.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Bidding path: consultant_id is null, status = 'draft' → matching screen picks consultant
      // Direct hire: consultant_id set, status = 'assigned' → skip matching
      const status = consultant ? 'assigned' : 'draft';
      const payload = buildProjectPayload(status);

      const { data, error } = await supabase
        .from('projects')
        .insert(payload)
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

      if (consultant) {
        // DIRECT HIRE: go to the unified Project Dashboard with assigned status
        navigation.navigate('Main', { screen: 'CreatorWorkorder', params: { project: data } });
      } else {
        // BIDDING PATH: go to CLIENT_CONSULTANT_MATCHING_SCREEN
        navigation.navigate('ConsultantMatching', { project: data });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── SAVE DRAFT ────────────────────────────────────────────────
  async function handleSaveDraft() {
    if (!brief.trim() || budgetNum <= 0) {
      Alert.alert('Save Draft', 'Add a brief and budget before saving.');
      return;
    }
    if (!profile?.id) return;

    setIsSaving(true);
    try {
      const payload = buildProjectPayload('draft');
      const { error } = await supabase.from('projects').insert(payload);
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      Alert.alert('Saved', 'Draft saved. You can return to it from your dashboard.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    setHireRole(HIRE_ROLES[0]);
    setCreativeItem(CREATIVE_ITEMS[6]);
    setDeadline('');
    setBudget('');
    setBrief('');
    setAgreedTerms(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ───────────────────────────── */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color={NAVY} />
            </TouchableOpacity>
            <Image
              source={{ uri: RemoteAssets.dIcon }}
              style={styles.dIcon}
              resizeMode="contain"
            />
            <Text style={styles.headerTagline}>HIRE CREATIVES. BUY ART. BUILD IDEAS</Text>
          </View>

          {/* ── Title ────────────────────────────── */}
          <Text style={styles.title}>Hire & Assign{'\n'}Project</Text>
          <Text style={styles.subtitle}>
            Create a professional assignment brief and secure the perfect talent for your
            creative vision.
          </Text>

          {/* ── Direct hire: selected consultant chip ── */}
          {consultant && (
            <View style={styles.selectedConsultantChip}>
              {consultant.avatar_url ? (
                <Image source={{ uri: consultant.avatar_url }} style={styles.chipAvatar} />
              ) : (
                <View style={styles.chipAvatarPlaceholder}>
                  <Text style={styles.chipInitial}>
                    {(consultant.name || 'C').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View>
                <Text style={styles.chipName}>{consultant.name || 'Consultant'}</Text>
                <Text style={styles.chipCode}>Code: {consultant.code}</Text>
              </View>
              <View style={styles.chipBadge}>
                <Text style={styles.chipBadgeText}>DIRECT HIRE</Text>
              </View>
            </View>
          )}

          {/* ── Form Card ────────────────────────── */}
          <View style={styles.formCard}>

            {/* HIRE ROLE */}
            <View>
              <Text style={styles.fieldLabel}>HIRE ROLE</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => {
                  setShowRoleDropdown(!showRoleDropdown);
                  setShowItemDropdown(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownValue}>{hireRole}</Text>
                <ChevronDown size={18} color={colors.textTertiary} />
              </TouchableOpacity>
              {showRoleDropdown && (
                <View style={styles.dropdownList}>
                  {HIRE_ROLES.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={styles.dropdownItem}
                      onPress={() => { setHireRole(r); setShowRoleDropdown(false); }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        hireRole === r && { color: NAVY, fontWeight: '700' },
                      ]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* SELECT CREATIVE ITEMS */}
            <View>
              <Text style={styles.fieldLabel}>SELECT CREATIVE ITEMS</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => {
                  setShowItemDropdown(!showItemDropdown);
                  setShowRoleDropdown(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownValue}>{creativeItem}</Text>
                <ChevronDown size={18} color={colors.textTertiary} />
              </TouchableOpacity>
              {showItemDropdown && (
                <View style={styles.dropdownList}>
                  {CREATIVE_ITEMS.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.dropdownItem}
                      onPress={() => { setCreativeItem(item); setShowItemDropdown(false); }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        creativeItem === item && { color: NAVY, fontWeight: '700' },
                      ]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* ASSIGNMENT DATE */}
            <View>
              <Text style={styles.fieldLabel}>ASSIGNMENT DATE</Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0, padding: 0 }]}
                  placeholder="mm/dd/yyyy"
                  placeholderTextColor={colors.textTertiary}
                  value={deadline}
                  onChangeText={setDeadline}
                />
                <Calendar size={18} color={colors.textTertiary} />
              </View>
            </View>

            {/* ASSIGNMENT BUDGET */}
            <View>
              <Text style={styles.fieldLabel}>ASSIGNMENT BUDGET (₹)</Text>
              <View style={styles.inputWithIcon}>
                <DollarSign size={16} color={colors.textTertiary} style={{ marginRight: 4 }} />
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0, padding: 0 }]}
                  placeholder="5,000.00"
                  placeholderTextColor={colors.textTertiary}
                  value={budget}
                  onChangeText={setBudget}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* ASSIGNMENT BRIEF */}
            <View>
              <Text style={styles.fieldLabel}>ASSIGNMENT BRIEF</Text>
              <TextInput
                style={[styles.input, styles.briefInput]}
                placeholder={`"We are looking for a comprehensive visual identity that balances trust and innovation. The scope includes a primary logo, secondary marks, a 20-page brand guidelines document, and 5 initial social media templates."`}
                placeholderTextColor={colors.textTertiary}
                value={brief}
                onChangeText={setBrief}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* ── Negotiation Preview Card (appears when budget set) ── */}
          {budgetNum > 0 && (
            <View style={styles.negotiationCard}>
              <View style={styles.negotiationBadge}>
                <Text style={styles.negotiationBadgeText}>Negotiation Details</Text>
              </View>
              <Text style={styles.negotiationCost}>
                Final Project Cost:- ₹{budgetNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.negotiationDeadline}>
                Suggested Assignment Deadline:{'\n'}
                {suggestedDeadline || 'Set date above'}
              </Text>
              <Text style={styles.negotiationTagline}>Hire with Confidence</Text>
            </View>
          )}

          {/* ── Terms Checkbox ───────────────────── */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAgreedTerms(!agreedTerms)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, agreedTerms && styles.checkboxChecked]}>
              {agreedTerms && (
                <View style={styles.checkmark} />
              )}
            </View>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink}>Terms and Condition</Text>
              {' '}for creative assignments.
            </Text>
          </TouchableOpacity>

          {/* ── Action Buttons ───────────────────── */}
          <View style={styles.buttonRow}>
            {/* Submit Assignment (primary — navy) */}
            <TouchableOpacity
              style={[styles.submitBtn, (!canSubmit || isSubmitting) && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Submit{'\n'}Assignment</Text>
              )}
            </TouchableOpacity>

            {/* Save Draft (secondary — outlined) */}
            <TouchableOpacity
              style={[styles.draftBtn, isSaving && { opacity: 0.5 }]}
              onPress={handleSaveDraft}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator color={NAVY} size="small" />
              ) : (
                <Text style={styles.draftBtnText}>Save{'\n'}Draft</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Reset ────────────────────────────── */}
          <TouchableOpacity onPress={handleReset} style={styles.resetBtn} activeOpacity={0.7}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
  },

  // ── Header ─────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  dIcon: { width: 32, height: 32 },
  headerTagline: {
    flex: 1,
    fontSize: 9,
    fontFamily: fonts.medium,
    color: colors.textTertiary,
    letterSpacing: 1.0,
  },

  // ── Title ──────────────────────────────────────────────────
  title: {
    fontSize: 34,
    fontWeight: '800',
    fontFamily: fonts.heavy,
    color: NAVY,
    lineHeight: 40,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },

  // ── Direct hire chip ───────────────────────────────────────
  selectedConsultantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: TEAL,
    ...Platform.select({
      ios: { shadowColor: TEAL, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  chipAvatar: { width: 40, height: 40, borderRadius: 20 },
  chipAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInitial: { fontSize: 16, fontWeight: '700', color: TEAL },
  chipName: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  chipCode: { fontSize: fontSizes.xs, fontFamily: fonts.body, color: colors.textSecondary },
  chipBadge: {
    marginLeft: 'auto',
    backgroundColor: TEAL,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  // ── Form Card ──────────────────────────────────────────────
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    backgroundColor: '#fff',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: '#fff',
  },
  briefInput: {
    minHeight: 140,
    paddingTop: 14,
    lineHeight: 22,
  },

  // ── Dropdowns ──────────────────────────────────────────────
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: '#fff',
  },
  dropdownValue: {
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textPrimary,
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderTopWidth: 0,
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: radii.md,
    backgroundColor: '#fff',
    marginTop: -4,
    maxHeight: 220,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  dropdownItemText: {
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textPrimary,
  },

  // ── Negotiation Card ───────────────────────────────────────
  negotiationCard: {
    backgroundColor: ORANGE_LIGHT,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: ORANGE,
  },
  negotiationBadge: {
    backgroundColor: ORANGE,
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 12,
  },
  negotiationBadgeText: {
    color: '#fff',
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontFamily: fonts.heavy,
  },
  negotiationCost: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    color: NAVY,
    marginBottom: 8,
  },
  negotiationDeadline: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    color: NAVY,
    lineHeight: 22,
    marginBottom: 8,
  },
  negotiationTagline: {
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // ── Terms ──────────────────────────────────────────────────
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.borderInput,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  checkmark: {
    width: 10,
    height: 6,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
    marginTop: -2,
  },
  termsText: {
    flex: 1,
    fontSize: fontSizes.base,
    fontFamily: fonts.body,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  termsLink: {
    color: NAVY,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // ── Buttons ────────────────────────────────────────────────
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: NAVY,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: fontSizes.base,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  draftBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: NAVY,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
    backgroundColor: '#fff',
  },
  draftBtnText: {
    color: NAVY,
    fontSize: fontSizes.base,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    textAlign: 'center',
  },

  // ── Reset ──────────────────────────────────────────────────
  resetBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resetText: {
    fontSize: fontSizes.base,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
});
