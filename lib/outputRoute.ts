import { ASSET_DATABASE } from '../constants/assets';
import type { Asset, Project } from '../types';

export const slugify = (text: string) =>
  text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

export interface OutputRouteParams {
  memberSlug: string;
  projectSlug: string;
  assetSlug: string;
}

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

  try {
    const projectKeys = Object.keys(localStorage).filter((k) => k.startsWith('BROHUBS_PROJECTS_'));
    for (const key of projectKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const projects = JSON.parse(raw) as Project[];
      const match = projects.find((p) => slugify(p.name) === route.projectSlug.toLowerCase());
      if (match) return match.id;
    }
  } catch {
    // ignore parse errors
  }

  return 'GLOBAL';
}
