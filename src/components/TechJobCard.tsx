import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Job, JobStatus } from '../types';
import { formatTime } from '../utils/formatters';

const STATUS_COLOR: Record<JobStatus, string> = {
  new: colors.statusNew,
  in_progress: colors.statusInProgress,
  completed: colors.statusCompleted,
};

const STATUS_LABEL: Record<JobStatus, string> = {
  new: 'Ny',
  in_progress: 'Pågår',
  completed: 'Ferdig',
};

interface TechJobCardProps {
  job: Job;
  onMarkDone: () => void;
  onMarkInProgress: () => void;
}

export function TechJobCard({ job, onMarkDone, onMarkInProgress }: TechJobCardProps) {
  const statusColor = STATUS_COLOR[job.status];

  const openMaps = () => {
    const url = `https://maps.google.com/?q=${encodeURIComponent(job.address)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Feil', 'Kunne ikke åpne kart')
    );
  };

  return (
    <View style={[styles.card, { borderLeftColor: statusColor }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.time}>{formatTime(job.scheduledAt)}</Text>
          <Text style={styles.customerName}>{job.customerName}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>
            {STATUS_LABEL[job.status]}
          </Text>
        </View>
      </View>

      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={14} color={colors.textGray} />
        <Text style={styles.address}>{job.address}</Text>
      </View>

      <View style={styles.descBox}>
        <Text style={styles.description}>{job.description}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.navBtn} onPress={openMaps}>
          <Ionicons name="navigate-outline" size={16} color={colors.primary} />
          <Text style={styles.navBtnText}>Naviger hit</Text>
        </TouchableOpacity>

        {job.status === 'new' && (
          <TouchableOpacity style={styles.startBtn} onPress={onMarkInProgress}>
            <Text style={styles.startBtnText}>Start jobb</Text>
          </TouchableOpacity>
        )}

        {job.status === 'in_progress' && (
          <TouchableOpacity style={styles.doneBtn} onPress={onMarkDone}>
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />
            <Text style={styles.doneBtnText}>Trykk når ferdig</Text>
          </TouchableOpacity>
        )}

        {job.status === 'completed' && (
          <View style={styles.completedTag}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.completedText}>Fullført</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  time: { fontSize: 12, color: colors.textGray, fontWeight: '500' },
  customerName: { fontSize: 17, fontWeight: '800', color: colors.textDark, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  address: { fontSize: 13, color: colors.textGray, flex: 1 },
  descBox: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  description: { fontSize: 13, color: colors.textGray, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navBtnText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  startBtn: {
    flex: 1,
    backgroundColor: colors.warning + '20',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  startBtnText: { fontSize: 13, color: colors.warning, fontWeight: '700' },
  doneBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: 9,
  },
  doneBtnText: { fontSize: 13, color: colors.white, fontWeight: '700' },
  completedTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  completedText: { fontSize: 13, color: colors.success, fontWeight: '600' },
});
