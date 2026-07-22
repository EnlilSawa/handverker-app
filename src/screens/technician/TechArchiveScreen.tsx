import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { formatDate } from '../../utils/formatters';

export function TechArchiveScreen({ navigation }: any) {
  const { colors: C } = useTheme();
  const currentUser = useAppStore((s) => s.currentUser);
  const jobs = useAppStore((s) => s.jobs);
  const archiveHasMore = useAppStore((s) => s.archiveHasMore);
  const archiveLoadingMore = useAppStore((s) => s.archiveLoadingMore);
  const loadMoreArchive = useAppStore((s) => s.loadMoreArchive);
  const [search, setSearch] = useState('');

  const completedJobs = useMemo(
    () =>
      jobs
        .filter(
          (j) =>
            j.assignedTechnicianId === currentUser?.id &&
            j.status === 'completed'
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [jobs, currentUser]
  );

  const filtered = useMemo(
    () =>
      completedJobs.filter(
        (j) =>
          !search.trim() ||
          j.customerName.toLowerCase().includes(search.toLowerCase()) ||
          j.address.toLowerCase().includes(search.toLowerCase())
      ),
    [completedJobs, search]
  );

  return (
    <ThemedScreen>
      <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <Text style={[styles.title, { color: C.textPrimary }]}>Arkiv</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>
          {completedJobs.length} fullf{completedJobs.length === 1 ? 'ørte' : 'ørte'} jobber
        </Text>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: C.cardBg, borderBottomColor: C.border }]}>
        <View style={[styles.searchBar, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
          <Ionicons name="search-outline" size={16} color={C.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: C.textPrimary }]}
            placeholder="Søk etter kunde eller adresse..."
            placeholderTextColor={C.textTertiary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={C.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(j) => j.id}
        contentContainerStyle={styles.list}
        onEndReachedThreshold={0.4}
        onEndReached={() => { if (archiveHasMore) loadMoreArchive(); }}
        ListFooterComponent={
          archiveHasMore ? (
            <TouchableOpacity
              style={[styles.loadMore, { borderColor: C.border, backgroundColor: C.cardBg }]}
              onPress={() => loadMoreArchive()}
              disabled={archiveLoadingMore}
              activeOpacity={0.7}
            >
              {archiveLoadingMore ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text style={styles.loadMoreText}>Last inn flere</Text>
              )}
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}
            onPress={() => navigation.navigate('TechArchiveDetail', { jobId: item.id })}
            activeOpacity={0.7}
          >
            <View style={styles.cardTop}>
              <Text style={[styles.customerName, { color: C.textPrimary }]}>{item.customerName}</Text>
              <Text style={[styles.date, { color: C.textTertiary }]}>{formatDate(item.updatedAt)}</Text>
            </View>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={13} color={C.textTertiary} />
              <Text style={[styles.address, { color: C.textSecondary }]} numberOfLines={1}>{item.address}</Text>
            </View>
            {item.description ? (
              <Text style={[styles.desc, { color: C.textTertiary }]} numberOfLines={1}>{item.description}</Text>
            ) : null}
            <View style={styles.doneBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#15803D" />
              <Text style={styles.doneBadgeText}>Fullført</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="archive-outline" size={44} color="#E5E5E5" />
            <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>
              {search.trim() ? 'Ingen treff' : 'Ingen fullførte jobber ennå'}
            </Text>
            <Text style={[styles.emptyText, { color: C.textTertiary }]}>
              {search.trim() ? 'Prøv et annet søkeord' : 'Fullførte jobber vises her'}
            </Text>
          </View>
        }
      />
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, fontSize: 14 },
  list: { padding: 16, gap: 10, paddingBottom: 48 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 5 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  customerName: { fontSize: 15, fontWeight: '600', flex: 1 },
  date: { fontSize: 12, marginLeft: 8 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  address: { fontSize: 13, flex: 1 },
  desc: { fontSize: 13 },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  doneBadgeText: { fontSize: 12, color: '#15803D', fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyText: { fontSize: 14 },
  loadMore: {
    marginTop: 6, borderWidth: 1, borderRadius: 10,
    paddingVertical: 13, minHeight: 48, alignItems: 'center', justifyContent: 'center',
  },
  loadMoreText: { fontSize: 14, fontWeight: '600', color: '#000000' },
});
