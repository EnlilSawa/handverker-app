import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Job, JobStatus } from '../types';
import { formatTime } from '../utils/formatters';
import { useTheme } from '../theme/ThemeContext';

const STATUS_CFG: Record<JobStatus, { label: string; color: string; bg: string }> = {
  new: { label: 'Ny', color: '#2563FF', bg: '#EEF4FF' },
  in_progress: { label: 'Pågår', color: '#C2410C', bg: '#FFF7ED' },
  completed: { label: 'Ferdig', color: '#15803D', bg: '#F0FDF4' },
};

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export function JobCard({ job, onPress }: { job: Job; onPress?: () => void }) {
  const { colors: C } = useTheme();
  const cfg = STATUS_CFG[job.status];
  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: cfg.color, backgroundColor: C.cardBg, borderColor: C.border }]}
      onPress={onPress} activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <Text style={[styles.name, { color: C.textPrimary }]} numberOfLines={1}>{job.customerName}</Text>
        <Text style={{ fontSize: 12, color: C.textTertiary, marginLeft: 8 }}>{formatTime(job.scheduledAt)}</Text>
      </View>
      <Text style={{ fontSize: 13, color: C.textSecondary, marginBottom: 6 }} numberOfLines={1}>{job.description}</Text>
      <View style={styles.row}>
        <Ionicons name="location-outline" size={12} color={C.textTertiary} />
        <Text style={{ fontSize: 12, color: C.textTertiary, flex: 1 }} numberOfLines={1}>{job.address}</Text>
      </View>
      <View style={styles.footer}>
        <View style={styles.row}>
          {job.assignedTechnicianName ? (
            <>
              <View style={styles.avatar}><Text style={styles.avatarText}>{initials(job.assignedTechnicianName)}</Text></View>
              <Text style={{ fontSize: 12, color: C.textSecondary }}>{job.assignedTechnicianName}</Text>
            </>
          ) : (
            <Text style={{ fontSize: 12, color: C.textTertiary, fontStyle: 'italic' }}>Ikke tildelt</Text>
          )}
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, borderLeftWidth: 4, padding: 16, marginBottom: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '600', flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  avatarText: { fontSize: 8, fontWeight: '700', color: '#FFFFFF' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
});
