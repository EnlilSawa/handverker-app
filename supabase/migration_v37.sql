-- Migration v37: Rent løpenummer som fakturanummer + unik KID (MOD10) per faktura
-- Kjør i Supabase SQL Editor. Idempotent (trygt å kjøre flere ganger).
--
-- ENDRING 1 — FAKTURANUMMERFORMAT:
--   Dagens format 'INV-2026-001' erstattes av et rent løpenummer per firma
--   ('1043'). Serien FORTSETTER fra companies.next_invoice_seq (v19) — ubrutt,
--   ingen renummerering av eksisterende fakturaer (bokføringsloven). Gapless-
--   mekanikken fra v19 (atomisk UPDATE..RETURNING med radlås) er uendret.
--   Kreditnotaer trekker fra SAMME serie som før (create_credit_note kaller
--   next_invoice_number og er uendret).
--
-- ENDRING 2 — STARTNUMMER:
--   Ny RPC set_invoice_start_number(p_start): admin kan flytte firmaets teller
--   FREMOVER (aldri bakover — det ville gitt duplikater/hull i serien).
--
-- ENDRING 3 — KID (MOD10/Luhn):
--   * companies.kid_enabled (default FALSE — på først når firmaet har bankavtale)
--   * companies.kid_length (total lengde inkl. kontrollsiffer, default 9, 4–25)
--   * invoices.kid — settes av BEFORE INSERT-trigger, KUN for vanlige fakturaer
--     (aldri kreditnotaer: credits_invoice_id IS NOT NULL hopper over), og kun
--     når fakturanummeret er et rent løpenummer (nye fakturaer). KID = løpe-
--     nummeret venstre-paddet med 0 til (kid_length - 1) siffer + MOD10-
--     kontrollsiffer. Unik per firma (løpenummeret er unikt i serien).
--   Generering skjer 100 % server-side (trigger) — klienten sender aldri KID.

-- ── 1. Nye kolonner ──────────────────────────────────────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS kid_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS kid_length INTEGER NOT NULL DEFAULT 9;
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_kid_length_range;
ALTER TABLE companies
  ADD CONSTRAINT companies_kid_length_range CHECK (kid_length BETWEEN 4 AND 25);

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS kid TEXT;

-- Unik per firma. Partiell indeks: NULL-kid (kreditnotaer, gamle fakturaer,
-- firmaer uten KID) deltar ikke.
CREATE UNIQUE INDEX IF NOT EXISTS invoices_company_kid_key
  ON invoices (company_id, kid) WHERE kid IS NOT NULL;

-- ── 2. Rent løpenummer fra next_invoice_number ───────────────────────────────
-- Identisk med v19 bortsett fra RETURN-linjen: 'INV-<år>-<lpad>' → v_seq::TEXT.
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

  -- Atomisk: radlås på firmaet, hent gjeldende verdi og inkrementer (v19-mekanikk).
  UPDATE companies
    SET next_invoice_seq = next_invoice_seq + 1
    WHERE id = company_id
    RETURNING next_invoice_seq - 1 INTO v_seq;

  IF v_seq IS NULL THEN
    RAISE EXCEPTION 'Firma ikke funnet: %', company_id;
  END IF;

  RETURN v_seq::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION next_invoice_number(UUID) TO authenticated;

-- ── 3. Konfigurerbart startnummer (kun fremover) ─────────────────────────────
CREATE OR REPLACE FUNCTION public.set_invoice_start_number(p_start INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company UUID := current_user_company_id();
  v_current INTEGER;
BEGIN
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Ingen tilknyttet firma';
  END IF;
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Kun admin kan endre startnummer';
  END IF;
  IF p_start IS NULL OR p_start < 1 THEN
    RAISE EXCEPTION 'Ugyldig startnummer';
  END IF;

  -- Radlås (samme lås som next_invoice_number) → ingen kappløp med pågående
  -- fakturagenerering.
  SELECT next_invoice_seq INTO v_current
  FROM companies WHERE id = v_company FOR UPDATE;

  IF p_start <= v_current THEN
    RAISE EXCEPTION 'Startnummeret må være høyere enn dagens teller (%)', v_current;
  END IF;

  UPDATE companies SET next_invoice_seq = p_start WHERE id = v_company;
  RETURN p_start;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_invoice_start_number(INTEGER) TO authenticated;

-- ── 4. MOD10-kontrollsiffer (Luhn) ───────────────────────────────────────────
-- Standard Luhn: fra høyre mot venstre vektes sifrene 2,1,2,1,…; produkter > 9
-- får sifrene summert (ekv. produkt - 9); kontrollsiffer = (10 - sum mod 10) mod 10.
CREATE OR REPLACE FUNCTION public.kid_mod10_check_digit(p_base TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_sum INTEGER := 0;
  v_digit INTEGER;
  v_weight INTEGER := 2; -- posisjonen nærmest kontrollsifferet vektes 2
  i INTEGER;
BEGIN
  IF p_base !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'KID-basen må være rene siffer: %', p_base;
  END IF;
  FOR i IN REVERSE length(p_base)..1 LOOP
    v_digit := substr(p_base, i, 1)::INTEGER * v_weight;
    IF v_digit > 9 THEN v_digit := v_digit - 9; END IF;
    v_sum := v_sum + v_digit;
    v_weight := 3 - v_weight; -- veksler 2,1,2,1,…
  END LOOP;
  RETURN (10 - (v_sum % 10)) % 10;
END;
$$;

-- ── 5. Trigger: sett KID ved faktura-insert ──────────────────────────────────
-- SECURITY DEFINER: må lese companies.kid_enabled/kid_length også når inserten
-- gjøres av en tekniker (fullført jobb → generateInvoice).
CREATE OR REPLACE FUNCTION public.set_invoice_kid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_length INTEGER;
  v_base TEXT;
BEGIN
  -- Aldri KID på kreditnotaer (de er ikke betalingskrav), og kun for nye
  -- rene løpenummer (gamle 'INV-…'-formater hoppes over).
  IF NEW.credits_invoice_id IS NOT NULL OR NEW.invoice_number !~ '^[0-9]+$' THEN
    NEW.kid := NULL;
    RETURN NEW;
  END IF;

  SELECT kid_enabled, kid_length INTO v_enabled, v_length
  FROM companies WHERE id = NEW.company_id;

  IF NOT COALESCE(v_enabled, FALSE) THEN
    NEW.kid := NULL;
    RETURN NEW;
  END IF;

  -- Basen = løpenummeret paddet til (kid_length - 1). Skulle løpenummeret være
  -- lengre enn det (ekstremt), brukes det upaddet — KID-en blir da lengre enn
  -- innstillingen, men forblir gyldig (maks 25 siffer i bankstandarden).
  v_base := LPAD(NEW.invoice_number, GREATEST(v_length - 1, length(NEW.invoice_number)), '0');
  NEW.kid := v_base || kid_mod10_check_digit(v_base)::TEXT;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invoices_set_kid ON invoices;
CREATE TRIGGER invoices_set_kid
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_invoice_kid();
