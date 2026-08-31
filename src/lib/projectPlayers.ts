import type { PlayerData, Project } from '../types';
import { findProjectByIdSync } from '../services/projectService';

/** Cari project di cache / localStorage (sync, untuk output OBS) */
export function loadProjectById(projectId: string): Project | null {
  return findProjectByIdSync(projectId);
}

/** Pemain yang diinput saat membuat / mengelola Project Event */
export function loadProjectPlayers(projectId: string): PlayerData[] {
  return loadProjectById(projectId)?.players ?? [];
}
