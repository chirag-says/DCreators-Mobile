// ============================================
// ClientProjectRow — Client's active project row
// ============================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Clock, CheckCircle, FileText, AlertCircle } from 'lucide-react-native';
import { colors, fonts, fontSizes } from '../../styles/theme';
import type { ProjectWithConsultant } from '../../services/projectService';

interface ClientProjectRowProps {
  project: ProjectWithConsultant;
  onPress: (project: ProjectWithConsultant) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ size: number; color: string }> }> = {
  pending: { label: 'Pending', color: colors.warning, icon: Clock },
  accepted: { label: 'Accepted', color: colors.success, icon: CheckCircle },
  advance_paid: { label: 'Advance Paid', color: colors.info, icon: CheckCircle },
  in_progress: { label: 'In Progress', color: '#8B5CF6', icon: FileText },
  review_1: { label: 'Review 1', color: '#EC4899', icon: AlertCircle },
  review_2: { label: 'Review 2', color: '#EC4899', icon: AlertCircle },
  final_review: { label: 'Final Review', color: colors.error, icon: AlertCircle },
  approved: { label: 'Approved', color: colors.success, icon: CheckCircle },
};

export default function ClientProjectRow({ project, onPress }: ClientProjectRowProps) {
  const cfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(project)}>
      <View style={{ flex: 1 }}>
        <Text style={styles.type}>
          {project.assignment_type?.charAt(0).toUpperCase()}{project.assignment_type?.slice(1) || 'Project'}
        </Text>
        <Text style={styles.consultant}>
          {project.consultant_profiles?.display_name || 'Consultant'} / {project.consultant_profiles?.code || '---'}
        </Text>
      </View>
      <View style={[styles.chip, { backgroundColor: cfg.color + '18', borderColor: cfg.color }]}>
        <StatusIcon size={12} color={cfg.color} />
        <Text style={[styles.chipText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  type: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  consultant: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
    borderWidth: 1,
  },
  chipText: { fontSize: 10, fontWeight: '700' },
});
