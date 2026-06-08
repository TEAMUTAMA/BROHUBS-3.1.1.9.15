import { applyCompanionSharedState } from './overlayAnimation';

export interface CompanionDataPayload {
  assetId: string;
  data: Record<string, unknown>;
  projectScope?: string;
}

/** Hanya Overall Ranking yang boleh menulis state match/teams ke storage (hindari stale echo SSE). */
export const LEADERBOARD_COMPANION_ASSET_ID = 'pmgc-leaderboard';

const LEADERBOARD_OWNED_KEYS = new Set([
  'BROHUBS_LEADERBOARD_TEAMS',
  'BROHUBS_LEADERBOARD_MATCH',
  'BROHUBS_LEADERBOARD_TITLE',
  'BROHUBS_LEADERBOARD_VISUAL',
  'BROHUBS_LEADERBOARD_LAYOUT',
  'BROHUBS_LEADERBOARD_MATCH_KILL_RULES',
  'BROHUBS_LEADERBOARD_KILL_LOG',
  'BROHUBS_ELIMINATION_BANNER_LAYOUT',
  'BROHUBS_FINAL_FOUR_LAYOUT',
]);

export function applyCompanionDataPayload(payload: CompanionDataPayload): void {
  if (!payload?.data) return;
  for (const [key, value] of Object.entries(payload.data)) {
    if (LEADERBOARD_OWNED_KEYS.has(key) && payload.assetId !== LEADERBOARD_COMPANION_ASSET_ID) {
      continue;
    }
    applyCompanionSharedState(key, value);
  }
}

export async function notifyCompanionData(
  payload: CompanionDataPayload,
  projectScope?: string | null
): Promise<void> {
  if (!projectScope) return;
  try {
    await fetch('/api/companion/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, projectScope }),
    });
  } catch (err) {
    console.warn('Companion data sync failed:', err);
  }
}
