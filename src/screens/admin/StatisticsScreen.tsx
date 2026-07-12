import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { useAppStore, CompanyStats } from '../../store/appStore';
import { formatCurrency } from '../../utils/formatters';

function ProgressRow({ name, revenue, jobs, max }: { name: string; revenue: number; jobs: number; max: number }) {
  const { colors: C } = useTheme();
  const pct = max > 0 ? Math.min((revenue / max) * 100, 100) : 0;
  return (
    <View style={bar.row}>
      <View style={bar.labelRow}>
        <Text style={[bar.name, { color: C.textPrimary }]} numberOfLines={1}>{name.split(' ')[0]}</Text>
        <Text style={[bar.jobs, { color: C.textTertiary }]}>{jobs} jobber</Text>
        <Text style={[bar.amount, { color: C.textPrimary }]}>{formatCurrency(revenue)}</Text>
      </View>
      <View style={[bar.track, { backgroundColor: C.border }]}>
        <View style={[bar.fill, { width: `${pct}%` as any }]} />
      </View>
    </View>
  );
}

const bar = StyleSheet.create({
  row: { marginBottom: 18 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  name: { flex: 1, fontSize: 14, fontWeight: '600' },
  jobs: { fontSize: 13, marginRight: 12 },
  amount: { fontSize: 14, fontWeight: '600' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: '#2563FF' } });

const MINI_STATS = (jobsByStatus: { new: number; in_progress: number; completed: number }, totalJobs: number) => [
  { label: 'Nye', count: jobsByStatus.new, color: '#2563FF', bg: '#EEF4FF' },
  { label: 'Pågår', count: jobsByStatus.in_progress, color: '#C2410C', bg: '#FFF7ED' },
  { label: 'Ferdig', count: jobsByStatus.completed, color: '#15803D', bg: '#F0FDF4' },
  { label: 'Totalt', count: totalJobs, color: undefined, bg: undefined },
];

export function StatisticsScreen() {
  const { colors: C } = useTheme();
  const users = useAppStore((s) => s.users);
  const jobs = useAppStore((s) => s.jobs);
  const invoices = useAppStore((s) => s.invoices);
  const fetchCompanyStats = useAppStore((s) => s.fetchCompanyStats);

  const [data, setData] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Hent aggregatet (get_company_stats-RPC) på nytt når skjermen vises og når
  // jobber/fakturaer endrer seg (mutasjon eller realtime), så tallene er ferske
  // og dekker HELE datasettet — ikke bare de paginerte sidene i store.
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchCompanyStats().then((res) => {
      if (!active) return;
      if (res) setData(res);
      setLoading(false);
    });
    return () => { active = false; };
  }, [fetchCompanyStats, jobs, invoices]);

  const stats = useMemo(() => {
    const byTech: Record<string, { revenue: number; jobs: number }> = {};
    (data?.current_month.by_technician ?? []).forEach((t) => {
      byTech[t.technician_id] = { revenue: t.revenue, jobs: t.jobs };
    });

    const techPerformance = users
      .filter((u) => u.role === 'technician')
      .map((u) => ({
        name: u.name,
        revenue: byTech[u.id]?.revenue ?? 0,
        jobs: byTech[u.id]?.jobs ?? 0 }))
      .sort((a, b) => b.revenue - a.revenue);

    const maxRevenue = Math.max(...techPerformance.map((t) => t.revenue), 1);

    return {
      revenue: data?.current_month.revenue ?? 0,
      jobsByStatus: data?.jobs_by_status ?? { new: 0, in_progress: 0, completed: 0 },
      techPerformance,
      maxRevenue,
      totalJobs: data?.total_jobs ?? 0,
      invoiceStatus: data?.invoice_status ?? {
        paid: { count: 0, amount: 0 },
        sent: { count: 0, amount: 0 },
        overdue: { count: 0, amount: 0 } },
    };
  }, [data, users]);

  const monthName = new Date().toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' });
  const miniStats = MINI_STATS(stats.jobsByStatus, stats.totalJobs);

  if (loading && !data) {
    return (
      <ThemedScreen>
        <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
          <Text style={[styles.title, { color: C.textPrimary }]}>Statistikk</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>{monthName}</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#2563FF" />
        </View>
      </ThemedScreen>
    );
  }

  return (
    <ThemedScreen>
      <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <Text style={[styles.title, { color: C.textPrimary }]}>Statistikk</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>{monthName}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero revenue card */}
        <View style={[styles.heroCard, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <Text style={[styles.heroLabel, { color: C.textSecondary }]}>TOTAL INNTEKT DENNE MÅNEDEN</Text>
          <Text style={[styles.heroNumber, { color: '#34D399' }]}>{formatCurrency(stats.revenue)}</Text>
          <View style={[styles.heroBar, { backgroundColor: C.border }]}>
            <View style={[styles.heroBarFill, { width: stats.revenue > 0 ? '100%' : '0%' }]} />
          </View>
        </View>

        {/* 4 mini stat cards */}
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>JOBBOVERSIKT</Text>
        <View style={styles.miniGrid}>
          {miniStats.map(({ label, count, color, bg }) => (
            <View key={label} style={[styles.miniCard, { backgroundColor: bg ?? C.cardAlt, borderColor: C.border }]}>
              <Text style={[styles.miniCount, { color: color ?? C.textPrimary }]}>{count}</Text>
              <Text style={[styles.miniLabel, { color: C.textSecondary }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Tech performance */}
        {stats.techPerformance.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>INNTEKT PER TEKNIKER</Text>
            <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
              {stats.techPerformance.map((t) => (
                <ProgressRow
                  key={t.name}
                  name={t.name}
                  revenue={t.revenue}
                  jobs={t.jobs}
                  max={stats.maxRevenue}
                />
              ))}
            </View>
          </>
        )}

        {/* Invoice status */}
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>FAKTURASTATUS</Text>
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          {[
            {
              label: 'Betalt',
              color: '#2563FF',
              bg: '#EEF4FF',
              count: stats.invoiceStatus.paid.count,
              amount: stats.invoiceStatus.paid.amount },
            {
              label: 'Utestående',
              bg: '#F1F5F9',
              count: stats.invoiceStatus.sent.count,
              amount: stats.invoiceStatus.sent.amount },
            {
              label: 'Forfalt',
              color: '#DC2626',
              bg: '#FEF2F2',
              count: stats.invoiceStatus.overdue.count,
              amount: stats.invoiceStatus.overdue.amount },
          ].map(({ label, color, bg, count, amount }) => (
            <View key={label} style={styles.invoiceRow}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={[styles.invoiceLabel, { color: C.textPrimary }]}>{label}</Text>
              <View style={[styles.countPill, { backgroundColor: bg }]}>
                <Text style={[styles.countPillText, { color }]}>{count}</Text>
              </View>
              <Text style={[styles.invoiceAmount, { color: C.textPrimary }]}>{formatCurrency(amount)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
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
  subtitle: { fontSize: 13, marginTop: 2 },
  content: { padding: 24, gap: 16, paddingBottom: 48 },
  heroCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#15803D',
    padding: 20,
    gap: 8 },
  heroLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6 },
  heroNumber: { fontSize: 32, fontWeight: '700', color: '#15803D', letterSpacing: -1 },
  heroBar: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  heroBarFill: { height: 4, backgroundColor: '#15803D', borderRadius: 2 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: -4 },
  miniGrid: { flexDirection: 'row', gap: 12 },
  miniCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 16, alignItems: 'center', gap: 4 },
  miniCount: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  miniLabel: { fontSize: 12, fontWeight: '500' },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20 },
  invoiceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  invoiceLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  countPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  countPillText: { fontSize: 13, fontWeight: '700' },
  invoiceAmount: { fontSize: 14, fontWeight: '600', minWidth: 80, textAlign: 'right' } });
