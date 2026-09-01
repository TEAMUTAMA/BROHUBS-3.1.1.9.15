-- BroHubs — Supabase setup (Projects + Storage)
-- Jalankan di Supabase Dashboard → SQL Editor

-- 1) Tabel project per akun (metadata + JSON)
create table if not exists public.user_projects (
  owner_email text primary key,
  projects jsonb not null default '[]'::jsonb,
  history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_projects enable row level security;

drop policy if exists "brohubs_user_projects_dev_all" on public.user_projects;
create policy "brohubs_user_projects_dev_all"
  on public.user_projects
  for all
  using (true)
  with check (true);

-- 2) Bucket untuk logo/gambar project (gratis 1 GB)
insert into storage.buckets (id, name, public)
values ('brohubs-assets', 'brohubs-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "brohubs_assets_public_read" on storage.objects;
create policy "brohubs_assets_public_read"
  on storage.objects for select
  using (bucket_id = 'brohubs-assets');

drop policy if exists "brohubs_assets_anon_insert" on storage.objects;
create policy "brohubs_assets_anon_insert"
  on storage.objects for insert
  with check (bucket_id = 'brohubs-assets');

drop policy if exists "brohubs_assets_anon_update" on storage.objects;
create policy "brohubs_assets_anon_update"
  on storage.objects for update
  using (bucket_id = 'brohubs-assets');

drop policy if exists "brohubs_assets_anon_delete" on storage.objects;
create policy "brohubs_assets_anon_delete"
  on storage.objects for delete
  using (bucket_id = 'brohubs-assets');
