-- migration_v6.sql — Notater per jobb
-- Kjør i Supabase SQL Editor

create table if not exists job_notes (
  id          uuid        primary key default gen_random_uuid(),
  job_id      uuid        not null references jobs(id) on delete cascade,
  company_id  uuid        references companies(id),
  content     text        not null,
  author_name text        not null default 'Ukjent',
  created_at  timestamptz default now()
);

create index if not exists job_notes_job_id_idx on job_notes(job_id);

alter table job_notes enable row level security;

create policy "Team members can view job notes"
  on job_notes for select
  using (
    exists (
      select 1 from profiles p
      join jobs j on j.id = job_notes.job_id
      where p.id = auth.uid()
        and p.company_id = j.company_id
    )
  );

create policy "Team members can insert job notes"
  on job_notes for insert
  with check (
    exists (
      select 1 from profiles p
      join jobs j on j.id = job_notes.job_id
      where p.id = auth.uid()
        and p.company_id = j.company_id
    )
  );
