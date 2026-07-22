import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Invoice, InvoiceStatus } from '../types';
import { formatCurrency, formatShortDate } from '../utils/formatters';
import { useTheme } from '../theme/ThemeContext';

const STATUS_CFG: Record<InvoiceStatus, { label: string; color: string; bg: string; border: string }> = {
  sent: { label: 'Sendt', color: '#2563FF', bg: '#EEF4FF', border: '#2563FF' },
  paid: { label: 'Betalt', color: '#15803D', bg: '#F0FDF4', border: '#15803D' },
  overdue: { label: 'Forfalt', color: '#DC2626', bg: '#FEF2F2', border: '#DC2626' },
  // Kreditert original — motpostert, nøytral grå.
  credited: { label: 'Kreditert', color: '#616A76', bg: '#ECECEC', border: '#878E97' },
};

// Selve kreditnotaen (credits_invoice_id satt) — egen lilla merkelapp så den skilles
// fra en kreditert original, selv om begge deler status 'credited'.
const CREDIT_NOTE_CFG = { label: 'Kreditnota', color: '#7C3AED', bg: '#F5F3FF', border: '#7C3AED' };

export function InvoiceCard({
  invoice,
  onPress,
  linkedNumber,
}: {
  invoice: Invoice;
  onPress?: () => void;
  /** Fakturanummeret på den koblede fakturaen (kreditnota↔original) — vises som koblingslinje. */
  linkedNumber?: string;
}) {
  const { colors: C } = useTheme();
  const isCreditNote = !!invoice.creditsInvoiceId;
  const cfg = isCreditNote ? CREDIT_NOTE_CFG : STATUS_CFG[invoice.status];
  const linkText = isCreditNote
    ? `Krediterer ${linkedNumber ?? 'faktura'}`
    : invoice.status === 'credited'
      ? `Kreditert${linkedNumber ? ` av ${linkedNumber}` : ''}`
      : null;
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border, borderLeftColor: cfg.border }]}
      onPress={onPress} activeOpacity={0.7}
    >
      <View style={styles.top}>
        <Text style={[styles.number, { color: C.textSecondary }]}>{invoice.invoiceNumber}</Text>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
      <Text style={[styles.customer, { color: C.textPrimary }]}>{invoice.customerName}</Text>
      {linkText ? (
        <View style={styles.linkRow}>
          <Ionicons name="swap-horizontal" size={13} color={cfg.color} />
          <Text style={[styles.linkText, { color: cfg.color }]}>{linkText}</Text>
        </View>
      ) : null}
      <View style={styles.bottom}>
        <Text style={{ fontSize: 13, color: C.textTertiary }}>Forfall: {formatShortDate(invoice.dueDate)}</Text>
        <Text style={[styles.amount, { color: C.textPrimary }]}>{formatCurrency(invoice.total)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, borderLeftWidth: 4, padding: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  number: { fontSize: 13, fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  customer: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -4, marginBottom: 8 },
  linkText: { fontSize: 12, fontWeight: '600' },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 16, fontWeight: '700' },
});
