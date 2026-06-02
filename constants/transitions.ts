
import { Variants } from 'motion/react';

export interface AnimationConfig {
  inType: 'fade' | 'slide-right' | 'slide-left' | 'slide-up' | 'slide-down';
  outType: 'fade' | 'slide-right' | 'slide-left' | 'slide-up' | 'slide-down';
  duration: number;
  delay: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'backOut';
  useSpring: boolean;
  staggerChildren?: boolean;
  staggerDirection?: 'top-down' | 'bottom-up' | 'center-out';
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
];

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
