import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { InvoiceStatus } from '../types';
import { formatCurrency, formatDate, formatShortDate } from '../utils/formatters';
import { viewInvoicePdf, downloadInvoicePdf } from '../utils/generatePdf';

const STATUS_CFG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  sent: { label: 'Sendt', color: '#2563FF', bg: '#EEF4FF' },
  paid: { label: 'Betalt', color: '#15803D', bg: '#F0FDF4' },
  overdue: { label: 'Forfalt', color: '#DC2626', bg: '#FEF2F2' },
};

interface Props {
  invoiceId: string | null;
  onClose: () => void;
}

export function InvoicePreviewModal({ invoiceId, onClose }: Props) {
  const invoice = useAppStore((s) => s.invoices.find((i) => i.id === invoiceId));
  const company = useAppStore((s) => s.company);
  const currentUser = useAppStore((s) => s.currentUser);
  const updateInvoiceStatus = useAppStore((s) => s.updateInvoiceStatus);
  const sendInvoiceEmail = useAppStore((s) => s.sendInvoiceEmail);

  const [marking, setMarking] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleViewPdf = async () => {
    setPdfLoading(true);
    setFeedback('');
    try {
      await viewInvoicePdf(invoice!, company);
    } catch (e: any) {
      setFeedback(`PDF feilet: ${e?.message ?? 'Ukjent feil'}`);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    setFeedback('');
    try {
      await downloadInvoicePdf(invoice!, company);
    } catch (e: any) {
      setFeedback(`PDF feilet: ${e?.message ?? 'Ukjent feil'}`);
    } finally {
      setPdfLoading(false);
    }
  };

  if (!invoiceId || !invoice) return null;

  const cfg = STATUS_CFG[invoice.status];
  const isAdmin = currentUser?.role === 'admin';
  const isOverdue = invoice.status === 'overdue';

  const handleMarkPaid = async () => {
    setMarking(true);
    await updateInvoiceStatus(invoice.id, 'paid');
    setMarking(false);
    setFeedback('Faktura er markert som betalt');
  };

  const handleSendEmail = async () => {
    if (!invoice.customerEmail) {
      setFeedback('Kunden har ingen e-postadresse. Legg den til på kunden først.');
      return;
    }
    setSending(true);
    setFeedback('');
    try {
      await sendInvoiceEmail(invoice.id);
      setFeedback(`Faktura ${invoice.invoiceNumber} sendt til ${invoice.customerEmail}`);
    } catch {
      setFeedback('E-post kunne ikke sendes — prøv å sende på nytt.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={!!invoiceId} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
              <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => { setFeedback(''); onClose(); }}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Feedback banner */}
            {feedback ? (
              <View style={styles.feedbackBox}>
                <Ionicons name="checkmark-circle" size={15} color="#15803D" />
                <Text style={styles.feedbackText}>{feedback}</Text>
              </View>
            ) : null}

            {/* Document */}
            <View style={styles.document}>
              {/* Logo */}
              {company?.logoUrl ? (
                <Image source={{ uri: company.logoUrl }} style={styles.logo} resizeMode="contain" />
              ) : null}

              {/* FROM / TO */}
              <View style={styles.partyRow}>
                <View style={styles.party}>
                  <Text style={styles.partyLabel}>FRA</Text>
                  <Text style={styles.partyName}>{company?.name ?? ''}</Text>
                  {company?.orgNumber ? (
                    <Text style={styles.partyDetail}>Org.nr: {company.orgNumber}</Text>
                  ) : null}
                </View>
                <View style={[styles.party, { alignItems: 'flex-end' }]}>
                  <Text style={[styles.partyLabel, { textAlign: 'right' }]}>TIL</Text>
                  <Text style={[styles.partyName, { textAlign: 'right' }]}>{invoice.customerName}</Text>
                  <Text style={[styles.partyDetail, { textAlign: 'right' }]}>{invoice.customerAddress}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Dates */}
              <View style={styles.datesRow}>
                <View>
                  <Text style={styles.dateLabel}>FAKTURADATO</Text>
                  <Text style={styles.dateValue}>{formatDate(invoice.createdAt)}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.dateLabel}>FORFALL</Text>
                  <Text style={[styles.dateValue, isOverdue && { color: '#DC2626', fontWeight: '600' }]}>
                    {formatShortDate(invoice.dueDate)}
                  </Text>
                </View>
                {company?.accountNumber ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.dateLabel}>KONTONUMMER</Text>
                    <Text style={styles.accountNumber}>{company.accountNumber}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.divider} />

              {/* Line items */}
              <Text style={styles.sectionTitle}>SPESIFIKASJON</Text>
              <View style={styles.linesBlock}>
                {invoice.lineItems.map((item, i) => {
                  const isLast = i === invoice.lineItems.length - 1 && !invoice.note;
                  return (
                    <View key={i} style={[styles.lineItem, isLast && { borderBottomWidth: 0 }]}>
                      <Text style={styles.lineDesc}>{item.description}</Text>
                      <Text style={styles.lineAmount}>{formatCurrency(item.amount)}</Text>
                    </View>
                  );
                })}
                {invoice.note ? (
                  <View style={[styles.lineItem, { borderBottomWidth: 0 }]}>
                    <Text style={styles.inlineNoteText}>{invoice.note}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.totalsBlock}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Sum eks. MVA</Text>
                  <Text style={styles.totalValue}>{formatCurrency(invoice.subtotalExVat)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>MVA 25%</Text>
                  <Text style={styles.totalValue}>{formatCurrency(invoice.vat)}</Text>
                </View>
                <View style={styles.grandRow}>
                  <Text style={styles.grandLabel}>TOTALT INKL. MVA</Text>
                  <Text style={styles.grandValue}>{formatCurrency(invoice.total)}</Text>
                </View>
              </View>

            </View>

            {/* PDF actions */}
            <View style={styles.pdfRow}>
              <TouchableOpacity
                style={styles.pdfBtn}
                onPress={handleViewPdf}
                disabled={pdfLoading}
              >
                {pdfLoading
                  ? <ActivityIndicator size="small" color="#2563FF" />
                  : <Ionicons name="document-outline" size={16} color="#2563FF" />
                }
                <Text style={styles.pdfBtnText}>Se som PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pdfBtn}
                onPress={handleDownloadPdf}
                disabled={pdfLoading}
              >
                <Ionicons name="download-outline" size={16} color="#2563FF" />
                <Text style={styles.pdfBtnText}>Last ned PDF</Text>
              </TouchableOpacity>
            </View>

            {/* Actions */}
            {isAdmin && (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.smsBtn} onPress={handleSendEmail} disabled={sending}>
                  {sending
                    ? <ActivityIndicator size="small" color="#2563FF" />
                    : <Ionicons name="mail-outline" size={16} color="#2563FF" />}
                  <Text style={styles.smsBtnText}>
                    {invoice.emailStatus === 'failed' ? 'Send på nytt' : 'Send faktura på E-post'}
                  </Text>
                </TouchableOpacity>

                {invoice.status !== 'paid' && (
                  <TouchableOpacity
                    style={styles.paidBtn}
                    onPress={handleMarkPaid}
                    disabled={marking}
                  >
                    {marking
                      ? <ActivityIndicator size="small" color="#15803D" />
                      : <Ionicons name="checkmark-circle-outline" size={16} color="#15803D" />
                    }
                    <Text style={styles.paidBtnText}>Marker som betalt</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,27,51,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    paddingBottom: 32,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  invoiceNumber: { fontSize: 16, fontWeight: '700', color: '#0A1B33' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },

  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 10,
    padding: 12,
  },
  feedbackText: { fontSize: 13, color: '#15803D', flex: 1 },

  document: {
    margin: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    gap: 10,
  },

  logo: { width: 140, height: 50, marginBottom: 28 },
  partyRow: { flexDirection: 'row', gap: 12 },
  party: { flex: 1, gap: 2 },
  partyLabel: {
    fontSize: 10, fontWeight: '700', color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2,
  },
  partyName: { fontSize: 14, fontWeight: '600', color: '#0A1B33' },
  partyDetail: { fontSize: 12, color: '#64748B' },

  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },

  datesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  dateValue: { fontSize: 14, color: '#1F2937', fontWeight: '500' },

  sectionTitle: {
    fontSize: 10, fontWeight: '700', color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 4,
  },
  linesBlock: { gap: 0 },
  lineItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  lineDesc: { fontSize: 15, color: '#1F2937', flex: 1, marginRight: 12 },
  lineAmount: { fontSize: 15, color: '#1F2937', fontWeight: '600' },
  inlineNoteText: { fontSize: 13, color: '#64748B', fontStyle: 'italic', lineHeight: 19, flex: 1 },

  totalsBlock: {
    borderTopWidth: 2, borderTopColor: '#E2E8F0',
    paddingTop: 4, gap: 0,
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  totalLabel: { fontSize: 14, color: '#64748B' },
  totalValue: { fontSize: 14, color: '#64748B' },
  grandRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16,
  },
  grandLabel: { fontSize: 15, fontWeight: '600', color: '#0A1B33' },
  grandValue: { fontSize: 18, fontWeight: '600', color: '#0A1B33' },

  pdfRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  pdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2563FF',
    backgroundColor: '#EEF4FF',
  },
  pdfBtnText: { fontSize: 13, color: '#2563FF', fontWeight: '600' },
  actions: { paddingHorizontal: 20, gap: 10 },
  smsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#2563FF',
  },
  smsBtnText: { color: '#2563FF', fontSize: 14, fontWeight: '600' },
  paidBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14,
  },
  paidBtnText: { color: '#15803D', fontSize: 14, fontWeight: '600' },

  paymentBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accountNumber: { fontSize: 14, color: '#0A1B33', fontWeight: '700', letterSpacing: 0.5 },
});
