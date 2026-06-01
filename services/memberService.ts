
import { Member } from '../types';

const STORAGE_KEY_MEMBERS = 'BROHUBS_MEMBERS';

// Helper to get future date
const getFutureDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const MOCK_MEMBERS: Member[] = [
  // 1. Emma Node: 10 days left (Safe, No Modal)
  { name: 'Emma Node', email: 'EMMA@HUB.COM', status: 'ONLINE', package: 'BASIC', initial: 'E', expiryDate: getFutureDate(10) },
  
  // 2. Alex River: 5 days left (Warning, Modal appears, "CONTINUE")
  { name: 'Alex River', email: 'ALEX@HUB.COM', status: 'ONLINE', package: 'PREMIUM', initial: 'A', expiryDate: getFutureDate(0) },
  
  // 3. Sarah Stream: 2 days left (Critical, Modal appears, "EXTEND PLAN")
  { name: 'Sarah Stream', email: 'SARAH@HUB.COM', status: 'IN STREAM', package: 'ULTIMATE', initial: 'S', expiryDate: getFutureDate(4) },
  
  // 4. David Byte: Expired (Expired, Modal appears, Silent Reset on Close)
  { name: 'David Byte', email: 'DAVID@HUB.COM', status: 'OFFLINE', package: 'BASIC', initial: 'D', expiryDate: getFutureDate(-1), isExpired: true },
  
  // Extra for Admin testing
  { name: 'Lucas Link', email: 'LUCAS@HUB.COM', status: 'OFFLINE', package: 'PREMIUM', initial: 'L', expiryDate: getFutureDate(15) },
];

export const getMembers = async (): Promise<Member[]> => {
  // Simulasi latency database (800ms)
  await new Promise(resolve => setTimeout(resolve, 800));

  const saved = localStorage.getItem(STORAGE_KEY_MEMBERS);
  if (saved) {
      return JSON.parse(saved);
  }
  return [...MOCK_MEMBERS];
};

export const saveMembers = async (members: Member[]) => {
    localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(members));
};