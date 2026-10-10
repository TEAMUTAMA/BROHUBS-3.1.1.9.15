import { ASSET_DATABASE } from '@/features/assets/assets';
import { findProjectIdByNameSlug } from '../services/projectService';
import type { Asset, Project } from '../types';

// Definisinya ada di lib/slugify.ts supaya server bisa memakai aturan yang
// sama persis. Di-re-export agar import lama tetap jalan.
export { slugify } from './slugify';
import { slugify } from './slugify';

export interface OutputRouteParams {
  memberSlug: string;
  projectSlug: string;
  assetSlug: string;
}

/**
 * Segmen project di URL output: `{slug-nama}-{id}`.
 *
 * Bentuk ini dipilih supaya link mandiri: id-nya ada di dalam path, jadi tidak
 * perlu `?project=` dan tidak bergantung pada localStorage atau sesi login.
 * Efek sampingnya link jadi tahan ganti nama — nama boleh berubah, id tidak.
 *
 * Nama project tidak unik (bisa ada dua "PROJECT B" dalam satu member), jadi
 * slug saja memang tidak akan pernah cukup.
 */
export const buildProjectSegment = (projectName: string, projectId: string): string => {
  const slug = slugify(projectName);
  return slug ? `${slug}-${projectId}` : projectId;
};

/**
 * Pisahkan segmen project jadi calon id dan slug tanpa id.
 *
 * `candidateId` HANYA calon, bukan kepastian: slug seperti `grand-final` juga
 * berakhiran kata yang menyerupai id. Pembuktiannya dilakukan pihak yang punya
 * data — server `/api/output/resolve`, atau pencocokan ke daftar project.
 */
export const splitProjectSegment = (segment: string) => {
  const lastDash = segment.lastIndexOf('-');
  if (lastDash <= 0) return { candidateId: '', slugWithoutId: segment };
  return {
    candidateId: segment.slice(lastDash + 1),
    slugWithoutId: segment.slice(0, lastDash),
  };
};

/** Matches /o/{member}/{project}/{asset} public output URLs */
export function parseOutputPath(pathname: string): OutputRouteParams | null {
  const match = pathname.match(/^\/o\/([^/]+)\/([^/]+)\/([^/]+)\/?$/i);
  if (!match) return null;
  return {
    memberSlug: decodeURIComponent(match[1]),
    projectSlug: decodeURIComponent(match[2]),
    assetSlug: decodeURIComponent(match[3]),
  };
}

export function resolveAssetFromSlug(assetSlug: string): Asset | undefined {
  const normalized = assetSlug.toLowerCase();
  return ASSET_DATABASE.find(
    (a) => slugify(a.name) === normalized || a.id.toLowerCase() === normalized
  );
}

/** Resolve asset id from ?asset= or /o/.../.../{asset-slug} */
export function resolveAssetIdFromLocation(
  pathname = window.location.pathname,
  search = window.location.search
): string | null {
  const params = new URLSearchParams(search);
  const queryAsset = params.get('asset');
  if (queryAsset) return queryAsset;

  const route = parseOutputPath(pathname);
  if (!route) return null;

  return resolveAssetFromSlug(route.assetSlug)?.id ?? null;
}

/** PGM bus scope: ?project= id, or project slug from /o/ path, else GLOBAL (admin studio). */
export function resolveProjectScopeFromLocation(
  pathname = window.location.pathname,
  search = window.location.search
): string {
  const params = new URLSearchParams(search);
  const queryProject = params.get('project');
  if (queryProject) return queryProject;

  const route = parseOutputPath(pathname);
  if (!route || route.projectSlug === 'default') return 'GLOBAL';

  const segment = route.projectSlug.toLowerCase();
  const { candidateId, slugWithoutId } = splitProjectSegment(segment);

  try {
    const projectKeys = Object.keys(localStorage).filter((k) => k.startsWith('BROHUBS_PROJECTS_'));
    for (const key of projectKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const projects = JSON.parse(raw) as Project[];

      // Id lebih dulu: pasti, dan tetap cocok walau project sudah diganti nama.
      const byId = candidateId && projects.find((p) => p.id === candidateId);
      if (byId) return byId.id;

      const byName = projects.find(
        (p) => slugify(p.name) === segment || slugify(p.name) === slugWithoutId
      );
      if (byName) return byName.id;
    }
  } catch {
    // ignore parse errors
  }

  return 'GLOBAL';
}

/**
 * Tanya server: slug project ini id-nya apa?
 *
 * Ini satu-satunya cara yang bekerja di OBS/vMix. Halaman `/o/...` dibuka tanpa
 * login, jadi klien Supabase memakai kunci anon dan RLS `user_projects` hanya
 * mengizinkan pemiliknya — pencarian slug langsung ke Supabase selalu kosong.
 * localStorage juga bukan jalan keluar: browser bawaan OBS punya penyimpanan
 * sendiri yang terpisah dari Chrome.
 */
async function resolveProjectIdFromServer(
  projectSlug: string,
  memberSlug: string
): Promise<string | null> {
  try {
    const query = new URLSearchParams({ project: projectSlug, member: memberSlug });
    const response = await fetch(`/api/output/resolve?${query}`);
    if (!response.ok) return null;
    const payload = (await response.json()) as { projectId?: string };
    return payload.projectId ?? null;
  } catch {
    // Server tidak jalan (mis. build statis tanpa Express) — bukan alasan untuk
    // gagal total; pemanggil masih punya jalur cadangan di bawah.
    return null;
  }
}

/** Async: resolve slug /o/.../project-slug/... lewat server, Supabase, atau localStorage */
export async function resolveProjectScopeFromLocationAsync(
  pathname = window.location.pathname,
  search = window.location.search
): Promise<string> {
  const params = new URLSearchParams(search);
  const queryProject = params.get('project');
  if (queryProject) return queryProject;

  const route = parseOutputPath(pathname);
  if (!route || route.projectSlug === 'default') return 'GLOBAL';

  const segment = route.projectSlug.toLowerCase();
  const { candidateId, slugWithoutId } = splitProjectSegment(segment);

  // Server lebih dulu: ini jalur yang bekerja tanpa login dan tanpa localStorage,
  // dan ia yang membuktikan apakah calon id benar-benar ada.
  const fromServer = await resolveProjectIdFromServer(segment, route.memberSlug);
  if (fromServer) return fromServer;

  // Berikutnya Supabase langsung — berhasil hanya kalau halaman ini dibuka oleh
  // pemilik project yang sedang login (mis. saat pratinjau dari dashboard).
  const fromCloud =
    (await findProjectIdByNameSlug(segment)) ??
    (slugWithoutId ? await findProjectIdByNameSlug(slugWithoutId) : null);
  if (fromCloud) return fromCloud;

  try {
    const projectKeys = Object.keys(localStorage).filter((k) => k.startsWith('BROHUBS_PROJECTS_'));
    for (const key of projectKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const projects = JSON.parse(raw) as Project[];

      const byId = candidateId && projects.find((p) => p.id === candidateId);
      if (byId) return byId.id;

      const byName = projects.find(
        (p) => slugify(p.name) === segment || slugify(p.name) === slugWithoutId
      );
      if (byName) return byName.id;
    }
  } catch {
    // ignore parse errors
  }

  // Server tidak terjangkau dan tidak ada cache lokal. Kalau path memang
  // membawa id, pakai apa adanya — lebih baik daripada diam-diam jatuh ke
  // GLOBAL dan menampilkan bus program studio.
  if (candidateId) {
    console.warn(
      `[output] Server tidak bisa dihubungi. Memakai id dari path apa adanya: "${candidateId}".`
    );
    return candidateId;
  }

  // Jatuh ke GLOBAL berarti overlay akan menampilkan bus program studio, bukan
  // milik project ini — gejalanya "overlay kosong / isinya salah" tanpa error.
  // Dulu ini terjadi diam-diam; sekarang setidaknya terbaca di console OBS.
  console.warn(
    `[output] Slug project "${route.projectSlug}" tidak bisa diterjemahkan ke id. ` +
      'Overlay memakai scope GLOBAL. Pastikan server BROHUBS jalan dan bisa dijangkau ' +
      'dari OBS/vMix, atau pakai link yang menyertakan ?project=<id>.'
  );
  return 'GLOBAL';
}
