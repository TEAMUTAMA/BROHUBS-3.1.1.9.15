import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Game, Theme, PlayerData } from '@/types';
import { loadProjectPlayers } from '@/lib/projectPlayers';
import { hydrateProjectCacheForScope } from '@/services/projectService';
import { ASSET_DATABASE } from '@/features/assets/assets';
import { getGames, getThemes } from '@/services/gameService';
import { useSharedState } from '@/lib/useSharedState';
import {
  resolveAssetIdFromLocation,
  resolveProjectScopeFromLocation,
  resolveProjectScopeFromLocationAsync,
} from '@/lib/outputRoute';
import { DEFAULT_PROGRAM_LAYERS, getProgramLayersKey } from './programLayers';
import { useCompanionOutputSync } from './useCompanionOutputSync';
import OverlayTopFraggersView from '@/features/games/pubg-mobile/overlays/theme-01/top-fraggers';
import OverlayOverallRankingView from '@/features/games/pubg-mobile/overlays/theme-01/leaderboard';
import OverlayTeamRosterView from '@/features/games/pubg-mobile/overlays/theme-01/team-roster';
import OverlayValTeamRosterView from '@/features/games/valorant/overlays/theme-01/team-roster';
import OverlayMlbbTeamRosterView from '@/features/games/mobile-legends/overlays/theme-01/team-roster';
import OverlayMlbbDrafNPickView from '@/features/games/mobile-legends/overlays/theme-01/draf-n-pick';
import { motion, AnimatePresence } from 'motion/react';
import { PreviewControlContext } from './PanelControlMonitor';
import { Grid3X3, Power, Monitor, Signal, HelpCircle, Activity } from 'lucide-react';

const StandaloneProgramView: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);

  // Shared state values for synchronization with control panel
  const [selectedGameId, setSelectedGameId] = useSharedState<string>('BROHUBS_STUDIO_SELECTED_GAME_ID', '');
  const [selectedThemeId, setSelectedThemeId] = useSharedState<string>('BROHUBS_STUDIO_SELECTED_THEME_ID', '');
  const [routeAssetId, setRouteAssetId] = useState<string | null>(() => resolveAssetIdFromLocation());
  const [projectScope, setProjectScope] = useState(() => resolveProjectScopeFromLocation());
  const programLayersKey = getProgramLayersKey(projectScope);
  const [programLayers, setProgramLayers] = useSharedState<Record<number, string | null>>(
    programLayersKey,
    DEFAULT_PROGRAM_LAYERS
  );

  // Local helper UI states for alignment
  const [showGrid, setShowGrid] = useState(false);
  const [showCheckerboard, setShowCheckerboard] = useState(false);
  const [notifyConnected, setNotifyConnected] = useState(true);
  const [scale, setScale] = useState(1);
  const [globalLogo, setGlobalLogo] = useState<string | null>(null);
  const [projectPlayers, setProjectPlayers] = useState<PlayerData[]>(() =>
    loadProjectPlayers(projectScope)
  );
  const [layerPlayKeys, setLayerPlayKeys] = useState<Record<number, number>>({});
  const prevProgramLayersRef = useRef(programLayers);

  // Paksa remount + replay animasi in/out tiap ada aksi Play (walau asset di layer sama),
  // supaya Output ikut beranimasi seperti Monitor PROGRAM. Layer diambil dari payload trigger,
  // fallback ke layer yang sedang memegang asset tsb.
  const bumpLayerPlayKey = useCallback((layer: number) => {
    if (!layer || layer < 1) return;
    setLayerPlayKeys((keys) => ({ ...keys, [layer]: (keys[layer] ?? 0) + 1 }));
  }, []);

  // OBS / browser source: follow PGM triggers via SSE (scoped to this project output link)
  useCompanionOutputSync(setProgramLayers, true, projectScope, (payload) => {
    if (payload.action && payload.action !== 'play') return;
    const layer =
      payload.layer ||
      Number(
        Object.keys(programLayers).find((k) => programLayers[Number(k)] === payload.assetId)
      ) ||
      1;
    bumpLayerPlayKey(layer);
  });
  const programLayerSlots = useMemo(
    () => Object.keys(DEFAULT_PROGRAM_LAYERS).sort((a, b) => Number(a) - Number(b)),
    []
  );

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = 'transparent';
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

  useEffect(() => {
    const prev = prevProgramLayersRef.current;
    const next = programLayers;

    setLayerPlayKeys((keys) => {
      const nextKeys = { ...keys };
      let bumped = false;

      Object.entries(next).forEach(([layer, assetId]) => {
        const layerNum = Number(layer);
        if (assetId && assetId !== prev[layerNum]) {
          nextKeys[layerNum] = (nextKeys[layerNum] ?? 0) + 1;
          bumped = true;
        }
      });

      return bumped ? nextKeys : keys;
    });

    prevProgramLayersRef.current = next;
  }, [programLayers]);

  useEffect(() => {
    let cancelled = false;

    const syncPlayers = async () => {
      await hydrateProjectCacheForScope(projectScope);
      if (!cancelled) {
        setProjectPlayers(loadProjectPlayers(projectScope));
      }
    };

    syncPlayers();

    const handleStorage = (event: StorageEvent) => {
      if (!event.key?.startsWith('BROHUBS_PROJECTS_')) return;
      void syncPlayers();
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', handleStorage);
    };
  }, [projectScope]);

  useEffect(() => {
    let cancelled = false;

    resolveProjectScopeFromLocationAsync().then((scope) => {
      if (!cancelled) setProjectScope(scope);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load games, themes, and global logo on mount
  useEffect(() => {
    const loadContent = async () => {
      try {
        const loadedGames = await getGames();
        const loadedThemes = await getThemes();
        setGames(loadedGames);
        setThemes(loadedThemes);

        const savedGlobal = localStorage.getItem('globalLogo');
        if (savedGlobal) setGlobalLogo(savedGlobal);
      } catch (err) {
        console.error('Failed to load standalone program assets', err);
      } finally {
        setLoading(false);
      }
    };
    loadContent();

    // Auto fade-out connected banner after 4s
    const timer = setTimeout(() => {
      setNotifyConnected(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  // Resolve /o/{member}/{project}/{asset-slug} URLs to a concrete overlay asset
  useEffect(() => {
    const syncRouteAsset = () => setRouteAssetId(resolveAssetIdFromLocation());

    syncRouteAsset();
    window.addEventListener('popstate', syncRouteAsset);
    return () => window.removeEventListener('popstate', syncRouteAsset);
  }, []);

  useEffect(() => {
    if (!routeAssetId || themes.length === 0) return;

    const asset = ASSET_DATABASE.find((a) => a.id === routeAssetId);
    if (!asset) return;

    setSelectedGameId(asset.gameId);
    const theme = themes.find((t) => t.gameId === asset.gameId);
    if (theme) setSelectedThemeId(theme.id);
  }, [routeAssetId, themes, setSelectedGameId, setSelectedThemeId]);

  // Set up auto-scaling logic matching 16:9 1920x1080 resolution
  useEffect(() => {
    const handleResize = () => {
      const targetW = 1920;
      const targetH = 1080;
      const windowW = window.innerWidth;
      const windowH = window.innerHeight;

      // Fit scale
      const scaleW = windowW / targetW;
      const scaleH = windowH / targetH;
      setScale(Math.min(scaleW, scaleH));
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcut routing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const char = e.key.toLowerCase();
      if (char === 'g') {
        setShowGrid(p => !p);
      } else if (char === 'c') {
        setShowCheckerboard(p => !p);
      } else if (char === 'h') {
        setNotifyConnected(p => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Render method for active program assets
  const renderProgramAsset = useCallback((
    assetId: string | null,
    style?: React.CSSProperties,
    overrideKey?: string,
    feedPlayKey?: number
  ) => {
    if (!assetId) return null;
    const assetToPlay = ASSET_DATABASE.find(a => a.id === assetId);
    if (!assetToPlay) return null;

    // Resolve the appropriate theme
    const themeToUse = themes.find(t => t.id === selectedThemeId) || themes.find(t => t.gameId === assetToPlay.gameId);
    if (!themeToUse) return null;

    if (assetToPlay.gameId === 'pubg') {
      if (assetToPlay.id === 'pmgc-fraggers') {
        return (
          <OverlayTopFraggersView
            key={overrideKey || assetToPlay.id}
            asset={assetToPlay}
            theme={themeToUse}
            games={games}
            themes={themes}
            availableAssets={ASSET_DATABASE}
            userRole="member" // standalones run in non-control visual mode
            onBack={() => {}}
            globalLogo={globalLogo}
            projectPlayers={projectPlayers}
            isGlobalStudio={true}
            visualOnly={true}
            style={style}
          />
        );
      }
      if (assetToPlay.id === 'pmgc-leaderboard') {
        return (
          <OverlayOverallRankingView
            key={overrideKey || assetToPlay.id}
            asset={assetToPlay}
            theme={themeToUse}
            games={games}
            themes={themes}
            availableAssets={ASSET_DATABASE}
            userRole="member"
            onBack={() => {}}
            globalLogo={globalLogo}
            projectPlayers={projectPlayers}
            isGlobalStudio={true}
            visualOnly={true}
            monitorFeed={true}
            programFeed={true}
            feedPlayKey={feedPlayKey}
            style={style}
          />
        );
      }
      if (assetToPlay.id === 'pmgc-team-roster') {
        return (
          <OverlayTeamRosterView
            key={overrideKey || assetToPlay.id}
            asset={assetToPlay}
            theme={themeToUse}
            games={games}
            themes={themes}
            availableAssets={ASSET_DATABASE}
            userRole="member"
            onBack={() => {}}
            globalLogo={globalLogo}
            projectPlayers={projectPlayers}
            isGlobalStudio={true}
            visualOnly={true}
            monitorFeed={true}
            feedPlayKey={feedPlayKey}
            style={style}
          />
        );
      }
    }
    if (assetToPlay.gameId === 'val') {
      if (assetToPlay.id === 'val-team-roster') {
        return (
          <OverlayValTeamRosterView
            key={overrideKey || assetToPlay.id}
            asset={assetToPlay}
            theme={themeToUse}
            games={games}
            themes={themes}
            availableAssets={ASSET_DATABASE}
            userRole="member"
            onBack={() => {}}
            globalLogo={globalLogo}
            projectPlayers={projectPlayers}
            isGlobalStudio={true}
            visualOnly={true}
            monitorFeed={true}
            feedPlayKey={feedPlayKey}
            style={style}
          />
        );
      }
    }
    if (assetToPlay.gameId === 'mlbb') {
      if (assetToPlay.id === 'mlbb-team-roster') {
        return (
          <OverlayMlbbTeamRosterView
            key={overrideKey || assetToPlay.id}
            asset={assetToPlay}
            theme={themeToUse}
            games={games}
            themes={themes}
            availableAssets={ASSET_DATABASE}
            userRole="member"
            onBack={() => {}}
            globalLogo={globalLogo}
            projectPlayers={projectPlayers}
            isGlobalStudio={true}
            visualOnly={true}
            monitorFeed={true}
            feedPlayKey={feedPlayKey}
            style={style}
          />
        );
      }
      if (assetToPlay.id === 'mlbb-draf-n-pick') {
        return (
          <OverlayMlbbDrafNPickView
            key={overrideKey || assetToPlay.id}
            asset={assetToPlay}
            theme={themeToUse}
            games={games}
            themes={themes}
            availableAssets={ASSET_DATABASE}
            userRole="member"
            onBack={() => {}}
            projectPlayers={projectPlayers}
            visualOnly={true}
            monitorFeed={true}
            programFeed={true}
            feedPlayKey={feedPlayKey}
            style={style}
          />
        );
      }
    }
    return null;
  }, [themes, selectedThemeId, games, globalLogo, projectPlayers]);

  if (loading) {
    return (
      <div id="standalone-loading" className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#ccff00]/20 border-t-[#ccff00] rounded-full animate-spin" />
          <span className="text-xs font-black tracking-[0.3em] text-zinc-500 uppercase italic">
            BROHUBS PROGRAM NODE INITIALIZING...
          </span>
        </div>
      </div>
    );
  }

  const activeLayersCount = routeAssetId
    ? 1
    : Object.values(programLayers).filter((assetId) => {
    if (!assetId) return false;
    return true;
  }).length;

  return (
    <div 
      id="standalone-viewport"
      className={`min-h-screen relative flex items-center justify-center overflow-hidden transition-colors duration-500 select-none ${
        showCheckerboard 
          ? 'bg-[#050505]' 
          : 'bg-transparent'
      }`}
      style={showCheckerboard ? {
        backgroundImage: 'conic-gradient(#0a0a0a 90deg, #050505 90deg 180deg, #0a0a0a 180deg 270deg, #050505 270deg)',
        backgroundSize: '24px 24px'
      } : {}}
    >
      {/* 1920x1080 Scaled Canvas Container */}
      <div 
        id="program-canvas"
        className="w-[1920px] h-[1080px] origin-center relative transition-transform duration-300 ease-out shrink-0"
        style={{ transform: `scale(${scale})` }}
      >
        {/* Layer Renderer */}
        <div className="absolute inset-0">
          {programLayerSlots.map((layer) => {
            const layerNum = Number(layer);
            const assetId = programLayers[layerNum];
            // URL output asset (/o/... atau ?asset=...) harus tetap terlihat saat
            // dibuka dari perangkat lain seperti OBS/vMix. Program layer hanya
            // mengatur tampilan ketika tidak ada asset yang ditentukan oleh URL.
            const visibleAssetId = routeAssetId
              ? layerNum === 1
                ? routeAssetId
                : null
              : assetId;
            const layerPlayKey = layerPlayKeys[layerNum] ?? 0;

            return (
              <div
                key={`standalone-layer-slot-${layer}`}
                className="absolute inset-0"
                style={{ zIndex: layerNum }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {visibleAssetId ? (
                    // Anak langsung AnimatePresence WAJIB motion element (samakan dengan Monitor PGM),
                    // supaya animasi in/out yang bersarang di masterFrame (mis. Draf N Pick) ikut jalan.
                    // exit menahan sampai anak selesai (when: afterChildren) agar OUT tidak "lompat".
                    <motion.div
                      key={`standalone-layer-${layer}-${visibleAssetId}-${layerPlayKey}`}
                      className="absolute inset-0"
                      initial={false}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 1, transition: { when: 'afterChildren' } }}
                    >
                      <PreviewControlContext.Provider
                        value={{
                          playKey: layerPlayKey,
                          programPlayKey: layerPlayKey,
                          isLooping: false,
                          isPreviewPlaying: true,
                          replay: () => {},
                        }}
                      >
                        {renderProgramAsset(
                          visibleAssetId,
                          {
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                          },
                          `standalone-layer-${layer}-${visibleAssetId}-${layerPlayKey}`,
                          layerPlayKey
                        )}
                      </PreviewControlContext.Provider>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Alignment Grid Overlay */}
        {showGrid && (
          <div id="alignment-grid" className="absolute inset-0 pointer-events-none z-[100] animate-fade-in">
            {/* Main Grid */}
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(to right, rgba(204, 255, 0, 0.15) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(204, 255, 0, 0.15) 1px, transparent 1px)
              `,
              backgroundSize: '120px 120px'
            }} />
            
            {/* Center Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-[1px] bg-[#ccff00]/60" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-[1px] bg-[#ccff00]/60" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 border border-[#ccff00] rounded-full" />

            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-24 h-24 border-t-4 border-l-4 border-[#ccff00]/40" />
            <div className="absolute top-0 right-0 w-24 h-24 border-t-4 border-r-4 border-[#ccff00]/40" />
            <div className="absolute bottom-0 left-0 w-24 h-24 border-b-4 border-l-4 border-[#ccff00]/40" />
            <div className="absolute bottom-0 right-0 w-24 h-24 border-b-4 border-r-4 border-[#ccff00]/40" />

            {/* Title Block Safe Area boundaries (90% Action Safe) */}
            <div className="absolute inset-[5%] border-2 border-dashed border-[#ccff00]/25 rounded flex items-start justify-between p-2">
              <span className="text-[7px] font-mono text-[#ccff00]/50 tracking-widest leading-none bg-black/40 px-1 rounded">ACTION SAFE (90%)</span>
              <span className="text-[7px] font-mono text-[#ccff00]/50 tracking-widest leading-none bg-black/40 px-1 rounded">1920x1080 60FPS</span>
            </div>

            {/* Safe Area bounds (93% Title Safe) */}
            <div className="absolute inset-[3.5%] border border-[#ccff00]/10 rounded flex items-start justify-between p-2 pointer-events-none">
              <span className="text-[6px] font-mono text-[#ccff00]/30 tracking-widest leading-none">TITLE SAFE (93%)</span>
            </div>
          </div>
        )}
      </div>

      {/* Operator System Utilities Overlay (Press G / C / H) */}
      <AnimatePresence>
        {notifyConnected && (
          <motion.div 
            id="standalone-notification"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed top-6 left-6 z-[200] max-w-sm bg-black/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex items-start gap-3.5 select-none"
          >
            <div className="w-10 h-10 bg-[#ccff00]/10 border border-[#ccff00]/20 rounded-xl flex items-center justify-center text-[#ccff00] shrink-0 animate-pulse">
              <Activity size={18} />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-[10px] font-black tracking-widest text-white uppercase italic flex items-center gap-2">
                BROADCAST OVERLAY ACTIVE
                <span className="inline-flex w-1.5 h-1.5 rounded-full bg-[#ccff00] animate-ping" />
              </h4>
              <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider mt-1">
                CONNECTED TO CONTROL DESK • {activeLayersCount} ACTIVE LAYERS
              </p>
              
              <div className="mt-3 pt-2.5 border-t border-white/5 space-y-1 text-[8px] font-black tracking-wide text-zinc-400 uppercase">
                <div className="flex items-center justify-between">
                  <span>TOGGLE ALIGNMENT GRID:</span>
                  <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded font-mono text-white text-[7px]">G</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>TRANS CHECKERBOARD:</span>
                  <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded font-mono text-white text-[7px]">C</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>HIDE/SHOW THIS GUIDE:</span>
                  <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded font-mono text-white text-[7px]">H</kbd>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Small subtle corner indicator showing it's a transparency-configured canvas */}
      <div className="fixed bottom-4 right-4 z-[200] opacity-10 hover:opacity-100 transition-opacity duration-300 flex items-center gap-1.5 px-2 py-1 rounded bg-black/60 backdrop-blur text-[8px] font-black text-zinc-500 hover:text-white uppercase tracking-widest">
        <Monitor size={10} /> Standalone View ({Math.round(scale * 100)}% fit)
      </div>
    </div>
  );
};

export default StandaloneProgramView;
