-- Migration v30: Robustgjør superadmin_delete_company mot kryss-firma-referanser.
-- Forrige versjon (v26) slettet kun etter company_id. Hvis et ANNET firmas rad
-- refererte til en jobb i firmaet som slettes (f.eks. en EFERO-faktura med job_id
-- mot en slettet jobb — pre-RLS-fiks-forurensning), feilet DELETE FROM jobs med
-- FK 23503. Nå løsnes slike referanser først (NULL job_id / assigned_technician_id
-- / customer_id), og barn slettes også via job_id, så sletting alltid går gjennom.
-- Kjør i Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.superadmin_delete_company(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_ids UUID[];
  v_job_ids  UUID[];
  v_cust_ids UUID[];
BEGIN
  IF NOT is_superadmin() THEN RAISE EXCEPTION 'Ikke autorisert'; END IF;

  -- Superadmin kan ikke slette sitt eget firma ved et uhell.
  IF p_company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Kan ikke slette ditt eget firma';
  END IF;

  SELECT array_agg(id) INTO v_user_ids FROM profiles  WHERE company_id = p_company_id;
  SELECT array_agg(id) INTO v_job_ids  FROM jobs       WHERE company_id = p_company_id;
  SELECT array_agg(id) INTO v_cust_ids FROM customers  WHERE company_id = p_company_id;

  -- Løsne kryss-firma-referanser INN i radene vi sletter (beholder andre firmaers
  -- rader, f.eks. EFERO-fakturaer — kun selve koblingen fjernes).
  UPDATE invoices SET job_id = NULL WHERE job_id = ANY(v_job_ids);
  UPDATE jobs SET assigned_technician_id = NULL WHERE assigned_technician_id = ANY(v_user_ids);
  UPDATE jobs SET customer_id = NULL WHERE customer_id = ANY(v_cust_ids);

  -- Slett avhengig data (scopet til firmaet + evt. kryss-refererende barn via job_id).
  DELETE FROM job_images           WHERE company_id = p_company_id OR job_id = ANY(v_job_ids);
  DELETE FROM job_notes            WHERE company_id = p_company_id OR job_id = ANY(v_job_ids);
  DELETE FROM invoice_notifications WHERE company_id = p_company_id;
  DELETE FROM app_notifications    WHERE company_id = p_company_id;
  DELETE FROM quotes               WHERE company_id = p_company_id OR job_id = ANY(v_job_ids);
  DELETE FROM invoices             WHERE company_id = p_company_id;
  DELETE FROM jobs                 WHERE company_id = p_company_id;
  DELETE FROM customers            WHERE company_id = p_company_id;
  DELETE FROM profiles             WHERE company_id = p_company_id;

  IF v_user_ids IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = ANY(v_user_ids);
  END IF;

  DELETE FROM companies WHERE id = p_company_id;

  RETURN jsonb_build_object('deleted', true, 'company_id', p_company_id);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.superadmin_delete_company(UUID) TO authenticated;
