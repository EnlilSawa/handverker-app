import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Invoice, InvoiceStatus } from '../types';
import { formatCurrency, formatShortDate } from '../utils/formatters';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  sent: { label: 'Sendt', color: colors.primary, bg: colors.primary + '15' },
  paid: { label: 'Betalt', color: colors.success, bg: colors.success + '15' },
  overdue: { label: 'Forfalt', color: colors.danger, bg: colors.danger + '15' },
};

interface InvoiceCardProps {
  invoice: Invoice;
  onPress?: () => void;
}

export function InvoiceCard({ invoice, onPress }: InvoiceCardProps) {
  const cfg = STATUS_CONFIG[invoice.status];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.left}>
        <Text style={styles.number}>{invoice.invoiceNumber}</Text>
        <Text style={styles.customer}>{invoice.customerName}</Text>
        <Text style={styles.date}>Forfall: {formatShortDate(invoice.dueDate)}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{formatCurrency(invoice.total)}</Text>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textLight} style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  left: { flex: 1, gap: 3 },
  number: { fontSize: 13, fontWeight: '700', color: colors.primary },
  customer: { fontSize: 15, fontWeight: '600', color: colors.textDark },
  date: { fontSize: 12, color: colors.textLight },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 16, fontWeight: '700', color: colors.textDark },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
