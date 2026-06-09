import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, FlatList, ActivityIndicator,
  Image, Linking, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { JobImage, JobNote, JobStatus } from '../../types';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { ImageUploadModal } from '../../components/ImageUploadModal';
import { InvoicePreviewModal } from '../../components/InvoicePreviewModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { status: JobStatus; label: string; color: string; bg: string }[] = [
  { status: 'new', label: 'Ny', color: '#2563FF', bg: '#EEF4FF' },
  { status: 'in_progress', label: 'Pågår', color: '#C2410C', bg: '#FFF7ED' },
  { status: 'completed', label: 'Ferdig', color: '#15803D', bg: '#F0FDF4' },
];

const INVOICE_CFG = {
  sent: { label: 'Sendt', color: '#2563FF', bg: '#EEF4FF' },
  paid: { label: 'Betalt', color: '#15803D', bg: '#F0FDF4' },
  overdue: { label: 'Forfalt', color: '#DC2626', bg: '#FEF2F2' },
};

const LABEL_CFG = {
  'før': { label: 'Før', color: '#C2410C', bg: '#FFF7ED' },
  'etter': { label: 'Etter', color: '#15803D', bg: '#F0FDF4' },
};

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function SectionLabel({ title }: { title: string }) {
  const { colors: C } = useTheme();
  return <Text style={[styles.sectionLabel, { color: '#64748B' }]}>{title}</Text>;
}

// ─── Locked image cell ────────────────────────────────────────────────────────

function LockedImage({ image, thumbSize, onPress }: {
  image: JobImage; thumbSize: number; onPress: () => void;
}) {
  const { colors: C } = useTheme();
  const lc = image.label ? LABEL_CFG[image.label] : null;
  const dateStr = image.uploadedAt
    ? new Date(image.uploadedAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
    : '';
  return (
    <View style={[lockedCell.wrap, { width: thumbSize }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <View style={[lockedCell.imgWrap, { height: thumbSize }]}>
          <Image source={{ uri: image.imageUrl }} style={lockedCell.img} resizeMode="cover" />
          {lc && (
            <View style={[lockedCell.badge, { backgroundColor: lc.bg }]}>
              <Text style={[lockedCell.badgeText, { color: lc.color }]}>{lc.label}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      {image.note ? (
        <View style={lockedCell.noteRow}>
          <Ionicons name="lock-closed-outline" size={11} color={C.textTertiary} />
          <Text style={lockedCell.note} numberOfLines={2}>{image.note}</Text>
        </View>
      ) : null}
      <Text style={lockedCell.meta} numberOfLines={1}>
        {[image.uploadedBy, dateStr].filter(Boolean).join(' · ')}
      </Text>
    </View>
  );
}

const lockedCell = StyleSheet.create({
  wrap: { marginBottom: 4 },
  imgWrap: { borderRadius: 10, overflow: 'hidden', backgroundColor: '#F1F5F9', position: 'relative' },
  img: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 6, left: 6, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 5 },
  note: { fontSize: 12, color: '#64748B', fontStyle: 'italic', flex: 1, lineHeight: 16 },
  meta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
});

// ─── Fullscreen image viewer ──────────────────────────────────────────────────

function FullscreenViewer({ image, onClose }: { image: JobImage | null; onClose: () => void }) {
  if (!image) return null;
  const lc = image.label ? LABEL_CFG[image.label] : null;
  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={fsv.bg}>
        <TouchableOpacity style={fsv.close} onPress={onClose}>
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        {lc && (
          <View style={[fsv.badge, { backgroundColor: lc.bg }]}>
            <Text style={[fsv.badgeText, { color: lc.color }]}>{lc.label}</Text>
          </View>
        )}
        <Image source={{ uri: image.imageUrl }} style={fsv.img} resizeMode="contain" />
        {image.note ? (
          <View style={fsv.noteBar}>
            <Ionicons name="lock-closed-outline" size={13} color="rgba(255,255,255,0.6)" />
            <Text style={fsv.noteText}>{image.note}</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const fsv = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  close: { position: 'absolute', top: 52, right: 20, zIndex: 10 },
  badge: { position: 'absolute', top: 52, left: 20, zIndex: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 13, fontWeight: '700' },
  img: { width: '100%', height: '70%' },
  noteBar: { position: 'absolute', bottom: 48, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  noteText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', flex: 1 },
});

// ─── Tech picker modal ────────────────────────────────────────────────────────

function TechPickerModal({ visible, technicians, selectedId, onSelect, onClose }: {
  visible: boolean; technicians: any[]; selectedId: string | null;
  onSelect: (id: string | null, name: string | null) => void; onClose: () => void;
}) {
  const { colors: C } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tp.overlay}>
        <View style={tp.sheet}>
          <View style={tp.header}>
            <Text style={tp.title}>Velg tekniker</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={tp.item} onPress={() => { onSelect(null, null); onClose(); }}>
            <Text style={tp.itemText}>Ikke tildelt</Text>
            {!selectedId && <Ionicons name="checkmark" size={18} color="#2563FF" />}
          </TouchableOpacity>
          <FlatList
            data={technicians}
            keyExtractor={(u) => u.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={tp.item} onPress={() => { onSelect(item.id, item.name); onClose(); }}>
                <View style={tp.avatar}>
                  <Text style={tp.avatarText}>{initials(item.name)}</Text>
                </View>
                <Text style={tp.itemText}>{item.name}</Text>
                {selectedId === item.id && <Ionicons name="checkmark" size={18} color="#2563FF" />}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const tp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '600', color: '#1F2937' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', gap: 12 },
  itemText: { flex: 1, fontSize: 15, color: '#1F2937' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0A1B33', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
});

// ─── Invoice modal (generate) ─────────────────────────────────────────────────

function GenerateInvoiceModal({ visible, jobId, onClose }: {
  visible: boolean; jobId: string; onClose: (invoiceId?: string) => void;
}) {
  const { colors: C } = useTheme();
  const company = useAppStore((s) => s.company);
  const jobs = useAppStore((s) => s.jobs);
  const generateInvoice = useAppStore((s) => s.generateInvoice);
  const job = jobs.find((j) => j.id === jobId);

  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [hours, setHours] = useState('1');
  const [materials, setMaterials] = useState('0');
  const [note, setNote] = useState('');
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (visible) { setStep('input'); setHours('1'); setMaterials('0'); setNote(''); setErr(''); }
  }, [visible]);

  const h = Math.max(0, parseFloat(hours) || 0);
  const m = Math.max(0, parseFloat(materials) || 0);
  const hourlyRate = company?.hourlyRate ?? 0;
  const calloutFee = company?.calloutFee ?? 0;
  const paymentDays = company?.paymentTermsDays ?? 14;

  const lineItems = [
    { description: `Arbeidstimer (${h}t × ${hourlyRate.toLocaleString('nb-NO')} kr)`, amount: h * hourlyRate },
    ...(m > 0 ? [{ description: 'Materiell', amount: m }] : []),
    ...(calloutFee > 0 ? [{ description: 'Fremmøtegebyr', amount: calloutFee }] : []),
  ];
  const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
  const vat = Math.round(subtotal * 25) / 100;
  const total = subtotal + vat;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + paymentDays);
  const dueDateStr = dueDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });

  const handlePreview = () => {
    if (h <= 0) { setErr('Skriv inn gyldige arbeidstimer'); return; }
    setErr('');
    setStep('preview');
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const newInvoice = await generateInvoice(jobId, h, m, note);
      onClose(newInvoice.id);
    } catch (e: any) {
      setErr(e.message ?? 'Kunne ikke generere faktura');
      setStep('input');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => onClose()}>
      <View style={inv.overlay}>
        <View style={inv.sheet}>

          {/* ── Steg 1: Input ── */}
          {step === 'input' && (
            <View style={{ gap: 14 }}>
              <View style={inv.header}>
                <Text style={inv.title}>Generer faktura</Text>
                <TouchableOpacity onPress={() => onClose()}>
                  <Ionicons name="close" size={22} color={C.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={inv.subtitle}>{job?.customerName}</Text>

              <View style={inv.row}>
                <View style={inv.field}>
                  <Text style={inv.fieldLabel}>ARBEIDSTIMER</Text>
                  <TextInput
                    style={inv.input}
                    value={hours}
                    onChangeText={(t) => { setHours(t); setErr(''); }}
                    keyboardType="decimal-pad"
                    placeholder="1.5"
                    placeholderTextColor={C.textTertiary}
                  />
                </View>
                <View style={[inv.field, { marginLeft: 12 }]}>
                  <Text style={inv.fieldLabel}>MATERIELL (NOK)</Text>
                  <TextInput
                    style={inv.input}
                    value={materials}
                    onChangeText={(t) => { setMaterials(t); setErr(''); }}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={C.textTertiary}
                  />
                </View>
              </View>

              {/* Note */}
              <View style={{ gap: 6 }}>
                <Text style={inv.fieldLabel}>NOTAT TIL KUNDEN <Text style={{ fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: '#94A3B8' }}>(valgfritt)</Text></Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={[inv.input, { height: 80, textAlignVertical: 'top', paddingTop: 10, paddingBottom: 22 }]}
                    value={note}
                    onChangeText={(t) => { if (t.length <= 500) setNote(t); }}
                    placeholder="Legg til et notat til kunden, f.eks. garantivilkår eller beskrivelse av arbeidet..."
                    placeholderTextColor={C.textTertiary}
                    multiline
                    maxLength={500}
                  />
                  <Text style={inv.noteCounter}>{note.length}/500</Text>
                </View>
              </View>

              {/* Live total hint */}
              {h > 0 && (
                <View style={inv.hintRow}>
                  <Ionicons name="receipt-outline" size={14} color={C.textSecondary} />
                  <Text style={inv.hintText}>
                    Estimert total: {total.toLocaleString('nb-NO')} kr inkl. MVA
                  </Text>
                </View>
              )}

              {err ? <Text style={inv.err}>{err}</Text> : null}

              <TouchableOpacity style={inv.previewBtn} onPress={handlePreview}>
                <Text style={inv.previewBtnText}>Se forhåndsvisning</Text>
                <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Steg 2: Preview ── */}
          {step === 'preview' && (
            <>
              {/* Fixed header */}
              <View style={[inv.header, { marginBottom: 12 }]}>
                <TouchableOpacity style={inv.backBtn} onPress={() => setStep('input')}>
                  <Ionicons name="arrow-back" size={18} color="#2563FF" />
                  <Text style={inv.backText}>Endre</Text>
                </TouchableOpacity>
                <View style={inv.previewBadge}>
                  <Text style={inv.previewBadgeText}>FORHÅNDSVISNING</Text>
                </View>
                <TouchableOpacity onPress={() => onClose()}>
                  <Ionicons name="close" size={22} color={C.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Scrollable PDF-style document */}
              <ScrollView
                style={inv.previewScroll}
                contentContainerStyle={{ paddingBottom: 4 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={inv.paper}>

                  {/* ── Firma + fakturanummer ── */}
                  <View style={inv.paperHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={inv.paperCompany}>{company?.name ?? 'Firmanavn'}</Text>
                      {company?.orgNumber ? <Text style={inv.paperMeta}>Org.nr: {company.orgNumber}</Text> : null}
                      {company?.address ? <Text style={inv.paperMeta}>{company.address}</Text> : null}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={inv.paperInvNum}>Faktura</Text>
                      <View style={inv.draftBadge}>
                        <Text style={inv.draftBadgeText}>UTKAST</Text>
                      </View>
                    </View>
                  </View>

                  <View style={inv.paperDivider} />

                  {/* ── Fra / Til ── */}
                  <View style={inv.partiesRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={inv.partyLabel}>FRA</Text>
                      <Text style={inv.partyName}>{company?.name ?? ''}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={[inv.partyLabel, { textAlign: 'right' }]}>TIL</Text>
                      <Text style={[inv.partyName, { textAlign: 'right' }]}>{job?.customerName}</Text>
                      {job?.address ? <Text style={[inv.partyDetail, { textAlign: 'right' }]}>{job.address}</Text> : null}
                    </View>
                  </View>

                  <View style={inv.paperDivider} />

                  {/* ── Datoer ── */}
                  <View style={inv.datesRow}>
                    <View>
                      <Text style={inv.dateLabel}>FAKTURADATO</Text>
                      <Text style={inv.dateValue}>{new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={inv.dateLabel}>FORFALL</Text>
                      <Text style={inv.dateValue}>{dueDateStr}</Text>
                    </View>
                  </View>

                  <View style={inv.paperDivider} />

                  {/* ── Spesifikasjon ── */}
                  <View style={inv.tableHeader}>
                    <Text style={inv.tableHeaderText}>SPESIFIKASJON</Text>
                    <Text style={inv.tableHeaderText}>BELØP</Text>
                  </View>
                  {lineItems.map((item, i) => (
                    <View key={i} style={inv.tableRow}>
                      <Text style={inv.tableDesc}>{item.description}</Text>
                      <Text style={inv.tableAmount}>{item.amount.toLocaleString('nb-NO')} kr</Text>
                    </View>
                  ))}

                  <View style={inv.paperDivider} />

                  {/* ── Totaler ── */}
                  <View style={inv.totalsBlock}>
                    <View style={inv.totalRow}>
                      <Text style={inv.totalLabel}>Sum eks. MVA</Text>
                      <Text style={inv.totalValue}>{subtotal.toLocaleString('nb-NO')} kr</Text>
                    </View>
                    <View style={inv.totalRow}>
                      <Text style={inv.totalLabel}>MVA 25%</Text>
                      <Text style={inv.totalValue}>{vat.toLocaleString('nb-NO')} kr</Text>
                    </View>
                    <View style={inv.paperDivider} />
                    <View style={inv.grandRow}>
                      <Text style={inv.grandLabel}>TOTALT INKL. MVA</Text>
                      <Text style={inv.grandValue}>{total.toLocaleString('nb-NO')} kr</Text>
                    </View>
                  </View>

                  {/* ── Notat ── */}
                  {note.trim() ? (
                    <>
                      <View style={inv.paperDivider} />
                      <Text style={inv.noteLabel}>NOTAT</Text>
                      <Text style={inv.noteText}>{note.trim()}</Text>
                    </>
                  ) : null}

                  {/* ── Footer ── */}
                  <View style={[inv.paperDivider, { marginTop: 16 }]} />
                  <Text style={inv.paperFooter}>
                    Betalingsbetingelser: {paymentDays} dager netto. Generert av Efero.
                  </Text>
                </View>
              </ScrollView>

              {/* Pinned bottom: error + button */}
              <View style={{ gap: 10, marginTop: 12 }}>
                {err ? <Text style={inv.err}>{err}</Text> : null}
                <TouchableOpacity
                  style={[inv.generateBtn, generating && { opacity: 0.6 }]}
                  onPress={handleGenerate}
                  disabled={generating}
                >
                  {generating
                    ? <ActivityIndicator color="#FFFFFF" size="small" />
                    : <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                  }
                  <Text style={inv.generateBtnText}>
                    {generating ? 'Genererer…' : 'Generer og send faktura'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

        </View>
      </View>
    </Modal>
  );
}

const inv = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,27,51,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '92%',
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '600', color: '#0A1B33' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: -6 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 14, color: '#2563FF', fontWeight: '600' },
  previewBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  previewBadgeText: { fontSize: 10, fontWeight: '700', color: '#64748B', letterSpacing: 0.5 },
  row: { flexDirection: 'row' },
  field: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: { height: 48, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 14, fontSize: 15, color: '#1F2937', backgroundColor: '#F8FAFC' },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10 },
  hintText: { fontSize: 13, color: '#64748B' },
  err: { fontSize: 13, color: '#DC2626' },
  previewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 52, backgroundColor: '#2563FF', borderRadius: 10 },
  previewBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  // Document preview
  document: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, gap: 8 },
  docCustomer: { fontSize: 16, fontWeight: '700', color: '#0A1B33' },
  docAddress: { fontSize: 13, color: '#64748B', marginTop: -4 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 4 },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineDesc: { fontSize: 14, color: '#1F2937', flex: 1, marginRight: 8 },
  lineAmount: { fontSize: 14, color: '#1F2937', fontWeight: '500' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 13, color: '#64748B' },
  totalValue: { fontSize: 13, color: '#64748B' },
  grandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grandLabel: { fontSize: 14, fontWeight: '700', color: '#0A1B33' },
  grandValue: { fontSize: 22, fontWeight: '700', color: '#2563FF' },
  dueDate: { fontSize: 12, color: '#94A3B8', textAlign: 'right', marginTop: 2 },
  noteDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 4 },
  noteLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  noteText: { fontSize: 13, color: '#1F2937', fontStyle: 'italic', lineHeight: 18 },
  noteCounter: { position: 'absolute', bottom: 6, right: 10, fontSize: 11, color: '#94A3B8' },
  previewScroll: { maxHeight: 380 },

  // Paper document
  paper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    gap: 10,
  },
  paperHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  paperCompany: { fontSize: 15, fontWeight: '700', color: '#0A1B33' },
  paperMeta: { fontSize: 11, color: '#64748B', marginTop: 1 },
  paperInvNum: { fontSize: 14, fontWeight: '700', color: '#0A1B33' },
  draftBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 4 },
  draftBadgeText: { fontSize: 9, fontWeight: '700', color: '#64748B', letterSpacing: 0.5 },
  paperDivider: { height: 1, backgroundColor: '#E2E8F0' },
  partiesRow: { flexDirection: 'row', gap: 12 },
  partyLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  partyName: { fontSize: 13, fontWeight: '600', color: '#0A1B33' },
  partyDetail: { fontSize: 11, color: '#64748B' },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  dateValue: { fontSize: 12, color: '#1F2937', fontWeight: '500' },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  tableHeaderText: { fontSize: 9, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  tableDesc: { fontSize: 13, color: '#1F2937', flex: 1, marginRight: 8 },
  tableAmount: { fontSize: 13, color: '#1F2937', fontWeight: '500' },
  totalsBlock: { gap: 4, alignSelf: 'flex-end', minWidth: '55%' },
  paperFooter: { fontSize: 11, color: '#94A3B8' },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, backgroundColor: '#15803D', borderRadius: 10 },
  generateBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export function JobDetailScreen({ route, navigation }: any) {
  const { colors: C } = useTheme();
  const { jobId } = route.params as { jobId: string };
  const { width } = useWindowDimensions();

  const job = useAppStore((s) => s.jobs.find((j) => j.id === jobId));
  const invoice = useAppStore((s) => s.invoices.find((i) => i.jobId === jobId));
  const technicians = useAppStore((s) => s.users.filter((u) => u.role === 'technician'));
  const images = useAppStore((s) => s.jobImages[jobId] ?? []);
  const notes = useAppStore((s) => s.jobNotes[jobId] ?? []);

  const updateJobStatus = useAppStore((s) => s.updateJobStatus);
  const assignTechnician = useAppStore((s) => s.assignTechnician);
  const updateJob = useAppStore((s) => s.updateJob);
  const loadJobImages = useAppStore((s) => s.loadJobImages);
  const loadJobNotes = useAppStore((s) => s.loadJobNotes);
  const addJobNote = useAppStore((s) => s.addJobNote);

  // UI state
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showTechPicker, setShowTechPicker] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewingImage, setViewingImage] = useState<JobImage | null>(null);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  useEffect(() => {
    loadJobImages(jobId);
    loadJobNotes(jobId);
  }, [jobId]);

  if (!job) return (
    <ThemedScreen>
      <View style={[styles.topBar, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#64748B' }}>Jobb ikke funnet</Text>
      </View>
    </ThemedScreen>
  );

  const currentStatus = STATUS_OPTIONS.find((s) => s.status === job.status)!;
  const invoiceCfg = invoice ? INVOICE_CFG[invoice.status as keyof typeof INVOICE_CFG] : null;
  const thumbSize = Math.floor((Math.min(width, 800) - 48 - 16) / 3);

  const startEditing = () => {
    const [datePart, timePart] = job.scheduledAt.split('T');
    setEditName(job.customerName);
    setEditPhone(job.customerPhone);
    setEditAddress(job.address);
    setEditDescription(job.description);
    setEditDate(datePart ?? '');
    setEditTime((timePart ?? '').slice(0, 5));
    setIsEditing(true);
  };

  const cancelEditing = () => setIsEditing(false);

  const handleSaveEdits = async () => {
    if (!editName.trim() || !editAddress.trim()) return;
    setSaving(true);
    try {
      await updateJob(job.id, {
        customerName: editName.trim(),
        customerPhone: editPhone.trim(),
        address: editAddress.trim(),
        description: editDescription.trim(),
        scheduledAt: editDate && editTime ? `${editDate}T${editTime}:00` : undefined,
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: JobStatus) => {
    setShowStatusPicker(false);
    setStatusSaving(true);
    await updateJobStatus(job.id, status);
    setStatusSaving(false);
  };

  const handleTechChange = async (id: string | null, name: string | null) => {
    await assignTechnician(job.id, id, name);
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await addJobNote(job.id, noteText.trim());
      setNoteText('');
    } finally {
      setSavingNote(false);
    }
  };

  const formatScheduled = () => {
    if (!job.scheduledAt) return '';
    const d = new Date(job.scheduledAt);
    return d.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })
      + ' kl. ' + d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  };

  const formatNoteDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
      + ' kl. ' + d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ThemedScreen>
      {/* Top navigation bar */}
      <View style={[styles.topBar, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: C.textPrimary }]}>Jobbdetaljer</Text>
        <TouchableOpacity
          style={[styles.editToggleBtn, isEditing && styles.editToggleBtnActive]}
          onPress={isEditing ? cancelEditing : startEditing}
        >
          <Ionicons name={isEditing ? 'close-outline' : 'create-outline'} size={16} color={isEditing ? '#DC2626' : '#2563FF'} />
          <Text style={[styles.editToggleText, isEditing && { color: '#DC2626' }]}>
            {isEditing ? 'Avbryt' : 'Rediger'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* ── Hero: name + status + date ───────────────────────────────── */}
        <View style={[styles.heroCard, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          {isEditing ? (
            <TextInput
              style={[styles.heroNameInput, { color: C.textPrimary, borderBottomColor: '#2563FF' }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Kundenavn"
              placeholderTextColor={C.textTertiary}
            />
          ) : (
            <Text style={[styles.heroName, { color: C.textPrimary }]}>{job.customerName}</Text>
          )}
          <Text style={[styles.heroMeta, { color: C.textSecondary }]}>Opprettet {formatDate(job.createdAt)}</Text>

          <View style={styles.heroActions}>
            <TouchableOpacity
              style={[styles.statusTrigger, { borderColor: currentStatus.color, backgroundColor: currentStatus.bg }]}
              onPress={() => setShowStatusPicker(true)}
              disabled={statusSaving}
            >
              {statusSaving
                ? <ActivityIndicator size="small" color={currentStatus.color} />
                : <>
                  <View style={[styles.statusDot, { backgroundColor: currentStatus.color }]} />
                  <Text style={[styles.statusTriggerText, { color: currentStatus.color }]}>{currentStatus.label}</Text>
                  <Ionicons name="chevron-down" size={14} color={currentStatus.color} />
                </>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Kundeinformasjon ─────────────────────────────────────────── */}
        <SectionLabel title="KUNDEINFORMASJON" />
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          {isEditing ? (
            <>
              <View style={styles.editField}>
                <Text style={[styles.editLabel, { color: C.textSecondary }]}>TELEFON</Text>
                <TextInput style={[styles.editInput, { backgroundColor: C.cardAlt, color: C.textPrimary, borderColor: C.border }]} value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" placeholder="92345678" placeholderTextColor={C.textTertiary} />
              </View>
              <View style={styles.editField}>
                <Text style={[styles.editLabel, { color: C.textSecondary }]}>ADRESSE</Text>
                <TextInput style={[styles.editInput, { backgroundColor: C.cardAlt, color: C.textPrimary, borderColor: C.border }]} value={editAddress} onChangeText={setEditAddress} placeholder="Gateveien 1, Oslo" placeholderTextColor={C.textTertiary} />
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={16} color={C.textSecondary} />
                <Text style={[styles.infoValue, { color: C.textPrimary }]}>{job.customerName}</Text>
              </View>
              {job.customerPhone ? (
                <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`tel:${job.customerPhone}`)}>
                  <Ionicons name="call-outline" size={16} color="#2563FF" />
                  <Text style={[styles.infoValue, styles.infoLink, { color: '#2563FF' }]}>{job.customerPhone}</Text>
                </TouchableOpacity>
              ) : null}
              {job.address ? (
                <TouchableOpacity
                  style={styles.infoRow}
                  onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(job.address)}`)}
                >
                  <Ionicons name="location-outline" size={16} color="#2563FF" />
                  <Text style={[styles.infoValue, styles.infoLink, { color: '#2563FF' }]}>{job.address}</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </View>

        {/* ── Jobbinformasjon ──────────────────────────────────────────── */}
        <SectionLabel title="JOBBINFORMASJON" />
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          {isEditing ? (
            <>
              <View style={styles.editField}>
                <Text style={[styles.editLabel, { color: C.textSecondary }]}>BESKRIVELSE</Text>
                <TextInput
                  style={[styles.editInput, styles.editTextArea, { backgroundColor: C.cardAlt, color: C.textPrimary, borderColor: C.border }]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  numberOfLines={3}
                  placeholder="Beskriv jobben…"
                  placeholderTextColor={C.textTertiary}
                />
              </View>
              <View style={styles.dateRow}>
                <View style={[styles.editField, { flex: 1 }]}>
                  <Text style={[styles.editLabel, { color: C.textSecondary }]}>DATO</Text>
                  <TextInput style={[styles.editInput, { backgroundColor: C.cardAlt, color: C.textPrimary, borderColor: C.border }]} value={editDate} onChangeText={setEditDate} placeholder="2025-05-15" placeholderTextColor={C.textTertiary} />
                </View>
                <View style={{ width: 12 }} />
                <View style={[styles.editField, { width: 90 }]}>
                  <Text style={[styles.editLabel, { color: C.textSecondary }]}>KL.</Text>
                  <TextInput style={[styles.editInput, { backgroundColor: C.cardAlt, color: C.textPrimary, borderColor: C.border }]} value={editTime} onChangeText={setEditTime} placeholder="09:00" placeholderTextColor={C.textTertiary} />
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Ionicons name="document-text-outline" size={16} color={C.textSecondary} />
                <Text style={[styles.infoValue, { flex: 1, color: C.textPrimary }]}>{job.description}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={16} color={C.textSecondary} />
                <Text style={[styles.infoValue, { color: C.textPrimary }]}>{formatScheduled()}</Text>
              </View>
            </>
          )}

          {/* Tekniker — always visible */}
          <TouchableOpacity style={styles.techRow} onPress={() => setShowTechPicker(true)}>
            <View style={[styles.techAvatarCircle, { backgroundColor: "#0A1B33" }]}>
              {job.assignedTechnicianName
                ? <Text style={styles.techAvatarText}>{initials(job.assignedTechnicianName)}</Text>
                : <Ionicons name="person-outline" size={14} color={C.textSecondary} />
              }
            </View>
            <Text style={[styles.infoValue, { flex: 1 }]}>
              {job.assignedTechnicianName ?? 'Ikke tildelt'}
            </Text>
            <Text style={[styles.changeLink, { color: '#2563FF' }]}>Endre</Text>
          </TouchableOpacity>
        </View>

        {/* Save / cancel edit buttons */}
        {isEditing && (
          <TouchableOpacity
            style={[styles.saveEditsBtn, saving && { opacity: 0.6 }]}
            onPress={handleSaveEdits}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.saveEditsBtnText}>Lagre endringer</Text>
            }
          </TouchableOpacity>
        )}

        {/* ── Notater ──────────────────────────────────────────────────── */}
        <SectionLabel title="NOTATER" />

        {job.status === 'completed' ? (
          /* Completed: info banner only — no input */
          <View style={[styles.noteCompletedBanner, { backgroundColor: C.cardBg, borderColor: C.border }]}>
            <Ionicons name="lock-closed-outline" size={13} color="#64748B" />
            <Text style={styles.noteCompletedText}>Jobben er fullført — nye notater kan ikke legges til</Text>
          </View>
        ) : (
          /* Active: textarea + button */
          <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border, gap: 10 }]}>
            <View style={styles.noteTextareaWrap}>
              <TextInput
                style={[styles.noteTextarea, { backgroundColor: C.cardAlt, color: C.textPrimary, borderColor: noteText.length > 0 ? '#2563FF' : C.border }]}
                value={noteText}
                onChangeText={(t) => { if (t.length <= 500) setNoteText(t); }}
                placeholder="Legg til et notat..."
                placeholderTextColor={C.textTertiary}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.noteCounter}>{noteText.length}/500</Text>
            </View>
            <TouchableOpacity
              style={[styles.noteAddBtn, (!noteText.trim() || savingNote) && styles.noteAddBtnDisabled]}
              onPress={handleSaveNote}
              disabled={!noteText.trim() || savingNote}
            >
              {savingNote
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={styles.noteAddBtnText}>Legg til notat</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Notes list — always visible, newest first */}
        {notes.length === 0 ? (
          <Text style={[styles.emptyNotes, { color: C.textTertiary }]}>Ingen notater ennå</Text>
        ) : (
          notes.map((note: JobNote) => (
            <View key={note.id} style={[styles.noteItem, { backgroundColor: C.cardBg, borderColor: C.border }]}>
              <View style={styles.noteItemHeader}>
                <Text style={[styles.noteAuthor, { color: C.textPrimary }]}>{note.authorName}</Text>
                <View style={styles.noteDateRow}>
                  <Ionicons name="lock-closed-outline" size={11} color="#64748B" />
                  <Text style={styles.noteDateText}>{formatNoteDate(note.createdAt)}</Text>
                </View>
              </View>
              <Text style={[styles.noteBody, { color: C.textPrimary }]}>{note.content}</Text>
            </View>
          ))
        )}

        {/* ── Faktura ──────────────────────────────────────────────────── */}
        <SectionLabel title="FAKTURA" />
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          {invoice ? (
            <TouchableOpacity
              style={styles.invoiceRow}
              onPress={() => setPreviewInvoiceId(invoice.id)}
              activeOpacity={0.7}
            >
              <View style={{ gap: 4 }}>
                <Text style={[styles.invoiceNumber, { color: C.textPrimary }]}>{invoice.invoiceNumber}</Text>
                <Text style={[styles.invoiceMeta, { color: C.textSecondary }]}>Forfall: {invoice.dueDate?.slice(0, 10)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={[styles.invoiceAmount, { color: C.textPrimary }]}>{formatCurrency(invoice.total)}</Text>
                {invoiceCfg && (
                  <View style={[styles.invBadge, { backgroundColor: invoiceCfg.bg }]}>
                    <Text style={[styles.invBadgeText, { color: invoiceCfg.color }]}>{invoiceCfg.label}</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textTertiary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.generateBtn} onPress={() => setShowInvoiceModal(true)}>
              <Ionicons name="document-text-outline" size={18} color="#2563FF" />
              <Text style={styles.generateBtnText}>Generer faktura</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Bilder ───────────────────────────────────────────────────── */}
        <SectionLabel title="BILDER FRA JOBBEN" />
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <View style={styles.imagesHeader}>
            <Text style={[styles.imageCount, { color: C.textSecondary }]}>{images.length} bilde{images.length !== 1 ? 'r' : ''}</Text>
          </View>

          <TouchableOpacity style={styles.uploadBtn} onPress={() => setShowUploadModal(true)}>
            <Ionicons name="cloud-upload-outline" size={18} color="#2563FF" />
            <Text style={styles.uploadBtnText}>Last opp bilder</Text>
          </TouchableOpacity>

          {images.length === 0 ? (
            <View style={styles.noImages}>
              <Ionicons name="images-outline" size={32} color="#CBD5E1" />
              <Text style={styles.noImagesText}>Ingen bilder ennå</Text>
            </View>
          ) : (
            <View style={styles.imageGrid}>
              {images.map((img) => (
                <LockedImage
                  key={img.id}
                  image={img}
                  thumbSize={thumbSize}
                  onPress={() => setViewingImage(img)}
                />
              ))}
            </View>
          )}

          <View style={styles.lockHint}>
            <Ionicons name="lock-closed-outline" size={12} color={C.textTertiary} />
            <Text style={[styles.lockHintText, { color: C.textTertiary }]}>Bilder og notater kan ikke endres etter opplasting</Text>
          </View>
        </View>

      </ScrollView>

      {/* Status picker modal */}
      <Modal visible={showStatusPicker} transparent animationType="fade" onRequestClose={() => setShowStatusPicker(false)}>
        <TouchableOpacity style={styles.statusOverlay} activeOpacity={1} onPress={() => setShowStatusPicker(false)}>
          <View style={styles.statusSheet}>
            <Text style={styles.statusSheetTitle}>Endre status</Text>
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.status}
                style={[styles.statusSheetOption, job.status === opt.status && { backgroundColor: opt.bg }]}
                onPress={() => { setShowStatusPicker(false); handleStatusChange(opt.status); }}
              >
                <View style={[styles.statusDot, { backgroundColor: opt.color }]} />
                <Text style={[styles.statusSheetText, { color: opt.color }]}>{opt.label}</Text>
                {job.status === opt.status && <Ionicons name="checkmark" size={16} color={opt.color} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modals */}
      <TechPickerModal
        visible={showTechPicker}
        technicians={technicians}
        selectedId={job.assignedTechnicianId}
        onSelect={handleTechChange}
        onClose={() => setShowTechPicker(false)}
      />

      <GenerateInvoiceModal
        visible={showInvoiceModal}
        jobId={job.id}
        onClose={(newInvoiceId) => {
          setShowInvoiceModal(false);
          if (newInvoiceId) setPreviewInvoiceId(newInvoiceId);
        }}
      />

      <InvoicePreviewModal invoiceId={previewInvoiceId} onClose={() => setPreviewInvoiceId(null)} />

      <ImageUploadModal
        visible={showUploadModal}
        jobId={job.id}
        onClose={() => setShowUploadModal(false)}
      />

      <FullscreenViewer image={viewingImage} onClose={() => setViewingImage(null)} />
    </ThemedScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  backBtn: {},
  topBarTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: '#1F2937' },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563FF',
    backgroundColor: '#EEF4FF',
  },
  editToggleBtnActive: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  editToggleText: { fontSize: 13, fontWeight: '600', color: '#2563FF' },

  content: { padding: 20, gap: 0, paddingBottom: 48 },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: '#64748B',
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginTop: 20, marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },

  // Hero
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    gap: 8,
    marginBottom: 0,
  },
  heroName: { fontSize: 24, fontWeight: '700', color: '#0A1B33' },
  heroNameInput: {
    fontSize: 22, fontWeight: '700', color: '#0A1B33',
    borderBottomWidth: 1.5, borderBottomColor: '#2563FF', paddingBottom: 4,
  },
  heroMeta: { fontSize: 13, color: '#94A3B8' },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },

  // Status dropdown
  statusTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusTriggerText: { fontSize: 13, fontWeight: '600' },
  statusOverlay: {
    flex: 1, backgroundColor: 'rgba(10,27,51,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: 40,
  },
  statusSheet: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    width: '100%', maxWidth: 320, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 24, elevation: 12,
  },
  statusSheetTitle: {
    fontSize: 13, fontWeight: '600', color: '#64748B',
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10,
  },
  statusSheetOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  statusSheetText: { flex: 1, fontSize: 15, fontWeight: '600' },

  // Info rows
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoValue: { fontSize: 15, color: '#1F2937', flex: 1, lineHeight: 22 },
  infoLink: { color: '#2563FF', textDecorationLine: 'underline' },

  // Technician row
  techRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  techAvatarCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#0A1B33', justifyContent: 'center', alignItems: 'center',
  },
  techAvatarText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  changeLink: { fontSize: 13, color: '#2563FF', fontWeight: '600' },

  // Edit fields
  editField: { gap: 6 },
  editLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  editInput: {
    height: 48, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10,
    paddingHorizontal: 14, fontSize: 15, color: '#1F2937', backgroundColor: '#F8FAFC',
  },
  editTextArea: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  dateRow: { flexDirection: 'row', alignItems: 'flex-end' },

  saveEditsBtn: {
    height: 52, backgroundColor: '#2563FF', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  saveEditsBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  // Notes
  noteTextareaWrap: { position: 'relative' },
  noteTextarea: {
    height: 80,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 24,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
  },
  noteCounter: {
    position: 'absolute', bottom: 7, right: 10,
    fontSize: 11, color: '#94A3B8',
  },
  noteAddBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 8, backgroundColor: '#2563FF',
  },
  noteAddBtnDisabled: { backgroundColor: '#CBD5E1' },
  noteAddBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  noteCompletedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, padding: 12, paddingHorizontal: 14,
  },
  noteCompletedText: { fontSize: 13, color: '#64748B', fontStyle: 'italic', flex: 1 },
  emptyNotes: { fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  noteItem: {
    borderRadius: 10, padding: 14, paddingHorizontal: 16,
    borderWidth: 1, marginTop: 0,
  },
  noteItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  noteAuthor: { fontSize: 13, fontWeight: '600', color: '#0A1B33' },
  noteDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  noteDateText: { fontSize: 12, color: '#64748B' },
  noteBody: { fontSize: 14, color: '#1F2937', lineHeight: 22 },

  // Invoice
  invoiceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  invoiceNumber: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  invoiceMeta: { fontSize: 13, color: '#64748B' },
  invoiceAmount: { fontSize: 18, fontWeight: '700', color: '#0A1B33' },
  invBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  invBadgeText: { fontSize: 12, fontWeight: '600' },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 14, justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#2563FF', borderRadius: 10, backgroundColor: '#EEF4FF',
  },
  generateBtnText: { fontSize: 14, color: '#2563FF', fontWeight: '600' },

  // Images
  imagesHeader: { flexDirection: 'row', justifyContent: 'flex-end' },
  imageCount: { fontSize: 13, color: '#64748B' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12,
  },
  errorText: { fontSize: 13, color: '#DC2626', flex: 1 },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#2563FF', borderStyle: 'dashed',
    borderRadius: 10, paddingVertical: 14, backgroundColor: '#EEF4FF',
  },
  uploadBtnText: { fontSize: 14, color: '#2563FF', fontWeight: '600' },
  noImages: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  noImagesText: { fontSize: 14, color: '#94A3B8' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lockHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -4 },
  lockHintText: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },
});
