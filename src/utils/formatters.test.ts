import { formatCurrency, formatInvoiceAmount, toPdfSafeNumber } from './formatters';

// jsPDF-standardfontene bruker WinAnsi-koding. Intl.NumberFormat('nb-NO') gir
// U+2212 (typografisk minus) for negative tall — den finnes IKKE i WinAnsi og
// rendres som søppeltegn i PDF (bug sett på kreditnota INV-2026-028: «"5 700 kr»).
// Etter normalisering skal beløp KUN inneholde ren ASCII (0x20–0x7E), som alle
// jsPDF-standardfontene støtter.
const isPdfSafe = (s: string): boolean =>
  [...s].every((c) => {
    const cp = c.codePointAt(0)!;
    return cp >= 0x20 && cp <= 0x7e;
  });

describe('toPdfSafeNumber', () => {
  it('erstatter U+2212 (typografisk minus) med vanlig bindestrek', () => {
    expect(toPdfSafeNumber('\u22125\u00A0700')).toBe('-5 700');
  });

  it('erstatter NBSP og NNBSP med vanlig mellomrom', () => {
    expect(toPdfSafeNumber('5\u00A0700')).toBe('5 700');
    expect(toPdfSafeNumber('5\u202F700')).toBe('5 700');
  });
});

describe('formatInvoiceAmount (PDF/HTML-beløp) — alltid to desimaler', () => {
  it('negativt beløp (kreditnota) bruker bindestrek og er pdf-trygt', () => {
    const s = formatInvoiceAmount(-5700);
    expect(s).toBe('-5 700,00 kr');
    expect(s).not.toContain('\u2212');
    expect(s).not.toMatch(/[\u00A0\u202F]/);
    expect(isPdfSafe(s)).toBe(true);
  });

  it('hele kroner får ,00', () => {
    const s = formatInvoiceAmount(5700);
    expect(s).toBe('5 700,00 kr');
    expect(isPdfSafe(s)).toBe(true);
  });

  it('halvøre-beløp viser to desimaler («237,50», aldri «237,5»)', () => {
    expect(formatInvoiceAmount(237.5)).toBe('237,50 kr');
    expect(formatInvoiceAmount(1187.5)).toBe('1 187,50 kr');
  });

  it('beholder ører og runder flyttall-haler', () => {
    expect(formatInvoiceAmount(-11390.63)).toBe('-11 390,63 kr');
    expect(formatInvoiceAmount(11390.630000000001)).toBe('11 390,63 kr');
  });
});

describe('formatCurrency (app-UI) — alltid to desimaler', () => {
  it('negativt beløp er pdf-trygt (samme normalisering som PDF)', () => {
    const s = formatCurrency(-5700);
    expect(s).toBe('-5 700,00 kr');
    expect(s).not.toContain('\u2212');
    expect(isPdfSafe(s)).toBe(true);
  });

  it('halvøre-beløp viser to desimaler', () => {
    expect(formatCurrency(237.5)).toBe('237,50 kr');
    expect(formatCurrency(1187.5)).toBe('1 187,50 kr');
  });

  it('ører vises alltid — ingen avrunding til hele kroner', () => {
    expect(formatCurrency(11390.63)).toBe('11 390,63 kr');
  });
});
