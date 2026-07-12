import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';

// Global, brukersynlig feil-/beskjedbanner. Leser `toast` fra store og vises som
// et flytende banner øverst. Erstatter stille query-feil (som før bare gjorde
// `if (error) return`). Auto-lukkes etter noen sekunder, kan også lukkes manuelt.
const COLORS = {
  error: { bg: '#FEF2F2', border: '#FCA5A5', text: '#991B1B', icon: '#DC2626', name: 'alert-circle' as const },
  info: { bg: '#EEF4FF', border: '#BFD3FF', text: '#1E3A8A', icon: '#2563FF', name: 'information-circle' as const },
};

export function Toast() {
  const toast = useAppStore((s) => s.toast);
  const hideToast = useAppStore((s) => s.hideToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(hideToast, toast.type === 'error' ? 6000 : 4000);
    return () => clearTimeout(t);
  }, [toast, hideToast]);

  if (!toast) return null;
  const c = COLORS[toast.type];

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={[styles.banner, { backgroundColor: c.bg, borderColor: c.border }]}>
        <Ionicons name={c.name} size={18} color={c.icon} style={{ marginTop: 1 }} />
        <Text style={[styles.text, { color: c.text }]} numberOfLines={4}>{toast.message}</Text>
        <TouchableOpacity onPress={hideToast} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={18} color={c.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 48,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    maxWidth: 520,
    width: '92%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  text: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '500' },
});
