import { serverData } from '@/lib/serverData';
import type { MemberNotification } from '@/types';

export async function getNotifications(): Promise<MemberNotification[]> {
  return serverData.notifications.getAll();
}

export async function saveNotifications(notifications: MemberNotification[]): Promise<void> {
  return serverData.notifications.saveAll(notifications);
}
