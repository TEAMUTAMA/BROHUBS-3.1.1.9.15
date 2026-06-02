export const PROGRAM_LAYERS_PREFIX = 'BROHUBS_STUDIO_PROGRAM_LAYERS_';

export function getProgramLayersKey(projectScope?: string | null): string {
  return `${PROGRAM_LAYERS_PREFIX}${projectScope || 'GLOBAL'}`;
}

export const DEFAULT_PROGRAM_LAYERS: Record<number, string | null> = {
  1: null,
  2: null,
  3: null,
  4: null,
  5: null,
  6: null,
};
