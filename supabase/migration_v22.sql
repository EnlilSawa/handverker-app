-- Migration v22: Lukk telefon→e-post anon-orakelet (audit #5)
-- Kjør i Supabase SQL Editor. Idempotent.
--
-- PROBLEM:
--   get_email_by_phone / get_emails_by_phone var GRANT'et til anon, slik at hvem
--   som helst med anon-nøkkelen kunne oversette et telefonnummer → e-post
--   (PII / enumerering). Brukt under tekniker-innlogging.
--
-- FIX:
--   Innlogging med telefon går nå via edge-funksjonen `phone-login`, som gjør
--   oppslaget + passordverifisering server-side (service role) og returnerer KUN
--   en session. Klienten kaller derfor ikke disse RPC-ene lenger → trekk tilbake
--   tilgangen for anon/authenticated/public. (service_role beholder tilgang, men
--   edge-funksjonen spør profiles direkte og trenger dem strengt tatt ikke.)

REVOKE EXECUTE ON FUNCTION get_email_by_phone(TEXT)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_emails_by_phone(TEXT) FROM PUBLIC, anon, authenticated;
