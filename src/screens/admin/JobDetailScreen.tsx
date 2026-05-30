import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, FlatList, ActivityIndicator,
  Image, Linking, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { JobImage, JobNote, JobStatus } from '../../types';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { ImageUploadModal } from '../../components/ImageUploadModal';

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
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

// ─── Locked image cell ────────────────────────────────────────────────────────

function LockedImage({ image, thumbSize, onPress }: {
  image: JobImage; thumbSize: number; onPress: () => void;
}) {
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
          <Ionicons name="lock-closed-outline" size={11} color="#94A3B8" />
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
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tp.overlay}>
        <View style={tp.sheet}>
          <View style={tp.header}>
            <Text style={tp.title}>Velg tekniker</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#64748B" />
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

function GenerateInvoiceModal({ visible, onConfirm, onClose }: {
  visible: boolean; onConfirm: (hours: number, materials: number) => void; onClose: () => void;
}) {
  const [hours, setHours] = useState('1');
  const [materials, setMaterials] = useState('0');
  const [err, setErr] = useState('');

  const handleConfirm = () => {
    const h = parseFloat(hours);
    const m = parseFloat(materials);
    if (isNaN(h) || h <= 0) { setErr('Skriv inn gyldige arbeidstimer'); return; }
    onConfirm(h, isNaN(m) ? 0 : m);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={inv.overlay}>
        <View style={inv.sheet}>
          <View style={inv.header}>
            <Text style={inv.title}>Generer faktura</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={inv.row}>
            <View style={inv.field}>
              <Text style={inv.label}>ARBEIDSTIMER</Text>
              <TextInput style={inv.input} value={hours} onChangeText={(t) => { setHours(t); setErr(''); }} keyboardType="decimal-pad" placeholder="1.5" placeholderTextColor="#94A3B8" />
            </View>
            <View style={[inv.field, { marginLeft: 12 }]}>
              <Text style={inv.label}>MATERIELL (NOK)</Text>
              <TextInput style={inv.input} value={materials} onChangeText={setMaterials} keyboardType="numeric" placeholder="0" placeholderTextColor="#94A3B8" />
            </View>
          </View>
          {err ? <Text style={inv.err}>{err}</Text> : null}
          <TouchableOpacity style={inv.btn} onPress={handleConfirm}>
            <Text style={inv.btnText}>Generer faktura</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const inv = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '600', color: '#1F2937' },
  row: { flexDirection: 'row' },
  field: { flex: 1 },
  label: { fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: { height: 48, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 14, fontSize: 15, color: '#1F2937', backgroundColor: '#F8FAFC' },
  err: { fontSize: 13, color: '#DC2626' },
  btn: { height: 52, backgroundColor: '#2563FF', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export function JobDetailScreen({ route, navigation }: any) {
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
  const generateInvoice = useAppStore((s) => s.generateInvoice);
  const loadJobImages = useAppStore((s) => s.loadJobImages);
  const loadJobNotes = useAppStore((s) => s.loadJobNotes);
  const addJobNote = useAppStore((s) => s.addJobNote);

  // UI state
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showTechPicker, setShowTechPicker] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
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
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#64748B' }}>Jobb ikke funnet</Text>
      </View>
    </SafeAreaView>
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
    <SafeAreaView style={styles.safe}>
      {/* Top navigation bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Jobbdetaljer</Text>
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
        <View style={styles.heroCard}>
          {isEditing ? (
            <TextInput
              style={styles.heroNameInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Kundenavn"
              placeholderTextColor="#94A3B8"
            />
          ) : (
            <Text style={styles.heroName}>{job.customerName}</Text>
          )}
          <Text style={styles.heroMeta}>Opprettet {formatDate(job.createdAt)}</Text>

          <View style={styles.heroActions}>
            {/* Status dropdown trigger */}
            <View style={styles.statusWrap}>
              <TouchableOpacity
                style={[styles.statusTrigger, { borderColor: currentStatus.color, backgroundColor: currentStatus.bg }]}
                onPress={() => setShowStatusPicker((v) => !v)}
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

              {showStatusPicker && (
                <View style={styles.statusDropdown}>
                  {STATUS_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.status}
                      style={[styles.statusOption, job.status === opt.status && { backgroundColor: opt.bg }]}
                      onPress={() => handleStatusChange(opt.status)}
                    >
                      <View style={[styles.statusDot, { backgroundColor: opt.color }]} />
                      <Text style={[styles.statusOptionText, { color: opt.color }]}>{opt.label}</Text>
                      {job.status === opt.status && <Ionicons name="checkmark" size={14} color={opt.color} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Transparent backdrop for status dropdown */}
        {showStatusPicker && (
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowStatusPicker(false)}
            activeOpacity={1}
          />
        )}

        {/* ── Kundeinformasjon ─────────────────────────────────────────── */}
        <SectionLabel title="KUNDEINFORMASJON" />
        <View style={styles.card}>
          {isEditing ? (
            <>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>TELEFON</Text>
                <TextInput style={styles.editInput} value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" placeholder="92345678" placeholderTextColor="#94A3B8" />
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>ADRESSE</Text>
                <TextInput style={styles.editInput} value={editAddress} onChangeText={setEditAddress} placeholder="Gateveien 1, Oslo" placeholderTextColor="#94A3B8" />
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={16} color="#64748B" />
                <Text style={styles.infoValue}>{job.customerName}</Text>
              </View>
              {job.customerPhone ? (
                <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`tel:${job.customerPhone}`)}>
                  <Ionicons name="call-outline" size={16} color="#2563FF" />
                  <Text style={[styles.infoValue, styles.infoLink]}>{job.customerPhone}</Text>
                </TouchableOpacity>
              ) : null}
              {job.address ? (
                <TouchableOpacity
                  style={styles.infoRow}
                  onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(job.address)}`)}
                >
                  <Ionicons name="location-outline" size={16} color="#2563FF" />
                  <Text style={[styles.infoValue, styles.infoLink]}>{job.address}</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </View>

        {/* ── Jobbinformasjon ──────────────────────────────────────────── */}
        <SectionLabel title="JOBBINFORMASJON" />
        <View style={styles.card}>
          {isEditing ? (
            <>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>BESKRIVELSE</Text>
                <TextInput
                  style={[styles.editInput, styles.editTextArea]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  numberOfLines={3}
                  placeholder="Beskriv jobben…"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.dateRow}>
                <View style={[styles.editField, { flex: 1 }]}>
                  <Text style={styles.editLabel}>DATO</Text>
                  <TextInput style={styles.editInput} value={editDate} onChangeText={setEditDate} placeholder="2025-05-15" placeholderTextColor="#94A3B8" />
                </View>
                <View style={{ width: 12 }} />
                <View style={[styles.editField, { width: 90 }]}>
                  <Text style={styles.editLabel}>KL.</Text>
                  <TextInput style={styles.editInput} value={editTime} onChangeText={setEditTime} placeholder="09:00" placeholderTextColor="#94A3B8" />
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Ionicons name="document-text-outline" size={16} color="#64748B" />
                <Text style={[styles.infoValue, { flex: 1 }]}>{job.description}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={16} color="#64748B" />
                <Text style={styles.infoValue}>{formatScheduled()}</Text>
              </View>
            </>
          )}

          {/* Tekniker — always visible */}
          <TouchableOpacity style={styles.techRow} onPress={() => setShowTechPicker(true)}>
            <View style={styles.techAvatarCircle}>
              {job.assignedTechnicianName
                ? <Text style={styles.techAvatarText}>{initials(job.assignedTechnicianName)}</Text>
                : <Ionicons name="person-outline" size={14} color="#64748B" />
              }
            </View>
            <Text style={[styles.infoValue, { flex: 1 }]}>
              {job.assignedTechnicianName ?? 'Ikke tildelt'}
            </Text>
            <Text style={styles.changeLink}>Endre</Text>
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
        <View style={styles.card}>
          <View style={styles.noteInputRow}>
            <TextInput
              style={styles.noteInput}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Legg til notat…"
              placeholderTextColor="#94A3B8"
              multiline
            />
            <TouchableOpacity
              style={[styles.noteBtn, (!noteText.trim() || savingNote) && styles.noteBtnDisabled]}
              onPress={handleSaveNote}
              disabled={!noteText.trim() || savingNote}
            >
              {savingNote
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={styles.noteBtnText}>Lagre</Text>
              }
            </TouchableOpacity>
          </View>

          {notes.length === 0 ? (
            <Text style={styles.emptyNotes}>Ingen notater ennå</Text>
          ) : (
            <View style={styles.notesList}>
              {notes.map((note: JobNote) => (
                <View key={note.id} style={styles.noteItem}>
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteMeta}>{note.authorName}</Text>
                    <Text style={styles.noteMeta}>{formatNoteDate(note.createdAt)}</Text>
                  </View>
                  <Text style={styles.noteContent}>{note.content}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Faktura ──────────────────────────────────────────────────── */}
        <SectionLabel title="FAKTURA" />
        <View style={styles.card}>
          {invoice ? (
            <TouchableOpacity
              style={styles.invoiceRow}
              onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: invoice.id })}
              activeOpacity={0.7}
            >
              <View style={{ gap: 4 }}>
                <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                <Text style={styles.invoiceMeta}>Forfall: {invoice.dueDate?.slice(0, 10)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={styles.invoiceAmount}>{formatCurrency(invoice.total)}</Text>
                {invoiceCfg && (
                  <View style={[styles.invBadge, { backgroundColor: invoiceCfg.bg }]}>
                    <Text style={[styles.invBadgeText, { color: invoiceCfg.color }]}>{invoiceCfg.label}</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
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
        <View style={styles.card}>
          <View style={styles.imagesHeader}>
            <Text style={styles.imageCount}>{images.length} bilde{images.length !== 1 ? 'r' : ''}</Text>
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
            <Ionicons name="lock-closed-outline" size={12} color="#94A3B8" />
            <Text style={styles.lockHintText}>Bilder og notater kan ikke endres etter opplasting</Text>
          </View>
        </View>

      </ScrollView>

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
        onConfirm={(h, m) => generateInvoice(job.id, h, m)}
        onClose={() => setShowInvoiceModal(false)}
      />

      <ImageUploadModal
        visible={showUploadModal}
        jobId={job.id}
        onClose={() => setShowUploadModal(false)}
      />

      <FullscreenViewer image={viewingImage} onClose={() => setViewingImage(null)} />
    </SafeAreaView>
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
  statusWrap: { position: 'relative', zIndex: 100 },
  statusTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusTriggerText: { fontSize: 13, fontWeight: '600' },
  statusDropdown: {
    position: 'absolute', top: 40, left: 0, zIndex: 101,
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
    minWidth: 160, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
  },
  statusOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  statusOptionText: { flex: 1, fontSize: 14, fontWeight: '600' },

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
  noteInputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  noteInput: {
    flex: 1, minHeight: 44, maxHeight: 100, borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#1F2937', backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
  },
  noteBtn: {
    height: 44, paddingHorizontal: 16, borderRadius: 10,
    backgroundColor: '#2563FF', justifyContent: 'center', alignItems: 'center',
  },
  noteBtnDisabled: { backgroundColor: '#CBD5E1' },
  noteBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  emptyNotes: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingVertical: 8 },
  notesList: { gap: 10 },
  noteItem: {
    backgroundColor: '#F8FAFC', borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: '#F1F5F9',
  },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  noteMeta: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  noteContent: { fontSize: 14, color: '#1F2937', lineHeight: 20 },

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
