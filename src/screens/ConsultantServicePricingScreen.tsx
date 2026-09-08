/**
 * CONSULTANT_SERVICE_PRICING_SCREEN  (Phase 5.2)
 * owner_role: CONSULTANT
 * Figma: CONSULTANT_SERVICE_PRICING_SCREEN.png
 * — Shows consultant's bio/experience blurb
 * — Category picker (Designer, Photographer, Sculptor, Artisan)
 * — Per-service-item fee editor (sourced from categories table)
 * — Submit / Save / Edit + T&C section
 * — Saves to consultant_service_pricing table
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import KeyboardAvoider from '../components/KeyboardAvoider';
import { ArrowLeft, ShieldCheck, ChevronDown, Send, Save, Edit3, Bell } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { fetchConsultantServicePricing, upsertConsultantServicePricing, updateConsultantProfile } from '../services/consultantService';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import { creativeItemsFor } from '../lib/assignment';
import { PRICE_UNITS, PRICE_UNIT_LABELS, toPriceUnit, type PriceUnit } from '../lib/booking';

const NAVY = '#1B3A5C';
const TEAL = '#3D9B8F';
const ORANGE = '#E87B35';
const BG = '#EDF1F5';

type Category = 'Designer' | 'Photographer' | 'Videographer' | 'Sculptor' | 'Artisan';
const CATEGORIES: Category[] = ['Designer', 'Photographer', 'Videographer', 'Sculptor', 'Artisan'];

// The catalogue moved to lib/assignment so the client-facing bid, book, hire
// and assign screens offer exactly what consultants can price here. Editing an
// item's wording orphans the consultant_service_pricing rows keyed to the old
// string, so change it in one place or not at all.

const CATEGORY_DB_VALUE: Record<Category, string> = {
  Designer: 'designer',
  Photographer: 'photographer',
  Videographer: 'videographer',
  Sculptor: 'sculptor',
  Artisan: 'artisan',
};

// Headline used to seed `expertise` — keep the keywords ('photo', 'video',
// 'design', 'art', 'craft') that Search matches against.
const CATEGORY_HEADLINE: Record<Category, string> = {
  Designer: 'Design',
  Photographer: 'Photography',
  Videographer: 'Videography',
  Sculptor: 'Sculpture & Art',
  Artisan: 'Traditional Craft',
};

export default function ConsultantServicePricingScreen({ navigation, route }: any) {
  const fromOnboarding = route?.params?.fromOnboarding === true;
  const insets = useSafeAreaInsets();
  const consultantProfile = useAuthStore(s => s.consultantProfile);
  const fetchConsultantProfile = useAuthStore(s => s.fetchConsultantProfile);

  const [category,   setCategory]   = useState<Category>('Designer');
  const [showCatDD,  setShowCatDD]  = useState(false);
  const [prices,     setPrices]     = useState<Record<string, string>>({});
  // One unit for every fee below, not one per service: a consultant who
  // charges by the day charges by the day for all of it.
  const [priceUnit,  setPriceUnit]  = useState<PriceUnit>('per_project');
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [mode,       setMode]       = useState<'view' | 'edit'>('edit');

  const services = creativeItemsFor(CATEGORY_DB_VALUE[category]);

  // Resume with the consultant's already-chosen category, if any.
  useEffect(() => {
    if (consultantProfile?.category) {
      const match = CATEGORIES.find(c => CATEGORY_DB_VALUE[c] === consultantProfile.category);
      if (match) setCategory(match);
    }
  }, [consultantProfile?.category]);

  useEffect(() => {
    setPriceUnit(toPriceUnit(consultantProfile?.price_unit));
  }, [consultantProfile?.price_unit]);

  useEffect(() => { fetchPricing(); }, [category]);

  async function fetchPricing() {
    if (!consultantProfile?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const map = await fetchConsultantServicePricing(consultantProfile.id, category);
      setPrices(map);
    } catch {}
    finally { setLoading(false); }
  }

  function setPrice(service: string, val: string) {
    setPrices(prev => ({ ...prev, [service]: val.replace(/[^0-9]/g, '') }));
  }

  async function handleSave(submit = false) {
    if (!consultantProfile?.id) return;
    setSaving(true);
    try {
      const upserts = services.map(svc => ({
        consultant_id: consultantProfile.id,
        category,
        service_name: svc,
        price: Number(prices[svc] ?? 0),
        is_submitted: submit,
      }));
      await upsertConsultantServicePricing(upserts);

      // The chosen category, a base price, and a searchable expertise/subtitle
      // string live on consultant_profiles itself — Explore/Search/CreatorProfile
      // read those columns directly rather than consultant_service_pricing.
      const pricedServices = services.filter(svc => Number(prices[svc] ?? 0) > 0);
      const basePrice = pricedServices.length ? Number(prices[pricedServices[0]]) : null;
      const expertise = [CATEGORY_HEADLINE[category], ...pricedServices.slice(0, 4)].join(', ');
      const subtitle = `${category} Consultant`;
      await updateConsultantProfile(consultantProfile.id, {
        category: CATEGORY_DB_VALUE[category], base_price: basePrice, expertise, subtitle,
        price_unit: priceUnit,
      });
      await fetchConsultantProfile();

      if (submit) {
        if (fromOnboarding) {
          navigation.navigate('ConsultantCategoryDetails', { fromOnboarding: true });
        } else {
          Alert.alert('Submitted ✅', 'Your consultancy fees have been submitted for review.');
          setMode('view');
        }
      } else {
        Alert.alert('Saved', 'Your fees have been saved as draft.');
      }
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  }

  const isEditable = mode === 'edit';

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

      <KeyboardAvoider>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.heroTitle}>{fromOnboarding ? 'Set Up\nConsultancy\nServices' : 'Update\nConsultancy\nServices'}</Text>
        {fromOnboarding ? (
          <Text style={s.stepHint}>Step 2 of 4 — choose your category and set your fees.</Text>
        ) : (
          <View style={{ marginBottom: 14 }} />
        )}

        {/* Experience blurb */}
        <Text style={s.sectionLabel}>CREATIVE EXPERIENCE —</Text>
        <View style={s.expCard}>
          <ShieldCheck size={16} color={TEAL} />
          <Text style={s.expText}>
            {consultantProfile?.display_name ?? 'Mr. Consultant'} — Senior Creative Consultant with{' '}
            {consultantProfile?.experience ?? '10+'} years in{' '}
            {consultantProfile?.expertise ?? 'Digital Branding and Strategic Design'}.
          </Text>
        </View>

        {/* Category picker */}
        <Text style={s.sectionLabel}>CREATIVE CONSULTANCY</Text>
        <View>
          <TouchableOpacity
            style={s.dropdownTrigger}
            onPress={() => setShowCatDD(v => !v)}
            activeOpacity={0.85}
          >
            <Text style={s.dropdownValue}>{category}</Text>
            <ChevronDown size={18} color={colors.textSecondary} style={{ transform: [{ rotate: showCatDD ? '180deg' : '0deg' }] }} />
          </TouchableOpacity>
          {showCatDD && (
            <View style={s.dropdown}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[s.dropdownItem, cat === category && s.dropdownItemActive]}
                  onPress={() => { setCategory(cat); setShowCatDD(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.dropdownItemText, cat === category && s.dropdownItemTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Rate basis. Without this a client saw "₹ 4,900" on the profile with
            no way to tell a day rate from a whole-project fee. */}
        <Text style={[s.sectionLabel, { marginTop: 20 }]}>MY FEES ARE QUOTED</Text>
        <View style={s.unitRow}>
          {PRICE_UNITS.map(unit => {
            const active = priceUnit === unit;
            return (
              <TouchableOpacity
                key={unit}
                style={[s.unitChip, active && s.unitChipActive, !isEditable && s.unitChipLocked]}
                onPress={() => setPriceUnit(unit)}
                disabled={!isEditable}
                activeOpacity={0.8}
              >
                <Text style={[s.unitChipText, active && s.unitChipTextActive]}>
                  {PRICE_UNIT_LABELS[unit]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={s.unitHint}>Shown to clients next to every price on your profile.</Text>

        {/* Service fee list */}
        <Text style={[s.sectionLabel, { marginTop: 20 }]}>CONSULTANCY FEES # CREATIVE ITEMS</Text>
        <View style={s.feeTable}>
          {loading ? (
            <ActivityIndicator size="small" color={TEAL} style={{ margin: 20 }} />
          ) : (
            services.map((svc, i) => (
              <View
                key={svc}
                style={[s.feeRow, i < services.length - 1 && s.feeRowBorder]}
              >
                <Text style={s.feeLabel}>{svc}</Text>
                <Text style={s.rupeeSymbol}>₹</Text>
                <TextInput
                  style={[s.feeInput, !isEditable && s.feeInputDisabled, Number(prices[svc] ?? 0) > 0 && s.feeInputFilled]}
                  value={prices[svc] ?? '0'}
                  onChangeText={v => setPrice(svc, v)}
                  keyboardType="numeric"
                  editable={isEditable}
                  selectTextOnFocus
                />
              </View>
            ))
          )}
        </View>

        {/* CTA buttons */}
        <TouchableOpacity
          style={[s.submitBtn, saving && { opacity: 0.6 }]}
          onPress={() => handleSave(true)}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Send size={16} color="#fff" /><Text style={s.submitBtnText}>{fromOnboarding ? 'Next' : 'Submit'}</Text></>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={s.saveBtn}
          onPress={() => handleSave(false)}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Save size={16} color={TEAL} />
          <Text style={s.saveBtnText}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.editBtn}
          onPress={() => setMode(m => m === 'edit' ? 'view' : 'edit')}
          activeOpacity={0.85}
        >
          <Edit3 size={16} color={colors.textSecondary} />
          <Text style={s.editBtnText}>{isEditable ? 'Lock Editing' : 'Edit'}</Text>
        </TouchableOpacity>

        {/* T&C section */}
        <View style={s.tncCard}>
          <Text style={s.tncTitle}>Consultant's Terms and{'\n'}Conditions :</Text>
          <TouchableOpacity onPress={() => navigation.navigate('EditConsultantProfile')} activeOpacity={0.7}>
            <Text style={s.tncEdit}>Edit</Text>
          </TouchableOpacity>
          {consultantProfile?.bio ? (
            <Text style={s.tncBody}>{consultantProfile.bio}</Text>
          ) : null}
        </View>

      </ScrollView>
      </KeyboardAvoider>
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
  sectionLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.8, marginBottom: 10 },
  // Experience
  expCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#F8F9FB', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  expText: { flex: 1, fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textPrimary, lineHeight: 20 },
  // Dropdown
  dropdownTrigger: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.borderInput, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownValue: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary },
  dropdown: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.borderInput, marginTop: 4, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 13 },
  dropdownItemActive: { backgroundColor: '#F0F2FF' },
  dropdownItemText: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary },
  dropdownItemTextActive: { fontWeight: '700', color: NAVY, fontFamily: fonts.heavy },
  // Rate basis
  unitRow: { flexDirection: 'row', gap: 8 },
  unitChip: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radii.full, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.borderInput },
  unitChipActive: { backgroundColor: NAVY, borderColor: NAVY },
  unitChipLocked: { opacity: 0.55 },
  unitChipText: { fontSize: fontSizes.sm + 1, fontFamily: fonts.medium, color: colors.textSecondary },
  unitChipTextActive: { color: '#fff', fontWeight: '700', fontFamily: fonts.heavy },
  unitHint: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 8 },
  // Fee table
  feeTable: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20, overflow: 'hidden' },
  feeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 8 },
  feeRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  feeLabel: { flex: 1, fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textPrimary, lineHeight: 18 },
  rupeeSymbol: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary },
  feeInput: { width: 80, textAlign: 'right', fontSize: fontSizes.base, fontFamily: fonts.medium, color: colors.textPrimary, backgroundColor: '#F8F9FB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 8 },
  feeInputDisabled: { backgroundColor: '#F3F4F6', color: colors.textTertiary },
  feeInputFilled: { borderColor: NAVY, color: NAVY, fontWeight: '700', fontFamily: fonts.heavy },
  // CTAs
  submitBtn: { backgroundColor: NAVY, borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
  submitBtnText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy },
  saveBtn: { backgroundColor: TEAL, borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
  saveBtnText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '800', fontFamily: fonts.heavy },
  editBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20, borderWidth: 1.5, borderColor: '#E5E7EB' },
  editBtnText: { color: colors.textSecondary, fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },
  // T&C
  tncCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 8, borderWidth: 1, borderColor: colors.borderCard },
  tncTitle: { fontSize: fontSizes.xl, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY, lineHeight: 28, marginBottom: 8 },
  tncEdit: { fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.heavy, color: ORANGE },
  tncBody: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20, marginTop: 10 },
});
