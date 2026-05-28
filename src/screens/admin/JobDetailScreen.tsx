import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAppStore } from '../../store/appStore';
import { Job, JobStatus } from '../../types';
import { formatTime } from '../../utils/formatters';

const STATUS_OPTIONS: { status: JobStatus; label: string; color: string }[] = [
  { status: 'new', label: 'Ny', color: colors.statusNew },
  { status: 'in_progress', label: 'Pågår', color: colors.statusInProgress },
  { status: 'completed', label: 'Ferdig', color: colors.statusCompleted },
];

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.textGray} style={styles.infoIcon} />
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export function JobDetailScreen({ route, navigation }: any) {
  const { jobId } = route.params as { jobId: string };

  const job = useAppStore((s) => s.jobs.find((j) => j.id === jobId));
  const technicians = useAppStore((s) => s.users.filter((u) => u.role === 'technician'));
  const assignTechnician = useAppStore((s) => s.assignTechnician);
  const updateJobStatus = useAppStore((s) => s.updateJobStatus);

  const [selectedTech, setSelectedTech] = useState<{ id: string; name: string } | null>(
    job?.assignedTechnicianId
      ? { id: job.assignedTechnicianId, name: job.assignedTechnicianName ?? '' }
      : null
  );
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!job) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ padding: 20, color: colors.textGray }}>Jobb ikke funnet</Text>
      </SafeAreaView>
    );
  }

  const currentStatus = STATUS_OPTIONS.find((s) => s.status === job.status)!;

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await assignTechnician(job.id, selectedTech?.id ?? null, selectedTech?.name ?? null);
      navigation.goBack();
    } catch {
      setError('Kunne ikke lagre endringer. Prøv igjen.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: JobStatus) => {
    setSaving(true);
    try {
      await updateJobStatus(job.id, newStatus);
    } catch {
      setError('Kunne ikke oppdatere status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.title}>Jobbdetaljer</Text>
        <View style={[styles.statusBadge, { backgroundColor: currentStatus.color + '18' }]}>
          <Text style={[styles.statusText, { color: currentStatus.color }]}>{currentStatus.label}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.customerName}>{job.customerName}</Text>

        <View style={styles.card}>
          <InfoRow icon="location-outline" label="Adresse" value={job.address} />
          <InfoRow icon="call-outline" label="Telefon" value={job.customerPhone} />
          <InfoRow icon="calendar-outline" label="Tidspunkt" value={formatTime(job.scheduledAt)} />
          <InfoRow icon="document-text-outline" label="Beskrivelse" value={job.description} />
        </View>

        <Text style={styles.section}>Status</Text>
        <View style={styles.statusRow}>
          {STATUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.status}
              style={[
                styles.statusBtn,
                job.status === opt.status && { backgroundColor: opt.color, borderColor: opt.color },
              ]}
              onPress={() => handleStatusChange(opt.status)}
              disabled={saving || job.status === opt.status}
            >
              <Text
                style={[
                  styles.statusBtnText,
                  job.status === opt.status && { color: colors.white },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>Tildel tekniker</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setShowPicker(true)}>
          <View style={styles.pickerLeft}>
            {selectedTech ? (
              <>
                <View style={styles.techAvatar}>
                  <Text style={styles.techAvatarText}>{selectedTech.name[0]}</Text>
                </View>
                <Text style={styles.pickerText}>{selectedTech.name}</Text>
              </>
            ) : (
              <Text style={[styles.pickerText, { color: colors.textLight }]}>Velg tekniker...</Text>
            )}
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.textGray} />
        </TouchableOpacity>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.saveBtnText}>Lagre tildeling</Text>
          }
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Velg tekniker</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={22} color={colors.textGray} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.techItem}
              onPress={() => { setSelectedTech(null); setShowPicker(false); }}
            >
              <Text style={styles.techItemText}>Ikke tildelt</Text>
              {!selectedTech && <Ionicons name="checkmark" size={18} color={colors.primary} />}
            </TouchableOpacity>
            <FlatList
              data={technicians}
              keyExtractor={(u) => u.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.techItem}
                  onPress={() => { setSelectedTech({ id: item.id, name: item.name }); setShowPicker(false); }}
                >
                  <View style={styles.techAvatar}>
                    <Text style={styles.techAvatarText}>{item.name[0]}</Text>
                  </View>
                  <Text style={styles.techItemText}>{item.name}</Text>
                  {selectedTech?.id === item.id && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.textDark },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  customerName: { fontSize: 22, fontWeight: '800', color: colors.textDark, marginBottom: 16 },
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon: { marginTop: 1 },
  infoLabel: { fontSize: 11, color: colors.textLight, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue: { fontSize: 14, color: colors.textDark, marginTop: 1 },
  section: { fontSize: 11, fontWeight: '700', color: colors.textGray, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statusBtnText: { fontSize: 13, fontWeight: '600', color: colors.textGray },
  picker: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    marginBottom: 20,
  },
  pickerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pickerText: { fontSize: 15, color: colors.textDark },
  techAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  techAvatarText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  errorBox: { backgroundColor: '#fef0f0', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { fontSize: 13, color: colors.danger },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.textDark },
  techItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  techItemText: { flex: 1, fontSize: 15, color: colors.textDark },
});
