import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { useAppStore } from '../../store/appStore';
import { Quote, QuoteStatus } from '../../types';
import { formatCurrency, formatShortDate } from '../../utils/formatters';

const STATUS_CFG: Record<QuoteStatus, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Venter',   color: '#C2410C', bg: '#FFF7ED' },
  accepted: { label: 'Godkjent', color: '#15803D', bg: '#F0FDF4' },
  declined: { label: 'Avslått',  color: '#DC2626', bg: '#FEF2F2' },
  expired:  { label: 'Utgått',   color: '#64748B', bg: '#F8FAFC' },
};

function QuoteRow({ quote, onPress, C }: { quote: Quote; onPress: () => void; C: any }) {
  const cfg = STATUS_CFG[quote.status];
  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: C.cardBg, borderColor: C.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowMain}>
        <Text style={[styles.rowNum, { color: C.textTertiary }]}>{quote.quoteNumber}</Text>
        <Text style={[styles.rowCustomer, { color: C.textPrimary }]} numberOfLines={1}>
          {quote.customerName}
        </Text>
        <Text style={[styles.rowTitle, { color: C.textSecondary }]} numberOfLines={1}>
          {quote.title}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowAmount, { color: C.textPrimary }]}>
          {formatCurrency(quote.totalAmount)}
        </Text>
        <Text style={[styles.rowDate, { color: C.textTertiary }]}>
          {formatShortDate(quote.createdAt)}
        </Text>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.textTertiary} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );
}

export function QuotesScreen({ navigation }: any) {
  const { colors: C } = useTheme();
  const quotes = useAppStore((s) => s.quotes);

  return (
    <ThemedScreen>
      <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <Text style={[styles.title, { color: C.textPrimary }]}>Tilbud</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('NewQuote')}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Nytt tilbud</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={quotes}
        keyExtractor={(q) => q.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <QuoteRow
            quote={item}
            onPress={() => navigation.navigate('QuoteDetail', { quoteId: item.id })}
            C={C}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-outline" size={48} color={C.border} />
            <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>Ingen tilbud ennå</Text>
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>
              Lag ditt første tilbud med "+ Nytt tilbud"
            </Text>
          </View>
        }
      />
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#2563FF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1, padding: 14,
  },
  rowMain: { flex: 1, gap: 2 },
  rowNum: { fontSize: 11, fontWeight: '600' },
  rowCustomer: { fontSize: 15, fontWeight: '600' },
  rowTitle: { fontSize: 13 },
  rowRight: { alignItems: 'flex-end', gap: 3, marginLeft: 8 },
  rowAmount: { fontSize: 14, fontWeight: '700' },
  rowDate: { fontSize: 11 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
});
