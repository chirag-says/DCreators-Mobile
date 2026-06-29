import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Download, FileText } from 'lucide-react-native';
import { useAuthStore } from '../store/useAuthStore';
import { fetchProjectPayments } from '../services/projectService';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';


export default function InvoiceScreen({ navigation, route }: any) {
  const project = route?.params?.project;
  const profile = useAuthStore((s) => s.profile);

  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (project?.id) fetchPayments();
    else setLoading(false);
  }, [project?.id]);

  async function fetchPayments() {
    try {
      const data = await fetchProjectPayments(project.id, 'completed');
      setPayments(data);
    } catch {}
    finally { setLoading(false); }
  }

  const budget = project?.budget ? Number(project.budget) : 0;
  const finalOffer = project?.final_offer ? Number(project.final_offer) : budget;
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const consultantName = project?.consultant_profiles?.display_name || 'Consultant';
  const consultantCode = project?.consultant_profiles?.code || '---';
  const clientName = profile?.name || 'Client';

  const invoiceNo = project?.id
    ? `INV-${new Date(project.created_at).getFullYear()}-${project.id.slice(0, 6).toUpperCase()}`
    : 'INV-DRAFT';

  const isPaid = totalPaid >= finalOffer;
  const issueDate = project?.created_at
    ? new Date(project.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'N/A';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.cardBg }]} edges={['top']}>
      <View style={styles.bg}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invoice</Text>
          <View style={{ width: 28 }} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
        ) : (
          <ScrollView style={styles.mainScroll} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            <View style={styles.container}>

              {/* Invoice Header */}
              <View style={styles.invoiceCard}>
                <View style={styles.invoiceIconRow}>
                  <View style={styles.invoiceIconCircle}>
                    <FileText size={28} color={colors.primary} />
                  </View>
                </View>
                <Text style={styles.invoiceNumber}>{invoiceNo}</Text>
                <Text style={styles.invoiceDate}>Issued: {issueDate}</Text>
                <View style={[styles.statusBadge, { backgroundColor: isPaid ? '#D1FAE5' : '#FEF3C7' }]}>
                  <Text style={[styles.statusText, { color: isPaid ? '#059669' : '#92400E' }]}>
                    {isPaid ? 'PAID' : 'PARTIALLY PAID'}
                  </Text>
                </View>
              </View>

              {/* From / To */}
              <View style={styles.partyRow}>
                <View style={styles.partyBox}>
                  <Text style={styles.partyLabel}>From</Text>
                  <Text style={styles.partyName}>DCreators</Text>
                  <Text style={styles.partyDetail}>Platform Services</Text>
                </View>
                <View style={[styles.partyBox, { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: spacing.lg }]}>
                  <Text style={styles.partyLabel}>To</Text>
                  <Text style={styles.partyName}>{clientName}</Text>
                  <Text style={styles.partyDetail}>{profile?.email || ''}</Text>
                  {profile?.address && <Text style={styles.partyDetail}>{profile.address}</Text>}
                </View>
              </View>

              {/* Line Items */}
              <View style={styles.lineItemsCard}>
                <Text style={styles.sectionTitle}>Items</Text>

                <View style={styles.lineItem}>
                  <View style={styles.lineItemLeft}>
                    <Text style={styles.lineItemName}>
                      {project?.assignment_type
                        ? project.assignment_type.charAt(0).toUpperCase() + project.assignment_type.slice(1) + ' Assignment'
                        : 'Assignment'}
                    </Text>
                    <Text style={styles.lineItemDesc}>{consultantCode} / {consultantName}</Text>
                  </View>
                  <Text style={styles.lineItemAmount}>₹{finalOffer.toLocaleString()}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>₹{finalOffer.toLocaleString()}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Amount Paid</Text>
                  <Text style={[styles.totalValue, { color: colors.success }]}>₹{totalPaid.toLocaleString()}</Text>
                </View>
                {totalPaid < finalOffer && (
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { fontWeight: '700', color: colors.error }]}>Balance Due</Text>
                    <Text style={[styles.totalValue, { fontWeight: '700', color: colors.error }]}>
                      ₹{(finalOffer - totalPaid).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Payment History */}
              {payments.length > 0 && (
                <View style={styles.paymentInfoCard}>
                  <Text style={styles.sectionTitle}>Payment History</Text>
                  {payments.map((p, i) => (
                    <View key={p.id} style={[styles.infoRow, i < payments.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: 10, marginBottom: 10 }]}>
                      <View>
                        <Text style={styles.infoValue}>
                          {p.payment_type === 'advance' ? 'Advance Payment' : 'Balance Payment'}
                        </Text>
                        <Text style={styles.infoLabel}>
                          {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <Text style={[styles.infoValue, { color: colors.success, fontWeight: '700' }]}>
                        ₹{Number(p.amount).toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {payments.length === 0 && (
                <View style={styles.paymentInfoCard}>
                  <Text style={styles.sectionTitle}>Payment Details</Text>
                  <Text style={styles.infoLabel}>No completed payments recorded yet.</Text>
                </View>
              )}

            </View>
          </ScrollView>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, backgroundColor: colors.screenBg },
  safeArea: { flex: 1 },
  mainScroll: { flex: 1 },
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg },

  header: {
    backgroundColor: colors.cardBg, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderCard,
  },
  headerTitle: { fontSize: fontSizes.lg, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy },

  invoiceCard: {
    backgroundColor: colors.cardBg, padding: spacing['2xl'], borderRadius: radii.lg,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadows.card,
  },
  invoiceIconRow: { marginBottom: spacing.md },
  invoiceIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  invoiceNumber: { fontSize: fontSizes.xl, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy, marginBottom: spacing.xs },
  invoiceDate: { fontSize: fontSizes.sm, color: colors.textSecondary, fontFamily: fonts.medium, marginBottom: spacing.md },
  statusBadge: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderRadius: radii.md },
  statusText: { fontSize: fontSizes.sm, fontWeight: '700', fontFamily: fonts.heavy },

  partyRow: {
    flexDirection: 'row', backgroundColor: colors.cardBg, borderRadius: radii.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadows.sm,
  },
  partyBox: { flex: 1 },
  partyLabel: { fontSize: fontSizes.xs, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: spacing.sm, fontFamily: fonts.heavy },
  partyName: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy, marginBottom: spacing.xs },
  partyDetail: { fontSize: fontSizes.xs + 1, color: colors.textSecondary, fontFamily: fonts.medium, marginBottom: 2 },

  lineItemsCard: { backgroundColor: colors.cardBg, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  sectionTitle: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy, marginBottom: spacing.lg },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  lineItemLeft: { flex: 1 },
  lineItemName: { fontSize: fontSizes.sm + 1, fontWeight: '600', color: colors.textPrimary, fontFamily: fonts.medium },
  lineItemDesc: { fontSize: fontSizes.xs + 1, color: colors.textTertiary, fontFamily: fonts.medium },
  lineItemAmount: { fontSize: fontSizes.base, fontWeight: '700', color: colors.textPrimary, fontFamily: fonts.heavy },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  totalLabel: { fontSize: fontSizes.sm + 1, color: colors.textSecondary, fontFamily: fonts.medium },
  totalValue: { fontSize: fontSizes.sm + 1, color: colors.textPrimary, fontFamily: fonts.medium },

  paymentInfoCard: { backgroundColor: colors.cardBg, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: fontSizes.xs + 1, color: colors.textTertiary, fontFamily: fonts.medium },
  infoValue: { fontSize: fontSizes.sm, fontWeight: '600', color: colors.textPrimary, fontFamily: fonts.medium },
});
