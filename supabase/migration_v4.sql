-- Migration v4: Legg til teknikere uten edge function
-- Fjerner FK-constraint på profiles.id så admin kan opprette placeholder-profiler
-- for teknikere som ikke har registrert seg ennå.

-- 1. Fjern FK-constraint (profiles.id trenger ikke lenger matche auth.users.id)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Legg til unik constraint på email (kreves for ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_unique'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  END IF;
END $$;

-- 3. Funksjon: admin legger til tekniker (oppretter placeholder-profil)
CREATE OR REPLACE FUNCTION add_technician_to_team(p_name text, p_email text, p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
  v_profile jsonb;
BEGIN
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE id = auth.uid() AND role = 'admin';

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Ikke autorisert: kun admin kan legge til teknikere';
  END IF;

  INSERT INTO profiles (id, name, email, phone, role, company_id)
  VALUES (gen_random_uuid(), p_name, lower(trim(p_email)), p_phone, 'technician', v_company_id)
  ON CONFLICT (email) DO UPDATE SET
    name    = EXCLUDED.name,
    phone   = EXCLUDED.phone,
    role    = 'technician',
    company_id = v_company_id
  RETURNING to_jsonb(profiles.*) INTO v_profile;

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION add_technician_to_team TO authenticated;

-- 4. Oppdater handle_new_user: når invitert tekniker registrerer seg,
--    oppdater placeholder-profilen med riktig auth-id i stedet for å opprette ny.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_placeholder_id uuid;
BEGIN
  -- Sjekk om en placeholder-profil finnes med samme e-post
  SELECT id INTO v_placeholder_id
  FROM profiles
  WHERE lower(email) = lower(NEW.email) AND id != NEW.id
  LIMIT 1;

  IF v_placeholder_id IS NOT NULL THEN
    -- Oppdater placeholder til å bruke ekte auth-id
    UPDATE profiles SET id = NEW.id WHERE id = v_placeholder_id;
  ELSE
    -- Ny bruker uten placeholder — opprett profil normalt
    INSERT INTO profiles (id, name, email, phone, role, company_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      NEW.email,
      NEW.raw_user_meta_data->>'phone',
      COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'technician'),
      (NEW.raw_user_meta_data->>'company_id')::UUID
    )
    ON CONFLICT (id) DO NOTHING;

    -- Leads (isolert exception-blokk)
    BEGIN
      IF NEW.raw_user_meta_data->>'company_id' IS NULL THEN
        INSERT INTO leads (email, name, phone)
        VALUES (
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
          NEW.raw_user_meta_data->>'phone'
        )
        ON CONFLICT (email) DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
