import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAppStore } from '../../store/appStore';
import { formatShortDate, formatTime } from '../../utils/formatters';

export function TechTimesScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const jobs = useAppStore((s) => s.jobs);

  const completedJobs = useMemo(
    () =>
      jobs
        .filter((j) => j.assignedTechnicianId === currentUser?.id && j.status === 'completed' && j.hoursWorked)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [jobs, currentUser]
  );

  const weekStats = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const thisWeek = completedJobs.filter(
      (j) => new Date(j.updatedAt) >= weekStart
    );

    const totalHours = thisWeek.reduce((s, j) => s + (j.hoursWorked ?? 0), 0);
    const totalJobs = thisWeek.length;
    return { totalHours, totalJobs };
  }, [completedJobs]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Timer</Text>
        <Text style={styles.subtitle}>Logg og oversikt</Text>
      </View>

      <View style={styles.weekCard}>
        <Text style={styles.weekTitle}>Denne uken</Text>
        <View style={styles.weekStats}>
          <View style={styles.weekStat}>
            <Text style={styles.weekStatValue}>{weekStats.totalHours.toFixed(1)}</Text>
            <Text style={styles.weekStatLabel}>timer</Text>
          </View>
          <View style={styles.weekDivider} />
          <View style={styles.weekStat}>
            <Text style={styles.weekStatValue}>{weekStats.totalJobs}</Text>
            <Text style={styles.weekStatLabel}>jobber</Text>
          </View>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Timelogg</Text>
      </View>

      <FlatList
        data={completedJobs}
        keyExtractor={(j) => j.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardDate}>{formatShortDate(item.updatedAt)}</Text>
              <View style={styles.hoursTag}>
                <Text style={styles.hoursText}>{item.hoursWorked}t</Text>
              </View>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.customerName}>{item.customerName}</Text>
              <Text style={styles.description} numberOfLines={1}>{item.description}</Text>
              <Text style={styles.meta}>Ferdig kl. {formatTime(item.updatedAt)}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={40} color={colors.border} />
            <Text style={styles.emptyText}>Ingen fullførte jobber ennå</Text>
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
  subtitle: { fontSize: 13, color: colors.textGray, marginTop: 2 },
  weekCard: {
    backgroundColor: colors.primary,
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  weekTitle: { fontSize: 13, color: colors.white + 'cc', fontWeight: '600', marginBottom: 12 },
  weekStats: { flexDirection: 'row', alignItems: 'center' },
  weekStat: { flex: 1, alignItems: 'center' },
  weekStatValue: { fontSize: 40, fontWeight: '800', color: colors.white },
  weekStatLabel: { fontSize: 14, color: colors.white + 'cc', marginTop: 2 },
  weekDivider: { width: 1, height: 50, backgroundColor: colors.white + '30' },
  listHeader: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  listTitle: { fontSize: 13, fontWeight: '700', color: colors.textGray, textTransform: 'uppercase', letterSpacing: 0.5 },
  list: { paddingHorizontal: 16, gap: 8, paddingBottom: 40 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardLeft: { alignItems: 'center', gap: 6 },
  cardDate: { fontSize: 11, color: colors.textGray, fontWeight: '500' },
  hoursTag: {
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hoursText: { fontSize: 15, fontWeight: '800', color: colors.primary },
  cardRight: { flex: 1, gap: 2 },
  customerName: { fontSize: 14, fontWeight: '700', color: colors.textDark },
  description: { fontSize: 12, color: colors.textGray },
  meta: { fontSize: 11, color: colors.textLight },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 14, color: colors.textLight },
});
