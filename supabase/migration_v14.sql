-- Migration v14: Onboarding fullføres eksplisitt av veiviseren.
-- Tidligere satte setup_company onboarding_completed = true med en gang, slik at
-- veiviseren forsvant før suksess-skjermen rakk å vises. Nå opprettes firmaet med
-- onboarding_completed = false, og complete_onboarding() markerer den true først når
-- brukeren har gått gjennom hele veiviseren og trykker «Gå til Jobbtavlen».
-- Kjør i Supabase SQL Editor.

-- 1. setup_company: identisk med før, men onboarding_completed settes nå til FALSE.
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
    NOW() + INTERVAL '30 days', 'trial', false   -- ← var true; settes nå true av complete_onboarding()
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

-- 2. complete_onboarding: markerer kallerens firma som ferdig onboardet.
CREATE OR REPLACE FUNCTION complete_onboarding()
  RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_company_id UUID;
  v_result     JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Ikke autentisert';
  END IF;

  SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Ingen bedrift å fullføre onboarding for';
  END IF;

  UPDATE companies SET onboarding_completed = true WHERE id = v_company_id;

  SELECT row_to_json(c)::JSONB INTO v_result
    FROM companies c WHERE c.id = v_company_id;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_onboarding TO authenticated;
