-- migration_v6b.sql — Legg til author_role + block UPDATE/DELETE på job_notes
-- Kjør i Supabase SQL Editor

ALTER TABLE job_notes ADD COLUMN IF NOT EXISTS author_role text NOT NULL DEFAULT 'admin';

-- Block all UPDATE on job_notes (notater er permanente)
DROP POLICY IF EXISTS "No updates on job_notes" ON job_notes;
CREATE POLICY "No updates on job_notes"
  ON job_notes FOR UPDATE
  USING (false);

-- Block all DELETE on job_notes
DROP POLICY IF EXISTS "No deletes on job_notes" ON job_notes;
CREATE POLICY "No deletes on job_notes"
  ON job_notes FOR DELETE
  USING (false);
