import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, useWindowDimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { Job } from '../../types';
import { formatShortDate } from '../../utils/formatters';

const STATUS_CFG = {
  sent: { label: 'Sendt', color: '#2563FF', bg: '#EEF4FF' },
  paid: { label: 'Betalt', color: '#15803D', bg: '#F0FDF4' },
  overdue: { label: 'Forfalt', color: '#DC2626', bg: '#FEF2F2' },
};

// ─── Web table row ────────────────────────────────────────────────────────────

function TableRow({ job, index, invoice, imageCount, onPress }: {
  job: Job;
  index: number;
  invoice: any;
  imageCount: number;
  onPress: () => void;
}) {
  const inv = invoice ? STATUS_CFG[invoice.status as keyof typeof STATUS_CFG] : null;

  return (
    <TouchableOpacity
      style={[table.row, index % 2 === 1 && table.rowAlt]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[table.tdBold, { flex: 2 }]} numberOfLines={1}>{job.customerName}</Text>
      <Text style={[table.td, { flex: 2 }]} numberOfLines={1}>{job.description}</Text>
      <Text style={[table.td, { flex: 1.5 }]} numberOfLines={1}>{job.assignedTechnicianName ?? '—'}</Text>
      <Text style={[table.td, { flex: 1 }]}>{formatShortDate(job.updatedAt)}</Text>
      <View style={[table.cell, { flex: 1 }]}>
        {inv ? (
          <View style={[table.badge, { backgroundColor: inv.bg }]}>
            <Text style={[table.badgeText, { color: inv.color }]}>{inv.label}</Text>
          </View>
        ) : <Text style={table.td}>—</Text>}
      </View>
      <View style={[table.cell, { flex: 0.8, justifyContent: 'flex-end' }]}>
        {imageCount > 0 ? (
          <View style={table.imagesPill}>
            <Ionicons name="image-outline" size={12} color="#64748B" />
            <Text style={table.imagesPillText}>{imageCount}</Text>
          </View>
        ) : (
          <Text style={[table.td, { color: '#CBD5E1' }]}>—</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const table = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  rowAlt: { backgroundColor: '#F8FAFC' },
  cell: { flexDirection: 'row', alignItems: 'center' },
  tdBold: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  td: { fontSize: 14, color: '#64748B' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  imagesPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  imagesPillText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
});

// ─── Mobile card ──────────────────────────────────────────────────────────────

function MobileCard({ job, invoice, imageCount, onPress }: { job: Job; invoice: any; imageCount: number; onPress: () => void }) {
  const inv = invoice ? STATUS_CFG[invoice.status as keyof typeof STATUS_CFG] : null;
  return (
    <TouchableOpacity style={card.container} onPress={onPress} activeOpacity={0.7}>
      <View style={card.top}>
        <Text style={card.name} numberOfLines={1}>{job.customerName}</Text>
        {inv && (
          <View style={[card.badge, { backgroundColor: inv.bg }]}>
            <Text style={[card.badgeText, { color: inv.color }]}>{inv.label}</Text>
          </View>
        )}
      </View>
      <Text style={card.desc} numberOfLines={1}>{job.description}</Text>
      <View style={card.bottom}>
        <Text style={card.meta}>{job.assignedTechnicianName ?? 'Ingen tekniker'}</Text>
        <Text style={card.meta}>Fullført {formatShortDate(job.updatedAt)}</Text>
        {imageCount > 0 && (
          <View style={card.imagesPill}>
            <Ionicons name="image-outline" size={11} color="#64748B" />
            <Text style={card.imagesPillText}>{imageCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', borderLeftWidth: 4, borderLeftColor: '#64748B', padding: 16, marginBottom: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '600', color: '#1F2937', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  desc: { fontSize: 13, color: '#64748B', marginBottom: 8 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  meta: { fontSize: 12, color: '#94A3B8' },
  imagesPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  imagesPillText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
});


// ─── Main screen ─────────────────────────────────────────────────────────────

export function ArchiveScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const jobs = useAppStore((s) => s.jobs);
  const invoices = useAppStore((s) => s.invoices);
  const jobImages = useAppStore((s) => s.jobImages);

  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const archivedJobs = useMemo(
    () => [...jobs.filter((j) => j.status === 'completed')]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [jobs]
  );

  const months = useMemo(() => {
    const set = new Set<string>();
    archivedJobs.forEach((j) => {
      const d = new Date(j.updatedAt);
      const label = d.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' });
      set.add(label);
    });
    return [...set];
  }, [archivedJobs]);

  const filtered = useMemo(() => {
    let result = archivedJobs;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (j) => j.customerName.toLowerCase().includes(q) || j.description.toLowerCase().includes(q)
      );
    }
    if (selectedMonth) {
      result = result.filter((j) => {
        const d = new Date(j.updatedAt);
        return d.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' }) === selectedMonth;
      });
    }
    return result;
  }, [archivedJobs, search, selectedMonth]);

  const getInvoice = (jobId: string) => invoices.find((inv) => inv.jobId === jobId);
  const getImageCount = (jobId: string) => (jobImages[jobId] ?? []).length;

  const goToDetail = (job: Job) => navigation.navigate('ArchiveDetail', { jobId: job.id });

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Arkiv</Text>
          <Text style={styles.count}>{archivedJobs.length} fullførte jobber</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Søk på kunde eller beskrivelse…"
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.monthWrap}>
            <TouchableOpacity
              style={[styles.monthBtn, showMonthPicker && styles.monthBtnOpen]}
              onPress={() => setShowMonthPicker((v) => !v)}
            >
              <Ionicons name="calendar-outline" size={15} color="#64748B" />
              <Text style={styles.monthBtnText}>{selectedMonth || 'Alle måneder'}</Text>
              <Ionicons name={showMonthPicker ? 'chevron-up' : 'chevron-down'} size={14} color="#64748B" />
            </TouchableOpacity>

            {showMonthPicker && (
              <View style={styles.monthDropdown}>
                {(['', ...months] as string[]).map((m) => (
                  <TouchableOpacity
                    key={m || '__all'}
                    style={[styles.monthOption, selectedMonth === m && styles.monthOptionActive]}
                    onPress={() => { setSelectedMonth(m); setShowMonthPicker(false); }}
                  >
                    <Text style={[styles.monthOptionText, selectedMonth === m && styles.monthOptionTextActive]}>
                      {m || 'Alle måneder'}
                    </Text>
                    {selectedMonth === m && (
                      <Ionicons name="checkmark" size={14} color="#2563FF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Transparent backdrop — closes dropdown on outside tap */}
      {showMonthPicker && (
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={() => setShowMonthPicker(false)}
          activeOpacity={1}
        />
      )}

      {/* Content */}
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="archive-outline" size={36} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>
            {archivedJobs.length === 0 ? 'Ingen arkiverte jobber ennå' : 'Ingen treff'}
          </Text>
          <Text style={styles.emptyText}>
            {archivedJobs.length === 0
              ? 'Fullførte jobber vises her automatisk'
              : 'Prøv et annet søkeord eller fjern filteret'}
          </Text>
        </View>
      ) : isWide ? (
        /* Web table */
        <ScrollView contentContainerStyle={styles.tableWrap}>
          <View style={styles.tableCard}>
            <View style={table.row} pointerEvents="none">
              <Text style={[styles.th, { flex: 2 }]}>KUNDE</Text>
              <Text style={[styles.th, { flex: 2 }]}>BESKRIVELSE</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>TEKNIKER</Text>
              <Text style={[styles.th, { flex: 1 }]}>DATO FULLFØRT</Text>
              <Text style={[styles.th, { flex: 1 }]}>FAKTURA</Text>
              <Text style={[styles.th, { flex: 0.8, textAlign: 'right' }]}>BILDER</Text>
            </View>
            {filtered.map((job, i) => (
              <TableRow
                key={job.id}
                job={job}
                index={i}
                invoice={getInvoice(job.id)}
                imageCount={getImageCount(job.id)}
                onPress={() => goToDetail(job)}
              />
            ))}
          </View>
        </ScrollView>
      ) : (
        /* Mobile list */
        <FlatList
          data={filtered}
          keyExtractor={(j) => j.id}
          contentContainerStyle={styles.mobileList}
          renderItem={({ item }) => (
            <MobileCard
              job={item}
              invoice={getInvoice(item.id)}
              imageCount={getImageCount(item.id)}
              onPress={() => goToDetail(item)}
            />
          )}
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexWrap: 'wrap',
    gap: 12,
  },
  headerLeft: { gap: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 20, fontWeight: '600', color: '#1F2937' },
  count: { fontSize: 13, color: '#64748B' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 240,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1F2937', outlineStyle: 'none' } as any,
  monthWrap: { position: 'relative', zIndex: 200 },
  monthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  monthBtnOpen: { borderColor: '#2563FF', backgroundColor: '#EEF4FF' },
  monthBtnText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  monthDropdown: {
    position: 'absolute',
    top: 42,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 190,
    overflow: 'hidden',
    zIndex: 201,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  monthOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  monthOptionActive: { backgroundColor: '#EEF4FF' },
  monthOptionText: { fontSize: 14, color: '#1F2937' },
  monthOptionTextActive: { color: '#2563FF', fontWeight: '600' },
  tableWrap: { padding: 24 },
  tableCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  th: { fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, backgroundColor: '#F8FAFC' },
  mobileList: { padding: 16, paddingBottom: 40 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', paddingHorizontal: 40 },
});
