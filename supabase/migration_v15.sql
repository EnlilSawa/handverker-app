-- Migration v15: Fikser create_technician_with_password.
-- Den tidligere (direkte-kjørte) versjonen feilet med
--   «column "id" is of type uuid but expression is of type text» (42804)
-- fordi auth.identities-inserten satte feil type på id/provider_id.
-- I nyere Supabase er auth.identities.id en uuid med default gen_random_uuid(),
-- mens provider_id er text. Denne versjonen utelater id (bruker defaulten) og
-- setter provider_id som text. auth.identities.email er en generert kolonne og
-- skal derfor IKKE settes manuelt.
-- Kjør i Supabase SQL Editor.

CREATE OR REPLACE FUNCTION create_technician_with_password(
  p_name     text,
  p_email    text,
  p_phone    text,
  p_password text
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, extensions
AS $func$
DECLARE
  v_user_id    uuid;
  v_company_id uuid;
BEGIN
  -- Kun admin i eget firma kan opprette teknikere
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE id = auth.uid() AND role = 'admin';

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Kun admin kan legge til teknikere';
  END IF;

  IF length(p_password) < 8 THEN
    RAISE EXCEPTION 'Passordet må ha minst 8 tegn';
  END IF;

  -- Finnes brukeren allerede?
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = lower(p_email);

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role,
      email, encrypted_password,
      email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated',
      lower(p_email), crypt(p_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}', '{}',
      now(), now(), '', '', '', ''
    );

    -- Identitet for e-post/passord-pålogging (kreves av nyere GoTrue).
    -- id utelates (uuid-default), provider_id er text, email er generert kolonne.
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_user_id::text,
      v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', lower(p_email),
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(), now(), now()
    )
    ON CONFLICT (provider, provider_id) DO NOTHING;
  END IF;

  -- Opprett eller oppdater profil
  INSERT INTO profiles (id, name, email, phone, role, company_id)
  VALUES (v_user_id, p_name, lower(p_email), p_phone, 'technician', v_company_id)
  ON CONFLICT (id) DO UPDATE SET
    name       = EXCLUDED.name,
    phone      = EXCLUDED.phone,
    company_id = EXCLUDED.company_id,
    role       = 'technician';

  RETURN json_build_object(
    'id',         v_user_id,
    'name',       p_name,
    'email',      lower(p_email),
    'phone',      p_phone,
    'role',       'technician',
    'company_id', v_company_id
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION create_technician_with_password TO authenticated;
