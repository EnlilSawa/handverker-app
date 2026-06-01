import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { useAppStore } from '../../store/appStore';
import { QuoteStatus } from '../../types';
import { formatCurrency, formatDate, formatShortDate } from '../../utils/formatters';
import { generateQuoteHtml } from '../../utils/quoteHtml';

const STATUS_CFG: Record<QuoteStatus, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Venter',   color: '#C2410C', bg: '#FFF7ED' },
  accepted: { label: 'Godkjent', color: '#15803D', bg: '#F0FDF4' },
  declined: { label: 'Avslått',  color: '#DC2626', bg: '#FEF2F2' },
  expired:  { label: 'Utgått',   color: '#64748B', bg: '#F8FAFC' },
};

export function QuoteDetailScreen({ route, navigation }: any) {
  const { quoteId } = route.params as { quoteId: string };
  const { colors: C } = useTheme();

  const quote = useAppStore((s) => s.quotes.find((q) => q.id === quoteId));
  const company = useAppStore((s) => s.company);
  const updateQuoteStatus = useAppStore((s) => s.updateQuoteStatus);
  const convertQuoteToJob = useAppStore((s) => s.convertQuoteToJob);
  const sendQuoteEmail = useAppStore((s) => s.sendQuoteEmail);

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [acceptName, setAcceptName] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  if (!quote) return null;
  const cfg = STATUS_CFG[quote.status];

  const handleAccept = async () => {
    if (!acceptName.trim()) return;
    setActionLoading(true);
    try {
      await updateQuoteStatus(quote.id, 'accepted', { acceptedByName: acceptName.trim() });
      await convertQuoteToJob(quote.id);
      setShowAcceptModal(false);
      setFeedback('Tilbudet er godkjent og ny jobb er opprettet!');
    } catch (e: any) { setFeedback('Feil: ' + (e.message ?? 'Ukjent')); }
    finally { setActionLoading(false); }
  };

  const handleDecline = async () => {
    setActionLoading(true);
    try {
      await updateQuoteStatus(quote.id, 'declined', { declinedReason: declineReason.trim() || undefined });
      setShowDeclineModal(false);
      setFeedback('Tilbudet er markert som avslått.');
    } catch (e: any) { setFeedback('Feil: ' + (e.message ?? 'Ukjent')); }
    finally { setActionLoading(false); }
  };

  const handleSendEmail = async () => {
    setActionLoading(true);
    try {
      await sendQuoteEmail(quote.id);
      setFeedback('E-post sendt til ' + quote.customerEmail);
    } catch (e: any) {
      setFeedback('E-post feilet: ' + (e.message ?? 'Sett opp send-quote-email edge function'));
    } finally { setActionLoading(false); }
  };

  const handleViewPdf = () => {
    if (Platform.OS !== 'web') return;
    setPdfLoading(true);
    try {
      const html = generateQuoteHtml(quote, company);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      }
    } catch { setFeedback('PDF-visning feilet'); }
    finally { setPdfLoading(false); }
  };

  return (
    <ThemedScreen>
      <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]} numberOfLines={1}>
            {quote.quoteNumber}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {feedback ? (
          <View style={styles.feedbackBox}>
            <Ionicons name="checkmark-circle" size={15} color="#15803D" />
            <Text style={styles.feedbackText}>{feedback}</Text>
            <TouchableOpacity onPress={() => setFeedback('')}>
              <Ionicons name="close" size={15} color="#15803D" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Header card */}
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <View style={styles.quoteHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.quoteTitle, { color: C.textPrimary }]}>{quote.title}</Text>
              <Text style={[styles.quoteMeta, { color: C.textSecondary }]}>
                {quote.customerName} · {quote.customerEmail}
              </Text>
              <Text style={[styles.quoteMeta, { color: C.textTertiary }]}>
                Opprettet {formatDate(quote.createdAt)} · Gyldig til {formatShortDate(quote.validUntil)}
              </Text>
            </View>
            <Text style={styles.totalBig}>{formatCurrency(quote.totalAmount)}</Text>
          </View>
          {quote.description ? (
            <Text style={[styles.quoteDesc, { color: C.textSecondary }]}>{quote.description}</Text>
          ) : null}
          {quote.acceptedByName ? (
            <Text style={[styles.acceptedBy, { color: '#15803D' }]}>
              Godkjent av {quote.acceptedByName} · {quote.acceptedAt ? formatDate(quote.acceptedAt) : ''}
            </Text>
          ) : null}
        </View>

        {/* Line items */}
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <Text style={[styles.cardLabel, { color: C.textSecondary }]}>SPESIFIKASJON</Text>
          {quote.lines.map((line, i) => {
            const isLast = i === quote.lines.length - 1;
            return (
              <View key={i} style={[styles.lineRow, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                <View style={{ flex: 2 }}>
                  <Text style={[styles.lineDesc, { color: C.textPrimary }]}>{line.description}</Text>
                  <Text style={[styles.lineMeta, { color: C.textTertiary }]}>
                    {line.quantity} × {formatCurrency(line.unitPrice)}
                  </Text>
                </View>
                <Text style={[styles.lineAmount, { color: C.textPrimary }]}>{formatCurrency(line.amount)}</Text>
              </View>
            );
          })}
          <View style={[styles.totalsSection, { borderTopColor: C.border }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: C.textSecondary }]}>Sum eks. MVA</Text>
              <Text style={[styles.totalValue, { color: C.textSecondary }]}>{formatCurrency(quote.subtotalExVat)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: C.textSecondary }]}>MVA 25%</Text>
              <Text style={[styles.totalValue, { color: C.textSecondary }]}>{formatCurrency(quote.vat)}</Text>
            </View>
            <View style={[styles.totalRow, { paddingTop: 8 }]}>
              <Text style={[styles.grandLabel, { color: C.textPrimary }]}>Totalt inkl. MVA</Text>
              <Text style={styles.grandValue}>{formatCurrency(quote.totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {/* PDF preview */}
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: C.border, backgroundColor: C.cardBg }]}
            onPress={handleViewPdf}
            disabled={pdfLoading}
          >
            {pdfLoading ? <ActivityIndicator size="small" color="#2563FF" /> : <Ionicons name="document-outline" size={18} color="#2563FF" />}
            <Text style={styles.actionBtnText}>Se som PDF</Text>
          </TouchableOpacity>

          {/* Send email */}
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: C.border, backgroundColor: C.cardBg }]}
            onPress={handleSendEmail}
            disabled={actionLoading}
          >
            <Ionicons name="mail-outline" size={18} color="#2563FF" />
            <Text style={styles.actionBtnText}>Send på e-post</Text>
          </TouchableOpacity>

          {/* Accept/Decline — only for pending */}
          {quote.status === 'pending' && (
            <>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => setShowAcceptModal(true)}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.acceptBtnText}>Godkjenn tilbud</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.declineBtn} onPress={() => setShowDeclineModal(true)}>
                <Text style={styles.declineBtnText}>Avslå tilbud</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Convert to job if accepted but no job yet */}
          {quote.status === 'accepted' && !quote.jobId && (
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={async () => {
                setActionLoading(true);
                try { await convertQuoteToJob(quote.id); setFeedback('Ny jobb opprettet fra tilbud!'); }
                catch (e: any) { setFeedback('Feil: ' + e.message); }
                finally { setActionLoading(false); }
              }}
            >
              <Ionicons name="briefcase-outline" size={18} color="#FFFFFF" />
              <Text style={styles.acceptBtnText}>Opprett jobb fra tilbud</Text>
            </TouchableOpacity>
          )}

          {quote.jobId && (
            <View style={styles.jobCreatedBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#15803D" />
              <Text style={styles.jobCreatedText}>Jobb er opprettet fra dette tilbudet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Accept modal */}
      <Modal visible={showAcceptModal} transparent animationType="slide" onRequestClose={() => setShowAcceptModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: C.cardBg }]}>
            <Text style={[styles.sheetTitle, { color: C.textPrimary }]}>Godkjenn tilbud</Text>
            <Text style={[styles.sheetSub, { color: C.textSecondary }]}>
              Skriv inn kundens fulle navn som bekreftelse
            </Text>
            <TextInput
              style={[styles.sheetInput, { backgroundColor: C.cardAlt, color: C.textPrimary, borderColor: C.border }]}
              value={acceptName}
              onChangeText={setAcceptName}
              placeholder="Fullt navn"
              placeholderTextColor={C.textTertiary}
            />
            <TouchableOpacity
              style={[styles.acceptBtn, actionLoading && { opacity: 0.6 }]}
              onPress={handleAccept}
              disabled={actionLoading || !acceptName.trim()}
            >
              {actionLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
              <Text style={styles.acceptBtnText}>Bekreft godkjenning</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAcceptModal(false)}>
              <Text style={[styles.cancelBtnText, { color: C.textSecondary }]}>Avbryt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Decline modal */}
      <Modal visible={showDeclineModal} transparent animationType="slide" onRequestClose={() => setShowDeclineModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: C.cardBg }]}>
            <Text style={[styles.sheetTitle, { color: C.textPrimary }]}>Avslå tilbud</Text>
            <Text style={[styles.sheetSub, { color: C.textSecondary }]}>Årsak (valgfritt)</Text>
            <TextInput
              style={[styles.sheetInput, { backgroundColor: C.cardAlt, color: C.textPrimary, borderColor: C.border, height: 80 }]}
              value={declineReason}
              onChangeText={setDeclineReason}
              placeholder="Hvorfor avslås tilbudet?"
              placeholderTextColor={C.textTertiary}
              multiline
            />
            <TouchableOpacity
              style={[styles.declineSendBtn, actionLoading && { opacity: 0.6 }]}
              onPress={handleDecline}
              disabled={actionLoading}
            >
              {actionLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
              <Text style={styles.acceptBtnText}>Registrer avslag</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDeclineModal(false)}>
              <Text style={[styles.cancelBtnText, { color: C.textSecondary }]}>Avbryt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  content: { padding: 20, gap: 14, paddingBottom: 48 },
  feedbackBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12 },
  feedbackText: { flex: 1, fontSize: 13, color: '#15803D' },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 10 },
  cardLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  quoteHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  quoteTitle: { fontSize: 18, fontWeight: '700' },
  quoteMeta: { fontSize: 13, marginTop: 3 },
  quoteDesc: { fontSize: 14, lineHeight: 20 },
  acceptedBy: { fontSize: 13, fontWeight: '600' },
  totalBig: { fontSize: 22, fontWeight: '700', color: '#2563FF' },
  lineRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  lineDesc: { fontSize: 14, fontWeight: '500' },
  lineMeta: { fontSize: 12, marginTop: 2 },
  lineAmount: { fontSize: 14, fontWeight: '600', minWidth: 80, textAlign: 'right' },
  totalsSection: { borderTopWidth: 2, paddingTop: 10, gap: 6, marginTop: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 13 },
  totalValue: { fontSize: 13 },
  grandLabel: { fontSize: 15, fontWeight: '700' },
  grandValue: { fontSize: 20, fontWeight: '700', color: '#2563FF' },
  actions: { gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 48, borderRadius: 10, borderWidth: 1,
  },
  actionBtnText: { fontSize: 14, color: '#2563FF', fontWeight: '600' },
  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, backgroundColor: '#15803D', borderRadius: 10,
  },
  acceptBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  declineBtn: { alignItems: 'center', paddingVertical: 12 },
  declineBtnText: { fontSize: 14, color: '#DC2626', fontWeight: '600' },
  declineSendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, backgroundColor: '#DC2626', borderRadius: 10,
  },
  jobCreatedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12 },
  jobCreatedText: { fontSize: 14, color: '#15803D', fontWeight: '500' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '600' },
  sheetSub: { fontSize: 14 },
  sheetInput: { height: 52, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 15 },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelBtnText: { fontSize: 14, fontWeight: '500' },
});
