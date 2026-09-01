// ============================================================================
// Preset transisi esports khusus asset TEAM ROSTER (ANIMATION -> PRESET MODE).
// Tiap style punya animasi IN & OUT sendiri untuk: container, header (judul +
// subtitle), blok tim (logo+nama), baris pemain (stagger via `custom`), footer.
// Durasi diturunkan dari config.duration; jeda stagger dari config.staggerDelay.
// OBS-safe: hanya transform / opacity / filter / clip-path (GPU-composited).
// ============================================================================

import type { Variants } from 'motion/react';
import type { AnimationConfig } from '@/constants/transitions';

export type RosterStyleId =
  | 'slide-up-pro'
  | 'minimal-fade'
  | 'side-swipe'
  | 'scale-pop'
  | 'hud-scan';

export const ROSTER_STYLE_IDS: RosterStyleId[] = [
  'slide-up-pro',
  'minimal-fade',
  'side-swipe',
  'scale-pop',
  'hud-scan',
];

export const isRosterStyleId = (id?: string): id is RosterStyleId =>
  !!id && (ROSTER_STYLE_IDS as string[]).includes(id);

export interface RosterStyleVariants {
  container: Variants;
  headerTitle: Variants;
  headerSubtitle: Variants;
  team: Variants;
  player: Variants; // pakai custom { index, total, isCaptain }
  footer: Variants;
}

interface PlayerCustom {
  index: number;
  total: number;
  isCaptain: boolean;
}

type Bezier = [number, number, number, number];
const EASE_OUT: Bezier = [0.22, 1, 0.36, 1];
const EASE_BACK: Bezier = [0.34, 1.56, 0.64, 1];
const EASE_IN: Bezier = [0.5, 0, 0.75, 0];
const EASE_IO: Bezier = [0.65, 0, 0.35, 1];
// Easing premium broadcast (ease-out-expo) untuk Slide Up Pro.
const EASE_PRO: Bezier = [0.16, 1, 0.3, 1];

// ── DEFAULT: SLIDE UP PRO (transform + opacity murni, tanpa blur) ─────────────
// IN: container naik y24→0, scale .97→1, opacity 0→1 (ease-out-expo); header/team
// +100ms; player rows stagger dari bawah. OUT: player reverse stagger KE ATAS →
// container TURUN sedikit y0→14 + scale 1→.985 + fade. Hanya transform/opacity (no layout shift).
const slideUpPro = (D: number, d0: number, stg: number, n: number): RosterStyleVariants => {
  const headerDelay = d0 + 0.1; // header/logo/team muncul 100ms setelah container
  const playerBase = d0 + 0.22; // player rows menyusul setelah header
  const containerOutDelay = Math.max(0, n - 2) * stg * 0.6; // container fade SETELAH player mulai keluar
  return {
    container: {
      initial: { opacity: 0, y: 24, scale: 0.97 },
      animate: { opacity: 1, y: 0, scale: 1, transition: { duration: D, delay: d0, ease: EASE_PRO } },
      exit: { opacity: 0, y: 14, scale: 0.985, transition: { duration: D * 0.7, delay: containerOutDelay, ease: EASE_IN } },
    },
    headerTitle: {
      initial: { opacity: 0, y: 18 },
      animate: { opacity: 1, y: 0, transition: { duration: D * 0.6, delay: headerDelay, ease: EASE_PRO } },
      exit: { opacity: 0, y: -12, transition: { duration: D * 0.45, ease: EASE_IN } },
    },
    headerSubtitle: {
      initial: { opacity: 0, y: 18 },
      animate: { opacity: 1, y: 0, transition: { duration: D * 0.6, delay: headerDelay + 0.03, ease: EASE_PRO } },
      exit: { opacity: 0, y: -12, transition: { duration: D * 0.45, ease: EASE_IN } },
    },
    team: {
      initial: { opacity: 0, y: 20, scale: 0.985 },
      animate: { opacity: 1, y: 0, scale: 1, transition: { duration: D * 0.6, delay: headerDelay + 0.04, ease: EASE_PRO } },
      exit: { opacity: 0, y: -12, scale: 0.99, transition: { duration: D * 0.45, ease: EASE_IN } },
    },
    player: {
      initial: { opacity: 0, y: 24, scale: 0.98 },
      animate: (c: PlayerCustom) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: D * 0.5, delay: playerBase + c.index * stg, ease: EASE_PRO },
      }),
      exit: (c: PlayerCustom) => ({
        opacity: 0,
        y: -14,
        scale: 0.98,
        transition: { duration: D * 0.45, delay: (c.total - 1 - c.index) * stg * 0.7, ease: EASE_IN },
      }),
    },
    footer: {
      initial: { opacity: 0, y: 16 },
      animate: { opacity: 1, y: 0, transition: { duration: D * 0.5, delay: playerBase + n * stg, ease: EASE_PRO } },
      exit: { opacity: 0, y: 12, transition: { duration: D * 0.4, ease: EASE_IN } },
    },
  };
};

// ── MINIMAL FADE (halus, bukan statis; tanpa blur) ───────────────────────────
// IN: y8→0, scale .995→1, opacity 0→1 (ease-out), stagger ringan. OUT: y0→6,
// opacity 1→0, reverse stagger sangat halus.
const minimalFade = (D: number, d0: number, stg: number, n: number): RosterStyleVariants => {
  const headerDelay = d0 + 0.06;
  const playerBase = d0 + 0.12;
  const stgLight = Math.min(stg, 0.05); // stagger ringan ~35–50ms
  return {
    container: {
      initial: { opacity: 0, y: 8, scale: 0.995 },
      animate: { opacity: 1, y: 0, scale: 1, transition: { duration: D, delay: d0, ease: EASE_OUT } },
      exit: { opacity: 0, y: 6, transition: { duration: D * 0.72, delay: Math.max(0, n - 2) * stgLight * 0.5, ease: EASE_IN } },
    },
    headerTitle: {
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0, transition: { duration: D * 0.85, delay: headerDelay, ease: EASE_OUT } },
      exit: { opacity: 0, y: 6, transition: { duration: D * 0.72, ease: EASE_IN } },
    },
    headerSubtitle: {
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0, transition: { duration: D * 0.85, delay: headerDelay + 0.02, ease: EASE_OUT } },
      exit: { opacity: 0, y: 6, transition: { duration: D * 0.72, ease: EASE_IN } },
    },
    team: {
      initial: { opacity: 0, y: 8, scale: 0.997 },
      animate: { opacity: 1, y: 0, scale: 1, transition: { duration: D * 0.85, delay: headerDelay + 0.03, ease: EASE_OUT } },
      exit: { opacity: 0, y: 6, transition: { duration: D * 0.72, ease: EASE_IN } },
    },
    player: {
      initial: { opacity: 0, y: 8, scale: 0.995 },
      animate: (c: PlayerCustom) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: D * 0.85, delay: playerBase + c.index * stgLight, ease: EASE_OUT },
      }),
      exit: (c: PlayerCustom) => ({
        opacity: 0,
        y: 6,
        transition: { duration: D * 0.72, delay: (c.total - 1 - c.index) * stgLight * 0.5, ease: EASE_IN },
      }),
    },
    footer: {
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0, transition: { duration: D * 0.85, delay: playerBase + n * stgLight, ease: EASE_OUT } },
      exit: { opacity: 0, y: 6, transition: { duration: D * 0.72, ease: EASE_IN } },
    },
  };
};

const sideSwipe = (D: number, d0: number, stg: number, n: number): RosterStyleVariants => ({
  container: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: D * 0.35, delay: d0 } },
    exit: { opacity: 1, x: -1920, transition: { duration: D * 0.7, delay: d0 + n * stg * 0.7 + D * 0.25, ease: EASE_IN } },
  },
  headerTitle: {
    initial: { opacity: 0, x: -700 },
    animate: { opacity: 1, x: 0, transition: { duration: D * 0.6, delay: d0, ease: EASE_OUT } },
    exit: { opacity: 0, x: 320, transition: { duration: D * 0.5, ease: EASE_IN } },
  },
  headerSubtitle: {
    initial: { opacity: 0, x: 700 },
    animate: { opacity: 1, x: 0, transition: { duration: D * 0.6, delay: d0, ease: EASE_OUT } },
    exit: { opacity: 0, x: 320, transition: { duration: D * 0.5, ease: EASE_IN } },
  },
  team: {
    initial: { opacity: 0, x: -240 },
    animate: { opacity: 1, x: 0, transition: { duration: D * 0.55, delay: d0 + 0.12, ease: EASE_OUT } },
    exit: { opacity: 0, x: 260, transition: { duration: D * 0.5, ease: EASE_IN } },
  },
  player: {
    initial: { opacity: 0, x: -200 },
    animate: (c: PlayerCustom) => ({
      opacity: 1,
      x: 0,
      transition: { duration: D * 0.55, delay: d0 + 0.2 + c.index * stg, ease: EASE_OUT },
    }),
    exit: (c: PlayerCustom) => ({
      opacity: 0,
      x: 280,
      transition: { duration: D * 0.5, delay: c.index * stg * 0.7, ease: EASE_IN },
    }),
  },
  footer: {
    initial: { opacity: 0, x: -180 },
    animate: { opacity: 1, x: 0, transition: { duration: D * 0.5, delay: d0 + 0.2 + n * stg, ease: EASE_OUT } },
    exit: { opacity: 0, x: 260, transition: { duration: D * 0.45, ease: EASE_IN } },
  },
});

const glitchReveal = (D: number, delay: number, dur: number): Variants => ({
  initial: { opacity: 0, skewX: -8, x: -12 },
  animate: { opacity: [0, 1, 0.4, 1], skewX: [-8, 4, -2, 0], x: [-12, 4, -2, 0], transition: { duration: D * dur, delay, ease: EASE_OUT } },
  exit: { opacity: [1, 0.3, 1, 0], skewX: [0, 6, -5, 8], transition: { duration: D * 0.45, ease: EASE_IN } },
});

const digitalGlitch = (D: number, d0: number, stg: number): RosterStyleVariants => ({
  container: {
    initial: { opacity: 0, filter: 'blur(2px)' },
    animate: {
      opacity: [0, 1, 0.5, 1],
      filter: ['blur(2px)', 'blur(0px)', 'blur(1px)', 'blur(0px)'],
      transition: { duration: D * 0.7, delay: d0, ease: EASE_OUT },
    },
    exit: {
      opacity: [1, 0.5, 1, 0],
      filter: ['blur(0px)', 'blur(2px)', 'blur(1px)', 'blur(3px)'],
      transition: { duration: D * 0.55, ease: EASE_IN },
    },
  },
  headerTitle: glitchReveal(D, d0 + 0.05, 0.5),
  headerSubtitle: glitchReveal(D, d0 + 0.1, 0.5),
  team: {
    initial: { opacity: 0, scale: 0.97, skewX: -4 },
    animate: { opacity: [0, 1, 0.6, 1], scale: 1, skewX: 0, transition: { duration: D * 0.5, delay: d0 + 0.12, ease: EASE_OUT } },
    exit: { opacity: [1, 0.4, 0], skewX: 6, transition: { duration: D * 0.4, ease: EASE_IN } },
  },
  player: {
    initial: { opacity: 0, clipPath: 'inset(0% 0% 100% 0%)', y: 10 },
    animate: (c: PlayerCustom) => ({
      opacity: [0, 1, 0.5, 1],
      clipPath: 'inset(0% 0% 0% 0%)',
      y: 0,
      transition: { duration: D * 0.45, delay: d0 + 0.15 + c.index * stg, ease: EASE_OUT },
    }),
    exit: (c: PlayerCustom) => ({
      opacity: [1, 0.3, 1, 0],
      clipPath: 'inset(0% 0% 100% 0%)',
      transition: { duration: D * 0.4, delay: c.index * stg * 0.5, ease: EASE_IN },
    }),
  },
  footer: glitchReveal(D, d0 + 0.2, 0.45),
});

const scalePop = (D: number, d0: number, stg: number): RosterStyleVariants => ({
  container: {
    initial: { opacity: 0, scale: 0.88 },
    animate: { opacity: 1, scale: 1, transition: { duration: D, delay: d0, ease: EASE_BACK } },
    exit: { opacity: 0, scale: 0.92, filter: 'blur(4px)', transition: { duration: D * 0.6, ease: EASE_IN } },
  },
  headerTitle: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1, transition: { duration: D * 0.5, delay: d0 + 0.05, ease: EASE_OUT } },
    exit: { opacity: 0, scale: 0.94, filter: 'blur(3px)', transition: { duration: D * 0.4, ease: EASE_IN } },
  },
  headerSubtitle: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1, transition: { duration: D * 0.5, delay: d0 + 0.08, ease: EASE_OUT } },
    exit: { opacity: 0, scale: 0.94, filter: 'blur(3px)', transition: { duration: D * 0.4, ease: EASE_IN } },
  },
  team: {
    initial: { opacity: 0, scale: 0.2 },
    animate: { opacity: 1, scale: 1, transition: { duration: D * 0.6, delay: d0, ease: EASE_BACK } },
    exit: { opacity: 0, scale: 0.85, filter: 'blur(2px)', transition: { duration: D * 0.45, ease: EASE_IN } },
  },
  player: {
    initial: { opacity: 0, y: 26, scale: 0.95 },
    animate: (c: PlayerCustom) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: D * 0.5, delay: d0 + 0.18 + c.index * stg, ease: EASE_OUT },
    }),
    exit: (c: PlayerCustom) => ({
      opacity: 0,
      y: 12,
      scale: 0.93,
      filter: 'blur(2px)',
      transition: { duration: D * 0.45, delay: c.index * stg * 0.4, ease: EASE_IN },
    }),
  },
  footer: {
    initial: { opacity: 0, scale: 0.92, y: 16 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: D * 0.5, delay: d0 + 0.22, ease: EASE_OUT } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: D * 0.4, ease: EASE_IN } },
  },
});

const hudScan = (D: number, d0: number, stg: number, n: number): RosterStyleVariants => ({
  container: {
    initial: { opacity: 0, clipPath: 'inset(0% 0% 100% 0%)' },
    animate: { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: D * 0.7, delay: d0, ease: EASE_IO } },
    exit: { opacity: 1, clipPath: 'inset(0% 0% 100% 0%)', transition: { duration: D * 0.7, delay: d0 + n * stg * 0.6 + D * 0.2, ease: EASE_IO } },
  },
  headerTitle: {
    initial: { opacity: 0, clipPath: 'inset(0% 100% 0% 0%)' },
    animate: { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: D * 0.5, delay: d0 + 0.05, ease: EASE_OUT } },
    exit: { opacity: 1, clipPath: 'inset(0% 0% 0% 100%)', transition: { duration: D * 0.4, ease: EASE_IN } },
  },
  headerSubtitle: {
    initial: { opacity: 0, clipPath: 'inset(0% 0% 0% 100%)' },
    animate: { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: D * 0.5, delay: d0 + 0.08, ease: EASE_OUT } },
    exit: { opacity: 1, clipPath: 'inset(0% 100% 0% 0%)', transition: { duration: D * 0.4, ease: EASE_IN } },
  },
  team: {
    initial: { opacity: 0, clipPath: 'inset(0% 0% 100% 0%)' },
    animate: { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: D * 0.5, delay: d0 + 0.12, ease: EASE_OUT } },
    exit: { opacity: 1, clipPath: 'inset(100% 0% 0% 0%)', transition: { duration: D * 0.4, ease: EASE_IN } },
  },
  player: {
    initial: { opacity: 0, clipPath: 'inset(0% 100% 0% 0%)' },
    animate: (c: PlayerCustom) => ({
      opacity: 1,
      clipPath: 'inset(0% 0% 0% 0%)',
      transition: { duration: D * 0.45, delay: d0 + 0.15 + c.index * stg, ease: EASE_OUT },
    }),
    exit: (c: PlayerCustom) => ({
      opacity: 1,
      clipPath: 'inset(0% 0% 0% 100%)',
      transition: { duration: D * 0.4, delay: (c.total - 1 - c.index) * stg * 0.5, ease: EASE_IN },
    }),
  },
  footer: {
    initial: { opacity: 0, clipPath: 'inset(0% 0% 100% 0%)' },
    animate: { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: D * 0.45, delay: d0 + 0.2 + n * stg, ease: EASE_OUT } },
    exit: { opacity: 1, clipPath: 'inset(100% 0% 0% 0%)', transition: { duration: D * 0.4, ease: EASE_IN } },
  },
});

/**
 * prefers-reduced-motion: opacity-only, tanpa transform/blur/stagger, durasi pendek.
 * Tetap IN/OUT (mount/unmount aman) tapi minim gerak — sesuai aksesibilitas.
 */
const reducedMotionVariants = (D: number, d0: number): RosterStyleVariants => {
  const inT = { duration: Math.min(0.25, D * 0.6), delay: d0, ease: EASE_OUT };
  const outT = { duration: Math.min(0.2, D * 0.4), ease: EASE_IN };
  const fade: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: inT },
    exit: { opacity: 0, transition: outT },
  };
  return { container: fade, headerTitle: fade, headerSubtitle: fade, team: fade, player: fade, footer: fade };
};

/**
 * Bangun set variants untuk style preset Team Roster; null bila preset bukan style baru.
 * `reducedMotion` (dari prefers-reduced-motion) memaksa fade opacity-only untuk semua slot.
 */
export function buildRosterStyleVariants(
  config: AnimationConfig,
  filledCount = 5,
  reducedMotion = false
): RosterStyleVariants | null {
  const D = Math.max(0.2, config.duration || 0.7);
  const d0 = Math.max(0, config.delay || 0);
  // prefers-reduced-motion → fade opacity-only untuk SEMUA preset Team Roster,
  // termasuk Roster Default (yang biasanya pakai builder wave lama).
  if (reducedMotion) return reducedMotionVariants(D, d0);
  if (!isRosterStyleId(config.presetId)) return null;
  const stg = Math.max(0.02, config.staggerDelay ?? 0.08);
  const n = Math.max(1, filledCount);
  switch (config.presetId) {
    case 'slide-up-pro':
      return slideUpPro(D, d0, stg, n);
    case 'minimal-fade':
      return minimalFade(D, d0, stg, n);
    case 'side-swipe':
      return sideSwipe(D, d0, stg, n);
    case 'scale-pop':
      return scalePop(D, d0, stg);
    case 'hud-scan':
      return hudScan(D, d0, stg, n);
    default:
      return null;
  }
}
