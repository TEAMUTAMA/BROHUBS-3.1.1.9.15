
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSharedState } from '@/lib/useSharedState';
import {
  Database, Play, Square, Settings2, Type, Move, RefreshCw, Shield, ChevronLeft,
  Trash2, Plus, X, ChevronDown, ChevronRight, User, Sparkles, Zap,
  ArrowDownLeft, ArrowUpRight, Minus, ListOrdered,
} from 'lucide-react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { Theme, Asset, Game, PlayerData } from '../../../../types';
import PanelControlMonitor, { PreviewControlContext } from '../../../PanelControlMonitor';
import {
  ANIMATION_PRESETS,
  AnimationConfig,
  PresetOverride,
  getAnimationSignature,
  getRootMotionProps,
  resolveAnimationConfig,
  getRosterDefaultMaxWave,
  resolveExitStaggerDelay,
  resolveRosterRevealDelay,
  resolveStaggerDelay,
  ROSTER_DEFAULT_WAVE_GAP_SEC,
} from '@/constants/transitions';
import { notifyCompanionAnimation } from '@/lib/overlayAnimation';
import { notifyCompanionData } from '@/lib/overlayData';
import { useOverlayFonts } from '../useEliminationBannerFonts';
import OverlayFontFamilySelect from '../../../OverlayFontFamilySelect';
import {
  DEFAULT_OVERLAY_FONT_FAMILY_ID,
  getOverlayFontCssFamily,
  resolveOverlayFontFamilyId,
} from '@/lib/eliminationBannerFonts';
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
  DEFAULT_ROSTER_PLAYER_IMG,
  getPaddedPlayerSlots,
  getRosterFilledCount,
  resolveCaptainIndex,
  type RosterTeam,
  type RosterPlayerEntry,
  type RosterSponsorEntry,
} from '@/lib/teamRosterSync';
import { loadProjectPlayers } from '@/lib/projectPlayers';
import { resolveProjectScopeFromLocation } from '@/lib/outputRoute';
import {
  cutCornerClipPath,
  DEFAULT_PMGO_ROSTER_PALETTE,
  pickPmgoRosterPalette,
  hexToRgba,
  rosterFrameClipPath,
  type TeamRosterVisualPalette,
} from '@/lib/teamRosterVisual';

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
  contentOffsetX: number;
  contentOffsetY: number;
  frameCornerCut: number;
  showHudEffects: boolean;
};

type RosterAnimCustom = { index: number; total: number; isCaptain?: boolean };

const buildRosterPlayerVariants = (config: AnimationConfig): Variants => ({
  initial: { y: 72, opacity: 0, scale: 0.9 },
  animate: (custom: RosterAnimCustom) => {
    const delay = resolveStaggerDelay(custom.index, custom.total, config, 0.15);
    const captainBoost =
      config.staggerDirection === 'roster-default' ? 0 : custom.isCaptain ? 0.04 : 0;
    return {
      y: 0,
      opacity: 1,
      scale: 1,
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
  exit: (custom: RosterAnimCustom) => ({
    y: 48,
    opacity: 0,
    scale: 0.92,
    transition: {
      delay: resolveExitStaggerDelay(custom.index, custom.total, config),
      duration: config.duration * 0.65,
      ease: 'easeIn',
    },
  }),
});

/** Geser header keluar frame 1920×1080 */
const ROSTER_HEADER_SLIDE_OFFSET = 1100;

/** Judul kiri (TEAM ROSTERS): IN dari kiri → kanan, OUT sebaliknya */
const buildRosterHeaderTitleVariants = (config: AnimationConfig): Variants => ({
  initial: { x: -ROSTER_HEADER_SLIDE_OFFSET, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      delay: config.delay + 0.08,
      duration: config.duration * 0.65,
      ease: config.easing === 'backOut' ? [0.34, 1.3, 0.64, 1] : config.easing,
    },
  },
  exit: {
    x: -ROSTER_HEADER_SLIDE_OFFSET,
    opacity: 0,
    transition: { duration: config.duration * 0.5, ease: 'easeIn' },
  },
});

/** Subtitle kanan (Round robin…): IN dari kanan → kiri, OUT sebaliknya */
const buildRosterHeaderSubtitleVariants = (config: AnimationConfig): Variants => ({
  initial: { x: ROSTER_HEADER_SLIDE_OFFSET, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      delay: config.delay + 0.08,
      duration: config.duration * 0.65,
      ease: config.easing === 'backOut' ? [0.34, 1.3, 0.64, 1] : config.easing,
    },
  },
  exit: {
    x: ROSTER_HEADER_SLIDE_OFFSET,
    opacity: 0,
    transition: { duration: config.duration * 0.5, ease: 'easeIn' },
  },
});

const buildRosterSectionVariants = (
  config: AnimationConfig,
  phase: 'team' | 'footer',
  filledCount = 5
): Variants => {
  const waveGap = config.staggerDelay ?? ROSTER_DEFAULT_WAVE_GAP_SEC;
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
    team: config.delay + 0.15,
    footer: rosterLastWaveDelay,
  };
  const initialY = phase === 'footer' ? 24 : -28;
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
}) => {
  const scale = isCaptain ? layout.captainScale / 100 : 1;
  const frameClip = rosterFrameClipPath(layout.frameCornerCut);
  const glowAlpha = isCaptain ? 0.55 : 0.32;
  const photoScale = (layout.playerPhotoScale ?? 100) / 100;

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

        {/* Frame layer — gradient PMGO: headerBg → rowEven → panel dark */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            clipPath: frameClip,
            background: `linear-gradient(165deg, ${hexToRgba(colors.frameGlow, 0.92)} 0%, ${hexToRgba(colors.frameBgMid, 0.22)} 38%, ${hexToRgba(colors.frameBgBottom, 0.88)} 100%)`,
            border: `2px solid ${hexToRgba(colors.frameGlow, isCaptain ? 0.9 : 0.55)}`,
            boxShadow: `inset 0 0 24px ${hexToRgba(colors.frameGlow, 0.14)}, inset 0 -16px 32px ${hexToRgba(colors.frameBgBottom, 0.45)}`,
          }}
        />
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

        {/* Photo layer */}
        <div className="absolute inset-x-3 top-6 bottom-14 overflow-hidden flex items-end justify-center">
          {teamLogo && (
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
              className="relative z-10 w-auto max-w-full object-contain object-bottom"
              style={{
                height: '100%',
                transform: `scale(${photoScale})`,
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
          className="absolute bottom-12 left-2 w-5 h-5 border-b-2 border-l-2 pointer-events-none"
          style={{ borderColor: hexToRgba(colors.frameGlow, 0.5) }}
        />
        <div
          className="absolute bottom-12 right-2 w-5 h-5 border-b-2 border-r-2 pointer-events-none"
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
  globalLogo,
  projectPlayers = [],
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
}) => {
  useOverlayFonts();
  const [configTab, setConfigTab] = useState<'DATA' | 'VISUAL' | 'ANIMATION'>('DATA');
  const [showMonitors, setShowMonitors] = useState(true);
  const [showList, setShowList] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(224);
  const [isResizing, setIsResizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null);

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
    showHudEffects: true,
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

  const [cardLayout, setCardLayout] = useSharedState('BROHUBS_TEAMROSTER_LAYOUT', {
    slotWidth: 280,
    slotHeight: 400,
    slotGap: 20,
    captainScale: 118,
    logoSize: 140,
    playerPhotoScale: 100,
    contentOffsetX: 0,
    contentOffsetY: 0,
    frameCornerCut: 18,
    showHudEffects: true,
  });

  const [animationConfig, setAnimationConfig] = useSharedState<AnimationConfig>(
    'BROHUBS_TEAMROSTER_ANIMATION',
    {
      mode: 'default',
      presetId: 'roster-reveal',
      inType: 'slide-up',
      outType: 'slide-down',
      duration: 0.75,
      delay: 0.1,
      easing: 'easeOut',
      useSpring: false,
      staggerChildren: true,
      staggerDirection: 'roster-default',
      staggerDelay: 2,
    }
  );
  const [presetOverrides, setPresetOverrides] = useSharedState<Record<string, PresetOverride>>(
    'BROHUBS_TEAMROSTER_PRESET_OVERRIDES',
    {}
  );
  const [draftAnimationConfig, setDraftAnimationConfig] = useState<AnimationConfig>(animationConfig);

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
    () => resolveAnimationConfig(animationConfig, presetOverrides, ANIMATION_PRESETS),
    [animationConfig, presetOverrides]
  );

  const { pageTeams, totalPages, safePage } = useMemo(
    () => paginateRosterTeams(rosterTeams, pagination.currentPage, pagination.teamsPerPage),
    [rosterTeams, pagination.currentPage, pagination.teamsPerPage]
  );

  const activeTeam = pageTeams[0] ?? null;

  const rosterPlayerVariants = useMemo(
    () => buildRosterPlayerVariants(effectiveAnimationConfig),
    [effectiveAnimationConfig]
  );

  const rosterFilledCountForAnim = useMemo(
    () => (activeTeam ? getRosterFilledCount(activeTeam.players) : 5),
    [activeTeam]
  );

  /** Header timing only — arah slide kiri/kanan tetap, tidak ikut inType/outType global */
  const rosterHeaderAnimTiming = useMemo(
    () =>
      ({
        delay: effectiveAnimationConfig.delay,
        duration: effectiveAnimationConfig.duration,
        easing: effectiveAnimationConfig.easing,
      }) as AnimationConfig,
    [effectiveAnimationConfig.delay, effectiveAnimationConfig.duration, effectiveAnimationConfig.easing]
  );

  const rosterHeaderTitleVariants = useMemo(
    () => buildRosterHeaderTitleVariants(rosterHeaderAnimTiming),
    [rosterHeaderAnimTiming]
  );

  const rosterHeaderSubtitleVariants = useMemo(
    () => buildRosterHeaderSubtitleVariants(rosterHeaderAnimTiming),
    [rosterHeaderAnimTiming]
  );

  const rosterTeamVariants = useMemo(
    () => buildRosterSectionVariants(effectiveAnimationConfig, 'team', rosterFilledCountForAnim),
    [effectiveAnimationConfig, rosterFilledCountForAnim]
  );

  const rosterFooterVariants = useMemo(
    () => buildRosterSectionVariants(effectiveAnimationConfig, 'footer', rosterFilledCountForAnim),
    [effectiveAnimationConfig, rosterFilledCountForAnim]
  );

  const rosterFontFamily = useMemo(
    () =>
      getOverlayFontCssFamily(
        resolveOverlayFontFamilyId(
          (typography as { fontFamilyId?: string }).fontFamilyId ?? typography.title?.font
        )
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
    (next: RosterTeam[]) => setRosterTeams(normalizeRosterTeams(next)),
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

  /** Auto-load roster dari Project Event DB saat project players tersedia */
  useEffect(() => {
    if (!effectiveProjectPlayers.length) return;
    const built = rosterTeamsFromProjectDb(effectiveProjectPlayers, teamsRef.current);
    if (built.length) commitRosterTeams(built);
  }, [effectiveProjectPlayers, commitRosterTeams]);

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
      const merged = normalizeRosterTeams(mergeLeaderboardRanksIntoRoster(prev, teams));
      const unchanged =
        merged.length === prev.length &&
        merged.every(
          (t, i) =>
            t.leaderboardRank === prev[i]?.leaderboardRank &&
            t.teamLogo === prev[i]?.teamLogo &&
            t.name === prev[i]?.name
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

  useEffect(() => {
    if (visualOnly) return;
    notifyCompanionAnimation({
      assetId: asset.id,
      animation: effectiveAnimationConfig,
      presetOverrides,
    });
  }, [asset.id, effectiveAnimationConfig, presetOverrides, visualOnly]);

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
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [asset.id, rosterTeams, matchInfo, visualConfig, typography, cardLayout, pagination, visualOnly]);

  const activeAnimConfig = useMemo(
    () =>
      visualOnly || monitorFeed
        ? effectiveAnimationConfig
        : resolveAnimationConfig(draftAnimationConfig, presetOverrides, ANIMATION_PRESETS),
    [visualOnly, monitorFeed, effectiveAnimationConfig, draftAnimationConfig, presetOverrides]
  );

  const rootMotionProps = useMemo(() => {
    const base = getRootMotionProps(activeAnimConfig);
    const isRosterDefault =
      activeAnimConfig.staggerDirection === 'roster-default' &&
      activeAnimConfig.staggerChildren;
    const waveGap = activeAnimConfig.staggerDelay ?? ROSTER_DEFAULT_WAVE_GAP_SEC;
    const rosterExitHold =
      isRosterDefault
        ? activeAnimConfig.delay +
          0.15 +
          getRosterDefaultMaxWave(rosterFilledCountForAnim) * waveGap +
          activeAnimConfig.duration * 0.65
        : 0;
    return {
      ...base,
      exit: {
        ...base.exit,
        scale: activeAnimConfig.outType === 'fade' ? 0.94 : 1.02,
        transition: {
          ...(typeof base.exit?.transition === 'object' ? base.exit.transition : {}),
          duration: Math.max(activeAnimConfig.duration, rosterExitHold, 0.85),
          ease: 'backIn',
        },
      },
    };
  }, [activeAnimConfig, rosterFilledCountForAnim]);

  const usePmgoTeamColors = visualConfig.usePmgoTeamColors !== false;
  const showHudEffects =
    visualConfig.showHudEffects !== false && cardLayout.showHudEffects !== false;
  const showSponsors = visualConfig.showSponsors !== false;
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

  const renderLivePreview = useCallback((overrideAnimKey?: number) => {
    const resolvedAnimKey = overrideAnimKey ?? feedPlayKey ?? playKey;
    const team = activeTeam;
    const playerSlots = team ? getPaddedPlayerSlots(team.players) : [];
    const filledCount = team ? getRosterFilledCount(team.players) : 5;
    const captainIdx = team ? resolveCaptainIndex(team) : 2;
    const rosterTypography = typography as RosterTypography;
    const rosterLayout = cardLayout as RosterLayout;

    return (
      <div
        key={`roster-asset-${resolvedAnimKey}-${getAnimationSignature(activeAnimConfig)}`}
        style={style}
        className={`w-[1920px] h-[1080px] bg-transparent relative overflow-hidden ${
          style?.position === 'absolute' ? '' : 'mx-auto'
        }`}
      >
        <RosterSceneBackdrop colors={resolvedGlobalColors} showHud={showHudEffects} />

        {globalLogo && (
          <div className="absolute top-10 left-10 z-40">
            <img src={globalLogo} alt="Global Logo" className="h-20 w-auto object-contain drop-shadow-2xl" />
          </div>
        )}

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
              variants={rosterHeaderTitleVariants}
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
              variants={rosterHeaderSubtitleVariants}
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
                  className="px-6 py-2 transform -skew-x-12 shadow-lg"
                  style={{
                    backgroundColor: resolvedGlobalColors.cardHeaderBg,
                    boxShadow: `0 8px 28px ${hexToRgba(resolvedGlobalColors.frameGlow, 0.35)}`,
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
                    backgroundColor: hexToRgba(resolvedGlobalColors.frameBgBottom, 0.65),
                    clipPath: cutCornerClipPath(6),
                  }}
                >
                  TEAM {safePage} / {totalPages}
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            className="flex flex-col items-center flex-1 w-full min-h-0"
            initial={rootMotionProps.initial}
            animate={rootMotionProps.animate}
            exit={rootMotionProps.exit}
            transition={rootMotionProps.transition}
          >
          <AnimatePresence mode="wait">
          {team ? (
            <motion.div
              key={`roster-page-${safePage}-${team.id}`}
              className="flex flex-col items-center flex-1 w-full"
            >
              {/* Logo + team name — center top */}
              <motion.div
                variants={rosterTeamVariants}
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
                  <div
                    className="absolute inset-2 rounded-full pointer-events-none"
                    style={{
                      background: `radial-gradient(circle, ${hexToRgba(resolvedGlobalColors.frameGlow, 0.12)} 0%, transparent 70%)`,
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
                  <RosterPlayerSlot
                    key={`${team.id}-slot-${pIdx}`}
                    player={player}
                    isCaptain={pIdx === captainIdx}
                    isEmpty={player.name === '—'}
                    teamLogo={team.teamLogo}
                    colors={resolvedGlobalColors}
                    typography={rosterTypography}
                    layout={rosterLayout}
                    fontFamily={rosterFontFamily}
                    variants={rosterPlayerVariants}
                    animCustom={{
                      index: pIdx,
                      total: filledCount,
                      isCaptain: pIdx === captainIdx,
                    }}
                    skipMotion={false}
                  />
                  );
                })}
              </div>

              {/* Footer — hashtag + sponsors */}
              <motion.div
                variants={rosterFooterVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full flex flex-col items-center pb-10 relative z-20 shrink-0 gap-4"
              >
                {(team.hashtag || `#${team.name.replace(/\s+/g, '')}`) && (
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
                    {team.hashtag || `#${team.name.replace(/\s+/g, '')}`}
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
              <span className="uppercase text-2xl font-black tracking-widest text-white">No Team Data</span>
            </div>
          )}
          </AnimatePresence>
          </motion.div>
          </div>
        </div>
      </div>
    );
  }, [
    feedPlayKey,
    playKey,
    style,
    globalLogo,
    rootMotionProps,
    activeAnimConfig,
    cardLayout,
    rosterFontFamily,
    resolvedGlobalColors,
    typography,
    matchInfo,
    activeTeam,
    safePage,
    totalPages,
    showHudEffects,
    showSponsors,
    sponsors,
    rosterHeaderTitleVariants,
    rosterHeaderSubtitleVariants,
    rosterTeamVariants,
    rosterPlayerVariants,
    rosterFooterVariants,
  ]);

  const livePreviewContent = useMemo(() => renderLivePreview(), [renderLivePreview]);
  const programFeedContent = useMemo(
    () => renderLivePreview(programPlayKey),
    [renderLivePreview, programPlayKey]
  );

  useEffect(() => {
    if (onPreviewContentChange && !visualOnly) {
      onPreviewContentChange(livePreviewContent);
    }
  }, [livePreviewContent, onPreviewContentChange, visualOnly]);

  if (visualOnly) return renderLivePreview(feedPlayKey);

  return (
    <div className="flex flex-col h-full bg-black animate-in fade-in duration-300 font-sans select-none overflow-hidden rounded-tl-[10px] border-l border-t border-white/5">
      {!isGlobalStudio && (
        <header className="h-14 bg-black border-b border-white/10 flex items-center px-6 justify-between shrink-0 relative z-[100]">
          <div className="flex items-center gap-8">
            <div className="flex flex-col cursor-pointer" onClick={onBack}>
              <div className="flex items-center gap-1">
                <span className="text-white font-[950] italic text-[12px] tracking-tight uppercase leading-none">SETUP</span>
                <span className="text-[#ccff00] font-[950] italic text-[12px] tracking-tight uppercase leading-none">ASSET</span>
              </div>
              <span className="text-[7px] font-black text-zinc-700 tracking-[0.4em] uppercase mt-0.5 leading-none">MASTER CONFIGURATION</span>
            </div>
            <div className="h-6 w-[1px] bg-white/10 mx-1" />
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ccff00] animate-pulse shadow-[0_0_8px_#ccff00]" />
              <span className="text-white font-black text-[10px] tracking-[0.2em] uppercase italic">{theme.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
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
              {isSaving ? 'STREAMS SYNCING...' : 'SAVE ALL CHANGES'}
            </button>
            <div className="bg-zinc-900/40 border border-white/5 px-2.5 py-1.5 rounded flex items-center gap-2">
              <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">EDITING:</span>
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
                AVAILABLE TEMPLATES
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
                    {tab} INPUT
                  </button>
                ))}
              </div>

              {configTab === 'DATA' && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-zinc-900 border border-white/5 rounded-[20px] p-6 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Type size={14} className="text-[#ccff00]" />
                        <h3 className="text-[10px] font-black text-zinc-400 tracking-[0.2em] uppercase">MAIN TITLE</h3>
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
                        <h3 className="text-[10px] font-black text-zinc-400 tracking-[0.2em] uppercase">SUBTITLE</h3>
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
                          REFRESH PROJECT DB
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
                        <label className="text-[8px] font-black text-zinc-600 uppercase">Teams / Page</label>
                        <ScrollableInput
                          value={pagination.teamsPerPage}
                          onChange={(val) =>
                            setPagination({ currentPage: 1, teamsPerPage: Math.max(1, Math.min(4, val)) })
                          }
                          className="w-16 bg-black border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white text-center"
                        />
                      </div>
                      <button
                        onClick={addTeam}
                        className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-[#ccff00] uppercase tracking-widest hover:bg-[#ccff00]/10"
                      >
                        <Plus size={12} /> Add Team
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[8px] font-black text-zinc-600 tracking-[0.4em] uppercase italic">
                        ROSTER DATA_NODES
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
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[7px] font-black text-zinc-700 uppercase mb-1 block">
                                    Team Name
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
                                    Logo URL
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
                                    Hashtag
                                  </label>
                                  <input
                                    type="text"
                                    value={team.hashtag ?? ''}
                                    onChange={(e) => updateTeam(tIdx, { hashtag: e.target.value })}
                                    placeholder="#TEAMNAME"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-[10px] font-bold text-[#ccff00] uppercase outline-none focus:border-[#ccff00]"
                                  />
                                </div>
                                <div>
                                  <label className="text-[7px] font-black text-zinc-700 uppercase mb-1 block">
                                    Captain Slot (P1–P5)
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
                                  Player Slots (1–{MAX_PLAYERS_PER_TEAM})
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
                                            Empty slot
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
                                            + Fill
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

              {configTab === 'VISUAL' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="p-6 bg-zinc-900 border border-white/5 rounded-[20px]">
                    <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                      <Type size={12} className="text-[#ccff00]" />
                      Jenis font (Team Roster)
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
                          WARNA PMGO (Overall Ranking)
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
                        {usePmgoTeamColors ? 'PMGO SYNC ON' : 'MANUAL COLORS'}
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
                        HUD FX {showHudEffects ? 'ON' : 'OFF'}
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
                        SPONSORS {showSponsors ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>

                  {showSponsors && (
                    <div className="p-6 bg-zinc-900 border border-white/5 rounded-[20px] space-y-3">
                      <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                        SPONSOR / MEDIA PARTNER
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
                    <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Move size={12} className="text-blue-500" />
                      ROSTER LAYOUT (16:9)
                    </h3>
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">SLOT W</label>
                        <ScrollableInput
                          value={cardLayout.slotWidth ?? 280}
                          onChange={(val) => setCardLayout({ ...cardLayout, slotWidth: val })}
                          className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">SLOT H</label>
                        <ScrollableInput
                          value={cardLayout.slotHeight ?? 400}
                          onChange={(val) => setCardLayout({ ...cardLayout, slotHeight: val })}
                          className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">GAP</label>
                        <ScrollableInput
                          value={cardLayout.slotGap ?? 20}
                          onChange={(val) => setCardLayout({ ...cardLayout, slotGap: val })}
                          className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">CAPTAIN %</label>
                        <ScrollableInput
                          value={cardLayout.captainScale ?? 118}
                          onChange={(val) =>
                            setCardLayout({
                              ...cardLayout,
                              captainScale: Math.max(100, Math.min(140, val)),
                            })
                          }
                          className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">LOGO SIZE</label>
                        <ScrollableInput
                          value={cardLayout.logoSize ?? 140}
                          onChange={(val) => setCardLayout({ ...cardLayout, logoSize: val })}
                          className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">FRAME CUT</label>
                        <ScrollableInput
                          value={cardLayout.frameCornerCut ?? 18}
                          onChange={(val) =>
                            setCardLayout({
                              ...cardLayout,
                              frameCornerCut: Math.max(4, Math.min(40, val)),
                            })
                          }
                          className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">PHOTO SCALE</label>
                        <ScrollableInput
                          value={cardLayout.playerPhotoScale ?? 100}
                          onChange={(val) =>
                            setCardLayout({
                              ...cardLayout,
                              playerPhotoScale: Math.max(50, Math.min(150, val)),
                            })
                          }
                          className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center"
                        />
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
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {configTab === 'ANIMATION' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="p-2 bg-zinc-900 border border-white/5 rounded-[24px] flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const rosterPreset =
                          ANIMATION_PRESETS.find((p) => p.id === 'roster-reveal') ?? ANIMATION_PRESETS[0];
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
                      PRESET MODE
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
                      CUSTOM MODE
                    </button>
                  </div>

                  {animationConfig.mode === 'custom' ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 bg-zinc-950 border border-white/5 rounded-2xl">
                          <h4 className="text-[10px] font-black text-[#ccff00] uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                            <ArrowDownLeft size={14} /> IN TRANSITION
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
                            <ArrowUpRight size={14} /> OUT TRANSITION
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
                          <Settings2 size={14} /> TIMING &amp; STAGGER
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-2">
                              DURATION (S)
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
                              DELAY (S)
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
                            <label className="text-[8px] font-black text-zinc-600 uppercase block mb-2">EASING</label>
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
                            <label className="text-[8px] font-black text-zinc-600 uppercase block mb-2">SPRING</label>
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
                            <label className="text-[8px] font-black text-zinc-600 uppercase block mb-2">STAGGER</label>
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
                            <label className="text-[8px] font-black text-zinc-600 uppercase block mb-2">DIRECTION</label>
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
                            STAGGER DELAY (S)
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
                      {ANIMATION_PRESETS.map((preset) => {
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
                    <h2 className="text-4xl font-black text-[#ccff00] mb-4">ASSET PLAYING</h2>
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
