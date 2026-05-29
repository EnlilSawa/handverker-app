import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { InvoiceStatus } from '../../types';
import { formatCurrency, formatDate, formatShortDate } from '../../utils/formatters';

const STATUS_CFG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  sent: { label: 'Sendt', color: '#2563FF', bg: '#EEF4FF' },
  paid: { label: 'Betalt', color: '#15803D', bg: '#F0FDF4' },
  overdue: { label: 'Forfalt', color: '#DC2626', bg: '#FEF2F2' },
};

export function InvoiceDetailScreen({ route, navigation }: any) {
  const invoiceId = route?.params?.invoiceId;
  const invoices = useAppStore((s) => s.invoices);
  const company = useAppStore((s) => s.company);
  const currentUser = useAppStore((s) => s.currentUser);
  const updateInvoiceStatus = useAppStore((s) => s.updateInvoiceStatus);
  const [feedback, setFeedback] = useState('');

  const invoice = invoices.find((i) => i.id === invoiceId) ?? invoices[invoices.length - 1];
  if (!invoice) return null;

  const cfg = STATUS_CFG[invoice.status];
  const isAdmin = currentUser?.role === 'admin';
  const isOverdue = invoice.status === 'overdue';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        {navigation && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#1F2937" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Faktura</Text>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {feedback ? (
          <View style={styles.feedbackBox}>
            <Ionicons name="checkmark-circle" size={16} color="#15803D" />
            <Text style={styles.feedbackText}>{feedback}</Text>
          </View>
        ) : null}

        <View style={styles.invoiceCard}>
          {/* Top row */}
          <View style={styles.invoiceTop}>
            <View>
              <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
              <Text style={styles.invoiceMeta}>Dato: {formatDate(invoice.createdAt)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.invoiceMeta, isOverdue && { color: '#DC2626', fontWeight: '600' }]}>
                Forfall: {formatShortDate(invoice.dueDate)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* FROM / TO */}
          <View style={styles.partyRow}>
            <View style={styles.party}>
              <Text style={styles.partyLabel}>FRA</Text>
              <Text style={styles.partyName}>{company?.name ?? ''}</Text>
              {company?.orgNumber ? <Text style={styles.partyDetail}>Org.nr: {company.orgNumber}</Text> : null}
              {company?.address ? <Text style={styles.partyDetail}>{company.address}</Text> : null}
            </View>
            <View style={[styles.party, { alignItems: 'flex-end' }]}>
              <Text style={[styles.partyLabel, { textAlign: 'right' }]}>TIL</Text>
              <Text style={[styles.partyName, { textAlign: 'right' }]}>{invoice.customerName}</Text>
              <Text style={[styles.partyDetail, { textAlign: 'right' }]}>{invoice.customerAddress}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Line items */}
          <Text style={styles.sectionTitle}>SPESIFIKASJON</Text>
          {invoice.lineItems.map((item, i) => (
            <View key={i} style={styles.lineItem}>
              <Text style={styles.lineDesc}>{item.description}</Text>
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

          <View style={styles.divider} />

          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>INKL. MVA</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(invoice.total)}</Text>
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.vippsBtn}
          onPress={() => setFeedback(`Vipps-forespørsel på ${formatCurrency(invoice.total)} sendt til ${invoice.customerName}`)}
        >
          <Text style={styles.vippsBtnText}>Betal med Vipps</Text>
        </TouchableOpacity>

        {isAdmin && (
          <>
            <TouchableOpacity
              style={styles.smsBtn}
              onPress={() => setFeedback(`Faktura ${invoice.invoiceNumber} sendt på SMS`)}
            >
              <Ionicons name="chatbubble-outline" size={17} color="#2563FF" />
              <Text style={styles.smsBtnText}>Send på SMS</Text>
            </TouchableOpacity>

            {invoice.status !== 'paid' && (
              <TouchableOpacity
                style={styles.paidBtn}
                onPress={() => { updateInvoiceStatus(invoice.id, 'paid'); setFeedback('Faktura er markert som betalt'); }}
              >
                <Ionicons name="checkmark-circle-outline" size={17} color="#15803D" />
                <Text style={styles.paidBtnText}>Marker som betalt</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <Text style={styles.terms}>
          Betalingsbetingelser: {company?.paymentTermsDays ?? 14} dager netto.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: '#1F2937' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  content: { padding: 20, gap: 12, paddingBottom: 48 },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
  },
  feedbackText: { fontSize: 13, color: '#15803D', flex: 1 },
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
  },
  invoiceTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  invoiceNumber: { fontSize: 18, fontWeight: '700', color: '#0A1B33' },
  invoiceMeta: { fontSize: 13, color: '#64748B', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 16 },
  partyRow: { flexDirection: 'row', gap: 12 },
  party: { flex: 1, gap: 2 },
  partyLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  partyName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  partyDetail: { fontSize: 13, color: '#64748B' },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  lineDesc: { fontSize: 14, color: '#1F2937', flex: 1, marginRight: 8 },
  lineAmount: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontSize: 14, color: '#64748B' },
  totalValue: { fontSize: 14, color: '#64748B' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grandTotalLabel: { fontSize: 15, fontWeight: '600', color: '#0A1B33' },
  grandTotalValue: { fontSize: 22, fontWeight: '700', color: '#0A1B33' },
  vippsBtn: {
    height: 52,
    borderRadius: 10,
    backgroundColor: '#FF5B24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vippsBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  smsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2563FF',
  },
  smsBtnText: { color: '#2563FF', fontSize: 15, fontWeight: '600' },
  paidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  paidBtnText: { color: '#15803D', fontSize: 15, fontWeight: '600' },
  terms: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },
});
