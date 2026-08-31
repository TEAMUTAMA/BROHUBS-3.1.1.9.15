import { AppUpdateTask } from '../types';
import { serverData } from '../lib/serverData';

/** Task internal admin — penyimpanan lewat lib/serverData (bisa ganti Firebase/Supabase/Express) */
export const getTasks = async (): Promise<AppUpdateTask[]> => {
  return serverData.adminTasks.getAll();
};

export const saveTasks = async (tasks: AppUpdateTask[]): Promise<void> => {
  return serverData.adminTasks.saveAll(tasks);
};
