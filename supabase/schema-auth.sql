-- ═══════════════════════════════════════════════════════════════════════════
-- BROHUBS — Langkah 02a: fondasi Supabase Auth
-- Jalankan di Supabase Dashboard → SQL Editor
--
-- File ini AMAN dijalankan sekarang: semuanya bersifat menambah.
-- Tidak ada policy lama yang diperketat di sini, jadi aplikasi yang sedang
-- jalan tidak akan putus. Pengetatan ada di schema-lockdown.sql, dan itu
-- BARU dijalankan setelah login lewat Supabase Auth terbukti bekerja.
--
-- Catatan penting: tabel ini TIDAK punya kolom password. Password hidup di
-- auth.users milik Supabase dalam bentuk hash. Itulah inti perbaikan K-03.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1) Profil member — data non-rahasia yang menempel ke akun auth ─────────

create table if not exists public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  email                 text unique not null,
  name                  text not null default '',
  role                  text not null default 'member' check (role in ('admin', 'member')),
  package               text not null default 'BASIC' check (package in ('BASIC', 'PREMIUM', 'ULTIMATE')),
  initial               text not null default '',
  status                text not null default 'OFFLINE' check (status in ('ONLINE', 'IN STREAM', 'OFFLINE')),
  expiry_date           date,
  extension_pending     boolean not null default false,
  requested_package     text,
  is_extension_flagged  boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.profiles is
  'Profil member BROHUBS. Password TIDAK disimpan di sini — auth.users yang memegangnya (hashed).';

-- `isExpired` di aplikasi diturunkan dari tanggal, bukan disimpan, supaya
-- tidak pernah basi.
create or replace view public.profiles_with_status as
  select
    p.*,
    (p.expiry_date is not null and p.expiry_date < current_date) as is_expired
  from public.profiles p;

-- ─── 2) Pengecekan admin ────────────────────────────────────────────────────
--
-- WAJIB security definer: kalau policy pada `profiles` membaca `profiles`
-- secara langsung, RLS-nya memanggil dirinya sendiri dan Postgres melempar
-- infinite recursion. Function ini menembus RLS sekali, jadi aman dipakai
-- di dalam policy mana pun.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ─── 3) Buat profil otomatis setiap kali akun auth dibuat ───────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
begin
  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, name, initial)
  values (
    new.id,
    upper(new.email),
    display_name,
    upper(left(display_name, 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── 4) Cegah member menaikkan haknya sendiri ───────────────────────────────
--
-- RLS mengatur BARIS mana yang boleh disentuh, bukan KOLOM mana. Tanpa
-- penjaga ini, member yang boleh meng-update barisnya sendiri bisa menyetel
-- role = 'admin'. Trigger memeriksa nilai lama vs baru, sesuatu yang tidak
-- bisa dilakukan oleh `with check`.

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Konteks tepercaya = tidak ada sesi end-user di balik perintah ini:
  -- SQL Editor dashboard, psql, atau service_role key yang hanya hidup di
  -- server. Di sana auth.uid() null sehingga is_admin() otomatis false.
  -- Tanpa pengecualian ini admin pertama mustahil dibuat — perintah
  -- `update profiles set role = 'admin'` di SQL Editor akan ditolak trigger
  -- ini sendiri.
  --
  -- Ini tidak melonggarkan apa pun bagi browser: anon key tidak pernah lolos
  -- RLS (policy update hanya `to authenticated`), dan member yang login selalu
  -- punya auth.uid() sehingga tetap dijaga penuh di bawah.
  is_trusted_context boolean := auth.uid() is null;
begin
  if not is_trusted_context and not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Hanya admin yang boleh mengubah role';
    end if;
    if new.package is distinct from old.package then
      raise exception 'Hanya admin yang boleh mengubah package';
    end if;
    if new.expiry_date is distinct from old.expiry_date then
      raise exception 'Hanya admin yang boleh mengubah masa aktif';
    end if;
    if new.email is distinct from old.email then
      raise exception 'Email mengikuti akun auth dan tidak bisa diubah di sini';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ─── 5) RLS untuk profiles ──────────────────────────────────────────────────

alter table public.profiles enable row level security;

-- Member: baca barisnya sendiri. Admin: baca semua.
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

-- Member: ubah barisnya sendiri (kolom sensitif dijaga trigger di atas).
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admin: penuh.
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- SETELAH menjalankan file ini, buat akun admin pertama.
--
-- CARA A — script (paling cepat, sekaligus untuk menambah member nanti):
--
--        npm run account -- --email admin@brohubs.com --role admin --name "Admin"
--        npm run account -- --email budi@brohubs.com  --role member --package PREMIUM --expiry 30d
--
--   Butuh SUPABASE_SERVICE_ROLE_KEY di .env.local. Rinciannya ada di
--   scripts/create-account.mjs.
--
-- CARA B — manual lewat dashboard:
--
--   1. Dashboard → Authentication → Users → "Add user"
--      Email    : email admin kamu
--      Password : password kuat
--      Centang "Auto Confirm User"   ← wajib, tanpa ini tidak bisa login
--
--   2. Kembali ke SQL Editor, jalankan (ganti emailnya):
--
--        update public.profiles
--        set role = 'admin', package = 'ULTIMATE', name = 'Admin'
--        where email = upper('email-admin-kamu@contoh.com');
--
--   3. Verifikasi:
--
--        select email, role, package from public.profiles;
-- ═══════════════════════════════════════════════════════════════════════════
