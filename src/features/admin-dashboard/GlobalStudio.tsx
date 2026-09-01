import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Game, Theme, Asset, Project } from '@/types';
import { ASSET_DATABASE } from '@/features/assets/assets';
import OverlayTopFraggersView from '@/features/games/pubg-mobile/overlays/theme-01/top-fraggers';
import OverlayOverallRankingView from '@/features/games/pubg-mobile/overlays/theme-01/leaderboard';
import OverlayTeamRosterView from '@/features/games/pubg-mobile/overlays/theme-01/team-roster';
import OverlayValTeamRosterView from '@/features/games/valorant/overlays/theme-01/team-roster';
import OverlayMlbbTeamRosterView from '@/features/games/mobile-legends/overlays/theme-01/team-roster';
import OverlayMlbbDrafNPickView from '@/features/games/mobile-legends/overlays/theme-01/draf-n-pick';
import PanelControlMonitor from '@/features/companion/PanelControlMonitor';
import { LayoutTemplate, Monitor, Settings2, ChevronDown, Gamepad2, Palette, Layers, Eye, EyeOff, Play, Square, Keyboard, Radio, Copy, Check, ExternalLink, HelpCircle, Info, X, ArrowLeft, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSharedState } from '@/lib/useSharedState';
import { DEFAULT_PROGRAM_LAYERS, getProgramLayersKey, getPreviewAssetKey, companionScopeMatches } from '@/features/companion/programLayers';
import { notifyCompanionTrigger, type CompanionTriggerPayload } from '@/features/companion/companionProgram';
import { applyCompanionDataPayload, notifyCompanionData, type CompanionDataPayload } from '@/features/companion/overlayData';
import {
  AnimationConfig,
  resolveAnimationConfig,
} from '@/constants/transitions';
import {
  LEADERBOARD_ANIMATION_PRESETS,
  LEADERBOARD_ANIMATION_STORAGE_KEY,
  LEADERBOARD_DEFAULT_ANIMATION,
  LEADERBOARD_PROGRAM_VISIBLE_KEY,
  LEADERBOARD_PRESET_OVERRIDES_STORAGE_KEY,
  resolveLeaderboardOutroHoldMs,
  type LeaderboardPresetOverrides,
} from '@/features/games/pubg-mobile/overlays/theme-01/leaderboard/animation/config';
import { useT } from '@/i18n/LanguageContext';

interface GlobalStudioProps {
  games: Game[];
  themes: Theme[];
  userRole: 'admin' | 'member';
  globalLogo?: string | null;
  project?: Project;
  onBack?: () => void;
}

const LEADERBOARD_ASSET_ID = 'pmgc-leaderboard';
const DEFAULT_STUDIO_THEMES: Record<string, Theme> = {
  mlbb: {
    id: 'mlbb-default',
    gameId: 'mlbb',
    name: 'MLBB DEFAULT',
    desc: 'Default Mobile Legends broadcast profile',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop',
    tier: 'BASIC',
    locked: false,
  },
};
const HIDDEN_STUDIO_THEME_IDS = new Set(['mlbb-t1', 'mlbb-t2', 'mlbb-t3']);

function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function resolveLeaderboardOutroDelayMs(): number {
  const storedConfig = readJsonStorage<AnimationConfig>(
    LEADERBOARD_ANIMATION_STORAGE_KEY,
    LEADERBOARD_DEFAULT_ANIMATION
  );
  const presetOverrides = readJsonStorage<LeaderboardPresetOverrides>(
    LEADERBOARD_PRESET_OVERRIDES_STORAGE_KEY,
    {}
  );
  const config = resolveAnimationConfig(
    storedConfig,
    presetOverrides,
    LEADERBOARD_ANIMATION_PRESETS
  );
  return resolveLeaderboardOutroHoldMs(config);
}

const GlobalStudio: React.FC<GlobalStudioProps> = ({ games, themes, userRole, globalLogo, project, onBack }) => {
  const t = useT();
  const companionProjectScope = project?.id ?? null;
  const [selectedGameId, setSelectedGameId] = useSharedState<string>('BROHUBS_STUDIO_SELECTED_GAME_ID', games[0]?.id || '');
  const [selectedThemeId, setSelectedThemeId] = useSharedState<string>('BROHUBS_STUDIO_SELECTED_THEME_ID', '');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [previewAssetId, setPreviewAssetId] = useSharedState<string | null>(
    getPreviewAssetKey(companionProjectScope),
    null
  );
  const [programLayers, setProgramLayers] = useSharedState<Record<number, string | null>>(
    getProgramLayersKey(project?.id),
    { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null }
  );
  const [, setLeaderboardProgramVisible] = useSharedState<boolean>(
    LEADERBOARD_PROGRAM_VISIBLE_KEY,
    true
  );
  const [assetLayerSelection, setAssetLayerSelection] = useSharedState<Record<string, number | null>>(`BROHUBS_STUDIO_ASSET_LAYERS_${project?.id || 'GLOBAL'}`, {});
  const [assetCardOrder, setAssetCardOrder] = useSharedState<string[]>(
    `BROHUBS_STUDIO_ASSET_CARD_ORDER_${project?.id || 'GLOBAL'}`,
    []
  );
  const [draggedAssetId, setDraggedAssetId] = useState<string | null>(null);
  const [showList, setShowList] = useState(true);
  const [showMonitor, setShowMonitor] = useState(true);
  /** Play key per layer — untuk remount animasi internal (roster); di-bump sinkron saat take-to-air */
  const [programLayerPlayKeys, setProgramLayerPlayKeys] = useState<Record<number, number>>({});
  /** Play key preview monitor — agar animasi staging identik dengan program */
  const [previewFeedKey, setPreviewFeedKey] = useState(0);
  const pendingProgramStopTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const bumpProgramLayerPlayKey = useCallback((layer: number) => {
    setProgramLayerPlayKeys((keys) => ({
      ...keys,
      [layer]: (keys[layer] ?? 0) + 1,
    }));
  }, []);

  const completeProgramStop = useCallback((assetId: string) => {
    if (pendingProgramStopTimersRef.current[assetId]) {
      clearTimeout(pendingProgramStopTimersRef.current[assetId]);
      delete pendingProgramStopTimersRef.current[assetId];
    }

    setProgramLayers(prev => {
      const newLayers = { ...prev };
      Object.keys(newLayers).forEach(key => {
        if (newLayers[Number(key)] === assetId) newLayers[Number(key)] = null;
      });
      return newLayers;
    });
    notifyCompanionTrigger(assetId, 'stop', undefined, companionProjectScope);
  }, [companionProjectScope, setProgramLayers]);

  // Bitfocus Companion connection & integration states
  const [showCompanionModal, setShowCompanionModal] = useState(false);
  const [copiedAssetId, setCopiedAssetId] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [companionEnabled, setCompanionEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('companion_enabled');
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('companion_enabled', String(companionEnabled));
    } catch {}
  }, [companionEnabled]);

  const getCompanionUrl = (assetId: string, action: string, layer?: number) => {
    if (typeof window === 'undefined') return '';
    const base = window.location.origin;
    let url = `${base}/api/companion/trigger?assetId=${assetId}&action=${action}`;
    if (layer !== undefined) {
      url += `&layer=${layer}`;
    }
    if (companionProjectScope) {
      url += `&projectScope=${encodeURIComponent(companionProjectScope)}`;
    }
    return url;
  };

  const getProgramOutputUrl = () => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('view', 'program');
    if (companionProjectScope) {
      url.searchParams.set('project', companionProjectScope);
    }
    return url.toString();
  };

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedAssetId(id);
    setTimeout(() => {
      setCopiedAssetId(null);
    }, 2000);
  };

  // Custom Keyboard / Companion Hotkeys state
  const [hotkeys, setHotkeys] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('BROHUBS_STUDIO_HOTKEYS');
      return saved ? JSON.parse(saved) : {
        'pmgc-fraggers': 'F',
        'pmgc-leaderboard': 'L',
        'pmgc-team-roster': 'R',
      };
    } catch (e) {
      return {
        'pmgc-fraggers': 'F',
        'pmgc-leaderboard': 'L',
        'pmgc-team-roster': 'R',
      };
    }
  });
  const [listeningAssetId, setListeningAssetId] = useState<string | null>(null);
  
  const assetLayerSelectionRef = useRef(assetLayerSelection);
  useEffect(() => {
    assetLayerSelectionRef.current = assetLayerSelection;
  }, [assetLayerSelection]);

  // Resizable Sidebar Logic
  const [sidebarWidth, setSidebarWidth] = useState(224); // Default w-56 (224px)
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
        // Calculate new width based on mouse position
        // We subtract the main dashboard sidebar width (approx 80px-256px) 
        // but it's safer to use movement or relative calculation if possible.
        // For simplicity in this layout, we'll use a direct clientX approach 
        // and cap it between 180px and 450px.
        const newWidth = mouseMoveEvent.clientX - (userRole === 'admin' ? 100 : 100); 
        if (newWidth > 160 && newWidth < 480) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing, userRole]
  );

  React.useEffect(() => {
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

  const filteredThemes = useMemo(
    () => themes.filter(t => t.gameId === selectedGameId && !HIDDEN_STUDIO_THEME_IDS.has(t.id)),
    [themes, selectedGameId]
  );
  const filteredAssets = useMemo(() => {
    let assets = ASSET_DATABASE;
    if (project) {
        assets = project.deployedAssets || [];
    }
    return assets.filter(a => a.gameId === selectedGameId);
  }, [selectedGameId, project]);
  const orderedSidebarAssets = useMemo(() => {
    const assetsById = new Map(filteredAssets.map((asset) => [asset.id, asset]));
    const savedAssets = assetCardOrder
      .map((assetId) => assetsById.get(assetId))
      .filter((asset): asset is Asset => Boolean(asset));
    const savedIds = new Set(savedAssets.map((asset) => asset.id));
    return [...savedAssets, ...filteredAssets.filter((asset) => !savedIds.has(asset.id))];
  }, [assetCardOrder, filteredAssets]);
 
  // Sync selected game with project game ID
  useEffect(() => {
    if (project?.gameId) {
      setSelectedGameId(project.gameId);
    }
  }, [project, setSelectedGameId]);

  // Auto-select first theme and asset when game changes
  useEffect(() => {
    if (filteredThemes.length > 0 && !filteredThemes.find(t => t.id === selectedThemeId)) {
      setSelectedThemeId(filteredThemes[0].id);
    }
    if (filteredAssets.length > 0 && !filteredAssets.find(a => a.id === selectedAssetId)) {
      setSelectedAssetId(filteredAssets[0].id);
    }
  }, [selectedGameId, filteredThemes, filteredAssets, selectedThemeId, selectedAssetId]);

  const activeTheme = useMemo(
    () => themes.find(t => t.id === selectedThemeId && !HIDDEN_STUDIO_THEME_IDS.has(t.id)) || filteredThemes[0] || DEFAULT_STUDIO_THEMES[selectedGameId],
    [themes, selectedThemeId, filteredThemes, selectedGameId]
  );
  const activeAsset = useMemo(() => filteredAssets.find(a => a.id === selectedAssetId) || filteredAssets[0], [selectedAssetId, filteredAssets]);

  const toggleLayerSelection = useCallback((assetId: string, layer: number) => {
    setAssetLayerSelection(prev => ({
      ...prev,
      [assetId]: prev[assetId] === layer ? null : layer
    }));
  }, []);

  const moveAssetCard = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;

    setAssetCardOrder((previousOrder) => {
      const knownIds = new Set(previousOrder);
      const completeOrder = [
        ...previousOrder,
        ...filteredAssets.map((asset) => asset.id).filter((assetId) => !knownIds.has(assetId)),
      ];
      const fromIndex = completeOrder.indexOf(draggedId);
      const targetIndex = completeOrder.indexOf(targetId);
      if (fromIndex < 0 || targetIndex < 0) return completeOrder;

      const nextOrder = [...completeOrder];
      nextOrder.splice(fromIndex, 1);
      nextOrder.splice(nextOrder.indexOf(targetId), 0, draggedId);
      return nextOrder;
    });
  }, [filteredAssets, setAssetCardOrder]);

  const stopProgramAsset = useCallback((assetId: string) => {
    if (pendingProgramStopTimersRef.current[assetId]) {
      clearTimeout(pendingProgramStopTimersRef.current[assetId]);
      delete pendingProgramStopTimersRef.current[assetId];
    }

    if (assetId !== LEADERBOARD_ASSET_ID) {
      completeProgramStop(assetId);
      return;
    }

    setLeaderboardProgramVisible(false);
    notifyCompanionData(
      {
        assetId,
        data: { [LEADERBOARD_PROGRAM_VISIBLE_KEY]: false },
      },
      companionProjectScope
    );
    pendingProgramStopTimersRef.current[assetId] = setTimeout(
      () => completeProgramStop(assetId),
      resolveLeaderboardOutroDelayMs()
    );
  }, [companionProjectScope, completeProgramStop, setLeaderboardProgramVisible]);

  const showProgramAsset = useCallback((assetId: string) => {
    if (pendingProgramStopTimersRef.current[assetId]) {
      clearTimeout(pendingProgramStopTimersRef.current[assetId]);
      delete pendingProgramStopTimersRef.current[assetId];
    }

    if (assetId !== LEADERBOARD_ASSET_ID) return;
    setLeaderboardProgramVisible(true);
    notifyCompanionData(
      {
        assetId,
        data: { [LEADERBOARD_PROGRAM_VISIBLE_KEY]: true },
      },
      companionProjectScope
    );
  }, [companionProjectScope, setLeaderboardProgramVisible]);

  const handlePlayAsset = useCallback((assetId: string) => {
    const isProgram = Object.values(programLayers).includes(assetId);
    const isPreview = previewAssetId === assetId;
    const selectedLayer = assetLayerSelectionRef.current[assetId];

    if (selectedLayer) {
      // If a layer is selected, we manage PROGRAM status directly
      if (isProgram) {
        // Status 2 -> Status 0 (OFF)
        stopProgramAsset(assetId);
      } else {
        // Status 0 or 1 -> Status 2 (PROGRAM)
        showProgramAsset(assetId);
        setPreviewAssetId(null); // Ensure it's not in preview anymore
        bumpProgramLayerPlayKey(selectedLayer);
        setProgramLayers(prev => {
          const newLayers = { ...prev };
          // Remove from other layers if it was playing elsewhere
          Object.keys(newLayers).forEach(key => {
            if (newLayers[Number(key)] === assetId) newLayers[Number(key)] = null;
          });
          newLayers[selectedLayer] = assetId;
          return newLayers;
        });
        notifyCompanionTrigger(assetId, 'play', selectedLayer, companionProjectScope);
      }
    } else {
      // If no layer is selected, we only manage PREVIEW status
      if (isPreview) {
        // Status 1 -> Status 0 (OFF)
        setPreviewAssetId(null);
      } else {
        // Status 0 -> Status 1 (PREVIEW)
        // If it was in PROGRAM (maybe layer was unselected while playing?), we stop it first
        if (isProgram) {
          stopProgramAsset(assetId);
        }
        setPreviewFeedKey((k) => k + 1);
        setPreviewAssetId(assetId);
      }
    }
  }, [programLayers, previewAssetId, bumpProgramLayerPlayKey, companionProjectScope, showProgramAsset, stopProgramAsset]);

  const selectAssetForPreview = useCallback((assetId: string) => {
    setSelectedAssetId(assetId);
    if (previewAssetId === assetId) return;
    setPreviewFeedKey((key) => key + 1);
    setPreviewAssetId(assetId);
  }, [previewAssetId, setPreviewAssetId]);

  const getAssetStatus = useCallback((assetId: string) => {
    if (Object.values(programLayers).includes(assetId)) return 2; // PROGRAM
    if (previewAssetId === assetId) return 1; // PREVIEW
    return 0; // OFF
  }, [programLayers, previewAssetId, companionProjectScope]);

  // Bind keydown events for quick play/stop activation or custom hotkey routing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when the user is typing inside inputs, selects, or textareas
      const activeEl = document.activeElement;
      if (
        activeEl && (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true'
        )
      ) {
        return;
      }

      if (listeningAssetId) {
        e.preventDefault();
        const keyName = e.key.toUpperCase();
        
        // Handle deletion / clearing via Backspace or Delete keys
        if (['BACKSPACE', 'DELETE'].includes(keyName)) {
          const newHotkeys = { ...hotkeys };
          delete newHotkeys[listeningAssetId];
          setHotkeys(newHotkeys);
          localStorage.setItem('BROHUBS_STUDIO_HOTKEYS', JSON.stringify(newHotkeys));
          setListeningAssetId(null);
          return;
        }

        // Cancel listening with Escape key
        if (keyName === 'ESCAPE') {
          setListeningAssetId(null);
          return;
        }

        // Ignore modifier keys when pressed as the sole active key
        if (['SHIFT', 'CONTROL', 'ALT', 'META', 'CAPSLOCK'].includes(keyName)) {
          return;
        }

        // Build key combination
        const modifiers: string[] = [];
        if (e.ctrlKey) modifiers.push('CTRL');
        if (e.shiftKey) modifiers.push('SHIFT');
        if (e.altKey) modifiers.push('ALT');
        if (e.metaKey) modifiers.push('META');

        const finalKey = [...modifiers, keyName].join('+');

        const newHotkeys = {
          ...hotkeys,
          [listeningAssetId]: finalKey
        };
        setHotkeys(newHotkeys);
        localStorage.setItem('BROHUBS_STUDIO_HOTKEYS', JSON.stringify(newHotkeys));
        setListeningAssetId(null);
        return;
      }

      const pressedKey = e.key.toUpperCase();
      if (['CONTROL', 'SHIFT', 'ALT', 'META', 'CAPSLOCK', 'ESCAPE', 'BACKSPACE', 'DELETE'].includes(pressedKey)) {
        return;
      }

      // Build key combination with modifiers to search for matching binds
      const modifiers: string[] = [];
      if (e.ctrlKey) modifiers.push('CTRL');
      if (e.shiftKey) modifiers.push('SHIFT');
      if (e.altKey) modifiers.push('ALT');
      if (e.metaKey) modifiers.push('META');

      const pressedCombo = [...modifiers, pressedKey].join('+');

      const matchedAssetIds = Object.keys(hotkeys).filter(id => hotkeys[id] === pressedCombo);
      if (matchedAssetIds.length > 0) {
        let didPreventDefault = false;
        matchedAssetIds.forEach(matchedAssetId => {
          const isMatchedAssetInActiveGame = filteredAssets.some(a => a.id === matchedAssetId);
          if (isMatchedAssetInActiveGame) {
            if (!didPreventDefault) {
              e.preventDefault();
              didPreventDefault = true;
            }
            handlePlayAsset(matchedAssetId);
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [listeningAssetId, hotkeys, filteredAssets, handlePlayAsset]);

  // Trigger handler for external stream/companion triggers
  const handleCompanionTrigger = useCallback((payload: CompanionTriggerPayload) => {
    if (!companionScopeMatches(payload.projectScope, companionProjectScope)) return;

    const { assetId, action, layer } = payload;
    
    // Check if the asset exists (case-insensitive)
    const targetAsset = ASSET_DATABASE.find(a => a.id.toLowerCase() === assetId.toLowerCase());
    if (!targetAsset) return;
    
    const resolvedAssetId = targetAsset.id;

    const isProgram = Object.values(programLayers).includes(resolvedAssetId);
    const isPreview = previewAssetId === resolvedAssetId;

    if (layer !== undefined) {
      setAssetLayerSelection(prev => ({
        ...prev,
        [resolvedAssetId]: layer === 0 ? null : layer
      }));
    }

    if (action === 'play') {
      const activeLayer = layer || assetLayerSelectionRef.current[resolvedAssetId] || 1;
      setPreviewAssetId(null);
      bumpProgramLayerPlayKey(activeLayer);
      setProgramLayers(prev => {
        const newLayers = { ...prev };
        Object.keys(newLayers).forEach(key => {
          if (newLayers[Number(key)] === resolvedAssetId) newLayers[Number(key)] = null;
        });
        newLayers[activeLayer] = resolvedAssetId;
        return newLayers;
      });
    } else if (action === 'stop') {
      setPreviewAssetId(null);
      setProgramLayers(prev => {
        const newLayers = { ...prev };
        Object.keys(newLayers).forEach(key => {
          if (newLayers[Number(key)] === resolvedAssetId) newLayers[Number(key)] = null;
        });
        return newLayers;
      });
    } else if (action === 'toggle') {
      if (layer !== undefined && layer > 0) {
        setPreviewAssetId(null);
        const isRemoving = programLayers[layer] === resolvedAssetId;
        if (!isRemoving) bumpProgramLayerPlayKey(layer);
        setProgramLayers(prev => {
          const newLayers = { ...prev };
          if (newLayers[layer] === resolvedAssetId) {
            newLayers[layer] = null;
          } else {
            Object.keys(newLayers).forEach(key => {
              if (newLayers[Number(key)] === resolvedAssetId) newLayers[Number(key)] = null;
            });
            newLayers[layer] = resolvedAssetId;
          }
          return newLayers;
        });
      } else {
        handlePlayAsset(resolvedAssetId);
      }
    }
  }, [programLayers, previewAssetId, handlePlayAsset, bumpProgramLayerPlayKey, companionProjectScope]);

  // Keep a ref of the trigger callback to avoid reconnecting SSE on every state change
  const handleCompanionTriggerRef = useRef(handleCompanionTrigger);
  useEffect(() => {
    handleCompanionTriggerRef.current = handleCompanionTrigger;
  }, [handleCompanionTrigger]);

  // Connect to live EventSource for Real-time Companion Actions (Member broadcast only)
  useEffect(() => {
    if (!companionEnabled || !companionProjectScope) {
      setSseConnected(false);
      return;
    }

    let sse: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      sse = new EventSource('/api/companion/stream');
      
      sse.onopen = () => {
        setSseConnected(true);
      };

      sse.addEventListener('trigger', (event: any) => {
        try {
          const payload = JSON.parse(event.data);
          handleCompanionTriggerRef.current(payload);
        } catch (e) {
          console.error('Error parsing SSE trigger payload:', e);
        }
      });

      // Preview PGM adalah payload data (bukan trigger play/stop). Terapkan
      // snapshot yang scoped agar komponen pada Monitor PGM membaca state
      // khusus PGM yang sama dengan output OBS/vMix.
      sse.addEventListener('data', (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data) as CompanionDataPayload;
          if (!payload?.assetId || !payload.data) return;
          if (!companionScopeMatches(payload.projectScope, companionProjectScope)) return;
          applyCompanionDataPayload(payload);
        } catch (error) {
          console.error('Error parsing SSE data payload:', error);
        }
      });

      sse.addEventListener('error', () => {
        setSseConnected(false);
        sse?.close();
        reconnectTimeout = setTimeout(connectSSE, 5000);
      });
    };

    connectSSE();

    return () => {
      sse?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [companionEnabled, companionProjectScope]);

  const isLive = useMemo(
    () => Object.values(programLayers).some((assetId) => assetId !== null),
    [programLayers]
  );

  const handleBack = useCallback(() => {
    if (onBack && !isLive) onBack();
  }, [onBack, isLive]);

  const renderProgramAsset = useCallback((
    id: string | null,
    overrideKey?: string,
    feedPlayKey?: number,
    programFeed = false
  ) => {
    if (!id) return null;
    const assetToPlay = ASSET_DATABASE.find(a => a.id === id);
    if (!assetToPlay) return null;

    // Use the same theme as selected or a default for the game
    const themeToUse =
      themes.find(t => t.id === selectedThemeId && !HIDDEN_STUDIO_THEME_IDS.has(t.id)) ||
      themes.find(t => t.gameId === assetToPlay.gameId && !HIDDEN_STUDIO_THEME_IDS.has(t.id)) ||
      DEFAULT_STUDIO_THEMES[assetToPlay.gameId];
    if (!themeToUse) return null;

    const monitorFeedProps = {
      visualOnly: true as const,
      monitorFeed: true,
      feedPlayKey,
      programFeed,
    };

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
            userRole={userRole}
            onBack={handleBack}
            globalLogo={globalLogo}
            projectPlayers={project?.players || []}
            companionProjectScope={companionProjectScope}
            isGlobalStudio={true}
            {...monitorFeedProps}
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
            userRole={userRole}
            onBack={handleBack}
            globalLogo={globalLogo}
            projectPlayers={project?.players || []}
            companionProjectScope={companionProjectScope}
            isGlobalStudio={true}
            onOverallRankingExitComplete={() => completeProgramStop(assetToPlay.id)}
            {...monitorFeedProps}
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
            userRole={userRole}
            onBack={handleBack}
            globalLogo={globalLogo}
            projectPlayers={project?.players || []}
            companionProjectScope={companionProjectScope}
            isGlobalStudio={true}
            {...monitorFeedProps}
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
            userRole={userRole}
            onBack={handleBack}
            globalLogo={globalLogo}
            projectPlayers={project?.players || []}
            companionProjectScope={companionProjectScope}
            isGlobalStudio={true}
            {...monitorFeedProps}
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
            userRole={userRole}
            onBack={handleBack}
            globalLogo={globalLogo}
            projectPlayers={project?.players || []}
            companionProjectScope={companionProjectScope}
            isGlobalStudio={true}
            {...monitorFeedProps}
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
            userRole={userRole}
            onBack={handleBack}
            projectPlayers={project?.players || []}
            companionProjectScope={companionProjectScope}
            isGlobalStudio={true}
            {...monitorFeedProps}
          />
        );
      }
    }
    return null;
  }, [themes, selectedThemeId, games, userRole, globalLogo, project?.players, handleBack, companionProjectScope, completeProgramStop]);

  const programLayerSlots = useMemo(
    () => Object.keys(DEFAULT_PROGRAM_LAYERS).sort((a, b) => Number(a) - Number(b)),
    []
  );

  const programMonitorPlayKey = useMemo(
    () =>
      Object.values(programLayerPlayKeys).reduce<number>(
        (sum, key) => sum + Number(key || 0),
        0
      ),
    [programLayerPlayKeys]
  );

  const programPreviewNode = useMemo(() => {
    return (
      <div className="absolute inset-0 pointer-events-none">
        {programLayerSlots.map((layer) => {
          const assetId = programLayers[Number(layer)];
          const layerPlayKey = programLayerPlayKeys[Number(layer)] ?? 0;
          return (
            <div
              key={`layer-slot-${layer}`}
              className="absolute inset-0"
              style={{ zIndex: Number(layer) }}
            >
              <AnimatePresence mode="sync">
                {assetId
                  ? renderProgramAsset(
                      assetId,
                      `layer-${layer}-${assetId}-${layerPlayKey}`,
                      layerPlayKey,
                      true
                    )
                  : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    );
  }, [programLayerSlots, programLayers, renderProgramAsset, programLayerPlayKeys]);

  const stagingPreviewNode = useMemo(() => {
    if (!previewAssetId) return null;
    return renderProgramAsset(
      previewAssetId,
      `preview-${previewAssetId}-${previewFeedKey}`,
      previewFeedKey,
      false
    );
  }, [previewAssetId, previewFeedKey, renderProgramAsset]);

  const customPreviewNode = useMemo(
    () => (
      <div className="w-full h-full relative overflow-hidden">
        <AnimatePresence mode="sync">
          {stagingPreviewNode}
        </AnimatePresence>
      </div>
    ),
    [stagingPreviewNode]
  );

  const renderAssetView = () => {
    if (!activeAsset || !activeTheme) {
      return (
        <div className="flex-1 flex items-center justify-center text-zinc-500 flex-col gap-4">
          <Layers size={48} className="opacity-20" />
          <p className="text-sm font-black tracking-widest uppercase">{t('gs.selectAssetToBegin')}</p>
        </div>
      );
    }

    // Currently only PUBG Mobile has specific views implemented in this example
    if (activeAsset.gameId === 'pubg') {
      if (activeAsset.id === 'pmgc-fraggers') {
        return (
            <OverlayTopFraggersView
              asset={activeAsset}
              theme={activeTheme}
              games={games}
              themes={filteredThemes}
              availableAssets={filteredAssets}
              userRole={userRole}
              onBack={handleBack}
              globalLogo={globalLogo}
              projectPlayers={project?.players || []}
              companionProjectScope={companionProjectScope}
              isGlobalStudio={true}
              showMonitorProp={false}
              programAssetIdProp={Object.values(programLayers).includes(activeAsset.id) ? activeAsset.id : null}
              onProgramAssetChange={handlePlayAsset}
              getAssetStatusProp={getAssetStatus}
            />
        );
      }
      if (activeAsset.id === 'pmgc-leaderboard') {
        return (
            <OverlayOverallRankingView
              asset={activeAsset}
              theme={activeTheme}
              games={games}
              themes={filteredThemes}
              availableAssets={filteredAssets}
              userRole={userRole}
              onBack={handleBack}
              globalLogo={globalLogo}
              projectPlayers={project?.players || []}
              companionProjectScope={companionProjectScope}
              isGlobalStudio={true}
              showMonitorProp={false}
              programAssetIdProp={Object.values(programLayers).includes(activeAsset.id) ? activeAsset.id : null}
              onProgramAssetChange={handlePlayAsset}
              getAssetStatusProp={getAssetStatus}
            />
        );
      }
      if (activeAsset.id === 'pmgc-team-roster') {
        return (
            <OverlayTeamRosterView
              asset={activeAsset}
              theme={activeTheme}
              games={games}
              themes={filteredThemes}
              availableAssets={filteredAssets}
              userRole={userRole}
              onBack={handleBack}
              globalLogo={globalLogo}
              projectPlayers={project?.players || []}
              companionProjectScope={companionProjectScope}
              isGlobalStudio={true}
              showMonitorProp={false}
              programAssetIdProp={Object.values(programLayers).includes(activeAsset.id) ? activeAsset.id : null}
              onProgramAssetChange={handlePlayAsset}
              getAssetStatusProp={getAssetStatus}
            />
        );
      }
    }
    if (activeAsset.gameId === 'val') {
      if (activeAsset.id === 'val-team-roster') {
        return (
            <OverlayValTeamRosterView
              asset={activeAsset}
              theme={activeTheme}
              games={games}
              themes={filteredThemes}
              availableAssets={filteredAssets}
              userRole={userRole}
              onBack={handleBack}
              globalLogo={globalLogo}
              projectPlayers={project?.players || []}
              companionProjectScope={companionProjectScope}
              isGlobalStudio={true}
              showMonitorProp={false}
              programAssetIdProp={Object.values(programLayers).includes(activeAsset.id) ? activeAsset.id : null}
              onProgramAssetChange={handlePlayAsset}
              getAssetStatusProp={getAssetStatus}
            />
        );
      }
    }
    if (activeAsset.gameId === 'mlbb') {
      if (activeAsset.id === 'mlbb-team-roster') {
        return (
          <OverlayMlbbTeamRosterView
            asset={activeAsset}
            theme={activeTheme}
            games={games}
            themes={filteredThemes}
            availableAssets={filteredAssets}
            userRole={userRole}
            onBack={handleBack}
            globalLogo={globalLogo}
            projectPlayers={project?.players || []}
            companionProjectScope={companionProjectScope}
            isGlobalStudio={true}
            showMonitorProp={false}
            programAssetIdProp={Object.values(programLayers).includes(activeAsset.id) ? activeAsset.id : null}
            onProgramAssetChange={handlePlayAsset}
            getAssetStatusProp={getAssetStatus}
          />
        );
      }
      if (activeAsset.id === 'mlbb-draf-n-pick') {
        return (
          <OverlayMlbbDrafNPickView
            asset={activeAsset}
            theme={activeTheme}
            games={games}
            themes={filteredThemes}
            availableAssets={filteredAssets}
            userRole={userRole}
            onBack={handleBack}
            projectPlayers={project?.players || []}
            companionProjectScope={companionProjectScope}
            isGlobalStudio={true}
            showMonitorProp={false}
            programAssetIdProp={Object.values(programLayers).includes(activeAsset.id) ? activeAsset.id : null}
            onProgramAssetChange={handlePlayAsset}
            getAssetStatusProp={getAssetStatus}
          />
        );
      }
    }

    // Fallback for assets without specific views
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 flex-col gap-4">
        <Monitor size={48} className="opacity-20" />
        <p className="text-sm font-black tracking-widest uppercase text-center max-w-sm">
          {t('gs.studioViewNotAvailable').replace('{name}', activeAsset.name)}
        </p>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-black animate-in fade-in duration-300 font-sans select-none overflow-hidden rounded-tl-[10px] border-l border-t border-white/5">
      {/* Global Studio Header */}
      <header className="h-auto md:h-14 bg-black border-b border-white/10 flex flex-col md:flex-row items-center px-6 py-4 md:py-0 justify-between shrink-0 relative z-[100] gap-4">
        <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start w-full md:w-auto">
          {onBack && (
            <button 
              onClick={handleBack} 
              disabled={isLive}
              className={`p-2 rounded-lg border transition-all ${
                isLive 
                  ? 'opacity-30 cursor-not-allowed bg-zinc-900 border-white/5 text-zinc-500' 
                  : 'bg-white/5 border-white/10 hover:bg-[#ccff00]/10 hover:border-[#ccff00]/30 text-white hover:border-[#ccff00]/30 cursor-pointer'
              }`}
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <LayoutTemplate size={16} className="text-[#ccff00]" />
            {userRole === 'admin' ? (
              <>
                <span className="text-white font-[950] italic text-[14px] tracking-tight uppercase leading-none">{t('gs.headerGlobal')}</span>
                <span className="text-[#ccff00] font-[950] italic text-[14px] tracking-tight uppercase leading-none">{t('gs.headerStudio')}</span>
              </>
            ) : (
                <span className="text-[#ccff00] font-[950] italic text-[14px] tracking-tight uppercase leading-none">{t('gs.headerBroadcast')}</span>
            )}
          </div>
          
          {userRole === 'admin' && (
            <>
              <div className="h-6 w-[1px] bg-white/10 mx-2" />
              
              {/* Game Selector */}
              <div className="relative group">
                <select 
                  value={selectedGameId}
                  onChange={(e) => setSelectedGameId(e.target.value)}
                  className="appearance-none bg-zinc-900/50 border border-white/10 rounded-lg pl-8 pr-8 py-1.5 text-[10px] font-black text-white tracking-widest uppercase outline-none focus:border-[#ccff00] cursor-pointer"
                >
                  {games.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
                <Gamepad2 size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>

              {/* Theme Selector */}
              <div className="relative group">
                <select 
                  value={selectedThemeId}
                  onChange={(e) => setSelectedThemeId(e.target.value)}
                  className="appearance-none bg-zinc-900/50 border border-white/10 rounded-lg pl-8 pr-8 py-1.5 text-[10px] font-black text-white tracking-widest uppercase outline-none focus:border-[#ccff00] cursor-pointer"
                  disabled={filteredThemes.length === 0}
                >
                  {filteredThemes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <Palette size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 justify-center w-full md:w-auto">
          {/* Toggle Asset List */}
          <button
            onClick={() => setShowList(prev => !prev)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 border text-[10px] font-black transition-all uppercase tracking-wider cursor-pointer ${
              showList
                ? 'bg-[#ccff00]/10 border-[#ccff00]/30 hover:border-[#ccff00]/50 text-[#ccff00]'
                : 'bg-zinc-900/40 border-white/10 hover:border-white/20 text-zinc-400 hover:text-white'
            }`}
            title={showList ? t('gs.hideAssetList') : t('gs.showAssetList')}
          >
            {showList ? <EyeOff size={11} /> : <Eye size={11} />}
            <span>{t('gs.assetLabel')}</span>
          </button>

          {/* Toggle Broadcast Monitor */}
          <button
            onClick={() => setShowMonitor(prev => !prev)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 border text-[10px] font-black transition-all uppercase tracking-wider cursor-pointer ${
              showMonitor
                ? 'bg-[#ccff00]/10 border-[#ccff00]/30 hover:border-[#ccff00]/50 text-[#ccff00]'
                : 'bg-zinc-900/40 border-white/10 hover:border-white/20 text-zinc-400 hover:text-white'
            }`}
            title={showMonitor ? t('gs.hideBroadcastMonitor') : t('gs.showBroadcastMonitor')}
          >
            {showMonitor ? <EyeOff size={11} /> : <Eye size={11} />}
            <span>{t('gs.broadcastLabel')}</span>
          </button>

          {/* Bitfocus Companion connection status in header */}
          <button
            onClick={() => setShowCompanionModal(true)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 border text-[10px] font-black transition-all uppercase tracking-wider cursor-pointer ${
              !companionEnabled
                ? 'bg-zinc-950/80 border-white/5 text-zinc-550 opacity-60 hover:opacity-100 hover:border-white/10'
                : sseConnected
                  ? 'bg-[#ccff00]/10 border-[#ccff00]/30 hover:border-[#ccff00]/50 text-[#ccff00] shadow-[0_0_15px_rgba(204,255,0,0.1)]'
                  : 'bg-zinc-900/40 border-white/10 hover:border-white/20 text-zinc-400 hover:text-white'
            }`}
            title={t('gs.configureCompanion')}
          >
            <Radio size={12} className={sseConnected && companionEnabled ? 'animate-pulse text-[#ccff00]' : 'text-zinc-500'} />
            <span>{t('gs.companionApiLabel')} {companionEnabled ? '' : t('gs.companionOff')}</span>
            <div className={`w-1.5 h-1.5 rounded-full ${!companionEnabled ? 'bg-zinc-650 border border-zinc-700' : sseConnected ? 'bg-[#ccff00]' : 'bg-red-500'}`} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Asset List Sidebar */}
        {showList && (
          <>
            <aside 
              style={{ width: `${sidebarWidth}px` }}
              className="border-r border-white/5 bg-black flex flex-col shrink-0 p-6 transition-[width] duration-75 ease-out"
            >
              <h3 className="text-[7px] font-black text-zinc-700 tracking-[0.3em] uppercase mb-6 whitespace-nowrap italic">{t('gs.availableAssets')}</h3>
              <div className="space-y-2 whitespace-nowrap overflow-y-auto custom-scrollbar pr-2">
                {orderedSidebarAssets.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => selectAssetForPreview(item.id)}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', item.id);
                      setDraggedAssetId(item.id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceId = event.dataTransfer.getData('text/plain') || draggedAssetId;
                      if (sourceId) moveAssetCard(sourceId, item.id);
                      setDraggedAssetId(null);
                    }}
                    onDragEnd={() => setDraggedAssetId(null)}
                    className={`p-4 rounded-xl border transition-all cursor-grab active:cursor-grabbing shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col gap-3 ${
                      item.id === selectedAssetId 
                        ? 'border-[#ccff00]/40 bg-[#ccff00]/[0.03] shadow-[0_0_20px_rgba(204,255,0,0.05)]' 
                        : 'border-white/5 bg-zinc-900/10 hover:border-white/10 hover:bg-zinc-900/30'
                    } ${draggedAssetId === item.id ? 'opacity-45 scale-[0.98]' : ''}`}
                  >
                    {/* TOP SECTION: Name, Shortcut Indicator, Play Action */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <GripVertical size={13} className="shrink-0 text-zinc-600" aria-hidden="true" />
                          <h4 className={`text-[10px] font-black uppercase tracking-widest truncate ${
                            item.id === selectedAssetId ? 'text-[#ccff00]' : 'text-zinc-200'
                          }`}>
                            {item.name}
                          </h4>
                        </div>
                        
                        {/* KEYBOARD SHORTCUT BADGE / CONFIG BUTTON */}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (listeningAssetId === item.id) {
                                setListeningAssetId(null);
                              } else {
                                setListeningAssetId(item.id);
                              }
                            }}
                            className={`h-5 px-2 rounded-md flex items-center gap-1.5 text-[7.5px] font-black border transition-all whitespace-nowrap overflow-hidden ${
                              listeningAssetId === item.id
                                ? 'bg-red-600 text-white border-red-500 animate-pulse'
                                : hotkeys[item.id]
                                  ? 'bg-[#ccff00]/10 text-[#ccff00] border-[#ccff00]/20 hover:bg-[#ccff00]/20'
                                  : 'bg-white/5 text-zinc-500 border-white/5 hover:border-white/10'
                            }`}
                            title={
                              listeningAssetId === item.id
                                ? t('gs.pressKeyToBind')
                                : t('gs.mapShortcutKey').replace('{current}', hotkeys[item.id] || t('gs.none'))
                            }
                          >
                            <Keyboard size={9} className="shrink-0" />
                            <span>
                              {listeningAssetId === item.id
                                ? t('gs.pressKey')
                                : hotkeys[item.id]
                                  ? t('gs.keyBound').replace('{key}', hotkeys[item.id])
                                  : t('gs.addBind')
                              }
                            </span>
                          </button>

                          {/* DELETE BIND BUTTON */}
                          {hotkeys[item.id] && listeningAssetId !== item.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newHotkeys = { ...hotkeys };
                                delete newHotkeys[item.id];
                                setHotkeys(newHotkeys);
                                localStorage.setItem('BROHUBS_STUDIO_HOTKEYS', JSON.stringify(newHotkeys));
                              }}
                              className="w-5 h-5 rounded-md flex items-center justify-center bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/10 hover:border-red-500 transition-all text-[8px] font-bold"
                              title={t('gs.deleteShortcut')}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayAsset(item.id);
                        }}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                          getAssetStatus(item.id) === 2 
                            ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                            : getAssetStatus(item.id) === 1 
                              ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
                              : 'bg-white/5 hover:bg-[#ccff00] hover:text-black text-white hover:scale-105 active:scale-95'
                        }`}
                        title={
                          getAssetStatus(item.id) === 2
                            ? t('gs.stopProgram').replace('{layer}', String(assetLayerSelection[item.id]))
                            : getAssetStatus(item.id) === 1
                              ? t('gs.stopPreview')
                              : assetLayerSelection[item.id]
                                ? t('gs.playToProgram').replace('{layer}', String(assetLayerSelection[item.id]))
                                : t('gs.playToPreview')
                        }
                      >
                        {getAssetStatus(item.id) !== 0 ? (
                          <Square size={14} fill="currentColor" />
                        ) : (
                          <Play size={14} fill="currentColor" className="ml-0.5" />
                        )}
                      </button>
                    </div>

                    {/* BOTTOM SECTION: Layer Selectors (Spanning full width of the card) */}
                    <div className="pt-2 border-t border-white/5 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[7px] font-black text-zinc-500 tracking-[0.2em] uppercase italic">{t('gs.programLayer')}</span>
                        {assetLayerSelection[item.id] && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssetLayerSelection(prev => {
                                const next = { ...prev };
                                delete next[item.id];
                                return next;
                              });
                            }}
                            className="text-[7px] font-black text-[#ccff00] hover:text-white uppercase transition-colors"
                          >
                            {t('gs.clearLayer')}
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-6 gap-1">
                        {[1, 2, 3, 4, 5, 6].map(num => (
                          <button
                            key={num}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLayerSelection(item.id, num);
                            }}
                            className={`h-7 rounded-md flex items-center justify-center text-[10px] font-extrabold border transition-all active:scale-90 ${
                              assetLayerSelection[item.id] === num 
                                ? 'bg-[#ccff00] text-black border-[#ccff00] font-black shadow-[0_0_12px_rgba(204,255,0,0.3)]' 
                                : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white hover:border-white/30 hover:bg-white/10'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredAssets.length === 0 && (
                  <p className="text-[10px] text-zinc-500 italic">{t('gs.noAssetsFound')}</p>
                )}
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

        {/* Main Editor Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-zinc-950">
          {renderAssetView()}
        </main>

        {/* Centralized Monitor Area */}
        {showMonitor && (
          <div className="flex shrink-0">
            <PanelControlMonitor 
              userRole={userRole}
              onPlayAction={() => handlePlayAsset(selectedAssetId)}
              playStatus={getAssetStatus(selectedAssetId)}
              customPreview={customPreviewNode}
              programPreview={programPreviewNode}
              programPlayKey={programMonitorPlayKey}
              programOutputUrl={getProgramOutputUrl()}
              activeAssets={
                [
                  ...(previewAssetId ? [{
                    id: `preview-${previewAssetId}`,
                    name: ASSET_DATABASE.find(a => a.id === previewAssetId)?.name || previewAssetId,
                    isPreview: true
                  }] : []),
                  ...Object.entries(programLayers)
                    .filter(([_, assetId]) => assetId !== null)
                    .map(([layer, assetId]) => ({
                      id: `layer-${layer}-${assetId}`,
                      name: `${ASSET_DATABASE.find(a => a.id === assetId)?.name || assetId}`,
                      isProgram: true,
                      layer: Number(layer)
                    }))
                ]
              }
              onStopAssets={(compoundIds) => {
                compoundIds.forEach(compoundId => {
                  if (compoundId.startsWith('preview-')) {
                    setPreviewAssetId(null);
                  } else if (compoundId.startsWith('layer-')) {
                    const parts = compoundId.split('-');
                    const layerNum = Number(parts[1]);
                    setProgramLayers(prev => ({
                      ...prev,
                      [layerNum]: null
                    }));
                  }
                });
              }}
            />
          </div>
        )}
      </div>

      {/* Bitfocus Companion Integration Modal */}
      <AnimatePresence>
        {showCompanionModal && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[999] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-3xl w-full bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-[0_10px_50px_rgba(0,0,0,0.8)] flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#ccff00]/10 border border-[#ccff00]/20 text-[#ccff00]">
                    <Radio size={18} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-widest text-[#ccff00] uppercase">{t('gs.companionModalTitle')}</h3>
                    <p className="text-[10px] text-zinc-500 font-extrabold tracking-widest uppercase">{t('gs.companionModalSubtitle')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCompanionModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                {/* How to configure block */}
                <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Info size={14} className="text-[#ccff00]" />
                    <span className="text-[10px] font-black tracking-widest uppercase text-white">{t('gs.howToUse')}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed font-semibold space-y-2">
                    <p>
                      {t('gs.companionIntroText')}
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-zinc-500">
                      <li>{t('gs.companionStep1')}</li>
                      <li>{t('gs.companionStep2')}</li>
                      <li>{t('gs.companionStep3')}</li>
                      <li>{t('gs.companionStep4')}</li>
                    </ol>
                  </div>
                </div>

                {/* Stream Status indicator & Enable/Disable Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-white/5 bg-zinc-900/20 gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${companionEnabled ? (sseConnected ? 'bg-[#ccff00] animate-pulse' : 'bg-amber-500 animate-pulse') : 'bg-red-500'}`} />
                    <div>
                      <div className="text-[11px] font-black text-white tracking-widest uppercase">{t('gs.companionStreamStatus')}</div>
                      <div className="text-[9px] text-zinc-500 mt-0.5">
                        {!companionEnabled
                          ? t('gs.companionStatusDisabled')
                          : sseConnected
                            ? t('gs.companionStatusConnected')
                            : t('gs.companionStatusStandby')
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 justify-between sm:justify-start w-full sm:w-auto">
                    {/* Beautiful Responsive Toggle Switch */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black tracking-wider text-zinc-400 uppercase">{t('gs.companionApiToggleLabel')}</span>
                      <button
                        onClick={() => setCompanionEnabled(prev => !prev)}
                        className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${
                          companionEnabled ? 'bg-[#ccff00]' : 'bg-zinc-800 border border-white/10'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full transition-transform duration-200 ${
                            companionEnabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-zinc-400'
                          }`}
                        />
                      </button>
                      <span className={`text-[9px] font-black tracking-wider uppercase ${companionEnabled ? 'text-[#ccff00]' : 'text-zinc-500'}`}>
                        {companionEnabled ? t('gs.on') : t('gs.off')}
                      </span>
                    </div>

                    <div className="px-3 py-1 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-zinc-400">
                      {t('gs.port')}
                    </div>
                  </div>
                </div>

                {/* API Links Section */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-zinc-400 tracking-widest uppercase italic">{t('gs.assetIntegrationList').replace('{game}', games.find(g => g.id === selectedGameId)?.title || '')}</h4>
                  
                  <div className="space-y-3">
                    {filteredAssets.map(asset => {
                      const toggleUrl = getCompanionUrl(asset.id, 'toggle');
                      const playUrl = getCompanionUrl(asset.id, 'play');
                      const stopUrl = getCompanionUrl(asset.id, 'stop');
                      const selectedLayer = assetLayerSelection[asset.id] || 1;

                      return (
                        <div key={asset.id} className="p-4 rounded-xl border border-white/5 bg-zinc-900/10 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-white uppercase tracking-wider">{asset.name}</span>
                            <span className="text-[8px] font-mono text-zinc-500">{t('gs.assetId')}: {asset.id}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {/* Toggle Button */}
                            <div className="bg-black/50 border border-white/5 rounded-lg p-2.5 flex flex-col gap-1.5 justify-between">
                              <div>
                                <span className="text-[8px] font-black text-zinc-500 tracking-wider uppercase">{t('gs.togglePlayStop')}</span>
                                <p className="text-[9px] text-zinc-400 mt-1">{t('gs.togglePlayStopDesc')}</p>
                              </div>
                              <button
                                onClick={() => handleCopyUrl(toggleUrl, `${asset.id}-toggle`)}
                                className={`w-full py-1.5 rounded text-[8px] font-black transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                                  copiedAssetId === `${asset.id}-toggle`
                                    ? 'bg-[#ccff00] text-black border-[#ccff00]'
                                    : 'bg-white/5 text-zinc-300 border-white/10 hover:border-white/20'
                                }`}
                              >
                                {copiedAssetId === `${asset.id}-toggle` ? (
                                  <>
                                    <Check size={10} />
                                    <span>{t('gs.copied')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={10} />
                                    <span>{t('gs.copyToggleUrl')}</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Play Button */}
                            <div className="bg-black/50 border border-white/5 rounded-lg p-2.5 flex flex-col gap-1.5 justify-between">
                              <div>
                                <span className="text-[8px] font-black text-zinc-500 tracking-wider uppercase">{t('gs.forcePlay').replace('{layer}', String(selectedLayer))}</span>
                                <p className="text-[9px] text-zinc-400 mt-1">{t('gs.forcePlayDesc')}</p>
                              </div>
                              <button
                                onClick={() => handleCopyUrl(getCompanionUrl(asset.id, 'play', selectedLayer), `${asset.id}-play`)}
                                className={`w-full py-1.5 rounded text-[8px] font-black transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                                  copiedAssetId === `${asset.id}-play`
                                    ? 'bg-[#ccff00] text-black border-[#ccff00]'
                                    : 'bg-white/5 text-zinc-300 border-white/10 hover:border-white/20'
                                }`}
                              >
                                {copiedAssetId === `${asset.id}-play` ? (
                                  <>
                                    <Check size={10} />
                                    <span>{t('gs.copied')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={10} />
                                    <span>{t('gs.copyPlayUrl')}</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Stop Button */}
                            <div className="bg-black/50 border border-white/5 rounded-lg p-2.5 flex flex-col gap-1.5 justify-between">
                              <div>
                                <span className="text-[8px] font-black text-zinc-500 tracking-wider uppercase">{t('gs.forceStop')}</span>
                                <p className="text-[9px] text-zinc-400 mt-1">{t('gs.forceStopDesc')}</p>
                              </div>
                              <button
                                onClick={() => handleCopyUrl(stopUrl, `${asset.id}-stop`)}
                                className={`w-full py-1.5 rounded text-[8px] font-black transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                                  copiedAssetId === `${asset.id}-stop`
                                    ? 'bg-[#ccff00] text-black border-[#ccff00]'
                                    : 'bg-white/5 text-zinc-300 border-white/10 hover:border-white/20'
                                }`}
                              >
                                {copiedAssetId === `${asset.id}-stop` ? (
                                  <>
                                    <Check size={10} />
                                    <span>{t('gs.copied')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={10} />
                                    <span>{t('gs.copyStopUrl')}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/5 bg-zinc-900/20 flex justify-end">
                <button
                  onClick={() => setShowCompanionModal(false)}
                  className="px-4 py-2 bg-white text-black font-black text-[10px] tracking-wider uppercase rounded-xl transition-all hover:opacity-90 active:scale-95 cursor-pointer"
                >
                  {t('gs.done')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobalStudio;
