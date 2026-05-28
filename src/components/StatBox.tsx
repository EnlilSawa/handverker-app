import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface StatBoxProps {
  label: string;
  value: string;
  color?: string;
}

export function StatBox({ label, value, color = colors.primary }: StatBoxProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  value: { fontSize: 22, fontWeight: '700' },
  label: { fontSize: 11, color: colors.textGray, marginTop: 3, textAlign: 'center' },
});
