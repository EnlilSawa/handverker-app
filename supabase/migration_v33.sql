-- Migration v33: Kunden godtar/avslår tilbud selv via offentlig e-postlenke.
-- Legger til en hemmelig public_token pr. tilbud + to SECURITY DEFINER-RPC-er som
-- den offentlige tilbudssiden (efero.no/tilbud/[id]?t=token) bruker uten innlogging:
--   get_public_quote(id, token)  → henter tilbudet hvis token stemmer
--   respond_to_quote(id, token, action, name?, reason?) → godta/avslå
-- Token er en uuid (ugjettbar) → ingen enumerering. Kjør i Supabase SQL Editor.

-- 1. Hemmelig token pr. tilbud (nye tilbud får en automatisk, gamle backfilles).
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS public_token TEXT;
UPDATE quotes SET public_token = gen_random_uuid()::text WHERE public_token IS NULL;
ALTER TABLE quotes ALTER COLUMN public_token SET DEFAULT gen_random_uuid()::text;
CREATE UNIQUE INDEX IF NOT EXISTS quotes_public_token_idx ON quotes(public_token);

-- 2. Offentlig henting (token-gated, bypasser RLS via SECURITY DEFINER).
CREATE OR REPLACE FUNCTION public.get_public_quote(p_quote_id uuid, p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_q       quotes%ROWTYPE;
  v_company companies%ROWTYPE;
BEGIN
  SELECT * INTO v_q FROM quotes WHERE id = p_quote_id;
  IF v_q.id IS NULL OR v_q.public_token IS NULL OR v_q.public_token <> p_token THEN
    RETURN NULL; -- ugyldig lenke
  END IF;
  SELECT * INTO v_company FROM companies WHERE id = v_q.company_id;

  RETURN json_build_object(
    'id', v_q.id,
    'quoteNumber', v_q.quote_number,
    'title', v_q.title,
    'description', v_q.description,
    'customerName', v_q.customer_name,
    'lines', v_q.lines,
    'subtotalExVat', v_q.subtotal_ex_vat,
    'vat', v_q.vat,
    'totalAmount', v_q.total_amount,
    'status', v_q.status,
    'validUntil', v_q.valid_until,
    'acceptedByName', v_q.accepted_by_name,
    'acceptedAt', v_q.accepted_at,
    'declinedReason', v_q.declined_reason,
    'companyName', v_company.name,
    'companyLogoUrl', v_company.logo_url
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_quote(uuid, text) TO anon, authenticated;

-- 3. Offentlig svar: godta/avslå (kun mens status='pending' og ikke utløpt).
CREATE OR REPLACE FUNCTION public.respond_to_quote(
  p_quote_id uuid,
  p_token    text,
  p_action   text,
  p_name     text DEFAULT NULL,
  p_reason   text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_q quotes%ROWTYPE;
BEGIN
  SELECT * INTO v_q FROM quotes WHERE id = p_quote_id FOR UPDATE;
  IF v_q.id IS NULL OR v_q.public_token IS NULL OR v_q.public_token <> p_token THEN
    RETURN json_build_object('ok', false, 'error', 'invalid');
  END IF;
  IF p_action NOT IN ('accept', 'decline') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_action');
  END IF;
  IF v_q.status <> 'pending' THEN
    RETURN json_build_object('ok', false, 'error', 'already', 'status', v_q.status);
  END IF;
  IF v_q.valid_until < CURRENT_DATE THEN
    UPDATE quotes SET status = 'expired' WHERE id = p_quote_id;
    RETURN json_build_object('ok', false, 'error', 'expired');
  END IF;

  IF p_action = 'accept' THEN
    UPDATE quotes SET
      status = 'accepted',
      accepted_at = now(),
      accepted_by_name = COALESCE(NULLIF(trim(p_name), ''), v_q.customer_name)
    WHERE id = p_quote_id;
    RETURN json_build_object('ok', true, 'status', 'accepted');
  ELSE
    UPDATE quotes SET
      status = 'declined',
      declined_reason = NULLIF(trim(p_reason), '')
    WHERE id = p_quote_id;
    RETURN json_build_object('ok', true, 'status', 'declined');
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.respond_to_quote(uuid, text, text, text, text) TO anon, authenticated;
