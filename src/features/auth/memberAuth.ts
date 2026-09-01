import type { Member } from '@/types';

/** Member demo/legacy — boleh login tanpa password */
export const PASSWORDLESS_MEMBER_EMAILS = new Set([
  'SARAH@HUB.COM',
  'LUCAS@HUB.COM',
  'DAVID@HUB.COM',
  'ALEX@HUB.COM',
]);

export function isPasswordlessMember(member: Member): boolean {
  return PASSWORDLESS_MEMBER_EMAILS.has(normalizeMemberEmail(member.email));
}

export function normalizeMemberEmail(email: string): string {
  return email.trim().toUpperCase();
}

export function findMemberByEmail(members: Member[], email: string): Member | undefined {
  const normalized = normalizeMemberEmail(email);
  return members.find((m) => normalizeMemberEmail(m.email) === normalized);
}

/** Login pakai email ATAU nama member (mis. ADI atau Lucas Link) */
export function findMemberByLoginId(members: Member[], loginId: string): Member | undefined {
  const trimmed = loginId.trim();
  if (!trimmed) return undefined;

  const byEmail = findMemberByEmail(members, trimmed);
  if (byEmail) return byEmail;

  const nameQuery = trimmed.toLowerCase();
  const byExactName = members.find((m) => m.name.trim().toLowerCase() === nameQuery);
  if (byExactName) return byExactName;

  const byNamePrefix = members.find((m) => {
    const name = m.name.trim().toLowerCase();
    return name.startsWith(`${nameQuery} `) || name.split(/\s+/)[0] === nameQuery;
  });
  if (byNamePrefix) return byNamePrefix;

  const byInitial = members.find(
    (m) => m.initial?.trim().toUpperCase() === trimmed.toUpperCase()
  );
  return byInitial;
}

export function normalizeMemberSecret(value: string): string {
  return value.trim().toUpperCase();
}

export function memberNeedsPasswordSetup(member: Member | undefined): boolean {
  if (!member) return false;
  // Akun demo/legacy — langsung masuk, tanpa modal buat password
  if (isPasswordlessMember(member)) return false;
  if (member.needsNewPassword) return true;
  return !member.loginPassword && !!member.tempPassword;
}

export function applyMemberLoginPassword(
  member: Member,
  verificationCode: string,
  newPassword: string
): { ok: true; member: Member } | { ok: false; error: string } {
  const verification = normalizeMemberSecret(verificationCode);
  const expected = member.tempPassword ? normalizeMemberSecret(member.tempPassword) : '';

  if (!expected) {
    return { ok: false, error: 'Tidak ada kode verifikasi aktif. Minta Admin generate kode baru.' };
  }

  if (verification !== expected) {
    return { ok: false, error: 'Kode verifikasi salah.' };
  }

  const loginPassword = normalizeMemberSecret(newPassword);
  if (loginPassword.length < 6) {
    return { ok: false, error: 'Password baru minimal 6 karakter.' };
  }

  if (loginPassword === verification) {
    return { ok: false, error: 'Password baru tidak boleh sama dengan kode verifikasi.' };
  }

  return {
    ok: true,
    member: {
      ...member,
      loginPassword,
      tempPassword: undefined,
      needsNewPassword: false,
      resetStatus: 'IDLE',
    },
  };
}
