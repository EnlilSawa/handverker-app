-- Migration v36: Obligatorisk årsak på kreditnota
-- Kjør i Supabase SQL Editor. Idempotent (trygt å kjøre flere ganger).
--
-- ENDRINGER fra v35:
--   * Ny kolonne invoices.credit_reason — årsaken til krediteringen, lagret på
--     selve kreditnotaen. Vises i appens detaljvisning og på PDF-en («Årsak: …»).
--   * create_credit_note AVVISER nå tom/NULL p_reason (server-side validering —
--     UI-en validerer også, men RPC-en er sannhetskilden).
--   * Kreditnotaens note-felt settes ikke lenger (v35 la årsaken der med
--     fallback-tekst); årsaken bor nå entydig i credit_reason. Eksisterende
--     rader røres IKKE.

-- ── STEG 1: Årsak-kolonne ────────────────────────────────────────────────────
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS credit_reason TEXT;

-- ── STEG 2: create_credit_note med påkrevd årsak ─────────────────────────────
-- Uendret fra v35 bortsett fra: (1) validering av p_reason øverst,
-- (2) INSERT skriver credit_reason i stedet for note.
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
  v_reason     TEXT := NULLIF(btrim(COALESCE(p_reason, '')), '');
BEGIN
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Ingen tilknyttet firma';
  END IF;
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Kun admin kan opprette kreditnota';
  END IF;

  -- Årsak er obligatorisk (v36): en kreditnota skal alltid dokumentere hvorfor
  -- originalen krediteres.
  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'Oppgi en årsak for kreditnotaen';
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
    status, due_date, credits_invoice_id, credit_reason
  ) VALUES (
    v_orig.company_id, v_orig.job_id, v_new_number,
    v_orig.customer_name, v_orig.customer_address, v_orig.customer_email,
    v_neg_lines, -v_orig.subtotal_ex_vat, -v_orig.vat, -v_orig.total,
    'credited', CURRENT_DATE, v_orig.id, v_reason
  )
  RETURNING * INTO v_credit;

  -- Merk originalen som kreditert (beholdes i regnskapet, motpostert).
  UPDATE invoices SET status = 'credited' WHERE id = v_orig.id;

  RETURN to_jsonb(v_credit);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_credit_note(UUID, TEXT) TO authenticated;
