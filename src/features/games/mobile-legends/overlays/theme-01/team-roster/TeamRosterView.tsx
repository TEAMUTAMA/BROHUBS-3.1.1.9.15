
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSharedState } from '@/lib/useSharedState';
import {
  Database, Play, Square, Settings2, Type, Move, RefreshCw, Shield, ChevronLeft,
  Trash2, Plus, X, ChevronDown, ChevronRight, User, Sparkles, Zap,
  ArrowDownLeft, ArrowUpRight, Minus, ListOrdered, ArrowUp, ArrowDown, ArrowDownAZ,
  LayoutTemplate, Monitor,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react';
import { Theme, Asset, Game, PlayerData } from '@/types';
import PanelControlMonitor, { PreviewControlContext } from '@/features/companion/PanelControlMonitor';
import {
  AnimationConfig,
  PresetOverride,
  getAnimationSignature,
  resolveAnimationConfig,
  getRosterDefaultMaxWave,
  resolveExitStaggerDelay,
  resolveRosterDefaultWave,
  resolveRosterRevealDelay,
  resolveStaggerDelay,
  ROSTER_DEFAULT_WAVE_GAP_SEC,
  ROSTER_SLOT,
} from '@/constants/transitions';
import {
  TEAM_ROSTER_ANIMATION_PRESETS,
  DEFAULT_TEAM_ROSTER_ANIMATION,
  DEFAULT_TEAM_ROSTER_PRESET_ID,
} from './rosterTransitions';
import { buildRosterStyleVariants } from './rosterTransitionStyles';
import { notifyCompanionAnimation } from '@/features/companion/overlayAnimation';
import { notifyCompanionData } from '@/features/companion/overlayData';
import { useOverlayFonts } from '@/features/games/mobile-legends/useEliminationBannerFonts';
import { useT } from '@/i18n/LanguageContext';
import OverlayFontFamilySelect from '@/components/shared/OverlayFontFamilySelect';
import {
  DEFAULT_OVERLAY_FONT_FAMILY_ID,
  getOverlayFontCssFamily,
  resolveOverlayFontFamilyId,
} from '@/features/games/mobile-legends/logic/eliminationBannerFonts';
import {
  paginateRosterTeams,
  DEFAULT_ROSTER_TEAMS,
  MAX_PLAYERS_PER_TEAM,
  clampPlayerEntries,
  normalizeRosterTeams,
  resolvePlayerPhoto,
  enrichRosterImagesFromProject,
  mergeLeaderboardRanksIntoRoster,
  rosterTeamsFromProjectDb,
  sortRosterTeamsByLeaderboardRank,
  DEFAULT_ROSTER_PLAYER_IMG,
  getPaddedPlayerSlots,
  getRosterFilledCount,
  resolveCaptainIndex,
  type RosterTeam,
  type RosterPlayerEntry,
  type RosterSponsorEntry,
} from '@/features/games/mobile-legends/logic/teamRosterSync';
import { loadProjectPlayers } from '@/lib/projectPlayers';
import { resolveProjectScopeFromLocation } from '@/lib/outputRoute';
import {
  cutCornerClipPath,
  DEFAULT_PMGO_ROSTER_PALETTE,
  pickPmgoRosterPalette,
  hexToRgba,
  rosterFrameClipPath,
  type TeamRosterVisualPalette,
} from '@/features/games/mobile-legends/logic/teamRosterVisual';
import { isTeamMatchEliminated } from '@/features/games/mobile-legends/logic/matchPlacements';

interface OverlayTeamRosterViewProps {
  asset: Asset;
  theme: Theme;
  games: Game[];
  themes: Theme[];
  availableAssets: Asset[];
  userRole: 'admin' | 'member';
  onBack: () => void;
  onSelectTheme?: (theme: Theme) => void;
  onSelectAsset?: (asset: Asset) => void;
  globalLogo?: string | null;
  projectPlayers?: PlayerData[];
  /** Set when Member broadcast has a project — Admin GLOBAL studio leaves this null (no SSE). */
  companionProjectScope?: string | null;
  isGlobalStudio?: boolean;
  showMonitorProp?: boolean;
  programAssetIdProp?: string | null;
  onProgramAssetChange?: (id: string | null) => void;
  getAssetStatusProp?: (id: string) => number;
  onPreviewContentChange?: (content: React.ReactNode) => void;
  visualOnly?: boolean;
  monitorFeed?: boolean;
  feedPlayKey?: number;
  style?: React.CSSProperties;
  masterFrameSrc?: string;
  masterFrameContent?: React.ReactNode;
  customDataPanel?: React.ReactNode;
  customVisualPanel?: React.ReactNode;
  customAnimationPanel?: React.ReactNode;
}

const ScrollableInput = ({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (val: number) => void;
  className?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    const handleWheel = (e: WheelEvent) => {
      if (document.activeElement === element) {
        e.preventDefault();
        e.stopPropagation();
        onChange(value + (e.deltaY > 0 ? -1 : 1));
      }
    };
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [value, onChange]);
  return (
    <input
      ref={inputRef}
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={className}
    />
  );
};

const DEFAULT_TEAM_LOGO = 'https://api.dicebear.com/7.x/identicon/svg?seed=DEFAULT';

const DEFAULT_SPONSORS: RosterSponsorEntry[] = [
  { label: 'MEDIA PARTNER' },
  { label: 'OFFICIAL SPONSOR' },
  { label: 'POWERED BY' },
];

/** Efek background HUD — grid digital, smoke, partikel */
const RosterSceneBackdrop = ({
  colors,
  showHud,
}: {
  colors: TeamRosterVisualPalette;
  showHud: boolean;
}) => (
  <>
    {showHud && (
      <>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(${colors.gridColor} 1px, transparent 1px),
              linear-gradient(90deg, ${colors.gridColor} 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 80% 70% at 50% 55%, black 20%, transparent 85%)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 50% 35% at 50% 72%, ${hexToRgba(colors.frameGlow, 0.22)} 0%, transparent 70%),
              radial-gradient(ellipse 30% 20% at 50% 30%, ${hexToRgba(colors.accentNeon, 0.08)} 0%, transparent 65%),
              radial-gradient(ellipse 90% 40% at 50% 100%, ${colors.smokeColor} 0%, transparent 55%)
            `,
          }}
        />
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60" aria-hidden>
          <line x1="0" y1="540" x2="420" y2="540" stroke={colors.hudLineColor} strokeWidth="1" />
          <line x1="1500" y1="540" x2="1920" y2="540" stroke={colors.hudLineColor} strokeWidth="1" />
          <line x1="960" y1="0" x2="960" y2="180" stroke={hexToRgba(colors.frameGlow, 0.35)} strokeWidth="1" />
          <line x1="960" y1="900" x2="960" y2="1080" stroke={hexToRgba(colors.frameGlow, 0.2)} strokeWidth="1" />
          <polygon
            points="920,120 960,90 1000,120 960,150"
            fill="none"
            stroke={hexToRgba(colors.accentNeon, 0.5)}
            strokeWidth="1.5"
          />
        </svg>
        {[
          { left: '12%', top: '18%', delay: '0s' },
          { left: '78%', top: '22%', delay: '1.2s' },
          { left: '8%', top: '72%', delay: '2.1s' },
          { left: '88%', top: '68%', delay: '0.6s' },
          { left: '45%', top: '12%', delay: '1.8s' },
          { left: '55%', top: '85%', delay: '2.5s' },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full animate-pulse pointer-events-none"
            style={{
              left: p.left,
              top: p.top,
              backgroundColor: colors.accentNeon,
              boxShadow: `0 0 8px ${colors.accentNeon}, 0 0 16px ${hexToRgba(colors.frameGlow, 0.4)}`,
              animationDelay: p.delay,
              opacity: 0.7,
            }}
          />
        ))}
        <div
          className="absolute left-0 right-0 h-px pointer-events-none"
          style={{
            top: '48%',
            background: `linear-gradient(90deg, transparent, ${hexToRgba(colors.accentNeon, 0.45)}, transparent)`,
            boxShadow: `0 0 20px ${hexToRgba(colors.accentNeon, 0.3)}`,
          }}
        />
      </>
    )}
  </>
);

type RosterTypography = {
  fontFamilyId?: string;
  title: { size: number; weight: number; italic: boolean; x: number; y: number };
  subtitle: { size: number; weight: number; italic: boolean; x: number; y: number };
  teamName: { size: number; weight: number; italic: boolean };
  playerName: { size: number; weight: number; italic: boolean };
  playerNickname: { size: number; weight: number; italic: boolean };
  pageIndicator: { size: number; weight: number; italic: boolean };
  hashtag: { size: number; weight: number; italic: boolean };
};

type RosterLayout = {
  slotWidth: number;
  slotHeight: number;
  slotGap: number;
  captainScale: number;
  logoSize: number;
  playerPhotoScale: number;
  playerPhotoOffsetY: number;
  playerCardBgMode: 'default' | 'logo' | 'custom';
  playerCardBgCustomUrl: string;
  playerCardBgLogoOpacity: number;
  /** UI offset — 0 = standar 100% area kartu */
  playerCardBgLogoScale: number;
  contentOffsetX: number;
  contentOffsetY: number;
  frameCornerCut: number;
  showHudEffects: boolean;
};

type RosterAnimCustom = { index: number; total: number; isCaptain?: boolean };

/** Jeda antar wave pasangan slot — 5P: P1&P5 → P2&P4 → P3; 4P: P1&P4 → P2&P3 */
const ROSTER_SLOT_WAVE_GAP_SEC = 0.38;

const isRosterDefaultStagger = (config: AnimationConfig) =>
  config.staggerDirection === 'roster-default' && config.staggerChildren;

const withRosterSlotWaveGap = (config: AnimationConfig): AnimationConfig =>
  isRosterDefaultStagger(config)
    ? { ...config, staggerDelay: ROSTER_SLOT_WAVE_GAP_SEC }
    : config;

/** Gerak OUT khusus roster-default — mirror dramatis dari reveal IN */
const resolveRosterDefaultExitMotion = (
  slotIndex: number,
  total: number,
  isCaptain?: boolean
): { x?: number; y: number; scale: number; opacity: number; rotate?: number } => {
  const last = total - 1;
  const centerIdx = total >= 3 ? Math.min(ROSTER_SLOT.P3, last) : Math.floor(total / 2);

  if (slotIndex === centerIdx || isCaptain) {
    return { y: -52, scale: 0.66, opacity: 0 };
  }
  if (slotIndex === 0) {
    return { x: -92, y: 118, scale: 0.78, opacity: 0, rotate: -9 };
  }
  if (slotIndex === last) {
    return { x: 92, y: 118, scale: 0.78, opacity: 0, rotate: 9 };
  }
  if (slotIndex === 1) {
    return { x: -36, y: 82, scale: 0.82, opacity: 0, rotate: -4 };
  }
  if (slotIndex === last - 1) {
    return { x: 36, y: 82, scale: 0.82, opacity: 0, rotate: 4 };
  }
  return { y: 72, scale: 0.84, opacity: 0 };
};

const resolveRosterCenterSlotIndex = (total: number) =>
  total >= 3 ? Math.min(ROSTER_SLOT.P3, total - 1) : Math.floor(total / 2);

/**
 * Tier vertikal pasangan — items-end + marginBottom:
 * 5P: P1&P5 (bawah) → P2&P4 (naik) → P3 captain (paling tinggi)
 * 4P: P1&P4 (bawah) → P2&P3 (naik)
 */
const resolveRosterSlotTierLift = (slotIndex: number, total: number, slotHeight: number): number => {
  const wave = resolveRosterDefaultWave(slotIndex, total);
  if (total >= 5) {
    if (wave === 0) return 0;
    if (wave === 1) return slotHeight * 0.08;
    return slotHeight * 0.16;
  }
  if (total === 4) {
    if (wave === 0) return 0;
    return slotHeight * 0.08;
  }
  return 0;
};

/** Nilai 0 di panel layout = baseline render (px / %). */
const ROSTER_LAYOUT_BASE = {
  slotWidth: 280,
  slotHeight: 420,
  slotGap: 20,
  captainScale: 118,
  logoSize: 220,
  playerPhotoScale: 180,
  playerCardBgLogoScale: 100,
  frameCornerCut: 18,
  contentOffsetX: 0,
  contentOffsetY: 0,
} as const;

const ROSTER_PHOTO_POS_Y_BASE = 275;

const ROSTER_LAYOUT_MIGRATION_KEY = 'BROHUBS_TEAMROSTER_LAYOUT_UI_DELTA_V7';

const DEFAULT_ROSTER_LAYOUT_UI: Pick<
  RosterLayout,
  | 'slotWidth'
  | 'slotHeight'
  | 'slotGap'
  | 'captainScale'
  | 'logoSize'
  | 'playerPhotoScale'
  | 'playerPhotoOffsetY'
  | 'frameCornerCut'
  | 'playerCardBgLogoScale'
  | 'contentOffsetX'
  | 'contentOffsetY'
> = {
  slotWidth: 0,
  slotHeight: 0,
  slotGap: 0,
  captainScale: 0,
  logoSize: 0,
  playerPhotoScale: 0,
  playerPhotoOffsetY: 0,
  frameCornerCut: 0,
  playerCardBgLogoScale: 0,
  contentOffsetX: 0,
  contentOffsetY: 0,
};

const applyStandardRosterLayoutUi = (raw: RosterLayout): RosterLayout => ({
  ...raw,
  ...DEFAULT_ROSTER_LAYOUT_UI,
});

const resolveRosterLayout = (raw: RosterLayout): RosterLayout => ({
  ...raw,
  slotWidth: ROSTER_LAYOUT_BASE.slotWidth + (raw.slotWidth ?? 0),
  slotHeight: ROSTER_LAYOUT_BASE.slotHeight + (raw.slotHeight ?? 0),
  slotGap: ROSTER_LAYOUT_BASE.slotGap + (raw.slotGap ?? 0),
  captainScale: ROSTER_LAYOUT_BASE.captainScale + (raw.captainScale ?? 0),
  logoSize: ROSTER_LAYOUT_BASE.logoSize + (raw.logoSize ?? 0),
  playerPhotoScale: ROSTER_LAYOUT_BASE.playerPhotoScale + (raw.playerPhotoScale ?? 0),
  frameCornerCut: ROSTER_LAYOUT_BASE.frameCornerCut + (raw.frameCornerCut ?? 0),
  playerCardBgLogoScale:
    ROSTER_LAYOUT_BASE.playerCardBgLogoScale + (raw.playerCardBgLogoScale ?? 0),
  contentOffsetX: ROSTER_LAYOUT_BASE.contentOffsetX + (raw.contentOffsetX ?? 0),
  contentOffsetY: ROSTER_LAYOUT_BASE.contentOffsetY + (raw.contentOffsetY ?? 0),
  playerPhotoOffsetY: ROSTER_PHOTO_POS_Y_BASE + (raw.playerPhotoOffsetY ?? 0),
});

const layoutBaseHint = (base: number, unit = 'px') =>
  `0 = standar (${base}${unit})`;

/** Captain scale hanya untuk 5P (P3 wave tengah). 4P: P2&P3 ukuran sama. */
const resolveRosterSlotScale = (
  slotIndex: number,
  total: number,
  captainIndex: number,
  captainScalePct: number
): number => {
  if (total >= 5 && slotIndex === captainIndex) return captainScalePct / 100;
  return 1;
};

/** Simpan tanpa # — tampilan overlay menambahkan # otomatis */
const stripHashtagPrefix = (raw: string | undefined): string =>
  (raw ?? '').trim().replace(/^#+/, '');

/** Teks hashtag footer — kosong = auto #NAMA TIM */
const resolveTeamHashtagText = (team: RosterTeam): string => {
  const tag = stripHashtagPrefix(team.hashtag);
  if (tag) return `#${tag}`;
  return `#${team.name.replace(/\s+/g, '')}`;
};

const RosterHashtagInput = ({
  value,
  placeholder,
  onChange,
}: {
  value: string | undefined;
  placeholder: string;
  onChange: (tag: string) => void;
}) => (
  <div className="flex items-center w-full bg-black/50 border border-white/10 rounded-xl overflow-hidden focus-within:border-[#ccff00]">
    <span className="pl-3 pr-1 text-[10px] font-black text-[#74a57f] shrink-0 select-none">#</span>
    <input
      type="text"
      value={stripHashtagPrefix(value)}
      onChange={(e) => onChange(e.target.value.replace(/^#+/, ''))}
      placeholder={stripHashtagPrefix(placeholder) || 'TEAMNAME'}
      className="flex-1 min-w-0 bg-transparent border-0 py-2.5 pr-3 text-[10px] font-bold text-[#ccff00] uppercase outline-none tracking-[0.15em]"
    />
  </div>
);

const buildRosterPlayerVariants = (config: AnimationConfig): Variants => {
  const waveConfig = withRosterSlotWaveGap(config);
  return {
    // Captain (tengah) aksen sedikit lebih tegas (scale 0.9), pemain lain 0.94.
    // clipPath inset bawah → panel broadcast "membuka" dari atas.
    initial: (custom: RosterAnimCustom) => ({
      y: 60,
      opacity: 0,
      scale: custom.isCaptain ? 0.9 : 0.94,
      clipPath: 'inset(0% 0% 100% 0%)',
    }),
    animate: (custom: RosterAnimCustom) => {
      const delay = isRosterDefaultStagger(config)
        ? resolveRosterRevealDelay(custom.index, custom.total, waveConfig, 0.12, 'in')
        : resolveStaggerDelay(custom.index, custom.total, config, 0.15);
      const captainBoost =
        config.staggerDirection === 'roster-default' ? 0 : custom.isCaptain ? 0.04 : 0;
      return {
        y: 0,
        opacity: 1,
        scale: 1,
        clipPath: 'inset(0% 0% 0% 0%)',
        transition: config.useSpring
          ? {
              type: 'spring' as const,
              stiffness: 110,
              damping: 18,
              mass: 0.9,
              delay: delay - captainBoost,
            }
          : {
              delay: delay - captainBoost,
              duration: config.duration * 0.55,
              ease: config.easing === 'backOut' ? [0.34, 1.45, 0.64, 1] : config.easing,
            },
      };
    },
    exit: (custom: RosterAnimCustom) => {
      const rosterDefault = isRosterDefaultStagger(config);
      const exitMotion = rosterDefault
        ? resolveRosterDefaultExitMotion(custom.index, custom.total, custom.isCaptain)
        : { y: 48, opacity: 0, scale: 0.92 };
      const delay = rosterDefault
        ? resolveRosterRevealDelay(custom.index, custom.total, waveConfig, 0.05, 'out')
        : resolveExitStaggerDelay(custom.index, custom.total, config);
      const duration = rosterDefault
        ? config.duration * (custom.isCaptain ? 0.72 : 0.66)
        : config.duration * 0.65;

      return {
        ...exitMotion,
        scale: 0.94,
        clipPath: 'inset(0% 0% 100% 0%)', // panel "menutup" ke atas saat keluar
        transition: {
          delay,
          duration,
          ease: rosterDefault ? [0.55, 0.06, 0.68, 0.48] : 'easeIn',
        },
      };
    },
  };
};

const buildRosterHeaderAnimTiming = (config: AnimationConfig): AnimationConfig =>
  ({
    delay: config.delay,
    duration: config.duration,
    easing: config.easing,
  }) as AnimationConfig;

/** Geser header keluar frame 1920×1080 */
const ROSTER_HEADER_SLIDE_OFFSET = 1100;

/** Judul kiri (TEAM ROSTERS): IN dari kiri → kanan, OUT sebaliknya */
const buildRosterHeaderTitleVariants = (config: AnimationConfig, filledCount = 5): Variants => {
  const rosterDefault = isRosterDefaultStagger(config);
  const waveConfig = withRosterSlotWaveGap(config);
  const headerOutDelay = rosterDefault
    ? resolveRosterRevealDelay(ROSTER_SLOT.P1, filledCount, waveConfig, 0.05, 'out') +
      config.duration * 0.12
    : 0;

  return {
  // Judul masuk halus: clip reveal kiri→kanan + geser x -80→0.
  initial: { x: -80, opacity: 0, clipPath: 'inset(0% 100% 0% 0%)' },
  animate: {
    x: 0,
    opacity: 1,
    clipPath: 'inset(0% 0% 0% 0%)',
    transition: {
      delay: config.delay + 0.06,
      duration: config.duration * 0.6,
      ease: config.easing === 'backOut' ? [0.34, 1.3, 0.64, 1] : config.easing,
    },
  },
  exit: {
    x: -80,
    opacity: 0,
    clipPath: 'inset(0% 100% 0% 0%)', // clip menutup ke kiri
    transition: {
      delay: headerOutDelay,
      duration: config.duration * 0.55,
      ease: [0.45, 0, 0.75, 1],
    },
  },
};
};

/** Subtitle kanan (Round robin…): IN dari kanan → kiri, OUT sebaliknya */
const buildRosterHeaderSubtitleVariants = (config: AnimationConfig, filledCount = 5): Variants => {
  const rosterDefault = isRosterDefaultStagger(config);
  const waveConfig = withRosterSlotWaveGap(config);
  const headerOutDelay = rosterDefault
    ? resolveRosterRevealDelay(ROSTER_SLOT.P1, filledCount, waveConfig, 0.05, 'out') +
      config.duration * 0.12
    : 0;

  return {
  // Subtitle/event info masuk SETELAH title: clip reveal kanan→kiri + geser x +80→0.
  initial: { x: 80, opacity: 0, clipPath: 'inset(0% 0% 0% 100%)' },
  animate: {
    x: 0,
    opacity: 1,
    clipPath: 'inset(0% 0% 0% 0%)',
    transition: {
      delay: config.delay + 0.16,
      duration: config.duration * 0.6,
      ease: config.easing === 'backOut' ? [0.34, 1.3, 0.64, 1] : config.easing,
    },
  },
  exit: {
    x: 80,
    opacity: 0,
    clipPath: 'inset(0% 0% 0% 100%)', // clip menutup ke kanan
    transition: {
      delay: headerOutDelay,
      duration: config.duration * 0.55,
      ease: [0.45, 0, 0.75, 1],
    },
  },
};
};

const buildRosterSectionVariants = (
  config: AnimationConfig,
  phase: 'team' | 'footer',
  filledCount = 5
): Variants => {
  const waveGap = isRosterDefaultStagger(config)
    ? ROSTER_SLOT_WAVE_GAP_SEC
    : config.staggerDelay ?? ROSTER_DEFAULT_WAVE_GAP_SEC;
  const rosterLastWaveDelay =
    config.staggerDirection === 'roster-default' && config.staggerChildren
      ? resolveRosterRevealDelay(
          0,
          filledCount,
          config,
          0.15,
          'in'
        ) +
        getRosterDefaultMaxWave(filledCount) * waveGap +
        config.duration * 0.4
      : config.delay + (config.staggerChildren ? 0.82 : 0.55);

  const delays = {
    team: config.delay + 0.08,
    footer: rosterLastWaveDelay,
  };
  const initialY = phase === 'footer' ? 24 : -28;
  const rosterDefault = isRosterDefaultStagger(config);
  const waveConfig = withRosterSlotWaveGap(config);
  const centerIdx = resolveRosterCenterSlotIndex(filledCount);

  if (rosterDefault) {
    if (phase === 'team') {
      // Logo & nama team: masuk SEBELUM player cards (scale 0.85→1, y 20→0).
      return {
        initial: { y: 20, opacity: 0, scale: 0.85 },
        animate: {
          y: 0,
          opacity: 1,
          scale: 1,
          transition: {
            delay: delays.team,
            duration: config.duration * 0.65,
            ease: config.easing === 'backOut' ? [0.34, 1.3, 0.64, 1] : config.easing,
          },
        },
        exit: {
          y: -20,
          scale: 0.9,
          opacity: 0,
          transition: {
            delay: resolveRosterRevealDelay(centerIdx, filledCount, waveConfig, 0.05, 'out'),
            duration: config.duration * 0.55,
            ease: [0.55, 0.06, 0.68, 0.48],
          },
        },
      };
    }
    // Footer/sponsor/hashtag: masuk PALING AKHIR (setelah player), keluar PALING AWAL.
    return {
      initial: { y: 24, opacity: 0 },
      animate: {
        y: 0,
        opacity: 1,
        transition: {
          delay: delays.footer,
          duration: config.duration * 0.55,
          ease: config.easing === 'backOut' ? [0.34, 1.3, 0.64, 1] : config.easing,
        },
      },
      exit: {
        y: 24,
        opacity: 0,
        transition: {
          delay: config.delay,
          duration: config.duration * 0.4,
          ease: 'easeIn',
        },
      },
    };
  }

  return {
    initial: { y: initialY, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: {
        delay: delays[phase],
        duration: config.duration * 0.55,
        ease: config.easing === 'backOut' ? [0.34, 1.3, 0.64, 1] : config.easing,
      },
    },
    exit: {
      y: phase === 'footer' ? 16 : -18,
      opacity: 0,
      transition: { duration: config.duration * 0.45, ease: 'easeIn' },
    },
  };
};

const resolvePlayerCardBackground = (
  layout: RosterLayout,
  teamLogo?: string
): { url: string; fit: 'cover' | 'contain'; opacity: number; scalePct?: number } | null => {
  const mode = layout.playerCardBgMode ?? 'default';
  if (mode === 'logo') {
    const url = teamLogo?.trim();
    if (!url) return null;
    return {
      url,
      fit: 'contain',
      opacity: (layout.playerCardBgLogoOpacity ?? 35) / 100,
      scalePct: layout.playerCardBgLogoScale,
    };
  }
  if (mode === 'custom') {
    const url = layout.playerCardBgCustomUrl?.trim();
    if (!url) return null;
    return { url, fit: 'cover', opacity: 1 };
  }
  return null;
};

/** Slot pemain tunggal — frame terpisah dari foto, captain lebih besar */
const RosterPlayerSlot = ({
  player,
  isCaptain,
  isEmpty,
  teamLogo,
  colors,
  typography,
  layout,
  fontFamily,
  variants,
  animCustom,
  skipMotion,
  tierLift = 0,
  slotScale = 1,
}: {
  player: RosterPlayerEntry;
  isCaptain: boolean;
  isEmpty: boolean;
  teamLogo?: string;
  colors: TeamRosterVisualPalette;
  typography: RosterTypography;
  layout: RosterLayout;
  fontFamily: string;
  variants: Variants;
  animCustom: RosterAnimCustom;
  skipMotion: boolean;
  tierLift?: number;
  slotScale?: number;
}) => {
  const scale = slotScale;
  const frameClip = rosterFrameClipPath(layout.frameCornerCut);
  const glowAlpha = isCaptain ? 0.55 : 0.32;
  const photoScale = layout.playerPhotoScale / 100;
  const photoOffsetY = layout.playerPhotoOffsetY;
  const cardBackground = resolvePlayerCardBackground(layout, teamLogo);
  const cardBgMode = layout.playerCardBgMode ?? 'default';

  return (
    <motion.div
      variants={variants}
      custom={animCustom}
      initial={skipMotion ? false : 'initial'}
      animate="animate"
      exit="exit"
      className="flex flex-col items-center"
      style={{
        width: layout.slotWidth * scale,
        fontFamily,
        zIndex: isCaptain ? 20 : 10,
        marginBottom: tierLift,
      }}
    >
      <div
        className="relative w-full flex flex-col items-center"
        style={{
          height: layout.slotHeight * scale,
          filter: isCaptain
            ? `drop-shadow(0 0 28px ${hexToRgba(colors.frameGlow, glowAlpha)}) drop-shadow(0 16px 40px rgba(0,0,0,0.55))`
            : `drop-shadow(0 0 14px ${hexToRgba(colors.frameGlow, glowAlpha)}) drop-shadow(0 10px 28px rgba(0,0,0,0.4))`,
        }}
      >
        {isCaptain && (
          <div
            className="absolute -inset-4 pointer-events-none rounded-full"
            style={{
              background: `radial-gradient(ellipse 70% 60% at 50% 55%, ${hexToRgba(colors.frameGlow, 0.35)} 0%, transparent 70%)`,
            }}
          />
        )}

        {/* Frame layer — gradient PMGO atau background logo / custom */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{ clipPath: frameClip }}
        >
          {cardBackground && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <img
                src={cardBackground.url}
                alt=""
                className={`select-none max-w-none ${
                  cardBackground.fit === 'cover' ? 'absolute inset-0 w-full h-full object-cover' : 'object-contain'
                }`}
                style={
                  cardBackground.fit === 'contain'
                    ? {
                        width: `${cardBackground.scalePct ?? 100}%`,
                        height: `${cardBackground.scalePct ?? 100}%`,
                        opacity: cardBackground.opacity,
                      }
                    : { opacity: cardBackground.opacity }
                }
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <div
            className="absolute inset-0"
            style={{
              background: cardBackground
                ? `linear-gradient(165deg, ${hexToRgba(colors.frameGlow, 0.72)} 0%, ${hexToRgba(colors.frameBgMid, 0.45)} 38%, ${hexToRgba(colors.frameBgBottom, 0.82)} 100%)`
                : `linear-gradient(165deg, ${hexToRgba(colors.frameGlow, 0.92)} 0%, ${hexToRgba(colors.frameBgMid, 0.22)} 38%, ${hexToRgba(colors.frameBgBottom, 0.88)} 100%)`,
              border: `2px solid ${hexToRgba(colors.frameGlow, isCaptain ? 0.9 : 0.55)}`,
              boxShadow: `inset 0 0 24px ${hexToRgba(colors.frameGlow, 0.14)}, inset 0 -16px 32px ${hexToRgba(colors.frameBgBottom, 0.45)}`,
            }}
          />
        </div>
        <div
          className="absolute top-0 left-0 right-0 h-[3px] pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${colors.accentNeon}, transparent)`,
            opacity: isCaptain ? 1 : 0.5,
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: hexToRgba(colors.frameGlow, 0.4) }}
        />

        {isCaptain && (
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-0.5 uppercase tracking-[0.2em] font-black text-[10px]"
            style={{
              backgroundColor: colors.captainBadgeColor,
              color: colors.captainBadgeText,
              clipPath: cutCornerClipPath(4),
              boxShadow: `0 0 16px ${hexToRgba(colors.captainBadgeColor, 0.55)}`,
            }}
          >
            CAPTAIN
          </div>
        )}

        {/* Photo layer — nama di bawah frame, area foto pakai hampir penuh slot */}
        <div className="absolute inset-x-1 top-2 bottom-3 overflow-hidden flex items-end justify-center">
          {teamLogo && cardBgMode !== 'logo' && (
            <img
              src={teamLogo}
              alt=""
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain select-none pointer-events-none"
              style={{ width: '55%', height: '55%', opacity: 0.08 }}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          {!isEmpty ? (
            <img
              src={resolvePlayerPhoto(player)}
              alt={player.name}
              className="relative z-10 w-full h-full object-contain object-bottom"
              style={{
                maxWidth: '108%',
                transform: `translateY(${photoOffsetY}px) scale(${photoScale})`,
                transformOrigin: 'bottom center',
                filter: isCaptain ? 'brightness(1.05) contrast(1.05)' : undefined,
              }}
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_ROSTER_PLAYER_IMG;
              }}
            />
          ) : (
            <div
              className="relative z-10 flex items-center justify-center w-full h-full opacity-25"
              style={{ color: colors.cardHeaderText }}
            >
              <User size={isCaptain ? 56 : 40} />
            </div>
          )}
        </div>

        {/* Corner accents */}
        <div
          className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 pointer-events-none"
          style={{ borderColor: hexToRgba(colors.accentNeon, 0.6) }}
        />
        <div
          className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 pointer-events-none"
          style={{ borderColor: hexToRgba(colors.accentNeon, 0.6) }}
        />
        <div
          className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 pointer-events-none"
          style={{ borderColor: hexToRgba(colors.frameGlow, 0.5) }}
        />
        <div
          className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 pointer-events-none"
          style={{ borderColor: hexToRgba(colors.frameGlow, 0.5) }}
        />
      </div>

      {/* Name layer — putih + shadow hijau gelap PMGO */}
      <div className="mt-4 text-center w-full px-1">
        <p
          className="uppercase leading-none tracking-wide relative"
          style={{
            fontSize: `${(isCaptain ? typography.playerName.size * 1.08 : typography.playerName.size)}px`,
            fontWeight: typography.playerName.weight,
            fontStyle: typography.playerName.italic ? 'italic' : 'normal',
            color: colors.cardHeaderText,
            textShadow: `3px 3px 0 ${colors.nameShadowColor}, 0 0 18px ${hexToRgba(colors.frameGlow, 0.3)}`,
          }}
        >
          {isEmpty ? '—' : player.name}
        </p>
        {(player.nickname || player.role) && !isEmpty && (
          <p
            className="uppercase mt-1.5 leading-tight tracking-[0.15em] truncate"
            style={{
              fontSize: `${typography.playerNickname.size}px`,
              fontWeight: typography.playerNickname.weight,
              fontStyle: typography.playerNickname.italic ? 'italic' : 'normal',
              color: colors.secondaryTextColor,
            }}
          >
            {player.nickname ?? player.role}
          </p>
        )}
        {player.nickname && player.role && !isEmpty && (
          <p
            className="uppercase mt-0.5 leading-tight tracking-[0.2em] opacity-70 truncate"
            style={{
              fontSize: `${Math.max(10, typography.playerNickname.size - 4)}px`,
              fontWeight: 600,
              color: colors.accentNeon,
            }}
          >
            {player.role}
          </p>
        )}
      </div>
    </motion.div>
  );
};

const OverlayTeamRosterView: React.FC<OverlayTeamRosterViewProps> = ({
  asset,
  theme,
  games,
  themes,
  availableAssets,
  userRole,
  onBack,
  onSelectTheme,
  onSelectAsset,
  projectPlayers = [],
  companionProjectScope = null,
  isGlobalStudio = false,
  showMonitorProp = true,
  programAssetIdProp,
  onProgramAssetChange,
  getAssetStatusProp,
  onPreviewContentChange,
  visualOnly = false,
  monitorFeed = false,
  feedPlayKey,
  style,
  masterFrameSrc,
  masterFrameContent,
  customDataPanel,
  customVisualPanel,
  customAnimationPanel,
}) => {
  useOverlayFonts();
  const t = useT();
  const [configTab, setConfigTab] = useState<'DATA' | 'VISUAL' | 'ANIMATION'>('DATA');
  const [showMonitors, setShowMonitors] = useState(true);
  const [showList, setShowList] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(224);
  const [isResizing, setIsResizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<'alpha' | 'input' | null>(null);

  const [rosterTeams, setRosterTeams] = useSharedState<RosterTeam[]>(
    'BROHUBS_TEAMROSTER_DATA',
    DEFAULT_ROSTER_TEAMS
  );
  const [teams] = useSharedState<any[]>('BROHUBS_LEADERBOARD_TEAMS', []);
  const [leaderboardVisual] = useSharedState<Record<string, string>>(
    'BROHUBS_LEADERBOARD_VISUAL',
    {}
  );

  const [matchInfo, setMatchInfo] = useSharedState('BROHUBS_TEAMROSTER_MATCH', {
    title: 'TEAM ROSTERS',
    subtitle: 'ROUND ROBIN FINALS',
  });

  const [pagination, setPagination] = useSharedState('BROHUBS_TEAMROSTER_PAGINATION', {
    currentPage: 1,
    teamsPerPage: 1,
  });

  const [visualConfig, setVisualConfig] = useSharedState('BROHUBS_TEAMROSTER_VISUAL', {
    usePmgoTeamColors: true,
    showSponsors: true,
    showHashtag: true,
    showHudEffects: false,
    sponsors: DEFAULT_SPONSORS,
    ...DEFAULT_PMGO_ROSTER_PALETTE,
  });

  const [typography, setTypography] = useSharedState('BROHUBS_TEAMROSTER_TYPOGRAPHY', {
    fontFamilyId: DEFAULT_OVERLAY_FONT_FAMILY_ID,
    title: { size: 52, weight: 900, italic: false, x: 0, y: 0 },
    subtitle: { size: 22, weight: 700, italic: false, x: 0, y: 0 },
    teamName: { size: 56, weight: 900, italic: false },
    playerName: { size: 26, weight: 900, italic: false },
    playerNickname: { size: 13, weight: 600, italic: false },
    pageIndicator: { size: 16, weight: 600, italic: false },
    hashtag: { size: 18, weight: 700, italic: false },
  });

  const [cardLayout, setCardLayout] = useSharedState<RosterLayout>('BROHUBS_TEAMROSTER_LAYOUT', {
    ...DEFAULT_ROSTER_LAYOUT_UI,
    playerCardBgMode: 'default',
    playerCardBgCustomUrl: '',
    playerCardBgLogoOpacity: 35,
    playerCardBgLogoScale: 0,
    showHudEffects: false,
  });

  const resetRosterLayoutToStandard = useCallback(() => {
    setCardLayout((prev) => applyStandardRosterLayoutUi(prev as RosterLayout));
  }, [setCardLayout]);

  useEffect(() => {
    try {
      if (localStorage.getItem(ROSTER_LAYOUT_MIGRATION_KEY)) return;
    } catch {
      return;
    }
    setCardLayout((prev) => applyStandardRosterLayoutUi(prev as RosterLayout));
    try {
      localStorage.setItem(ROSTER_LAYOUT_MIGRATION_KEY, '1');
    } catch {}
  }, [setCardLayout]);

  const resolvedCardLayout = useMemo(
    () => resolveRosterLayout(cardLayout as RosterLayout),
    [cardLayout]
  );

  const [animationConfig, setAnimationConfig] = useSharedState<AnimationConfig>(
    'BROHUBS_TEAMROSTER_ANIMATION',
    DEFAULT_TEAM_ROSTER_ANIMATION
  );
  const [presetOverrides, setPresetOverrides] = useSharedState<Record<string, PresetOverride>>(
    'BROHUBS_TEAMROSTER_PRESET_OVERRIDES',
    {}
  );
  const [draftAnimationConfig, setDraftAnimationConfig] = useState<AnimationConfig>(animationConfig);
  // prefers-reduced-motion → builder pakai fade opacity-only (aksesibilitas).
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (visualOnly || monitorFeed) return;
    if (animationConfig.mode === 'custom') return;
    const allowedIds = TEAM_ROSTER_ANIMATION_PRESETS.map((p) => p.id);
    if (allowedIds.includes(animationConfig.presetId ?? '')) return;
    const rosterPreset =
      TEAM_ROSTER_ANIMATION_PRESETS.find((p) => p.id === DEFAULT_TEAM_ROSTER_PRESET_ID) ??
      TEAM_ROSTER_ANIMATION_PRESETS[0];
    setAnimationConfig({
      ...animationConfig,
      mode: 'default',
      presetId: rosterPreset.id,
      ...rosterPreset.config,
    });
  }, [animationConfig, monitorFeed, setAnimationConfig, visualOnly]);

  const [internalProgramAssetId, setInternalProgramAssetId] = useState<string | null>(null);
  const [programPlayKey, setProgramPlayKey] = useState(0);
  const programAssetId = programAssetIdProp !== undefined ? programAssetIdProp : internalProgramAssetId;
  const setProgramAssetId = (id: string | null) => {
    if (id) setProgramPlayKey((k) => k + 1);
    if (onProgramAssetChange) onProgramAssetChange(id);
    else setInternalProgramAssetId(id);
  };

  const { replay, playKey } = React.useContext(PreviewControlContext);

  const triggerPreview = useCallback(() => {
    if (replay) setTimeout(() => replay(), 80);
  }, [replay]);

  const effectiveAnimationConfig = useMemo(
    () => resolveAnimationConfig(animationConfig, presetOverrides, TEAM_ROSTER_ANIMATION_PRESETS),
    [animationConfig, presetOverrides]
  );

  const activeAnimConfig = useMemo(
    () =>
      visualOnly || monitorFeed
        ? effectiveAnimationConfig
        : resolveAnimationConfig(draftAnimationConfig, presetOverrides, TEAM_ROSTER_ANIMATION_PRESETS),
    [visualOnly, monitorFeed, effectiveAnimationConfig, draftAnimationConfig, presetOverrides]
  );

  const { pageTeams, totalPages, safePage } = useMemo(
    () => paginateRosterTeams(rosterTeams, pagination.currentPage, 1),
    [rosterTeams, pagination.currentPage]
  );

  useEffect(() => {
    if (pagination.teamsPerPage !== 1) {
      setPagination((prev) => ({ ...prev, teamsPerPage: 1 }));
    }
  }, [pagination.teamsPerPage, setPagination]);

  const activeTeam = pageTeams[0] ?? null;
  const activeTeamIndex = safePage - 1;

  const rosterFontFamily = useMemo(
    () =>
      getOverlayFontCssFamily(
        resolveOverlayFontFamilyId((typography as { fontFamilyId?: string }).fontFamilyId)
      ),
    [typography]
  );

  /** Pemain dari Project Event DB (prop studio/deploy, atau localStorage di output OBS) */
  const effectiveProjectPlayers = useMemo(() => {
    if (projectPlayers.length > 0) return projectPlayers;
    if (typeof window === 'undefined') return [];
    const scope = resolveProjectScopeFromLocation();
    return loadProjectPlayers(scope);
  }, [projectPlayers]);

  const projectDbTeamCount = useMemo(() => {
    return new Set(effectiveProjectPlayers.map((p) => p.team?.trim()).filter(Boolean)).size;
  }, [effectiveProjectPlayers]);

  useEffect(() => {
    if (safePage !== pagination.currentPage) {
      setPagination((prev) => ({ ...prev, currentPage: safePage }));
    }
  }, [safePage, pagination.currentPage, setPagination]);

  useEffect(() => {
    setDraftAnimationConfig(animationConfig);
  }, [animationConfig]);

  useEffect(() => {
    setShowMonitors(showMonitorProp);
  }, [showMonitorProp]);

  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX - 256;
      if (newWidth > 160 && newWidth < 480) setSidebarWidth(newWidth);
    },
    [isResizing]
  );

  useEffect(() => {
    if (!isResizing) return;
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isResizing, resize, stopResizing]);

  const handleSave = () => {
    setIsSaving(true);
    setAnimationConfig({ ...draftAnimationConfig, mode: 'custom' });
    if (programAssetId === asset.id) {
      setProgramPlayKey((k) => k + 1);
    }
    if (replay) setTimeout(() => replay(), 100);
    setTimeout(() => setIsSaving(false), 1500);
  };

  const commitRosterTeams = useCallback(
    (next: RosterTeam[]) =>
      setRosterTeams(sortRosterTeamsByLeaderboardRank(normalizeRosterTeams(next))),
    [setRosterTeams]
  );

  useEffect(() => {
    const overLimit = rosterTeams.some((t) => t.players.length > MAX_PLAYERS_PER_TEAM);
    if (overLimit) commitRosterTeams(rosterTeams);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const teamsRef = useRef(teams);
  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  /** Auto-load roster dari Project Event DB — HANYA saat roster masih default/demo. */
  useEffect(() => {
    if (!effectiveProjectPlayers.length) return;
    const built = rosterTeamsFromProjectDb(effectiveProjectPlayers, teamsRef.current);
    if (!built.length) return;
    setRosterTeams((prev) => {
      // Hanya auto-isi saat roster masih bawaan/demo (belum pernah diisi dari project ini).
      // Setelah ada data nyata, JANGAN timpa — hormati urutan (sort A–Z / geser Up-Down) &
      // edit manual user. Tanpa gate ini, tiap parent re-render (mis. jam broadcast tiap detik)
      // membangun ulang roster dalam urutan input → menimpa urutan pilihan user + flicker.
      // Sinkron ulang penuh dari Project DB tetap tersedia lewat tombol REFRESH PROJECT DB.
      const isPristine =
        prev.length === DEFAULT_ROSTER_TEAMS.length &&
        prev.every((t, i) => t.id === DEFAULT_ROSTER_TEAMS[i]?.id);
      if (!isPristine) return prev;
      const normalized = sortRosterTeamsByLeaderboardRank(normalizeRosterTeams(built));
      return JSON.stringify(normalized) === JSON.stringify(prev) ? prev : normalized;
    });
  }, [effectiveProjectPlayers, setRosterTeams]);

  useEffect(() => {
    if (!effectiveProjectPlayers.length) return;
    setRosterTeams((prev) => {
      const enriched = normalizeRosterTeams(
        enrichRosterImagesFromProject(prev, effectiveProjectPlayers)
      );
      const changed = JSON.stringify(enriched) !== JSON.stringify(prev);
      return changed ? enriched : prev;
    });
  }, [effectiveProjectPlayers, setRosterTeams]);

  /** Perbarui slot rank / logo tim dari Overall Ranking tanpa mengubah nama pemain Project DB */
  useEffect(() => {
    if (!teams.length) return;
    setRosterTeams((prev) => {
      const merged = sortRosterTeamsByLeaderboardRank(
        normalizeRosterTeams(mergeLeaderboardRanksIntoRoster(prev, teams))
      );
      const unchanged =
        merged.length === prev.length &&
        merged.every(
          (t, i) =>
            t.leaderboardRank === prev[i]?.leaderboardRank &&
            t.teamLogo === prev[i]?.teamLogo &&
            t.name === prev[i]?.name &&
            t.id === prev[i]?.id
        );
      return unchanged ? prev : merged;
    });
  }, [teams, setRosterTeams]);

  const syncFromProjectDb = () => {
    if (!effectiveProjectPlayers.length) return;
    const built = rosterTeamsFromProjectDb(effectiveProjectPlayers, teams);
    if (built.length) commitRosterTeams(built);
  };

  const updateTeam = (index: number, patch: Partial<RosterTeam>) => {
    const updated = [...rosterTeams];
    updated[index] = { ...updated[index], ...patch };
    commitRosterTeams(updated);
  };

  const updatePlayer = (
    teamIndex: number,
    playerIndex: number,
    patch: Partial<RosterPlayerEntry>
  ) => {
    const updated = [...rosterTeams];
    const filled = clampPlayerEntries(updated[teamIndex].players);
    const prev = filled[playerIndex] ?? { name: '—' };
    filled[playerIndex] = { ...prev, ...patch };
    updated[teamIndex] = { ...updated[teamIndex], players: filled };
    commitRosterTeams(updated);
  };

  const addPlayer = (teamIndex: number) => {
    const team = rosterTeams[teamIndex];
    if (!team) return;
    const filled = clampPlayerEntries(team.players);
    if (filled.length >= MAX_PLAYERS_PER_TEAM) return;
    const updated = [...rosterTeams];
    updated[teamIndex] = {
      ...updated[teamIndex],
      players: [...filled, { name: 'NEW PLAYER' }],
    };
    commitRosterTeams(updated);
  };

  const removePlayer = (teamIndex: number, playerIndex: number) => {
    const updated = [...rosterTeams];
    const filled = clampPlayerEntries(updated[teamIndex].players).filter((_, i) => i !== playerIndex);
    updated[teamIndex] = {
      ...updated[teamIndex],
      players: filled.length ? filled : [{ name: '—' }],
    };
    commitRosterTeams(updated);
  };

  const addTeam = () => {
    setSortMode(null); // tambah tim → urutan tak lagi murni hasil sort
    const n = rosterTeams.length + 1;
    commitRosterTeams([
      ...rosterTeams,
      {
        id: `team-${n}`,
        name: `TEAM ${n}`,
        teamLogo: DEFAULT_TEAM_LOGO,
        players: [
          { name: 'PLAYER 1' },
          { name: 'PLAYER 2' },
          { name: 'PLAYER 3' },
          { name: 'PLAYER 4' },
        ],
      },
    ]);
  };

  const removeTeam = (index: number) => {
    commitRosterTeams(rosterTeams.filter((_, i) => i !== index));
  };

  /** Pindah posisi tim naik (-1) / turun (+1) dalam daftar roster. */
  const moveTeam = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rosterTeams.length) return;
    const updated = [...rosterTeams];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    commitRosterTeams(updated);
    setEditingTeamIndex(target); // panel tetap terbuka mengikuti tim yang dipindah
    setSortMode(null); // geser manual → bukan lagi urutan murni hasil sort
  };

  /** Opsi urutan: susun tim sesuai abjad (A–Z). */
  const sortRosterAlphabetical = () => {
    commitRosterTeams([...rosterTeams].sort((a, b) => a.name.localeCompare(b.name)));
    setEditingTeamIndex(null);
    setSortMode('alpha');
  };

  /** Opsi urutan: ikut urutan input Project DB (urutan Excel/manual saat input data). */
  const sortRosterByInputOrder = () => {
    const order: string[] = [];
    const seen = new Set<string>();
    for (const p of effectiveProjectPlayers) {
      const key = (p.team || '').trim().toLowerCase();
      if (key && !seen.has(key)) { seen.add(key); order.push(key); }
    }
    const rankOf = (t: RosterTeam) => {
      const i = order.indexOf((t.name || '').trim().toLowerCase());
      return i === -1 ? Number.POSITIVE_INFINITY : i;
    };
    const sorted = [...rosterTeams].sort((a, b) => {
      const ra = rankOf(a);
      const rb = rankOf(b);
      return ra === rb ? 0 : ra - rb;
    });
    commitRosterTeams(sorted);
    setEditingTeamIndex(null);
    setSortMode('input');
  };

  useEffect(() => {
    if (visualOnly) return;
    notifyCompanionAnimation({
      assetId: asset.id,
      animation: effectiveAnimationConfig,
      presetOverrides,
    }, companionProjectScope);
  }, [asset.id, effectiveAnimationConfig, presetOverrides, visualOnly, companionProjectScope]);

  useEffect(() => {
    if (visualOnly) return;
    const timer = setTimeout(() => {
      notifyCompanionData({
        assetId: asset.id,
        data: {
          BROHUBS_TEAMROSTER_DATA: rosterTeams,
          BROHUBS_TEAMROSTER_MATCH: matchInfo,
          BROHUBS_TEAMROSTER_VISUAL: visualConfig,
          BROHUBS_TEAMROSTER_TYPOGRAPHY: typography,
          BROHUBS_TEAMROSTER_LAYOUT: cardLayout,
          BROHUBS_TEAMROSTER_PAGINATION: pagination,
        },
      }, companionProjectScope);
    }, 400);
    return () => clearTimeout(timer);
  }, [asset.id, rosterTeams, matchInfo, visualConfig, typography, cardLayout, pagination, visualOnly, companionProjectScope]);

  const usePmgoTeamColors = visualConfig.usePmgoTeamColors !== false;
  const showHudEffects =
    visualConfig.showHudEffects !== false && cardLayout.showHudEffects !== false;
  const showSponsors = visualConfig.showSponsors !== false;
  const showHashtag = visualConfig.showHashtag !== false;
  const sponsors: RosterSponsorEntry[] =
    (visualConfig.sponsors as RosterSponsorEntry[] | undefined)?.length
      ? (visualConfig.sponsors as RosterSponsorEntry[])
      : DEFAULT_SPONSORS;

  const pmgoPalette = useMemo(
    () => (usePmgoTeamColors ? pickPmgoRosterPalette(leaderboardVisual) : null),
    [usePmgoTeamColors, leaderboardVisual]
  );

  const resolvedGlobalColors = useMemo(
    (): TeamRosterVisualPalette =>
      usePmgoTeamColors && pmgoPalette
        ? pmgoPalette
        : {
            ...DEFAULT_PMGO_ROSTER_PALETTE,
            titleColor: visualConfig.titleColor ?? DEFAULT_PMGO_ROSTER_PALETTE.titleColor,
            subtitleColor: visualConfig.subtitleColor ?? DEFAULT_PMGO_ROSTER_PALETTE.subtitleColor,
            pageIndicatorColor:
              visualConfig.pageIndicatorColor ?? DEFAULT_PMGO_ROSTER_PALETTE.pageIndicatorColor,
            accentLineColor:
              visualConfig.accentLineColor ?? DEFAULT_PMGO_ROSTER_PALETTE.accentLineColor,
            cardHeaderBg: visualConfig.cardHeaderBg ?? DEFAULT_PMGO_ROSTER_PALETTE.cardHeaderBg,
            cardHeaderText:
              visualConfig.cardHeaderText ?? DEFAULT_PMGO_ROSTER_PALETTE.cardHeaderText,
            cardBodyBg: visualConfig.cardBodyBg ?? DEFAULT_PMGO_ROSTER_PALETTE.cardBodyBg,
            cardBodyText: visualConfig.cardBodyText ?? DEFAULT_PMGO_ROSTER_PALETTE.cardBodyText,
            logoPlaceholderBg:
              visualConfig.logoPlaceholderBg ?? DEFAULT_PMGO_ROSTER_PALETTE.logoPlaceholderBg,
            frameGlow: visualConfig.frameGlow ?? visualConfig.cardHeaderBg ?? DEFAULT_PMGO_ROSTER_PALETTE.frameGlow,
            frameBgBottom: visualConfig.frameBgBottom ?? DEFAULT_PMGO_ROSTER_PALETTE.frameBgBottom,
            frameBgMid: visualConfig.frameBgMid ?? visualConfig.cardBodyBg ?? DEFAULT_PMGO_ROSTER_PALETTE.frameBgMid,
            accentNeon: visualConfig.accentNeon ?? DEFAULT_PMGO_ROSTER_PALETTE.accentNeon,
            nameShadowColor:
              visualConfig.nameShadowColor ?? DEFAULT_PMGO_ROSTER_PALETTE.nameShadowColor,
            gridColor: visualConfig.gridColor ?? DEFAULT_PMGO_ROSTER_PALETTE.gridColor,
            smokeColor: visualConfig.smokeColor ?? DEFAULT_PMGO_ROSTER_PALETTE.smokeColor,
            hudLineColor: visualConfig.hudLineColor ?? DEFAULT_PMGO_ROSTER_PALETTE.hudLineColor,
            secondaryTextColor:
              visualConfig.secondaryTextColor ?? DEFAULT_PMGO_ROSTER_PALETTE.secondaryTextColor,
            captainBadgeColor:
              visualConfig.captainBadgeColor ?? DEFAULT_PMGO_ROSTER_PALETTE.captainBadgeColor,
            captainBadgeText:
              visualConfig.captainBadgeText ?? DEFAULT_PMGO_ROSTER_PALETTE.captainBadgeText,
          },
    [usePmgoTeamColors, pmgoPalette, visualConfig]
  );

  const renderLivePreview = useCallback((overrideAnimKey?: number, animConfig?: AnimationConfig) => {
    const config = animConfig ?? activeAnimConfig;
    const resolvedAnimKey = overrideAnimKey ?? feedPlayKey ?? playKey;
    const team = activeTeam;
    const playerSlots = team ? getPaddedPlayerSlots(team.players) : [];
    const filledCount = team ? getRosterFilledCount(team.players) : 5;
    const captainIdx = team ? resolveCaptainIndex(team) : 2;

    const activeTeamLb = team && (teams as any[]).length
      ? (teams as any[]).find(
          (t: any) => t.team?.toLowerCase?.()?.trim?.() === team.name.toLowerCase().trim()
        ) ?? null
      : null;
    const isEliminated = activeTeamLb ? isTeamMatchEliminated(activeTeamLb) : false;
    const elimBg = resolvedGlobalColors.frameBgBottom;
    const elimText = resolvedGlobalColors.cardHeaderText;
    const rosterTypography = typography as RosterTypography;
    const rosterLayout = resolvedCardLayout;
    const rosterPlayerVariants = buildRosterPlayerVariants(config);
    const headerTiming = buildRosterHeaderAnimTiming(config);
    const rosterHeaderTitleVariants = buildRosterHeaderTitleVariants(headerTiming, filledCount);
    const rosterHeaderSubtitleVariants = buildRosterHeaderSubtitleVariants(headerTiming, filledCount);
    const rosterTeamVariants = buildRosterSectionVariants(config, 'team', filledCount);
    const rosterFooterVariants = buildRosterSectionVariants(config, 'footer', filledCount);

    // Style esports PRESET MODE (SLIDE UP PRO / SIDE SWIPE / DIGITAL GLITCH / SCALE POP /
    // HUD SCAN). Non-null bila preset aktif salah satunya → override variants di bawah.
    const styleVars = buildRosterStyleVariants(config, filledCount, !!prefersReducedMotion);

    // Durasi total koreografi OUT (elemen terakhir yang keluar = header). Dipakai untuk
    // memfade latar/scene mengikuti seluruh exit, supaya tidak "pop" mendadak di akhir.
    const rosterHeaderOutDelay = isRosterDefaultStagger(config)
      ? resolveRosterRevealDelay(ROSTER_SLOT.P1, filledCount, withRosterSlotWaveGap(config), 0.05, 'out') +
        config.duration * 0.12
      : 0;
    const rosterOutTotalSec = rosterHeaderOutDelay + config.duration * 0.58 + 0.05;

    if (masterFrameContent || masterFrameSrc) {
      return (
        <motion.div
          key={`master-frame-asset-${asset.id}-${resolvedAnimKey}-${getAnimationSignature(config)}`}
          style={style}
          className={`w-[1920px] h-[1080px] bg-transparent relative overflow-hidden ${
            style?.position === 'absolute' ? '' : 'mx-auto'
          }`}
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1, transition: { duration: Math.max(config.duration, 0.65) } }}
        >
          {masterFrameContent ?? (
            <img
              src={masterFrameSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
          )}
        </motion.div>
      );
    }

    return (
      <motion.div
        key={`roster-asset-${resolvedAnimKey}-${getAnimationSignature(config)}`}
        style={style}
        className={`w-[1920px] h-[1080px] bg-transparent relative overflow-hidden ${
          style?.position === 'absolute' ? '' : 'mx-auto'
        }`}
        variants={styleVars?.container}
        initial={styleVars ? 'initial' : false}
        animate={styleVars ? 'animate' : { opacity: 1 }}
        exit={styleVars ? 'exit' : { opacity: 1, transition: { when: 'afterChildren' } }}
      >
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={false}
          animate={{ opacity: 1 }}
          exit={
            // Style baru: latar ikut container (di-clip/scale/slide bersama). Default: latar
            // fade sendiri di ~28% akhir agar tak "pop" saat unmount.
            styleVars
              ? undefined
              : {
                  opacity: [1, 1, 0],
                  transition: { duration: rosterOutTotalSec, times: [0, 0.72, 1], ease: 'easeIn' },
                }
          }
        >
          <RosterSceneBackdrop colors={resolvedGlobalColors} showHud={showHudEffects} />
        </motion.div>

        <div className="absolute inset-0">
          <div
            className="absolute inset-0 flex flex-col items-center"
            style={{
              fontFamily: rosterFontFamily,
              transform: `translate(${rosterLayout.contentOffsetX}px, ${rosterLayout.contentOffsetY}px)`,
            }}
          >
          {/* Event header — judul dari kiri, subtitle dari kanan */}
          <div className="w-full flex items-start justify-between px-16 pt-12 relative z-20 shrink-0">
            <motion.div
              variants={styleVars?.headerTitle ?? rosterHeaderTitleVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div
                style={{
                  transform: `translate(${rosterTypography.title.x}px, ${rosterTypography.title.y}px)`,
                }}
              >
                <h1
                  className="uppercase leading-none tracking-tighter"
                  style={{
                    color: resolvedGlobalColors.titleColor,
                    fontSize: `${rosterTypography.title.size}px`,
                    fontWeight: rosterTypography.title.weight,
                    fontStyle: rosterTypography.title.italic ? 'italic' : 'normal',
                    textShadow: `0 0 40px ${hexToRgba(resolvedGlobalColors.titleColor, 0.4)}`,
                  }}
                >
                  {matchInfo.title}
                </h1>
                <div
                  className="h-1 mt-2"
                  style={{
                    width: 220,
                    minWidth: 180,
                    background: `linear-gradient(90deg, ${resolvedGlobalColors.titleColor}, ${resolvedGlobalColors.accentNeon}, transparent)`,
                  }}
                />
              </div>
            </motion.div>

            <motion.div
              variants={styleVars?.headerSubtitle ?? rosterHeaderSubtitleVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col items-end gap-3"
            >
              <div
                style={{
                  transform: `translate(${rosterTypography.subtitle.x}px, ${rosterTypography.subtitle.y}px)`,
                }}
              >
                <div
                  className="px-6 py-2 transform -skew-x-12"
                  style={{
                    backgroundColor: 'transparent',
                  }}
                >
                  <p
                    className="uppercase tracking-[0.3em] transform skew-x-12"
                    style={{
                      color: resolvedGlobalColors.subtitleColor,
                      fontSize: `${rosterTypography.subtitle.size}px`,
                      fontWeight: rosterTypography.subtitle.weight,
                      fontStyle: rosterTypography.subtitle.italic ? 'italic' : 'normal',
                    }}
                  >
                    {matchInfo.subtitle}
                  </p>
                </div>
                <div
                  className="px-4 py-1.5 border uppercase tracking-[0.2em] mt-3 ml-auto w-fit"
                  style={{
                    color: resolvedGlobalColors.pageIndicatorColor,
                    fontSize: `${rosterTypography.pageIndicator.size}px`,
                    fontWeight: rosterTypography.pageIndicator.weight,
                    borderColor: hexToRgba(resolvedGlobalColors.frameGlow, 0.45),
                    backgroundColor: 'transparent',
                    clipPath: cutCornerClipPath(6),
                  }}
                >
                  TEAM {safePage} / {totalPages}
                </div>
              </div>
            </motion.div>
          </div>

          <div className="flex flex-col items-center flex-1 w-full min-h-0">
          <AnimatePresence mode="wait">
          {team ? (
            <motion.div
              key={`roster-page-${safePage}-${team.id}`}
              className="flex flex-col items-center flex-1 w-full"
              exit={{ opacity: 1, transition: { when: 'afterChildren' } }}
            >
              {/* Logo + team name — center top */}
              <motion.div
                variants={styleVars?.team ?? rosterTeamVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col items-center mt-4 relative z-30 shrink-0"
              >
                <div
                  className="relative flex items-center justify-center mb-4"
                  style={{
                    width: rosterLayout.logoSize + 40,
                    height: rosterLayout.logoSize + 40,
                    filter: `drop-shadow(0 0 24px ${hexToRgba(resolvedGlobalColors.frameGlow, 0.5)})`,
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      border: `2px solid ${hexToRgba(resolvedGlobalColors.frameGlow, 0.5)}`,
                      boxShadow: `inset 0 0 20px ${hexToRgba(resolvedGlobalColors.frameGlow, 0.15)}`,
                    }}
                  />
                  {team.teamLogo ? (
                    <img
                      src={team.teamLogo}
                      alt={team.name}
                      className="relative z-10 object-contain"
                      style={{
                        width: rosterLayout.logoSize,
                        height: rosterLayout.logoSize,
                      }}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <Shield
                      size={rosterLayout.logoSize * 0.5}
                      style={{ color: resolvedGlobalColors.frameGlow }}
                    />
                  )}
                </div>

                <h2
                  className="uppercase text-center leading-none tracking-wide"
                  style={{
                    color: resolvedGlobalColors.cardHeaderText,
                    fontSize: `${rosterTypography.teamName.size}px`,
                    fontWeight: rosterTypography.teamName.weight,
                    fontStyle: rosterTypography.teamName.italic ? 'italic' : 'normal',
                    textShadow: `4px 4px 0 ${resolvedGlobalColors.nameShadowColor}, 0 0 28px ${hexToRgba(resolvedGlobalColors.frameGlow, 0.45)}`,
                  }}
                >
                  {team.name}
                </h2>

                <div className="flex items-center gap-3 mt-3 opacity-60">
                  <span
                    className="h-px w-16"
                    style={{ background: `linear-gradient(90deg, transparent, ${resolvedGlobalColors.accentNeon})` }}
                  />
                  <Sparkles size={12} style={{ color: resolvedGlobalColors.accentNeon }} />
                  <span
                    className="h-px w-16"
                    style={{ background: `linear-gradient(90deg, ${resolvedGlobalColors.accentNeon}, transparent)` }}
                  />
                </div>
              </motion.div>

              {/* 5 player slots — horizontal, captain center larger */}
              <div
                className="flex items-end justify-center flex-1 w-full px-10 pb-6 relative z-20"
                style={{ gap: `${rosterLayout.slotGap}px`, marginTop: 8 }}
              >
                {playerSlots.map((player, pIdx) => {
                  if (pIdx >= filledCount) return null;
                  return (
                    <React.Fragment key={`${team.id}-slot-${pIdx}`}>
                      <RosterPlayerSlot
                        player={player}
                        isCaptain={pIdx === captainIdx}
                        isEmpty={player.name === '—'}
                        teamLogo={team.teamLogo}
                        colors={resolvedGlobalColors}
                        typography={rosterTypography}
                        layout={rosterLayout}
                        fontFamily={rosterFontFamily}
                        variants={styleVars?.player ?? rosterPlayerVariants}
                        animCustom={{
                          index: pIdx,
                          total: filledCount,
                          isCaptain: pIdx === captainIdx,
                        }}
                        tierLift={resolveRosterSlotTierLift(pIdx, filledCount, rosterLayout.slotHeight)}
                        slotScale={resolveRosterSlotScale(
                          pIdx,
                          filledCount,
                          captainIdx,
                          rosterLayout.captainScale
                        )}
                        skipMotion={false}
                      />
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Footer — hashtag + sponsors */}
              <motion.div
                variants={styleVars?.footer ?? rosterFooterVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full flex flex-col items-center pb-10 relative z-20 shrink-0 gap-4"
              >
                {showHashtag && (
                  <p
                    className="uppercase tracking-[0.35em]"
                    style={{
                      fontSize: `${rosterTypography.hashtag?.size ?? 18}px`,
                      fontWeight: rosterTypography.hashtag?.weight ?? 700,
                      fontStyle: rosterTypography.hashtag?.italic ? 'italic' : 'normal',
                      color: resolvedGlobalColors.accentNeon,
                      textShadow: `0 0 16px ${hexToRgba(resolvedGlobalColors.accentNeon, 0.4)}`,
                    }}
                  >
                    {resolveTeamHashtagText(team)}
                  </p>
                )}

                {showSponsors && sponsors.length > 0 && (
                  <div className="flex items-center justify-center gap-10 opacity-80">
                    {sponsors.map((sp, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5">
                        {sp.logo ? (
                          <img
                            src={sp.logo}
                            alt={sp.label}
                            className="h-8 w-auto object-contain grayscale opacity-70"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div
                            className="w-20 h-8 border border-dashed flex items-center justify-center"
                            style={{ borderColor: hexToRgba(resolvedGlobalColors.frameGlow, 0.3) }}
                          >
                            <span
                              className="text-[8px] font-black uppercase tracking-widest opacity-40"
                              style={{ color: resolvedGlobalColors.cardHeaderText }}
                            >
                              LOGO
                            </span>
                          </div>
                        )}
                        <span
                          className="text-[9px] font-bold uppercase tracking-[0.2em]"
                          style={{ color: resolvedGlobalColors.secondaryTextColor }}
                        >
                          {sp.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          ) : (
            <div className="flex-1 flex items-center justify-center opacity-40">
              <span className="uppercase text-2xl font-black tracking-widest text-white">{t('otr.noTeamData')}</span>
            </div>
          )}
          </AnimatePresence>
          </div>
          </div>
        </div>

        {/* Eliminated overlay — menutupi seluruh canvas saat tim tereliminasi */}
        {isEliminated && (
          <div
            className="absolute inset-0 z-[60] flex flex-col items-center justify-center pointer-events-none"
            style={{
              background: `linear-gradient(160deg, ${hexToRgba(elimBg, 0.93)} 0%, rgba(0,0,0,0.97) 100%)`,
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 60% 45% at 50% 55%, ${hexToRgba(elimBg, 0.22)} 0%, transparent 75%)`,
              }}
            />
            <div
              className="relative flex flex-col items-center gap-5"
              style={{ fontFamily: rosterFontFamily }}
            >
              {activeTeamLb?.placementRank != null && (
                <div
                  className="px-6 py-1.5 uppercase tracking-[0.35em] font-black"
                  style={{
                    fontSize: '22px',
                    color: resolvedGlobalColors.accentNeon,
                    border: `1.5px solid ${hexToRgba(resolvedGlobalColors.accentNeon, 0.5)}`,
                    clipPath: cutCornerClipPath(6),
                    boxShadow: `0 0 20px ${hexToRgba(resolvedGlobalColors.accentNeon, 0.3)}`,
                  }}
                >
                  #{activeTeamLb.placementRank}
                </div>
              )}

              <p
                className="uppercase font-black leading-none tracking-[0.08em]"
                style={{
                  fontSize: '108px',
                  color: elimText,
                  textShadow: `6px 6px 0 ${hexToRgba(elimBg, 0.75)}, 0 0 60px ${hexToRgba(elimBg, 0.55)}`,
                }}
              >
                ELIMINATED
              </p>

              <div className="flex items-center gap-5 mt-2">
                <span
                  className="h-px w-28"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${hexToRgba(elimText, 0.6)})`,
                  }}
                />
                <span
                  className="uppercase font-bold tracking-[0.25em]"
                  style={{ fontSize: '20px', color: hexToRgba(elimText, 0.75) }}
                >
                  {team?.name}
                </span>
                <span
                  className="h-px w-28"
                  style={{
                    background: `linear-gradient(90deg, ${hexToRgba(elimText, 0.6)}, transparent)`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  }, [
    feedPlayKey,
    playKey,
    style,
    activeAnimConfig,
    cardLayout,
    resolvedCardLayout,
    rosterFontFamily,
    resolvedGlobalColors,
    typography,
    matchInfo,
    activeTeam,
    masterFrameContent,
    masterFrameSrc,
    safePage,
    totalPages,
    showHudEffects,
    showSponsors,
    showHashtag,
    sponsors,
    prefersReducedMotion,
    teams,
    t,
  ]);

  const livePreviewContent = useMemo(
    () => renderLivePreview(undefined, effectiveAnimationConfig),
    [renderLivePreview, effectiveAnimationConfig]
  );
  const programFeedContent = useMemo(
    () => renderLivePreview(programPlayKey, effectiveAnimationConfig),
    [renderLivePreview, programPlayKey, effectiveAnimationConfig]
  );

  useEffect(() => {
    if (onPreviewContentChange && !visualOnly) {
      onPreviewContentChange(livePreviewContent);
    }
  }, [livePreviewContent, onPreviewContentChange, visualOnly]);

  if (visualOnly) return renderLivePreview(feedPlayKey, effectiveAnimationConfig);

  return (
    <div className="flex flex-col h-full bg-black animate-in fade-in duration-300 font-sans select-none overflow-hidden rounded-tl-[10px] border-l border-t border-white/5">
      {!isGlobalStudio && (
        <header className="h-14 bg-black border-b border-white/10 flex items-center px-6 justify-between shrink-0 relative z-[100]">
          <div className="flex items-center gap-8">
            <div className="flex flex-col cursor-pointer" onClick={onBack}>
              <div className="flex items-center gap-1">
                <span className="text-white font-[950] italic text-[12px] tracking-tight uppercase leading-none">{t('otr.setup')}</span>
                <span className="text-[#ccff00] font-[950] italic text-[12px] tracking-tight uppercase leading-none">{t('otr.asset')}</span>
              </div>
              <span className="text-[7px] font-black text-zinc-700 tracking-[0.4em] uppercase mt-0.5 leading-none">{t('otr.masterConfiguration')}</span>
            </div>
            <div className="h-6 w-[1px] bg-white/10 mx-1" />
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ccff00] animate-pulse shadow-[0_0_8px_#ccff00]" />
              <span className="text-white font-black text-[10px] tracking-[0.2em] uppercase italic">{theme.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {userRole === 'admin' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowList((visible) => !visible)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black tracking-widest uppercase transition-all active:scale-95 ${
                    showList
                      ? 'border-[#ccff00]/50 bg-[#ccff00]/10 text-[#ccff00]'
                      : 'border-white/10 bg-white/5 text-white hover:border-[#ccff00]/50 hover:bg-[#ccff00]/10 hover:text-[#ccff00]'
                  }`}
                >
                  <LayoutTemplate size={12} />
                  {t('otr.assetPanel')}
                </button>
                <button
                  onClick={() => setShowMonitors((visible) => !visible)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black tracking-widest uppercase transition-all active:scale-95 ${
                    showMonitors
                      ? 'border-[#ccff00]/50 bg-[#ccff00]/10 text-[#ccff00]'
                      : 'border-white/10 bg-white/5 text-white hover:border-[#ccff00]/50 hover:bg-[#ccff00]/10 hover:text-[#ccff00]'
                  }`}
                >
                  <Monitor size={12} />
                  {t('otr.broadcastPanel')}
                </button>
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all shadow-lg ${
                isSaving
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-[#ccff00] text-black hover:bg-white hover:scale-105 active:scale-95'
              }`}
            >
              {isSaving ? <RefreshCw size={12} className="animate-spin" /> : <Settings2 size={12} />}
              {isSaving ? t('otr.streamsSyncing') : t('otr.saveAllChanges')}
            </button>
            <div className="bg-zinc-900/40 border border-white/5 px-2.5 py-1.5 rounded flex items-center gap-2">
              <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">{t('otr.editing')}</span>
              <span className="text-[9px] font-black text-white uppercase tracking-widest">{asset.name}</span>
            </div>
          </div>
        </header>
      )}

      <div className="flex-1 flex overflow-hidden">
        {!isGlobalStudio && showList && (
          <>
            <aside
              style={{ width: `${sidebarWidth}px` }}
              className="border-r border-white/5 bg-black flex flex-col shrink-0 p-6 transition-[width] duration-75 ease-out overflow-hidden"
            >
              <h3 className="text-[7px] font-black text-zinc-700 tracking-[0.3em] uppercase mb-6 whitespace-nowrap italic">
                {t('otr.availableTemplates')}
              </h3>
              <div className="space-y-2 whitespace-nowrap overflow-y-auto custom-scrollbar pr-2">
                {availableAssets.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectAsset && onSelectAsset(item)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer shadow-[0_0_15px_rgba(204,255,0,0.03)] group flex items-center justify-between ${
                      item.id === asset.id
                        ? 'border-[#ccff00]/40 bg-[#ccff00]/5'
                        : 'border-white/5 bg-zinc-900/20 opacity-60 hover:opacity-100 hover:border-white/20'
                    }`}
                  >
                    <h4
                      className={`text-[9px] font-black uppercase tracking-widest ${
                        item.id === asset.id ? 'text-[#ccff00]' : 'text-white'
                      }`}
                    >
                      {item.name}
                    </h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProgramAssetId(item.id);
                      }}
                      className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                        getAssetStatusProp
                          ? getAssetStatusProp(item.id) === 2
                            ? 'bg-red-500 text-white'
                            : getAssetStatusProp(item.id) === 1
                              ? 'bg-amber-500 text-black'
                              : 'bg-white/5 hover:bg-[#ccff00] hover:text-black text-white'
                          : programAssetId === item.id
                            ? 'bg-[#ccff00] text-black'
                            : 'bg-white/5 hover:bg-[#ccff00] hover:text-black text-white'
                      }`}
                    >
                      {getAssetStatusProp && getAssetStatusProp(item.id) !== 0 ? (
                        <Square size={10} fill="currentColor" />
                      ) : (
                        <Play size={10} fill="currentColor" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </aside>
            <div
              onMouseDown={startResizing}
              className={`w-1 hover:w-1.5 bg-transparent hover:bg-[#ccff00]/30 cursor-col-resize transition-all z-50 relative ${
                isResizing ? 'bg-[#ccff00]/50 w-1.5' : ''
              }`}
            >
              <div className="absolute inset-y-0 -left-2 -right-2 cursor-col-resize" />
            </div>
          </>
        )}

        <main className="flex-1 bg-black flex flex-col overflow-hidden relative">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative z-10">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex bg-zinc-950 p-0.5 rounded-xl border border-white/5 border-l-[3px] border-l-[#ccff00]/40 shadow-2xl mb-8">
                {(['DATA', 'VISUAL', 'ANIMATION'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setConfigTab(tab)}
                    className={`flex-1 py-1.5 text-[8px] font-black tracking-widest uppercase rounded-lg transition-all ${
                      configTab === tab ? 'bg-[#ccff00] text-black' : 'text-zinc-600 hover:text-white'
                    }`}
                  >
                    {tab === 'DATA' ? t('otr.dataInput') : tab === 'VISUAL' ? t('otr.visualInput') : t('otr.animationInput')}
                  </button>
                ))}
              </div>

              {configTab === 'DATA' && customDataPanel}

              {configTab === 'DATA' && !customDataPanel && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-zinc-900 border border-white/5 rounded-[20px] p-6 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Type size={14} className="text-[#ccff00]" />
                        <h3 className="text-[10px] font-black text-zinc-400 tracking-[0.2em] uppercase">{t('otr.mainTitle')}</h3>
                      </div>
                      <input
                        type="text"
                        value={matchInfo.title}
                        onChange={(e) => setMatchInfo({ ...matchInfo, title: e.target.value })}
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-xs font-bold text-white uppercase outline-none focus:border-[#ccff00]"
                      />
                    </div>
                    <div className="bg-zinc-900 border border-white/5 rounded-[20px] p-6 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Type size={14} className="text-zinc-500" />
                        <h3 className="text-[10px] font-black text-zinc-400 tracking-[0.2em] uppercase">{t('otr.subtitle')}</h3>
                      </div>
                      <input
                        type="text"
                        value={matchInfo.subtitle}
                        onChange={(e) => setMatchInfo({ ...matchInfo, subtitle: e.target.value })}
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-xs font-bold text-white uppercase outline-none focus:border-[#ccff00]"
                      />
                    </div>
                  </div>

                  <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.25em]">
                          Halaman {safePage} / {totalPages} · {rosterTeams.length} tim
                        </p>
                        <p className="text-[7px] text-zinc-600 normal-case mt-1">
                          Layout 16:9 — slot kiri→kanan:{' '}
                          <strong className="text-[#74a57f]">P1 · P2 · P3 · P4 · P5</strong>. Animasi
                          default (IN/OUT &amp; ganti halaman): 5P — P1&amp;P5 → (2s) → P2&amp;P4 → (2s) →
                          P3; 4P — P1&amp;P4 → P2&amp;P3. Data dari{' '}
                          <strong className="text-[#ccff00]">Project Event Database</strong>. Captain
                          default slot P3. Maks{' '}
                          <strong className="text-[#74a57f]">{MAX_PLAYERS_PER_TEAM} pemain</strong> per tim.
                        </p>
                        {effectiveProjectPlayers.length > 0 ? (
                          <p className="text-[7px] text-[#74a57f]/90 normal-case mt-1">
                            Terhubung: {projectDbTeamCount} tim · {effectiveProjectPlayers.length} pemain
                            dari Project DB
                          </p>
                        ) : (
                          <p className="text-[7px] text-amber-500/90 normal-case mt-1 border border-amber-500/20 bg-amber-500/5 rounded-lg px-2 py-1.5">
                            Project DB kosong. Isi roster pemain di halaman Project Event terlebih dahulu.
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={syncFromProjectDb}
                          disabled={!effectiveProjectPlayers.length}
                          className="flex items-center gap-2 px-4 py-2 bg-[#ccff00]/10 border border-[#ccff00]/30 text-[#ccff00] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#ccff00] hover:text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Database size={12} />
                          {t('otr.refreshProjectDb')}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setPagination((p) => ({
                              ...p,
                              currentPage: Math.max(1, p.currentPage - 1),
                            }))
                          }
                          disabled={safePage <= 1}
                          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white disabled:opacity-30"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">
                          Page {safePage}
                        </span>
                        <button
                          onClick={() =>
                            setPagination((p) => ({
                              ...p,
                              currentPage: Math.min(totalPages, p.currentPage + 1),
                            }))
                          }
                          disabled={safePage >= totalPages}
                          className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white disabled:opacity-30"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-zinc-600 uppercase">
                          1 tim / halaman · {totalPages} halaman
                        </span>
                      </div>
                      {/* Opsi urutan tim: Abjad / sesuai input Excel-Project */}
                      <div className="ml-auto flex items-center gap-1.5 mr-1">
                        <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest hidden sm:inline">
                          {t('otr.sortLabel')}
                        </span>
                        <button
                          type="button"
                          onClick={sortRosterAlphabetical}
                          title={t('otr.sortAlpha')}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                            sortMode === 'alpha'
                              ? 'bg-[#74a57f] border-[#74a57f] text-black shadow-[0_0_15px_rgba(116,165,127,0.45)]'
                              : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-[#74a57f]/20 hover:border-[#74a57f]/40 hover:text-white'
                          }`}
                        >
                          <ArrowDownAZ size={12} /> {t('otr.sortAlpha')}
                        </button>
                        <button
                          type="button"
                          onClick={sortRosterByInputOrder}
                          title={t('otr.sortInput')}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                            sortMode === 'input'
                              ? 'bg-[#74a57f] border-[#74a57f] text-black shadow-[0_0_15px_rgba(116,165,127,0.45)]'
                              : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-[#74a57f]/20 hover:border-[#74a57f]/40 hover:text-white'
                          }`}
                        >
                          <ListOrdered size={12} /> {t('otr.sortInput')}
                        </button>
                      </div>
                      <button
                        onClick={addTeam}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-[#ccff00] uppercase tracking-widest hover:bg-[#ccff00]/10"
                      >
                        <Plus size={12} /> {t('otr.addTeam')}
                      </button>
                    </div>

                    {activeTeam && activeTeamIndex >= 0 && (
                      <div className="pt-3 border-t border-white/5 space-y-1.5">
                        <label className="text-[7px] font-black text-zinc-600 uppercase tracking-widest block">
                          Hashtag footer · {activeTeam.name}
                        </label>
                        <RosterHashtagInput
                          value={rosterTeams[activeTeamIndex]?.hashtag}
                          placeholder={activeTeam.name.replace(/\s+/g, '')}
                          onChange={(tag) => updateTeam(activeTeamIndex, { hashtag: tag })}
                        />
                        <p className="text-[7px] text-zinc-600 normal-case">
                          Ketik tanpa # — simbol otomatis ditambahkan. Kosongkan untuk auto{' '}
                          <span className="text-[#74a57f]">{resolveTeamHashtagText(activeTeam)}</span>
                          . Matikan tampilan di tab Visual → HASHTAG.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[8px] font-black text-zinc-600 tracking-[0.4em] uppercase italic">
                        {t('otr.rosterDataNodes')}
                      </h3>
                      <span className="text-[7px] font-black text-[#74a57f] uppercase tracking-widest px-2 py-1 bg-[#74a57f]/10 border border-[#74a57f]/25 rounded-lg">
                        MAX {MAX_PLAYERS_PER_TEAM} / TEAM
                      </span>
                    </div>
                    {rosterTeams.map((team, tIdx) => {
                      const filledPlayers = clampPlayerEntries(team.players);
                      const playerCount = filledPlayers.length;
                      const atMax = playerCount >= MAX_PLAYERS_PER_TEAM;
                      const isEditing = editingTeamIndex === tIdx;

                      return (
                      <div
                        key={team.id}
                        className={`relative overflow-hidden border rounded-[20px] transition-all ${
                          isEditing
                            ? 'border-[#ccff00]/50 bg-gradient-to-br from-zinc-900 to-black shadow-[0_0_30px_rgba(204,255,0,0.08)]'
                            : 'border-white/5 bg-zinc-900/40 hover:border-[#74a57f]/30'
                        }`}
                      >
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#74a57f] to-transparent opacity-60" />

                        <div className="p-4">
                          <div className="flex items-center gap-4">
                            <div
                              className="w-12 h-12 shrink-0 flex items-center justify-center bg-[#74a57f]/20 border border-[#74a57f]/30 overflow-hidden"
                              style={{ clipPath: cutCornerClipPath(6) }}
                            >
                              {team.teamLogo ? (
                                <img src={team.teamLogo} alt="" className="w-8 h-8 object-contain" />
                              ) : (
                                <Shield size={18} className="text-[#74a57f]" />
                              )}
                            </div>

                            <button
                              onClick={() => setEditingTeamIndex(isEditing ? null : tIdx)}
                              className="flex-1 flex items-center gap-2 text-left min-w-0"
                            >
                              {isEditing ? (
                                <ChevronDown size={14} className="text-[#ccff00] shrink-0" />
                              ) : (
                                <ChevronRight size={14} className="text-zinc-500 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <h4 className="text-xs font-black text-white tracking-widest uppercase truncate">
                                  {team.name}
                                </h4>
                                <p className="text-[7px] text-zinc-600 font-bold uppercase mt-0.5">
                                  Slot {team.leaderboardRank ?? '—'} · Overall Ranking
                                </p>
                              </div>
                            </button>

                            <div
                              className={`shrink-0 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border ${
                                atMax
                                  ? 'bg-[#ccff00]/15 text-[#ccff00] border-[#ccff00]/30'
                                  : playerCount > 0
                                    ? 'bg-[#74a57f]/15 text-[#a3cfaa] border-[#74a57f]/30'
                                    : 'bg-white/5 text-zinc-600 border-white/10'
                              }`}
                            >
                              {playerCount}/{MAX_PLAYERS_PER_TEAM}
                            </div>

                            <button
                              onClick={() => removeTeam(tIdx)}
                              className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white shrink-0"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {isEditing && (
                            <div className="mt-4 pt-4 border-t border-white/5 space-y-4 animate-in fade-in duration-200">
                              {/* Pindah posisi tim (naik / turun) */}
                              <div className="flex items-center gap-2">
                                <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest mr-1">
                                  {t('otr.reorderLabel')}
                                </span>
                                <button
                                  type="button"
                                  disabled={tIdx === 0}
                                  onClick={() => moveTeam(tIdx, -1)}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[8px] font-black text-zinc-300 uppercase tracking-widest transition-all hover:bg-[#74a57f]/20 hover:border-[#74a57f]/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:border-white/10"
                                >
                                  <ArrowUp size={12} /> {t('otr.moveUp')}
                                </button>
                                <button
                                  type="button"
                                  disabled={tIdx === rosterTeams.length - 1}
                                  onClick={() => moveTeam(tIdx, 1)}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[8px] font-black text-zinc-300 uppercase tracking-widest transition-all hover:bg-[#74a57f]/20 hover:border-[#74a57f]/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5 disabled:hover:border-white/10"
                                >
                                  <ArrowDown size={12} /> {t('otr.moveDown')}
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[7px] font-black text-zinc-700 uppercase mb-1 block">
                                    {t('otr.teamName')}
                                  </label>
                                  <input
                                    type="text"
                                    value={team.name}
                                    onChange={(e) => updateTeam(tIdx, { name: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-[10px] font-bold text-white uppercase outline-none focus:border-[#ccff00]"
                                  />
                                </div>
                                <div>
                                  <label className="text-[7px] font-black text-zinc-700 uppercase mb-1 block">
                                    {t('otr.logoUrl')}
                                  </label>
                                  <input
                                    type="text"
                                    value={team.teamLogo ?? ''}
                                    onChange={(e) => updateTeam(tIdx, { teamLogo: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-[10px] font-bold text-zinc-400 outline-none focus:border-[#ccff00]"
                                  />
                                </div>
                                <div>
                                  <label className="text-[7px] font-black text-zinc-700 uppercase mb-1 block">
                                    {t('otr.hashtag')}
                                  </label>
                                  <RosterHashtagInput
                                    value={team.hashtag}
                                    placeholder={team.name.replace(/\s+/g, '')}
                                    onChange={(tag) => updateTeam(tIdx, { hashtag: tag })}
                                  />
                                </div>
                                <div>
                                  <label className="text-[7px] font-black text-zinc-700 uppercase mb-1 block">
                                    {t('otr.captainSlot')}
                                  </label>
                                  <ScrollableInput
                                    value={(team.captainIndex ?? 2) + 1}
                                    onChange={(val) =>
                                      updateTeam(tIdx, {
                                        captainIndex: Math.max(0, Math.min(MAX_PLAYERS_PER_TEAM - 1, val - 1)),
                                      })
                                    }
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-[10px] font-bold text-white text-center outline-none focus:border-[#ccff00]"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-[7px] font-black text-zinc-600 uppercase tracking-widest mb-2 block">
                                  {t('otr.playerSlots').replace('{max}', String(MAX_PLAYERS_PER_TEAM))}
                                </label>
                                <div className="space-y-2">
                                  {Array.from({ length: MAX_PLAYERS_PER_TEAM }, (_, slotIdx) => {
                                    const player = filledPlayers[slotIdx];
                                    const isEmpty = slotIdx >= filledPlayers.length;

                                    return (
                                      <div
                                        key={slotIdx}
                                        className={`flex items-center gap-2 p-1.5 rounded-xl border ${
                                          isEmpty
                                            ? 'border-dashed border-white/10 bg-black/20'
                                            : 'border-white/10 bg-black/40'
                                        }`}
                                      >
                                        {!isEmpty ? (
                                          <div className="relative w-8 h-8 shrink-0 overflow-hidden rounded-lg border border-[#74a57f]/30">
                                            {team.teamLogo && (
                                              <img
                                                src={team.teamLogo}
                                                alt=""
                                                className="absolute inset-0 w-full h-full object-contain p-0.5 opacity-20"
                                              />
                                            )}
                                            <img
                                              src={resolvePlayerPhoto(player)}
                                              alt=""
                                              className="relative z-10 w-full h-full object-cover object-top"
                                              onError={(e) => {
                                                e.currentTarget.src = DEFAULT_ROSTER_PLAYER_IMG;
                                              }}
                                            />
                                          </div>
                                        ) : (
                                          <span className="w-8 h-8 shrink-0 flex items-center justify-center text-[9px] font-black bg-white/5 text-zinc-600 rounded-lg border border-dashed border-white/10">
                                            {slotIdx + 1}
                                          </span>
                                        )}
                                        {isEmpty ? (
                                          <span className="flex-1 text-[9px] font-bold text-zinc-700 uppercase tracking-widest italic">
                                            {t('otr.emptySlot')}
                                          </span>
                                        ) : (
                                          <div className="flex-1 grid grid-cols-3 gap-1 min-w-0">
                                            <input
                                              type="text"
                                              value={player.name}
                                              onChange={(e) =>
                                                updatePlayer(tIdx, slotIdx, { name: e.target.value })
                                              }
                                              placeholder="NAME"
                                              className="bg-transparent border border-white/10 px-2 py-1.5 text-[9px] font-bold text-white uppercase outline-none focus:border-[#ccff00]/40 rounded-lg"
                                            />
                                            <input
                                              type="text"
                                              value={player.nickname ?? ''}
                                              onChange={(e) =>
                                                updatePlayer(tIdx, slotIdx, { nickname: e.target.value })
                                              }
                                              placeholder="NICKNAME"
                                              className="bg-transparent border border-white/10 px-2 py-1.5 text-[9px] font-bold text-[#ccff00] uppercase outline-none focus:border-[#ccff00]/40 rounded-lg"
                                            />
                                            <input
                                              type="text"
                                              value={player.role ?? ''}
                                              onChange={(e) =>
                                                updatePlayer(tIdx, slotIdx, { role: e.target.value })
                                              }
                                              placeholder="ROLE"
                                              className="bg-transparent border border-white/10 px-2 py-1.5 text-[9px] font-bold text-[#74a57f] uppercase outline-none focus:border-[#ccff00]/40 rounded-lg"
                                            />
                                          </div>
                                        )}
                                        {!isEmpty && (
                                          <button
                                            onClick={() => removePlayer(tIdx, slotIdx)}
                                            className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-zinc-500 hover:text-red-400 shrink-0"
                                          >
                                            <X size={12} />
                                          </button>
                                        )}
                                        {isEmpty && !atMax && slotIdx === filledPlayers.length && (
                                          <button
                                            onClick={() => addPlayer(tIdx)}
                                            className="px-3 py-1.5 rounded-lg bg-[#ccff00]/10 border border-[#ccff00]/25 text-[8px] font-black text-[#ccff00] uppercase tracking-widest hover:bg-[#ccff00] hover:text-black shrink-0"
                                          >
                                            {t('otr.fill')}
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                {atMax && (
                                  <p className="text-[7px] text-amber-500/80 mt-2 normal-case">
                                    Batas maksimal {MAX_PLAYERS_PER_TEAM} pemain tercapai untuk tim ini.
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>
              )}

              {configTab === 'VISUAL' && customVisualPanel}

              {configTab === 'VISUAL' && !customVisualPanel && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="p-6 bg-zinc-900 border border-white/5 rounded-[20px]">
                    <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                      <Type size={12} className="text-[#ccff00]" />
                      {t('otr.fontTypeTeamRoster')}
                    </h3>
                    <OverlayFontFamilySelect
                      value={(typography as { fontFamilyId?: string }).fontFamilyId}
                      onChange={(fontFamilyId) => setTypography((prev) => ({ ...prev, fontFamilyId }))}
                    />
                  </div>

                  <div className="p-4 bg-zinc-950 border border-white/5 rounded-xl space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-[9px] font-black text-white uppercase tracking-widest">
                          {t('otr.pmgoColors')}
                        </h4>
                        <p className="text-[7px] text-zinc-500 normal-case mt-1 leading-relaxed">
                          Warna mengikuti <strong className="text-zinc-400">Overall Ranking</strong>: headerBg, rowEvenBg,
                          statusAlive, winnerBg, deltaPoints, dan eliminatedBg — sama seperti asset lain di template PMGO.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setVisualConfig({
                            ...visualConfig,
                            usePmgoTeamColors: !usePmgoTeamColors,
                          })
                        }
                        className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all shrink-0 ${
                          usePmgoTeamColors
                            ? 'bg-[#74a57f]/20 text-[#a3cfaa] border border-[#74a57f]/40'
                            : 'bg-white/5 text-zinc-600 border border-white/10'
                        }`}
                      >
                        {usePmgoTeamColors ? t('otr.pmgoSyncOn') : t('otr.manualColors')}
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      {(
                        [
                          ['titleColor', 'TITLE', 'headerBg'],
                          ['frameGlow', 'FRAME GLOW', 'headerBg'],
                          ['frameBgMid', 'FRAME MID', 'rowEvenBg'],
                          ['frameBgBottom', 'FRAME DARK', 'eliminatedBg'],
                          ['accentNeon', 'NEON ACCENT', 'deltaPoints'],
                          ['secondaryTextColor', 'NICKNAME', 'statusAlive'],
                          ['captainBadgeColor', 'CAPTAIN BG', 'winnerBg'],
                          ['cardHeaderText', 'TEXT LIGHT', 'headerText'],
                        ] as const
                      ).map(([key, label, lbKey]) => {
                        const displayColor = usePmgoTeamColors
                          ? (resolvedGlobalColors[key as keyof TeamRosterVisualPalette] ??
                            pickPmgoRosterPalette(leaderboardVisual)[key as keyof TeamRosterVisualPalette])
                          : (visualConfig[key] as string);
                        return (
                          <div key={key} className={usePmgoTeamColors ? 'opacity-90' : ''}>
                            <label className="text-[7px] font-bold text-zinc-500 uppercase block mb-1">
                              {label}
                              {usePmgoTeamColors && (
                                <span className="text-[6px] text-[#74a57f] block normal-case">{lbKey}</span>
                              )}
                            </label>
                            <input
                              type="color"
                              value={displayColor?.startsWith('rgba') ? '#74a57f' : displayColor}
                              disabled={usePmgoTeamColors || displayColor?.startsWith('rgba')}
                              onChange={(e) =>
                                setVisualConfig({ ...visualConfig, [key]: e.target.value })
                              }
                              className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() =>
                          setVisualConfig({ ...visualConfig, showHudEffects: !showHudEffects })
                        }
                        className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          showHudEffects
                            ? 'bg-[#ccff00]/20 text-[#ccff00] border border-[#ccff00]/40'
                            : 'bg-white/5 text-zinc-600 border border-white/10'
                        }`}
                      >
                        {t('otr.hudFx')} {showHudEffects ? t('otr.on') : t('otr.off')}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setVisualConfig({ ...visualConfig, showSponsors: !showSponsors })
                        }
                        className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          showSponsors
                            ? 'bg-[#74a57f]/20 text-[#a3cfaa] border border-[#74a57f]/40'
                            : 'bg-white/5 text-zinc-600 border border-white/10'
                        }`}
                      >
                        {t('otr.sponsors')} {showSponsors ? t('otr.on') : t('otr.off')}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setVisualConfig({ ...visualConfig, showHashtag: !showHashtag })
                        }
                        className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          showHashtag
                            ? 'bg-[#ccff00]/20 text-[#ccff00] border border-[#ccff00]/40'
                            : 'bg-white/5 text-zinc-600 border border-white/10'
                        }`}
                      >
                        {t('otr.hashtag')} {showHashtag ? t('otr.on') : t('otr.off')}
                      </button>
                    </div>
                  </div>

                  {showSponsors && (
                    <div className="p-6 bg-zinc-900 border border-white/5 rounded-[20px] space-y-3">
                      <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                        {t('otr.sponsorMediaPartner')}
                      </h3>
                      {sponsors.map((sp, i) => (
                        <div key={i} className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={sp.label}
                            onChange={(e) => {
                              const next = [...sponsors];
                              next[i] = { ...next[i], label: e.target.value };
                              setVisualConfig({ ...visualConfig, sponsors: next });
                            }}
                            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold text-white uppercase outline-none focus:border-[#ccff00]"
                          />
                          <input
                            type="text"
                            value={sp.logo ?? ''}
                            placeholder="Logo URL (opsional)"
                            onChange={(e) => {
                              const next = [...sponsors];
                              next[i] = { ...next[i], logo: e.target.value };
                              setVisualConfig({ ...visualConfig, sponsors: next });
                            }}
                            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold text-zinc-400 outline-none focus:border-[#ccff00]"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-6 bg-zinc-900 border border-white/5 rounded-[20px]">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Move size={12} className="text-blue-500" />
                        {t('otr.rosterLayout')}
                      </h3>
                      <button
                        type="button"
                        onClick={resetRosterLayoutToStandard}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[8px] font-black text-[#ccff00] uppercase tracking-widest hover:bg-[#ccff00]/10 hover:border-[#ccff00]/30"
                      >
                        {t('otr.resetStandard')}
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <p className="col-span-4 text-[7px] text-zinc-600 normal-case -mt-1 mb-1">
                        Nilai <strong className="text-[#74a57f]">0</strong> = standar render di setiap kolom.
                      </p>
                      <div>
                        <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">SLOT W</label>
                        <ScrollableInput
                          value={cardLayout.slotWidth ?? 0}
                          onChange={(val) => setCardLayout({ ...cardLayout, slotWidth: val })}
                          className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                        />
                        <p className="text-[7px] text-zinc-600 normal-case mt-1">
                          {layoutBaseHint(ROSTER_LAYOUT_BASE.slotWidth)}
                        </p>
                      </div>
                      <div>
                        <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">SLOT H</label>
                        <ScrollableInput
                          value={cardLayout.slotHeight ?? 0}
                          onChange={(val) => setCardLayout({ ...cardLayout, slotHeight: val })}
                          className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                        />
                        <p className="text-[7px] text-zinc-600 normal-case mt-1">
                          {layoutBaseHint(ROSTER_LAYOUT_BASE.slotHeight)}
                        </p>
                      </div>
                      <div>
                        <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">GAP</label>
                        <ScrollableInput
                          value={cardLayout.slotGap ?? 0}
                          onChange={(val) => setCardLayout({ ...cardLayout, slotGap: val })}
                          className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                        />
                        <p className="text-[7px] text-zinc-600 normal-case mt-1">
                          {layoutBaseHint(ROSTER_LAYOUT_BASE.slotGap)}
                        </p>
                      </div>
                      <div>
                        <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">CAPTAIN %</label>
                        <ScrollableInput
                          value={cardLayout.captainScale ?? 0}
                          onChange={(val) => {
                            const resolved = ROSTER_LAYOUT_BASE.captainScale + val;
                            const clamped = Math.max(100, Math.min(140, resolved));
                            setCardLayout({
                              ...cardLayout,
                              captainScale: clamped - ROSTER_LAYOUT_BASE.captainScale,
                            });
                          }}
                          className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                        />
                        <p className="text-[7px] text-zinc-600 normal-case mt-1">
                          {layoutBaseHint(ROSTER_LAYOUT_BASE.captainScale, '%')}
                        </p>
                      </div>
                      <div>
                        <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                          {t('otr.logoTopTeam')}
                        </label>
                        <ScrollableInput
                          value={cardLayout.logoSize ?? 0}
                          onChange={(val) => setCardLayout({ ...cardLayout, logoSize: val })}
                          className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                        />
                        <p className="text-[7px] text-zinc-600 normal-case mt-1">
                          {layoutBaseHint(ROSTER_LAYOUT_BASE.logoSize)} · di atas nama tim, bukan background kartu
                        </p>
                      </div>
                      <div>
                        <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">FRAME CUT</label>
                        <ScrollableInput
                          value={cardLayout.frameCornerCut ?? 0}
                          onChange={(val) => {
                            const resolved = ROSTER_LAYOUT_BASE.frameCornerCut + val;
                            const clamped = Math.max(4, Math.min(40, resolved));
                            setCardLayout({
                              ...cardLayout,
                              frameCornerCut: clamped - ROSTER_LAYOUT_BASE.frameCornerCut,
                            });
                          }}
                          className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                        />
                        <p className="text-[7px] text-zinc-600 normal-case mt-1">
                          {layoutBaseHint(ROSTER_LAYOUT_BASE.frameCornerCut)}
                        </p>
                      </div>
                      <div>
                        <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">PHOTO SCALE</label>
                        <ScrollableInput
                          value={cardLayout.playerPhotoScale ?? 0}
                          onChange={(val) => {
                            const resolved = ROSTER_LAYOUT_BASE.playerPhotoScale + val;
                            const clamped = Math.max(80, Math.min(180, resolved));
                            setCardLayout({
                              ...cardLayout,
                              playerPhotoScale: clamped - ROSTER_LAYOUT_BASE.playerPhotoScale,
                            });
                          }}
                          className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                        />
                        <p className="text-[7px] text-zinc-600 normal-case mt-1">
                          {layoutBaseHint(ROSTER_LAYOUT_BASE.playerPhotoScale, '%')}
                        </p>
                      </div>
                      <div>
                        <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">PHOTO POS Y</label>
                        <ScrollableInput
                          value={cardLayout.playerPhotoOffsetY ?? 0}
                          onChange={(val) =>
                            setCardLayout({
                              ...cardLayout,
                              playerPhotoOffsetY: val,
                            })
                          }
                          className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                        />
                        <p className="text-[7px] text-zinc-600 normal-case mt-1">
                          {layoutBaseHint(ROSTER_PHOTO_POS_Y_BASE)}
                        </p>
                      </div>
                      <div>
                        <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">OFFSET X/Y</label>
                        <div className="flex gap-1">
                          <ScrollableInput
                            value={cardLayout.contentOffsetX ?? 0}
                            onChange={(val) => setCardLayout({ ...cardLayout, contentOffsetX: val })}
                            className="w-full bg-black border border-white/10 rounded-lg px-1 py-2 text-[10px] text-white text-center"
                          />
                          <ScrollableInput
                            value={cardLayout.contentOffsetY ?? 0}
                            onChange={(val) => setCardLayout({ ...cardLayout, contentOffsetY: val })}
                            className="w-full bg-black border border-white/10 rounded-lg px-1 py-2 text-[10px] text-white text-center"
                          />
                        </div>
                        <p className="text-[7px] text-zinc-600 normal-case mt-1">
                          X/Y {layoutBaseHint(0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-zinc-900 border border-white/5 rounded-[20px] space-y-4">
                    <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Shield size={12} className="text-[#74a57f]" />
                      {t('otr.cardBackground')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ['default', 'DEFAULT'],
                          ['logo', 'TEAM LOGO'],
                          ['custom', 'CUSTOM URL'],
                        ] as const
                      ).map(([mode, label]) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() =>
                            setCardLayout({
                              ...cardLayout,
                              playerCardBgMode: mode,
                            })
                          }
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                            (cardLayout.playerCardBgMode ?? 'default') === mode
                              ? 'bg-[#ccff00] text-black border-[#ccff00]'
                              : 'bg-black/40 text-zinc-500 border-white/10 hover:text-white hover:border-white/20'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {(cardLayout.playerCardBgMode ?? 'default') === 'logo' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                            {t('otr.logoBgSize')}
                          </label>
                          <ScrollableInput
                            value={cardLayout.playerCardBgLogoScale ?? 0}
                            onChange={(val) => {
                              const resolved =
                                ROSTER_LAYOUT_BASE.playerCardBgLogoScale + val;
                              const clamped = Math.max(25, Math.min(200, resolved));
                              setCardLayout({
                                ...cardLayout,
                                playerCardBgLogoScale:
                                  clamped - ROSTER_LAYOUT_BASE.playerCardBgLogoScale,
                              });
                            }}
                            className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                          />
                          <p className="text-[7px] text-zinc-600 normal-case mt-1">
                            {layoutBaseHint(ROSTER_LAYOUT_BASE.playerCardBgLogoScale, '%')} · background kartu
                          </p>
                        </div>
                        <div>
                          <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                            {t('otr.logoOpacityPct')}
                          </label>
                          <ScrollableInput
                            value={cardLayout.playerCardBgLogoOpacity ?? 35}
                            onChange={(val) =>
                              setCardLayout({ ...cardLayout, playerCardBgLogoOpacity: val })
                            }
                            className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                          />
                          <p className="text-[7px] text-zinc-600 normal-case mt-1">
                            Transparansi logo di background kartu pemain
                          </p>
                        </div>
                      </div>
                    )}
                    {(cardLayout.playerCardBgMode ?? 'default') === 'custom' && (
                      <div>
                        <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                          {t('otr.backgroundImageUrl')}
                        </label>
                        <input
                          type="url"
                          value={cardLayout.playerCardBgCustomUrl ?? ''}
                          onChange={(e) =>
                            setCardLayout({ ...cardLayout, playerCardBgCustomUrl: e.target.value })
                          }
                          placeholder="https://..."
                          className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-[10px] font-bold text-white outline-none focus:border-[#ccff00]"
                        />
                        <p className="text-[7px] text-zinc-600 normal-case mt-1.5">
                          Gambar full cover di semua card pemain. Paste link PNG/JPG/WebP.
                        </p>
                        <p className="text-[7px] text-[#74a57f]/90 normal-case mt-2 border border-[#74a57f]/20 bg-[#74a57f]/5 rounded-lg px-2.5 py-2 leading-relaxed">
                          <strong className="text-[#a3cfaa]">Rekomendasi ukuran:</strong>{' '}
                          {resolvedCardLayout.slotWidth}×{resolvedCardLayout.slotHeight}px (standar · ikut SLOT W/H)
                          {' · '}
                          {Math.round(resolvedCardLayout.slotWidth * (resolvedCardLayout.captainScale / 100))}×
                          {Math.round(resolvedCardLayout.slotHeight * (resolvedCardLayout.captainScale / 100))}
                          px (captain · slot terbesar)
                          {' · '}
                          {resolvedCardLayout.slotWidth * 2}×{resolvedCardLayout.slotHeight * 2}px (2× retina).
                          Rasio portrait {resolvedCardLayout.slotWidth}:{resolvedCardLayout.slotHeight}.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {configTab === 'ANIMATION' && customAnimationPanel}

              {configTab === 'ANIMATION' && !customAnimationPanel && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="p-2 bg-zinc-900 border border-white/5 rounded-[24px] flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const rosterPreset =
                          TEAM_ROSTER_ANIMATION_PRESETS.find((p) => p.id === DEFAULT_TEAM_ROSTER_PRESET_ID) ??
                          TEAM_ROSTER_ANIMATION_PRESETS[0];
                        setAnimationConfig({
                          ...animationConfig,
                          mode: 'default',
                          presetId: rosterPreset.id,
                          ...rosterPreset.config,
                        });
                        triggerPreview();
                      }}
                      className={`flex-1 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                        animationConfig.mode !== 'custom'
                          ? 'bg-[#ccff00] text-black shadow-lg shadow-[#ccff00]/20'
                          : 'text-zinc-500 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Zap size={14} fill={animationConfig.mode !== 'custom' ? 'currentColor' : 'none'} />
                      {t('otr.presetMode')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnimationConfig({ ...animationConfig, mode: 'custom' })}
                      className={`flex-1 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                        animationConfig.mode === 'custom'
                          ? 'bg-white text-black shadow-lg shadow-white/20'
                          : 'text-zinc-500 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Settings2 size={14} />
                      {t('otr.customMode')}
                    </button>
                  </div>

                  {animationConfig.mode === 'custom' ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 bg-zinc-950 border border-white/5 rounded-2xl">
                          <h4 className="text-[10px] font-black text-[#ccff00] uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                            <ArrowDownLeft size={14} /> {t('otr.inTransition')}
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {['fade', 'slide-right', 'slide-left', 'slide-up', 'slide-down'].map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() =>
                                  setDraftAnimationConfig({
                                    ...draftAnimationConfig,
                                    inType: type as AnimationConfig['inType'],
                                  })
                                }
                                className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                  draftAnimationConfig.inType === type
                                    ? 'bg-[#ccff00] text-black'
                                    : 'bg-black/40 text-zinc-600 hover:text-white border border-white/5'
                                }`}
                              >
                                {type.replace('-', ' ')}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="p-6 bg-zinc-950 border border-white/5 rounded-2xl">
                          <h4 className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                            <ArrowUpRight size={14} /> {t('otr.outTransition')}
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {['fade', 'slide-right', 'slide-left', 'slide-up', 'slide-down'].map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() =>
                                  setDraftAnimationConfig({
                                    ...draftAnimationConfig,
                                    outType: type as AnimationConfig['outType'],
                                  })
                                }
                                className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                  draftAnimationConfig.outType === type
                                    ? 'bg-red-500 text-white'
                                    : 'bg-black/40 text-zinc-600 hover:text-white border border-white/5'
                                }`}
                              >
                                {type.replace('-', ' ')}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-zinc-900 border border-white/5 rounded-2xl space-y-4">
                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] flex items-center gap-2">
                          <Settings2 size={14} /> {t('otr.timingStagger')}
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-2">
                              {t('otr.durationS')}
                            </label>
                            <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl p-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setDraftAnimationConfig({
                                    ...draftAnimationConfig,
                                    duration: Math.max(0.1, draftAnimationConfig.duration - 0.1),
                                  })
                                }
                                className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="flex-1 text-center text-sm font-black text-white">
                                {draftAnimationConfig.duration.toFixed(1)}s
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setDraftAnimationConfig({
                                    ...draftAnimationConfig,
                                    duration: draftAnimationConfig.duration + 0.1,
                                  })
                                }
                                className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-2">
                              {t('otr.delayS')}
                            </label>
                            <ScrollableInput
                              value={draftAnimationConfig.delay}
                              onChange={(val) =>
                                setDraftAnimationConfig({ ...draftAnimationConfig, delay: Math.max(0, val) })
                              }
                              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black text-white text-center"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-white/5">
                          <div>
                            <label className="text-[8px] font-black text-zinc-600 uppercase block mb-2">{t('otr.easing')}</label>
                            <select
                              value={draftAnimationConfig.easing}
                              onChange={(e) =>
                                setDraftAnimationConfig({
                                  ...draftAnimationConfig,
                                  easing: e.target.value as AnimationConfig['easing'],
                                })
                              }
                              className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[9px] font-black text-white uppercase"
                            >
                              <option value="linear">Linear</option>
                              <option value="easeIn">Ease In</option>
                              <option value="easeOut">Ease Out</option>
                              <option value="easeInOut">Ease In Out</option>
                              <option value="backOut">Back Out</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-zinc-600 uppercase block mb-2">{t('otr.spring')}</label>
                            <button
                              type="button"
                              onClick={() =>
                                setDraftAnimationConfig({
                                  ...draftAnimationConfig,
                                  useSpring: !draftAnimationConfig.useSpring,
                                })
                              }
                              className={`w-full py-2 rounded-lg text-[8px] font-black uppercase ${
                                draftAnimationConfig.useSpring
                                  ? 'bg-[#ccff00] text-black'
                                  : 'bg-black/40 text-zinc-600 border border-white/5'
                              }`}
                            >
                              {draftAnimationConfig.useSpring ? 'ON' : 'OFF'}
                            </button>
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-zinc-600 uppercase block mb-2">{t('otr.stagger')}</label>
                            <button
                              type="button"
                              onClick={() =>
                                setDraftAnimationConfig({
                                  ...draftAnimationConfig,
                                  staggerChildren: !draftAnimationConfig.staggerChildren,
                                })
                              }
                              className={`w-full py-2 rounded-lg text-[8px] font-black uppercase flex items-center justify-center gap-1 ${
                                draftAnimationConfig.staggerChildren
                                  ? 'bg-[#ccff00] text-black'
                                  : 'bg-black/40 text-zinc-600 border border-white/5'
                              }`}
                            >
                              <ListOrdered size={10} />
                              {draftAnimationConfig.staggerChildren ? 'ON' : 'OFF'}
                            </button>
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-zinc-600 uppercase block mb-2">{t('otr.direction')}</label>
                            <select
                              value={draftAnimationConfig.staggerDirection || 'center-out'}
                              disabled={!draftAnimationConfig.staggerChildren}
                              onChange={(e) =>
                                setDraftAnimationConfig({
                                  ...draftAnimationConfig,
                                  staggerDirection: e.target.value as AnimationConfig['staggerDirection'],
                                })
                              }
                              className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[9px] font-black text-white uppercase disabled:opacity-40"
                            >
                              <option value="center-out">Center Out</option>
                              <option value="top-down">Left to Right</option>
                              <option value="bottom-up">Right to Left</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-zinc-600 uppercase block mb-2">
                            {t('otr.staggerDelayS')}
                          </label>
                          <ScrollableInput
                            value={draftAnimationConfig.staggerDelay ?? 0.1}
                            onChange={(val) =>
                              setDraftAnimationConfig({
                                ...draftAnimationConfig,
                                staggerDelay: Math.max(0.02, val),
                              })
                            }
                            className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black text-white text-center"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {TEAM_ROSTER_ANIMATION_PRESETS.map((preset) => {
                        const merged = { ...preset.config, ...presetOverrides[preset.id] };
                        const isActive = animationConfig.presetId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setAnimationConfig({
                                ...animationConfig,
                                mode: 'default',
                                presetId: preset.id,
                                ...merged,
                              });
                              triggerPreview();
                            }}
                            className={`p-5 rounded-2xl border text-left transition-all ${
                              isActive
                                ? 'bg-[#ccff00] border-[#ccff00] shadow-lg shadow-[#ccff00]/20'
                                : 'bg-zinc-900/50 border-white/5 hover:border-white/20'
                            }`}
                          >
                            <div className={`flex items-center gap-2 mb-2 ${isActive ? 'text-black' : 'text-[#ccff00]'}`}>
                              <Zap size={16} fill="currentColor" />
                              <span className={`text-xs font-black uppercase tracking-widest ${isActive ? 'text-black' : 'text-white'}`}>
                                {preset.name}
                              </span>
                            </div>
                            <p className={`text-[10px] font-bold leading-relaxed ${isActive ? 'text-black/65' : 'text-zinc-500'}`}>
                              {preset.description}
                            </p>
                            <p className={`text-[8px] font-black uppercase tracking-widest mt-3 ${isActive ? 'text-black/50' : 'text-zinc-600'}`}>
                              IN: {merged.inType.replace('-', ' ')} · OUT: {merged.outType.replace('-', ' ')}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        {!isGlobalStudio && showMonitors && (
          <div className={`transition-all duration-300 flex shrink-0 ${showMonitors ? 'opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}>
            <PanelControlMonitor
              userRole={userRole}
              customPreview={livePreviewContent}
              programPlayKey={programPlayKey}
              programPreview={
                programAssetId === asset.id ? (
                  programFeedContent
                ) : programAssetId ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white">
                    <h2 className="text-4xl font-black text-[#ccff00] mb-4">{t('otr.assetPlaying')}</h2>
                    <p className="text-xl text-zinc-400 uppercase tracking-widest">
                      {availableAssets.find((a) => a.id === programAssetId)?.name}
                    </p>
                  </div>
                ) : null
              }
              activeAssets={
                programAssetId
                  ? [
                      {
                        id: programAssetId,
                        name: availableAssets.find((a) => a.id === programAssetId)?.name || programAssetId,
                        isProgram: true,
                      },
                    ]
                  : []
              }
              onStopAssets={(assetIds) => {
                if (programAssetId && assetIds.includes(programAssetId)) {
                  setProgramAssetId(null);
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default OverlayTeamRosterView;
