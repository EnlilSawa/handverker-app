-- Migration v21: Fiks telefon-innlogging når et nummer deles av flere kontoer
-- Kjør i Supabase SQL Editor. Idempotent.
--
-- BUG:
--   Tekniker-innlogging med telefon slo opp e-post via get_email_by_phone(), som
--   gjør `SELECT email ... WHERE phone = p_phone LIMIT 1` UTEN sortering. Når samme
--   telefonnummer finnes på flere profiler (f.eks. en admin OG en tekniker med
--   samme nummer — typisk eierens egen testkonto), returnerte den et vilkårlig
--   treff (admin-en). Teknikeren forsøkte da å logge inn på ADMIN-kontoen med
--   teknikerens passord → feilet. Derfor «tekniker kan kun logge inn med e-post».
--
-- FIX:
--   Ny get_emails_by_phone() returnerer ALLE e-poster som matcher nummeret,
--   teknikere først. Klienten prøver hver e-post med oppgitt passord til én
--   lykkes — passordet avgjør riktig konto. Robust også for fremtidige duplikater.

CREATE OR REPLACE FUNCTION get_emails_by_phone(p_phone TEXT)
RETURNS SETOF TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM profiles
  WHERE phone = p_phone
    AND email IS NOT NULL
  ORDER BY (role = 'technician') DESC, email;  -- teknikere først
$$;

-- Kalles under innlogging FØR brukeren er autentisert → må være kjørbar av anon.
GRANT EXECUTE ON FUNCTION get_emails_by_phone(TEXT) TO anon, authenticated;
