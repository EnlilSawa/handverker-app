-- Håndverker-app demo-data
-- Kjør dette i Supabase SQL Editor ETTER at schema.sql er kjørt
-- Demo-passord for alle brukere: Demo1234!

-- 1. Opprett selskap
INSERT INTO companies (id, name, org_number, address, hourly_rate, callout_fee, payment_terms_days)
VALUES ('c0000000-0000-0000-0000-000000000001', 'VVS Service AS', '123 456 789', 'Industrivegen 1, 0150 Oslo', 895, 350, 14);

-- 2. Opprett brukere (trigger lager profiles automatisk)
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, aud, role)
VALUES
  (
    'u1000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'kjetil@vvsservice.no',
    crypt('Demo1234!', gen_salt('bf')),
    NOW(),
    '{"name":"Kjetil Hansen","phone":"90000001","role":"admin","company_id":"c0000000-0000-0000-0000-000000000001"}',
    NOW(), NOW(), 'authenticated', 'authenticated'
  ),
  (
    'u2000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'magnus@vvsservice.no',
    crypt('Demo1234!', gen_salt('bf')),
    NOW(),
    '{"name":"Magnus Olsen","phone":"90000002","role":"technician","company_id":"c0000000-0000-0000-0000-000000000001"}',
    NOW(), NOW(), 'authenticated', 'authenticated'
  ),
  (
    'u3000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'erik@vvsservice.no',
    crypt('Demo1234!', gen_salt('bf')),
    NOW(),
    '{"name":"Erik Berg","phone":"90000003","role":"technician","company_id":"c0000000-0000-0000-0000-000000000001"}',
    NOW(), NOW(), 'authenticated', 'authenticated'
  ),
  (
    'u4000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'lars@vvsservice.no',
    crypt('Demo1234!', gen_salt('bf')),
    NOW(),
    '{"name":"Lars Johansen","phone":"90000004","role":"technician","company_id":"c0000000-0000-0000-0000-000000000001"}',
    NOW(), NOW(), 'authenticated', 'authenticated'
  );

-- 3. Demo-jobber
INSERT INTO jobs (id, company_id, customer_name, customer_phone, address, description, assigned_technician_id, scheduled_at, status)
VALUES
  ('j1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'Anne Lindqvist', '91234567', 'Maridalsveien 45, 0458 Oslo',
   'Lekkasje under kjøkkenbenk – vann renner ned i underskap.',
   'u2000000-0000-0000-0000-000000000002', NOW()::date + TIME '09:00:00', 'new'),

  ('j2000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
   'Per Andersen', '92345678', 'Bogstadveien 12, 0355 Oslo',
   'Skifte varmtvannsbereder, 80L, gammel bereder lekker.',
   'u3000000-0000-0000-0000-000000000003', NOW()::date + TIME '10:30:00', 'in_progress'),

  ('j3000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001',
   'Hanne Mikkelsen', '93456789', 'Hegdehaugsveien 8, 0352 Oslo',
   'Tett avløp på bad og gjenlukt fra sluk.',
   'u2000000-0000-0000-0000-000000000002', NOW()::date + TIME '13:00:00', 'new'),

  ('j4000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001',
   'Tor Haugen', '94567890', 'Frognerveien 55, 0266 Oslo',
   'Installasjon av nytt dusjarrangement inkl. termostatbatteri.',
   'u4000000-0000-0000-0000-000000000004', NOW()::date + TIME '11:00:00', 'completed'),

  ('j5000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001',
   'Silje Dahl', '95678901', 'Drammensveien 102, 0273 Oslo',
   'Trykktesting og inspeksjon av røranlegg etter kjellerstopp.',
   'u3000000-0000-0000-0000-000000000003', NOW()::date + TIME '15:00:00', 'new');

-- 4. Demo-fakturaer
INSERT INTO invoices (id, company_id, job_id, invoice_number, customer_name, customer_address, line_items, subtotal_ex_vat, vat, total, status, due_date)
VALUES
  ('i1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'j4000000-0000-0000-0000-000000000004', 'INV-2025-001', 'Tor Haugen', 'Frognerveien 55, 0266 Oslo',
   '[{"description":"Arbeidstimer (2,5t × 895 kr)","quantity":2.5,"unitPrice":895,"amount":2237.5},{"description":"Materiell","amount":1200},{"description":"Fremmøtegebyr","amount":350}]',
   3787.50, 946.88, 4734.38, 'sent', (NOW() + INTERVAL '14 days')::date),

  ('i2000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
   NULL, 'INV-2025-002', 'Bjørn Nilsen', 'Slemdalsveien 70, 0373 Oslo',
   '[{"description":"Arbeidstimer (3t × 895 kr)","quantity":3,"unitPrice":895,"amount":2685},{"description":"Materiell","amount":850},{"description":"Fremmøtegebyr","amount":350}]',
   3885.00, 971.25, 4856.25, 'paid', (NOW() - INTERVAL '5 days')::date),

  ('i3000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001',
   NULL, 'INV-2025-003', 'Randi Sørensen', 'Kirkeveien 14, 0153 Oslo',
   '[{"description":"Arbeidstimer (1,5t × 895 kr)","quantity":1.5,"unitPrice":895,"amount":1342.5},{"description":"Fremmøtegebyr","amount":350}]',
   1692.50, 423.13, 2115.63, 'overdue', (NOW() - INTERVAL '20 days')::date);

-- Sett sekvens til riktig startverdi
SELECT setval('invoice_number_seq', 4);
