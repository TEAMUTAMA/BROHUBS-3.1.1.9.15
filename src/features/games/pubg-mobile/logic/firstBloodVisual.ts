export interface FirstBloodVisualConfig {
  enabled: boolean;
  displaySeconds: number;
  designVariant: FirstBloodDesignVariant;
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
  bgTintColor: string;
  bgTintOpacity: number;
  assetPaletteOverride: string[];
  previewToken: number;
  previewHold: boolean;
}

// Palette 9 entry (default value untuk assetPaletteOverride = warna yang DIINGINKAN user):
//   [0,1,2]  = warna Logo Panel (default dark green)
//   [3]      = Kill BG (kuning-hijau)
//   [4]      = Light 1 (cream)
//   [5]      = Light 2 (abu-abu)
//   [6,7,8]  = warna Bar (default dark green)
export const BROADCAST_CUT_ORIGINAL_PALETTE = [
  '#697A64', '#73826D', '#718069',  // Logo Panel default
  '#C6DB14',                         // Kill BG
  '#F2EAE3',                         // Light 1
  '#D8D2CB',                         // Light 2
  '#697A64', '#73826D', '#718069',  // Bar default
] as const;

// Warna AKTUAL dalam file PNG transparent.png:
//   Panel area → merah solid #FF0000 (mudah dibedakan dari bar dark-green)
//   Bar area   → dark green (#697A64 dst)
// Tanpa spatial bounds — deteksi cukup via jarak warna.
export const BROADCAST_CUT_FILE_PALETTE = [
  '#FF0000', '#FF0000', '#FF0000',  // Logo Panel (merah di file PNG)
  '#C6DB14',                         // Kill BG
  '#F2EAE3',                         // Light 1
  '#D8D2CB',                         // Light 2
  '#697A64', '#73826D', '#718069',  // Bar (dark green di file PNG)
] as const;

export const BROADCAST_CUT_PALETTE_LABELS = [
  'Logo Panel', 'Logo Panel', 'Logo Panel',
  'Kill BG', 'Light 1', 'Light 2',
  'Bar', 'Bar', 'Bar',
] as const;

export const BROADCAST_CUT_LOGO_PANEL_INDICES = [0, 1, 2] as const;
export const BROADCAST_CUT_ACCENT_INDEX        = 3 as const;
export const BROADCAST_CUT_LIGHT_INDICES       = [4, 5] as const;
export const BROADCAST_CUT_BAR_INDICES         = [6, 7, 8] as const;

// Warna AKTUAL dalam file PNG Hero Split (dipakai sebagai sumber remap):
//   [0,1,2] = Panel dark-green (#698967)
//   [3]     = Accent yellow-green (#c5e206)
//   [4]     = Light 1 cream (#ece5de)
//   [5]     = Light 2 slightly darker (#d8d2cb)
//   [6,7,8] = same as panel (slot simetris)
export const HERO_SPLIT_FILE_PALETTE = [
  '#698967', '#698967', '#698967',
  '#c5e206',
  '#ece5de',
  '#d8d2cb',
  '#698967', '#698967', '#698967',
] as const;

export const HERO_SPLIT_ORIGINAL_PALETTE = [
  '#698967', '#698967', '#698967',
  '#c5e206',
  '#ece5de',
  '#d8d2cb',
  '#698967', '#698967', '#698967',
] as const;

export const HERO_SPLIT_PALETTE_LABELS = [
  'Panel', 'Panel', 'Panel',
  'Accent', 'Light 1', 'Light 2',
  'Panel', 'Panel', 'Panel',
] as const;

export const HERO_SPLIT_PANEL_INDICES  = [0, 1, 2] as const;
export const HERO_SPLIT_ACCENT_INDEX   = 3 as const;
export const HERO_SPLIT_LIGHT_INDICES  = [4, 5] as const;

export const FIRST_BLOOD_CONFIG_KEY = 'BROHUBS_FIRST_BLOOD_CONFIG';
export const FIRST_BLOOD_ALERT_KEY = 'BROHUBS_FIRST_BLOOD_ALERT';

export type FirstBloodDesignVariant =
  | 'classic-lock'
  | 'default-reference'
  | 'diagonal-strike'
  | 'photo-split'
  | 'compact-hud';

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
  designVariant: 'default-reference',
  scale: 32,
  x: 26,
  y: 539,
  playerImageX: -30,
  playerImageY: 82,
  playerImageScale: 220,
  title: 'FIRST BLOOD',
  subtitle: 'Opening Elimination',
  accentColor: '#ccff00',
  headerBg: '#74a57f',
  bodyBg: '#e8e6df',
  footerBg: '#74a57f',
  textColor: '#030303',
  mutedTextColor: '#566356',
  customBackgroundUrl: '',
  useCustomBackground: false,
  bgTintColor: '#000000',
  bgTintOpacity: 0,
  assetPaletteOverride: [...BROADCAST_CUT_ORIGINAL_PALETTE],
  previewToken: 0,
  previewHold: false,
};

export const HERO_SPLIT_ASSET_COLORS: Record<FirstBloodColorKey, string> = {
  headerBg: '#698967',
  bodyBg: '#ece5de',
  footerBg: '#c5e206',
  accentColor: '#eee9dd',
  textColor: '#030303',
  mutedTextColor: '#566356',
};

export interface FirstBloodVisualPreset {
  id: string;
  name: string;
  description: string;
  previewImage?: string;
  config: Pick<
    FirstBloodVisualConfig,
    | 'designVariant'
    | 'title'
    | 'subtitle'
    | 'scale'
    | 'x'
    | 'y'
    | 'playerImageX'
    | 'playerImageY'
    | 'playerImageScale'
    | 'useCustomBackground'
    | 'customBackgroundUrl'
    | 'textColor'
    | 'mutedTextColor'
    | 'accentColor'
    | 'headerBg'
    | 'bodyBg'
    | 'footerBg'
    | 'bgTintColor'
    | 'bgTintOpacity'
    | 'assetPaletteOverride'
  >;
}

export const FIRST_BLOOD_VISUAL_PRESETS: FirstBloodVisualPreset[] = [
  {
    id: 'classic-lock',
    name: 'Classic Lock',
    description: 'Compact stacked banner with player lock.',
    config: {
      designVariant: 'classic-lock',
      title: 'FIRST BLOOD',
      subtitle: 'Opening Elimination',
      scale: 58,
      x: 26,
      y: 531,
      playerImageX: -50,
      playerImageY: 174,
      playerImageScale: 300,
      useCustomBackground: false,
      customBackgroundUrl: '',
      bgTintColor: '#000000',
      bgTintOpacity: 0,
      textColor: '#030303',
      mutedTextColor: '#566356',
      accentColor: '#ccff00',
      headerBg: '#74a57f',
      bodyBg: '#e8e6df',
      footerBg: '#74a57f',
      assetPaletteOverride: [...BROADCAST_CUT_ORIGINAL_PALETTE],
    },
  },
  {
    id: 'default-reference',
    name: 'Broadcast Cut',
    description: 'Wide angled match opener with strong player lock.',
    previewImage: '/assets/overlays/first-blood-broadcast-cut-clean-transparent.webp',
    config: {
      designVariant: 'default-reference',
      title: 'FIRST BLOOD',
      subtitle: 'Opening Elimination',
      scale: 32,
      x: 26,
      y: 539,
      playerImageX: -10,
      playerImageY: 324,
      playerImageScale: 190,
      useCustomBackground: false,
      customBackgroundUrl: '',
      bgTintColor: '#000000',
      bgTintOpacity: 0,
      textColor: '#030303',
      mutedTextColor: '#566356',
      accentColor: '#ccff00',
      headerBg: '#74a57f',
      bodyBg: '#e8e6df',
      footerBg: '#74a57f',
      assetPaletteOverride: [...BROADCAST_CUT_ORIGINAL_PALETTE],
    },
  },
  {
    id: 'photo-split',
    name: 'Hero Split',
    description: 'Large player frame with clean broadcast data lock.',
    previewImage: '/assets/overlays/first-blood-hero-split-clean-transparent.webp',
    config: {
      designVariant: 'photo-split',
      title: 'FIRST BLOOD',
      subtitle: 'Opening Elimination',
      scale: 30,
      x: 7,
      y: 524,
      playerImageX: 7,
      playerImageY: 569,
      playerImageScale: 191,
      useCustomBackground: false,
      customBackgroundUrl: '',
      bgTintColor: '#000000',
      bgTintOpacity: 0,
      textColor: '#030303',
      mutedTextColor: '#566356',
      accentColor: '#eee9dd',
      headerBg: '#698967',
      bodyBg: '#ece5de',
      footerBg: '#c5e206',
      assetPaletteOverride: [...HERO_SPLIT_ORIGINAL_PALETTE],
    },
  },
];

export interface FirstBloodLayoutBaseline {
  scale: number;
  x: number;
  y: number;
  playerImageX: number;
  playerImageY: number;
  playerImageScale: number;
}

/**
 * Baseline layout (titik nol slider UI) per design variant.
 * UI menampilkan offset relatif terhadap baseline ini, sehingga tiap variant
 * punya "ukuran default" sendiri (mis. Hero Split berbeda dari Broadcast Cut).
 * Variant tanpa preset memakai DEFAULT global.
 */
export const getFirstBloodLayoutBaseline = (
  designVariant: FirstBloodDesignVariant
): FirstBloodLayoutBaseline => {
  const source =
    FIRST_BLOOD_VISUAL_PRESETS.find((preset) => preset.config.designVariant === designVariant)
      ?.config ?? DEFAULT_FIRST_BLOOD_VISUAL;
  return {
    scale: source.scale,
    x: source.x,
    y: source.y,
    playerImageX: source.playerImageX,
    playerImageY: source.playerImageY,
    playerImageScale: source.playerImageScale,
  };
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
