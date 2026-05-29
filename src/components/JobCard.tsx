import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Job, JobStatus } from '../types';
import { formatTime } from '../utils/formatters';

const STATUS_CFG: Record<JobStatus, { label: string; color: string; bg: string }> = {
  new: { label: 'Ny', color: '#2563FF', bg: '#EEF4FF' },
  in_progress: { label: 'Pågår', color: '#C2410C', bg: '#FFF7ED' },
  completed: { label: 'Ferdig', color: '#15803D', bg: '#F0FDF4' },
};

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

interface JobCardProps {
  job: Job;
  onPress?: () => void;
}

export function JobCard({ job, onPress }: JobCardProps) {
  const cfg = STATUS_CFG[job.status];

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: cfg.color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <Text style={styles.customerName} numberOfLines={1}>{job.customerName}</Text>
        <Text style={styles.time}>{formatTime(job.scheduledAt)}</Text>
      </View>

      <Text style={styles.description} numberOfLines={1}>{job.description}</Text>

      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={12} color="#94A3B8" />
        <Text style={styles.address} numberOfLines={1}>{job.address}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.techRow}>
          {job.assignedTechnicianName ? (
            <>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(job.assignedTechnicianName)}</Text>
              </View>
              <Text style={styles.techName}>{job.assignedTechnicianName}</Text>
            </>
          ) : (
            <Text style={styles.unassigned}>Ikke tildelt</Text>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 10,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  customerName: { fontSize: 15, fontWeight: '600', color: '#1F2937', flex: 1 },
  time: { fontSize: 12, color: '#94A3B8', marginLeft: 8 },
  description: { fontSize: 13, color: '#64748B', marginBottom: 6, lineHeight: 18 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  address: { fontSize: 12, color: '#94A3B8', flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  techRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0A1B33',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 8, fontWeight: '700', color: '#FFFFFF' },
  techName: { fontSize: 12, color: '#64748B' },
  unassigned: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
});
