import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Invoice, InvoiceStatus } from '../types';
import { formatCurrency, formatShortDate } from '../utils/formatters';

const STATUS_CFG: Record<InvoiceStatus, { label: string; color: string; bg: string; border: string }> = {
  sent: { label: 'Sendt', color: '#2563FF', bg: '#EEF4FF', border: '#2563FF' },
  paid: { label: 'Betalt', color: '#15803D', bg: '#F0FDF4', border: '#15803D' },
  overdue: { label: 'Forfalt', color: '#DC2626', bg: '#FEF2F2', border: '#DC2626' },
};

interface InvoiceCardProps {
  invoice: Invoice;
  onPress?: () => void;
}

export function InvoiceCard({ invoice, onPress }: InvoiceCardProps) {
  const cfg = STATUS_CFG[invoice.status];

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: cfg.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.top}>
        <Text style={styles.number}>{invoice.invoiceNumber}</Text>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
      <Text style={styles.customer}>{invoice.customerName}</Text>
      <View style={styles.bottom}>
        <Text style={styles.date}>Forfall: {formatShortDate(invoice.dueDate)}</Text>
        <Text style={styles.amount}>{formatCurrency(invoice.total)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    padding: 16,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  number: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  customer: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 13, color: '#94A3B8' },
  amount: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
});
