-- Migration v34: Server-side aggregat for statistikk-skjermen.
--
-- Bakgrunn: StatisticsScreen regnet ut hele statistikkbildet klient-side over de
-- lastede radene i store. Etter at jobber/fakturaer ble paginert (v: app-endring
-- «last inn flere») speiler de lokale arrayene bare de lastede sidene, så all-time
-- tall (antall ferdige jobber, fakturastatus, per-tekniker-omsetning) kunne
-- underrapportere. Denne RPC-en regner ut alt over HELE datasettet i databasen.
--
-- Sikkerhet: SECURITY DEFINER (omgår RLS for å aggregere hele firmaet), men
-- company_id UTLEDES fra innlogget bruker via current_user_company_id() — tas
-- ALDRI som parameter fra klienten (samme mønster som øvrige hjelpefunksjoner).
-- I tillegg kreves admin (is_admin_user()) siden statistikk kun vises for admin.
-- Endrer INGEN eksisterende data, queries eller RLS-policyer. Kjør i Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.get_company_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_company uuid := current_user_company_id();
  v_result  json;
BEGIN
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Ingen tilknyttet firma';
  END IF;
  IF NOT is_admin_user() THEN
    RAISE EXCEPTION 'Kun admin har tilgang til firmastatistikk';
  END IF;

  WITH
  -- Omsetning pr. tekniker for INNEVÆRENDE måned (faktura → jobb → tekniker).
  tech_revenue AS (
    SELECT j.assigned_technician_id AS tech_id, SUM(i.total) AS revenue
    FROM invoices i
    JOIN jobs j ON j.id = i.job_id
    WHERE i.company_id = v_company
      AND j.assigned_technician_id IS NOT NULL
      AND date_trunc('month', i.created_at) = date_trunc('month', now())
    GROUP BY j.assigned_technician_id
  ),
  -- Antall jobber pr. tekniker OPPRETTET inneværende måned (matcher skjermens
  -- «{n} jobber»-tall, som teller på jobbens created_at — ikke fakturaens).
  tech_jobs AS (
    SELECT assigned_technician_id AS tech_id, count(*)::int AS jobs
    FROM jobs
    WHERE company_id = v_company
      AND assigned_technician_id IS NOT NULL
      AND date_trunc('month', created_at) = date_trunc('month', now())
    GROUP BY assigned_technician_id
  ),
  -- Slå sammen omsetning + jobbtall pr. tekniker (en av dem kan mangle en måned).
  tech_combined AS (
    SELECT COALESCE(r.tech_id, jb.tech_id) AS technician_id,
           COALESCE(r.revenue, 0)          AS revenue,
           COALESCE(jb.jobs, 0)            AS jobs
    FROM tech_revenue r
    FULL OUTER JOIN tech_jobs jb ON jb.tech_id = r.tech_id
  )
  SELECT json_build_object(
    -- Jobber (hele firmaet, alle statuser)
    'total_jobs', (SELECT count(*)::int FROM jobs WHERE company_id = v_company),
    'jobs_by_status', (
      SELECT json_build_object(
        'new',         count(*) FILTER (WHERE status = 'new'),
        'in_progress', count(*) FILTER (WHERE status = 'in_progress'),
        'completed',   count(*) FILTER (WHERE status = 'completed')
      )
      FROM jobs WHERE company_id = v_company
    ),
    -- Inneværende måned: total omsetning + per tekniker
    'current_month', json_build_object(
      'month', to_char(date_trunc('month', now()), 'YYYY-MM'),
      'revenue', (
        SELECT COALESCE(SUM(total), 0)
        FROM invoices
        WHERE company_id = v_company
          AND date_trunc('month', created_at) = date_trunc('month', now())
      ),
      'by_technician', COALESCE(
        (SELECT json_agg(json_build_object(
            'technician_id', technician_id,
            'revenue', revenue,
            'jobs', jobs
          ))
         FROM tech_combined),
        '[]'::json
      )
    ),
    -- Inntekt pr. måned (hele historikken, nyeste først)
    'revenue_by_month', COALESCE(
      (SELECT json_agg(json_build_object('month', month, 'revenue', revenue) ORDER BY month DESC)
       FROM (
         SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                SUM(total) AS revenue
         FROM invoices
         WHERE company_id = v_company
         GROUP BY 1
       ) rbm),
      '[]'::json
    ),
    -- Fakturastatus (hele firmaet): antall + beløp pr. status
    'invoice_status', (
      SELECT json_build_object(
        'paid',    json_build_object('count', count(*) FILTER (WHERE status = 'paid'),    'amount', COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0)),
        'sent',    json_build_object('count', count(*) FILTER (WHERE status = 'sent'),    'amount', COALESCE(SUM(total) FILTER (WHERE status = 'sent'), 0)),
        'overdue', json_build_object('count', count(*) FILTER (WHERE status = 'overdue'), 'amount', COALESCE(SUM(total) FILTER (WHERE status = 'overdue'), 0))
      )
      FROM invoices WHERE company_id = v_company
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_stats() TO authenticated;
