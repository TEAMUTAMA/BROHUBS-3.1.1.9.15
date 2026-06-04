
import React, { useState, useEffect, useCallback, useRef, createContext } from 'react';
import { Lock, Unlock, Signal, Activity, Eye, EyeOff, Play, Pause, Repeat, Maximize2, X, Minimize2, Grid3X3, Square, Power, Trash2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PreviewControlContext = createContext({
  playKey: 0,
  isLooping: false,
  isPreviewPlaying: true,
  replay: () => {}
});

export interface PanelControlMonitorActiveAsset {
  id: string;
  name: string;
  layer?: number;
  isProgram?: boolean;
  isPreview?: boolean;
}

interface PanelControlMonitorProps {
  userRole?: 'admin' | 'member';
  customPreview?: React.ReactNode;
  programPreview?: React.ReactNode;
  onPlayAction?: () => void;
  playStatus?: 0 | 1 | 2;
  activeAssets?: PanelControlMonitorActiveAsset[];
  onStopAssets?: (assetIds: string[]) => void;
}

const PanelControlMonitor: React.FC<PanelControlMonitorProps> = ({ 
  userRole = 'admin', 
  customPreview, 
  programPreview,
  onPlayAction,
  playStatus = 0,
  activeAssets,
  onStopAssets
}) => {
  const [width, setWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const [isProgramHidden, setIsProgramHidden] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  // Expanded View State
  const [isMonitorExpanded, setIsMonitorExpanded] = useState(false);
  const [expandedScale, setExpandedScale] = useState(1);

  // Multi-stop state
  const [isMultiStopDropdownOpen, setIsMultiStopDropdownOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsMultiStopDropdownOpen(false);
      }
    };
    if (isMultiStopDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isMultiStopDropdownOpen]);
  
  // Member controls state
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [isLooping, setIsLooping] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [playKey, setPlayKey] = useState(0);

  const replay = useCallback(() => setPlayKey(k => k + 1), []);

  const sidebarRef = useRef<HTMLDivElement>(null);

  const [time, setTime] = useState({
    h: '18',
    m: '00',
    s: '38',
    ms: '92'
  });
  
  const [telemetry, setTelemetry] = useState({ up: 42.6, status: 'SYNC STABLE' });

  // Resizing Sidebar
  const startResizing = useCallback(() => {
    if (isLocked) return;
    setIsResizing(true);
  }, [isLocked]);

  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
      if (isResizing && sidebarRef.current) {
        const newWidth = window.innerWidth - mouseMoveEvent.clientX;
        if (newWidth > 320 && newWidth < 600) setWidth(newWidth);
      }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // Calculate Expanded Scale on Resize
  useEffect(() => {
    if (isMonitorExpanded) {
        const handleExpandResize = () => {
            // Target 1920x1080 with some padding
            const padding = 80; 
            const targetW = 1920;
            const targetH = 1080;
            const windowW = window.innerWidth - padding;
            const windowH = window.innerHeight - padding;
            
            const scaleW = windowW / targetW;
            const scaleH = windowH / targetH;
            
            setExpandedScale(Math.min(scaleW, scaleH));
        };
        
        window.addEventListener('resize', handleExpandResize);
        handleExpandResize(); // Initial calc
        return () => window.removeEventListener('resize', handleExpandResize);
    }
  }, [isMonitorExpanded]);

  // Clock & Telemetry
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime({
        h: now.getHours().toString().padStart(2, '0'),
        m: now.getMinutes().toString().padStart(2, '0'),
        s: now.getSeconds().toString().padStart(2, '0'),
        ms: Math.floor(now.getMilliseconds() / 10).toString().padStart(2, '0')
      });
    }, 40);

    const telemetryTimer = setInterval(() => {
      setTelemetry(prev => ({ ...prev, up: +(42.6 + (Math.random() * 0.2 - 0.1)).toFixed(1) }));
    }, 2000);

    return () => {
        clearInterval(timer);
        clearInterval(telemetryTimer);
    };
  }, []);

  // Checkerboard Pattern for Transparency
  const alphaBackgroundStyle = {
    backgroundColor: '#050505',
    backgroundImage: 'conic-gradient(#0a0a0a 90deg, #050505 90deg 180deg, #0a0a0a 180deg 270deg, #050505 270deg)',
    backgroundSize: '24px 24px'
  };

  // Internal Scale Calculation (Fit to Sidebar Width)
  // 1920 is the base width of the content. 50px buffer for padding/borders.
  const currentScale = Math.max(0.1, (width - 50) / 1920);

  const activeAssetsData = activeAssets || (
    playStatus !== 0 ? [{
      id: 'current-preview',
      name: 'Active Studio Feed',
      isProgram: playStatus === 2,
      isPreview: playStatus === 1
    }] : []
  );

  return (
    <>
      <aside 
        ref={sidebarRef}
        style={{ width: `${width}px` }}
        className={`relative border-l transition-[border-color] duration-200 bg-black flex flex-col shrink-0 h-full font-sans select-none ${isResizing ? 'border-[#ccff00]/40' : 'border-white/5'}`}
      >
        {/* RESIZE HANDLE */}
        {!isLocked && (
          <div onMouseDown={startResizing} className={`absolute left-0 top-0 w-1 h-full cursor-col-resize z-[100] transition-colors hover:bg-[#ccff00]/20 ${isResizing ? 'bg-[#ccff00]/30' : ''}`} />
        )}

        {/* HEADER: BROADCAST SYSTEM NODE */}
        <div className="p-6 pb-2 flex items-center justify-between relative z-10 shrink-0">
          <h3 className="industrial-header-text text-[9px] font-black text-zinc-500 tracking-[0.4em] uppercase">
            BROADCAST SYSTEM NODE
          </h3>
          <button 
            onClick={() => setIsLocked(!isLocked)}
            className={`flex items-center gap-2 px-3 py-1 bg-zinc-950 border rounded text-[8px] font-black transition-all uppercase tracking-widest ${isLocked ? 'bg-zinc-900 border-white/20 text-white' : 'border-white/5 text-zinc-500 hover:text-white'}`}
          >
            {isLocked ? <Lock size={10} /> : <Unlock size={10} />}
            {isLocked ? 'LOCKED' : 'UNLOCKED'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-12 relative z-10 pb-32">
          
          {/* MONITOR 1: PROGRAM (ON-AIR) */}
          <div className="space-y-4">
            <div className="flex items-start justify-between min-h-8">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 border border-white/20 rounded-sm bg-zinc-950" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white tracking-widest uppercase italic leading-none">
                    PROGRAM (ON-AIR)
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-zinc-700 font-black text-[7px] tracking-widest uppercase shrink-0">
                      [0 LAYERS]
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end shrink-0 gap-2">
                <div className="flex items-baseline gap-3">
                  {/* STANDALONE OVERLAY IN NEW TAB */}
                  <button 
                    onClick={() => window.open(window.location.origin + window.location.pathname + '?view=program', '_blank')} 
                    className="transition-all flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.1em] px-2 py-1.5 rounded shadow-lg bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:border-[#ccff00]/40 hover:scale-105 active:scale-95"
                    title="OPEN STANDALONE OVERLAY IN NEW TAB (HALAMAN BARU)"
                  >
                    <ExternalLink size={10} />
                    HALAMAN BARU
                  </button>

                  {/* VISIBILITY TOGGLE */}
                  <button 
                    onClick={() => setIsProgramHidden(!isProgramHidden)} 
                    className={`transition-all flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.1em] px-2 py-1.5 rounded shadow-lg ${isProgramHidden ? 'bg-zinc-800 text-zinc-400' : 'bg-[#ccff00] text-black hover:scale-105 active:scale-95'}`}
                  >
                    {isProgramHidden ? <Eye size={10} /> : <EyeOff size={10} />}
                    {isProgramHidden ? 'SHOW' : 'HIDE'}
                  </button>
                  
                  <span className="text-[#ccff00] font-mono font-bold text-lg tracking-widest leading-none">
                    {time.h}:{time.m}:{time.s}:{time.ms}
                  </span>
                </div>
              </div>
            </div>

            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isProgramHidden ? 'max-h-0 opacity-0' : 'max-h-[800px] opacity-100'}`}>
              <div 
                className="aspect-video w-full border border-white/5 rounded relative flex items-center justify-center transition-all shadow-inner overflow-hidden"
                style={alphaBackgroundStyle}
              >
                <div className="w-full h-full relative">
                  {/* Background / Signal Lost */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 pointer-events-none">
                     <Signal size={40} className="mb-3 text-white" />
                     <span className="text-[10px] font-black tracking-[1em] italic text-white uppercase">SIGNAL LOST</span>
                  </div>

                   {/* Foreground / Program Preview */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                        className="w-[1920px] h-[1080px] shrink-0 flex items-center justify-center origin-center pointer-events-none transition-transform duration-200 ease-out relative"
                        style={{ transform: `scale(${currentScale})` }}
                    >
                        <AnimatePresence mode="sync" initial={false}>
                          {programPreview && (
                            <motion.div 
                              key="program-feed-stable"
                              initial={false}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0, transition: { duration: 0.15 } }}
                              className="w-full h-full flex items-center justify-center pointer-events-none"
                            >
                              {programPreview}
                            </motion.div>
                          )}
                        </AnimatePresence>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 border-[6px] border-zinc-950 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* MONITOR 2: PREVIEW (STAGING) */}
          <div className="space-y-4">
            <div className="flex items-start justify-between min-h-8">
              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 bg-[#ccff00] rounded-sm shadow-[0_0_10px_rgba(204,255,0,0.3)] animate-pulse" />
                  <span className="text-[10px] font-black text-white tracking-widest uppercase italic leading-none">PREVIEW (STAGING)</span>
                </div>
                <span className="text-[7px] font-black text-zinc-700 tracking-[0.3em] uppercase mt-2 ml-5">OPERATOR: MASTER</span>
              </div>
              
              <div className="flex items-center gap-1">
                <div className="w-6 h-6 bg-[#ccff00] text-black flex items-center justify-center rounded text-[10px] font-black shadow-[0_0_10px_rgba(204,255,0,0.2)]">
                  #
                </div>

                {/* MULTI-STOP BTN NEXT TO "#" */}
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => {
                      setIsMultiStopDropdownOpen(!isMultiStopDropdownOpen);
                      if (!isMultiStopDropdownOpen) {
                        setSelectedIds(activeAssetsData.map(a => a.id));
                      }
                    }}
                    className={`w-6 h-6 rounded flex items-center justify-center transition-all border ${
                      isMultiStopDropdownOpen 
                        ? 'bg-red-500 text-white border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                        : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-red-500 hover:border-red-500/30'
                    }`}
                    title="Stop selected active assets simultaneously"
                  >
                    <Power size={10} />
                  </button>

                  <AnimatePresence>
                    {isMultiStopDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-8 z-[250] w-64 bg-zinc-950 border border-white/10 p-4 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                      >
                        <h4 className="text-[8px] font-black tracking-widest text-[#ccff00] uppercase italic mb-3 flex items-center gap-1.5 pb-2 border-b border-white/5">
                          <Trash2 size={10} /> STOP MULTIPLE ASSETS
                        </h4>

                        {activeAssetsData.length === 0 ? (
                          <p className="text-[9px] text-zinc-500 italic py-4 text-center">No active templates running</p>
                        ) : (
                          <>
                            <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar mb-4 pr-1">
                              {activeAssetsData.map(a => {
                                const isChecked = selectedIds.includes(a.id);
                                return (
                                  <label 
                                    key={a.id} 
                                    className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                                      isChecked 
                                        ? 'bg-red-500/10 border-red-500/20 text-white' 
                                        : 'bg-white/5 border-transparent text-zinc-400 hover:text-white'
                                    }`}
                                  >
                                    <input 
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        if (isChecked) {
                                          setSelectedIds(selectedIds.filter(id => id !== a.id));
                                        } else {
                                          setSelectedIds([...selectedIds, a.id]);
                                        }
                                      }}
                                      className="accent-red-500 h-3.5 w-3.5 rounded border-white/10 bg-black cursor-pointer"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[9px] font-black truncate uppercase tracking-widest leading-none">{a.name}</p>
                                      <p className="text-[6px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                                        {a.isProgram 
                                          ? `PROGRAM LAYER ${a.layer !== undefined ? a.layer : ''}` 
                                          : 'PREVIEW FEED'
                                        }
                                      </p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setIsMultiStopDropdownOpen(false)}
                                className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-black text-[8px] uppercase tracking-widest rounded-md border border-white/5"
                              >
                                CANCEL
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedIds.length > 0) {
                                    onStopAssets && onStopAssets(selectedIds);
                                    setIsMultiStopDropdownOpen(false);
                                  }
                                }}
                                disabled={selectedIds.length === 0}
                                className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white font-black text-[8px] uppercase tracking-widest rounded-md border border-red-500/20 active:scale-95 transition-all shadow-md shadow-red-600/20"
                              >
                                STOP ({selectedIds.length})
                              </button>
                            </div>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {!isMonitorExpanded && (
                  <button 
                    onClick={() => setIsMonitorExpanded(true)}
                    className="w-6 h-6 bg-zinc-900 border border-white/5 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/20 transition-all active:scale-95"
                    title="FULLSCREEN PREVIEW"
                  >
                    <Maximize2 size={10} strokeWidth={3} />
                  </button>
                )}
                {onPlayAction && !isMonitorExpanded && (
                  <button 
                    onClick={onPlayAction}
                    className={`w-6 h-6 rounded flex items-center justify-center transition-all active:scale-90 ${
                      playStatus === 2 
                        ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]' 
                         : playStatus === 1
                          ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                          : 'bg-white/10 text-[#ccff00] hover:bg-[#ccff00] hover:text-black border border-white/5'
                    }`}
                    title={playStatus === 2 ? "STOP PROGRAM" : playStatus === 1 ? "STOP PREVIEW" : "PLAY TO PROGRAM"}
                  >
                    {playStatus !== 0 ? <Square size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* INTERACTIVE MONITOR CONTAINER - CLICK TO EXPAND */}
              <div 
                onClick={() => setIsMonitorExpanded(true)}
                className="aspect-video w-full rounded relative flex items-center justify-center transition-all shadow-inner overflow-hidden border border-[#ccff00]/10 group/monitor bg-black cursor-pointer hover:border-[#ccff00]/50 hover:shadow-[0_0_30px_rgba(204,255,0,0.1)]"
              >
                {/* Maximize Icon Overlay on Hover */}
                <div className="absolute top-3 right-3 z-30 opacity-0 group-hover/monitor:opacity-100 transition-all duration-300 bg-black/60 backdrop-blur rounded p-1.5 border border-white/10 text-white">
                    <Maximize2 size={14} />
                </div>

                {/* INTERNAL PREVIEW */}
                <div className="w-full h-full relative">
                  {/* Background / No Signal */}
                  <div className="absolute inset-0 w-full h-full bg-[#030303]" style={alphaBackgroundStyle}>
                    <div className="absolute top-4 left-4 border border-[#ccff00]/20 px-2 py-0.5 rounded text-[7px] font-black text-[#ccff00] tracking-[0.3em] uppercase italic bg-[#ccff00]/5">
                      CUE SIGNAL
                    </div>
                    <div className="relative flex items-center justify-center opacity-30 h-full">
                        <div className="w-12 h-[1px] bg-white absolute" />
                        <div className="h-12 w-[1px] bg-white absolute" />
                        <div className="w-1.5 h-1.5 bg-[#ccff00] rounded-full absolute" />
                    </div>
                  </div>

                   {/* Foreground / Custom Preview */}
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div 
                            className="w-[1920px] h-[1080px] shrink-0 flex items-center justify-center origin-center pointer-events-none transition-transform duration-200 ease-out relative"
                            style={{ transform: `scale(${currentScale})` }}
                        >
                            <PreviewControlContext.Provider value={{ playKey, isLooping, isPreviewPlaying, replay }}>
                                <AnimatePresence mode="wait" initial={false}>
                                  {customPreview && (
                                    <motion.div 
                                      key={`preview-feed-${playKey}`}
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0, transition: { duration: 0.2 } }}
                                      className="w-full h-full flex items-center justify-center pointer-events-none"
                                    >
                                      {customPreview}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                            </PreviewControlContext.Provider>
                        </div>
                      </div>
                  </div>
                </div>
                
                {/* Monitor Bezel */}
                <div className="absolute inset-0 border-[6px] border-zinc-950 pointer-events-none rounded" />
              </div>
            </div>
          </div>

        </div>

        {/* FOOTER TELEMETRY */}
        <div className="p-8 border-t border-white/5 bg-black mt-auto shrink-0 relative z-20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity size={10} className="text-zinc-800" />
              <span className="text-[8px] font-black text-zinc-700 tracking-[0.3em] uppercase">NETWORK TELEMETRY</span>
            </div>
            <span className="text-[#00ffd5] text-[9px] font-black tracking-widest uppercase">UP: {telemetry.up} Mbps</span>
          </div>
          
          <div className="space-y-2">
             <div className="flex items-center justify-between">
                <span className="text-[8px] font-black text-zinc-800 tracking-[0.3em] uppercase">NODE STATUS</span>
                <span className="text-[#ccff00] text-[8px] font-black tracking-widest uppercase">SYNC STABLE</span>
             </div>
             <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full bg-[#ccff00] transition-all duration-700" style={{ width: '85%' }} />
             </div>
          </div>
        </div>
      </aside>

      {/* --- EXPANDED MONITOR POP-UP --- */}
      {isMonitorExpanded && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in zoom-in-95 duration-300">
            {/* Controls Overlay */}
            <div className="absolute top-6 right-6 z-[210] flex items-center gap-3">
                {/* Playback Controls */}
                <div className="flex items-center bg-zinc-900/80 backdrop-blur border border-white/10 p-1 rounded-full px-2 gap-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowGrid(!showGrid); }}
                        className={`p-2 transition-all rounded-full ${showGrid ? 'text-[#ccff00] bg-white/5' : 'text-zinc-500 hover:text-white'}`}
                        title="Toggle Grid"
                    >
                        <Grid3X3 size={16} strokeWidth={3} />
                    </button>
                    <div className="w-[1px] h-4 bg-white/10 mx-1" />
                    <div className="flex items-center gap-1">
                        {onPlayAction && (
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    onPlayAction();
                                }}
                                className={`w-8 h-8 rounded flex items-center justify-center transition-all active:scale-90 shadow-lg ${
                                    playStatus === 2 
                                        ? 'bg-red-500 text-white hover:bg-red-600' 
                                        : playStatus === 1
                                            ? 'bg-orange-500 text-white hover:bg-orange-600'
                                            : 'bg-[#ccff00] text-black hover:bg-white shadow-[0_0_15px_rgba(204,255,0,0.3)]'
                                }`}
                                title={playStatus === 2 ? "STOP PROGRAM" : playStatus === 1 ? "STOP PREVIEW" : "PLAY TO PROGRAM"}
                            >
                                {playStatus > 0 ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Close Button */}
                <button 
                    onClick={() => setIsMonitorExpanded(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-white/10 rounded-full text-zinc-400 hover:text-white hover:border-white/30 transition-all uppercase text-[10px] font-black tracking-widest group"
                >
                    <Minimize2 size={14} className="group-hover:scale-90 transition-transform" />
                    CLOSE MONITOR
                </button>
            </div>

            {/* Container for Scaled Content */}
            <div className="relative shadow-[0_0_100px_rgba(0,0,0,1)] border border-white/10 rounded bg-black overflow-hidden" 
                 style={{ 
                     width: `${1920 * expandedScale}px`, 
                     height: `${1080 * expandedScale}px` 
                 }}>
                
                {/* Content Render (Scaled) */}
                <div 
                    className="w-[1920px] h-[1080px] origin-top-left absolute top-0 left-0"
                    style={{ transform: `scale(${expandedScale})` }}
                >
                    <AnimatePresence mode="popLayout">
                        {customPreview ? (
                            <motion.div 
                                key="expanded-preview-container"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, transition: { duration: 1.2 } }}
                                className="w-full h-full pointer-events-none"
                            >
                                <PreviewControlContext.Provider value={{ playKey, isLooping, isPreviewPlaying, replay }}>
                                    {React.isValidElement(customPreview) 
                                        ? React.cloneElement(customPreview as React.ReactElement, { key: 'expanded-preview-element' }) 
                                        : customPreview}
                                </PreviewControlContext.Provider>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="no-signal"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, transition: { duration: 1.2 } }}
                                className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700 font-black text-4xl uppercase tracking-widest"
                            >
                                NO SIGNAL SOURCE
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Grid Overlay */}
                    {showGrid && (
                        <div className="absolute inset-0 pointer-events-none z-[50]">
                            {/* Main Grid */}
                            <div className="absolute inset-0" style={{
                                backgroundImage: `
                                    linear-gradient(to right, rgba(204, 255, 0, 0.1) 1px, transparent 1px),
                                    linear-gradient(to bottom, rgba(204, 255, 0, 0.1) 1px, transparent 1px)
                                `,
                                backgroundSize: '120px 120px'
                            }} />
                            
                            {/* Center Crosshair */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-[1px] bg-[#ccff00]/40" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-[1px] bg-[#ccff00]/40" />

                            {/* Corner Markers */}
                            <div className="absolute top-0 left-0 w-24 h-24 border-t-4 border-l-4 border-[#ccff00]/30" />
                            <div className="absolute top-0 right-0 w-24 h-24 border-t-4 border-r-4 border-[#ccff00]/30" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 border-b-4 border-l-4 border-[#ccff00]/30" />
                            <div className="absolute bottom-0 right-0 w-24 h-24 border-b-4 border-r-4 border-[#ccff00]/30" />

                            {/* Safe Area (90%) */}
                            <div className="absolute inset-[5%] border border-dashed border-[#ccff00]/20" />
                        </div>
                    )}
                </div>

                {/* Optional Grid Overlay for "Professional" Look */}
                <div className="absolute inset-0 pointer-events-none opacity-20" style={alphaBackgroundStyle} />
            </div>

            {/* Footer Label in Modal */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-60">
                <div className="w-2 h-2 bg-[#ccff00] rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-white tracking-[0.5em] uppercase">FULLSCREEN PREVIEW MODE</span>
            </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(204, 255, 0, 0.05); border-radius: 10px; }
        .industrial-header-text {
          color: #71717a;
          font-family: 'Inter', sans-serif;
          letter-spacing: 0.4em;
          font-weight: 1000;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        }
      `}</style>
    </>
  );
};

export default PanelControlMonitor;
