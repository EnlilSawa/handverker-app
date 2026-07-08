-- Migration v28: KRITISK fiks — handle_new_user opprettet aldri profil for nye
-- signups fordi funksjonen manglet `SET search_path`. I SECURITY DEFINER-triggeren
-- (kjørt av GoTrue ved auth.users-insert) var ikke `public` i search_path, så
-- `INSERT INTO profiles` feilet med 42P01 "relation profiles does not exist" — og
-- den ytre `EXCEPTION WHEN OTHERS` svelget feilen. Resultat: nye kunder fikk auth-
-- bruker men INGEN profil → satt fast (onboarding/innlogging virket ikke).
-- Fix: `SET search_path = public` + schema-kvalifiser tabellnavnene.
-- Kjør i Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- 1. Profil (kritisk). role/company_id er IKKE klient-styrt (audit #1/migration_v18).
  INSERT INTO public.profiles (id, name, email, phone, role, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    'technician',  -- ALLTID technician ved opprettelse; oppgraderes kun via setup_company()
    NULL           -- ALLTID NULL; settes kun av setup_company()/create_technician_with_password()
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Leads (valgfritt — isolert exception så feil her ikke ruller tilbake profilen).
  BEGIN
    IF NEW.raw_user_meta_data->>'company_id' IS NULL THEN
      INSERT INTO public.leads (email, name, phone)
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
$function$;
