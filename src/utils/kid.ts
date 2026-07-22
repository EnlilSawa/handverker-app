// KID-generering (MOD10/Luhn) — speiler kid_mod10_check_digit + set_invoice_kid
// i migration_v37.sql. Serveren (trigger) er sannhetskilden for lagret KID;
// denne brukes til forhåndsvisning i innstillingene og til tester.

/** MOD10/Luhn-kontrollsiffer for en ren sifferstreng (basen, uten kontrollsiffer). */
export function mod10CheckDigit(base: string): number {
  if (!/^[0-9]+$/.test(base)) {
    throw new Error(`KID-basen må være rene siffer: ${base}`);
  }
  let sum = 0;
  let weight = 2; // posisjonen nærmest kontrollsifferet vektes 2
  for (let i = base.length - 1; i >= 0; i--) {
    let digit = Number(base[i]) * weight;
    if (digit > 9) digit -= 9;
    sum += digit;
    weight = 3 - weight; // veksler 2,1,2,1,…
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Bygger KID for et løpenummer: nummeret venstre-paddet med 0 til
 * (totalLength - 1) siffer + MOD10-kontrollsiffer. Blir løpenummeret lengre
 * enn plassen, brukes det upaddet (KID-en vokser — samme regel som serveren).
 */
export function buildKid(sequenceNumber: number | string, totalLength: number): string {
  const seq = String(sequenceNumber);
  if (!/^[0-9]+$/.test(seq)) {
    throw new Error(`Løpenummeret må være rene siffer: ${seq}`);
  }
  const base = seq.padStart(Math.max(totalLength - 1, seq.length), '0');
  return base + String(mod10CheckDigit(base));
}

/** Validerer en komplett KID (base + kontrollsiffer) mot MOD10. */
export function isValidKid(kid: string): boolean {
  if (!/^[0-9]{2,25}$/.test(kid)) return false;
  return mod10CheckDigit(kid.slice(0, -1)) === Number(kid.slice(-1));
}
