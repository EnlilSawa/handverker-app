-- Migration v24: Manuell «Send purring» (betalingspåminnelse)
-- Kjør i Supabase SQL Editor. Idempotent.
--
-- KONTEKST:
--   Purringer ved forfalt faktura blir MANUELLE: håndverkeren varsles i appen og
--   sender selv betalingspåminnelsen til kunden via en knapp (samme beløp, ingen
--   purregebyr). Auto-utsendingen av kunde-e-post ved forfalt (-1d/-7d) fjernes i
--   send-invoice-reminders; de før-forfall-automatiske påminnelsene beholdes.

-- 1. Tellere for sendte manuelle purringer
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS reminder_count        INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

-- 2. Utvid invoice_notifications.type-CHECK med dedupe-typene for admin-varslene.
--    (app_notifications.type er fri text → 'purring_needed' trenger ingen endring.)
--    Drop+add for idempotens (standard auto-navn på kolonne-CHECK).
ALTER TABLE invoice_notifications DROP CONSTRAINT IF EXISTS invoice_notifications_type_check;
ALTER TABLE invoice_notifications ADD CONSTRAINT invoice_notifications_type_check
  CHECK (type IN (
    'reminder_3days','due_today','overdue_1day','overdue_7days',
    'purring_needed_1day','purring_needed_7days'
  ));
