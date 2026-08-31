export const PROGRAM_LAYERS_PREFIX = 'BROHUBS_STUDIO_PROGRAM_LAYERS_';
export const PREVIEW_ASSET_PREFIX = 'BROHUBS_STUDIO_PREVIEW_ASSET_';

export function getProgramLayersKey(projectScope?: string | null): string {
  return `${PROGRAM_LAYERS_PREFIX}${projectScope || 'GLOBAL'}`;
}

export function getPreviewAssetKey(projectScope?: string | null): string {
  return `${PREVIEW_ASSET_PREFIX}${projectScope || 'GLOBAL'}`;
}

/** Member broadcast has a project id; Admin GLOBAL studio does not broadcast to output links. */
export function canBroadcastCompanion(projectScope?: string | null): projectScope is string {
  return Boolean(projectScope);
}

export function companionScopeMatches(
  payloadScope: string | undefined | null,
  localScope: string | undefined | null
): boolean {
  if (!payloadScope || !localScope) return false;
  return payloadScope === localScope;
}

export const DEFAULT_PROGRAM_LAYERS: Record<number, string | null> = {
  1: null,
  2: null,
  3: null,
  4: null,
  5: null,
  6: null,
};
