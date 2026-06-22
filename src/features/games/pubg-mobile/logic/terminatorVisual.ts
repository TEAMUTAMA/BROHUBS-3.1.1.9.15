export interface TerminatorVisualConfig {
  enabled: boolean;
  killThreshold: number;
  displaySeconds: number;
  scale: number;
  x: number;
  y: number;
  playerImageX: number;
  playerImageY: number;
  playerImageScale: number;
  title: string;
  accentColor: string;
  headerBg: string;
  bodyBg: string;
  footerBg: string;
  textColor: string;
  mutedTextColor: string;
  customBackgroundUrl: string;
  useCustomBackground: boolean;
  previewToken: number;
  previewHold: boolean;
  designPreset: TerminatorDesignPresetId;
}

export type TerminatorDesignPresetId = 'tactical-lime' | 'crimson-hunter' | 'ice-vector';

export const TERMINATOR_CONFIG_KEY = 'BROHUBS_TERMINATOR_CONFIG';
export const TERMINATOR_PLAYER_KILL_HISTORY_KEY = 'BROHUBS_TERMINATOR_PLAYER_KILL_HISTORY';

export type TerminatorPlayerKillHistory = Record<string, number>;

export function terminatorPlayerKey(team: string, player: string): string {
  return `${team.trim().toLowerCase()}::${player.trim().toLowerCase()}`;
}

export const DEFAULT_TERMINATOR_VISUAL: TerminatorVisualConfig = {
  enabled: true,
  killThreshold: 5,
  displaySeconds: 5,
  scale: 41,
  x: 26,
  y: 539,
  playerImageX: -43,
  playerImageY: 95,
  playerImageScale: 255,
  title: 'TERMINATOR',
  accentColor: '#ccff00',
  headerBg: '#74a57f',
  bodyBg: '#e8e6df',
  footerBg: '#74a57f',
  textColor: '#000000',
  mutedTextColor: '#4d5650',
  customBackgroundUrl: '',
  useCustomBackground: false,
  previewToken: 0,
  previewHold: false,
  designPreset: 'tactical-lime',
};

export interface TerminatorDesignPreset {
  id: TerminatorDesignPresetId;
  name: string;
  description: string;
  swatches: string[];
  config: Pick<
    TerminatorVisualConfig,
    | 'displaySeconds'
    | 'scale'
    | 'x'
    | 'y'
    | 'playerImageX'
    | 'playerImageY'
    | 'playerImageScale'
    | 'title'
    | 'accentColor'
    | 'headerBg'
    | 'bodyBg'
    | 'footerBg'
    | 'textColor'
    | 'mutedTextColor'
    | 'useCustomBackground'
    | 'designPreset'
  >;
}

export const TERMINATOR_DESIGN_PRESETS: TerminatorDesignPreset[] = [
  {
    id: 'tactical-lime',
    name: 'Command Panel',
    description: 'Panel komando klasik dengan struktur rapi dan solid.',
    swatches: ['#74a57f', '#e8e6df', '#ccff00'],
    config: {
      displaySeconds: 5,
      scale: 41,
      x: 26,
      y: 539,
      playerImageX: -43,
      playerImageY: 95,
      playerImageScale: 255,
      title: 'TERMINATOR',
      accentColor: '#ccff00',
      headerBg: '#74a57f',
      bodyBg: '#e8e6df',
      footerBg: '#74a57f',
      textColor: '#000000',
      mutedTextColor: '#4d5650',
      useCustomBackground: false,
      designPreset: 'tactical-lime',
    },
  },
  {
    id: 'crimson-hunter',
    name: 'Strike Frame',
    description: 'Bentuk diagonal agresif dengan panel player lebih tajam.',
    swatches: ['#74a57f', '#e8e6df', '#ccff00'],
    config: {
      displaySeconds: 5,
      scale: 43,
      x: 34,
      y: 526,
      playerImageX: -64,
      playerImageY: 137,
      playerImageScale: 278,
      title: 'TERMINATOR',
      accentColor: '#ccff00',
      headerBg: '#74a57f',
      bodyBg: '#e8e6df',
      footerBg: '#74a57f',
      textColor: '#000000',
      mutedTextColor: '#4d5650',
      useCustomBackground: false,
      designPreset: 'crimson-hunter',
    },
  },
  {
    id: 'ice-vector',
    name: 'Vector Shield',
    description: 'Frame modern berlapis dengan bracket dan rail highlight.',
    swatches: ['#74a57f', '#e8e6df', '#ccff00'],
    config: {
      displaySeconds: 5,
      scale: 42,
      x: 30,
      y: 534,
      playerImageX: -45,
      playerImageY: 131,
      playerImageScale: 280,
      title: 'TERMINATOR',
      accentColor: '#ccff00',
      headerBg: '#74a57f',
      bodyBg: '#e8e6df',
      footerBg: '#74a57f',
      textColor: '#000000',
      mutedTextColor: '#4d5650',
      useCustomBackground: false,
      designPreset: 'ice-vector',
    },
  },
];

export const getTerminatorDesignPreset = (
  id?: TerminatorDesignPresetId
): TerminatorDesignPreset =>
  TERMINATOR_DESIGN_PRESETS.find((preset) => preset.id === id) ?? TERMINATOR_DESIGN_PRESETS[0];

export const applyTerminatorDesignPreset = (
  current: TerminatorVisualConfig,
  presetId: TerminatorDesignPresetId
): TerminatorVisualConfig => {
  const preset = getTerminatorDesignPreset(presetId);
  return {
    ...current,
    ...preset.config,
  };
};

const LEGACY_TERMINATOR_PLAYER_PRESET_DEFAULTS: Record<
  TerminatorDesignPresetId,
  Array<Pick<TerminatorVisualConfig, 'playerImageX' | 'playerImageY' | 'playerImageScale'>>
> = {
  'tactical-lime': [
    { playerImageX: -64, playerImageY: 168, playerImageScale: 290 },
    { playerImageX: -32, playerImageY: 30, playerImageScale: 185 },
  ],
  'crimson-hunter': [
    { playerImageX: -44, playerImageY: 148, playerImageScale: 274 },
    { playerImageX: -18, playerImageY: 28, playerImageScale: 178 },
  ],
  'ice-vector': [
    { playerImageX: -58, playerImageY: 154, playerImageScale: 282 },
    { playerImageX: -24, playerImageY: 28, playerImageScale: 180 },
  ],
};

export const migrateTerminatorPlayerImageDefaults = (
  current: TerminatorVisualConfig
): TerminatorVisualConfig => {
  const presetId = current.designPreset ?? DEFAULT_TERMINATOR_VISUAL.designPreset;
  const legacyDefaults = LEGACY_TERMINATOR_PLAYER_PRESET_DEFAULTS[presetId];
  const next = getTerminatorDesignPreset(presetId).config;
  const shouldMigrate = legacyDefaults.some(
    (legacy) =>
      current.playerImageX === legacy.playerImageX &&
      current.playerImageY === legacy.playerImageY &&
      current.playerImageScale === legacy.playerImageScale
  );
  if (!shouldMigrate) {
    return current;
  }

  return {
    ...current,
    playerImageX: next.playerImageX,
    playerImageY: next.playerImageY,
    playerImageScale: next.playerImageScale,
  };
};

export const TERMINATOR_COLOR_KEYS = [
  'headerBg',
  'bodyBg',
  'footerBg',
  'accentColor',
  'textColor',
  'mutedTextColor',
] as const;

export type TerminatorColorKey = (typeof TERMINATOR_COLOR_KEYS)[number];

export const TERMINATOR_COLOR_LABELS: Record<TerminatorColorKey, string> = {
  headerBg: 'Header',
  bodyBg: 'Body',
  footerBg: 'Footer',
  accentColor: 'Accent',
  textColor: 'Text',
  mutedTextColor: 'Muted',
};

export const clampTerminatorKillThreshold = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_TERMINATOR_VISUAL.killThreshold;
  return Math.max(1, Math.min(99, Math.round(value)));
};

export const clampTerminatorDisplaySeconds = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_TERMINATOR_VISUAL.displaySeconds;
  return Math.max(1, Math.min(30, Math.round(value)));
};

export const clampTerminatorScale = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_TERMINATOR_VISUAL.scale;
  return Math.max(20, Math.min(120, Math.round(value)));
};

export const clampTerminatorPlayerImageScale = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_TERMINATOR_VISUAL.playerImageScale;
  return Math.max(50, Math.min(300, Math.round(value)));
};

export const clampTerminatorPosition = (value: number, fallback = 0) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(-1920, Math.min(1920, Math.round(value)));
};
