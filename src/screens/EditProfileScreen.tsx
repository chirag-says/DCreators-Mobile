import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Platform, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, ChevronLeft } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';


export default function EditProfileScreen({ navigation }: any) {
  const { profile, user, updateProfile } = useAuthStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
    }
  }, [profile]);

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Required', 'Please enter your name.'); return; }
    setIsSaving(true);
    const result = await updateProfile({ name: name.trim(), phone: phone.trim() || null, address: address.trim() || null });
    setIsSaving(false);
    if (result.success) navigation.goBack();
    else Alert.alert('Error', result.error ?? 'Could not save your profile.');
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.cardBg }]} edges={['top']}>
      <View style={styles.bg}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ChevronLeft size={28} color={colors.textPrimary} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
          <View style={styles.container}>
            <View style={styles.avatarSection}>
              <View style={styles.avatarCircle}>
                {profile?.avatar_url
                  ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                  : <User size={40} color={colors.textTertiary} />
                }
              </View>
            </View>
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}><Text style={styles.label}>Full Name</Text><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.textTertiary} /></View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={[styles.input, styles.inputDisabled]}><Text style={styles.inputDisabledText}>{user?.email || profile?.email}</Text></View>
              </View>
              <View style={styles.inputGroup}><Text style={styles.label}>Phone</Text><TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Phone number" placeholderTextColor={colors.textTertiary} /></View>
              <View style={styles.inputGroup}><Text style={styles.label}>Address</Text><TextInput style={[styles.input, styles.textArea]} value={address} onChangeText={setAddress} multiline textAlignVertical="top" placeholder="Your address" placeholderTextColor={colors.textTertiary} /></View>
            </View>
          </View>
        </ScrollView>
        <View style={styles.actionsBar}>
          <TouchableOpacity style={[styles.saveBtn, isSaving && { opacity: 0.6 }]} onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color={colors.textOnPrimary} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.screenBg },
  safeArea: { flex: 1 },
  header: { backgroundColor: colors.cardBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderCard },
  backBtn: { width: 40 },
  headerTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy },
  container: { flex: 1, padding: spacing['2xl'] },
  avatarSection: { alignItems: 'center', marginBottom: spacing['3xl'] },
  avatarCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.sectionBg, alignItems: 'center', justifyContent: 'center', position: 'relative', borderWidth: 1, borderColor: colors.borderInput, overflow: 'hidden' },
  avatarImg: { width: 100, height: 100, borderRadius: 50 },
  formContainer: { gap: spacing.xl },
  inputGroup: { gap: spacing.sm },
  label: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy },
  input: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderInput, borderRadius: radii.md, height: 48, paddingHorizontal: spacing.lg, fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary },
  inputDisabled: { backgroundColor: colors.sectionBg, justifyContent: 'center' },
  inputDisabledText: { fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textTertiary },
  textArea: { height: 100, paddingTop: spacing.md },
  actionsBar: { padding: spacing.lg, paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg, backgroundColor: colors.cardBg, borderTopWidth: 1, borderTopColor: colors.border },
  saveBtn: { backgroundColor: colors.success, paddingVertical: 14, borderRadius: radii.md, alignItems: 'center' },
  saveBtnText: { color: colors.textOnPrimary, fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },
});
