-- migration_v13: E-postsending via Resend
-- 1) companies.email  — bedriftens egen e-post, brukt som Reply-To på faktura-e-post
--    slik at sluttkundens svar går til håndverkeren, ikke til Efero.
-- 2) invoices.email_status — null | 'sent' | 'failed' for å vise status og "Send på nytt".

ALTER TABLE companies ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE invoices  ADD COLUMN IF NOT EXISTS email_status text;

-- Kjør i Supabase SQL Editor.
-- Krever at edge-funksjonene send-welcome-email og send-invoice-email er deployet,
-- og at disse secrets er satt (samme RESEND_API_KEY som send-quote-email):
--   supabase secrets set RESEND_API_KEY=re_xxxxxx
--   supabase secrets set SUPABASE_URL=https://xxx.supabase.co
--   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJxxx
-- Avsenderdomenet efero.no MÅ være verifisert i Resend, ellers sendes ingenting.
