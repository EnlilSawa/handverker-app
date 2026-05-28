import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

interface JobCardProps {
  job: Job;
  onPress?: () => void;
}

export function JobCard({ job, onPress }: JobCardProps) {
  const statusColor = STATUS_COLOR[job.status];

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: statusColor }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <Text style={styles.customerName} numberOfLines={1}>
          {job.customerName}
        </Text>
        <Text style={styles.time}>{formatTime(job.scheduledAt)}</Text>
      </View>

      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={12} color={colors.textLight} />
        <Text style={styles.address} numberOfLines={1}>{job.address}</Text>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {job.description}
      </Text>

      <View style={styles.footer}>
        <View style={styles.techRow}>
          <Ionicons name="person-outline" size={12} color={colors.textLight} />
          <Text style={styles.techName}>
            {job.assignedTechnicianName ?? 'Ikke tildelt'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {STATUS_LABEL[job.status]}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderLeftWidth: 4,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerName: { fontSize: 14, fontWeight: '700', color: colors.textDark, flex: 1 },
  time: { fontSize: 12, color: colors.textGray, marginLeft: 8 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 5 },
  address: { fontSize: 11, color: colors.textLight, flex: 1 },
  description: { fontSize: 13, color: colors.textGray, marginBottom: 8, lineHeight: 18 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  techRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  techName: { fontSize: 12, color: colors.textLight },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
});
