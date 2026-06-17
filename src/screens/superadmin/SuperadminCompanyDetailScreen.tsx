import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { useSuperadmin } from './SuperadminContext';
import {
  Plan,
  PLAN_LABELS,
  PLAN_PRICES,
  SUB_STATUS_LABELS,
  BILLING_LABELS,
} from '../../lib/superadminApi';
import { formatCurrency, formatDate } from '../../utils/formatters';

const NAVY = '#0A1B33';
const EBLUE = '#2563FF';
const GREEN = '#15803D';
const RED = '#DC2626';
const GRAY = '#64748B';

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors: C } = useTheme();
  return (
    <View style={[styles.infoRow, { borderBottomColor: C.border }]}>
      <Text style={[styles.infoLabel, { color: C.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: C.textPrimary }]}>{value}</Text>
    </View>
  );
}

function ActivityStat({ icon, value, label }: { icon: any; value: number; label: string }) {
  const { colors: C } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
      <Ionicons name={icon} size={18} color={EBLUE} />
      <Text style={[styles.statValue, { color: C.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: C.textSecondary }]}>{label}</Text>
    </View>
  );
}

function TimelineItem({ label, date, color }: { label: string; date: string | null; color: string }) {
  const { colors: C } = useTheme();
  return (
    <View style={styles.timelineRow}>
      <View style={[styles.timelineDot, { backgroundColor: date ? color : C.border }]} />
      <Text style={[styles.timelineLabel, { color: C.textPrimary }]}>{label}</Text>
      <Text style={[styles.timelineDate, { color: C.textSecondary }]}>{date ? formatDate(date) : '—'}</Text>
    </View>
  );
}

export function SuperadminCompanyDetailScreen({ route, navigation }: any) {
  const { colors: C } = useTheme();
  const { companyId } = route.params ?? {};
  const { getCompany, updateCompany } = useSuperadmin();
  const company = getCompany(companyId);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!company) {
    return (
      <ThemedScreen>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: C.textSecondary }}>Bedrift ikke funnet.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
            <Text style={{ color: EBLUE, fontWeight: '600' }}>Tilbake</Text>
          </TouchableOpacity>
        </View>
      </ThemedScreen>
    );
  }

  const run = async (fn: () => Promise<void>, okMsg: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg(okMsg);
    } catch (e: any) {
      setMsg(e?.message ?? 'Handlingen feilet');
    } finally {
      setBusy(false);
    }
  };

  const isActive = company.subscriptionStatus === 'active';

  return (
    <ThemedScreen>
      <ScrollView contentContainerStyle={{ padding: 24, maxWidth: 880, width: '100%', alignSelf: 'center' }}>
        {/* Tilbake */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
          <Text style={[styles.backText, { color: C.textPrimary }]}>Alle kunder</Text>
        </TouchableOpacity>

        {/* Tittel */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: C.textPrimary }]}>{company.name}</Text>
          <View style={[styles.subBadge, { backgroundColor: isActive ? '#F0FDF4' : '#F1F5F9' }]}>
            <Text style={[styles.subBadgeText, { color: isActive ? GREEN : GRAY }]}>
              {SUB_STATUS_LABELS[company.subscriptionStatus]}
            </Text>
          </View>
        </View>

        {msg && (
          <View style={[styles.msg, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
            <Text style={{ color: C.textSecondary, fontSize: 13 }}>{msg}</Text>
          </View>
        )}

        {/* Bedriftsinfo */}
        <Text style={[styles.section, { color: C.textPrimary }]}>Bedriftsinfo</Text>
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <InfoRow label="Kontaktperson" value={company.contactPerson ?? '—'} />
          <InfoRow label="E-post" value={company.contactEmail ?? '—'} />
          <InfoRow label="Org.nr" value={company.orgNumber || '—'} />
          <InfoRow label="Pakke" value={company.plan ? `${PLAN_LABELS[company.plan]} · ${formatCurrency(company.monthlyAmount)}/mnd` : 'Ikke satt'} />
          <InfoRow label="Faktureringsstatus" value={BILLING_LABELS[company.billingStatus]} />
          <InfoRow label="Registrert" value={formatDate(company.createdAt)} />
        </View>

        {/* Aktivitetsnivå */}
        <Text style={[styles.section, { color: C.textPrimary }]}>Aktivitetsnivå</Text>
        <View style={styles.statRow}>
          <ActivityStat icon="people-outline" value={company.technicianCount} label="Teknikere" />
          <ActivityStat icon="shield-outline" value={company.adminCount} label="Admins" />
          <ActivityStat icon="briefcase-outline" value={company.jobCount} label="Jobber" />
          <ActivityStat icon="document-text-outline" value={company.invoiceCount} label="Fakturaer" />
        </View>

        {/* Abonnements- og betalingshistorikk */}
        <Text style={[styles.section, { color: C.textPrimary }]}>Abonnements- og betalingshistorikk</Text>
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <TimelineItem label="Registrert" date={company.createdAt} color={EBLUE} />
          <TimelineItem label="Prøveperiode utløper" date={company.trialEndsAt} color="#C2410C" />
          <TimelineItem label="Neste faktura" date={company.nextInvoiceDate} color={EBLUE} />
          <TimelineItem label="Sist fakturert" date={company.lastInvoicedDate} color="#C2410C" />
          <TimelineItem label="Sist betalt" date={company.lastPaidDate} color={GREEN} />
        </View>

        {/* Handlinger */}
        <Text style={[styles.section, { color: C.textPrimary }]}>Handlinger</Text>

        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border, gap: 18 }]}>
          {/* Forleng prøveperiode */}
          <View>
            <Text style={[styles.actionLabel, { color: C.textSecondary }]}>Forleng prøveperiode</Text>
            <View style={styles.btnRow}>
              <TouchableOpacity disabled={busy} style={[styles.outlineBtn, { borderColor: C.border }]} onPress={() => run(() => updateCompany(company.id, { extendTrialDays: 14 }), 'Prøveperiode forlenget 14 dager')}>
                <Text style={[styles.outlineBtnText, { color: C.textPrimary }]}>+14 dager</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={busy} style={[styles.outlineBtn, { borderColor: C.border }]} onPress={() => run(() => updateCompany(company.id, { extendTrialDays: 30 }), 'Prøveperiode forlenget 30 dager')}>
                <Text style={[styles.outlineBtnText, { color: C.textPrimary }]}>+30 dager</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Endre pakke */}
          <View>
            <Text style={[styles.actionLabel, { color: C.textSecondary }]}>Endre pakke</Text>
            <View style={styles.btnRow}>
              {(['liten', 'middels', 'stor'] as Plan[]).map((p) => {
                const selected = company.plan === p;
                return (
                  <TouchableOpacity
                    key={p}
                    disabled={busy}
                    style={[styles.outlineBtn, { borderColor: selected ? EBLUE : C.border }, selected && { backgroundColor: '#EEF4FF' }]}
                    onPress={() => run(() => updateCompany(company.id, { plan: p, monthlyAmount: PLAN_PRICES[p] }), `Pakke endret til ${PLAN_LABELS[p]}`)}
                  >
                    <Text style={[styles.outlineBtnText, { color: selected ? EBLUE : C.textPrimary }]}>
                      {PLAN_LABELS[p]} ({PLAN_PRICES[p]} kr)
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Aktiv/inaktiv */}
          <View>
            <Text style={[styles.actionLabel, { color: C.textSecondary }]}>Abonnementsstatus</Text>
            <View style={styles.btnRow}>
              <TouchableOpacity
                disabled={busy}
                style={[styles.solidBtn, { backgroundColor: isActive ? '#F1F5F9' : GREEN }]}
                onPress={() => run(() => updateCompany(company.id, { subscriptionStatus: isActive ? 'canceled' : 'active' }), isActive ? 'Markert som inaktiv (sagt opp)' : 'Markert som aktiv')}
              >
                <Text style={[styles.solidBtnText, { color: isActive ? GRAY : '#FFFFFF' }]}>
                  {isActive ? 'Marker som inaktiv' : 'Marker som aktiv'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Send melding */}
          <View>
            <Text style={[styles.actionLabel, { color: C.textSecondary }]}>Kontakt</Text>
            <View style={styles.btnRow}>
              <TouchableOpacity
                disabled={!company.contactEmail}
                style={[styles.solidBtn, { backgroundColor: EBLUE }, !company.contactEmail && { opacity: 0.4 }]}
                onPress={() => company.contactEmail && Linking.openURL(`mailto:${company.contactEmail}`)}
              >
                <Ionicons name="mail-outline" size={15} color="#FFFFFF" />
                <Text style={[styles.solidBtnText, { color: '#FFFFFF' }]}>Send melding</Text>
              </TouchableOpacity>
            </View>
          </View>

          {busy && <ActivityIndicator color={EBLUE} />}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  backText: { fontSize: 15, fontWeight: '600' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  subBadgeText: { fontSize: 12, fontWeight: '600' },
  msg: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 4 },
  section: { fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 12, padding: 18 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, gap: 16 },
  infoLabel: { fontSize: 13, fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  statRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: 120, borderWidth: 1, borderRadius: 12, padding: 16, gap: 6 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, fontWeight: '500' },
  timelineRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineLabel: { fontSize: 14, fontWeight: '500', flex: 1 },
  timelineDate: { fontSize: 13 },
  actionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  btnRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  outlineBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11 },
  outlineBtnText: { fontSize: 13, fontWeight: '600' },
  solidBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12 },
  solidBtnText: { fontSize: 13, fontWeight: '600' },
});
