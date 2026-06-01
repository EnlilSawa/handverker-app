import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Job, JobStatus } from '../types';
import { formatTime } from '../utils/formatters';
import { useTheme } from '../theme/ThemeContext';

const BORDER: Record<JobStatus, string> = {
  new: '#2563FF', in_progress: '#C2410C', completed: '#15803D',
};

export function TechJobCard({ job, onMarkDone, onMarkInProgress }: {
  job: Job; onMarkDone: () => void; onMarkInProgress: () => void;
}) {
  const { colors: C } = useTheme();
  const borderColor = BORDER[job.status];
  const openMaps = () => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(job.address)}`).catch(() => {});

  return (
    <View style={[styles.card, { borderLeftColor: borderColor, backgroundColor: C.cardBg, borderColor: C.border }]}>
      <View style={styles.topRow}>
        <Text style={[styles.name, { color: C.textPrimary }]}>{job.customerName}</Text>
        <Text style={{ fontSize: 12, color: C.textTertiary, marginLeft: 8 }}>{formatTime(job.scheduledAt)}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 }}>
        <Ionicons name="location-outline" size={13} color={C.textTertiary} />
        <Text style={{ fontSize: 13, color: C.textTertiary, flex: 1 }} numberOfLines={1}>{job.address}</Text>
      </View>
      <View style={[styles.descBox, { backgroundColor: C.cardAlt }]}>
        <Text style={{ fontSize: 13, color: C.textSecondary, lineHeight: 19 }} numberOfLines={2}>{job.description}</Text>
      </View>
      {job.status !== 'completed' && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.navBtn, { backgroundColor: C.cardAlt, borderColor: C.border }]} onPress={openMaps}>
            <Ionicons name="navigate-outline" size={16} color={C.textPrimary} />
            <Text style={[styles.navBtnText, { color: C.textPrimary }]}>Naviger</Text>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="checkmark-circle" size={16} color="#15803D" />
          <Text style={{ fontSize: 14, color: '#15803D', fontWeight: '600' }}>Fullført</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, borderLeftWidth: 4, padding: 16, marginBottom: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  name: { fontSize: 15, fontWeight: '600', flex: 1 },
  descBox: { borderRadius: 8, padding: 10, marginBottom: 14 },
  actions: { flexDirection: 'row', gap: 10 },
  navBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1, height: 44, borderRadius: 10, borderWidth: 1 },
  navBtnText: { fontSize: 14, fontWeight: '600' },
  startBtn: { flex: 1, height: 44, borderRadius: 10, backgroundColor: '#FFF7ED', alignItems: 'center', justifyContent: 'center' },
  startBtnText: { fontSize: 14, color: '#C2410C', fontWeight: '600' },
  doneBtn: { flex: 1, height: 44, borderRadius: 10, backgroundColor: '#2563FF', alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
});
