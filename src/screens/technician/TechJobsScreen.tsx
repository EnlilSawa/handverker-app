import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { TechJobCard } from '../../components/TechJobCard';
import { todayISO } from '../../utils/formatters';

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export function TechJobsScreen({ navigation }: any) {
  const { colors: C } = useTheme();
  const currentUser = useAppStore((s) => s.currentUser);
  const jobs = useAppStore((s) => s.jobs);

  const myJobs = useMemo(
    () =>
      jobs
        .filter(
          (j) =>
            j.assignedTechnicianId === currentUser?.id &&
            (j.scheduledAt.startsWith(todayISO()) || j.status === 'in_progress')
        )
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [jobs, currentUser]
  );

  const todayLabel = new Date().toLocaleDateString('nb-NO', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <ThemedScreen>
      <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <View>
          <Text style={[styles.title, { color: C.textPrimary }]}>Mine jobber</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>{todayLabel}</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials(currentUser?.name ?? '?')}</Text>
        </View>
      </View>

      <FlatList
        data={myJobs}
        keyExtractor={(j) => j.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TechJobCard
            job={item}
            onPress={() => navigation.navigate('TechJobDetail', { jobId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="sunny-outline" size={40} color="#E2E8F0" />
            <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>Ingen jobber i dag</Text>
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>Nye jobber vises her automatisk når de tildeles deg</Text>
          </View>
        }
      />
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '600' },
  subtitle: { fontSize: 13, marginTop: 2 },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#0A1B33', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  list: { padding: 20, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
