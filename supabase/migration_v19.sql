-- Migration v19: Fakturanummerering per firma og gapless
-- Kjør i Supabase SQL Editor. Idempotent.
--
-- PROBLEM:
--   next_invoice_number(company_id) ignorerte argumentet og brukte én GLOBAL
--   sekvens (invoice_number_seq) delt på tvers av alle firmaer. Det gir hull i
--   hvert firmas serie (INV-2026-001, så -004, så -009 …). Norsk bokføringslov
--   krever en ubrutt, fortløpende fakturaserie PER bedrift.
--
-- FIX:
--   * companies.next_invoice_seq: per-firma teller.
--   * next_invoice_number() inkrementerer telleren ATOMISK (UPDATE … RETURNING,
--     som radlåser firmaet → samtidige kall serialiseres → ingen hull/duplikater).
--   * Unikhet endres fra global (invoice_number) til per (company_id, invoice_number).
--   * Eksisterende fakturaer renummereres IKKE; tellerne settes forbi høyeste
--     eksisterende nummer per firma så vi unngår kollisjoner.

-- ── 1. Per-firma teller ──────────────────────────────────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS next_invoice_seq INTEGER NOT NULL DEFAULT 1;

-- ── 2. Backfill: start hver teller forbi firmaets høyeste eksisterende nummer ──
-- Leser tallsuffikset fra eksisterende invoice_number ('INV-<år>-<nr>').
-- GREATEST(...) sikrer at vi aldri SENKER en teller ved ny kjøring (idempotent).
UPDATE companies c SET next_invoice_seq = GREATEST(
  c.next_invoice_seq,
  COALESCE((
    SELECT MAX((split_part(i.invoice_number, '-', 3))::INTEGER)
    FROM invoices i
    WHERE i.company_id = c.id
      AND i.invoice_number ~ '^INV-[0-9]+-[0-9]+$'
  ), 0) + 1
);

-- ── 3. Unikhet per firma (i stedet for globalt) ──────────────────────────────
-- Dropp den globale UNIQUE-constrainten på invoice_number (default-navn fra
-- "invoice_number TEXT NOT NULL UNIQUE" i schema.sql).
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_company_invoice_number_key
  ON invoices (company_id, invoice_number);

-- ── 4. Gapless, per-firma nummergenerator ────────────────────────────────────
-- SECURITY DEFINER fordi den må kunne oppdatere companies.next_invoice_seq også
-- når kalleren er tekniker (teknikere har ikke UPDATE på companies via RLS, men
-- kan fullføre jobber som genererer faktura). Vi begrenser likevel til kallerens
-- eget firma for å hindre at noen «brenner» nummer hos andre firmaer.
CREATE OR REPLACE FUNCTION next_invoice_number(company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  -- Begrens til eget firma for innloggede brukere (service-role/SQL har auth.uid()=NULL).
  IF auth.uid() IS NOT NULL AND company_id <> current_user_company_id() THEN
    RAISE EXCEPTION 'Ikke autorisert for dette firmaet';
  END IF;

  -- Atomisk: radlås på firmaet, hent gjeldende verdi og inkrementer.
  UPDATE companies
    SET next_invoice_seq = next_invoice_seq + 1
    WHERE id = company_id
    RETURNING next_invoice_seq - 1 INTO v_seq;

  IF v_seq IS NULL THEN
    RAISE EXCEPTION 'Firma ikke funnet: %', company_id;
  END IF;

  RETURN 'INV-' || EXTRACT(YEAR FROM NOW())::INTEGER || '-' || LPAD(v_seq::TEXT, 3, '0');
END;
$$;

-- Behold eksisterende tilgang (funksjonen kalles av innloggede brukere via RPC).
GRANT EXECUTE ON FUNCTION next_invoice_number(UUID) TO authenticated;

-- Den gamle globale sekvensen er ikke lenger i bruk. Vi DROPper den ikke (for å
-- ikke bryte en evt. gjenværende referanse); den blir bare stående ubrukt.
