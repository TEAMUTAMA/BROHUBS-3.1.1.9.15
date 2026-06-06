import type { PlayerData, Project } from '../types';

/** Cari project di semua storage member (BROHUBS_PROJECTS_*) */
export function loadProjectById(projectId: string): Project | null {
  if (!projectId || projectId === 'GLOBAL') return null;

  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('BROHUBS_PROJECTS_')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const projects = JSON.parse(raw) as Project[];
      const found = projects.find((p) => p.id === projectId);
      if (found) return found;
    }
  } catch {
    // ignore parse errors
  }

  return null;
}

/** Pemain yang diinput saat membuat / mengelola Project Event */
export function loadProjectPlayers(projectId: string): PlayerData[] {
  return loadProjectById(projectId)?.players ?? [];
}
