-- Fix: Nested exception handlers so profile insert survives leads insert failures.
-- In PostgreSQL, a single EXCEPTION block rolls back ALL statements before the error.
-- Solution: wrap leads insert in its own inner BEGIN...EXCEPTION block.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Profil (kritisk — må lykkes)
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

  -- 2. Leads (valgfritt — egen exception-blokk så feil her ikke ruller tilbake profilen)
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

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Opprett profil manuelt for eksisterende bruker som ble rammet av buggen
INSERT INTO profiles (id, name, email, phone, role, company_id)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  email,
  raw_user_meta_data->>'phone',
  'technician',
  NULL
FROM auth.users
WHERE email = 'enlil.sawa@hotmail.com'
ON CONFLICT (id) DO NOTHING;
