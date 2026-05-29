import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Modal, ActivityIndicator, useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../../store/appStore';
import { JobImage } from '../../types';
import { formatDate, formatCurrency } from '../../utils/formatters';

const STATUS_CFG = {
  sent: { label: 'Sendt', color: '#2563FF', bg: '#EEF4FF' },
  paid: { label: 'Betalt', color: '#15803D', bg: '#F0FDF4' },
  overdue: { label: 'Forfalt', color: '#DC2626', bg: '#FEF2F2' },
};

const LABEL_CFG = {
  'før': { label: 'Før', color: '#C2410C', bg: '#FFF7ED' },
  'etter': { label: 'Etter', color: '#15803D', bg: '#F0FDF4' },
};

// ─── Image thumbnail ──────────────────────────────────────────────────────────

function ImageThumbnail({ image, size, onPress, onLabelPress, onDelete }: {
  image: JobImage;
  size: number;
  onPress: () => void;
  onLabelPress: () => void;
  onDelete: () => void;
}) {
  const labelCfg = image.label ? LABEL_CFG[image.label] : null;

  return (
    <View style={[thumb.container, { width: size, height: size }]}>
      <TouchableOpacity style={thumb.imageWrap} onPress={onPress} activeOpacity={0.85}>
        <Image source={{ uri: image.imageUrl }} style={thumb.image} resizeMode="cover" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[thumb.labelBadge, labelCfg ? { backgroundColor: labelCfg.bg } : thumb.labelEmpty]}
        onPress={onLabelPress}
      >
        <Text style={[thumb.labelText, { color: labelCfg ? labelCfg.color : '#FFFFFF' }]}>
          {labelCfg ? labelCfg.label : 'Merk'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={thumb.deleteBtn} onPress={onDelete}>
        <Ionicons name="close-circle" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const thumb = StyleSheet.create({
  container: { position: 'relative', borderRadius: 10, overflow: 'hidden', backgroundColor: '#F1F5F9' },
  imageWrap: { width: '100%', height: '100%' },
  image: { width: '100%', height: '100%' },
  labelBadge: { position: 'absolute', bottom: 6, left: 6, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  labelEmpty: { backgroundColor: 'rgba(0,0,0,0.45)' },
  labelText: { fontSize: 10, fontWeight: '700' },
  deleteBtn: { position: 'absolute', top: 4, right: 4 },
});

// ─── Label picker modal ───────────────────────────────────────────────────────

function LabelPickerModal({ visible, onSelect, onClose }: {
  visible: boolean;
  onSelect: (label: 'før' | 'etter' | null) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={labelModal.overlay} activeOpacity={1} onPress={onClose}>
        <View style={labelModal.box}>
          <Text style={labelModal.title}>Merk bilde</Text>
          {([null, 'før', 'etter'] as const).map((l) => (
            <TouchableOpacity
              key={String(l)}
              style={labelModal.item}
              onPress={() => { onSelect(l); onClose(); }}
            >
              <View style={[labelModal.dot, { backgroundColor: l ? LABEL_CFG[l].color : '#94A3B8' }]} />
              <Text style={labelModal.itemText}>{l ? LABEL_CFG[l].label : 'Ingen merking'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const labelModal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  box: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: 260 },
  title: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 14 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  itemText: { fontSize: 14, color: '#1F2937' },
});

// ─── Fullscreen viewer ────────────────────────────────────────────────────────

function FullscreenViewer({ image, onClose }: { image: JobImage | null; onClose: () => void }) {
  if (!image) return null;
  const labelCfg = image.label ? LABEL_CFG[image.label] : null;
  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={viewer.container}>
        <TouchableOpacity style={viewer.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        {labelCfg && (
          <View style={[viewer.label, { backgroundColor: labelCfg.bg }]}>
            <Text style={[viewer.labelText, { color: labelCfg.color }]}>{labelCfg.label}</Text>
          </View>
        )}
        <Image source={{ uri: image.imageUrl }} style={viewer.image} resizeMode="contain" />
      </View>
    </Modal>
  );
}

const viewer = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 52, right: 20, zIndex: 10 },
  label: { position: 'absolute', top: 52, left: 20, zIndex: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  labelText: { fontSize: 13, fontWeight: '700' },
  image: { width: '100%', height: '80%' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export function ArchiveDetailScreen({ route, navigation }: any) {
  const { jobId } = route.params as { jobId: string };
  const { width } = useWindowDimensions();

  const job = useAppStore((s) => s.jobs.find((j) => j.id === jobId));
  const invoice = useAppStore((s) => s.invoices.find((inv) => inv.jobId === jobId));
  const images = useAppStore((s) => s.jobImages[jobId] ?? []);
  const loadJobImages = useAppStore((s) => s.loadJobImages);
  const uploadJobImage = useAppStore((s) => s.uploadJobImage);
  const updateImageLabel = useAppStore((s) => s.updateImageLabel);
  const deleteJobImage = useAppStore((s) => s.deleteJobImage);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [viewingImage, setViewingImage] = useState<JobImage | null>(null);
  const [labelingImage, setLabelingImage] = useState<JobImage | null>(null);

  useEffect(() => { loadJobImages(jobId); }, [jobId]);

  if (!job) return null;

  const invoiceCfg = invoice ? STATUS_CFG[invoice.status as keyof typeof STATUS_CFG] : null;

  const handlePickImages = async () => {
    setUploadError('');

    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setUploadError('Trenger tilgang til bildebiblioteket');
        return;
      }
    }

    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.85,
        selectionLimit: 10,
      });
    } catch {
      setUploadError('Kunne ikke åpne bildebibliotek');
      return;
    }

    if (result.canceled || result.assets.length === 0) return;

    setUploading(true);
    let lastError = '';

    for (const asset of result.assets) {
      try {
        // Use mimeType from picker if available; don't guess from URI (blob: URLs don't contain type info)
        const mime = asset.mimeType || 'image/jpeg';
        await uploadJobImage(jobId, asset.uri, mime);
      } catch (e: any) {
        lastError = e.message ?? 'Opplasting feilet, prøv igjen';
      }
    }

    setUploading(false);
    if (lastError) setUploadError(lastError);
  };

  const thumbSize = Math.floor((Math.min(width, 800) - 48 - 16) / 3);

  const infoRows = [
    { icon: 'location-outline', label: 'Adresse', value: job.address },
    { icon: 'call-outline', label: 'Telefon', value: job.customerPhone },
    { icon: 'person-outline', label: 'Tekniker', value: job.assignedTechnicianName ?? 'Ikke tildelt' },
    { icon: 'calendar-outline', label: 'Opprettet', value: formatDate(job.createdAt) },
    { icon: 'checkmark-circle-outline', label: 'Fullført', value: formatDate(job.updatedAt) },
    { icon: 'document-text-outline', label: 'Beskrivelse', value: job.description },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{job.customerName}</Text>
        <View style={styles.archivedBadge}>
          <Ionicons name="archive-outline" size={12} color="#64748B" />
          <Text style={styles.archivedText}>Arkivert</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Job info */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>JOBBINFORMASJON</Text>
          <Text style={styles.customerName}>{job.customerName}</Text>
          {infoRows.map(({ icon, label, value }) =>
            value ? (
              <View key={label} style={styles.infoRow}>
                <Ionicons name={icon as any} size={14} color="#64748B" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>{label}</Text>
                  <Text style={styles.infoValue}>{value}</Text>
                </View>
              </View>
            ) : null
          )}
        </View>

        {/* Invoice */}
        {invoice && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>FAKTURA</Text>
            <View style={styles.invoiceRow}>
              <View style={{ gap: 4 }}>
                <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                <Text style={styles.invoiceDate}>Forfall: {invoice.dueDate?.slice(0, 10) ?? '—'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={styles.invoiceAmount}>{formatCurrency(invoice.total)}</Text>
                {invoiceCfg && (
                  <View style={[styles.invBadge, { backgroundColor: invoiceCfg.bg }]}>
                    <Text style={[styles.invBadgeText, { color: invoiceCfg.color }]}>{invoiceCfg.label}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Images */}
        <View style={styles.card}>
          <View style={styles.imagesHeader}>
            <Text style={styles.cardLabel}>BILDER FRA JOBBEN</Text>
            <Text style={styles.imageCount}>{images.length} bilde{images.length !== 1 ? 'r' : ''}</Text>
          </View>

          {uploadError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
              <Text style={styles.errorText}>{uploadError}</Text>
              <TouchableOpacity onPress={() => setUploadError('')}>
                <Ionicons name="close" size={15} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.uploadBtn, uploading && styles.uploadBtnLoading]}
            onPress={handlePickImages}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <ActivityIndicator size="small" color="#2563FF" />
                <Text style={styles.uploadBtnText}>Laster opp…</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#2563FF" />
                <Text style={styles.uploadBtnText}>Last opp bilder</Text>
              </>
            )}
          </TouchableOpacity>

          {images.length === 0 ? (
            <View style={styles.noImages}>
              <Ionicons name="images-outline" size={32} color="#CBD5E1" />
              <Text style={styles.noImagesText}>Ingen bilder ennå</Text>
            </View>
          ) : (
            <View style={styles.imageGrid}>
              {images.map((img) => (
                <ImageThumbnail
                  key={img.id}
                  image={img}
                  size={thumbSize}
                  onPress={() => setViewingImage(img)}
                  onLabelPress={() => setLabelingImage(img)}
                  onDelete={() => deleteJobImage(img.id, img.imageUrl)}
                />
              ))}
            </View>
          )}

          <Text style={styles.imageHint}>JPG · PNG · HEIC · WebP — maks 10MB per bilde</Text>
        </View>
      </ScrollView>

      <FullscreenViewer image={viewingImage} onClose={() => setViewingImage(null)} />

      <LabelPickerModal
        visible={!!labelingImage}
        onSelect={(label) => {
          if (labelingImage) updateImageLabel(labelingImage.id, label);
        }}
        onClose={() => setLabelingImage(null)}
      />
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
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: '#1F2937' },
  archivedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  archivedText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    gap: 12,
  },
  cardLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.6 },
  customerName: { fontSize: 20, fontWeight: '700', color: '#0A1B33', marginTop: -4 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValue: { fontSize: 14, color: '#1F2937', marginTop: 1 },
  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  invoiceNumber: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  invoiceDate: { fontSize: 13, color: '#64748B' },
  invoiceAmount: { fontSize: 20, fontWeight: '700', color: '#0A1B33' },
  invBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  invBadgeText: { fontSize: 12, fontWeight: '600' },
  imagesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  imageCount: { fontSize: 13, color: '#64748B' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
  },
  errorText: { fontSize: 13, color: '#DC2626', flex: 1, lineHeight: 18 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#2563FF',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 16,
    backgroundColor: '#EEF4FF',
  },
  uploadBtnLoading: { opacity: 0.6 },
  uploadBtnText: { fontSize: 14, color: '#2563FF', fontWeight: '600' },
  noImages: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  noImagesText: { fontSize: 14, color: '#94A3B8' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  imageHint: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },
});
