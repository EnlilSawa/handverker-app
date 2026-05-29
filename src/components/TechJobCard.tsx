import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Job, JobStatus } from '../types';
import { formatTime } from '../utils/formatters';

const BORDER: Record<JobStatus, string> = {
  new: '#2563FF',
  in_progress: '#C2410C',
  completed: '#15803D',
};

interface TechJobCardProps {
  job: Job;
  onMarkDone: () => void;
  onMarkInProgress: () => void;
}

export function TechJobCard({ job, onMarkDone, onMarkInProgress }: TechJobCardProps) {
  const borderColor = BORDER[job.status];

  const openMaps = () => {
    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(job.address)}`).catch(() => {});
  };

  return (
    <View style={[styles.card, { borderLeftColor: borderColor }]}>
      <View style={styles.topRow}>
        <Text style={styles.customerName}>{job.customerName}</Text>
        <Text style={styles.time}>{formatTime(job.scheduledAt)}</Text>
      </View>

      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={13} color="#94A3B8" />
        <Text style={styles.address} numberOfLines={1}>{job.address}</Text>
      </View>

      <View style={styles.descBox}>
        <Text style={styles.description} numberOfLines={2}>{job.description}</Text>
      </View>

      {job.status !== 'completed' && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.navBtn} onPress={openMaps}>
            <Ionicons name="navigate-outline" size={16} color="#1F2937" />
            <Text style={styles.navBtnText}>Naviger</Text>
          </TouchableOpacity>

          {job.status === 'new' && (
            <TouchableOpacity style={styles.startBtn} onPress={onMarkInProgress}>
              <Text style={styles.startBtnText}>Start jobb</Text>
            </TouchableOpacity>
          )}

          {job.status === 'in_progress' && (
            <TouchableOpacity style={styles.doneBtn} onPress={onMarkDone}>
              <Text style={styles.doneBtnText}>Marker som ferdig</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {job.status === 'completed' && (
        <View style={styles.completedRow}>
          <Ionicons name="checkmark-circle" size={16} color="#15803D" />
          <Text style={styles.completedText}>Fullført</Text>
        </View>
      )}
    </View>
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
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  customerName: { fontSize: 15, fontWeight: '600', color: '#1F2937', flex: 1 },
  time: { fontSize: 12, color: '#94A3B8', marginLeft: 8 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  address: { fontSize: 13, color: '#94A3B8', flex: 1 },
  descBox: { backgroundColor: '#F5F7FA', borderRadius: 8, padding: 10, marginBottom: 14 },
  description: { fontSize: 13, color: '#64748B', lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 10 },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navBtnText: { fontSize: 14, color: '#1F2937', fontWeight: '600' },
  startBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: { fontSize: 14, color: '#C2410C', fontWeight: '600' },
  doneBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2563FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  completedText: { fontSize: 14, color: '#15803D', fontWeight: '600' },
});
