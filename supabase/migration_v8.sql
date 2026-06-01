-- migration_v8.sql — Tilbudsmodul
-- Kjør i Supabase SQL Editor

CREATE TABLE IF NOT EXISTS quotes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID        REFERENCES companies(id),
  customer_id       UUID        REFERENCES customers(id),
  customer_name     TEXT        NOT NULL,
  customer_email    TEXT        NOT NULL,
  customer_phone    TEXT,
  customer_address  TEXT,
  title             TEXT        NOT NULL,
  description       TEXT,
  lines             JSONB       NOT NULL DEFAULT '[]',
  subtotal_ex_vat   DECIMAL     NOT NULL DEFAULT 0,
  vat               DECIMAL     NOT NULL DEFAULT 0,
  total_amount      DECIMAL     NOT NULL DEFAULT 0,
  status            TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','declined','expired')),
  valid_until       DATE        NOT NULL,
  quote_number      TEXT,
  accepted_by_name  TEXT,
  accepted_at       TIMESTAMPTZ,
  declined_reason   TEXT,
  job_id            UUID        REFERENCES jobs(id),
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quotes_company_id_idx ON quotes(company_id);
CREATE INDEX IF NOT EXISTS quotes_status_idx ON quotes(company_id, status);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view quotes" ON quotes FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND company_id = quotes.company_id));
CREATE POLICY "Admins can insert quotes" ON quotes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update quotes" ON quotes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Auto-generate quote number: TIL-YYYY-NNN
CREATE OR REPLACE FUNCTION next_quote_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  year_str TEXT := TO_CHAR(NOW(), 'YYYY');
  seq      INT;
BEGIN
  SELECT COUNT(*) + 1 INTO seq
  FROM quotes
  WHERE company_id = p_company_id
    AND TO_CHAR(created_at, 'YYYY') = year_str;
  RETURN 'TIL-' || year_str || '-' || LPAD(seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
