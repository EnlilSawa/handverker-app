import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAppStore } from '../../store/appStore';
import { User } from '../../types';

function TechCard({ user, onRemove }: { user: User; onRemove: () => void }) {
  const jobs = useAppStore((s) => s.jobs.filter((j) => j.assignedTechnicianId === user.id));
  const completed = jobs.filter((j) => j.status === 'completed').length;

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.meta}>{user.phone}</Text>
        <Text style={styles.statsText}>{completed} fullførte jobber</Text>
      </View>
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() =>
          Alert.alert('Fjern tekniker', `Fjerne ${user.name}?`, [
            { text: 'Avbryt', style: 'cancel' },
            { text: 'Fjern', style: 'destructive', onPress: onRemove },
          ])
        }
      >
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

export function TeamScreen() {
  const technicians = useAppStore((s) => s.users.filter((u) => u.role === 'technician'));
  const addTechnician = useAppStore((s) => s.addTechnician);
  const removeTechnician = useAppStore((s) => s.removeTechnician);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleAdd = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Mangler felt', 'Fyll inn navn og e-post');
      return;
    }
    try {
      await addTechnician(name.trim(), email.trim().toLowerCase(), phone.trim());
      setName(''); setEmail(''); setPhone('');
      setShowModal(false);
    } catch (err: any) {
      setShowModal(false);
      Alert.alert('Legg til tekniker', err.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Team</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={technicians}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TechCard user={item} onRemove={() => removeTechnician(item.id)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>Ingen teknikere ennå</Text>
          </View>
        }
      />

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Legg til tekniker</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={22} color={colors.textGray} />
              </TouchableOpacity>
            </View>

            {[
              { label: 'Fullt navn', value: name, setter: setName, placeholder: 'Magnus Olsen' },
              { label: 'E-post', value: email, setter: setEmail, placeholder: 'magnus@firma.no' },
              { label: 'Telefon', value: phone, setter: setPhone, placeholder: '92345678' },
            ].map(({ label, value, setter, placeholder }) => (
              <View key={label} style={styles.field}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={setter}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textLight}
                  autoCapitalize={label === 'E-post' ? 'none' : 'words'}
                />
              </View>
            ))}

            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
              <Text style={styles.saveBtnText}>Legg til</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  title: { fontSize: 22, fontWeight: '800', color: colors.textDark },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  meta: { fontSize: 13, color: colors.textGray, marginTop: 1 },
  statsText: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  removeBtn: { padding: 6 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyText: { fontSize: 14, color: colors.textLight },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 12,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.textDark },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textGray },
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
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
