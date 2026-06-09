-- migration_v11b.sql — Admin-funksjon for å tilbakestille tekniker-passord + oppdater minstlengde til 8
-- Kjør i Supabase SQL Editor

-- Oppdater create_technician_with_password til å kreve 8 tegn
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
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE id = auth.uid() AND role = 'admin';

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Kun admin kan legge til teknikere';
  END IF;

  IF length(p_password) < 8 THEN
    RAISE EXCEPTION 'Passordet må ha minst 8 tegn';
  END IF;

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
  END IF;

  INSERT INTO profiles (id, name, email, phone, role, company_id)
  VALUES (v_user_id, p_name, lower(p_email), p_phone, 'technician', v_company_id)
  ON CONFLICT (id) DO UPDATE SET
    name       = EXCLUDED.name,
    phone      = EXCLUDED.phone,
    company_id = EXCLUDED.company_id,
    role       = 'technician';

  RETURN json_build_object(
    'id', v_user_id, 'name', p_name, 'email', lower(p_email),
    'phone', p_phone, 'role', 'technician', 'company_id', v_company_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_technician_with_password TO authenticated;

-- Ny funksjon: admin tilbakestiller passord for en tekniker i eget team
CREATE OR REPLACE FUNCTION reset_technician_password(
  p_user_id    uuid,
  p_new_password text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_company_id      uuid;
  v_tech_company_id uuid;
BEGIN
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE id = auth.uid() AND role = 'admin';

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Kun admin kan tilbakestille passord';
  END IF;

  SELECT company_id INTO v_tech_company_id
  FROM profiles
  WHERE id = p_user_id AND role = 'technician';

  IF v_tech_company_id IS NULL OR v_tech_company_id <> v_company_id THEN
    RAISE EXCEPTION 'Tekniker ikke funnet i ditt team';
  END IF;

  IF length(p_new_password) < 8 THEN
    RAISE EXCEPTION 'Passordet må ha minst 8 tegn';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at         = now()
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_technician_password TO authenticated;
