-- Migration v38: Fakturaserien starter på 10000
-- Kjør i Supabase SQL Editor. Idempotent (trygt å kjøre flere ganger).
--
-- ENGANGS SERIEBYTTE FØR LANSERING (dokumentert produktbeslutning 2026-07-22):
--   Fakturanumre skal starte på 10000 — femsifrede numre ser etablerte ut og
--   røper ikke hvor få fakturaer et nystartet firma har sendt. Byttet gjøres
--   FØR lansering, som et bevisst, dokumentert seriebytte: bokføringsloven
--   krever ubrutt serie INNEN en serie, men tillater å starte en ny serie når
--   byttet er dokumentert (dette notatet + git-historikken er dokumentasjonen).
--   Hoppet fra dagens teller til 10000 er altså ikke et «hull» i en serie, men
--   overgangen til en ny. Eksisterende fakturaer renummereres IKKE.
--
--   FORWARD-ONLY: tellere løftes bare OPP til 10000 — aldri ned (firmaer som
--   allerede står på ≥ 10000, f.eks. via set_invoice_start_number, røres ikke).

-- ── 1. Nye firma starter på 10000 ────────────────────────────────────────────
ALTER TABLE companies
  ALTER COLUMN next_invoice_seq SET DEFAULT 10000;

-- ── 2. Løft eksisterende tellere under 10000 opp til 10000 ───────────────────
-- (Idempotent: andre kjøring matcher ingen rader.)
UPDATE companies
  SET next_invoice_seq = 10000
  WHERE next_invoice_seq < 10000;
