// ============================================
// ProjectCard — Consultant's project card
// ============================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { Clock, CheckCircle, XCircle, FileText, AlertCircle } from 'lucide-react-native';
import { colors, fonts, fontSizes, spacing, radii } from '../../styles/theme';
import type { Project, ProjectStatus } from '../../types';

interface ProjectCardProps {
  project: Project;
  onAccept: (projectId: string) => void;
  onReject: (projectId: string) => void;
  onViewWorkorder: (project: Project) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ size: number; color: string }> }> = {
  // Incoming assignment — consultant action required
  draft:               { label: 'New Request',      color: '#F59E0B', icon: Clock },
  assigned:            { label: 'New Request',      color: '#F59E0B', icon: Clock },
  // Payment & work order stages
  advance_pending:     { label: 'Advance Pending',  color: '#3B82F6', icon: Clock },
  advance_paid:        { label: 'Advance Paid',     color: '#10B981', icon: CheckCircle },
  work_order_generated:{ label: 'Work Order Sent',  color: '#6366F1', icon: FileText },
  work_order_accepted: { label: 'WO Accepted',      color: '#10B981', icon: CheckCircle },
  // Active work
  in_progress:         { label: 'In Progress',      color: '#8B5CF6', icon: FileText },
  review_1:            { label: 'Review 1',         color: '#EC4899', icon: AlertCircle },
  review_2:            { label: 'Review 2',         color: '#EC4899', icon: AlertCircle },
  final_review:        { label: 'Final Review',     color: '#EF4444', icon: AlertCircle },
  final_approved:      { label: 'Final Approved',   color: '#10B981', icon: CheckCircle },
  // Payment & completion
  balance_pending:     { label: 'Balance Pending',  color: '#3B82F6', icon: Clock },
  balance_paid:        { label: 'Balance Paid',     color: '#10B981', icon: CheckCircle },
  delivered:           { label: 'Delivered',        color: '#10B981', icon: CheckCircle },
  completed:           { label: 'Completed',        color: '#6B7280', icon: CheckCircle },
  cancelled:           { label: 'Cancelled',        color: '#EF4444', icon: XCircle },
  rejected:            { label: 'Rejected',         color: '#EF4444', icon: XCircle },
};


export default function ProjectCard({ project, onAccept, onReject, onViewWorkorder }: ProjectCardProps) {
  // Fallback to 'assigned' config if status not in map (future-proofing)
  const statusCfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.assigned;
  const StatusIcon = statusCfg.icon;

  function confirmReject() {
    Alert.alert('Reject?', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => onReject(project.id) },
    ]);
  }

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.color }]}>
          <StatusIcon size={12} color="#FFF" />
          <Text style={styles.statusText}>{statusCfg.label}</Text>
        </View>
        <Text style={styles.date}>
          {new Date(project.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </Text>
      </View>

      {/* Body */}
      <Text style={styles.type}>
        {project.assignment_type.charAt(0).toUpperCase() + project.assignment_type.slice(1)}
      </Text>
      <Text style={styles.brief} numberOfLines={2}>{project.assignment_brief}</Text>

      {/* Meta */}
      <View style={styles.meta}>
        <Text style={styles.budget}>₹{Number(project.budget).toLocaleString()}</Text>
        {project.deadline && <Text style={styles.deadline}>Due: {project.deadline}</Text>}
      </View>

      {/* Actions: show Accept/Reject only on incoming 'assigned' requests */}
      {project.status === 'assigned' && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.rejectBtn} onPress={confirmReject}>
            <XCircle size={16} color="#EF4444" />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => onAccept(project.id)}>
            <CheckCircle size={16} color="#FFF" />
            <Text style={styles.acceptBtnText}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}

      {project.status !== 'assigned' && project.status !== 'draft' && (
        <TouchableOpacity style={styles.viewOrderBtn} onPress={() => onViewWorkorder(project)}>
          <Text style={styles.viewOrderBtnText}>View Workorder →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  date: { fontSize: 11, fontFamily: fonts.body, color: '#9CA3AF' },
  type: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  brief: { fontSize: 13, fontFamily: fonts.body, color: '#6B7280', lineHeight: 18, marginBottom: 10 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  budget: { fontSize: 16, fontWeight: '700', color: '#10B981' },
  deadline: { fontSize: 12, fontFamily: fonts.body, color: '#F59E0B' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2',
  },
  rejectBtnText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
  acceptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: '#10B981',
  },
  acceptBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  viewOrderBtn: {
    paddingVertical: 10, alignItems: 'center', borderRadius: 8,
    backgroundColor: colors.primary, marginTop: 4,
  },
  viewOrderBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
});
