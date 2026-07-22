import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function StatBox({ label, value, color = '#000000' }: { label: string; value: string; color?: string }) {
  const { colors: C } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.border, borderLeftColor: color }]}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={[styles.label, { color: C.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: 12, borderWidth: 1, borderLeftWidth: 4, padding: 16 },
  value: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  label: { fontSize: 12, marginTop: 4, fontWeight: '500' },
});
