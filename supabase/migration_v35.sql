-- Migration v35: Kreditnota (bokføringslovlig kansellering) + rate-limiting på telefon-innlogging
-- Kjør i Supabase SQL Editor. Idempotent (trygt å kjøre flere ganger).
--
-- ═══════════════════════════════════════════════════════════════════════════
-- DEL 1 — KREDITNOTA
-- ═══════════════════════════════════════════════════════════════════════════
-- PROBLEM:
--   Fakturaer kan IKKE slettes. Norsk bokføringslov (§ 5 / bokføringsforskriften)
--   krever en ubrutt, fortløpende fakturaserie per bedrift (se v19). En feilaktig
--   eller kansellert faktura skal derfor IKKE fjernes, men korrigeres med en
--   KREDITNOTA: et nytt bilag i SAMME nummerserie med NEGATIVE beløp som viser
--   tilbake til originalen og nuller den ut.
--
-- LØSNING:
--   * Ny enum-verdi invoice_status.'credited' — markerer både den krediterte
--     originalen OG selve kreditnotaen (kreditnotaen skal ikke telle som utestående
--     eller forfalt; den identifiseres uansett unikt via credits_invoice_id).
--   * invoices.credits_invoice_id — kreditnotaens peker til originalfakturaen.
--     NULL på vanlige fakturaer, satt på kreditnotaer.
--   * create_credit_note(invoice_id) — SECURITY DEFINER-RPC (admin, eget firma):
--     trekker nytt nummer fra next_invoice_number() (samme serie), setter inn en
--     ny faktura med negerte linjer/beløp som refererer originalen, og setter
--     originalen til 'credited'. ENDRER ingen eksisterende beløp — den motposterer.

-- ── STEG 1: Ny status-verdi ──────────────────────────────────────────────────
-- NB: På PostgreSQL 12+ (Supabase kjører 15) er ADD VALUE tillatt inne i en
-- transaksjon, men den nye verdien kan ikke BRUKES i samme transaksjon før commit.
-- Denne migrasjonen bruker 'credited' kun inne i plpgsql-funksjonskroppen (evalueres
-- ved kjøretid, etter commit) og i INSERT/UPDATE som først skjer når appen kaller
-- RPC-en — aldri ved selve migrasjonskjøringen. Skulle SQL-editoren likevel klage
-- («unsafe use of new value»), kjør denne ene linjen alene først, deretter resten.
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'credited';

-- ── STEG 2: Kobling kreditnota → original ────────────────────────────────────
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS credits_invoice_id UUID REFERENCES invoices(id);

-- note-kolonnen brukes allerede av appen ved fakturagenerering; sikre at den finnes
-- (defensivt/idempotent) siden kreditnotaen skriver en referansetekst hit.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS note TEXT;

CREATE INDEX IF NOT EXISTS invoices_credits_invoice_id_idx
  ON invoices (credits_invoice_id);

-- ── STEG 3: «Opprett kreditnota»-flyten ──────────────────────────────────────
-- SECURITY DEFINER: må kunne både lese originalen, trekke nytt fakturanummer
-- (next_invoice_number oppdaterer companies.next_invoice_seq) og skrive den nye
-- fakturaen atomisk. company_id UTLEDES fra innlogget bruker (current_user_company_id())
-- — tas ALDRI som parameter fra klienten (samme mønster som øvrige hjelpefunksjoner).
-- Kun admin (is_admin_user()), og kun fakturaer i eget firma.
CREATE OR REPLACE FUNCTION public.create_credit_note(
  p_invoice_id UUID,
  p_reason     TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company    UUID := current_user_company_id();
  v_orig       invoices%ROWTYPE;
  v_credit     invoices%ROWTYPE;
  v_new_number TEXT;
  v_neg_lines  JSONB;
BEGIN
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Ingen tilknyttet firma';
  END IF;
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Kun admin kan opprette kreditnota';
  END IF;

  -- Radlås originalen så to samtidige kall ikke lager to kreditnotaer.
  SELECT * INTO v_orig
  FROM invoices
  WHERE id = p_invoice_id AND company_id = v_company
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Faktura ikke funnet';
  END IF;

  -- En kreditnota kan ikke krediteres på nytt.
  IF v_orig.credits_invoice_id IS NOT NULL THEN
    RAISE EXCEPTION 'Kan ikke kreditere en kreditnota';
  END IF;

  -- Unngå dobbel kreditering av samme original.
  IF v_orig.status = 'credited' THEN
    RAISE EXCEPTION 'Fakturaen er allerede kreditert';
  END IF;

  -- Neger hver linje: amount (og unitPrice hvis satt) snus til negativt, quantity
  -- beholdes → quantity * (-unitPrice) = -amount holder seg konsistent.
  SELECT COALESCE(jsonb_agg(
           CASE
             WHEN jsonb_typeof(elem) = 'object' THEN
               elem
                 || jsonb_build_object('amount', -COALESCE((elem->>'amount')::numeric, 0))
                 || CASE WHEN elem ? 'unitPrice'
                         THEN jsonb_build_object('unitPrice', -COALESCE((elem->>'unitPrice')::numeric, 0))
                         ELSE '{}'::jsonb END
             ELSE elem
           END
         ), '[]'::jsonb)
  INTO v_neg_lines
  FROM jsonb_array_elements(v_orig.line_items) elem;

  -- Nytt nummer i SAMME serie (gapless, per firma).
  v_new_number := next_invoice_number(v_company);

  INSERT INTO invoices (
    company_id, job_id, invoice_number,
    customer_name, customer_address, customer_email,
    line_items, subtotal_ex_vat, vat, total,
    status, due_date, credits_invoice_id, note
  ) VALUES (
    v_orig.company_id, v_orig.job_id, v_new_number,
    v_orig.customer_name, v_orig.customer_address, v_orig.customer_email,
    v_neg_lines, -v_orig.subtotal_ex_vat, -v_orig.vat, -v_orig.total,
    'credited', CURRENT_DATE, v_orig.id,
    COALESCE(NULLIF(btrim(p_reason), ''),
             'Kreditnota for ' || v_orig.invoice_number)
  )
  RETURNING * INTO v_credit;

  -- Merk originalen som kreditert (beholdes i regnskapet, motpostert).
  UPDATE invoices SET status = 'credited' WHERE id = v_orig.id;

  RETURN to_jsonb(v_credit);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_credit_note(UUID, TEXT) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- DEL 2 — RATE-LIMITING FOR phone-login
-- ═══════════════════════════════════════════════════════════════════════════
-- Edge-funksjonen phone-login logger hvert innloggingsforsøk her og blokkerer
-- ved > 5 forsøk per telefonnummer ELLER per IP innenfor 15 minutter. Tabellen
-- leses/skrives KUN av edge-funksjonen (service_role, som omgår RLS). RLS er på
-- UTEN policyer → anon/authenticated har ingen tilgang.
CREATE TABLE IF NOT EXISTS phone_login_attempts (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  phone      TEXT,
  ip         TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indekser matcher oppslagene i funksjonen (identifikator + tidsvindu).
CREATE INDEX IF NOT EXISTS phone_login_attempts_phone_idx
  ON phone_login_attempts (phone, created_at);
CREATE INDEX IF NOT EXISTS phone_login_attempts_ip_idx
  ON phone_login_attempts (ip, created_at);

ALTER TABLE phone_login_attempts ENABLE ROW LEVEL SECURITY;
-- (Bevisst ingen policyer — kun service_role skal nå denne tabellen.)
