import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors, fonts, fontSizes, spacing, radii } from '../styles/theme';

const DISCIPLINES = ['Photography', 'Design', 'Sculpture', 'Artisan'];
const SORT_OPTIONS = ['Relevance', 'Rating', 'Experience (High to Low)', 'Experience (Low to High)'];

export default function FilterScreen({ navigation }: any) {
  const [selectedDiscipline, setSelectedDiscipline] = useState('Design');
  const [selectedSort, setSelectedSort] = useState('Relevance');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Filter</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X size={28} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Discipline</Text>
        <View style={styles.optionsContainer}>
          {DISCIPLINES.map(item => (
            <TouchableOpacity key={item} style={[styles.chip, selectedDiscipline === item && styles.chipActive]} onPress={() => setSelectedDiscipline(item)}>
              <Text style={[styles.chipText, selectedDiscipline === item && styles.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Sort By</Text>
        <View style={styles.optionsContainer}>
          {SORT_OPTIONS.map(item => (
            <TouchableOpacity key={item} style={[styles.chip, selectedSort === item && styles.chipActive]} onPress={() => setSelectedSort(item)}>
              <Text style={[styles.chipText, selectedSort === item && styles.chipTextActive]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.clearBtn}><Text style={styles.clearBtnText}>Clear All</Text></TouchableOpacity>
        <TouchableOpacity style={styles.applyBtn} onPress={() => navigation.goBack()}><Text style={styles.applyBtnText}>Apply</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cardBg },
  header: { backgroundColor: colors.cardBg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: fontSizes.xl, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textPrimary },
  content: { flex: 1, padding: spacing.xl },
  sectionTitle: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textPrimary, marginBottom: spacing.lg },
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii['2xl'], borderWidth: 1, borderColor: colors.borderInput, backgroundColor: colors.cardBg },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSizes.sm, fontFamily: fonts.medium, color: colors.textSecondary },
  chipTextActive: { color: colors.textOnPrimary, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing['2xl'] },
  bottomActions: { flexDirection: 'row', padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.lg },
  clearBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderInput },
  clearBtnText: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textPrimary },
  applyBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.primary },
  applyBtnText: { fontSize: fontSizes.base, fontWeight: '700', fontFamily: fonts.heavy, color: colors.textOnPrimary },
});
