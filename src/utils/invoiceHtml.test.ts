import { generateInvoiceHtml } from './invoiceHtml';
import { Invoice, Company } from '../types';

// Norsk standardoppsett (redesign 2026-07-22): kunde øverst til venstre,
// firmainfo/dokumentblokk til høyre, linjetabell med mva-kolonner, bunnlinje
// «Betales til bankkonto …» / «NOK <total>». Kreditnota-guards fra INV-2026-028
// (U+2212, rå status, manglende dokumenthode) videreføres.

const baseInvoice: Invoice = {
  id: 'inv-1',
  invoiceNumber: 'INV-2026-027',
  jobId: 'job-1',
  customerName: 'Test Kunde AS',
  customerAddress: 'Testveien 1, 0001 Oslo',
  customerEmail: 'kunde@test.no',
  lineItems: [
    { description: 'Arbeidstimer: 4 t', quantity: 4, unitPrice: 1140, amount: 4560 },
    { description: 'Materiell', amount: 1140 },
  ],
  subtotalExVat: 5700,
  vat: 1425,
  total: 7125,
  status: 'sent',
  dueDate: '2026-08-01',
  createdAt: '2026-07-18T10:00:00Z',
};

const company: Company = {
  name: 'VVS Service AS',
  orgNumber: '123 456 789',
  address: 'Gateveien 1, 0150 Oslo',
  email: 'post@vvsservice.no',
  hourlyRate: 895,
  calloutFee: 350,
  paymentTermsDays: 14,
  accountNumber: '1234 56 78901',
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
  const html = generateInvoiceHtml(creditNote, company, 'INV-2026-027');

  it('inneholder ingen pdf-utrygge tegn (U+2212/NBSP/NNBSP) i beløpene', () => {
    expect(html).not.toMatch(/[\u2212\u00A0\u202F]/);
    expect(html).toContain('-5 700,00');
    expect(html).toContain('-7 125,00');
  });

  it('viser KREDITNOTA-tittel, aldri rå «credited»', () => {
    expect(html).toContain('KREDITNOTA');
    expect(html).not.toMatch(/>credited</);
  });

  it('refererer originalfakturaen', () => {
    expect(html).toContain('Krediterer faktura INV-2026-027');
  });

  it('har ingen betalingsinformasjon, forfall eller betalingslinje', () => {
    expect(html).not.toContain('Betalingsinformasjon');
    expect(html).not.toContain('Forfall');
    expect(html).not.toContain('Betales til bankkonto');
  });

  it('viser den obligatoriske årsaken (v36)', () => {
    expect(html).toContain('Årsak: Feil beløp på fakturaen');
  });

  it('viser ingen årsak-linje på gamle kreditnotaer uten credit_reason', () => {
    const old = generateInvoiceHtml({ ...creditNote, creditReason: null }, company, 'INV-2026-027');
    expect(old).not.toContain('Årsak:');
  });
});

describe('generateInvoiceHtml — kreditert original', () => {
  const credited: Invoice = { ...baseInvoice, status: 'credited' };
  const html = generateInvoiceHtml(credited, company, 'INV-2026-028');

  it('viser norsk status «Kreditert» og referanse til kreditnotaen', () => {
    expect(html).toContain('Kreditert');
    expect(html).not.toMatch(/>credited</);
    expect(html).toContain('Kreditert av INV-2026-028');
  });
});

describe('generateInvoiceHtml — norsk standardoppsett', () => {
  const html = generateInvoiceHtml(baseInvoice, company);

  it('har FAKTURA-tittel, status og nøkkelfelt (Fakturanr./Fakturadato)', () => {
    expect(html).toContain('FAKTURA');
    expect(html).toContain('Sendt');
    expect(html).toContain('Fakturanr.');
    expect(html).toContain('Fakturadato');
    expect(html).not.toContain('KREDITNOTA');
    expect(html).not.toContain('Krediterer');
  });

  it('viser kunden øverst og firmaets infoblokk med «Org.nr: NO … MVA» og e-post', () => {
    expect(html).toContain('Test Kunde AS');
    expect(html).toContain('Testveien 1, 0001 Oslo');
    expect(html).toContain('VVS Service AS');
    expect(html).toContain('Org.nr: NO 123 456 789 MVA');
    expect(html).toContain('post@vvsservice.no');
  });

  it('har betalingsinformasjon med Forfallsdato og Kontonummer', () => {
    expect(html).toContain('Betalingsinformasjon');
    expect(html).toContain('Forfallsdato');
    expect(html).toContain('Kontonummer');
    expect(html).toContain('1234 56 78901');
  });

  it('linjetabellen har mva-kolonner og enhetspris når den finnes', () => {
    expect(html).toContain('Enh.pris');
    expect(html).toContain('(ekskl. mva)');
    expect(html).toContain('(25 %)');
    expect(html).toContain('(inkl. mva)');
    // Arbeidstimer: enh.pris 1 140,00; mva 4560*0,25 = 1 140,00; inkl. 4560*1,25 = 5 700,00
    expect(html).toContain('5 700,00');
    // Sum-rad bruker fakturaens totaler
    expect(html).toContain('1 425,00');
    expect(html).toContain('7 125,00');
  });

  it('har bunnlinje med NOK-total', () => {
    expect(html).toContain('NOK 7 125,00');
  });

  it('viser leveringsadresse og vår kontakt når jobbdata finnes — ellers ikke', () => {
    const withExtras = generateInvoiceHtml(baseInvoice, company, undefined, {
      deliveryAddress: 'Jobbgata 2, 0180 Oslo',
      ourContact: 'Kari Tekniker',
    });
    expect(withExtras).toContain('Leveringsadresse');
    expect(withExtras).toContain('Jobbgata 2, 0180 Oslo');
    expect(withExtras).toContain('Vår kontakt');
    expect(withExtras).toContain('Kari Tekniker');
    expect(html).not.toContain('Leveringsadresse');
    expect(html).not.toContain('Vår kontakt');
  });
});

describe('generateInvoiceHtml — KID (v37)', () => {
  it('faktura MED KID: KID i betalingsinfo + NB-linje + KID i betalingslinjen, ingen merk-linje', () => {
    const html = generateInvoiceHtml({ ...baseInvoice, invoiceNumber: '1043', kid: '000010430' }, company);
    expect(html).toContain('>KID<');
    expect(html).toContain('000010430');
    expect(html).toContain('NB! Oppgi alltid KID ved elektronisk betaling.');
    expect(html).toContain('Betales til bankkonto 1234 56 78901, KID: 000010430');
    expect(html).not.toContain('Merk betalingen');
  });

  it('faktura UTEN KID: «Merk betalingen med fakturanummer» og betalingslinje uten KID', () => {
    const html = generateInvoiceHtml({ ...baseInvoice, invoiceNumber: '1043', kid: null }, company);
    expect(html).toContain('Merk betalingen med fakturanummer 1043');
    expect(html).toContain('Betales til bankkonto 1234 56 78901');
    expect(html).not.toContain(', KID:');
    expect(html).not.toContain('>KID<');
    expect(html).not.toContain('NB! Oppgi alltid KID');
  });

  it('kreditnota viser ALDRI KID, NB-linje eller merk-linje — selv om kid-feltet skulle være satt', () => {
    const creditWithKid: Invoice = {
      ...baseInvoice,
      id: 'inv-2',
      invoiceNumber: 'INV-2026-028',
      status: 'credited',
      creditsInvoiceId: 'inv-1',
      creditReason: 'Feil beløp',
      kid: '000010430',
    };
    const html = generateInvoiceHtml(creditWithKid, company, 'INV-2026-027');
    expect(html).not.toContain('000010430');
    expect(html).not.toContain('>KID<');
    expect(html).not.toContain('NB! Oppgi alltid KID');
    expect(html).not.toContain('Merk betalingen');
  });
});
