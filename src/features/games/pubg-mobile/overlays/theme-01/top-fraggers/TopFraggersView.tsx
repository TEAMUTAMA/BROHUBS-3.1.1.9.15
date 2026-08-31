
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSharedState } from '@/lib/useSharedState';
import { 
  Database, Palette, Play, Square, Monitor, ChevronDown, Activity, LayoutTemplate, 
  ChevronRight, Check, Settings2, Globe, User, Swords, Clock, Type, Italic, Bold, Move,
  Maximize, ArrowLeftRight, ArrowUpDown, Upload, Image as ImageIcon, Trash2, RefreshCw,
  Search, Shield, X, Filter, Gamepad2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Theme, Asset, Game, PlayerData } from '@/types';
import { useT } from '@/i18n/LanguageContext';
import PanelControlMonitor, { PreviewControlContext } from '@/features/companion/PanelControlMonitor';
import {
  AnimationConfig,
  getAnimationSignature,
  getRootMotionProps,
  getChildMotionInitial,
  getChildMotionExit,
  getMotionEase,
  resolveStaggerDelay,
  resolveExitStaggerDelay,
} from '@/constants/transitions';
import { notifyCompanionAnimation } from '@/features/companion/overlayAnimation';
import { notifyCompanionData } from '@/features/companion/overlayData';
import { compressImage, BACKGROUND_PRESET } from '@/lib/imageCompression';
import { useOverlayFonts } from '@/features/games/pubg-mobile/useEliminationBannerFonts';
import OverlayFontFamilySelect from '@/components/shared/OverlayFontFamilySelect';
import {
  DEFAULT_OVERLAY_FONT_FAMILY_ID,
  getOverlayFontCssFamily,
  resolveOverlayFontFamilyId,
} from '@/features/games/pubg-mobile/logic/eliminationBannerFonts';
import {
  buildTopFraggersFromMatch,
  buildPersonnelDbRows,
  filterPersonnelDbRows,
  listPersonnelDbTeams,
  isMatchReadyForTopFraggerSync,
  mergeFraggersElimsFromMatch,
  countAliveTeams,
  type PersonnelDbPlayer,
} from '@/features/games/pubg-mobile/logic/topFraggersSync';

interface OverlayTopFraggersViewProps {
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
  projectPlayers?: PlayerData[]; // Database from Project
  companionProjectScope?: string | null;
  isGlobalStudio?: boolean;
  showMonitorProp?: boolean;
  programAssetIdProp?: string | null;
  onProgramAssetChange?: (id: string | null) => void;
  getAssetStatusProp?: (id: string) => number;
  onPreviewContentChange?: (content: React.ReactNode) => void;
  visualOnly?: boolean;
  /** Monitor staging/program — animasi sama seperti editor, tanpa chrome OBS */
  monitorFeed?: boolean;
  /** Override play key untuk sinkron animasi monitor program */
  feedPlayKey?: number;
  style?: React.CSSProperties;
}

interface Fragger {
  rank: number;
  name: string;
  team: string; 
  teamLogo?: string;
  elims: number;
  damage: number;
  survival: string;
  image?: string;
}

const ScrollableInput = ({ 
  value, 
  onChange, 
  className 
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
        const delta = e.deltaY > 0 ? -1 : 1;
        onChange(value + delta);
      }
    };
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [value, onChange]);
  return <input ref={inputRef} type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className={className} />;
};

const DEFAULT_PLAYER_IMG = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop';
const DEFAULT_TEAM_LOGO = 'https://api.dicebear.com/7.x/identicon/svg?seed=DEFAULT';
const TOP_FRAGGERS_PLAYER_IMAGE_BASE = {
  height: 180,
  scale: 170,
  x: 0,
  y: 35,
};
const TOP_FRAGGERS_BG_LOGO_BASE = {
  scale: 160,
  x: 0,
  y: 30,
  opacity: 25,
};
const TOP_FRAGGERS_IMAGE_LAYOUT_DEFAULT = {
  playerHeight: TOP_FRAGGERS_PLAYER_IMAGE_BASE.height,
  playerScale: TOP_FRAGGERS_PLAYER_IMAGE_BASE.scale,
  playerX: TOP_FRAGGERS_PLAYER_IMAGE_BASE.x,
  playerY: TOP_FRAGGERS_PLAYER_IMAGE_BASE.y,
  bgLogoScale: TOP_FRAGGERS_BG_LOGO_BASE.scale,
  bgLogoOpacity: TOP_FRAGGERS_BG_LOGO_BASE.opacity,
  bgLogoX: TOP_FRAGGERS_BG_LOGO_BASE.x,
  bgLogoY: TOP_FRAGGERS_BG_LOGO_BASE.y,
};
const TOP_FRAGGERS_DEFAULT_VISUAL = {
  titleColor: '#ffffff',
  subtitleBg: '#000000',
  subtitleText: '#ffffff',
  cardBg: '#74a57f',
  cardBgImage: null as string | null,
  bgImage: null as string | null,
  useCustomBackground: false,
  playerNameColor: '#000000',
  teamNameColor: '#000000',
  elimsColor: '#000000',
  survivalColor: '#000000',
  rankColor: '#b04e4e',
};
const TOP_FRAGGERS_TEXT_LAYOUT_DEFAULT = {
  rankX: 0,
  rankY: 0,
  nameX: 0,
  nameY: 0,
  elimsX: 0,
  elimsY: 0,
  survivalX: 0,
  survivalY: 0,
};

function resolveMediaSrc(src?: string | null, fallback?: string): string | undefined {
  const trimmed = src?.trim();
  if (trimmed) return trimmed;
  const fb = fallback?.trim();
  return fb || undefined;
}

const OverlayTopFraggersView: React.FC<OverlayTopFraggersViewProps> = ({ 
  asset, theme, games, themes, availableAssets, userRole, onBack, onSelectTheme, onSelectAsset, globalLogo, projectPlayers = [], companionProjectScope = null, isGlobalStudio = false, showMonitorProp = true,
  programAssetIdProp, onProgramAssetChange, getAssetStatusProp, onPreviewContentChange, visualOnly = false, monitorFeed = false, feedPlayKey, style
}) => {
  useOverlayFonts();
  const t = useT();
  const [configTab, setConfigTab] = useState<'DATA' | 'VISUAL' | 'ANIMATION'>('DATA');
  const [showMonitors, setShowMonitors] = useState(true);
  const [showList, setShowList] = useState(true);

  // Resizable Sidebar Logic
  const [sidebarWidth, setSidebarWidth] = useState(224); // Default w-56
  const [isResizing, setIsResizing] = useState(false);

  const [fraggers, setFraggers] = useSharedState<Fragger[]>('BROHUBS_TOPFRAGGERS_DATA', [
    { rank: 1, name: 'PLAYER 1', team: 'TEAM A', teamLogo: DEFAULT_TEAM_LOGO, elims: 0, damage: 0, survival: '0 M 00 S', image: DEFAULT_PLAYER_IMG },
    { rank: 2, name: 'PLAYER 2', team: 'TEAM B', teamLogo: DEFAULT_TEAM_LOGO, elims: 0, damage: 0, survival: '0 M 00 S', image: DEFAULT_PLAYER_IMG },
    { rank: 3, name: 'PLAYER 3', team: 'TEAM C', teamLogo: DEFAULT_TEAM_LOGO, elims: 0, damage: 0, survival: '0 M 00 S', image: DEFAULT_PLAYER_IMG },
    { rank: 4, name: 'PLAYER 4', team: 'TEAM D', teamLogo: DEFAULT_TEAM_LOGO, elims: 0, damage: 0, survival: '0 M 00 S', image: DEFAULT_PLAYER_IMG },
    { rank: 5, name: 'PLAYER 5', team: 'TEAM E', teamLogo: DEFAULT_TEAM_LOGO, elims: 0, damage: 0, survival: '0 M 00 S', image: DEFAULT_PLAYER_IMG },
  ]);

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
  
  // Reactive Sync
  const fraggersRef = useRef<Fragger[]>([]);
  useEffect(() => { fraggersRef.current = fraggers; }, [fraggers]);

  useEffect(() => {
    if (!projectPlayers || projectPlayers.length === 0) return;
    
    // Only sync if fragger players are default placeholders
    const isDefault = fraggers.every(f => f.name.startsWith('PLAYER'));
    if (!isDefault) return;

    const currentFraggers = fraggersRef.current;
    
    let needsSync = false;
    const newFraggers = currentFraggers.map(fragger => {
        const player = projectPlayers.find(p => p.name.toLowerCase() === fragger.name.toLowerCase() || p.team === fragger.team);
        if (!player) return fragger;
        
        const newLogo = player.teamLogo || fragger.teamLogo || DEFAULT_TEAM_LOGO;
        const newImage = player.image || fragger.image || DEFAULT_PLAYER_IMG;
        
        if (fragger.name === player.name &&
            fragger.team === player.team &&
            fragger.teamLogo === newLogo &&
            fragger.image === newImage
        ) return fragger;
        
        needsSync = true;
        return {
            ...fragger,
            name: player.name,
            team: player.team,
            teamLogo: newLogo,
            image: newImage
        };
    });
    
    if (needsSync) {
        setFraggers(newFraggers);
    }
  }, [projectPlayers]);

  const [teams] = useSharedState<any[]>('BROHUBS_LEADERBOARD_TEAMS', []);
  const [currentMatch] = useSharedState('BROHUBS_LEADERBOARD_MATCH', 1);
  const [matchEnded, setMatchEnded] = useState(false);

  const aliveTeamCount = useMemo(() => countAliveTeams(teams), [teams]);
  const matchReadyForFraggerSync = useMemo(
    () => isMatchReadyForTopFraggerSync(teams),
    [teams]
  );

  const syncTopFraggersFromMatch = useCallback(
    (force = false) => {
      if (!teams.length) {
        window.alert(
          'Data match belum ada. Buka Overall Ranking dan input kill terlebih dahulu.'
        );
        return;
      }
      const built = buildTopFraggersFromMatch(teams, projectPlayers, 5, {
        teamLogo: DEFAULT_TEAM_LOGO,
        playerImage: DEFAULT_PLAYER_IMG,
        survival: '0 M 00 S',
      });
      setFraggers(built);
      if (isMatchReadyForTopFraggerSync(teams) || force) {
        setMatchEnded(isMatchReadyForTopFraggerSync(teams));
      }
    },
    [teams, projectPlayers, setFraggers]
  );

  useEffect(() => {
    if (visualOnly) return;
    if (!teams.length) return;

    if (matchReadyForFraggerSync) {
      setFraggers(
        buildTopFraggersFromMatch(teams, projectPlayers, 5, {
          teamLogo: DEFAULT_TEAM_LOGO,
          playerImage: DEFAULT_PLAYER_IMG,
          survival: '0 M 00 S',
        })
      );
      setMatchEnded(true);
      return;
    }

    setMatchEnded(false);
    setFraggers((prev) => mergeFraggersElimsFromMatch(prev, teams, projectPlayers) ?? prev);
  }, [teams, projectPlayers, matchReadyForFraggerSync, currentMatch, setFraggers, visualOnly]);

  // DB Selector State
  const [isDbSelectorOpen, setIsDbSelectorOpen] = useState<{ rankIndex: number } | null>(null);
  const [dbSearch, setDbSearch] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');
  const [temp, setTemp] = useState(false);

  const [visualConfig, setVisualConfig] = useSharedState(
    'BROHUBS_TOPFRAGGERS_VISUAL',
    TOP_FRAGGERS_DEFAULT_VISUAL
  );

  useEffect(() => {
    setVisualConfig((prev) => {
      const next = { ...TOP_FRAGGERS_DEFAULT_VISUAL, ...prev };
      let changed = false;

      if (prev.subtitleBg === '#ffffff' || prev.subtitleBg === '#74a57f') {
        next.subtitleBg = TOP_FRAGGERS_DEFAULT_VISUAL.subtitleBg;
        changed = true;
      }
      if (prev.subtitleText === '#000000' && prev.subtitleBg === '#ffffff') {
        next.subtitleText = TOP_FRAGGERS_DEFAULT_VISUAL.subtitleText;
        changed = true;
      }
      if (prev.cardBg === '#ccff00' || prev.cardBg === '#e8e6df') {
        next.cardBg = TOP_FRAGGERS_DEFAULT_VISUAL.cardBg;
        changed = true;
      }
      if (prev.rankColor === '#000000') {
        next.rankColor = TOP_FRAGGERS_DEFAULT_VISUAL.rankColor;
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [setVisualConfig]);

  const [customVisualConfig, setCustomVisualConfig] = useSharedState(
    'BROHUBS_TOPFRAGGERS_CUSTOM_VISUAL',
    TOP_FRAGGERS_DEFAULT_VISUAL
  );

  const activeVisualConfig = visualConfig.useCustomBackground ? customVisualConfig : visualConfig;
  const patchActiveVisualConfig = useCallback(
    (updates: Partial<typeof TOP_FRAGGERS_DEFAULT_VISUAL>) => {
      if (visualConfig.useCustomBackground) {
        setCustomVisualConfig((prev) => ({ ...prev, ...updates }));
        return;
      }
      setVisualConfig((prev) => ({ ...prev, ...updates }));
    },
    [setCustomVisualConfig, setVisualConfig, visualConfig.useCustomBackground]
  );

  const resetVisualColorsToDefault = useCallback(() => {
    patchActiveVisualConfig({
      titleColor: TOP_FRAGGERS_DEFAULT_VISUAL.titleColor,
      subtitleBg: TOP_FRAGGERS_DEFAULT_VISUAL.subtitleBg,
      subtitleText: TOP_FRAGGERS_DEFAULT_VISUAL.subtitleText,
      cardBg: TOP_FRAGGERS_DEFAULT_VISUAL.cardBg,
      playerNameColor: TOP_FRAGGERS_DEFAULT_VISUAL.playerNameColor,
      teamNameColor: TOP_FRAGGERS_DEFAULT_VISUAL.teamNameColor,
      elimsColor: TOP_FRAGGERS_DEFAULT_VISUAL.elimsColor,
      survivalColor: TOP_FRAGGERS_DEFAULT_VISUAL.survivalColor,
      rankColor: TOP_FRAGGERS_DEFAULT_VISUAL.rankColor,
    });
  }, [patchActiveVisualConfig]);

  const handleBgImageUpload = (file: File | undefined) => {
    if (!file) return;
    void compressImage(file, BACKGROUND_PRESET).then((result) => {
      setVisualConfig((prev) => ({ ...prev, bgImage: result }));
    });
  };

  const [typography, setTypography] = useSharedState('BROHUBS_TOPFRAGGERS_TYPOGRAPHY', {
    fontFamilyId: 'inter' as string,
    title: { font: 'Inter', weight: '950', italic: true, size: 84, x: 0, y: 0 },
    subtitle: { font: 'Inter', weight: '900', italic: false, size: 12, x: 0, y: 0 },
    card: { font: 'Inter', weight: '900', italic: false, size: 20 },
    rank: { font: 'Inter', weight: '950', italic: false, size: 32 },
  });

  useEffect(() => {
    setTypography((prev: typeof typography) => {
      const raw = prev as typeof typography & { fontFamilyId?: string };
      if (raw.fontFamilyId) {
        const resolved = resolveOverlayFontFamilyId(raw.fontFamilyId);
        if (resolved === raw.fontFamilyId) return prev;
        return { ...raw, fontFamilyId: resolved };
      }
      const fromLegacy = resolveOverlayFontFamilyId(
        raw.title?.font ?? raw.subtitle?.font ?? DEFAULT_OVERLAY_FONT_FAMILY_ID
      );
      return { ...raw, fontFamilyId: fromLegacy };
    });
  }, [setTypography]);

  const fraggerFontFamily = useMemo(
    () =>
      getOverlayFontCssFamily(
        resolveOverlayFontFamilyId(
          (typography as { fontFamilyId?: string }).fontFamilyId ?? typography.title?.font
        )
      ),
    [typography]
  );

  const [cardLayout, setCardLayout] = useSharedState('BROHUBS_TOPFRAGGERS_LAYOUT', {
    playerNameSize: 22,
    teamNameSize: 12,
    elimsSize: 28,
    survivalSize: 20,
    teamLogoSize: 32,
    playerHeight: TOP_FRAGGERS_PLAYER_IMAGE_BASE.height,
    playerScale: TOP_FRAGGERS_PLAYER_IMAGE_BASE.scale,
    playerX: TOP_FRAGGERS_PLAYER_IMAGE_BASE.x,
    playerY: TOP_FRAGGERS_PLAYER_IMAGE_BASE.y,
    bgLogoScale: TOP_FRAGGERS_BG_LOGO_BASE.scale,
    bgLogoOpacity: TOP_FRAGGERS_BG_LOGO_BASE.opacity,
    bgLogoX: TOP_FRAGGERS_BG_LOGO_BASE.x,
    bgLogoY: TOP_FRAGGERS_BG_LOGO_BASE.y,
    ...TOP_FRAGGERS_TEXT_LAYOUT_DEFAULT,
  });
  const [customTextLayout, setCustomTextLayout] = useSharedState(
    'BROHUBS_TOPFRAGGERS_CUSTOM_TEXT_LAYOUT',
    TOP_FRAGGERS_TEXT_LAYOUT_DEFAULT
  );
  const [customImageLayout, setCustomImageLayout] = useSharedState(
    'BROHUBS_TOPFRAGGERS_CUSTOM_IMAGE_LAYOUT',
    TOP_FRAGGERS_IMAGE_LAYOUT_DEFAULT
  );
  const didNormalizePlayerImageScaleRef = useRef(false);

  const isCustomImageControlMode =
    (visualConfig.useCustomBackground && Boolean(visualConfig.bgImage)) ||
    Boolean(visualConfig.cardBgImage);
  const activeTextLayout = visualConfig.useCustomBackground ? customTextLayout : cardLayout;
  const patchActiveTextLayout = (updates: Partial<typeof TOP_FRAGGERS_TEXT_LAYOUT_DEFAULT>) => {
    if (visualConfig.useCustomBackground) {
      setCustomTextLayout({ ...customTextLayout, ...updates });
      return;
    }
    setCardLayout({ ...cardLayout, ...updates });
  };
  const activeImageControlLayout = isCustomImageControlMode ? customImageLayout : cardLayout;
  const patchActiveImageControlLayout = (
    updates: Partial<typeof TOP_FRAGGERS_IMAGE_LAYOUT_DEFAULT>
  ) => {
    if (isCustomImageControlMode) {
      setCustomImageLayout({ ...customImageLayout, ...updates });
      return;
    }
    setCardLayout({ ...cardLayout, ...updates });
  };

  useEffect(() => {
    if (didNormalizePlayerImageScaleRef.current) return;
    didNormalizePlayerImageScaleRef.current = true;

    const isAtPlayerImageBase =
      (cardLayout.playerHeight ?? TOP_FRAGGERS_PLAYER_IMAGE_BASE.height) ===
        TOP_FRAGGERS_PLAYER_IMAGE_BASE.height &&
      (cardLayout.playerX ?? TOP_FRAGGERS_PLAYER_IMAGE_BASE.x) ===
        TOP_FRAGGERS_PLAYER_IMAGE_BASE.x;

    const normalizedLayout = { ...cardLayout };
    let changed = false;

    if (
      isAtPlayerImageBase &&
      (cardLayout.playerScale ?? TOP_FRAGGERS_PLAYER_IMAGE_BASE.scale) ===
        TOP_FRAGGERS_PLAYER_IMAGE_BASE.scale - 20
    ) {
      normalizedLayout.playerScale = TOP_FRAGGERS_PLAYER_IMAGE_BASE.scale;
      changed = true;
    }

    if (
      isAtPlayerImageBase &&
      (cardLayout.playerY ?? TOP_FRAGGERS_PLAYER_IMAGE_BASE.y) === 49
    ) {
      normalizedLayout.playerY = TOP_FRAGGERS_PLAYER_IMAGE_BASE.y;
      changed = true;
    }

    if ((cardLayout.bgLogoScale ?? TOP_FRAGGERS_BG_LOGO_BASE.scale) === 66) {
      normalizedLayout.bgLogoScale = TOP_FRAGGERS_BG_LOGO_BASE.scale;
      changed = true;
    }

    if ((cardLayout.bgLogoX ?? TOP_FRAGGERS_BG_LOGO_BASE.x) === 0) {
      normalizedLayout.bgLogoX = TOP_FRAGGERS_BG_LOGO_BASE.x;
    }

    if ((cardLayout.bgLogoY ?? TOP_FRAGGERS_BG_LOGO_BASE.y) === 0) {
      normalizedLayout.bgLogoY = TOP_FRAGGERS_BG_LOGO_BASE.y;
      changed = true;
    }

    if (changed) setCardLayout(normalizedLayout);
  }, [cardLayout, setCardLayout]);

  const [isSaving, setIsSaving] = useState(false);

  const { replay, playKey } = React.useContext(PreviewControlContext);

  const handleSave = () => {
    setIsSaving(true);
    
    // Commit draft to shared state
    setAnimationConfig({ ...draftAnimationConfig, mode: 'custom' });
    
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

  const [matchInfo, setMatchInfo] = useSharedState('BROHUBS_TOPFRAGGERS_MATCH', { title: 'TOP FRAGGERS', subtitle: 'LIVE PERFORMANCE TELEMETRY' });
  const [internalProgramAssetId, setInternalProgramAssetId] = useState<string | null>(null);
  const [programPlayKey, setProgramPlayKey] = useState(0);
  
  const programAssetId = programAssetIdProp !== undefined ? programAssetIdProp : internalProgramAssetId;
  const setProgramAssetId = (id: string | null) => {
    if (id) setProgramPlayKey((k) => k + 1);
    if (onProgramAssetChange) onProgramAssetChange(id);
    else setInternalProgramAssetId(id);
  };

  const updateFragger = (index: number, field: keyof Fragger, value: any) => {
      const updated = [...fraggers];
      updated[index] = { ...updated[index], [field]: value };
      
      if (field === 'elims') {
          updated.sort((a, b) => b.elims - a.elims);
          updated.forEach((f, i) => f.rank = i + 1);
      }
      setFraggers(updated);
  };

  const openDbModal = (rankIndex: number) => {
    setSelectedTeamFilter('ALL');
    setDbSearch('');
    setIsDbSelectorOpen({ rankIndex });
  };

  const handleLoadFromDb = (rankIndex: number, player: PersonnelDbPlayer) => {
    const liveKills = player.elims ?? player.kills ?? 0;

    const updated = [...fraggers];
    updated[rankIndex] = {
        ...updated[rankIndex],
        name: player.name,
        team: player.team,
        teamLogo: player.teamLogo || DEFAULT_TEAM_LOGO,
        image: player.image || DEFAULT_PLAYER_IMG,
        elims: liveKills,
    };
    updated.sort((a, b) => b.elims - a.elims);
    updated.forEach((f, i) => {
      f.rank = i + 1;
    });
    setFraggers(updated);
    setIsDbSelectorOpen(null);
  };

  const personnelDbRows = useMemo(
    () => buildPersonnelDbRows(projectPlayers, teams),
    [projectPlayers, teams]
  );

  const filteredDbPlayers = useMemo(
    () =>
      filterPersonnelDbRows(personnelDbRows, {
        teamFilter: selectedTeamFilter,
        search: dbSearch,
      }),
    [personnelDbRows, selectedTeamFilter, dbSearch]
  );

  const uniqueTeams = useMemo(
    () => listPersonnelDbTeams(personnelDbRows),
    [personnelDbRows]
  );

  const [animationConfig, setAnimationConfig] = useSharedState<AnimationConfig>('BROHUBS_TOPFRAGGERS_ANIMATION', {
    inType: 'slide-up',
    outType: 'slide-down',
    duration: 0.8,
    delay: 0,
    easing: 'easeOut',
    useSpring: true,
    staggerChildren: true,
    staggerDelay: 0.1,
    staggerDirection: 'top-down',
  });

  const [draftAnimationConfig, setDraftAnimationConfig] = useState<AnimationConfig>(animationConfig);

  // Sync draft when shared state changes (from another operator or initial load)
  useEffect(() => {
    setDraftAnimationConfig(animationConfig);
  }, [animationConfig]);

  useEffect(() => {
    if (visualOnly) return;
    notifyCompanionAnimation({
      assetId: asset.id,
      animation: animationConfig,
    }, companionProjectScope);
  }, [asset.id, animationConfig, visualOnly, companionProjectScope]);

  useEffect(() => {
    if (visualOnly) return;
    const timer = setTimeout(() => {
      notifyCompanionData({
        assetId: asset.id,
        data: {
          BROHUBS_TOPFRAGGERS_DATA: fraggers,
          BROHUBS_TOPFRAGGERS_VISUAL: visualConfig,
          BROHUBS_TOPFRAGGERS_CUSTOM_VISUAL: customVisualConfig,
          BROHUBS_TOPFRAGGERS_TYPOGRAPHY: typography,
          BROHUBS_TOPFRAGGERS_LAYOUT: cardLayout,
          BROHUBS_TOPFRAGGERS_CUSTOM_TEXT_LAYOUT: customTextLayout,
          BROHUBS_TOPFRAGGERS_CUSTOM_IMAGE_LAYOUT: customImageLayout,
          BROHUBS_TOPFRAGGERS_MATCH: matchInfo,
        },
      }, companionProjectScope);
    }, 400);
    return () => clearTimeout(timer);
  }, [asset.id, fraggers, visualConfig, customVisualConfig, typography, cardLayout, customTextLayout, customImageLayout, matchInfo, visualOnly, companionProjectScope]);

  const activeAnimConfig = useMemo(
    () => (visualOnly || monitorFeed ? animationConfig : draftAnimationConfig),
    [visualOnly, monitorFeed, animationConfig, draftAnimationConfig]
  );

  const rootMotionProps = useMemo(
    () => getRootMotionProps(activeAnimConfig),
    [activeAnimConfig]
  );

  const fraggerCardAnimConfig = useMemo(
    (): AnimationConfig => ({
      ...activeAnimConfig,
      staggerChildren: activeAnimConfig.staggerChildren ?? true,
      staggerDelay: activeAnimConfig.staggerDelay ?? 0.1,
      staggerDirection: activeAnimConfig.staggerDirection ?? 'top-down',
    }),
    [activeAnimConfig]
  );

  const displayFraggers = useMemo(() => {
    let list = fraggers.map((f) => ({
      ...f,
      teamLogo: resolveMediaSrc(f.teamLogo, DEFAULT_TEAM_LOGO)!,
      image: resolveMediaSrc(f.image, DEFAULT_PLAYER_IMG)!,
    }));
    if (selectedTeamFilter !== 'ALL') {
       list = list.filter(f => f.team.toLowerCase() === selectedTeamFilter.toLowerCase());
       list.sort((a, b) => b.elims - a.elims);
    } else {
       list.sort((a, b) => b.elims - a.elims);
    }
    return list;
  }, [fraggers, selectedTeamFilter]);

  const renderLivePreview = useCallback((overrideAnimKey?: number) => {
    const resolvedAnimKey = overrideAnimKey ?? feedPlayKey ?? playKey;

    // === Judul "TOP FRAGGERS" full-outframe dari atas saat transisi VERTIKAL ===
    // Saat in/out memakai slide vertikal (slide-up / slide-down) kita DECOUPLE:
    //  - ROOT tidak menggeser sumbu-Y untuk sisi itu (hanya fade), jadi judul TIDAK
    //    ikut tergeser root.
    //  - Judul punya gerak sendiri: MASUK dari atas & KELUAR ke atas, penuh keluar frame.
    //  - Kartu dibungkus "stage" yang memikul slide vertikal (menggantikan peran root),
    //    sehingga perilaku kartu tetap sama seperti sebelumnya.
    // Karena root tak menggeser-Y, posisi layar judul = transform judul itu sendiri
    // (tanpa komposisi dengan root) → ANDAL, tak bergantung timing orkestrasi Framer.
    // TITLE_TOP_OFFSET = jarak judul naik agar kotaknya benar-benar lepas dari tepi atas.
    const TITLE_TOP_OFFSET = 700;
    const isVerticalSlide = (t: string) => t === 'slide-up' || t === 'slide-down';
    const titleFromTopIn = isVerticalSlide(activeAnimConfig.inType);
    const titleFromTopOut = isVerticalSlide(activeAnimConfig.outType);
    const rootInitY =
      activeAnimConfig.inType === 'slide-up' ? 1080 : activeAnimConfig.inType === 'slide-down' ? -1080 : 0;
    const rootExitY =
      activeAnimConfig.outType === 'slide-up' ? -1080 : activeAnimConfig.outType === 'slide-down' ? 1080 : 0;

    const stripY = (obj: unknown) => {
      if (!obj || typeof obj !== 'object') return obj as never;
      const { y: _y, ...rest } = obj as Record<string, unknown>;
      return rest as never;
    };

    // ROOT: buang geser-Y untuk sisi yang vertikal (judul & stage kartu yang menangani).
    const rootInitialProp = titleFromTopIn ? stripY(rootMotionProps.initial) : rootMotionProps.initial;
    const rootExitProp = titleFromTopOut ? stripY(rootMotionProps.exit) : rootMotionProps.exit;

    // Transisi OUT (keluar) dibuat LEBIH SMOOTH: kurva ease lembut + durasi sedikit lebih
    // panjang, dan TANPA spring agar tidak ada hentakan/snap saat elemen keluar frame.
    // Durasi tetap mengikuti slider durasi user (diskalakan), easing dipaksa halus.
    const smoothOutEase: number[] = [0.4, 0, 0.2, 1];
    const smoothOutTransition = {
      duration: Math.max(activeAnimConfig.duration, 0.6) * 1.35,
      ease: smoothOutEase,
    };

    // STAGE KARTU: pikul slide vertikal yang tadinya dilakukan root (perilaku kartu sama).
    const cardsStageInitial = titleFromTopIn ? { y: rootInitY } : undefined;
    const cardsStageAnimate = titleFromTopIn ? { y: 0, transition: rootMotionProps.transition } : undefined;
    const cardsStageExit = titleFromTopOut ? { y: rootExitY, transition: smoothOutTransition } : undefined;

    // JUDUL: gerak sendiri, penuh keluar frame dari atas (tanpa counter — root tak geser-Y).
    const titleGroupInitial = titleFromTopIn ? { y: -TITLE_TOP_OFFSET } : undefined;
    const titleGroupAnimate = titleFromTopIn ? { y: 0, transition: rootMotionProps.transition } : undefined;
    const titleGroupExit = titleFromTopOut
      ? { y: -TITLE_TOP_OFFSET, opacity: 0, transition: smoothOutTransition }
      : undefined;

    return (
    <motion.div 
      key={`fraggers-asset-${resolvedAnimKey}-${getAnimationSignature(activeAnimConfig)}`}
      initial={rootInitialProp}
      animate={rootMotionProps.animate}
      exit={rootExitProp}
      transition={rootMotionProps.transition}
      style={style}
      className={`w-[1920px] h-[1080px] bg-transparent relative overflow-hidden ${style?.position === 'absolute' ? '' : 'mx-auto'}`}
    >
       {/* Checkerboard Background for Transparency Visualization */}
       {!visualOnly && !monitorFeed && (
         <div className="absolute inset-0 opacity-40" style={{ 
             backgroundImage: 'conic-gradient(#0a0a0a 90deg, #050505 90deg 180deg, #0a0a0a 180deg 270deg, #050505 270deg)',
             backgroundSize: '40px 40px' 
         }} />
       )}
       
       {/* Logo brand kiri-atas dihilangkan di template Top Fraggers (atas permintaan) */}

       {/* Catatan: gambar custom diterapkan sebagai background TIAP KARTU (lihat map kartu),
           bukan background master full-frame. */}

       {/* Main Content Area - Centered by default but elements can be moved via offsets */}
       <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
           <motion.div
               className="text-center relative z-20 mb-8"
               initial={titleGroupInitial}
               animate={titleGroupAnimate}
               exit={titleGroupExit}
           >
               <motion.h1
                 exit={titleFromTopOut ? undefined : { scale: 0.8, opacity: 0, y: -50, transition: { duration: 0.5, ease: "easeIn" } }}
                 className="tracking-tighter uppercase leading-none mb-4 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                 style={{ color: activeVisualConfig.titleColor, fontFamily: fraggerFontFamily, fontWeight: typography.title.weight, fontStyle: typography.title.italic ? 'italic' : 'normal', fontSize: `${typography.title.size}px`, transform: `translate(${typography.title.x}px, ${typography.title.y}px)` }}
               >
                 {matchInfo.title}
               </motion.h1>
               <motion.div
                 exit={titleFromTopOut ? undefined : { scale: 1.2, opacity: 0, transition: { duration: 0.4, delay: 0.1, ease: "easeIn" } }}
                 className="px-10 py-1.5 inline-block transform -skew-x-12 shadow-xl"
                 style={{ backgroundColor: activeVisualConfig.subtitleBg, transform: `skewX(-12deg) translate(${typography.subtitle.x}px, ${typography.subtitle.y}px)` }}
               >
                   <span className="tracking-[0.5em] uppercase block transform skew-x-12" style={{ color: activeVisualConfig.subtitleText, fontFamily: fraggerFontFamily, fontWeight: typography.subtitle.weight, fontStyle: typography.subtitle.italic ? 'italic' : 'normal', fontSize: `${typography.subtitle.size}px` }}>{matchInfo.subtitle}</span>
               </motion.div>
           </motion.div>
           <motion.div
               className="flex items-end gap-5"
               initial={cardsStageInitial}
               animate={cardsStageAnimate}
               exit={cardsStageExit}
           >
               {displayFraggers.map((player, idx) => {
                 // Mode CUSTOM + ada gambar → gambar dipakai sebagai background TIAP KARTU
                 // (mengganti warna hijau cardBg), bukan background master full-frame.
                 const useCardImage = visualConfig.useCustomBackground && Boolean(visualConfig.bgImage);
                 const imageLayout =
                   (useCardImage || visualConfig.cardBgImage) ? customImageLayout : cardLayout;
                 return (
                   <motion.div
                     key={`${player.name}-${player.team}`}
                     initial={getChildMotionInitial(fraggerCardAnimConfig, 72)}
                     animate={{ x: 0, y: 0, opacity: 1 }}
                     exit={{
                        ...getChildMotionExit(fraggerCardAnimConfig, 480),
                        transition: {
                          delay: resolveExitStaggerDelay(
                            idx,
                            displayFraggers.length,
                            fraggerCardAnimConfig
                          ),
                          // OUT lebih smooth: ikut kurva & durasi lembut yang sama dgn stage.
                          ...smoothOutTransition,
                        },
                     }}
                     transition={
                       fraggerCardAnimConfig.useSpring
                         ? {
                             type: 'spring' as const,
                             stiffness: 110,
                             damping: 18,
                             delay: resolveStaggerDelay(
                               idx,
                               displayFraggers.length,
                               fraggerCardAnimConfig,
                               0.15
                             ),
                           }
                         : {
                             delay: resolveStaggerDelay(
                               idx,
                               displayFraggers.length,
                               fraggerCardAnimConfig,
                               0.15
                             ),
                             duration: fraggerCardAnimConfig.duration * 0.55,
                             ease: getMotionEase(fraggerCardAnimConfig),
                           }
                     }
                     className="relative w-56 flex flex-col items-center pt-10 pb-8 px-4 overflow-hidden shadow-2xl" 
                     style={{ height: '520px', backgroundColor: (useCardImage || visualConfig.cardBgImage) ? 'transparent' : activeVisualConfig.cardBg, backgroundImage: useCardImage ? `url(${visualConfig.bgImage})` : (visualConfig.cardBgImage ? `url(${visualConfig.cardBgImage})` : 'none'), backgroundSize: 'cover', backgroundPosition: 'center', fontFamily: fraggerFontFamily, fontWeight: typography.card.weight, fontStyle: typography.card.italic ? 'italic' : 'normal' }}
                   >
                       {/* Rank Badge */}
                       <div className="absolute top-4 left-4 z-30 opacity-90" style={{ color: activeVisualConfig.rankColor, fontFamily: fraggerFontFamily, fontWeight: typography.rank.weight, fontStyle: typography.rank.italic ? 'italic' : 'normal', fontSize: `${typography.rank.size}px`, transform: `translate(${activeTextLayout.rankX ?? 0}px, ${activeTextLayout.rankY ?? 0}px)` }}>#{idx + 1}</div>
                       
                       {/* Top Right Icon/Badge from Reference */}
                       <div className="absolute top-4 right-4 z-30">
                           <div className="w-10 h-10 rounded-xl bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center border-2 border-white/20 shadow-lg">
                               {resolveMediaSrc(player.teamLogo) ? (
                                    <img 
                                        src={resolveMediaSrc(player.teamLogo)!} 
                                        className="w-full h-full p-1 object-contain" 
                                        alt="Team Logo"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                            e.currentTarget.src = DEFAULT_TEAM_LOGO;
                                        }}
                                    />
                                ) : (
                                    <Shield size={20} className="opacity-40 text-white" />
                                )}
                           </div>
                       </div>

                       {/* Player Frame (Dark Box) — transparan saat mode CUSTOM agar gambar tembus bersih */}
                       <div className={`w-full aspect-[4/3] ${useCardImage ? 'overflow-visible' : 'bg-black/20 shadow-inner overflow-hidden'} rounded-sm mb-8 flex items-end justify-center relative`}>
                           {resolveMediaSrc(player.teamLogo) && (
                             <img 
                               src={resolveMediaSrc(player.teamLogo)!} 
                               className="absolute object-contain z-0 top-1/2 left-1/2 select-none pointer-events-none" 
                                style={{
                                    width: `${imageLayout.bgLogoScale ?? TOP_FRAGGERS_BG_LOGO_BASE.scale}px`, 
                                    height: `${imageLayout.bgLogoScale ?? TOP_FRAGGERS_BG_LOGO_BASE.scale}px`,
                                    opacity: (imageLayout.bgLogoOpacity ?? 25) / 100,
                                    maxWidth: 'none',
                                    maxHeight: 'none',
                                    transform: `translate(-50%, -50%) translate(${imageLayout.bgLogoX ?? 0}px, ${imageLayout.bgLogoY ?? 0}px)`,
                                    WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 72%, rgba(0,0,0,0.88) 84%, transparent 100%)',
                                    maskImage: 'linear-gradient(to bottom, #000 0%, #000 72%, rgba(0,0,0,0.88) 84%, transparent 100%)',
                                }} 
                               alt="Team Watermark" 
                               referrerPolicy="no-referrer" 
                               onError={(e) => { e.currentTarget.style.display = 'none'; }}
                             />
                           )}
                          {resolveMediaSrc(player.image) ? (
                            <img
                              src={resolveMediaSrc(player.image)!}
                              className="relative z-10 w-auto object-contain"
                              style={{
                                height: `${Math.max(40, imageLayout.playerHeight ?? TOP_FRAGGERS_PLAYER_IMAGE_BASE.height)}px`,
                                transform: `scale(${imageLayout.playerScale / 100}) translate(${imageLayout.playerX}px, ${imageLayout.playerY}px)`,
                                transformOrigin: 'bottom center',
                                WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 72%, rgba(0,0,0,0.88) 84%, transparent 100%)',
                                maskImage: 'linear-gradient(to bottom, #000 0%, #000 72%, rgba(0,0,0,0.88) 84%, transparent 100%)',
                              }}
                              alt={player.name}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <User size={48} className="opacity-40" />
                            </div>
                          )}
                          <div
                            className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16"
                            style={{
                              background: useCardImage || visualConfig.cardBgImage
                                ? 'linear-gradient(to top, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.12) 42%, transparent 100%)'
                                : `linear-gradient(to top, ${activeVisualConfig.cardBg} 0%, ${activeVisualConfig.cardBg}cc 28%, transparent 100%)`,
                            }}
                          />
                       </div>

                       <div className="w-full text-center z-20 space-y-6">
                           <div className="space-y-1" style={{ transform: `translate(${activeTextLayout.nameX ?? 0}px, ${activeTextLayout.nameY ?? 0}px)` }}>
                               <h3 className="uppercase leading-none truncate" style={{ color: activeVisualConfig.playerNameColor, fontFamily: fraggerFontFamily, fontSize: `${cardLayout.playerNameSize}px`, fontWeight: '950' }}>{player.name}</h3>
                               <p className="font-black uppercase tracking-[0.2em]" style={{ color: activeVisualConfig.teamNameColor, fontFamily: fraggerFontFamily, fontSize: `${cardLayout.teamNameSize}px`, opacity: 0.8 }}>{player.team}</p>
                           </div>

                           <div className="space-y-2 w-full">
                               <div className="mx-2 py-3 rounded-lg" style={{ backgroundColor: useCardImage ? 'transparent' : 'rgba(0,0,0,0.1)', transform: `translate(${activeTextLayout.elimsX ?? 0}px, ${activeTextLayout.elimsY ?? 0}px)` }}>
                                   <span className="block leading-none font-black" style={{ color: activeVisualConfig.elimsColor, fontFamily: fraggerFontFamily, fontSize: `${cardLayout.elimsSize}px` }}>{player.elims}</span>
                                   <span className="block text-[10px] font-black uppercase tracking-[0.4em] mt-1.5" style={{ color: activeVisualConfig.elimsColor, fontFamily: fraggerFontFamily, opacity: 0.6 }}>{t('otf.elims')}</span>
                               </div>
                               <div className="mx-2 py-3 rounded-lg" style={{ backgroundColor: useCardImage ? 'transparent' : 'rgba(0,0,0,0.08)', transform: `translate(${activeTextLayout.survivalX ?? 0}px, ${activeTextLayout.survivalY ?? 0}px)` }}>
                                   <span className="block font-black leading-none" style={{ color: activeVisualConfig.survivalColor, fontFamily: fraggerFontFamily, fontSize: `${cardLayout.survivalSize}px` }}>{player.survival}</span>
                                   <span className="block text-[8px] font-black uppercase tracking-[0.4em] mt-1.5" style={{ color: activeVisualConfig.survivalColor, fontFamily: fraggerFontFamily, opacity: 0.6 }}>{t('otf.survivalTime')}</span>
                               </div>
                           </div>
                       </div>
                   </motion.div>
                 );
               })}
           </motion.div>
       </div>
    </motion.div>
    );
  }, [visualConfig, activeVisualConfig, activeTextLayout, typography, fraggerFontFamily, matchInfo, displayFraggers, cardLayout, customImageLayout, fraggerCardAnimConfig, globalLogo, style, visualOnly, monitorFeed, rootMotionProps, activeAnimConfig, feedPlayKey, playKey]);

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
       <header className="h-14 bg-black border-b border-white/10 flex items-center px-6 justify-between shrink-0 relative z-[100]">
        <div className="flex items-center gap-8">
            <div className="flex flex-col cursor-pointer" onClick={onBack}><div className="flex items-center gap-1"><span className="text-white font-[950] italic text-[12px] tracking-tight uppercase leading-none">SETUP</span><span className="text-[#ccff00] font-[950] italic text-[12px] tracking-tight uppercase leading-none">ASSET</span></div><span className="text-[7px] font-black text-zinc-700 tracking-[0.4em] uppercase mt-0.5 leading-none">MASTER CONFIGURATION</span></div>
            <div className="h-6 w-[1px] bg-white/10 mx-1" />
            
            {/* Active Theme Display */}
            <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#ccff00] animate-pulse shadow-[0_0_8px_#ccff00]" />
                <span className="text-white font-black text-[10px] tracking-[0.2em] uppercase italic">
                  {theme.name}
                </span>
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
                {t('otf.assetPanel')}
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
                {t('otf.broadcastPanel')}
              </button>
            </div>
          )}
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all shadow-lg ${isSaving ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-[#ccff00] text-black hover:bg-white hover:scale-105 active:scale-95'}`}
          >
            {isSaving ? <RefreshCw size={12} className="animate-spin" /> : <Settings2 size={12} />}
            {isSaving ? t('otf.streamsSyncing') : t('otf.saveAllChanges')}
          </button>
          <div className="bg-zinc-900/40 border border-white/5 px-2.5 py-1.5 rounded flex items-center gap-2">
            <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">{t('otf.editing')}</span>
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
              <h3 className="text-[7px] font-black text-zinc-700 tracking-[0.3em] uppercase mb-6 whitespace-nowrap italic">{t('otf.availableTemplates')}</h3>
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
                        setProgramAssetId(item.id);
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
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative z-10">
                <div className="max-w-4xl mx-auto space-y-4">
                    <div className="flex bg-zinc-950 p-0.5 rounded-xl border border-white/5 border-l-[3px] border-l-[#ccff00]/40 shadow-2xl mb-8">{['DATA', 'VISUAL', 'ANIMATION'].map(tab => (<button key={tab} onClick={() => setConfigTab(tab as any)} className={`flex-1 py-1.5 text-[8px] font-black tracking-widest uppercase rounded-lg transition-all ${configTab === tab ? 'bg-[#ccff00] text-black' : 'text-zinc-600 hover:text-white'}`}>{tab} INPUT</button>))}</div>

                    {configTab === 'DATA' && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-zinc-900 border border-white/5 rounded-[20px] p-6 space-y-4">
                                    <div className="flex items-center gap-2 mb-2"><Type size={14} className="text-[#ccff00]" /><h3 className="text-[10px] font-black text-zinc-400 tracking-[0.2em] uppercase">{t('otf.mainTitle')}</h3></div>
                                    <input type="text" value={matchInfo.title} onChange={(e) => setMatchInfo({...matchInfo, title: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-xs font-bold text-white uppercase outline-none focus:border-[#ccff00]" />
                                    <div className="grid grid-cols-3 gap-2">
                                        <div><label className="text-[8px] font-black text-zinc-600 uppercase mb-1">{t('otf.size')}</label><ScrollableInput value={typography.title.size} onChange={(val) => setTypography(prev => ({...prev, title: {...prev.title, size: val}}))} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white text-center" /></div>
                                        <div><label className="text-[8px] font-black text-zinc-600 uppercase mb-1">{t('otf.posX')}</label><ScrollableInput value={typography.title.x} onChange={(val) => setTypography(prev => ({...prev, title: {...prev.title, x: val}}))} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white text-center" /></div>
                                        <div><label className="text-[8px] font-black text-zinc-600 uppercase mb-1">{t('otf.posY')}</label><ScrollableInput value={typography.title.y} onChange={(val) => setTypography(prev => ({...prev, title: {...prev.title, y: val}}))} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white text-center" /></div>
                                    </div>
                                </div>
                                <div className="bg-zinc-900 border border-white/5 rounded-[20px] p-6 space-y-4"><div className="flex items-center gap-2 mb-2"><Type size={14} className="text-zinc-500" /><h3 className="text-[10px] font-black text-zinc-400 tracking-[0.2em] uppercase">{t('otf.subtitle')}</h3></div><input type="text" value={matchInfo.subtitle} onChange={(e) => setMatchInfo({...matchInfo, subtitle: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-xs font-bold text-white uppercase outline-none focus:border-[#ccff00]" /><div className="grid grid-cols-3 gap-2"><div><label className="text-[8px] font-black text-zinc-600 uppercase mb-1">{t('otf.size')}</label><ScrollableInput value={typography.subtitle.size} onChange={(val) => setTypography(prev => ({...prev, subtitle: {...prev.subtitle, size: val}}))} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white text-center" /></div><div><label className="text-[8px] font-black text-zinc-600 uppercase mb-1">{t('otf.posX')}</label><ScrollableInput value={typography.subtitle.x} onChange={(val) => setTypography(prev => ({...prev, subtitle: {...prev.subtitle, x: val}}))} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white text-center" /></div><div><label className="text-[8px] font-black text-zinc-600 uppercase mb-1">{t('otf.posY')}</label><ScrollableInput value={typography.subtitle.y} onChange={(val) => setTypography(prev => ({...prev, subtitle: {...prev.subtitle, y: val}}))} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white text-center" /></div></div></div>
                             </div>

                             <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.25em]">
                                      MATCH {currentMatch} · {aliveTeamCount} tim hidup
                                    </p>
                                    <p className="text-[7px] text-zinc-600 normal-case mt-1 leading-relaxed">
                                      {matchReadyForFraggerSync
                                        ? 'Winner / 1 tim tersisa — Top 5 otomatis dari kill match + Project DB.'
                                        : 'Kill mengikuti Overall Ranking. Saat winner, slot terisi otomatis.'}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => syncTopFraggersFromMatch(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#ccff00]/10 border border-[#ccff00]/30 text-[#ccff00] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#ccff00] hover:text-black transition-all"
                                  >
                                    <Database size={12} />
                                    {t('otf.syncTop5FromMatch')}
                                  </button>
                                </div>
                                {projectPlayers.length === 0 && (
                                  <p className="text-[7px] text-amber-500/90 normal-case leading-relaxed border border-amber-500/20 bg-amber-500/5 rounded-lg px-3 py-2">
                                    Project DB kosong di layar ini. Buka asset dari <strong className="font-black">Global Studio</strong> / project yang punya roster pemain agar tombol LOAD FROM PROJECT DB aktif.
                                  </p>
                                )}
                             </div>

                             <div className="space-y-2">
                                <h3 className="text-[8px] font-black text-zinc-600 tracking-[0.4em] uppercase italic mb-4">
                                  {t('otf.fraggerDataNodes')}
                                </h3>
                                {fraggers.map((player, idx) => (
                                    <div key={idx} className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl hover:border-[#ccff00]/20 transition-all group flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[#ccff00] text-black font-black text-xs flex items-center justify-center">#{player.rank}</div>
                                                <h4 className="text-xs font-black text-white tracking-widest uppercase">RANK_{player.rank}_NODE</h4>
                                            </div>
                                            {/* DATABASE LOAD BUTTON */}
                                            <button 
                                                onClick={() => openDbModal(idx)}
                                                className="flex items-center gap-2 px-4 py-1.5 bg-[#ccff00]/10 border border-[#ccff00]/20 text-[#ccff00] rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#ccff00] hover:text-black transition-all shadow-[0_0_15px_rgba(204,255,0,0.1)]"
                                            >
                                                <Database size={12} /> {t('otf.loadFromProjectDb')}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-12 gap-3 items-end">
                                            <div className="col-span-4 space-y-1"><label className="text-[7px] font-black text-zinc-700 tracking-widest ml-1">{t('otf.playerName')}</label><input type="text" value={player.name} onChange={(e) => updateFragger(idx, 'name', e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-bold text-white uppercase outline-none focus:border-[#ccff00]" /></div>
                                            <div className="col-span-3 space-y-1"><label className="text-[7px] font-black text-zinc-700 tracking-widest ml-1">{t('otf.teamIdent')}</label><input type="text" value={player.team} onChange={(e) => updateFragger(idx, 'team', e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase outline-none focus:border-[#ccff00]" /></div>
                                            <div className="col-span-2 space-y-1"><label className="text-[7px] font-black text-zinc-700 tracking-widest ml-1">{t('otf.elims')}</label><ScrollableInput value={player.elims} onChange={(val) => updateFragger(idx, 'elims', val)} className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-black text-[#ccff00] text-center" /></div>
                                            <div className="col-span-2 space-y-1"><label className="text-[7px] font-black text-zinc-700 tracking-widest ml-1">{t('otf.damage')}</label><ScrollableInput value={player.damage} onChange={(val) => updateFragger(idx, 'damage', val)} className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-black text-blue-500 text-center" /></div>
                                            <div className="col-span-1 space-y-1"><label className="text-[7px] font-black text-zinc-700 tracking-widest ml-1">{t('otf.surv')}</label><input type="text" value={player.survival} onChange={(e) => updateFragger(idx, 'survival', e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-bold text-white uppercase text-center" /></div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}

                    {configTab === 'VISUAL' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                           {/* Pemisah mode: DEFAULT (desain bawaan) vs CUSTOM (background sendiri) */}
                           <div className="p-4 bg-zinc-950 border border-white/5 rounded-xl">
                                <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                  <LayoutTemplate size={12} className="text-[#ccff00]" />
                                  Design Mode
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setVisualConfig({ ...visualConfig, useCustomBackground: false })}
                                        className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${!visualConfig.useCustomBackground ? 'bg-[#ccff00] text-black border-[#ccff00]' : 'bg-black text-zinc-500 border-white/10 hover:border-white/20'}`}
                                    >
                                        Default
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setVisualConfig({ ...visualConfig, useCustomBackground: true })}
                                        className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${visualConfig.useCustomBackground ? 'bg-[#ccff00] text-black border-[#ccff00]' : 'bg-black text-zinc-500 border-white/10 hover:border-white/20'}`}
                                    >
                                        Custom
                                    </button>
                                </div>
                           </div>
                           <div className="p-6 bg-zinc-900 border border-white/5 rounded-[20px] shadow-sm">
                                <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                  <Type size={12} className="text-[#ccff00]" />
                                  {t('otf.fontTypeTopFragger')}
                                </h3>
                                <p className="text-[7px] text-zinc-500 normal-case mb-3 leading-relaxed">
                                  {t('otf.fontTypeDesc')}
                                </p>
                                <OverlayFontFamilySelect
                                  value={(typography as { fontFamilyId?: string }).fontFamilyId}
                                  onChange={(fontFamilyId) =>
                                    setTypography((prev) => ({ ...prev, fontFamilyId }))
                                  }
                                />
                           </div>
                           <div className="p-4 bg-zinc-950 border border-white/5 rounded-xl">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                  <h4 className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2"><Type size={12} className="text-[#ccff00]" />Warna Teks</h4>
                                  <button
                                    type="button"
                                    onClick={resetVisualColorsToDefault}
                                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-black px-3 py-2 text-[8px] font-black uppercase tracking-widest text-zinc-400 transition-all hover:border-[#ccff00]/50 hover:text-[#ccff00]"
                                  >
                                    <RefreshCw size={11} />
                                    Reset Default
                                  </button>
                                </div>
                                <div className="grid grid-cols-4 gap-4">
                                    <div><label className="text-[7px] font-bold text-zinc-500 uppercase block mb-1">{t('otf.colorTitle')}</label><input type="color" value={activeVisualConfig.titleColor} onChange={(e) => patchActiveVisualConfig({ titleColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-500 uppercase block mb-1">Subtitle</label><input type="color" value={activeVisualConfig.subtitleText} onChange={(e) => patchActiveVisualConfig({ subtitleText: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-500 uppercase block mb-1">Sub BG</label><input type="color" value={activeVisualConfig.subtitleBg} onChange={(e) => patchActiveVisualConfig({ subtitleBg: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-500 uppercase block mb-1">Player</label><input type="color" value={activeVisualConfig.playerNameColor} onChange={(e) => patchActiveVisualConfig({ playerNameColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-500 uppercase block mb-1">Team</label><input type="color" value={activeVisualConfig.teamNameColor} onChange={(e) => patchActiveVisualConfig({ teamNameColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-500 uppercase block mb-1">Elims</label><input type="color" value={activeVisualConfig.elimsColor} onChange={(e) => patchActiveVisualConfig({ elimsColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-500 uppercase block mb-1">Survival</label><input type="color" value={activeVisualConfig.survivalColor} onChange={(e) => patchActiveVisualConfig({ survivalColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-500 uppercase block mb-1">Rank</label><input type="color" value={activeVisualConfig.rankColor} onChange={(e) => patchActiveVisualConfig({ rankColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                                    {!visualConfig.useCustomBackground && (
                                      <div><label className="text-[7px] font-bold text-zinc-500 uppercase block mb-1">{t('otf.colorCardBase')}</label><input type="color" value={activeVisualConfig.cardBg} onChange={(e) => patchActiveVisualConfig({ cardBg: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                                    )}
                                </div>
                           </div>
                           <div className="p-6 bg-zinc-900 border border-white/5 rounded-[20px] shadow-sm">
                                <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Move size={12} className="text-[#ccff00]" />Posisi Teks Kartu</h3>
                                <div className="grid grid-cols-3 gap-3 items-center mb-2">
                                    <span></span>
                                    <span className="text-[7px] font-bold text-zinc-600 uppercase text-center">X</span>
                                    <span className="text-[7px] font-bold text-zinc-600 uppercase text-center">Y</span>
                                </div>
                                <div className="space-y-2.5">
                                    <div className="grid grid-cols-3 gap-3 items-center">
                                        <span className="text-[8px] font-black text-zinc-400 uppercase">Rank</span>
                                        <ScrollableInput value={activeTextLayout.rankX ?? 0} onChange={(val) => patchActiveTextLayout({ rankX: val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" />
                                        <ScrollableInput value={activeTextLayout.rankY ?? 0} onChange={(val) => patchActiveTextLayout({ rankY: val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 items-center">
                                        <span className="text-[8px] font-black text-zinc-400 uppercase">Nama & Tim</span>
                                        <ScrollableInput value={activeTextLayout.nameX ?? 0} onChange={(val) => patchActiveTextLayout({ nameX: val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" />
                                        <ScrollableInput value={activeTextLayout.nameY ?? 0} onChange={(val) => patchActiveTextLayout({ nameY: val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 items-center">
                                        <span className="text-[8px] font-black text-zinc-400 uppercase">Elims</span>
                                        <ScrollableInput value={activeTextLayout.elimsX ?? 0} onChange={(val) => patchActiveTextLayout({ elimsX: val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" />
                                        <ScrollableInput value={activeTextLayout.elimsY ?? 0} onChange={(val) => patchActiveTextLayout({ elimsY: val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 items-center">
                                        <span className="text-[8px] font-black text-zinc-400 uppercase">Survival</span>
                                        <ScrollableInput value={activeTextLayout.survivalX ?? 0} onChange={(val) => patchActiveTextLayout({ survivalX: val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" />
                                        <ScrollableInput value={activeTextLayout.survivalY ?? 0} onChange={(val) => patchActiveTextLayout({ survivalY: val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" />
                                    </div>
                                </div>
                                <p className="text-[7px] text-zinc-600 mt-3 leading-relaxed">Geser teks kartu (X = horizontal, Y = vertikal). Berlaku untuk semua kartu.</p>
                           </div>
                           {visualConfig.useCustomBackground && (
                           <div className="p-4 bg-zinc-950 border border-white/5 rounded-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2"><ImageIcon size={12} className="text-[#ccff00]" />Background Kartu</h4>
                                    {visualConfig.bgImage && (
                                        <button
                                            type="button"
                                            onClick={() => setVisualConfig({ ...visualConfig, bgImage: null })}
                                            className="px-2 py-1 bg-red-500/10 border border-red-500/30 rounded text-red-400 hover:bg-red-500/20 transition-colors text-[7px] font-black uppercase tracking-widest flex items-center gap-1"
                                        >
                                            <Trash2 size={10} />Hapus
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-3 py-3 bg-black border border-dashed border-white/15 rounded-lg text-[8px] font-black text-zinc-400 uppercase tracking-widest hover:border-[#ccff00]/50 hover:text-[#ccff00] transition-colors">
                                        <Upload size={12} />
                                        {visualConfig.bgImage ? 'Ganti Gambar' : 'Upload Gambar Kartu'}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                handleBgImageUpload(e.target.files?.[0]);
                                                e.target.value = '';
                                            }}
                                        />
                                    </label>
                                    {visualConfig.bgImage && (
                                        <div className="w-16 h-9 rounded border border-white/10 overflow-hidden shrink-0 bg-black">
                                            <img src={visualConfig.bgImage} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-[7px] text-zinc-600 mt-2 leading-relaxed">Gambar dipakai sebagai background tiap kartu (mengganti warna hijau). Kosongkan untuk pakai warna kartu.</p>
                           </div>
                           )}
                           <div className="p-6 bg-zinc-900 border border-white/5 rounded-[20px] shadow-sm">
                                <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Move size={12} className="text-blue-500" />{t('otf.playerImageControl')}</h3>
                                <div className="grid grid-cols-4 gap-3">
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('otf.scalePct')}</label><ScrollableInput value={(activeImageControlLayout.playerScale ?? TOP_FRAGGERS_PLAYER_IMAGE_BASE.scale) - TOP_FRAGGERS_PLAYER_IMAGE_BASE.scale} onChange={(val) => patchActiveImageControlLayout({ playerScale: TOP_FRAGGERS_PLAYER_IMAGE_BASE.scale + val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('otf.heightPx')}</label><ScrollableInput value={(activeImageControlLayout.playerHeight ?? TOP_FRAGGERS_PLAYER_IMAGE_BASE.height) - TOP_FRAGGERS_PLAYER_IMAGE_BASE.height} onChange={(val) => patchActiveImageControlLayout({ playerHeight: TOP_FRAGGERS_PLAYER_IMAGE_BASE.height + val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('otf.posX')}</label><ScrollableInput value={(activeImageControlLayout.playerX ?? TOP_FRAGGERS_PLAYER_IMAGE_BASE.x) - TOP_FRAGGERS_PLAYER_IMAGE_BASE.x} onChange={(val) => patchActiveImageControlLayout({ playerX: TOP_FRAGGERS_PLAYER_IMAGE_BASE.x + val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('otf.posY')}</label><ScrollableInput value={(activeImageControlLayout.playerY ?? TOP_FRAGGERS_PLAYER_IMAGE_BASE.y) - TOP_FRAGGERS_PLAYER_IMAGE_BASE.y} onChange={(val) => patchActiveImageControlLayout({ playerY: TOP_FRAGGERS_PLAYER_IMAGE_BASE.y + val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                 </div>
                            </div>
                            <div className="p-6 bg-zinc-900 border border-white/5 rounded-[20px] shadow-sm">
                                 <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Move size={12} className="text-[#ccff00]" />{t('otf.watermarkLogoControl')}</h3>
                                 <div className="grid grid-cols-4 gap-3">
                                     <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('otf.scalePct')}</label><ScrollableInput value={(activeImageControlLayout.bgLogoScale ?? TOP_FRAGGERS_BG_LOGO_BASE.scale) - TOP_FRAGGERS_BG_LOGO_BASE.scale} onChange={(val) => patchActiveImageControlLayout({ bgLogoScale: TOP_FRAGGERS_BG_LOGO_BASE.scale + val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                     <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('otf.opacityPct')}</label><ScrollableInput value={activeImageControlLayout.bgLogoOpacity ?? TOP_FRAGGERS_BG_LOGO_BASE.opacity} onChange={(val) => patchActiveImageControlLayout({ bgLogoOpacity: val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                     <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('otf.posX')}</label><ScrollableInput value={(activeImageControlLayout.bgLogoX ?? TOP_FRAGGERS_BG_LOGO_BASE.x) - TOP_FRAGGERS_BG_LOGO_BASE.x} onChange={(val) => patchActiveImageControlLayout({ bgLogoX: TOP_FRAGGERS_BG_LOGO_BASE.x + val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                     <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">{t('otf.posY')}</label><ScrollableInput value={(activeImageControlLayout.bgLogoY ?? TOP_FRAGGERS_BG_LOGO_BASE.y) - TOP_FRAGGERS_BG_LOGO_BASE.y} onChange={(val) => patchActiveImageControlLayout({ bgLogoY: TOP_FRAGGERS_BG_LOGO_BASE.y + val })} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                </div>
                           </div>
                        </div>
                    )}

                      {configTab === 'ANIMATION' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                             <div className="grid grid-cols-2 gap-4">
                                <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                                    <h4 className="text-[10px] font-black text-zinc-400 tracking-widest uppercase mb-4">{t('otf.inTransition')}</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['fade', 'slide-right', 'slide-left', 'slide-up', 'slide-down'].map(type => (
                                            <button 
                                                key={type}
                                                onClick={() => setDraftAnimationConfig({...draftAnimationConfig, inType: type as any})}
                                                className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${draftAnimationConfig.inType === type ? 'bg-[#ccff00] text-black shadow-[0_0_15px_rgba(204,255,0,0.2)]' : 'bg-black/40 text-zinc-600 hover:text-white border border-white/5'}`}
                                            >
                                                {type.replace('-', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                                    <h4 className="text-[10px] font-black text-zinc-400 tracking-widest uppercase mb-4">{t('otf.outTransition')}</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['fade', 'slide-right', 'slide-left', 'slide-up', 'slide-down'].map(type => (
                                            <button 
                                                key={type}
                                                onClick={() => setDraftAnimationConfig({...draftAnimationConfig, outType: type as any})}
                                                className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${draftAnimationConfig.outType === type ? 'bg-[#ccff00] text-black shadow-[0_0_15px_rgba(204,255,0,0.2)]' : 'bg-black/40 text-zinc-600 hover:text-white border border-white/5'}`}
                                            >
                                                {type.replace('-', ' ')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                             </div>

                             <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-zinc-400 tracking-widest uppercase italic">{t('otf.behaviorConfig')}</h4>
                                    <button 
                                        onClick={() => setDraftAnimationConfig({...draftAnimationConfig, useSpring: !draftAnimationConfig.useSpring})}
                                        className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${draftAnimationConfig.useSpring ? 'bg-[#ccff00]/10 text-[#ccff00] border border-[#ccff00]/20' : 'bg-white/5 text-zinc-600 border border-white/10'}`}
                                    >
                                        {draftAnimationConfig.useSpring ? t('otf.springPhysicsOn') : t('otf.linearInterpolation')}
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-zinc-600 tracking-widest uppercase">{t('otf.durationS')}</label>
                                        <ScrollableInput 
                                            value={draftAnimationConfig.duration} 
                                            onChange={(val) => setDraftAnimationConfig({...draftAnimationConfig, duration: Math.max(0.1, val)})} 
                                            className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black text-white text-center" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-zinc-600 tracking-widest uppercase">{t('otf.delayS')}</label>
                                        <ScrollableInput 
                                            value={draftAnimationConfig.delay} 
                                            onChange={(val) => setDraftAnimationConfig({...draftAnimationConfig, delay: Math.max(0, val)})} 
                                            className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black text-white text-center" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-zinc-600 tracking-widest uppercase">{t('otf.easing')}</label>
                                        <select 
                                            value={draftAnimationConfig.easing}
                                            onChange={(e) => setDraftAnimationConfig({...draftAnimationConfig, easing: e.target.value as any})}
                                            className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black text-white outline-none"
                                        >
                                            <option value="easeOut">EASE OUT</option>
                                            <option value="easeInOut">EASE IN OUT</option>
                                            <option value="backOut">BACK OUT</option>
                                            <option value="linear">LINEAR</option>
                                        </select>
                                    </div>
                                </div>
                             </div>

                             {/* Tab-Specific Save Button */}
                             <div className="pt-6 border-t border-white/5">
                                <button 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className={`w-full flex items-center justify-center gap-3 py-5 rounded-2xl text-[11px] font-[1000] tracking-[0.2em] uppercase transition-all shadow-2xl ${isSaving ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-[#ccff00] text-black hover:bg-white hover:scale-[1.02] active:scale-95 shadow-[#ccff00]/20'}`}
                                >
                                    {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Settings2 size={16} />}
                                    {isSaving ? t('otf.updatingBroadcastNode') : t('otf.saveAnimationProtocol')}
                                </button>
                                <p className="text-[8px] font-black text-center text-zinc-700 tracking-widest uppercase mt-4 italic opacity-50">{t('otf.transmittingConfig')}</p>
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
                      <h2 className="text-4xl font-black text-[#ccff00] mb-4">{t('otf.assetPlaying')}</h2>
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

      {/* PROJECT PERSONNEL DATABASE MODAL */}
      {isDbSelectorOpen && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-in fade-in" onClick={() => setIsDbSelectorOpen(null)} />
            
            <div className="relative w-full max-w-[580px] bg-[#0c0c0c] border border-white/10 rounded-[32px] overflow-hidden flex flex-col max-h-[520px] shadow-2xl animate-in zoom-in-95 duration-300">
                {/* Header Container */}
                <div className="p-8 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#ccff00] flex items-center justify-center text-black shrink-0 shadow-[0_0_20px_#ccff0033]">
                            <Database size={20} fill="black" />
                        </div>
                        <div className="flex flex-col">
                            <h3 className="text-xl font-[1000] italic text-white tracking-tighter uppercase leading-none">{t('otf.projectPersonnelDatabase')}</h3>
                            <p className="text-[10px] font-black text-[#ccff00] tracking-[0.3em] uppercase mt-2">LINKING TO RANK #{isDbSelectorOpen.rankIndex + 1} SLOT</p>
                        </div>
                    </div>
                    <button onClick={() => setIsDbSelectorOpen(null)} className="p-2 text-zinc-600 hover:text-white transition-colors">
                        <Trash2 size={22} />
                    </button>
                </div>

                {/* Search Input Area */}
                <div className="px-8 py-6 space-y-4">
                    {/* Team Filter Dropdown */}
                    <div className="relative group">
                        <select
                            value={selectedTeamFilter}
                            onChange={(e) => setSelectedTeamFilter(e.target.value)}
                            className="w-full bg-[#151515] border border-white/5 rounded-2xl py-4 pl-6 pr-10 text-[10px] font-black text-[#ccff00] uppercase outline-none focus:border-[#ccff00]/30 appearance-none cursor-pointer tracking-widest shadow-inner hover:border-[#ccff00]/20 transition-all"
                        >
                            <option value="ALL">{t('otf.allTeams')}</option>
                            {uniqueTeams.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ChevronDown size={14} className="text-zinc-500" />
                        </div>
                        <div className="absolute left-6 -top-2 bg-[#0c0c0c] px-2 text-[8px] font-black text-zinc-600 tracking-[0.2em] uppercase pointer-events-none">{t('otf.filterByTeam')}</div>
                    </div>

                    <p className="text-[7px] text-zinc-500 normal-case leading-relaxed px-1">
                      {selectedTeamFilter === 'ALL'
                        ? `Semua tim · ${filteredDbPlayers.length} pemain · urut kill tertinggi (match ${currentMatch})`
                        : `${selectedTeamFilter} · ${filteredDbPlayers.length} pemain · urut kill tim`}
                    </p>

                    <div className="relative group">
                        <input 
                            type="text" 
                            value={dbSearch}
                            onChange={(e) => setDbSearch(e.target.value)}
                            placeholder={t('otf.searchPlayerOrTeam')}
                            className="w-full bg-[#111] border border-white/5 rounded-2xl py-5 pl-8 pr-12 text-xs font-[1000] text-zinc-500 placeholder:text-zinc-800 outline-none focus:border-[#ccff00]/30 focus:text-white transition-all uppercase tracking-widest shadow-inner"
                        />
                    </div>
                </div>

                {/* Results List Area */}
                <div className="flex-1 overflow-y-auto px-8 pb-10 custom-scrollbar space-y-3">
                    {filteredDbPlayers.length > 0 ? (
                        filteredDbPlayers.map((p, listIdx) => (
                            <button 
                                key={p.id || `${p.team}-${p.name}`}
                                onClick={() => handleLoadFromDb(isDbSelectorOpen.rankIndex, p)}
                                className="w-full bg-[#151515] border border-white/5 p-5 rounded-[24px] hover:border-[#ccff00]/40 transition-all flex items-center gap-6 group text-left shadow-sm"
                            >
                                <div className="w-10 shrink-0 flex flex-col items-center justify-center">
                                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">#{listIdx + 1}</span>
                                  <span className="text-lg font-[1000] text-[#ccff00] leading-none tabular-nums">{p.elims}</span>
                                  <span className="text-[7px] font-black text-zinc-600 uppercase">K</span>
                                </div>
                                {/* Initial / Profile Icon */}
                                <div className="w-14 h-14 rounded-2xl bg-[#0c0c0c] border border-white/5 flex items-center justify-center shrink-0 shadow-inner group-hover:border-[#ccff00]/20 transition-all overflow-hidden">
                                    {p.image ? (
                                        <img src={p.image} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-zinc-800"><User size={28} /></div>
                                    )}
                                </div>
                                
                                <div className="flex flex-col min-w-0 flex-1">
                                    <h4 className="text-3xl font-[1000] text-white uppercase tracking-tighter leading-[0.8] mb-2 group-hover:text-[#ccff00] transition-colors truncate">
                                        {p.name}
                                    </h4>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Shield size={12} className="text-zinc-600 group-hover:text-blue-500 transition-colors" />
                                        <span className="text-[10px] font-black text-zinc-600 group-hover:text-zinc-400 uppercase tracking-[0.2em] transition-colors">
                                            {p.team}
                                        </span>
                                        <span className="text-[9px] font-black text-[#ccff00] uppercase tracking-widest px-2 py-0.5 rounded bg-[#ccff00]/10 border border-[#ccff00]/20">
                                          {p.elims ?? 0} K · M{currentMatch}
                                        </span>
                                    </div>
                                </div>

                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-700 group-hover:text-[#ccff00] group-hover:border-[#ccff00]/30 transition-all">
                                    <ChevronRight size={18} strokeWidth={3} />
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="py-12 text-center border border-dashed border-white/10 rounded-[32px] px-6">
                            <User size={48} className="mx-auto mb-4 text-zinc-700" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                              {personnelDbRows.length === 0
                                ? 'BELUM ADA DATA PEMAIN'
                                : 'TIDAK ADA PEMAIN SESUAI FILTER'}
                            </p>
                            <p className="text-[8px] text-zinc-600 normal-case mt-2 leading-relaxed">
                              {personnelDbRows.length === 0
                                ? 'Isi roster di Project DB atau nama pemain di Overall Ranking (DATA), lalu buka modal ini lagi.'
                                : 'Coba ALL TEAMS atau kosongkan kolom pencarian.'}
                            </p>
                        </div>
                    )}
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

export default OverlayTopFraggersView;
