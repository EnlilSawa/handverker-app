-- Håndverker-app databaseskjema
-- Bruk med Supabase PostgreSQL

-- Roller
CREATE TYPE user_role AS ENUM ('admin', 'technician');
CREATE TYPE job_status AS ENUM ('new', 'in_progress', 'completed');
CREATE TYPE invoice_status AS ENUM ('sent', 'paid', 'overdue');

-- Brukere (utvidet fra Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'technician',
  company_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bedrifter
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_number TEXT,
  address TEXT,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 895,
  callout_fee NUMERIC(10,2) NOT NULL DEFAULT 350,
  payment_terms_days INTEGER NOT NULL DEFAULT 14,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobber
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  address TEXT NOT NULL,
  description TEXT NOT NULL,
  assigned_technician_id UUID REFERENCES profiles(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status job_status NOT NULL DEFAULT 'new',
  hours_worked NUMERIC(5,2),
  materials_cost NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fakturalinjer
CREATE TYPE invoice_line AS (
  description TEXT,
  quantity NUMERIC(6,2),
  unit_price NUMERIC(10,2),
  amount NUMERIC(10,2)
);

-- Fakturaer
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES jobs(id),
  invoice_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  line_items JSONB NOT NULL DEFAULT '[]',
  subtotal_ex_vat NUMERIC(12,2) NOT NULL,
  vat NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  status invoice_status NOT NULL DEFAULT 'sent',
  due_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sekvens for fakturanummer
CREATE SEQUENCE invoice_number_seq START 1;

-- Funksjon: generer fakturanummer
CREATE OR REPLACE FUNCTION next_invoice_number(company_id UUID)
RETURNS TEXT AS $$
  SELECT 'INV-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 3, '0');
$$ LANGUAGE SQL;

-- Trigger: oppdater updated_at automatisk
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Policyer: admin ser alt, tekniker ser egne jobber
CREATE POLICY "Admin kan se alle profiler"
  ON profiles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Bruker ser egen profil"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admin ser alle jobber"
  ON jobs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Tekniker ser egne jobber"
  ON jobs FOR SELECT
  USING (assigned_technician_id = auth.uid());

CREATE POLICY "Tekniker oppdaterer egne jobber"
  ON jobs FOR UPDATE
  USING (assigned_technician_id = auth.uid());

CREATE POLICY "Admin ser alle fakturaer"
  ON invoices FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Indekser
CREATE INDEX jobs_company_id_idx ON jobs(company_id);
CREATE INDEX jobs_technician_id_idx ON jobs(assigned_technician_id);
CREATE INDEX jobs_status_idx ON jobs(status);
CREATE INDEX jobs_scheduled_at_idx ON jobs(scheduled_at);
CREATE INDEX invoices_company_id_idx ON invoices(company_id);
CREATE INDEX invoices_status_idx ON invoices(status);
