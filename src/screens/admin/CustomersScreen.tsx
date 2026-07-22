import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { useAppStore } from '../../store/appStore';
import { Customer } from '../../types';
import { formatShortDate } from '../../utils/formatters';

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function CustomerCard({ customer, jobCount, lastJobDate, onPress }: {
  customer: Customer;
  jobCount: number;
  lastJobDate: string | null;
  onPress: () => void;
}) {
  const { colors: C } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: '#000000' }]}>
        <Text style={styles.avatarText}>{initials(customer.name)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: C.textPrimary }]}>{customer.name}</Text>
        {customer.phone ? (
          <Text style={[styles.phone, { color: C.textSecondary }]}>{customer.phone}</Text>
        ) : null}
      </View>
      <View style={styles.right}>
        {jobCount > 0 && (
          <View style={styles.jobPill}>
            <Text style={styles.jobPillText}>{jobCount} jobb{jobCount !== 1 ? 'er' : ''}</Text>
          </View>
        )}
        {lastJobDate && (
          <Text style={[styles.lastJob, { color: C.textTertiary }]}>{formatShortDate(lastJobDate)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function CustomersScreen({ navigation }: any) {
  const { colors: C } = useTheme();
  const customers = useAppStore((s) => s.customers);
  const jobs = useAppStore((s) => s.jobs);
  const createCustomer = useAppStore((s) => s.createCustomer);

  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q)
    );
  }, [customers, search]);

  const jobStats = useMemo(() => {
    const stats: Record<string, { count: number; lastDate: string | null }> = {};
    customers.forEach((c) => {
      const customerJobs = jobs.filter((j) => j.customerId === c.id ||
        (j.customerPhone && j.customerPhone === c.phone));
      const sorted = [...customerJobs].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
      stats[c.id] = { count: customerJobs.length, lastDate: sorted[0]?.scheduledAt ?? null };
    });
    return stats;
  }, [customers, jobs]);

  const handleCreate = async () => {
    setCreateError('');
    if (!newName.trim()) { setCreateError('Fyll inn kundenavn'); return; }
    setCreating(true);
    try {
      await createCustomer(newName.trim(), newPhone.trim(), newAddress.trim(), newEmail.trim() || undefined);
      setNewName(''); setNewPhone(''); setNewEmail(''); setNewAddress('');
      setShowNewModal(false);
    } catch (e: any) {
      setCreateError(e.message ?? 'Kunne ikke opprette kunde');
    } finally { setCreating(false); }
  };

  return (
    <ThemedScreen>
      <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <Text style={[styles.title, { color: C.textPrimary }]}>Kunder</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowNewModal(true)}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Ny kunde</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <View style={[styles.searchBox, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
          <Ionicons name="search-outline" size={16} color={C.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: C.textPrimary }]}
            placeholder="Søk på navn eller telefon…"
            placeholderTextColor={C.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={C.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <CustomerCard
            customer={item}
            jobCount={jobStats[item.id]?.count ?? 0}
            lastJobDate={jobStats[item.id]?.lastDate ?? null}
            onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={C.border} />
            <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
              {search ? 'Ingen treff' : 'Ingen kunder ennå'}
            </Text>
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>
              {search
                ? 'Prøv et annet søkeord'
                : 'Kunder legges til automatisk når du oppretter jobber'}
            </Text>
          </View>
        }
      />

      {/* New customer modal */}
      <Modal visible={showNewModal} transparent animationType="slide" onRequestClose={() => setShowNewModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: C.cardBg }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.textPrimary }]}>Ny kunde</Text>
              <TouchableOpacity onPress={() => setShowNewModal(false)}>
                <Ionicons name="close" size={22} color={C.textSecondary} />
              </TouchableOpacity>
            </View>
            {[
              { label: 'NAVN *', value: newName, setter: setNewName, placeholder: 'Kjetil Hansen', kb: 'default' },
              { label: 'TELEFON', value: newPhone, setter: setNewPhone, placeholder: '92345678', kb: 'phone-pad' },
              { label: 'E-POST (for påminnelser)', value: newEmail, setter: setNewEmail, placeholder: 'kjetil@example.com', kb: 'email-address' },
              { label: 'ADRESSE', value: newAddress, setter: setNewAddress, placeholder: 'Gateveien 1, Oslo', kb: 'default' },
            ].map(({ label, value, setter, placeholder, kb }) => (
              <View key={label} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>{label}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.cardAlt, color: C.textPrimary, borderColor: C.border }]}
                  value={value}
                  onChangeText={setter}
                  placeholder={placeholder}
                  placeholderTextColor={C.textTertiary}
                  keyboardType={kb as any}
                  autoCapitalize={kb === 'email-address' ? 'none' : 'sentences'}
                />
              </View>
            ))}
            {createError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{createError}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.createBtn, creating && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
              <Text style={styles.createBtnText}>{creating ? 'Oppretter…' : 'Opprett kunde'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#000000', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  searchWrap: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1, padding: 14,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '600' },
  phone: { fontSize: 13 },
  right: { alignItems: 'flex-end', gap: 4 },
  jobPill: {
    backgroundColor: '#ECECEC', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  jobPillText: { fontSize: 12, fontWeight: '600', color: '#000000' },
  lastJob: { fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 14 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '600' },
  field: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { height: 52, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 15 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, color: '#DC2626' },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, backgroundColor: '#000000', borderRadius: 10,
  },
  createBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
