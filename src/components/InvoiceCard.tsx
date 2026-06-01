import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Invoice, InvoiceStatus } from '../types';
import { formatCurrency, formatShortDate } from '../utils/formatters';
import { useTheme } from '../theme/ThemeContext';

const STATUS_CFG: Record<InvoiceStatus, { label: string; color: string; bg: string; border: string }> = {
  sent: { label: 'Sendt', color: '#2563FF', bg: '#EEF4FF', border: '#2563FF' },
  paid: { label: 'Betalt', color: '#15803D', bg: '#F0FDF4', border: '#15803D' },
  overdue: { label: 'Forfalt', color: '#DC2626', bg: '#FEF2F2', border: '#DC2626' },
};

export function InvoiceCard({ invoice, onPress }: { invoice: Invoice; onPress?: () => void }) {
  const { colors: C } = useTheme();
  const cfg = STATUS_CFG[invoice.status];
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
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 16, fontWeight: '700' },
});
