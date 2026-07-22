import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';

export function TechProfileScreen() {
  const { colors: C } = useTheme();
  const currentUser = useAppStore((s) => s.currentUser);
  const jobs = useAppStore((s) => s.jobs);
  const logout = useAppStore((s) => s.logout);
  const updatePassword = useAppStore((s) => s.updatePassword);
  const company = useAppStore((s) => s.company);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const handleChangePassword = async () => {
    setPwError('');
    if (newPassword.length < 8) { setPwError('Passordet må ha minst 8 tegn'); return; }
    if (newPassword !== confirmPassword) { setPwError('Passordene stemmer ikke overens'); return; }
    setPwLoading(true);
    try {
      await updatePassword(newPassword);
      setPwSuccess(true);
      setNewPassword(''); setConfirmPassword('');
      setTimeout(() => { setPwSuccess(false); setShowPasswordModal(false); }, 1500);
    } catch (err: any) {
      setPwError(err.message ?? 'Kunne ikke endre passord');
    } finally {
      setPwLoading(false);
    }
  };

  const myJobs = jobs.filter((j) => j.assignedTechnicianId === currentUser?.id);
  const completed = myJobs.filter((j) => j.status === 'completed').length;
  const totalHours = myJobs.reduce((s, j) => s + (j.hoursWorked ?? 0), 0);

  const initials = (currentUser?.name ?? '?')
    .split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const items: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
    { icon: 'mail-outline',     label: 'E-post',  value: currentUser?.email ?? '' },
    { icon: 'call-outline',     label: 'Telefon', value: currentUser?.phone ?? '' },
    { icon: 'business-outline', label: 'Firma',   value: company?.name ?? '' },
  ];

  return (
    <ThemedScreen>
      <ScrollView>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
          <Text style={[styles.title, { color: C.textPrimary }]}>Profil</Text>
        </View>

        {/* Avatar + navn */}
        <View style={[styles.profileCard, { backgroundColor: C.cardBg, borderBottomColor: C.border }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={[styles.name, { color: C.textPrimary }]}>{currentUser?.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: 'rgba(37,99,255,0.12)' }]}>
            <Text style={styles.roleText}>Tekniker</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: C.cardBg, borderBottomColor: C.border, marginTop: 12 }]}>
          {[
            { value: completed,                                       label: 'Fullførte jobber' },
            { value: totalHours.toFixed(1),                          label: 'Timer totalt'     },
            { value: myJobs.filter(j => j.status !== 'completed').length, label: 'Aktive jobber'   },
          ].map((s, i) => (
            <View
              key={s.label}
              style={[
                styles.statCell,
                i === 1 && [styles.statBorder, { borderColor: C.border }],
              ]}
            >
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Kontaktinfo */}
        <View style={[styles.section, { backgroundColor: C.cardBg, borderColor: C.border, marginTop: 12 }]}>
          {items.map(({ icon, label, value }) => (
            <View key={label} style={[styles.infoRow, { borderBottomColor: C.border }]}>
              <View style={[styles.iconWrap, { backgroundColor: 'rgba(37,99,255,0.10)' }]}>
                <Ionicons name={icon} size={18} color="#000000" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: C.textSecondary }]}>{label}</Text>
                <Text style={[styles.infoValue, { color: C.textPrimary }]}>{value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Knapper */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.changePasswordBtn, { borderColor: '#000000' }]}
            onPress={() => { setPwError(''); setShowPasswordModal(true); }}
          >
            <Ionicons name="key-outline" size={18} color="#000000" />
            <Text style={styles.changePasswordText}>Endre passord</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            <Text style={styles.logoutText}>Logg ut</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Endre passord modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: C.cardBg }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.textPrimary }]}>Endre passord</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={22} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            {[
              { label: 'NYTT PASSORD',     val: newPassword,     setter: setNewPassword,     show: showNew,     toggleShow: () => setShowNew(v => !v),     ph: 'Minst 8 tegn' },
              { label: 'BEKREFT PASSORD',  val: confirmPassword, setter: setConfirmPassword, show: showConfirm, toggleShow: () => setShowConfirm(v => !v), ph: 'Gjenta passordet' },
            ].map(({ label, val, setter, show, toggleShow, ph }) => (
              <View key={label} style={styles.pwField}>
                <Text style={[styles.pwLabel, { color: C.textSecondary }]}>{label}</Text>
                <View style={styles.pwRow}>
                  <TextInput
                    style={[styles.pwInput, styles.pwInputPad, { backgroundColor: C.cardAlt, color: C.textPrimary, borderColor: C.border }]}
                    value={val}
                    onChangeText={setter}
                    placeholder={ph}
                    placeholderTextColor={C.textTertiary}
                    secureTextEntry={!show}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={toggleShow}>
                    <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {pwError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{pwError}</Text>
              </View>
            ) : null}

            {pwSuccess ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={16} color="#15803D" />
                <Text style={styles.successText}>Passord endret!</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.saveBtn, pwLoading && { opacity: 0.7 }]}
              onPress={handleChangePassword}
              disabled={pwLoading}
            >
              {pwLoading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.saveBtnText}>Lagre nytt passord</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '700' },
  profileCard: { alignItems: 'center', paddingVertical: 28, borderBottomWidth: 1, gap: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  name: { fontSize: 20, fontWeight: '700' },
  roleBadge: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20 },
  roleText: { fontSize: 13, color: '#000000', fontWeight: '600' },
  statsRow: { flexDirection: 'row', borderBottomWidth: 1 },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#000000' },
  statLabel: { fontSize: 11, marginTop: 3, textAlign: 'center' },
  section: { borderTopWidth: 1, borderBottomWidth: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, gap: 14 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '500' },
  infoValue: { fontSize: 15, marginTop: 1 },
  footer: { padding: 24, gap: 12 },
  changePasswordBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 14 },
  changePasswordText: { fontSize: 16, color: '#000000', fontWeight: '600' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#DC2626', borderRadius: 12, paddingVertical: 14 },
  logoutText: { fontSize: 16, color: '#DC2626', fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 14 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sheetTitle: { fontSize: 18, fontWeight: '600' },
  pwField: { gap: 6 },
  pwLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  pwRow: { position: 'relative' },
  pwInput: { height: 52, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 15 },
  pwInputPad: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 14, top: 16 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, color: '#DC2626' },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12 },
  successText: { fontSize: 13, color: '#15803D', fontWeight: '600' },
  saveBtn: { height: 52, backgroundColor: '#000000', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
