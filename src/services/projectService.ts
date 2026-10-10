import type { Project } from '../types';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { uploadEmbeddedImages } from '../lib/supabaseStorage';
import { slugify } from '../lib/outputRoute';

const PROJECTS_KEY_PREFIX = 'BROHUBS_PROJECTS_';
const HISTORY_KEY_PREFIX = 'BROHUBS_PROJECTS_HISTORY_';

const projectCache = new Map<string, Project>();

function projectsStorageKey(ownerEmail: string): string {
  return `${PROJECTS_KEY_PREFIX}${ownerEmail || 'GUEST'}`;
}

function historyStorageKey(ownerEmail: string): string {
  return `${HISTORY_KEY_PREFIX}${ownerEmail || 'GUEST'}`;
}

function readLocalProjects(ownerEmail: string): Project[] {
  try {
    const raw = localStorage.getItem(projectsStorageKey(ownerEmail));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readLocalHistory(ownerEmail: string): Project[] {
  try {
    const raw = localStorage.getItem(historyStorageKey(ownerEmail));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalProjects(ownerEmail: string, projects: Project[]): void {
  localStorage.setItem(projectsStorageKey(ownerEmail), JSON.stringify(projects));
}

function writeLocalHistory(ownerEmail: string, history: Project[]): void {
  localStorage.setItem(historyStorageKey(ownerEmail), JSON.stringify(history));
}

export function isSupabaseProjectsEnabled(): boolean {
  return isSupabaseConfigured();
}

export function seedProjectCache(projects: Project[]): void {
  for (const project of projects) {
    projectCache.set(project.id, project);
  }
}

export function findProjectByIdSync(projectId: string): Project | null {
  if (!projectId || projectId === 'GLOBAL') return null;

  const cached = projectCache.get(projectId);
  if (cached) return cached;

  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(PROJECTS_KEY_PREFIX) || key.includes('_HISTORY_')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const projects = JSON.parse(raw) as Project[];
      const found = projects.find((p) => p.id === projectId);
      if (found) {
        projectCache.set(found.id, found);
        return found;
      }
    }
  } catch {
    // ignore parse errors
  }

  return null;
}

async function migrateLocalToSupabase(ownerEmail: string): Promise<{
  projects: Project[];
  history: Project[];
}> {
  const localProjects = readLocalProjects(ownerEmail);
  const localHistory = readLocalHistory(ownerEmail);
  if (localProjects.length === 0 && localHistory.length === 0) {
    return { projects: [], history: [] };
  }

  await saveUserProjects(ownerEmail, localProjects);
  await saveUserHistory(ownerEmail, localHistory);
  console.info(`[projectService] Migrasi localStorage → Supabase untuk ${ownerEmail}`);
  return { projects: localProjects, history: localHistory };
}

export async function loadUserProjects(ownerEmail: string): Promise<{
  projects: Project[];
  history: Project[];
}> {
  if (!isSupabaseProjectsEnabled()) {
    const projects = readLocalProjects(ownerEmail);
    const history = readLocalHistory(ownerEmail);
    seedProjectCache(projects);
    return { projects, history };
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_projects')
    .select('projects, history')
    .eq('owner_email', ownerEmail)
    .maybeSingle();

  if (error) {
    console.error('[projectService] Gagal baca Supabase, fallback localStorage', error);
    const projects = readLocalProjects(ownerEmail);
    const history = readLocalHistory(ownerEmail);
    seedProjectCache(projects);
    return { projects, history };
  }

  if (!data) {
    return migrateLocalToSupabase(ownerEmail);
  }

  const projects = (data.projects ?? []) as Project[];
  const history = (data.history ?? []) as Project[];
  seedProjectCache(projects);
  return { projects, history };
}

export async function saveUserProjects(ownerEmail: string, projects: Project[]): Promise<void> {
  seedProjectCache(projects);

  if (!isSupabaseProjectsEnabled()) {
    try {
      writeLocalProjects(ownerEmail, projects);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        throw new Error('DATABASE STORAGE IS FULL. PLEASE REMOVE SOME PROJECTS OR USE SMALLER IMAGES.');
      }
      throw e;
    }
    return;
  }

  const processed = await uploadEmbeddedImages(
    projects,
    `projects/${encodeURIComponent(ownerEmail)}`,
    'img'
  );

  const supabase = getSupabase();
  const { error } = await supabase.from('user_projects').upsert(
    {
      owner_email: ownerEmail,
      projects: processed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'owner_email' }
  );

  if (error) {
    console.error('[projectService] Gagal simpan projects ke Supabase', error);
    writeLocalProjects(ownerEmail, projects);
    throw error;
  }
}

export async function saveUserHistory(ownerEmail: string, history: Project[]): Promise<void> {
  if (!isSupabaseProjectsEnabled()) {
    writeLocalHistory(ownerEmail, history);
    return;
  }

  const processed = await uploadEmbeddedImages(
    history,
    `history/${encodeURIComponent(ownerEmail)}`,
    'img'
  );

  const supabase = getSupabase();

  // JANGAN ikut menulis kolom `projects` di sini.
  //
  // Menghapus project mengubah DUA state sekaligus (projects & history), dan
  // Dashboard menyimpan keduanya lewat effect terpisah yang berjalan bersamaan.
  // Versi sebelumnya membaca `projects` lebih dulu lalu mengirimkannya kembali
  // dalam upsert ini — read-modify-write klasik. Kalau tulisan ini mendarat
  // setelah saveUserProjects, ia mengembalikan daftar project versi SEBELUM
  // penghapusan, sehingga project yang sudah dihapus muncul lagi begitu browser
  // di-refresh.
  //
  // Dengan kolom `projects` tidak disebut, upsert hanya menyentuh `history`;
  // pada baris baru kolom itu memakai default `'[]'::jsonb` dari schema.
  const { error } = await supabase.from('user_projects').upsert(
    {
      owner_email: ownerEmail,
      history: processed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'owner_email' }
  );

  if (error) {
    console.error('[projectService] Gagal simpan history ke Supabase', error);
    writeLocalHistory(ownerEmail, history);
    throw error;
  }
}

export async function loadProjectsForOwners(
  owners: string[]
): Promise<Record<string, Project[]>> {
  const uniqueOwners = [...new Set(owners.filter(Boolean))];
  const result: Record<string, Project[]> = {};

  if (!isSupabaseProjectsEnabled()) {
    for (const owner of uniqueOwners) {
      result[owner] = readLocalProjects(owner);
    }
    return result;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_projects')
    .select('owner_email, projects')
    .in('owner_email', uniqueOwners);

  if (error) {
    console.error('[projectService] Gagal baca semua projects', error);
    for (const owner of uniqueOwners) {
      result[owner] = readLocalProjects(owner);
    }
    return result;
  }

  for (const owner of uniqueOwners) {
    result[owner] = [];
  }

  for (const row of data ?? []) {
    const projects = (row.projects ?? []) as Project[];
    result[row.owner_email] = projects;
    seedProjectCache(projects);
  }

  return result;
}

export async function findProjectById(projectId: string): Promise<Project | null> {
  const cached = findProjectByIdSync(projectId);
  if (cached) return cached;

  if (!isSupabaseProjectsEnabled()) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase.from('user_projects').select('projects');

  if (error) {
    console.error('[projectService] findProjectById gagal', error);
    return null;
  }

  for (const row of data ?? []) {
    const projects = (row.projects ?? []) as Project[];
    const found = projects.find((p) => p.id === projectId);
    if (found) {
      projectCache.set(found.id, found);
      return found;
    }
  }

  return null;
}

export async function findProjectIdByNameSlug(projectSlug: string): Promise<string | null> {
  const normalized = projectSlug.toLowerCase();

  if (!isSupabaseProjectsEnabled()) {
    try {
      for (const key of Object.keys(localStorage)) {
        if (!key.startsWith(PROJECTS_KEY_PREFIX) || key.includes('_HISTORY_')) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const projects = JSON.parse(raw) as Project[];
        const match = projects.find((p) => slugify(p.name) === normalized);
        if (match) return match.id;
      }
    } catch {
      // ignore
    }
    return null;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.from('user_projects').select('projects');

  if (error) {
    console.error('[projectService] findProjectIdByNameSlug gagal', error);
    return null;
  }

  for (const row of data ?? []) {
    const projects = (row.projects ?? []) as Project[];
    const match = projects.find((p) => slugify(p.name) === normalized);
    if (match) {
      projectCache.set(match.id, match);
      return match.id;
    }
  }

  return null;
}

export async function hydrateProjectCacheForScope(projectId: string): Promise<void> {
  if (!projectId || projectId === 'GLOBAL') return;
  await findProjectById(projectId);
}
