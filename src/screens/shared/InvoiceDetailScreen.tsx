import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAppStore } from '../../store/appStore';
import { InvoiceStatus } from '../../types';
import { formatCurrency, formatDate, formatShortDate } from '../../utils/formatters';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  sent: { label: 'Sendt', color: colors.primary, bg: colors.primary + '15' },
  paid: { label: 'Betalt', color: colors.success, bg: colors.success + '15' },
  overdue: { label: 'Forfalt', color: colors.danger, bg: colors.danger + '15' },
};

export function InvoiceDetailScreen({ route, navigation }: any) {
  const invoiceId = route?.params?.invoiceId;
  const invoices = useAppStore((s) => s.invoices);
  const company = useAppStore((s) => s.company);
  const currentUser = useAppStore((s) => s.currentUser);
  const updateInvoiceStatus = useAppStore((s) => s.updateInvoiceStatus);

  const invoice = invoices.find((i) => i.id === invoiceId) ?? invoices[invoices.length - 1];
  if (!invoice) return null;

  const cfg = STATUS_CONFIG[invoice.status];
  const isAdmin = currentUser?.role === 'admin';

  const handleMarkPaid = () => {
    Alert.alert('Marker som betalt', 'Bekreft at faktura er betalt?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Betalt',
        onPress: () => {
          updateInvoiceStatus(invoice.id, 'paid');
          Alert.alert('Oppdatert', 'Faktura er markert som betalt');
        },
      },
    ]);
  };

  const handleVipps = () => {
    Alert.alert(
      'Vipps-betaling',
      `Sender betalingsforespørsel på ${formatCurrency(invoice.total)} til ${invoice.customerName} via Vipps.\n\n(Vipps eCom API-integrasjon konfigureres i produksjonsmiljø)`,
      [{ text: 'OK' }]
    );
  };

  const handleSendSMS = () => {
    Alert.alert(
      'Send faktura på SMS',
      `Sender faktura ${invoice.invoiceNumber} til kunden via SMS.\n\n(Twilio/Sveve SMS-integrasjon konfigureres i produksjonsmiljø)`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        {navigation && (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textDark} />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>Faktura</Text>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.invoiceCard}>
          <View style={styles.invoiceTop}>
            <View>
              <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
              <Text style={styles.invoiceDate}>Dato: {formatDate(invoice.createdAt)}</Text>
              <Text style={styles.invoiceDue}>Forfall: {formatShortDate(invoice.dueDate)}</Text>
            </View>
            <View style={styles.companyBadge}>
              <Text style={styles.companyInitials}>
                {company?.name.split(' ').map((w) => w[0]).join('').slice(0, 3) ?? '?'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.partyRow}>
            <View style={styles.party}>
              <Text style={styles.partyLabel}>Fra</Text>
              <Text style={styles.partyName}>{company?.name ?? ''}</Text>
              <Text style={styles.partyDetail}>Org.nr: {company?.orgNumber ?? ''}</Text>
              <Text style={styles.partyDetail}>{company?.address ?? ''}</Text>
            </View>
            <View style={[styles.party, { alignItems: 'flex-end' }]}>
              <Text style={styles.partyLabel}>Til</Text>
              <Text style={styles.partyName}>{invoice.customerName}</Text>
              <Text style={styles.partyDetail}>{invoice.customerAddress}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Spesifikasjon</Text>
          {invoice.lineItems.map((item, i) => (
            <View key={i} style={styles.lineItem}>
              <View style={styles.lineLeft}>
                <Text style={styles.lineDesc}>{item.description}</Text>
              </View>
              <Text style={styles.lineAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Sum eks. MVA</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.subtotalExVat)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>MVA 25%</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.vat)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>Totalt inkl. MVA</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(invoice.total)}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.vippsBtn} onPress={handleVipps}>
            <Ionicons name="phone-portrait-outline" size={20} color={colors.white} />
            <Text style={styles.vippsBtnText}>Betal med Vipps</Text>
          </TouchableOpacity>

          {isAdmin && (
            <>
              <TouchableOpacity style={styles.smsBtn} onPress={handleSendSMS}>
                <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
                <Text style={styles.smsBtnText}>Send faktura på SMS</Text>
              </TouchableOpacity>

              {invoice.status !== 'paid' && (
                <TouchableOpacity style={styles.paidBtn} onPress={handleMarkPaid}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
                  <Text style={styles.paidBtnText}>Marker som betalt</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={styles.terms}>
          <Text style={styles.termsText}>
            Betalingsbetingelser: {company?.paymentTermsDays ?? 14} dager netto.
            Kontonummer oppgis på forespørsel.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.textDark },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 13, fontWeight: '700' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  invoiceCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  invoiceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  invoiceNumber: { fontSize: 18, fontWeight: '800', color: colors.textDark },
  invoiceDate: { fontSize: 12, color: colors.textGray, marginTop: 3 },
  invoiceDue: { fontSize: 12, color: colors.textGray, marginTop: 1 },
  companyBadge: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyInitials: { fontSize: 16, fontWeight: '800', color: colors.white },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  partyRow: { flexDirection: 'row', gap: 8 },
  party: { flex: 1, gap: 2 },
  partyLabel: { fontSize: 10, fontWeight: '700', color: colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5 },
  partyName: { fontSize: 14, fontWeight: '700', color: colors.textDark },
  partyDetail: { fontSize: 12, color: colors.textGray },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.textGray, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.backgroundSecondary },
  lineLeft: { flex: 1, marginRight: 8 },
  lineDesc: { fontSize: 14, color: colors.textDark },
  lineAmount: { fontSize: 14, fontWeight: '600', color: colors.textDark },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  totalLabel: { fontSize: 13, color: colors.textGray },
  totalValue: { fontSize: 13, color: colors.textDark },
  grandTotal: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: colors.textDark,
  },
  grandTotalLabel: { fontSize: 16, fontWeight: '800', color: colors.textDark },
  grandTotalValue: { fontSize: 20, fontWeight: '800', color: colors.primary },
  actions: { gap: 10 },
  vippsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF5B24',
    borderRadius: 12,
    paddingVertical: 15,
  },
  vippsBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  smsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
  },
  smsBtnText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  paidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.success,
    borderRadius: 12,
    paddingVertical: 13,
  },
  paidBtnText: { color: colors.success, fontSize: 15, fontWeight: '600' },
  terms: {
    paddingHorizontal: 8,
  },
  termsText: { fontSize: 11, color: colors.textLight, textAlign: 'center', lineHeight: 16 },
});
