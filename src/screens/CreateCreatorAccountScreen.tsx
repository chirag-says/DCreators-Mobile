/**
 * CreateCreatorAccountScreen
 * Step 1 of the consultant onboarding flow:
 *   CreateCreatorAccount → ConsultantServicePricing → ConsultantPortfolioUpdate
 *
 * Collects identity/KYC + banking details so a consultant_profiles row can be
 * created. Category and pricing are chosen on the next screen, and portfolio
 * artwork on the screen after that — this screen only registers the account.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, Camera, ChevronDown, FileText, Upload, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { uploadToCloudinary, uploadRawToCloudinary } from '../lib/cloudinary';
import { colors, fonts, fontSizes } from '../styles/theme';

const NAVY = '#1B3A5C';
const TEAL = '#3D9B8F';
const ORANGE = '#E87B35';
const BG = '#EDF1F5';

const OTHER_BANK = 'Other (type manually)';

// Major Indian banks — public sector, private, small finance, payments & foreign banks.
const INDIAN_BANKS = [
  // Public sector
  'State Bank of India', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank',
  'Union Bank of India', 'Bank of India', 'Indian Bank', 'Central Bank of India',
  'Indian Overseas Bank', 'UCO Bank', 'Bank of Maharashtra', 'Punjab & Sind Bank',
  // Private sector
  'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'IndusInd Bank',
  'Yes Bank', 'IDFC FIRST Bank', 'Federal Bank', 'South Indian Bank', 'Karur Vysya Bank',
  'City Union Bank', 'RBL Bank', 'Bandhan Bank', 'DCB Bank', 'Karnataka Bank',
  'Tamilnad Mercantile Bank', 'Dhanlaxmi Bank', 'CSB Bank', 'Jammu & Kashmir Bank', 'Nainital Bank',
  // Small finance banks
  'AU Small Finance Bank', 'Equitas Small Finance Bank', 'Ujjivan Small Finance Bank',
  'Suryoday Small Finance Bank', 'ESAF Small Finance Bank', 'Jana Small Finance Bank',
  'Utkarsh Small Finance Bank', 'Fincare Small Finance Bank', 'North East Small Finance Bank',
  'Capital Small Finance Bank', 'Shivalik Small Finance Bank', 'Unity Small Finance Bank',
  // Payments banks
  'Airtel Payments Bank', 'India Post Payments Bank', 'Fino Payments Bank',
  'Paytm Payments Bank', 'Jio Payments Bank', 'NSDL Payments Bank',
  // Foreign banks operating in India
  'Citibank', 'HSBC', 'Standard Chartered Bank', 'Deutsche Bank', 'DBS Bank India',
  // Cooperative
  'Saraswat Co-operative Bank', 'Cosmos Co-operative Bank',
];

const BANK_OPTIONS = [...INDIAN_BANKS].sort((a, b) => a.localeCompare(b)).concat(OTHER_BANK);

export default function CreateCreatorAccountScreen({ navigation }: any) {
  const profile = useAuthStore(s => s.profile);
  const fetchConsultantProfile = useAuthStore(s => s.fetchConsultantProfile);

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [experience, setExperience] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [aadhar, setAadhar] = useState('');
  const [pan, setPan] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [customBankName, setCustomBankName] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const bankName = selectedBank === OTHER_BANK ? customBankName.trim() : selectedBank;

  const [termsFile, setTermsFile] = useState<{ uri: string; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setPreviewUri(result.assets[0].uri);
      setShowPreview(true);
    }
  }

  function confirmAvatar() {
    setAvatarUri(previewUri);
    setShowPreview(false);
  }

  async function pickTermsPdf() {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled && result.assets?.[0]) {
      setTermsFile({ uri: result.assets[0].uri, name: result.assets[0].name });
    }
  }

  function validate(): string | null {
    if (!aadhar.trim() || !/^\d{12}$/.test(aadhar.replace(/\s/g, ''))) return 'Please enter a valid 12-digit Aadhar Card number.';
    if (!pan.trim() || !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan.trim().toUpperCase())) return 'Please enter a valid PAN Card number (e.g. ABCDE1234F).';
    if (!bankName) return selectedBank === OTHER_BANK ? 'Please type your bank name.' : 'Please select your bank.';
    if (!ifsc.trim() || !/^[A-Z]{4}0\w{6}$/.test(ifsc.trim().toUpperCase())) return 'Please enter a valid IFSC code.';
    if (!accountNumber.trim() || accountNumber.trim().length < 6) return 'Please enter a valid bank account number.';
    return null;
  }

  async function handleRegister() {
    if (!profile?.id) {
      Alert.alert('Error', 'You must be logged in to register.');
      return;
    }
    const validationError = validate();
    if (validationError) {
      Alert.alert('Missing or Invalid Info', validationError);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const actualUserId = authUser?.id;
      if (!actualUserId) {
        Alert.alert('Session Error', 'Your session has expired. Please log in again.');
        setSubmitting(false);
        return;
      }

      const avatarUrl = avatarUri ? await uploadToCloudinary(avatarUri, 'dcreators/profiles') : null;
      const termsPdfUrl = termsFile ? await uploadRawToCloudinary(termsFile.uri, termsFile.name, 'dcreators/terms') : null;

      const code = `D${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { error } = await supabase.from('consultant_profiles').upsert({
        user_id: actualUserId,
        display_name: profile.name,
        code,
        experience: experience.trim() || null,
        institution_name: institutionName.trim() || null,
        avatar_url: avatarUrl,
        aadhar_number: aadhar.replace(/\s/g, ''),
        pan_number: pan.trim().toUpperCase(),
        bank_name: bankName.trim(),
        ifsc_code: ifsc.trim().toUpperCase(),
        bank_account_number: accountNumber.trim(),
        terms_pdf_url: termsPdfUrl,
        is_approved: false,
        is_active: true,
      }, { onConflict: 'user_id', ignoreDuplicates: false });

      if (error) {
        Alert.alert('Error', error.message);
        setSubmitting(false);
        return;
      }

      await supabase.from('profiles').update({ has_consultant_profile: true }).eq('id', profile.id);
      await fetchConsultantProfile();

      navigation.navigate('ConsultantServicePricing', { fromOnboarding: true });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <ArrowLeft size={18} color={NAVY} />
        </TouchableOpacity>
        <Text style={s.tagline}>HIRE CREATIVES. BUY ART. BUILD IDEAS</Text>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.7}>
          <Bell size={18} color={NAVY} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.heroTitle}>Create{'\n'}Creator's{'\n'}Account</Text>
        <Text style={s.heroSub}>
          Step 1 of 4 — register your identity and banking details so clients can pay you securely.
        </Text>

        {/* Avatar upload */}
        <View style={s.avatarRow}>
          <TouchableOpacity style={s.avatarFrame} onPress={pickAvatar} activeOpacity={0.85}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={s.avatarImage} />
            ) : (
              <Camera size={28} color={TEAL} />
            )}
          </TouchableOpacity>
          <View style={s.avatarTextCol}>
            <Text style={s.avatarLabel}>Upload profile photograph</Text>
            <Text style={s.avatarHint}>PNG, JPG up to 5MB. You'll be able to crop and preview it before saving.</Text>
          </View>
        </View>

        <View style={s.confidentialNote}>
          <Text style={s.confidentialText}>
            All the following details will remain confidential and will not reflect/appear in any of the Dashboard of this APP
          </Text>
        </View>

        <Text style={s.fieldLabel}>PROFESSIONAL EXPERIENCE</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. 5 years"
          placeholderTextColor={colors.textTertiary}
          value={experience}
          onChangeText={setExperience}
        />

        <Text style={s.fieldLabel}>INSTITUTION / ORGANIZATION</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. National Institute of Design"
          placeholderTextColor={colors.textTertiary}
          value={institutionName}
          onChangeText={setInstitutionName}
        />

        <Text style={s.fieldLabel}>AADHAR CARD NO. *</Text>
        <TextInput
          style={s.input}
          placeholder="3977 8800 0234"
          placeholderTextColor={colors.textTertiary}
          value={aadhar}
          onChangeText={setAadhar}
          keyboardType="number-pad"
          maxLength={14}
        />

        <Text style={s.fieldLabel}>PAN CARD NO. *</Text>
        <TextInput
          style={s.input}
          placeholder="ABCD1234E"
          placeholderTextColor={colors.textTertiary}
          value={pan}
          onChangeText={(v) => setPan(v.toUpperCase())}
          autoCapitalize="characters"
          maxLength={10}
        />

        <Text style={s.fieldLabel}>BANK NAME *</Text>
        <TouchableOpacity
          style={s.dropdownTrigger}
          onPress={() => setShowBankDropdown(v => !v)}
          activeOpacity={0.85}
        >
          <Text style={[s.dropdownValue, !selectedBank && s.dropdownPlaceholder]} numberOfLines={1}>
            {selectedBank || 'Select your bank'}
          </Text>
          <ChevronDown size={18} color={colors.textSecondary} style={{ transform: [{ rotate: showBankDropdown ? '180deg' : '0deg' }] }} />
        </TouchableOpacity>
        {showBankDropdown && (
          <View style={s.dropdownList}>
            <ScrollView style={s.dropdownScroll} nestedScrollEnabled showsVerticalScrollIndicator>
              {BANK_OPTIONS.map(bank => (
                <TouchableOpacity
                  key={bank}
                  style={[s.dropdownItem, bank === selectedBank && s.dropdownItemActive]}
                  onPress={() => { setSelectedBank(bank); setShowBankDropdown(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.dropdownItemText, bank === selectedBank && s.dropdownItemTextActive]}>{bank}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        {selectedBank === OTHER_BANK && (
          <TextInput
            style={[s.input, { marginTop: 10 }]}
            placeholder="Type your bank name"
            placeholderTextColor={colors.textTertiary}
            value={customBankName}
            onChangeText={setCustomBankName}
          />
        )}

        <Text style={s.fieldLabel}>IFSC CODE *</Text>
        <TextInput
          style={s.input}
          placeholder="UCBA0000080"
          placeholderTextColor={colors.textTertiary}
          value={ifsc}
          onChangeText={(v) => setIfsc(v.toUpperCase())}
          autoCapitalize="characters"
          maxLength={11}
        />

        <Text style={s.fieldLabel}>ACCOUNT NO. *</Text>
        <TextInput
          style={s.input}
          placeholder="95243532452425"
          placeholderTextColor={colors.textTertiary}
          value={accountNumber}
          onChangeText={setAccountNumber}
          keyboardType="number-pad"
        />

        {/* T&C PDF upload */}
        <TouchableOpacity style={s.uploadZone} onPress={pickTermsPdf} activeOpacity={0.85}>
          {termsFile ? (
            <View style={s.fileRow}>
              <FileText size={20} color={TEAL} />
              <Text style={s.fileName} numberOfLines={1}>{termsFile.name}</Text>
              <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); setTermsFile(null); }}>
                <X size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Upload size={26} color={ORANGE} />
              <Text style={s.uploadLabel}>Upload your specific Terms and{'\n'}Conditions for Creative Consultancy</Text>
              <Text style={s.uploadHint}>Drag & drop or click to browse (PDF)</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.registerBtn, submitting && { opacity: 0.6 }]}
          onPress={handleRegister}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.registerBtnText}>Register</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Avatar crop preview modal */}
      <Modal visible={showPreview} transparent animationType="fade" onRequestClose={() => setShowPreview(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Profile Photo Preview</Text>
            <Text style={s.modalSub}>This is how your photo will appear across the app.</Text>
            {previewUri && <Image source={{ uri: previewUri }} style={s.modalAvatar} />}
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalRetakeBtn} onPress={pickAvatar} activeOpacity={0.85}>
                <Text style={s.modalRetakeText}>Choose Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirmBtn} onPress={confirmAvatar} activeOpacity={0.85}>
                <Text style={s.modalConfirmText}>Use This Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  heroTitle: { fontSize: 34, fontWeight: '900', fontFamily: fonts.heavy, color: NAVY, lineHeight: 40, marginTop: 12, marginBottom: 6, textAlign: 'center' },
  heroSub: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 20, textAlign: 'center', marginBottom: 22 },

  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 18 },
  avatarFrame: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 84, height: 84, borderRadius: 42 },
  avatarTextCol: { flex: 1 },
  avatarLabel: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: NAVY, marginBottom: 4 },
  avatarHint: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textTertiary, lineHeight: 17 },

  confidentialNote: { backgroundColor: '#F8F9FB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, marginBottom: 20 },
  confidentialText: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textTertiary, lineHeight: 18, textAlign: 'center' },

  fieldLabel: { fontSize: 10, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textTertiary, letterSpacing: 0.8, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: colors.borderInput, paddingHorizontal: 14, paddingVertical: 12, fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary },

  dropdownTrigger: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: colors.borderInput, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownValue: { flex: 1, fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary, marginRight: 8 },
  dropdownPlaceholder: { color: colors.textTertiary },
  dropdownList: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: colors.borderInput, marginTop: 4, overflow: 'hidden' },
  dropdownScroll: { maxHeight: 260 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemActive: { backgroundColor: '#F0F2FF' },
  dropdownItemText: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary },
  dropdownItemTextActive: { fontWeight: '700', color: NAVY, fontFamily: fonts.heavy },

  uploadZone: { marginTop: 22, borderWidth: 2, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center', gap: 8, backgroundColor: '#FAFBFF' },
  uploadLabel: { fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.heavy, color: ORANGE, textAlign: 'center', lineHeight: 19, marginTop: 4 },
  uploadHint: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textTertiary },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
  fileName: { flex: 1, fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary },

  registerBtn: { backgroundColor: NAVY, borderRadius: 999, paddingVertical: 17, alignItems: 'center', marginTop: 26 },
  registerBtnText: { color: '#fff', fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 18, padding: 22, width: '100%', alignItems: 'center' },
  modalTitle: { fontSize: fontSizes.lg, fontWeight: '800', fontFamily: fonts.heavy, color: NAVY, marginBottom: 4 },
  modalSub: { fontSize: fontSizes.sm, fontFamily: fonts.body, color: colors.textSecondary, textAlign: 'center', marginBottom: 18 },
  modalAvatar: { width: 140, height: 140, borderRadius: 70, marginBottom: 20, borderWidth: 3, borderColor: TEAL },
  modalBtnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  modalRetakeBtn: { flex: 1, borderRadius: 999, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5, borderColor: NAVY },
  modalRetakeText: { color: NAVY, fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.heavy },
  modalConfirmBtn: { flex: 1, borderRadius: 999, paddingVertical: 13, alignItems: 'center', backgroundColor: TEAL },
  modalConfirmText: { color: '#fff', fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.heavy },
});
