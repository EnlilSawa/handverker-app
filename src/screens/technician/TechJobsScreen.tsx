import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAppStore } from '../../store/appStore';
import { TechJobCard } from '../../components/TechJobCard';
import { Job } from '../../types';
import { todayISO } from '../../utils/formatters';

export function TechJobsScreen({ navigation }: any) {
  const currentUser = useAppStore((s) => s.currentUser);
  const jobs = useAppStore((s) => s.jobs);
  const updateJobStatus = useAppStore((s) => s.updateJobStatus);

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [hours, setHours] = useState('1');
  const [materials, setMaterials] = useState('');

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

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 10) return 'God morgen';
    if (h < 17) return 'Hei';
    return 'God kveld';
  };

  const handleMarkDone = (job: Job) => {
    setSelectedJob(job);
    setHours('1');
    setMaterials('');
  };

  const handleMarkInProgress = (job: Job) => {
    updateJobStatus(job.id, 'in_progress');
  };

  const confirmDone = () => {
    if (!selectedJob) return;
    const h = parseFloat(hours);
    const m = parseFloat(materials || '0');
    if (isNaN(h) || h <= 0) {
      Alert.alert('Ugyldig', 'Skriv inn gyldige arbeidstimer');
      return;
    }
    updateJobStatus(selectedJob.id, 'completed', h, m);
    setSelectedJob(null);
    setTimeout(() => {
      Alert.alert(
        'Jobb fullført!',
        'Faktura er automatisk generert og klar til utsending.',
        [{ text: 'OK' }]
      );
    }, 300);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()}, {currentUser?.name.split(' ')[0]}!</Text>
          <Text style={styles.subtitle}>
            {new Date().toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{myJobs.length}</Text>
          <Text style={styles.badgeLabel}>jobber</Text>
        </View>
      </View>

      <FlatList
        data={myJobs}
        keyExtractor={(j) => j.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TechJobCard
            job={item}
            onMarkDone={() => handleMarkDone(item)}
            onMarkInProgress={() => handleMarkInProgress(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="sunny-outline" size={48} color={colors.border} />
            <Text style={styles.emptyTitle}>Ingen jobber i dag</Text>
            <Text style={styles.emptyText}>Nye jobber vises her automatisk</Text>
          </View>
        }
      />

      <Modal visible={!!selectedJob} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrapper}
        >
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Fullfør jobb</Text>
                <TouchableOpacity onPress={() => setSelectedJob(null)}>
                  <Ionicons name="close" size={22} color={colors.textGray} />
                </TouchableOpacity>
              </View>

              <Text style={styles.sheetSubtitle}>{selectedJob?.customerName}</Text>

              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Arbeidstimer</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={hours}
                    onChangeText={setHours}
                    keyboardType="decimal-pad"
                    placeholder="1.5"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
                <View style={[styles.formField, { marginLeft: 12 }]}>
                  <Text style={styles.fieldLabel}>Materiell (NOK)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={materials}
                    onChangeText={setMaterials}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                <Text style={styles.infoText}>Faktura genereres automatisk og sendes til kunden</Text>
              </View>

              <TouchableOpacity style={styles.confirmBtn} onPress={confirmDone}>
                <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                <Text style={styles.confirmBtnText}>Bekreft ferdig</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  greeting: { fontSize: 20, fontWeight: '800', color: colors.textDark },
  subtitle: { fontSize: 13, color: colors.textGray, marginTop: 2 },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { fontSize: 18, fontWeight: '800', color: colors.primary },
  badgeLabel: { fontSize: 10, color: colors.primary, fontWeight: '500' },
  list: { padding: 16, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textGray },
  emptyText: { fontSize: 13, color: colors.textLight },
  modalWrapper: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 24,
    gap: 14,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.textDark },
  sheetSubtitle: { fontSize: 15, color: colors.textGray },
  formRow: { flexDirection: 'row' },
  formField: { flex: 1 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textGray, marginBottom: 6 },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textDark,
    backgroundColor: colors.backgroundSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary + '10',
    borderRadius: 10,
    padding: 12,
  },
  infoText: { fontSize: 13, color: colors.primary, flex: 1 },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 16,
  },
  confirmBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
