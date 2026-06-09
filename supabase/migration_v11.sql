-- migration_v11.sql — Opprett tekniker med ekte Supabase Auth-konto og midlertidig passord
-- Kjør i Supabase SQL Editor

CREATE OR REPLACE FUNCTION create_technician_with_password(
  p_name     text,
  p_email    text,
  p_phone    text,
  p_password text
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
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

  IF length(p_password) < 6 THEN
    RAISE EXCEPTION 'Passordet må ha minst 6 tegn';
  END IF;

  -- Sjekk om e-posten allerede eksisterer i auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = lower(p_email);

  IF v_user_id IS NULL THEN
    -- Opprett ny auth-bruker
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
      v_user_id,
      'authenticated',
      'authenticated',
      lower(p_email),
      crypt(p_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(), now(),
      '', '', '', ''
    );
  END IF;

  -- Opprett eller oppdater profil
  INSERT INTO profiles (id, name, email, phone, role, company_id)
  VALUES (v_user_id, p_name, lower(p_email), p_phone, 'technician', v_company_id)
  ON CONFLICT (id) DO UPDATE SET
    name        = EXCLUDED.name,
    phone       = EXCLUDED.phone,
    company_id  = EXCLUDED.company_id,
    role        = 'technician';

  RETURN json_build_object(
    'id',         v_user_id,
    'name',       p_name,
    'email',      lower(p_email),
    'phone',      p_phone,
    'role',       'technician',
    'company_id', v_company_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_technician_with_password TO authenticated;
