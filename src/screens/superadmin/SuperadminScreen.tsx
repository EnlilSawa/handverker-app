import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { useSuperadmin } from './SuperadminContext';
import {
  SuperadminCompany,
  SubStatus,
  Plan,
  PLAN_LABELS,
  PLAN_PRICES,
  SUB_STATUS_LABELS,
  BILLING_LABELS,
  BillingStatus,
  companiesToCsv,
  downloadCsv,
} from '../../lib/superadminApi';
import { formatCurrency, formatDate } from '../../utils/formatters';

const NAVY = '#0A1B33';
const EBLUE = '#2563FF';
const GREEN = '#15803D';
const GRAY = '#64748B';
const RED = '#DC2626';

// ── Status-badge (abonnement) ────────────────────────────────────────────────
function statusColors(status: SubStatus): { fg: string; bg: string } {
  switch (status) {
    case 'active':
      return { fg: GREEN, bg: '#F0FDF4' };
    case 'trial':
      return { fg: EBLUE, bg: '#EEF4FF' };
    case 'canceled':
      return { fg: GRAY, bg: '#F1F5F9' };
    case 'expired':
      return { fg: RED, bg: '#FEF2F2' };
  }
}

function StatusBadge({ status }: { status: SubStatus }) {
  const { fg, bg } = statusColors(status);
  return (
    <View style={[badge.wrap, { backgroundColor: bg }]}>
      <Text style={[badge.text, { color: fg }]}>{SUB_STATUS_LABELS[status]}</Text>
    </View>
  );
}

function billingColors(status: BillingStatus): { fg: string; bg: string } {
  switch (status) {
    case 'betalt':
      return { fg: GREEN, bg: '#F0FDF4' };
    case 'fakturert':
      return { fg: '#C2410C', bg: '#FFF7ED' };
    case 'ikke_fakturert':
      return { fg: GRAY, bg: '#F1F5F9' };
  }
}

function BillingBadge({ status }: { status: BillingStatus }) {
  const { fg, bg } = billingColors(status);
  return (
    <View style={[badge.wrap, { backgroundColor: bg }]}>
      <Text style={[badge.text, { color: fg }]}>{BILLING_LABELS[status]}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '600' },
});

// ── Nøkkeltall-kort ──────────────────────────────────────────────────────────
function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  const { colors: C } = useTheme();
  return (
    <View style={[metric.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
      <Text style={[metric.value, { color }]}>{value}</Text>
      <Text style={[metric.label, { color: C.textSecondary }]}>{label}</Text>
    </View>
  );
}

const metric = StyleSheet.create({
  card: { flex: 1, minWidth: 180, borderRadius: 12, borderWidth: 1, padding: 18 },
  value: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  label: { fontSize: 13, marginTop: 6, fontWeight: '500' },
});

// ── Tabell-byggeklosser ──────────────────────────────────────────────────────
function Cell({ children, flex = 1, width }: { children: React.ReactNode; flex?: number; width?: number }) {
  return <View style={[{ paddingHorizontal: 8, justifyContent: 'center' }, width ? { width } : { flex }]}>{children}</View>;
}

function HeaderText({ children }: { children: React.ReactNode }) {
  return <Text style={table.headerText}>{children}</Text>;
}

const table = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  headerText: { fontSize: 11, fontWeight: '700', color: GRAY, textTransform: 'uppercase', letterSpacing: 0.4 },
  row: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, alignItems: 'center' },
  cellPrimary: { fontSize: 14, fontWeight: '600' },
  cellText: { fontSize: 13 },
  cellMuted: { fontSize: 13 },
});

// ── KUNDER-fane ──────────────────────────────────────────────────────────────
type SortKey = 'created' | 'name';
type FilterKey = 'all' | 'arkivert' | SubStatus;

const STATUS_FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'active', label: 'Aktive' },
  { key: 'trial', label: 'Prøveperiode' },
  { key: 'canceled', label: 'Sagt opp' },
  { key: 'expired', label: 'Forfalt' },
  { key: 'arkivert', label: 'Arkiverte' },
];

function CompaniesTab({ onOpen }: { onOpen: (id: string) => void }) {
  const { colors: C } = useTheme();
  const { companies } = useSuperadmin();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('created');

  const rows = useMemo(() => {
    let r = companies;
    if (filter === 'arkivert') {
      r = r.filter((c) => c.archivedAt);
    } else {
      // Arkiverte kunder skjules fra alle vanlige filtre.
      r = r.filter((c) => !c.archivedAt);
      if (filter !== 'all') r = r.filter((c) => c.subscriptionStatus === filter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      // Org.nr matches ignorerer mellomrom (både i søket og i lagret verdi).
      const qDigits = q.replace(/\s/g, '');
      r = r.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.contactEmail ?? '').toLowerCase().includes(q) ||
          (c.orgNumber ?? '').replace(/\s/g, '').toLowerCase().includes(qDigits),
      );
    }
    const sorted = [...r];
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return sorted;
  }, [companies, filter, search, sort]);

  return (
    <View style={{ flex: 1 }}>
      {/* Søk + sortering */}
      <View style={tools.row}>
        <View style={[tools.search, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <Ionicons name="search-outline" size={16} color={C.textTertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Søk bedrift, e-post eller org.nr…"
            placeholderTextColor={C.textTertiary}
            style={[tools.searchInput, { color: C.textPrimary }]}
          />
        </View>
        <TouchableOpacity
          style={[tools.sortBtn, { backgroundColor: C.cardBg, borderColor: C.border }]}
          onPress={() => setSort((s) => (s === 'created' ? 'name' : 'created'))}
        >
          <Ionicons name="swap-vertical-outline" size={15} color={C.textSecondary} />
          <Text style={[tools.sortText, { color: C.textSecondary }]}>
            {sort === 'created' ? 'Registrert dato' : 'Bedriftsnavn'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Statusfilter */}
      <View style={tools.filterRow}>
        {STATUS_FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                tools.chip,
                { backgroundColor: C.cardBg, borderColor: C.border },
                active && { backgroundColor: NAVY, borderColor: NAVY },
              ]}
            >
              <Text style={[tools.chipText, { color: C.textSecondary }, active && { color: '#FFFFFF', fontWeight: '600' }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tabell */}
      <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'}>
        <View style={{ minWidth: 1080 }}>
          <View style={[table.headerRow, { borderBottomColor: C.border }]}>
            <Cell flex={1.6}><HeaderText>Bedrift</HeaderText></Cell>
            <Cell flex={1.2}><HeaderText>Kontaktperson</HeaderText></Cell>
            <Cell flex={1.6}><HeaderText>E-post</HeaderText></Cell>
            <Cell width={110}><HeaderText>Org.nr</HeaderText></Cell>
            <Cell width={90}><HeaderText>Pakke</HeaderText></Cell>
            <Cell width={130}><HeaderText>Status</HeaderText></Cell>
            <Cell width={120}><HeaderText>Registrert</HeaderText></Cell>
            <Cell width={140}><HeaderText>Prøve/Neste faktura</HeaderText></Cell>
            <Cell width={120}><HeaderText>Sist betalt</HeaderText></Cell>
          </View>

          <ScrollView style={{ maxHeight: 560 }}>
            {rows.map((c) => (
              <TouchableOpacity
                key={c.id}
                activeOpacity={0.7}
                onPress={() => onOpen(c.id)}
                style={[table.row, { borderBottomColor: C.border }]}
              >
                <Cell flex={1.6}><Text style={[table.cellPrimary, { color: C.textPrimary }]} numberOfLines={1}>{c.name}</Text></Cell>
                <Cell flex={1.2}><Text style={[table.cellText, { color: C.textSecondary }]} numberOfLines={1}>{c.contactPerson ?? '—'}</Text></Cell>
                <Cell flex={1.6}><Text style={[table.cellMuted, { color: C.textSecondary }]} numberOfLines={1}>{c.contactEmail ?? '—'}</Text></Cell>
                <Cell width={110}><Text style={[table.cellText, { color: C.textSecondary }]} numberOfLines={1}>{c.orgNumber || '—'}</Text></Cell>
                <Cell width={90}><Text style={[table.cellText, { color: C.textPrimary }]}>{c.plan ? PLAN_LABELS[c.plan] : '—'}</Text></Cell>
                <Cell width={130}><StatusBadge status={c.subscriptionStatus} /></Cell>
                <Cell width={120}><Text style={[table.cellMuted, { color: C.textSecondary }]}>{formatDate(c.createdAt)}</Text></Cell>
                <Cell width={140}>
                  <Text style={[table.cellMuted, { color: C.textSecondary }]}>
                    {c.subscriptionStatus === 'trial'
                      ? c.trialEndsAt ? formatDate(c.trialEndsAt) : '—'
                      : c.nextInvoiceDate ? formatDate(c.nextInvoiceDate) : '—'}
                  </Text>
                </Cell>
                <Cell width={120}><Text style={[table.cellMuted, { color: C.textSecondary }]}>{c.lastPaidDate ? formatDate(c.lastPaidDate) : '—'}</Text></Cell>
              </TouchableOpacity>
            ))}
            {rows.length === 0 && (
              <View style={tools.empty}>
                <Text style={{ color: C.textTertiary, fontSize: 14 }}>Ingen bedrifter matcher</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

// ── FAKTURERING-fane ─────────────────────────────────────────────────────────
function BillingTab() {
  const { colors: C } = useTheme();
  const { companies, setBillingStatus } = useSuperadmin();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Aktive kunder som skal faktureres denne måneden.
  const rows = useMemo(
    () => companies.filter((c) => c.subscriptionStatus === 'active'),
    [companies],
  );

  const totalToInvoice = useMemo(
    () => rows.filter((c) => c.billingStatus !== 'betalt').reduce((s, c) => s + c.monthlyAmount, 0),
    [rows],
  );
  const invoicesToSend = useMemo(
    () => rows.filter((c) => c.billingStatus === 'ikke_fakturert').length,
    [rows],
  );

  const handleSet = async (id: string, status: BillingStatus) => {
    setBusyId(id);
    setMsg(null);
    try {
      await setBillingStatus(id, status);
    } catch (e: any) {
      setMsg(e?.message ?? 'Kunne ikke oppdatere status');
    } finally {
      setBusyId(null);
    }
  };

  const handleExport = () => {
    const csv = companiesToCsv(rows);
    const month = new Date().toISOString().slice(0, 7);
    const ok = downloadCsv(`efero-fakturering-${month}.csv`, csv);
    setMsg(ok ? 'Liste eksportert (CSV)' : 'Eksport er kun tilgjengelig på web');
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Summary + eksport */}
      <View style={billing.summaryRow}>
        <View style={[billing.summaryCard, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <Text style={[billing.summaryLabel, { color: C.textSecondary }]}>Total å fakturere denne mnd</Text>
          <Text style={[billing.summaryValue, { color: GREEN }]}>{formatCurrency(totalToInvoice)}</Text>
        </View>
        <View style={[billing.summaryCard, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <Text style={[billing.summaryLabel, { color: C.textSecondary }]}>Fakturaer å sende</Text>
          <Text style={[billing.summaryValue, { color: EBLUE }]}>{invoicesToSend}</Text>
        </View>
        <TouchableOpacity style={billing.exportBtn} onPress={handleExport} activeOpacity={0.85}>
          <Ionicons name="download-outline" size={16} color="#FFFFFF" />
          <Text style={billing.exportText}>Eksporter liste</Text>
        </TouchableOpacity>
      </View>

      {msg && <Text style={[billing.msg, { color: C.textSecondary }]}>{msg}</Text>}

      <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'}>
        <View style={{ minWidth: 980 }}>
          <View style={[table.headerRow, { borderBottomColor: C.border }]}>
            <Cell flex={1.6}><HeaderText>Bedrift</HeaderText></Cell>
            <Cell width={120}><HeaderText>Org.nr</HeaderText></Cell>
            <Cell width={170}><HeaderText>Pakke og beløp</HeaderText></Cell>
            <Cell width={130}><HeaderText>Faktureringsdato</HeaderText></Cell>
            <Cell width={130}><HeaderText>Status</HeaderText></Cell>
            <Cell flex={1.4}><HeaderText>Handlinger</HeaderText></Cell>
          </View>

          <ScrollView style={{ maxHeight: 560 }}>
            {rows.map((c) => (
              <View key={c.id} style={[table.row, { borderBottomColor: C.border }]}>
                <Cell flex={1.6}><Text style={[table.cellPrimary, { color: C.textPrimary }]} numberOfLines={1}>{c.name}</Text></Cell>
                <Cell width={120}><Text style={[table.cellText, { color: C.textSecondary }]}>{c.orgNumber || '—'}</Text></Cell>
                <Cell width={170}>
                  <Text style={[table.cellText, { color: C.textPrimary }]}>
                    {c.plan ? PLAN_LABELS[c.plan] : '—'} · {formatCurrency(c.monthlyAmount)}
                  </Text>
                </Cell>
                <Cell width={130}><Text style={[table.cellMuted, { color: C.textSecondary }]}>{c.nextInvoiceDate ? formatDate(c.nextInvoiceDate) : '—'}</Text></Cell>
                <Cell width={130}><BillingBadge status={c.billingStatus} /></Cell>
                <Cell flex={1.4}>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <TouchableOpacity
                      disabled={busyId === c.id || c.billingStatus === 'fakturert' || c.billingStatus === 'betalt'}
                      onPress={() => handleSet(c.id, 'fakturert')}
                      style={[
                        billing.actionBtn,
                        { borderColor: C.border },
                        (c.billingStatus === 'fakturert' || c.billingStatus === 'betalt') && { opacity: 0.4 },
                      ]}
                    >
                      <Text style={[billing.actionText, { color: C.textPrimary }]}>Marker som fakturert</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={busyId === c.id || c.billingStatus === 'betalt'}
                      onPress={() => handleSet(c.id, 'betalt')}
                      style={[billing.actionBtnPrimary, c.billingStatus === 'betalt' && { opacity: 0.4 }]}
                    >
                      <Text style={billing.actionTextPrimary}>Marker som betalt</Text>
                    </TouchableOpacity>
                  </View>
                </Cell>
              </View>
            ))}
            {rows.length === 0 && (
              <View style={tools.empty}>
                <Text style={{ color: C.textTertiary, fontSize: 14 }}>Ingen aktive kunder å fakturere</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const billing = StyleSheet.create({
  summaryRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' },
  summaryCard: { borderRadius: 12, borderWidth: 1, padding: 16, minWidth: 220 },
  summaryLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  summaryValue: { fontSize: 22, fontWeight: '700' },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto',
    backgroundColor: EBLUE, paddingHorizontal: 16, height: 44, borderRadius: 10,
  },
  exportText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  msg: { fontSize: 13, marginBottom: 10 },
  actionBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  actionText: { fontSize: 12, fontWeight: '600' },
  actionBtnPrimary: { backgroundColor: GREEN, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  actionTextPrimary: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
});

const tools = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 240,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 44 },
  sortText: { fontSize: 13, fontWeight: '500' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: 48 },
});

// ── Opprett ny kunde (Efero lager kontoen) ───────────────────────────────────
function Field({ label, value, onChange, placeholder, secure, keyboardType }: any) {
  const { colors: C } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[create.label, { color: C.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.textTertiary}
        secureTextEntry={secure}
        autoCapitalize={secure || keyboardType === 'email-address' ? 'none' : 'sentences'}
        keyboardType={keyboardType}
        style={[create.input, { color: C.textPrimary, borderColor: C.border, backgroundColor: C.cardAlt }]}
      />
    </View>
  );
}

function CreateCompanyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors: C } = useTheme();
  const { createCompany } = useSuperadmin();
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgNumber, setOrgNumber] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ email: string; password: string; companyName: string } | null>(null);

  const reset = () => {
    setCompanyName(''); setContactName(''); setEmail(''); setPassword('');
    setOrgNumber(''); setHourlyRate(''); setPlan(null); setErr(null); setDone(null); setBusy(false);
  };
  const close = () => { reset(); onClose(); };

  const submit = async () => {
    setErr(null);
    if (!companyName.trim()) return setErr('Firmanavn mangler');
    if (!contactName.trim()) return setErr('Kontaktperson mangler');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Ugyldig e-post');
    if (password.length < 8) return setErr('Passordet må ha minst 8 tegn');
    setBusy(true);
    try {
      const res = await createCompany({
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        adminEmail: email.trim(),
        password,
        orgNumber: orgNumber.trim() || undefined,
        hourlyRate: hourlyRate ? Number(hourlyRate) : 0,
        plan: plan ?? undefined,
        monthlyAmount: plan ? PLAN_PRICES[plan] : 0,
      });
      setDone({ email: res.email, password, companyName: res.companyName });
    } catch (e: any) {
      setErr(e?.message ?? 'Kunne ikke opprette kunde');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={create.backdrop}>
        <View style={[create.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <ScrollView>
            {done ? (
              <>
                <Text style={[create.title, { color: C.textPrimary }]}>✓ Kunde opprettet</Text>
                <Text style={[create.sub, { color: C.textSecondary }]}>
                  {done.companyName} er klar. Del denne innloggingen med kunden — de kan logge inn på portal.efero.no med én gang:
                </Text>
                <View style={[create.credBox, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
                  <Text style={[create.credLabel, { color: C.textTertiary }]}>E-post</Text>
                  <Text style={[create.credValue, { color: C.textPrimary }]} selectable>{done.email}</Text>
                  <Text style={[create.credLabel, { color: C.textTertiary, marginTop: 10 }]}>Midlertidig passord</Text>
                  <Text style={[create.credValue, { color: C.textPrimary }]} selectable>{done.password}</Text>
                </View>
                <Text style={[create.hint, { color: C.textTertiary }]}>
                  Kunden bør bytte passord i Innstillinger, og fyller inn timepris/teknikere selv.
                </Text>
                <TouchableOpacity style={create.primaryBtn} onPress={close}>
                  <Text style={create.primaryBtnText}>Ferdig</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[create.title, { color: C.textPrimary }]}>Opprett ny kunde</Text>
                <Text style={[create.sub, { color: C.textSecondary }]}>
                  Efero lager kontoen. Kunden logger inn med e-post + passordet du setter her.
                </Text>
                <Field label="Firmanavn *" value={companyName} onChange={setCompanyName} placeholder="VVS Service AS" />
                <Field label="Kontaktperson *" value={contactName} onChange={setContactName} placeholder="Ola Nordmann" />
                <Field label="E-post *" value={email} onChange={setEmail} placeholder="ola@vvsservice.no" keyboardType="email-address" />
                <Field label="Midlertidig passord *" value={password} onChange={setPassword} placeholder="Minst 8 tegn" secure />
                <Field label="Org.nr (valgfritt)" value={orgNumber} onChange={setOrgNumber} placeholder="123456789" keyboardType="number-pad" />
                <Field label="Timepris (valgfritt — kunden kan sette selv)" value={hourlyRate} onChange={setHourlyRate} placeholder="0" keyboardType="number-pad" />

                <Text style={[create.label, { color: C.textSecondary }]}>Pakke (valgfritt)</Text>
                <View style={create.planRow}>
                  {(['liten', 'middels', 'stor'] as Plan[]).map((p) => {
                    const sel = plan === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setPlan(sel ? null : p)}
                        style={[create.planBtn, { borderColor: sel ? EBLUE : C.border }, sel && { backgroundColor: '#EEF4FF' }]}
                      >
                        <Text style={[create.planText, { color: sel ? EBLUE : C.textPrimary }]}>
                          {PLAN_LABELS[p]} ({PLAN_PRICES[p]})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {err && <Text style={create.err}>{err}</Text>}

                <View style={create.btnRow}>
                  <TouchableOpacity style={[create.cancelBtn, { borderColor: C.border }]} onPress={close} disabled={busy}>
                    <Text style={[create.cancelText, { color: C.textPrimary }]}>Avbryt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[create.primaryBtn, { flex: 1 }, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
                    {busy ? <ActivityIndicator color="#FFF" /> : <Text style={create.primaryBtnText}>Opprett kunde</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const create = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 460, maxHeight: '90%', borderRadius: 16, borderWidth: 1, padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  sub: { fontSize: 13, lineHeight: 19, marginBottom: 18 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },
  planRow: { flexDirection: 'row', gap: 8, marginBottom: 8, marginTop: 2 },
  planBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  planText: { fontSize: 12, fontWeight: '600' },
  err: { color: RED, fontSize: 13, marginTop: 8 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600' },
  primaryBtn: { backgroundColor: EBLUE, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  credBox: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 14 },
  credLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  credValue: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  hint: { fontSize: 12, lineHeight: 17, marginBottom: 18 },
});

// ── Hovedskjerm ──────────────────────────────────────────────────────────────
export function SuperadminScreen({ navigation }: any) {
  const { colors: C } = useTheme();
  const { metrics, loading, error, refresh } = useSuperadmin();
  const [tab, setTab] = useState<'kunder' | 'fakturering'>('kunder');
  const [showCreate, setShowCreate] = useState(false);

  return (
    <ThemedScreen>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {/* Header */}
        <View style={head.row}>
          <View>
            <Text style={[head.title, { color: C.textPrimary }]}>Superadmin</Text>
            <Text style={[head.subtitle, { color: C.textSecondary }]}>Efero — kunde- og faktureringsoversikt</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity style={head.createBtn} onPress={() => setShowCreate(true)}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={head.createText}>Opprett kunde</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[head.refresh, { borderColor: C.border }]} onPress={refresh}>
              <Ionicons name="refresh-outline" size={16} color={C.textSecondary} />
              <Text style={[head.refreshText, { color: C.textSecondary }]}>Oppdater</Text>
            </TouchableOpacity>
          </View>
        </View>

        <CreateCompanyModal visible={showCreate} onClose={() => setShowCreate(false)} />

        {error && (
          <View style={[head.error]}>
            <Text style={head.errorText}>{error}</Text>
          </View>
        )}

        {/* Nøkkeltall */}
        <View style={head.metrics}>
          <MetricCard label="Aktive kunder" value={String(metrics?.activeCount ?? 0)} color={GREEN} />
          <MetricCard label="I prøveperiode" value={String(metrics?.trialCount ?? 0)} color={EBLUE} />
          <MetricCard label="Månedlig inntekt (MRR)" value={formatCurrency(metrics?.mrr ?? 0)} color={GREEN} />
          <MetricCard label="Sagt opp" value={String(metrics?.canceledCount ?? 0)} color={GRAY} />
        </View>

        {/* Faner */}
        <View style={[head.tabs, { borderBottomColor: C.border }]}>
          {([
            { key: 'kunder', label: 'Kundeliste' },
            { key: 'fakturering', label: 'Fakturering denne måneden' },
          ] as const).map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={head.tab}>
                <Text style={[head.tabText, { color: active ? EBLUE : C.textSecondary }]}>{t.label}</Text>
                {active && <View style={head.tabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={EBLUE} />
          </View>
        ) : tab === 'kunder' ? (
          <CompaniesTab onOpen={(id) => navigation.navigate('SuperadminCompanyDetail', { companyId: id })} />
        ) : (
          <BillingTab />
        )}
      </ScrollView>
    </ThemedScreen>
  );
}

const head = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4 },
  refresh: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 40 },
  refreshText: { fontSize: 13, fontWeight: '500' },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: EBLUE, borderRadius: 10, paddingHorizontal: 16, height: 40 },
  createText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  error: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: RED, fontSize: 13 },
  metrics: { flexDirection: 'row', gap: 14, marginBottom: 28, flexWrap: 'wrap' },
  tabs: { flexDirection: 'row', gap: 24, borderBottomWidth: 1, marginBottom: 20 },
  tab: { paddingBottom: 12 },
  tabText: { fontSize: 15, fontWeight: '600' },
  tabUnderline: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, backgroundColor: EBLUE },
});
