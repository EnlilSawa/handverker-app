-- Migration v39: KID på som standard for alle firma
-- Kjør i Supabase SQL Editor ETTER v37 og v38 — én gang. (ALTER-en er harmløs å
-- gjenta, men UPDATE-en ville slå KID PÅ igjen for firma som senere har valgt
-- den AV i Innstillinger — så ikke re-kjør etter at firma har begynt å velge.)
--
-- ENDRING: kid_enabled snus fra opt-in (default FALSE i v37) til opt-out:
--   * Nye firma får kid_enabled = TRUE automatisk (kolonne-default).
--   * Alle eksisterende firma settes til TRUE. (v37 er ikke kjørt i produksjon
--     før denne, så ingen firma har rukket å slå KID bevisst AV — engangs-
--     flippen er derfor trygg.)
--   Toggle-en i Innstillinger består som mulighet til å slå KID AV for firma
--   uten KID/OCR-avtale med banken; da vises «Merk betalingen med fakturanummer …»
--   på faktura og i e-post i stedet.
--
-- Selve KID-genereringen (trigger set_invoice_kid fra v37) er uendret: hver ny
-- vanlig faktura (aldri kreditnota) får unik KID ved INSERT når kid_enabled = TRUE.

ALTER TABLE companies ALTER COLUMN kid_enabled SET DEFAULT TRUE;

UPDATE companies SET kid_enabled = TRUE WHERE kid_enabled = FALSE;
