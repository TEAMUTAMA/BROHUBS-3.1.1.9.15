export interface FirstBloodVisualConfig {
  enabled: boolean;
  displaySeconds: number;
  scale: number;
  x: number;
  y: number;
  playerImageX: number;
  playerImageY: number;
  playerImageScale: number;
  title: string;
  subtitle: string;
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

export const FIRST_BLOOD_CONFIG_KEY = 'BROHUBS_FIRST_BLOOD_CONFIG';
export const FIRST_BLOOD_ALERT_KEY = 'BROHUBS_FIRST_BLOOD_ALERT';

export interface FirstBloodTarget {
  teamIndex?: number;
  playerIndex?: number;
  player: string;
  team: string;
  teamName: string;
  logo?: string;
  image?: string;
  kills: number;
  rank: number;
}

export interface FirstBloodAlert extends FirstBloodTarget {
  match: number;
  token: number;
}

export const DEFAULT_FIRST_BLOOD_VISUAL: FirstBloodVisualConfig = {
  enabled: true,
  displaySeconds: 4,
  scale: 48,
  x: 34,
  y: 520,
  playerImageX: -24,
  playerImageY: 211,
  playerImageScale: 210,
  title: 'FIRST BLOOD',
  subtitle: 'Opening Elimination',
  accentColor: '#ffb000',
  headerBg: '#7a0710',
  bodyBg: '#180609',
  footerBg: '#ffb000',
  textColor: '#fff4df',
  mutedTextColor: '#ff6b6b',
  customBackgroundUrl: '',
  useCustomBackground: false,
  previewToken: 0,
  previewHold: false,
};

export const FIRST_BLOOD_COLOR_KEYS = [
  'headerBg',
  'bodyBg',
  'footerBg',
  'accentColor',
  'textColor',
  'mutedTextColor',
] as const;

export type FirstBloodColorKey = (typeof FIRST_BLOOD_COLOR_KEYS)[number];

export const FIRST_BLOOD_COLOR_LABELS: Record<FirstBloodColorKey, string> = {
  headerBg: 'Header',
  bodyBg: 'Body',
  footerBg: 'Footer',
  accentColor: 'Accent',
  textColor: 'Text',
  mutedTextColor: 'Muted',
};

export const clampFirstBloodDisplaySeconds = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_FIRST_BLOOD_VISUAL.displaySeconds;
  return Math.max(1, Math.min(30, Math.round(value)));
};

export const clampFirstBloodScale = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_FIRST_BLOOD_VISUAL.scale;
  return Math.max(20, Math.min(120, Math.round(value)));
};

export const clampFirstBloodPlayerImageScale = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_FIRST_BLOOD_VISUAL.playerImageScale;
  return Math.max(50, Math.min(300, Math.round(value)));
};

export const clampFirstBloodPosition = (value: number, fallback = 0) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(-1920, Math.min(1920, Math.round(value)));
};
