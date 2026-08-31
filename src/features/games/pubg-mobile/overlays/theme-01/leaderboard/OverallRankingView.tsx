
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { useSharedState } from '@/lib/useSharedState';
import { compressImage, LOGO_PRESET, BACKGROUND_PRESET } from '@/lib/imageCompression';
import { 
  Database, Palette, Activity, LayoutTemplate, 
  ChevronDown, Check, Settings2, Swords, Type, Move,
  Upload, Trash2, RotateCcw, ArrowRight, Minus, Plus, RefreshCw,
  Shield, X, Trophy, Skull, Zap, AlertTriangle, Target,
  Monitor, ChevronUp, AlertCircle, ShieldCheck, Info,
  ListOrdered, Flag, Search, Globe, Play, Square, Save,
  ArrowDownLeft, ArrowUpRight, Maximize2, Minimize2, Undo2, Link2, Image, Eye, Droplets
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useT } from '@/i18n/LanguageContext';
import { Theme, Asset, Game, PlayerData } from '@/types';
import PanelControlMonitor, { PreviewControlContext } from '@/features/companion/PanelControlMonitor';
import PlacementScoringModal from './modals/PlacementScoringModal';
import TieBreakerModal, { TieBreakerCriteria, TieBreakerConfig } from './modals/TieBreakerModal';
import ElimCauseModal from './modals/ElimCauseModal';
import KillVictimModal from './modals/KillVictimModal';
import KnockAttackerModal from './modals/KnockAttackerModal';
import {
  applyKnockAction,
  applyManualElimAction,
  applyFinishAction,
  undoKillFeedEvent,
  cloneLeaderboardTeams,
  findLastKillEventIndexForTeam,
  isTeamEliminationSealed,
  countAlivePlayers,
  getPlayerStatus,
  createEmptyCredits,
  createTeamStatus,
  createZeroKills,
  DEFAULT_MATCH_KILL_RULES,
  type PlayerRef,
  type KillFeedEvent,
  type MatchKillRules,
  type FinishCredit,
} from '@/features/games/pubg-mobile/logic/leaderboardKillLogic';

interface Team {
  rank: number;
  team: string;
  teamAbbreviation?: string;
  country: string;
  teamLogo: string;
  status: number[];
  playerNames: string[];
  playerImages?: string[];
  playerKills: number[];
  playerFinishCredit?: Array<FinishCredit | null>;
  playerKnockCredit?: Array<FinishCredit | null>;
  points: number;
  totalPlacementPoints: number;
  totalWwcds: number;
  active: boolean;
  expanded: boolean;
  placementRank: number | null;
}

interface VisualConfig extends EliminationBannerVisual {
  headerBg: string;
  headerText: string;
  rowEvenBg: string;
  rowOddBg: string;
  statusAlive: string;
  statusKnock: string;
  statusDead: string;
  pointsColor: string;
  rankColor: string;
  deltaPointsColor: string;
  showFlags: boolean;
  teamNameColor: string;
  eliminatedBg: string;
  eliminatedText: string;
  winnerBg: string;
  winnerText: string;
  statusBorder: string;
  statusText: string;
  leaderboardPanelBgImage: string;
  headerBgImage: string;
  rowEvenBgImage: string;
  rowOddBgImage: string;
  eliminatedBgImage: string;
  winnerBgImage: string;
  leaderboardDesignMode: LeaderboardDesignMode;
  finalFourDesignMode: FinalFourDesignMode;
  finalFourCardBgImage: string;
  finalFourTagGreen: string;
  finalFourPanelDark: string;
  finalFourPanelRow: string;
  finalFourWwcdGreen: string;
  finalFourBorder: string;
  finalFourLogoBg: string;
  finalFourTagText: string;
  finalFourWwcdLabelText: string;
}

interface LayoutConfig {
  scale: number;
  xOffset: number;
  yOffset: number;
  rowHeight: number;
  fontSize: number;
  logoSize: number;
  flagWidth: number;
  /** Lebar panel leaderboard (px) */
  panelWidth?: number;
  /** ID font — lihat OVERLAY_FONT_FAMILY_OPTIONS */
  fontFamilyId?: string;
}

interface EliminationBannerLayout {
  scale: number;
  /** Geser dari tengah horizontal — positif = kanan */
  xOffset: number;
  /** Jarak dari atas canvas (px) */
  yOffset: number;
}

const STAGED_ELIM_PREVIEW_ALERT_ID = 'brohubs-elim-banner-staged-preview';

/** Data contoh saat belum ada tim / eliminasi di klasemen */
const STAGED_FINAL_FOUR_PREVIEW_DATA = [
  {
    rank: 1,
    teamAbbreviation: 'ALPHA',
    teamName: 'TEAM ALPHA',
    teamLogo: '',
    wwcdPotentialPct: 32.5,
    playerStatus: [1, 1, 1, 0],
  },
  {
    rank: 2,
    teamAbbreviation: 'BRAVO',
    teamName: 'TEAM BRAVO',
    teamLogo: '',
    wwcdPotentialPct: 28.0,
    playerStatus: [1, 2, 0, 0],
  },
  {
    rank: 3,
    teamAbbreviation: 'CHARLIE',
    teamName: 'TEAM CHARLIE',
    teamLogo: '',
    wwcdPotentialPct: 22.5,
    playerStatus: [1, 1, 0, 0],
  },
  {
    rank: 4,
    teamAbbreviation: 'DELTA',
    teamName: 'TEAM DELTA',
    teamLogo: '',
    wwcdPotentialPct: 17.0,
    playerStatus: [0, 0, 0, 0],
  },
] as const;

const STAGED_ELIM_PREVIEW_FALLBACK: TeamEliminationAlert = {
  id: STAGED_ELIM_PREVIEW_ALERT_ID,
  teamIndex: 0,
  placementRank: 8,
  teamRank: 5,
  teamLabel: 'TEAM PREVIEW',
  teamName: 'TEAM PREVIEW',
  teamLogo: '',
  country: 'id',
  at: 0,
};

const DEFAULT_ELIMINATION_BANNER_LAYOUT: EliminationBannerLayout = {
  scale: 100,
  xOffset: -72,
  yOffset: 249,
};

import {
  AnimationConfig,
  getAnimationSignature,
  getChildMotionExit,
  getChildMotionInitial,
  getMotionEase,
  getRootMotionProps,
  resolveExitStaggerDelay,
  resolveAnimationConfig,
  resolveStaggerDelay,
} from '@/constants/transitions';
import { notifyCompanionAnimation } from '@/features/companion/overlayAnimation';
import { notifyCompanionData } from '@/features/companion/overlayData';
import { LeaderboardAnimationPanel } from './animation/LeaderboardAnimationPanel';
import {
  LEADERBOARD_ANIMATION_STORAGE_KEY,
  LEADERBOARD_ANIMATION_PRESETS,
  LEADERBOARD_DEFAULT_ANIMATION,
  LEADERBOARD_PROGRAM_VISIBLE_KEY,
  LEADERBOARD_PRESET_OVERRIDES_STORAGE_KEY,
  resolveLeaderboardExitDurationSeconds,
  type LeaderboardPresetOverrides,
} from './animation/config';
import TeamEliminatedBanner from './components/TeamEliminatedBanner';
import {
  FirstBloodBanner,
  FIRST_BLOOD_PREVIEW_TARGET,
  preloadFirstBloodImage,
} from '../first-blood/FirstBloodBanner';
import {
  TerminatorBanner,
  TERMINATOR_PREVIEW_TARGET,
  preloadTerminatorImage,
  type TerminatorTarget,
} from '../terminator/TerminatorBanner';
import { FinalFourTeamCard } from './components/FinalFourTeamCard';
import { useOverlayFonts } from '@/features/games/pubg-mobile/useEliminationBannerFonts';
import OverlayFontFamilySelect from '@/components/shared/OverlayFontFamilySelect';
import {
  DEFAULT_OVERLAY_FONT_FAMILY_ID,
  getOverlayFontCssFamily,
  resolveOverlayFontFamilyId,
} from '@/features/games/pubg-mobile/logic/eliminationBannerFonts';
import {
  TEAM_ELIMINATION_ALERT_KEY,
  type TeamEliminationAlert,
} from '@/features/games/pubg-mobile/logic/teamEliminationAlert';
import {
  buildTopFraggersFromMatch,
  isMatchReadyForTopFraggerSync,
  type TopFraggerSlot,
} from '@/features/games/pubg-mobile/logic/topFraggersSync';
import {
  applyMatchEndPlacementRanks,
  finalizeTeamAtIndex,
  getTeamsInContention,
  isTeamMatchEliminated,
  resetCurrentMatchTeamState,
  teamHasAlivePlayer,
  totalTeamKills,
} from '@/features/games/pubg-mobile/logic/matchPlacements';
import { createEventId } from '@/features/games/pubg-mobile/logic/leaderboardKillLogic';
import type {
  EliminationBannerVisual,
  EliminationBannerImageKey,
  EliminationBannerFullImageFit,
} from '@/features/games/pubg-mobile/logic/eliminationBannerVisual';
import {
  DEFAULT_ELIMINATION_BANNER_VISUAL,
  DEFAULT_ELIMINATION_BANNER_FULL_LAYOUT,
  DEFAULT_ELIMINATION_BANNER_TYPOGRAPHY,
  ELIMINATION_BANNER_FONT_KEYS_PANEL,
  ELIMINATION_BANNER_FONT_KEYS_CUSTOM_IMAGE,
  ELIMINATION_BANNER_FONT_LABELS,
  type EliminationBannerFontKey,
  resolveEliminationBannerTypography,
  ELIMINATION_BANNER_COLOR_KEYS,
  ELIMINATION_BANNER_TEXT_COLOR_KEYS,
  ELIMINATION_BANNER_TEXT_COLOR_KEYS_CUSTOM_IMAGE,
  ELIMINATION_BANNER_COLOR_LABELS,
  ELIMINATION_BANNER_CUSTOM_PANEL_IMAGE_KEYS,
  ELIMINATION_BANNER_CUSTOM_IMAGE_VARIANT_LABELS,
  type EliminationBannerCustomImageVariant,
  ELIMINATION_BANNER_IMAGE_LABELS,
  ELIMINATION_BANNER_IMAGE_SIZE_HINTS,
  ELIMINATION_BANNER_IMAGE_LINK_NOTE,
  ELIMINATION_BANNER_FULL_IMAGE_FIT_LABELS,
  ELIMINATION_BANNER_FULL_IMAGE_FIT_NOTE,
  ELIMINATION_BANNER_FULL_LAYOUT_NOTE,
  pickEliminationBannerVisual,
  type EliminationBannerFullOverlayLayout,
  ELIMINATION_BANNER_FONT_FAMILY_OPTIONS,
  DEFAULT_ELIMINATION_BANNER_FONT_FAMILY_ID,
  getEliminationBannerFontCssFamily,
  resolveEliminationBannerFontFamilyId,
} from '@/features/games/pubg-mobile/logic/eliminationBannerVisual';
import {
  DEFAULT_LEADERBOARD_BACKGROUND_IMAGES,
  DEFAULT_LEADERBOARD_DESIGN_MODE,
  LEADERBOARD_DESIGN_MODE_LABELS,
  LEADERBOARD_BG_IMAGE_KEYS,
  LEADERBOARD_BG_IMAGE_LABELS,
  LEADERBOARD_BG_IMAGE_HINTS,
  LEADERBOARD_PANEL_BG_COLOR_KEYS,
  LEADERBOARD_TEXT_COLOR_KEYS,
  LEADERBOARD_COLOR_LABELS,
  type LeaderboardBgImageKey,
  type LeaderboardDesignMode,
  resolveLeaderboardSurfaceStyle,
  hasLeaderboardBgImage,
  isLeaderboardPanelDesignMode,
  leaderboardPanelWidthForFlags,
  resolveLeaderboardPanelWidth,
} from '@/features/games/pubg-mobile/logic/leaderboardVisual';
import {
  DEFAULT_FINAL_FOUR_LAYOUT,
  DEFAULT_FINAL_FOUR_VISUAL,
  FINAL_FOUR_COLOR_KEYS,
  FINAL_FOUR_COLOR_LABELS,
  FINAL_FOUR_DESIGN_MODE_LABELS,
  type FinalFourDesignMode,
  type FinalFourLayoutConfig,
  isFinalFourPanelDesignMode,
  resolveFinalFourSoloExitDelayMs,
} from '@/features/games/pubg-mobile/logic/finalFourOverlayVisual';
import {
  DEFAULT_TERMINATOR_VISUAL,
  TERMINATOR_CONFIG_KEY,
  TERMINATOR_COLOR_KEYS,
  TERMINATOR_COLOR_LABELS,
  TERMINATOR_PLAYER_KILL_HISTORY_KEY,
  TERMINATOR_VISUAL_PRESETS,
  clampTerminatorDisplaySeconds,
  clampTerminatorKillThreshold,
  clampTerminatorPlayerImageScale,
  clampTerminatorPosition,
  clampTerminatorScale,
  terminatorDesignBaseline,
  terminatorPlayerKey,
  type TerminatorPlayerKillHistory,
  type TerminatorVisualConfig,
} from '@/features/games/pubg-mobile/logic/terminatorVisual';
import {
  BROADCAST_CUT_ORIGINAL_PALETTE,
  BROADCAST_CUT_PALETTE_LABELS,
  BROADCAST_CUT_LOGO_PANEL_INDICES,
  BROADCAST_CUT_BAR_INDICES,
  BROADCAST_CUT_LIGHT_INDICES,
  BROADCAST_CUT_ACCENT_INDEX,
  HERO_SPLIT_ORIGINAL_PALETTE,
  HERO_SPLIT_PANEL_INDICES,
  HERO_SPLIT_ACCENT_INDEX,
  HERO_SPLIT_LIGHT_INDICES,
  DEFAULT_FIRST_BLOOD_VISUAL,
  FIRST_BLOOD_ALERT_KEY,
  FIRST_BLOOD_COLOR_KEYS,
  FIRST_BLOOD_COLOR_LABELS,
  FIRST_BLOOD_CONFIG_KEY,
  FIRST_BLOOD_VISUAL_PRESETS,
  clampFirstBloodDisplaySeconds,
  clampFirstBloodPlayerImageScale,
  clampFirstBloodPosition,
  clampFirstBloodScale,
  getFirstBloodLayoutBaseline,
  type FirstBloodAlert,
  type FirstBloodTarget,
  type FirstBloodVisualConfig,
} from '@/features/games/pubg-mobile/logic/firstBloodVisual';

interface OverlayOverallRankingViewProps {
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
  programFeed?: boolean;
  onOverallRankingExitComplete?: () => void;
  style?: React.CSSProperties;
}

const COUNTRIES = [
  { code: 'ID', name: 'Indonesia' }, { code: 'MY', name: 'Malaysia' }, { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' }, { code: 'PH', name: 'Philippines' }, { code: 'SG', name: 'Singapore' },
  { code: 'CN', name: 'China' }, { code: 'KR', name: 'South Korea' }, { code: 'JP', name: 'Japan' },
  { code: 'US', name: 'United States' }, { code: 'BR', name: 'Brazil' }, { code: 'TR', name: 'Turkey' },
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'MN', name: 'Mongolia' }, { code: 'IN', name: 'India' },
  { code: 'PK', name: 'Pakistan' }, { code: 'RU', name: 'Russia' }, { code: 'UA', name: 'Ukraine' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' }
].sort((a, b) => a.name.localeCompare(b.name));

/** Easing halus saat flag on/off (panel + kolom bendera) */
const LEADERBOARD_FLAG_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const LEADERBOARD_FLAG_LAYOUT_TRANSITION = `width 0.65s ${LEADERBOARD_FLAG_EASE}, opacity 0.55s ${LEADERBOARD_FLAG_EASE}, margin 0.65s ${LEADERBOARD_FLAG_EASE}, transform 0.55s ${LEADERBOARD_FLAG_EASE}`;
const LEADERBOARD_PANEL_WIDTH_TRANSITION = `width 0.65s ${LEADERBOARD_FLAG_EASE}`;
/** Kolom ELIMS (match 2+) — masuk/keluar lebih halus */
const LEADERBOARD_ELIMS_COLUMN_WIDTH_PX = 36;
const LEADERBOARD_ELIMS_PANEL_EXTRA_PX = 44;
/** Lebar kolom Status/Pts tetap; ruang ELIMS ditambah di kanan supaya Status ikut bergeser */
const LEADERBOARD_ELIMS_STATUS_WIDTH_PX = 80;
const LEADERBOARD_ELIMS_PTS_WIDTH_PX = 80;
const LEADERBOARD_ELIMS_LAYOUT_TRANSITION = `width 0.85s ${LEADERBOARD_FLAG_EASE}, max-width 0.85s ${LEADERBOARD_FLAG_EASE}, min-width 0.85s ${LEADERBOARD_FLAG_EASE}, opacity 0.72s ${LEADERBOARD_FLAG_EASE}, transform 0.78s ${LEADERBOARD_FLAG_EASE}, margin 0.85s ${LEADERBOARD_FLAG_EASE}`;

const getDefaultLeaderboardLayout = (showFlags: boolean): LayoutConfig => ({
  scale: 80,
  xOffset: -40,
  yOffset: 250,
  rowHeight: 52,
  fontSize: 18,
  logoSize: 35,
  flagWidth: 24,
  panelWidth: leaderboardPanelWidthForFlags(showFlags),
  fontFamilyId: DEFAULT_OVERLAY_FONT_FAMILY_ID,
});

/** Popup ELIMINATED di baris klasemen — masuk/keluar halus (bukan putus di akhir) */
const ELIMINATED_POPUP_EASE_IN: [number, number, number, number] = [0.22, 1, 0.36, 1];
const ELIMINATED_POPUP_EASE_OUT: [number, number, number, number] = [0.33, 1, 0.68, 1];
const ELIMINATED_POPUP_HOLD_MS = 3400;

/** Endgame overlay atas: tim tersisa <=4 (4->1), tahan bar Final Four tanpa mematikan klasemen kanan */
const FINAL_FOUR_ALIVE_COUNT = 4;
const FINAL_FOUR_MIN_ALIVE_COUNT = 1;

const isEndgameTopOverlayCount = (count: number) =>
  count <= FINAL_FOUR_ALIVE_COUNT && count >= FINAL_FOUR_MIN_ALIVE_COUNT;
/** Tahan kartu terakhir (1 tim) lalu transisi keluar */
const FINAL_FOUR_PANEL_EXIT_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const FINAL_FOUR_ENTER_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
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
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  valueRef.current = value;
  onChangeRef.current = onChange;

  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    const handleWheel = (e: WheelEvent) => {
      if (document.activeElement !== element) return;
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -1 : 1;
      onChangeRef.current(valueRef.current + delta);
    };
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, []);

  const safeValue = Number.isFinite(value) ? value : 0;

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={safeValue}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        onChange(safeValue + (e.key === 'ArrowUp' ? step : -step));
      }}
      onChange={(e) => {
        const raw = e.target.value.trim();
        if (raw === '' || raw === '-') return;
        const next = Number(raw);
        if (Number.isFinite(next)) onChange(next);
      }}
      className={className}
    />
  );
};

/**
 * Input SCALE/POS banner — draft lokal saat scroll agar tidak bentrok dengan re-render preview.
 */
const ElimBannerLayoutInput = ({
  value,
  onChange,
  previewMode = false,
  onWheelTuningChange,
  onFocusTuningChange,
  className,
}: {
  value: number;
  onChange: (val: number) => void;
  /** Preview Sementara — scroll tanpa reset angka dari parent */
  previewMode?: boolean;
  onWheelTuningChange?: (active: boolean) => void;
  onFocusTuningChange?: (active: boolean) => void;
  className?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const draftRef = useRef(Number.isFinite(value) ? value : 0);
  const wheelBurstRef = useRef(false);
  /** Cegah useEffect sync draft ke value lama saat scroll baru berhenti */
  const wheelSettlingRef = useRef(false);
  const focusedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const wheelEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draft, setDraft] = useState(() => (Number.isFinite(value) ? value : 0));
  /** Teks bebas saat fokus — type=number + value terkontrol memblokir hapus semua lalu ketik ulang */
  const [editingText, setEditingText] = useState<string | null>(null);
  const editingTextRef = useRef<string | null>(null);

  onChangeRef.current = onChange;
  draftRef.current = draft;

  const setWheelTuning = useCallback(
    (active: boolean) => {
      onWheelTuningChange?.(active);
    },
    [onWheelTuningChange]
  );

  const setFocusTuning = useCallback(
    (active: boolean) => {
      onFocusTuningChange?.(active);
    },
    [onFocusTuningChange]
  );

  const prevPreviewModeRef = useRef(false);
  /** Nilai terakhir dikirim ke parent — cegah sync balik ke value stale saat scroll cepat */
  const lastCommittedRef = useRef(Number.isFinite(value) ? value : 0);

  useEffect(() => {
    const wasPreview = prevPreviewModeRef.current;
    const previewJustOn = previewMode && !wasPreview;
    const previewJustOff = !previewMode && wasPreview;
    prevPreviewModeRef.current = previewMode;

    if (previewJustOn || previewJustOff) {
      const next = Number.isFinite(value) ? value : 0;
      draftRef.current = next;
      lastCommittedRef.current = next;
      setDraft(next);
      setEditingText(null);
      return;
    }

    // Preview Sementara: draft lokal yang pegang angka (parent React/shared-state masih async)
    if (previewMode) return;

    if (focusedRef.current || wheelBurstRef.current || wheelSettlingRef.current) return;

    const next = Number.isFinite(value) ? value : 0;
    if (draftRef.current === next) return;
    draftRef.current = next;
    lastCommittedRef.current = next;
    setDraft(next);
    setEditingText(null);
  }, [value, previewMode]);

  const commitToParent = useCallback((next: number) => {
    draftRef.current = next;
    lastCommittedRef.current = next;
    setDraft(next);
    onChangeRef.current(next);
  }, []);

  const bumpByKeyboard = useCallback((delta: number) => {
    const raw = editingTextRef.current?.trim();
    const current =
      raw != null && raw !== '' && raw !== '-' && Number.isFinite(Number(raw))
        ? Number(raw)
        : draftRef.current;
    const next = current + delta;
    editingTextRef.current = String(next);
    setEditingText(String(next));
    commitToParent(next);
  }, [commitToParent]);

  const endWheelBurst = useCallback(() => {
    const next = draftRef.current;
    lastCommittedRef.current = next;
    onChangeRef.current(next);
    wheelBurstRef.current = false;
    wheelSettlingRef.current = true;
    setWheelTuning(false);
    requestAnimationFrame(() => {
      wheelSettlingRef.current = false;
    });
  }, [setWheelTuning]);

  const bumpByWheel = useCallback(
    (delta: number) => {
      if (!wheelBurstRef.current) {
        wheelBurstRef.current = true;
        setWheelTuning(true);
      }
      const next = draftRef.current + delta;
      draftRef.current = next;
      lastCommittedRef.current = next;
      setDraft(next);
      editingTextRef.current = null;
      setEditingText(null);
      onChangeRef.current(next);

      if (wheelEndTimerRef.current) {
        clearTimeout(wheelEndTimerRef.current);
      }
      wheelEndTimerRef.current = setTimeout(endWheelBurst, 200);
    },
    [endWheelBurst, setWheelTuning]
  );

  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;

    const isWheelTarget = (e: WheelEvent) => {
      if (document.activeElement === element) return true;
      if (!previewMode) return false;
      const rect = element.getBoundingClientRect();
      return (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
    };

    const handleWheel = (e: WheelEvent) => {
      if (!isWheelTarget(e)) return;
      e.preventDefault();
      e.stopPropagation();
      if (previewMode && document.activeElement !== element) {
        element.focus({ preventScroll: true });
        if (!focusedRef.current) {
          focusedRef.current = true;
          setFocusTuning(true);
        }
      }
      const step = e.shiftKey ? 10 : 1;
      const delta = (e.deltaY > 0 ? -1 : 1) * step;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        bumpByWheel(delta);
      });
    };

    element.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => {
      element.removeEventListener('wheel', handleWheel, { capture: true });
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (wheelEndTimerRef.current) clearTimeout(wheelEndTimerRef.current);
    };
  }, [bumpByWheel, previewMode, setFocusTuning]);

  const displayValue = editingText ?? String(draft);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onFocus={() => {
        focusedRef.current = true;
        const seed = String(draftRef.current);
        editingTextRef.current = seed;
        setEditingText(seed);
        setFocusTuning(true);
      }}
      onBlur={() => {
        focusedRef.current = false;
        if (wheelEndTimerRef.current) {
          clearTimeout(wheelEndTimerRef.current);
          wheelEndTimerRef.current = null;
        }
        wheelBurstRef.current = false;

        // Scroll wheel hanya mengubah draft — editingTextRef masih seed lama dari onFocus
        let next = draftRef.current;
        const raw = editingTextRef.current?.trim();
        if (raw != null && raw !== '' && raw !== '-') {
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) next = parsed;
        }
        draftRef.current = next;
        lastCommittedRef.current = next;
        setDraft(next);
        onChangeRef.current(next);
        editingTextRef.current = null;
        setEditingText(null);

        wheelSettlingRef.current = true;
        setFocusTuning(false);
        setWheelTuning(false);
        requestAnimationFrame(() => {
          wheelSettlingRef.current = false;
        });
      }}
      onChange={(e) => {
        const raw = e.target.value;
        editingTextRef.current = raw;
        setEditingText(raw);
        const trimmed = raw.trim();
        if (trimmed === '' || trimmed === '-') return;
        const next = Number(trimmed);
        if (!Number.isFinite(next)) return;
        commitToParent(next);
      }}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        bumpByKeyboard(e.key === 'ArrowUp' ? step : -step);
      }}
      className={className}
    />
  );
};

/** Input angka — scroll hover saat Preview Sementara, scroll fokus saat normal */
const ElimNumberInput = ({
  value,
  onChange,
  className,
  previewMode = false,
  onWheelTuningChange,
  onFocusTuningChange,
}: {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  previewMode?: boolean;
  onWheelTuningChange?: (active: boolean) => void;
  onFocusTuningChange?: (active: boolean) => void;
}) =>
  previewMode ? (
    <ElimBannerLayoutInput
      previewMode
      value={value}
      onChange={onChange}
      className={className}
      onWheelTuningChange={onWheelTuningChange}
      onFocusTuningChange={onFocusTuningChange}
    />
  ) : (
    <ScrollableInput value={value} onChange={onChange} className={className} />
  );

const deriveTeamAbbreviation = (teamName: string): string => {
  const trimmed = teamName.trim();
  if (!trimmed) return '---';
  if (!trimmed.includes(' ')) {
    return trimmed.length <= 5 ? trimmed.toUpperCase() : trimmed.slice(0, 4).toUpperCase();
  }
  return trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 4)
    .toUpperCase();
};

/**
 * Cari pemain di Database Project berdasarkan nama tim — toleran beda huruf
 * besar/kecil & spasi (samakan dengan teamRosterSync.ts & pencocokan foto
 * Terminator). Sebelumnya logo/abbr dicari dengan `===` persis, sehingga data
 * DB gagal terbaca bila nama tim di data match beda kapitalisasi/spasi dan
 * overlay jatuh ke logo bawaan, bukan logo yang diinput di Database Project.
 */
const findProjectTeamPlayer = (
  projectPlayers: PlayerData[],
  teamName: string
): PlayerData | undefined => {
  const normalized = teamName.trim().toLowerCase();
  if (!normalized) return undefined;
  return projectPlayers.find((p) => p.team.trim().toLowerCase() === normalized);
};

const getLeaderboardTeamLabel = (team: Pick<Team, 'team' | 'teamAbbreviation'>, projectPlayers: PlayerData[] = []): string => {
  if (team.teamAbbreviation?.trim()) return team.teamAbbreviation.trim().toUpperCase();
  const fromDb = findProjectTeamPlayer(projectPlayers, team.team)?.teamAbbreviation;
  if (fromDb?.trim()) return fromDb.trim().toUpperCase();
  return deriveTeamAbbreviation(team.team);
};

const resolveLeaderboardTeamLogo = (
  team: Pick<Team, 'team' | 'teamLogo'>,
  projectPlayers: PlayerData[] = []
): string => {
  const fromDb = findProjectTeamPlayer(projectPlayers, team.team)?.teamLogo?.trim();
  return fromDb || team.teamLogo?.trim() || '';
};

const ensureTeamAbbreviation = (team: Team, projectPlayers: PlayerData[] = []): Team => {
  if (team.teamAbbreviation?.trim()) return team;
  const fromDb = findProjectTeamPlayer(projectPlayers, team.team)?.teamAbbreviation?.trim();
  return {
    ...team,
    teamAbbreviation: (fromDb || deriveTeamAbbreviation(team.team)).toUpperCase(),
  };
};

const resolveTerminatorPlayerImage = (
  projectPlayers: PlayerData[],
  team: Pick<Team, 'team' | 'teamAbbreviation' | 'playerImages'>,
  playerName: string
): string => {
  const normalizedPlayerName = playerName.trim().toLowerCase();
  const normalizedTeamName = team.team.trim().toLowerCase();
  const normalizedTeamAbbr = (team.teamAbbreviation || '').trim().toLowerCase();

  const exactTeamMatch = projectPlayers.find((player) => {
    const sameName = player.name.trim().toLowerCase() === normalizedPlayerName;
    const playerTeam = player.team.trim().toLowerCase();
    const playerAbbr = (player.teamAbbreviation || '').trim().toLowerCase();
    return (
      sameName &&
      (playerTeam === normalizedTeamName ||
        playerTeam === normalizedTeamAbbr ||
        playerAbbr === normalizedTeamName ||
        playerAbbr === normalizedTeamAbbr) &&
      player.image?.trim()
    );
  });

  const nameOnlyMatch = projectPlayers.find(
    (player) =>
      player.name.trim().toLowerCase() === normalizedPlayerName && player.image?.trim()
  );

  return exactTeamMatch?.image?.trim() || nameOnlyMatch?.image?.trim() || '';
};

const buildPlayerImagesFromProjectPlayers = (
  players: PlayerData[],
  names: string[]
): string[] =>
  Array.from({ length: names.length }, (_, index) => players[index]?.image?.trim() || '');

const collectLeaderboardTerminatorTargets = (
  teams: Team[],
  projectPlayers: PlayerData[],
  killHistory: TerminatorPlayerKillHistory
): TerminatorTarget[] => {
  const rows = teams.flatMap((team) => {
    const withAbbr = ensureTeamAbbreviation(team, projectPlayers);
    return withAbbr.playerNames.map((name, playerIndex) => {
      const playerName = name || `P${playerIndex + 1}`;
      const matchKills = Number(withAbbr.playerKills[playerIndex] ?? 0);
      const cumulativeKills =
        (killHistory[terminatorPlayerKey(withAbbr.team, playerName)] ?? 0) + matchKills;

      return {
        player: playerName,
        team: getLeaderboardTeamLabel(withAbbr, projectPlayers),
        teamName: withAbbr.team || getLeaderboardTeamLabel(withAbbr, projectPlayers),
        logo: resolveLeaderboardTeamLogo(withAbbr, projectPlayers),
        image:
          resolveTerminatorPlayerImage(projectPlayers, withAbbr, playerName) ||
          withAbbr.playerImages?.[playerIndex]?.trim() ||
          '',
        kills: matchKills,
        cumulativeKills,
      };
    });
  });

  const rankedRows = [...rows]
    .sort(
      (a, b) =>
        b.cumulativeKills - a.cumulativeKills ||
        b.kills - a.kills ||
        a.player.localeCompare(b.player)
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return rankedRows.sort((a, b) => a.kills - b.kills || a.rank - b.rank);
};

const buildFirstBloodTarget = (
  teams: Team[],
  projectPlayers: PlayerData[],
  ref: PlayerRef
): FirstBloodTarget | null => {
  const team = teams[ref.teamIndex];
  if (!team) return null;
  const withAbbr = ensureTeamAbbreviation(team, projectPlayers);
  const playerName = withAbbr.playerNames[ref.playerIndex] || `P${ref.playerIndex + 1}`;
  const kills = Number(withAbbr.playerKills[ref.playerIndex] ?? 1);

  return {
    teamIndex: ref.teamIndex,
    playerIndex: ref.playerIndex,
    player: playerName,
    team: getLeaderboardTeamLabel(withAbbr, projectPlayers),
    teamName: withAbbr.team || getLeaderboardTeamLabel(withAbbr, projectPlayers),
    logo: resolveLeaderboardTeamLogo(withAbbr, projectPlayers),
    image:
      resolveTerminatorPlayerImage(projectPlayers, withAbbr, playerName) ||
      withAbbr.playerImages?.[ref.playerIndex]?.trim() ||
      '',
    kills: Math.max(1, kills),
    rank: withAbbr.rank,
  };
};

const enrichFirstBloodTarget = (
  target: FirstBloodTarget,
  teams: Team[],
  projectPlayers: PlayerData[]
): FirstBloodTarget => {
  if (target.teamIndex != null && target.playerIndex != null) {
    const fromSlot = buildFirstBloodTarget(teams, projectPlayers, {
      teamIndex: target.teamIndex,
      playerIndex: target.playerIndex,
    });
    if (fromSlot) {
      return {
        ...target,
        ...fromSlot,
        image: fromSlot.image || target.image || '',
        logo: fromSlot.logo || target.logo || '',
      };
    }
  }

  const normalizedPlayer = target.player.trim().toLowerCase();
  const normalizedTeam = target.teamName.trim().toLowerCase();
  for (let teamIndex = 0; teamIndex < teams.length; teamIndex += 1) {
    const team = teams[teamIndex];
    const sameTeam =
      team.team.trim().toLowerCase() === normalizedTeam ||
      getLeaderboardTeamLabel(team, projectPlayers).trim().toLowerCase() ===
        target.team.trim().toLowerCase();
    if (!sameTeam) continue;
    const playerIndex = team.playerNames.findIndex(
      (name) => name.trim().toLowerCase() === normalizedPlayer
    );
    if (playerIndex < 0) continue;
    const fromName = buildFirstBloodTarget(teams, projectPlayers, { teamIndex, playerIndex });
    if (fromName) {
      return {
        ...target,
        ...fromName,
        image: fromName.image || target.image || '',
        logo: fromName.logo || target.logo || '',
      };
    }
  }

  return target;
};

const INITIAL_LEADERBOARD_DATA = Array.from({ length: 16 }, (_, i) => ({
  rank: i + 1,
  team: `TEAM ${String.fromCharCode(65 + i)}`,
  teamAbbreviation: String.fromCharCode(65 + i),
  country: 'ID',
  teamLogo: '',
  status: [1, 1, 1, 1], // 0:Dead, 1:Alive, 2:Knock
  playerNames: ['P1', 'P2', 'P3', 'P4'],
  playerKills: [0, 0, 0, 0],
  playerFinishCredit: [null, null, null, null],
  playerKnockCredit: [null, null, null, null],
  points: 0,
  totalPlacementPoints: 0, 
  totalWwcds: 0, 
  active: true,
  expanded: false,
  placementRank: null as number | null 
}));

const INITIAL_VISUAL_CONFIG: VisualConfig = {
  headerBg: '#74a57f',
  headerText: '#ffffff',
  rowEvenBg: '#e8e6df',
  rowOddBg: '#dcdcdc',
  statusAlive: '#a3cfaa',
  statusKnock: '#ff6b6b',
  statusDead: '#4a5a4a',
  pointsColor: '#000000',
  rankColor: '#b04e4e',
  deltaPointsColor: '#ccff00',
  showFlags: true,
  teamNameColor: '#000000',
  eliminatedBg: '#323232',
  eliminatedText: '#ffffff',
  winnerBg: '#ccff00',
  winnerText: '#000000',
  statusBorder: '#000000',
  statusText: '#ffffff',
  ...DEFAULT_LEADERBOARD_BACKGROUND_IMAGES,
  leaderboardDesignMode: DEFAULT_LEADERBOARD_DESIGN_MODE,
  ...DEFAULT_FINAL_FOUR_VISUAL,
  ...DEFAULT_ELIMINATION_BANNER_VISUAL,
};

const OverlayOverallRankingView: React.FC<OverlayOverallRankingViewProps> = ({
  asset, theme, availableAssets, userRole, onBack, onSelectAsset, onSelectTheme, projectPlayers = [], companionProjectScope = null, isGlobalStudio = false, showMonitorProp = true,
  programAssetIdProp, onProgramAssetChange, getAssetStatusProp, onPreviewContentChange, visualOnly = false, monitorFeed = false, feedPlayKey, programFeed, onOverallRankingExitComplete, style
}) => {
  const t = useT();
  useOverlayFonts();
  const syncCompanionData = (payload: Parameters<typeof notifyCompanionData>[0]) =>
    notifyCompanionData(payload, companionProjectScope);
  const syncCompanionAnimation = (payload: Parameters<typeof notifyCompanionAnimation>[0]) =>
    notifyCompanionAnimation(payload, companionProjectScope);
  const [configTab, setConfigTab] = useState<'DATA' | 'VISUAL' | 'ANIMATION'>('DATA');
  const [visualSettingsPanel, setVisualSettingsPanel] = useState<
    'choose' | 'leaderboard' | 'elimination' | 'finalFour' | 'terminator' | 'firstBlood'
  >('choose');
  const [showList, setShowList] = useState(true);
  const [showMonitors, setShowMonitors] = useState(true);

  // Resizable Sidebar Logic
  const [sidebarWidth, setSidebarWidth] = useState(224); // Default w-56
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = React.useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX - 256; // Adjust based on main dashboard sidebar
        if (newWidth > 160 && newWidth < 480) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  // Sync internal showMonitors with prop if provided
  useEffect(() => {
    setShowMonitors(showMonitorProp);
  }, [showMonitorProp]);
  
  const [teams, setTeams] = useSharedState<Team[]>('BROHUBS_LEADERBOARD_TEAMS', INITIAL_LEADERBOARD_DATA);
  const [matchTitle, setMatchTitle] = useSharedState('BROHUBS_LEADERBOARD_TITLE', 'OVERALL RANKING');
  const [currentMatch, setCurrentMatch] = useSharedState('BROHUBS_LEADERBOARD_MATCH', 1);
  const [nextPlacementRank, setNextPlacementRank] = useState(16);

  const [activePopups, setActivePopups] = useState<number[]>([]);
  const [eliminationAlert, setEliminationAlert] = useSharedState<TeamEliminationAlert | null>(
    TEAM_ELIMINATION_ALERT_KEY,
    null
  );
  const eliminationClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eliminationQueueRef = useRef<TeamEliminationAlert[]>([]);
  const eliminationShowingRef = useRef(false);
  const seenEliminationsRef = useRef<Set<string>>(new Set());
  const eliminationsInitializedRef = useRef(false);
  const finalFourSoloExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [finalFourTopBarVisible, setFinalFourTopBarVisible] = useState(false);
  const [finalFourHoldPreview, setFinalFourHoldPreview] = useState(false);

  const [isScoringModalOpen, setIsScoringModalOpen] = useState(false);
  const [isTieBreakerModalOpen, setIsTieBreakerModalOpen] = useState(false);
  const [isEndMatchModalOpen, setIsEndMatchModalOpen] = useState(false);
  
  // New Country Modal States
  const [isCountryModalOpen, setIsCountryModalOpen] = useState<{ rankIndex: number } | null>(null);
  const [countrySearch, setCountrySearch] = useState('');
  
  const [scoringRules, setScoringRules] = useState<number[]>([10, 6, 5, 4, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]); 
  const [killPointValue, setKillPointValue] = useState(1);
  const [tieBreakerOrder, setTieBreakerOrder] = useState<TieBreakerCriteria[]>([
    'TOTAL_POINTS', 'TOTAL_WWCD', 'TOTAL_PLACEMENT', 'ALIVE_PLAYERS', 'MATCH_KILLS', 'SLOT_RANK'
  ]);
  const [matchKillRulesByMatch, setMatchKillRulesByMatch] = useSharedState<Record<string, MatchKillRules>>(
    'BROHUBS_LEADERBOARD_MATCH_KILL_RULES',
    { '1': DEFAULT_MATCH_KILL_RULES }
  );
  const [killEventLog, setKillEventLog] = useSharedState<KillFeedEvent[]>('BROHUBS_LEADERBOARD_KILL_LOG', []);
  const [elimModalVictim, setElimModalVictim] = useState<PlayerRef | null>(null);
  const [killVictimModalFinisher, setKillVictimModalFinisher] = useState<PlayerRef | null>(null);
  const [knockAttackerModalVictim, setKnockAttackerModalVictim] = useState<PlayerRef | null>(null);

  const matchKillRules: MatchKillRules =
    matchKillRulesByMatch[String(currentMatch)] ?? DEFAULT_MATCH_KILL_RULES;

  const [isDbSelectorOpen, setIsDbSelectorOpen] = useState<{ rankIndex: number } | null>(null);
  const [dbSearch, setDbSearch] = useState('');
  const [isAutoSyncModalOpen, setIsAutoSyncModalOpen] = useState(false);
  const [autoSyncSelectedTeams, setAutoSyncSelectedTeams] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [presetOverrides, setPresetOverrides] = useSharedState<LeaderboardPresetOverrides>(
    LEADERBOARD_PRESET_OVERRIDES_STORAGE_KEY,
    {}
  );

  const { replay } = React.useContext(PreviewControlContext);

  const commitAnimationConfig = (nextConfig: AnimationConfig) => {
    setAnimationConfig(nextConfig);
    syncCompanionAnimation({
      assetId: asset.id,
      animation: resolveAnimationConfig(nextConfig, presetOverrides, LEADERBOARD_ANIMATION_PRESETS),
      presetOverrides,
    });
  };

  const handleSave = () => {
    setIsSaving(true);
    
    // Commit draft to shared state
    commitAnimationConfig(draftAnimationConfig);
    
    // Briefly delay replay to allow state to propagate
    if (replay) {
      setTimeout(() => replay(), 100);
    }
    
    // Simulate save completion for feedback
    setTimeout(() => {
      setIsSaving(false);
    }, 1500);
  };

  const triggerPreview = () => {
    setShowOverlay(false);
    setTimeout(() => setShowOverlay(true), 1000);
  };

  const [visualConfig, setVisualConfig] = useSharedState<VisualConfig>(
    'BROHUBS_LEADERBOARD_VISUAL',
    INITIAL_VISUAL_CONFIG
  );
  const [terminatorVisual, setTerminatorVisual] = useSharedState<TerminatorVisualConfig>(
    TERMINATOR_CONFIG_KEY,
    DEFAULT_TERMINATOR_VISUAL
  );
  // Baseline "0" slider offset mengikuti design Terminator yang sedang dibuka.
  const terminatorBaseline = terminatorDesignBaseline(terminatorVisual.designVariant);
  const [firstBloodVisual, setFirstBloodVisual] = useSharedState<FirstBloodVisualConfig>(
    FIRST_BLOOD_CONFIG_KEY,
    DEFAULT_FIRST_BLOOD_VISUAL
  );
  const [firstBloodAlert, setFirstBloodAlert] = useSharedState<FirstBloodAlert | null>(
    FIRST_BLOOD_ALERT_KEY,
    null
  );
  const [terminatorKillHistory, setTerminatorKillHistory] =
    useSharedState<TerminatorPlayerKillHistory>(TERMINATOR_PLAYER_KILL_HISTORY_KEY, {});
  const [activeFirstBloodTarget, setActiveFirstBloodTarget] = useState<FirstBloodTarget | null>(null);
  const [activeTerminatorTarget, setActiveTerminatorTarget] = useState<TerminatorTarget | null>(null);
  const firstBloodHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFirstBloodPreviewTokenRef = useRef(firstBloodVisual.previewToken ?? 0);
  const lastFirstBloodAlertTokenRef = useRef(firstBloodAlert?.token ?? 0);
  const firstBloodTriggeredMatchRef = useRef<number | null>(null);
  const firstBloodTotalKillsRef = useRef<number | null>(null);
  const firstBloodPlayerKillsSnapshotRef = useRef<Map<string, number>>(new Map());
  const terminatorHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTerminatorPreviewTokenRef = useRef(terminatorVisual.previewToken ?? 0);
  const triggeredTerminatorKeysRef = useRef<Set<string>>(new Set());
  const terminatorKillSnapshotRef = useRef<Map<string, { kills: number; cumulativeKills: number }>>(new Map());
  const pendingTerminatorTargetsRef = useRef<TerminatorTarget[]>([]);
  const terminatorThreshold = clampTerminatorKillThreshold(terminatorVisual.killThreshold);

  useEffect(() => {
    setTerminatorVisual((prev) => ({ ...DEFAULT_TERMINATOR_VISUAL, ...prev }));
  }, [setTerminatorVisual]);

  useEffect(() => {
    setFirstBloodVisual((prev) => {
      const merged = { ...DEFAULT_FIRST_BLOOD_VISUAL, ...prev };
      return {
        ...merged,
        accentColor:
          merged.accentColor === '#ff2d2d' ? DEFAULT_FIRST_BLOOD_VISUAL.accentColor : merged.accentColor,
        headerBg:
          merged.headerBg === '#7f1d1d' ? DEFAULT_FIRST_BLOOD_VISUAL.headerBg : merged.headerBg,
        footerBg:
          merged.footerBg === '#7f1d1d' ? DEFAULT_FIRST_BLOOD_VISUAL.footerBg : merged.footerBg,
      };
    });
  }, [setFirstBloodVisual]);

  const clearFirstBloodHideTimer = useCallback(() => {
    if (!firstBloodHideTimerRef.current) return;
    clearTimeout(firstBloodHideTimerRef.current);
    firstBloodHideTimerRef.current = null;
  }, []);

  const clearTerminatorHideTimer = useCallback(() => {
    if (!terminatorHideTimerRef.current) return;
    clearTimeout(terminatorHideTimerRef.current);
    terminatorHideTimerRef.current = null;
  }, []);

  const showFirstBloodTarget = useCallback(
    (target: FirstBloodTarget) => {
      setActiveFirstBloodTarget(target);
      clearFirstBloodHideTimer();
      firstBloodHideTimerRef.current = setTimeout(() => {
        setActiveFirstBloodTarget(null);
        firstBloodHideTimerRef.current = null;
      }, clampFirstBloodDisplaySeconds(firstBloodVisual.displaySeconds) * 1000);
    },
    [clearFirstBloodHideTimer, firstBloodVisual.displaySeconds]
  );

  const publishFirstBloodTarget = useCallback(
    (target: FirstBloodTarget) => {
      const alert: FirstBloodAlert = {
        ...target,
        match: currentMatch,
        token: Date.now(),
      };
      setFirstBloodAlert(alert);
      if (!visualOnly) {
        syncCompanionData({
          assetId: asset.id,
          data: {
            [FIRST_BLOOD_ALERT_KEY]: alert,
          },
        });
      }
    },
    [asset.id, currentMatch, setFirstBloodAlert, syncCompanionData, visualOnly]
  );

  // Key stabil per pemain per match (TANPA jumlah kill) => berfungsi sebagai
  // penanda hasTriggeredTerminator: sekali pemain memicu Terminator di match ini,
  // kill berikutnya (6, 7, 8, dst) tidak akan memicu ulang. Set ini di-reset saat
  // match/threshold berganti (lihat effect di bawah).
  const terminatorTargetKey = useCallback(
    (target: TerminatorTarget) =>
      `match-${currentMatch}:${terminatorThreshold}:${target.team}:${target.player}`,
    [currentMatch, terminatorThreshold]
  );

  const terminatorSnapshotKey = useCallback(
    (target: TerminatorTarget) => `${target.team}:${target.player}`,
    []
  );

  const showTerminatorTarget = useCallback(
    (target: TerminatorTarget) => {
      setActiveTerminatorTarget(target);
      clearTerminatorHideTimer();
      terminatorHideTimerRef.current = setTimeout(() => {
        setActiveTerminatorTarget(null);
        terminatorHideTimerRef.current = null;
      }, clampTerminatorDisplaySeconds(terminatorVisual.displaySeconds) * 1000);
    },
    [clearTerminatorHideTimer, terminatorVisual.displaySeconds]
  );

  useEffect(() => () => clearTerminatorHideTimer(), [clearTerminatorHideTimer]);
  useEffect(() => () => clearFirstBloodHideTimer(), [clearFirstBloodHideTimer]);

  const liveTerminatorTargets = useMemo(
    () =>
      collectLeaderboardTerminatorTargets(
        teams,
        projectPlayers,
        terminatorKillHistory
      ),
    [teams, terminatorThreshold, projectPlayers, terminatorKillHistory]
  );

  useEffect(() => {
    liveTerminatorTargets.forEach((target) => preloadTerminatorImage(target.image));
  }, [liveTerminatorTargets]);

  useEffect(() => {
    if (activeFirstBloodTarget) preloadFirstBloodImage(activeFirstBloodTarget.image);
  }, [activeFirstBloodTarget]);

  useEffect(() => {
    const nextSnapshot = new Map<string, number>();
    let nextTotalKills = 0;
    let firstIncreasedRef: PlayerRef | null = null;

    teams.forEach((team, teamIndex) => {
      team.playerKills.forEach((rawKills, playerIndex) => {
        const kills = Math.max(0, Number(rawKills ?? 0));
        const key = `${teamIndex}:${playerIndex}`;
        const previousKills = firstBloodPlayerKillsSnapshotRef.current.get(key) ?? 0;
        if (!firstIncreasedRef && kills > previousKills) {
          firstIncreasedRef = { teamIndex, playerIndex };
        }
        nextSnapshot.set(key, kills);
        nextTotalKills += kills;
      });
    });

    const previousTotalKills = firstBloodTotalKillsRef.current;
    firstBloodPlayerKillsSnapshotRef.current = nextSnapshot;
    firstBloodTotalKillsRef.current = nextTotalKills;

    if (previousTotalKills === null) return;
    if (!firstBloodVisual.enabled || firstBloodVisual.previewHold) return;
    if (firstBloodTriggeredMatchRef.current === currentMatch) return;
    if (previousTotalKills !== 0 || nextTotalKills <= 0 || !firstIncreasedRef) return;

    const target = buildFirstBloodTarget(teams, projectPlayers, firstIncreasedRef);
    if (!target) return;
    firstBloodTriggeredMatchRef.current = currentMatch;
    publishFirstBloodTarget(target);
  }, [
    currentMatch,
    firstBloodVisual.enabled,
    firstBloodVisual.previewHold,
    publishFirstBloodTarget,
    projectPlayers,
    teams,
  ]);

  useEffect(() => {
    triggeredTerminatorKeysRef.current.clear();
    terminatorKillSnapshotRef.current.clear();
    pendingTerminatorTargetsRef.current = [];
    clearTerminatorHideTimer();
    setActiveTerminatorTarget(null);
  }, [currentMatch, terminatorThreshold, clearTerminatorHideTimer]);

  useEffect(() => {
    firstBloodTriggeredMatchRef.current = null;
    firstBloodTotalKillsRef.current = null;
    firstBloodPlayerKillsSnapshotRef.current.clear();
    clearFirstBloodHideTimer();
    setActiveFirstBloodTarget(null);
  }, [currentMatch, clearFirstBloodHideTimer]);

  useEffect(() => {
    if (!terminatorVisual.enabled || terminatorVisual.previewHold || liveTerminatorTargets.length === 0) {
      return;
    }
    const nextTargets = liveTerminatorTargets.filter((target) => {
      const snapshotKey = terminatorSnapshotKey(target);
      const previous = terminatorKillSnapshotRef.current.get(snapshotKey);
      terminatorKillSnapshotRef.current.set(snapshotKey, {
        kills: target.kills,
        cumulativeKills: target.cumulativeKills,
      });

      if (!previous) return false;
      const hasNewKill = target.kills > previous.kills || target.cumulativeKills > previous.cumulativeKills;
      if (!hasNewKill || target.kills <= 0 || target.cumulativeKills < terminatorThreshold) return false;

      const key = terminatorTargetKey(target);
      if (triggeredTerminatorKeysRef.current.has(key)) return false;
      triggeredTerminatorKeysRef.current.add(key);
      return true;
    });
    if (nextTargets.length === 0) return;

    pendingTerminatorTargetsRef.current.push(...nextTargets);
    if (!activeTerminatorTarget && !terminatorHideTimerRef.current) {
      const nextTarget = pendingTerminatorTargetsRef.current.shift();
      if (nextTarget) showTerminatorTarget(nextTarget);
    }
  }, [
    activeTerminatorTarget,
    liveTerminatorTargets,
    showTerminatorTarget,
    terminatorSnapshotKey,
    terminatorTargetKey,
    terminatorThreshold,
    terminatorVisual.enabled,
    terminatorVisual.previewHold,
  ]);

  useEffect(() => {
    if (activeTerminatorTarget || terminatorVisual.previewHold || !terminatorVisual.enabled) return;
    const nextTarget = pendingTerminatorTargetsRef.current.shift();
    if (nextTarget) showTerminatorTarget(nextTarget);
  }, [activeTerminatorTarget, showTerminatorTarget, terminatorVisual.enabled, terminatorVisual.previewHold]);

  useEffect(() => {
    const previewToken = terminatorVisual.previewToken ?? 0;
    if (!previewToken || lastTerminatorPreviewTokenRef.current === previewToken) return;
    lastTerminatorPreviewTokenRef.current = previewToken;
    showTerminatorTarget(TERMINATOR_PREVIEW_TARGET);
  }, [showTerminatorTarget, terminatorVisual.previewToken]);

  useEffect(() => {
    const previewToken = firstBloodVisual.previewToken ?? 0;
    if (!previewToken || lastFirstBloodPreviewTokenRef.current === previewToken) return;
    lastFirstBloodPreviewTokenRef.current = previewToken;
    showFirstBloodTarget(FIRST_BLOOD_PREVIEW_TARGET);
  }, [firstBloodVisual.previewToken, showFirstBloodTarget]);

  useEffect(() => {
    const token = firstBloodAlert?.token ?? 0;
    if (!firstBloodAlert || !token || lastFirstBloodAlertTokenRef.current === token) return;
    lastFirstBloodAlertTokenRef.current = token;
    if (firstBloodAlert.match !== currentMatch) return;
    showFirstBloodTarget(enrichFirstBloodTarget(firstBloodAlert, teams, projectPlayers));
  }, [currentMatch, firstBloodAlert, projectPlayers, showFirstBloodTarget, teams]);

  useEffect(() => {
    if (visualOnly) return;
    syncCompanionData({
      assetId: asset.id,
      data: {
        [FIRST_BLOOD_ALERT_KEY]: firstBloodAlert,
        [FIRST_BLOOD_CONFIG_KEY]: firstBloodVisual,
        [TERMINATOR_CONFIG_KEY]: terminatorVisual,
        [TERMINATOR_PLAYER_KILL_HISTORY_KEY]: terminatorKillHistory,
      },
    });
  }, [asset.id, firstBloodAlert, firstBloodVisual, syncCompanionData, terminatorKillHistory, terminatorVisual, visualOnly]);

  const elimBannerVisual = useMemo(
    () => pickEliminationBannerVisual(visualConfig),
    [visualConfig]
  );

  const elimBannerTypography = useMemo(
    () => resolveEliminationBannerTypography(elimBannerVisual),
    [elimBannerVisual]
  );
  const elimBannerTypographyUiOffset = useMemo(
    () => ({
      eliminated:
        elimBannerTypography.eliminated - DEFAULT_ELIMINATION_BANNER_TYPOGRAPHY.eliminated,
      placement:
        elimBannerTypography.placement - DEFAULT_ELIMINATION_BANNER_TYPOGRAPHY.placement,
      tag: elimBannerTypography.tag - DEFAULT_ELIMINATION_BANNER_TYPOGRAPHY.tag,
    }),
    [elimBannerTypography]
  );

  const elimBannerFontFamilyId = useMemo(
    () => resolveEliminationBannerFontFamilyId(elimBannerVisual.elimBannerFontFamily),
    [elimBannerVisual.elimBannerFontFamily]
  );

  useEffect(() => {
    setVisualConfig((prev) => {
      const needsElimMerge = (
        Object.keys(DEFAULT_ELIMINATION_BANNER_VISUAL) as (keyof EliminationBannerVisual)[]
      ).some((k) => (prev as VisualConfig)[k] === undefined);
      const needsLeaderboardBgMerge = LEADERBOARD_BG_IMAGE_KEYS.some(
        (k) => (prev as VisualConfig)[k] === undefined
      );
      const needsLeaderboardModeMerge =
        (prev as VisualConfig).leaderboardDesignMode === undefined;
      const needsFinalFourMerge =
        (prev as VisualConfig).finalFourDesignMode === undefined;
      if (
        !needsElimMerge &&
        !needsLeaderboardBgMerge &&
        !needsLeaderboardModeMerge &&
        !needsFinalFourMerge
      ) {
        return prev;
      }
      return { ...INITIAL_VISUAL_CONFIG, ...prev };
    });
  }, [setVisualConfig]);

  const handleFinalFourCardImageUpload = (file: File | undefined) => {
    if (!file) return;
    void compressImage(file, BACKGROUND_PRESET).then((result) => {
      setVisualConfig((prev) => ({ ...prev, finalFourCardBgImage: result }));
    });
  };

  const patchTerminatorVisual = <K extends keyof TerminatorVisualConfig>(
    key: K,
    value: TerminatorVisualConfig[K]
  ) => {
    setTerminatorVisual((prev) => ({ ...prev, [key]: value }));
  };

  const patchFirstBloodVisual = <K extends keyof FirstBloodVisualConfig>(
    key: K,
    value: FirstBloodVisualConfig[K]
  ) => {
    setFirstBloodVisual((prev) => ({ ...prev, [key]: value }));
  };

  const resetFirstBloodToPreset = useCallback(() => {
    setFirstBloodVisual((prev) => {
      const activePreset = FIRST_BLOOD_VISUAL_PRESETS.find(
        (p) => p.config.designVariant === prev.designVariant
      );
      const base = activePreset
        ? { ...DEFAULT_FIRST_BLOOD_VISUAL, ...activePreset.config }
        : DEFAULT_FIRST_BLOOD_VISUAL;
      return {
        ...base,
        enabled: prev.enabled,
        displaySeconds: prev.displaySeconds,
        previewHold: false,
        previewToken: prev.previewToken,
      };
    });
  }, [setFirstBloodVisual]);

  const resetFirstBloodLayout = useCallback(() => {
    setFirstBloodVisual((prev) => {
      const activePreset = FIRST_BLOOD_VISUAL_PRESETS.find(
        (p) => p.config.designVariant === prev.designVariant
      );
      const base = activePreset
        ? { ...DEFAULT_FIRST_BLOOD_VISUAL, ...activePreset.config }
        : DEFAULT_FIRST_BLOOD_VISUAL;
      return {
        ...prev,
        scale: base.scale,
        x: base.x,
        y: base.y,
        playerImageX: base.playerImageX,
        playerImageY: base.playerImageY,
        playerImageScale: base.playerImageScale,
      };
    });
  }, [setFirstBloodVisual]);

  const resetFirstBloodColors = useCallback(() => {
    setFirstBloodVisual((prev) => {
      const activePreset = FIRST_BLOOD_VISUAL_PRESETS.find(
        (p) => p.config.designVariant === prev.designVariant
      );
      const base = activePreset
        ? { ...DEFAULT_FIRST_BLOOD_VISUAL, ...activePreset.config }
        : DEFAULT_FIRST_BLOOD_VISUAL;
      return {
        ...prev,
        headerBg: base.headerBg,
        bodyBg: base.bodyBg,
        footerBg: base.footerBg,
        accentColor: base.accentColor,
        textColor: base.textColor,
        mutedTextColor: base.mutedTextColor,
        assetPaletteOverride: base.assetPaletteOverride ?? [...BROADCAST_CUT_ORIGINAL_PALETTE],
      };
    });
  }, [setFirstBloodVisual]);

  // Baseline slider per design variant: tiap variant (mis. Hero Split vs
  // Broadcast Cut) punya "titik nol" sendiri, jadi offset UI baca 0 di default
  // masing-masing.
  const firstBloodLayoutBaseline = useMemo(
    () => getFirstBloodLayoutBaseline(firstBloodVisual.designVariant),
    [firstBloodVisual.designVariant]
  );

  const previewTerminatorBanner = () => {
    setTerminatorVisual((prev) => ({
      ...prev,
      previewToken: Date.now(),
    }));
  };

  const previewFirstBloodBanner = () => {
    setFirstBloodVisual((prev) => ({
      ...prev,
      previewToken: Date.now(),
    }));
  };

  const appendTerminatorMatchKillsToHistory = (matchTeams: Team[]) => {
    setTerminatorKillHistory((prev) => {
      const next = { ...prev };
      matchTeams.forEach((team) => {
        team.playerNames.forEach((name, playerIndex) => {
          const playerName = name?.trim();
          const kills = Number(team.playerKills[playerIndex] ?? 0);
          if (!playerName || kills <= 0) return;
          const key = terminatorPlayerKey(team.team, playerName);
          next[key] = (next[key] ?? 0) + kills;
        });
      });
      return next;
    });
  };

  const handleElimBannerImageUpload = (
    key: EliminationBannerImageKey,
    file: File | undefined
  ) => {
    if (!file) return;
    void compressImage(file, BACKGROUND_PRESET).then((result) => {
      setVisualConfig((prev) => ({ ...prev, [key]: result }));
    });
  };

  const handleLeaderboardBgImageUpload = (
    key: LeaderboardBgImageKey,
    file: File | undefined
  ) => {
    if (!file) return;
    void compressImage(file, BACKGROUND_PRESET).then((result) => {
      setVisualConfig((prev) => ({ ...prev, [key]: result }));
    });
  };

  const fullLayout =
    elimBannerVisual.elimBannerFullLayout ?? DEFAULT_ELIMINATION_BANNER_FULL_LAYOUT;

  const [layoutConfig, setLayoutConfig] = useSharedState<LayoutConfig>(
    'BROHUBS_LEADERBOARD_LAYOUT',
    getDefaultLeaderboardLayout(true)
  );

  const defaultLayoutConfig = useMemo(
    () => getDefaultLeaderboardLayout(visualConfig.showFlags),
    [visualConfig.showFlags]
  );

  const leaderboardPanelWidth = useMemo(
    () =>
      resolveLeaderboardPanelWidth(
        layoutConfig.panelWidth,
        visualConfig.showFlags
      ),
    [layoutConfig.panelWidth, visualConfig.showFlags]
  );

  const toggleLeaderboardFlags = useCallback(() => {
    const nextShowFlags = !visualConfig.showFlags;
    setVisualConfig((v) => ({ ...v, showFlags: nextShowFlags }));
    setLayoutConfig((lc) => ({
      ...lc,
      panelWidth: leaderboardPanelWidthForFlags(nextShowFlags),
    }));
  }, [visualConfig.showFlags, setVisualConfig, setLayoutConfig]);

  useEffect(() => {
    setLayoutConfig((prev) => {
      const legacyDefaults = [420, 350, 400, 360];
      const needsFlagWidth =
        prev.panelWidth === undefined || legacyDefaults.includes(prev.panelWidth);
      if (!needsFlagWidth) return prev;
      return {
        ...prev,
        panelWidth: leaderboardPanelWidthForFlags(visualConfig.showFlags),
      };
    });
  }, [setLayoutConfig, visualConfig.showFlags]);

  useEffect(() => {
    setLayoutConfig((prev) => {
      const wasOldDefault =
        prev.scale === 80 &&
        prev.xOffset === -40 &&
        prev.yOffset === 75 &&
        prev.rowHeight === 52 &&
        prev.logoSize === 32 &&
        prev.flagWidth === 24;

      if (!wasOldDefault) return prev;
      return {
        ...getDefaultLeaderboardLayout(visualConfig.showFlags),
        panelWidth: prev.panelWidth ?? leaderboardPanelWidthForFlags(visualConfig.showFlags),
        fontFamilyId: prev.fontFamilyId ?? DEFAULT_OVERLAY_FONT_FAMILY_ID,
      };
    });
  }, [setLayoutConfig, visualConfig.showFlags]);

  const leaderboardFontFamily = useMemo(
    () =>
      getOverlayFontCssFamily(
        resolveOverlayFontFamilyId(layoutConfig.fontFamilyId)
      ),
    [layoutConfig.fontFamilyId]
  );

  const [elimBannerLayout, setElimBannerLayout] = useSharedState<EliminationBannerLayout>(
    'BROHUBS_ELIMINATION_BANNER_LAYOUT',
    DEFAULT_ELIMINATION_BANNER_LAYOUT
  );

  const [finalFourLayout, setFinalFourLayout] = useSharedState<FinalFourLayoutConfig>(
    'BROHUBS_FINAL_FOUR_LAYOUT',
    DEFAULT_FINAL_FOUR_LAYOUT
  );

  useEffect(() => {
    setFinalFourLayout((prev) => {
      const needsMerge = (
        Object.keys(DEFAULT_FINAL_FOUR_LAYOUT) as (keyof FinalFourLayoutConfig)[]
      ).some((k) => prev[k] === undefined);
      if (!needsMerge) return prev;
      return { ...DEFAULT_FINAL_FOUR_LAYOUT, ...prev };
    });
  }, [setFinalFourLayout]);

  const finalFourFontFamily = useMemo(
    () =>
      getOverlayFontCssFamily(
        resolveOverlayFontFamilyId(finalFourLayout.fontFamilyId)
      ),
    [finalFourLayout.fontFamilyId]
  );
  const elimBannerLayoutRef = useRef(elimBannerLayout);
  useEffect(() => {
    elimBannerLayoutRef.current = elimBannerLayout;
  }, [elimBannerLayout]);

  const [animationConfig, setAnimationConfig] = useSharedState<AnimationConfig>(
    LEADERBOARD_ANIMATION_STORAGE_KEY,
    LEADERBOARD_DEFAULT_ANIMATION
  );

  const [draftAnimationConfig, setDraftAnimationConfig] = useState<AnimationConfig>(animationConfig);

  // Sync draft when shared state changes (from another operator or initial load)
  useEffect(() => {
    setDraftAnimationConfig(animationConfig);
  }, [animationConfig]);

  const effectiveAnimationConfig = useMemo(
    () => resolveAnimationConfig(animationConfig, presetOverrides, LEADERBOARD_ANIMATION_PRESETS),
    [animationConfig, presetOverrides]
  );

  // Push transition settings to OBS / output links (separate browser storage)
  useEffect(() => {
    if (visualOnly) return;
    syncCompanionAnimation({
      assetId: asset.id,
      animation: effectiveAnimationConfig,
      presetOverrides,
    });
  }, [asset.id, effectiveAnimationConfig, presetOverrides, visualOnly]);

  const [sharedProgramVisible] = useSharedState<boolean>(
    LEADERBOARD_PROGRAM_VISIBLE_KEY,
    true
  );
  const [controlShowOverlay, setControlShowOverlay] = useState(true);
  const isProgramDrivenFeed = programFeed ?? (visualOnly && !monitorFeed);
  const showOverlay =
    visualOnly || monitorFeed
      ? isProgramDrivenFeed
        ? sharedProgramVisible
        : true
      : controlShowOverlay;
  const setShowOverlay = setControlShowOverlay;
  const [internalProgramAssetId, setInternalProgramAssetId] = useState<string | null>(null);
  
  const programAssetId = programAssetIdProp !== undefined ? programAssetIdProp : internalProgramAssetId;
  const setProgramAssetId = (id: string | null) => {
    if (onProgramAssetChange) onProgramAssetChange(id);
    else setInternalProgramAssetId(id);
  };

  // Reactive Sync
  const teamsRef = useRef(teams);
  useEffect(() => { teamsRef.current = teams; }, [teams]);

  useEffect(() => {
    if (!projectPlayers || projectPlayers.length === 0) return;

    // Only sync if teams are using default names
    const isDefault = teams.every(t => t.team.startsWith('TEAM'));
    if (!isDefault) return;

    const currentTeams = teamsRef.current;
    
    let needsSync = false;
    const newTeams = currentTeams.map(team => {
        const teamNorm = team.team.trim().toLowerCase();
        const teamPlayers = teamNorm
          ? projectPlayers.filter(p => p.team.trim().toLowerCase() === teamNorm)
          : [];
        if (teamPlayers.length === 0) return team;
        
        const newNames = [
            teamPlayers[0]?.name || team.playerNames[0] || 'P1',
            teamPlayers[1]?.name || team.playerNames[1] || 'P2',
            teamPlayers[2]?.name || team.playerNames[2] || 'P3',
            teamPlayers[3]?.name || team.playerNames[3] || 'P4'
        ];
        const newImages = buildPlayerImagesFromProjectPlayers(teamPlayers, newNames);

        const newLogo = teamPlayers[0].teamLogo || team.teamLogo;
        const newCountry = teamPlayers[0].country || team.country;
        const newAbbreviation = (
          teamPlayers[0].teamAbbreviation?.trim() || deriveTeamAbbreviation(team.team)
        ).toUpperCase();
        
        // Only update if difference exists
        if (team.teamLogo === newLogo && 
            team.country === newCountry &&
            team.teamAbbreviation === newAbbreviation &&
            JSON.stringify(team.playerNames) === JSON.stringify(newNames) &&
            JSON.stringify(team.playerImages || []) === JSON.stringify(newImages)
        ) return team;

        needsSync = true;
        return {
            ...team,
            teamLogo: newLogo,
            country: newCountry,
            teamAbbreviation: newAbbreviation,
            playerNames: newNames,
            playerImages: newImages
        };
    });

    if (needsSync) {
        setTeams(newTeams);
    }
  }, [projectPlayers]);

  useEffect(() => {
    setTeams((prev) => {
      const next = prev.map((team) => {
        const withAbbr = ensureTeamAbbreviation(team, projectPlayers);
        const withFinish =
          withAbbr.playerFinishCredit?.length === withAbbr.status.length
            ? withAbbr
            : { ...withAbbr, playerFinishCredit: createEmptyCredits(withAbbr) };
        if (withFinish.playerKnockCredit?.length === withFinish.status.length) return withFinish;
        return { ...withFinish, playerKnockCredit: createEmptyCredits(withFinish) };
      });
      const changed = next.some(
        (team, index) =>
          team.teamAbbreviation !== prev[index]?.teamAbbreviation ||
          !prev[index]?.playerFinishCredit ||
          !prev[index]?.playerKnockCredit
      );
      return changed ? next : prev;
    });
  }, [projectPlayers]);

  // Persistence Effects removed as useSharedState handles it

  useEffect(() => {
    return () => {
      if (eliminationClearTimerRef.current) {
        clearTimeout(eliminationClearTimerRef.current);
      }
      if (finalFourSoloExitTimerRef.current) {
        clearTimeout(finalFourSoloExitTimerRef.current);
      }
    };
  }, []);

  const aliveTeams = teams.filter((t) => t.active && !t.status.every((s) => s === 0));
  const aliveCount = aliveTeams.length;
  const teamsInContention = getTeamsInContention(teams);
  const contentionCount = teamsInContention.length;
  /** Tim masih di match ini (belum placement, belum full elim) */
  const survivingMatchTeams = useMemo(
    () =>
      teams.filter(
        (t) =>
          t.active &&
          t.placementRank === null &&
          !t.status.every((s) => s === 0)
      ),
    [teams]
  );
  const survivingMatchCount = survivingMatchTeams.length;

  /** Fase endgame (≤4 tim): panel kanan OUT bersamaan dengan bar Final Four IN. */
  const isEndgamePhase = isEndgameTopOverlayCount(survivingMatchCount);
  const showOverallRankingPanel = showOverlay && !isEndgamePhase && !finalFourHoldPreview;
  /** Bar WWCD atas — saat 1 tim: tahan lalu transisi keluar.
   *  Preview Sementara mengabaikan toggle overlay (sama seperti preview
   *  Elimination Banner & Terminator); jalur match asli tetap hormati showOverlay. */
  const showFinalFourTopBar =
    finalFourHoldPreview || (showOverlay && isEndgamePhase && finalFourTopBarVisible);

  const soloExitDelayMs = resolveFinalFourSoloExitDelayMs(finalFourLayout.soloExitDelayMs);

  useEffect(() => {
    if (finalFourHoldPreview) return;

    if (finalFourSoloExitTimerRef.current) {
      clearTimeout(finalFourSoloExitTimerRef.current);
      finalFourSoloExitTimerRef.current = null;
    }

    if (!isEndgamePhase) {
      setFinalFourTopBarVisible(false);
      return;
    }

    if (survivingMatchCount === 1) {
      setFinalFourTopBarVisible(true);
      finalFourSoloExitTimerRef.current = setTimeout(() => {
        setFinalFourTopBarVisible(false);
        finalFourSoloExitTimerRef.current = null;
      }, soloExitDelayMs);
      return;
    }

    setFinalFourTopBarVisible(true);
  }, [isEndgamePhase, survivingMatchCount, soloExitDelayMs, finalFourHoldPreview]);
  /** Bisa lanjut match berikutnya jika tersisa ≤2 tim tanpa placement (WWCD / top 2) */
  const isMatchReadyToEnd = contentionCount <= 2;
  const matchWinnerCandidate = useMemo(() => {
    if (teamsInContention.length === 0) return null;
    return [...teamsInContention].sort(
      (a, b) => totalTeamKills(b) - totalTeamKills(a)
    )[0];
  }, [teams]);
  const matchRunnerUp = useMemo(() => {
    if (teamsInContention.length < 2) return null;
    return [...teamsInContention].sort(
      (a, b) => totalTeamKills(b) - totalTeamKills(a)
    )[1];
  }, [teams]);

  const pushEliminationToCompanion = useCallback(
    (alert: TeamEliminationAlert | null) => {
      if (visualOnly) return;
      syncCompanionData({
        assetId: asset.id,
        data: { [TEAM_ELIMINATION_ALERT_KEY]: alert },
      });
    },
    [asset.id, visualOnly]
  );

  const playNextEliminationBanner = useCallback(() => {
    if (eliminationShowingRef.current) return;
    const next = eliminationQueueRef.current.shift();
    if (!next) return;

    eliminationShowingRef.current = true;
    setEliminationAlert(next);
    pushEliminationToCompanion(next);

    setActivePopups((prev) =>
      prev.includes(next.teamRank) ? prev : [...prev, next.teamRank]
    );
    setTimeout(() => {
      setActivePopups((prev) => prev.filter((r) => r !== next.teamRank));
    }, ELIMINATED_POPUP_HOLD_MS);

    if (eliminationClearTimerRef.current) {
      clearTimeout(eliminationClearTimerRef.current);
    }
    eliminationClearTimerRef.current = setTimeout(() => {
      setEliminationAlert(null);
      pushEliminationToCompanion(null);
      eliminationShowingRef.current = false;
      if (eliminationQueueRef.current.length > 0) {
        playNextEliminationBanner();
      }
    }, 5500);
  }, [pushEliminationToCompanion, setEliminationAlert]);

  const buildTeamEliminationAlert = useCallback(
    (teamIndex: number, placementRank: number, teamsSnapshot: Team[]): TeamEliminationAlert | null => {
      const team = teamsSnapshot[teamIndex];
      if (!team) return null;

      const withAbbr = ensureTeamAbbreviation(team, projectPlayers);
      const dbPlayer = findProjectTeamPlayer(projectPlayers, withAbbr.team);

      return {
        id: createEventId(),
        teamIndex,
        placementRank,
        teamRank: withAbbr.rank,
        teamLabel: getLeaderboardTeamLabel(withAbbr, projectPlayers),
        teamName: withAbbr.team,
        teamLogo: dbPlayer?.teamLogo?.trim() || withAbbr.teamLogo?.trim() || '',
        country: dbPlayer?.country || withAbbr.country,
        at: Date.now(),
      };
    },
    [projectPlayers]
  );

  const queueTeamEliminationBanner = useCallback(
    (teamIndex: number, placementRank: number, teamsSnapshot: Team[]) => {
      const dedupeKey = `${teamIndex}-${placementRank}`;
      if (seenEliminationsRef.current.has(dedupeKey)) return;
      seenEliminationsRef.current.add(dedupeKey);

      const survivingAfter = teamsSnapshot.filter(
        (t) =>
          t.active &&
          t.placementRank === null &&
          !t.status.every((s) => s === 0)
      ).length;
      if (isEndgameTopOverlayCount(survivingAfter)) {
        return;
      }

      const alert = buildTeamEliminationAlert(teamIndex, placementRank, teamsSnapshot);
      if (!alert) return;

      eliminationQueueRef.current.push(alert);
      playNextEliminationBanner();
    },
    [buildTeamEliminationAlert, playNextEliminationBanner]
  );

  const [elimBannerHoldPreview, setElimBannerHoldPreview] = useState(false);
  const elimBannerHoldPreviewPrevRef = useRef(false);
  const stagedElimCompanionPushedRef = useRef(false);
  const [elimBannerTuningActive, setElimBannerTuningActive] = useState(false);
  const elimBannerWheelTuningRef = useRef(false);
  const elimBannerFocusTuningRef = useRef(false);
  const elimBannerTuningLiveRef = useRef<EliminationBannerLayout>(DEFAULT_ELIMINATION_BANNER_LAYOUT);
  const stagedCompanionPushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [frozenStagedElimAlert, setFrozenStagedElimAlert] = useState<TeamEliminationAlert | null>(
    null
  );

  const syncElimBannerTuningActive = useCallback(() => {
    setElimBannerTuningActive(
      elimBannerWheelTuningRef.current || elimBannerFocusTuningRef.current
    );
  }, []);

  const pushStagedElimBannerToCompanion = useCallback(() => {
    if (visualOnly || !elimBannerHoldPreview) return;
    const stagedAlert =
      frozenStagedElimAlert ??
      (eliminationAlert?.id === STAGED_ELIM_PREVIEW_ALERT_ID ? eliminationAlert : null) ??
      STAGED_ELIM_PREVIEW_FALLBACK;
    syncCompanionData({
      assetId: asset.id,
      data: {
        BROHUBS_ELIMINATION_BANNER_LAYOUT: elimBannerTuningLiveRef.current,
        BROHUBS_LEADERBOARD_VISUAL: visualConfig,
        [TEAM_ELIMINATION_ALERT_KEY]: stagedAlert,
      },
    });
  }, [
    asset.id,
    visualOnly,
    elimBannerHoldPreview,
    visualConfig,
    frozenStagedElimAlert,
    eliminationAlert,
  ]);

  const scheduleStagedElimBannerCompanionPush = useCallback(() => {
    if (visualOnly || !elimBannerHoldPreview) return;
    if (stagedCompanionPushTimerRef.current) return;
    stagedCompanionPushTimerRef.current = setTimeout(() => {
      stagedCompanionPushTimerRef.current = null;
      pushStagedElimBannerToCompanion();
    }, 120);
  }, [visualOnly, elimBannerHoldPreview, pushStagedElimBannerToCompanion]);

  const mutateElimBannerVisualDraft = useCallback(
    (mutate: (picked: EliminationBannerVisual) => EliminationBannerVisual) => {
      setVisualConfig((prev) => {
        const base = pickEliminationBannerVisual(prev);
        const next = mutate(base);
        return {
          ...prev,
          ...next,
          elimBannerTypography: next.elimBannerTypography,
          elimBannerFullLayout: next.elimBannerFullLayout,
        };
      });
      scheduleStagedElimBannerCompanionPush();
    },
    [setVisualConfig, scheduleStagedElimBannerCompanionPush]
  );

  const patchElimBannerVisualField = useCallback(
    <K extends keyof EliminationBannerVisual>(key: K, value: EliminationBannerVisual[K]) => {
      if (elimBannerHoldPreview) {
        mutateElimBannerVisualDraft((picked) => ({ ...picked, [key]: value }));
        return;
      }
      setVisualConfig((prev) => ({ ...prev, [key]: value }));
    },
    [elimBannerHoldPreview, mutateElimBannerVisualDraft, setVisualConfig]
  );

  const resetElimBannerColorsToDefault = useCallback(() => {
    if (elimBannerHoldPreview) {
      mutateElimBannerVisualDraft((picked) => {
        const next = { ...picked };
        ELIMINATION_BANNER_COLOR_KEYS.forEach((key) => {
          next[key] = DEFAULT_ELIMINATION_BANNER_VISUAL[key];
        });
        return next;
      });
      return;
    }
    setVisualConfig((prev) => {
      const next = { ...prev };
      ELIMINATION_BANNER_COLOR_KEYS.forEach((key) => {
        next[key] = DEFAULT_ELIMINATION_BANNER_VISUAL[key];
      });
      return next;
    });
  }, [elimBannerHoldPreview, mutateElimBannerVisualDraft, setVisualConfig]);

  const clearPreviewEliminationState = useCallback(() => {
    setEliminationAlert(null);
    pushEliminationToCompanion(null);
    if (eliminationClearTimerRef.current) {
      clearTimeout(eliminationClearTimerRef.current);
      eliminationClearTimerRef.current = null;
    }
  }, [pushEliminationToCompanion, setEliminationAlert]);

  const buildStagedElimPreviewAlert = useCallback((): TeamEliminationAlert => {
    if (teams.length === 0) return { ...STAGED_ELIM_PREVIEW_FALLBACK };
    const teamIndex = teams.findIndex((t) => t.active && !t.status.every((s) => s === 0));
    const idx = teamIndex >= 0 ? teamIndex : 0;
    const team = teams[idx];
    if (!team) return { ...STAGED_ELIM_PREVIEW_FALLBACK };
    const placementRank =
      team.placementRank ?? Math.min(16, Math.max(1, 17 - (team.rank || idx + 1)));
    const alert = buildTeamEliminationAlert(idx, placementRank, teams);
    if (!alert) return { ...STAGED_ELIM_PREVIEW_FALLBACK };
    return { ...alert, id: STAGED_ELIM_PREVIEW_ALERT_ID, at: 0 };
  }, [buildTeamEliminationAlert, teams]);

  const setElimBannerHoldPreviewSafe = useCallback(
    (on: boolean) => {
      if (on) {
        if (eliminationClearTimerRef.current) {
          clearTimeout(eliminationClearTimerRef.current);
          eliminationClearTimerRef.current = null;
        }
        const stagedAlert = buildStagedElimPreviewAlert();
        elimBannerTuningLiveRef.current = { ...elimBannerLayout };
        stagedElimCompanionPushedRef.current = true;
        setFrozenStagedElimAlert(stagedAlert);
        setEliminationAlert(stagedAlert);
        setElimBannerHoldPreview(true);
        if (!visualOnly) {
          pushEliminationToCompanion(stagedAlert);
          syncCompanionData({
            assetId: asset.id,
            data: {
              BROHUBS_ELIMINATION_BANNER_LAYOUT: elimBannerLayout,
              BROHUBS_LEADERBOARD_VISUAL: visualConfig,
              [TEAM_ELIMINATION_ALERT_KEY]: stagedAlert,
            },
          });
        }
        return;
      }
      if (stagedCompanionPushTimerRef.current) {
        clearTimeout(stagedCompanionPushTimerRef.current);
        stagedCompanionPushTimerRef.current = null;
      }
      elimBannerWheelTuningRef.current = false;
      elimBannerFocusTuningRef.current = false;
      setElimBannerTuningActive(false);
      stagedElimCompanionPushedRef.current = false;
      setElimBannerHoldPreview(false);
      clearPreviewEliminationState();
    },
    [
      buildStagedElimPreviewAlert,
      clearPreviewEliminationState,
      pushEliminationToCompanion,
      setEliminationAlert,
      asset.id,
      elimBannerLayout,
      visualConfig,
      visualOnly,
    ]
  );

  const effectiveElimBannerLayout = elimBannerLayout;
  const elimBannerLayoutUiOffset = useMemo(
    () => ({
      scale: effectiveElimBannerLayout.scale - DEFAULT_ELIMINATION_BANNER_LAYOUT.scale,
      xOffset: effectiveElimBannerLayout.xOffset - DEFAULT_ELIMINATION_BANNER_LAYOUT.xOffset,
      yOffset: effectiveElimBannerLayout.yOffset - DEFAULT_ELIMINATION_BANNER_LAYOUT.yOffset,
    }),
    [
      effectiveElimBannerLayout.scale,
      effectiveElimBannerLayout.xOffset,
      effectiveElimBannerLayout.yOffset,
    ]
  );

  useEffect(() => {
    if (!elimBannerHoldPreview) {
      setFrozenStagedElimAlert(null);
    }
  }, [elimBannerHoldPreview]);

  const displayElimAlert = elimBannerHoldPreview
    ? (frozenStagedElimAlert ?? STAGED_ELIM_PREVIEW_FALLBACK)
    : eliminationAlert;

  const showEliminationBanner =
    elimBannerHoldPreview || (!isEndgamePhase && displayElimAlert !== null);

  useEffect(() => {
    if (!isEndgamePhase || elimBannerHoldPreview) return;
    if (eliminationClearTimerRef.current) {
      clearTimeout(eliminationClearTimerRef.current);
      eliminationClearTimerRef.current = null;
    }
    eliminationShowingRef.current = false;
    eliminationQueueRef.current = [];
    setEliminationAlert(null);
    pushEliminationToCompanion(null);
  }, [
    isEndgamePhase,
    elimBannerHoldPreview,
    pushEliminationToCompanion,
    setEliminationAlert,
  ]);

  const isElimBannerTuningPreview =
    elimBannerHoldPreview ||
    eliminationAlert?.id === STAGED_ELIM_PREVIEW_ALERT_ID;
  const elimBannerIsPanelsMode = visualConfig.elimBannerDesignMode !== 'full';
  const elimBannerPanelSwitchLocked = elimBannerHoldPreview && !elimBannerIsPanelsMode;
  const elimBannerCustomSwitchLocked = elimBannerHoldPreview && elimBannerIsPanelsMode;
  const elimBannerCustomVariant = visualConfig.elimBannerCustomImageVariant ?? 'fullLink';
  const elimBannerFullLinkSwitchLocked =
    elimBannerHoldPreview && elimBannerCustomVariant !== 'fullLink';
  const elimBannerPanelLinksSwitchLocked =
    elimBannerHoldPreview && elimBannerCustomVariant === 'fullLink';
  const elimBannerFullImageFit = visualConfig.elimBannerFullImageFit ?? 'contain';
  const elimBannerContainFitSwitchLocked =
    elimBannerHoldPreview && elimBannerFullImageFit !== 'contain';
  const elimBannerCoverFitSwitchLocked =
    elimBannerHoldPreview && elimBannerFullImageFit === 'contain';
  const elimBannerDesignSwitchLockTitle =
    'Matikan Preview Sementara untuk mengganti opsi ini';

  const elimBannerPositionStyle = useMemo((): React.CSSProperties => {
    return {
      left: `calc(50% + ${effectiveElimBannerLayout.xOffset}px)`,
      top: `${effectiveElimBannerLayout.yOffset}px`,
      transform: `translateX(-50%) scale(${effectiveElimBannerLayout.scale / 100})`,
      transformOrigin: 'top center',
      ...(elimBannerHoldPreview ? { willChange: 'transform, top, left' as const } : {}),
    };
  }, [
    effectiveElimBannerLayout.scale,
    effectiveElimBannerLayout.xOffset,
    effectiveElimBannerLayout.yOffset,
    elimBannerHoldPreview,
  ]);

  const patchElimBannerLayout = useCallback(
    (patch: Partial<EliminationBannerLayout>) => {
      setElimBannerLayout((prev) => {
        const next = { ...prev, ...patch };
        elimBannerTuningLiveRef.current = next;
        return next;
      });
      if (elimBannerHoldPreview) {
        scheduleStagedElimBannerCompanionPush();
      }
    },
    [setElimBannerLayout, elimBannerHoldPreview, scheduleStagedElimBannerCompanionPush]
  );

  const patchElimBannerTypography = useCallback(
    (key: EliminationBannerFontKey, value: number) => {
      if (elimBannerHoldPreview) {
        mutateElimBannerVisualDraft((picked) => {
          const typo = {
            ...DEFAULT_ELIMINATION_BANNER_TYPOGRAPHY,
            ...picked.elimBannerTypography,
            [key]: value,
          };
          const current =
            picked.elimBannerFullLayout ?? DEFAULT_ELIMINATION_BANNER_FULL_LAYOUT;
          const nextLayout = { ...current };
          if (key === 'placement') {
            nextLayout.placement = { ...current.placement, fontSize: value };
          }
          if (key === 'tag') {
            nextLayout.teamName = { ...current.teamName, fontSize: value };
          }
          return {
            ...picked,
            elimBannerTypography: typo,
            elimBannerFullLayout:
              key === 'placement' || key === 'tag' ? nextLayout : current,
          };
        });
        return;
      }
      setVisualConfig((prev) => {
        const typo = {
          ...DEFAULT_ELIMINATION_BANNER_TYPOGRAPHY,
          ...prev.elimBannerTypography,
          [key]: value,
        };
        const current = prev.elimBannerFullLayout ?? DEFAULT_ELIMINATION_BANNER_FULL_LAYOUT;
        const nextLayout = { ...current };
        if (key === 'placement') {
          nextLayout.placement = { ...current.placement, fontSize: value };
        }
        if (key === 'tag') {
          nextLayout.teamName = { ...current.teamName, fontSize: value };
        }
        return {
          ...prev,
          elimBannerTypography: typo,
          elimBannerFullLayout:
            key === 'placement' || key === 'tag' ? nextLayout : current,
        };
      });
    },
    [elimBannerHoldPreview, mutateElimBannerVisualDraft, setVisualConfig]
  );

  const patchElimBannerFullLayout = useCallback(
    <
      K extends keyof EliminationBannerFullOverlayLayout,
    >(
      section: K,
      patch: Partial<EliminationBannerFullOverlayLayout[K]>
    ) => {
      if (elimBannerHoldPreview) {
        mutateElimBannerVisualDraft((picked) => {
          const fontPatch = patch as { fontSize?: number };
          const current =
            picked.elimBannerFullLayout ?? DEFAULT_ELIMINATION_BANNER_FULL_LAYOUT;
          const nextSection = { ...current[section], ...patch };
          const nextLayout = { ...current, [section]: nextSection };
          const typo = {
            ...DEFAULT_ELIMINATION_BANNER_TYPOGRAPHY,
            ...picked.elimBannerTypography,
          };
          if (section === 'placement' && fontPatch.fontSize !== undefined) {
            typo.placement = fontPatch.fontSize;
          }
          if (section === 'teamName' && fontPatch.fontSize !== undefined) {
            typo.tag = fontPatch.fontSize;
          }
          const typoChanged =
            (section === 'placement' && fontPatch.fontSize !== undefined) ||
            (section === 'teamName' && fontPatch.fontSize !== undefined);
          return {
            ...picked,
            elimBannerFullLayout: nextLayout,
            ...(typoChanged ? { elimBannerTypography: typo } : {}),
          };
        });
        return;
      }
      setVisualConfig((prev) => {
        const fontPatch = patch as { fontSize?: number };
        const current = prev.elimBannerFullLayout ?? DEFAULT_ELIMINATION_BANNER_FULL_LAYOUT;
        const nextSection = { ...current[section], ...patch };
        const nextLayout = { ...current, [section]: nextSection };
        const typo = {
          ...DEFAULT_ELIMINATION_BANNER_TYPOGRAPHY,
          ...prev.elimBannerTypography,
        };
        if (section === 'placement' && fontPatch.fontSize !== undefined) {
          typo.placement = fontPatch.fontSize;
        }
        if (section === 'teamName' && fontPatch.fontSize !== undefined) {
          typo.tag = fontPatch.fontSize;
        }
        const typoChanged =
          (section === 'placement' && fontPatch.fontSize !== undefined) ||
          (section === 'teamName' && fontPatch.fontSize !== undefined);
        return {
          ...prev,
          elimBannerFullLayout: nextLayout,
          ...(typoChanged ? { elimBannerTypography: typo } : {}),
        };
      });
    },
    [elimBannerHoldPreview, mutateElimBannerVisualDraft, setVisualConfig]
  );

  const handleElimBannerWheelTuning = useCallback(
    (active: boolean) => {
      elimBannerWheelTuningRef.current = active;
      syncElimBannerTuningActive();
    },
    [syncElimBannerTuningActive]
  );

  const handleElimBannerFocusTuning = useCallback(
    (active: boolean) => {
      elimBannerFocusTuningRef.current = active;
      syncElimBannerTuningActive();
    },
    [syncElimBannerTuningActive]
  );

  const elimBannerPreviewInputProps = elimBannerHoldPreview
    ? {
        previewMode: true as const,
        onWheelTuningChange: handleElimBannerWheelTuning,
        onFocusTuningChange: handleElimBannerFocusTuning,
      }
    : { previewMode: false as const };

  const previewEliminationBanner = useCallback(() => {
    if (elimBannerHoldPreview) return;
    const base = buildStagedElimPreviewAlert();
    const alert = { ...base, id: createEventId() };
    setEliminationAlert(alert);
    pushEliminationToCompanion(alert);
    if (eliminationClearTimerRef.current) {
      clearTimeout(eliminationClearTimerRef.current);
    }
    eliminationClearTimerRef.current = setTimeout(() => {
      setEliminationAlert(null);
      pushEliminationToCompanion(null);
    }, 4000);
  }, [
    buildStagedElimPreviewAlert,
    elimBannerHoldPreview,
    pushEliminationToCompanion,
    setEliminationAlert,
  ]);

  useEffect(() => {
    if (!elimBannerHoldPreview) {
      if (elimBannerHoldPreviewPrevRef.current) {
        elimBannerHoldPreviewPrevRef.current = false;
      }
      return;
    }

    elimBannerHoldPreviewPrevRef.current = true;
    if (eliminationClearTimerRef.current) {
      clearTimeout(eliminationClearTimerRef.current);
      eliminationClearTimerRef.current = null;
    }
    if (visualOnly) return;

    if (!stagedElimCompanionPushedRef.current) {
      const alert = buildStagedElimPreviewAlert();
      if (alert) {
        pushEliminationToCompanion(alert);
        stagedElimCompanionPushedRef.current = true;
      }
    }
  }, [
    elimBannerHoldPreview,
    buildStagedElimPreviewAlert,
    pushEliminationToCompanion,
    visualOnly,
  ]);

  useEffect(() => {
    if (eliminationsInitializedRef.current) return;
    teams.forEach((team, teamIndex) => {
      if (team.placementRank !== null && team.status.every((s) => s === 0)) {
        seenEliminationsRef.current.add(`${teamIndex}-${team.placementRank}`);
      }
    });
    eliminationsInitializedRef.current = true;
  }, [teams]);

  const handleApplyScoring = (newRules: number[], newKillPoints: number) => {
    setScoringRules(newRules);
    setKillPointValue(newKillPoints);
    setIsScoringModalOpen(false);
  };

  const handleApplyTieBreaker = (config: TieBreakerConfig) => {
    setTieBreakerOrder(config.order);
    setMatchKillRulesByMatch((prev) => ({
      ...prev,
      [String(currentMatch)]: config.matchKillRules,
    }));
    setIsTieBreakerModalOpen(false);
  };

  const pushKillEvent = (event: KillFeedEvent | null) => {
    if (!event) return;
    setKillEventLog((prev) => [...prev, event]);
  };

  const handleEliminationAfterAction = (
    teamIndex: number,
    eliminatedRank: number | null,
    nextTeams: Team[]
  ): Team[] => {
    const swept = finalizeTeamAtIndex(nextTeams, teamIndex);
    const prevRank = nextTeams[teamIndex]?.placementRank ?? null;
    const rankAfter = swept[teamIndex]?.placementRank ?? null;

    if (eliminatedRank !== null) {
      queueTeamEliminationBanner(teamIndex, eliminatedRank, swept);
    } else if (rankAfter !== null && rankAfter !== prevRank) {
      queueTeamEliminationBanner(teamIndex, rankAfter, swept);
    }

    const activeTotal = swept.filter((t) => t.active !== false).length;
    const assignedCount = swept.filter((t) => t.active !== false && t.placementRank !== null).length;
    setNextPlacementRank(activeTotal - assignedCount);
    return cloneLeaderboardTeams(swept);
  };

  const pushCompanionTeamsNow = useCallback(
    (teamsSnapshot: Team[]) => {
      if (visualOnly) return;
      syncCompanionData({
        assetId: asset.id,
        data: {
          BROHUBS_LEADERBOARD_TEAMS: teamsSnapshot.map((team) =>
            ensureTeamAbbreviation(team, projectPlayers)
          ),
        },
      });
    },
    [asset.id, visualOnly, projectPlayers]
  );

  const commitKillAction = (
    affectedTeamIndex: number,
    run: (prev: Team[]) => {
      teams: Team[];
      event: KillFeedEvent | null;
      eliminatedRank: number | null;
    }
  ) => {
    let eventToPush: KillFeedEvent | null = null;
    setTeams((prev) => {
      if (isTeamEliminationSealed(prev[affectedTeamIndex])) return prev;
      const { teams: nextTeams, event, eliminatedRank } = run(prev);
      eventToPush = event;
      if (!event && eliminatedRank === null) return prev;
      const result = handleEliminationAfterAction(affectedTeamIndex, eliminatedRank, nextTeams);
      pushCompanionTeamsNow(result);
      return result;
    });
    if (eventToPush) pushKillEvent(eventToPush);
  };

  const handleKnock = (teamIndex: number, playerIndex: number) => {
    const team = teams[teamIndex];
    if (!team || isTeamEliminationSealed(team)) return;
    const current = getPlayerStatus(team, playerIndex);
    if (current === 1) {
      setKnockAttackerModalVictim({ teamIndex, playerIndex });
      return;
    }
    const victim: PlayerRef = { teamIndex, playerIndex };
    commitKillAction(teamIndex, (prev) => applyKnockAction(prev, victim, matchKillRules));
  };

  const closeKnockAttackerModal = () => setKnockAttackerModalVictim(null);

  const confirmKnockWithAttacker = (knocker: PlayerRef | null) => {
    if (!knockAttackerModalVictim) return;
    const { teamIndex, playerIndex } = knockAttackerModalVictim;
    const victim: PlayerRef = { teamIndex, playerIndex };
    commitKillAction(teamIndex, (prev) =>
      applyKnockAction(prev, victim, matchKillRules, knocker)
    );
    closeKnockAttackerModal();
  };

  const handleElimButton = (teamIndex: number, playerIndex: number) => {
    const team = teams[teamIndex];
    if (!team || isTeamEliminationSealed(team)) return;
    const current = getPlayerStatus(team, playerIndex);
    if (current === 0) {
      if (team.placementRank !== null) {
        window.alert('Tim ini sudah eliminasi (placement terkunci). Tidak bisa revive.');
        return;
      }
      const victim: PlayerRef = { teamIndex, playerIndex };
      commitKillAction(teamIndex, (prev) => applyKnockAction(prev, victim, matchKillRules));
      return;
    }
    setElimModalVictim({ teamIndex, playerIndex });
  };

  const closeElimModal = () => setElimModalVictim(null);

  const confirmElimFromModal = (finisher: PlayerRef | null) => {
    if (!elimModalVictim) return;
    const { teamIndex, playerIndex } = elimModalVictim;
    const victim: PlayerRef = { teamIndex, playerIndex };

    if (finisher === null) {
      commitKillAction(teamIndex, (prev) => applyManualElimAction(prev, victim));
    } else {
      let blocked = false;
      commitKillAction(teamIndex, (prev) => {
        const result = applyFinishAction(prev, finisher, victim);
        if (!result.event) blocked = true;
        return result;
      });
      if (blocked) {
        window.alert('Tidak bisa mencatat kill musuh untuk pemain ini.');
        return;
      }
    }
    closeElimModal();
  };

  const openKillVictimModal = (teamIndex: number, playerIndex: number) => {
    const team = teams[teamIndex];
    if (!team || getPlayerStatus(team, playerIndex) !== 1) return;
    setKillVictimModalFinisher({ teamIndex, playerIndex });
  };

  const closeKillVictimModal = () => setKillVictimModalFinisher(null);

  const confirmKillVictim = (victim: PlayerRef) => {
    if (!killVictimModalFinisher) return;
    const finisher = killVictimModalFinisher;
    let blocked = false;
    commitKillAction(victim.teamIndex, (prev) => {
      const result = applyFinishAction(prev, finisher, victim);
      if (!result.event) blocked = true;
      return result;
    });
    if (blocked) {
      window.alert('Tidak bisa mencatat kill. Pastikan korban belum Dead.');
      return;
    }
    closeKillVictimModal();
  };

  const syncPlacementMetaAfterUndo = useCallback(
    (snapshot: Team[], revivedTeamIndex?: number, removedPlacementRank?: number) => {
      const assignedCount = snapshot.filter((t) => t.placementRank !== null).length;
      setNextPlacementRank(16 - assignedCount);
      if (revivedTeamIndex !== undefined && removedPlacementRank != null) {
        seenEliminationsRef.current.delete(`${revivedTeamIndex}-${removedPlacementRank}`);
      }
      pushCompanionTeamsNow(snapshot);
    },
    [pushCompanionTeamsNow]
  );

  const applyUndoKillEvent = (event: KillFeedEvent, teamIndex: number) => {
    setTeams((prev) => {
      const removedRank = prev[teamIndex]?.placementRank ?? null;
      const undone = undoKillFeedEvent(prev, event, matchKillRules);
      const next = cloneLeaderboardTeams(undone.teams);
      syncPlacementMetaAfterUndo(next, teamIndex, removedRank);
      return next;
    });
  };

  const handleUndoLastKill = () => {
    if (killEventLog.length === 0) {
      window.alert('Tidak ada aksi terakhir untuk dibatalkan.');
      return;
    }
    const last = killEventLog[killEventLog.length - 1];
    const team = teams[last.victim.teamIndex];
    if (
      !window.confirm(
        `UNDO aksi terakhir${team ? ` (${team.team})` : ''}?\n\nKnock, kill, dan placement dari aksi itu dikembalikan.`
      )
    ) {
      return;
    }
    applyUndoKillEvent(last, last.victim.teamIndex);
    setKillEventLog((prev) => prev.slice(0, -1));
  };

  const handleUndoTeam = (teamIndex: number) => {
    const team = teams[teamIndex];
    if (!team) return;

    const eventIndex = findLastKillEventIndexForTeam(killEventLog, teamIndex);
    if (eventIndex < 0) {
      window.alert(`Belum ada aksi knock/kill/eliminasi tercatat untuk ${team.team}.`);
      return;
    }

    const event = killEventLog[eventIndex];
    const newerCount = killEventLog.length - 1 - eventIndex;
    let message = `UNDO ${team.team}?\n\nMembatalkan aksi terakhir tim ini (status, kill, placement).`;
    if (newerCount > 0) {
      message += `\n\nPerhatian: ada ${newerCount} aksi tim lain setelahnya. Disarankan pakai UNDO global dulu; lanjut tetap membatalkan aksi tim ini saja.`;
    }
    if (!window.confirm(message)) return;

    applyUndoKillEvent(event, teamIndex);
    setKillEventLog((prev) => [...prev.slice(0, eventIndex), ...prev.slice(eventIndex + 1)]);
  };

  const [fraggers, setFraggers] = useSharedState<TopFraggerSlot[]>('BROHUBS_TOPFRAGGERS_DATA', [
      { rank: 1, name: 'PLAYER 1', team: 'TEAM A', teamLogo: '', elims: 0, damage: 0, survival: '0 M 00 S', image: '' },
      { rank: 2, name: 'PLAYER 2', team: 'TEAM B', teamLogo: '', elims: 0, damage: 0, survival: '0 M 00 S', image: '' },
      { rank: 3, name: 'PLAYER 3', team: 'TEAM C', teamLogo: '', elims: 0, damage: 0, survival: '0 M 00 S', image: '' },
      { rank: 4, name: 'PLAYER 4', team: 'TEAM D', teamLogo: '', elims: 0, damage: 0, survival: '0 M 00 S', image: '' },
      { rank: 5, name: 'PLAYER 5', team: 'TEAM E', teamLogo: '', elims: 0, damage: 0, survival: '0 M 00 S', image: '' },
  ]);

  useEffect(() => {
    if (visualOnly) return;
    if (!isMatchReadyForTopFraggerSync(teams)) return;
    setFraggers(buildTopFraggersFromMatch(teams, projectPlayers, 5));
  }, [teams, projectPlayers, aliveCount, currentMatch, setFraggers, visualOnly]);

  // Push team / layout / visual ke OBS (normal — tidak saat Preview Sementara)
  useEffect(() => {
    if (visualOnly || elimBannerHoldPreview || finalFourHoldPreview) return;
    const timer = setTimeout(() => {
      syncCompanionData({
        assetId: asset.id,
        data: {
          BROHUBS_LEADERBOARD_TEAMS: teamsRef.current.map((team) =>
            ensureTeamAbbreviation(team, projectPlayers)
          ),
          BROHUBS_LEADERBOARD_TITLE: matchTitle,
          BROHUBS_LEADERBOARD_MATCH: currentMatch,
          BROHUBS_LEADERBOARD_VISUAL: visualConfig,
          BROHUBS_LEADERBOARD_LAYOUT: layoutConfig,
          BROHUBS_ELIMINATION_BANNER_LAYOUT: elimBannerLayout,
          BROHUBS_FINAL_FOUR_LAYOUT: finalFourLayout,
          BROHUBS_LEADERBOARD_MATCH_KILL_RULES: matchKillRulesByMatch,
          BROHUBS_TOPFRAGGERS_DATA: fraggers,
        },
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [
    asset.id,
    teams,
    matchTitle,
    currentMatch,
    visualConfig,
    layoutConfig,
    elimBannerLayout,
    finalFourLayout,
    matchKillRulesByMatch,
    fraggers,
    visualOnly,
    elimBannerHoldPreview,
    finalFourHoldPreview,
    projectPlayers,
  ]);

  useEffect(() => {
    if (visualOnly || !finalFourHoldPreview) return;
    const timer = setTimeout(() => {
      syncCompanionData({
        assetId: asset.id,
        data: {
          BROHUBS_LEADERBOARD_VISUAL: visualConfig,
          BROHUBS_FINAL_FOUR_LAYOUT: finalFourLayout,
        },
      });
    }, 380);
    return () => clearTimeout(timer);
  }, [asset.id, visualOnly, finalFourHoldPreview, visualConfig, finalFourLayout]);

  // Preview Sementara: sync layout/visual setelah scroll berhenti (tidak saat wheel aktif)
  useEffect(() => {
    if (visualOnly || !elimBannerHoldPreview || elimBannerTuningActive) return;
    const stagedAlert =
      frozenStagedElimAlert ??
      (eliminationAlert?.id === STAGED_ELIM_PREVIEW_ALERT_ID ? eliminationAlert : null) ??
      STAGED_ELIM_PREVIEW_FALLBACK;
    const timer = setTimeout(() => {
      syncCompanionData({
        assetId: asset.id,
        data: {
          BROHUBS_ELIMINATION_BANNER_LAYOUT: elimBannerLayout,
          BROHUBS_LEADERBOARD_VISUAL: visualConfig,
          [TEAM_ELIMINATION_ALERT_KEY]: stagedAlert,
        },
      });
    }, 380);
    return () => clearTimeout(timer);
  }, [
    asset.id,
    visualOnly,
    elimBannerHoldPreview,
    elimBannerTuningActive,
    elimBannerLayout,
    visualConfig,
    frozenStagedElimAlert,
    eliminationAlert,
  ]);

  const handleResetCurrentMatch = () => {
    if (currentMatch <= 1) return;
    const ok = window.confirm(
      `RESET MATCH ${currentMatch}?\n\n` +
        'Hanya data match ini yang diulang: kill, status pemain, placement, dan log kill.\n' +
        'Poin overall / WWCD / placement dari match sebelumnya TIDAK diubah.\n\n' +
        'Lanjutkan?'
    );
    if (!ok) return;

    setTeams(resetCurrentMatchTeamState(teams));
    setNextPlacementRank(16);
    setActivePopups([]);
    setKillEventLog([]);
    setEliminationAlert(null);
    seenEliminationsRef.current.clear();
    eliminationQueueRef.current = [];
    eliminationShowingRef.current = false;
    firstBloodTriggeredMatchRef.current = null;
    setActiveFirstBloodTarget(null);
    if (!visualOnly) {
      setFraggers([
        { rank: 1, name: 'PLAYER 1', team: 'TEAM A', teamLogo: '', elims: 0, damage: 0, survival: '0 M 00 S', image: '' },
        { rank: 2, name: 'PLAYER 2', team: 'TEAM B', teamLogo: '', elims: 0, damage: 0, survival: '0 M 00 S', image: '' },
        { rank: 3, name: 'PLAYER 3', team: 'TEAM C', teamLogo: '', elims: 0, damage: 0, survival: '0 M 00 S', image: '' },
        { rank: 4, name: 'PLAYER 4', team: 'TEAM D', teamLogo: '', elims: 0, damage: 0, survival: '0 M 00 S', image: '' },
        { rank: 5, name: 'PLAYER 5', team: 'TEAM E', teamLogo: '', elims: 0, damage: 0, survival: '0 M 00 S', image: '' },
      ]);
    }
  };

  const handleResetAll = () => {
    if (window.confirm("RESET SELURUH DATA (POIN, KILL, DAN STATUS)?")) {
        setTeams(prevTeams => prevTeams.map(t => ({ 
          ...t, 
          points: 0, 
          totalPlacementPoints: 0, 
          totalWwcds: 0,
          playerKills: createZeroKills(t),
          playerFinishCredit: createEmptyCredits(t),
          playerKnockCredit: createEmptyCredits(t),
          status: createTeamStatus(t, 1),
          placementRank: null
        })));
        setCurrentMatch(1);
        setTerminatorKillHistory({});
        setNextPlacementRank(16);
        setActivePopups([]);
        setKillEventLog([]);
        setEliminationAlert(null);
        seenEliminationsRef.current.clear();
        eliminationQueueRef.current = [];
        eliminationShowingRef.current = false;
        firstBloodTriggeredMatchRef.current = null;
        setActiveFirstBloodTarget(null);
        setFraggers([
          { rank: 1, name: 'PLAYER 1', team: 'TEAM A', teamLogo: '', elims: 0, damage: 0, survival: '0 M 00 S', image: '' },
          { rank: 2, name: 'PLAYER 2', team: 'TEAM B', teamLogo: '', elims: 0, damage: 0, survival: '0 M 00 S', image: '' },
          { rank: 3, name: 'PLAYER 3', team: 'TEAM C', teamLogo: '', elims: 0, damage: 0, survival: '0 M 00 S', image: '' },
          { rank: 4, name: 'PLAYER 4', team: 'TEAM D', teamLogo: '', elims: 0, damage: 0, survival: '0 M 00 S', image: '' },
          { rank: 5, name: 'PLAYER 5', team: 'TEAM E', teamLogo: '', elims: 0, damage: 0, survival: '0 M 00 S', image: '' },
        ]);
    }
  };

  const startNewMatch = (targetMatch: number) => {
    const withPlacements = applyMatchEndPlacementRanks(teams);
    appendTerminatorMatchKillsToHistory(withPlacements);
    const updatedTeams = withPlacements.map((t) => {
        const pRank = t.placementRank;
        const placementPoints = pRank ? (scoringRules[pRank - 1] || 0) : 0;
        const currentKills = t.playerKills.reduce((a, b) => a + b, 0);
        const killPoints = currentKills * killPointValue;

        return {
            ...t,
            points: t.points + placementPoints + killPoints,
            totalPlacementPoints: t.totalPlacementPoints + placementPoints,
            totalWwcds: t.totalWwcds + (pRank === 1 ? 1 : 0),
            playerKills: createZeroKills(t),
            playerFinishCredit: createEmptyCredits(t),
            playerKnockCredit: createEmptyCredits(t),
            status: createTeamStatus(t, 1),
            placementRank: null,
        };
    });

    if (finalFourSoloExitTimerRef.current) {
      clearTimeout(finalFourSoloExitTimerRef.current);
      finalFourSoloExitTimerRef.current = null;
    }

    setTeams(updatedTeams);
    setCurrentMatch(targetMatch);
    setNextPlacementRank(16);
    setActivePopups([]);
    setKillEventLog([]);
    setEliminationAlert(null);
    setFinalFourTopBarVisible(false);
    setFinalFourHoldPreview(false);
    setShowOverlay(true);
    if (onProgramAssetChange) {
      onProgramAssetChange(asset.id);
    }
    seenEliminationsRef.current.clear();
    eliminationQueueRef.current = [];
    eliminationShowingRef.current = false;
    firstBloodTriggeredMatchRef.current = null;
    setActiveFirstBloodTarget(null);
  };

  const confirmEndMatchExecution = () => {
    startNewMatch(currentMatch + 1);
    setIsEndMatchModalOpen(false);
  };

  const updatePlayerKills = (teamIndex: number, playerIndex: number, delta: number) => {
    const newTeams = teams.map((t, idx) => {
        if (idx !== teamIndex) return t;
        const updatedTeam = { ...t };
        const updatedKills = [...updatedTeam.playerKills];
        updatedKills[playerIndex] = Math.max(0, (updatedKills[playerIndex] || 0) + delta);
        updatedTeam.playerKills = updatedKills;
        return updatedTeam;
    });
    setTeams(newTeams);
  };

  const toggleRowActive = (index: number) => {
    const newTeams = teams.map((t, idx) => {
        if (idx !== index) return t;
        return { ...t, active: !t.active };
    });
    setTeams(newTeams);
  };

  const toggleRowExpanded = (index: number) => {
    const newTeams = teams.map((t, idx) => {
        if (idx !== index) return t;
        return { ...t, expanded: !t.expanded };
    });
    setTeams(newTeams);
  };

  const updateTeamField = (index: number, field: string, value: any) => {
    const newTeams = teams.map((t, idx) => {
        if (idx !== index) return t;
        return { ...t, [field]: value };
    });
    setTeams(newTeams);
  };

  const handleTeamLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
        void compressImage(file, LOGO_PRESET).then((result) => {
            updateTeamField(index, 'teamLogo', result);
        });
    }
  };

  const updatePlayerName = (teamIndex: number, playerIndex: number, value: string) => {
    const newTeams = teams.map((t, idx) => {
        if (idx !== teamIndex) return t;
        const updatedTeam = { ...t };
        const updatedNames = [...updatedTeam.playerNames];
        updatedNames[playerIndex] = value;
        updatedTeam.playerNames = updatedNames;
        return updatedTeam;
    });
    setTeams(newTeams);
  };

  const getStatusColor = useCallback((status: number) => {
    switch (status) {
      case 1: return visualConfig.statusAlive; 
      case 2: return visualConfig.statusKnock; 
      default: return visualConfig.statusDead; 
    }
  }, [visualConfig.statusAlive, visualConfig.statusKnock, visualConfig.statusDead]);

  const openDbModal = (rankIndex: number) => {
    setDbSearch('');
    setIsDbSelectorOpen({ rankIndex });
  };

  const normalizeTeamName = (name: string) => name.trim().toLowerCase();

  const getAssignedDbTeamNames = () =>
    new Set(
      teams
        .filter((team) => team.active)
        .map((team) => normalizeTeamName(team.team))
    );

  const handleLoadFromDb = (rankIndex: number, teamName: string) => {
    if (getAssignedDbTeamNames().has(normalizeTeamName(teamName))) return;
    const teamPlayers = projectPlayers.filter(p => p.team === teamName);
    if (teamPlayers.length === 0) return;
    const newTeams = [...teams];
    newTeams[rankIndex].team = teamName;
    newTeams[rankIndex].teamAbbreviation = (
      teamPlayers[0].teamAbbreviation?.trim() || deriveTeamAbbreviation(teamName)
    ).toUpperCase();
    newTeams[rankIndex].teamLogo = teamPlayers[0].teamLogo || '';
    newTeams[rankIndex].country = teamPlayers[0].country || 'ID'; // Sync country if exists
    newTeams[rankIndex].playerNames = [
        teamPlayers[0]?.name || 'P1',
        teamPlayers[1]?.name || 'P2',
        teamPlayers[2]?.name || 'P3',
        teamPlayers[3]?.name || 'P4'
    ];
    newTeams[rankIndex].playerImages = buildPlayerImagesFromProjectPlayers(
      teamPlayers,
      newTeams[rankIndex].playerNames
    );
    setTeams(newTeams);
    setIsDbSelectorOpen(null);
  };

  const projectTeamOptions = useMemo(() => {
    const grouped = new Map<string, PlayerData[]>();
    projectPlayers.forEach((player) => {
      const teamName = player.team?.trim();
      if (!teamName) return;
      const list = grouped.get(teamName) ?? [];
      list.push(player);
      grouped.set(teamName, list);
    });
    // Map menjaga urutan pertama kali team muncul di Manual Entry / import.
    // Jangan sort A-Z di sini karena slot sync harus mengikuti urutan input user.
    return Array.from(grouped.entries())
      .map(([teamName, players]) => ({
        teamName,
        players,
        sample: players[0],
        logo: players.find((p) => p.teamLogo?.trim())?.teamLogo || '',
      }));
  }, [projectPlayers]);

  // Auto-Sync menyegarkan SEMUA tim dari Manual Entry (termasuk yang sudah ada di slot),
  // bukan hanya yang belum masuk — supaya Team Identity benar-benar sama dengan Manual Entry.
  const availableAutoSyncTeamOptions = projectTeamOptions;

  const openAutoSyncModal = () => {
    if (projectTeamOptions.length === 0) {
      alert('Belum ada data team di Project. Isi Player Data / Roster Project terlebih dahulu.');
      return;
    }
    setAutoSyncSelectedTeams(availableAutoSyncTeamOptions.map((option) => option.teamName));
    setIsAutoSyncModalOpen(true);
  };

  const toggleAutoSyncTeam = (teamName: string) => {
    setAutoSyncSelectedTeams((prev) =>
      prev.includes(teamName)
        ? prev.filter((name) => name !== teamName)
        : [...prev, teamName]
    );
  };

  const buildTeamFromProjectOption = (
    option: (typeof projectTeamOptions)[number],
    slotIndex: number,
    previousTeam: Team
  ): Team => {
    const players = option.players.slice(0, 4);
    const playerNames = Array.from(
      { length: Math.max(4, players.length) },
      (_, index) => players[index]?.name || `P${index + 1}`
    );
    const playerImages = buildPlayerImagesFromProjectPlayers(players, playerNames);
    const baseTeam: Team = {
      ...previousTeam,
      rank: slotIndex + 1,
      team: option.teamName,
      teamAbbreviation: (
        option.sample?.teamAbbreviation?.trim() || deriveTeamAbbreviation(option.teamName)
      ).toUpperCase(),
      teamLogo: option.logo || option.sample?.teamLogo || '',
      country: option.sample?.country || previousTeam.country || 'ID',
      playerNames,
      playerImages,
      playerKills: Array.from({ length: playerNames.length }, () => 0),
      playerFinishCredit: Array.from({ length: playerNames.length }, () => null),
      playerKnockCredit: Array.from({ length: playerNames.length }, () => null),
      status: Array.from({ length: playerNames.length }, () => 1),
      points: 0,
      totalPlacementPoints: 0,
      totalWwcds: 0,
      active: true,
      placementRank: null,
    };
    return baseTeam;
  };

  const applyAutoSyncSelectedTeams = () => {
    const selectedNames = new Set(autoSyncSelectedTeams);
    const selectedOptions = availableAutoSyncTeamOptions.filter((option) =>
      selectedNames.has(option.teamName)
    );

    if (selectedOptions.length === 0) {
      alert('Pilih minimal 1 team untuk diambil dari Project.');
      return;
    }

    setTeams((prevTeams) =>
      prevTeams.map((team, index) => {
        const option = selectedOptions[index];
        if (!option) {
          return {
            ...team,
            rank: index + 1,
            active: false,
            placementRank: null,
            status: createTeamStatus(team, 0),
            playerKills: createZeroKills(team),
            playerFinishCredit: createEmptyCredits(team),
            playerKnockCredit: createEmptyCredits(team),
          };
        }
        return buildTeamFromProjectOption(option, index, team);
      })
    );

    // Reset bersih: identitas & nama pemain disegarkan dari Manual Entry, skor/kill/placement nol
    setNextPlacementRank(16);
    setActivePopups([]);
    setKillEventLog([]);
    setEliminationAlert(null);
    seenEliminationsRef.current.clear();
    eliminationQueueRef.current = [];
    eliminationShowingRef.current = false;
    firstBloodTriggeredMatchRef.current = null;
    setActiveFirstBloodTarget(null);
    setTerminatorKillHistory({});

    setIsAutoSyncModalOpen(false);
  };

  const uniqueTeamsInDb = projectTeamOptions.map((option) => option.teamName);
  const assignedDbTeamNames = getAssignedDbTeamNames();
  const filteredDbTeams = uniqueTeamsInDb.filter((teamName) => {
    const normalized = normalizeTeamName(teamName);
    return (
      !assignedDbTeamNames.has(normalized) &&
      normalized.includes(dbSearch.trim().toLowerCase())
    );
  });

  const filteredCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const sortedPreviewTeams = useMemo(() => {
    return [...teams]
      .filter(t => t.active)
      .sort((a, b) => {
          const aKillsMatch = a.playerKills.reduce((x, y) => x + y, 0);
          const bKillsMatch = b.playerKills.reduce((x, y) => x + y, 0);
          
          for (const criteria of tieBreakerOrder) {
              let diff = 0;
              switch (criteria) {
                  case 'TOTAL_POINTS':
                      diff = (b.points + (bKillsMatch * killPointValue)) - (a.points + (aKillsMatch * killPointValue));
                      break;
                  case 'TOTAL_WWCD':
                      diff = b.totalWwcds - a.totalWwcds;
                      break;
                  case 'TOTAL_PLACEMENT':
                      diff = b.totalPlacementPoints - a.totalPlacementPoints;
                      break;
                  case 'ALIVE_PLAYERS':
                      diff = b.status.filter(s => s !== 0).length - a.status.filter(s => s !== 0).length;
                      break;
                  case 'MATCH_KILLS':
                      diff = bKillsMatch - aKillsMatch;
                      break;
                  case 'SLOT_RANK':
                      diff = a.rank - b.rank; 
                      break;
              }
              if (diff !== 0) return diff;
          }
          return 0;
      });
  }, [teams, tieBreakerOrder, killPointValue]);

  const showElimsColumn = useMemo(
    () =>
      currentMatch > 1 &&
      sortedPreviewTeams.some(
        (team) => team.playerKills.reduce((sum, kills) => sum + kills, 0) > 0
      ),
    [currentMatch, sortedPreviewTeams]
  );

  const finalFourTeamsData = useMemo(() => {
    if (!isEndgamePhase) return [];
    const totalAlivePlayers = survivingMatchTeams.reduce(
      (sum, t) => sum + countAlivePlayers(t.status),
      0
    );
    return survivingMatchTeams
      .map((t) => {
        const overallIdx = sortedPreviewTeams.findIndex((st) => st.rank === t.rank);
        const alivePlayers = countAlivePlayers(t.status);
        const wwcdPotentialPct =
          totalAlivePlayers > 0 ? (alivePlayers / totalAlivePlayers) * 100 : 0;

        const teamAbbreviation = getLeaderboardTeamLabel(t, projectPlayers);
        const teamFullName = t.team.trim() || teamAbbreviation;
        return {
          rank: t.rank,
          teamAbbreviation,
          teamName: teamFullName,
          teamLogo: resolveLeaderboardTeamLogo(t, projectPlayers),
          alivePlayers,
          playerStatus: [...t.status],
          wwcdPosition: overallIdx >= 0 ? overallIdx + 1 : null,
          totalWwcds: t.totalWwcds,
          wwcdPotentialPct,
        };
      })
      .sort((a, b) => (a.wwcdPosition ?? 99) - (b.wwcdPosition ?? 99));
  }, [isEndgamePhase, survivingMatchTeams, sortedPreviewTeams, projectPlayers]);

  const buildLeaderboardEnterTransition = useCallback(
    (delay = effectiveAnimationConfig.delay) => {
      const isLegacyLeaderboardSlide =
        effectiveAnimationConfig.inType === 'leaderboard-slide-left' ||
        effectiveAnimationConfig.inType === 'leaderboard-slide-up';
      const duration = Math.max(effectiveAnimationConfig.duration * 1.15, 0.85);
      if (effectiveAnimationConfig.useSpring && isLegacyLeaderboardSlide) {
        return {
          type: 'spring' as const,
          stiffness: 58,
          damping: 22,
          mass: 1.35,
          delay,
        };
      }
      if (effectiveAnimationConfig.useSpring) {
        return {
          type: 'spring' as const,
          stiffness: 100,
          damping: 20,
          mass: 1,
          delay,
        };
      }
      return {
        delay,
        duration: isLegacyLeaderboardSlide ? duration : effectiveAnimationConfig.duration,
        ease: getMotionEase(effectiveAnimationConfig),
      };
    },
    [effectiveAnimationConfig]
  );

  const rankingRootMotionProps = useMemo(() => {
    const props = getRootMotionProps(effectiveAnimationConfig);
    const enterTransition = buildLeaderboardEnterTransition(effectiveAnimationConfig.delay);
    const exitVariant = props.exit as Record<string, unknown>;
    return {
      ...props,
      animate: {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        transition: enterTransition,
      },
      exit: {
        ...exitVariant,
        transition: {
          delay: 0,
          duration: resolveLeaderboardExitDurationSeconds(effectiveAnimationConfig),
          ease: getMotionEase(effectiveAnimationConfig),
          when: 'afterChildren',
        },
      },
      transition: enterTransition,
    };
  }, [buildLeaderboardEnterTransition, effectiveAnimationConfig]);

  const isUnifiedPanelIn =
    effectiveAnimationConfig.inType === 'slide-left' ||
    effectiveAnimationConfig.inType === 'slide-right' ||
    effectiveAnimationConfig.inType === 'slide-up';
  const isUnifiedPanelOut =
    effectiveAnimationConfig.outType === 'slide-left' ||
    effectiveAnimationConfig.outType === 'slide-right' ||
    effectiveAnimationConfig.outType === 'slide-up';
  const unifiedChildPose = { x: 0, y: 0, opacity: 1 };
  const unifiedChildTransition = { delay: 0, duration: 0 };

  const headerVariants = useMemo(() => ({
    initial: isUnifiedPanelIn
      ? unifiedChildPose
      : getChildMotionInitial(effectiveAnimationConfig, 96),
    animate: {
      x: 0,
      y: 0,
      opacity: 1,
      transition: isUnifiedPanelIn
        ? unifiedChildTransition
        : effectiveAnimationConfig.useSpring
          ? buildLeaderboardEnterTransition(0.28)
          : {
              delay: 0.28,
              duration:
                effectiveAnimationConfig.inType === 'leaderboard-slide-left' ||
                effectiveAnimationConfig.inType === 'leaderboard-slide-up'
                  ? Math.max(effectiveAnimationConfig.duration * 0.8, 0.65)
                  : effectiveAnimationConfig.duration,
              ease: getMotionEase(effectiveAnimationConfig),
            },
    },
    exit: isUnifiedPanelOut
      ? {
          ...unifiedChildPose,
          transition: unifiedChildTransition,
        }
      : {
          ...getChildMotionExit(effectiveAnimationConfig, 240),
          transition: {
            delay: 0,
            duration: resolveLeaderboardExitDurationSeconds(effectiveAnimationConfig),
            ease: getMotionEase(effectiveAnimationConfig),
          },
        },
  }), [buildLeaderboardEnterTransition, effectiveAnimationConfig, isUnifiedPanelIn, isUnifiedPanelOut]);

  const rowVariants = useMemo(() => ({
    initial: isUnifiedPanelIn
      ? unifiedChildPose
      : getChildMotionInitial(effectiveAnimationConfig, 96),
    animate: (custom: any) => {
      const delay = resolveStaggerDelay(
        custom?.index ?? 0,
        custom?.total ?? 1,
        effectiveAnimationConfig,
        0.35
      );
      return { 
        x: 0, 
        y: 0,
        opacity: 1,
        transition: isUnifiedPanelIn
          ? unifiedChildTransition
          : effectiveAnimationConfig.useSpring
            ? buildLeaderboardEnterTransition(delay)
            : {
                delay,
                duration:
                  effectiveAnimationConfig.inType === 'leaderboard-slide-left' ||
                  effectiveAnimationConfig.inType === 'leaderboard-slide-up'
                    ? Math.max(effectiveAnimationConfig.duration * 0.85, 0.65)
                    : effectiveAnimationConfig.duration,
                ease: getMotionEase(effectiveAnimationConfig),
              },
      };
    },
    exit: (custom: any) =>
      isUnifiedPanelOut
        ? {
            ...unifiedChildPose,
            transition: unifiedChildTransition,
          }
        : {
            ...getChildMotionExit(effectiveAnimationConfig, 320),
            transition: {
              delay: resolveExitStaggerDelay(
                custom?.index ?? 0,
                custom?.total ?? 1,
                effectiveAnimationConfig,
                0.03
              ),
              duration: resolveLeaderboardExitDurationSeconds(effectiveAnimationConfig),
              ease: getMotionEase(effectiveAnimationConfig),
            },
          },
  }), [buildLeaderboardEnterTransition, effectiveAnimationConfig, isUnifiedPanelIn, isUnifiedPanelOut]);

  const bottomBoxVariants = useMemo(() => ({
    initial: isUnifiedPanelIn
      ? unifiedChildPose
      : getChildMotionInitial(effectiveAnimationConfig, 96),
    animate: (custom: any) => {
      const total = custom?.total ?? 1;
      const lastRowDelay = Math.max(
        ...Array.from({ length: Math.max(total, 1) }, (_, index) =>
          resolveStaggerDelay(index, total, effectiveAnimationConfig, 0.35)
        )
      );
      const delay = lastRowDelay + 0.18;
      return { 
        x: 0,
        y: 0, 
        opacity: 1,
        transition: isUnifiedPanelIn
          ? unifiedChildTransition
          : effectiveAnimationConfig.useSpring
            ? buildLeaderboardEnterTransition(delay)
            : {
                delay,
                duration:
                  effectiveAnimationConfig.inType === 'leaderboard-slide-left' ||
                  effectiveAnimationConfig.inType === 'leaderboard-slide-up'
                    ? Math.max(effectiveAnimationConfig.duration * 0.85, 0.65)
                    : effectiveAnimationConfig.duration,
                ease: getMotionEase(effectiveAnimationConfig),
              },
      };
    },
    exit: isUnifiedPanelOut
      ? {
          ...unifiedChildPose,
          transition: unifiedChildTransition,
        }
      : {
          ...getChildMotionExit(effectiveAnimationConfig, 240),
          transition: {
            delay: 0,
            duration: resolveLeaderboardExitDurationSeconds(effectiveAnimationConfig),
            ease: getMotionEase(effectiveAnimationConfig),
          },
        },
  }), [buildLeaderboardEnterTransition, effectiveAnimationConfig, isUnifiedPanelIn, isUnifiedPanelOut]);

  const handleToggleOverlay = () => {
    const nextState = !showOverlay;
    if (onProgramAssetChange) {
      onProgramAssetChange(nextState ? asset.id : null);
    }
    setShowOverlay(nextState);
  };

  const handleSidebarAssetPlay = (assetId: string) => {
    if (getAssetStatusProp) {
      const status = getAssetStatusProp(assetId);
      if (onProgramAssetChange) {
        onProgramAssetChange(status !== 0 ? null : assetId);
      }
    } else {
      setProgramAssetId(programAssetId === assetId ? null : assetId);
    }
  };

  const leaderboardOverlayPanel = useMemo(() => {
    if (!showOverlay) return null;

    const overlayPanelWidth =
      leaderboardPanelWidth +
      (showElimsColumn ? LEADERBOARD_ELIMS_PANEL_EXTRA_PX : 0);

    const panelHasBgImage = hasLeaderboardBgImage(
      visualConfig.leaderboardPanelBgImage,
      visualConfig
    );

    return (
         <div 
           className="absolute right-0 flex flex-col justify-start origin-right max-w-full"
           style={{ 
             width: `${overlayPanelWidth}px`,
             right: `${-layoutConfig.xOffset}px`,
             top: `${layoutConfig.yOffset}px`,
             transformOrigin: 'right top',
             scale: layoutConfig.scale / 100,
             fontFamily: leaderboardFontFamily,
             transition: LEADERBOARD_PANEL_WIDTH_TRANSITION,
           }}
         >
           <div className="relative flex flex-col rounded-xl shadow-2xl min-h-0">
             {panelHasBgImage && (
               <div
                 className="absolute inset-0 z-0 pointer-events-none rounded-xl overflow-hidden"
                 style={resolveLeaderboardSurfaceStyle(
                   visualConfig.headerBg,
                   visualConfig.leaderboardPanelBgImage,
                   visualConfig
                 )}
               />
             )}
              <motion.div
                variants={headerVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="rounded-t-xl text-center py-4 shadow-2xl relative z-20 border-b-2 border-black/10 shrink-0"
                style={resolveLeaderboardSurfaceStyle(
                  visualConfig.headerBg,
                  visualConfig.headerBgImage,
                  visualConfig
                )}
              >
                 <h2 className="text-3xl tracking-widest uppercase font-[900] drop-shadow-md" style={{ color: visualConfig.headerText }}>{matchTitle}</h2>
                 <div
                   className="flex items-center justify-between px-6 text-[11px] uppercase font-bold mt-2 opacity-90 tracking-wider"
                   style={{ color: visualConfig.headerText }}
                 >
                    <div className="flex items-center gap-4 flex-1 min-w-0 mr-2 pr-1">
                      <span className="w-8 text-center shrink-0">{t('olb.rank')}</span>
                      <div
                        style={{
                          width: visualConfig.showFlags
                            ? `${layoutConfig.flagWidth}px`
                            : 0,
                          opacity: visualConfig.showFlags ? 1 : 0,
                          transition: LEADERBOARD_FLAG_LAYOUT_TRANSITION,
                        }}
                        className="shrink-0 overflow-hidden"
                        aria-hidden
                      />
                      <div className="flex items-center flex-1 min-w-0">
                        <div
                          style={{ width: `${layoutConfig.logoSize}px` }}
                          className="shrink-0"
                          aria-hidden
                        />
                        <div className="w-4 shrink-0 flex items-center justify-center">
                          <span className="whitespace-nowrap leading-none">{t('olb.team')}</span>
                        </div>
                        <div className="flex-1 min-w-0" aria-hidden />
                      </div>
                    </div>
                    <div
                      className="flex items-center shrink-0 gap-2"
                      style={{
                        marginRight: visualConfig.showFlags ? -4 : 0,
                        transition: LEADERBOARD_FLAG_LAYOUT_TRANSITION,
                      }}
                    >
                      <span
                        className="inline-flex items-center justify-center shrink-0"
                        style={{
                          width: LEADERBOARD_ELIMS_STATUS_WIDTH_PX,
                          transition: LEADERBOARD_ELIMS_LAYOUT_TRANSITION,
                        }}
                      >
                        {t('olb.status')}
                      </span>
                      <span
                        className="text-right inline-flex items-center justify-end shrink-0"
                        style={{
                          width: LEADERBOARD_ELIMS_PTS_WIDTH_PX,
                          transition: LEADERBOARD_ELIMS_LAYOUT_TRANSITION,
                        }}
                      >
                        {t('olb.pts')}
                      </span>
                      <div
                        className="shrink-0 overflow-hidden flex items-center justify-center"
                        style={{
                          width: showElimsColumn ? LEADERBOARD_ELIMS_COLUMN_WIDTH_PX : 0,
                          maxWidth: showElimsColumn ? LEADERBOARD_ELIMS_COLUMN_WIDTH_PX : 0,
                          opacity: showElimsColumn ? 1 : 0,
                          transform: showElimsColumn ? 'translateX(12px)' : 'translateX(24px)',
                          transition: LEADERBOARD_ELIMS_LAYOUT_TRANSITION,
                        }}
                        aria-hidden={!showElimsColumn}
                      >
                        <span className="text-center whitespace-nowrap">{t('olb.elims')}</span>
                      </div>
                    </div>
                 </div>
              </motion.div>

              <div 
                className="shadow-2xl relative transition-[height] duration-300 ease-out shrink-0" 
                style={{ height: `${sortedPreviewTeams.length * layoutConfig.rowHeight}px` }}
              >
                 {sortedPreviewTeams.map((teamRow, idx) => {
                    const isTeamEliminated = isTeamMatchEliminated(teamRow);
                    const showPopup = activePopups.includes(teamRow.rank);
                    const isWinner =
                      teamRow.placementRank === 1 ||
                      (contentionCount === 1 && teamHasAlivePlayer(teamRow));
                    const currentKills = teamRow.playerKills.reduce((a, b) => a + b, 0);
                    const liveKillPoints = currentKills * killPointValue;
                    const displayedPts = teamRow.points + liveKillPoints;

                    return (
                    <motion.div 
                      key={teamRow.rank}
                      custom={{
                        index: idx,
                        total: sortedPreviewTeams.length,
                        direction: effectiveAnimationConfig.staggerDirection || 'top-down',
                        delay: effectiveAnimationConfig.staggerDelay || 0.05,
                        stagger: effectiveAnimationConfig.staggerChildren
                      }}
                      variants={rowVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="absolute left-0 w-full flex items-center justify-between px-6 border-b border-white/5 overflow-hidden"
                      style={{ 
                          ...resolveLeaderboardSurfaceStyle(
                            isWinner
                              ? visualConfig.winnerBg
                              : isTeamEliminated
                                ? visualConfig.eliminatedBg
                                : idx % 2 === 0
                                  ? visualConfig.rowEvenBg
                                  : visualConfig.rowOddBg,
                            isWinner
                              ? visualConfig.winnerBgImage
                              : isTeamEliminated
                                ? visualConfig.eliminatedBgImage
                                : idx % 2 === 0
                                  ? visualConfig.rowEvenBgImage
                                  : visualConfig.rowOddBgImage,
                            visualConfig
                          ),
                          top: `${idx * layoutConfig.rowHeight}px`,
                          height: `${layoutConfig.rowHeight}px`,
                          transition: 'top 0.6s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.6s ease', 
                          zIndex: sortedPreviewTeams.length - idx
                      }}
                    >
                       {isTeamEliminated && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.75, ease: ELIMINATED_POPUP_EASE_IN }}
                            className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-0"
                          >
                              <motion.span
                                initial={{ opacity: 0, scale: 1.08, rotate: -6 }}
                                animate={{ opacity: 0.1, scale: 1, rotate: -3 }}
                                transition={{ duration: 0.9, ease: ELIMINATED_POPUP_EASE_IN, delay: 0.15 }}
                                className="text-[40px] font-[1000] uppercase tracking-[0.5em] whitespace-nowrap"
                                style={{ color: visualConfig.eliminatedText }}
                              >
                                  {t('olb.eliminated')}
                              </motion.span>
                          </motion.div>
                       )}

                       <AnimatePresence>
                         {showPopup && (
                           <motion.div
                             key={`elim-popup-${teamRow.rank}`}
                             className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none overflow-hidden"
                             initial={{ opacity: 0 }}
                             animate={{ opacity: 1 }}
                             exit={{
                               opacity: 0,
                               transition: { duration: 0.55, ease: ELIMINATED_POPUP_EASE_OUT },
                             }}
                           >
                             <motion.div
                               initial={{
                                 opacity: 0,
                                 scale: 0.55,
                                 rotate: -10,
                                 y: 16,
                                 filter: 'blur(6px)',
                               }}
                               animate={{
                                 opacity: 1,
                                 scale: 1,
                                 rotate: -2,
                                 y: 0,
                                 filter: 'blur(0px)',
                                 transition: {
                                   duration: 0.5,
                                   ease: ELIMINATED_POPUP_EASE_IN,
                                 },
                               }}
                               exit={{
                                 opacity: 0,
                                 scale: 0.88,
                                 rotate: 5,
                                 y: -14,
                                 filter: 'blur(8px)',
                                 transition: {
                                   duration: 0.85,
                                   ease: ELIMINATED_POPUP_EASE_OUT,
                                   opacity: { duration: 0.7 },
                                   filter: { duration: 0.75 },
                                 },
                               }}
                               className="bg-red-600/90 text-white font-[900] text-3xl uppercase tracking-[0.2em] px-8 py-1 border-y-2 border-white shadow-xl"
                             >
                               {t('olb.eliminated')}
                             </motion.div>
                           </motion.div>
                         )}
                       </AnimatePresence>
                       
                       {isWinner && (
                           <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none overflow-hidden">
                               <div className="bg-black/90 text-[#ccff00] font-[900] text-3xl uppercase tracking-[0.2em] px-8 py-1 border-y-2 border-[#ccff00] shadow-xl animate-pulse">
                                   {t('olb.wwcd')}
                               </div>
                           </div>
                       )}

                       <div
                         className={`flex items-center gap-4 flex-1 min-w-0 mr-2 pr-1 relative z-10 transition-[opacity,filter] duration-700 ease-out ${isTeamEliminated ? 'opacity-40 grayscale' : 'opacity-100'}`}
                       >
                          <span className="font-[900] text-xl w-8 text-center" style={{ color: isWinner ? visualConfig.winnerText : visualConfig.rankColor }}>#{idx + 1}</span>
                          
                          <div
                            style={{
                              width:
                                visualConfig.showFlags && teamRow.country
                                  ? `${layoutConfig.flagWidth}px`
                                  : 0,
                              opacity: visualConfig.showFlags && teamRow.country ? 1 : 0,
                              transform:
                                visualConfig.showFlags && teamRow.country
                                  ? 'scale(1)'
                                  : 'scale(0.92)',
                              transition: LEADERBOARD_FLAG_LAYOUT_TRANSITION,
                            }}
                            className="shrink-0 flex items-center justify-center shadow-sm overflow-hidden"
                            aria-hidden={!visualConfig.showFlags || !teamRow.country}
                          >
                            {teamRow.country ? (
                              <img
                                src={`https://flagcdn.com/w80/${teamRow.country.toLowerCase()}.png`}
                                alt={teamRow.country}
                                className="w-full h-auto rounded-[2px]"
                              />
                            ) : null}
                          </div>

                          <div style={{ width: `${layoutConfig.logoSize}px`, height: `${layoutConfig.logoSize}px` }} className="shrink-0 flex items-center justify-center overflow-hidden">
                            {teamRow.teamLogo ? <img src={teamRow.teamLogo} className="w-full h-full object-contain" /> : <Shield size={layoutConfig.logoSize - 8} className="opacity-20 text-black" />}
                          </div>
                          <div className="flex flex-col justify-center min-w-0">
                              <span className="font-[900] uppercase leading-none mt-0.5 whitespace-nowrap" style={{ fontSize: `${layoutConfig.fontSize}px`, color: isWinner ? visualConfig.winnerText : visualConfig.teamNameColor }}>{getLeaderboardTeamLabel(teamRow, projectPlayers)}</span>
                          </div>
                       </div>

                       <div
                         className={`flex items-center shrink-0 gap-2 relative z-10 transition-opacity duration-700 ease-out ${isTeamEliminated ? 'opacity-20' : 'opacity-100'}`}
                         style={{
                           marginRight: visualConfig.showFlags ? -4 : 0,
                           transition: LEADERBOARD_FLAG_LAYOUT_TRANSITION,
                         }}
                       >
                         <div
                           className="flex flex-col items-center justify-center shrink-0"
                           style={{
                             width: LEADERBOARD_ELIMS_STATUS_WIDTH_PX,
                             transition: LEADERBOARD_ELIMS_LAYOUT_TRANSITION,
                           }}
                         >
                            <div className="flex gap-1.5">
                                {teamRow.status.map((s, i) => (
                                  <div key={i} className="w-3.5 h-7 rounded-full border shadow-sm transition-colors flex items-center justify-center" style={{ backgroundColor: getStatusColor(s), borderColor: `${visualConfig.statusBorder}20` }}>
                                      <span className="text-[5px] font-black opacity-50 mix-blend-overlay" style={{ color: visualConfig.statusText }}>{teamRow.playerNames[i]?.charAt(0)}</span>
                                  </div>
                                ))}
                            </div>
                         </div>

                         <div
                           className="text-right flex items-center justify-end shrink-0"
                           style={{
                             width: LEADERBOARD_ELIMS_PTS_WIDTH_PX,
                             transition: LEADERBOARD_ELIMS_LAYOUT_TRANSITION,
                           }}
                         >
                            <span className="font-[900] text-2xl leading-none" style={{ color: isWinner ? visualConfig.winnerText : visualConfig.pointsColor }}>{displayedPts}</span>
                         </div>

                         <div
                           className="shrink-0 overflow-hidden flex items-center justify-center"
                           style={{
                             width: showElimsColumn ? LEADERBOARD_ELIMS_COLUMN_WIDTH_PX : 0,
                             maxWidth: showElimsColumn ? LEADERBOARD_ELIMS_COLUMN_WIDTH_PX : 0,
                             opacity: showElimsColumn ? 1 : 0,
                             transform: showElimsColumn ? 'translateX(4px)' : 'translateX(16px)',
                             transition: LEADERBOARD_ELIMS_LAYOUT_TRANSITION,
                           }}
                           aria-hidden={!showElimsColumn}
                         >
                           <span className="font-black text-sm tracking-tight leading-none tabular-nums text-black">
                             {currentKills}
                           </span>
                         </div>
                       </div>
                    </motion.div>
                 );
                })}
              </div>

              <motion.div 
                custom={{
                  total: sortedPreviewTeams.length,
                  direction: effectiveAnimationConfig.staggerDirection || 'top-down',
                  delay: effectiveAnimationConfig.staggerDelay || 0.05,
                  stagger: effectiveAnimationConfig.staggerChildren
                }}
                variants={bottomBoxVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="rounded-b-xl px-6 py-4 flex justify-center gap-8 shadow-2xl mt-0.5 border-t-2 border-black/10 relative z-20 shrink-0" 
                style={resolveLeaderboardSurfaceStyle(
                  visualConfig.headerBg,
                  visualConfig.headerBgImage,
                  visualConfig
                )}
              >
                 <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: visualConfig.statusAlive }} />
                    <span className="text-[11px] font-[900] uppercase tracking-widest drop-shadow-sm" style={{ color: visualConfig.headerText }}>{t('olb.alive')}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: visualConfig.statusKnock }} />
                    <span className="text-[11px] font-[900] uppercase tracking-widest drop-shadow-sm" style={{ color: visualConfig.headerText }}>{t('olb.knock')}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: visualConfig.statusDead }} />
                    <span className="text-[11px] font-[900] uppercase tracking-widest drop-shadow-sm" style={{ color: visualConfig.headerText }}>{t('olb.eliminated')}</span>
                 </div>
              </motion.div>
           </div>
           </div>
    );
  }, [
    showOverlay,
    isEndgamePhase,
    showElimsColumn,
    layoutConfig,
    leaderboardPanelWidth,
    visualConfig,
    leaderboardFontFamily,
    matchTitle,
    sortedPreviewTeams,
    activePopups,
    aliveCount,
    killPointValue,
    effectiveAnimationConfig,
    getStatusColor,
    currentMatch,
    headerVariants,
    rowVariants,
    bottomBoxVariants,
    projectPlayers,
    contentionCount,
  ]);

  const effectiveFinalFourTeamsData = finalFourHoldPreview
    ? [...STAGED_FINAL_FOUR_PREVIEW_DATA]
    : finalFourTeamsData;

  const finalFourCardLayout = useMemo(
    () => ({
      tagFontSize: finalFourLayout.tagFontSize ?? DEFAULT_FINAL_FOUR_LAYOUT.tagFontSize,
      wwcdLabelFontSize:
        finalFourLayout.wwcdLabelFontSize ?? DEFAULT_FINAL_FOUR_LAYOUT.wwcdLabelFontSize,
      wwcdPctFontSize:
        finalFourLayout.wwcdPctFontSize ?? DEFAULT_FINAL_FOUR_LAYOUT.wwcdPctFontSize,
      fontFamily: finalFourFontFamily,
    }),
    [finalFourLayout, finalFourFontFamily]
  );

  const finalFourOverlayPanel = useMemo(() => {
    if (
      (!finalFourHoldPreview && (!showOverlay || !isEndgamePhase)) ||
      effectiveFinalFourTeamsData.length === 0
    ) {
      return null;
    }

    return (
      <div
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-[400] px-10"
        style={{
          top: `${finalFourLayout.yOffset ?? DEFAULT_FINAL_FOUR_LAYOUT.yOffset}px`,
          fontFamily: finalFourFontFamily,
        }}
      >
        <div
          className="flex flex-row items-stretch justify-center w-full max-w-[1680px]"
          style={{
            gap: `${finalFourLayout.cardGap ?? DEFAULT_FINAL_FOUR_LAYOUT.cardGap}px`,
            scale: (finalFourLayout.scale ?? DEFAULT_FINAL_FOUR_LAYOUT.scale) / 100,
            transform: `translateX(${finalFourLayout.xOffset ?? DEFAULT_FINAL_FOUR_LAYOUT.xOffset}px)`,
            transformOrigin: 'top center',
          }}
        >
          <AnimatePresence mode="popLayout">
            {effectiveFinalFourTeamsData.map((entry, idx) => (
              <motion.div
                key={entry.rank}
                layout
                custom={idx}
                initial={{ y: -72, opacity: 0, scale: 0.92 }}
                animate={{
                  y: 0,
                  opacity: 1,
                  scale: 1,
                  transition: {
                    delay: 0.12 + idx * 0.07,
                    duration: 0.55,
                    ease: FINAL_FOUR_ENTER_EASE,
                  },
                }}
                exit={{
                  y: -48,
                  opacity: 0,
                  scale: 0.94,
                  transition: { duration: 0.45, ease: FINAL_FOUR_PANEL_EXIT_EASE },
                }}
                className="shrink-0"
              >
                <FinalFourTeamCard
                  entry={entry}
                  visual={visualConfig}
                  layout={finalFourCardLayout}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }, [
    showOverlay,
    isEndgamePhase,
    finalFourHoldPreview,
    effectiveFinalFourTeamsData,
    finalFourLayout,
    visualConfig,
    finalFourFontFamily,
    finalFourCardLayout,
  ]);

  const elimBannerPreviewNode = useMemo(
    () => (
      <div
        className="absolute z-[500] pointer-events-none"
        style={elimBannerPositionStyle}
      >
        <TeamEliminatedBanner
          alert={showEliminationBanner ? displayElimAlert : null}
          visual={elimBannerVisual}
          tuningPreview={isElimBannerTuningPreview}
        />
      </div>
    ),
    [
      displayElimAlert,
      elimBannerVisual,
      isElimBannerTuningPreview,
      elimBannerPositionStyle,
      showEliminationBanner,
    ]
  );

  const terminatorBannerNode = useMemo(
    () => (
      <TerminatorBanner
        target={terminatorVisual.previewHold ? TERMINATOR_PREVIEW_TARGET : activeTerminatorTarget}
        config={terminatorVisual}
        currentMatch={currentMatch}
        forceShow={terminatorVisual.previewHold}
      />
    ),
    [activeTerminatorTarget, currentMatch, terminatorVisual]
  );

  const resolvedFirstBloodTarget = useMemo(
    () =>
      activeFirstBloodTarget
        ? enrichFirstBloodTarget(activeFirstBloodTarget, teams, projectPlayers)
        : null,
    [activeFirstBloodTarget, projectPlayers, teams]
  );

  const firstBloodBannerNode = useMemo(
    () => (
      <FirstBloodBanner
        target={firstBloodVisual.previewHold ? FIRST_BLOOD_PREVIEW_TARGET : resolvedFirstBloodTarget}
        config={firstBloodVisual}
        forceShow={firstBloodVisual.previewHold}
      />
    ),
    [firstBloodVisual, resolvedFirstBloodTarget]
  );

  const livePreviewContent = useMemo(
    () => (
      <div
        key={visualOnly || monitorFeed ? feedPlayKey ?? 'overall-ranking-feed' : 'overall-ranking-control'}
        style={style}
        className={`w-[1920px] h-[1080px] bg-transparent relative overflow-hidden font-sans select-none ${style?.position === 'absolute' ? '' : 'mx-auto'}`}
      >
        {!visualOnly && (
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'conic-gradient(#0a0a0a 90deg, #050505 90deg 180deg, #0a0a0a 180deg 270deg, #050505 270deg)',
              backgroundSize: '40px 40px',
            }}
          />
        )}

        {elimBannerPreviewNode}
        {firstBloodBannerNode}
        {terminatorBannerNode}

        <AnimatePresence
          initial={visualOnly || monitorFeed}
          onExitComplete={isProgramDrivenFeed ? onOverallRankingExitComplete : undefined}
        >
          {showOverallRankingPanel && leaderboardOverlayPanel && (
            <motion.div
              key={`overall-ranking-asset-${getAnimationSignature(effectiveAnimationConfig)}-${visualOnly || monitorFeed ? feedPlayKey ?? 0 : 'control'}`}
              {...rankingRootMotionProps}
              className="absolute inset-0 pointer-events-none z-[450]"
            >
              {leaderboardOverlayPanel}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {showFinalFourTopBar && (
            <motion.div
              key="final-four-bar"
              className="absolute inset-0 pointer-events-none z-[400]"
              initial={{ y: -120, opacity: 0 }}
              animate={{
                y: 0,
                opacity: 1,
                transition: { duration: 0.6, ease: FINAL_FOUR_ENTER_EASE, delay: 0.08 },
              }}
              exit={{
                y: -80,
                opacity: 0,
                transition: { duration: 0.45, ease: FINAL_FOUR_PANEL_EXIT_EASE },
              }}
            >
              {finalFourOverlayPanel}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    ),
    [
      rankingRootMotionProps,
      style,
      visualOnly,
      monitorFeed,
      isProgramDrivenFeed,
      feedPlayKey,
      elimBannerPreviewNode,
      firstBloodBannerNode,
      terminatorBannerNode,
      leaderboardOverlayPanel,
      finalFourOverlayPanel,
      showOverlay,
      showOverallRankingPanel,
      isEndgamePhase,
      showFinalFourTopBar,
    ]
  );

  // Sync preview content to parent
  useEffect(() => {
    if (onPreviewContentChange && !visualOnly) {
      onPreviewContentChange(livePreviewContent);
    }
  }, [livePreviewContent, onPreviewContentChange, visualOnly]);

  if (visualOnly) {
    return livePreviewContent;
  }

  return (
    <div className="flex flex-col h-full bg-black animate-in fade-in duration-300 font-sans select-none overflow-hidden rounded-tl-[10px] border-l border-t border-white/5">
      {!isGlobalStudio && (
      <header className="h-auto md:h-14 bg-black border-b border-white/10 flex flex-col md:flex-row items-center px-6 py-4 md:py-0 justify-between shrink-0 relative z-[100] gap-4">
        <div className="flex items-center gap-4 md:gap-8 justify-between w-full md:w-auto">
            <div className="flex flex-col cursor-pointer" onClick={onBack}>
                <div className="flex items-center gap-1">
                    <span className="text-white font-[950] italic text-[12px] tracking-tight uppercase leading-none">{t('olb.setup')}</span>
                    <span className="text-[#ccff00] font-[950] italic text-[12px] tracking-tight uppercase leading-none">{t('olb.asset')}</span>
                </div>
                <span className="text-[7px] font-black text-zinc-700 tracking-[0.4em] uppercase mt-0.5 leading-none">{t('olb.masterConfiguration')}</span>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ccff00] animate-pulse shadow-[0_0_8px_#ccff00]" />
                <span className="text-white font-black text-[10px] tracking-[0.2em] uppercase italic">
                  {theme.name}
                </span>
            </div>
        </div>
        <div className="flex items-center gap-2 justify-center w-full md:w-auto pb-2 md:pb-0">
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
              <h3 className="text-[7px] font-black text-zinc-700 tracking-[0.3em] uppercase mb-6 whitespace-nowrap italic">{t('olb.availableTemplates')}</h3>
              <div className="space-y-2 whitespace-nowrap overflow-y-auto custom-scrollbar pr-2">
                {availableAssets.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => onSelectAsset && onSelectAsset(item)} 
                    className={`p-3 rounded-lg border transition-all cursor-pointer shadow-[0_0_15px_rgba(204,255,0,0.03)] group flex items-center justify-between ${item.id === asset.id ? 'border-[#ccff00]/40 bg-[#ccff00]/5' : 'border-white/5 bg-zinc-900/20 opacity-60 hover:opacity-100 hover:border-white/20'}`}
                  >
                    <h4 className={`text-[9px] font-black uppercase tracking-widest ${item.id === asset.id ? 'text-[#ccff00]' : 'text-white'}`}>{item.name}</h4>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSidebarAssetPlay(item.id);
                      }}
                      className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                        getAssetStatusProp ? (
                          getAssetStatusProp(item.id) === 2 
                            ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]' 
                            : getAssetStatusProp(item.id) === 1 
                              ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.5)]' 
                              : 'bg-white/5 hover:bg-[#ccff00] hover:text-black text-white'
                        ) : (
                          programAssetId === item.id ? 'bg-[#ccff00] text-black shadow-[0_0_10px_rgba(204,255,0,0.5)]' : 'bg-white/5 hover:bg-[#ccff00] hover:text-black text-white'
                        )
                      }`}
                      title={
                        getAssetStatusProp ? (
                          getAssetStatusProp(item.id) === 2 ? "Stop Program" : getAssetStatusProp(item.id) === 1 ? "Stop Preview" : "Play"
                        ) : "Play to PGM/OUTPUT"
                      }
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

            {/* Resize Handle */}
            <div 
              onMouseDown={startResizing}
              className={`w-1 hover:w-1.5 bg-transparent hover:bg-[#ccff00]/30 cursor-col-resize transition-all z-50 relative group ${isResizing ? 'bg-[#ccff00]/50 w-1.5' : ''}`}
            >
              <div className="absolute inset-y-0 -left-2 -right-2 cursor-col-resize" />
            </div>
          </>
        )}

        <main className="flex-1 bg-black flex flex-col overflow-hidden relative">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
            <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar relative z-10">
                <div className="max-w-5xl mx-auto space-y-6">
                    <div className="flex bg-zinc-950 p-0.5 rounded-xl border border-white/5 border-l-[3px] border-l-[#ccff00]/40 shadow-2xl mb-8">
                        {(['DATA', 'VISUAL', 'ANIMATION'] as const).map(tab => (
                          <button
                            key={tab}
                            onClick={() => {
                              setConfigTab(tab as 'DATA' | 'VISUAL' | 'ANIMATION');
                              if (tab === 'VISUAL') setVisualSettingsPanel('choose');
                            }}
                            className={`flex-1 py-1.5 text-[8px] font-black tracking-widest uppercase rounded-lg transition-all ${configTab === tab ? 'bg-[#ccff00] text-black' : 'text-zinc-600 hover:text-white'}`}
                          >
                            {tab === 'DATA' ? t('olb.dataInput') : tab === 'VISUAL' ? t('olb.visualInput') : t('olb.animationInput')}
                          </button>
                        ))}
                    </div>

                    {configTab === 'DATA' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="flex flex-wrap items-stretch justify-start gap-2.5">
                                {/* HEADER TITLE */}
                                <div className="bg-[#151518] border border-white/5 rounded-[20px] p-3 flex flex-col items-center justify-between flex-1 min-w-[130px] h-24 shadow-xl">
                                    <div className="flex items-center gap-1.5">
                                        <Type size={10} className="text-[#ccff00]" />
                                        <h3 className="text-[8px] font-black text-zinc-500 tracking-[0.2em] uppercase">{t('olb.headerTitle')}</h3>
                                    </div>
                                    <div className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-2 flex items-center justify-center">
                                        <input 
                                            type="text" 
                                            value={matchTitle} 
                                            onChange={(e) => setMatchTitle(e.target.value)} 
                                            className="w-full bg-transparent text-center text-[10px] font-black text-white uppercase outline-none placeholder:text-zinc-800"
                                        />
                                    </div>
                                </div>

                                {/* MATCH SEQUENCE */}
                                <div className="bg-[#151518] border border-white/5 rounded-[20px] p-3 flex flex-col items-center justify-between flex-1 min-w-[150px] h-24 shadow-xl">
                                    <div className="flex items-center gap-1.5">
                                        <Swords size={10} className="text-[#ccff00]" />
                                        <h3 className="text-[8px] font-black text-zinc-500 tracking-[0.2em] uppercase">{t('olb.matchSequence')}</h3>
                                    </div>
                                    <div className="flex items-center bg-black/40 border border-white/5 rounded-xl p-0.5 w-full h-10">
                                        <button onClick={() => contentionCount <= 1 && setCurrentMatch(Math.max(1, currentMatch - 1))} className={`w-8 h-full flex items-center justify-center transition-all ${contentionCount > 1 ? 'text-zinc-800 cursor-not-allowed opacity-50' : 'text-zinc-600 hover:text-white'}`}><Minus size={14} /></button>
                                        <div className="flex-1 flex flex-col items-center justify-center border-x border-white/5 h-full">
                                            <span className="text-[5px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-0.5">{t('olb.game')}</span>
                                            <span className="text-base font-black text-[#ccff00] leading-none">{currentMatch}</span>
                                        </div>
                                        <button onClick={() => isMatchReadyToEnd && startNewMatch(currentMatch + 1)} className={`w-8 h-full flex items-center justify-center transition-all ${isMatchReadyToEnd ? 'text-zinc-600 hover:text-white' : 'text-zinc-800 cursor-not-allowed opacity-50'}`}><Plus size={14} /></button>
                                    </div>
                                </div>

                                {/* STATUS & END MATCH */}
                                <div className="flex flex-col gap-2 flex-1 min-w-[170px] h-24">
                                    <div className={`
                                        w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 h-8
                                        ${isMatchReadyToEnd 
                                            ? 'bg-green-500/5 border-green-500/20 text-green-500' 
                                            : 'bg-red-500/5 border-red-500/20 text-red-500'
                                        }
                                    `}>
                                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isMatchReadyToEnd ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'}`} />
                                        <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                                            {contentionCount === 0
                                              ? 'READY: MATCH SELESAI'
                                              : contentionCount === 1
                                                ? 'READY: WINNER FOUND'
                                                : contentionCount === 2
                                                  ? 'READY: TOP 2 — LANJUT MATCH'
                                                  : isEndgamePhase
                                                    ? showFinalFourTopBar
                                                      ? `LIVE: FINAL ${survivingMatchCount} — BAR ATAS`
                                                      : 'LIVE: WINNER — BAR KELUAR'
                                                    : `LIVE: ${contentionCount} TIM TANPA PLACEMENT`}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => setIsEndMatchModalOpen(true)} 
                                        className={`flex-1 rounded-2xl font-black text-[9px] tracking-[0.2em] uppercase flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-xl ${isMatchReadyToEnd ? 'bg-[#ccff00] text-black' : 'bg-[#222] text-zinc-400 border border-white/5 hover:bg-[#2a2a2a]'}`}
                                    >
                                        <ArrowRight size={14} strokeWidth={3} /><span>{t('olb.endMatch')}</span>
                                    </button>
                                </div>

                                {/* SCORING & TIE-BREAKER */}
                                <div className="flex flex-col gap-2 flex-1 min-w-[150px] h-24">
                                    <button onClick={() => setIsScoringModalOpen(true)} className="h-11 bg-[#2563eb] hover:bg-[#3b82f6] text-white rounded-xl font-black text-[9px] tracking-[0.2em] uppercase shadow-[0_0_15px_rgba(37,99,235,0.15)] flex items-center justify-center gap-2.5 transition-all active:scale-95">
                                        <Trophy size={14} /> {t('olb.scoring')}
                                    </button>
                                    <button onClick={() => setIsTieBreakerModalOpen(true)} className="h-11 bg-[#1a1c0e] border border-[#ccff00]/20 hover:border-[#ccff00]/50 text-[#ccff00] rounded-xl font-black text-[9px] tracking-[0.2em] uppercase flex items-center justify-center gap-2.5 transition-all active:scale-95">
                                        <ListOrdered size={14} /> {t('olb.tieBreaker')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleUndoLastKill}
                                      title="Batalkan 1 aksi terakhir di seluruh match (semua tim)"
                                      className="h-11 bg-zinc-900 border border-white/10 hover:border-orange-500/40 text-zinc-400 hover:text-orange-400 rounded-xl font-black text-[9px] tracking-[0.2em] uppercase flex items-center justify-center gap-2 transition-all active:scale-95"
                                    >
                                        <Undo2 size={14} /> {t('olb.undoLast')}
                                    </button>
                                </div>

                                {currentMatch > 1 && (
                                  <button
                                    type="button"
                                    onClick={handleResetCurrentMatch}
                                    className="bg-[#1a1a1d] hover:bg-amber-600/10 border border-white/5 hover:border-amber-500/40 text-zinc-500 hover:text-amber-400 rounded-[20px] p-3 flex flex-col items-center justify-center gap-2 flex-1 min-w-[110px] h-24 transition-all active:scale-95 group shadow-xl"
                                    title={`Ulang Match ${currentMatch} — kill & status saja, poin match sebelumnya tetap`}
                                  >
                                    <RotateCcw size={16} className="group-hover:rotate-[-45deg] transition-transform" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.15em] text-center leading-tight">
                                      {t('olb.resetMatch')}
                                    </span>
                                    <span className="text-[7px] font-bold text-zinc-600 group-hover:text-amber-500/80 uppercase">
                                      M{currentMatch}
                                    </span>
                                  </button>
                                )}
                                {/* RESET ALL */}
                                <button onClick={handleResetAll} className="bg-[#1a1a1d] hover:bg-red-600/10 border border-white/5 hover:border-red-500/30 text-zinc-500 hover:text-red-500 rounded-[20px] p-3 flex flex-col items-center justify-center gap-2 flex-1 min-w-[110px] h-24 transition-all active:scale-95 group shadow-xl">
                                    <RotateCcw size={16} className="group-hover:rotate-[-45deg] transition-transform" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">{t('olb.resetAll')}</span>
                                </button>
                                <button onClick={openAutoSyncModal} className="bg-[#1a1a1d] hover:bg-[#ccff00]/10 border border-white/5 hover:border-[#ccff00]/30 text-zinc-500 hover:text-[#ccff00] rounded-[20px] p-3 flex flex-col items-center justify-center gap-2 flex-1 min-w-[110px] h-24 transition-all active:scale-95 group shadow-xl">
                                    <RefreshCw size={16} />
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">{t('olb.autoSync')}</span>
                                </button>
                            </div>

                            <div className="flex items-center gap-2 px-2 mb-2 flex-wrap">
                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
                                  matchKillRules.finisherKeepsKillOnRevive
                                    ? 'bg-[#ccff00]/10 text-[#ccff00] border-[#ccff00]/30'
                                    : 'bg-orange-600/10 text-orange-400 border-orange-500/30'
                                }`}>
                                  M{currentMatch} · {matchKillRules.finisherKeepsKillOnRevive ? 'OFF · KILL TETAP' : 'ON · KILL BERKURANG'}
                                </span>
                            </div>

                            <div className="bg-[#111] border border-white/5 p-1 rounded-2xl">
                                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-[#1a1d26] rounded-t-xl mb-1 border-b border-black/20">
                                    <div className="col-span-8 text-[9px] font-black text-[#64748b] tracking-widest uppercase flex items-center gap-2">
                                        <Database size={12} />
                                        {t('olb.teamIdentitySlots')}
                                        <button 
                                            onClick={toggleLeaderboardFlags}
                                            className={`ml-4 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 ${visualConfig.showFlags ? 'bg-[#ccff00]/10 border-[#ccff00]/30 text-[#ccff00] hover:bg-[#ccff00]/20' : 'bg-zinc-800 border-white/5 text-zinc-600 hover:text-zinc-400'}`}
                                            title={visualConfig.showFlags ? "Hide Country Flags" : "Show Country Flags"}
                                        >
                                            <Flag size={8} /> {visualConfig.showFlags ? t('olb.flagsOn') : t('olb.flagsOff')}
                                        </button>
                                    </div>
                                    <div className="col-span-4 text-[9px] font-black text-[#64748b] tracking-widest uppercase text-right pr-4">{t('olb.pointsAction')}</div>
                                </div>

                                <div className="space-y-1">
                                    {teams.map((team, idx) => (
                                        <div key={idx} className={`bg-[#1e2030] border border-black/40 rounded-lg hover:border-[#ccff00]/30 transition-all group overflow-hidden ${team.expanded ? 'bg-[#15171e]' : ''}`}>
                                            <div className={`grid grid-cols-12 gap-4 p-2 transition-all ${team.expanded ? 'items-start pt-4 pb-4' : 'items-center'}`}>
                                                <div className={`flex items-center gap-3 transition-all ${team.expanded ? 'col-span-4 items-start' : 'col-span-8'}`}>
                                                    <div className="flex flex-col items-center gap-1 min-w-[40px] shrink-0">
                                                        <span className="text-[#64748b] text-[10px] font-black">#{team.rank}</span>
                                                        <div onClick={() => toggleRowActive(idx)} className={`w-8 h-4 rounded-full border border-white/10 relative cursor-pointer transition-colors ${team.active ? 'bg-[#ccff00]' : 'bg-black'}`}>
                                                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-md transition-all ${team.active ? 'left-4' : 'left-0.5'}`} />
                                                        </div>
                                                    </div>
                                                    <div className="w-[1px] h-8 bg-white/5 shrink-0" />

                                                    {/* UPDATED COUNTRY SELECTOR TRIGGER */}
                                                    {visualConfig.showFlags && (
                                                        <div className="flex flex-col items-center shrink-0 animate-in fade-in zoom-in duration-300">
                                                            <span className="text-[6px] font-black text-zinc-500 uppercase mb-1">{t('olb.nat')}</span>
                                                            <button
                                                              onClick={() => setIsCountryModalOpen({ rankIndex: idx })}
                                                              className="w-10 h-7 bg-black/40 border border-white/10 rounded overflow-hidden flex items-center justify-center hover:border-[#ccff00]/50 transition-all group/flag"
                                                            >
                                                                {team.country ? (
                                                                    <img src={`https://flagcdn.com/w40/${team.country.toLowerCase()}.png`} className="w-full h-full object-cover" alt={team.country} />
                                                                ) : (
                                                                    <Globe size={14} className="text-zinc-700 group-hover/flag:text-[#ccff00]" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className="relative group/logo w-10 h-10 rounded-lg bg-black border border-white/10 flex items-center justify-center shrink-0 cursor-pointer overflow-hidden hover:border-[#ccff00]/50 transition-all">
                                                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-20" onChange={(e) => handleTeamLogoUpload(e, idx)} />
                                                        {team.teamLogo ? <img src={team.teamLogo} className="w-full h-full object-contain p-1" /> : <Shield size={14} className="text-zinc-700" />}
                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity z-10 pointer-events-none"><Upload size={12} className="text-[#ccff00]" /></div>
                                                    </div>
                                                    <button onClick={() => openDbModal(idx)} className="w-6 h-6 rounded bg-[#ccff00]/10 border border-[#ccff00]/20 flex items-center justify-center text-[#ccff00] hover:bg-[#ccff00] hover:text-black transition-all shrink-0" title="Ganti Tim dari Database"><Database size={10} /></button>
                                                    <div className="flex flex-col gap-1 w-full min-w-0">
                                                        <input type="text" value={team.team} onChange={(e) => updateTeamField(idx, 'team', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-[#ccff00] text-xs font-black text-white uppercase outline-none placeholder:text-zinc-600 truncate" />
                                                        <input type="text" value={team.teamAbbreviation || ''} onChange={(e) => updateTeamField(idx, 'teamAbbreviation', e.target.value.toUpperCase())} placeholder="SINGKATAN" className="w-full bg-transparent border-b border-transparent focus:border-[#ccff00] text-[9px] font-black text-[#ccff00] uppercase outline-none placeholder:text-zinc-600 truncate" />
                                                        <div className="flex items-center gap-2">
                                                            <span className="inline-flex items-center w-fit px-1.5 py-0.5 bg-[#F97316] text-black text-[8px] font-black rounded-sm uppercase tracking-tighter">K: {team.playerKills.reduce((a,b)=>a+b,0)}</span>
                                                            {team.totalWwcds > 0 && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#ccff00] text-black text-[8px] font-black rounded-sm uppercase tracking-tighter"><Trophy size={8}/> {team.totalWwcds}</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className={`transition-all duration-300 ${team.expanded ? 'col-span-6 opacity-100' : 'hidden opacity-0'}`}>
                                                    {team.expanded && (
                                                        <div className="bg-black/20 rounded-xl p-2 border border-white/5 animate-in fade-in slide-in-from-left-2">
                                                            <div className="grid grid-cols-4 gap-2">
                                                                {team.playerNames.map((name, pIdx) => {
                                                                    const currentStatus = team.status[pIdx];
                                                                    const currentKills = team.playerKills[pIdx] || 0;
                                                                    const canManualAddKill = currentStatus === 1;
                                                                    const placementLocked = team.placementRank !== null;
                                                                    const canKnockElim =
                                                                      !placementLocked &&
                                                                      (currentStatus === 1 || currentStatus === 2);
                                                                    const canReviveDead =
                                                                      !placementLocked && currentStatus === 0;
                                                                    return (
                                                                        <div key={pIdx} className="bg-black/40 rounded-lg p-1.5 border border-white/5 hover:border-white/10 transition-all flex flex-col gap-1.5">
                                                                            <div className="flex items-center gap-1 border-b border-white/5 pb-1">
                                                                                <span className="text-[7px] font-black text-zinc-500 w-3">P{pIdx+1}</span>
                                                                                <input type="text" value={name} onChange={(e) => updatePlayerName(idx, pIdx, e.target.value)} className="w-full bg-transparent border-none text-[9px] font-bold text-white uppercase outline-none text-center" />
                                                                            </div>
                                                                            <div className="flex items-center justify-between bg-zinc-900 rounded border border-white/5 px-1">
                                                                                <button onClick={() => updatePlayerKills(idx, pIdx, -1)} className="w-4 h-4 flex items-center justify-center hover:text-white text-zinc-500"><Minus size={8}/></button>
                                                                                <span className="text-[9px] font-black text-[#ccff00]">{currentKills}</span>
                                                                                <button
                                                                                  type="button"
                                                                                  disabled={!canManualAddKill}
                                                                                  onClick={() => canManualAddKill && openKillVictimModal(idx, pIdx)}
                                                                                  className={`w-4 h-4 flex items-center justify-center transition-all ${canManualAddKill ? 'hover:text-[#ccff00] text-zinc-500' : 'text-zinc-800 cursor-not-allowed opacity-35'}`}
                                                                                  title={canManualAddKill ? 'Tambah kill — pilih korban' : 'OFF — pemain knock/mati tidak bisa + manual'}
                                                                                >
                                                                                  <Plus size={8} />
                                                                                </button>
                                                                            </div>
                                                                            <div className="flex gap-1">
                                                                                <button
                                                                                  type="button"
                                                                                  disabled={!canKnockElim}
                                                                                  onClick={() => canKnockElim && handleKnock(idx, pIdx)}
                                                                                  className={`flex-1 py-1 rounded text-[6px] font-black uppercase ${currentStatus === 2 && canKnockElim ? 'bg-red-600 text-white' : canKnockElim ? 'bg-zinc-800 text-zinc-600 hover:bg-zinc-700' : 'bg-zinc-900 text-zinc-800 cursor-not-allowed opacity-40'}`}
                                                                                  title={placementLocked ? 'Tim eliminasi — terkunci' : 'Knock / Revive knock'}
                                                                                >
                                                                                  K
                                                                                </button>
                                                                                <button
                                                                                  type="button"
                                                                                  disabled={placementLocked ? currentStatus !== 1 && currentStatus !== 2 : false}
                                                                                  onClick={() => {
                                                                                    if (currentStatus === 0 && !canReviveDead) return;
                                                                                    if (placementLocked && currentStatus === 0) return;
                                                                                    handleElimButton(idx, pIdx);
                                                                                  }}
                                                                                  className={`flex-1 py-1 rounded text-[6px] font-black uppercase ${currentStatus === 0 && canReviveDead ? 'bg-red-900/80 text-red-300 hover:bg-red-800' : currentStatus === 0 ? 'bg-zinc-900 text-zinc-800 cursor-not-allowed opacity-40' : 'bg-zinc-800 text-zinc-600 hover:bg-zinc-700'}`}
                                                                                  title={
                                                                                    placementLocked
                                                                                      ? 'Tim eliminasi — tidak bisa revive'
                                                                                      : currentStatus === 0
                                                                                        ? `Revive — ${matchKillRules.finisherKeepsKillOnRevive ? 'kill finisher tetap' : 'kill finisher dikurangi'}`
                                                                                        : 'Elim — pilih penyebab mati'
                                                                                  }
                                                                                >
                                                                                  E
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className={`flex justify-end gap-3 pr-2 transition-all ${team.expanded ? 'col-span-2 items-start' : 'col-span-4 items-center'}`}>
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <div className="flex items-center bg-[#0f1115] rounded-md border border-white/5 px-2 py-1 shadow-inner h-fit">
                                                            <div className="w-12 text-center">
                                                                <input type="number" value={team.points} onChange={(e) => { const newTeams = [...teams]; newTeams[idx].points = parseInt(e.target.value) || 0; setTeams(newTeams); }} className="w-full bg-transparent text-center text-sm font-black text-white outline-none" />
                                                                <span className="text-[6px] font-bold text-zinc-600 uppercase block leading-none">{t('olb.pts')}</span>
                                                            </div>
                                                        </div>
                                                        {team.placementRank !== null && (
                                                            <span className="inline-flex items-center w-fit px-1.5 py-0.5 bg-red-600 text-white text-[7px] font-black rounded-sm uppercase tracking-tighter animate-in zoom-in duration-300 whitespace-nowrap">
                                                                PLACED: #{team.placementRank}
                                                            </span>
                                                        )}
                                                        {findLastKillEventIndexForTeam(killEventLog, idx) >= 0 && (
                                                          <button
                                                            type="button"
                                                            onClick={() => handleUndoTeam(idx)}
                                                            title="Batalkan aksi terakhir tim ini (knock/kill/elim) dari log"
                                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-600/20 border border-orange-500/40 text-orange-300 hover:bg-orange-600/35 text-[7px] font-black rounded-sm uppercase tracking-tighter transition-colors"
                                                          >
                                                            <Undo2 size={8} /> UNDO
                                                          </button>
                                                        )}
                                                    </div>
                                                    <button onClick={() => toggleRowExpanded(idx)} className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${team.expanded ? 'bg-[#ccff00] text-black' : 'bg-black/20 text-zinc-500 hover:text-white'}`}>
                                                        {team.expanded ? <ChevronUp size={14} /> : <Settings2 size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {configTab === 'VISUAL' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                          {visualSettingsPanel === 'choose' && (
                            <div className="space-y-4">
                              <div className="text-center py-2">
                                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.25em]">
                                  Pilih pengaturan visual
                                </h3>
                                <p className="text-[8px] text-zinc-500 normal-case mt-1.5 max-w-md mx-auto leading-relaxed">
                                  Overall Ranking, Final Four WWCD, Elimination Banner, dan Terminator dipisah agar lebih mudah diatur.
                                </p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                                <button
                                  type="button"
                                  onClick={() => setVisualSettingsPanel('leaderboard')}
                                  className="group p-6 bg-zinc-900 border border-white/10 rounded-[20px] text-left hover:border-[#ccff00]/50 hover:bg-zinc-900/80 transition-all shadow-sm"
                                >
                                  <div className="w-11 h-11 rounded-xl bg-[#ccff00]/15 border border-[#ccff00]/30 flex items-center justify-center mb-4 group-hover:bg-[#ccff00]/25 transition-colors">
                                    <ListOrdered size={22} className="text-[#ccff00]" />
                                  </div>
                                  <h4 className="text-[11px] font-black text-white uppercase tracking-widest mb-1">
                                    Overall Ranking
                                  </h4>
                                  <p className="text-[8px] text-zinc-500 normal-case leading-relaxed">
                                    Panel (warna) atau Custom Image (link), layout, posisi, dan jenis font.
                                  </p>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setVisualSettingsPanel('elimination')}
                                  className="group p-6 bg-zinc-900 border border-white/10 rounded-[20px] text-left hover:border-red-500/40 hover:bg-zinc-900/80 transition-all shadow-sm"
                                >
                                  <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-4 group-hover:bg-red-500/25 transition-colors">
                                    <Skull size={22} className="text-red-400" />
                                  </div>
                                  <h4 className="text-[11px] font-black text-white uppercase tracking-widest mb-1">
                                    Elimination Banner
                                  </h4>
                                  <p className="text-[8px] text-zinc-500 normal-case leading-relaxed">
                                    Panel / Custom Image, preview, posisi banner, font, warna, dan overlay # / TAG.
                                  </p>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setVisualSettingsPanel('finalFour')}
                                  className="group p-6 bg-zinc-900 border border-white/10 rounded-[20px] text-left hover:border-green-500/40 hover:bg-zinc-900/80 transition-all shadow-sm"
                                >
                                  <div className="w-11 h-11 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center mb-4 group-hover:bg-green-500/25 transition-colors">
                                    <Trophy size={22} className="text-green-400" />
                                  </div>
                                  <h4 className="text-[11px] font-black text-white uppercase tracking-widest mb-1">
                                    Final Four WWCD
                                  </h4>
                                  <p className="text-[8px] text-zinc-500 normal-case leading-relaxed">
                                    Bar 4 tim endgame — Panel / Custom Image, posisi, warna, font, dan delay keluar saat 1 tim.
                                  </p>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setVisualSettingsPanel('terminator')}
                                  className="group p-6 bg-zinc-900 border border-white/10 rounded-[20px] text-left hover:border-[#ccff00]/45 hover:bg-zinc-900/80 transition-all shadow-sm"
                                >
                                  <div className="w-11 h-11 rounded-xl bg-[#ccff00]/15 border border-[#ccff00]/30 flex items-center justify-center mb-4 group-hover:bg-[#ccff00]/25 transition-colors">
                                    <Target size={22} className="text-[#ccff00]" />
                                  </div>
                                  <h4 className="text-[11px] font-black text-white uppercase tracking-widest mb-1">
                                    Terminator
                                  </h4>
                                  <p className="text-[8px] text-zinc-500 normal-case leading-relaxed">
                                    Banner kill player per game — trigger, durasi, preview, warna, dan custom background.
                                  </p>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setVisualSettingsPanel('firstBlood')}
                                  className="group p-6 bg-zinc-900 border border-white/10 rounded-[20px] text-left hover:border-[#ccff00]/45 hover:bg-zinc-900/80 transition-all shadow-sm"
                                >
                                  <div className="w-11 h-11 rounded-xl bg-[#ccff00]/15 border border-[#ccff00]/30 flex items-center justify-center mb-4 group-hover:bg-[#ccff00]/25 transition-colors">
                                    <Droplets size={22} className="text-[#ccff00]" />
                                  </div>
                                  <h4 className="text-[11px] font-black text-white uppercase tracking-widest mb-1">
                                    First Blood
                                  </h4>
                                  <p className="text-[8px] text-zinc-500 normal-case leading-relaxed">
                                    Banner kill pertama match — durasi, preview, posisi, warna, teks, dan custom design.
                                  </p>
                                </button>
                              </div>
                            </div>
                          )}

                          {visualSettingsPanel !== 'choose' && (
                            <button
                              type="button"
                              onClick={() => setVisualSettingsPanel('choose')}
                              className="flex items-center gap-2 text-[8px] font-black text-zinc-500 hover:text-[#ccff00] uppercase tracking-widest transition-colors"
                            >
                              <Undo2 size={12} />
                              Kembali ke pilihan
                            </button>
                          )}

                          {visualSettingsPanel === 'leaderboard' && (
                        <div className="space-y-6">
                           <div className="p-4 bg-zinc-950 border border-white/5 rounded-xl">
                                <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-1 flex items-center gap-2">
                                  <Link2 size={12} className="text-[#ccff00]" />
                                  Desain Overall Ranking
                                </h4>
                                <p className="text-[7px] text-zinc-500 normal-case mb-3 tracking-wide">
                                  Panel = warna solid · Custom Image = background via link (seperti Elimination Banner)
                                </p>
                                <div className="flex gap-2">
                                  {(['panels', 'customImage'] as const satisfies readonly LeaderboardDesignMode[]).map(
                                    (mode) => (
                                      <button
                                        key={mode}
                                        type="button"
                                        onClick={() =>
                                          setVisualConfig((prev) => ({
                                            ...prev,
                                            leaderboardDesignMode: mode,
                                          }))
                                        }
                                        className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                                          (visualConfig.leaderboardDesignMode ?? 'panels') === mode
                                            ? 'bg-[#ccff00] text-black border-[#ccff00]'
                                            : 'bg-black text-zinc-500 border-white/10 hover:border-white/20'
                                        }`}
                                      >
                                        {LEADERBOARD_DESIGN_MODE_LABELS[mode]}
                                      </button>
                                    )
                                  )}
                                </div>
                           </div>

                           {isLeaderboardPanelDesignMode(visualConfig) && (
                           <div className="p-4 bg-zinc-950 border border-white/5 rounded-xl">
                                <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2"><Palette size={12} className="text-[#ccff00]"/> WARNA PANEL</h4>
                                <p className="text-[7px] text-zinc-500 normal-case mb-3 leading-relaxed">
                                  Mode panel — atur background & teks dengan color picker (tanpa gambar link).
                                </p>
                                <div className="grid grid-cols-6 gap-3">
                                    {[
                                      ...LEADERBOARD_PANEL_BG_COLOR_KEYS,
                                      ...LEADERBOARD_TEXT_COLOR_KEYS,
                                    ].map((key) => (
                                        <div key={key} className="bg-black border border-white/10 rounded-xl p-3 flex flex-col justify-between gap-2 relative group hover:border-white/30 transition-all h-24">
                                            <div className="flex justify-between items-start relative z-30">
                                                <label className="text-[7px] font-black uppercase tracking-widest pointer-events-none text-zinc-500">{LEADERBOARD_COLOR_LABELS[key]}</label>
                                                <button 
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setVisualConfig(prev => ({...prev, [key]: (INITIAL_VISUAL_CONFIG as any)[key]}));
                                                    }}
                                                    className="p-1 -mt-1 -mr-1 rounded hover:bg-white/20 text-zinc-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Reset to Default"
                                                >
                                                    <RotateCcw size={10} />
                                                </button>
                                            </div>
                                            <div className="flex items-end justify-between z-10 relative pointer-events-none">
                                                <span className="text-[11px] font-[1000] text-white uppercase tracking-wider truncate">{(visualConfig as any)[key]}</span>
                                            </div>
                                            <input 
                                                type="color" 
                                                value={(visualConfig as any)[key]} 
                                                onChange={(e) => setVisualConfig({...visualConfig, [key]: e.target.value})} 
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                                            />
                                            <div className="absolute inset-0 opacity-20 transition-opacity group-hover:opacity-30 pointer-events-none" style={{ backgroundColor: (visualConfig as any)[key] }} />
                                            <div className="absolute bottom-3 right-3 w-6 h-6 rounded-full shadow-sm border border-white/20 pointer-events-none" style={{ backgroundColor: (visualConfig as any)[key] }} />
                                        </div>
                                    ))}
                                    
                                    <div className="bg-black border border-white/10 rounded-xl p-3 flex flex-col justify-between gap-2 relative group hover:border-white/30 transition-all h-24 cursor-pointer" onClick={toggleLeaderboardFlags}>
                                        <label className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">{t('olb.flags')}</label>
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${visualConfig.showFlags ? 'bg-[#ccff00] text-black' : 'bg-zinc-800 text-zinc-600'}`}>
                                            <Flag size={20} fill={visualConfig.showFlags ? "currentColor" : "none"} />
                                        </div>
                                    </div>
                                </div>
                           </div>
                           )}

                           {!isLeaderboardPanelDesignMode(visualConfig) && (
                           <div className="p-4 bg-black/40 border border-[#ccff00]/20 rounded-xl space-y-4">
                                <h4 className="text-[9px] font-black text-[#ccff00] uppercase tracking-widest flex items-center gap-2">
                                  <Image size={12} />
                                  Custom Image (LINK)
                                </h4>
                                <p className="text-[7px] text-zinc-500 normal-case leading-relaxed">
                                  PNG/JPG/SVG per zona · area transparan bisa pakai warna fallback di bawah.
                                </p>
                                <div className="space-y-3">
                                  {LEADERBOARD_BG_IMAGE_KEYS.map((key) => (
                                    <div
                                      key={key}
                                      className="p-3 bg-black/40 border border-white/10 rounded-xl"
                                    >
                                      <label className="text-[7px] font-bold text-zinc-500 uppercase block mb-1">
                                        {LEADERBOARD_BG_IMAGE_LABELS[key]}
                                      </label>
                                      <p className="text-[6px] text-zinc-600 normal-case mb-2 leading-relaxed">
                                        {LEADERBOARD_BG_IMAGE_HINTS[key]}
                                      </p>
                                      <div className="flex gap-2">
                                        <input
                                          type="url"
                                          placeholder="https://... atau /path/bg.png"
                                          value={visualConfig[key]}
                                          onChange={(e) =>
                                            setVisualConfig((prev) => ({
                                              ...prev,
                                              [key]: e.target.value,
                                            }))
                                          }
                                          className="flex-1 min-w-0 bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white outline-none focus:border-[#ccff00]"
                                        />
                                        <label className="shrink-0 px-2 py-2 bg-zinc-800 border border-white/10 rounded-lg text-[7px] font-black text-zinc-400 uppercase tracking-widest cursor-pointer hover:border-[#ccff00]/50 hover:text-[#ccff00] transition-colors">
                                          <Upload size={10} className="inline mr-1" />
                                          File
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                              handleLeaderboardBgImageUpload(
                                                key,
                                                e.target.files?.[0]
                                              );
                                              e.target.value = '';
                                            }}
                                          />
                                        </label>
                                        {visualConfig[key] && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setVisualConfig((prev) => ({
                                                ...prev,
                                                [key]: '',
                                              }))
                                            }
                                            className="shrink-0 px-2 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                                            title="Hapus gambar"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVisualConfig((prev) => ({
                                      ...prev,
                                      ...DEFAULT_LEADERBOARD_BACKGROUND_IMAGES,
                                    }))
                                  }
                                  className="mt-3 text-[7px] font-black text-zinc-600 hover:text-[#ccff00] uppercase tracking-widest flex items-center gap-1 transition-colors"
                                >
                                  <RotateCcw size={10} /> Reset semua background gambar
                                </button>
                           </div>
                           )}

                           {!isLeaderboardPanelDesignMode(visualConfig) && (
                           <div className="p-4 bg-zinc-950 border border-white/5 rounded-xl">
                                <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <Palette size={12} className="text-zinc-400" />
                                  Warna teks
                                </h4>
                                <p className="text-[7px] text-zinc-500 normal-case mb-3 leading-relaxed">
                                  Custom Image — atur warna teks & status saja. Background dari link gambar di atas.
                                </p>
                                <div className="grid grid-cols-6 gap-3">
                                  {LEADERBOARD_TEXT_COLOR_KEYS.map((key) => (
                                    <div
                                      key={key}
                                      className="bg-black border border-white/10 rounded-xl p-3 flex flex-col justify-between gap-2 relative group hover:border-white/30 transition-all h-24"
                                    >
                                      <div className="flex justify-between items-start relative z-30">
                                        <label className="text-[7px] font-black uppercase tracking-widest pointer-events-none text-zinc-500">
                                          {LEADERBOARD_COLOR_LABELS[key]}
                                        </label>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setVisualConfig((prev) => ({
                                              ...prev,
                                              [key]: (INITIAL_VISUAL_CONFIG as any)[key],
                                            }));
                                          }}
                                          className="p-1 -mt-1 -mr-1 rounded hover:bg-white/20 text-zinc-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                          title="Reset"
                                        >
                                          <RotateCcw size={10} />
                                        </button>
                                      </div>
                                      <span className="text-[11px] font-[1000] text-white uppercase tracking-wider truncate relative z-10 pointer-events-none">
                                        {(visualConfig as any)[key]}
                                      </span>
                                      <input
                                        type="color"
                                        value={(visualConfig as any)[key]}
                                        onChange={(e) =>
                                          setVisualConfig({
                                            ...visualConfig,
                                            [key]: e.target.value,
                                          })
                                        }
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                      />
                                      <div
                                        className="absolute inset-0 opacity-20 group-hover:opacity-30 pointer-events-none"
                                        style={{ backgroundColor: (visualConfig as any)[key] }}
                                      />
                                      <div
                                        className="absolute bottom-3 right-3 w-6 h-6 rounded-full border border-white/20 pointer-events-none"
                                        style={{ backgroundColor: (visualConfig as any)[key] }}
                                      />
                                    </div>
                                  ))}
                                  <div
                                    className="bg-black border border-white/10 rounded-xl p-3 flex flex-col justify-between gap-2 relative group hover:border-white/30 transition-all h-24 cursor-pointer"
                                    onClick={toggleLeaderboardFlags}
                                  >
                                    <label className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">
                                      FLAGS
                                    </label>
                                    <div
                                      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${visualConfig.showFlags ? 'bg-[#ccff00] text-black' : 'bg-zinc-800 text-zinc-600'}`}
                                    >
                                      <Flag
                                        size={20}
                                        fill={visualConfig.showFlags ? 'currentColor' : 'none'}
                                      />
                                    </div>
                                  </div>
                                </div>
                           </div>
                           )}

                           <div className="p-6 bg-zinc-900 border border-white/5 rounded-[20px] shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                   <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2"><Move size={12} className="text-zinc-400" />{t('olb.layoutTransformLeaderboard')}</h3>
                                   <button
                                       onClick={() => setLayoutConfig(defaultLayoutConfig)}
                                       className="text-[7px] font-black text-zinc-600 hover:text-[#ccff00] uppercase tracking-widest flex items-center gap-1 transition-colors"
                                   >
                                       <RotateCcw size={10} /> {t('olb.resetPosition')}
                                   </button>
                                </div>
                                <p className="text-[7px] text-zinc-500 normal-case mb-3 leading-relaxed">
                                  Lebar panel otomatis: {leaderboardPanelWidthForFlags(false)} px tanpa flag, {leaderboardPanelWidthForFlags(true)} px dengan flag (UI menampilkan offset dari default).
                                </p>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('olb.panelWidth')}</label><ScrollableInput value={leaderboardPanelWidth - (defaultLayoutConfig.panelWidth ?? 0)} onChange={(val) => setLayoutConfig({...layoutConfig, panelWidth: resolveLeaderboardPanelWidth((defaultLayoutConfig.panelWidth ?? 0) + val)})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('olb.scalePct')}</label><ScrollableInput value={layoutConfig.scale - defaultLayoutConfig.scale} onChange={(val) => setLayoutConfig({...layoutConfig, scale: defaultLayoutConfig.scale + val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('olb.rowHeight')}</label><ScrollableInput value={layoutConfig.rowHeight - defaultLayoutConfig.rowHeight} onChange={(val) => setLayoutConfig({...layoutConfig, rowHeight: defaultLayoutConfig.rowHeight + val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    {visualConfig.showFlags && (
                                        <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                                            <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('olb.flagWidth')}</label>
                                            <ScrollableInput value={layoutConfig.flagWidth - defaultLayoutConfig.flagWidth} onChange={(val) => setLayoutConfig({...layoutConfig, flagWidth: defaultLayoutConfig.flagWidth + val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" />
                                        </div>
                                    )}
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('olb.posX')}</label><ScrollableInput value={layoutConfig.xOffset - defaultLayoutConfig.xOffset} onChange={(val) => setLayoutConfig({...layoutConfig, xOffset: defaultLayoutConfig.xOffset + val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('olb.posY')}</label><ScrollableInput value={layoutConfig.yOffset - defaultLayoutConfig.yOffset} onChange={(val) => setLayoutConfig({...layoutConfig, yOffset: defaultLayoutConfig.yOffset + val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('olb.logoSize')}</label><ScrollableInput value={layoutConfig.logoSize - defaultLayoutConfig.logoSize} onChange={(val) => setLayoutConfig({...layoutConfig, logoSize: defaultLayoutConfig.logoSize + val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/5">
                                  <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Type size={12} className="text-[#ccff00]" />
                                    Jenis font (Overall Ranking)
                                  </h4>
                                  <p className="text-[7px] text-zinc-500 normal-case mb-2 leading-relaxed">
                                    Judul, nama tim, rank, poin, status, ELIMINATED / WINNER.
                                  </p>
                                  <OverlayFontFamilySelect
                                    value={layoutConfig.fontFamilyId}
                                    onChange={(fontFamilyId) =>
                                      setLayoutConfig((prev) => ({ ...prev, fontFamilyId }))
                                    }
                                  />
                                </div>
                           </div>
                        </div>
                          )}

                          {visualSettingsPanel === 'elimination' && (
                        <div className="space-y-6">
                           <div className="p-6 bg-zinc-900 border border-white/5 rounded-[20px] shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                   <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2"><Skull size={12} className="text-red-500" />{t('olb.eliminationBanner')}</h3>
                                   <div className="flex flex-col items-end gap-2">
                                   <div className="flex items-center gap-2">
                                     <button
                                       type="button"
                                       onClick={previewEliminationBanner}
                                       disabled={elimBannerHoldPreview}
                                       className={`text-[7px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors ${
                                         elimBannerHoldPreview
                                           ? 'text-zinc-700 cursor-not-allowed'
                                           : 'text-zinc-500 hover:text-[#ccff00]'
                                       }`}
                                       title={elimBannerHoldPreview ? 'Matikan Preview Sementara dulu' : undefined}
                                     >
                                       <Play size={10} /> {t('olb.preview')}
                                     </button>
                                     <button
                                       type="button"
                                       onClick={() => {
                                         setElimBannerHoldPreviewSafe(false);
                                         setElimBannerLayout(DEFAULT_ELIMINATION_BANNER_LAYOUT);
                                         setVisualConfig((prev) => ({
                                           ...prev,
                                           ...DEFAULT_ELIMINATION_BANNER_VISUAL,
                                         }));
                                       }}
                                       className="text-[7px] font-black text-zinc-600 hover:text-[#ccff00] uppercase tracking-widest flex items-center gap-1 transition-colors"
                                     >
                                       <RotateCcw size={10} /> {t('olb.reset')}
                                     </button>
                                   </div>
                                   <label
                                     className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all ${
                                       elimBannerHoldPreview
                                         ? 'bg-[#ccff00]/15 border-[#ccff00]/50 text-[#ccff00]'
                                         : 'bg-black border-white/10 text-zinc-500 hover:border-white/20'
                                     }`}
                                   >
                                     <input
                                       type="checkbox"
                                       checked={elimBannerHoldPreview}
                                       onChange={(e) => setElimBannerHoldPreviewSafe(e.target.checked)}
                                       className="rounded border-white/20 bg-black text-[#ccff00] focus:ring-[#ccff00]"
                                     />
                                     <Eye size={10} />
                                     <span className="text-[7px] font-black uppercase tracking-widest">
                                       Preview Sementara
                                     </span>
                                   </label>
                                   </div>
                                </div>
                                <p className="text-[8px] font-medium text-zinc-600 normal-case mb-3 tracking-wide leading-relaxed">
                                  Geser <span className="text-zinc-400">seluruh banner eliminasi</span> di canvas
                                  1920×1080 · POS X positif = kanan · bukan LAYOUT TRANSFORM Overall Ranking di atas.
                                  {elimBannerHoldPreview ? (
                                    <span className="block mt-1 text-[#ccff00] uppercase tracking-wide">
                                      Preview aktif — angka UI adalah offset dari posisi default. Scroll atau Arrow Up/Down di kolom angka (Shift = ±10), bisa juga klik lalu ketik. Perubahan langsung ke Monitor Preview / Program &amp; Link Output.
                                    </span>
                                  ) : (
                                    <span className="block mt-1 text-zinc-500 normal-case">
                                      Angka SCALE / POS X / POS Y adalah offset dari posisi default dan tersimpan otomatis saat selesai mengedit kolom angka.
                                    </span>
                                  )}
                                </p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('olb.scaleBanner')}</label><ElimBannerLayoutInput {...elimBannerPreviewInputProps} value={elimBannerLayoutUiOffset.scale} onChange={(val) => patchElimBannerLayout({ scale: DEFAULT_ELIMINATION_BANNER_LAYOUT.scale + val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('olb.posXBanner')}</label><ElimBannerLayoutInput {...elimBannerPreviewInputProps} value={elimBannerLayoutUiOffset.xOffset} onChange={(val) => patchElimBannerLayout({ xOffset: DEFAULT_ELIMINATION_BANNER_LAYOUT.xOffset + val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('olb.posYBanner')}</label><ElimBannerLayoutInput {...elimBannerPreviewInputProps} value={elimBannerLayoutUiOffset.yOffset} onChange={(val) => patchElimBannerLayout({ yOffset: DEFAULT_ELIMINATION_BANNER_LAYOUT.yOffset + val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/5">
                                  <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Type size={12} className="text-[#ccff00]" />
                                    Jenis font
                                  </h4>
                                  <p className="text-[7px] text-zinc-500 normal-case mb-2 leading-relaxed">
                                    Berlaku untuk ELIMINATED, #, dan TAG (Panel & Custom Image). Font
                                    Google dimuat otomatis; font khusus (Ethnocentric, dll.) perlu terpasang di PC
                                    streaming atau file di folder <span className="text-zinc-400">public/fonts</span>.
                                  </p>
                                  <select
                                    value={elimBannerFontFamilyId}
                                    onChange={(e) =>
                                      patchElimBannerVisualField(
                                        'elimBannerFontFamily',
                                        e.target.value
                                      )
                                    }
                                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-[11px] text-white font-bold outline-none focus:border-[#ccff00] cursor-pointer"
                                    style={{
                                      fontFamily: getEliminationBannerFontCssFamily(
                                        elimBannerFontFamilyId
                                      ),
                                    }}
                                  >
                                    {ELIMINATION_BANNER_FONT_FAMILY_OPTIONS.map((opt) => (
                                      <option
                                        key={opt.id}
                                        value={opt.id}
                                        style={{ fontFamily: opt.cssFamily }}
                                      >
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/5">
                                  <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-2">
                                    Ukuran font (px)
                                  </h4>
                                  <p className="text-[7px] text-zinc-500 normal-case mb-3 leading-relaxed">
                                    {elimBannerIsPanelsMode
                                      ? 'Panel — ELIMINATED, #, dan TAG tim.'
                                      : 'Custom Image — # dan TAG (ELIMINATED ada di gambar PNG). Font di overlay sinkron dengan kontrol di bawah.'}
                                    {elimBannerHoldPreview && (
                                      <span className="block mt-1 text-[#ccff00]">
                                        Angka UI adalah offset dari ukuran default. Lihat hasil di Monitor Preview / Program atau tab Link Output.
                                      </span>
                                    )}
                                    {!elimBannerHoldPreview && (
                                      <span className="block mt-1 text-zinc-500">
                                        Angka UI adalah offset dari ukuran default.
                                      </span>
                                    )}
                                  </p>
                                  <div
                                    className={`grid gap-3 ${
                                      elimBannerIsPanelsMode ? 'grid-cols-3' : 'grid-cols-2'
                                    }`}
                                  >
                                    {(elimBannerIsPanelsMode
                                      ? ELIMINATION_BANNER_FONT_KEYS_PANEL
                                      : ELIMINATION_BANNER_FONT_KEYS_CUSTOM_IMAGE
                                    ).map((fontKey) => (
                                      <div key={fontKey}>
                                        <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                                          {ELIMINATION_BANNER_FONT_LABELS[fontKey]}
                                        </label>
                                        <ElimNumberInput
                                          {...elimBannerPreviewInputProps}
                                          value={elimBannerTypographyUiOffset[fontKey]}
                                          onChange={(val) =>
                                            patchElimBannerTypography(
                                              fontKey,
                                              DEFAULT_ELIMINATION_BANNER_TYPOGRAPHY[fontKey] + val
                                            )
                                          }
                                          className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="mt-5 pt-4 border-t border-white/5">
                                  <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <Link2 size={12} className="text-[#ccff00]" />
                                    DESAIN GAMBAR (LINK)
                                  </h4>
                                  <p className="text-[7px] text-zinc-500 uppercase mb-3 tracking-wide">
                                    Panel = warna bawaan · Custom Image = link gambar + posisi overlay
                                  </p>
                                  <div className="flex gap-2 mb-3">
                                    <button
                                      type="button"
                                      disabled={elimBannerPanelSwitchLocked}
                                      title={
                                        elimBannerPanelSwitchLocked
                                          ? elimBannerDesignSwitchLockTitle
                                          : undefined
                                      }
                                      onClick={() =>
                                        setVisualConfig((prev) => ({
                                          ...prev,
                                          elimBannerDesignMode: 'panels',
                                        }))
                                      }
                                      className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                                        elimBannerIsPanelsMode
                                          ? 'bg-[#ccff00] text-black border-[#ccff00]'
                                          : 'bg-black text-zinc-500 border-white/10 hover:border-white/20'
                                      } ${
                                        elimBannerPanelSwitchLocked
                                          ? 'opacity-40 cursor-not-allowed hover:border-white/10'
                                          : ''
                                      }`}
                                    >
                                      Panel
                                    </button>
                                    <button
                                      type="button"
                                      disabled={elimBannerCustomSwitchLocked}
                                      title={
                                        elimBannerCustomSwitchLocked
                                          ? elimBannerDesignSwitchLockTitle
                                          : undefined
                                      }
                                      onClick={() =>
                                        setVisualConfig((prev) => ({
                                          ...prev,
                                          elimBannerDesignMode: 'full',
                                        }))
                                      }
                                      className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                                        !elimBannerIsPanelsMode
                                          ? 'bg-[#ccff00] text-black border-[#ccff00]'
                                          : 'bg-black text-zinc-500 border-white/10 hover:border-white/20'
                                      } ${
                                        elimBannerCustomSwitchLocked
                                          ? 'opacity-40 cursor-not-allowed hover:border-white/10'
                                          : ''
                                      }`}
                                    >
                                      Custom Image
                                    </button>
                                  </div>
                                  {elimBannerHoldPreview && (
                                    <p className="text-[7px] text-zinc-500 normal-case leading-relaxed mb-2 -mt-1">
                                      Preview aktif — matikan Preview Sementara untuk ganti Panel / Custom Image
                                      {visualConfig.elimBannerDesignMode === 'full'
                                        ? elimBannerCustomVariant === 'fullLink'
                                          ? ', Custom Image (LINK) / Panel BG (LINK), atau Utuh / Penuh'
                                          : ' atau Custom Image (LINK) / Panel BG (LINK)'
                                        : ''}
                                      .
                                    </p>
                                  )}

                                  {visualConfig.elimBannerDesignMode !== 'full' ? (
                                    <p className="text-[7px] text-zinc-600 normal-case leading-relaxed mb-2">
                                      Mode panel aktif — logo, <span className="text-zinc-400">#</span>,{' '}
                                      <span className="text-zinc-400">TAG</span> (panel kanan), dan{' '}
                                      <span className="text-zinc-400">ELIMINATED</span> (tengah) selalu tampil.
                                      Atur hanya warna BG & teks di{' '}
                                      <span className="text-zinc-400">Banner Background & Text</span> di bawah.
                                      Untuk gambar via link, pilih{' '}
                                      <span className="text-[#ccff00]">Custom Image</span>.
                                    </p>
                                  ) : (
                                    <div className="p-4 bg-black/40 border border-[#ccff00]/20 rounded-xl space-y-3">
                                      <h5 className="text-[8px] font-black text-[#ccff00] uppercase tracking-[0.2em]">
                                        Custom Image
                                      </h5>

                                      <div className="flex gap-2">
                                        {(
                                          ['fullLink', 'panelLinks'] as const satisfies readonly EliminationBannerCustomImageVariant[]
                                        ).map((variant) => {
                                          const isActive = elimBannerCustomVariant === variant;
                                          const switchLocked =
                                            variant === 'fullLink'
                                              ? elimBannerFullLinkSwitchLocked
                                              : elimBannerPanelLinksSwitchLocked;
                                          return (
                                          <button
                                            key={variant}
                                            type="button"
                                            disabled={switchLocked}
                                            title={
                                              switchLocked
                                                ? elimBannerDesignSwitchLockTitle
                                                : undefined
                                            }
                                            onClick={() =>
                                              setVisualConfig((prev) => ({
                                                ...prev,
                                                elimBannerCustomImageVariant: variant,
                                              }))
                                            }
                                            className={`flex-1 py-2 rounded-lg text-[7px] font-black uppercase tracking-widest border transition-all leading-tight ${
                                              isActive
                                                ? 'bg-white/10 text-[#ccff00] border-[#ccff00]/50'
                                                : 'bg-black text-zinc-500 border-white/10 hover:border-white/20'
                                            } ${
                                              switchLocked
                                                ? 'opacity-40 cursor-not-allowed hover:border-white/10'
                                                : ''
                                            }`}
                                          >
                                            {ELIMINATION_BANNER_CUSTOM_IMAGE_VARIANT_LABELS[variant]}
                                          </button>
                                          );
                                        })}
                                      </div>

                                      <p className="text-[7px] text-zinc-500 normal-case leading-relaxed">
                                        Logo tim (sistem), <span className="text-zinc-400">#</span>, dan{' '}
                                        <span className="text-zinc-400">TAG</span> selalu tampil.
                                        {(visualConfig.elimBannerCustomImageVariant ?? 'fullLink') ===
                                        'panelLinks'
                                          ? ' ELIMINATED biasanya ada di gambar MAIN panel (link).'
                                          : ' Atur posisi di bagian overlay bawah (Custom Image LINK).'}
                                      </p>

                                      {(
                                        (visualConfig.elimBannerCustomImageVariant ?? 'fullLink') === 'fullLink'
                                          ? (['elimBannerFullImageUrl'] as const)
                                          : ELIMINATION_BANNER_CUSTOM_PANEL_IMAGE_KEYS
                                      ).map((key) => (
                                        <div key={key} className="mb-1">
                                          <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                            <span className="inline-flex items-center gap-1">
                                              <Image size={10} className="text-zinc-500 shrink-0" />
                                              {ELIMINATION_BANNER_IMAGE_LABELS[key]}
                                            </span>
                                            <span className="text-[6px] font-bold text-zinc-500 normal-case tracking-normal">
                                              Panel {ELIMINATION_BANNER_IMAGE_SIZE_HINTS[key].canvas} px · rasio{' '}
                                              {ELIMINATION_BANNER_IMAGE_SIZE_HINTS[key].ratio}
                                            </span>
                                          </label>
                                          <div className="flex gap-2">
                                            <input
                                              type="url"
                                              placeholder="https://... atau /path/asset.png"
                                              value={visualConfig[key]}
                                              onChange={(e) =>
                                                setVisualConfig((prev) => ({
                                                  ...prev,
                                                  [key]: e.target.value,
                                                }))
                                              }
                                              className="flex-1 bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white placeholder:text-zinc-700"
                                            />
                                            <label className="shrink-0 px-2 py-2 bg-zinc-800 border border-white/10 rounded-lg cursor-pointer hover:bg-zinc-700 transition-colors flex items-center">
                                              <Upload size={12} className="text-zinc-400" />
                                              <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                  handleElimBannerImageUpload(key, e.target.files?.[0]);
                                                  e.target.value = '';
                                                }}
                                              />
                                            </label>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setVisualConfig((prev) => ({
                                                  ...prev,
                                                  [key]: '',
                                                }))
                                              }
                                              className="shrink-0 px-2 py-2 bg-black border border-white/10 rounded-lg hover:border-red-500/40 transition-colors"
                                              title="Hapus link"
                                            >
                                              <Trash2 size={12} className="text-zinc-500" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}

                                      {(visualConfig.elimBannerCustomImageVariant ?? 'fullLink') ===
                                        'fullLink' && (
                                        <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                                          <p className="text-[7px] text-zinc-500 normal-case leading-relaxed">
                                            {ELIMINATION_BANNER_FULL_IMAGE_FIT_NOTE}
                                          </p>
                                          <div className="flex gap-2">
                                            {(
                                              ['contain', 'cover'] as const satisfies readonly EliminationBannerFullImageFit[]
                                            ).map((fit) => {
                                              const isActive = elimBannerFullImageFit === fit;
                                              const switchLocked =
                                                fit === 'contain'
                                                  ? elimBannerContainFitSwitchLocked
                                                  : elimBannerCoverFitSwitchLocked;
                                              return (
                                              <button
                                                key={fit}
                                                type="button"
                                                disabled={switchLocked}
                                                title={
                                                  switchLocked
                                                    ? elimBannerDesignSwitchLockTitle
                                                    : undefined
                                                }
                                                onClick={() =>
                                                  setVisualConfig((prev) => ({
                                                    ...prev,
                                                    elimBannerFullImageFit: fit,
                                                  }))
                                                }
                                                className={`flex-1 py-2 rounded-lg text-[7px] font-black uppercase tracking-widest border transition-all ${
                                                  isActive
                                                    ? 'bg-[#ccff00]/20 text-[#ccff00] border-[#ccff00]/50'
                                                    : 'bg-black text-zinc-500 border-white/10 hover:border-white/20'
                                                } ${
                                                  switchLocked
                                                    ? 'opacity-40 cursor-not-allowed hover:border-white/10'
                                                    : ''
                                                }`}
                                              >
                                                {ELIMINATION_BANNER_FULL_IMAGE_FIT_LABELS[fit]}
                                              </button>
                                              );
                                            })}
                                          </div>
                                          {(visualConfig.elimBannerFullImageFit ?? 'contain') === 'contain' && (
                                            <div>
                                              <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1">
                                                Zoom gambar % (utuh)
                                              </label>
                                              <ElimNumberInput
                                                {...elimBannerPreviewInputProps}
                                                value={elimBannerVisual.elimBannerFullImageZoom ?? 100}
                                                onChange={(val) =>
                                                  patchElimBannerVisualField(
                                                    'elimBannerFullImageZoom',
                                                    Math.min(300, Math.max(25, val))
                                                  )
                                                }
                                                className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                                              />
                                              <p className="text-[6px] text-zinc-600 normal-case mt-1">
                                                Kanvas 16:9 (640×360) · 100 = normal · naikkan (mis. 130–160) agar
                                                PNG lebih besar · atur SCALE banner di atas untuk OBS · max 300
                                              </p>
                                            </div>
                                          )}
                                          {(visualConfig.elimBannerFullImageFit ?? 'contain') === 'cover' && (
                                            <div className="grid grid-cols-2 gap-2">
                                              <div>
                                                <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1">
                                                  Posisi gambar X %
                                                </label>
                                                <ElimNumberInput
                                                  {...elimBannerPreviewInputProps}
                                                  value={elimBannerVisual.elimBannerFullImagePosX ?? 50}
                                                  onChange={(val) =>
                                                    patchElimBannerVisualField(
                                                      'elimBannerFullImagePosX',
                                                      val
                                                    )
                                                  }
                                                  className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                                                />
                                              </div>
                                              <div>
                                                <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1">
                                                  Posisi gambar Y %
                                                </label>
                                                <ElimNumberInput
                                                  {...elimBannerPreviewInputProps}
                                                  value={elimBannerVisual.elimBannerFullImagePosY ?? 50}
                                                  onChange={(val) =>
                                                    patchElimBannerVisualField(
                                                      'elimBannerFullImagePosY',
                                                      val
                                                    )
                                                  }
                                                  className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                                                />
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      <p className="text-[7px] text-zinc-500 normal-case leading-relaxed">
                                        {(visualConfig.elimBannerCustomImageVariant ?? 'fullLink') === 'fullLink'
                                          ? 'Satu gambar background + atur posisi logo / # / nama di bawah.'
                                          : 'Logo tim dari sistem · link untuk background tiap panel (layout PMIO).'}
                                      </p>

                                      {(visualConfig.elimBannerCustomImageVariant ?? 'fullLink') === 'fullLink' && (
                                      <div className="pt-4 border-t border-white/10">
                                        <h6 className="text-[8px] font-black text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                                          <Move size={10} className="text-[#ccff00]" />
                                          Atur posisi overlay (%)
                                        </h6>
                                        <p className="text-[7px] text-zinc-500 normal-case mb-4 leading-relaxed">
                                          {ELIMINATION_BANNER_FULL_LAYOUT_NOTE}
                                          {elimBannerHoldPreview ? (
                                            <span className="block mt-1 text-[#ccff00]">
                                              Perubahan langsung ke asset di monitor &amp; Link Output — scroll atau Arrow Up/Down (Shift = ±10), bisa juga ketik. Nilai tersimpan otomatis saat kursor keluar dari kolom.
                                            </span>
                                          ) : (
                                            <span className="block mt-1 text-zinc-500 normal-case">
                                              Perubahan posisi overlay tersimpan otomatis ke pengaturan project saat selesai mengedit kolom angka.
                                            </span>
                                          )}
                                        </p>

                                      {(
                                        [
                                          {
                                            key: 'logo' as const,
                                            title: 'Logo tim (sistem)',
                                            fields: [
                                              { label: 'X %', prop: 'x' as const },
                                              { label: 'Y %', prop: 'y' as const },
                                              { label: 'Ukuran %', prop: 'size' as const },
                                            ],
                                          },
                                          {
                                            key: 'placement' as const,
                                            title: '# Placement',
                                            fields: [
                                              { label: 'X %', prop: 'x' as const },
                                              { label: 'Y %', prop: 'y' as const },
                                              { label: 'Font px', prop: 'fontSize' as const },
                                            ],
                                          },
                                          {
                                            key: 'teamName' as const,
                                            title: 'TAG tim',
                                            fields: [
                                              { label: 'X %', prop: 'x' as const },
                                              { label: 'Y %', prop: 'y' as const },
                                              { label: 'Font px', prop: 'fontSize' as const },
                                            ],
                                          },
                                        ] as const
                                      ).map(({ key, title, fields }) => {
                                        const slot = fullLayout[key];
                                        return (
                                          <div
                                            key={key}
                                            className="mb-4 p-3 bg-black/50 border border-white/10 rounded-xl"
                                          >
                                            <div className="flex justify-between items-center mb-2">
                                              <span className="text-[8px] font-black text-white uppercase tracking-widest">
                                                {title}
                                              </span>
                                              <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={slot.visible}
                                                  onChange={(e) =>
                                                    patchElimBannerFullLayout(key, {
                                                      visible: e.target.checked,
                                                    })
                                                  }
                                                  className="rounded border-white/20 bg-black text-[#ccff00] focus:ring-[#ccff00] scale-75"
                                                />
                                                <span className="text-[7px] text-zinc-500 uppercase">Tampil</span>
                                              </label>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                              {fields.map(({ label, prop }) => (
                                                <div key={prop}>
                                                  <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1">
                                                    {label}
                                                  </label>
                                                  <ElimNumberInput
                                                    {...elimBannerPreviewInputProps}
                                                    value={
                                                      prop === 'fontSize' && key === 'placement'
                                                        ? elimBannerTypography.placement
                                                        : prop === 'fontSize' && key === 'teamName'
                                                          ? elimBannerTypography.tag
                                                          : (slot[prop] as number)
                                                    }
                                                    onChange={(val) =>
                                                      prop === 'fontSize' &&
                                                      (key === 'placement' || key === 'teamName')
                                                        ? patchElimBannerTypography(
                                                            key === 'placement' ? 'placement' : 'tag',
                                                            val
                                                          )
                                                        : patchElimBannerFullLayout(key, {
                                                            [prop]: val,
                                                          } as Partial<
                                                            EliminationBannerFullOverlayLayout[typeof key]
                                                          >)
                                                    }
                                                    className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                                                  />
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })}

                                      <button
                                        type="button"
                                        onClick={() =>
                                          setVisualConfig((prev) => ({
                                            ...prev,
                                            elimBannerFullLayout: DEFAULT_ELIMINATION_BANNER_FULL_LAYOUT,
                                            elimBannerTypography: {
                                              ...DEFAULT_ELIMINATION_BANNER_TYPOGRAPHY,
                                              placement:
                                                DEFAULT_ELIMINATION_BANNER_FULL_LAYOUT.placement
                                                  .fontSize,
                                              tag: DEFAULT_ELIMINATION_BANNER_FULL_LAYOUT.teamName
                                                .fontSize,
                                            },
                                          }))
                                        }
                                        className="text-[7px] font-black text-zinc-600 hover:text-[#ccff00] uppercase tracking-widest flex items-center gap-1 transition-colors"
                                      >
                                        <RotateCcw size={10} /> Reset posisi overlay
                                      </button>
                                      </div>
                                      )}

                                      <p className="text-[7px] text-zinc-600 normal-case tracking-wide leading-relaxed pt-2">
                                        {ELIMINATION_BANNER_IMAGE_LINK_NOTE}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-5 pt-4 border-t border-white/5">
                                  <div className="flex items-center justify-between gap-3 mb-3">
                                    <h4 className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                      <Palette size={12} className="text-[#74A57F]" />
                                      {visualConfig.elimBannerDesignMode === 'full'
                                        ? t('olb.bannerText')
                                        : t('olb.bannerBgText')}
                                    </h4>
                                    <button
                                      type="button"
                                      onClick={resetElimBannerColorsToDefault}
                                      className="text-[7px] font-black text-zinc-500 hover:text-[#ccff00] uppercase tracking-widest flex items-center gap-1 transition-colors shrink-0"
                                      title="Kembalikan semua warna banner ke default Overall Ranking"
                                    >
                                      <RotateCcw size={10} /> Reset warna default
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-5 gap-2">
                                    {(visualConfig.elimBannerDesignMode === 'full'
                                      ? ELIMINATION_BANNER_TEXT_COLOR_KEYS_CUSTOM_IMAGE
                                      : ELIMINATION_BANNER_COLOR_KEYS
                                    ).map((key) => (
                                      <div
                                        key={key}
                                        className="bg-black border border-white/10 rounded-xl p-2.5 flex flex-col justify-between gap-1.5 relative group hover:border-red-500/30 transition-all h-[88px]"
                                      >
                                        <div className="flex justify-between items-start relative z-30">
                                          <label className="text-[6px] font-black uppercase tracking-widest text-zinc-500 pointer-events-none leading-tight">
                                            {ELIMINATION_BANNER_COLOR_LABELS[key]}
                                          </label>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              patchElimBannerVisualField(
                                                key,
                                                DEFAULT_ELIMINATION_BANNER_VISUAL[key]
                                              );
                                            }}
                                            className="p-0.5 rounded hover:bg-white/20 text-zinc-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                            title="Reset"
                                          >
                                            <RotateCcw size={8} />
                                          </button>
                                        </div>
                                        <span className="text-[8px] font-[1000] text-white uppercase truncate relative z-10">
                                          {visualConfig[key]}
                                        </span>
                                        <input
                                          type="color"
                                          value={visualConfig[key]}
                                          onChange={(e) =>
                                            patchElimBannerVisualField(key, e.target.value)
                                          }
                                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        />
                                        <div
                                          className="absolute inset-0 opacity-25 group-hover:opacity-35 pointer-events-none rounded-xl"
                                          style={{ backgroundColor: visualConfig[key] }}
                                        />
                                        <div
                                          className="absolute bottom-2 right-2 w-5 h-5 rounded-full border border-white/20 pointer-events-none z-10"
                                          style={{ backgroundColor: visualConfig[key] }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  <p className="text-[7px] text-zinc-600 uppercase mt-2 tracking-wide normal-case">
                                    {visualConfig.elimBannerDesignMode === 'full'
                                      ? 'Custom Image: mode Utuh = pinggir transparan di OBS · tiap event boleh beda ukuran PNG.'
                                      : 'MAIN BG 1 + 2 = gradien tengah ELIMINATED · warna dipakai jika panel tanpa gambar link'}
                                  </p>
                                </div>
                           </div>
                        </div>
                          )}

                          {visualSettingsPanel === 'terminator' && (
                        <div className="space-y-6">
                           <div className="p-6 bg-zinc-900 border border-white/5 rounded-[20px] shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                   <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                     <Target size={12} className="text-[#ccff00]" />
                                     Terminator Banner
                                   </h3>
                                   <div className="flex flex-col items-end gap-2">
                                   <div className="flex items-center gap-2">
                                     <button
                                       type="button"
                                       onClick={previewTerminatorBanner}
                                       disabled={terminatorVisual.previewHold}
                                       className={`text-[7px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors ${
                                         terminatorVisual.previewHold
                                           ? 'text-zinc-700 cursor-not-allowed'
                                           : 'text-zinc-500 hover:text-[#ccff00]'
                                       }`}
                                       title={terminatorVisual.previewHold ? 'Matikan Preview Sementara dulu' : undefined}
                                     >
                                       <Play size={10} /> {t('olb.preview')}
                                     </button>
                                     <button
                                       type="button"
                                       onClick={() => setTerminatorVisual(DEFAULT_TERMINATOR_VISUAL)}
                                       className="text-[7px] font-black text-zinc-600 hover:text-[#ccff00] uppercase tracking-widest flex items-center gap-1 transition-colors"
                                     >
                                       <RotateCcw size={10} /> {t('olb.reset')}
                                     </button>
                                   </div>
                                   <label
                                     className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all ${
                                       terminatorVisual.previewHold
                                         ? 'bg-[#ccff00]/15 border-[#ccff00]/50 text-[#ccff00]'
                                         : 'bg-black border-white/10 text-zinc-500 hover:border-white/20'
                                     }`}
                                   >
                                     <input
                                       type="checkbox"
                                       checked={terminatorVisual.previewHold}
                                       onChange={(e) =>
                                         patchTerminatorVisual('previewHold', e.target.checked)
                                       }
                                       className="rounded border-white/20 bg-black text-[#ccff00] focus:ring-[#ccff00]"
                                     />
                                     <Eye size={10} />
                                     <span className="text-[7px] font-black uppercase tracking-widest">
                                       Preview Sementara
                                     </span>
                                   </label>
                                   </div>
                                </div>

                                <div className="flex items-center justify-between gap-3 p-3 bg-black border border-white/10 rounded-xl mb-4">
                                  <div>
                                    <div className="text-[9px] font-black text-white uppercase tracking-widest">
                                      Status Banner
                                    </div>
                                    <div className="text-[7px] text-zinc-500 normal-case mt-1">
                                      Aktif saat player menyentuh kill trigger di game berjalan.
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => patchTerminatorVisual('enabled', !terminatorVisual.enabled)}
                                    className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                                      terminatorVisual.enabled
                                        ? 'bg-[#ccff00] text-black border-[#ccff00]'
                                        : 'bg-zinc-950 text-zinc-500 border-white/10 hover:border-white/20'
                                    }`}
                                  >
                                    {terminatorVisual.enabled ? 'On' : 'Off'}
                                  </button>
                                </div>

                                <div className="flex items-center justify-between gap-3 p-3 bg-black border border-white/10 rounded-xl mb-4">
                                  <div>
                                    <div className="text-[9px] font-black text-white uppercase tracking-widest">
                                      Total Kill Counter
                                    </div>
                                    <div className="text-[7px] text-zinc-500 normal-case mt-1">
                                      {terminatorVisual.killCounterSource === 'threshold'
                                        ? 'Tampilkan target syarat jadi Terminator.'
                                        : 'Tampilkan total kill gabungan Match 1 → saat ini.'}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      patchTerminatorVisual(
                                        'killCounterSource',
                                        terminatorVisual.killCounterSource === 'threshold' ? 'cumulative' : 'threshold'
                                      )
                                    }
                                    className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                                      terminatorVisual.killCounterSource === 'threshold'
                                        ? 'bg-[#ccff00] text-black border-[#ccff00]'
                                        : 'bg-zinc-950 text-zinc-500 border-white/10 hover:border-white/20'
                                    }`}
                                  >
                                    {terminatorVisual.killCounterSource === 'threshold' ? 'Target' : 'Gabungan'}
                                  </button>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                                      Game Kill Trigger
                                    </label>
                                    <ScrollableInput
                                      value={clampTerminatorKillThreshold(terminatorVisual.killThreshold)}
                                      onChange={(val) =>
                                        patchTerminatorVisual('killThreshold', clampTerminatorKillThreshold(val))
                                      }
                                      className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-[#ccff00] font-black text-center outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                                      Duration (Sec)
                                    </label>
                                    <ScrollableInput
                                      value={clampTerminatorDisplaySeconds(terminatorVisual.displaySeconds)}
                                      onChange={(val) =>
                                        patchTerminatorVisual('displaySeconds', clampTerminatorDisplaySeconds(val))
                                      }
                                      className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white font-black text-center outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                                      Scale (%)
                                    </label>
                                    <ScrollableInput
                                      value={
                                        clampTerminatorScale(terminatorVisual.scale) -
                                        terminatorBaseline.scale
                                      }
                                      onChange={(val) =>
                                        patchTerminatorVisual(
                                          'scale',
                                          clampTerminatorScale(terminatorBaseline.scale + val)
                                        )
                                      }
                                      className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white font-black text-center outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                                      Pos X
                                    </label>
                                    <ScrollableInput
                                      value={
                                        clampTerminatorPosition(
                                          terminatorVisual.x,
                                          terminatorBaseline.x
                                        ) - terminatorBaseline.x
                                      }
                                      onChange={(val) =>
                                        patchTerminatorVisual(
                                          'x',
                                          clampTerminatorPosition(
                                            terminatorBaseline.x + val,
                                            terminatorBaseline.x
                                          )
                                        )
                                      }
                                      className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white font-black text-center outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                                      Pos Y
                                    </label>
                                    <ScrollableInput
                                      value={
                                        clampTerminatorPosition(
                                          terminatorVisual.y,
                                          terminatorBaseline.y
                                        ) - terminatorBaseline.y
                                      }
                                      onChange={(val) =>
                                        patchTerminatorVisual(
                                          'y',
                                          clampTerminatorPosition(
                                            terminatorBaseline.y + val,
                                            terminatorBaseline.y
                                          )
                                        )
                                      }
                                      className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white font-black text-center outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                                      Player X
                                    </label>
                                    <ScrollableInput
                                      value={
                                        clampTerminatorPosition(
                                          terminatorVisual.playerImageX,
                                          terminatorBaseline.playerImageX
                                        ) - terminatorBaseline.playerImageX
                                      }
                                      onChange={(val) =>
                                        patchTerminatorVisual(
                                          'playerImageX',
                                          clampTerminatorPosition(
                                            terminatorBaseline.playerImageX + val,
                                            terminatorBaseline.playerImageX
                                          )
                                        )
                                      }
                                      className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white font-black text-center outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                                      Player Y
                                    </label>
                                    <ScrollableInput
                                      value={
                                        clampTerminatorPosition(
                                          terminatorVisual.playerImageY,
                                          terminatorBaseline.playerImageY
                                        ) - terminatorBaseline.playerImageY
                                      }
                                      onChange={(val) =>
                                        patchTerminatorVisual(
                                          'playerImageY',
                                          clampTerminatorPosition(
                                            terminatorBaseline.playerImageY + val,
                                            terminatorBaseline.playerImageY
                                          )
                                        )
                                      }
                                      className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white font-black text-center outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                                      Player S (%)
                                    </label>
                                    <ScrollableInput
                                      value={
                                        clampTerminatorPlayerImageScale(terminatorVisual.playerImageScale) -
                                        terminatorBaseline.playerImageScale
                                      }
                                      onChange={(val) =>
                                        patchTerminatorVisual(
                                          'playerImageScale',
                                          clampTerminatorPlayerImageScale(
                                            terminatorBaseline.playerImageScale + val
                                          )
                                        )
                                      }
                                      className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-[#ccff00] font-black text-center outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                                      Title
                                    </label>
                                    <input
                                      value={terminatorVisual.title}
                                      onChange={(e) =>
                                        patchTerminatorVisual('title', e.target.value.toUpperCase())
                                      }
                                      className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white font-black uppercase text-center outline-none"
                                    />
                                  </div>
                                </div>

                                <div className="mt-5 pt-4 border-t border-white/5">
                                  <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Palette size={12} className="text-[#ccff00]" />
                                    Visual Preset
                                  </h4>
                                  <div className="grid grid-cols-2 gap-2">
                                    {TERMINATOR_VISUAL_PRESETS.map((preset) => {
                                      const selected = Object.entries(preset.config).every(
                                        ([key, value]) =>
                                          terminatorVisual[key as keyof TerminatorVisualConfig] === value
                                      );
                                      return (
                                        <button
                                          key={preset.id}
                                          type="button"
                                          onClick={() =>
                                            setTerminatorVisual((prev) => ({
                                              ...prev,
                                              ...preset.config,
                                            }))
                                          }
                                          className={`relative min-h-[76px] overflow-hidden rounded-xl border p-3 text-left transition-all ${
                                            selected
                                              ? 'bg-[#ccff00] text-black border-[#ccff00]'
                                              : 'bg-black text-white border-white/10 hover:border-[#ccff00]/40'
                                          }`}
                                          title={preset.description}
                                        >
                                          <div
                                            className="absolute inset-x-0 top-0 h-1"
                                            style={{ backgroundColor: DEFAULT_TERMINATOR_VISUAL.accentColor }}
                                          />
                                          {preset.config.designVariant === 'terminator-a' ? (
                                            <div className="relative mb-2 h-8 overflow-hidden rounded border border-white/10" style={{ backgroundColor: DEFAULT_TERMINATOR_VISUAL.bodyBg }}>
                                              <span className="absolute inset-y-0 left-0 w-[38%]" style={{ backgroundColor: '#ADADAD' }} />
                                              <span className="absolute inset-y-0 left-[36%] w-[4%] skew-x-[-8deg]" style={{ backgroundColor: DEFAULT_TERMINATOR_VISUAL.headerBg }} />
                                              <span className="absolute right-0 top-0 h-full w-[12%]" style={{ backgroundColor: DEFAULT_TERMINATOR_VISUAL.accentColor }} />
                                            </div>
                                          ) : (
                                            <div className="mb-2 flex h-8 overflow-hidden rounded border border-white/10">
                                              <span className="h-full w-1/4" style={{ backgroundColor: DEFAULT_TERMINATOR_VISUAL.headerBg }} />
                                              <span className="flex-1" style={{ backgroundColor: DEFAULT_TERMINATOR_VISUAL.bodyBg }} />
                                              <span className="h-full w-1/5" style={{ backgroundColor: DEFAULT_TERMINATOR_VISUAL.footerBg }} />
                                            </div>
                                          )}
                                          <div className="text-[8px] font-black uppercase tracking-widest">
                                            {preset.name}
                                          </div>
                                          <div
                                            className={`mt-1 text-[7px] font-bold uppercase leading-snug tracking-wide ${
                                              selected ? 'text-black/60' : 'text-zinc-600'
                                            }`}
                                          >
                                            {preset.description}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="mt-5 pt-4 border-t border-white/5">
                                  <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Image size={12} className="text-[#ccff00]" />
                                    Custom Design
                                  </h4>
                                  <div className="flex gap-2 mb-3">
                                    <button
                                      type="button"
                                      onClick={() => patchTerminatorVisual('useCustomBackground', false)}
                                      className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                                        !terminatorVisual.useCustomBackground
                                          ? 'bg-[#ccff00] text-black border-[#ccff00]'
                                          : 'bg-black text-zinc-500 border-white/10 hover:border-white/20'
                                      }`}
                                    >
                                      Panel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => patchTerminatorVisual('useCustomBackground', true)}
                                      className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                                        terminatorVisual.useCustomBackground
                                          ? 'bg-[#ccff00] text-black border-[#ccff00]'
                                          : 'bg-black text-zinc-500 border-white/10 hover:border-white/20'
                                      }`}
                                    >
                                      Custom Design
                                    </button>
                                  </div>
                                </div>

                                <div className="mt-5 pt-4 border-t border-white/5">
                                  <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Palette size={12} className="text-[#ccff00]" />
                                    Banner Background & Text
                                  </h4>
                                  <div className="grid grid-cols-3 gap-2">
                                    {TERMINATOR_COLOR_KEYS.map((key) => (
                                      <div
                                        key={key}
                                        className="bg-black border border-white/10 rounded-xl p-2.5 flex flex-col justify-between gap-1.5 relative group hover:border-[#ccff00]/30 transition-all h-[88px]"
                                      >
                                        <div className="flex justify-between items-start relative z-30">
                                          <label className="text-[6px] font-black uppercase tracking-widest text-zinc-500 pointer-events-none leading-tight">
                                            {TERMINATOR_COLOR_LABELS[key]}
                                          </label>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              patchTerminatorVisual(key, DEFAULT_TERMINATOR_VISUAL[key]);
                                            }}
                                            className="p-0.5 rounded hover:bg-white/20 text-zinc-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                            title="Reset"
                                          >
                                            <RotateCcw size={8} />
                                          </button>
                                        </div>
                                        <span className="text-[8px] font-[1000] text-white uppercase truncate relative z-10">
                                          {terminatorVisual[key]}
                                        </span>
                                        <input
                                          type="color"
                                          value={terminatorVisual[key]}
                                          onChange={(e) => patchTerminatorVisual(key, e.target.value)}
                                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        />
                                        <div
                                          className="absolute inset-0 opacity-25 group-hover:opacity-35 pointer-events-none rounded-xl"
                                          style={{ backgroundColor: terminatorVisual[key] }}
                                        />
                                        <div
                                          className="absolute bottom-2 right-2 w-5 h-5 rounded-full border border-white/20 pointer-events-none z-10"
                                          style={{ backgroundColor: terminatorVisual[key] }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                           </div>
                        </div>
                          )}

                          {visualSettingsPanel === 'firstBlood' && (
                        <div className="space-y-6">
                           <div className="p-6 bg-zinc-900 border border-white/5 rounded-[20px] shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                   <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                     <Droplets size={12} className="text-[#ccff00]" />
                                     First Blood Banner
                                   </h3>
                                   <div className="flex flex-col items-end gap-2">
                                   <div className="flex items-center gap-2">
                                     <button
                                       type="button"
                                       onClick={previewFirstBloodBanner}
                                       disabled={firstBloodVisual.previewHold}
                                       className={`text-[7px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors ${
                                         firstBloodVisual.previewHold
                                           ? 'text-zinc-700 cursor-not-allowed'
                                           : 'text-zinc-500 hover:text-[#ccff00]'
                                       }`}
                                       title={firstBloodVisual.previewHold ? 'Matikan Preview Sementara dulu' : undefined}
                                     >
                                       <Play size={10} /> {t('olb.preview')}
                                     </button>
                                     <button
                                       type="button"
                                       onClick={resetFirstBloodToPreset}
                                       className="text-[7px] font-black text-zinc-600 hover:text-[#ccff00] uppercase tracking-widest flex items-center gap-1 transition-colors"
                                     >
                                       <RotateCcw size={10} /> {t('olb.reset')}
                                     </button>
                                   </div>
                                   <label
                                     className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all ${
                                       firstBloodVisual.previewHold
                                         ? 'bg-[#ccff00]/15 border-[#ccff00]/50 text-[#ccff00]'
                                         : 'bg-black border-white/10 text-zinc-500 hover:border-white/20'
                                     }`}
                                   >
                                     <input
                                       type="checkbox"
                                       checked={firstBloodVisual.previewHold}
                                       onChange={(e) =>
                                         patchFirstBloodVisual('previewHold', e.target.checked)
                                       }
                                       className="rounded border-white/20 bg-black text-[#ccff00] focus:ring-[#ccff00]"
                                     />
                                     <Eye size={10} />
                                     <span className="text-[7px] font-black uppercase tracking-widest">
                                       Preview Sementara
                                     </span>
                                   </label>
                                   </div>
                                </div>

                                <div className="flex items-center justify-between gap-3 p-3 bg-black border border-white/10 rounded-xl mb-4">
                                  <div>
                                    <div className="text-[9px] font-black text-white uppercase tracking-widest">
                                      Status Banner
                                    </div>
                                    <div className="text-[7px] text-zinc-500 normal-case mt-1">
                                      Aktif satu kali saat kill pertama match tercatat.
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => patchFirstBloodVisual('enabled', !firstBloodVisual.enabled)}
                                    className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                                      firstBloodVisual.enabled
                                        ? 'bg-[#ccff00] text-black border-[#ccff00]'
                                        : 'bg-zinc-950 text-zinc-500 border-white/10 hover:border-white/20'
                                    }`}
                                  >
                                    {firstBloodVisual.enabled ? 'On' : 'Off'}
                                  </button>
                                </div>

                                <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between mb-3">
                                  <h4 className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <Move size={12} className="text-[#ccff00]" />
                                    Layout & Position
                                  </h4>
                                  <button
                                    type="button"
                                    onClick={resetFirstBloodLayout}
                                    className="flex items-center gap-1 text-[7px] font-black text-zinc-600 uppercase tracking-widest hover:text-[#ccff00] transition-colors"
                                  >
                                    <RotateCcw size={8} /> Reset
                                  </button>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                                      Duration (Sec)
                                    </label>
                                    <ScrollableInput
                                      value={
                                        clampFirstBloodDisplaySeconds(firstBloodVisual.displaySeconds) -
                                        DEFAULT_FIRST_BLOOD_VISUAL.displaySeconds
                                      }
                                      onChange={(val) =>
                                        patchFirstBloodVisual(
                                          'displaySeconds',
                                          clampFirstBloodDisplaySeconds(
                                            DEFAULT_FIRST_BLOOD_VISUAL.displaySeconds + val
                                          )
                                        )
                                      }
                                      className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white font-black text-center outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                                      Scale (%)
                                    </label>
                                    <ScrollableInput
                                      value={
                                        clampFirstBloodScale(firstBloodVisual.scale) -
                                        firstBloodLayoutBaseline.scale
                                      }
                                      onChange={(val) =>
                                        patchFirstBloodVisual(
                                          'scale',
                                          clampFirstBloodScale(firstBloodLayoutBaseline.scale + val)
                                        )
                                      }
                                      className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white font-black text-center outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                                      Pos X
                                    </label>
                                    <ScrollableInput
                                      value={
                                        clampFirstBloodPosition(
                                          firstBloodVisual.x,
                                          firstBloodLayoutBaseline.x
                                        ) - firstBloodLayoutBaseline.x
                                      }
                                      onChange={(val) =>
                                        patchFirstBloodVisual(
                                          'x',
                                          clampFirstBloodPosition(
                                            firstBloodLayoutBaseline.x + val,
                                            firstBloodLayoutBaseline.x
                                          )
                                        )
                                      }
                                      className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white font-black text-center outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                                      Pos Y
                                    </label>
                                    <ScrollableInput
                                      value={
                                        clampFirstBloodPosition(
                                          firstBloodVisual.y,
                                          firstBloodLayoutBaseline.y
                                        ) - firstBloodLayoutBaseline.y
                                      }
                                      onChange={(val) =>
                                        patchFirstBloodVisual(
                                          'y',
                                          clampFirstBloodPosition(
                                            firstBloodLayoutBaseline.y + val,
                                            firstBloodLayoutBaseline.y
                                          )
                                        )
                                      }
                                      className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white font-black text-center outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                                      Player X
                                    </label>
                                    <ScrollableInput
                                      value={
                                        clampFirstBloodPosition(
                                          firstBloodVisual.playerImageX,
                                          firstBloodLayoutBaseline.playerImageX
                                        ) - firstBloodLayoutBaseline.playerImageX
                                      }
                                      onChange={(val) =>
                                        patchFirstBloodVisual(
                                          'playerImageX',
                                          clampFirstBloodPosition(
                                            firstBloodLayoutBaseline.playerImageX + val,
                                            firstBloodLayoutBaseline.playerImageX
                                          )
                                        )
                                      }
                                      className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white font-black text-center outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                                      Player Y
                                    </label>
                                    <ScrollableInput
                                      value={
                                        clampFirstBloodPosition(
                                          firstBloodVisual.playerImageY,
                                          firstBloodLayoutBaseline.playerImageY
                                        ) - firstBloodLayoutBaseline.playerImageY
                                      }
                                      onChange={(val) =>
                                        patchFirstBloodVisual(
                                          'playerImageY',
                                          clampFirstBloodPosition(
                                            firstBloodLayoutBaseline.playerImageY + val,
                                            firstBloodLayoutBaseline.playerImageY
                                          )
                                        )
                                      }
                                      className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white font-black text-center outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                                      Player S (%)
                                    </label>
                                    <ScrollableInput
                                      value={
                                        clampFirstBloodPlayerImageScale(firstBloodVisual.playerImageScale) -
                                        firstBloodLayoutBaseline.playerImageScale
                                      }
                                      onChange={(val) =>
                                        patchFirstBloodVisual(
                                          'playerImageScale',
                                          clampFirstBloodPlayerImageScale(
                                            firstBloodLayoutBaseline.playerImageScale + val
                                          )
                                        )
                                      }
                                      className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-[#ccff00] font-black text-center outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                                      Title
                                    </label>
                                    <input
                                      value={firstBloodVisual.title}
                                      onChange={(e) =>
                                        patchFirstBloodVisual('title', e.target.value.toUpperCase())
                                      }
                                      className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white font-black uppercase text-center outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">
                                      Subtitle
                                    </label>
                                    <input
                                      value={firstBloodVisual.subtitle}
                                      onChange={(e) =>
                                        patchFirstBloodVisual('subtitle', e.target.value)
                                      }
                                      className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white font-black text-center outline-none"
                                    />
                                  </div>
                                </div>

                                <div className="mt-5 pt-4 border-t border-white/5">
                                  <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Palette size={12} className="text-[#ccff00]" />
                                    Visual Preset
                                  </h4>
                                  <div className="grid grid-cols-2 gap-2">
                                    {FIRST_BLOOD_VISUAL_PRESETS.map((preset) => {
                                      const selected = Object.entries(preset.config).every(
                                        ([key, value]) =>
                                          firstBloodVisual[key as keyof FirstBloodVisualConfig] === value
                                      );
                                      return (
                                        <button
                                          key={preset.id}
                                          type="button"
                                          onClick={() =>
                                            setFirstBloodVisual((prev) => ({
                                              ...prev,
                                              ...preset.config,
                                            }))
                                          }
                                          className={`relative min-h-[84px] overflow-hidden rounded-xl border p-3 text-left transition-all ${
                                            selected
                                              ? 'bg-[#ccff00] text-black border-[#ccff00]'
                                              : 'bg-black text-white border-white/10 hover:border-[#ccff00]/40'
                                          }`}
                                          title={preset.description}
                                        >
                                          {preset.previewImage ? (
                                            <div className="relative mb-2 h-9 overflow-hidden rounded border border-white/10 bg-zinc-950">
                                              <img
                                                src={preset.previewImage}
                                                className="h-full w-full object-cover"
                                                alt=""
                                              />
                                            </div>
                                          ) : (
                                            <div className="relative mb-2 h-9 overflow-hidden rounded border border-white/10 bg-zinc-950">
                                              {preset.config.designVariant === 'diagonal-strike' ? (
                                                <>
                                                  <span
                                                    className="absolute inset-0"
                                                    style={{
                                                      backgroundColor: DEFAULT_FIRST_BLOOD_VISUAL.bodyBg,
                                                      clipPath: 'polygon(6% 0, 100% 0, 94% 100%, 0 100%, 0 24%)',
                                                    }}
                                                  />
                                                  <span
                                                    className="absolute left-2 top-1 h-2.5 w-[58%] -skew-x-[20deg]"
                                                    style={{ backgroundColor: DEFAULT_FIRST_BLOOD_VISUAL.headerBg }}
                                                  />
                                                  <span className="absolute bottom-1 left-3 h-2 w-[38%] bg-black/50" />
                                                  <span
                                                    className="absolute right-2 top-1 h-7 w-7"
                                                    style={{
                                                      backgroundColor: DEFAULT_FIRST_BLOOD_VISUAL.footerBg,
                                                      clipPath: 'polygon(22% 0, 100% 0, 100% 100%, 0 100%)',
                                                    }}
                                                  />
                                                </>
                                              ) : preset.config.designVariant === 'photo-split' ? (
                                                <>
                                                  <span
                                                    className="absolute left-0 top-0 h-full w-[34%]"
                                                    style={{
                                                      backgroundColor: DEFAULT_FIRST_BLOOD_VISUAL.footerBg,
                                                      clipPath: 'polygon(0 0, 100% 0, 82% 100%, 0 100%)',
                                                    }}
                                                  />
                                                  <span
                                                    className="absolute right-0 top-0 h-full w-[72%]"
                                                    style={{
                                                      backgroundColor: DEFAULT_FIRST_BLOOD_VISUAL.bodyBg,
                                                      clipPath: 'polygon(10% 0, 100% 0, 100% 100%, 0 100%)',
                                                    }}
                                                  />
                                                  <span
                                                    className="absolute left-[43%] top-1.5 h-2.5 w-[42%]"
                                                    style={{ backgroundColor: DEFAULT_FIRST_BLOOD_VISUAL.headerBg }}
                                                  />
                                                  <span className="absolute bottom-2 left-[44%] h-1.5 w-[32%] bg-black/50" />
                                                </>
                                              ) : preset.config.designVariant === 'compact-hud' ? (
                                                <>
                                                  <span
                                                    className="absolute inset-x-1 inset-y-2"
                                                    style={{
                                                      backgroundColor: DEFAULT_FIRST_BLOOD_VISUAL.bodyBg,
                                                      clipPath: 'polygon(4% 0, 100% 0, 96% 100%, 0 100%)',
                                                    }}
                                                  />
                                                  <span
                                                    className="absolute left-2 top-2 h-5 w-5"
                                                    style={{
                                                      backgroundColor: DEFAULT_FIRST_BLOOD_VISUAL.footerBg,
                                                      clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0 100%)',
                                                    }}
                                                  />
                                                  <span
                                                    className="absolute left-8 top-2.5 h-2 w-[36%]"
                                                    style={{ backgroundColor: DEFAULT_FIRST_BLOOD_VISUAL.headerBg }}
                                                  />
                                                  <span className="absolute bottom-2 left-8 h-1.5 w-[46%] bg-black/55" />
                                                </>
                                              ) : preset.config.designVariant === 'classic-lock' ? (
                                                <div className="flex h-full flex-col overflow-hidden">
                                                  <span
                                                    className="h-[28%]"
                                                    style={{ backgroundColor: DEFAULT_FIRST_BLOOD_VISUAL.headerBg }}
                                                  />
                                                  <span
                                                    className="flex-1"
                                                    style={{ backgroundColor: DEFAULT_FIRST_BLOOD_VISUAL.bodyBg }}
                                                  />
                                                  <span
                                                    className="h-[16%]"
                                                    style={{ backgroundColor: DEFAULT_FIRST_BLOOD_VISUAL.footerBg }}
                                                  />
                                                </div>
                                              ) : (
                                                <div className="flex h-full overflow-hidden">
                                                  <span
                                                    className="h-full w-1/4"
                                                    style={{ backgroundColor: DEFAULT_FIRST_BLOOD_VISUAL.headerBg }}
                                                  />
                                                  <span
                                                    className="flex-1"
                                                    style={{ backgroundColor: DEFAULT_FIRST_BLOOD_VISUAL.bodyBg }}
                                                  />
                                                  <span
                                                    className="h-full w-1/5"
                                                    style={{ backgroundColor: DEFAULT_FIRST_BLOOD_VISUAL.footerBg }}
                                                  />
                                                </div>
                                              )}
                                            </div>
                                          )}
                                          <div className="text-[8px] font-black uppercase tracking-widest">
                                            {preset.name}
                                          </div>
                                          <div
                                            className={`mt-1 text-[7px] font-bold uppercase leading-snug tracking-wide ${
                                              selected ? 'text-black/60' : 'text-zinc-600'
                                            }`}
                                          >
                                            {preset.description}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="mt-5 pt-4 border-t border-white/5">
                                  <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Image size={12} className="text-[#ccff00]" />
                                    Custom Design
                                  </h4>
                                  <div className="flex gap-2 mb-3">
                                    <button
                                      type="button"
                                      onClick={() => patchFirstBloodVisual('useCustomBackground', false)}
                                      className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                                        !firstBloodVisual.useCustomBackground
                                          ? 'bg-[#ccff00] text-black border-[#ccff00]'
                                          : 'bg-black text-zinc-500 border-white/10 hover:border-white/20'
                                      }`}
                                    >
                                      Panel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => patchFirstBloodVisual('useCustomBackground', true)}
                                      className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                                        firstBloodVisual.useCustomBackground
                                          ? 'bg-[#ccff00] text-black border-[#ccff00]'
                                          : 'bg-black text-zinc-500 border-white/10 hover:border-white/20'
                                      }`}
                                    >
                                      Custom Design
                                    </button>
                                  </div>
                                  <div className="flex gap-2">
                                    <input
                                      type="url"
                                      placeholder="https://... atau /assets/..."
                                      value={firstBloodVisual.customBackgroundUrl}
                                      onChange={(e) =>
                                        patchFirstBloodVisual('customBackgroundUrl', e.target.value)
                                      }
                                      className="flex-1 bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white placeholder:text-zinc-700"
                                    />
                                    <label className="shrink-0 px-2 py-2 bg-zinc-800 border border-white/10 rounded-lg cursor-pointer hover:bg-zinc-700 transition-colors flex items-center">
                                      <Upload size={12} className="text-zinc-400" />
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            void compressImage(file, BACKGROUND_PRESET).then((result) =>
                                              patchFirstBloodVisual('customBackgroundUrl', result)
                                            );
                                          }
                                          e.target.value = '';
                                        }}
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => patchFirstBloodVisual('customBackgroundUrl', '')}
                                      className="shrink-0 px-2 py-2 bg-black border border-white/10 rounded-lg hover:border-[#ccff00]/40 transition-colors"
                                      title="Hapus link"
                                    >
                                      <Trash2 size={12} className="text-zinc-500" />
                                    </button>
                                  </div>
                                </div>

                                <div className="mt-5 pt-4 border-t border-white/5">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                      <Palette size={12} className="text-[#ccff00]" />
                                      Text Colors
                                    </h4>
                                    <button
                                      type="button"
                                      onClick={resetFirstBloodColors}
                                      className="flex items-center gap-1 text-[7px] font-black text-zinc-600 uppercase tracking-widest hover:text-[#ccff00] transition-colors"
                                    >
                                      <RotateCcw size={8} /> Reset
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    {(['accentColor', 'textColor', 'mutedTextColor'] as const).map((key) => (
                                      <div
                                        key={key}
                                        className="bg-black border border-white/10 rounded-xl p-2.5 flex flex-col justify-between gap-1.5 relative group hover:border-[#ccff00]/30 transition-all h-[88px]"
                                      >
                                        <div className="flex justify-between items-start relative z-30">
                                          <label className="text-[6px] font-black uppercase tracking-widest text-zinc-500 pointer-events-none leading-tight">
                                            {FIRST_BLOOD_COLOR_LABELS[key]}
                                          </label>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              patchFirstBloodVisual(key, DEFAULT_FIRST_BLOOD_VISUAL[key]);
                                            }}
                                            className="p-0.5 rounded hover:bg-white/20 text-zinc-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                            title="Reset"
                                          >
                                            <RotateCcw size={8} />
                                          </button>
                                        </div>
                                        <span className="text-[8px] font-[1000] text-white uppercase truncate relative z-10">
                                          {firstBloodVisual[key]}
                                        </span>
                                        <input
                                          type="color"
                                          value={firstBloodVisual[key]}
                                          onChange={(e) => patchFirstBloodVisual(key, e.target.value)}
                                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        />
                                        <div
                                          className="absolute inset-0 opacity-25 group-hover:opacity-35 pointer-events-none rounded-xl"
                                          style={{ backgroundColor: firstBloodVisual[key] }}
                                        />
                                        <div
                                          className="absolute bottom-2 right-2 w-5 h-5 rounded-full border border-white/20 pointer-events-none z-10"
                                          style={{ backgroundColor: firstBloodVisual[key] }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {!firstBloodVisual.useCustomBackground && firstBloodVisual.designVariant === 'classic-lock' && (
                                  <div className="mt-5 pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <Palette size={12} className="text-[#ccff00]" />
                                        Panel Colors
                                      </h4>
                                      <button
                                        type="button"
                                        onClick={resetFirstBloodColors}
                                        className="flex items-center gap-1 text-[7px] font-black text-zinc-600 uppercase tracking-widest hover:text-[#ccff00] transition-colors"
                                      >
                                        <RotateCcw size={8} /> Reset
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                      {(['headerBg', 'bodyBg', 'footerBg'] as const).map((key) => (
                                        <div
                                          key={key}
                                          className="bg-black border border-white/10 rounded-xl p-2.5 flex flex-col justify-between gap-1.5 relative group hover:border-[#ccff00]/30 transition-all h-[88px]"
                                        >
                                          <div className="flex justify-between items-start relative z-30">
                                            <label className="text-[6px] font-black uppercase tracking-widest text-zinc-500 pointer-events-none leading-tight">
                                              {FIRST_BLOOD_COLOR_LABELS[key]}
                                            </label>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                patchFirstBloodVisual(key, DEFAULT_FIRST_BLOOD_VISUAL[key]);
                                              }}
                                              className="p-0.5 rounded hover:bg-white/20 text-zinc-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                              title="Reset"
                                            >
                                              <RotateCcw size={8} />
                                            </button>
                                          </div>
                                          <span className="text-[8px] font-[1000] text-white uppercase truncate relative z-10">
                                            {firstBloodVisual[key]}
                                          </span>
                                          <input
                                            type="color"
                                            value={firstBloodVisual[key]}
                                            onChange={(e) => patchFirstBloodVisual(key, e.target.value)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                          />
                                          <div
                                            className="absolute inset-0 opacity-25 group-hover:opacity-35 pointer-events-none rounded-xl"
                                            style={{ backgroundColor: firstBloodVisual[key] }}
                                          />
                                          <div
                                            className="absolute bottom-2 right-2 w-5 h-5 rounded-full border border-white/20 pointer-events-none z-10"
                                            style={{ backgroundColor: firstBloodVisual[key] }}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {!firstBloodVisual.useCustomBackground &&
                                  (firstBloodVisual.designVariant === 'default-reference' || firstBloodVisual.designVariant === 'photo-split') && (
                                  <div className="mt-5 pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <Palette size={12} className="text-[#ccff00]" />
                                        Asset Palette
                                      </h4>
                                      <button
                                        type="button"
                                        onClick={() => patchFirstBloodVisual(
                                          'assetPaletteOverride',
                                          firstBloodVisual.designVariant === 'photo-split'
                                            ? [...HERO_SPLIT_ORIGINAL_PALETTE]
                                            : [...BROADCAST_CUT_ORIGINAL_PALETTE]
                                        )}
                                        className="flex items-center gap-1 text-[7px] font-black text-zinc-600 uppercase tracking-widest hover:text-[#ccff00] transition-colors"
                                      >
                                        <RotateCcw size={8} /> Reset
                                      </button>
                                    </div>
                                    {(() => {
                                      const isHeroSplit = firstBloodVisual.designVariant === 'photo-split';
                                      const defaultPalette = isHeroSplit ? HERO_SPLIT_ORIGINAL_PALETTE : BROADCAST_CUT_ORIGINAL_PALETTE;
                                      const palette = [...(firstBloodVisual.assetPaletteOverride ?? defaultPalette)];
                                      while (palette.length < defaultPalette.length) {
                                        palette.push(defaultPalette[palette.length]);
                                      }
                                      const makeSwatch = (label: string, idx: number, groupIndices?: readonly number[]) => (
                                        <div key={label} className="flex flex-col gap-1.5">
                                          <label className="text-[7px] font-bold text-zinc-600 uppercase text-center">{label}</label>
                                          <div className="relative h-[34px] w-full rounded-lg border border-white/10 overflow-hidden cursor-pointer group hover:border-[#ccff00]/30 transition-all">
                                            <div className="absolute inset-0" style={{ backgroundColor: palette[idx] ?? defaultPalette[idx] }} />
                                            <input
                                              type="color"
                                              value={palette[idx] ?? defaultPalette[idx]}
                                              onChange={(e) => {
                                                const next = [...palette];
                                                (groupIndices ?? [idx]).forEach(i => { next[i] = e.target.value; });
                                                patchFirstBloodVisual('assetPaletteOverride', next);
                                              }}
                                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                          </div>
                                        </div>
                                      );
                                      if (isHeroSplit) {
                                        return (
                                          <div className="grid grid-cols-3 gap-2">
                                            {makeSwatch('Panel', HERO_SPLIT_PANEL_INDICES[0], [...HERO_SPLIT_PANEL_INDICES])}
                                            {makeSwatch('Accent', HERO_SPLIT_ACCENT_INDEX)}
                                            {makeSwatch('Light 1', HERO_SPLIT_LIGHT_INDICES[0])}
                                            {makeSwatch('Light 2', HERO_SPLIT_LIGHT_INDICES[1])}
                                          </div>
                                        );
                                      }
                                      return (
                                        <div className="grid grid-cols-3 gap-2">
                                          {makeSwatch('Logo Panel', BROADCAST_CUT_LOGO_PANEL_INDICES[0], [...BROADCAST_CUT_LOGO_PANEL_INDICES])}
                                          {makeSwatch('Bar', BROADCAST_CUT_BAR_INDICES[0], [...BROADCAST_CUT_BAR_INDICES])}
                                          <div className="flex flex-col gap-1.5">
                                            <label className="text-[7px] font-bold text-zinc-600 uppercase text-center">Footer BG</label>
                                            <div className="relative h-[34px] w-full rounded-lg border border-white/10 overflow-hidden cursor-pointer group hover:border-[#ccff00]/30 transition-all">
                                              <div className="absolute inset-0" style={{ backgroundColor: firstBloodVisual.footerBg }} />
                                              <input
                                                type="color"
                                                value={firstBloodVisual.footerBg}
                                                onChange={(e) => patchFirstBloodVisual('footerBg', e.target.value)}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                              />
                                            </div>
                                          </div>
                                          {BROADCAST_CUT_LIGHT_INDICES.map(idx => makeSwatch(BROADCAST_CUT_PALETTE_LABELS[idx], idx))}
                                          {makeSwatch('Kill BG', BROADCAST_CUT_ACCENT_INDEX)}
                                        </div>
                                      );
                                    })()}
                                    <p className="mt-2 text-[7px] text-zinc-600 leading-relaxed">
                                      Ganti warna bawaan PNG secara langsung via pixel replacement. Perubahan diterapkan dalam ~0.5 detik.
                                    </p>
                                  </div>
                                )}
                           </div>
                        </div>
                          )}

                          {visualSettingsPanel === 'finalFour' && (
                        <div className="space-y-6">
                           <div className="p-6 bg-zinc-900 border border-white/5 rounded-[20px] shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                   <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                     <Trophy size={12} className="text-green-500" />
                                     {t('olb.finalFourWwcdBar')}
                                   </h3>
                                   <div className="flex flex-col items-end gap-2">
                                   <div className="flex items-center gap-2">
                                     <button
                                       type="button"
                                       onClick={() => setFinalFourHoldPreview(true)}
                                       disabled={finalFourHoldPreview}
                                       className={`text-[7px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors ${
                                         finalFourHoldPreview
                                           ? 'text-zinc-700 cursor-not-allowed'
                                           : 'text-zinc-500 hover:text-[#ccff00]'
                                       }`}
                                     >
                                       <Play size={10} /> {t('olb.preview')}
                                     </button>
                                     <button
                                       type="button"
                                       onClick={() => {
                                         setFinalFourHoldPreview(false);
                                         setFinalFourLayout(DEFAULT_FINAL_FOUR_LAYOUT);
                                         setVisualConfig((prev) => ({
                                           ...prev,
                                           ...DEFAULT_FINAL_FOUR_VISUAL,
                                         }));
                                       }}
                                       className="text-[7px] font-black text-zinc-600 hover:text-[#ccff00] uppercase tracking-widest flex items-center gap-1 transition-colors"
                                     >
                                       <RotateCcw size={10} /> {t('olb.reset')}
                                     </button>
                                   </div>
                                   <label
                                     className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all ${
                                       finalFourHoldPreview
                                         ? 'bg-[#ccff00]/15 border-[#ccff00]/50 text-[#ccff00]'
                                         : 'bg-black border-white/10 text-zinc-500 hover:border-white/20'
                                     }`}
                                   >
                                     <input
                                       type="checkbox"
                                       checked={finalFourHoldPreview}
                                       onChange={(e) => setFinalFourHoldPreview(e.target.checked)}
                                       className="rounded border-white/20 bg-black text-[#ccff00] focus:ring-[#ccff00]"
                                     />
                                     <Eye size={10} />
                                     <span className="text-[7px] font-black uppercase tracking-widest">
                                       Preview Sementara
                                     </span>
                                   </label>
                                   </div>
                                </div>
                                <p className="text-[8px] font-medium text-zinc-600 normal-case mb-3 tracking-wide leading-relaxed">
                                  Bar WWCD muncul saat ≤4 tim tersisa · geser posisi di canvas 1920×1080.
                                  {finalFourHoldPreview ? (
                                    <span className="block mt-1 text-[#ccff00] uppercase tracking-wide">
                                      Preview aktif — 4 kartu contoh tampil di Monitor Preview / Program &amp; Link Output.
                                    </span>
                                  ) : null}
                                </p>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('olb.scalePct')}</label><ScrollableInput value={finalFourLayout.scale} onChange={(val) => setFinalFourLayout({...finalFourLayout, scale: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('olb.posX')}</label><ScrollableInput value={finalFourLayout.xOffset} onChange={(val) => setFinalFourLayout({...finalFourLayout, xOffset: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('olb.posY')}</label><ScrollableInput value={finalFourLayout.yOffset} onChange={(val) => setFinalFourLayout({...finalFourLayout, yOffset: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('olb.cardGap')}</label><ScrollableInput value={finalFourLayout.cardGap} onChange={(val) => setFinalFourLayout({...finalFourLayout, cardGap: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('olb.soloExitMs')}</label><ScrollableInput value={finalFourLayout.soloExitDelayMs} onChange={(val) => setFinalFourLayout({...finalFourLayout, soloExitDelayMs: resolveFinalFourSoloExitDelayMs(val)})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/5">
                                  <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Type size={12} className="text-[#ccff00]" />
                                    Jenis font (Final Four)
                                  </h4>
                                  <OverlayFontFamilySelect
                                    value={finalFourLayout.fontFamilyId}
                                    onChange={(fontFamilyId) =>
                                      setFinalFourLayout((prev) => ({ ...prev, fontFamilyId }))
                                    }
                                  />
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/5">
                                  <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-2">
                                    Ukuran font (px)
                                  </h4>
                                  <div className="grid grid-cols-3 gap-3">
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('olb.tag')}</label><ScrollableInput value={finalFourLayout.tagFontSize} onChange={(val) => setFinalFourLayout({...finalFourLayout, tagFontSize: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('olb.wwcdLabel')}</label><ScrollableInput value={finalFourLayout.wwcdLabelFontSize} onChange={(val) => setFinalFourLayout({...finalFourLayout, wwcdLabelFontSize: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('olb.wwcdPct')}</label><ScrollableInput value={finalFourLayout.wwcdPctFontSize} onChange={(val) => setFinalFourLayout({...finalFourLayout, wwcdPctFontSize: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                  </div>
                                </div>
                           </div>

                           <div className="p-4 bg-zinc-950 border border-white/5 rounded-xl">
                                <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-1 flex items-center gap-2">
                                  <Link2 size={12} className="text-[#ccff00]" />
                                  Desain kartu Final Four
                                </h4>
                                <p className="text-[7px] text-zinc-500 normal-case mb-3 tracking-wide">
                                  Panel = warna solid · Custom Image = background kartu via link (388×128 px)
                                </p>
                                <div className="flex gap-2">
                                  {(['panels', 'customImage'] as const satisfies readonly FinalFourDesignMode[]).map(
                                    (mode) => (
                                      <button
                                        key={mode}
                                        type="button"
                                        onClick={() =>
                                          setVisualConfig((prev) => ({
                                            ...prev,
                                            finalFourDesignMode: mode,
                                          }))
                                        }
                                        className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                                          (visualConfig.finalFourDesignMode ?? 'panels') === mode
                                            ? 'bg-[#ccff00] text-black border-[#ccff00]'
                                            : 'bg-black text-zinc-500 border-white/10 hover:border-white/20'
                                        }`}
                                      >
                                        {FINAL_FOUR_DESIGN_MODE_LABELS[mode]}
                                      </button>
                                    )
                                  )}
                                </div>
                           </div>

                           {isFinalFourPanelDesignMode(visualConfig) && (
                           <div className="p-4 bg-zinc-950 border border-white/5 rounded-xl">
                                <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <Palette size={12} className="text-[#ccff00]" />
                                  WARNA PANEL
                                </h4>
                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                                    {FINAL_FOUR_COLOR_KEYS.map((key) => (
                                        <div key={key} className="bg-black border border-white/10 rounded-xl p-3 flex flex-col justify-between gap-2 relative group hover:border-white/30 transition-all h-24">
                                            <div className="flex justify-between items-start relative z-30">
                                                <label className="text-[7px] font-black uppercase tracking-widest pointer-events-none text-zinc-500">{FINAL_FOUR_COLOR_LABELS[key]}</label>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setVisualConfig((prev) => ({
                                                          ...prev,
                                                          [key]: (INITIAL_VISUAL_CONFIG as VisualConfig)[key],
                                                        }));
                                                    }}
                                                    className="p-1 -mt-1 -mr-1 rounded hover:bg-white/20 text-zinc-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Reset to Default"
                                                >
                                                    <RotateCcw size={10} />
                                                </button>
                                            </div>
                                            <span className="text-[9px] font-[1000] text-white uppercase tracking-wider truncate relative z-10 pointer-events-none">{(visualConfig as VisualConfig)[key]}</span>
                                            <input
                                                type="color"
                                                value={(visualConfig as VisualConfig)[key]}
                                                onChange={(e) => setVisualConfig({...visualConfig, [key]: e.target.value})}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                            />
                                            <div className="absolute inset-0 opacity-20 transition-opacity group-hover:opacity-30 pointer-events-none" style={{ backgroundColor: (visualConfig as VisualConfig)[key] }} />
                                            <div className="absolute bottom-3 right-3 w-6 h-6 rounded-full shadow-sm border border-white/20 pointer-events-none" style={{ backgroundColor: (visualConfig as VisualConfig)[key] }} />
                                        </div>
                                    ))}
                                </div>
                           </div>
                           )}

                           {!isFinalFourPanelDesignMode(visualConfig) && (
                           <div className="p-4 bg-black/40 border border-[#ccff00]/20 rounded-xl space-y-4">
                                <h4 className="text-[9px] font-black text-[#ccff00] uppercase tracking-widest flex items-center gap-2">
                                  <Image size={12} />
                                  Custom Image (LINK)
                                </h4>
                                <p className="text-[7px] text-zinc-500 normal-case leading-relaxed">
                                  Satu gambar per kartu (388×128) · area transparan memakai warna fallback Panel Dark.
                                </p>
                                <div className="flex gap-2">
                                  <input
                                    type="url"
                                    placeholder="https://... atau /path/card-bg.png"
                                    value={visualConfig.finalFourCardBgImage}
                                    onChange={(e) =>
                                      setVisualConfig((prev) => ({
                                        ...prev,
                                        finalFourCardBgImage: e.target.value,
                                      }))
                                    }
                                    className="flex-1 min-w-0 bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white outline-none focus:border-[#ccff00]"
                                  />
                                  <label className="shrink-0 px-2 py-2 bg-zinc-800 border border-white/10 rounded-lg text-[7px] font-black text-zinc-400 uppercase tracking-widest cursor-pointer hover:border-[#ccff00]/50 hover:text-[#ccff00] transition-colors">
                                    <Upload size={10} className="inline mr-1" />
                                    File
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        handleFinalFourCardImageUpload(e.target.files?.[0]);
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                  {visualConfig.finalFourCardBgImage && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setVisualConfig((prev) => ({
                                          ...prev,
                                          finalFourCardBgImage: '',
                                        }))
                                      }
                                      className="shrink-0 px-2 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                                      title="Hapus gambar"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVisualConfig((prev) => ({
                                      ...prev,
                                      finalFourCardBgImage: '',
                                    }))
                                  }
                                  className="text-[7px] font-black text-zinc-600 hover:text-[#ccff00] uppercase tracking-widest flex items-center gap-1 transition-colors"
                                >
                                  <RotateCcw size={10} /> Reset background gambar
                                </button>
                           </div>
                           )}

                           {!isFinalFourPanelDesignMode(visualConfig) && (
                           <div className="p-4 bg-zinc-950 border border-white/5 rounded-xl">
                                <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <Palette size={12} className="text-zinc-400" />
                                  Warna teks
                                </h4>
                                <div className="grid grid-cols-4 gap-3">
                                  {(['finalFourTagText', 'finalFourWwcdLabelText', 'finalFourWwcdGreen', 'finalFourLogoBg'] as const).map((key) => (
                                    <div key={key} className="bg-black border border-white/10 rounded-xl p-3 flex flex-col justify-between gap-2 relative group hover:border-white/30 transition-all h-24">
                                      <label className="text-[7px] font-black uppercase tracking-widest text-zinc-500 relative z-30">{FINAL_FOUR_COLOR_LABELS[key]}</label>
                                      <span className="text-[9px] font-[1000] text-white uppercase tracking-wider truncate relative z-10 pointer-events-none">{(visualConfig as VisualConfig)[key]}</span>
                                      <input
                                        type="color"
                                        value={(visualConfig as VisualConfig)[key]}
                                        onChange={(e) => setVisualConfig({...visualConfig, [key]: e.target.value})}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                      />
                                      <div className="absolute inset-0 opacity-20 group-hover:opacity-30 pointer-events-none" style={{ backgroundColor: (visualConfig as VisualConfig)[key] }} />
                                    </div>
                                  ))}
                                </div>
                           </div>
                           )}
                        </div>
                          )}
                        </div>
                    )}

                    {configTab === 'ANIMATION' && (
                      <LeaderboardAnimationPanel
                        t={t}
                        userRole={userRole}
                        animationConfig={animationConfig}
                        setAnimationConfig={commitAnimationConfig}
                        draftAnimationConfig={draftAnimationConfig}
                        setDraftAnimationConfig={setDraftAnimationConfig}
                        presetOverrides={presetOverrides}
                        setPresetOverrides={setPresetOverrides}
                        isSaving={isSaving}
                        onSave={handleSave}
                        onPreview={triggerPreview}
                      />
                    )}
                </div>
            </div>
        </main>

        {!isGlobalStudio && showMonitors && (
          <div className={`transition-all duration-300 flex shrink-0 ${showMonitors ? 'opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}>
            <PanelControlMonitor 
              userRole={userRole} 
              customPreview={livePreviewContent} 
              programPreview={
                programAssetId === asset.id ? livePreviewContent : (
                  programAssetId ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white">
                      <h2 className="text-4xl font-black text-[#ccff00] mb-4">{t('olb.assetPlaying')}</h2>
                      <p className="text-xl text-zinc-400 uppercase tracking-widest">{availableAssets.find(a => a.id === programAssetId)?.name}</p>
                    </div>
                  ) : null
                )
              }
              activeAssets={
                programAssetId ? [{
                  id: programAssetId,
                  name: availableAssets.find(a => a.id === programAssetId)?.name || programAssetId,
                  isProgram: true
                }] : []
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

      <PlacementScoringModal isOpen={isScoringModalOpen} onClose={() => setIsScoringModalOpen(false)} onApply={handleApplyScoring} currentRules={scoringRules} currentKillPoints={killPointValue} />
      <KnockAttackerModal
        isOpen={knockAttackerModalVictim !== null}
        victim={knockAttackerModalVictim}
        teams={teams}
        onClose={closeKnockAttackerModal}
        onSelectKnocker={confirmKnockWithAttacker}
      />
      <KillVictimModal
        isOpen={killVictimModalFinisher !== null}
        finisher={killVictimModalFinisher}
        teams={teams}
        onClose={closeKillVictimModal}
        onSelectVictim={confirmKillVictim}
      />
      <ElimCauseModal
        isOpen={elimModalVictim !== null}
        victim={elimModalVictim}
        teams={teams}
        onClose={closeElimModal}
        onSelectElim={confirmElimFromModal}
      />
      <TieBreakerModal
        isOpen={isTieBreakerModalOpen}
        onClose={() => setIsTieBreakerModalOpen(false)}
        onApply={handleApplyTieBreaker}
        currentOrder={tieBreakerOrder}
        currentMatchKillRules={matchKillRules}
        currentMatch={currentMatch}
      />

      {isEndMatchModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-in fade-in" onClick={() => setIsEndMatchModalOpen(false)} />
            <div className="relative w-full max-w-md bg-[#0c0c0c] border border-white/10 rounded-[40px] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300">
                <div className={`p-8 flex flex-col items-center text-center ${!isMatchReadyToEnd ? 'bg-red-600/10' : 'bg-[#ccff00]/10'}`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border-2 ${!isMatchReadyToEnd ? 'bg-red-600/20 border-red-600 text-red-500' : 'bg-[#ccff00]/20 border-[#ccff00] text-[#ccff00]'}`}>
                        {!isMatchReadyToEnd ? <AlertCircle size={40} /> : <ShieldCheck size={40} />}
                    </div>
                    <h2 className="text-2xl font-[1000] italic text-white uppercase tracking-tighter mb-2">
                        {!isMatchReadyToEnd ? t('olb.securityAlert') : t('olb.finalizeGame')}
                    </h2>
                    <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${!isMatchReadyToEnd ? 'text-red-500' : 'text-[#ccff00]'}`}>
                        {!isMatchReadyToEnd
                          ? t('olb.matchStillOngoing')
                          : contentionCount === 2
                            ? t('olb.finalTop2')
                            : t('olb.winnerIdentified')}
                    </p>
                </div>

                <div className="p-8 space-y-6">
                    {!isMatchReadyToEnd ? (
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5 text-center">
                            <p className="text-xs font-bold text-zinc-400 uppercase leading-relaxed">
                                Masih ada <span className="text-white font-black">{contentionCount} TIM</span> tanpa placement (belum di-eliminasi di sistem).
                                <br/><br/>
                                Lanjut ke match berikutnya setelah tersisa maksimal 2 tim (WWCD / final 2), atau eliminasi tim hingga placement terisi.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-[#ccff00] flex items-center justify-center text-black">
                                        <Trophy size={24} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{t('olb.detectedWinner')}</p>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight truncate">{matchWinnerCandidate ? getLeaderboardTeamLabel(matchWinnerCandidate, projectPlayers) : ''}</h3>
                                    </div>
                                </div>
                                {contentionCount === 2 && matchRunnerUp && (
                                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center justify-between gap-3">
                                    <div className="min-w-0 text-left">
                                      <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{t('olb.runnerUpByKills')}</p>
                                      <h3 className="text-sm font-black text-white uppercase truncate">{getLeaderboardTeamLabel(matchRunnerUp, projectPlayers)}</h3>
                                    </div>
                                    <span className="text-[10px] font-black text-zinc-400 shrink-0">+{scoringRules[1] ?? 0} PTS</span>
                                  </div>
                                )}
                                <div className="space-y-2 pt-4 border-t border-white/5">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-zinc-500">#1 Placement Pts</span>
                                        <span className="text-[#ccff00]">+{scoringRules[0]}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-zinc-500">#1 Match Kills</span>
                                        <span className="text-white">{matchWinnerCandidate ? totalTeamKills(matchWinnerCandidate) : 0}</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[8px] text-zinc-600 uppercase font-black tracking-widest text-center px-4 leading-relaxed">
                                Dengan mengonfirmasi, poin penempatan akan ditambahkan ke total poin turnamen dan seluruh status akan di-reset untuk match berikutnya.
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setIsEndMatchModalOpen(false)}
                            className="py-5 rounded-2xl bg-zinc-900 border border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-all"
                        >
                            {t('olb.cancel')}
                        </button>
                        <button
                            onClick={confirmEndMatchExecution}
                            disabled={!isMatchReadyToEnd}
                            className={`py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl ${!isMatchReadyToEnd ? 'bg-zinc-800 text-zinc-700 cursor-not-allowed opacity-50' : 'bg-[#ccff00] text-black shadow-[0_0_30px_rgba(204,255,0,0.3)] hover:scale-105'}`}
                        >
                            {isMatchReadyToEnd ? t('olb.confirmEnd') : t('olb.restricted')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* NEW COUNTRY SELECTOR MODAL */}
      {isCountryModalOpen && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md animate-in fade-in" onClick={() => setIsCountryModalOpen(null)} />
            <div className="relative w-full max-w-[420px] bg-[#0c0c0c] border border-white/10 rounded-[32px] overflow-hidden flex flex-col max-h-[500px] shadow-2xl animate-in zoom-in-95">
                <div className="p-6 pb-2 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#ccff00] flex items-center justify-center text-black shadow-[0_0_15px_#ccff0033]">
                            <Globe size={18} />
                        </div>
                        <h3 className="text-sm font-[1000] italic text-white uppercase tracking-tighter">{t('olb.selectNationality')}</h3>
                    </div>
                    <button onClick={() => setIsCountryModalOpen(null)} className="p-2 text-zinc-600 hover:text-white transition-colors"><X size={18} /></button>
                </div>
                
                <div className="p-6">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-[#ccff00] transition-colors" size={16} />
                        <input 
                            type="text"
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            placeholder={t('olb.searchCountryName')}
                            className="w-full bg-[#111] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-[10px] font-black text-white outline-none focus:border-[#ccff00]/30 transition-all uppercase tracking-widest"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar space-y-2">
                    {filteredCountries.map((c) => (
                        <button 
                            key={c.code}
                            onClick={() => {
                                const newTeams = [...teams];
                                newTeams[isCountryModalOpen.rankIndex].country = c.code;
                                setTeams(newTeams);
                                setIsCountryModalOpen(null);
                                setCountrySearch('');
                            }}
                            className="w-full flex items-center justify-between p-4 bg-[#151515] border border-white/5 rounded-2xl hover:border-[#ccff00]/40 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-7 rounded overflow-hidden border border-white/10 shadow-sm">
                                    <img src={`https://flagcdn.com/w80/${c.code.toLowerCase()}.png`} className="w-full h-full object-cover" alt={c.name} />
                                </div>
                                <span className="text-[10px] font-black text-zinc-400 group-hover:text-white uppercase tracking-widest">{c.name}</span>
                            </div>
                            <span className="text-[8px] font-black text-zinc-800 group-hover:text-[#ccff00]">{c.code}</span>
                        </button>
                    ))}
                    {filteredCountries.length === 0 && (
                        <div className="py-12 text-center opacity-30 border border-dashed border-white/10 rounded-[24px]">
                            <p className="text-[10px] font-black uppercase tracking-widest">{t('olb.noMatchFound')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {isDbSelectorOpen && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-in fade-in" onClick={() => setIsDbSelectorOpen(null)} />
            <div className="relative w-full max-w-[580px] bg-[#0c0c0c] border border-white/10 rounded-[32px] overflow-hidden flex flex-col max-h-[520px] shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-8 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#ccff00] flex items-center justify-center text-black shrink-0"><Database size={20} fill="black" /></div>
                        <div className="flex flex-col"><h3 className="text-xl font-[1000] italic text-white tracking-tighter uppercase leading-none">{t('olb.teamDatabase')}</h3><p className="text-[10px] font-black text-[#ccff00] tracking-[0.3em] uppercase mt-2">{t('olb.assigningToSlot').replace('{n}', String(isDbSelectorOpen.rankIndex + 1))}</p></div>
                    </div>
                    <button onClick={() => setIsDbSelectorOpen(null)} className="p-2 text-zinc-600 hover:text-white transition-colors"><X size={22} /></button>
                </div>
                <div className="px-8 py-6"><div className="relative group"><input type="text" value={dbSearch} onChange={(e) => setDbSearch(e.target.value)} placeholder={t('olb.searchTeamName')} className="w-full bg-[#111] border border-white/5 rounded-2xl py-5 pl-8 pr-12 text-xs font-[1000] text-zinc-500 placeholder:text-zinc-800 outline-none focus:border-[#ccff00]/30 focus:text-white transition-all uppercase tracking-widest shadow-inner" /></div></div>
                <div className="flex-1 overflow-y-auto px-8 pb-10 custom-scrollbar space-y-3">
                    {filteredDbTeams.length > 0 ? (filteredDbTeams.map((teamName) => {
                            const samplePlayer = projectPlayers.find(p => p.team === teamName);
                            const logo = samplePlayer?.teamLogo;
                            const playerCount = projectPlayers.filter(p => p.team === teamName).length;
                            return (
                                <button key={teamName} onClick={() => handleLoadFromDb(isDbSelectorOpen.rankIndex, teamName)} className="w-full bg-[#151515] border border-white/5 p-5 rounded-[24px] hover:border-[#ccff00]/40 transition-all flex items-center gap-6 group text-left shadow-sm">
                                    <div className="w-14 h-14 rounded-2xl bg-[#0c0c0c] border border-white/5 flex items-center justify-center shrink-0 shadow-inner group-hover:border-[#ccff00]/20 transition-all overflow-hidden">{logo ? <img src={logo} className="w-full h-full object-contain p-1" /> : <Shield size={24} className="text-zinc-800" />}</div>
                                    <div className="flex flex-col min-w-0 flex-1"><h4 className="text-2xl font-[1000] text-white uppercase tracking-tighter leading-[0.8] mb-1 group-hover:text-[#ccff00] transition-colors truncate">{teamName}</h4><div className="flex items-center gap-2"><span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest bg-zinc-900 px-2 py-0.5 rounded">{playerCount} ROSTER</span></div></div>
                                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-700 group-hover:text-[#ccff00] group-hover:border-[#ccff00]/30 transition-all"><ArrowRight size={18} strokeWidth={3} /></div>
                                </button>
                            );
                        })) : (<div className="py-12 text-center opacity-20 border border-dashed border-white/10 rounded-[32px]"><Shield size={48} className="mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">{t('olb.noTeamsFound')}</p></div>)}
                </div>
            </div>
        </div>
      )}

      {isAutoSyncModalOpen && (
        <div className="fixed inset-0 z-[175] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-md animate-in fade-in"
            onClick={() => setIsAutoSyncModalOpen(false)}
          />
          <div className="relative w-full max-w-[560px] bg-[#0c0c0c] border border-white/10 rounded-[24px] overflow-hidden flex flex-col max-h-[620px] shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-6 py-5 flex items-start justify-between gap-4 border-b border-white/5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#ccff00] flex items-center justify-center text-black shrink-0">
                  <RefreshCw size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-[1000] italic text-white tracking-tight uppercase leading-none">
                    Sync Team dari Project
                  </h3>
                  <p className="text-[9px] font-black text-[#ccff00] tracking-[0.14em] uppercase mt-1.5">
                    Match {currentMatch} · {autoSyncSelectedTeams.length}/{availableAutoSyncTeamOptions.length} team · timpa slot &amp; reset skor
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAutoSyncModalOpen(false)}
                className="p-2 text-zinc-600 hover:text-white transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <div className="px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[8px] text-zinc-500 leading-relaxed">
                  Pilih team dari Manual Entry. Slot ranking ditimpa sesuai pilihan &amp; skor direset bersih.
                </p>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAutoSyncSelectedTeams(availableAutoSyncTeamOptions.map((option) => option.teamName))}
                    className="px-3 py-2 rounded-lg bg-[#ccff00] text-black text-[7px] font-black uppercase tracking-widest"
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoSyncSelectedTeams([])}
                    className="px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white text-[7px] font-black uppercase tracking-widest"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-4 custom-scrollbar space-y-1.5">
              {availableAutoSyncTeamOptions.map((option, index) => {
                const checked = autoSyncSelectedTeams.includes(option.teamName);
                const playerCount = option.players.length;
                return (
                  <button
                    key={option.teamName}
                    type="button"
                    onClick={() => toggleAutoSyncTeam(option.teamName)}
                    className={`w-full border px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 text-left ${
                      checked
                        ? 'bg-[#ccff00]/10 border-[#ccff00]/40'
                        : 'bg-[#151515] border-white/5 hover:border-white/15'
                    }`}
                    >
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                        checked
                          ? 'bg-[#ccff00] border-[#ccff00] text-black'
                          : 'bg-black border-white/15 text-transparent'
                      }`}
                    >
                      <Check size={12} strokeWidth={4} />
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-black border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {option.logo ? (
                        <img src={option.logo} className="w-full h-full object-contain p-1" />
                      ) : (
                        <Shield size={16} className="text-zinc-700" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-[1000] text-white uppercase tracking-tight leading-none truncate">
                        {option.teamName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-900 px-1.5 py-0.5 rounded">
                          {playerCount} Player
                        </span>
                      </div>
                    </div>
                    <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest shrink-0">
                      #{index + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="px-6 py-4 border-t border-white/10 bg-[#080808] flex items-center justify-between gap-4">
              <p className="text-[7px] text-zinc-600 uppercase tracking-widest">
                {autoSyncSelectedTeams.length} team dipilih
              </p>
              <button
                type="button"
                onClick={applyAutoSyncSelectedTeams}
                className="px-4 py-3 rounded-xl bg-[#ccff00] text-black hover:bg-white text-[8px] font-black uppercase tracking-[0.16em] transition-colors"
              >
                Sync &amp; Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(204, 255, 0, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(204, 255, 0, 0.5); }
      `}</style>
    </div>
  );
};

export default OverlayOverallRankingView;
