-- Migration v31: Efero-opprettede kunder får en kort førstegangs-veiviser.
-- superadmin_create_company() setter nå onboarding_completed = FALSE (var TRUE).
-- Kunden logger inn og møter en trimmet setup-wizard (timepris → teknikere → logo)
-- som sikrer at fakturering funker fra dag 1, uten å spørre om firmadata Efero
-- allerede tastet. Alt annet er identisk med v29 (aktivt firma, bekreftet e-post,
-- admin-profil). Kun superadmin (is_superadmin). Kjør i Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.superadmin_create_company(
  p_company_name      TEXT,
  p_contact_name      TEXT,
  p_admin_email       TEXT,
  p_password          TEXT,
  p_org_number        TEXT    DEFAULT NULL,
  p_hourly_rate       NUMERIC DEFAULT 0,
  p_subscription_plan TEXT    DEFAULT NULL,
  p_monthly_amount    NUMERIC DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  v_user_id    uuid;
  v_company_id uuid;
  v_email      text := lower(trim(p_admin_email));
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Ikke autorisert';
  END IF;
  IF p_company_name IS NULL OR length(trim(p_company_name)) = 0 THEN
    RAISE EXCEPTION 'Firmanavn mangler';
  END IF;
  IF v_email IS NULL OR position('@' IN v_email) = 0 THEN
    RAISE EXCEPTION 'Ugyldig e-post';
  END IF;
  IF length(p_password) < 8 THEN
    RAISE EXCEPTION 'Passordet må ha minst 8 tegn';
  END IF;
  IF p_subscription_plan IS NOT NULL AND p_subscription_plan NOT IN ('liten','middels','stor') THEN
    RAISE EXCEPTION 'Ugyldig pakke: %', p_subscription_plan;
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE EXCEPTION 'E-posten er allerede i bruk';
  END IF;

  -- 1. Firma — aktivt, men onboarding IKKE fullført: kunden får setup-wizarden
  --    ved første innlogging (timepris/teknikere/logo). Se OnboardingWizard.tsx.
  INSERT INTO companies (
    name, org_number, hourly_rate, callout_fee, payment_terms_days,
    trial_ends_at, subscription_status, onboarding_completed,
    email, subscription_plan, monthly_amount
  ) VALUES (
    trim(p_company_name), NULLIF(trim(COALESCE(p_org_number,'')), ''),
    COALESCE(p_hourly_rate, 0), 0, 14,
    now() + interval '30 days', 'active', false,
    v_email, p_subscription_plan, COALESCE(p_monthly_amount, 0)
  )
  RETURNING id INTO v_company_id;

  -- 2. Auth-bruker med passord + BEKREFTET e-post (kan logge inn umiddelbart).
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (
    instance_id, id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated',
    v_email, crypt(p_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id::text, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email,
                       'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- 3. Profil = admin for firmaet. Upsert i tilfelle handle_new_user-triggeren
  --    allerede lagde en (technician/null) ved auth.users-insertet.
  INSERT INTO profiles (id, name, email, role, company_id)
  VALUES (v_user_id, trim(p_contact_name), v_email, 'admin', v_company_id)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, role = 'admin', company_id = EXCLUDED.company_id;

  RETURN json_build_object(
    'company_id', v_company_id,
    'user_id', v_user_id,
    'company_name', trim(p_company_name),
    'email', v_email
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.superadmin_create_company(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, NUMERIC) TO authenticated;
