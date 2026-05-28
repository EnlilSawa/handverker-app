import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useAppStore } from '../../store/appStore';
import { InvoiceCard } from '../../components/InvoiceCard';
import { InvoiceStatus } from '../../types';
import { formatCurrency } from '../../utils/formatters';

type FilterKey = 'all' | InvoiceStatus;
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'sent', label: 'Sendt' },
  { key: 'paid', label: 'Betalt' },
  { key: 'overdue', label: 'Forfalt' },
];

export function InvoicesScreen({ navigation }: any) {
  const invoices = useAppStore((s) => s.invoices);
  const [filter, setFilter] = useState<FilterKey>('all');

  const filtered = useMemo(
    () => (filter === 'all' ? invoices : invoices.filter((i) => i.status === filter)),
    [invoices, filter]
  );

  const totalPaid = useMemo(
    () => invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0),
    [invoices]
  );
  const totalUnpaid = useMemo(
    () => invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.total, 0),
    [invoices]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Fakturaer</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Innbetalt</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>{formatCurrency(totalPaid)}</Text>
        </View>
        <View style={[styles.summaryBox, styles.summaryBorderLeft]}>
          <Text style={styles.summaryLabel}>Utestående</Text>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>{formatCurrency(totalUnpaid)}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={[...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt))}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <InvoiceCard
            invoice={item}
            onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Ingen fakturaer</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundSecondary },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.textDark },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryBox: { flex: 1, padding: 16, alignItems: 'center' },
  summaryBorderLeft: { borderLeftWidth: 1, borderLeftColor: colors.border },
  summaryLabel: { fontSize: 12, color: colors.textGray, marginBottom: 2 },
  summaryValue: { fontSize: 18, fontWeight: '700' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
  },
  filterBtnActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 13, color: colors.textGray, fontWeight: '500' },
  filterTextActive: { color: colors.white, fontWeight: '700' },
  list: { padding: 16, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: colors.textLight },
});
