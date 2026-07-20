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

describe('formatInvoiceAmount (PDF/HTML-beløp)', () => {
  it('negativt beløp (kreditnota) bruker bindestrek og er pdf-trygt', () => {
    const s = formatInvoiceAmount(-5700);
    expect(s).toBe('-5 700 kr');
    expect(s).not.toContain('\u2212');
    expect(s).not.toMatch(/[\u00A0\u202F]/);
    expect(isPdfSafe(s)).toBe(true);
  });

  it('positivt beløp er uendret visuelt og pdf-trygt', () => {
    const s = formatInvoiceAmount(5700);
    expect(s).toBe('5 700 kr');
    expect(isPdfSafe(s)).toBe(true);
  });

  it('beholder ører når de finnes (som PDF-malene alltid har gjort)', () => {
    const s = formatInvoiceAmount(-11390.63);
    expect(s).toBe('-11 390,63 kr');
    expect(isPdfSafe(s)).toBe(true);
  });
});

describe('formatCurrency (app-UI)', () => {
  it('negativt beløp er pdf-trygt (samme normalisering som PDF)', () => {
    const s = formatCurrency(-5700);
    expect(s).toBe('-5 700 kr');
    expect(s).not.toContain('\u2212');
    expect(isPdfSafe(s)).toBe(true);
  });

  it('positivt beløp rundes til hele kroner som før', () => {
    expect(formatCurrency(11390.63)).toBe('11 391 kr');
  });
});
