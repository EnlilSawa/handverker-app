import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { useAppStore } from '../../store/appStore';
import { formatCurrency, isThisMonth } from '../../utils/formatters';

function ProgressRow({ name, revenue, jobs, max }: { name: string; revenue: number; jobs: number; max: number }) {
  const pct = max > 0 ? Math.min((revenue / max) * 100, 100) : 0;
  return (
    <View style={bar.row}>
      <View style={bar.labelRow}>
        <Text style={bar.name} numberOfLines={1}>{name.split(' ')[0]}</Text>
        <Text style={bar.jobs}>{jobs} jobber</Text>
        <Text style={bar.amount}>{formatCurrency(revenue)}</Text>
      </View>
      <View style={bar.track}>
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
  track: { height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: '#2563FF' } });

const MINI_STATS = (jobsByStatus: { new: number; in_progress: number; completed: number }, totalJobs: number) => [
  { label: 'Nye', count: jobsByStatus.new, color: '#2563FF', bg: '#EEF4FF' },
  { label: 'Pågår', count: jobsByStatus.in_progress, color: '#C2410C', bg: '#FFF7ED' },
  { label: 'Ferdig', count: jobsByStatus.completed, color: '#15803D', bg: '#F0FDF4' },
  { label: 'Totalt', count: totalJobs, bg: '#F1F5F9' },
];

export function StatisticsScreen() {
  const { colors: C } = useTheme();
  const jobs = useAppStore((s) => s.jobs);
  const invoices = useAppStore((s) => s.invoices);
  const users = useAppStore((s) => s.users);

  const stats = useMemo(() => {
    const thisMonthInvoices = invoices.filter((i) => isThisMonth(i.createdAt));
    const revenue = thisMonthInvoices.reduce((s, i) => s + i.total, 0);
    const revenueByTech: Record<string, number> = {};

    thisMonthInvoices.forEach((inv) => {
      const job = jobs.find((j) => j.id === inv.jobId);
      if (job?.assignedTechnicianId) {
        revenueByTech[job.assignedTechnicianId] =
          (revenueByTech[job.assignedTechnicianId] ?? 0) + inv.total;
      }
    });

    const jobsByStatus = {
      new: jobs.filter((j) => j.status === 'new').length,
      in_progress: jobs.filter((j) => j.status === 'in_progress').length,
      completed: jobs.filter((j) => j.status === 'completed').length };

    const techPerformance = users
      .filter((u) => u.role === 'technician')
      .map((u) => ({
        name: u.name,
        revenue: revenueByTech[u.id] ?? 0,
        jobs: jobs.filter((j) => j.assignedTechnicianId === u.id && isThisMonth(j.createdAt)).length }))
      .sort((a, b) => b.revenue - a.revenue);

    const maxRevenue = Math.max(...techPerformance.map((t) => t.revenue), 1);

    const invoiceStats = {
      paid: invoices.filter((i) => i.status === 'paid'),
      sent: invoices.filter((i) => i.status === 'sent'),
      overdue: invoices.filter((i) => i.status === 'overdue') };

    return { revenue, jobsByStatus, techPerformance, maxRevenue, totalJobs: jobs.length, invoiceStats };
  }, [jobs, invoices, users]);

  const monthName = new Date().toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' });
  const miniStats = MINI_STATS(stats.jobsByStatus, stats.totalJobs);

  // Donut-style invoice summary (using colored pills instead of SVG chart)
  const totalInvoices = stats.invoiceStats.paid.length + stats.invoiceStats.sent.length + stats.invoiceStats.overdue.length;

  return (
    <ThemedScreen>
      <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <Text style={[styles.title, { color: C.textPrimary }]}>Statistikk</Text>
        <Text style={styles.subtitle}>{monthName}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero revenue card */}
        <View style={[styles.heroCard, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <Text style={styles.heroLabel}>TOTAL INNTEKT DENNE MÅNEDEN</Text>
          <Text style={styles.heroNumber}>{formatCurrency(stats.revenue)}</Text>
          <View style={styles.heroBar}>
            <View style={[styles.heroBarFill, { width: stats.revenue > 0 ? '100%' : '0%' }]} />
          </View>
        </View>

        {/* 4 mini stat cards */}
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>JOBBOVERSIKT</Text>
        <View style={styles.miniGrid}>
          {miniStats.map(({ label, count, color, bg }) => (
            <View key={label} style={[styles.miniCard, { backgroundColor: bg }]}>
              <Text style={[styles.miniCount, { color }]}>{count}</Text>
              <Text style={styles.miniLabel}>{label}</Text>
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
              count: stats.invoiceStats.paid.length,
              amount: stats.invoiceStats.paid.reduce((s, i) => s + i.total, 0) },
            {
              label: 'Utestående',
              bg: '#F1F5F9',
              count: stats.invoiceStats.sent.length,
              amount: stats.invoiceStats.sent.reduce((s, i) => s + i.total, 0) },
            {
              label: 'Forfalt',
              color: '#DC2626',
              bg: '#FEF2F2',
              count: stats.invoiceStats.overdue.length,
              amount: stats.invoiceStats.overdue.reduce((s, i) => s + i.total, 0) },
          ].map(({ label, color, bg, count, amount }) => (
            <View key={label} style={styles.invoiceRow}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={styles.invoiceLabel}>{label}</Text>
              <View style={[styles.countPill, { backgroundColor: bg }]}>
                <Text style={[styles.countPillText, { color }]}>{count}</Text>
              </View>
              <Text style={styles.invoiceAmount}>{formatCurrency(amount)}</Text>
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
  heroBar: { height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', overflow: 'hidden', marginTop: 4 },
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
