import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, Modal, useWindowDimensions,
} from 'react-native';
import { ThemedScreen } from '../../components/ThemedScreen';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { JobImage, JobNote } from '../../types';
import { formatDate } from '../../utils/formatters';

const LABEL_CFG = {
  'før': { label: 'Før', color: '#C2410C', bg: '#FFF7ED' },
  'etter': { label: 'Etter', color: '#15803D', bg: '#F0FDF4' },
};

function LockedImage({ image, thumbSize, onPress }: {
  image: JobImage; thumbSize: number; onPress: () => void;
}) {
  const lc = image.label ? LABEL_CFG[image.label as keyof typeof LABEL_CFG] : null;
  return (
    <View style={{ width: thumbSize, marginBottom: 4 }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <View style={{ height: thumbSize, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F1F5F9' }}>
          <Image source={{ uri: image.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          {lc && (
            <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: lc.bg, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: lc.color }}>{lc.label}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

function FullscreenViewer({ image, onClose }: { image: JobImage | null; onClose: () => void }) {
  if (!image) return null;
  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity style={{ position: 'absolute', top: 52, right: 20, zIndex: 10 }} onPress={onClose}>
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Image source={{ uri: image.imageUrl }} style={{ width: '100%', height: '70%' }} resizeMode="contain" />
      </View>
    </Modal>
  );
}

export function TechArchiveDetailScreen({ route, navigation }: any) {
  const { colors: C } = useTheme();
  const { jobId } = route.params as { jobId: string };
  const { width } = useWindowDimensions();

  const job = useAppStore((s) => s.jobs.find((j) => j.id === jobId));
  const images = useAppStore((s) => s.jobImages[jobId] ?? []);
  const notes = useAppStore((s) => s.jobNotes[jobId] ?? []);
  const loadJobImages = useAppStore((s) => s.loadJobImages);
  const loadJobNotes = useAppStore((s) => s.loadJobNotes);

  const [viewingImage, setViewingImage] = useState<JobImage | null>(null);

  useEffect(() => {
    loadJobImages(jobId);
    loadJobNotes(jobId);
  }, [jobId]);

  if (!job) return null;

  const thumbSize = Math.floor((Math.min(width, 800) - 48 - 16) / 3);

  const infoRows = [
    { icon: 'location-outline', label: 'Adresse', value: job.address },
    { icon: 'document-text-outline', label: 'Beskrivelse', value: job.description },
    { icon: 'calendar-outline', label: 'Fullført', value: formatDate(job.updatedAt) },
  ];

  return (
    <ThemedScreen>
      <View style={[styles.header, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]} numberOfLines={1}>
          {job.customerName}
        </Text>
        <View style={[styles.doneBadge, { backgroundColor: '#F0FDF4', borderColor: '#86efac' }]}>
          <Ionicons name="checkmark-circle" size={12} color="#15803D" />
          <Text style={styles.doneBadgeText}>Fullført</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Jobbinformasjon */}
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <Text style={[styles.cardLabel, { color: C.textSecondary }]}>JOBBINFORMASJON</Text>
          <Text style={[styles.customerName, { color: C.textPrimary }]}>{job.customerName}</Text>
          {infoRows.map(({ icon, label, value }) =>
            value ? (
              <View key={label} style={styles.infoRow}>
                <Ionicons name={icon as any} size={14} color={C.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: C.textTertiary }]}>{label}</Text>
                  <Text style={[styles.infoValue, { color: C.textPrimary }]}>{value}</Text>
                </View>
              </View>
            ) : null
          )}
        </View>

        {/* Notater — read only */}
        <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <Text style={[styles.cardLabel, { color: C.textSecondary }]}>NOTATER</Text>
          <View style={styles.archivedBanner}>
            <Ionicons name="lock-closed-outline" size={13} color="#64748B" />
            <Text style={styles.archivedBannerText}>Arkivert jobb — notater kan ikke endres</Text>
          </View>
          {notes.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.textTertiary }]}>Ingen notater på denne jobben</Text>
          ) : (
            notes.map((note: JobNote) => {
              const d = new Date(note.createdAt);
              const dateStr = d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
                + ' kl. ' + d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
              return (
                <View key={note.id} style={[styles.noteItem, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
                  <View style={styles.noteHeader}>
                    <Text style={[styles.noteAuthor, { color: C.textPrimary }]}>{note.authorName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="lock-closed-outline" size={11} color="#64748B" />
                      <Text style={styles.noteDate}>{dateStr}</Text>
                    </View>
                  </View>
                  <Text style={[styles.noteBody, { color: C.textPrimary }]}>{note.content}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* Bilder — view only */}
        {images.length > 0 && (
          <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.cardLabel, { color: C.textSecondary }]}>BILDER FRA JOBBEN</Text>
              <Text style={[styles.imageCount, { color: C.textTertiary }]}>
                {images.length} bilde{images.length !== 1 ? 'r' : ''}
              </Text>
            </View>
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
          </View>
        )}

      </ScrollView>

      <FullscreenViewer image={viewingImage} onClose={() => setViewingImage(null)} />
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600' },
  doneBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1,
  },
  doneBadgeText: { fontSize: 12, fontWeight: '500', color: '#15803D' },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  card: { borderRadius: 12, borderWidth: 1, padding: 20, gap: 12 },
  cardLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  customerName: { fontSize: 20, fontWeight: '700', marginTop: -4 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValue: { fontSize: 14, marginTop: 1, lineHeight: 20 },
  archivedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F5F7FA', borderRadius: 8, padding: 10,
  },
  archivedBannerText: { fontSize: 13, color: '#64748B', fontStyle: 'italic', flex: 1 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 4 },
  noteItem: { borderRadius: 10, padding: 14, paddingHorizontal: 16, borderWidth: 1 },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  noteAuthor: { fontSize: 13, fontWeight: '600' },
  noteDate: { fontSize: 12, color: '#64748B' },
  noteBody: { fontSize: 14, lineHeight: 22 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  imageCount: { fontSize: 13 },
});
