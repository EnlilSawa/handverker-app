-- migration_v12.sql — Venteliste for efero-web "Kommer snart"-side
-- Kjør i Supabase SQL Editor

CREATE TABLE IF NOT EXISTS waitlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  source     text NOT NULL DEFAULT 'website'
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
-- Ingen policies — all tilgang skjer via SECURITY DEFINER-funksjonene under,
-- som kjører med eierens rettigheter uavhengig av RLS.
-- Offentlig INSERT via add_to_waitlist(), ingen offentlig SELECT.

-- Returnerer antall påmeldte + grunntall (47, for sosialt bevis)
CREATE OR REPLACE FUNCTION get_waitlist_count()
RETURNS int LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 47 + COUNT(*)::int FROM waitlist;
$$;

GRANT EXECUTE ON FUNCTION get_waitlist_count TO anon, authenticated;

-- Melder en e-post på ventelisten. Returnerer 'exists' hvis den allerede er registrert.
CREATE OR REPLACE FUNCTION add_to_waitlist(p_email text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(p_email));
BEGIN
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Ugyldig e-postadresse';
  END IF;

  IF EXISTS (SELECT 1 FROM waitlist WHERE email = v_email) THEN
    RETURN json_build_object('status', 'exists', 'count', get_waitlist_count());
  END IF;

  INSERT INTO waitlist (email) VALUES (v_email);

  RETURN json_build_object('status', 'added', 'count', get_waitlist_count());
END;
$$;

GRANT EXECUTE ON FUNCTION add_to_waitlist TO anon, authenticated;
