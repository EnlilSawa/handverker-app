-- Migration v2: Prøveperiode, abonnement og firmaopprettelse via RPC
-- Kjør i Supabase SQL Editor

-- 1. Legg til kolonner i companies-tabellen
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS trial_ends_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial','active','expired','canceled')),
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_customer_id    TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Eksisterende bedrifter: marker som aktive (de har allerede betalt / er seed-data)
UPDATE companies SET subscription_status = 'active', onboarding_completed = true
  WHERE onboarding_completed = false;

-- 2. RPC: Opprett firma atomisk og gjør kalleren til admin
--    Bruker SECURITY DEFINER for å omgå RLS uten å trenge en Edge Function.
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
    NOW() + INTERVAL '30 days', 'trial', true
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
