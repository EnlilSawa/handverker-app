-- Migration v18: SIKKERHET — handle_new_user() må aldri stole på klient-oppgitt role/company_id
-- Kjør i Supabase SQL Editor. Idempotent (CREATE OR REPLACE).
--
-- PROBLEM (kritisk privilegieeskalering):
--   Selvregistrering går via supabase.auth.signUp med klient-kontrollert
--   raw_user_meta_data. Den gamle triggeren leste role OG company_id derfra:
--     COALESCE((meta->>'role')::user_role, 'technician'),
--     (meta->>'company_id')::UUID
--   En angriper kunne dermed kalle signUp med
--     { role: 'admin', company_id: '<offerets firma>' }
--   og bli admin i et fremmed firma (anon-nøkkelen ligger i klienten, så
--   endepunktet er reelt tilgjengelig for angripere).
--
-- FIX:
--   Triggeren tvinger nå ALLTID role = 'technician' og company_id = NULL ved
--   selvregistrering, og ignorerer klient-oppgitt role/company_id fullstendig.
--   Navn/telefon/e-post fylles fortsatt fra metadata/auth (ikke-privilegert).
--
-- TRYGT for eksisterende flyter:
--   * Onboarding: setup_company() (SECURITY DEFINER) setter role='admin' +
--     company_id via egen UPDATE etterpå — påvirkes ikke.
--   * Teknikere: create_technician_with_password() (admin-only RPC) gjør en
--     eksplisitt upsert av profilen med riktig company_id ETTER at brukeren er
--     opprettet (ON CONFLICT (id) DO UPDATE SET company_id = ...). Den er ikke
--     avhengig av at triggeren leser company_id fra metadata.
--   ⚠️ Merk: en eventuell fremtidig invitasjons-flyt (invite-technician edge
--      function) kan IKKE lenger lene seg på metadata->>'company_id' i triggeren.
--      Den må sette profilens company_id server-side etter opprettelse, slik
--      create_technician_with_password() allerede gjør.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Profil (kritisk — må lykkes). role/company_id er IKKE klient-styrt.
  INSERT INTO profiles (id, name, email, phone, role, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    'technician',  -- ALLTID technician ved opprettelse; oppgraderes kun via setup_company()
    NULL           -- ALLTID NULL; settes kun av setup_company()/create_technician_with_password()
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Leads (valgfritt — egen exception-blokk så feil her ikke ruller tilbake profilen).
  --    Logger selvregistreringer (de uten company_id i metadata) for markedsføring.
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
