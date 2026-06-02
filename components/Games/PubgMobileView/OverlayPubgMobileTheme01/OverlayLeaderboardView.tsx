
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSharedState } from '@/lib/useSharedState';
import { 
  Database, Palette, Activity, LayoutTemplate, 
  ChevronDown, Check, Settings2, Swords, Type, Move,
  Upload, Trash2, RotateCcw, ArrowRight, Minus, Plus, RefreshCw,
  Shield, X, Trophy, Skull, Zap, AlertTriangle, Target,
  Monitor, ChevronUp, AlertCircle, ShieldCheck, Info,
  ListOrdered, Flag, Search, Globe, Play, Square, Save,
  ArrowDownLeft, ArrowUpRight, Maximize2, Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Theme, Asset, Game, PlayerData } from '../../../../types';
import PanelControlMonitor, { PreviewControlContext } from '../../../PanelControlMonitor';
import PlacementScoringModal from '../PlacementScoringModal';
import TieBreakerModal, { TieBreakerCriteria } from '../TieBreakerModal';

interface Team {
  rank: number;
  team: string;
  country: string;
  teamLogo: string;
  status: number[];
  playerNames: string[];
  playerKills: number[];
  points: number;
  totalPlacementPoints: number;
  totalWwcds: number;
  active: boolean;
  expanded: boolean;
  placementRank: number | null;
}

interface VisualConfig {
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
}

interface LayoutConfig {
  scale: number;
  xOffset: number;
  yOffset: number;
  rowHeight: number;
  fontSize: number;
  logoSize: number;
  flagWidth: number;
}

import {
  AnimationConfig,
  ANIMATION_PRESETS,
  getAnimationVariants,
  resolveAnimationConfig,
} from '@/constants/transitions';
import { notifyCompanionAnimation } from '@/lib/overlayAnimation';
import { notifyCompanionData } from '@/lib/overlayData';

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

const INITIAL_LEADERBOARD_DATA = Array.from({ length: 16 }, (_, i) => ({
  rank: i + 1,
  team: `TEAM ${String.fromCharCode(65 + i)}`,
  country: 'ID',
  teamLogo: '',
  status: [1, 1, 1, 1], // 0:Dead, 1:Alive, 2:Knock
  playerNames: ['P1', 'P2', 'P3', 'P4'],
  playerKills: [0, 0, 0, 0],
  points: 0,
  totalPlacementPoints: 0, 
  totalWwcds: 0, 
  active: true,
  expanded: false,
  placementRank: null as number | null 
}));

const INITIAL_VISUAL_CONFIG = {
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
  statusText: '#ffffff'
};

const OverlayLeaderboardView: React.FC<OverlayLeaderboardViewProps> = ({ 
  asset, theme, availableAssets, userRole, onBack, onSelectAsset, onSelectTheme, projectPlayers = [], isGlobalStudio = false, showMonitorProp = true,
  programAssetIdProp, onProgramAssetChange, getAssetStatusProp, onPreviewContentChange, visualOnly = false, style
}) => {
  const [configTab, setConfigTab] = useState<'DATA' | 'VISUAL' | 'ANIMATION'>('DATA');
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

  const [isDbSelectorOpen, setIsDbSelectorOpen] = useState<{ rankIndex: number } | null>(null);
  const [dbSearch, setDbSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { replay } = React.useContext(PreviewControlContext);

  const handleSave = () => {
    setIsSaving(true);
    
    // Commit draft to shared state
    setAnimationConfig(draftAnimationConfig);
    
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

  const [visualConfig, setVisualConfig] = useSharedState<VisualConfig>('BROHUBS_LEADERBOARD_VISUAL', INITIAL_VISUAL_CONFIG);

  const [layoutConfig, setLayoutConfig] = useSharedState<LayoutConfig>('BROHUBS_LEADERBOARD_LAYOUT', {
      scale: 80,
      xOffset: -40,
      yOffset: 75,
      rowHeight: 52,
      fontSize: 18,
      logoSize: 32,
      flagWidth: 24
  });

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
        
        // Only update if difference exists
        if (team.teamLogo === newLogo && 
            team.country === newCountry &&
            JSON.stringify(team.playerNames) === JSON.stringify(newNames)
        ) return team;

        needsSync = true;
        return {
            ...team,
            teamLogo: newLogo,
            country: newCountry,
            playerNames: newNames
        };
    });

    if (needsSync) {
        setTeams(newTeams);
    }
  }, [projectPlayers]);

  // Persistence Effects removed as useSharedState handles it

  const aliveTeams = teams.filter(t => t.active && !t.status.every(s => s === 0));
  const aliveCount = aliveTeams.length;
  const isMatchReadyToEnd = aliveCount === 1;
  const matchWinner = isMatchReadyToEnd ? aliveTeams[0] : null;

  const showEliminationPopup = (rank: number) => {
    setActivePopups(prev => [...prev, rank]);
    setTimeout(() => {
        setActivePopups(prev => prev.filter(r => r !== rank));
    }, 3000); 
  };

  const handleApplyScoring = (newRules: number[], newKillPoints: number) => {
    setScoringRules(newRules);
    setKillPointValue(newKillPoints);
    setIsScoringModalOpen(false);
  };

  const handleApplyTieBreaker = (newOrder: TieBreakerCriteria[]) => {
    setTieBreakerOrder(newOrder);
    setIsTieBreakerModalOpen(false);
  };

  const [fraggers, setFraggers] = useSharedState('BROHUBS_TOPFRAGGERS_DATA', [
      { rank: 1, name: 'PLAYER 1', team: 'TEAM A', teamLogo: '', elims: 0, damage: 0, survival: '0 M 00 S', image: '' },
      { rank: 2, name: 'PLAYER 2', team: 'TEAM B', teamLogo: '', elims: 0, damage: 0, survival: '0 M 00 S', image: '' },
      { rank: 3, name: 'PLAYER 3', team: 'TEAM C', teamLogo: '', elims: 0, damage: 0, survival: '0 M 00 S', image: '' },
      { rank: 4, name: 'PLAYER 4', team: 'TEAM D', teamLogo: '', elims: 0, damage: 0, survival: '0 M 00 S', image: '' },
      { rank: 5, name: 'PLAYER 5', team: 'TEAM E', teamLogo: '', elims: 0, damage: 0, survival: '0 M 00 S', image: '' },
  ]);

  // Push team / player / layout data to OBS output links (debounced)
  useEffect(() => {
    if (visualOnly) return;
    const timer = setTimeout(() => {
      notifyCompanionData({
        assetId: asset.id,
        data: {
          BROHUBS_LEADERBOARD_TEAMS: teams,
          BROHUBS_LEADERBOARD_TITLE: matchTitle,
          BROHUBS_LEADERBOARD_MATCH: currentMatch,
          BROHUBS_LEADERBOARD_VISUAL: visualConfig,
          BROHUBS_LEADERBOARD_LAYOUT: layoutConfig,
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
    fraggers,
    visualOnly,
  ]);

  const handleResetAll = () => {
    if (window.confirm("RESET SELURUH DATA (POIN, KILL, DAN STATUS)?")) {
        setTeams(prevTeams => prevTeams.map(t => ({ 
          ...t, 
          points: 0, 
          totalPlacementPoints: 0, 
          totalWwcds: 0,
          playerKills: [0, 0, 0, 0],
          status: [1, 1, 1, 1],
          placementRank: null
        })));
        setCurrentMatch(1);
        setNextPlacementRank(16);
        setActivePopups([]);
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
    const updatedTeams = teams.map((t) => {
        let pRank = t.placementRank;
        if (t.active && pRank === null) {
            pRank = 1; 
        }

        const placementPoints = pRank ? (scoringRules[pRank - 1] || 0) : 0;
        const currentKills = t.playerKills.reduce((a, b) => a + b, 0);
        const killPoints = currentKills * killPointValue;
        
        return {
            ...t,
            points: t.points + placementPoints + killPoints, 
            totalPlacementPoints: t.totalPlacementPoints + placementPoints, 
            totalWwcds: t.totalWwcds + (pRank === 1 ? 1 : 0), 
            playerKills: [0, 0, 0, 0], 
            status: [1, 1, 1, 1], 
            placementRank: null
        };
    });

    setTeams(updatedTeams);
    setCurrentMatch(targetMatch);
    setNextPlacementRank(16);
    setActivePopups([]);
  };

  const confirmEndMatchExecution = () => {
    startNewMatch(currentMatch + 1);
    setIsEndMatchModalOpen(false);
  };

  const setPlayerStatus = (teamIndex: number, playerIndex: number, status: number) => {
    const teamBefore = teams[teamIndex];
    if (!teamBefore) return;

    const newTeams = teams.map((t, idx) => {
        if (idx !== teamIndex) return t;
        const updatedTeam = { ...t };
        const current = updatedTeam.status[playerIndex];
        const updatedStatus = [...updatedTeam.status];
        
        // Toggle: if the same status is clicked, revert to 1 (Alive), else set to status
        const targetStatus = current === status ? 1 : status;
        updatedStatus[playerIndex] = targetStatus;
        
        // Critical rule: if there are no ALIVE (1) players left in this team,
        // then all KNOCKED (2) players automatically become DEAD (0), which means the team is fully eliminated ([0,0,0,0])!
        if (!updatedStatus.includes(1)) {
            for (let i = 0; i < updatedStatus.length; i++) {
                if (updatedStatus[i] === 2) {
                    updatedStatus[i] = 0;
                }
            }
        }
        
        updatedTeam.status = updatedStatus as [number, number, number, number];
        return updatedTeam;
    });

    const teamAfter = newTeams[teamIndex];
    const wasEliminated = teamBefore.status.every(s => s === 0);
    const isEliminated = teamAfter.status.every(s => s === 0);

    if (isEliminated && !wasEliminated) {
        const assignedRanks = newTeams
            .filter((_, idx) => idx !== teamIndex)
            .map(t => t.placementRank)
            .filter(r => r !== null) as number[];
        
        const nextRank = newTeams.length - assignedRanks.length;
        teamAfter.placementRank = nextRank;
        
        setNextPlacementRank(16 - (assignedRanks.length + 1));
        showEliminationPopup(teamAfter.rank);
    } else if (!isEliminated && wasEliminated) {
        if (teamAfter.placementRank !== null) {
            teamAfter.placementRank = null;
            const assignedRanks = newTeams
                .filter((_, idx) => idx !== teamIndex)
                .map(t => t.placementRank)
                .filter(r => r !== null) as number[];
            
            setNextPlacementRank(16 - assignedRanks.length);
        }
    }

    setTeams(newTeams);
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

  const getAssetAnimationVariants = useCallback(() => {
    return getAnimationVariants(effectiveAnimationConfig);
  }, [effectiveAnimationConfig]);

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

  const livePreviewContent = useMemo(() => (
    <motion.div 
      {...getAssetAnimationVariants()}
      style={style}
      className={`w-[1920px] h-[1080px] bg-transparent relative overflow-hidden font-sans select-none ${style?.position === 'absolute' ? '' : 'mx-auto'}`}
    >
       {/* Checkerboard Background for Transparency Visualization */}
       {!visualOnly && (
         <div className="absolute inset-0 opacity-40" style={{ 
             backgroundImage: 'conic-gradient(#0a0a0a 90deg, #050505 90deg 180deg, #0a0a0a 180deg 270deg, #050505 270deg)',
             backgroundSize: '40px 40px' 
         }} />
       )}
       
       {showOverlay && (
         <div 
           className="absolute right-0 top-0 bottom-0 w-[420px] flex flex-col justify-center py-12 origin-right"
           style={{ 
             right: `${-layoutConfig.xOffset}px`,
             top: `${layoutConfig.yOffset}px`,
             transformOrigin: 'right center',
             scale: layoutConfig.scale / 100
           }}
         >
              <div className="rounded-t-xl text-center py-4 shadow-2xl relative z-20 border-b-2 border-black/10 shrink-0" style={{ backgroundColor: visualConfig.headerBg }}>
                 <h2 className="text-3xl tracking-widest uppercase font-[900] drop-shadow-md" style={{ color: visualConfig.headerText }}>{matchTitle}</h2>
                 <div className="flex justify-between px-8 text-[11px] uppercase font-bold mt-2 opacity-90 tracking-wider" style={{ color: visualConfig.headerText }}>
                    <span className="w-12 text-left">Rank</span>
                    <span className="flex-1 text-left">Team</span>
                    <span className={`w-20 text-center transition-transform ${visualConfig.showFlags ? 'translate-x-5' : ''}`}>Status</span>
                    <span className="w-20 text-right">Pts</span>
                 </div>
              </div>

              <div 
                className="shadow-2xl relative transition-[height] duration-300 ease-out shrink-0" 
                style={{ height: `${sortedPreviewTeams.length * layoutConfig.rowHeight}px` }}
              >
                 {sortedPreviewTeams.map((t, idx) => {
                    const isTeamEliminated = t.status.every(s => s === 0);
                    const showPopup = activePopups.includes(t.rank);
                    const isWinner = aliveCount === 1 && !isTeamEliminated;
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
                          backgroundColor: isWinner 
                            ? visualConfig.winnerBg 
                            : (isTeamEliminated 
                                ? visualConfig.eliminatedBg 
                                : (idx % 2 === 0 ? visualConfig.rowEvenBg : visualConfig.rowOddBg)),
                          height: `${layoutConfig.rowHeight}px`,
                          transform: `translateY(${idx * layoutConfig.rowHeight}px)`,
                          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.6s ease', 
                          zIndex: sortedPreviewTeams.length - idx
                      }}
                    >
                       {isTeamEliminated && (
                          <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-0">
                              <span className="text-[40px] font-[1000] uppercase tracking-[0.5em] opacity-10 transform -rotate-3 whitespace-nowrap" style={{ color: visualConfig.eliminatedText }}>
                                  ELIMINATED
                              </span>
                          </div>
                       )}

                       {showPopup && (
                           <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none overflow-hidden animate-out fade-out zoom-out duration-500 fill-mode-forwards" style={{ animationDelay: '2.5s' }}>
                               <div className="bg-red-600/90 text-white font-[900] text-3xl uppercase tracking-[0.2em] px-8 py-1 transform -rotate-2 border-y-2 border-white shadow-xl animate-in zoom-in duration-300">
                                   ELIMINATED
                               </div>
                           </div>
                       )}
                       
                       {isWinner && (
                           <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none overflow-hidden">
                               <div className="bg-black/90 text-[#ccff00] font-[900] text-3xl uppercase tracking-[0.2em] px-8 py-1 border-y-2 border-[#ccff00] shadow-xl animate-pulse">
                                   WINNER
                               </div>
                           </div>
                       )}

                       <div className={`flex items-center gap-4 flex-1 min-w-0 mr-4 transition-opacity duration-500 relative z-10 ${isTeamEliminated ? 'opacity-40 grayscale' : 'opacity-100'}`}>
                          <span className="font-[900] text-xl w-8 text-center" style={{ color: isWinner ? visualConfig.winnerText : visualConfig.rankColor }}>#{idx + 1}</span>
                          
                          {/* FLAG RENDERING */}
                          {visualConfig.showFlags && t.country && (
                            <div 
                              style={{ width: `${layoutConfig.flagWidth}px` }} 
                              className="shrink-0 flex items-center justify-center shadow-sm"
                            >
                                <img 
                                    src={`https://flagcdn.com/w80/${t.country.toLowerCase()}.png`} 
                                    alt={t.country}
                                    className="w-full h-auto rounded-[2px]"
                                />
                            </div>
                          )}

                          <div style={{ width: `${layoutConfig.logoSize}px`, height: `${layoutConfig.logoSize}px` }} className="shrink-0 flex items-center justify-center overflow-hidden">
                            {t.teamLogo ? <img src={t.teamLogo} className="w-full h-full object-contain" /> : <Shield size={layoutConfig.logoSize - 8} className="opacity-20 text-black" />}
                          </div>
                          <div className="flex flex-col justify-center min-w-0">
                              <span className="font-[900] uppercase leading-none mt-0.5 whitespace-nowrap" style={{ fontSize: `${layoutConfig.fontSize}px`, color: isWinner ? visualConfig.winnerText : visualConfig.teamNameColor }}>{projectPlayers.find(p => p.team === t.team)?.teamAbbreviation || t.team}</span>
                          </div>
                       </div>

                       <div className={`flex flex-col items-center ${visualConfig.showFlags ? '-mr-[18px]' : 'mr-3'} shrink-0 transition-opacity relative z-10 ${isTeamEliminated ? 'opacity-20' : 'opacity-100'}`}>
                          <div className="flex gap-1.5">
                              {t.status.map((s, i) => (
                                <div key={i} className="w-3.5 h-7 rounded-full border shadow-sm transition-colors flex items-center justify-center" style={{ backgroundColor: getStatusColor(s), borderColor: `${visualConfig.statusBorder}20` }}>
                                    <span className="text-[5px] font-black opacity-50 mix-blend-overlay" style={{ color: visualConfig.statusText }}>{t.playerNames[i]?.charAt(0)}</span>
                                </div>
                              ))}
                          </div>
                       </div>

                       <div className={`w-20 text-right flex items-center justify-end gap-2 shrink-0 transition-opacity relative z-10 ${isTeamEliminated ? 'opacity-50' : 'opacity-100'}`}>
                          <span className="font-[900] text-2xl leading-none" style={{ color: isWinner ? visualConfig.winnerText : visualConfig.pointsColor }}>{displayedPts}</span>
                          
                          {currentMatch > 1 && liveKillPoints > 0 && (
                            <span className="font-black text-sm tracking-tight" style={{ color: isWinner ? visualConfig.winnerText : visualConfig.deltaPointsColor }}>
                                + {liveKillPoints}
                            </span>
                          )}
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
                style={{ backgroundColor: visualConfig.headerBg }}
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
         )}
    </motion.div>
  ), [showOverlay, getAssetAnimationVariants, layoutConfig, visualConfig, matchTitle, sortedPreviewTeams, activePopups, aliveCount, killPointValue, effectiveAnimationConfig, getStatusColor, currentMatch, rowVariants, bottomBoxVariants]);

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
                        {['DATA', 'VISUAL', 'ANIMATION'].map(tab => (<button key={tab} onClick={() => setConfigTab(tab as any)} className={`flex-1 py-1.5 text-[8px] font-black tracking-widest uppercase rounded-lg transition-all ${configTab === tab ? 'bg-[#ccff00] text-black' : 'text-zinc-600 hover:text-white'}`}>{tab} INPUT</button>))}
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
                                        <button onClick={() => aliveCount <= 1 && setCurrentMatch(Math.max(1, currentMatch - 1))} className={`w-8 h-full flex items-center justify-center transition-all ${aliveCount > 1 ? 'text-zinc-800 cursor-not-allowed opacity-50' : 'text-zinc-600 hover:text-white'}`}><Minus size={14} /></button>
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
                                            {isMatchReadyToEnd ? 'READY: WINNER FOUND' : `LIVE: ${aliveCount} TEAMS LEFT`}
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
                                </div>

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

                            <div className="bg-[#111] border border-white/5 p-1 rounded-2xl">
                                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-[#1a1d26] rounded-t-xl mb-1 border-b border-black/20">
                                    <div className="col-span-8 text-[9px] font-black text-[#64748b] tracking-widest uppercase flex items-center gap-2">
                                        <Database size={12} />
                                        TEAM IDENTITY (SLOT 1-16)
                                        <button 
                                            onClick={() => setVisualConfig(v => ({...v, showFlags: !v.showFlags}))}
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
                                                                    return (
                                                                        <div key={pIdx} className="bg-black/40 rounded-lg p-1.5 border border-white/5 hover:border-white/10 transition-all flex flex-col gap-1.5">
                                                                            <div className="flex items-center gap-1 border-b border-white/5 pb-1">
                                                                                <span className="text-[7px] font-black text-zinc-500 w-3">P{pIdx+1}</span>
                                                                                <input type="text" value={name} onChange={(e) => updatePlayerName(idx, pIdx, e.target.value)} className="w-full bg-transparent border-none text-[9px] font-bold text-white uppercase outline-none text-center" />
                                                                            </div>
                                                                            <div className="flex items-center justify-between bg-zinc-900 rounded border border-white/5 px-1">
                                                                                <button onClick={() => updatePlayerKills(idx, pIdx, -1)} className="w-4 h-4 flex items-center justify-center hover:text-white text-zinc-500"><Minus size={8}/></button>
                                                                                <span className="text-[9px] font-black text-[#ccff00]">{currentKills}</span>
                                                                                <button onClick={() => updatePlayerKills(idx, pIdx, 1)} className="w-4 h-4 flex items-center justify-center hover:text-white text-zinc-500"><Plus size={8}/></button>
                                                                            </div>
                                                                            <div className="flex gap-1">
                                                                                <button onClick={() => setPlayerStatus(idx, pIdx, 2)} className={`flex-1 py-1 rounded text-[6px] font-black uppercase ${currentStatus === 2 ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-600 hover:bg-zinc-700'}`}>K</button>
                                                                                <button onClick={() => setPlayerStatus(idx, pIdx, 0)} className={`flex-1 py-1 rounded text-[6px] font-black uppercase ${currentStatus === 0 ? 'bg-zinc-600 text-white' : 'bg-zinc-800 text-zinc-600 hover:bg-zinc-700'}`}>E</button>
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
                        <div className="space-y-6 animate-in fade-in duration-300">
                           <div className="p-4 bg-zinc-950 border border-white/5 rounded-xl">
                                <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2"><Palette size={12} className="text-[#ccff00]"/> GLOBAL THEME</h4>
                                <div className="grid grid-cols-6 gap-3">
                                    {[
                                        { label: 'HEADER BG', key: 'headerBg' },
                                        { label: 'HEADER TEXT', key: 'headerText' },
                                        { label: 'ROW EVEN', key: 'rowEvenBg' },
                                        { label: 'ROW ODD', key: 'rowOddBg' },
                                        { label: 'DELTA PTS', key: 'deltaPointsColor', labelColor: '#ccff00' },
                                        { label: 'TEAM NAME', key: 'teamNameColor' },
                                        { label: 'RANK COLOR', key: 'rankColor' },
                                        { label: 'ELIM BG', key: 'eliminatedBg' },
                                        { label: 'ELIM TEXT', key: 'eliminatedText' },
                                        { label: 'WINNER BG', key: 'winnerBg' },
                                        { label: 'WINNER TEXT', key: 'winnerText' },
                                        { label: 'STATUS BORDER', key: 'statusBorder' },
                                        { label: 'STATUS TEXT', key: 'statusText' },
                                    ].map((item) => (
                                        <div key={item.key} className="bg-black border border-white/10 rounded-xl p-3 flex flex-col justify-between gap-2 relative group hover:border-white/30 transition-all h-24">
                                            <div className="flex justify-between items-start relative z-30">
                                                <label className="text-[7px] font-black uppercase tracking-widest pointer-events-none" style={{ color: item.labelColor || '#71717a' }}>{item.label}</label>
                                                <button 
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setVisualConfig(prev => ({...prev, [item.key]: (INITIAL_VISUAL_CONFIG as any)[item.key]}));
                                                    }}
                                                    className="p-1 -mt-1 -mr-1 rounded hover:bg-white/20 text-zinc-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Reset to Default"
                                                >
                                                    <RotateCcw size={10} />
                                                </button>
                                            </div>
                                            <div className="flex items-end justify-between z-10 relative pointer-events-none">
                                                <span className="text-[11px] font-[1000] text-white uppercase tracking-wider truncate">{(visualConfig as any)[item.key]}</span>
                                            </div>
                                            <input 
                                                type="color" 
                                                value={(visualConfig as any)[item.key]} 
                                                onChange={(e) => setVisualConfig({...visualConfig, [item.key]: e.target.value})} 
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                                            />
                                            <div className="absolute inset-0 opacity-20 transition-opacity group-hover:opacity-30 pointer-events-none" style={{ backgroundColor: (visualConfig as any)[item.key] }} />
                                            <div className="absolute bottom-3 right-3 w-6 h-6 rounded-full shadow-sm border border-white/20 pointer-events-none" style={{ backgroundColor: (visualConfig as any)[item.key] }} />
                                        </div>
                                    ))}
                                    
                                    <div className="bg-black border border-white/10 rounded-xl p-3 flex flex-col justify-between gap-2 relative group hover:border-white/30 transition-all h-24 cursor-pointer" onClick={() => setVisualConfig(v => ({...v, showFlags: !v.showFlags}))}>
                                        <label className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">FLAGS</label>
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${visualConfig.showFlags ? 'bg-[#ccff00] text-black' : 'bg-zinc-800 text-zinc-600'}`}>
                                            <Flag size={20} fill={visualConfig.showFlags ? "currentColor" : "none"} />
                                        </div>
                                    </div>
                                </div>
                           </div>
                           <div className="p-6 bg-zinc-900 border border-white/5 rounded-[20px] shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                   <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2"><Move size={12} className="text-zinc-400" />LAYOUT TRANSFORM</h3>
                                   <button 
                                       onClick={() => setLayoutConfig({
                                           scale: 80,
                                           xOffset: -40,
                                           yOffset: 75,
                                           rowHeight: 52,
                                           fontSize: 18,
                                           logoSize: 32,
                                           flagWidth: 24
                                       })}
                                       className="text-[7px] font-black text-zinc-600 hover:text-[#ccff00] uppercase tracking-widest flex items-center gap-1 transition-colors"
                                   >
                                       <RotateCcw size={10} /> RESET POSITION
                                   </button>
                                </div>
                                <div className="grid grid-cols-5 gap-3">
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
                                </div>
                           </div>
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
              programPreview={
                programAssetId === asset.id ? livePreviewContent : (
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
      <TieBreakerModal isOpen={isTieBreakerModalOpen} onClose={() => setIsTieBreakerModalOpen(false)} onApply={handleApplyTieBreaker} currentOrder={tieBreakerOrder} />

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
                        {!isMatchReadyToEnd ? 'MATCH STILL ONGOING' : 'WINNER IDENTIFIED'}
                    </p>
                </div>

                <div className="p-8 space-y-6">
                    {!isMatchReadyToEnd ? (
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5 text-center">
                            <p className="text-xs font-bold text-zinc-400 uppercase leading-relaxed">
                                Tidak dapat mengakhiri match karena masih ada <span className="text-white font-black">{aliveCount} TIM</span> yang terdeteksi hidup. 
                                <br/><br/>
                                Harap eliminasi seluruh tim hingga tersisa satu pemenang (WWCD).
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
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight truncate">{matchWinner?.team}</h3>
                                    </div>
                                </div>
                                <div className="space-y-2 pt-4 border-t border-white/5">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-zinc-500">Placement Pts</span>
                                        <span className="text-[#ccff00]">+{scoringRules[0]}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-zinc-500">Total Kills</span>
                                        <span className="text-white">{matchWinner?.playerKills.reduce((a,b)=>a+b,0)}</span>
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
