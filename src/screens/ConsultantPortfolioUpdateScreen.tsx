/**
 * ConsultantPortfolioUpdateScreen  (Phase 6.3)
 * Figma: CONSULTANT_PORTFOLIO_UPDATE_SCREEN.png
 * "Update Creative Portfolio"
 * — Max 5 portfolio artworks
 * — Upload slot (pick from gallery or camera)
 * — Per-artwork form: title, size, medium, price, available-for-sale toggle, brief
 * — Save / Edit buttons
 * — Submit Portfolio Update CTA
 * — Current Portfolio grid (3 columns) + slots remaining indicator
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, Switch, ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, Upload, X, Save, Edit3, Send, ChevronDown } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadToCloudinary } from '../lib/cloudinary';
import { useAuthStore } from '../store/useAuthStore';
import { fetchConsultantProducts, updateShopProduct, createShopProduct } from '../services/shopService';
import { syncConsultantPortfolioImages, approveConsultantProfile } from '../services/consultantService';
import { colors, fonts, fontSizes, spacing } from '../styles/theme';
import ImageCropModal, { CropVariants } from '../components/ImageCropModal';

const NAVY   = '#1B3A5C';
const ORANGE = '#E87B35';
const TEAL   = '#3D9B8F';
const BG     = '#F7F8FA';
const MAX_SLOTS = 5;

type SizeUnit = 'in' | 'cm';
const SIZE_UNITS: { key: SizeUnit; label: string }[] = [
  { key: 'in', label: 'inches' },
  { key: 'cm', label: 'cm' },
];

interface ArtworkSlot {
  id?: string;
  localCrops?: CropVariants;
  cloudCrops?: CropVariants;
  title: string;
  length: string;
  breadth: string;
  sizeUnit: SizeUnit;
  medium: string;
  price: string;
  availableForSale: boolean;
  description: string;
  uploaded: boolean;
  submitting: boolean;
}

function emptySlot(): ArtworkSlot {
  return { title: '', length: '', breadth: '', sizeUnit: 'in', medium: '', price: '', availableForSale: true, description: '', uploaded: false, submitting: false };
}

function formatSize(slot: ArtworkSlot): string | null {
  if (!slot.length.trim() || !slot.breadth.trim()) return null;
  const unitLabel = SIZE_UNITS.find(u => u.key === slot.sizeUnit)?.label ?? 'inches';
  return `${slot.length.trim()} × ${slot.breadth.trim()} ${unitLabel}`;
}

export default function ConsultantPortfolioUpdateScreen({ navigation, route }: any) {
  const fromOnboarding = route?.params?.fromOnboarding === true;
  const consultantProfile = useAuthStore(s => s.consultantProfile);
  const profile           = useAuthStore(s => s.profile);
  const fetchConsultantProfile = useAuthStore(s => s.fetchConsultantProfile);

  const [slots,   setSlots]   = useState<ArtworkSlot[]>([emptySlot()]);
  const [existing,setExisting]= useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode,    setMode]    = useState<'edit' | 'view'>('edit');

  // Raw picked photo awaiting a crop decision before it's attached to a slot.
  const [cropSourceUri, setCropSourceUri] = useState<string | null>(null);
  const [cropTargetIdx, setCropTargetIdx] = useState<number | null>(null);

  // Which slot's size-unit dropdown is currently open (only one at a time).
  const [openUnitDropdownIdx, setOpenUnitDropdownIdx] = useState<number | null>(null);

  const activeSlotIdx = slots.length - 1;

  useEffect(() => { fetchExisting(); }, []);

  async function fetchExisting() {
    if (!consultantProfile?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await fetchConsultantProducts(consultantProfile.id, MAX_SLOTS);
      setExisting(data);
    } catch {}
    finally { setLoading(false); }
  }

  function updateSlot(idx: number, patch: Partial<ArtworkSlot>) {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }

  async function pickImage(idx: number) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission required', 'Please allow media library access.'); return; }
    // No allowsEditing/aspect here — the consultant picks their own crop
    // shape and framing in ImageCropModal instead of a forced auto-crop.
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled && result.assets[0]) {
      setCropSourceUri(result.assets[0].uri);
      setCropTargetIdx(idx);
    }
  }

  function handleCropConfirm(crops: CropVariants) {
    if (cropTargetIdx !== null) {
      updateSlot(cropTargetIdx, { localCrops: crops, uploaded: false });
    }
    setCropSourceUri(null);
    setCropTargetIdx(null);
  }

  function handleCropCancel() {
    setCropSourceUri(null);
    setCropTargetIdx(null);
  }

  async function handleSave(idx: number) {
    const slot = slots[idx];
    if (!slot.title.trim()) { Alert.alert('Required', 'Please enter an artwork title.'); return; }
    if (!consultantProfile?.id) return;

    updateSlot(idx, { submitting: true });
    try {
      let cloudCrops = slot.cloudCrops;
      if (slot.localCrops && !slot.uploaded) {
        const [square, card, banner] = await Promise.all([
          uploadToCloudinary(slot.localCrops.square, 'portfolio'),
          uploadToCloudinary(slot.localCrops.card, 'portfolio'),
          uploadToCloudinary(slot.localCrops.banner, 'portfolio'),
        ]);
        cloudCrops = { square, card, banner };
        updateSlot(idx, { cloudCrops, uploaded: true });
      }

      const payload = {
        consultant_id:  consultantProfile.id,
        title:          slot.title.trim(),
        size:           formatSize(slot),
        medium:         slot.medium.trim() || null,
        price:          parseFloat(slot.price.replace(/,/g, '')) || 0,
        available:      slot.availableForSale,
        description:    slot.description.trim() || null,
        images:         cloudCrops ? [cloudCrops.square] : [],
        image_variants: cloudCrops ?? null,
        updated_at:     new Date().toISOString(),
      };

      if (slot.id) {
        await updateShopProduct(slot.id, payload);
      } else {
        const data = await createShopProduct(payload);
        updateSlot(idx, { id: data.id });
      }

      Alert.alert('Saved ✅', 'Artwork saved to portfolio.');
      fetchExisting();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { updateSlot(idx, { submitting: false }); }
  }

  // Client-facing screens (Explore, Search, CreatorProfile, FeaturedCreatorCard)
  // read portfolio thumbnails straight off consultant_profiles, not
  // shop_products — keep the two in sync after every save. The square crop
  // of every artwork feeds the grid/carousel; the card/banner crops of just
  // the most recent artwork feed the dashboard featured-card and explore
  // banner respectively.
  async function syncProfilePortfolioImages() {
    if (!consultantProfile?.id) return;
    await syncConsultantPortfolioImages(consultantProfile.id, MAX_SLOTS);
  }

  async function handleSubmitAll() {
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].title.trim()) await handleSave(i);
    }
    await syncProfilePortfolioImages();

    if (fromOnboarding && consultantProfile?.id) {
      await approveConsultantProfile(consultantProfile.id);
      await fetchConsultantProfile();
      Alert.alert(
        'Profile Submitted 🎉',
        'Your consultant profile is complete and pending admin approval. You can start exploring the consultant dashboard.',
        [{ text: 'Continue', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Dashboard' } }] }) }]
      );
    } else {
      await fetchConsultantProfile();
      Alert.alert('Portfolio Updated ✅', 'Your portfolio has been submitted for review.');
      navigation.goBack();
    }
  }

  function addSlot() {
    if (slots.length + existing.length >= MAX_SLOTS) {
      Alert.alert('Limit reached', `Maximum ${MAX_SLOTS} portfolio items allowed.`);
      return;
    }
    setSlots(prev => [...prev, emptySlot()]);
  }

  const slotsRemaining = MAX_SLOTS - existing.length - slots.length;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={18} color={NAVY} />
        </TouchableOpacity>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.7}>
            <Bell size={18} color={NAVY} />
          </TouchableOpacity>
          {profile?.avatar_url
            ? <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
            : <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarInit}>{(profile?.name ?? 'A').charAt(0).toUpperCase()}</Text>
              </View>
          }
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.heroTitle}>{fromOnboarding ? 'Build Your\nCreative\nPortfolio' : 'Update\nCreative\nPortfolio'}</Text>
        {fromOnboarding && <Text style={s.stepHint}>Step 4 of 4 — the last step before your profile goes live.</Text>}
        <Text style={s.heroSub}>
          Upload your original five Artworks/ Craftworks/ Photographs to showcase your unique style and attract high-tier clients.
        </Text>
        <Text style={s.maxHint}>Max file size: 2MB per upload.</Text>

        {/* ── New slot form(s) ── */}
        {slots.map((slot, idx) => (
          <View key={idx} style={s.slotCard}>
            {/* Slot header */}
            <TouchableOpacity style={s.slotHeader} onPress={addSlot} activeOpacity={0.85}>
              <Text style={s.slotHeaderText}>
                Add New Artwork {existing.length + idx + 1}/{MAX_SLOTS}
              </Text>
            </TouchableOpacity>

            {/* Upload zone */}
            <TouchableOpacity style={s.uploadZone} onPress={() => pickImage(idx)} activeOpacity={0.85}>
              {slot.localCrops ? (
                <Image source={{ uri: slot.localCrops.square }} style={s.uploadPreview} />
              ) : (
                <>
                  <Upload size={32} color={TEAL} />
                  <Text style={s.uploadLabel}>Upload Artwork</Text>
                  <Text style={s.uploadHint}>Drag & drop or click to browse</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Form fields */}
            <Text style={s.fieldLabel}>ARTWORK TITLE</Text>
            <TextInput style={s.input} placeholder="e.g. Ethereal Drift" placeholderTextColor={colors.textTertiary} value={slot.title} onChangeText={v => updateSlot(idx, { title: v })} editable={mode === 'edit'} />

            <Text style={s.fieldLabel}>SIZE</Text>
            <View style={s.sizeRow}>
              <TextInput
                style={[s.input, s.sizeInput]}
                placeholder="Length"
                placeholderTextColor={colors.textTertiary}
                value={slot.length}
                onChangeText={v => updateSlot(idx, { length: v.replace(/[^0-9.]/g, '') })}
                keyboardType="decimal-pad"
                editable={mode === 'edit'}
              />
              <Text style={s.sizeTimes}>×</Text>
              <TextInput
                style={[s.input, s.sizeInput]}
                placeholder="Breadth"
                placeholderTextColor={colors.textTertiary}
                value={slot.breadth}
                onChangeText={v => updateSlot(idx, { breadth: v.replace(/[^0-9.]/g, '') })}
                keyboardType="decimal-pad"
                editable={mode === 'edit'}
              />
              <View style={s.unitDropdownWrap}>
                <TouchableOpacity
                  style={s.unitTrigger}
                  onPress={() => mode === 'edit' && setOpenUnitDropdownIdx(openUnitDropdownIdx === idx ? null : idx)}
                  activeOpacity={0.85}
                  disabled={mode !== 'edit'}
                >
                  <Text style={s.unitTriggerText}>{SIZE_UNITS.find(u => u.key === slot.sizeUnit)?.label}</Text>
                  <ChevronDown size={14} color={NAVY} style={{ transform: [{ rotate: openUnitDropdownIdx === idx ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>
                {openUnitDropdownIdx === idx && (
                  <View style={s.unitDropdownList}>
                    {SIZE_UNITS.map(u => (
                      <TouchableOpacity
                        key={u.key}
                        style={s.unitDropdownItem}
                        onPress={() => { updateSlot(idx, { sizeUnit: u.key }); setOpenUnitDropdownIdx(null); }}
                        activeOpacity={0.8}
                      >
                        <Text style={[s.unitDropdownItemText, u.key === slot.sizeUnit && s.unitDropdownItemTextActive]}>{u.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <Text style={s.fieldLabel}>MEDIUM</Text>
            <TextInput style={s.input} placeholder="e.g. Oil on Canvas" placeholderTextColor={colors.textTertiary} value={slot.medium} onChangeText={v => updateSlot(idx, { medium: v })} editable={mode === 'edit'} />

            <Text style={s.fieldLabel}>PRICE</Text>
            <TextInput style={s.input} placeholder="₹ 1,200.00" placeholderTextColor={colors.textTertiary} value={slot.price} onChangeText={v => updateSlot(idx, { price: v })} keyboardType="decimal-pad" editable={mode === 'edit'} />

            {/* Available for sale toggle */}
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Available for sale</Text>
              <Switch
                value={slot.availableForSale}
                onValueChange={v => updateSlot(idx, { availableForSale: v })}
                thumbColor="#fff"
                trackColor={{ true: TEAL, false: '#CBD5E1' }}
                disabled={mode !== 'edit'}
              />
            </View>

            <Text style={s.fieldLabel}>DESCRIPTION</Text>
            <TextInput
              style={s.textarea}
              placeholder="Describe this artwork — materials, inspiration, dimensions of detail buyers should know"
              placeholderTextColor={colors.textTertiary}
              value={slot.description}
              onChangeText={v => updateSlot(idx, { description: v })}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={mode === 'edit'}
            />

            {/* Save / Edit */}
            <View style={s.slotBtnRow}>
              <TouchableOpacity
                style={[s.saveBtn, slot.submitting && { opacity: 0.6 }]}
                onPress={() => handleSave(idx)}
                disabled={slot.submitting}
                activeOpacity={0.85}
              >
                {slot.submitting ? <ActivityIndicator color="#fff" size="small" /> : <><Save size={14} color="#fff" /><Text style={s.saveBtnText}>Save</Text></>}
              </TouchableOpacity>
              <TouchableOpacity
                style={s.editBtn}
                onPress={() => setMode(m => m === 'edit' ? 'view' : 'edit')}
                activeOpacity={0.85}
              >
                <Edit3 size={14} color={NAVY} />
                <Text style={s.editBtnText}>{mode === 'edit' ? 'Lock' : 'Edit'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* ── Submit All ── */}
        <TouchableOpacity style={s.submitBtn} onPress={handleSubmitAll} activeOpacity={0.85}>
          <Send size={16} color="#fff" />
          <Text style={s.submitBtnText}>{fromOnboarding ? 'Finish & Go Live' : 'Submit Portfolio Update'}</Text>
        </TouchableOpacity>

        {/* ── Current Portfolio ── */}
        <Text style={s.currentLabel}>Current Portfolio ({existing.length}/{MAX_SLOTS})</Text>
        {loading ? (
          <ActivityIndicator size="small" color={TEAL} />
        ) : (
          <>
            <View style={s.portfolioGrid}>
              {existing.map(art => (
                <TouchableOpacity key={art.id} style={s.portfolioCell} activeOpacity={0.85}>
                  {art.images?.[0]
                    ? <Image source={{ uri: art.images[0] }} style={s.portfolioImg} />
                    : <View style={[s.portfolioImg, s.portfolioImgPlaceholder]}>
                        <Text style={s.portfolioImgText}>{art.title?.charAt(0) ?? 'A'}</Text>
                      </View>
                  }
                  <Text style={s.portfolioItemTitle} numberOfLines={1}>{art.title}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {slotsRemaining > 0 && (
              <View style={s.slotsRemaining}>
                <Text style={s.slotsRemainingText}>{slotsRemaining} SLOT{slotsRemaining !== 1 ? 'S' : ''} REMAINING</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <ImageCropModal
        visible={cropTargetIdx !== null}
        imageUri={cropSourceUri}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: { backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  avatarInit: { color: '#fff', fontSize: 14, fontWeight: '800', fontFamily: fonts.heavy },
  scroll: { paddingHorizontal: 20, paddingBottom: 50 },
  heroTitle: { fontSize: 36, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY, lineHeight: 42, marginTop: 10, marginBottom: 6 },
  stepHint: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20, marginBottom: 8 },
  heroSub: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20, marginBottom: 4 },
  maxHint: { fontSize: fontSizes.sm, fontWeight: '700', fontFamily: fonts.heavy, color: ORANGE, marginBottom: 20 },
  // Slot card
  slotCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20, overflow: 'hidden' },
  slotHeader: { backgroundColor: NAVY, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 14, margin: 12 },
  slotHeaderText: { color: '#fff', fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, textAlign: 'center' },
  uploadZone: { margin: 12, borderWidth: 2, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 32, alignItems: 'center', gap: 8, backgroundColor: '#FAFBFF' },
  uploadPreview: { width: '100%', height: 160, borderRadius: 10 },
  uploadLabel: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY, marginTop: 8 },
  uploadHint: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textTertiary },
  fieldLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.8, marginBottom: 6, marginTop: 12, paddingHorizontal: 12 },
  input: { backgroundColor: '#F8F9FB', borderRadius: 10, borderWidth: 1, borderColor: colors.borderInput, paddingHorizontal: 14, paddingVertical: 12, fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary, marginHorizontal: 12 },

  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 12 },
  sizeInput: { flex: 1, marginHorizontal: 0 },
  sizeTimes: { fontSize: fontSizes.base, fontFamily: fonts.medium, color: colors.textTertiary },
  unitDropdownWrap: { position: 'relative' },
  unitTrigger: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8F9FB', borderRadius: 10, borderWidth: 1, borderColor: colors.borderInput, paddingHorizontal: 10, paddingVertical: 12 },
  unitTriggerText: { fontSize: fontSizes.sm + 1, fontFamily: fonts.medium, color: NAVY },
  unitDropdownList: { position: 'absolute', top: 48, right: 0, minWidth: 90, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: colors.borderInput, overflow: 'hidden', zIndex: 10, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 }, android: { elevation: 4 } }) },
  unitDropdownItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  unitDropdownItemText: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textPrimary },
  unitDropdownItemTextActive: { fontFamily: fonts.heavy, color: NAVY, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12 },
  toggleLabel: { fontSize: fontSizes.base, fontFamily: fonts.heavy, color: TEAL, fontWeight: '700' },
  textarea: { backgroundColor: '#F8F9FB', borderRadius: 10, borderWidth: 1, borderColor: colors.borderInput, paddingHorizontal: 14, paddingVertical: 12, fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textPrimary, minHeight: 80, marginHorizontal: 12, marginBottom: 12 },
  slotBtnRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingBottom: 14 },
  saveBtn: { flex: 1, backgroundColor: NAVY, borderRadius: 10, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText: { color: '#fff', fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },
  editBtn: { flex: 1, borderRadius: 10, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: NAVY },
  editBtnText: { color: NAVY, fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },
  // Submit
  submitBtn: { backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 22 },
  submitBtnText: { color: '#fff', fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy },
  // Current portfolio
  currentLabel: { fontSize: fontSizes.xl, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY, marginBottom: 14 },
  portfolioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  portfolioCell: { width: '30%' },
  portfolioImg: { width: '100%', aspectRatio: 1, borderRadius: 10 },
  portfolioImgPlaceholder: { backgroundColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  portfolioImgText: { fontSize: 24, fontWeight: '900', fontFamily: fonts.heavy, color: '#fff' },
  portfolioItemTitle: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textSecondary, marginTop: 4 },
  slotsRemaining: { borderWidth: 1.5, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 10, paddingVertical: 20, alignItems: 'center' },
  slotsRemainingText: { fontSize: fontSizes.sm, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.6 },
});
