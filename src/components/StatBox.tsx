import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatBoxProps {
  label: string;
  value: string;
  color?: string;
}

export function StatBox({ label, value, color = '#2563FF' }: StatBoxProps) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    padding: 16,
  },
  value: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  label: { fontSize: 12, color: '#64748B', marginTop: 4, fontWeight: '500' },
});
