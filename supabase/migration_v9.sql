-- migration_v9.sql
-- Påminnelses- og forfallsvarsler for fakturaer
-- Kjøres i Supabase SQL Editor

-- 1. Legg til e-post på kunder
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email text;

-- 2. Legg til customer_email på fakturaer (kopieres fra kunde ved oppretting)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_email text;

-- 3. Varselinnstillinger per bedrift
ALTER TABLE companies ADD COLUMN IF NOT EXISTS notify_reminder_3days boolean NOT NULL DEFAULT true;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS notify_due_today      boolean NOT NULL DEFAULT true;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS notify_overdue_1day   boolean NOT NULL DEFAULT true;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS notify_overdue_7days  boolean NOT NULL DEFAULT true;

-- 4. Logg over sendte e-postvarsler (hindrer duplikater)
CREATE TABLE IF NOT EXISTS invoice_notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  company_id  uuid        NOT NULL,
  type        text        NOT NULL CHECK (type IN ('reminder_3days','due_today','overdue_1day','overdue_7days')),
  sent_at     timestamptz NOT NULL DEFAULT now(),
  email_sent_to text
);

CREATE UNIQUE INDEX IF NOT EXISTS invoice_notifications_unique
  ON invoice_notifications(invoice_id, type);
CREATE INDEX IF NOT EXISTS invoice_notifications_company
  ON invoice_notifications(company_id);

ALTER TABLE invoice_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bedrift kan lese egne e-postvarsler"
  ON invoice_notifications FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1));

-- 5. Inn-app-varsler (bjelle-ikonet)
CREATE TABLE IF NOT EXISTS app_notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid        NOT NULL,
  invoice_id  uuid        REFERENCES invoices(id) ON DELETE CASCADE,
  type        text        NOT NULL,
  message     text        NOT NULL,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_notifications_company
  ON app_notifications(company_id);
CREATE INDEX IF NOT EXISTS app_notifications_created
  ON app_notifications(created_at DESC);

ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bedrift kan lese egne app-varsler"
  ON app_notifications FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "Bedrift kan oppdatere egne app-varsler"
  ON app_notifications FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "Bedrift kan sette inn app-varsler"
  ON app_notifications FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1));

-- 6. Sett opp daglig cron-jobb (krever pg_cron + pg_net)
-- Erstatt YOUR_PROJECT_REF og SERVICE_ROLE_KEY, og kjør manuelt:
--
-- SELECT cron.schedule(
--   'send-invoice-reminders-daily',
--   '0 7 * * *',   -- 07:00 UTC = 08:00 CET (09:00 CEST om sommeren)
--   $$
--   SELECT net.http_post(
--     url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-invoice-reminders',
--     headers := '{"Content-Type":"application/json","Authorization":"Bearer SERVICE_ROLE_KEY"}'::jsonb,
--     body    := '{}'::jsonb
--   );
--   $$
-- );
--
-- Sjekk at pg_net er aktivert i Supabase Dashboard → Database → Extensions → pg_net
