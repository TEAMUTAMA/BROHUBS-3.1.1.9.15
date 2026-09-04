-- ═══════════════════════════════════════════════════════════════════════════
-- BROHUBS — Langkah 03: pengetatan aturan akses (K-02)
--
-- ⚠️  JANGAN JALANKAN INI DULU.
--
-- File ini menutup akses anon ke project dan bucket aset. Selama aplikasi
-- belum login lewat Supabase Auth, menjalankannya akan membuat project
-- berhenti termuat dan unggah gambar gagal.
--
-- Prasyarat sebelum menjalankan:
--   1. schema-auth.sql sudah dijalankan
--   2. Akun admin pertama sudah dibuat dan role-nya sudah 'admin'
--   3. Login lewat Supabase Auth sudah terbukti bekerja di aplikasi
--   4. Project dan unggah gambar sudah diuji dalam keadaan login
--
-- Cara mundur kalau ada yang salah ada di bagian paling bawah file ini.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1) user_projects: hanya pemilik (atau admin) ───────────────────────────

drop policy if exists "brohubs_user_projects_dev_all" on public.user_projects;

drop policy if exists "user_projects_owner_all" on public.user_projects;
create policy "user_projects_owner_all"
  on public.user_projects for all
  to authenticated
  using (
    owner_email = upper(auth.jwt() ->> 'email')
    or public.is_admin()
  )
  with check (
    owner_email = upper(auth.jwt() ->> 'email')
    or public.is_admin()
  );

-- ─── 2) Bucket aset ─────────────────────────────────────────────────────────
--
-- BACA tetap publik dan itu memang disengaja: OBS/vMix membuka URL gambar
-- tanpa sesi login. Yang ditutup adalah tulis dan hapus.

drop policy if exists "brohubs_assets_anon_insert" on storage.objects;
drop policy if exists "brohubs_assets_anon_update" on storage.objects;
drop policy if exists "brohubs_assets_anon_delete" on storage.objects;

drop policy if exists "brohubs_assets_auth_insert" on storage.objects;
create policy "brohubs_assets_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'brohubs-assets');

drop policy if exists "brohubs_assets_auth_update" on storage.objects;
create policy "brohubs_assets_auth_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'brohubs-assets')
  with check (bucket_id = 'brohubs-assets');

drop policy if exists "brohubs_assets_auth_delete" on storage.objects;
create policy "brohubs_assets_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'brohubs-assets');

-- ─── 3) Verifikasi ──────────────────────────────────────────────────────────
--
--   select policyname, roles, cmd from pg_policies
--   where tablename in ('user_projects', 'objects')
--   order by tablename, policyname;
--
-- Yang diharapkan: tidak ada lagi policy tulis untuk role `anon`.

-- ═══════════════════════════════════════════════════════════════════════════
-- CARA MUNDUR (kalau produksi mendadak bermasalah dan butuh cepat pulih):
--
--   create policy "brohubs_user_projects_dev_all"
--     on public.user_projects for all using (true) with check (true);
--
-- Ini mengembalikan lubang K-02. Pakai hanya sebagai darurat sementara,
-- lalu segera cari akar masalahnya.
-- ═══════════════════════════════════════════════════════════════════════════
