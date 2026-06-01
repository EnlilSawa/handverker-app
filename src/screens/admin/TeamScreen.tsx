import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { User } from '../../types';

const AVATAR_COLORS = ['#0A1B33', '#2563FF', '#15803D', '#C2410C', '#7C3AED', '#0891B2'];

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function TechCard({ user, index, onRemove }: { user: User; index: number; onRemove: () => void }) {
  const { colors: C } = useTheme();
  const jobs = useAppStore((s) => s.jobs.filter((j) => j.assignedTechnicianId === user.id));
  const completed = jobs.filter((j) => j.status === 'completed').length;
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];

  return (
    <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
      <View style={[styles.avatar, { backgroundColor: color }]}>
        <Text style={styles.avatarText}>{initials(user.name)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.phone}>{user.phone}</Text>
      </View>
      <View style={[styles.jobsPill, { backgroundColor: '#EEF4FF' }]}>
        <Text style={[styles.jobsPillText, { color: '#2563FF' }]}>{completed} jobber</Text>
      </View>
      <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
        <Ionicons name="trash-outline" size={17} color="#DC2626" />
      </TouchableOpacity>
    </View>
  );
}

export function TeamScreen() {
  const { colors: C } = useTheme();
  const technicians = useAppStore((s) => s.users.filter((u) => u.role === 'technician'));
  const addTechnician = useAppStore((s) => s.addTechnician);
  const removeTechnician = useAppStore((s) => s.removeTechnician);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const handleAdd = async () => {
    setAddError('');
    if (!name.trim() || !email.trim()) { setAddError('Fyll inn navn og e-post'); return; }
    setAdding(true);
    try {
      await addTechnician(name.trim(), email.trim().toLowerCase(), phone.trim());
      setName(''); setEmail(''); setPhone('');
      setShowModal(false);
    } catch (err: any) {
      setAddError(err.message ?? 'Kunne ikke legge til tekniker');
    } finally {
      setAdding(false);
    }
  };

  return (
    <ThemedScreen>
      <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <Text style={[styles.title, { color: C.textPrimary }]}>Team</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Legg til</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={technicians}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <TechCard user={item} index={index} onRemove={() => removeTechnician(item.id)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={32} color="#64748B" />
            </View>
            <Text style={styles.emptyTitle}>Ingen teknikere ennå</Text>
            <Text style={styles.emptyText}>Legg til teknikere for å tildele jobber</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowModal(true)}>
              <Text style={styles.emptyBtnText}>Legg til første tekniker</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: C.cardBg }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Legg til tekniker</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {[
              { label: 'FULLT NAVN', value: name, setter: setName, placeholder: 'Magnus Olsen' },
              { label: 'E-POST', value: email, setter: setEmail, placeholder: 'magnus@firma.no' },
              { label: 'TELEFON', value: phone, setter: setPhone, placeholder: '92345678' },
            ].map(({ label, value, setter, placeholder }) => (
              <View key={label} style={styles.field}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.inputBg, color: C.textPrimary, borderColor: C.border }]}
                  value={value}
                  onChangeText={setter}
                  placeholder={placeholder}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize={label === 'E-POST' ? 'none' : 'words'}
                />
              </View>
            ))}

            {addError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{addError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.saveBtn, adding && { opacity: 0.7 }]}
              onPress={handleAdd}
              disabled={adding}
            >
              {adding
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.saveBtnText}>Legg til tekniker</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
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
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: { fontSize: 20, fontWeight: '600', color: '#1F2937' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563FF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  list: { padding: 20, gap: 10, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  phone: { fontSize: 13, color: '#64748B', marginTop: 2 },
  jobsPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  jobsPillText: { fontSize: 12, fontWeight: '600' },
  removeBtn: { padding: 6 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  emptyText: { fontSize: 14, color: '#64748B' },
  emptyBtn: {
    backgroundColor: '#2563FF',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  emptyBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 14,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sheetTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  field: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#F8FAFC',
  },
  saveBtn: {
    height: 52,
    backgroundColor: '#0A1B33',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, color: '#DC2626' },
});
