
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSharedState } from '@/lib/useSharedState';
import { 
  Database, Palette, Play, Square, Monitor, ChevronDown, Activity, LayoutTemplate, 
  ChevronRight, Check, Settings2, Globe, User, Swords, Clock, Type, Italic, Bold, Move,
  Maximize, ArrowLeftRight, ArrowUpDown, Upload, Image as ImageIcon, Trash2, RefreshCw,
  Search, Shield, X, Filter, Gamepad2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Theme, Asset, Game, PlayerData } from '../../../../types';
import PanelControlMonitor, { PreviewControlContext } from '../../../PanelControlMonitor';
import { AnimationConfig, getAnimationVariants } from '@/constants/transitions';
import { notifyCompanionAnimation } from '@/lib/overlayAnimation';

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
  isGlobalStudio?: boolean;
  showMonitorProp?: boolean;
  programAssetIdProp?: string | null;
  onProgramAssetChange?: (id: string | null) => void;
  getAssetStatusProp?: (id: string) => number;
  onPreviewContentChange?: (content: React.ReactNode) => void;
  visualOnly?: boolean;
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

const AVAILABLE_FONTS = ['Inter', 'Roboto', 'Montserrat', 'Oswald', 'Bebas Neue', 'Chakra Petch', 'Orbitron', 'Poppins'];
const DEFAULT_PLAYER_IMG = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop';
const DEFAULT_TEAM_LOGO = 'https://api.dicebear.com/7.x/identicon/svg?seed=DEFAULT';

const OverlayTopFraggersView: React.FC<OverlayTopFraggersViewProps> = ({ 
  asset, theme, games, themes, availableAssets, userRole, onBack, onSelectTheme, onSelectAsset, globalLogo, projectPlayers = [], isGlobalStudio = false, showMonitorProp = true,
  programAssetIdProp, onProgramAssetChange, getAssetStatusProp, onPreviewContentChange, visualOnly = false, style
}) => {
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

  const [teams, setTeams] = useSharedState<any[]>('BROHUBS_LEADERBOARD_TEAMS', []);
  const [currentMatch, setCurrentMatch] = useSharedState('BROHUBS_LEADERBOARD_MATCH', 1);
  const [matchEnded, setMatchEnded] = useState(false);

  useEffect(() => {
    // Sync fraggers with leaderboard kills in real-time
    const newFraggers = [...fraggers];
    let hasChanges = false;
    teams.forEach(team => {
        team.playerNames.forEach((playerName: string, pIdx: number) => {
            const fraggerIdx = newFraggers.findIndex(f => f.name.toLowerCase() === playerName.toLowerCase());
            if (fraggerIdx >= 0) {
                if (newFraggers[fraggerIdx].elims !== team.playerKills[pIdx]) {
                    newFraggers[fraggerIdx].elims = team.playerKills[pIdx];
                    hasChanges = true;
                }
            }
        });
    });

    if (hasChanges) {
        newFraggers.sort((a,b) => b.elims - a.elims);
        newFraggers.forEach((f, i) => f.rank = i + 1);
        setFraggers(newFraggers);
    }
  }, [teams, fraggers]);

  // DB Selector State
  const [isDbSelectorOpen, setIsDbSelectorOpen] = useState<{ rankIndex: number } | null>(null);
  const [dbSearch, setDbSearch] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');
  const [temp, setTemp] = useState(false);

  const [visualConfig, setVisualConfig] = useSharedState('BROHUBS_TOPFRAGGERS_VISUAL', {
    titleColor: '#ffffff',
    subtitleBg: '#ffffff',
    subtitleText: '#000000',
    cardBg: '#ccff00',
    cardBgImage: null as string | null,
    playerNameColor: '#000000',
    teamNameColor: '#000000',
    elimsColor: '#000000',
    survivalColor: '#000000',
    rankColor: '#000000',
  });

  const [typography, setTypography] = useSharedState('BROHUBS_TOPFRAGGERS_TYPOGRAPHY', {
    title: { font: 'Inter', weight: '950', italic: true, size: 84, x: 0, y: 0 },
    subtitle: { font: 'Inter', weight: '900', italic: false, size: 12, x: 0, y: 0 },
    card: { font: 'Inter', weight: '900', italic: false, size: 20 },
    rank: { font: 'Inter', weight: '950', italic: false, size: 32 },
  });

  const [cardLayout, setCardLayout] = useSharedState('BROHUBS_TOPFRAGGERS_LAYOUT', {
    playerNameSize: 22,
    teamNameSize: 12,
    elimsSize: 28,
    survivalSize: 20,
    teamLogoSize: 32,
    playerHeight: 180,
    playerScale: 100,
    playerX: 0,
    playerY: 0,
    bgLogoScale: 66,
    bgLogoOpacity: 25,
    bgLogoX: 0,
    bgLogoY: 0
  });

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

  const [matchInfo, setMatchInfo] = useSharedState('BROHUBS_TOPFRAGGERS_MATCH', { title: 'TOP FRAGGERS', subtitle: 'LIVE PERFORMANCE TELEMETRY' });
  const [internalProgramAssetId, setInternalProgramAssetId] = useState<string | null>(null);
  
  const programAssetId = programAssetIdProp !== undefined ? programAssetIdProp : internalProgramAssetId;
  const setProgramAssetId = (id: string | null) => {
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

  const resetFraggers = () => {
    setFraggers([
      { rank: 1, name: 'PLAYER 1', team: 'TEAM A', teamLogo: DEFAULT_TEAM_LOGO, elims: 0, damage: 0, survival: '0 M 00 S', image: DEFAULT_PLAYER_IMG },
      { rank: 2, name: 'PLAYER 2', team: 'TEAM B', teamLogo: DEFAULT_TEAM_LOGO, elims: 0, damage: 0, survival: '0 M 00 S', image: DEFAULT_PLAYER_IMG },
      { rank: 3, name: 'PLAYER 3', team: 'TEAM C', teamLogo: DEFAULT_TEAM_LOGO, elims: 0, damage: 0, survival: '0 M 00 S', image: DEFAULT_PLAYER_IMG },
      { rank: 4, name: 'PLAYER 4', team: 'TEAM D', teamLogo: DEFAULT_TEAM_LOGO, elims: 0, damage: 0, survival: '0 M 00 S', image: DEFAULT_PLAYER_IMG },
      { rank: 5, name: 'PLAYER 5', team: 'TEAM E', teamLogo: DEFAULT_TEAM_LOGO, elims: 0, damage: 0, survival: '0 M 00 S', image: DEFAULT_PLAYER_IMG },
    ]);
    
    // Reset Leaderboard
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
    setMatchEnded(false);
  };

  const openDbModal = (rankIndex: number) => {
    const currentTeam = fraggers[rankIndex].team;
    // Extract unique teams
    const uniqueTeams = Array.from(new Set(projectPlayers.map(p => p.team))).sort();
    
    // Check if currentTeam exists in uniqueTeams (case insensitive matching)
    const matchingTeam = uniqueTeams.find(t => t.toLowerCase() === currentTeam.toLowerCase());
    
    setSelectedTeamFilter(matchingTeam || 'ALL');
    setDbSearch('');
    setIsDbSelectorOpen({ rankIndex });
  };

  const handleLoadFromDb = (rankIndex: number, player: PlayerData) => {
    const updated = [...fraggers];
    updated[rankIndex] = {
        ...updated[rankIndex],
        name: player.name,
        team: player.team,
        teamLogo: player.teamLogo || DEFAULT_TEAM_LOGO,
        image: player.image || DEFAULT_PLAYER_IMG
    };
    setFraggers(updated);
    setIsDbSelectorOpen(null);
  };

  // Filter based on Player Name, Team, or ID, AND Selected Team Filter
  const filteredDbPlayers = useMemo(() => {
    return projectPlayers.map(p => {
      // Try to find live kill count for this player
      let liveKills = p.elims || 0;
      teams.forEach(team => {
          const pIdx = team.playerNames.findIndex((name: string) => name.toLowerCase() === p.name.toLowerCase());
          if (pIdx >= 0) {
              liveKills = team.playerKills[pIdx];
          }
      });
      return { ...p, elims: liveKills };
    }).filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(dbSearch.toLowerCase()) || 
                            p.team.toLowerCase().includes(dbSearch.toLowerCase()) ||
                            p.id.toLowerCase().includes(dbSearch.toLowerCase());
      const matchesTeam = selectedTeamFilter === 'ALL' || p.team === selectedTeamFilter;
      return matchesSearch && matchesTeam;
    }).sort((a, b) => (b.elims || 0) - (a.elims || 0));
  }, [projectPlayers, dbSearch, selectedTeamFilter, teams]);

  const uniqueTeams = useMemo(() => {
    return Array.from(new Set(projectPlayers.map(p => p.team))).sort();
  }, [projectPlayers]);

  const [animationConfig, setAnimationConfig] = useSharedState<AnimationConfig>('BROHUBS_TOPFRAGGERS_ANIMATION', {
    inType: 'fade',
    outType: 'fade',
    duration: 0.8,
    delay: 0,
    easing: 'easeOut',
    useSpring: true
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
    });
  }, [asset.id, animationConfig, visualOnly]);

  const getAssetAnimationVariants = useCallback(() => {
    const variants = getAnimationVariants(animationConfig);
    const exitVariant = variants.exit as any;
    
    // Customize the exit to be more dramatic as requested
    return {
      ...variants,
      exit: {
        ...exitVariant,
        scale: animationConfig.outType === 'fade' ? 0.9 : 1.05,
        transition: {
          ...exitVariant?.transition,
          duration: Math.max(animationConfig.duration, 1.2),
          delay: 0.1,
          ease: "backIn"
        }
      }
    };
  }, [animationConfig]);

  const displayFraggers = useMemo(() => {
    let list = [...fraggers];
    if (selectedTeamFilter !== 'ALL') {
       list = list.filter(f => f.team.toLowerCase() === selectedTeamFilter.toLowerCase());
       list.sort((a, b) => b.elims - a.elims);
    } else {
       list.sort((a, b) => b.elims - a.elims);
    }
    return list;
  }, [fraggers, selectedTeamFilter]);

  const livePreviewContent = useMemo(() => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ 
        opacity: 0,
        transition: { duration: 1.5, delay: 0.5 } 
      }}
      style={style}
      className={`w-[1920px] h-[1080px] bg-transparent relative overflow-hidden ${style?.position === 'absolute' ? '' : 'mx-auto'}`}
    >
       {/* Checkerboard Background for Transparency Visualization */}
       {!visualOnly && (
         <div className="absolute inset-0 opacity-40" style={{ 
             backgroundImage: 'conic-gradient(#0a0a0a 90deg, #050505 90deg 180deg, #0a0a0a 180deg 270deg, #050505 270deg)',
             backgroundSize: '40px 40px' 
         }} />
       )}
       
       {globalLogo && (
         <div className="absolute top-10 left-10 z-40">
           <img src={globalLogo} alt="Global Logo" className="h-20 w-auto object-contain" />
         </div>
       )}

       {/* Main Content Area - Centered by default but elements can be moved via offsets */}
       <motion.div 
         {...getAssetAnimationVariants()}
         className="absolute inset-0 flex flex-col items-center justify-center gap-4"
       >
           <div className="text-center relative z-20 mb-8">
               <motion.h1 
                 exit={{ scale: 0.8, opacity: 0, y: -50, transition: { duration: 0.5, ease: "easeIn" } }}
                 className="tracking-tighter uppercase leading-none mb-4 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" 
                 style={{ color: visualConfig.titleColor, fontFamily: typography.title.font, fontWeight: typography.title.weight, fontStyle: typography.title.italic ? 'italic' : 'normal', fontSize: `${typography.title.size}px`, transform: `translate(${typography.title.x}px, ${typography.title.y}px)` }}
               >
                 {matchInfo.title}
               </motion.h1>
               <motion.div 
                 exit={{ scale: 1.2, opacity: 0, transition: { duration: 0.4, delay: 0.1, ease: "easeIn" } }}
                 className="px-10 py-1.5 inline-block transform -skew-x-12 shadow-xl" 
                 style={{ backgroundColor: visualConfig.subtitleBg, transform: `skewX(-12deg) translate(${typography.subtitle.x}px, ${typography.subtitle.y}px)` }}
               >
                   <span className="tracking-[0.5em] uppercase block transform skew-x-12" style={{ color: visualConfig.subtitleText, fontFamily: typography.subtitle.font, fontWeight: typography.subtitle.weight, fontStyle: typography.subtitle.italic ? 'italic' : 'normal', fontSize: `${typography.subtitle.size}px` }}>{matchInfo.subtitle}</span>
               </motion.div>
           </div>
           <div className="flex items-end gap-5">
               {displayFraggers.map((player, idx) => (
                   <motion.div 
                     key={idx}
                     initial={{ y: 50, opacity: 0 }}
                     animate={{ y: 0, opacity: 1 }}
                     exit={{ 
                        y: animationConfig.outType === 'slide-down' ? 1000 : (animationConfig.outType === 'slide-up' ? -1000 : 0),
                        x: animationConfig.outType === 'slide-right' ? 2000 : (animationConfig.outType === 'slide-left' ? -2000 : 0),
                        opacity: 0, 
                        scale: 0.7,
                        rotate: idx % 2 === 0 ? 10 : -10,
                        transition: { 
                          delay: idx * 0.08, 
                          duration: 0.8, 
                          ease: "easeInOut"
                        } 
                     }}
                     transition={{ delay: 0.2 + (idx * 0.1), duration: 0.5 }}
                     className="relative w-56 flex flex-col items-center pt-10 pb-8 px-4 overflow-hidden shadow-2xl" 
                     style={{ height: '520px', backgroundColor: visualConfig.cardBgImage ? 'transparent' : visualConfig.cardBg, backgroundImage: visualConfig.cardBgImage ? `url(${visualConfig.cardBgImage})` : 'none', fontFamily: typography.card.font, fontWeight: typography.card.weight, fontStyle: typography.card.italic ? 'italic' : 'normal' }}
                   >
                       {/* Rank Badge */}
                       <div className="absolute top-4 left-4 z-30 opacity-90" style={{ color: visualConfig.rankColor, fontFamily: typography.rank.font, fontWeight: typography.rank.weight, fontStyle: typography.rank.italic ? 'italic' : 'normal', fontSize: `${typography.rank.size}px` }}>#{idx + 1}</div>
                       
                       {/* Top Right Icon/Badge from Reference */}
                       <div className="absolute top-4 right-4 z-30">
                           <div className="w-10 h-10 rounded-xl bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center border-2 border-white/20 shadow-lg">
                               {player.teamLogo ? (
                                    <img 
                                        src={player.teamLogo} 
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

                       {/* Player Frame (Dark Box) */}
                       <div className="w-full aspect-[4/3] bg-black/20 rounded-sm mb-8 flex items-end justify-center overflow-hidden relative shadow-inner">
                           {player.teamLogo && (
                             <img 
                               src={player.teamLogo} 
                               className="absolute object-contain z-0 top-1/2 left-1/2 select-none pointer-events-none" 
                                style={{
                                    width: `${cardLayout.bgLogoScale ?? 66}%`, 
                                    height: `${cardLayout.bgLogoScale ?? 66}%`,
                                    opacity: (cardLayout.bgLogoOpacity ?? 25) / 100,
                                    transform: `translate(-50%, -50%) translate(${cardLayout.bgLogoX ?? 0}px, ${cardLayout.bgLogoY ?? 0}px)`
                                }} 
                               alt="Team Watermark" 
                               referrerPolicy="no-referrer" 
                               onError={(e) => { e.currentTarget.style.display = 'none'; }}
                             />
                           )}
                          <img src={player.image} className="w-auto h-full object-contain" style={{ transform: `scale(${cardLayout.playerScale / 100}) translate(${cardLayout.playerX}px, ${cardLayout.playerY}px)`, transformOrigin: 'bottom center' }} />
                       </div>

                       <div className="w-full text-center z-20 space-y-6">
                           <div className="space-y-1">
                               <h3 className="uppercase leading-none truncate" style={{ color: visualConfig.playerNameColor, fontSize: `${cardLayout.playerNameSize}px`, fontWeight: '950' }}>{player.name}</h3>
                               <p className="font-black uppercase tracking-[0.2em]" style={{ color: visualConfig.teamNameColor, fontSize: `${cardLayout.teamNameSize}px`, opacity: 0.8 }}>{player.team}</p>
                           </div>

                           <div className="space-y-2 w-full">
                               <div className="mx-2 py-3 rounded-lg" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
                                   <span className="block leading-none font-black" style={{ color: visualConfig.elimsColor, fontSize: `${cardLayout.elimsSize}px` }}>{player.elims}</span>
                                   <span className="block text-[10px] font-black uppercase tracking-[0.4em] mt-1.5" style={{ color: visualConfig.elimsColor, opacity: 0.6 }}>ELIMS</span>
                               </div>
                               <div className="mx-2 py-3 rounded-lg" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}>
                                   <span className="block font-black leading-none" style={{ color: visualConfig.survivalColor, fontSize: `${cardLayout.survivalSize}px` }}>{player.survival}</span>
                                   <span className="block text-[8px] font-black uppercase tracking-[0.4em] mt-1.5" style={{ color: visualConfig.survivalColor, opacity: 0.6 }}>SURVIVAL TIME</span>
                               </div>
                           </div>
                       </div>
                   </motion.div>
               ))}
           </div>
       </motion.div>
    </motion.div>
  ), [visualConfig, typography, matchInfo, displayFraggers, cardLayout, animationConfig, globalLogo, style, visualOnly, getAssetAnimationVariants]);


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
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all shadow-lg ${isSaving ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-[#ccff00] text-black hover:bg-white hover:scale-105 active:scale-95'}`}
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
                                    <div className="flex items-center gap-2 mb-2"><Type size={14} className="text-[#ccff00]" /><h3 className="text-[10px] font-black text-zinc-400 tracking-[0.2em] uppercase">MAIN TITLE</h3></div>
                                    <input type="text" value={matchInfo.title} onChange={(e) => setMatchInfo({...matchInfo, title: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-xs font-bold text-white uppercase outline-none focus:border-[#ccff00]" />
                                    <div className="grid grid-cols-3 gap-2">
                                        <div><label className="text-[8px] font-black text-zinc-600 uppercase mb-1">SIZE</label><ScrollableInput value={typography.title.size} onChange={(val) => setTypography(prev => ({...prev, title: {...prev.title, size: val}}))} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white text-center" /></div>
                                        <div><label className="text-[8px] font-black text-zinc-600 uppercase mb-1">X</label><ScrollableInput value={typography.title.x} onChange={(val) => setTypography(prev => ({...prev, title: {...prev.title, x: val}}))} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white text-center" /></div>
                                        <div><label className="text-[8px] font-black text-zinc-600 uppercase mb-1">Y</label><ScrollableInput value={typography.title.y} onChange={(val) => setTypography(prev => ({...prev, title: {...prev.title, y: val}}))} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white text-center" /></div>
                                    </div>
                                </div>
                                <div className="bg-zinc-900 border border-white/5 rounded-[20px] p-6 space-y-4"><div className="flex items-center gap-2 mb-2"><Type size={14} className="text-zinc-500" /><h3 className="text-[10px] font-black text-zinc-400 tracking-[0.2em] uppercase">SUBTITLE</h3></div><input type="text" value={matchInfo.subtitle} onChange={(e) => setMatchInfo({...matchInfo, subtitle: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-xs font-bold text-white uppercase outline-none focus:border-[#ccff00]" /><div className="grid grid-cols-3 gap-2"><div><label className="text-[8px] font-black text-zinc-600 uppercase mb-1">SIZE</label><ScrollableInput value={typography.subtitle.size} onChange={(val) => setTypography(prev => ({...prev, subtitle: {...prev.subtitle, size: val}}))} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white text-center" /></div><div><label className="text-[8px] font-black text-zinc-600 uppercase mb-1">X</label><ScrollableInput value={typography.subtitle.x} onChange={(val) => setTypography(prev => ({...prev, subtitle: {...prev.subtitle, x: val}}))} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white text-center" /></div><div><label className="text-[8px] font-black text-zinc-600 uppercase mb-1">Y</label><ScrollableInput value={typography.subtitle.y} onChange={(val) => setTypography(prev => ({...prev, subtitle: {...prev.subtitle, y: val}}))} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white text-center" /></div></div></div>
                             </div>

                             <div className="space-y-2">
                                <div className="flex items-center justify-between mb-4">
<h3 className="text-[8px] font-black text-zinc-600 tracking-[0.4em] uppercase italic">FRAGGER DATA_NODES</h3>
<button onClick={resetFraggers} className="text-[7px] font-black text-red-500 uppercase tracking-widest hover:text-red-700 bg-red-500/10 px-2 py-1 rounded">RESET ALL</button>
</div>
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
                                                <Database size={12} /> LOAD FROM PROJECT DB
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-12 gap-3 items-end">
                                            <div className="col-span-4 space-y-1"><label className="text-[7px] font-black text-zinc-700 tracking-widest ml-1">PLAYER NAME</label><input type="text" value={player.name} onChange={(e) => updateFragger(idx, 'name', e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-bold text-white uppercase outline-none focus:border-[#ccff00]" /></div>
                                            <div className="col-span-3 space-y-1"><label className="text-[7px] font-black text-zinc-700 tracking-widest ml-1">TEAM IDENT</label><input type="text" value={player.team} onChange={(e) => updateFragger(idx, 'team', e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase outline-none focus:border-[#ccff00]" /></div>
                                            <div className="col-span-2 space-y-1"><label className="text-[7px] font-black text-zinc-700 tracking-widest ml-1">ELIMS</label><ScrollableInput value={player.elims} onChange={(val) => updateFragger(idx, 'elims', val)} className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-black text-[#ccff00] text-center" /></div>
                                            <div className="col-span-2 space-y-1"><label className="text-[7px] font-black text-zinc-700 tracking-widest ml-1">DAMAGE</label><ScrollableInput value={player.damage} onChange={(val) => updateFragger(idx, 'damage', val)} className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-black text-blue-500 text-center" /></div>
                                            <div className="col-span-1 space-y-1"><label className="text-[7px] font-black text-zinc-700 tracking-widest ml-1">SURV</label><input type="text" value={player.survival} onChange={(e) => updateFragger(idx, 'survival', e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-bold text-white uppercase text-center" /></div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}

                    {configTab === 'VISUAL' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                           <div className="p-4 bg-zinc-950 border border-white/5 rounded-xl">
                                <h4 className="text-[9px] font-black text-white uppercase tracking-widest mb-3">GLOBAL COLORS</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div><label className="text-[7px] font-bold text-zinc-500 uppercase block mb-1">TITLE</label><input type="color" value={visualConfig.titleColor} onChange={(e) => setVisualConfig({...visualConfig, titleColor: e.target.value})} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-500 uppercase block mb-1">SUBTITLE BG</label><input type="color" value={visualConfig.subtitleBg} onChange={(e) => setVisualConfig({...visualConfig, subtitleBg: e.target.value})} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-500 uppercase block mb-1">CARD BASE</label><input type="color" value={visualConfig.cardBg} onChange={(e) => setVisualConfig({...visualConfig, cardBg: e.target.value})} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                                </div>
                           </div>
                           <div className="p-6 bg-zinc-900 border border-white/5 rounded-[20px] shadow-sm">
                                <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Move size={12} className="text-blue-500" />PLAYER IMAGE CONTROL</h3>
                                <div className="grid grid-cols-4 gap-3">
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">SCALE (%)</label><ScrollableInput value={cardLayout.playerScale} onChange={(val) => setCardLayout({...cardLayout, playerScale: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">HEIGHT (PX)</label><ScrollableInput value={cardLayout.playerHeight} onChange={(val) => setCardLayout({...cardLayout, playerHeight: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">POS X</label><ScrollableInput value={cardLayout.playerX} onChange={(val) => setCardLayout({...cardLayout, playerX: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                    <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">POS Y</label><ScrollableInput value={cardLayout.playerY} onChange={(val) => setCardLayout({...cardLayout, playerY: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                 </div>
                            </div>
                            <div className="p-6 bg-zinc-900 border border-white/5 rounded-[20px] shadow-sm">
                                 <h3 className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><Move size={12} className="text-[#ccff00]" />WATERMARK LOGO CONTROL</h3>
                                 <div className="grid grid-cols-4 gap-3">
                                     <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">SCALE (%)</label><ScrollableInput value={cardLayout.bgLogoScale ?? 66} onChange={(val) => setCardLayout({...cardLayout, bgLogoScale: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                     <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">OPACITY (%)</label><ScrollableInput value={cardLayout.bgLogoOpacity ?? 25} onChange={(val) => setCardLayout({...cardLayout, bgLogoOpacity: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                     <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">POS X</label><ScrollableInput value={cardLayout.bgLogoX ?? 0} onChange={(val) => setCardLayout({...cardLayout, bgLogoX: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                     <div><label className="text-[7px] font-bold text-zinc-600 uppercase block mb-1.5">POS Y</label><ScrollableInput value={cardLayout.bgLogoY ?? 0} onChange={(val) => setCardLayout({...cardLayout, bgLogoY: val})} className="w-full bg-black border border-white/10 rounded-lg px-2 py-2 text-[10px] text-white text-center" /></div>
                                </div>
                           </div>
                        </div>
                    )}

                      {configTab === 'ANIMATION' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                             <div className="grid grid-cols-2 gap-4">
                                <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                                    <h4 className="text-[10px] font-black text-zinc-400 tracking-widest uppercase mb-4">IN TRANSITION</h4>
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
                                    <h4 className="text-[10px] font-black text-zinc-400 tracking-widest uppercase mb-4">OUT TRANSITION</h4>
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
                                    <h4 className="text-[10px] font-black text-zinc-400 tracking-widest uppercase italic">BEHAVIOR CONFIG</h4>
                                    <button 
                                        onClick={() => setDraftAnimationConfig({...draftAnimationConfig, useSpring: !draftAnimationConfig.useSpring})}
                                        className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${draftAnimationConfig.useSpring ? 'bg-[#ccff00]/10 text-[#ccff00] border border-[#ccff00]/20' : 'bg-white/5 text-zinc-600 border border-white/10'}`}
                                    >
                                        {draftAnimationConfig.useSpring ? 'SPRING PHYSICS ON' : 'LINEAR INTERPOLATION'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-zinc-600 tracking-widest uppercase">DURATION (S)</label>
                                        <ScrollableInput 
                                            value={draftAnimationConfig.duration} 
                                            onChange={(val) => setDraftAnimationConfig({...draftAnimationConfig, duration: Math.max(0.1, val)})} 
                                            className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black text-white text-center" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-zinc-600 tracking-widest uppercase">DELAY (S)</label>
                                        <ScrollableInput 
                                            value={draftAnimationConfig.delay} 
                                            onChange={(val) => setDraftAnimationConfig({...draftAnimationConfig, delay: Math.max(0, val)})} 
                                            className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black text-white text-center" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-zinc-600 tracking-widest uppercase">EASING</label>
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
                                    {isSaving ? 'UPDATING BROADCAST NODE...' : 'SAVE ANIMATION PROTOCOL'}
                                </button>
                                <p className="text-[8px] font-black text-center text-zinc-700 tracking-widest uppercase mt-4 italic opacity-50">Transmitting configuration to global master node</p>
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
                            <h3 className="text-xl font-[1000] italic text-white tracking-tighter uppercase leading-none">PROJECT PERSONNEL DATABASE</h3>
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
                            <option value="ALL">ALL TEAMS</option>
                            {uniqueTeams.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ChevronDown size={14} className="text-zinc-500" />
                        </div>
                        <div className="absolute left-6 -top-2 bg-[#0c0c0c] px-2 text-[8px] font-black text-zinc-600 tracking-[0.2em] uppercase pointer-events-none">FILTER BY TEAM</div>
                    </div>

                    <div className="relative group">
                        <input 
                            type="text" 
                            value={dbSearch}
                            onChange={(e) => setDbSearch(e.target.value)}
                            placeholder="SEARCH PLAYER OR TEAM NAME"
                            className="w-full bg-[#111] border border-white/5 rounded-2xl py-5 pl-8 pr-12 text-xs font-[1000] text-zinc-500 placeholder:text-zinc-800 outline-none focus:border-[#ccff00]/30 focus:text-white transition-all uppercase tracking-widest shadow-inner"
                        />
                    </div>
                </div>

                {/* Results List Area */}
                <div className="flex-1 overflow-y-auto px-8 pb-10 custom-scrollbar space-y-3">
                    {filteredDbPlayers.length > 0 ? (
                        filteredDbPlayers.map((p) => (
                            <button 
                                key={p.id}
                                onClick={() => handleLoadFromDb(isDbSelectorOpen.rankIndex, p)}
                                className="w-full bg-[#151515] border border-white/5 p-5 rounded-[24px] hover:border-[#ccff00]/40 transition-all flex items-center gap-6 group text-left shadow-sm"
                            >
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
                                    <div className="flex items-center gap-2">
                                        <Shield size={12} className="text-zinc-600 group-hover:text-blue-500 transition-colors" />
                                        <span className="text-[10px] font-black text-zinc-600 group-hover:text-zinc-400 uppercase tracking-[0.2em] transition-colors">
                                            {p.team}
                                        </span>
                                    </div>
                                </div>

                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-700 group-hover:text-[#ccff00] group-hover:border-[#ccff00]/30 transition-all">
                                    <ChevronRight size={18} strokeWidth={3} />
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="py-12 text-center opacity-20 border border-dashed border-white/10 rounded-[32px]">
                            <User size={48} className="mx-auto mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">NO DATABASE MATCH FOUND</p>
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
