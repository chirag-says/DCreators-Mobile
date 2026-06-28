import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ImageBackground, TouchableOpacity, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Camera, ChevronLeft } from 'lucide-react-native';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';


export default function EditProfileScreen({ navigation }: any) {
  const [name, setName] = useState('John Doe');
  const [email, setEmail] = useState('john.doe@example.com');
  const [bio, setBio] = useState('Creative designer with 5 years experience.');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.cardBg }]} edges={['top']}>
      <ImageBackground source={{ uri: RemoteAssets.bgTexture }} style={styles.bg} imageStyle={{ opacity: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ChevronLeft size={28} color={colors.textPrimary} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
          <View style={styles.container}>
            <View style={styles.avatarSection}>
              <View style={styles.avatarCircle}>
                <User size={40} color={colors.textTertiary} />
                <TouchableOpacity style={styles.cameraBtn}><Camera size={16} color={colors.textOnPrimary} /></TouchableOpacity>
              </View>
            </View>
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}><Text style={styles.label}>Full Name</Text><TextInput style={styles.input} value={name} onChangeText={setName} /></View>
              <View style={styles.inputGroup}><Text style={styles.label}>Email Address</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" /></View>
              <View style={styles.inputGroup}><Text style={styles.label}>Bio / Description</Text><TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio} multiline textAlignVertical="top" /></View>
            </View>
          </View>
        </ScrollView>
        <View style={styles.actionsBar}>
          <TouchableOpacity style={styles.saveBtn} onPress={() => navigation.goBack()}><Text style={styles.saveBtnText}>Save Changes</Text></TouchableOpacity>
        </View>
      </ImageBackground>
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
  avatarCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.sectionBg, alignItems: 'center', justifyContent: 'center', position: 'relative', borderWidth: 1, borderColor: colors.borderInput },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.primary, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.cardBg },
  formContainer: { gap: spacing.xl },
  inputGroup: { gap: spacing.sm },
  label: { fontSize: fontSizes.sm, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy },
  input: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderInput, borderRadius: radii.md, height: 48, paddingHorizontal: spacing.lg, fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary },
  textArea: { height: 100, paddingTop: spacing.md },
  actionsBar: { padding: spacing.lg, paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg, backgroundColor: colors.cardBg, borderTopWidth: 1, borderTopColor: colors.border },
  saveBtn: { backgroundColor: colors.success, paddingVertical: 14, borderRadius: radii.md, alignItems: 'center' },
  saveBtnText: { color: colors.textOnPrimary, fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy },
});
