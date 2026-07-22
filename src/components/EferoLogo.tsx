import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

// Samme logobilder som efero-web (public/images) — sikrer identisk logo i app og nettside.
const ICON = require('../../assets/logo-icon.png'); // 53×48
const TEXT = require('../../assets/logo-text.png'); // 140×44 — navy wordmark (for lys bakgrunn)
const TEXT_WHITE = require('../../assets/logo-text-white.png'); // hvit wordmark (for mørk bakgrunn)
const ICON_RATIO = 53 / 48;
const TEXT_RATIO = 140 / 44;

// Relativ luminans (0–255) fra en hex-farge. Brukes til å velge FORHÅNDSFARGET
// wordmark-asset, slik at logoen er synlig selv om RN Webs tintColor-filter ikke
// slår gjennom (navy PNG ble usynlig på mørk topplinje i mørk modus).
function isLightColor(color: string): boolean {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return false; // ukjent format → anta mørk tekst (navy asset)
  let hex = m[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 140;
}

interface EferoLogoProps {
  /** Color of the "Efero" wordmark. Default: navy #000000 */
  textColor?: string;
  /** Color of the 3-line E icon. Default: Electric Blue #000000 */
  lineColor?: string;
  /** Visual height-scale of the logo. Default: 20 */
  size?: number;
}

export function EferoLogo({
  textColor = '#000000',
  lineColor = '#000000',
  size = 20,
}: EferoLogoProps) {
  const h = Math.round(size * 1.05); // felles bildehøyde
  const gap = Math.round(size * 0.42);
  // Velg forhåndsfarget wordmark som matcher ønsket tekstfarge (lys/mørk) — sikrer
  // synlighet uavhengig av tintColor-støtte. tintColor beholdes som forfining.
  const textSource = isLightColor(textColor) ? TEXT_WHITE : TEXT;

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
        source={textSource}
        resizeMode="contain"
        style={{ height: h, width: Math.round(h * TEXT_RATIO), tintColor: textColor }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
