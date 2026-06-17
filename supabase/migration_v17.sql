-- Migration v17: Superadmin-dashboard (kun Efero-eieren)
-- Kjør i Supabase SQL Editor.
--
-- Sikkerhetsmodell: alle superadmin-funksjoner er SECURITY DEFINER (omgår RLS) og
-- sjekker is_superadmin() FØRST. Superadmin-e-posten lagres server-side i app_config
-- (ikke i klienten — klientens EXPO_PUBLIC_SUPERADMIN_EMAIL styrer kun om lenken vises).

-- ── 1. App-konfig (nøkkel/verdi) ─────────────────────────────────────────────
-- RLS på uten policies → ingen vanlig bruker kan lese/skrive direkte.
-- Kun SECURITY DEFINER-funksjonene under leser superadmin_email.
CREATE TABLE IF NOT EXISTS app_config (
  key   TEXT PRIMARY KEY,
  value TEXT
);
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- ⚠️ ENDRE denne til DIN e-post (Efero-eierens konto).
INSERT INTO app_config (key, value)
VALUES ('superadmin_email', 'enlil.sawa00@gmail.com')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ── 2. Fakturerings-/abonnementskolonner på companies ────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'ikke_fakturert'
    CHECK (billing_status IN ('ikke_fakturert','fakturert','betalt')),
  ADD COLUMN IF NOT EXISTS last_invoiced_date DATE,
  ADD COLUMN IF NOT EXISTS last_paid_date     DATE,
  ADD COLUMN IF NOT EXISTS subscription_plan  TEXT
    CHECK (subscription_plan IN ('liten','middels','stor')),
  ADD COLUMN IF NOT EXISTS monthly_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_invoice_date  DATE;

-- ── 3. is_superadmin(): er innlogget bruker Efero-eieren? ─────────────────────
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email TEXT;
  v_super TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  SELECT value INTO v_super FROM app_config WHERE key = 'superadmin_email';
  IF v_email IS NULL OR v_super IS NULL THEN RETURN FALSE; END IF;
  RETURN lower(v_email) = lower(v_super);
END;
$$;
GRANT EXECUTE ON FUNCTION is_superadmin() TO authenticated;

-- ── 4. Nøkkeltall (4 kort øverst) ────────────────────────────────────────────
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
  ) INTO v FROM companies;
  RETURN v;
END;
$$;
GRANT EXECUTE ON FUNCTION superadmin_metrics() TO authenticated;

-- ── 5. Kundeliste (alle registrerte bedrifter) ───────────────────────────────
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

-- ── 6. Sett faktureringsstatus (med dato-bivirkninger) ───────────────────────
CREATE OR REPLACE FUNCTION superadmin_set_billing_status(p_company_id UUID, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v JSONB;
BEGIN
  IF NOT is_superadmin() THEN RAISE EXCEPTION 'Ikke autorisert'; END IF;
  IF p_status NOT IN ('ikke_fakturert','fakturert','betalt') THEN
    RAISE EXCEPTION 'Ugyldig faktureringsstatus: %', p_status;
  END IF;
  UPDATE companies SET
    billing_status     = p_status,
    last_invoiced_date = CASE WHEN p_status = 'fakturert' THEN CURRENT_DATE ELSE last_invoiced_date END,
    last_paid_date     = CASE WHEN p_status = 'betalt'    THEN CURRENT_DATE ELSE last_paid_date     END
  WHERE id = p_company_id;
  SELECT to_jsonb(c) INTO v FROM companies c WHERE c.id = p_company_id;
  RETURN v;
END;
$$;
GRANT EXECUTE ON FUNCTION superadmin_set_billing_status(UUID, TEXT) TO authenticated;

-- ── 7. Oppdater bedrift (pakke / abonnement / forleng prøveperiode) ──────────
-- Alle parametre valgfrie (NULL = ikke endre). p_extend_trial_days legger dager til
-- prøveperioden (fra i dag eller eksisterende sluttdato, det som er senest).
CREATE OR REPLACE FUNCTION superadmin_update_company(
  p_company_id          UUID,
  p_plan                TEXT    DEFAULT NULL,
  p_monthly_amount      NUMERIC DEFAULT NULL,
  p_subscription_status TEXT    DEFAULT NULL,
  p_extend_trial_days   INTEGER DEFAULT NULL,
  p_next_invoice_date   DATE    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v JSONB;
BEGIN
  IF NOT is_superadmin() THEN RAISE EXCEPTION 'Ikke autorisert'; END IF;
  IF p_plan IS NOT NULL AND p_plan NOT IN ('liten','middels','stor') THEN
    RAISE EXCEPTION 'Ugyldig pakke: %', p_plan;
  END IF;
  IF p_subscription_status IS NOT NULL
     AND p_subscription_status NOT IN ('trial','active','expired','canceled') THEN
    RAISE EXCEPTION 'Ugyldig abonnementsstatus: %', p_subscription_status;
  END IF;
  UPDATE companies SET
    subscription_plan   = COALESCE(p_plan, subscription_plan),
    monthly_amount      = COALESCE(p_monthly_amount, monthly_amount),
    subscription_status = COALESCE(p_subscription_status, subscription_status),
    next_invoice_date   = COALESCE(p_next_invoice_date, next_invoice_date),
    trial_ends_at       = CASE
      WHEN p_extend_trial_days IS NOT NULL
        THEN GREATEST(trial_ends_at, NOW()) + (p_extend_trial_days || ' days')::INTERVAL
      ELSE trial_ends_at
    END
  WHERE id = p_company_id;
  SELECT to_jsonb(c) INTO v FROM companies c WHERE c.id = p_company_id;
  RETURN v;
END;
$$;
GRANT EXECUTE ON FUNCTION superadmin_update_company(UUID, TEXT, NUMERIC, TEXT, INTEGER, DATE) TO authenticated;
