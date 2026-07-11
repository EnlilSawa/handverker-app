// Ren beløpslogikk (MVA, subtotal, total, linjebeløp), trukket ut fra
// `appStore.generateInvoice` og `NewQuoteScreen` UTEN å endre funksjonell logikk
// — formlene er identiske med de opprinnelige. Isolert og testbar (amounts.test.ts).
import type { InvoiceLineItem } from '../types';

/** Norsk MVA-sats. */
export const VAT_RATE = 0.25;

/** Avrund til 2 desimaler (øre). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Tilbudslinje: antall × enhetspris, avrundet til øre.
 * Identisk med NewQuoteScreen.calcLine: `Math.round(q * p * 100) / 100`.
 */
export function calcQuoteLineAmount(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

/**
 * MVA (25 %) av et beløp eks. mva, avrundet til øre.
 * Identisk med den opprinnelige: `Math.round(subtotal * 25) / 100`.
 */
export function calcVat(subtotalExVat: number): number {
  return Math.round(subtotalExVat * 25) / 100;
}

/** Total inkl. mva = subtotal + mva. */
export function calcTotal(subtotalExVat: number): number {
  return subtotalExVat + calcVat(subtotalExVat);
}

/** Summér linjebeløp. */
export function sumAmounts(amounts: number[]): number {
  return amounts.reduce((sum, a) => sum + a, 0);
}

export interface QuoteLineInput {
  quantity: number;
  unitPrice: number;
}

/**
 * Tilbud: subtotal/mva/total fra linjer. Matcher NewQuoteScreen
 * (hver linje avrundet til øre, deretter summert, så mva av summen).
 */
export function computeQuoteAmounts(lines: QuoteLineInput[]): {
  subtotalExVat: number;
  vat: number;
  totalAmount: number;
} {
  const subtotalExVat = lines.reduce((s, l) => s + calcQuoteLineAmount(l.quantity, l.unitPrice), 0);
  const vat = calcVat(subtotalExVat);
  return { subtotalExVat, vat, totalAmount: subtotalExVat + vat };
}

export interface InvoiceAmountInput {
  hours: number;
  hourlyRate: number;
  materials: number;
  calloutFee: number;
  extraLines?: InvoiceLineItem[];
}

/**
 * Faktura: bygger linjeposter fra timer/timepris/materiell/fremmøtegebyr.
 * Matcher appStore.generateInvoice EKSAKT:
 *  - arbeidstimer-beløp = timer × timepris (IKKE avrundet)
 *  - materiell kun hvis > 0
 *  - ekstra-linjer beholdes uendret
 *  - fremmøtegebyr kun hvis > 0
 *  - rekkefølge: arbeidstimer, materiell, ekstra, fremmøtegebyr
 */
export function buildInvoiceLineItems(input: InvoiceAmountInput): InvoiceLineItem[] {
  const { hours, hourlyRate, materials, calloutFee, extraLines } = input;
  const lineItems: InvoiceLineItem[] = [
    {
      description: `Arbeidstimer (${hours}t × ${hourlyRate} kr)`,
      quantity: hours,
      unitPrice: hourlyRate,
      amount: hours * hourlyRate,
    },
  ];
  if (materials > 0) lineItems.push({ description: 'Materiell', amount: materials });
  if (extraLines?.length) lineItems.push(...extraLines);
  if (calloutFee > 0) lineItems.push({ description: 'Fremmøtegebyr', amount: calloutFee });
  return lineItems;
}

/** Faktura: subtotal/mva/total fra ferdige linjeposter. */
export function computeInvoiceAmounts(lineItems: InvoiceLineItem[]): {
  subtotalExVat: number;
  vat: number;
  total: number;
} {
  const subtotalExVat = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const vat = calcVat(subtotalExVat);
  return { subtotalExVat, vat, total: subtotalExVat + vat };
}
