import { Member } from '../types';
import { serverData } from '../lib/serverData';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * memberService — daftar member.
 *
 * Sumber kebenaran adalah tabel `profiles` di Supabase, yaitu tabel yang sama
 * yang dipakai untuk login. Sebelumnya daftar ini hidup di `serverData`, dan
 * karena Firebase tidak dikonfigurasi, itu berarti localStorage: daftarnya
 * hanya ada di satu browser, dan sama sekali tidak berhubungan dengan akun yang
 * bisa login. Admin bisa melihat member yang tidak punya akun, dan akun yang
 * tidak muncul di daftar.
 *
 * Kalau Supabase belum dikonfigurasi, jalur `serverData` yang lama tetap
 * dipakai supaya aplikasi tidak mati saat dijalankan tanpa backend.
 */

/** Baris `profiles` seperti yang dibaca dari Supabase. */
interface ProfileRow {
  email: string | null;
  name: string | null;
  role: string | null;
  package: string | null;
  initial: string | null;
  status: string | null;
  expiry_date: string | null;
  extension_pending: boolean | null;
  requested_package: string | null;
  is_extension_flagged: boolean | null;
}

const PROFILE_COLUMNS =
  'email, name, role, package, initial, status, expiry_date, ' +
  'extension_pending, requested_package, is_extension_flagged';

const toMemberStatus = (value: string | null): Member['status'] =>
  value === 'ONLINE' || value === 'IN STREAM' ? value : 'OFFLINE';

const rowToMember = (row: ProfileRow): Member => {
  const expiryDate = row.expiry_date ?? '';
  return {
    name: row.name ?? '',
    email: (row.email ?? '').toUpperCase(),
    status: toMemberStatus(row.status),
    package: row.package ?? 'BASIC',
    initial: row.initial ?? (row.name ?? '').slice(0, 1).toUpperCase(),
    expiryDate,
    extensionPending: row.extension_pending ?? false,
    requestedPackage: row.requested_package ?? undefined,
    isExtensionFlagged: row.is_extension_flagged ?? false,
    // Diturunkan dari tanggal, tidak disimpan, supaya tidak pernah basi.
    isExpired: expiryDate !== '' && expiryDate < new Date().toISOString().slice(0, 10),
  };
};

/**
 * Salinan baris yang terakhir dibaca, dipakai untuk mengirim update HANYA untuk
 * member yang benar-benar berubah.
 *
 * Dashboard memanggil saveMembers() setiap kali state `members` berubah, dan
 * mengirimkan seluruh array. Tanpa pembanding ini, satu klik kecil berubah jadi
 * satu permintaan jaringan per member.
 */
let lastKnown = new Map<string, string>();

const mutableFields = (member: Member) => ({
  name: member.name,
  package: member.package,
  status: member.status,
  initial: member.initial,
  expiry_date: member.expiryDate || null,
  extension_pending: member.extensionPending ?? false,
  requested_package: member.requestedPackage ?? null,
  is_extension_flagged: member.isExtensionFlagged ?? false,
});

/** Members — dari tabel `profiles` (fallback: serverData). */
export const getMembers = async (): Promise<Member[]> => {
  if (!isSupabaseConfigured()) return serverData.members.getAll();

  const { data, error } = await getSupabase()
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('role', 'member')
    .order('name');

  if (error) {
    console.error('[members] Gagal membaca profiles:', error.message);
    return [];
  }

  const members = (data as unknown as ProfileRow[]).map(rowToMember);
  lastKnown = new Map(members.map((m) => [m.email, JSON.stringify(mutableFields(m))]));
  return members;
};

/**
 * Simpan perubahan pada member yang SUDAH ada.
 *
 * Tidak membuat baris baru: baris `profiles` terikat ke akun di `auth.users`,
 * dan akun hanya bisa dibuat dengan service_role key yang tinggal di server.
 * Untuk menambah member baru pakai createMember().
 */
export const saveMembers = async (members: Member[]): Promise<void> => {
  if (!isSupabaseConfigured()) return serverData.members.saveAll(members);

  const supabase = getSupabase();

  const changed = members.filter((member) => {
    const snapshot = JSON.stringify(mutableFields(member));
    return lastKnown.get(member.email) !== snapshot;
  });

  if (changed.length === 0) return;

  await Promise.all(
    changed.map(async (member) => {
      const { error } = await supabase
        .from('profiles')
        .update(mutableFields(member))
        .eq('email', member.email);

      if (error) {
        // Member yang login hanya boleh mengubah barisnya sendiri; penolakan di
        // baris orang lain wajar dan tidak perlu menghentikan yang lain.
        console.warn(`[members] Gagal menyimpan ${member.email}:`, error.message);
        return;
      }
      lastKnown.set(member.email, JSON.stringify(mutableFields(member)));
    }),
  );
};

export interface NewMemberInput {
  name: string;
  email: string;
  package: string;
  durationMonths: number;
}

/**
 * Sengaja satu bentuk dengan field opsional, bukan discriminated union:
 * `strict` mati di tsconfig.json, jadi penyempitan lewat `ok` tidak bekerja di
 * sisi pemanggil dan `result.error` akan dianggap tidak ada.
 */
export interface CreateMemberResult {
  ok: boolean;
  member?: Member;
  password?: string;
  error?: string;
}

interface AdminApiPayload {
  error?: string;
  password?: string;
  member?: Member;
}

/**
 * Panggil endpoint admin di server dengan membawa token sesi admin.
 *
 * Semua operasi ini butuh service_role key. Kunci itu melewati seluruh RLS,
 * jadi tidak boleh ada di browser — server yang memegangnya, dan permintaan ini
 * membawa token sesi sebagai bukti identitas.
 */
const callAdminApi = async (
  path: string,
  body: object,
): Promise<{ ok: boolean; payload: AdminApiPayload; error?: string }> => {
  if (!isSupabaseConfigured()) {
    return { ok: false, payload: {}, error: 'Supabase belum dikonfigurasi.' };
  }

  const { data } = await getSupabase().auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    return { ok: false, payload: {}, error: 'Sesi tidak ditemukan. Login ulang sebagai admin.' };
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    return {
      ok: false,
      payload: {},
      error: 'Server tidak merespons. Pastikan npm run dev sedang jalan.',
    };
  }

  const payload = (await response.json().catch(() => ({}))) as AdminApiPayload;
  return { ok: response.ok, payload, error: payload.error };
};

/** Buat akun member betulan (auth + profil). */
export const createMember = async (input: NewMemberInput): Promise<CreateMemberResult> => {
  const { ok, payload, error } = await callAdminApi('/api/admin/members', input);

  if (!ok || !payload.member || !payload.password) {
    return { ok: false, error: error ?? 'Gagal membuat akun member.' };
  }

  lastKnown.set(payload.member.email, JSON.stringify(mutableFields(payload.member)));
  return { ok: true, member: payload.member, password: payload.password };
};

export interface ResetPasswordResult {
  ok: boolean;
  password?: string;
  error?: string;
}

/**
 * Setel ulang password member dan kembalikan password barunya.
 *
 * Sebelumnya dashboard "mereset" password dengan mengarang string di browser
 * lalu menampilkannya — tidak ada yang berubah di Supabase, jadi password yang
 * diserahkan admin ke member tidak pernah bisa dipakai login.
 */
export const resetMemberPassword = async (email: string): Promise<ResetPasswordResult> => {
  const { ok, payload, error } = await callAdminApi('/api/admin/members/password', { email });

  if (!ok || !payload.password) {
    return { ok: false, error: error ?? 'Gagal mereset password.' };
  }
  return { ok: true, password: payload.password };
};
