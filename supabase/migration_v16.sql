-- Migration v16: Fikser RLS data-isolasjonslekkasje.
--
-- Bakgrunn: fix_rls.sql erstattet de firma-scopede policyene med
--   FOR ALL USING (is_admin_user())
-- på profiles/jobs/invoices (+ companies via «is_admin_user() OR ...»). is_admin_user()
-- sjekker kun role='admin' UTEN firma-grense, så ENHVER admin fikk lese/endre ALLE
-- firmaers rader. Verifisert: et tomt testfirma så 14 jobber, 11 fakturaer, 3 firmaer
-- og 10 profiler fra andre firmaer.
--
-- Fiks: gjeninnfør firma-scoping. For å unngå RLS-rekursjon på profiles brukes en
-- SECURITY DEFINER-hjelpefunksjon som leser company_id uten å trigge RLS (samme
-- mønster som is_admin_user()).
-- Kjør i Supabase SQL Editor.

-- Hjelpefunksjon: kallerens company_id (bypasser RLS → ingen rekursjon i policyene)
CREATE OR REPLACE FUNCTION current_user_company_id() RETURNS uuid
  LANGUAGE sql SECURITY DEFINER STABLE
  SET search_path = public
  AS $$ SELECT company_id FROM profiles WHERE id = auth.uid(); $$;

GRANT EXECUTE ON FUNCTION current_user_company_id() TO authenticated;

-- ── profiles ──────────────────────────────────────────────────────────────
-- Beholder eksisterende «Bruker ser egen profil» (FOR SELECT, id = auth.uid()).
-- Admin får tilgang til profiler KUN i eget firma.
DROP POLICY IF EXISTS "Admin ser alle profiler" ON profiles;
CREATE POLICY "Admin profiler i eget selskap" ON profiles FOR ALL
  USING (is_admin_user() AND company_id = current_user_company_id())
  WITH CHECK (is_admin_user() AND company_id = current_user_company_id());

-- ── jobs ──────────────────────────────────────────────────────────────────
-- Beholder eksisterende tekniker-policyer (egne/tildelte jobber).
-- Admin får tilgang til jobber KUN i eget firma.
DROP POLICY IF EXISTS "Admin ser alle jobber" ON jobs;
CREATE POLICY "Admin jobber i eget selskap" ON jobs FOR ALL
  USING (is_admin_user() AND company_id = current_user_company_id())
  WITH CHECK (is_admin_user() AND company_id = current_user_company_id());

-- ── invoices ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin ser alle fakturaer" ON invoices;
CREATE POLICY "Admin fakturaer i eget selskap" ON invoices FOR ALL
  USING (is_admin_user() AND company_id = current_user_company_id())
  WITH CHECK (is_admin_user() AND company_id = current_user_company_id());

-- ── companies ─────────────────────────────────────────────────────────────
-- Alle ser KUN eget firma (fjernet «is_admin_user() OR ...» som lekket alle firmaer).
DROP POLICY IF EXISTS "Bruker ser eget selskap" ON companies;
CREATE POLICY "Bruker ser eget selskap" ON companies FOR SELECT
  USING (id = current_user_company_id());

DROP POLICY IF EXISTS "Admin oppdaterer eget selskap" ON companies;
CREATE POLICY "Admin oppdaterer eget selskap" ON companies FOR UPDATE
  USING (id = current_user_company_id() AND is_admin_user())
  WITH CHECK (id = current_user_company_id() AND is_admin_user());
