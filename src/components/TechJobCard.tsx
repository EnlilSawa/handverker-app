import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Job, JobStatus } from '../types';
import { formatTime } from '../utils/formatters';
import { useTheme } from '../theme/ThemeContext';

const BORDER: Record<JobStatus, string> = {
  new:         '#2563FF',
  in_progress: '#E07C00',
  completed:   '#1A9E5C',
};

export function TechJobCard({ job, onPress }: { job: Job; onPress: () => void }) {
  const { colors: C } = useTheme();
  const borderColor = BORDER[job.status];

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: borderColor, backgroundColor: C.cardBg, borderColor: C.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <Text style={[styles.name, { color: C.textPrimary }]}>{job.customerName}</Text>
        <Text style={{ fontSize: 12, color: C.textTertiary, marginLeft: 8 }}>{formatTime(job.scheduledAt)}</Text>
      </View>

      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={13} color={C.textTertiary} />
        <Text style={[styles.addressText, { color: C.textSecondary }]} numberOfLines={1}>{job.address}</Text>
      </View>

      {job.description ? (
        <View style={[styles.descBox, { backgroundColor: C.cardAlt }]}>
          <Text style={{ fontSize: 13, color: C.textSecondary, lineHeight: 19 }} numberOfLines={2}>
            {job.description}
          </Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        {job.status === 'new' && (
          <View style={styles.statusPill}>
            <View style={[styles.dot, { backgroundColor: '#000000' }]} />
            <Text style={[styles.statusText, { color: '#2563FF' }]}>Ny jobb</Text>
          </View>
        )}
        {job.status === 'in_progress' && (
          <View style={styles.statusPill}>
            <View style={[styles.dot, { backgroundColor: '#E07C00' }]} />
            <Text style={[styles.statusText, { color: '#E07C00' }]}>Pågår</Text>
          </View>
        )}
        {job.status === 'completed' && (
          <View style={styles.statusPill}>
            <Ionicons name="checkmark-circle" size={14} color="#1A9E5C" />
            <Text style={[styles.statusText, { color: '#1A9E5C' }]}>Fullført</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={C.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, borderLeftWidth: 4, padding: 16, marginBottom: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  name: { fontSize: 16, fontWeight: '600', flex: 1 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  addressText: { fontSize: 13, flex: 1 },
  descBox: { borderRadius: 8, padding: 10, marginBottom: 10 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '600' },
});
