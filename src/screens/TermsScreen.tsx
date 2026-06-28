import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ImageBackground, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TopHeader from '../components/TopHeader';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';
import { RemoteAssets } from '../lib/assets';


export default function TermsScreen({ navigation }: any) {
  const [accepted, setAccepted] = useState(false);

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
            
            <View style={styles.headerRow}>
              <Text style={styles.stepTitle}>Step 1</Text>
              <Text style={styles.pageTitle}>Client's Detail</Text>
            </View>

            <View style={styles.termsBox}>
              <Text style={styles.termsTitle}>Terms & Conditions</Text>
              <Text style={styles.termsText}>
                1. The assignment shall be completed as per the specifications and deadlines set out in the brief.{"\n\n"}
                2. Both parties agree to maintain confidentiality regarding all proprietary information shared during this project.{"\n\n"}
                3. The total agreed compensation must be paid according to the payment schedule: 50% advance, and 50% upon final delivery.{"\n\n"}
                4. Any additional revisions beyond the agreed 2 reverts will be subject to extra charges at standard rates.{"\n\n"}
                5. DCreators platform takes a nominal fee and acts as the mediator to resolve any disputes arising during the execution of this workorder.{"\n\n"}
                6. By accepting these terms, you agree to form a legally binding contract for this project assignment.
              </Text>
            </View>

          </View>
        </ScrollView>

        <View style={styles.actionsBar}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: accepted ? colors.success : colors.primary }]}
            onPress={() => setAccepted(!accepted)}
          >
            <Text style={styles.actionBtnText}>{accepted ? 'Accepted ✓' : 'Accept Terms'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.btnDisabled }]} onPress={() => navigation.goBack()}>
            <Text style={styles.actionBtnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.btnDisabled }]}>
            <Text style={styles.actionBtnText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.btnDisabled }]} onPress={() => navigation.navigate('AssignProject')}>
            <Text style={styles.actionBtnText}>Back to Form</Text>
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
  
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  stepTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: fonts.heavy,
  },
  pageTitle: {
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: fonts.medium,
  },

  termsBox: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderInput,
    padding: spacing.lg,
    borderRadius: radii.sm,
    minHeight: 400,
  },
  termsTitle: {
    fontSize: fontSizes.base,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontFamily: fonts.heavy,
  },
  termsText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
    fontFamily: fonts.body,
  },

  actionsBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    justifyContent: 'space-between',
    backgroundColor: '#E6E6E6',
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  actionBtnText: {
    color: colors.textOnPrimary,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    fontFamily: fonts.heavy,
    textAlign: 'center',
  },
});
