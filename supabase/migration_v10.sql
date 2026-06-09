-- migration_v10.sql — Stramme inn RLS for tekniker-tilgang
-- Kjør i Supabase SQL Editor

-- job_notes: teknikere ser kun notater på egne jobber
DROP POLICY IF EXISTS "Team members can view job notes" ON job_notes;
DROP POLICY IF EXISTS "Team members can insert job notes" ON job_notes;

CREATE POLICY "Users can view notes on accessible jobs"
  ON job_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN jobs j ON j.id = job_notes.job_id
      WHERE p.id = auth.uid()
        AND p.company_id = j.company_id
        AND (
          p.role = 'admin'
          OR j.assigned_technician_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can insert notes on accessible jobs"
  ON job_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN jobs j ON j.id = job_notes.job_id
      WHERE p.id = auth.uid()
        AND p.company_id = j.company_id
        AND (
          p.role = 'admin'
          OR j.assigned_technician_id = auth.uid()
        )
    )
  );

-- job_images: teknikere ser kun bilder på egne jobber
-- (dropper de eksisterende og erstatter)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Company members can view job images" ON job_images;
  DROP POLICY IF EXISTS "Company members can insert job images" ON job_images;
  DROP POLICY IF EXISTS "Team members can view job images" ON job_images;
  DROP POLICY IF EXISTS "Team members can insert job images" ON job_images;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can view images on accessible jobs"
  ON job_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN jobs j ON j.id = job_images.job_id
      WHERE p.id = auth.uid()
        AND p.company_id = j.company_id
        AND (
          p.role = 'admin'
          OR j.assigned_technician_id = auth.uid()
        )
    )
  );

CREATE POLICY "Users can insert images on accessible jobs"
  ON job_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN jobs j ON j.id = job_images.job_id
      WHERE p.id = auth.uid()
        AND p.company_id = j.company_id
        AND (
          p.role = 'admin'
          OR j.assigned_technician_id = auth.uid()
        )
    )
  );
