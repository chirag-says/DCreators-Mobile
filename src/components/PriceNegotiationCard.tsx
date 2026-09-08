// ============================================================
// PriceNegotiationCard — the symmetric price handshake UI.
// ============================================================
// One presentational component, rendered on BOTH the client and the
// consultant project surfaces (and the bid negotiation chat). It shows the
// price currently on the table, who proposed it, and the role-correct actions:
//
//   • If the pending offer is MINE   → "waiting for them" + Edit offer / Discuss
//   • If the pending offer is THEIRS → Accept ₹X / Counter / Decline
//
// It owns no business logic — the parent wires onAccept/onCounter/onDecline to
// the right service call (project handshake or bid handshake).
// ============================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Handshake, Check, X, MessageCircle, Pencil, Send } from 'lucide-react-native';
import { colors, fonts, fontSizes, spacing, radii, shadows } from '../styles/theme';

export interface PriceNegotiationCardProps {
  amount: number;                       // current proposed/agreed price
  offerBy: 'client' | 'consultant' | null;
  myRole: 'client' | 'consultant';
  otherName?: string;                   // counterparty's display name
  originalBudget?: number | null;       // client's opening budget (reference)
  busy?: boolean;
  onAccept: () => void;
  onCounter: (amount: number) => void;
  onDecline?: () => void;
  declineLabel?: string;                // "Pass on" (consultant) | "Cancel" (client)
  onChat?: () => void;
}

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function PriceNegotiationCard({
  amount, offerBy, myRole, otherName = 'the other party', originalBudget,
  busy = false, onAccept, onCounter, onDecline, declineLabel, onChat,
}: PriceNegotiationCardProps) {
  const [mode, setMode] = useState<'view' | 'counter'>('view');
  const [counterValue, setCounterValue] = useState(String(amount || ''));

  const isMyOffer = offerBy === myRole;
  const priceChanged = originalBudget != null && Number(originalBudget) !== Number(amount);

  function submitCounter() {
    const v = parseFloat(String(counterValue).replace(/[^0-9.]/g, ''));
    if (!v || v <= 0) return;
    onCounter(v);
    setMode('view');
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Handshake size={16} color={colors.teal} />
        <Text style={styles.headerLabel}>PRICE NEGOTIATION</Text>
      </View>

      {/* Current amount on the table */}
      <Text style={styles.amount}>{fmt(amount)}</Text>
      {priceChanged && (
        <Text style={styles.budgetRef}>Original budget: {fmt(originalBudget!)}</Text>
      )}

      {/* Status line */}
      <Text style={styles.statusLine}>
        {isMyOffer
          ? `You proposed this price — waiting for ${otherName} to respond.`
          : `${otherName} proposed this price. Accept it, or send a counter-offer.`}
      </Text>

      {mode === 'counter' ? (
        // ── Counter input ──────────────────────────────────────
        <View style={styles.counterBlock}>
          <View style={styles.amountInputRow}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput
              style={styles.amountField}
              value={counterValue}
              onChangeText={setCounterValue}
              keyboardType="decimal-pad"
              placeholder="Enter your price"
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => setMode('view')} disabled={busy}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={submitCounter} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" size="small" /> : (
                <><Send size={15} color="#fff" /><Text style={styles.btnPrimaryText}>Send Counter</Text></>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : isMyOffer ? (
        // ── My pending offer: edit / discuss / withdraw ────────
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => { setCounterValue(String(amount)); setMode('counter'); }} disabled={busy}>
            <Pencil size={15} color={colors.primary} />
            <Text style={styles.btnOutlineText}>Edit Offer</Text>
          </TouchableOpacity>
          {onChat && (
            <TouchableOpacity style={[styles.btn, styles.btnTeal]} onPress={onChat} disabled={busy}>
              <MessageCircle size={15} color="#fff" />
              <Text style={styles.btnPrimaryText}>Discuss</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        // ── Their pending offer: accept / counter / decline ────
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary, styles.btnWide]} onPress={onAccept} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" size="small" /> : (
              <><Check size={16} color="#fff" /><Text style={styles.btnPrimaryText}>Accept {fmt(amount)}</Text></>
            )}
          </TouchableOpacity>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => { setCounterValue(String(amount)); setMode('counter'); }} disabled={busy}>
              <Pencil size={15} color={colors.primary} />
              <Text style={styles.btnOutlineText}>Counter</Text>
            </TouchableOpacity>
            {onChat && (
              <TouchableOpacity style={[styles.btn, styles.btnTeal]} onPress={onChat} disabled={busy}>
                <MessageCircle size={15} color="#fff" />
                <Text style={styles.btnPrimaryText}>Discuss</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Decline / pass / cancel — always available, de-emphasised */}
      {onDecline && mode === 'view' && (
        <TouchableOpacity style={styles.declineRow} onPress={onDecline} disabled={busy}>
          <X size={14} color={colors.error} />
          <Text style={styles.declineText}>{declineLabel || 'Decline'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.xl, backgroundColor: colors.cardBg, borderRadius: radii.lg,
    padding: spacing.xl, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.teal,
    ...shadows.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  headerLabel: { fontSize: fontSizes.xs, fontWeight: '700', fontFamily: fonts.heavy, color: colors.teal, letterSpacing: 0.6 },

  amount: { fontSize: 30, fontWeight: '900', fontFamily: fonts.heavy, color: colors.primary },
  budgetRef: { fontSize: fontSizes.xs + 1, fontFamily: fonts.body, color: colors.textTertiary, marginTop: 2 },
  statusLine: { fontSize: fontSizes.sm + 1, fontFamily: fonts.body, color: colors.textSecondary, lineHeight: 19, marginTop: spacing.sm, marginBottom: spacing.lg },

  actions: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },

  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderRadius: radii.md },
  btnWide: { width: '100%' },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: '#fff', fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.heavy },
  btnTeal: { backgroundColor: colors.teal },
  btnOutline: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.cardBg },
  btnOutlineText: { color: colors.primary, fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.heavy },
  btnGhost: { borderWidth: 1.5, borderColor: colors.borderInput, backgroundColor: colors.cardBg },
  btnGhostText: { color: colors.textSecondary, fontSize: fontSizes.sm + 1, fontWeight: '700', fontFamily: fonts.medium },

  counterBlock: { gap: spacing.md },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.borderInput, borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.inputBg, gap: 6 },
  rupee: { fontSize: 20, fontWeight: '700', fontFamily: fonts.heavy, color: colors.primary },
  amountField: { flex: 1, fontSize: fontSizes.base, fontFamily: fonts.body, color: colors.textPrimary },

  declineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.md, paddingVertical: spacing.sm },
  declineText: { color: colors.error, fontSize: fontSizes.sm, fontWeight: '600', fontFamily: fonts.medium },
});
