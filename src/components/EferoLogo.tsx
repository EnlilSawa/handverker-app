import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface EferoLogoProps {
  /** Color of the "Efero" wordmark. Default: navy #0A1B33 */
  textColor?: string;
  /** Color of the 3-line E icon. Default: #2563FF */
  lineColor?: string;
  /** Font size of "Efero". Determines icon scale. Default: 20 */
  size?: number;
}

export function EferoLogo({
  textColor = '#0A1B33',
  lineColor = '#2563FF',
  size = 20,
}: EferoLogoProps) {
  const lh = Math.max(3, Math.round(size * 0.18));   // line height
  const lw = Math.round(size * 1.0);                 // full line width
  const mw = Math.round(lw * 0.62);                  // mid line (shorter)
  const iconH = lh * 3 + 4 * 2;                      // total icon height

  return (
    <View style={styles.row}>
      <View style={[styles.icon, { width: lw, height: iconH, justifyContent: 'space-between' }]}>
        <View style={{ width: lw, height: lh, borderRadius: lh / 2, backgroundColor: lineColor }} />
        <View style={{ width: mw, height: lh, borderRadius: lh / 2, backgroundColor: lineColor }} />
        <View style={{ width: lw, height: lh, borderRadius: lh / 2, backgroundColor: lineColor }} />
      </View>
      <Text style={[styles.wordmark, { color: textColor, fontSize: size }]}>Efero</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: {},
  wordmark: { fontWeight: '600', letterSpacing: -0.3 },
});
