import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking,
  TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { useAppStore } from '../../store/appStore';
import { Job, JobStatus } from '../../types';
import { formatCurrency, formatDate, formatShortDate } from '../../utils/formatters';

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

const STATUS_CFG: Record<JobStatus, { label: string; color: string; bg: string }> = {
  new: { label: 'Ny', color: '#2563FF', bg: '#EEF4FF' },
  in_progress: { label: 'Pågår', color: '#C2410C', bg: '#FFF7ED' },
  completed: { label: 'Ferdig', color: '#15803D', bg: '#F0FDF4' },
};

export function CustomerDetailScreen({ route, navigation }: any) {
  const { customerId } = route.params as { customerId: string };
  const { colors: C } = useTheme();

  const customer = useAppStore((s) => s.customers.find((c) => c.id === customerId));
  const jobs = useAppStore((s) => s.jobs);
  const invoices = useAppStore((s) => s.invoices);
  const updateCustomer = useAppStore((s) => s.updateCustomer);

  const [showEdit, setShowEdit] = useState(false);
  const [eName, setEName] = useState('');
  const [ePhone, setEPhone] = useState('');
  const [eEmail, setEEmail] = useState('');
  const [eAddress, setEAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const customerJobs = useMemo(() => {
    return [...jobs.filter(
      (j) => j.customerId === customerId ||
        (customer?.phone && j.customerPhone === customer.phone)
    )].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
  }, [jobs, customerId, customer]);

  const stats = useMemo(() => {
    const completedJobs = customerJobs.filter((j) => j.status === 'completed');
    const jobIds = new Set(customerJobs.map((j) => j.id));
    const customerInvoices = invoices.filter((inv) => jobIds.has(inv.jobId) && inv.status === 'paid');
    const totalRevenue = customerInvoices.reduce((s, inv) => s + inv.total, 0);
    const lastJob = customerJobs[0]?.scheduledAt ?? null;
    return { totalJobs: customerJobs.length, completedJobs: completedJobs.length, totalRevenue, lastJob };
  }, [customerJobs, invoices]);

  if (!customer) return null;

  const openEdit = () => {
    setEName(customer.name);
    setEPhone(customer.phone ?? '');
    setEEmail(customer.email ?? '');
    setEAddress(customer.address ?? '');
    setEditError('');
    setShowEdit(true);
  };

  const handleSave = async () => {
    setEditError('');
    if (!eName.trim()) { setEditError('Navn kan ikke være tomt'); return; }
    if (eEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eEmail.trim())) {
      setEditError('Skriv inn en gyldig e-postadresse'); return;
    }
    setSaving(true);
    try {
      await updateCustomer(customerId, {
        name: eName, phone: ePhone, email: eEmail, address: eAddress,
      });
      setShowEdit(false);
    } catch (e: any) {
      setEditError(e.message ?? 'Kunne ikke lagre endringene');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedScreen>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]} numberOfLines={1}>
          {customer.name}
        </Text>
        <TouchableOpacity onPress={openEdit} accessibilityLabel="Rediger kunde">
          <Ionicons name="create-outline" size={22} color="#000000" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar + name */}
        <View style={[styles.heroCard, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{initials(customer.name)}</Text>
          </View>
          <Text style={[styles.heroName, { color: C.textPrimary }]}>{customer.name}</Text>
          {customer.phone ? (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${customer.phone}`)}>
              <Text style={styles.heroPhone}>{customer.phone}</Text>
            </TouchableOpacity>
          ) : null}
          {customer.address ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(customer.address!)}`)}
            >
              <Text style={styles.heroAddress}>{customer.address}</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={[styles.heroSince, { color: C.textTertiary }]}>
            Kunde siden {formatDate(customer.createdAt)}
          </Text>
          <TouchableOpacity
            style={styles.newJobBtn}
            onPress={() => navigation.navigate('NewJob', {
              prefillName: customer.name,
              prefillPhone: customer.phone ?? '',
              prefillEmail: customer.email ?? '',
              prefillAddress: customer.address ?? '',
            })}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.newJobBtnText}>Ny jobb for denne kunden</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Jobber', value: String(stats.totalJobs), color: '#000000', bg: '#ECECEC' },
            { label: 'Fullført', value: String(stats.completedJobs), color: '#15803D', bg: '#F0FDF4' },
            { label: 'Omsetning', value: formatCurrency(stats.totalRevenue), color: '#C2410C', bg: '#FFF7ED' },
          ].map(({ label, value, color, bg }) => (
            <View key={label} style={[styles.statCard, { backgroundColor: C.cardBg, borderColor: C.border }]}>
              <Text style={[styles.statValue, { color }]}>{value}</Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Contact info */}
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>KONTAKTINFORMASJON</Text>
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          {[
            { icon: 'person-outline', label: 'Navn', value: customer.name },
            { icon: 'call-outline', label: 'Telefon', value: customer.phone },
            { icon: 'mail-outline', label: 'E-post', value: customer.email },
            { icon: 'location-outline', label: 'Adresse', value: customer.address },
          ].filter((r) => r.value).map(({ icon, label, value }) => (
            <View key={label} style={styles.infoRow}>
              <Ionicons name={icon as any} size={15} color={C.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: C.textTertiary }]}>{label}</Text>
                <Text style={[styles.infoValue, { color: C.textPrimary }]}>{value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Job history */}
        <Text style={[styles.sectionTitle, { color: C.textSecondary }]}>JOBBHISTORIKK</Text>
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          {customerJobs.length === 0 ? (
            <Text style={[styles.emptyJobs, { color: C.textTertiary }]}>Ingen jobber ennå</Text>
          ) : (
            customerJobs.map((job, i) => {
              const cfg = STATUS_CFG[job.status];
              const invoice = invoices.find((inv) => inv.jobId === job.id);
              const isLast = i === customerJobs.length - 1;
              return (
                <TouchableOpacity
                  key={job.id}
                  style={[styles.jobRow, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                  onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.jobDesc, { color: C.textPrimary }]} numberOfLines={1}>
                      {job.description}
                    </Text>
                    <Text style={[styles.jobMeta, { color: C.textTertiary }]}>
                      {formatShortDate(job.scheduledAt)}
                      {job.assignedTechnicianName ? ` · ${job.assignedTechnicianName}` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    {invoice && (
                      <Text style={[styles.jobAmount, { color: C.textSecondary }]}>
                        {formatCurrency(invoice.total)}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.textTertiary} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Edit customer modal */}
      <Modal visible={showEdit} transparent animationType="slide" onRequestClose={() => setShowEdit(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: C.cardBg }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: C.textPrimary }]}>Rediger kunde</Text>
              <TouchableOpacity onPress={() => setShowEdit(false)}>
                <Ionicons name="close" size={22} color={C.textSecondary} />
              </TouchableOpacity>
            </View>
            {[
              { label: 'NAVN *', value: eName, setter: setEName, placeholder: 'Kjetil Hansen', kb: 'default' },
              { label: 'TELEFON', value: ePhone, setter: setEPhone, placeholder: '92345678', kb: 'phone-pad' },
              { label: 'E-POST', value: eEmail, setter: setEEmail, placeholder: 'kjetil@example.com', kb: 'email-address' },
              { label: 'ADRESSE', value: eAddress, setter: setEAddress, placeholder: 'Gateveien 1, Oslo', kb: 'default' },
            ].map(({ label, value, setter, placeholder, kb }) => (
              <View key={label} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>{label}</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: C.cardAlt, color: C.textPrimary, borderColor: C.border }]}
                  value={value}
                  onChangeText={setter}
                  placeholder={placeholder}
                  placeholderTextColor={C.textTertiary}
                  keyboardType={kb as any}
                  autoCapitalize={kb === 'email-address' ? 'none' : 'sentences'}
                />
              </View>
            ))}
            {editError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{editError}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
              <Text style={styles.saveBtnText}>{saving ? 'Lagrer…' : 'Lagre endringer'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center', marginHorizontal: 8 },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  heroCard: {
    borderRadius: 12, borderWidth: 1, padding: 20,
    alignItems: 'center', gap: 6,
  },
  avatarLarge: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  heroName: { fontSize: 22, fontWeight: '600' },
  heroPhone: { fontSize: 15, color: '#000000', textDecorationLine: 'underline' },
  heroAddress: { fontSize: 14, color: '#000000', textDecorationLine: 'underline' },
  heroSince: { fontSize: 12 },
  newJobBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 48, backgroundColor: '#000000', borderRadius: 10,
    width: '100%', marginTop: 8,
  },
  newJobBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, borderRadius: 12, borderWidth: 1,
    padding: 14, alignItems: 'center', gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '500' },
  sectionTitle: {
    fontSize: 11, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.6, marginBottom: -4,
  },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValue: { fontSize: 14, marginTop: 1 },
  emptyJobs: { fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  jobRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12,
  },
  jobDesc: { fontSize: 14, fontWeight: '500' },
  jobMeta: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
  jobAmount: { fontSize: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 14 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '600' },
  field: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { height: 52, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 15 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, color: '#DC2626' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, backgroundColor: '#000000', borderRadius: 10,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
