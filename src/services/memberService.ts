import { Member } from '../types';
import { serverData } from '../lib/serverData';

/** Members — penyimpanan lewat lib/serverData (Firebase / localStorage) */
export const getMembers = async (): Promise<Member[]> => {
  return serverData.members.getAll();
};

export const saveMembers = async (members: Member[]): Promise<void> => {
  return serverData.members.saveAll(members);
};
