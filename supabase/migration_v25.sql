-- Migration v25: Fakturamodell i stedet for Stripe-selvbetjening.
-- Kunder får DIREKTE tilgang etter onboarding (subscription_status = 'active'),
-- og Efero-eieren fakturerer manuelt + følger opp via superadmin-dashbordet
-- (billing_status: ikke_fakturert → fakturert → betalt). Tilgang stenges kun ved
-- at eieren setter firmaet til 'canceled'/'expired' (superadmin_update_company).
-- Stripe-checkout/-webhook er fjernet fra kodebasen.
-- Kjør i Supabase SQL Editor.

-- 1. setup_company: nye firmaer opprettes som 'active' (var 'trial').
--    Resten er identisk med v14 (onboarding_completed = false, settes true av
--    complete_onboarding() når veiviseren er ferdig).
CREATE OR REPLACE FUNCTION setup_company(
  p_name              TEXT,
  p_org_number        TEXT,
  p_address           TEXT,
  p_hourly_rate       NUMERIC,
  p_callout_fee       NUMERIC,
  p_payment_terms_days INTEGER
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_company_id UUID;
  v_result     JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Ikke autentisert';
  END IF;

  IF (SELECT company_id FROM profiles WHERE id = auth.uid()) IS NOT NULL THEN
    RAISE EXCEPTION 'Profilen er allerede koblet til et firma';
  END IF;

  INSERT INTO companies (
    name, org_number, address,
    hourly_rate, callout_fee, payment_terms_days,
    trial_ends_at, subscription_status, onboarding_completed
  ) VALUES (
    p_name, p_org_number, p_address,
    p_hourly_rate, p_callout_fee, p_payment_terms_days,
    NOW() + INTERVAL '30 days', 'active', false   -- ← var 'trial'; fakturamodell = direkte tilgang
  )
  RETURNING id INTO v_company_id;

  UPDATE profiles
    SET company_id = v_company_id, role = 'admin'
    WHERE id = auth.uid();

  SELECT row_to_json(c)::JSONB INTO v_result
    FROM companies c WHERE c.id = v_company_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION setup_company TO authenticated;

-- 2. Backfill: gi alle eksisterende kunder direkte tilgang (unntatt de eieren
--    bevisst har stengt = 'canceled'). Ingen skal møte paywall utilsiktet.
UPDATE companies
  SET subscription_status = 'active'
  WHERE subscription_status IN ('trial', 'expired');
