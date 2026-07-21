import { generateInvoiceHtml } from './invoiceHtml';
import { Invoice } from '../types';

// Kreditnota-PDF-bugs (INV-2026-028): U+2212 i negative beløp (søppeltegn i jsPDF),
// rå «credited»-status, og kreditnota som så ut som vanlig faktura.

const baseInvoice: Invoice = {
  id: 'inv-1',
  invoiceNumber: 'INV-2026-027',
  jobId: 'job-1',
  customerName: 'Test Kunde AS',
  customerAddress: 'Testveien 1, 0001 Oslo',
  customerEmail: 'kunde@test.no',
  lineItems: [
    { description: 'Arbeidstimer: 4 t', amount: 4560 },
    { description: 'Materiell', amount: 1140 },
  ],
  subtotalExVat: 5700,
  vat: 1425,
  total: 7125,
  status: 'sent',
  dueDate: '2026-08-01',
  createdAt: '2026-07-18T10:00:00Z',
};

const creditNote: Invoice = {
  ...baseInvoice,
  id: 'inv-2',
  invoiceNumber: 'INV-2026-028',
  lineItems: [
    { description: 'Arbeidstimer: 4 t', amount: -4560 },
    { description: 'Materiell', amount: -1140 },
  ],
  subtotalExVat: -5700,
  vat: -1425,
  total: -7125,
  status: 'credited',
  creditsInvoiceId: 'inv-1',
  creditReason: 'Feil beløp på fakturaen',
};

describe('generateInvoiceHtml — kreditnota', () => {
  const html = generateInvoiceHtml(creditNote, null, 'INV-2026-027');

  it('inneholder ingen pdf-utrygge tegn (U+2212/NBSP/NNBSP) i beløpene', () => {
    expect(html).not.toMatch(/[\u2212\u00A0\u202F]/);
    expect(html).toContain('-5 700,00 kr');
    expect(html).toContain('-7 125,00 kr');
  });

  it('viser KREDITNOTA-tittel og norsk badge, aldri rå «credited»', () => {
    expect(html).toContain('KREDITNOTA');
    expect(html).toContain('Kreditnota');
    expect(html).not.toMatch(/>credited</);
  });

  it('refererer originalfakturaen', () => {
    expect(html).toContain('Krediterer faktura INV-2026-027');
  });

  it('har ingen betalingsfrist eller forfall', () => {
    expect(html).not.toContain('Betalingsfrist');
    expect(html).not.toContain('Forfall');
  });

  it('viser den obligatoriske årsaken (v36)', () => {
    expect(html).toContain('Årsak: Feil beløp på fakturaen');
  });

  it('viser ingen årsak-linje på gamle kreditnotaer uten credit_reason', () => {
    const old = generateInvoiceHtml({ ...creditNote, creditReason: null }, null, 'INV-2026-027');
    expect(old).not.toContain('Årsak:');
  });
});

describe('generateInvoiceHtml — kreditert original', () => {
  const credited: Invoice = { ...baseInvoice, status: 'credited' };
  const html = generateInvoiceHtml(credited, null, 'INV-2026-028');

  it('viser norsk status «Kreditert» og referanse til kreditnotaen', () => {
    expect(html).toContain('Kreditert');
    expect(html).not.toMatch(/>credited</);
    expect(html).toContain('Kreditert av INV-2026-028');
  });
});

describe('generateInvoiceHtml — vanlig faktura (uendret)', () => {
  const html = generateInvoiceHtml(baseInvoice, null);

  it('har status, forfall og betalingsfrist som før', () => {
    expect(html).toContain('Sendt');
    expect(html).toContain('Forfall');
    expect(html).toContain('Betalingsfrist');
    expect(html).not.toContain('KREDITNOTA');
    expect(html).not.toContain('Krediterer');
  });
});

describe('generateInvoiceHtml — KID (v37)', () => {
  it('faktura MED KID: viser KID i betalingsseksjonen, ingen merk-linje', () => {
    const html = generateInvoiceHtml({ ...baseInvoice, invoiceNumber: '1043', kid: '000010430' }, null);
    expect(html).toContain('KID');
    expect(html).toContain('000010430');
    expect(html).not.toContain('Merk betalingen');
  });

  it('faktura UTEN KID: viser «Merk betalingen med fakturanummer», ingen KID-felt', () => {
    const html = generateInvoiceHtml({ ...baseInvoice, invoiceNumber: '1043', kid: null }, null);
    expect(html).toContain('Merk betalingen med fakturanummer 1043');
    expect(html).not.toContain('>KID<');
  });

  it('kreditnota viser ALDRI KID eller merk-linje — selv om kid-feltet skulle være satt', () => {
    const html = generateInvoiceHtml({ ...creditNote, kid: '000010430' }, null, 'INV-2026-027');
    expect(html).not.toContain('000010430');
    expect(html).not.toContain('>KID<');
    expect(html).not.toContain('Merk betalingen');
  });
});
