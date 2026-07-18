import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, ScrollView } from 'react-native';
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

function TechCard({ user, index, onRemove, onResetPassword }: {
  user: User; index: number; onRemove: () => void; onResetPassword: () => void;
}) {
  const { colors: C } = useTheme();
  const jobs = useAppStore((s) => s.jobs.filter((j) => j.assignedTechnicianId === user.id));
  const completed = jobs.filter((j) => j.status === 'completed').length;
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];

  return (
    <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
      {/* Top row */}
      <View style={styles.cardRow}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{initials(user.name)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: C.textPrimary }]}>{user.name}</Text>
          <Text style={[styles.phone, { color: C.textSecondary }]}>{user.phone}</Text>
        </View>
        <View style={[styles.jobsPill, { backgroundColor: '#EEF4FF' }]}>
          <Text style={[styles.jobsPillText, { color: '#2563FF' }]}>{completed} jobber</Text>
        </View>
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <Ionicons name="trash-outline" size={17} color="#DC2626" />
        </TouchableOpacity>
      </View>
      {/* Reset password row */}
      <View style={[styles.cardDivider, { borderTopColor: C.border }]}>
        <TouchableOpacity onPress={onResetPassword} style={styles.resetBtn}>
          <Ionicons name="key-outline" size={13} color="#64748B" />
          <Text style={[styles.resetBtnText, { color: C.textSecondary }]}>Tilbakestill passord</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function TeamScreen() {
  const { colors: C } = useTheme();
  const technicians = useAppStore((s) => s.users.filter((u) => u.role === 'technician'));
  const addTechnician = useAppStore((s) => s.addTechnician);
  const removeTechnician = useAppStore((s) => s.removeTechnician);
  const resetTechnicianPassword = useAppStore((s) => s.resetTechnicianPassword);

  // Add technician state
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // Reset password state
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetPw, setResetPw] = useState('');
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Remove technician state
  const [removeTarget, setRemoveTarget] = useState<User | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  const resetForm = () => { setName(''); setEmail(''); setPhone(''); setPassword(''); setAddError(''); };

  const handleAdd = async () => {
    setAddError('');
    if (!name.trim() || !email.trim()) { setAddError('Fyll inn navn og e-post'); return; }
    if (password.length < 8) { setAddError('Midlertidig passord må ha minst 8 tegn'); return; }
    setAdding(true);
    try {
      await addTechnician(name.trim(), email.trim().toLowerCase(), phone.trim(), password);
      resetForm();
      setShowModal(false);
    } catch (err: any) {
      setAddError(err.message ?? 'Kunne ikke legge til tekniker');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemoveError('');
    setRemoving(true);
    try {
      await removeTechnician(removeTarget.id);
      setRemoveTarget(null);
    } catch (err: any) {
      setRemoveError(err.message ?? 'Kunne ikke fjerne teknikeren');
    } finally {
      setRemoving(false);
    }
  };

  const handleResetPassword = async () => {
    setResetError('');
    if (resetPw.length < 8) { setResetError('Passordet må ha minst 8 tegn'); return; }
    setResetting(true);
    try {
      await resetTechnicianPassword(resetTarget!.id, resetPw);
      setResetSuccess(true);
      setResetPw('');
      setTimeout(() => { setResetSuccess(false); setResetTarget(null); }, 1500);
    } catch (err: any) {
      setResetError(err.message ?? 'Kunne ikke tilbakestille passord');
    } finally {
      setResetting(false);
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
          <TechCard
            user={item}
            index={index}
            onRemove={() => { setRemoveTarget(item); setRemoveError(''); }}
            onResetPassword={() => { setResetTarget(item); setResetPw(''); setResetError(''); setResetSuccess(false); setShowResetPw(false); }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: C.cardAlt }]}>
              <Ionicons name="people-outline" size={32} color="#64748B" />
            </View>
            <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>Ingen teknikere ennå</Text>
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>Legg til teknikere for å tildele jobber</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowModal(true)}>
              <Text style={styles.emptyBtnText}>Legg til første tekniker</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView
            style={[styles.sheet, { backgroundColor: C.cardBg }]}
            contentContainerStyle={{ paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.textPrimary }]}>Legg til tekniker</Text>
              <TouchableOpacity onPress={() => { resetForm(); setShowModal(false); }}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {[
              { label: 'FULLT NAVN',  value: name,  setter: setName,  placeholder: 'Magnus Olsen',    cap: 'words' as const },
              { label: 'E-POST',      value: email, setter: setEmail, placeholder: 'magnus@firma.no', cap: 'none'  as const },
              { label: 'TELEFON',     value: phone, setter: setPhone, placeholder: '92345678',        cap: 'none'  as const },
            ].map(({ label, value, setter, placeholder, cap }) => (
              <View key={label} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>{label}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.inputBg, color: C.textPrimary, borderColor: C.border }]}
                  value={value}
                  onChangeText={setter}
                  placeholder={placeholder}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize={cap}
                  keyboardType={label === 'TELEFON' ? 'phone-pad' : 'default'}
                />
              </View>
            ))}

            {/* Midlertidig passord */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>MIDLERTIDIG PASSORD</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput, { backgroundColor: C.inputBg, color: C.textPrimary, borderColor: C.border }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Minst 8 tegn"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
              <Text style={[styles.passwordHint, { color: C.textTertiary }]}>
                Teknikeren bruker dette ved første innlogging
              </Text>
            </View>

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
          </ScrollView>
        </View>
      </Modal>

      {/* Tilbakestill passord modal */}
      <Modal visible={!!resetTarget} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: C.cardBg }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.textPrimary }]}>
                Nytt passord for {resetTarget?.name}
              </Text>
              <TouchableOpacity onPress={() => setResetTarget(null)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>NYTT PASSORD</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput, { backgroundColor: C.inputBg, color: C.textPrimary, borderColor: C.border }]}
                  value={resetPw}
                  onChangeText={setResetPw}
                  placeholder="Minst 8 tegn"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showResetPw}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowResetPw((v) => !v)}>
                  <Ionicons name={showResetPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {resetError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{resetError}</Text>
              </View>
            ) : null}

            {resetSuccess ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={16} color="#15803D" />
                <Text style={styles.successText}>Passord oppdatert!</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.saveBtn, resetting && { opacity: 0.7 }]}
              onPress={handleResetPassword}
              disabled={resetting}
            >
              {resetting
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.saveBtnText}>Lagre nytt passord</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bekreft fjerning av tekniker */}
      <Modal visible={!!removeTarget} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmCard, { backgroundColor: C.cardBg }]}>
            <View style={[styles.confirmIcon, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="trash-outline" size={22} color="#DC2626" />
            </View>
            <Text style={[styles.confirmTitle, { color: C.textPrimary }]}>
              Fjerne {removeTarget?.name}?
            </Text>
            <Text style={[styles.confirmText, { color: C.textSecondary }]}>
              Teknikeren mister tilgangen og fjernes permanent. Eventuelle tildelte
              jobber blir stående, men som «ikke tildelt».
            </Text>

            {removeError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{removeError}</Text>
              </View>
            ) : null}

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={[styles.confirmCancel, { borderColor: C.border }]}
                onPress={() => setRemoveTarget(null)}
                disabled={removing}
              >
                <Text style={[styles.confirmCancelText, { color: C.textPrimary }]}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDelete, removing && { opacity: 0.7 }]}
                onPress={handleRemove}
                disabled={removing}
              >
                {removing
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={styles.confirmDeleteText}>Fjern</Text>
                }
              </TouchableOpacity>
            </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1 },
  title: { fontSize: 20, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563FF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9 },
  addBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  list: { padding: 20, gap: 10, paddingBottom: 40 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cardRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, padding: 16,
  },
  cardDivider: {
    borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 8,
  },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  resetBtnText: { fontSize: 13, color: '#64748B' },
  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12,
  },
  successText: { fontSize: 13, color: '#15803D', fontWeight: '600' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  phone: { fontSize: 13, marginTop: 2 },
  jobsPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  jobsPillText: { fontSize: 12, fontWeight: '600' },
  removeBtn: { padding: 6 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyText: { fontSize: 14 },
  emptyBtn: {
    backgroundColor: '#2563FF',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8 },
  emptyBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 14 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sheetTitle: { fontSize: 18, fontWeight: '600' },
  field: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
     },
  saveBtn: {
    height: 52,
    backgroundColor: '#0A1B33',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4 },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 14, top: 16 },
  passwordHint: { fontSize: 12, marginTop: 4 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, color: '#DC2626' },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmCard: { width: '100%', maxWidth: 380, borderRadius: 16, padding: 24, gap: 12, alignItems: 'center' },
  confirmIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  confirmTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  confirmText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  confirmBtnRow: { flexDirection: 'row', gap: 12, marginTop: 8, alignSelf: 'stretch' },
  confirmCancel: { flex: 1, height: 48, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  confirmCancelText: { fontSize: 15, fontWeight: '600' },
  confirmDelete: { flex: 1, height: 48, backgroundColor: '#DC2626', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  confirmDeleteText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' } });
