-- Migration v26: Superadmin kan arkivere (mykt) eller slette (permanent) en kunde.
-- Arkiver = skjul fra lista + sperr tilgang (subscription_status='canceled' +
--   archived_at satt), reversibelt, data beholdes (trygt ift. bokføringsloven).
-- Slett  = fjern firma + all tilhørende data + brukere/innlogging for godt.
-- Kjør i Supabase SQL Editor.

-- 1. Arkiv-kolonne.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 2. Metrics: ekskluder arkiverte firmaer fra tall/MRR.
CREATE OR REPLACE FUNCTION superadmin_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v JSONB;
BEGIN
  IF NOT is_superadmin() THEN RAISE EXCEPTION 'Ikke autorisert'; END IF;
  SELECT jsonb_build_object(
    'active_count',   COUNT(*) FILTER (WHERE subscription_status = 'active'),
    'trial_count',    COUNT(*) FILTER (WHERE subscription_status = 'trial'),
    'canceled_count', COUNT(*) FILTER (WHERE subscription_status = 'canceled'),
    'mrr',            COALESCE(SUM(monthly_amount) FILTER (WHERE subscription_status = 'active'), 0)
  ) INTO v FROM companies WHERE archived_at IS NULL;
  RETURN v;
END;
$$;
GRANT EXECUTE ON FUNCTION superadmin_metrics() TO authenticated;

-- 3. Kundeliste: ta med archived_at (klienten skjuler arkiverte i lista).
CREATE OR REPLACE FUNCTION superadmin_companies()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v JSONB;
BEGIN
  IF NOT is_superadmin() THEN RAISE EXCEPTION 'Ikke autorisert'; END IF;
  SELECT COALESCE(jsonb_agg(row ORDER BY created_at DESC), '[]'::jsonb) INTO v
  FROM (
    SELECT
      c.created_at,
      jsonb_build_object(
        'id',                  c.id,
        'name',                c.name,
        'org_number',          c.org_number,
        'contact_person',      admin.name,
        'contact_email',       admin.email,
        'subscription_plan',   c.subscription_plan,
        'monthly_amount',      c.monthly_amount,
        'subscription_status', c.subscription_status,
        'billing_status',      c.billing_status,
        'created_at',          c.created_at,
        'trial_ends_at',       c.trial_ends_at,
        'next_invoice_date',   c.next_invoice_date,
        'last_invoiced_date',  c.last_invoiced_date,
        'last_paid_date',      c.last_paid_date,
        'archived_at',         c.archived_at,
        'technician_count',    (SELECT COUNT(*) FROM profiles p WHERE p.company_id = c.id AND p.role = 'technician'),
        'admin_count',         (SELECT COUNT(*) FROM profiles p WHERE p.company_id = c.id AND p.role = 'admin'),
        'job_count',           (SELECT COUNT(*) FROM jobs j WHERE j.company_id = c.id),
        'invoice_count',       (SELECT COUNT(*) FROM invoices i WHERE i.company_id = c.id)
      ) AS row
    FROM companies c
    LEFT JOIN LATERAL (
      SELECT name, email FROM profiles p
      WHERE p.company_id = c.id AND p.role = 'admin'
      ORDER BY p.created_at ASC
      LIMIT 1
    ) admin ON TRUE
  ) sub;
  RETURN v;
END;
$$;
GRANT EXECUTE ON FUNCTION superadmin_companies() TO authenticated;

-- 4. Arkiver / gjenopprett kunde (mykt, reversibelt).
CREATE OR REPLACE FUNCTION superadmin_set_archived(p_company_id UUID, p_archived BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v JSONB;
BEGIN
  IF NOT is_superadmin() THEN RAISE EXCEPTION 'Ikke autorisert'; END IF;
  IF p_archived THEN
    -- Arkiver: skjul + sperr tilgang. Data beholdes.
    UPDATE companies
      SET archived_at = NOW(), subscription_status = 'canceled'
      WHERE id = p_company_id;
  ELSE
    -- Gjenopprett: fjern arkiv-flagget (status forblir 'canceled' til eier
    -- evt. setter 'active' igjen via 'Gjenåpne tilgang').
    UPDATE companies SET archived_at = NULL WHERE id = p_company_id;
  END IF;
  SELECT to_jsonb(c) INTO v FROM companies c WHERE c.id = p_company_id;
  RETURN v;
END;
$$;
GRANT EXECUTE ON FUNCTION superadmin_set_archived(UUID, BOOLEAN) TO authenticated;

-- 5. Slett kunde permanent (irreversibelt). Fjerner all data + brukere.
CREATE OR REPLACE FUNCTION superadmin_delete_company(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_ids UUID[];
BEGIN
  IF NOT is_superadmin() THEN RAISE EXCEPTION 'Ikke autorisert'; END IF;

  -- Sikkerhet: superadmin kan ikke slette sitt eget firma ved et uhell.
  IF p_company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Kan ikke slette ditt eget firma';
  END IF;

  -- Samle brukerne (profiles.id = auth.users.id) før profilene slettes.
  SELECT array_agg(id) INTO v_user_ids FROM profiles WHERE company_id = p_company_id;

  -- Slett avhengig data i FK-trygg rekkefølge (alt scopet til firmaet).
  DELETE FROM job_images           WHERE company_id = p_company_id;
  DELETE FROM job_notes            WHERE company_id = p_company_id;
  DELETE FROM invoice_notifications WHERE company_id = p_company_id;
  DELETE FROM app_notifications    WHERE company_id = p_company_id;
  DELETE FROM quotes               WHERE company_id = p_company_id;
  DELETE FROM invoices             WHERE company_id = p_company_id;
  DELETE FROM jobs                 WHERE company_id = p_company_id;
  DELETE FROM customers            WHERE company_id = p_company_id;
  DELETE FROM profiles             WHERE company_id = p_company_id;

  -- Slett innloggingene (auth.identities/sessions cascader fra auth.users).
  IF v_user_ids IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = ANY(v_user_ids);
  END IF;

  DELETE FROM companies WHERE id = p_company_id;

  RETURN jsonb_build_object('deleted', true, 'company_id', p_company_id);
END;
$$;
GRANT EXECUTE ON FUNCTION superadmin_delete_company(UUID) TO authenticated;
