import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

// Samme logobilder som efero-web (public/images) — sikrer identisk logo i app og nettside.
const ICON = require('../../assets/logo-icon.png'); // 53×48
const TEXT = require('../../assets/logo-text.png'); // 140×44
const ICON_RATIO = 53 / 48;
const TEXT_RATIO = 140 / 44;

interface EferoLogoProps {
  /** Color of the "Efero" wordmark. Default: navy #0A1B33 */
  textColor?: string;
  /** Color of the 3-line E icon. Default: Electric Blue #2563FF */
  lineColor?: string;
  /** Visual height-scale of the logo. Default: 20 */
  size?: number;
}

export function EferoLogo({
  textColor = '#0A1B33',
  lineColor = '#2563FF',
  size = 20,
}: EferoLogoProps) {
  const h = Math.round(size * 1.05); // felles bildehøyde
  const gap = Math.round(size * 0.42);

  return (
    <View
      style={[styles.row, { gap }]}
      accessibilityRole="image"
      accessibilityLabel="Efero logo"
    >
      <Image
        source={ICON}
        resizeMode="contain"
        style={{ height: h, width: Math.round(h * ICON_RATIO), tintColor: lineColor }}
      />
      <Image
        source={TEXT}
        resizeMode="contain"
        style={{ height: h, width: Math.round(h * TEXT_RATIO), tintColor: textColor }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
