import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { formatShortDate, formatTime } from '../../utils/formatters';

export function TechTimesScreen() {
  const { colors: C } = useTheme();
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
    const thisWeek = completedJobs.filter((j) => new Date(j.updatedAt) >= weekStart);
    return {
      totalHours: thisWeek.reduce((s, j) => s + (j.hoursWorked ?? 0), 0),
      totalJobs: thisWeek.length,
    };
  }, [completedJobs]);

  return (
    <ThemedScreen>
      <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <Text style={[styles.title, { color: C.textPrimary }]}>Timer</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>Logg og oversikt</Text>
      </View>

      {/* Ukestatistikk — alltid navy, ingen theme */}
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
        <Text style={[styles.listTitle, { color: C.textSecondary }]}>TIMELOGG</Text>
      </View>

      <FlatList
        data={completedJobs}
        keyExtractor={(j) => j.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
            <View style={styles.cardLeft}>
              <Text style={[styles.cardDate, { color: C.textSecondary }]}>{formatShortDate(item.updatedAt)}</Text>
              <View style={styles.hoursTag}>
                <Text style={styles.hoursText}>{item.hoursWorked}t</Text>
              </View>
            </View>
            <View style={styles.cardRight}>
              <Text style={[styles.customerName, { color: C.textPrimary }]}>{item.customerName}</Text>
              <Text style={[styles.description, { color: C.textSecondary }]} numberOfLines={1}>{item.description}</Text>
              <Text style={[styles.meta, { color: C.textTertiary }]}>Ferdig kl. {formatTime(item.updatedAt)}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={40} color={C.border} />
            <Text style={[styles.emptyText, { color: C.textTertiary }]}>Ingen fullførte jobber ennå</Text>
          </View>
        }
      />
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  weekCard: { backgroundColor: '#000000', margin: 16, borderRadius: 16, padding: 20 },
  weekTitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: 12 },
  weekStats: { flexDirection: 'row', alignItems: 'center' },
  weekStat: { flex: 1, alignItems: 'center' },
  weekStatValue: { fontSize: 40, fontWeight: '800', color: '#FFFFFF' },
  weekStatLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  weekDivider: { width: 1, height: 50, backgroundColor: 'rgba(255,255,255,0.2)' },
  listHeader: { paddingHorizontal: 20, paddingBottom: 8 },
  listTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  list: { paddingHorizontal: 16, gap: 8, paddingBottom: 40 },
  card: { borderRadius: 10, padding: 12, flexDirection: 'row', gap: 12, borderWidth: 1 },
  cardLeft: { alignItems: 'center', gap: 6 },
  cardDate: { fontSize: 11, fontWeight: '500' },
  hoursTag: { backgroundColor: 'rgba(37,99,255,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  hoursText: { fontSize: 15, fontWeight: '800', color: '#000000' },
  cardRight: { flex: 1, gap: 2 },
  customerName: { fontSize: 14, fontWeight: '700' },
  description: { fontSize: 12 },
  meta: { fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 14 },
});
