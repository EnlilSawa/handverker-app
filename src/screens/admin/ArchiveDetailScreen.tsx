import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Modal, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { JobImage } from '../../types';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { ImageUploadModal } from '../../components/ImageUploadModal';

const STATUS_CFG = {
  sent: { label: 'Sendt', color: '#2563FF', bg: '#EEF4FF' },
  paid: { label: 'Betalt', color: '#15803D', bg: '#F0FDF4' },
  overdue: { label: 'Forfalt', color: '#DC2626', bg: '#FEF2F2' },
};

const LABEL_CFG = {
  'før': { label: 'Før', color: '#C2410C', bg: '#FFF7ED' },
  'etter': { label: 'Etter', color: '#15803D', bg: '#F0FDF4' },
};

// ─── Locked image cell ────────────────────────────────────────────────────────

function LockedImage({ image, thumbSize, onPress }: {
  image: JobImage; thumbSize: number; onPress: () => void;
}) {
  const lc = image.label ? LABEL_CFG[image.label] : null;
  const dateStr = image.uploadedAt
    ? new Date(image.uploadedAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
    : '';

  return (
    <View style={[cell.wrap, { width: thumbSize }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <View style={[cell.imgWrap, { height: thumbSize }]}>
          <Image source={{ uri: image.imageUrl }} style={cell.img} resizeMode="cover" />
          {lc && (
            <View style={[cell.badge, { backgroundColor: lc.bg }]}>
              <Text style={[cell.badgeText, { color: lc.color }]}>{lc.label}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Note */}
      {image.note ? (
        <View style={cell.noteRow}>
          <Ionicons name="lock-closed-outline" size={11} color="#94A3B8" />
          <Text style={cell.note} numberOfLines={2}>{image.note}</Text>
        </View>
      ) : null}

      {/* Uploader + date */}
      <Text style={cell.meta} numberOfLines={1}>
        {[image.uploadedBy, dateStr].filter(Boolean).join(' · ')}
      </Text>
    </View>
  );
}

const cell = StyleSheet.create({
  wrap: { marginBottom: 4 },
  imgWrap: { borderRadius: 10, overflow: 'hidden', backgroundColor: '#F1F5F9', position: 'relative' },
  img: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute', top: 6, left: 6,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 5 },
  note: { fontSize: 12, color: '#64748B', fontStyle: 'italic', flex: 1, lineHeight: 16 },
  meta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
});

// ─── Fullscreen viewer ────────────────────────────────────────────────────────

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
  noteBar: {
    position: 'absolute', bottom: 48, left: 20, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  noteText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', flex: 1 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export function ArchiveDetailScreen({ route, navigation }: any) {
  const { jobId } = route.params as { jobId: string };
  const { width } = useWindowDimensions();

  const job = useAppStore((s) => s.jobs.find((j) => j.id === jobId));
  const invoice = useAppStore((s) => s.invoices.find((inv) => inv.jobId === jobId));
  const images = useAppStore((s) => s.jobImages[jobId] ?? []);
  const loadJobImages = useAppStore((s) => s.loadJobImages);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewingImage, setViewingImage] = useState<JobImage | null>(null);

  useEffect(() => { loadJobImages(jobId); }, [jobId]);

  if (!job) return null;

  const invoiceCfg = invoice ? STATUS_CFG[invoice.status as keyof typeof STATUS_CFG] : null;
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

      <ImageUploadModal
        visible={showUploadModal}
        jobId={jobId}
        onClose={() => setShowUploadModal(false)}
      />

      <FullscreenViewer image={viewingImage} onClose={() => setViewingImage(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: '#1F2937' },
  archivedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  archivedText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0', padding: 20, gap: 12,
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
