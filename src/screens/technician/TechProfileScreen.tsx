import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAppStore } from '../../store/appStore';

export function TechProfileScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const jobs = useAppStore((s) => s.jobs);
  const logout = useAppStore((s) => s.logout);
  const company = useAppStore((s) => s.company);

  const myJobs = jobs.filter((j) => j.assignedTechnicianId === currentUser?.id);
  const completed = myJobs.filter((j) => j.status === 'completed').length;
  const totalHours = myJobs.reduce((s, j) => s + (j.hoursWorked ?? 0), 0);

  const initials = currentUser?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2) ?? '?';

  const items: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
    { icon: 'mail-outline', label: 'E-post', value: currentUser?.email ?? '' },
    { icon: 'call-outline', label: 'Telefon', value: currentUser?.phone ?? '' },
    { icon: 'business-outline', label: 'Firma', value: company?.name ?? '' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{currentUser?.name}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>Tekniker</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{completed}</Text>
          <Text style={styles.statLabel}>Fullførte jobber</Text>
        </View>
        <View style={[styles.statCell, styles.statBorder]}>
          <Text style={styles.statValue}>{totalHours.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Timer totalt</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{myJobs.filter(j => j.status !== 'completed').length}</Text>
          <Text style={styles.statLabel}>Aktive jobber</Text>
        </View>
      </View>

      <View style={styles.section}>
        {items.map(({ icon, label, value }) => (
          <View key={label} style={styles.infoRow}>
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={18} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={logout}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Logg ut</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundSecondary },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.textDark },
  profileCard: {
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingVertical: 28,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: colors.white },
  name: { fontSize: 20, fontWeight: '800', color: colors.textDark },
  roleBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: colors.primary + '15',
    borderRadius: 20,
  },
  roleText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: 12,
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textGray, marginTop: 3, textAlign: 'center' },
  section: {
    backgroundColor: colors.white,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: colors.textGray, fontWeight: '500' },
  infoValue: { fontSize: 15, color: colors.textDark, marginTop: 1 },
  footer: { padding: 24 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 14,
  },
  logoutText: { fontSize: 16, color: colors.danger, fontWeight: '600' },
});
