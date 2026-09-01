import { getMembers } from '@/services/memberService';
import {
  findMemberByLoginId,
  isPasswordlessMember,
  memberNeedsPasswordSetup,
  normalizeMemberEmail,
  normalizeMemberSecret,
} from './memberAuth';

export type LoginResult =
  | { role: 'admin' }
  | { role: 'member'; memberEmail: string; requiresPasswordSetup: boolean }
  | null;

export const loginUser = async (username: string, password: string): Promise<LoginResult> => {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const upperUser = normalizeMemberEmail(username);
  const normalizedPassword = normalizeMemberSecret(password);

  // Admin Login
  if (upperUser === 'A' && normalizedPassword === '') {
    return { role: 'admin' };
  }

  const members = await getMembers();
  const member = findMemberByLoginId(members, username);

  if (!member) {
    if (upperUser === 'A' && normalizedPassword === 'A') {
      return { role: 'member', memberEmail: 'A', requiresPasswordSetup: false };
    }
    return null;
  }

  // Member demo/legacy — boleh tanpa password, langsung masuk dashboard
  if (!normalizedPassword && isPasswordlessMember(member)) {
    return {
      role: 'member',
      memberEmail: member.email,
      requiresPasswordSetup: false,
    };
  }

  // Member baru wajib isi password / kode verifikasi
  if (!normalizedPassword) {
    return null;
  }

  const loginPass = member.loginPassword ? normalizeMemberSecret(member.loginPassword) : '';
  const verification = member.tempPassword ? normalizeMemberSecret(member.tempPassword) : '';

  // Login dengan password permanen member
  if (loginPass && normalizedPassword === loginPass) {
    return {
      role: 'member',
      memberEmail: member.email,
      requiresPasswordSetup: isPasswordlessMember(member)
        ? false
        : !!member.needsNewPassword,
    };
  }

  // Login dengan kode verifikasi Admin (pertama kali / reset password)
  if (verification && normalizedPassword === verification) {
    return {
      role: 'member',
      memberEmail: member.email,
      requiresPasswordSetup: !isPasswordlessMember(member),
    };
  }

  return null;
};
