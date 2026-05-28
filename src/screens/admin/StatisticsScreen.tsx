import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { useAppStore } from '../../store/appStore';
import { formatCurrency, isThisMonth } from '../../utils/formatters';

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label} numberOfLines={1}>{label}</Text>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={barStyles.value}>{formatCurrency(value)}</Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  label: { width: 80, fontSize: 12, color: colors.textGray },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  value: { width: 80, fontSize: 12, color: colors.textDark, textAlign: 'right' },
});

export function StatisticsScreen() {
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
      completed: jobs.filter((j) => j.status === 'completed').length,
    };

    const techPerformance = users
      .filter((u) => u.role === 'technician')
      .map((u) => ({
        name: u.name,
        revenue: revenueByTech[u.id] ?? 0,
        jobs: jobs.filter((j) => j.assignedTechnicianId === u.id && isThisMonth(j.createdAt)).length,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const maxRevenue = Math.max(...techPerformance.map((t) => t.revenue), 1);

    return { revenue, jobsByStatus, techPerformance, maxRevenue, totalJobs: jobs.length };
  }, [jobs, invoices, users]);

  const monthName = new Date().toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Statistikk</Text>
        <Text style={styles.subtitle}>{monthName}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Total inntekt denne måneden</Text>
          <Text style={styles.bigNumber}>{formatCurrency(stats.revenue)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Jobboversikt</Text>
          <View style={styles.jobsGrid}>
            {[
              { label: 'Nye', count: stats.jobsByStatus.new, color: colors.statusNew },
              { label: 'Pågår', count: stats.jobsByStatus.in_progress, color: colors.statusInProgress },
              { label: 'Ferdig', count: stats.jobsByStatus.completed, color: colors.statusCompleted },
              { label: 'Totalt', count: stats.totalJobs, color: colors.textGray },
            ].map(({ label, count, color }) => (
              <View key={label} style={styles.jobCell}>
                <Text style={[styles.jobCount, { color }]}>{count}</Text>
                <Text style={styles.jobLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inntekt per tekniker</Text>
          {stats.techPerformance.length === 0 ? (
            <Text style={styles.emptyText}>Ingen data</Text>
          ) : (
            <View style={{ marginTop: 12 }}>
              {stats.techPerformance.map((t) => (
                <View key={t.name}>
                  <BarRow
                    label={t.name.split(' ')[0]}
                    value={t.revenue}
                    max={stats.maxRevenue}
                    color={colors.primary}
                  />
                  <Text style={styles.techJobCount}>{t.jobs} jobber denne måneden</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fakturastatus</Text>
          <View style={styles.invoiceStats}>
            {[
              { label: 'Sendt', count: invoices.filter((i) => i.status === 'sent').length, color: colors.primary },
              { label: 'Betalt', count: invoices.filter((i) => i.status === 'paid').length, color: colors.success },
              { label: 'Forfalt', count: invoices.filter((i) => i.status === 'overdue').length, color: colors.danger },
            ].map(({ label, count, color }) => (
              <View key={label} style={styles.invoiceStat}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text style={styles.invoiceLabel}>{label}</Text>
                <Text style={[styles.invoiceCount, { color }]}>{count}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
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
  subtitle: { fontSize: 13, color: colors.textGray, marginTop: 2 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: colors.textGray, textTransform: 'uppercase', letterSpacing: 0.5 },
  bigNumber: { fontSize: 36, fontWeight: '800', color: colors.success, marginTop: 8 },
  jobsGrid: { flexDirection: 'row', marginTop: 12 },
  jobCell: { flex: 1, alignItems: 'center', gap: 4 },
  jobCount: { fontSize: 28, fontWeight: '800' },
  jobLabel: { fontSize: 12, color: colors.textGray },
  emptyText: { fontSize: 13, color: colors.textLight, marginTop: 8 },
  techJobCount: { fontSize: 11, color: colors.textLight, marginBottom: 10, marginTop: -6 },
  invoiceStats: { gap: 10, marginTop: 12 },
  invoiceStat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  invoiceLabel: { flex: 1, fontSize: 14, color: colors.textDark },
  invoiceCount: { fontSize: 18, fontWeight: '700' },
});
