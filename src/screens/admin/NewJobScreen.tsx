import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { todayISO } from '../../utils/formatters';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

export function NewJobScreen({ navigation }: any) {
  const { colors: C } = useTheme();
  const technicians = useAppStore((s) => s.users.filter((u) => u.role === 'technician'));
  const addJob = useAppStore((s) => s.addJob);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTech, setSelectedTech] = useState<{ id: string; name: string } | null>(null);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('08:00');
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    if (!customerName.trim()) { setError('Fyll inn kundenavn'); return; }
    if (!address.trim()) { setError('Fyll inn adresse'); return; }
    if (!description.trim()) { setError('Beskriv jobben'); return; }
    setSaving(true);
    try {
      await addJob({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        address: address.trim(),
        description: description.trim(),
        assignedTechnicianId: selectedTech?.id ?? null,
        assignedTechnicianName: selectedTech?.name ?? null,
        scheduledAt: `${date}T${time}:00`,
        status: 'new' });
      navigation.goBack();
    } catch {
      setError('Kunne ikke lagre jobben. Prøv igjen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedScreen>
      <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text style={[styles.title, { color: C.textPrimary }]}>Ny jobb</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <Text style={styles.cardTitle}>KUNDEINFORMASJON</Text>
          <View style={styles.field}>
            <FieldLabel>Kundenavn *</FieldLabel>
            <TextInput style={[styles.input, { backgroundColor: C.inputBg, color: C.textPrimary, borderColor: C.border }]} placeholder="Per Hansen" placeholderTextColor="#94A3B8" value={customerName} onChangeText={setCustomerName} />
          </View>
          <View style={styles.field}>
            <FieldLabel>Telefonnummer</FieldLabel>
            <TextInput style={[styles.input, { backgroundColor: C.inputBg, color: C.textPrimary, borderColor: C.border }]} placeholder="92345678" placeholderTextColor="#94A3B8" value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" />
          </View>
          <View style={styles.field}>
            <FieldLabel>Adresse *</FieldLabel>
            <TextInput style={[styles.input, { backgroundColor: C.inputBg, color: C.textPrimary, borderColor: C.border }]} placeholder="Gateveien 1, 0150 Oslo" placeholderTextColor="#94A3B8" value={address} onChangeText={setAddress} />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <Text style={styles.cardTitle}>JOBBDETALJER</Text>
          <View style={styles.field}>
            <FieldLabel>Beskrivelse *</FieldLabel>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Beskriv problemet eller arbeidet..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>
          <View style={styles.field}>
            <FieldLabel>Tekniker</FieldLabel>
            <TouchableOpacity style={styles.picker} onPress={() => setShowPicker(true)}>
              <Text style={[styles.pickerText, !selectedTech && {  }]}>
                {selectedTech?.name ?? 'Velg tekniker...'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.dateRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <FieldLabel>Dato</FieldLabel>
              <TextInput style={[styles.input, { backgroundColor: C.inputBg, color: C.textPrimary, borderColor: C.border }]} placeholder="2024-05-15" placeholderTextColor="#94A3B8" value={date} onChangeText={setDate} />
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.field, { width: 90 }]}>
              <FieldLabel>Kl.</FieldLabel>
              <TextInput style={[styles.input, { backgroundColor: C.inputBg, color: C.textPrimary, borderColor: C.border }]} placeholder="09:00" placeholderTextColor="#94A3B8" value={time} onChangeText={setTime} />
            </View>
          </View>
        </View>

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
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Opprett jobb</Text>}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Velg tekniker</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.techItem} onPress={() => { setSelectedTech(null); setShowPicker(false); }}>
              <Text style={styles.techItemText}>Ikke tildelt</Text>
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
                  {selectedTech?.id === item.id && <Ionicons name="checkmark" size={18} color="#2563FF" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: '600' },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    gap: 14 },
  cardTitle: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '500' },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
     },
  textArea: { height: 88, textAlignVertical: 'top', paddingTop: 12 },
  picker: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' },
  pickerText: { fontSize: 15 },
  dateRow: { flexDirection: 'row', alignItems: 'flex-end' },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 14 },
  errorText: { fontSize: 13, color: '#DC2626' },
  saveBtn: {
    height: 52,
    backgroundColor: '#2563FF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  techItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    gap: 12 },
  techAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center' },
  techAvatarText: { color: '#2563FF', fontWeight: '700', fontSize: 13 },
  techItemText: { flex: 1, fontSize: 15 } });
