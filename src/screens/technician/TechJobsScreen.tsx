import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Modal,
  TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { TechJobCard } from '../../components/TechJobCard';
import { Job } from '../../types';
import { todayISO } from '../../utils/formatters';

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export function TechJobsScreen() {
  const { colors: C } = useTheme();
  const currentUser = useAppStore((s) => s.currentUser);
  const jobs = useAppStore((s) => s.jobs);
  const updateJobStatus = useAppStore((s) => s.updateJobStatus);

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [hours, setHours] = useState('1');
  const [materials, setMaterials] = useState('');
  const [doneError, setDoneError] = useState('');

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

  const confirmDone = () => {
    if (!selectedJob) return;
    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0) { setDoneError('Skriv inn gyldige arbeidstimer'); return; }
    updateJobStatus(selectedJob.id, 'completed', h, parseFloat(materials || '0'));
    setSelectedJob(null);
  };

  return (
    <ThemedScreen>
      <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <View>
          <Text style={[styles.title, { color: C.textPrimary }]}>Mine jobber</Text>
          <Text style={styles.subtitle}>{todayLabel}</Text>
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
            onMarkDone={() => { setSelectedJob(item); setHours('1'); setMaterials(''); setDoneError(''); }}
            onMarkInProgress={() => updateJobStatus(item.id, 'in_progress')}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="sunny-outline" size={40} color="#E2E8F0" />
            <Text style={styles.emptyTitle}>Ingen jobber i dag</Text>
            <Text style={styles.emptyText}>Nye jobber vises her automatisk</Text>
          </View>
        }
      />

      <Modal visible={!!selectedJob} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={[styles.sheet, { backgroundColor: C.cardBg }]}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Fullfør jobb</Text>
                <TouchableOpacity onPress={() => setSelectedJob(null)}>
                  <Ionicons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>
              <Text style={styles.sheetSub}>{selectedJob?.customerName}</Text>

              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>ARBEIDSTIMER</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: C.inputBg, color: C.textPrimary, borderColor: C.border }]}
                    value={hours}
                    onChangeText={(t) => { setHours(t); setDoneError(''); }}
                    keyboardType="decimal-pad"
                    placeholder="1.5"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={[styles.formField, { marginLeft: 12 }]}>
                  <Text style={styles.fieldLabel}>MATERIELL (NOK)</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: C.inputBg, color: C.textPrimary, borderColor: C.border }]}
                    value={materials}
                    onChangeText={setMaterials}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {doneError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{doneError}</Text>
                </View>
              ) : null}

              <View style={styles.infoBox}>
                <Ionicons name="document-text-outline" size={15} color="#2563FF" />
                <Text style={styles.infoText}>Faktura genereres automatisk og sendes til kunden</Text>
              </View>

              <TouchableOpacity style={styles.confirmBtn} onPress={confirmDone}>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.confirmBtnText}>Bekreft ferdig</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: { fontSize: 20, fontWeight: '600', color: '#1F2937' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0A1B33',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  list: { padding: 20, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#64748B' },
  emptyText: { fontSize: 14, color: '#94A3B8' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 14,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  sheetSub: { fontSize: 14, color: '#64748B', marginTop: -6 },
  formRow: { flexDirection: 'row' },
  formField: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  fieldInput: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F8FAFC',
  },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, color: '#DC2626' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF4FF',
    borderRadius: 10,
    padding: 12,
  },
  infoText: { fontSize: 13, color: '#2563FF', flex: 1 },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    backgroundColor: '#2563FF',
    borderRadius: 10,
  },
  confirmBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
