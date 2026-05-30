import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, TextInput, Image, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../store/appStore';

interface PendingImage {
  key: string;
  uri: string;
  mimeType: string;
  label: 'før' | 'etter' | null;
  note: string;
}

interface Props {
  visible: boolean;
  jobId: string;
  onClose: () => void;
}

const NOTE_LIMIT = 300;

const LABEL_OPTIONS: { value: 'før' | 'etter' | null; label: string }[] = [
  { value: null, label: 'Ingen' },
  { value: 'før', label: 'Før' },
  { value: 'etter', label: 'Etter' },
];

export function ImageUploadModal({ visible, jobId, onClose }: Props) {
  const uploadJobImage = useAppStore((s) => s.uploadJobImage);

  const [pending, setPending] = useState<PendingImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setPending([]);
      setError('');
      setUploading(false);
    }
  }, [visible]);

  const openPicker = async () => {
    setError('');

    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Trenger tilgang til bildebiblioteket');
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
      setError('Kunne ikke åpne bildebibliotek');
      return;
    }

    if (result.canceled || result.assets.length === 0) return;

    const newImages: PendingImage[] = result.assets.map((asset) => ({
      key: `${Date.now()}-${Math.random()}`,
      uri: asset.uri,
      mimeType: asset.mimeType || 'image/jpeg',
      label: null,
      note: '',
    }));
    setPending((prev) => [...prev, ...newImages]);
  };

  const updatePending = (key: string, updates: Partial<PendingImage>) => {
    setPending((prev) => prev.map((p) => p.key === key ? { ...p, ...updates } : p));
  };

  const handleUpload = async () => {
    if (pending.length === 0) return;
    setUploading(true);
    setError('');
    let lastError = '';

    for (const img of pending) {
      try {
        await uploadJobImage(jobId, img.uri, img.mimeType, img.label ?? undefined, img.note);
      } catch (e: any) {
        lastError = e.message ?? 'Opplasting feilet';
      }
    }

    setUploading(false);
    if (lastError) {
      setError(lastError);
    } else {
      onClose();
    }
  };

  const uploadLabel = uploading
    ? 'Laster opp…'
    : `Last opp ${pending.length} bilde${pending.length !== 1 ? 'r' : ''}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Last opp bilder</Text>
            <TouchableOpacity onPress={onClose} disabled={uploading}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Empty state — pick button */}
            {pending.length === 0 && (
              <TouchableOpacity style={styles.pickZone} onPress={openPicker}>
                <View style={styles.pickIcon}>
                  <Ionicons name="images-outline" size={32} color="#2563FF" />
                </View>
                <Text style={styles.pickTitle}>Velg bilder fra enheten</Text>
                <Text style={styles.pickSub}>Trykk for å åpne bildebiblioteket</Text>
              </TouchableOpacity>
            )}

            {/* Pending image rows */}
            {pending.map((img) => (
              <View key={img.key} style={styles.row}>
                <Image
                  source={{ uri: img.uri }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />

                <View style={styles.controls}>
                  {/* Label segmented control */}
                  <View style={styles.labelRow}>
                    {LABEL_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={String(opt.value)}
                        style={[
                          styles.labelBtn,
                          img.label === opt.value && styles.labelBtnActive,
                        ]}
                        onPress={() => updatePending(img.key, { label: opt.value })}
                      >
                        <Text style={[
                          styles.labelBtnText,
                          img.label === opt.value && styles.labelBtnTextActive,
                        ]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Note input */}
                  <View style={styles.noteWrap}>
                    <TextInput
                      style={styles.noteInput}
                      value={img.note}
                      onChangeText={(t) => {
                        if (t.length <= NOTE_LIMIT) updatePending(img.key, { note: t });
                      }}
                      placeholder="Notat til dette bildet…"
                      placeholderTextColor="#94A3B8"
                      multiline
                      maxLength={NOTE_LIMIT}
                    />
                    <Text style={styles.counter}>{img.note.length}/{NOTE_LIMIT}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Footer */}
          <View style={styles.footer}>
            {pending.length > 0 && (
              <TouchableOpacity
                style={styles.addMoreBtn}
                onPress={openPicker}
                disabled={uploading}
              >
                <Ionicons name="add" size={16} color="#2563FF" />
                <Text style={styles.addMoreText}>Legg til flere bilder</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.uploadBtn,
                (pending.length === 0 || uploading) && styles.uploadBtnDisabled,
              ]}
              onPress={handleUpload}
              disabled={pending.length === 0 || uploading}
            >
              {uploading
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
              }
              <Text style={styles.uploadBtnText}>{uploadLabel}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,27,51,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: { fontSize: 17, fontWeight: '600', color: '#0A1B33' },

  body: { maxHeight: 440 },
  bodyContent: { padding: 16, gap: 12 },

  // Empty state
  pickZone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    borderWidth: 1.5,
    borderColor: '#2563FF',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#EEF4FF',
    gap: 8,
  },
  pickIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  pickTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  pickSub: { fontSize: 13, color: '#64748B' },

  // Image row
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    flexShrink: 0,
  },
  controls: { flex: 1, gap: 8 },

  labelRow: { flexDirection: 'row', gap: 6 },
  labelBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  labelBtnActive: { backgroundColor: '#2563FF', borderColor: '#2563FF' },
  labelBtnText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  labelBtnTextActive: { color: '#FFFFFF' },

  noteWrap: { position: 'relative' },
  noteInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 22,
    fontSize: 13,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    minHeight: 64,
    textAlignVertical: 'top',
  },
  counter: {
    position: 'absolute',
    bottom: 6,
    right: 10,
    fontSize: 11,
    color: '#94A3B8',
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 10,
  },
  errorText: { fontSize: 13, color: '#DC2626', flex: 1 },

  footer: {
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2563FF',
    backgroundColor: '#EEF4FF',
  },
  addMoreText: { fontSize: 14, color: '#2563FF', fontWeight: '600' },

  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#2563FF',
  },
  uploadBtnDisabled: { backgroundColor: '#CBD5E1' },
  uploadBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
