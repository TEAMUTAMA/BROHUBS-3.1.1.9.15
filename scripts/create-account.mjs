#!/usr/bin/env node
/**
 * create-account — buat / perbarui akun login BROHUBS (Supabase Auth).
 *
 * Kenapa perlu script, bukan sign-up dari aplikasi:
 *   Project Supabase ini masih `mailer_autoconfirm: false`, jadi akun yang
 *   lahir dari sign-up biasa menunggu klik email konfirmasi dan tidak bisa
 *   login. Admin API (service_role) membuat akun yang langsung aktif.
 *
 * Prasyarat:
 *   1. supabase/schema-auth.sql sudah dijalankan di SQL Editor.
 *   2. .env.local berisi SUPABASE_SERVICE_ROLE_KEY
 *      (Dashboard → Settings → API → service_role).
 *      TANPA awalan VITE_ — kunci ini melewati semua RLS dan tidak boleh
 *      ikut ke bundle browser.
 *
 * Contoh:
 *   node scripts/create-account.mjs --email admin@brohubs.com --role admin --name "Admin BROHUBS"
 *   node scripts/create-account.mjs --email budi@brohubs.com --role member --package PREMIUM --expiry 30d
 *   node scripts/create-account.mjs --email budi@brohubs.com --password 'PasswordBaru123'
 *
 * Password boleh dikosongkan — script membuatkan yang acak dan menampilkannya
 * sekali di terminal.
 */

import { readFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Kegagalan yang sudah dijelaskan ke user. Dilempar, bukan process.exit(),
 * supaya Node sempat menutup koneksi yang masih terbuka — memanggil
 * process.exit() di tengah request membuat libuv di Windows melempar
 * "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)".
 */
class AbortError extends Error {}
const die = (message) => {
  throw new AbortError(message);
};

// ─── .env loader kecil (menghindari dependensi baru untuk satu script) ──────
const loadEnvFile = (file) => {
  const path = resolve(ROOT, file);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue; // env asli menang
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, '');
  }
};

// ─── Argumen ────────────────────────────────────────────────────────────────
const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
};

const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

// --expiry menerima "2026-12-31", "30d" (30 hari dari hari ini), atau "none".
const resolveExpiry = (raw, role) => {
  if (raw === undefined) return role === 'admin' ? null : addDays(30);
  if (raw === true) die('--expiry butuh nilai, contoh: --expiry 30d atau --expiry 2026-12-31');
  const value = String(raw).trim();
  if (value === '' || value.toLowerCase() === 'none') return null;
  const days = /^(\d+)d$/i.exec(value);
  if (days) return addDays(Number(days[1]));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    die('--expiry harus format YYYY-MM-DD atau Nd (contoh 30d).');
  }
  return value;
};

// Password acak yang lolos syarat umum: huruf besar, kecil, angka, simbol.
const generatePassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  return Array.from(randomBytes(20), (byte) => alphabet[byte % alphabet.length]).join('');
};

const parseOptions = (argv) => {
  const args = parseArgs(argv);

  const email = String(args.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    die('--email wajib diisi dan harus alamat email yang valid.');
  }

  const role = String(args.role ?? 'member').toLowerCase();
  if (!['admin', 'member'].includes(role)) die("--role hanya boleh 'admin' atau 'member'.");

  const pkg = String(args.package ?? (role === 'admin' ? 'ULTIMATE' : 'BASIC')).toUpperCase();
  if (!['BASIC', 'PREMIUM', 'ULTIMATE'].includes(pkg)) {
    die('--package hanya boleh BASIC, PREMIUM, atau ULTIMATE.');
  }

  const name = String(args.name ?? email.split('@')[0]).trim();
  const expiryDate = resolveExpiry(args.expiry, role);

  const generated = args.password === undefined;
  const password = generated ? generatePassword() : String(args.password);
  // 6 = batas keras Supabase (weak_password). Aplikasi sendiri meminta 8 di
  // updateOwnPassword, jadi password 6-7 karakter bisa dibuat lewat script ini
  // tapi TIDAK bisa dipasang ulang oleh member lewat menu ganti password.
  // Cukup untuk akun development; untuk akun sungguhan pakai 8+.
  if (password.length < 6) die('Password minimal 6 karakter (batas Supabase).');

  return { email, role, pkg, name, expiryDate, password, generated };
};

/**
 * Kunci Supabase klasik adalah JWT yang menyebut project-nya sendiri di klaim
 * `ref`. Mencocokkannya dengan URL lebih dulu jauh lebih menolong daripada
 * membiarkan server menjawab "Invalid API key" tanpa menyebut sebabnya —
 * penyebab paling umum adalah kunci tersalin dari project Supabase lain.
 */
const inspectKey = (key) => {
  const parts = key.split('.');
  if (parts.length !== 3) return null; // format baru (sb_secret_…) tidak bisa dibaca di sini
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
  } catch {
    return null;
  }
};

const assertKeyMatchesProject = (url, key) => {
  const claims = inspectKey(key);
  if (!claims) return;

  if (claims.role && claims.role !== 'service_role') {
    die(
      `SUPABASE_SERVICE_ROLE_KEY berisi kunci "${claims.role}", bukan service_role.\n` +
        '    Kunci anon tidak bisa membuat akun. Ambil yang service_role di\n' +
        '    Dashboard → Settings → API.'
    );
  }

  let urlRef = '';
  try {
    urlRef = new URL(url).hostname.split('.')[0];
  } catch {
    die(`VITE_SUPABASE_URL bukan URL yang valid: ${url}`);
  }

  if (claims.ref && urlRef && claims.ref !== urlRef) {
    die(
      'service_role key berasal dari project Supabase yang BERBEDA.\n\n' +
        `      VITE_SUPABASE_URL      → project ${urlRef}\n` +
        `      SERVICE_ROLE_KEY       → project ${claims.ref}\n\n` +
        '    Keduanya harus project yang sama. Buka Dashboard, pastikan yang\n' +
        `    terpilih adalah project ${urlRef}, lalu Settings → API → salin\n` +
        '    ulang service_role key-nya ke .env.local.\n\n' +
        `    (Kalau justru ${claims.ref} yang benar, ganti VITE_SUPABASE_URL dan\n` +
        '    VITE_SUPABASE_ANON_KEY agar ikut project itu.)'
    );
  }
};

const explainProbeError = (error) => {
  const message = error.message ?? String(error);
  if (/invalid api key|jwt|unauthorized/i.test(message)) {
    return (
      `Supabase menolak kuncinya (${message}).\n` +
      '    Salin ulang service_role key dari Dashboard → Settings → API.'
    );
  }
  if (error.code === 'PGRST205' || /could not find the table/i.test(message)) {
    return (
      'Tabel public.profiles belum ada.\n' +
      '    Jalankan dulu supabase/schema-auth.sql di Supabase SQL Editor.'
    );
  }
  return `Gagal membaca tabel profiles: ${message}`;
};

/** Admin API tidak punya getUserByEmail, jadi telusuri halaman demi halaman. */
const findUserByEmail = async (supabase, target) => {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) die(`Gagal membaca daftar user: ${error.message}`);
    const hit = data.users.find((user) => (user.email ?? '').toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
};

const main = async () => {
  loadEnvFile('.env.local');
  loadEnvFile('.env');

  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
    return;
  }

  const { email, role, pkg, name, expiryDate, password, generated } = parseOptions(argv);

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) die('VITE_SUPABASE_URL (atau SUPABASE_URL) belum ada di .env.local.');
  if (!serviceKey) {
    die(
      'SUPABASE_SERVICE_ROLE_KEY belum ada di .env.local.\n' +
        '    Ambil di Supabase Dashboard → Settings → API → service_role,\n' +
        '    lalu tambahkan barisnya TANPA awalan VITE_:\n\n' +
        '      SUPABASE_SERVICE_ROLE_KEY=eyJ...'
    );
  }

  assertKeyMatchesProject(url, serviceKey);

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\n  BROHUBS — akun ${role.toUpperCase()}`);
  console.log(`  Project : ${url}`);
  console.log(`  Email   : ${email}\n`);

  // Deteksi schema-auth.sql belum jalan sebelum membuat user yatim.
  const probe = await supabase.from('profiles').select('id').limit(1);
  if (probe.error) die(explainProbeError(probe.error));

  let user = await findUserByEmail(supabase, email);
  let created = false;

  if (user) {
    console.log('  → Akun auth sudah ada, memakai yang lama.');
    const patch = { email_confirm: true, user_metadata: { ...user.user_metadata, name } };
    if (!generated) patch.password = password;
    const { error } = await supabase.auth.admin.updateUserById(user.id, patch);
    if (error) die(`Gagal memperbarui akun auth: ${error.message}`);
    if (!generated) console.log('  → Password diganti.');
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // langsung aktif; tanpa ini akun menunggu klik email
      user_metadata: { name },
    });
    if (error) die(`Gagal membuat akun auth: ${error.message}`);
    user = data.user;
    created = true;
    console.log('  → Akun auth dibuat (email langsung terkonfirmasi).');
  }

  // Trigger handle_new_user membuat baris profiles otomatis. Kalau schema
  // dipasang setelah user ini lahir, triggernya belum sempat jalan.
  const { data: existingProfile, error: readError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (readError) die(`Gagal membaca profil: ${readError.message}`);

  const profile = {
    email: email.toUpperCase(), // aplikasi & policy RLS memakai email huruf besar
    name,
    role,
    package: pkg,
    initial: (name.slice(0, 1) || email.slice(0, 1)).toUpperCase(),
    expiry_date: expiryDate,
  };

  const { error: writeError } = existingProfile
    ? await supabase.from('profiles').update(profile).eq('id', user.id)
    : await supabase.from('profiles').insert({ id: user.id, ...profile });
  if (writeError) die(`Gagal menulis profil: ${writeError.message}`);

  console.log('  → Profil disimpan.\n');
  console.log('  ─────────────────────────────────────────────');
  console.log(`  Email     : ${email}`);
  console.log(`  Password  : ${created || !generated ? password : '(tidak diubah)'}`);
  console.log(`  Role      : ${role}`);
  console.log(`  Package   : ${pkg}`);
  console.log(`  Masa aktif: ${expiryDate ?? 'tanpa batas'}`);
  console.log('  ─────────────────────────────────────────────');
  if (created || !generated) {
    console.log('\n  Simpan password di password manager — tidak bisa dilihat lagi.');
  }
  console.log('  Login di aplikasi memakai EMAIL (bukan nama/inisial).\n');
};

main().catch((error) => {
  if (!(error instanceof AbortError)) {
    console.error(`\n  ✗ ${error?.message ?? String(error)}\n`);
    if (error?.stack) console.error(error.stack);
  } else {
    console.error(`\n  ✗ ${error.message}\n`);
  }
  process.exitCode = 1;
});
