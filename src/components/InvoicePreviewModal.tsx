import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, ActivityIndicator, Image, TextInput,
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
  credited: { label: 'Kreditert', color: '#616A76', bg: '#ECECEC' },
};
const CREDIT_NOTE_CFG = { label: 'Kreditnota', color: '#7C3AED', bg: '#F5F3FF' };

interface Props {
  invoiceId: string | null;
  onClose: () => void;
}

export function InvoicePreviewModal({ invoiceId, onClose }: Props) {
  const invoice = useAppStore((s) => s.invoices.find((i) => i.id === invoiceId));
  const invoices = useAppStore((s) => s.invoices);
  const company = useAppStore((s) => s.company);
  const currentUser = useAppStore((s) => s.currentUser);
  const updateInvoiceStatus = useAppStore((s) => s.updateInvoiceStatus);
  const sendInvoiceEmail = useAppStore((s) => s.sendInvoiceEmail);
  const createCreditNote = useAppStore((s) => s.createCreditNote);

  const [marking, setMarking] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [confirmCredit, setConfirmCredit] = useState(false);
  const [creditReason, setCreditReason] = useState('');
  const [creditError, setCreditError] = useState('');
  const [crediting, setCrediting] = useState(false);

  const isCreditNote = !!invoice?.creditsInvoiceId;
  // Motpartens fakturanummer (kreditnota↔original) — brukes i koblingsbanneret OG i PDF-en.
  const linkedNumber = invoice
    ? isCreditNote
      ? invoices.find((i) => i.id === invoice.creditsInvoiceId)?.invoiceNumber
      : invoices.find((i) => i.creditsInvoiceId === invoice.id)?.invoiceNumber
    : undefined;

  // Jobbdata til PDF-ens venstre midtblokk (leveringsadresse + vår kontakt).
  const job = useAppStore((s) => s.jobs.find((j) => j.id === invoice?.jobId));
  const pdfExtras = job
    ? { deliveryAddress: job.address, ourContact: job.assignedTechnicianName }
    : undefined;

  const handleViewPdf = async () => {
    setPdfLoading(true);
    setFeedback('');
    try {
      await viewInvoicePdf(invoice!, company, linkedNumber, pdfExtras);
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
      await downloadInvoicePdf(invoice!, company, linkedNumber, pdfExtras);
    } catch (e: any) {
      setFeedback(`PDF feilet: ${e?.message ?? 'Ukjent feil'}`);
    } finally {
      setPdfLoading(false);
    }
  };

  if (!invoiceId || !invoice) return null;

  const cfg = isCreditNote ? CREDIT_NOTE_CFG : STATUS_CFG[invoice.status];
  const isAdmin = currentUser?.role === 'admin';
  const isOverdue = invoice.status === 'overdue' && !isCreditNote;
  // Kan krediteres: en vanlig faktura som ikke allerede er kreditert og ikke selv er en kreditnota.
  const canCredit = isAdmin && invoice.status !== 'credited' && !isCreditNote;

  const handleMarkPaid = async () => {
    setMarking(true);
    await updateInvoiceStatus(invoice.id, 'paid');
    setMarking(false);
    setFeedback('Faktura er markert som betalt');
  };

  const handleCreateCreditNote = async () => {
    // Årsak er obligatorisk (valideres også i store + RPC).
    if (!creditReason.trim()) {
      setCreditError('Oppgi en årsak for kreditnotaen.');
      return;
    }
    setCrediting(true);
    setFeedback('');
    setCreditError('');
    try {
      const note = await createCreditNote(invoice.id, creditReason);
      setConfirmCredit(false);
      setCreditReason('');
      // createCreditNote har allerede forsøkt e-postsending (awaited) — les utfallet
      // fra state: 'sent'/'failed', eller null når kunden mangler e-postadresse.
      const fresh = useAppStore.getState().invoices.find((i) => i.id === note.id);
      const emailMsg =
        fresh?.emailStatus === 'sent'
          ? ` og sendt til ${fresh.customerEmail ?? 'kunden'}`
          : fresh?.emailStatus === 'failed'
            ? ' — e-posten feilet, åpne kreditnotaen og trykk «Send på nytt»'
            : ' — ikke sendt: kunden har ingen e-postadresse';
      setFeedback(`Kreditnota ${note.invoiceNumber} opprettet for ${invoice.invoiceNumber}${emailMsg}`);
    } catch (e: any) {
      setFeedback(e?.message ?? 'Kreditnota kunne ikke opprettes — prøv igjen.');
    } finally {
      setCrediting(false);
    }
  };

  const handleSendEmail = async () => {
    setSending(true);
    setFeedback('');
    try {
      const to = await sendInvoiceEmail(invoice.id);
      setFeedback(`${isCreditNote ? 'Kreditnota' : 'Faktura'} ${invoice.invoiceNumber} sendt til ${to}`);
    } catch (e: any) {
      setFeedback(e?.message ?? 'E-post kunne ikke sendes — prøv å sende på nytt.');
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
              <Ionicons name="close" size={22} color="#616A76" />
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

            {/* Koblingsbanner kreditnota↔original */}
            {(isCreditNote || invoice.status === 'credited') ? (
              <View style={styles.linkBox}>
                <Ionicons name="swap-horizontal" size={15} color={CREDIT_NOTE_CFG.color} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.linkBoxText}>
                    {isCreditNote
                      ? `Dette er en kreditnota som motposterer ${linkedNumber ?? 'originalfakturaen'}.`
                      : `Denne fakturaen er kreditert${linkedNumber ? ` av ${linkedNumber}` : ''} og er ikke lenger utestående.`}
                  </Text>
                  {isCreditNote && invoice.creditReason ? (
                    <Text style={styles.linkBoxText}>Årsak: {invoice.creditReason}</Text>
                  ) : null}
                </View>
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
                {!isCreditNote && invoice.kid ? (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.dateLabel}>KID</Text>
                    <Text style={styles.accountNumber}>{invoice.kid}</Text>
                  </View>
                ) : null}
                {company?.accountNumber ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.dateLabel}>KONTONUMMER</Text>
                    <Text style={styles.accountNumber}>{company.accountNumber}</Text>
                  </View>
                ) : null}
              </View>
              {!isCreditNote && !invoice.kid ? (
                <Text style={styles.markPaymentText}>
                  Merk betalingen med fakturanummer {invoice.invoiceNumber}
                </Text>
              ) : null}

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
                  ? <ActivityIndicator size="small" color="#000000" />
                  : <Ionicons name="document-outline" size={16} color="#000000" />
                }
                <Text style={styles.pdfBtnText}>Se som PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pdfBtn}
                onPress={handleDownloadPdf}
                disabled={pdfLoading}
              >
                <Ionicons name="download-outline" size={16} color="#000000" />
                <Text style={styles.pdfBtnText}>Last ned PDF</Text>
              </TouchableOpacity>
            </View>

            {/* Actions */}
            {isAdmin && (
              <View style={styles.actions}>
                {/* Kreditert original: skjul e-postknappen — å re-sende en utnullet
                    faktura med betalingsinformasjon ville villede kunden. Kreditnotaen
                    er dokumentet som sendes. */}
                {(isCreditNote || invoice.status !== 'credited') && (
                  <TouchableOpacity style={styles.smsBtn} onPress={handleSendEmail} disabled={sending}>
                    {sending
                      ? <ActivityIndicator size="small" color="#000000" />
                      : <Ionicons name="mail-outline" size={16} color="#000000" />}
                    <Text style={styles.smsBtnText}>
                      {invoice.emailStatus === 'failed'
                        ? 'Send på nytt'
                        : isCreditNote
                          ? 'Send kreditnota på E-post'
                          : 'Send faktura på E-post'}
                    </Text>
                  </TouchableOpacity>
                )}

                {(invoice.status === 'sent' || invoice.status === 'overdue') && (
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

                {/* Opprett kreditnota — bekreftelse + valgfri årsak inline (unngår nestet Modal på RN Web) */}
                {canCredit && !confirmCredit && (
                  <TouchableOpacity
                    style={styles.creditBtn}
                    onPress={() => { setFeedback(''); setConfirmCredit(true); }}
                  >
                    <Ionicons name="receipt-outline" size={16} color={CREDIT_NOTE_CFG.color} />
                    <Text style={styles.creditBtnText}>Opprett kreditnota</Text>
                  </TouchableOpacity>
                )}

                {canCredit && confirmCredit && (
                  <View style={styles.confirmPanel}>
                    <Text style={styles.confirmTitle}>Opprett kreditnota?</Text>
                    <Text style={styles.confirmBody}>
                      Dette lager en ny faktura i samme nummerserie med negative beløp som
                      motposterer {invoice.invoiceNumber}. Fakturaen kan ikke slettes (bokføringsloven).
                    </Text>
                    <TextInput
                      style={[styles.reasonInput, creditError ? styles.reasonInputError : null]}
                      placeholder="Årsak (påkrevd)"
                      placeholderTextColor="#878E97"
                      value={creditReason}
                      onChangeText={(t) => { setCreditReason(t); if (creditError) setCreditError(''); }}
                      multiline
                      editable={!crediting}
                    />
                    {creditError ? <Text style={styles.reasonErrorText}>{creditError}</Text> : null}
                    <View style={styles.confirmRow}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => { setConfirmCredit(false); setCreditReason(''); setCreditError(''); }}
                        disabled={crediting}
                      >
                        <Text style={styles.cancelBtnText}>Avbryt</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={handleCreateCreditNote}
                        disabled={crediting}
                      >
                        {crediting
                          ? <ActivityIndicator size="small" color="#FFFFFF" />
                          : <Text style={styles.confirmBtnText}>Ja, opprett kreditnota</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
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
    borderBottomColor: '#E5E5E5',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  invoiceNumber: { fontSize: 16, fontWeight: '700', color: '#000000' },
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

  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F3FF',
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 10,
    padding: 12,
  },
  linkBoxText: { fontSize: 13, color: '#5B21B6', flex: 1, lineHeight: 18 },

  creditBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#7C3AED',
  },
  creditBtnText: { color: '#7C3AED', fontSize: 14, fontWeight: '600' },

  confirmPanel: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 16,
    gap: 10,
  },
  confirmTitle: { fontSize: 15, fontWeight: '700', color: '#000000' },
  confirmBody: { fontSize: 13, color: '#616A76', lineHeight: 19 },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#000000',
    backgroundColor: '#FFFFFF',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  reasonInputError: { borderColor: '#DC2626' },
  reasonErrorText: { fontSize: 13, color: '#DC2626' },
  confirmRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E5E5E5',
  },
  cancelBtnText: { color: '#616A76', fontSize: 14, fontWeight: '600' },
  confirmBtn: {
    flex: 1.4, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#7C3AED',
  },
  confirmBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  document: {
    margin: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 18,
    gap: 10,
  },

  logo: { width: 140, height: 50, marginBottom: 28 },
  partyRow: { flexDirection: 'row', gap: 12 },
  party: { flex: 1, gap: 2 },
  partyLabel: {
    fontSize: 10, fontWeight: '700', color: '#878E97',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2,
  },
  partyName: { fontSize: 14, fontWeight: '600', color: '#000000' },
  partyDetail: { fontSize: 12, color: '#616A76' },

  divider: { height: 1, backgroundColor: '#E5E5E5', marginVertical: 8 },

  datesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  markPaymentText: { fontSize: 12, color: '#616A76', fontStyle: 'italic' },
  dateLabel: { fontSize: 10, fontWeight: '700', color: '#878E97', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  dateValue: { fontSize: 14, color: '#000000', fontWeight: '500' },

  sectionTitle: {
    fontSize: 10, fontWeight: '700', color: '#878E97',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 4,
  },
  linesBlock: { gap: 0 },
  lineItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#E5E5E5',
  },
  lineDesc: { fontSize: 15, color: '#000000', flex: 1, marginRight: 12 },
  lineAmount: { fontSize: 15, color: '#000000', fontWeight: '600' },
  inlineNoteText: { fontSize: 13, color: '#616A76', fontStyle: 'italic', lineHeight: 19, flex: 1 },

  totalsBlock: {
    borderTopWidth: 2, borderTopColor: '#E5E5E5',
    paddingTop: 4, gap: 0,
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#ECECEC',
  },
  totalLabel: { fontSize: 14, color: '#616A76' },
  totalValue: { fontSize: 14, color: '#616A76' },
  grandRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16,
  },
  grandLabel: { fontSize: 15, fontWeight: '600', color: '#000000' },
  grandValue: { fontSize: 18, fontWeight: '600', color: '#000000' },

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
    borderColor: '#000000',
    backgroundColor: '#ECECEC',
  },
  pdfBtnText: { fontSize: 13, color: '#000000', fontWeight: '600' },
  actions: { paddingHorizontal: 20, gap: 10 },
  smsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#000000',
  },
  smsBtnText: { color: '#000000', fontSize: 14, fontWeight: '600' },
  paidBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14,
  },
  paidBtnText: { color: '#15803D', fontSize: 14, fontWeight: '600' },

  paymentBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accountNumber: { fontSize: 14, color: '#000000', fontWeight: '700', letterSpacing: 0.5 },
});
