import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { JobCard } from '../../components/JobCard';
import { formatCurrency, formatShortDate } from '../../utils/formatters';
import { Job, JobStatus } from '../../types';

// Completed jobs live in Archive — only active statuses on the board
const COLUMNS: { status: JobStatus; label: string }[] = [
  { status: 'new', label: 'Ny' },
  { status: 'in_progress', label: 'Pågår' },
];

const STATUS_CFG: Record<JobStatus, { label: string; color: string; bg: string }> = {
  new: { label: 'Ny', color: '#2563FF', bg: '#EEF4FF' },
  in_progress: { label: 'Pågår', color: '#C2410C', bg: '#FFF7ED' },
  completed: { label: 'Ferdig', color: '#15803D', bg: '#F0FDF4' },
};

function greeting() {
  const h = new Date().getHours();
  if (h < 10) return 'God morgen';
  if (h < 17) return 'God dag';
  return 'God kveld';
}

// ─── Web: stat card ───────────────────────────────────────────────────────────

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  const { colors: C } = useTheme();
  return (
    <View style={[statCard.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
      <Text style={[statCard.label, { color: C.textSecondary }]}>{label}</Text>
      <Text style={[statCard.value, { color }]}>{value}</Text>
      {sub ? <Text style={[statCard.sub, { color: C.textTertiary }]}>{sub}</Text> : null}
    </View>
  );
}

const statCard = StyleSheet.create({
  card: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 20, gap: 6 },
  label: { fontSize: 13, fontWeight: '500' },
  value: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  sub: { fontSize: 12 },
});

// ─── Web: jobs table ──────────────────────────────────────────────────────────

function JobsTable({ jobs, navigation }: { jobs: Job[]; navigation: any }) {
  const { colors: C } = useTheme();
  return (
    <View style={[table.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
      <View style={[table.header, { backgroundColor: C.cardAlt, borderBottomColor: C.border }]}>
        <Text style={[table.th, { flex: 2, color: C.textSecondary }]}>KUNDE</Text>
        <Text style={[table.th, { flex: 2, color: C.textSecondary }]}>BESKRIVELSE</Text>
        <Text style={[table.th, { flex: 1.5, color: C.textSecondary }]}>TEKNIKER</Text>
        <Text style={[table.th, { flex: 1, color: C.textSecondary }]}>DATO</Text>
        <Text style={[table.th, { flex: 1, textAlign: 'right', color: C.textSecondary }]}>STATUS</Text>
      </View>
      {jobs.length === 0 ? (
        <View style={table.empty}>
          <Text style={[table.emptyText, { color: C.textTertiary }]}>Ingen jobber å vise</Text>
        </View>
      ) : (
        jobs.map((job, i) => {
          const cfg = STATUS_CFG[job.status];
          return (
            <TouchableOpacity
              key={job.id}
              style={[table.row, { backgroundColor: C.cardBg, borderBottomColor: C.border }, i % 2 === 1 && { backgroundColor: C.cardAlt }]}
              onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
              activeOpacity={0.7}
            >
              <Text style={[table.tdBold, { flex: 2, color: C.textPrimary }]} numberOfLines={1}>
                {job.customerName}
              </Text>
              <Text style={[table.td, { flex: 2, color: C.textSecondary }]} numberOfLines={1}>
                {job.description}
              </Text>
              <Text style={[table.td, { flex: 1.5, color: C.textSecondary }]} numberOfLines={1}>
                {job.assignedTechnicianName ?? '—'}
              </Text>
              <Text style={[table.td, { flex: 1, color: C.textSecondary }]}>
                {formatShortDate(job.scheduledAt)}
              </Text>
              <View style={[table.badgeWrap, { flex: 1, alignItems: 'flex-end' }]}>
                <View style={[table.badge, { backgroundColor: cfg.bg }]}>
                  <Text style={[table.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

const table = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  th: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  rowAlt: {},
  tdBold: { fontSize: 14, fontWeight: '600' },
  td: { fontSize: 14 },
  badgeWrap: { flexDirection: 'row' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14 },
});

// ─── Web layout ───────────────────────────────────────────────────────────────

function WebJobBoard({ navigation }: { navigation: any }) {
  const { pageBg, colors: C } = useTheme();
  const jobs = useAppStore((s) => s.jobs);
  const invoices = useAppStore((s) => s.invoices);
  const currentUser = useAppStore((s) => s.currentUser);

  const todayStr = new Date().toISOString().split('T')[0];
  const firstName = currentUser?.name?.split(' ')[0] ?? '';
  const dateLabel = new Date().toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const stats = useMemo(() => {
    const monthRevenue = invoices
      .filter((inv) => inv.status === 'paid' && inv.createdAt.startsWith(todayStr.slice(0, 7)))
      .reduce((s, inv) => s + inv.total, 0);
    const active = jobs.filter((j) => j.status === 'in_progress').length;
    const nyeJobs = jobs.filter((j) => j.status === 'new').length;
    const unpaid = invoices.filter((inv) => inv.status !== 'paid').length;
    return { monthRevenue, active, nyeJobs, unpaid };
  }, [jobs, invoices, todayStr]);

  const sortedJobs = useMemo(
    () => [...jobs]
      .filter((j) => j.status !== 'completed')
      .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)),
    [jobs]
  );

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>
      {/* Top bar */}
      <View style={[web.topBar, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <View>
          <Text style={[web.pageTitle, { color: C.textPrimary }]}>Jobbtavle</Text>
          <Text style={[web.pageDate, { color: C.textSecondary }]}>{greeting()}{firstName ? `, ${firstName}` : ''} · {dateLabel}</Text>
        </View>
        <TouchableOpacity style={web.addBtn} onPress={() => navigation.navigate('NewJob')}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={web.addBtnText}>Ny jobb</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={web.content}>
        {/* 4 stat cards */}
        <View style={web.statRow}>
          <StatCard label="Total inntekt" value={formatCurrency(stats.monthRevenue)} color="#15803D" sub="denne måneden" />
          <StatCard label="Aktive jobber" value={String(stats.active)} color="#2563FF" />
          <StatCard label="Nye jobber" value={String(stats.nyeJobs)} color="#2563FF" />
          <StatCard label="Ubetalte fakturaer" value={String(stats.unpaid)} color="#DC2626" />
        </View>

        {/* Jobs table */}
        <View style={web.sectionHeader}>
          <Text style={[web.sectionTitle, { color: C.textPrimary }]}>Alle jobber</Text>
        </View>
        <JobsTable jobs={sortedJobs} navigation={navigation} />
      </ScrollView>
    </View>
  );
}

const web = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  pageTitle: { fontSize: 20, fontWeight: '600' },
  pageDate: { fontSize: 13, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#000000',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  content: { padding: 24, gap: 24 },
  statRow: { flexDirection: 'row', gap: 16 },
  sectionHeader: { marginBottom: -8 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
});

// ─── Mobile layout ────────────────────────────────────────────────────────────

function MobileJobBoard({ navigation }: { navigation: any }) {
  const { colors: C } = useTheme();
  const jobs = useAppStore((s) => s.jobs);
  const invoices = useAppStore((s) => s.invoices);
  const currentUser = useAppStore((s) => s.currentUser);
  const [activeColumn, setActiveColumn] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const COLUMN_WIDTH = width - 40;
  const todayStr = new Date().toISOString().split('T')[0];
  const firstName = currentUser?.name?.split(' ')[0] ?? '';

  const stats = useMemo(() => {
    const monthRevenue = invoices
      .filter((inv) => inv.status === 'paid' && inv.createdAt.startsWith(todayStr.slice(0, 7)))
      .reduce((s, inv) => s + inv.total, 0);
    const active = jobs.filter((j) => j.status === 'in_progress').length;
    const unpaid = invoices.filter((inv) => inv.status !== 'paid').length;
    return { monthRevenue, active, unpaid };
  }, [jobs, invoices, todayStr]);

  const columns = useMemo(
    () => COLUMNS.map((col) => ({ ...col, jobs: jobs.filter((j) => j.status === col.status) })),
    [jobs]
  );

  const scrollToColumn = (index: number) => {
    setActiveColumn(index);
    scrollRef.current?.scrollTo({ x: index * (COLUMN_WIDTH + 16), animated: true });
  };

  const dateLabel = new Date().toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <ThemedScreen>
      <View style={[mobile.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <View>
          <Text style={[mobile.greeting, { color: C.textPrimary }]}>{greeting()}{firstName ? `, ${firstName}` : ''}</Text>
          <Text style={[mobile.date, { color: C.textSecondary }]}>{dateLabel}</Text>
        </View>
        <TouchableOpacity style={mobile.addBtn} onPress={() => navigation.navigate('NewJob')}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* 3 stat tiles */}
      <View style={[mobile.statsRow, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        {[
          { label: 'Inntekt mnd.', value: formatCurrency(stats.monthRevenue), color: '#15803D' },
          { label: 'Aktive jobber', value: String(stats.active), color: '#2563FF' },
          { label: 'Ubetalte', value: String(stats.unpaid), color: '#DC2626' },
        ].map((s) => (
          <View key={s.label} style={[mobile.statTile, { backgroundColor: C.cardBg, borderColor: C.border }]}>
            <Text style={[mobile.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={mobile.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Tab switcher */}
      <View style={[mobile.tabBar, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        {columns.map((col, index) => {
          const cfg = STATUS_CFG[col.status];
          const isActive = activeColumn === index;
          return (
            <TouchableOpacity
              key={col.status}
              style={[mobile.tab, isActive && mobile.tabActive]}
              onPress={() => scrollToColumn(index)}
            >
              <Text style={[mobile.tabText, isActive && mobile.tabTextActive]}>
                {col.label}
              </Text>
              <View style={[mobile.tabBadge, { backgroundColor: isActive ? '#ECECEC' : '#ECECEC' }]}>
                <Text style={[mobile.tabBadgeText, { color: isActive ? '#000000' : '#878E97' }]}>
                  {col.jobs.length}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={COLUMN_WIDTH + 16}
        decelerationRate="fast"
        contentContainerStyle={[mobile.swipeKanban, { paddingHorizontal: 20 }]}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / (COLUMN_WIDTH + 16));
          setActiveColumn(Math.max(0, Math.min(index, 2)));
        }}
      >
        {columns.map((col) => (
          <View key={col.status} style={{ width: COLUMN_WIDTH }}>
            {col.jobs.length === 0 ? (
              <View style={mobile.emptyCol}>
                <Ionicons name="checkmark-circle-outline" size={28} color="#E5E5E5" />
                <Text style={mobile.emptyText}>Ingen jobber</Text>
              </View>
            ) : (
              col.jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
                />
              ))
            )}
          </View>
        ))}
      </ScrollView>
    </ThemedScreen>
  );
}

const mobile = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    
    borderBottomWidth: 1,
  },
  greeting: { fontSize: 20, fontWeight: '600' },
  date: { fontSize: 13, marginTop: 2 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 1,
  },
  statTile: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#000000' },
  tabText: { fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: '#000000', fontWeight: '600' },
  tabBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  tabBadgeText: { fontSize: 11, fontWeight: '700' },
  swipeKanban: { paddingVertical: 16, gap: 16 },
  emptyCol: { alignItems: 'center', paddingTop: 48, gap: 8 },
  emptyText: { fontSize: 13 },
});

// ─── Export ───────────────────────────────────────────────────────────────────

export function JobBoardScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  if (width >= 768) return <WebJobBoard navigation={navigation} />;
  return <MobileJobBoard navigation={navigation} />;
}
