/**
 * authService — autentikasi lewat Supabase Auth.
 *
 * Perubahan mendasar dari versi sebelumnya (temuan K-03 & K-04):
 *
 *   DULU  seluruh daftar member ditarik ke browser, password dibandingkan
 *         sebagai string biasa, dan peran ditentukan di sisi client. Siapa pun
 *         bisa melewatinya lewat DevTools, dan ada admin bypass tanpa password.
 *
 *   KINI  password diverifikasi Supabase (hash, tidak pernah sampai ke browser),
 *         peran dibaca dari kolom `role` di tabel `profiles` yang dilindungi
 *         RLS, dan sesi berupa JWT yang bisa diverifikasi server.
 *
 * Login memakai EMAIL. Login dengan nama/inisial sengaja dihapus: memetakan
 * nama ke email tanpa sesi berarti menyediakan endpoint enumerasi member.
 */

import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export type UserRole = 'admin' | 'member';

export type LoginResult =
  | { role: 'admin'; email: string }
  | { role: 'member'; memberEmail: string; requiresPasswordSetup: boolean }
  | null;

/** Email pemilik sesi, apa pun perannya. */
export const emailOf = (result: NonNullable<LoginResult>): string =>
  result.role === 'admin' ? result.email : result.memberEmail;

export interface AuthProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  package: string;
  initial: string;
}

/** Email disimpan huruf besar agar konsisten dengan data lama & policy RLS. */
const normalizeEmail = (email: string) => email.trim().toUpperCase();

/**
 * Login pakai USERNAME saja — user tidak perlu mengetik email.
 *
 * Cara kerjanya: username ditempeli `@` + VITE_LOGIN_DOMAIN, lalu hasilnya
 * dipakai sebagai email untuk Supabase. Jadi "andi" → "andi@brohubs.com".
 * Supabase tetap menyimpan identitas sebagai email (itu wajib di GoTrue —
 * tidak bisa dimatikan), tapi user tidak pernah melihatnya.
 *
 * Karena username adalah bagian sebelum "@", keunikannya otomatis dijamin
 * oleh keunikan email di auth.users. Tidak perlu kolom atau tabel baru.
 *
 * Kenapa ini TIDAK mengulang lubang login-nama yang dulu dihapus:
 *   Yang dulu berbahaya adalah memetakan nama → email lewat pencarian ke
 *   daftar member tanpa sesi — itu menyediakan endpoint enumerasi member.
 *   Di sini pemetaannya cuma penggabungan string di browser, nol permintaan
 *   ke database. Tidak ada yang bisa ditanyai, jadi tidak ada yang bisa
 *   dienumerasi. Domain login sendiri bukan rahasia — ia muncul di setiap
 *   alamat email member.
 *
 * Input yang sudah mengandung "@" tidak pernah disentuh, jadi akun lama yang
 * memakai email asli (mis. david@mediassassin.com) tetap bisa login dengan
 * mengetik email penuhnya.
 *
 * Setelan di .env.local:
 *
 *   VITE_LOGIN_DOMAIN=brohubs.com
 *
 * Kalau kosong, login kembali menuntut email penuh seperti sebelumnya.
 *
 * VITE_DEV_LOGIN_ALIASES tetap ada untuk testing akun yang domainnya
 * menyimpang, dan sengaja dikurung `import.meta.env.DEV` supaya daftar email
 * itu tidak pernah ikut ke bundle produksi.
 */
const parseDevAliases = (raw: string | undefined): Record<string, string> => {
  const aliases: Record<string, string> = {};
  if (!raw) return aliases;

  for (const entry of raw.split(',')) {
    const separator = entry.indexOf(':');
    if (separator === -1) continue;
    const username = entry.slice(0, separator).trim().toLowerCase();
    const email = entry.slice(separator + 1).trim().toLowerCase();
    if (username && email.includes('@')) aliases[username] = email;
  }
  return aliases;
};

export const resolveLoginIdentifier = (raw: string): string => {
  const value = raw.trim().toLowerCase();
  if (value === '' || value.includes('@')) return value;

  if (import.meta.env.DEV) {
    const alias = parseDevAliases(import.meta.env.VITE_DEV_LOGIN_ALIASES)[value];
    if (alias) return alias;
  }

  const domain = String(import.meta.env.VITE_LOGIN_DOMAIN ?? '').trim().toLowerCase();
  if (domain) return `${value}@${domain}`;

  // VITE_LOGIN_DOMAIN belum diisi → tidak ada yang bisa disimpulkan dari
  // username. Biarkan apa adanya; Supabase menolaknya seperti input salah
  // biasa, tanpa membocorkan apa pun.
  return value;
};

export class AuthNotConfiguredError extends Error {
  constructor() {
    super(
      '[auth] Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan ' +
        'VITE_SUPABASE_ANON_KEY di .env.local, lalu jalankan supabase/schema-auth.sql.'
    );
    this.name = 'AuthNotConfiguredError';
  }
}

/** Ambil profil (peran, paket, dll) milik user yang sedang login. */
export const fetchProfile = async (userId: string): Promise<AuthProfile | null> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, role, package, initial')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[auth] Gagal membaca profil:', error.message);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    email: normalizeEmail(data.email ?? ''),
    name: data.name ?? '',
    role: data.role === 'admin' ? 'admin' : 'member',
    package: data.package ?? 'BASIC',
    initial: data.initial ?? '',
  };
};

const toLoginResult = (profile: AuthProfile): LoginResult => {
  if (profile.role === 'admin') return { role: 'admin', email: profile.email };
  return {
    role: 'member',
    memberEmail: profile.email,
    // Supabase menangani reset password lewat email, jadi alur "buat password
    // dengan kode verifikasi" yang lama tidak dipakai lagi.
    requiresPasswordSetup: false,
  };
};

/**
 * @param identifier Email. Saat `npm run dev` boleh juga username — lihat
 *                   resolveLoginIdentifier.
 */
export const loginUser = async (identifier: string, password: string): Promise<LoginResult> => {
  if (!isSupabaseConfigured()) {
    throw new AuthNotConfiguredError();
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: resolveLoginIdentifier(identifier),
    password,
  });

  if (error || !data.user) {
    // Jangan bedakan "email tidak ada" dari "password salah" — itu membocorkan
    // email mana yang terdaftar.
    return null;
  }

  const profile = await fetchProfile(data.user.id);
  if (!profile) {
    console.error('[auth] Login berhasil tapi profil tidak ditemukan. Jalankan supabase/schema-auth.sql.');
    await supabase.auth.signOut();
    return null;
  }

  return toLoginResult(profile);
};

export const logoutUser = async (): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  const { error } = await getSupabase().auth.signOut();
  if (error) console.error('[auth] Gagal logout:', error.message);
};

/**
 * Pulihkan sesi yang tersimpan (dipanggil saat app boot).
 * Tanpa ini, refresh halaman selalu melempar user kembali ke landing page.
 */
export const restoreSession = async (): Promise<LoginResult> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;

  const profile = await fetchProfile(user.id);
  return profile ? toLoginResult(profile) : null;
};

/** Kirim email reset password (menggantikan alur kode verifikasi manual). */
export const requestPasswordReset = async (email: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/?view=reset-password`,
  });

  if (error) {
    console.error('[auth] Gagal mengirim email reset:', error.message);
    return false;
  }
  return true;
};

/** Ganti password user yang sedang login. */
export const updateOwnPassword = async (
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> => {
  if (newPassword.length < 8) {
    return { ok: false, error: 'Password minimal 8 karakter.' };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Supabase belum dikonfigurasi.' };
  }

  const { error } = await getSupabase().auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
};
