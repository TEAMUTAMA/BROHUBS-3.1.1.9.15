import {
  ANIMATION_PRESETS,
  resolveExitStaggerDelay,
  type AnimationConfig,
  type PresetOverride,
} from '@/constants/transitions';

export const LEADERBOARD_ANIMATION_STORAGE_KEY = 'BROHUBS_LEADERBOARD_ANIMATION';
export const LEADERBOARD_PRESET_OVERRIDES_STORAGE_KEY = 'BROHUBS_LEADERBOARD_PRESET_OVERRIDES';
export const LEADERBOARD_PROGRAM_VISIBLE_KEY = 'BROHUBS_LEADERBOARD_PROGRAM_VISIBLE';
export const LEADERBOARD_OUTRO_ROW_COUNT = 16;

export const LEADERBOARD_DEFAULT_ANIMATION: AnimationConfig = {
  mode: 'default',
  presetId: 'broadcast',
  inType: 'slide-left',
  outType: 'slide-right',
  duration: 0.8,
  delay: 0,
  easing: 'easeOut',
  useSpring: true,
  staggerChildren: true,
};

export const LEADERBOARD_TRANSITION_TYPES: AnimationConfig['inType'][] = [
  'fade',
  'slide-right',
  'slide-left',
  'leaderboard-slide-left',
  'slide-up',
  'leaderboard-slide-up',
  'slide-down',
];

export type LeaderboardPresetOverrides = Record<string, PresetOverride>;

export function resolveLeaderboardExitDurationSeconds(config: AnimationConfig): number {
  return Math.max(config.duration * 0.75, 0.35);
}

export function isLeaderboardUnifiedPanelOut(config: AnimationConfig): boolean {
  return (
    config.outType === 'slide-left' ||
    config.outType === 'slide-right' ||
    config.outType === 'slide-up'
  );
}

export function resolveLeaderboardOutroHoldMs(
  config: AnimationConfig,
  rowCount = LEADERBOARD_OUTRO_ROW_COUNT
): number {
  const exitDuration = resolveLeaderboardExitDurationSeconds(config);
  const safetyBuffer = 0.5;

  if (isLeaderboardUnifiedPanelOut(config)) {
    return Math.ceil((exitDuration + safetyBuffer) * 1000);
  }

  const maxRowExitDelay = Math.max(
    ...Array.from({ length: Math.max(rowCount, 1) }, (_, index) =>
      resolveExitStaggerDelay(index, rowCount, config, 0.03)
    )
  );
  return Math.ceil((maxRowExitDelay + exitDuration + safetyBuffer) * 1000);
}

export const LEADERBOARD_ANIMATION_PRESETS: typeof ANIMATION_PRESETS = ANIMATION_PRESETS
  .filter((preset) => preset.id !== 'dynamic-up' && preset.id !== 'roster-reveal')
  .map((preset) =>
    preset.id === 'broadcast'
      ? {
          ...preset,
          config: {
            ...preset.config,
            inType: 'slide-left',
            outType: 'slide-right',
          },
        }
      : preset
  );
