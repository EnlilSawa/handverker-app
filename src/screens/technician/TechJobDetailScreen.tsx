import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, KeyboardAvoidingView, Platform,
  Image, ActivityIndicator, Linking, useWindowDimensions,
} from 'react-native';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { JobImage, JobNote } from '../../types';
import { ImageUploadModal } from '../../components/ImageUploadModal';

const STATUS_CFG = {
  new:         { label: 'Ny',     color: '#2563FF', bg: '#EEF4FF' },
  in_progress: { label: 'Pågår', color: '#E07C00', bg: '#FFF7ED' },
  completed:   { label: 'Ferdig', color: '#15803D', bg: '#F0FDF4' },
};

const LABEL_CFG: Record<string, { label: string; color: string; bg: string }> = {
  'før':   { label: 'Før',  color: '#C2410C', bg: '#FFF7ED' },
  'etter': { label: 'Etter', color: '#15803D', bg: '#F0FDF4' },
};

export function TechJobDetailScreen({ route, navigation }: any) {
  const { colors: C } = useTheme();
  const { jobId } = route.params as { jobId: string };
  const { width } = useWindowDimensions();

  const job        = useAppStore((s) => s.jobs.find((j) => j.id === jobId));
  const notes      = useAppStore((s) => s.jobNotes[jobId] ?? []);
  const images     = useAppStore((s) => s.jobImages[jobId] ?? []);
  const loadJobNotes  = useAppStore((s) => s.loadJobNotes);
  const loadJobImages = useAppStore((s) => s.loadJobImages);
  const addJobNote    = useAppStore((s) => s.addJobNote);
  const updateJobStatus = useAppStore((s) => s.updateJobStatus);

  const [noteText, setNoteText]     = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError]   = useState('');

  const [showDoneModal, setShowDoneModal] = useState(false);
  const [hours, setHours]         = useState('1');
  const [materials, setMaterials] = useState('');
  const [completing, setCompleting] = useState(false);
  const [doneError, setDoneError]   = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewingImage, setViewingImage]       = useState<JobImage | null>(null);

  useEffect(() => {
    loadJobNotes(jobId);
    loadJobImages(jobId);
  }, [jobId]);

  if (!job) return null;

  const statusCfg = STATUS_CFG[job.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.new;
  const isCompleted = job.status === 'completed';
  const thumbSize = Math.floor((Math.min(width, 800) - 48 - 16) / 3);

  const openMaps = () =>
    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(job.address)}`).catch(() => {});

  const formatNoteDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
      + ' kl. ' + d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setNoteError('');
    setSavingNote(true);
    try {
      await addJobNote(job.id, noteText.trim());
      setNoteText('');
    } catch (e: any) {
      setNoteError(e.message ?? 'Kunne ikke lagre notat');
    } finally {
      setSavingNote(false);
    }
  };

  const handleStartJob = async () => {
    await updateJobStatus(job.id, 'in_progress');
  };

  const handleMarkDone = async () => {
    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0) { setDoneError('Skriv inn gyldige arbeidstimer'); return; }
    setCompleting(true);
    try {
      await updateJobStatus(job.id, 'completed', h, parseFloat(materials || '0'));
      await loadJobNotes(job.id);
      setShowDoneModal(false);
      setSuccessMsg('Jobb fullført! Faktura er sendt til kunden.');
      setTimeout(() => navigation.goBack(), 2500);
    } catch (e: any) {
      setDoneError(e.message ?? 'Noe gikk galt');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <ThemedScreen>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]} numberOfLines={1}>
          {job.customerName}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
      </View>

      {/* Suksessmelding */}
      {successMsg ? (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#15803D" />
          <Text style={styles.successText}>{successMsg}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* ── JOBBINFO ─────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>JOBBINFORMASJON</Text>
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <Text style={[styles.customerName, { color: C.textPrimary }]}>{job.customerName}</Text>
          {job.address ? (
            <TouchableOpacity style={styles.infoRow} onPress={openMaps}>
              <Ionicons name="location-outline" size={15} color="#000000" />
              <Text style={styles.infoLink} numberOfLines={2}>{job.address}</Text>
            </TouchableOpacity>
          ) : null}
          {job.description ? (
            <View style={styles.infoRow}>
              <Ionicons name="document-text-outline" size={15} color={C.textSecondary} />
              <Text style={[styles.infoText, { color: C.textPrimary }]}>{job.description}</Text>
            </View>
          ) : null}
        </View>

        {/* ── NOTATER ──────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>NOTATER</Text>

        {isCompleted ? (
          <View style={[styles.lockedBanner, { backgroundColor: C.cardBg, borderColor: C.border }]}>
            <Ionicons name="lock-closed-outline" size={13} color="#616A76" />
            <Text style={[styles.lockedText, { color: C.textSecondary }]}>Jobben er fullført — notater kan ikke endres</Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border, gap: 10 }]}>
            <View style={styles.noteTextareaWrap}>
              <TextInput
                style={[styles.noteTextarea, {
                  backgroundColor: C.cardAlt, color: C.textPrimary,
                  borderColor: noteText.length > 0 ? '#000000' : C.border,
                }]}
                value={noteText}
                onChangeText={(t) => { if (t.length <= 500) setNoteText(t); }}
                placeholder="Legg til et notat..."
                placeholderTextColor={C.textTertiary}
                multiline
                textAlignVertical="top"
              />
              <Text style={[styles.noteCounter, { color: C.textTertiary }]}>{noteText.length}/500</Text>
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
            {noteError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{noteError}</Text>
              </View>
            ) : null}
          </View>
        )}

        {notes.length === 0 ? (
          <Text style={[styles.emptyNotes, { color: C.textTertiary }]}>Ingen notater ennå</Text>
        ) : (
          notes.map((note: JobNote) => (
            <View key={note.id} style={[styles.noteItem, { backgroundColor: C.cardBg, borderColor: C.border }]}>
              <View style={styles.noteItemHeader}>
                <Text style={[styles.noteAuthor, { color: C.textPrimary }]}>{note.authorName}</Text>
                <View style={styles.noteDateRow}>
                  <Ionicons name="lock-closed-outline" size={11} color="#616A76" />
                  <Text style={[styles.noteDateText, { color: C.textTertiary }]}>{formatNoteDate(note.createdAt)}</Text>
                </View>
              </View>
              <Text style={[styles.noteBody, { color: C.textPrimary }]}>{note.content}</Text>
            </View>
          ))
        )}

        {/* ── BILDER ───────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>BILDER FRA JOBBEN</Text>
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          {isCompleted ? (
            <View style={styles.lockedHint}>
              <Ionicons name="lock-closed-outline" size={12} color="#616A76" />
              <Text style={[styles.lockedText, { color: C.textSecondary }]}>Jobben er fullført — bilder kan ikke lastes opp</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadBtn} onPress={() => setShowUploadModal(true)}>
              <Ionicons name="cloud-upload-outline" size={18} color="#000000" />
              <Text style={styles.uploadBtnText}>Last opp bilder</Text>
            </TouchableOpacity>
          )}
          {images.length === 0 ? (
            <View style={styles.noImages}>
              <Ionicons name="images-outline" size={32} color="#D4D4D4" />
              <Text style={[styles.noImagesText, { color: C.textTertiary }]}>Ingen bilder ennå</Text>
            </View>
          ) : (
            <View style={styles.imageGrid}>
              {images.map((img) => {
                const lc = img.label ? LABEL_CFG[img.label] : null;
                return (
                  <TouchableOpacity
                    key={img.id}
                    style={{ width: thumbSize, height: thumbSize, borderRadius: 10, overflow: 'hidden', position: 'relative' }}
                    onPress={() => setViewingImage(img)}
                  >
                    <Image source={{ uri: img.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    {lc && (
                      <View style={{ position: 'absolute', top: 4, left: 4, backgroundColor: lc.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: lc.color }}>{lc.label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ── HANDLINGER ───────────────────────────────────── */}
        {job.status === 'new' && (
          <>
            <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>HANDLINGER</Text>
            <TouchableOpacity style={styles.startBtn} onPress={handleStartJob}>
              <Text style={styles.startBtnText}>Start jobb</Text>
            </TouchableOpacity>
          </>
        )}

        {job.status === 'in_progress' && (
          <>
            <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>HANDLINGER</Text>
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                style={[styles.navBtn, { backgroundColor: C.cardBg, borderColor: C.border }]}
                onPress={openMaps}
              >
                <Ionicons name="navigate-outline" size={18} color={C.textPrimary} />
                <Text style={[styles.navBtnText, { color: C.textPrimary }]}>Naviger til jobb</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={() => { setDoneError(''); setShowDoneModal(true); }}
              >
                <Text style={styles.doneBtnText}>Marker som ferdig</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

      </ScrollView>

      {/* ── FULLFØR JOBB MODAL ───────────────────────────── */}
      <Modal visible={showDoneModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={[styles.sheet, { backgroundColor: C.cardBg }]}>
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: C.textPrimary }]}>Fullfør jobb</Text>
                <TouchableOpacity onPress={() => setShowDoneModal(false)}>
                  <Ionicons name="close" size={22} color={C.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.sheetSub, { color: C.textSecondary }]}>{job.customerName}</Text>

              <View style={styles.formRow}>
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>ARBEIDSTIMER</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: C.cardAlt, color: C.textPrimary, borderColor: C.border }]}
                    value={hours}
                    onChangeText={(t) => { setHours(t); setDoneError(''); }}
                    keyboardType="decimal-pad"
                    placeholder="1.5"
                    placeholderTextColor={C.textTertiary}
                  />
                </View>
                <View style={[styles.formField, { marginLeft: 12 }]}>
                  <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>MATERIELL (NOK)</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: C.cardAlt, color: C.textPrimary, borderColor: C.border }]}
                    value={materials}
                    onChangeText={(t) => { setMaterials(t); setDoneError(''); }}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={C.textTertiary}
                  />
                </View>
              </View>

              {doneError ? (
                <View style={styles.errorBox}><Text style={styles.errorText}>{doneError}</Text></View>
              ) : null}

              <View style={[styles.infoBox, { backgroundColor: C.cardAlt }]}>
                <Ionicons name="document-text-outline" size={15} color="#000000" />
                <Text style={styles.modalInfoText}>Faktura genereres automatisk og sendes til kunden</Text>
              </View>

              <TouchableOpacity
                style={[styles.confirmBtn, completing && { opacity: 0.6 }]}
                onPress={handleMarkDone}
                disabled={completing}
              >
                {completing
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.confirmBtnText}>Bekreft ferdig</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Fullscreen image viewer */}
      {viewingImage && (
        <Modal visible animationType="fade" onRequestClose={() => setViewingImage(null)}>
          <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={{ position: 'absolute', top: 52, right: 20, zIndex: 10 }} onPress={() => setViewingImage(null)}>
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <Image source={{ uri: viewingImage.imageUrl }} style={{ width: '100%', height: '70%' }} resizeMode="contain" />
          </View>
        </Modal>
      )}

      <ImageUploadModal visible={showUploadModal} jobId={job.id} onClose={() => setShowUploadModal(false)} />
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  backBtn: {},
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', padding: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#86efac' },
  successText: { fontSize: 14, color: '#15803D', fontWeight: '600', flex: 1 },
  content: { padding: 20, gap: 0, paddingBottom: 48 },
  sectionLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 8 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 12 },
  customerName: { fontSize: 20, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoLink: { fontSize: 14, color: '#000000', textDecorationLine: 'underline', flex: 1, lineHeight: 20 },
  infoText: { fontSize: 14, flex: 1, lineHeight: 20 },
  // Notes
  noteTextareaWrap: { position: 'relative' },
  noteTextarea: { height: 80, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 24, fontSize: 14, textAlignVertical: 'top' },
  noteCounter: { position: 'absolute', bottom: 7, right: 10, fontSize: 11, color: '#878E97' },
  noteAddBtn: { alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, backgroundColor: '#000000' },
  noteAddBtnDisabled: { backgroundColor: '#D4D4D4' },
  noteAddBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  lockedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, padding: 12, paddingHorizontal: 14 },
  lockedHint: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lockedText: { fontSize: 13, color: '#616A76', fontStyle: 'italic', flex: 1 },
  emptyNotes: { fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  noteItem: { borderRadius: 10, padding: 14, paddingHorizontal: 16, borderWidth: 1, marginTop: 0 },
  noteItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  noteAuthor: { fontSize: 13, fontWeight: '600' },
  noteDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  noteDateText: { fontSize: 12, color: '#616A76' },
  noteBody: { fontSize: 14, lineHeight: 22 },
  // Images
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: '#000000', borderStyle: 'dashed', borderRadius: 10, paddingVertical: 14, backgroundColor: '#ECECEC' },
  uploadBtnText: { fontSize: 14, color: '#000000', fontWeight: '600' },
  noImages: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  noImagesText: { fontSize: 14 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lockHint: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lockHintText: { fontSize: 12, fontStyle: 'italic' },
  // Actions
  startBtn: { height: 52, borderRadius: 10, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  startBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  navBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 10, borderWidth: 1.5 },
  navBtnText: { fontSize: 14, fontWeight: '600' },
  doneBtn: { height: 52, borderRadius: 10, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 14 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '600' },
  sheetSub: { fontSize: 14, marginTop: -6 },
  formRow: { flexDirection: 'row' },
  formField: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  fieldInput: { height: 52, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 16 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, color: '#DC2626' },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12 },
  modalInfoText: { fontSize: 13, color: '#000000', flex: 1 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, backgroundColor: '#000000', borderRadius: 10 },
  confirmBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
