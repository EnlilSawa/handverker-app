import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
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
  const { colors: C } = useTheme();
  const invoices = useAppStore((s) => s.invoices);
  const invoicesHasMore = useAppStore((s) => s.invoicesHasMore);
  const invoicesLoadingMore = useAppStore((s) => s.invoicesLoadingMore);
  const loadMoreInvoices = useAppStore((s) => s.loadMoreInvoices);
  const pendingInvoicePreview = useAppStore((s) => s.pendingInvoicePreview);
  const setPendingInvoicePreview = useAppStore((s) => s.setPendingInvoicePreview);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [previewId, setPreviewId] = useState<string | null>(null);

  React.useEffect(() => {
    if (pendingInvoicePreview) {
      setPreviewId(pendingInvoicePreview);
      setPendingInvoicePreview(null);
    }
  }, [pendingInvoicePreview]);

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
    <ThemedScreen>
      <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <Text style={[styles.title, { color: C.textPrimary }]}>Fakturaer</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: '#15803D', backgroundColor: C.cardBg, borderColor: C.border }]}>
          <Text style={[styles.summaryLabel, { color: C.textSecondary }]}>Innbetalt</Text>
          <Text style={[styles.summaryValue, { color: '#15803D' }]}>{formatCurrency(totalPaid)}</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: '#C2410C', backgroundColor: C.cardBg, borderColor: C.border }]}>
          <Text style={[styles.summaryLabel, { color: C.textSecondary }]}>Utestående</Text>
          <Text style={[styles.summaryValue, { color: '#C2410C' }]}>{formatCurrency(totalUnpaid)}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, { backgroundColor: C.cardBg, borderColor: C.border }, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, { color: C.textSecondary }, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={[...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt))}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        onEndReachedThreshold={0.4}
        onEndReached={() => { if (invoicesHasMore) loadMoreInvoices(); }}
        renderItem={({ item }) => (
          <InvoiceCard
            invoice={item}
            onPress={() => setPreviewId(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: C.textTertiary }]}>Ingen fakturaer</Text>
          </View>
        }
        ListFooterComponent={
          invoicesHasMore ? (
            <TouchableOpacity
              style={[styles.loadMore, { borderColor: C.border, backgroundColor: C.cardBg }]}
              onPress={() => loadMoreInvoices()}
              disabled={invoicesLoadingMore}
              activeOpacity={0.7}
            >
              {invoicesLoadingMore ? (
                <ActivityIndicator size="small" color="#2563FF" />
              ) : (
                <Text style={styles.loadMoreText}>Last inn flere</Text>
              )}
            </TouchableOpacity>
          ) : null
        }
      />

      <InvoicePreviewModal invoiceId={previewId} onClose={() => setPreviewId(null)} />
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1 },
  title: { fontSize: 20, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', gap: 12, padding: 20 },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 16 },
  summaryLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8 },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1 },
  filterBtnActive: { backgroundColor: '#0A1B33', borderColor: '#0A1B33' },
  filterText: { fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: '#FFFFFF', fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14 },
  loadMore: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 13,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center' },
  loadMoreText: { fontSize: 14, fontWeight: '600', color: '#2563FF' } });
