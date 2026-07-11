import {
  VAT_RATE,
  round2,
  calcQuoteLineAmount,
  calcVat,
  calcTotal,
  calcTotalFromParts,
  sumAmounts,
  computeQuoteAmounts,
  buildInvoiceLineItems,
  computeInvoiceAmounts,
} from './amounts';

describe('VAT_RATE', () => {
  it('er 25 %', () => {
    expect(VAT_RATE).toBe(0.25);
  });
});

describe('round2', () => {
  it('avrunder til to desimaler', () => {
    expect(round2(10.004)).toBe(10);
    expect(round2(10.005)).toBe(10.01); // halv-opp
    expect(round2(10.006)).toBe(10.01);
    expect(round2(2500.5 / 100)).toBeCloseTo(25.01, 5);
  });
});

describe('calcVat (MVA 25 %)', () => {
  it('regner 25 % av runde beløp', () => {
    expect(calcVat(1000)).toBe(250);
    expect(calcVat(0)).toBe(0);
    expect(calcVat(4)).toBe(1);
    expect(calcVat(895)).toBe(223.75);
  });

  it('avrunder MVA til øre (halv-opp)', () => {
    // 25 % av 100,02 = 25,005 -> 25,01
    expect(calcVat(100.02)).toBe(25.01);
    // 25 % av 24,99 = 6,2475 -> 6,25
    expect(calcVat(24.99)).toBe(6.25);
    // 25 % av 0,02 = 0,005 -> 0,01
    expect(calcVat(0.02)).toBe(0.01);
  });

  it('matcher den opprinnelige formelen Math.round(subtotal * 25) / 100', () => {
    for (const s of [0, 1, 99.9, 1234.56, 41562.5, 87654.32]) {
      expect(calcVat(s)).toBe(Math.round(s * 25) / 100);
    }
  });
});

describe('calcTotal', () => {
  it('total = subtotal + mva', () => {
    expect(calcTotal(1000)).toBe(1250);
    expect(calcTotal(895)).toBe(1118.75);
    expect(calcTotal(0)).toBe(0);
  });
});

describe('calcTotalFromParts (avrundet subtotal + avrundet mva)', () => {
  it('runder HVER komponent til øre før summering (ulikt fra round2(subtotal + vat))', () => {
    const subtotal = 100.004;
    const vat = 25.001;
    // Metode A — avrund summen: round2(125.005) = 125,01
    expect(round2(subtotal + vat)).toBe(125.01);
    // Metode B (vår) — avrund hver komponent: round2(100,004) + round2(25,001) = 125,00
    expect(calcTotalFromParts(subtotal, vat)).toBe(125);
    // De to metodene gir ULIKT resultat her:
    expect(calcTotalFromParts(subtotal, vat)).not.toBe(round2(subtotal + vat));
  });

  it('total er ALLTID lik round2(subtotal) + round2(vat)', () => {
    const cases: Array<[number, number]> = [
      [100.004, 25.001],
      [9112.5, 2278.13],
      [0, 0],
      [1234.567, 308.642],
      [999.995, 249.999],
    ];
    for (const [s, v] of cases) {
      expect(calcTotalFromParts(s, v)).toBe(round2(s) + round2(v));
    }
  });
});

describe('calcQuoteLineAmount (tilbudslinje)', () => {
  it('antall × enhetspris, avrundet til øre', () => {
    expect(calcQuoteLineAmount(1, 895)).toBe(895);
    expect(calcQuoteLineAmount(2, 895)).toBe(1790);
    expect(calcQuoteLineAmount(1.5, 895)).toBe(1342.5);
    expect(calcQuoteLineAmount(3, 199.9)).toBe(599.7);
  });

  it('avrunder brøk-øre', () => {
    // 0,333 * 3 = 0,999 -> 1,00 ... men her 1 * 0,005 = 0,005 -> 0,01
    expect(calcQuoteLineAmount(1, 0.005)).toBe(0.01);
    expect(calcQuoteLineAmount(3, 33.333)).toBe(100); // 99,999 -> 100,00
  });

  it('behandler 0 og negative (rabatt) linjer', () => {
    expect(calcQuoteLineAmount(0, 895)).toBe(0);
    expect(calcQuoteLineAmount(1, 0)).toBe(0);
    expect(calcQuoteLineAmount(1, -500)).toBe(-500);
  });
});

describe('sumAmounts', () => {
  it('summerer', () => {
    expect(sumAmounts([])).toBe(0);
    expect(sumAmounts([100, 200, 50])).toBe(350);
    expect(sumAmounts([895, 350])).toBe(1245);
  });
});

describe('computeQuoteAmounts (tilbud subtotal/mva/total)', () => {
  it('typisk tilbud: 1t arbeid + fremmøtegebyr', () => {
    const r = computeQuoteAmounts([
      { quantity: 1, unitPrice: 895 },
      { quantity: 1, unitPrice: 350 },
    ]);
    expect(r.subtotalExVat).toBe(1245);
    expect(r.vat).toBe(311.25);
    expect(r.totalAmount).toBe(1556.25);
  });

  it('flere arbeidstimer', () => {
    const r = computeQuoteAmounts([
      { quantity: 7.5, unitPrice: 895 },
      { quantity: 2, unitPrice: 1200 },
    ]);
    // 6712,5 + 2400 = 9112,5
    expect(r.subtotalExVat).toBe(9112.5);
    expect(r.vat).toBe(2278.13); // 25 % = 2278,125 -> 2278,13
    // Riktig verdi til øre er 11390,63.
    expect(r.totalAmount).toBeCloseTo(11390.63, 2);
  });

  // Invariant: total = round2(subtotal) + round2(vat) — de synlige tallene
  // summerer alltid til total (tidligere «flyttall-rest»-bug, nå låst).
  it('subtotal = sum(round2(linjer)); total = round2(subtotal) + round2(vat)', () => {
    const lines = [
      { quantity: 7.5, unitPrice: 895 },
      { quantity: 2, unitPrice: 1200 },
    ];
    const r = computeQuoteAmounts(lines);
    expect(r.subtotalExVat).toBe(
      lines.reduce((s, l) => s + calcQuoteLineAmount(l.quantity, l.unitPrice), 0),
    );
    expect(r.totalAmount).toBe(round2(r.subtotalExVat) + round2(r.vat));
  });

  // INVARIANT: sum(round2(linjebeløp)) === subtotal, inkl. brøk-antall.
  it('brøk-antall gir skjeve desimaler: sum av avrundede linjer === subtotal', () => {
    const lines = [
      { quantity: 1.333, unitPrice: 895 }, // 1193,035 -> 1193,04 pr. linje
      { quantity: 2.5, unitPrice: 399.9 },
    ];
    for (const l of lines) {
      const a = calcQuoteLineAmount(l.quantity, l.unitPrice);
      expect(a).toBe(round2(a)); // linjen er avrundet til øre
    }
    const r = computeQuoteAmounts(lines);
    expect(r.subtotalExVat).toBe(
      lines.reduce((s, l) => s + calcQuoteLineAmount(l.quantity, l.unitPrice), 0),
    );
    expect(r.totalAmount).toBe(round2(r.subtotalExVat) + round2(r.vat));
  });

  it('tomt tilbud gir 0', () => {
    expect(computeQuoteAmounts([])).toEqual({ subtotalExVat: 0, vat: 0, totalAmount: 0 });
  });
});

describe('buildInvoiceLineItems (faktura-linjer)', () => {
  it('arbeidstimer-linje: timer × timepris, avrundet til øre', () => {
    const items = buildInvoiceLineItems({
      hours: 2,
      hourlyRate: 895,
      materials: 0,
      calloutFee: 0,
    });
    expect(items).toEqual([
      { description: 'Arbeidstimer (2t × 895 kr)', quantity: 2, unitPrice: 895, amount: 1790 },
    ]);
  });

  it('avrunder brøktime-linjebeløp til øre', () => {
    const items = buildInvoiceLineItems({ hours: 1.333, hourlyRate: 895, materials: 0, calloutFee: 0 });
    expect(items[0].amount).toBe(round2(1.333 * 895));
    expect(items[0].amount).toBe(round2(items[0].amount)); // maks 2 desimaler
  });

  it('legger materiell KUN når > 0', () => {
    const uten = buildInvoiceLineItems({ hours: 1, hourlyRate: 895, materials: 0, calloutFee: 0 });
    expect(uten.find((i) => i.description === 'Materiell')).toBeUndefined();

    const med = buildInvoiceLineItems({ hours: 1, hourlyRate: 895, materials: 500, calloutFee: 0 });
    expect(med).toContainEqual({ description: 'Materiell', amount: 500 });
  });

  it('legger fremmøtegebyr KUN når > 0', () => {
    const uten = buildInvoiceLineItems({ hours: 1, hourlyRate: 895, materials: 0, calloutFee: 0 });
    expect(uten.find((i) => i.description === 'Fremmøtegebyr')).toBeUndefined();

    const med = buildInvoiceLineItems({ hours: 1, hourlyRate: 895, materials: 0, calloutFee: 350 });
    expect(med).toContainEqual({ description: 'Fremmøtegebyr', amount: 350 });
  });

  it('rekkefølge: arbeidstimer, materiell, ekstra, fremmøtegebyr', () => {
    const items = buildInvoiceLineItems({
      hours: 1,
      hourlyRate: 895,
      materials: 500,
      calloutFee: 350,
      extraLines: [{ description: 'Kjøring', amount: 200 }],
    });
    expect(items.map((i) => i.description)).toEqual([
      'Arbeidstimer (1t × 895 kr)',
      'Materiell',
      'Kjøring',
      'Fremmøtegebyr',
    ]);
  });
});

describe('computeInvoiceAmounts (faktura subtotal/mva/total)', () => {
  it('timer + materiell + fremmøtegebyr', () => {
    const items = buildInvoiceLineItems({
      hours: 3,
      hourlyRate: 895,
      materials: 1200,
      calloutFee: 350,
    });
    const r = computeInvoiceAmounts(items);
    // 2685 + 1200 + 350 = 4235
    expect(r.subtotalExVat).toBe(4235);
    expect(r.vat).toBe(1058.75);
    expect(r.total).toBe(5293.75);
  });

  it('kun arbeidstimer, ingen gebyr/materiell', () => {
    const items = buildInvoiceLineItems({ hours: 1, hourlyRate: 1000, materials: 0, calloutFee: 0 });
    const r = computeInvoiceAmounts(items);
    expect(r).toEqual({ subtotalExVat: 1000, vat: 250, total: 1250 });
  });

  it('subtotal = sum(round2(linjebeløp)); mva av subtotal; total = round2(sub)+round2(vat)', () => {
    const items = buildInvoiceLineItems({ hours: 4.5, hourlyRate: 895, materials: 780, calloutFee: 350 });
    const r = computeInvoiceAmounts(items);
    expect(r.subtotalExVat).toBe(items.reduce((s, i) => s + round2(i.amount), 0));
    expect(r.vat).toBe(calcVat(r.subtotalExVat));
    expect(r.total).toBe(round2(r.subtotalExVat) + round2(r.vat));
  });

  // INVARIANT: sum(round2(linjebeløp)) === subtotal, inkl. brøktimer med skjeve desimaler.
  it('brøktimer: sum av avrundede linjebeløp === subtotal', () => {
    const items = buildInvoiceLineItems({
      hours: 3.333,
      hourlyRate: 895,
      materials: 120.505, // skjev desimal
      calloutFee: 350,
    });
    // Hvert linjebeløp er avrundet til øre.
    for (const i of items) expect(i.amount).toBe(round2(i.amount));
    const r = computeInvoiceAmounts(items);
    expect(r.subtotalExVat).toBe(items.reduce((s, i) => s + round2(i.amount), 0));
    expect(r.total).toBe(round2(r.subtotalExVat) + round2(r.vat));
  });
});
