import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, useWindowDimensions,
  FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
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
  const { colors: C } = useTheme();
  const inv = invoice ? STATUS_CFG[invoice.status as keyof typeof STATUS_CFG] : null;

  return (
    <TouchableOpacity
      style={[table.row, { backgroundColor: index % 2 === 1 ? C.cardAlt : C.cardBg, borderBottomColor: C.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[table.tdBold, { flex: 2, color: C.textPrimary }]} numberOfLines={1}>{job.customerName}</Text>
      <Text style={[table.td, { flex: 2, color: C.textSecondary }]} numberOfLines={1}>{job.description}</Text>
      <Text style={[table.td, { flex: 1.5, color: C.textSecondary }]} numberOfLines={1}>{job.assignedTechnicianName ?? '—'}</Text>
      <Text style={[table.td, { flex: 1, color: C.textSecondary }]}>{formatShortDate(job.updatedAt)}</Text>
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
    // no backgroundColor — applied inline with C.cardBg/C.cardAlt
  },
  cell: { flexDirection: 'row', alignItems: 'center' },
  tdBold: { fontSize: 14, fontWeight: '600' },
  td: { fontSize: 14 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  imagesPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  imagesPillText: { fontSize: 11, fontWeight: '600' },
});

// ─── Mobile card ──────────────────────────────────────────────────────────────

function MobileCard({ job, invoice, imageCount, onPress }: { job: Job; invoice: any; imageCount: number; onPress: () => void }) {
  const { colors: C } = useTheme();
  const inv = invoice ? STATUS_CFG[invoice.status as keyof typeof STATUS_CFG] : null;
  return (
    <TouchableOpacity style={[card.container, { backgroundColor: C.cardBg, borderColor: C.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={card.top}>
        <Text style={[card.name, { color: C.textPrimary }]} numberOfLines={1}>{job.customerName}</Text>
        {inv && (
          <View style={[card.badge, { backgroundColor: inv.bg }]}>
            <Text style={[card.badgeText, { color: inv.color }]}>{inv.label}</Text>
          </View>
        )}
      </View>
      <Text style={[card.desc, { color: C.textSecondary }]} numberOfLines={1}>{job.description}</Text>
      <View style={card.bottom}>
        <Text style={[card.meta, { color: C.textTertiary }]}>{job.assignedTechnicianName ?? 'Ingen tekniker'}</Text>
        <Text style={[card.meta, { color: C.textTertiary }]}>Fullført {formatShortDate(job.updatedAt)}</Text>
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
  container: { borderRadius: 12, borderWidth: 1, borderLeftWidth: 4, borderLeftColor: '#64748B', padding: 16, marginBottom: 10 },
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
  const { colors: C } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const jobs = useAppStore((s) => s.jobs);
  const invoices = useAppStore((s) => s.invoices);
  const jobImages = useAppStore((s) => s.jobImages);
  const archiveHasMore = useAppStore((s) => s.archiveHasMore);
  const archiveLoadingMore = useAppStore((s) => s.archiveLoadingMore);
  const loadMoreArchive = useAppStore((s) => s.loadMoreArchive);

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

  // «Last inn flere» — laster neste side med fullførte jobber fra databasen.
  // Vises kun når det finnes flere rader på serveren (archiveHasMore). Filteret
  // over (søk/måned) er rent klient-side og påvirker ikke pagineringen.
  const loadMoreBtn = archiveHasMore ? (
    <TouchableOpacity
      style={[styles.loadMore, { borderColor: C.border, backgroundColor: C.cardBg }]}
      onPress={() => loadMoreArchive()}
      disabled={archiveLoadingMore}
      activeOpacity={0.7}
    >
      {archiveLoadingMore ? (
        <ActivityIndicator size="small" color="#2563FF" />
      ) : (
        <Text style={styles.loadMoreText}>Last inn flere</Text>
      )}
    </TouchableOpacity>
  ) : null;

  return (
    <ThemedScreen>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: C.textPrimary }]}>Arkiv</Text>
          <Text style={[styles.count, { color: C.textSecondary }]}>{archivedJobs.length} fullførte jobber</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.searchBox, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
            <Ionicons name="search-outline" size={16} color={C.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: C.textPrimary }]}
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
              style={[styles.monthBtn, { backgroundColor: C.cardAlt, borderColor: C.border }, showMonthPicker && styles.monthBtnOpen]}
              onPress={() => setShowMonthPicker((v) => !v)}
            >
              <Ionicons name="calendar-outline" size={15} color="#64748B" />
              <Text style={[styles.monthBtnText, { color: C.textSecondary }]}>{selectedMonth || 'Alle måneder'}</Text>
              <Ionicons name={showMonthPicker ? 'chevron-up' : 'chevron-down'} size={14} color="#64748B" />
            </TouchableOpacity>

            {showMonthPicker && (
              <View style={[styles.monthDropdown, { backgroundColor: C.cardBg, borderColor: C.border }]}>
                {(['', ...months] as string[]).map((m) => (
                  <TouchableOpacity
                    key={m || '__all'}
                    style={[styles.monthOption, { borderBottomColor: C.border, backgroundColor: C.cardBg }, selectedMonth === m && { backgroundColor: '#EEF4FF' }]}
                    onPress={() => { setSelectedMonth(m); setShowMonthPicker(false); }}
                  >
                    <Text style={[styles.monthOptionText, { color: C.textPrimary }, selectedMonth === m && styles.monthOptionTextActive]}>
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

      {/* Transparent backdrop — closes dropdown on outside tap. zIndex under headeren
          (30) men over innholdet, så dropdownen er klikkbar og fanger utsideklikk. */}
      {showMonthPicker && (
        <TouchableOpacity
          style={[StyleSheet.absoluteFill, { zIndex: 20 }]}
          onPress={() => setShowMonthPicker(false)}
          activeOpacity={1}
        />
      )}

      {/* Content */}
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: C.cardAlt }]}>
            <Ionicons name="archive-outline" size={36} color={C.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
            {archivedJobs.length === 0 ? 'Ingen arkiverte jobber ennå' : 'Ingen treff'}
          </Text>
          <Text style={[styles.emptyText, { color: C.textSecondary }]}>
            {archivedJobs.length === 0
              ? 'Fullførte jobber vises her automatisk'
              : 'Prøv et annet søkeord eller fjern filteret'}
          </Text>
          {/* Filteret kan skjule alle lastede rader mens det finnes eldre på
              serveren — la brukeren fortsatt hente dem inn. */}
          {loadMoreBtn}
        </View>
      ) : isWide ? (
        /* Web table */
        <ScrollView contentContainerStyle={styles.tableWrap}>
          <View style={[styles.tableCard, { backgroundColor: C.cardBg, borderColor: C.border }]}>
            <View style={[table.row, { backgroundColor: C.cardAlt, borderBottomColor: C.border }]} pointerEvents="none">
              <Text style={[styles.th, { flex: 2, color: C.textSecondary }]}>KUNDE</Text>
              <Text style={[styles.th, { flex: 2, color: C.textSecondary }]}>BESKRIVELSE</Text>
              <Text style={[styles.th, { flex: 1.5, color: C.textSecondary }]}>TEKNIKER</Text>
              <Text style={[styles.th, { flex: 1, color: C.textSecondary }]}>DATO FULLFØRT</Text>
              <Text style={[styles.th, { flex: 1, color: C.textSecondary }]}>FAKTURA</Text>
              <Text style={[styles.th, { flex: 0.8, textAlign: 'right', color: C.textSecondary }]}>BILDER</Text>
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
          {loadMoreBtn}
        </ScrollView>
      ) : (
        /* Mobile list */
        <FlatList
          data={filtered}
          keyExtractor={(j) => j.id}
          contentContainerStyle={styles.mobileList}
          onEndReachedThreshold={0.4}
          onEndReached={() => { if (archiveHasMore) loadMoreArchive(); }}
          renderItem={({ item }) => (
            <MobileCard
              job={item}
              invoice={getInvoice(item.id)}
              imageCount={getImageCount(item.id)}
              onPress={() => goToDetail(item)}
            />
          )}
          ListFooterComponent={loadMoreBtn}
        />
      )}

    </ThemedScreen>
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
    borderBottomWidth: 1,
    flexWrap: 'wrap',
    gap: 12,
    // Løft hele headeren (og dens absolutt-posisjonerte dropdown) over innholdet
    // under — ellers males månedsdropdownen bak tabellen på web (RN Web stacking).
    position: 'relative',
    zIndex: 30,
  },
  headerLeft: { gap: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 20, fontWeight: '600' },
  count: { fontSize: 13 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 240,
  },
  searchInput: { flex: 1, fontSize: 14, outlineStyle: 'none' } as any,
  monthWrap: { position: 'relative', zIndex: 200 },
  monthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
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
    borderRadius: 12,
    borderWidth: 1,
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
  },
  monthOptionActive: { backgroundColor: '#EEF4FF' },
  monthOptionText: { fontSize: 14 },
  monthOptionTextActive: { color: '#2563FF', fontWeight: '600' },
  tableWrap: { padding: 24 },
  loadMore: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 13,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: { fontSize: 14, fontWeight: '600', color: '#2563FF' },
  tableCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  th: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  mobileList: { padding: 16, paddingBottom: 40 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
});
