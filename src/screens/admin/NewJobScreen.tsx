import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAppStore } from '../../store/appStore';
import { todayISO } from '../../utils/formatters';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      style={styles.input}
      placeholderTextColor={colors.textLight}
      {...props}
    />
  );
}

export function NewJobScreen({ navigation }: any) {
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

  const handleSave = () => {
    if (!customerName.trim()) { Alert.alert('Mangler felt', 'Fyll inn kundenavn'); return; }
    if (!address.trim()) { Alert.alert('Mangler felt', 'Fyll inn adresse'); return; }
    if (!description.trim()) { Alert.alert('Mangler felt', 'Beskriv jobben'); return; }

    addJob({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      address: address.trim(),
      description: description.trim(),
      assignedTechnicianId: selectedTech?.id ?? null,
      assignedTechnicianName: selectedTech?.name ?? null,
      scheduledAt: `${date}T${time}:00`,
      status: 'new',
    });

    Alert.alert('Jobb opprettet!', `Ny jobb for ${customerName} er lagt til.`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.title}>Ny jobb</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.section}>Kundeinformasjon</Text>

        <Field label="Kundenavn *">
          <Input
            placeholder="Per Hansen"
            value={customerName}
            onChangeText={setCustomerName}
          />
        </Field>

        <Field label="Telefonnummer">
          <Input
            placeholder="92345678"
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
          />
        </Field>

        <Field label="Adresse *">
          <Input
            placeholder="Gateveien 1, 0150 Oslo"
            value={address}
            onChangeText={setAddress}
          />
        </Field>

        <Text style={[styles.section, { marginTop: 20 }]}>Jobbdetaljer</Text>

        <Field label="Beskrivelse *">
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Beskriv problemet eller arbeidet som skal utføres..."
            placeholderTextColor={colors.textLight}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </Field>

        <Field label="Tildel tekniker">
          <TouchableOpacity style={styles.picker} onPress={() => setShowPicker(true)}>
            <Text style={[styles.pickerText, !selectedTech && { color: colors.textLight }]}>
              {selectedTech?.name ?? 'Velg tekniker...'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textGray} />
          </TouchableOpacity>
        </Field>

        <View style={styles.dateRow}>
          <Field label="Dato">
            <Input
              placeholder="2024-05-15"
              value={date}
              onChangeText={setDate}
              style={[styles.input, { flex: 1 }]}
            />
          </Field>
          <View style={{ width: 12 }} />
          <Field label="Kl.">
            <Input
              placeholder="09:00"
              value={time}
              onChangeText={setTime}
              style={[styles.input, { width: 80 }]}
            />
          </Field>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Opprett jobb</Text>
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
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  section: { fontSize: 11, fontWeight: '700', color: colors.textGray, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textGray, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textDark,
    backgroundColor: colors.backgroundSecondary,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
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
  },
  pickerText: { fontSize: 15, color: colors.textDark },
  dateRow: { flexDirection: 'row' },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
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
  techAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  techAvatarText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  techItemText: { flex: 1, fontSize: 15, color: colors.textDark },
});
