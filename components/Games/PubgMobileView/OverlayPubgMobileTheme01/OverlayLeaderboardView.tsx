
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { useSharedState } from '@/lib/useSharedState';
import { 
  Database, Palette, Activity, LayoutTemplate, 
  ChevronDown, Check, Settings2, Swords, Type, Move,
  Upload, Trash2, RotateCcw, ArrowRight, Minus, Plus, RefreshCw,
  Shield, X, Trophy, Skull, Zap, AlertTriangle, Target,
  Monitor, ChevronUp, AlertCircle, ShieldCheck, Info,
  ListOrdered, Flag, Search, Globe, Play, Square, Save,
  ArrowDownLeft, ArrowUpRight, Maximize2, Minimize2, Undo2, Link2, Image, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Theme, Asset, Game, PlayerData } from '../../../../types';
import PanelControlMonitor, { PreviewControlContext } from '../../../PanelControlMonitor';
import PlacementScoringModal from '../PlacementScoringModal';
import TieBreakerModal, { TieBreakerCriteria, TieBreakerConfig } from '../TieBreakerModal';
import ElimCauseModal from '../ElimCauseModal';
import KillVictimModal from '../KillVictimModal';
import KnockAttackerModal from '../KnockAttackerModal';
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
  DEFAULT_MATCH_KILL_RULES,
  type PlayerRef,
  type KillFeedEvent,
  type MatchKillRules,
  type FinishCredit,
} from '@/lib/leaderboardKillLogic';

interface Team {
  rank: number;
  team: string;
  teamAbbreviation?: string;
  country: string;
  teamLogo: string;
  status: number[];
  playerNames: string[];
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
  xOffset: 280,
  yOffset: 72,
};

import {
  AnimationConfig,
  ANIMATION_PRESETS,
  getAnimationSignature,
  getRootMotionProps,
  getChildMotionInitial,
  getChildMotionExit,
  getMotionEase,
  resolveAnimationConfig,
} from '@/constants/transitions';
import { notifyCompanionAnimation } from '@/lib/overlayAnimation';
import { notifyCompanionData } from '@/lib/overlayData';
import TeamEliminatedBanner from '../TeamEliminatedBanner';
import { FinalFourTeamCard } from '../FinalFourTeamCard';
import { useOverlayFonts } from '../useEliminationBannerFonts';
import OverlayFontFamilySelect from '../../../OverlayFontFamilySelect';
import {
  DEFAULT_OVERLAY_FONT_FAMILY_ID,
  getOverlayFontCssFamily,
  resolveOverlayFontFamilyId,
} from '@/lib/eliminationBannerFonts';
import {
  TEAM_ELIMINATION_ALERT_KEY,
  type TeamEliminationAlert,
} from '@/lib/teamEliminationAlert';
import {
  buildTopFraggersFromMatch,
  isMatchReadyForTopFraggerSync,
} from '@/lib/topFraggersSync';
import {
  applyMatchEndPlacementRanks,
  finalizeTeamAtIndex,
  getTeamsInContention,
  isTeamMatchEliminated,
  resetCurrentMatchTeamState,
  teamHasAlivePlayer,
  totalTeamKills,
} from '@/lib/matchPlacements';
import { createEventId } from '@/lib/leaderboardKillLogic';
import type {
  EliminationBannerVisual,
  EliminationBannerImageKey,
  EliminationBannerFullImageFit,
} from '@/lib/eliminationBannerVisual';
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
} from '@/lib/eliminationBannerVisual';
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
} from '@/lib/leaderboardVisual';

interface OverlayLeaderboardViewProps {
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

/** Popup ELIMINATED di baris klasemen — masuk/keluar halus (bukan putus di akhir) */
const ELIMINATED_POPUP_EASE_IN: [number, number, number, number] = [0.22, 1, 0.36, 1];
const ELIMINATED_POPUP_EASE_OUT: [number, number, number, number] = [0.33, 1, 0.68, 1];
const ELIMINATED_POPUP_HOLD_MS = 3400;

/** Endgame overlay atas: tim tersisa ≤4 (4→1), ganti klasemen kanan & banner elim */
const FINAL_FOUR_ALIVE_COUNT = 4;
const FINAL_FOUR_MIN_ALIVE_COUNT = 1;

const isEndgameTopOverlayCount = (count: number) =>
  count <= FINAL_FOUR_ALIVE_COUNT && count >= FINAL_FOUR_MIN_ALIVE_COUNT;
/** Tahan kartu terakhir (1 tim) lalu transisi keluar */
const FINAL_FOUR_SOLO_EXIT_DELAY_MS = 3200;
const FINAL_FOUR_TOP_OFFSET_PX = 56;
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
      type="number"
      value={safeValue}
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

const getLeaderboardTeamLabel = (team: Pick<Team, 'team' | 'teamAbbreviation'>, projectPlayers: PlayerData[] = []): string => {
  if (team.teamAbbreviation?.trim()) return team.teamAbbreviation.trim().toUpperCase();
  const fromDb = projectPlayers.find((p) => p.team === team.team)?.teamAbbreviation;
  if (fromDb?.trim()) return fromDb.trim().toUpperCase();
  return deriveTeamAbbreviation(team.team);
};

const resolveLeaderboardTeamLogo = (
  team: Pick<Team, 'team' | 'teamLogo'>,
  projectPlayers: PlayerData[] = []
): string => {
  const fromDb = projectPlayers.find((p) => p.team === team.team)?.teamLogo?.trim();
  return fromDb || team.teamLogo?.trim() || '';
};

const ensureTeamAbbreviation = (team: Team, projectPlayers: PlayerData[] = []): Team => {
  if (team.teamAbbreviation?.trim()) return team;
  const fromDb = projectPlayers.find((p) => p.team === team.team)?.teamAbbreviation?.trim();
  return {
    ...team,
    teamAbbreviation: (fromDb || deriveTeamAbbreviation(team.team)).toUpperCase(),
  };
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
  ...DEFAULT_ELIMINATION_BANNER_VISUAL,
};

const OverlayLeaderboardView: React.FC<OverlayLeaderboardViewProps> = ({ 
  asset, theme, availableAssets, userRole, onBack, onSelectAsset, onSelectTheme, projectPlayers = [], isGlobalStudio = false, showMonitorProp = true,
  programAssetIdProp, onProgramAssetChange, getAssetStatusProp, onPreviewContentChange, visualOnly = false, monitorFeed = false, feedPlayKey, style
}) => {
  useOverlayFonts();
  const [configTab, setConfigTab] = useState<'DATA' | 'VISUAL' | 'ANIMATION'>('DATA');
  const [visualSettingsPanel, setVisualSettingsPanel] = useState<
    'choose' | 'leaderboard' | 'elimination'
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
  const [isSaving, setIsSaving] = useState(false);

  const { replay, playKey } = React.useContext(PreviewControlContext);

  const handleSave = () => {
    setIsSaving(true);
    
    // Commit draft to shared state
    setAnimationConfig({ ...draftAnimationConfig, mode: draftAnimationConfig.mode ?? 'custom' });
    
    if (programAssetId === asset.id) {
      setProgramPlayKey((k) => k + 1);
    }
    // Briefly delay replay to allow state to propagate
    if (replay) {
      setTimeout(() => replay(), 100);
    }
    
    // Simulate save completion for feedback
    setTimeout(() => {
      setIsSaving(false);
    }, 1500);
  };

  const [activeDropdown, setActiveDropdown] = useState<{ presetId: string, type: 'in' | 'out' } | null>(null);
  const [presetOverrides, setPresetOverrides] = useSharedState<Record<string, { inType?: string, outType?: string }>>('BROHUBS_LEADERBOARD_PRESET_OVERRIDES', {});

  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    if (activeDropdown) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeDropdown]);

  const triggerPreview = () => {
    setShowOverlay(false);
    setTimeout(() => setShowOverlay(true), 1000);
  };

  const [visualConfig, setVisualConfig] = useSharedState<VisualConfig>(
    'BROHUBS_LEADERBOARD_VISUAL',
    INITIAL_VISUAL_CONFIG
  );

  const elimBannerVisual = useMemo(
    () => pickEliminationBannerVisual(visualConfig),
    [visualConfig]
  );

  const elimBannerTypography = useMemo(
    () => resolveEliminationBannerTypography(elimBannerVisual),
    [elimBannerVisual]
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
      if (!needsElimMerge && !needsLeaderboardBgMerge && !needsLeaderboardModeMerge) {
        return prev;
      }
      return { ...INITIAL_VISUAL_CONFIG, ...prev };
    });
  }, [setVisualConfig]);

  const handleElimBannerImageUpload = (
    key: EliminationBannerImageKey,
    file: File | undefined
  ) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setVisualConfig((prev) => ({ ...prev, [key]: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleLeaderboardBgImageUpload = (
    key: LeaderboardBgImageKey,
    file: File | undefined
  ) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setVisualConfig((prev) => ({ ...prev, [key]: result }));
    };
    reader.readAsDataURL(file);
  };

  const fullLayout =
    elimBannerVisual.elimBannerFullLayout ?? DEFAULT_ELIMINATION_BANNER_FULL_LAYOUT;

  const [layoutConfig, setLayoutConfig] = useSharedState<LayoutConfig>('BROHUBS_LEADERBOARD_LAYOUT', {
      scale: 80,
      xOffset: -40,
      yOffset: 75,
      rowHeight: 52,
      fontSize: 18,
      logoSize: 32,
      flagWidth: 24,
      panelWidth: leaderboardPanelWidthForFlags(true),
      fontFamilyId: DEFAULT_OVERLAY_FONT_FAMILY_ID,
  });

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
  const elimBannerLayoutRef = useRef(elimBannerLayout);
  useEffect(() => {
    elimBannerLayoutRef.current = elimBannerLayout;
  }, [elimBannerLayout]);

  const [animationConfig, setAnimationConfig] = useSharedState<AnimationConfig>('BROHUBS_LEADERBOARD_ANIMATION', {
      mode: 'default',
      presetId: 'broadcast',
      inType: 'slide-right',
      outType: 'fade',
      duration: 0.8,
      delay: 0,
      easing: 'easeOut',
      useSpring: true,
      staggerChildren: true
  });

  const [draftAnimationConfig, setDraftAnimationConfig] = useState<AnimationConfig>(animationConfig);

  // Sync draft when shared state changes (from another operator or initial load)
  useEffect(() => {
    setDraftAnimationConfig(animationConfig);
  }, [animationConfig]);

  const effectiveAnimationConfig = useMemo(
    () => resolveAnimationConfig(animationConfig, presetOverrides, ANIMATION_PRESETS),
    [animationConfig, presetOverrides]
  );

  const activeAnimConfig = useMemo(
    () =>
      visualOnly || monitorFeed
        ? effectiveAnimationConfig
        : resolveAnimationConfig(draftAnimationConfig, presetOverrides, ANIMATION_PRESETS),
    [visualOnly, monitorFeed, effectiveAnimationConfig, draftAnimationConfig, presetOverrides]
  );

  const rootMotionProps = useMemo(
    () => getRootMotionProps(activeAnimConfig),
    [activeAnimConfig]
  );

  // Push transition settings to OBS / output links (separate browser storage)
  useEffect(() => {
    if (visualOnly) return;
    notifyCompanionAnimation({
      assetId: asset.id,
      animation: effectiveAnimationConfig,
      presetOverrides,
    });
  }, [asset.id, effectiveAnimationConfig, presetOverrides, visualOnly]);

  const [showOverlay, setShowOverlay] = useState(true);
  const [internalProgramAssetId, setInternalProgramAssetId] = useState<string | null>(null);
  const [programPlayKey, setProgramPlayKey] = useState(0);
  
  const programAssetId = programAssetIdProp !== undefined ? programAssetIdProp : internalProgramAssetId;
  const setProgramAssetId = (id: string | null) => {
    if (id) setProgramPlayKey((k) => k + 1);
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
        const teamPlayers = projectPlayers.filter(p => p.team === team.team);
        if (teamPlayers.length === 0) return team;
        
        const newNames = [
            teamPlayers[0]?.name || team.playerNames[0] || 'P1',
            teamPlayers[1]?.name || team.playerNames[1] || 'P2',
            teamPlayers[2]?.name || team.playerNames[2] || 'P3',
            teamPlayers[3]?.name || team.playerNames[3] || 'P4'
        ];

        const newLogo = teamPlayers[0].teamLogo || team.teamLogo;
        const newCountry = teamPlayers[0].country || team.country;
        const newAbbreviation = (
          teamPlayers[0].teamAbbreviation?.trim() || deriveTeamAbbreviation(team.team)
        ).toUpperCase();
        
        // Only update if difference exists
        if (team.teamLogo === newLogo && 
            team.country === newCountry &&
            team.teamAbbreviation === newAbbreviation &&
            JSON.stringify(team.playerNames) === JSON.stringify(newNames)
        ) return team;

        needsSync = true;
        return {
            ...team,
            teamLogo: newLogo,
            country: newCountry,
            teamAbbreviation: newAbbreviation,
            playerNames: newNames
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
          withAbbr.playerFinishCredit?.length === 4
            ? withAbbr
            : { ...withAbbr, playerFinishCredit: [null, null, null, null] };
        if (withFinish.playerKnockCredit?.length === 4) return withFinish;
        return { ...withFinish, playerKnockCredit: [null, null, null, null] };
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

  /** Fase endgame (≤4 tim): sembunyikan klasemen kanan & banner elim */
  const isEndgamePhase = isEndgameTopOverlayCount(survivingMatchCount);
  /** Bar WWCD atas — saat 1 tim: tahan 3,2s lalu transisi keluar */
  const showFinalFourTopBar = isEndgamePhase && finalFourTopBarVisible;

  useEffect(() => {
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
      }, FINAL_FOUR_SOLO_EXIT_DELAY_MS);
      return;
    }

    setFinalFourTopBarVisible(true);
  }, [isEndgamePhase, survivingMatchCount]);
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
      notifyCompanionData({
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
      const dbPlayers = projectPlayers.filter((p) => p.team === withAbbr.team);
      const dbPlayer = dbPlayers[0];

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
    notifyCompanionData({
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
          notifyCompanionData({
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
          const current =
            picked.elimBannerFullLayout ?? DEFAULT_ELIMINATION_BANNER_FULL_LAYOUT;
          const nextSection = { ...current[section], ...patch };
          const nextLayout = { ...current, [section]: nextSection };
          const typo = {
            ...DEFAULT_ELIMINATION_BANNER_TYPOGRAPHY,
            ...picked.elimBannerTypography,
          };
          if (section === 'placement' && patch.fontSize !== undefined) {
            typo.placement = patch.fontSize;
          }
          if (section === 'teamName' && patch.fontSize !== undefined) {
            typo.tag = patch.fontSize;
          }
          const typoChanged =
            (section === 'placement' && patch.fontSize !== undefined) ||
            (section === 'teamName' && patch.fontSize !== undefined);
          return {
            ...picked,
            elimBannerFullLayout: nextLayout,
            ...(typoChanged ? { elimBannerTypography: typo } : {}),
          };
        });
        return;
      }
      setVisualConfig((prev) => {
        const current = prev.elimBannerFullLayout ?? DEFAULT_ELIMINATION_BANNER_FULL_LAYOUT;
        const nextSection = { ...current[section], ...patch };
        const nextLayout = { ...current, [section]: nextSection };
        const typo = {
          ...DEFAULT_ELIMINATION_BANNER_TYPOGRAPHY,
          ...prev.elimBannerTypography,
        };
        if (section === 'placement' && patch.fontSize !== undefined) {
          typo.placement = patch.fontSize;
        }
        if (section === 'teamName' && patch.fontSize !== undefined) {
          typo.tag = patch.fontSize;
        }
        const typoChanged =
          (section === 'placement' && patch.fontSize !== undefined) ||
          (section === 'teamName' && patch.fontSize !== undefined);
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

    const assignedCount = swept.filter((t) => t.placementRank !== null).length;
    setNextPlacementRank(16 - assignedCount);
    return cloneLeaderboardTeams(swept);
  };

  const pushCompanionTeamsNow = useCallback(
    (teamsSnapshot: Team[]) => {
      if (visualOnly) return;
      notifyCompanionData({
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

  const [fraggers, setFraggers] = useSharedState('BROHUBS_TOPFRAGGERS_DATA', [
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
    if (visualOnly || elimBannerHoldPreview) return;
    const timer = setTimeout(() => {
      notifyCompanionData({
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
    matchKillRulesByMatch,
    fraggers,
    visualOnly,
    elimBannerHoldPreview,
    projectPlayers,
  ]);

  // Preview Sementara: sync layout/visual setelah scroll berhenti (tidak saat wheel aktif)
  useEffect(() => {
    if (visualOnly || !elimBannerHoldPreview || elimBannerTuningActive) return;
    const stagedAlert =
      frozenStagedElimAlert ??
      (eliminationAlert?.id === STAGED_ELIM_PREVIEW_ALERT_ID ? eliminationAlert : null) ??
      STAGED_ELIM_PREVIEW_FALLBACK;
    const timer = setTimeout(() => {
      notifyCompanionData({
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
          playerKills: [0, 0, 0, 0],
          playerFinishCredit: [null, null, null, null],
          playerKnockCredit: [null, null, null, null],
          status: [1, 1, 1, 1],
          placementRank: null
        })));
        setCurrentMatch(1);
        setNextPlacementRank(16);
        setActivePopups([]);
        setKillEventLog([]);
        setEliminationAlert(null);
        seenEliminationsRef.current.clear();
        eliminationQueueRef.current = [];
        eliminationShowingRef.current = false;
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
            playerKills: [0, 0, 0, 0],
            playerFinishCredit: [null, null, null, null],
            playerKnockCredit: [null, null, null, null],
            status: [1, 1, 1, 1],
            placementRank: null,
        };
    });

    setTeams(updatedTeams);
    setCurrentMatch(targetMatch);
    setNextPlacementRank(16);
    setActivePopups([]);
    setKillEventLog([]);
    setEliminationAlert(null);
    seenEliminationsRef.current.clear();
    eliminationQueueRef.current = [];
    eliminationShowingRef.current = false;
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
        const reader = new FileReader();
        reader.onloadend = () => {
            updateTeamField(index, 'teamLogo', reader.result as string);
        };
        reader.readAsDataURL(file);
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

  const handleLoadFromDb = (rankIndex: number, teamName: string) => {
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
    setTeams(newTeams);
    setIsDbSelectorOpen(null);
  };

  const handleAutoSyncAllTeams = () => {
    if (!window.confirm("Apakah Anda ingin memperbarui semua nama tim, pemain, dan logo dari database proyek?")) return;
    
    const newTeams = teams.map(team => {
        const teamPlayers = projectPlayers.filter(p => p.team === team.team);
        if (teamPlayers.length === 0) return team;
        
        return {
            ...team,
            teamLogo: teamPlayers[0].teamLogo || team.teamLogo,
            country: teamPlayers[0].country || team.country,
            teamAbbreviation: (
              teamPlayers[0].teamAbbreviation?.trim() || deriveTeamAbbreviation(team.team)
            ).toUpperCase(),
            playerNames: [
                teamPlayers[0]?.name || team.playerNames[0] || 'P1',
                teamPlayers[1]?.name || team.playerNames[1] || 'P2',
                teamPlayers[2]?.name || team.playerNames[2] || 'P3',
                teamPlayers[3]?.name || team.playerNames[3] || 'P4'
            ]
        };
    });
    setTeams(newTeams);
    alert("Semua tim telah disinkronisasi dengan database!");
  };

  const uniqueTeamsInDb = Array.from(new Set(projectPlayers.map(p => p.team))).sort();
  const filteredDbTeams = uniqueTeamsInDb.filter(t => t.toLowerCase().includes(dbSearch.toLowerCase()));

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

  const rowVariants = useMemo(() => ({
    initial: { x: 20, opacity: 0 },
    animate: (custom: any) => {
      let delay = 1; // 1 second delay after header
      if (custom && custom.stagger) {
        const staggerDelay = custom.delay || 0.05;
        if (custom.direction === 'center-out') {
          const center = Math.floor(custom.total / 2);
          delay += Math.abs(custom.index - center) * staggerDelay;
        } else if (custom.direction === 'bottom-up') {
          delay += (custom.total - 1 - custom.index) * staggerDelay;
        } else {
          delay += custom.index * staggerDelay;
        }
      }
      return { 
        x: 0, 
        opacity: 1,
        transition: { delay, duration: 0.4 }
      };
    },
    exit: { x: 20, opacity: 0 }
  }), []);

  const bottomBoxVariants = useMemo(() => ({
    initial: { y: 20, opacity: 0 },
    animate: (custom: any) => {
      let delay = 1; // 1 second delay after header
      if (custom && custom.stagger) {
        const staggerDelay = custom.delay || 0.05;
        let maxTeamDelay = 0;
        if (custom.direction === 'center-out') {
          const center = Math.floor(custom.total / 2);
          maxTeamDelay = Math.max(center, custom.total - 1 - center) * staggerDelay;
        } else {
          maxTeamDelay = (custom.total - 1) * staggerDelay;
        }
        delay += maxTeamDelay + 0.3; // 0.3s after the last team
      } else {
        delay += 0.3;
      }
      return { 
        y: 0, 
        opacity: 1,
        transition: { delay, duration: 0.5 }
      };
    },
    exit: { y: 20, opacity: 0 }
  }), []);

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
              <div
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
                      <span className="w-8 text-center shrink-0">Rank</span>
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
                          <span className="whitespace-nowrap leading-none">Team</span>
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
                        Status
                      </span>
                      <span
                        className="text-right inline-flex items-center justify-end shrink-0"
                        style={{
                          width: LEADERBOARD_ELIMS_PTS_WIDTH_PX,
                          transition: LEADERBOARD_ELIMS_LAYOUT_TRANSITION,
                        }}
                      >
                        Pts
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
                        <span className="text-center whitespace-nowrap">Elims</span>
                      </div>
                    </div>
                 </div>
              </div>

              <div 
                className="shadow-2xl relative transition-[height] duration-300 ease-out shrink-0" 
                style={{ height: `${sortedPreviewTeams.length * layoutConfig.rowHeight}px` }}
              >
                 {sortedPreviewTeams.map((t, idx) => {
                    const isTeamEliminated = isTeamMatchEliminated(t);
                    const showPopup = activePopups.includes(t.rank);
                    const isWinner =
                      t.placementRank === 1 ||
                      (contentionCount === 1 && teamHasAlivePlayer(t));
                    const currentKills = t.playerKills.reduce((a, b) => a + b, 0);
                    const liveKillPoints = currentKills * killPointValue;
                    const displayedPts = t.points + liveKillPoints;

                    return (
                    <motion.div 
                      key={t.rank}
                      custom={{
                        index: idx,
                        total: sortedPreviewTeams.length,
                        direction: effectiveAnimationConfig.staggerDirection || 'top-down',
                        delay: effectiveAnimationConfig.staggerDelay || 0.05,
                        stagger: effectiveAnimationConfig.staggerChildren
                      }}
                      variants={rowVariants}
                      className="absolute top-0 left-0 w-full flex items-center justify-between px-6 border-b border-white/5 overflow-hidden"
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
                          height: `${layoutConfig.rowHeight}px`,
                          transform: `translateY(${idx * layoutConfig.rowHeight}px)`,
                          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.6s ease', 
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
                                  ELIMINATED
                              </motion.span>
                          </motion.div>
                       )}

                       <AnimatePresence>
                         {showPopup && (
                           <motion.div
                             key={`elim-popup-${t.rank}`}
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
                               ELIMINATED
                             </motion.div>
                           </motion.div>
                         )}
                       </AnimatePresence>
                       
                       {isWinner && (
                           <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none overflow-hidden">
                               <div className="bg-black/90 text-[#ccff00] font-[900] text-3xl uppercase tracking-[0.2em] px-8 py-1 border-y-2 border-[#ccff00] shadow-xl animate-pulse">
                                   WWCD
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
                                visualConfig.showFlags && t.country
                                  ? `${layoutConfig.flagWidth}px`
                                  : 0,
                              opacity: visualConfig.showFlags && t.country ? 1 : 0,
                              transform:
                                visualConfig.showFlags && t.country
                                  ? 'scale(1)'
                                  : 'scale(0.92)',
                              transition: LEADERBOARD_FLAG_LAYOUT_TRANSITION,
                            }}
                            className="shrink-0 flex items-center justify-center shadow-sm overflow-hidden"
                            aria-hidden={!visualConfig.showFlags || !t.country}
                          >
                            {t.country ? (
                              <img
                                src={`https://flagcdn.com/w80/${t.country.toLowerCase()}.png`}
                                alt={t.country}
                                className="w-full h-auto rounded-[2px]"
                              />
                            ) : null}
                          </div>

                          <div style={{ width: `${layoutConfig.logoSize}px`, height: `${layoutConfig.logoSize}px` }} className="shrink-0 flex items-center justify-center overflow-hidden">
                            {t.teamLogo ? <img src={t.teamLogo} className="w-full h-full object-contain" /> : <Shield size={layoutConfig.logoSize - 8} className="opacity-20 text-black" />}
                          </div>
                          <div className="flex flex-col justify-center min-w-0">
                              <span className="font-[900] uppercase leading-none mt-0.5 whitespace-nowrap" style={{ fontSize: `${layoutConfig.fontSize}px`, color: isWinner ? visualConfig.winnerText : visualConfig.teamNameColor }}>{getLeaderboardTeamLabel(t, projectPlayers)}</span>
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
                                {t.status.map((s, i) => (
                                  <div key={i} className="w-3.5 h-7 rounded-full border shadow-sm transition-colors flex items-center justify-center" style={{ backgroundColor: getStatusColor(s), borderColor: `${visualConfig.statusBorder}20` }}>
                                      <span className="text-[5px] font-black opacity-50 mix-blend-overlay" style={{ color: visualConfig.statusText }}>{t.playerNames[i]?.charAt(0)}</span>
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
                className="rounded-b-xl px-6 py-4 flex justify-center gap-8 shadow-2xl mt-0.5 border-t-2 border-black/10 relative z-20 shrink-0" 
                style={resolveLeaderboardSurfaceStyle(
                  visualConfig.headerBg,
                  visualConfig.headerBgImage,
                  visualConfig
                )}
              >
                 <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: visualConfig.statusAlive }} />
                    <span className="text-[11px] font-[900] uppercase tracking-widest drop-shadow-sm" style={{ color: visualConfig.headerText }}>ALIVE</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: visualConfig.statusKnock }} />
                    <span className="text-[11px] font-[900] uppercase tracking-widest drop-shadow-sm" style={{ color: visualConfig.headerText }}>KNOCK</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: visualConfig.statusDead }} />
                    <span className="text-[11px] font-[900] uppercase tracking-widest drop-shadow-sm" style={{ color: visualConfig.headerText }}>ELIMINATED</span>
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
    rowVariants,
    bottomBoxVariants,
    projectPlayers,
    contentionCount,
  ]);

  const finalFourOverlayPanel = useMemo(() => {
    if (!showOverlay || !isEndgamePhase || finalFourTeamsData.length === 0) {
      return null;
    }

    return (
      <div
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-[400] px-10"
        style={{
          top: `${FINAL_FOUR_TOP_OFFSET_PX}px`,
          fontFamily: leaderboardFontFamily,
        }}
      >
        <div
          className="flex flex-row items-stretch justify-center gap-5 w-full max-w-[1680px]"
          style={{ scale: layoutConfig.scale / 100, transformOrigin: 'top center' }}
        >
          <AnimatePresence mode="popLayout">
            {finalFourTeamsData.map((entry, idx) => (
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
                <FinalFourTeamCard entry={entry} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }, [
    showOverlay,
    isEndgamePhase,
    finalFourTeamsData,
    layoutConfig,
    visualConfig,
    leaderboardFontFamily,
  ]);

  const elimBannerPreviewNode = useMemo(
    () => (
      <div
        className="absolute z-[500] pointer-events-none"
        style={elimBannerPositionStyle}
      >
        <TeamEliminatedBanner
          alert={displayElimAlert}
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
    ]
  );

  const renderLivePreview = useCallback((overrideAnimKey?: number) => {
    const resolvedAnimKey = overrideAnimKey ?? feedPlayKey ?? playKey;
    return (
      <motion.div
        key={`leaderboard-asset-${resolvedAnimKey}-${getAnimationSignature(activeAnimConfig)}`}
        initial={rootMotionProps.initial}
        animate={rootMotionProps.animate}
        exit={rootMotionProps.exit}
        transition={rootMotionProps.transition}
        style={style}
        className={`w-[1920px] h-[1080px] bg-transparent relative overflow-hidden font-sans select-none ${style?.position === 'absolute' ? '' : 'mx-auto'}`}
      >
        {!visualOnly && !monitorFeed && (
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'conic-gradient(#0a0a0a 90deg, #050505 90deg 180deg, #0a0a0a 180deg 270deg, #050505 270deg)',
              backgroundSize: '40px 40px',
            }}
          />
        )}

        {showEliminationBanner && elimBannerPreviewNode}

        <AnimatePresence>
          {showOverlay && !isEndgamePhase && leaderboardOverlayPanel && (
            <motion.div
              key="overall-ranking-panel"
              className="absolute inset-0 pointer-events-none z-[350]"
              initial={getChildMotionInitial(activeAnimConfig, 120)}
              animate={{ x: 0, y: 0, opacity: 1 }}
              exit={{
                ...getChildMotionExit(activeAnimConfig, 120),
                transition: {
                  duration: activeAnimConfig.duration * 0.8,
                  ease: getMotionEase(activeAnimConfig),
                },
              }}
              transition={{
                duration: activeAnimConfig.duration,
                delay: activeAnimConfig.delay,
                ease: getMotionEase(activeAnimConfig),
              }}
            >
              {leaderboardOverlayPanel}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showOverlay && showFinalFourTopBar && (
            <motion.div
              key="final-four-bar"
              className="absolute inset-0 pointer-events-none z-[400]"
              initial={getChildMotionInitial(activeAnimConfig, 120)}
              animate={{
                x: 0,
                y: 0,
                opacity: 1,
                transition: {
                  duration: activeAnimConfig.duration,
                  delay: activeAnimConfig.delay + 0.08,
                  ease: getMotionEase(activeAnimConfig),
                },
              }}
              exit={{
                ...getChildMotionExit(activeAnimConfig, 120),
                transition: {
                  duration: activeAnimConfig.duration * 0.75,
                  ease: getMotionEase(activeAnimConfig),
                },
              }}
            >
              {finalFourOverlayPanel}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }, [
    activeAnimConfig,
    rootMotionProps,
    style,
    visualOnly,
    monitorFeed,
    elimBannerPreviewNode,
    leaderboardOverlayPanel,
    finalFourOverlayPanel,
    showOverlay,
    isEndgamePhase,
    showFinalFourTopBar,
    showEliminationBanner,
    feedPlayKey,
    playKey,
  ]);

  const livePreviewContent = useMemo(() => renderLivePreview(), [renderLivePreview]);
  const programFeedContent = useMemo(
    () => renderLivePreview(programPlayKey),
    [renderLivePreview, programPlayKey]
  );

  // Sync preview content to parent
  useEffect(() => {
    if (onPreviewContentChange && !visualOnly) {
      onPreviewContentChange(livePreviewContent);
    }
  }, [livePreviewContent, onPreviewContentChange, visualOnly]);

  if (visualOnly) {
    return renderLivePreview(feedPlayKey);
  }

  return (
    <div className="flex flex-col h-full bg-black animate-in fade-in duration-300 font-sans select-none overflow-hidden rounded-tl-[10px] border-l border-t border-white/5">
      {!isGlobalStudio && (
      <header className="h-auto md:h-14 bg-black border-b border-white/10 flex flex-col md:flex-row items-center px-6 py-4 md:py-0 justify-between shrink-0 relative z-[100] gap-4">
        <div className="flex items-center gap-4 md:gap-8 justify-between w-full md:w-auto">
            <div className="flex flex-col cursor-pointer" onClick={onBack}>
                <div className="flex items-center gap-1">
                    <span className="text-white font-[950] italic text-[12px] tracking-tight uppercase leading-none">SETUP</span>
                    <span className="text-[#ccff00] font-[950] italic text-[12px] tracking-tight uppercase leading-none">ASSET</span>
                </div>
                <span className="text-[7px] font-black text-zinc-700 tracking-[0.4em] uppercase mt-0.5 leading-none">MASTER CONFIGURATION</span>
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
              <h3 className="text-[7px] font-black text-zinc-700 tracking-[0.3em] uppercase mb-6 whitespace-nowrap italic">AVAILABLE TEMPLATES</h3>
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
                        {['DATA', 'VISUAL', 'ANIMATION'].map(tab => (
                          <button
                            key={tab}
                            onClick={() => {
                              setConfigTab(tab as 'DATA' | 'VISUAL' | 'ANIMATION');
                              if (tab === 'VISUAL') setVisualSettingsPanel('choose');
                            }}
                            className={`flex-1 py-1.5 text-[8px] font-black tracking-widest uppercase rounded-lg transition-all ${configTab === tab ? 'bg-[#ccff00] text-black' : 'text-zinc-600 hover:text-white'}`}
                          >
                            {tab} INPUT
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
                                        <h3 className="text-[8px] font-black text-zinc-500 tracking-[0.2em] uppercase">HEADER TITLE</h3>
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
                                        <h3 className="text-[8px] font-black text-zinc-500 tracking-[0.2em] uppercase">MATCH SEQUENCE</h3>
                                    </div>
                                    <div className="flex items-center bg-black/40 border border-white/5 rounded-xl p-0.5 w-full h-10">
                                        <button onClick={() => contentionCount <= 1 && setCurrentMatch(Math.max(1, currentMatch - 1))} className={`w-8 h-full flex items-center justify-center transition-all ${contentionCount > 1 ? 'text-zinc-800 cursor-not-allowed opacity-50' : 'text-zinc-600 hover:text-white'}`}><Minus size={14} /></button>
                                        <div className="flex-1 flex flex-col items-center justify-center border-x border-white/5 h-full">
                                            <span className="text-[5px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-0.5">GAME</span>
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
                                        <ArrowRight size={14} strokeWidth={3} /><span>END MATCH</span>
                                    </button>
                                </div>

                                {/* SCORING & TIE-BREAKER */}
                                <div className="flex flex-col gap-2 flex-1 min-w-[150px] h-24">
                                    <button onClick={() => setIsScoringModalOpen(true)} className="h-11 bg-[#2563eb] hover:bg-[#3b82f6] text-white rounded-xl font-black text-[9px] tracking-[0.2em] uppercase shadow-[0_0_15px_rgba(37,99,235,0.15)] flex items-center justify-center gap-2.5 transition-all active:scale-95">
                                        <Trophy size={14} /> SCORING
                                    </button>
                                    <button onClick={() => setIsTieBreakerModalOpen(true)} className="h-11 bg-[#1a1c0e] border border-[#ccff00]/20 hover:border-[#ccff00]/50 text-[#ccff00] rounded-xl font-black text-[9px] tracking-[0.2em] uppercase flex items-center justify-center gap-2.5 transition-all active:scale-95">
                                        <ListOrdered size={14} /> TIE-BREAKER
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleUndoLastKill}
                                      title="Batalkan 1 aksi terakhir di seluruh match (semua tim)"
                                      className="h-11 bg-zinc-900 border border-white/10 hover:border-orange-500/40 text-zinc-400 hover:text-orange-400 rounded-xl font-black text-[9px] tracking-[0.2em] uppercase flex items-center justify-center gap-2 transition-all active:scale-95"
                                    >
                                        <Undo2 size={14} /> UNDO LAST
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
                                      RESET MATCH
                                    </span>
                                    <span className="text-[7px] font-bold text-zinc-600 group-hover:text-amber-500/80 uppercase">
                                      M{currentMatch}
                                    </span>
                                  </button>
                                )}
                                {/* RESET ALL */}
                                <button onClick={handleResetAll} className="bg-[#1a1a1d] hover:bg-red-600/10 border border-white/5 hover:border-red-500/30 text-zinc-500 hover:text-red-500 rounded-[20px] p-3 flex flex-col items-center justify-center gap-2 flex-1 min-w-[110px] h-24 transition-all active:scale-95 group shadow-xl">
                                    <RotateCcw size={16} className="group-hover:rotate-[-45deg] transition-transform" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">RESET ALL</span>
                                </button>
                                <button onClick={handleAutoSyncAllTeams} className="bg-[#1a1a1d] hover:bg-[#ccff00]/10 border border-white/5 hover:border-[#ccff00]/30 text-zinc-500 hover:text-[#ccff00] rounded-[20px] p-3 flex flex-col items-center justify-center gap-2 flex-1 min-w-[110px] h-24 transition-all active:scale-95 group shadow-xl">
                                    <RefreshCw size={16} />
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">AUTO SYNC</span>
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
                                        TEAM IDENTITY (SLOT 1-16)
                                        <button 
                                            onClick={toggleLeaderboardFlags}
                                            className={`ml-4 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 ${visualConfig.showFlags ? 'bg-[#ccff00]/10 border-[#ccff00]/30 text-[#ccff00] hover:bg-[#ccff00]/20' : 'bg-zinc-800 border-white/5 text-zinc-600 hover:text-zinc-400'}`}
                                            title={visualConfig.showFlags ? "Hide Country Flags" : "Show Country Flags"}
                                        >
                                            <Flag size={8} /> {visualConfig.showFlags ? 'FLAGS ON' : 'FLAGS OFF'}
                                        </button>
                                    </div>
                                    <div className="col-span-4 text-[9px] font-black text-[#64748b] tracking-widest uppercase text-right pr-4">POINTS / ACTION</div>
                                </div>

                                <div className="space-y-1">
                                    {teams.map((t, idx) => (
                                        <div key={idx} className={`bg-[#1e2030] border border-black/40 rounded-lg hover:border-[#ccff00]/30 transition-all group overflow-hidden ${t.expanded ? 'bg-[#15171e]' : ''}`}>
                                            <div className={`grid grid-cols-12 gap-4 p-2 transition-all ${t.expanded ? 'items-start pt-4 pb-4' : 'items-center'}`}>
                                                <div className={`flex items-center gap-3 transition-all ${t.expanded ? 'col-span-4 items-start' : 'col-span-8'}`}>
                                                    <div className="flex flex-col items-center gap-1 min-w-[40px] shrink-0">
                                                        <span className="text-[#64748b] text-[10px] font-black">#{t.rank}</span>
                                                        <div onClick={() => toggleRowActive(idx)} className={`w-8 h-4 rounded-full border border-white/10 relative cursor-pointer transition-colors ${t.active ? 'bg-[#ccff00]' : 'bg-black'}`}>
                                                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-md transition-all ${t.active ? 'left-4' : 'left-0.5'}`} />
                                                        </div>
                                                    </div>
                                                    <div className="w-[1px] h-8 bg-white/5 shrink-0" />
                                                    
                                                    {/* UPDATED COUNTRY SELECTOR TRIGGER */}
                                                    {visualConfig.showFlags && (
                                                        <div className="flex flex-col items-center shrink-0 animate-in fade-in zoom-in duration-300">
                                                            <span className="text-[6px] font-black text-zinc-500 uppercase mb-1">NAT</span>
                                                            <button 
                                                              onClick={() => setIsCountryModalOpen({ rankIndex: idx })}
                                                              className="w-10 h-7 bg-black/40 border border-white/10 rounded overflow-hidden flex items-center justify-center hover:border-[#ccff00]/50 transition-all group/flag"
                                                            >
                                                                {t.country ? (
                                                                    <img src={`https://flagcdn.com/w40/${t.country.toLowerCase()}.png`} className="w-full h-full object-cover" alt={t.country} />
                                                                ) : (
                                                                    <Globe size={14} className="text-zinc-700 group-hover/flag:text-[#ccff00]" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className="relative group/logo w-10 h-10 rounded-lg bg-black border border-white/10 flex items-center justify-center shrink-0 cursor-pointer overflow-hidden hover:border-[#ccff00]/50 transition-all">
                                                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-20" onChange={(e) => handleTeamLogoUpload(e, idx)} />
                                                        {t.teamLogo ? <img src={t.teamLogo} className="w-full h-full object-contain p-1" /> : <Shield size={14} className="text-zinc-700" />}
                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity z-10 pointer-events-none"><Upload size={12} className="text-[#ccff00]" /></div>
                                                    </div>
                                                    <button onClick={() => openDbModal(idx)} className="w-6 h-6 rounded bg-[#ccff00]/10 border border-[#ccff00]/20 flex items-center justify-center text-[#ccff00] hover:bg-[#ccff00] hover:text-black transition-all shrink-0" title="Ganti Tim dari Database"><Database size={10} /></button>
                                                    <div className="flex flex-col gap-1 w-full min-w-0">
                                                        <input type="text" value={t.team} onChange={(e) => updateTeamField(idx, 'team', e.target.value)} className="w-full bg-transparent border-b border-transparent focus:border-[#ccff00] text-xs font-black text-white uppercase outline-none placeholder:text-zinc-600 truncate" />
                                                        <input type="text" value={t.teamAbbreviation || ''} onChange={(e) => updateTeamField(idx, 'teamAbbreviation', e.target.value.toUpperCase())} placeholder="SINGKATAN" className="w-full bg-transparent border-b border-transparent focus:border-[#ccff00] text-[9px] font-black text-[#ccff00] uppercase outline-none placeholder:text-zinc-600 truncate" />
                                                        <div className="flex items-center gap-2">
                                                            <span className="inline-flex items-center w-fit px-1.5 py-0.5 bg-[#F97316] text-black text-[8px] font-black rounded-sm uppercase tracking-tighter">K: {t.playerKills.reduce((a,b)=>a+b,0)}</span>
                                                            {t.totalWwcds > 0 && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#ccff00] text-black text-[8px] font-black rounded-sm uppercase tracking-tighter"><Trophy size={8}/> {t.totalWwcds}</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className={`transition-all duration-300 ${t.expanded ? 'col-span-6 opacity-100' : 'hidden opacity-0'}`}>
                                                    {t.expanded && (
                                                        <div className="bg-black/20 rounded-xl p-2 border border-white/5 animate-in fade-in slide-in-from-left-2">
                                                            <div className="grid grid-cols-4 gap-2">
                                                                {t.playerNames.map((name, pIdx) => {
                                                                    const currentStatus = t.status[pIdx];
                                                                    const currentKills = t.playerKills[pIdx] || 0;
                                                                    const canManualAddKill = currentStatus === 1;
                                                                    const placementLocked = t.placementRank !== null;
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

                                                <div className={`flex justify-end gap-3 pr-2 transition-all ${t.expanded ? 'col-span-2 items-start' : 'col-span-4 items-center'}`}>
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <div className="flex items-center bg-[#0f1115] rounded-md border border-white/5 px-2 py-1 shadow-inner h-fit">
                                                            <div className="w-12 text-center">
                                                                <input type="number" value={t.points} onChange={(e) => { const newTeams = [...teams]; newTeams[idx].points = parseInt(e.target.value) || 0; setTeams(newTeams); }} className="w-full bg-transparent text-center text-sm font-black text-white outline-none" />
                                                                <span className="text-[6px] font-bold text-zinc-600 uppercase block leading-none">PTS</span>
                                                            </div>
                                                        </div>
                                                        {t.placementRank !== null && (
                                                            <span className="inline-flex items-center w-fit px-1.5 py-0.5 bg-red-600 text-white text-[7px] font-black rounded-sm uppercase tracking-tighter animate-in zoom-in duration-300 whitespace-nowrap">
                                                                PLACED: #{t.placementRank}
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
                                                    <button onClick={() => toggleRowExpanded(idx)} className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${t.expanded ? 'bg-[#ccff00] text-black' : 'bg-black/20 text-zinc-500 hover:text-white'}`}>
                                                        {t.expanded ? <ChevronUp size={14} /> : <Settings2 size={14} />}
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
                                  Overall Ranking dan Elimination Banner dipisah agar lebih mudah diatur.
                                </p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                        <label className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">FLAGS</label>
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
                                   <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2"><Move size={12} className="text-zinc-400" />LAYOUT TRANSFORM (LEADERBOARD)</h3>
                                   <button 
                                       onClick={() => setLayoutConfig({
                                           scale: 80,
                                           xOffset: -40,
                                           yOffset: 75,
                                           rowHeight: 52,
                                           fontSize: 18,
                                           logoSize: 32,
                                           flagWidth: 24,
                                           panelWidth: leaderboardPanelWidthForFlags(visualConfig.showFlags),
                                           fontFamilyId: DEFAULT_OVERLAY_FONT_FAMILY_ID,
                                       })}
                                       className="text-[7px] font-black text-zinc-600 hover:text-[#ccff00] uppercase tracking-widest flex items-center gap-1 transition-colors"
                                   >
                                       <RotateCcw size={10} /> RESET POSITION
                                   </button>
                                </div>
                                <p className="text-[7px] text-zinc-500 normal-case mb-3 leading-relaxed">
                                  Lebar panel otomatis: 380 px tanpa flag, 450 px dengan flag (bisa disesuaikan manual).
                                </p>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">PANEL WIDTH (px)</label><ScrollableInput value={leaderboardPanelWidth} onChange={(val) => setLayoutConfig({...layoutConfig, panelWidth: resolveLeaderboardPanelWidth(val)})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">SCALE (%)</label><ScrollableInput value={layoutConfig.scale} onChange={(val) => setLayoutConfig({...layoutConfig, scale: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">ROW HEIGHT</label><ScrollableInput value={layoutConfig.rowHeight} onChange={(val) => setLayoutConfig({...layoutConfig, rowHeight: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    {visualConfig.showFlags && (
                                        <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                                            <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">FLAG WIDTH</label>
                                            <ScrollableInput value={layoutConfig.flagWidth} onChange={(val) => setLayoutConfig({...layoutConfig, flagWidth: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" />
                                        </div>
                                    )}
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">POS X</label><ScrollableInput value={layoutConfig.xOffset} onChange={(val) => setLayoutConfig({...layoutConfig, xOffset: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">POS Y</label><ScrollableInput value={layoutConfig.yOffset} onChange={(val) => setLayoutConfig({...layoutConfig, yOffset: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">LOGO SIZE</label><ScrollableInput value={layoutConfig.logoSize} onChange={(val) => setLayoutConfig({...layoutConfig, logoSize: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
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
                                   <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2"><Skull size={12} className="text-red-500" />ELIMINATION BANNER</h3>
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
                                       <Play size={10} /> PREVIEW
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
                                       <RotateCcw size={10} /> RESET
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
                                  1920×1080 · POS X positif = kanan · bukan LAYOUT TRANSFORM leaderboard di atas.
                                  {elimBannerHoldPreview ? (
                                    <span className="block mt-1 text-[#ccff00] uppercase tracking-wide">
                                      Preview aktif — perubahan langsung ke Monitor Preview / Program &amp; Link Output. Scroll di kolom angka (Shift = ±10) atau klik lalu ketik. Nilai tersimpan otomatis saat kursor keluar dari kolom.
                                    </span>
                                  ) : (
                                    <span className="block mt-1 text-zinc-500 normal-case">
                                      Perubahan SCALE / POS X / POS Y tersimpan otomatis ke pengaturan project saat selesai mengedit kolom angka.
                                    </span>
                                  )}
                                </p>
                                <div className="grid grid-cols-3 gap-3">
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">SCALE banner (%)</label><ElimBannerLayoutInput {...elimBannerPreviewInputProps} value={effectiveElimBannerLayout.scale} onChange={(val) => patchElimBannerLayout({ scale: val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">POS X banner</label><ElimBannerLayoutInput {...elimBannerPreviewInputProps} value={effectiveElimBannerLayout.xOffset} onChange={(val) => patchElimBannerLayout({ xOffset: val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">POS Y banner</label><ElimBannerLayoutInput {...elimBannerPreviewInputProps} value={effectiveElimBannerLayout.yOffset} onChange={(val) => patchElimBannerLayout({ yOffset: val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
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
                                        Lihat hasil di Monitor Preview / Program atau tab Link Output
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
                                          value={elimBannerTypography[fontKey]}
                                          onChange={(val) =>
                                            patchElimBannerTypography(fontKey, val)
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
                                              Perubahan langsung ke asset di monitor &amp; Link Output — scroll (Shift = ±10) atau ketik. Nilai tersimpan otomatis saat kursor keluar dari kolom.
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
                                  <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Palette size={12} className="text-red-400" />
                                    {visualConfig.elimBannerDesignMode === 'full'
                                      ? 'BANNER TEXT'
                                      : 'BANNER BACKGROUND & TEXT'}
                                  </h4>
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
                                              setVisualConfig((prev) => ({
                                                ...prev,
                                                [key]: DEFAULT_ELIMINATION_BANNER_VISUAL[key],
                                              }));
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
                                            setVisualConfig({ ...visualConfig, [key]: e.target.value })
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
                        </div>
                    )}

                    {configTab === 'ANIMATION' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* MODE SELECTOR */}
                            <div className="p-2 bg-zinc-900 border border-white/5 rounded-[24px] flex gap-2">
                                <button 
                                    onClick={() => setAnimationConfig({
                                        ...animationConfig, 
                                        mode: 'default',
                                        presetId: ANIMATION_PRESETS[0].id,
                                        ...ANIMATION_PRESETS[0].config
                                    })}
                                    className={`flex-1 py-4 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${animationConfig.mode === 'default' ? 'bg-[#ccff00] text-black shadow-lg shadow-[#ccff00]/20' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    <Zap size={14} fill={animationConfig.mode === 'default' ? "currentColor" : "none"} />
                                    DEFAULT PRESET
                                </button>
                                <button 
                                    onClick={() => setAnimationConfig({...animationConfig, mode: 'custom'})}
                                    className={`flex-1 py-4 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${animationConfig.mode === 'custom' ? 'bg-white text-black shadow-lg shadow-white/20' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    <Settings2 size={14} />
                                    CUSTOM CONFIG
                                </button>
                            </div>

                            {animationConfig.mode === 'custom' ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* IN ANIMATION */}
                                <div className="p-6 bg-zinc-950 border border-white/5 rounded-[32px] shadow-xl">
                                    <h4 className="text-[10px] font-black text-[#ccff00] uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                        <ArrowDownLeft size={14} /> IN TRANSITION
                                    </h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['fade', 'slide-right', 'slide-left', 'slide-up', 'slide-down'].map((type) => (
                                            <button 
                                                key={type}
                                                onClick={() => setDraftAnimationConfig({...draftAnimationConfig, inType: type as any})}
                                                className={`py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${draftAnimationConfig.inType === type ? 'bg-[#ccff00] text-black border-[#ccff00]' : 'bg-black border-white/5 text-zinc-600 hover:text-white hover:border-white/20'}`}
                                            >
                                                {type.replace('-', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* OUT ANIMATION */}
                                <div className="p-6 bg-zinc-950 border border-white/5 rounded-[32px] shadow-xl">
                                    <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                        <ArrowUpRight size={14} /> OUT TRANSITION
                                    </h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['fade', 'slide-right', 'slide-left', 'slide-up', 'slide-down'].map((type) => (
                                            <button 
                                                key={type}
                                                onClick={() => setDraftAnimationConfig({...draftAnimationConfig, outType: type as any})}
                                                className={`py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${draftAnimationConfig.outType === type ? 'bg-red-500 text-white border-red-500' : 'bg-black border-white/5 text-zinc-600 hover:text-white hover:border-white/20'}`}
                                            >
                                                {type.replace('-', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-zinc-900 border border-white/5 rounded-[32px] shadow-xl">
                                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                    <Settings2 size={14} /> TIMING CONFIGURATION
                                </h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-3">DURATION (SEC)</label>
                                        <div className="flex items-center gap-4 bg-black/40 border border-white/5 rounded-2xl p-2">
                                            <button onClick={() => setDraftAnimationConfig({...draftAnimationConfig, duration: Math.max(0.1, draftAnimationConfig.duration - 0.1)})} className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-white"><Minus size={16} /></button>
                                            <div className="flex-1 text-center font-black text-white text-lg">{draftAnimationConfig.duration.toFixed(1)}s</div>
                                            <button onClick={() => setDraftAnimationConfig({...draftAnimationConfig, duration: draftAnimationConfig.duration + 0.1})} className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-white"><Plus size={16} /></button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-3">DELAY (SEC)</label>
                                        <div className="flex items-center gap-4 bg-black/40 border border-white/5 rounded-2xl p-2">
                                            <button onClick={() => setDraftAnimationConfig({...draftAnimationConfig, delay: Math.max(0, draftAnimationConfig.delay - 0.1)})} className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-white"><Minus size={16} /></button>
                                            <div className="flex-1 text-center font-black text-white text-lg">{draftAnimationConfig.delay.toFixed(1)}s</div>
                                            <button onClick={() => setDraftAnimationConfig({...draftAnimationConfig, delay: draftAnimationConfig.delay + 0.1})} className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:text-white"><Plus size={16} /></button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-white/5">
                                    <div>
                                        <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-3">EASING FUNCTION</label>
                                        <select 
                                            value={draftAnimationConfig.easing}
                                            onChange={(e) => setDraftAnimationConfig({...draftAnimationConfig, easing: e.target.value as any})}
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl p-3 text-[10px] font-black text-white outline-none focus:border-[#ccff00]/30 transition-all uppercase tracking-widest"
                                        >
                                            <option value="linear">Linear</option>
                                            <option value="easeIn">Ease In</option>
                                            <option value="easeOut">Ease Out</option>
                                            <option value="easeInOut">Ease In Out</option>
                                            <option value="backOut">Back Out (Overshoot)</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-3">SPRING PHYSICS</label>
                                        <button 
                                            onClick={() => setDraftAnimationConfig({...draftAnimationConfig, useSpring: !draftAnimationConfig.useSpring})}
                                            className={`w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-3 ${draftAnimationConfig.useSpring ? 'bg-[#ccff00] text-black border-[#ccff00]' : 'bg-black border-white/5 text-zinc-600'}`}
                                        >
                                            <Zap size={14} fill={draftAnimationConfig.useSpring ? "currentColor" : "none"} />
                                            {draftAnimationConfig.useSpring ? 'SPRING ON' : 'SPRING OFF'}
                                        </button>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-3">STAGGER ROWS</label>
                                        <button 
                                            onClick={() => setDraftAnimationConfig({...draftAnimationConfig, staggerChildren: !draftAnimationConfig.staggerChildren})}
                                            className={`w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-3 ${draftAnimationConfig.staggerChildren ? 'bg-[#ccff00] text-black border-[#ccff00]' : 'bg-black border-white/5 text-zinc-600'}`}
                                        >
                                            <ListOrdered size={14} />
                                            {draftAnimationConfig.staggerChildren ? 'STAGGER ON' : 'STAGGER OFF'}
                                        </button>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-3">STAGGER DIRECTION</label>
                                        <select 
                                            value={draftAnimationConfig.staggerDirection || 'top-down'}
                                            onChange={(e) => setDraftAnimationConfig({...draftAnimationConfig, staggerDirection: e.target.value as any})}
                                            disabled={!draftAnimationConfig.staggerChildren}
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl p-3 text-[10px] font-black text-white outline-none focus:border-[#ccff00]/30 transition-all uppercase tracking-widest disabled:opacity-50"
                                        >
                                            <option value="top-down">Top to Bottom</option>
                                            <option value="bottom-up">Bottom to Top</option>
                                            <option value="center-out">Center Out</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {ANIMATION_PRESETS.map((basePreset) => {
                                            const presetConfig = { ...basePreset.config, ...presetOverrides[basePreset.id] };
                                            const preset = { ...basePreset, config: presetConfig };
                                            return (
                                            <div
                                                key={preset.id}
                                                onClick={() => {
                                                    setAnimationConfig({
                                                        ...animationConfig,
                                                        mode: 'default',
                                                        presetId: preset.id,
                                                        ...preset.config
                                                    } as AnimationConfig);
                                                    triggerPreview();
                                                }}
                                                className={`p-6 rounded-[32px] border text-left transition-all group relative overflow-hidden cursor-pointer ${animationConfig.presetId === preset.id ? 'bg-[#ccff00] border-[#ccff00] shadow-xl shadow-[#ccff00]/20' : 'bg-zinc-900/50 border-white/5 hover:border-white/20'}`}
                                            >
                                                <div className="relative z-10">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${animationConfig.presetId === preset.id ? 'bg-black/10 text-black' : 'bg-[#ccff00]/10 text-[#ccff00]'}`}>
                                                        <Zap size={20} fill="currentColor" />
                                                    </div>
                                                    <h4 className={`text-sm font-black uppercase tracking-widest mb-1 ${animationConfig.presetId === preset.id ? 'text-black' : 'text-white'}`}>{preset.name}</h4>
                                                    <p className={`text-[10px] font-bold leading-relaxed ${animationConfig.presetId === preset.id ? 'text-black/60' : 'text-zinc-500'}`}>{preset.description}</p>
                                                    
                                                    <div className="flex gap-2 mt-4">
                                                        <div className="relative">
                                                            <div 
                                                                onClick={(e) => {
                                                                    if (userRole === 'admin') {
                                                                        e.stopPropagation();
                                                                        setActiveDropdown(activeDropdown?.presetId === preset.id && activeDropdown?.type === 'in' ? null : { presetId: preset.id, type: 'in' });
                                                                    }
                                                                }}
                                                                className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ${userRole === 'admin' ? 'cursor-pointer hover:ring-1 hover:ring-current' : ''} ${animationConfig.presetId === preset.id ? 'bg-black/10 text-black' : 'bg-black/40 text-zinc-400'}`}
                                                                title={userRole === 'admin' ? "Click to change In-Transition" : ""}
                                                            >
                                                                <span className="opacity-50">IN:</span>
                                                                {(animationConfig.presetId === preset.id ? animationConfig.inType : preset.config.inType).replace('-', ' ')}
                                                                {userRole === 'admin' && <ChevronDown size={8} />}
                                                            </div>
                                                            
                                                            {activeDropdown?.presetId === preset.id && activeDropdown?.type === 'in' && (
                                                                <div className="absolute bottom-full left-0 mb-2 w-32 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[100] py-2 animate-in fade-in zoom-in duration-200">
                                                                    {['fade', 'slide-right', 'slide-left', 'slide-up', 'slide-down'].map((type) => (
                                                                        <button
                                                                            key={type}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const newOverrides = {
                                                                                    ...presetOverrides,
                                                                                    [preset.id]: { ...presetOverrides[preset.id], inType: type }
                                                                                };
                                                                                setPresetOverrides(newOverrides);
                                                                                localStorage.setItem('BROHUBS_LEADERBOARD_PRESET_OVERRIDES', JSON.stringify(newOverrides));

                                                                                const newConfig = {
                                                                                    ...animationConfig,
                                                                                    mode: 'default' as const,
                                                                                    presetId: preset.id,
                                                                                    ...(animationConfig.presetId === preset.id ? {} : preset.config),
                                                                                    inType: type as any
                                                                                } as AnimationConfig;
                                                                                setAnimationConfig(newConfig);
                                                                                localStorage.setItem('BROHUBS_LEADERBOARD_ANIMATION', JSON.stringify(newConfig));
                                                                                setActiveDropdown(null);
                                                                                triggerPreview();
                                                                            }}
                                                                            className={`w-full px-4 py-2 text-left text-[8px] font-black uppercase tracking-widest hover:bg-[#ccff00] hover:text-black transition-colors ${(animationConfig.presetId === preset.id ? animationConfig.inType : preset.config.inType) === type ? 'text-[#ccff00]' : 'text-zinc-400'}`}
                                                                        >
                                                                            {type.replace('-', ' ')}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="relative">
                                                            <div 
                                                                onClick={(e) => {
                                                                    if (userRole === 'admin') {
                                                                        e.stopPropagation();
                                                                        setActiveDropdown(activeDropdown?.presetId === preset.id && activeDropdown?.type === 'out' ? null : { presetId: preset.id, type: 'out' });
                                                                    }
                                                                }}
                                                                className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ${userRole === 'admin' ? 'cursor-pointer hover:ring-1 hover:ring-current' : ''} ${animationConfig.presetId === preset.id ? 'bg-black/10 text-black' : 'bg-black/40 text-zinc-400'}`}
                                                                title={userRole === 'admin' ? "Click to change Out-Transition" : ""}
                                                            >
                                                                <span className="opacity-50">OUT:</span>
                                                                {(animationConfig.presetId === preset.id ? animationConfig.outType : preset.config.outType).replace('-', ' ')}
                                                                {userRole === 'admin' && <ChevronDown size={8} />}
                                                            </div>

                                                            {activeDropdown?.presetId === preset.id && activeDropdown?.type === 'out' && (
                                                                <div className="absolute bottom-full left-0 mb-2 w-32 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[100] py-2 animate-in fade-in zoom-in duration-200">
                                                                    {['fade', 'slide-right', 'slide-left', 'slide-up', 'slide-down'].map((type) => (
                                                                        <button
                                                                            key={type}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const newOverrides = {
                                                                                    ...presetOverrides,
                                                                                    [preset.id]: { ...presetOverrides[preset.id], outType: type }
                                                                                };
                                                                                setPresetOverrides(newOverrides);
                                                                                localStorage.setItem('BROHUBS_LEADERBOARD_PRESET_OVERRIDES', JSON.stringify(newOverrides));

                                                                                const newConfig = {
                                                                                    ...animationConfig,
                                                                                    mode: 'default' as const,
                                                                                    presetId: preset.id,
                                                                                    ...(animationConfig.presetId === preset.id ? {} : preset.config),
                                                                                    outType: type as any
                                                                                } as AnimationConfig;
                                                                                setAnimationConfig(newConfig);
                                                                                localStorage.setItem('BROHUBS_LEADERBOARD_ANIMATION', JSON.stringify(newConfig));
                                                                                setActiveDropdown(null);
                                                                                triggerPreview();
                                                                            }}
                                                                            className={`w-full px-4 py-2 text-left text-[8px] font-black uppercase tracking-widest hover:bg-[#ccff00] hover:text-black transition-colors ${(animationConfig.presetId === preset.id ? animationConfig.outType : preset.config.outType) === type ? 'text-[#ccff00]' : 'text-zinc-400'}`}
                                                                        >
                                                                            {type.replace('-', ' ')}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {animationConfig.presetId === preset.id && (
                                                    <div className="absolute top-4 right-4 text-black">
                                                        <Check size={20} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>
                                        )})}
                                    </div>
                                    
                                    <div className="flex justify-center mt-6">
                                        <button 
                                            onClick={() => setAnimationConfig({...animationConfig, mode: 'custom'})}
                                            className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] hover:text-[#ccff00] transition-colors"
                                        >
                                            Need more control? Switch to Custom Configuration
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* PREVIEW TOGGLE */}
                            <div className="flex flex-col items-center justify-center pt-8 gap-4">
                                <button 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className={`px-12 py-5 rounded-[24px] font-black text-xs tracking-[0.3em] uppercase flex items-center gap-4 transition-all active:scale-95 shadow-2xl ${isSaving ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-[#ccff00] text-black hover:bg-white hover:scale-[1.02] shadow-[#ccff00]/20'}`}
                                >
                                    {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Settings2 size={18} />}
                                    {isSaving ? 'UPDATING BROADCAST NODE...' : 'SAVE ANIMATION PROTOCOL'}
                                </button>
                                
                                <p className="text-[9px] font-black text-zinc-700 tracking-[0.4em] uppercase italic opacity-50">Transmitting configuration to global master node</p>
                            </div>
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
                programAssetId === asset.id ? programFeedContent : (
                  programAssetId ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white">
                      <h2 className="text-4xl font-black text-[#ccff00] mb-4">ASSET PLAYING</h2>
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
                        {!isMatchReadyToEnd ? 'SECURITY ALERT' : 'FINALIZE GAME'}
                    </h2>
                    <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${!isMatchReadyToEnd ? 'text-red-500' : 'text-[#ccff00]'}`}>
                        {!isMatchReadyToEnd
                          ? 'MATCH STILL ONGOING'
                          : contentionCount === 2
                            ? 'FINAL TOP 2 — PLACEMENT BY KILLS'
                            : 'WINNER IDENTIFIED'}
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
                                        <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">DETECTED WINNER</p>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight truncate">{matchWinnerCandidate ? getLeaderboardTeamLabel(matchWinnerCandidate, projectPlayers) : ''}</h3>
                                    </div>
                                </div>
                                {contentionCount === 2 && matchRunnerUp && (
                                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center justify-between gap-3">
                                    <div className="min-w-0 text-left">
                                      <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">#2 BY KILLS</p>
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
                            CANCEL
                        </button>
                        <button 
                            onClick={confirmEndMatchExecution}
                            disabled={!isMatchReadyToEnd}
                            className={`py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl ${!isMatchReadyToEnd ? 'bg-zinc-800 text-zinc-700 cursor-not-allowed opacity-50' : 'bg-[#ccff00] text-black shadow-[0_0_30px_rgba(204,255,0,0.3)] hover:scale-105'}`}
                        >
                            {isMatchReadyToEnd ? 'CONFIRM END' : 'RESTRICTED'}
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
                        <h3 className="text-sm font-[1000] italic text-white uppercase tracking-tighter">SELECT NATIONALITY</h3>
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
                            placeholder="SEARCH COUNTRY NAME..."
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
                            <p className="text-[10px] font-black uppercase tracking-widest">NO MATCH FOUND</p>
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
                        <div className="flex flex-col"><h3 className="text-xl font-[1000] italic text-white tracking-tighter uppercase leading-none">TEAM DATABASE</h3><p className="text-[10px] font-black text-[#ccff00] tracking-[0.3em] uppercase mt-2">ASSIGNING TO SLOT #{isDbSelectorOpen.rankIndex + 1}</p></div>
                    </div>
                    <button onClick={() => setIsDbSelectorOpen(null)} className="p-2 text-zinc-600 hover:text-white transition-colors"><X size={22} /></button>
                </div>
                <div className="px-8 py-6"><div className="relative group"><input type="text" value={dbSearch} onChange={(e) => setDbSearch(e.target.value)} placeholder="SEARCH TEAM NAME" className="w-full bg-[#111] border border-white/5 rounded-2xl py-5 pl-8 pr-12 text-xs font-[1000] text-zinc-500 placeholder:text-zinc-800 outline-none focus:border-[#ccff00]/30 focus:text-white transition-all uppercase tracking-widest shadow-inner" /></div></div>
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
                        })) : (<div className="py-12 text-center opacity-20 border border-dashed border-white/10 rounded-[32px]"><Shield size={48} className="mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-widest">NO TEAMS FOUND</p></div>)}
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

export default OverlayLeaderboardView;
