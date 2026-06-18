-- Migration v23: Gjør job-images privat med signerte URL-er (audit #6)
-- Kjør i Supabase SQL Editor. Idempotent.
--
-- PROBLEM:
--   job-images-bucketen var public OG hadde en RLS-policy «Anyone can view job
--   images» (SELECT til public). Kundebilder fra jobber var dermed world-readable
--   for alle med lenken — uten tilgangskontroll.
--
-- FIX:
--   1. Sett bucketen privat → den offentlige /object/public/-endepunktet slutter
--      å servere filene.
--   2. Dropp den offentlige SELECT-policyen → eneste lesevei er nå en signert URL
--      laget av service role (edge function `sign-job-images`, etter autorisasjon).
--   Opplasting (INSERT) og sletting er uendret. company-logos forblir public
--   (e-postlogo må kunne lastes av eksterne e-postklienter).
--
-- TILBAKEROLLING (hvis nødvendig):
--   UPDATE storage.buckets SET public = true WHERE id = 'job-images';
--   CREATE POLICY "Anyone can view job images" ON storage.objects
--     FOR SELECT TO public USING (bucket_id = 'job-images');

UPDATE storage.buckets SET public = false WHERE id = 'job-images';

DROP POLICY IF EXISTS "Anyone can view job images" ON storage.objects;

-- Datahygiene: rett opp job_images.company_id som avviker fra jobbens firma
-- (rester fra kryss-firma-data før v16). Autorisasjon skjer på jobbens eierskap,
-- men kolonnen bør være konsistent.
UPDATE job_images ji
  SET company_id = j.company_id
  FROM jobs j
  WHERE j.id = ji.job_id
    AND ji.company_id IS DISTINCT FROM j.company_id;
