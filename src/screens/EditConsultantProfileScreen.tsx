import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Platform,
  ScrollView, Image, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopHeader from '../components/TopHeader';
import { ChevronDown, ChevronRight, Camera, Square, CheckSquare, X, ImagePlus, Save, ArrowLeft } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';


const CATEGORIES = [
  'Photography', 'Videography', 'Design', 'Painting',
  'Sculpture', 'Traditional Craft', 'Illustration',
];

const EXPERIENCE_OPTIONS = ['1-3 years', '3-5 years', '5-10 years', '10+ years'];

export default function EditConsultantProfileScreen({ navigation }: any) {
  const { consultantProfile, profile, fetchConsultantProfile } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [showExpDropdown, setShowExpDropdown] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Editable fields — pre-filled from existing profile
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [academicDegree, setAcademicDegree] = useState('');
  const [institution, setInstitution] = useState('');
  const [selectedExperience, setSelectedExperience] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [basePrice, setBasePrice] = useState('');
  const [bio, setBio] = useState('');
  const [portfolioImages, setPortfolioImages] = useState<string[]>(['', '', '', '', '']);

  // Pre-fill from existing profile
  useEffect(() => {
    if (consultantProfile) {
      setDisplayName(consultantProfile.display_name || '');
      setProfileImage(consultantProfile.avatar_url || null);
      setBasePrice(consultantProfile.base_price ? String(consultantProfile.base_price) : '');
      setBio(consultantProfile.bio || '');
      setSelectedExperience(consultantProfile.experience || '');

      // Parse subtitle → degree + institution
      const parts = (consultantProfile.subtitle || '').split(', ');
      setAcademicDegree(parts[0] || '');
      setInstitution(parts.slice(1).join(', ') || '');

      // Expertise → categories
      const cats = (consultantProfile.expertise || '').split(', ').filter(Boolean);
      setSelectedCategories(cats);

      // Portfolio images
      if (consultantProfile.portfolio_images && consultantProfile.portfolio_images.length > 0) {
        const filled = [...consultantProfile.portfolio_images];
        while (filled.length < 5) filled.push('');
        setPortfolioImages(filled.slice(0, 5));
      }
    }
  }, [consultantProfile]);

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function pickProfileImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
    }
  }

  async function pickPortfolioImage(index: number) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPortfolioImages(prev => {
        const updated = [...prev];
        updated[index] = result.assets[0].uri;
        return updated;
      });
    }
  }

  function removePortfolioImage(index: number) {
    setPortfolioImages(prev => {
      const updated = [...prev];
      updated[index] = '';
      return updated;
    });
  }

  // Map UI categories to DB category
  function mapCategory(uiCategories: string[]): string {
    const mapping: Record<string, string> = {
      'Photography': 'photographer',
      'Videography': 'photographer',
      'Design': 'designer',
      'Painting': 'designer',
      'Sculpture': 'sculptor',
      'Traditional Craft': 'artisan',
      'Illustration': 'designer',
    };
    return mapping[uiCategories[0]] || 'designer';
  }

  async function uploadToCloud(localUri: string): Promise<string> {
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
    if (!cloudName || localUri.startsWith('http')) return localUri;
    try {
      const formData = new FormData();
      const filename = localUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('file', { uri: localUri, name: filename, type } as any);
      formData.append('upload_preset', 'dcreators_unsigned');
      formData.append('folder', 'dcreators/profiles');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      return data.secure_url || localUri;
    } catch { return localUri; }
  }

  async function handleUpdate() {
    if (!consultantProfile?.id || !profile?.id) {
      Alert.alert('Error', 'No consultant profile found. Please log out and back in.');
      return;
    }
    if (selectedCategories.length === 0) {
      Alert.alert('Missing Info', 'Please select at least one service category.');
      return;
    }

    setIsSaving(true);
    try {
      // Upload avatar if it's a local file
      const avatarUrl = profileImage ? await uploadToCloud(profileImage) : null;

      // Upload portfolio images — skip already-uploaded URLs
      const portfolioUris = portfolioImages.filter(uri => uri && uri.length > 0);
      const uploadedPortfolio = await Promise.all(portfolioUris.map(uri => uploadToCloud(uri)));

      const parsedPrice = basePrice ? parseFloat(basePrice) : null;

      // Build update payload
      const updateData: Record<string, any> = {
        display_name: displayName || consultantProfile.display_name,
        category: mapCategory(selectedCategories),
        subtitle: `${academicDegree}${institution ? ', ' + institution : ''}`,
        experience: selectedExperience,
        expertise: selectedCategories.join(', '),
        bio: bio || null,
        avatar_url: avatarUrl,
        portfolio_images: uploadedPortfolio,
        base_price: parsedPrice,
        updated_at: new Date().toISOString(),
      };

      console.log('[EditProfile] Updating for user_id:', profile.id);

      // Use user_id for matching — more reliable than consultant profile id
      const { error, status } = await supabase
        .from('consultant_profiles')
        .update(updateData)
        .eq('user_id', profile.id);

      console.log('[EditProfile] Status:', status, 'Error:', error);

      if (error) {
        Alert.alert('Update Failed', `${error.message}\n\nCode: ${error.code || 'unknown'}`);
        setIsSaving(false);
        return;
      }

      // Refresh store data
      await fetchConsultantProfile();

      Alert.alert(
        'Profile Updated! ✅',
        'Your changes have been saved successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      console.error('[EditProfile] Error:', err);
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <TopHeader />

        <ScrollView style={styles.mainScroll} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

          {/* Back + Title */}
          <View style={styles.titleRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <ArrowLeft size={22} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>Edit Profile</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Profile Image */}
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarFrame} onPress={pickProfileImage}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Camera size={32} color="#9CA3AF" />
                  <Text style={styles.avatarHint}>Tap to change</Text>
                </View>
              )}
              <View style={styles.editBadge}>
                <Camera size={14} color="#FFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.codeLabel}>{consultantProfile?.code || 'D---'}</Text>
          </View>

          {/* Section: Personal Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Details</Text>

            <Text style={styles.fieldLabel}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your display name"
              placeholderTextColor="#B0ADA8"
            />

            <Text style={styles.fieldLabel}>Highest Academic Degree</Text>
            <TextInput
              style={styles.input}
              value={academicDegree}
              onChangeText={setAcademicDegree}
              placeholder="e.g. MVA Applied Art"
              placeholderTextColor="#B0ADA8"
            />

            <Text style={styles.fieldLabel}>Institution</Text>
            <TextInput
              style={styles.input}
              value={institution}
              onChangeText={setInstitution}
              placeholder="Institution name"
              placeholderTextColor="#B0ADA8"
            />

            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Write a short bio about yourself..."
              placeholderTextColor="#B0ADA8"
              multiline
            />

            {/* Experience Dropdown */}
            <Text style={styles.fieldLabel}>Experience</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowExpDropdown(!showExpDropdown)}>
              <Text style={styles.dropdownText}>{selectedExperience || 'Select experience'}</Text>
              <ChevronDown size={18} color="#E8854A" />
            </TouchableOpacity>
            {showExpDropdown && (
              <View style={styles.dropdownList}>
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={styles.dropdownItem}
                    onPress={() => { setSelectedExperience(opt); setShowExpDropdown(false); }}
                  >
                    <Text style={[styles.dropdownItemText, selectedExperience === opt && { color: '#E8854A', fontWeight: '700' }]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Section: Services & Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services & Pricing</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => navigation.navigate('ConsultantServicePricing')}
              activeOpacity={0.8}
            >
              <Text style={styles.dropdownText}>Manage full service list & pricing</Text>
              <ChevronRight size={18} color="#E8854A" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.dropdown} onPress={() => setShowCategoryPicker(!showCategoryPicker)}>
              <Text style={styles.dropdownText}>
                {selectedCategories.length > 0 ? selectedCategories.join(', ') : 'Select services'}
              </Text>
              <ChevronDown size={18} color="#E8854A" />
            </TouchableOpacity>

            {showCategoryPicker && (
              <View style={styles.checklistBox}>
                {CATEGORIES.map((cat) => {
                  const checked = selectedCategories.includes(cat);
                  return (
                    <TouchableOpacity key={cat} style={styles.checkRow} onPress={() => toggleCategory(cat)}>
                      {checked ? <CheckSquare size={20} color="#10B981" /> : <Square size={20} color="#9CA3AF" />}
                      <Text style={[styles.checkLabel, checked && styles.checkLabelActive]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <Text style={styles.fieldLabel}>Base Price (₹ per project)</Text>
            <TextInput
              style={styles.input}
              value={basePrice}
              onChangeText={setBasePrice}
              placeholder="e.g. 15000"
              placeholderTextColor="#B0ADA8"
              keyboardType="numeric"
            />
          </View>

          {/* Section: Category-specific details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category Details</Text>
            <Text style={styles.hint}>
              Specializations, equipment, deliverables and other details specific to your category.
            </Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => navigation.navigate('ConsultantCategoryDetails')}
              activeOpacity={0.8}
            >
              <Text style={styles.dropdownText}>Update category details</Text>
              <ChevronRight size={18} color="#E8854A" />
            </TouchableOpacity>
          </View>

          {/* Section: Portfolio */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Portfolio & Work Samples</Text>
            <Text style={styles.hint}>Upload up to 5 reference images showcasing your work</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => navigation.navigate('ConsultantPortfolioUpdate')}
              activeOpacity={0.8}
            >
              <Text style={styles.dropdownText}>Open full portfolio manager</Text>
              <ChevronRight size={18} color="#E8854A" />
            </TouchableOpacity>

            <View style={styles.portfolioGrid}>
              {portfolioImages.map((uri, i) => (
                <View key={i} style={styles.portfolioSlot}>
                  {uri ? (
                    <View style={styles.portfolioFilled}>
                      <Image source={{ uri }} style={styles.portfolioThumb} />
                      <TouchableOpacity style={styles.removeBtn} onPress={() => removePortfolioImage(i)}>
                        <X size={12} color="#FFF" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.replaceBtn} onPress={() => pickPortfolioImage(i)}>
                        <Camera size={12} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.portfolioEmpty} onPress={() => pickPortfolioImage(i)}>
                      <ImagePlus size={20} color="#9CA3AF" />
                      <Text style={styles.slotLabel}>{i + 1}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>

        </ScrollView>

        {/* Update Button */}
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Save size={18} color="#FFF" />
                <Text style={styles.updateBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.screenBg },
  safe: { flex: 1 },
  mainScroll: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: fontSizes['2xl'], fontFamily: fonts.heavy, color: colors.textPrimary },
  avatarSection: { alignItems: 'center', marginBottom: spacing.xl },
  avatarFrame: { width: 110, height: 130, borderRadius: radii.md, borderWidth: 2.5, borderColor: '#E8854A', overflow: 'hidden', backgroundColor: colors.sectionBg },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  avatarHint: { fontSize: fontSizes.xs, fontFamily: fonts.body, color: colors.textTertiary },
  editBadge: { position: 'absolute', bottom: 6, right: 6, backgroundColor: '#E8854A', borderRadius: radii.md, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  codeLabel: { fontSize: fontSizes.sm + 1, fontFamily: fonts.heavy, color: colors.textSecondary, marginTop: spacing.sm },
  section: { marginHorizontal: spacing.xl, marginBottom: spacing['2xl'], backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...shadows.card },
  sectionTitle: { fontSize: fontSizes.lg, fontFamily: fonts.heavy, color: colors.textPrimary, marginBottom: 14 },
  fieldLabel: { fontSize: fontSizes.sm, fontFamily: fonts.medium, color: colors.textSecondary, marginTop: 10, marginBottom: spacing.xs },
  input: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 10, fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary },
  hint: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textTertiary, marginBottom: spacing.md },
  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.cardBg, borderWidth: 1, borderColor: '#E8854A', borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 10 },
  dropdownText: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary, flex: 1 },
  dropdownList: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, marginTop: spacing.xs, overflow: 'hidden' },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.sectionBg },
  dropdownItemText: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary },
  checklistBox: { backgroundColor: 'rgba(220,220,215,0.5)', borderRadius: radii.md, padding: 14, gap: 10, marginTop: spacing.sm },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkLabel: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textSecondary },
  checkLabelActive: { fontFamily: fonts.medium, color: colors.textPrimary },
  portfolioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  portfolioSlot: { width: '30%', aspectRatio: 1, borderRadius: radii.md, overflow: 'hidden' },
  portfolioFilled: { flex: 1, position: 'relative' },
  portfolioThumb: { width: '100%', height: '100%', borderRadius: radii.md },
  removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(239,68,68,0.85)', borderRadius: radii.md, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  replaceBtn: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: radii.md, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  portfolioEmpty: { flex: 1, backgroundColor: colors.sectionBg, borderWidth: 2, borderColor: colors.borderInput, borderStyle: 'dashed', borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  slotLabel: { fontSize: fontSizes.xs, fontFamily: fonts.medium, color: colors.textTertiary },
  actionBar: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: 14, paddingBottom: Platform.OS === 'ios' ? 34 : 14, backgroundColor: colors.cardBg, borderTopWidth: 1, borderTopColor: colors.borderCard },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sectionBg, borderWidth: 1, borderColor: colors.border },
  cancelBtnText: { fontSize: fontSizes.md, fontFamily: fonts.medium, color: colors.textSecondary },
  updateBtn: { flex: 2, flexDirection: 'row', gap: spacing.sm, paddingVertical: 14, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.success },
  updateBtnText: { fontSize: fontSizes.md, fontFamily: fonts.heavy, color: colors.textOnPrimary },
});
