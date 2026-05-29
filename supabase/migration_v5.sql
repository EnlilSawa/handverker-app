-- migration_v5.sql — Arkiv: job_images tabell + storage bucket
-- Kjør i Supabase SQL Editor

-- 1. Slett gammel tabell om den finnes fra tidligere forsøk
drop table if exists job_images cascade;

-- 2. Opprett job_images med riktig skjema
create table job_images (
  id          uuid        primary key default gen_random_uuid(),
  job_id      uuid        not null references jobs(id) on delete cascade,
  company_id  uuid        references companies(id),
  image_url   text        not null,
  label       text        check (label in ('før', 'etter')),
  uploaded_at timestamptz default now()
);

-- 3. Index for rask oppslag per jobb
create index job_images_job_id_idx on job_images(job_id);

-- 4. Row Level Security
alter table job_images enable row level security;

create policy "Team members can view job images"
  on job_images for select
  using (
    exists (
      select 1 from profiles p
      join jobs j on j.id = job_images.job_id
      where p.id = auth.uid()
        and p.company_id = j.company_id
    )
  );

create policy "Admins can insert job images"
  on job_images for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update image labels"
  on job_images for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete job images"
  on job_images for delete
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 5. Storage bucket
-- OBS: Hvis bucketen allerede eksisterer, hopp over insert-blokken
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-images',
  'job-images',
  true,
  10485760,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp'];

-- 6. Storage RLS-policies
drop policy if exists "Authenticated users can upload job images" on storage.objects;
drop policy if exists "Anyone can view job images" on storage.objects;
drop policy if exists "Authenticated users can delete own uploads" on storage.objects;

create policy "Authenticated users can upload job images"
  on storage.objects for insert
  with check (bucket_id = 'job-images' and auth.role() = 'authenticated');

create policy "Anyone can view job images"
  on storage.objects for select
  using (bucket_id = 'job-images');

create policy "Authenticated users can delete job images"
  on storage.objects for delete
  using (bucket_id = 'job-images' and auth.role() = 'authenticated');
