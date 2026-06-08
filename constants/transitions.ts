
import { Variants } from 'motion/react';

export interface AnimationConfig {
  inType: 'fade' | 'slide-right' | 'slide-left' | 'slide-up' | 'slide-down';
  outType: 'fade' | 'slide-right' | 'slide-left' | 'slide-up' | 'slide-down';
  duration: number;
  delay: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'backOut';
  useSpring: boolean;
  staggerChildren?: boolean;
  staggerDirection?: 'top-down' | 'bottom-up' | 'center-out' | 'roster-default';
  staggerDelay?: number;
  mode?: 'default' | 'preset' | 'custom';
  presetId?: string;
}

export type PresetOverride = { inType?: AnimationConfig['inType']; outType?: AnimationConfig['outType'] };

export const ANIMATION_PRESETS: {
  id: string;
  name: string;
  description: string;
  config: Omit<AnimationConfig, 'mode' | 'presetId'>;
}[] = [
  {
    id: 'broadcast',
    name: 'Broadcast Standard',
    description: 'Professional tournament style with smooth sliding transitions.',
    config: {
      inType: 'slide-right',
      outType: 'fade',
      duration: 0.8,
      delay: 0,
      easing: 'easeOut',
      useSpring: true,
      staggerChildren: true,
      staggerDirection: 'top-down',
    },
  },
  {
    id: 'cinematic',
    name: 'Cinematic Rise',
    description: 'Dramatic entrance from the bottom using back-out easing.',
    config: {
      inType: 'slide-up',
      outType: 'slide-down',
      duration: 1.2,
      delay: 0.1,
      easing: 'backOut',
      useSpring: true,
      staggerChildren: true,
      staggerDirection: 'bottom-up',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal Fade',
    description: 'Clean and simple fade transitions for a subtle look.',
    config: {
      inType: 'fade',
      outType: 'fade',
      duration: 0.5,
      delay: 0,
      easing: 'linear',
      useSpring: false,
      staggerChildren: false,
      staggerDirection: 'top-down',
    },
  },
  {
    id: 'dynamic-up',
    name: 'Dynamic Rise',
    description: 'Energetic upward sliding motion with spring physics.',
    config: {
      inType: 'slide-up',
      outType: 'slide-down',
      duration: 0.7,
      delay: 0,
      easing: 'easeOut',
      useSpring: true,
      staggerChildren: true,
      staggerDirection: 'center-out',
    },
  },
  {
    id: 'roster-reveal',
    name: 'Roster Default',
    description:
      'IN: P1&P5 → P2&P4 → P3. OUT: footer turun → captain ciut → pasangan turun → sayap melebar → header geser.',
    config: {
      inType: 'slide-up',
      outType: 'slide-down',
      duration: 0.75,
      delay: 0.1,
      easing: 'easeOut',
      useSpring: false,
      staggerChildren: true,
      staggerDirection: 'roster-default',
      staggerDelay: 2,
    },
  },
];

/** Preset transisi khusus Team Roster — PRESET MODE hanya menampilkan ini */
export const TEAM_ROSTER_ANIMATION_PRESETS = ANIMATION_PRESETS.filter(
  (p) => p.id === 'roster-reveal' || p.id === 'minimal'
);

/** Jeda antar wave roster default (detik) */
export const ROSTER_DEFAULT_WAVE_GAP_SEC = 2;

/** Slot roster: P1=kiri (0) … P5=kanan (4) */
export const ROSTER_SLOT = { P1: 0, P2: 1, P3: 2, P4: 3, P5: 4 } as const;

/**
 * Urutan wave roster [P1][P2][P3][P4][P5] — jeda antar wave = staggerDelay (default 2s):
 * 5 pemain IN:  P1&P5 → P2&P4 → P3 (captain)
 * 4 pemain IN:  P1&P4 → P2&P3
 * OUT: urutan terbalik dengan jeda yang sama
 */
export function getRosterDefaultMaxWave(total: number): number {
  if (total >= 5) return 2;
  if (total === 4) return 1;
  if (total === 3) return 2;
  if (total === 2) return 1;
  return 0;
}

export function resolveRosterDefaultWave(slotIndex: number, total: number): number {
  const { P1, P2, P3, P4, P5 } = ROSTER_SLOT;
  if (total <= 1) return 0;

  if (total >= 5) {
    if (slotIndex === P1 || slotIndex === P5) return 0;
    if (slotIndex === P2 || slotIndex === P4) return 1;
    if (slotIndex === P3) return 2;
    return slotIndex;
  }

  if (total === 4) {
    if (slotIndex === P1 || slotIndex === P4) return 0;
    if (slotIndex === P2 || slotIndex === P3) return 1;
    return slotIndex;
  }

  if (total === 3) {
    if (slotIndex === P1) return 0;
    if (slotIndex === P2) return 1;
    if (slotIndex === P3) return 2;
    return slotIndex;
  }

  if (slotIndex === P1) return 0;
  if (slotIndex === P2) return 1;
  return 0;
}

/** Delay reveal per slot — phase in (masuk) atau out (keluar / ganti halaman) */
export function resolveRosterRevealDelay(
  slotIndex: number,
  total: number,
  config: AnimationConfig,
  baseOffset = 0.15,
  phase: 'in' | 'out' = 'in'
): number {
  const waveGap = config.staggerDelay ?? ROSTER_DEFAULT_WAVE_GAP_SEC;
  const base = config.delay + baseOffset;
  const wave = resolveRosterDefaultWave(slotIndex, total);
  const maxWave = getRosterDefaultMaxWave(total);
  if (phase === 'out') {
    return base + (maxWave - wave) * waveGap;
  }
  return base + wave * waveGap;
}

/** Hitung delay stagger per child (slot pemain, baris, dll.) */
export function resolveStaggerDelay(
  index: number,
  total: number,
  config: AnimationConfig,
  baseOffset = 0.35
): number {
  const base = config.delay + baseOffset;
  if (!config.staggerChildren || total <= 1) return base;
  const staggerDelay = config.staggerDelay ?? 0.08;
  const direction = config.staggerDirection || 'top-down';
  if (direction === 'roster-default') {
    return resolveRosterRevealDelay(index, total, config, baseOffset, 'in');
  }
  if (direction === 'center-out') {
    const center = Math.floor(total / 2);
    return base + Math.abs(index - center) * staggerDelay;
  }
  if (direction === 'bottom-up') {
    return base + (total - 1 - index) * staggerDelay;
  }
  return base + index * staggerDelay;
}

export function resolveExitStaggerDelay(
  index: number,
  total: number,
  config: AnimationConfig,
  baseOffset = 0.05
): number {
  if (config.staggerDirection === 'roster-default') {
    return resolveRosterRevealDelay(index, total, config, baseOffset, 'out');
  }
  return resolveStaggerDelay(total - 1 - index, total, config, baseOffset) * 0.4;
}

/** Merge active preset + per-preset IN/OUT overrides into one config used for rendering. */
export function resolveAnimationConfig(
  config: AnimationConfig,
  presetOverrides: Record<string, PresetOverride> = {},
  presets = ANIMATION_PRESETS
): AnimationConfig {
  if (config.mode === 'custom') return config;

  const presetId = config.presetId || 'broadcast';
  const base = presets.find((p) => p.id === presetId)?.config;
  if (!base) return config;

  const overrides = presetOverrides[presetId] || {};
  return {
    ...config,
    ...base,
    ...overrides,
    presetId,
    mode: config.mode ?? 'default',
  };
}

/** Offset slide untuk child (baris, kartu) — mengikuti inType/outType dari panel Animation */
export function getChildMotionInitial(
  config: AnimationConfig,
  magnitude = 96
): { x?: number; y?: number; opacity: number } {
  switch (config.inType) {
    case 'slide-right':
      return { x: -magnitude, opacity: 0 };
    case 'slide-left':
      return { x: magnitude, opacity: 0 };
    case 'slide-up':
      return { y: magnitude, opacity: 0 };
    case 'slide-down':
      return { y: -magnitude, opacity: 0 };
    default:
      return { opacity: 0 };
  }
}

export function getChildMotionExit(
  config: AnimationConfig,
  magnitude = 96
): { x?: number; y?: number; opacity: number } {
  switch (config.outType) {
    case 'slide-right':
      return { x: magnitude, opacity: 0 };
    case 'slide-left':
      return { x: -magnitude, opacity: 0 };
    case 'slide-up':
      return { y: -magnitude, opacity: 0 };
    case 'slide-down':
      return { y: magnitude, opacity: 0 };
    default:
      return { opacity: 0 };
  }
}

export function getMotionEase(config: AnimationConfig): string | number[] {
  if (config.easing === 'backOut') return [0.34, 1.3, 0.64, 1];
  return config.easing;
}

/** Stable key fragment — remount feed saat IN/OUT berubah */
export function getAnimationSignature(config: AnimationConfig): string {
  return [
    config.mode ?? 'default',
    config.presetId ?? '',
    config.inType,
    config.outType,
    config.duration,
    config.delay,
    config.easing,
    config.useSpring ? 1 : 0,
  ].join('|');
}

/** Props motion eksplisit untuk root canvas (hindari konflik spread variants) */
export function getRootMotionProps(config: AnimationConfig) {
  const variants = getAnimationVariants(config);
  const transition = config.useSpring
    ? {
        type: 'spring' as const,
        stiffness: 100,
        damping: 20,
        mass: 1,
        delay: config.delay,
      }
    : {
        duration: config.duration,
        delay: config.delay,
        ease: config.easing === 'backOut' ? [0.34, 1.56, 0.64, 1] : config.easing,
      };

  const exitVariant = variants.exit as Record<string, unknown>;
  const exitTransition =
    typeof exitVariant?.transition === 'object' && exitVariant.transition !== null
      ? (exitVariant.transition as Record<string, unknown>)
      : {};

  return {
    initial: variants.initial,
    animate: { x: 0, y: 0, scale: 1, opacity: 1 },
    exit: {
      ...(typeof exitVariant === 'object' ? exitVariant : {}),
      transition: {
        ...exitTransition,
        duration: config.duration * 0.8,
        ease: getMotionEase(config),
      },
    },
    transition,
  };
}

export const getAnimationVariants = (config: AnimationConfig): Variants => {
  const getInitial = (type: string) => {
    switch (type) {
      case 'slide-right': return { x: -1920, opacity: 0 };
      case 'slide-left': return { x: 1920, opacity: 0 };
      case 'slide-up': return { y: 1080, opacity: 0 };
      case 'slide-down': return { y: -1080, opacity: 0 };
      case 'fade': return { opacity: 0 };
      default: return { opacity: 0, scale: 0.95 };
    }
  };

  const getExit = (type: string) => {
    switch (type) {
      case 'slide-right': return { x: 1920, opacity: 0 };
      case 'slide-left': return { x: -1920, opacity: 0 };
      case 'slide-up': return { y: -1080, opacity: 0 };
      case 'slide-down': return { y: 1080, opacity: 0 };
      case 'fade': return { opacity: 0 };
      default: return { opacity: 0, scale: 0.95 };
    }
  };

  const transition: any = config.useSpring 
    ? { 
        type: 'spring', 
        stiffness: 100, 
        damping: 20, 
        mass: 1,
        delay: config.delay 
      }
    : {
        duration: config.duration,
        delay: config.delay,
        ease: config.easing === 'backOut' ? [0.34, 1.56, 0.64, 1] : config.easing
      };

  return {
    initial: getInitial(config.inType),
    animate: { 
      x: 0, 
      y: 0, 
      scale: 1, 
      opacity: 1,
      transition: {
        ...transition,
        when: "beforeChildren"
      }
    },
    exit: {
      ...getExit(config.outType),
      transition: {
        duration: config.duration * 0.8, // Slightly faster exit
        ease: 'easeInOut',
        when: "afterChildren"
      }
    }
  };
};
