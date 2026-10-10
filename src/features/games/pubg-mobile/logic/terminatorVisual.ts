export type TerminatorKillCounterSource = 'cumulative' | 'threshold';

export interface TerminatorVisualConfig {
  enabled: boolean;
  killThreshold: number;
  killCounterSource: TerminatorKillCounterSource;
  displaySeconds: number;
  designVariant: TerminatorDesignVariant;
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
}

export const TERMINATOR_CONFIG_KEY = 'BROHUBS_TERMINATOR_CONFIG';
export const TERMINATOR_PLAYER_KILL_HISTORY_KEY = 'BROHUBS_TERMINATOR_PLAYER_KILL_HISTORY';

export type TerminatorDesignVariant = 'classic-lock' | 'terminator-a';

export type TerminatorPlayerKillHistory = Record<string, number>;

export function terminatorPlayerKey(team: string, player: string): string {
  return `${team.trim().toLowerCase()}::${player.trim().toLowerCase()}`;
}

export const DEFAULT_TERMINATOR_VISUAL: TerminatorVisualConfig = {
  enabled: true,
  killThreshold: 5,
  killCounterSource: 'cumulative',
  displaySeconds: 5,
  designVariant: 'classic-lock',
  scale: 30,
  x: 26,
  y: 539,
  playerImageX: 0,
  playerImageY: 718,
  playerImageScale: 200,
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
};

export interface TerminatorVisualPreset {
  id: string;
  name: string;
  description: string;
  config: Pick<
    TerminatorVisualConfig,
    | 'designVariant'
    | 'title'
    | 'scale'
    | 'x'
    | 'y'
    | 'playerImageX'
    | 'playerImageY'
    | 'playerImageScale'
    | 'useCustomBackground'
    | 'customBackgroundUrl'
  >;
}

export const TERMINATOR_VISUAL_PRESETS: TerminatorVisualPreset[] = [
  {
    id: 'classic-lock',
    name: 'Classic Lock',
    description: 'Default stacked banner.',
    config: {
      designVariant: 'classic-lock',
      title: 'TERMINATOR',
      scale: 41,
      x: 26,
      y: 539,
      playerImageX: -64,
      playerImageY: 168,
      playerImageScale: 290,
      useCustomBackground: false,
      customBackgroundUrl: '',
    },
  },
  {
    id: 'terminator-a',
    name: 'Terminator A',
    description: 'Tactical frame dengan foto pemain dan kill counter.',
    config: {
      designVariant: 'terminator-a',
      title: 'TERMINATOR',
      scale: 30,
      x: 26,
      y: 539,
      playerImageX: 0,
      playerImageY: 718,
      playerImageScale: 200,
      useCustomBackground: false,
      customBackgroundUrl: '',
    },
  },
];

// Baseline "0" untuk slider offset (Scale/Pos/Player) mengikuti design yang
// sedang dibuka — Classic Lock & Terminator A punya nilai dasar berbeda, diambil
// dari preset masing-masing.
export type TerminatorOffsetBaseline = Pick<
  TerminatorVisualConfig,
  'scale' | 'x' | 'y' | 'playerImageX' | 'playerImageY' | 'playerImageScale'
>;

export const terminatorDesignBaseline = (
  variant: TerminatorDesignVariant
): TerminatorOffsetBaseline => {
  const preset = TERMINATOR_VISUAL_PRESETS.find((item) => item.config.designVariant === variant);
  const base = preset?.config ?? DEFAULT_TERMINATOR_VISUAL;
  return {
    scale: base.scale,
    x: base.x,
    y: base.y,
    playerImageX: base.playerImageX,
    playerImageY: base.playerImageY,
    playerImageScale: base.playerImageScale,
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
