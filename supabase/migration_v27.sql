-- Migration v27: Superadmin kan eksportere en kundes fulle datasett (JSON).
-- Brukes ved offboarding FØR permanent sletting, slik at kunden får sine egne
-- data (fakturaer m.m.) og kan oppfylle sin egen bokføringsplikt (5 år), og
-- Efero oppfyller dataportabilitet/retur-plikten i databehandleravtalen.
-- Kjør i Supabase SQL Editor.

CREATE OR REPLACE FUNCTION superadmin_export_company(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v JSONB;
BEGIN
  IF NOT is_superadmin() THEN RAISE EXCEPTION 'Ikke autorisert'; END IF;
  SELECT jsonb_build_object(
    'exported_at', NOW(),
    'company',    (SELECT to_jsonb(c) FROM companies c WHERE c.id = p_company_id),
    'profiles',   (SELECT COALESCE(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM profiles x  WHERE x.company_id = p_company_id),
    'customers',  (SELECT COALESCE(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM customers x WHERE x.company_id = p_company_id),
    'jobs',       (SELECT COALESCE(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM jobs x      WHERE x.company_id = p_company_id),
    'invoices',   (SELECT COALESCE(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM invoices x  WHERE x.company_id = p_company_id),
    'quotes',     (SELECT COALESCE(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM quotes x    WHERE x.company_id = p_company_id),
    'job_notes',  (SELECT COALESCE(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM job_notes x WHERE x.company_id = p_company_id),
    'job_images', (SELECT COALESCE(jsonb_agg(to_jsonb(x)), '[]'::jsonb) FROM job_images x WHERE x.company_id = p_company_id)
  ) INTO v;
  IF (v->'company') IS NULL THEN
    RAISE EXCEPTION 'Firma ikke funnet';
  END IF;
  RETURN v;
END;
$$;
GRANT EXECUTE ON FUNCTION superadmin_export_company(UUID) TO authenticated;
