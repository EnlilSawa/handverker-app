-- Migration v3: E-postbekreftelse + leads-tabell for markedsføring
-- Kjør i Supabase SQL Editor

-- 1. Leads-tabell: fanger alle selvregistreringer for markedsføring
CREATE TABLE IF NOT EXISTS leads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL UNIQUE,
  name         TEXT,
  phone        TEXT,
  confirmed_at TIMESTAMPTZ,   -- fylles inn når e-post bekreftes
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
-- Ingen offentlige policies — kun service role / SQL Editor har tilgang

-- 2. Oppdater handle_new_user: logg selvregistreringer til leads
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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

  -- Kun selvregistreringer (ikke inviterte teknikere som allerede har company_id)
  IF NEW.raw_user_meta_data->>'company_id' IS NULL THEN
    INSERT INTO leads (email, name, phone)
    VALUES (
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      NEW.raw_user_meta_data->>'phone'
    )
    ON CONFLICT (email) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger: sett confirmed_at i leads når bruker bekrefter e-post
CREATE OR REPLACE FUNCTION handle_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE leads SET confirmed_at = NEW.email_confirmed_at WHERE email = NEW.email;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_email_confirmed ON auth.users;
CREATE TRIGGER on_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_email_confirmed();
