/**
 * HireConsultantScreen  (Phase 6.2)
 * Figma: CLIENT_HIRE_CONSULTANT_SCREEN.png + V2
 * "Hire & Assign Project"
 * — Hire Role picker
 * — Select Creative Items picker (from SERVICE_ITEMS)
 * — Assignment Date, Budget, Brief
 * — Negotiation Details card (navy) with final cost + deadline
 * — T&C checkbox → Pay 60% Advance CTA
 * — Selected Consultant card at bottom
 * — Writes to projects table, then navigates to PaymentScreen (advance)
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, Calendar, CreditCard, Star, BadgeCheck } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing } from '../styles/theme';
import type { ConsultantProfile } from '../types';

const NAVY   = '#1B3A5C';
const ORANGE = '#E87B35';
const TEAL   = '#3D9B8F';
const BG     = '#F7F8FA';

const HIRE_ROLES = ['Hire Creative Consultant', 'Hire Photographer', 'Hire Designer', 'Hire Artisan'];

const CREATIVE_ITEMS: Record<string, string[]> = {
  'Hire Creative Consultant': ['Logo Design', 'Brand Identity', 'App Design', 'Poster Design', 'Brochure Design', 'UI/UX Design', 'Social Media Design'],
  'Hire Photographer':        ['Wedding Photography', 'Product Photography', 'Fashion Photography', 'Event Photography', 'Portrait Photography'],
  'Hire Designer':            ['Logo Design', 'Brand Identity', 'Brochure Design', 'Poster Design', 'Website Design', 'UI/UX Design'],
  'Hire Artisan':             ['Pottery', 'Terracotta Work', 'Weaving', 'Leather Craft', 'Wood Carving', 'Hand Embroidery'],
};

interface Props {
  navigation: any;
  route: { params?: { consultant?: ConsultantProfile } };
}

export default function HireConsultantScreen({ navigation, route }: Props) {
  const consultant = route?.params?.consultant;
  const profile    = useAuthStore(s => s.profile);

  const [role,       setRole]       = useState('Hire Creative Consultant');
  const [showRole,   setShowRole]   = useState(false);
  const [item,       setItem]       = useState('Logo Design');
  const [showItem,   setShowItem]   = useState(false);
  const [date,       setDate]       = useState('');
  const [budget,     setBudget]     = useState('5,000.00');
  const [brief,      setBrief]      = useState('');
  const [agreedTnC,  setAgreedTnC]  = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Negotiation section (derived from budget)
  const budgetNum    = parseFloat(budget.replace(/,/g, '')) || 5000;
  const finalCost    = Math.round(budgetNum * 1.30); // 30% negotiation buffer
  const advanceAmt   = Math.round(finalCost * 0.60);
  const suggestDate  = date || '15-09-2026';
  const daysLeft     = date
    ? Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
    : 15;

  const items = CREATIVE_ITEMS[role] ?? CREATIVE_ITEMS['Hire Creative Consultant'];

  async function handlePayAdvance() {
    if (!agreedTnC) {
      Alert.alert('Terms Required', 'Please agree to the Terms and Conditions.');
      return;
    }
    if (!brief.trim()) {
      Alert.alert('Brief Required', 'Please add your assignment brief.');
      return;
    }
    if (!profile?.id) return;

    setSubmitting(true);
    try {
      // Create the project record
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          client_id:         profile.id,
          consultant_id:     consultant?.user_id ?? null,
          assignment_type:   role,
          assignment_brief:  brief.trim(),
          assignment_details:[item],
          budget:            budgetNum,
          final_offer:       finalCost,
          deadline:          date ? new Date(date).toISOString() : null,
          status:            'draft',
          created_at:        new Date().toISOString(),
          updated_at:        new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to payment screen for 60% advance
      navigation.navigate('Payment', {
        project,
        paymentType: 'advance',
        amount: advanceAmt,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setRole('Hire Creative Consultant');
    setItem('Logo Design');
    setDate('');
    setBudget('5,000.00');
    setBrief('');
    setAgreedTnC(false);
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
        <Text style={s.heroTitle}>Hire &{'\n'}Assign Project</Text>
        <Text style={s.heroSub}>Create a professional assignment brief and secure the perfect talent for your creative vision.</Text>

        {/* ── Hire Role ── */}
        <Text style={s.fieldLabel}>HIRE ROLE</Text>
        <TouchableOpacity style={s.dropdown} onPress={() => { setShowRole(v => !v); setShowItem(false); }} activeOpacity={0.85}>
          <Text style={s.dropdownValue}>{role}</Text>
          <ChevronDown size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        {showRole && (
          <View style={s.dropdownList}>
            {HIRE_ROLES.map(r => (
              <TouchableOpacity key={r} style={[s.dropdownItem, r === role && s.dropdownItemActive]} onPress={() => { setRole(r); setItem(CREATIVE_ITEMS[r]?.[0] ?? ''); setShowRole(false); }} activeOpacity={0.8}>
                <Text style={[s.dropdownItemText, r === role && s.dropdownItemTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Creative Items ── */}
        <Text style={[s.fieldLabel, { marginTop: 14 }]}>SELECT CREATIVE ITEMS</Text>
        <TouchableOpacity style={s.dropdown} onPress={() => { setShowItem(v => !v); setShowRole(false); }} activeOpacity={0.85}>
          <Text style={s.dropdownValue}>{item}</Text>
          <ChevronDown size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        {showItem && (
          <View style={s.dropdownList}>
            {items.map(it => (
              <TouchableOpacity key={it} style={[s.dropdownItem, it === item && s.dropdownItemActive]} onPress={() => { setItem(it); setShowItem(false); }} activeOpacity={0.8}>
                <Text style={[s.dropdownItemText, it === item && s.dropdownItemTextActive]}>{it}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Assignment Date ── */}
        <Text style={[s.fieldLabel, { marginTop: 14 }]}>ASSIGNMENT DATE</Text>
        <View style={s.inputRow}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            placeholder="mm/dd/yyyy"
            placeholderTextColor={colors.textTertiary}
            value={date}
            onChangeText={setDate}
            keyboardType="numeric"
          />
          <Calendar size={20} color={colors.textSecondary} style={{ marginLeft: 12 }} />
        </View>

        {/* ── Budget ── */}
        <Text style={[s.fieldLabel, { marginTop: 14 }]}>ASSIGNMENT BUDGET ($)</Text>
        <View style={s.inputRow}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            placeholder="5,000.00"
            placeholderTextColor={colors.textTertiary}
            value={budget}
            onChangeText={setBudget}
            keyboardType="decimal-pad"
          />
          <CreditCard size={20} color={colors.textSecondary} style={{ marginLeft: 12 }} />
        </View>

        {/* ── Brief ── */}
        <Text style={[s.fieldLabel, { marginTop: 14 }]}>ASSIGNMENT BRIEF</Text>
        <TextInput
          style={s.textarea}
          placeholder={`"We are looking for a comprehensive visual identity that balances trust and innovation..."`}
          placeholderTextColor={colors.textTertiary}
          value={brief}
          onChangeText={setBrief}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        {/* ── Negotiation Card ── */}
        <View style={s.negotiationCard}>
          <View style={s.negBadge}>
            <Text style={s.negBadgeText}>Negotiation Details</Text>
          </View>
          <Text style={s.negCost}>Final Project Cost:- {finalCost.toLocaleString('en-IN')}.00</Text>
          <Text style={s.negDeadline}>
            Suggested Assignment Deadline:-{'\n'}{suggestDate} ({daysLeft} Days)
          </Text>
          <Text style={s.negTagline}>Hire with Confidence</Text>
        </View>

        {/* ── T&C ── */}
        <TouchableOpacity style={s.tncRow} onPress={() => setAgreedTnC(v => !v)} activeOpacity={0.8}>
          <View style={[s.checkbox, agreedTnC && s.checkboxChecked]}>
            {agreedTnC && <Text style={s.checkmark}>✓</Text>}
          </View>
          <Text style={s.tncText}>
            I agree to the <Text style={s.tncLink}>Terms and Condition</Text> for creative assignments.
          </Text>
        </TouchableOpacity>

        {/* ── Pay Advance CTA ── */}
        <TouchableOpacity
          style={[s.payBtn, (!agreedTnC || submitting) && { opacity: 0.6 }]}
          onPress={handlePayAdvance}
          disabled={!agreedTnC || submitting}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.payBtnText}>Pay 60% Advance</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={s.resetBtn} onPress={handleReset} activeOpacity={0.8}>
          <Text style={s.resetText}>Reset</Text>
        </TouchableOpacity>

        {/* ── Selected Consultant ── */}
        {consultant && (
          <View style={s.consultantSection}>
            <Text style={s.consultantSectionLabel}>SELECTED CONSULTANT</Text>
            <View style={s.consultantCard}>
              <View style={s.consultantLeft}>
                {consultant.avatar_url
                  ? <Image source={{ uri: consultant.avatar_url }} style={s.consultantAvatar} />
                  : <View style={[s.consultantAvatar, s.consultantAvatarFallback]}>
                      <Text style={s.consultantAvatarInit}>{consultant.display_name.charAt(0).toUpperCase()}</Text>
                    </View>
                }
                <View>
                  <Text style={s.consultantName}>{consultant.display_name}</Text>
                  <View style={s.consultantMeta}>
                    <Text style={s.consultantRole}>Creative Consultant</Text>
                    {consultant.is_approved && (
                      <>
                        <Text style={s.consultantDot}>•</Text>
                        <BadgeCheck size={12} color={TEAL} />
                        <Text style={s.consultantVerified}>Verified Pro</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
              <View style={s.ratingRow}>
                <Text style={s.ratingLabel}>Rating</Text>
                <Star size={14} color="#F59E0B" fill="#F59E0B" />
                <Text style={s.ratingValue}>4.9/5.0</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  tagline: { fontSize: 9, fontFamily: fonts.body, color: colors.textTertiary, letterSpacing: 0.5 },
  scroll: { paddingHorizontal: 20, paddingBottom: 50 },
  heroTitle: { fontSize: 38, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY, lineHeight: 44, marginTop: 14, marginBottom: 8 },
  heroSub: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20, marginBottom: 22 },
  fieldLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.8, marginBottom: 8 },
  // Dropdown
  dropdown: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.borderInput, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownValue: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary },
  dropdownList: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.borderInput, marginTop: 4, overflow: 'hidden', zIndex: 10 },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemActive: { backgroundColor: '#F0F4FF' },
  dropdownItemText: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary },
  dropdownItemTextActive: { fontWeight: '700', fontFamily: fonts.heavy, color: NAVY },
  // Inputs
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.borderInput, paddingHorizontal: 16, paddingVertical: 2 },
  input: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary, paddingVertical: 14 },
  textarea: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.borderInput, paddingHorizontal: 16, paddingVertical: 14, fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textPrimary, minHeight: 130, marginTop: 0 },
  // Negotiation card
  negotiationCard: { backgroundColor: NAVY, borderRadius: 16, padding: 20, marginTop: 20, marginBottom: 20 },
  negBadge: { backgroundColor: ORANGE, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 14 },
  negBadgeText: { color: '#fff', fontSize: fontSizes.sm, fontWeight: '700', fontFamily: fonts.heavy },
  negCost: { color: '#fff', fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, marginBottom: 10 },
  negDeadline: { color: 'rgba(255,255,255,0.85)', fontSize: fontSizes.base, fontFamily: fonts.medium, lineHeight: 22, marginBottom: 12 },
  negTagline: { color: '#fff', fontSize: fontSizes.xl + 4, fontWeight: '900', fontFamily: fonts.heavy },
  // T&C
  tncRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: NAVY, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: NAVY },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '900' },
  tncText: { flex: 1, fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20 },
  tncLink: { color: NAVY, fontWeight: '700', fontFamily: fonts.heavy, textDecorationLine: 'underline' },
  // CTAs
  payBtn: { backgroundColor: NAVY, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginBottom: 14 },
  payBtnText: { color: '#fff', fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy },
  resetBtn: { alignItems: 'center', paddingVertical: 12, marginBottom: 24 },
  resetText: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textSecondary },
  // Selected consultant
  consultantSection: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 20 },
  consultantSectionLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.8, marginBottom: 12 },
  consultantCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.borderCard, gap: 12 },
  consultantLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  consultantAvatar: { width: 52, height: 52, borderRadius: 26 },
  consultantAvatarFallback: { backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  consultantAvatarInit: { color: '#fff', fontSize: 18, fontWeight: '800', fontFamily: fonts.heavy },
  consultantName: { fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY },
  consultantMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  consultantRole: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary },
  consultantDot: { color: colors.textTertiary },
  consultantVerified: { fontSize: fontSizes.sm, fontWeight: '700', fontFamily: fonts.heavy, color: TEAL },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingLabel: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary },
  ratingValue: { fontSize: fontSizes.sm, fontWeight: '700', fontFamily: fonts.heavy, color: '#F59E0B' },
});
