-- Håndverker-app demo-data
-- Kjør dette i Supabase SQL Editor ETTER at schema.sql er kjørt
-- Demo-passord for alle brukere: Demo1234!

INSERT INTO companies (id, name, org_number, address, hourly_rate, callout_fee, payment_terms_days)
VALUES ('00000000-0000-0000-0000-000000000001', 'VVS Service AS', '123 456 789', 'Industrivegen 1, 0150 Oslo', 895, 350, 14);

INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000000','kjetil@vvsservice.no',crypt('Demo1234!', gen_salt('bf')),NOW(),'{"name":"Kjetil Hansen","phone":"90000001","role":"admin","company_id":"00000000-0000-0000-0000-000000000001"}',NOW(),NOW(),'authenticated','authenticated'),
  ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000000','magnus@vvsservice.no',crypt('Demo1234!', gen_salt('bf')),NOW(),'{"name":"Magnus Olsen","phone":"90000002","role":"technician","company_id":"00000000-0000-0000-0000-000000000001"}',NOW(),NOW(),'authenticated','authenticated'),
  ('00000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000000','erik@vvsservice.no',crypt('Demo1234!', gen_salt('bf')),NOW(),'{"name":"Erik Berg","phone":"90000003","role":"technician","company_id":"00000000-0000-0000-0000-000000000001"}',NOW(),NOW(),'authenticated','authenticated'),
  ('00000000-0000-0000-0000-000000000014','00000000-0000-0000-0000-000000000000','lars@vvsservice.no',crypt('Demo1234!', gen_salt('bf')),NOW(),'{"name":"Lars Johansen","phone":"90000004","role":"technician","company_id":"00000000-0000-0000-0000-000000000001"}',NOW(),NOW(),'authenticated','authenticated');

INSERT INTO jobs (id, company_id, customer_name, customer_phone, address, description, assigned_technician_id, scheduled_at, status)
VALUES
  ('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000001','Anne Lindqvist','91234567','Maridalsveien 45, 0458 Oslo','Lekkasje under kjøkkenbenk – vann renner ned i underskap.','00000000-0000-0000-0000-000000000012',NOW()::date + TIME '09:00:00','new'),
  ('00000000-0000-0000-0000-000000000022','00000000-0000-0000-0000-000000000001','Per Andersen','92345678','Bogstadveien 12, 0355 Oslo','Skifte varmtvannsbereder, 80L, gammel bereder lekker.','00000000-0000-0000-0000-000000000013',NOW()::date + TIME '10:30:00','in_progress'),
  ('00000000-0000-0000-0000-000000000023','00000000-0000-0000-0000-000000000001','Hanne Mikkelsen','93456789','Hegdehaugsveien 8, 0352 Oslo','Tett avløp på bad og gjenlukt fra sluk.','00000000-0000-0000-0000-000000000012',NOW()::date + TIME '13:00:00','new'),
  ('00000000-0000-0000-0000-000000000024','00000000-0000-0000-0000-000000000001','Tor Haugen','94567890','Frognerveien 55, 0266 Oslo','Installasjon av nytt dusjarrangement inkl. termostatbatteri.','00000000-0000-0000-0000-000000000014',NOW()::date + TIME '11:00:00','completed'),
  ('00000000-0000-0000-0000-000000000025','00000000-0000-0000-0000-000000000001','Silje Dahl','95678901','Drammensveien 102, 0273 Oslo','Trykktesting og inspeksjon av røranlegg etter kjellerstopp.','00000000-0000-0000-0000-000000000013',NOW()::date + TIME '15:00:00','new');

INSERT INTO invoices (id, company_id, job_id, invoice_number, customer_name, customer_address, line_items, subtotal_ex_vat, vat, total, status, due_date)
VALUES
  ('00000000-0000-0000-0000-000000000031','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000024','INV-2025-001','Tor Haugen','Frognerveien 55, 0266 Oslo','[{"description":"Arbeidstimer (2,5t × 895 kr)","quantity":2.5,"unitPrice":895,"amount":2237.5},{"description":"Materiell","amount":1200},{"description":"Fremmøtegebyr","amount":350}]',3787.50,946.88,4734.38,'sent',(NOW() + INTERVAL '14 days')::date),
  ('00000000-0000-0000-0000-000000000032','00000000-0000-0000-0000-000000000001',NULL,'INV-2025-002','Bjørn Nilsen','Slemdalsveien 70, 0373 Oslo','[{"description":"Arbeidstimer (3t × 895 kr)","quantity":3,"unitPrice":895,"amount":2685},{"description":"Materiell","amount":850},{"description":"Fremmøtegebyr","amount":350}]',3885.00,971.25,4856.25,'paid',(NOW() - INTERVAL '5 days')::date),
  ('00000000-0000-0000-0000-000000000033','00000000-0000-0000-0000-000000000001',NULL,'INV-2025-003','Randi Sørensen','Kirkeveien 14, 0153 Oslo','[{"description":"Arbeidstimer (1,5t × 895 kr)","quantity":1.5,"unitPrice":895,"amount":1342.5},{"description":"Fremmøtegebyr","amount":350}]',1692.50,423.13,2115.63,'overdue',(NOW() - INTERVAL '20 days')::date);

SELECT setval('invoice_number_seq', 4);
