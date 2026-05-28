-- Håndverker-app databaseskjema
-- Lim inn i Supabase SQL Editor og kjør

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums
CREATE TYPE user_role AS ENUM ('admin', 'technician');
CREATE TYPE job_status AS ENUM ('new', 'in_progress', 'completed');
CREATE TYPE invoice_status AS ENUM ('sent', 'paid', 'overdue');

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

-- Brukerprofiler (kobles til Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'technician',
  company_id UUID REFERENCES companies(id),
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

-- Fakturanummer-sekvens
CREATE SEQUENCE invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION next_invoice_number(company_id UUID)
RETURNS TEXT AS $$
  SELECT 'INV-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 3, '0');
$$ LANGUAGE SQL;

-- Trigger: auto-oppdater updated_at på jobber
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

-- Trigger: opprett profil automatisk ved ny bruker
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email, phone, role, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'technician'),
    (NEW.raw_user_meta_data->>'company_id')::UUID
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Funksjon: finn e-post via telefonnummer (brukes ved innlogging med tlf)
CREATE OR REPLACE FUNCTION get_email_by_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email
  FROM profiles
  WHERE phone = p_phone
  LIMIT 1;
  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION get_email_by_phone TO anon;

-- ── Row Level Security ────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Profiler
CREATE POLICY "Bruker ser egen profil"
  ON profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admin ser alle profiler i eget selskap"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
        AND p.company_id = profiles.company_id
    )
  );

-- Selskap
CREATE POLICY "Bruker ser eget selskap"
  ON companies FOR SELECT
  USING (id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admin oppdaterer eget selskap"
  ON companies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND company_id = companies.id
    )
  );

-- Jobber
CREATE POLICY "Admin ser alle jobber i eget selskap"
  ON jobs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND company_id = jobs.company_id
    )
  );

CREATE POLICY "Tekniker ser egne jobber"
  ON jobs FOR SELECT USING (assigned_technician_id = auth.uid());

CREATE POLICY "Tekniker oppdaterer egne jobber"
  ON jobs FOR UPDATE USING (assigned_technician_id = auth.uid());

-- Fakturaer
CREATE POLICY "Admin ser alle fakturaer i eget selskap"
  ON invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND company_id = invoices.company_id
    )
  );

-- ── Indekser ─────────────────────────────────────────────────────────────

CREATE INDEX jobs_company_id_idx ON jobs(company_id);
CREATE INDEX jobs_technician_id_idx ON jobs(assigned_technician_id);
CREATE INDEX jobs_status_idx ON jobs(status);
CREATE INDEX jobs_scheduled_at_idx ON jobs(scheduled_at);
CREATE INDEX invoices_company_id_idx ON invoices(company_id);
CREATE INDEX invoices_status_idx ON invoices(status);
CREATE INDEX profiles_phone_idx ON profiles(phone);
CREATE INDEX profiles_company_id_idx ON profiles(company_id);
