import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/appStore';
import { InvoiceCard } from '../../components/InvoiceCard';
import { InvoicePreviewModal } from '../../components/InvoicePreviewModal';
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
  const [previewId, setPreviewId] = useState<string | null>(null);

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
        <View style={[styles.summaryCard, { borderLeftColor: '#15803D' }]}>
          <Text style={styles.summaryLabel}>Innbetalt</Text>
          <Text style={[styles.summaryValue, { color: '#15803D' }]}>{formatCurrency(totalPaid)}</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: '#C2410C' }]}>
          <Text style={styles.summaryLabel}>Utestående</Text>
          <Text style={[styles.summaryValue, { color: '#C2410C' }]}>{formatCurrency(totalUnpaid)}</Text>
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
            onPress={() => setPreviewId(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Ingen fakturaer</Text>
          </View>
        }
      />

      <InvoicePreviewModal invoiceId={previewId} onClose={() => setPreviewId(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: { fontSize: 20, fontWeight: '600', color: '#1F2937' },
  summaryRow: { flexDirection: 'row', gap: 12, padding: 20 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    padding: 16,
  },
  summaryLabel: { fontSize: 12, color: '#64748B', fontWeight: '500', marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterBtnActive: { backgroundColor: '#0A1B33', borderColor: '#0A1B33' },
  filterText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  filterTextActive: { color: '#FFFFFF', fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#94A3B8' },
});
