import React from 'react';
import { View, Text, ScrollView, StyleSheet, ImageBackground, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle } from 'lucide-react-native';
import TopHeader from '../components/TopHeader';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';


export default function AssignMultipleScreen({ navigation }: any) {
  return (
    <ImageBackground 
      source={{ uri: RemoteAssets.bgTexture }} 
      style={styles.backgroundImage}
      imageStyle={{ opacity: 1 }}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <TopHeader />
        
        <ScrollView style={styles.mainScroll} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            
            <View style={styles.headerBox}>
              <Text style={styles.headerTitle}>Assign Project to Multiple Consultants</Text>
              <Text style={styles.headerSubtitle}>10 Consultants available within your selected range and criteria.</Text>
            </View>

            {/* List of Consultants */}
            {[1, 2, 3, 4, 5].map((item) => (
              <TouchableOpacity key={item} style={styles.consultantRow}>
                <View style={styles.avatarPlaceholder} />
                <View style={styles.infoCol}>
                  <Text style={styles.nameText}>Consultant Name {item}</Text>
                  <Text style={styles.subText}>Experience: 5 Years</Text>
                  <Text style={styles.subText}>Budget Fit: 95%</Text>
                </View>
                <View style={styles.selectCircle}>
                  <CheckCircle size={24} color="#D1D5DB" />
                </View>
              </TouchableOpacity>
            ))}

          </View>
        </ScrollView>

        <View style={styles.actionsBar}>
          <TouchableOpacity style={styles.actionBtnSecondary} onPress={() => navigation.goBack()}>
            <Text style={styles.actionBtnTextDark}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnPrimary}>
            <Text style={styles.actionBtnTextLight}>Send Request to Selected</Text>
          </TouchableOpacity>
        </View>
</SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, backgroundColor: colors.screenBg },
  safeArea: { flex: 1 },
  mainScroll: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  headerBox: { backgroundColor: colors.cardBg, padding: spacing.lg, borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderInput, marginBottom: spacing.xl, ...shadows.card },
  headerTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs, fontFamily: fonts.heavy },
  headerSubtitle: { fontSize: fontSizes.sm, color: colors.textSecondary, fontFamily: fonts.body },
  consultantRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: '#E6E6E6', marginBottom: 10, ...shadows.sm },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: radii['2xl'], backgroundColor: colors.borderInput, marginRight: spacing.md },
  infoCol: { flex: 1 },
  nameText: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy, marginBottom: 2 },
  subText: { fontSize: fontSizes.xs + 1, color: colors.textSecondary, fontFamily: fonts.medium },
  selectCircle: { padding: spacing.sm },
  actionsBar: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.cardBg, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.md },
  actionBtnSecondary: { flex: 1, backgroundColor: colors.sectionBg, paddingVertical: spacing.md, borderRadius: radii.md, alignItems: 'center' },
  actionBtnPrimary: { flex: 2, backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radii.md, alignItems: 'center' },
  actionBtnTextDark: { color: colors.textPrimary, fontWeight: '700', fontSize: fontSizes.sm + 1, fontFamily: fonts.heavy },
  actionBtnTextLight: { color: colors.textOnPrimary, fontWeight: '700', fontSize: fontSizes.sm + 1, fontFamily: fonts.heavy },
});
