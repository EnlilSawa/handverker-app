import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAppStore } from '../../store/appStore';
import { formatTime } from '../../utils/formatters';

export function TechMapScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const jobs = useAppStore((s) => s.jobs);

  const myJobs = useMemo(
    () =>
      jobs
        .filter(
          (j) =>
            j.assignedTechnicianId === currentUser?.id &&
            j.status !== 'completed'
        )
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [jobs, currentUser]
  );

  const openMaps = (address: string) => {
    const url = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch(() => Alert.alert('Feil', 'Kunne ikke åpne kart'));
  };

  const openRoute = () => {
    const addresses = myJobs.map((j) => j.address);
    if (addresses.length === 0) return;
    if (addresses.length === 1) {
      openMaps(addresses[0]);
      return;
    }
    const dest = encodeURIComponent(addresses[addresses.length - 1]);
    const waypoints = addresses
      .slice(0, -1)
      .map((a) => encodeURIComponent(a))
      .join('|');
    const url = `https://maps.google.com/maps?saddr=Nåværende+posisjon&daddr=${dest}&waypoints=${waypoints}`;
    Linking.openURL(url).catch(() => Alert.alert('Feil', 'Kunne ikke åpne kart'));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Kart</Text>
        {myJobs.length > 1 && (
          <TouchableOpacity style={styles.routeBtn} onPress={openRoute}>
            <Ionicons name="git-branch-outline" size={16} color={colors.white} />
            <Text style={styles.routeBtnText}>Planlegg rute</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.mapPlaceholder}>
        <Ionicons name="map" size={60} color={colors.primary + '40'} />
        <Text style={styles.mapTitle}>Kart</Text>
        <Text style={styles.mapSubtitle}>Åpner Google Maps med adressen</Text>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Mine aktive jobber ({myJobs.length})</Text>
      </View>

      <FlatList
        data={myJobs}
        keyExtractor={(j) => j.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.timeTag}>
                <Text style={styles.timeText}>{formatTime(item.scheduledAt)}</Text>
              </View>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.customerName}>{item.customerName}</Text>
              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={13} color={colors.textGray} />
                <Text style={styles.address} numberOfLines={2}>{item.address}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.navigateBtn}
              onPress={() => openMaps(item.address)}
            >
              <Ionicons name="navigate" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-outline" size={40} color={colors.border} />
            <Text style={styles.emptyText}>Alle jobber fullført!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundSecondary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.textDark },
  routeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  routeBtnText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  mapPlaceholder: {
    height: 160,
    backgroundColor: colors.primary + '08',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  mapTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  mapSubtitle: { fontSize: 12, color: colors.textGray },
  listHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listTitle: { fontSize: 13, fontWeight: '700', color: colors.textGray },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardLeft: {},
  timeTag: {
    backgroundColor: colors.primary + '15',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
  },
  timeText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  cardRight: { flex: 1, gap: 4 },
  customerName: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 3 },
  address: { fontSize: 13, color: colors.textGray, flex: 1 },
  navigateBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyText: { fontSize: 14, color: colors.textLight },
});
