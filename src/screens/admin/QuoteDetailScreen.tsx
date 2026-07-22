import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Platform,
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
  expired:  { label: 'Utgått',   color: '#616A76', bg: '#F5F5F5' },
};

export function QuoteDetailScreen({ route, navigation }: any) {
  const { quoteId } = route.params as { quoteId: string };
  const { colors: C } = useTheme();

  const quote = useAppStore((s) => s.quotes.find((q) => q.id === quoteId));
  const company = useAppStore((s) => s.company);
  const convertQuoteToJob = useAppStore((s) => s.convertQuoteToJob);
  const sendQuoteEmail = useAppStore((s) => s.sendQuoteEmail);
  const updateQuoteEmail = useAppStore((s) => s.updateQuoteEmail);

  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailErr, setEmailErr] = useState('');

  if (!quote) return null;
  const cfg = STATUS_CFG[quote.status];

  const handleSendEmail = async () => {
    setActionLoading(true);
    try {
      await sendQuoteEmail(quote.id);
      setFeedback('E-post sendt til ' + quote.customerEmail);
    } catch (e: any) {
      setFeedback('E-post feilet: ' + (e.message ?? 'Sett opp send-quote-email edge function'));
    } finally { setActionLoading(false); }
  };

  const handleSaveEmail = async () => {
    const v = emailInput.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setEmailErr('Ugyldig e-postadresse — sjekk at den er skrevet riktig');
      return;
    }
    setActionLoading(true);
    setEmailErr('');
    try {
      await updateQuoteEmail(quote.id, v);
      setEditingEmail(false);
      setFeedback('E-postadresse oppdatert til ' + v);
    } catch (e: any) {
      setEmailErr(e?.message ?? 'Kunne ikke lagre e-post');
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
              <Text style={[styles.quoteMeta, { color: C.textSecondary }]}>{quote.customerName}</Text>
              {editingEmail ? (
                <View style={{ marginTop: 6, gap: 6 }}>
                  <TextInput
                    style={[styles.emailInput, { backgroundColor: C.cardAlt, color: C.textPrimary, borderColor: C.border }]}
                    value={emailInput}
                    onChangeText={setEmailInput}
                    placeholder="kunde@epost.no"
                    placeholderTextColor={C.textTertiary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                  {emailErr ? <Text style={styles.emailErrText}>{emailErr}</Text> : null}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={styles.emailSaveBtn} onPress={handleSaveEmail} disabled={actionLoading}>
                      {actionLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.emailSaveText}>Lagre</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.emailCancelBtn} onPress={() => { setEditingEmail(false); setEmailErr(''); }}>
                      <Text style={[styles.emailCancelText, { color: C.textSecondary }]}>Avbryt</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.emailRow}
                  onPress={() => { setEmailInput(quote.customerEmail); setEditingEmail(true); setEmailErr(''); }}
                >
                  <Ionicons name="mail-outline" size={13} color={C.textTertiary} />
                  <Text style={[styles.quoteMeta, { color: C.textSecondary, marginTop: 0 }]}>{quote.customerEmail}</Text>
                  <Ionicons name="pencil" size={12} color="#000000" />
                </TouchableOpacity>
              )}
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
          {quote.status === 'declined' ? (
            <Text style={[styles.acceptedBy, { color: '#DC2626' }]}>
              Avslått av kunde{quote.declinedReason ? ` · ${quote.declinedReason}` : ''}
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
            {pdfLoading ? <ActivityIndicator size="small" color="#000000" /> : <Ionicons name="document-outline" size={18} color="#000000" />}
            <Text style={styles.actionBtnText}>Se som PDF</Text>
          </TouchableOpacity>

          {/* Send email */}
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: C.border, backgroundColor: C.cardBg }]}
            onPress={handleSendEmail}
            disabled={actionLoading}
          >
            <Ionicons name="mail-outline" size={18} color="#000000" />
            <Text style={styles.actionBtnText}>Send på e-post</Text>
          </TouchableOpacity>

          {/* Kunden godtar/avslår selv via e-postlenken (ikke admin) */}
          {quote.status === 'pending' && (
            <View style={styles.awaitBanner}>
              <Ionicons name="mail-unread-outline" size={16} color="#C2410C" />
              <Text style={styles.awaitText}>
                Venter på svar fra kunden. De godtar eller avslår tilbudet via lenken i e-posten.
              </Text>
            </View>
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
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  emailInput: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 14 },
  emailErrText: { fontSize: 12, color: '#DC2626' },
  emailSaveBtn: { backgroundColor: '#000000', borderRadius: 8, paddingHorizontal: 18, height: 40, alignItems: 'center', justifyContent: 'center' },
  emailSaveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  emailCancelBtn: { paddingHorizontal: 14, height: 40, alignItems: 'center', justifyContent: 'center' },
  emailCancelText: { fontSize: 14, fontWeight: '500' },
  totalBig: { fontSize: 22, fontWeight: '700', color: '#000000' },
  lineRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  lineDesc: { fontSize: 14, fontWeight: '500' },
  lineMeta: { fontSize: 12, marginTop: 2 },
  lineAmount: { fontSize: 14, fontWeight: '600', minWidth: 80, textAlign: 'right' },
  totalsSection: { borderTopWidth: 2, paddingTop: 10, gap: 6, marginTop: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 13 },
  totalValue: { fontSize: 13 },
  grandLabel: { fontSize: 15, fontWeight: '700' },
  grandValue: { fontSize: 20, fontWeight: '700', color: '#000000' },
  actions: { gap: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 48, borderRadius: 10, borderWidth: 1,
  },
  actionBtnText: { fontSize: 14, color: '#000000', fontWeight: '600' },
  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, backgroundColor: '#15803D', borderRadius: 10,
  },
  acceptBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  jobCreatedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12 },
  jobCreatedText: { fontSize: 14, color: '#15803D', fontWeight: '500' },
  awaitBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF7ED', borderRadius: 10, padding: 14 },
  awaitText: { flex: 1, fontSize: 13, color: '#C2410C', lineHeight: 18 },
});
