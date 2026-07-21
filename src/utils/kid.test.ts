import { mod10CheckDigit, buildKid, isValidKid } from './kid';

describe('mod10CheckDigit — kjente testvektorer', () => {
  it('klassisk Luhn-vektor: 7992739871 → 3', () => {
    expect(mod10CheckDigit('7992739871')).toBe(3);
  });

  it('Visa-testkort 4242…: base 424242424242424 → 2', () => {
    expect(mod10CheckDigit('424242424242424')).toBe(2);
  });

  it('håndregnet KID-vektor: 234567 → 6 (7·2=14→5, 6, 5·2=10→1, 4, 3·2=6, 2 → sum 24)', () => {
    expect(mod10CheckDigit('234567')).toBe(6);
  });

  it('kanttilfeller: 0 → 0, 5 → 9 (5·2=10→1, sum 1, 10-1=9)', () => {
    expect(mod10CheckDigit('0')).toBe(0);
    expect(mod10CheckDigit('5')).toBe(9);
  });

  it('avviser ikke-siffer', () => {
    expect(() => mod10CheckDigit('12a4')).toThrow();
    expect(() => mod10CheckDigit('')).toThrow();
  });
});

describe('buildKid', () => {
  it('padder løpenummeret til total lengde inkl. kontrollsiffer (default 9)', () => {
    const kid = buildKid(1043, 9);
    expect(kid).toHaveLength(9);
    expect(kid.startsWith('00001043')).toBe(true);
    expect(isValidKid(kid)).toBe(true);
  });

  it('alle genererte KID-er validerer mot MOD10', () => {
    for (const seq of [1, 42, 999, 1043, 123456, 99999999]) {
      expect(isValidKid(buildKid(seq, 9))).toBe(true);
    }
  });

  it('løpenummer lengre enn plassen: KID vokser i stedet for å trunkere', () => {
    const kid = buildKid('1234567890', 9); // 10 siffer > 8 plasser
    expect(kid).toHaveLength(11);
    expect(kid.startsWith('1234567890')).toBe(true);
    expect(isValidKid(kid)).toBe(true);
  });

  it('unikhet: distinkte løpenummer gir alltid distinkte KID-er (samme lengde)', () => {
    const kids = new Set<string>();
    for (let seq = 1; seq <= 5000; seq++) kids.add(buildKid(seq, 9));
    expect(kids.size).toBe(5000);
  });

  it('kontrollsifferet oppdager enkeltsiffer-feil (naboer er aldri gyldige)', () => {
    const kid = buildKid(1043, 9);
    const tampered = kid.slice(0, -1) + String((Number(kid.slice(-1)) + 1) % 10);
    expect(isValidKid(tampered)).toBe(false);
  });
});

describe('isValidKid', () => {
  it('avviser for kort/lang/ikke-numerisk', () => {
    expect(isValidKid('1')).toBe(false);
    expect(isValidKid('1'.repeat(26))).toBe(false);
    expect(isValidKid('12x45')).toBe(false);
  });
});
