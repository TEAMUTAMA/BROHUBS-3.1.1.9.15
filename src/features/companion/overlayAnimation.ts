import type { AnimationConfig, PresetOverride } from '@/constants/transitions';

export const ASSET_ANIMATION_STORAGE: Record<
  string,
  { animationKey: string; presetOverridesKey?: string }
> = {
  'pmgc-leaderboard': {
    animationKey: 'BROHUBS_LEADERBOARD_ANIMATION',
    presetOverridesKey: 'BROHUBS_LEADERBOARD_PRESET_OVERRIDES',
  },
  'pmgc-fraggers': {
    animationKey: 'BROHUBS_TOPFRAGGERS_ANIMATION',
  },
  'pmgc-team-roster': {
    animationKey: 'BROHUBS_TEAMROSTER_ANIMATION',
    presetOverridesKey: 'BROHUBS_TEAMROSTER_PRESET_OVERRIDES',
  },
};

export interface CompanionAnimationPayload {
  assetId: string;
  animation: AnimationConfig;
  presetOverrides?: Record<string, PresetOverride>;
  projectScope?: string;
}

export function applyCompanionSharedState<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(
      new CustomEvent(`shared-state-${key}`, {
        detail: { value, sender: 'companion-sync' },
      })
    );
  } catch (err) {
    console.warn('Failed to apply companion shared state', key, err);
  }
}

export function applyCompanionAnimationPayload(payload: CompanionAnimationPayload): void {
  const keys = ASSET_ANIMATION_STORAGE[payload.assetId];
  if (!keys) return;

  applyCompanionSharedState(keys.animationKey, payload.animation);
  if (keys.presetOverridesKey && payload.presetOverrides) {
    applyCompanionSharedState(keys.presetOverridesKey, payload.presetOverrides);
  }
}

export async function notifyCompanionAnimation(
  payload: CompanionAnimationPayload,
  projectScope?: string | null
): Promise<void> {
  if (!projectScope) return;
  try {
    await fetch('/api/companion/animation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, projectScope }),
    });
  } catch (err) {
    console.warn('Companion animation sync failed:', err);
  }
}
