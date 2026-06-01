-- migration_v7.sql — Kunderegister
-- Kjør i Supabase SQL Editor

CREATE TABLE IF NOT EXISTS customers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        REFERENCES companies(id),
  name        TEXT        NOT NULL,
  phone       TEXT,
  address     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customers_company_id_idx ON customers(company_id);
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(company_id, phone);

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view customers" ON customers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND company_id = customers.company_id
  ));

CREATE POLICY "Admins can insert customers" ON customers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can update customers" ON customers FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
