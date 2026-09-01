
// ... (imports remain the same, just removing scale-[0.3])
import React, { useState, useEffect, useRef } from 'react';
import { useT } from '@/i18n/LanguageContext';
import { 
  Database, Palette, Play, Monitor, ChevronDown, Activity, LayoutTemplate, 
  ChevronRight, Check, Settings2, Globe, User, Upload, RefreshCw, Type, Maximize, Move, ArrowUpDown, ArrowLeftRight, ImageIcon, Italic
} from 'lucide-react';
import { Theme, Asset, Game } from '@/types';
import { ASSET_DATABASE } from './assets';
import PanelControlMonitor from '@/features/companion/PanelControlMonitor';
import OverlayTopFraggersView from '@/features/games/pubg-mobile/overlays/theme-01/top-fraggers';
import OverlayOverallRankingView from '@/features/games/pubg-mobile/overlays/theme-01/leaderboard';
import OverlayTeamRosterView from '@/features/games/pubg-mobile/overlays/theme-01/team-roster';
import OverlayMlbbDrafNPickView from '@/features/games/mobile-legends/overlays/theme-01/draf-n-pick';

interface SetupAssetViewProps {
  games: Game[];
  themes: Theme[];
  userRole: 'admin' | 'member';
}

// ... (ScrollableInput, ASSET_DATABASE, etc remain same)
const ScrollableInput = ({ value, onChange, className }: { value: number; onChange: (val: number) => void; className?: string; }) => {
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

const AVAILABLE_FONTS = ['Inter', 'Roboto', 'Montserrat', 'Oswald', 'Bebas Neue', 'Chakra Petch', 'Orbitron'];
const DEFAULT_PLAYER_IMG = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop';

const SetupAssetView: React.FC<SetupAssetViewProps> = ({ games, themes, userRole }) => {
  const t = useT();
  const [selectedGameId, setSelectedGameId] = useState<string>('pubg');
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  
  const [configTab, setConfigTab] = useState<'DATA' | 'VISUAL' | 'ANIMATION'>('DATA');
  const [showMonitors, setShowMonitors] = useState(true);
  const [showList, setShowList] = useState(true);

  // --- FILTERING LOGIC (MENCEGAH MISMATCH) ---
  const activeGame = games.find(g => g.id === selectedGameId) || games[0];
  const gameSpecificThemes = themes.filter(t => t.gameId === selectedGameId);
  const gameSpecificAssets = ASSET_DATABASE.filter(a => a.gameId === selectedGameId);
  
  const activeTheme = gameSpecificThemes.find(t => t.id === selectedThemeId) || gameSpecificThemes[0] || { name: 'DEFAULT', id: 'default' };
  const activeAsset = gameSpecificAssets.find(a => a.id === selectedAssetId) || gameSpecificAssets[0] || { name: 'NONE', id: 'none' };

  useEffect(() => {
    if (gameSpecificThemes.length > 0) setSelectedThemeId(gameSpecificThemes[0].id);
    if (gameSpecificAssets.length > 0) setSelectedAssetId(gameSpecificAssets[0].id);
  }, [selectedGameId]);

  // --- EDITOR STATES (MOCK DATA) ---
  const [fraggers, setFraggers] = useState([
    { rank: 1, name: 'PLAYER 1', team: 'MORFIN', elims: 7, survival: '2 M 45 S', image: DEFAULT_PLAYER_IMG },
    { rank: 2, name: 'PLAYER 2', team: 'S7', elims: 3, survival: '3 M 01 S', image: DEFAULT_PLAYER_IMG },
  ]);

  const [matchInfo, setMatchInfo] = useState({ title: 'TOP FRAGGERS', subtitle: 'RECENT MATCH | PMKTL - MATCH 2' });
  const [typography, setTypography] = useState({ titleSize: 60, titleX: 0, titleY: 0, subtitleSize: 10, subtitleX: 0, subtitleY: 0 });
  
  const updateFragger = (index: number, field: string, value: any) => {
    const updated = [...fraggers];
    updated[index] = { ...updated[index], [field]: value };
    setFraggers(updated);
  };

  const renderLivePreview = () => {
    if (selectedAssetId === 'pmgc-fraggers') {
      return (
        <OverlayTopFraggersView 
          asset={activeAsset as Asset} 
          theme={activeTheme as Theme} 
          games={games} 
          themes={gameSpecificThemes} 
          availableAssets={gameSpecificAssets} 
          userRole={userRole} 
          onBack={() => setSelectedAssetId(null)} 
        />
      );
    }

    if (selectedAssetId === 'pmgc-leaderboard') {
      return (
        <OverlayOverallRankingView 
          asset={activeAsset as Asset} 
          theme={activeTheme as Theme} 
          games={games} 
          themes={gameSpecificThemes} 
          availableAssets={gameSpecificAssets} 
          userRole={userRole} 
          onBack={() => setSelectedAssetId(null)} 
        />
      );
    }

    if (selectedAssetId === 'pmgc-team-roster') {
      return (
        <OverlayTeamRosterView 
          asset={activeAsset as Asset} 
          theme={activeTheme as Theme} 
          games={games} 
          themes={gameSpecificThemes} 
          availableAssets={gameSpecificAssets} 
          userRole={userRole} 
          onBack={() => setSelectedAssetId(null)} 
        />
      );
    }

    if (selectedAssetId === 'mlbb-draf-n-pick') {
      return (
        <OverlayMlbbDrafNPickView
          asset={activeAsset as Asset}
          theme={activeTheme as Theme}
          games={games}
          themes={gameSpecificThemes}
          availableAssets={gameSpecificAssets}
          userRole={userRole}
          onBack={() => setSelectedAssetId(null)}
          visualOnly
        />
      );
    }

    return (
      <div className="w-full h-full bg-[#050505] relative overflow-hidden flex flex-col items-center justify-center">
         <div className="text-center mb-10">
             <h1 className="text-white font-[1000] italic uppercase leading-none" style={{ fontSize: `${typography.titleSize}px` }}>{matchInfo.title}</h1>
             <div className="bg-white px-6 py-2 mt-4 transform -skew-x-12 inline-block">
                 <span className="text-black font-black uppercase text-xl transform skew-x-12 block">{matchInfo.subtitle}</span>
             </div>
         </div>
         <div className="flex gap-4">
             {fraggers.map((f, i) => (
                 <div key={i} className="w-64 h-96 bg-[#ccff00] relative flex flex-col items-center pt-10 shadow-2xl">
                     <span className="absolute top-4 left-4 text-black font-black text-4xl">#{f.rank}</span>
                     <img src={f.image} className="h-48 object-contain mb-4" />
                     <h3 className="text-black font-black text-2xl uppercase">{f.name}</h3>
                     <p className="text-black/60 font-bold uppercase">{f.team}</p>
                     <div className="mt-4 bg-black/10 px-4 py-2 rounded text-center">
                         <span className="block text-4xl font-black text-black">{f.elims}</span>
                         <span className="text-[10px] font-bold uppercase text-black/50">{t('sav.elims')}</span>
                     </div>
                 </div>
             ))}
         </div>
      </div>
    );
  };

  const renderContent = () => {
    if (selectedAssetId === 'pmgc-fraggers') {
      return (
        <OverlayTopFraggersView 
          asset={activeAsset as Asset} 
          theme={activeTheme as Theme} 
          games={games} 
          themes={gameSpecificThemes} 
          availableAssets={gameSpecificAssets} 
          userRole={userRole} 
          onBack={() => setSelectedAssetId(null)} 
          onSelectAsset={(asset) => setSelectedAssetId(asset.id)}
        />
      );
    }

    if (selectedAssetId === 'pmgc-leaderboard') {
      return (
        <OverlayOverallRankingView 
          asset={activeAsset as Asset} 
          theme={activeTheme as Theme} 
          games={games} 
          themes={gameSpecificThemes} 
          availableAssets={gameSpecificAssets} 
          userRole={userRole} 
          onBack={() => setSelectedAssetId(null)} 
          onSelectAsset={(asset) => setSelectedAssetId(asset.id)}
        />
      );
    }

    if (selectedAssetId === 'pmgc-team-roster') {
      return (
        <OverlayTeamRosterView 
          asset={activeAsset as Asset} 
          theme={activeTheme as Theme} 
          games={games} 
          themes={gameSpecificThemes} 
          availableAssets={gameSpecificAssets} 
          userRole={userRole} 
          onBack={() => setSelectedAssetId(null)} 
          onSelectAsset={(asset) => setSelectedAssetId(asset.id)}
        />
      );
    }

    if (selectedAssetId === 'mlbb-draf-n-pick') {
      return (
        <OverlayMlbbDrafNPickView
          asset={activeAsset as Asset}
          theme={activeTheme as Theme}
          games={games}
          themes={gameSpecificThemes}
          availableAssets={gameSpecificAssets}
          userRole={userRole}
          onBack={() => setSelectedAssetId(null)}
          onSelectAsset={(asset) => setSelectedAssetId(asset.id)}
        />
      );
    }

    return (
      <div className="flex flex-col h-full bg-black animate-in fade-in duration-300 font-sans select-none overflow-hidden rounded-tl-xl border-l border-t border-white/5">
        
        {/* HEADER SECTION */}
        <header className="h-16 bg-black border-b border-white/10 flex items-center px-8 justify-between shrink-0 z-[100]">
          <div className="flex items-center gap-12">
              <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                      <span className="text-white font-[1000] italic text-lg tracking-tighter uppercase leading-none">{t('sav.headerSetup')}</span>
                      <span className="text-[#ccff00] font-[1000] italic text-lg tracking-tighter uppercase leading-none">{t('sav.headerAsset')}</span>
                  </div>
                  <span className="text-[7px] font-black text-zinc-700 tracking-[0.4em] uppercase mt-1">{t('sav.masterConfiguration')}</span>
              </div>
              
              <div className="h-8 w-[1px] bg-white/10" />

              {/* Active Theme Display */}
              <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ccff00] animate-pulse shadow-[0_0_8px_#ccff00]" />
                  <span className="text-white font-black text-[10px] tracking-[0.2em] uppercase italic">
                    {activeTheme.name}
                  </span>
              </div>
          </div>

          <div className="flex items-center gap-3">
              <div className="bg-zinc-900 border border-white/5 px-3 py-1.5 rounded"><span className="text-[7px] font-black text-zinc-600 uppercase mr-2">{t('sav.editing')}</span><span className="text-[9px] font-black text-white uppercase">{activeAsset.name}</span></div>
              <button onClick={() => setShowList(!showList)} className={`p-2 rounded border transition-all ${showList ? 'bg-[#ccff00]/10 border-[#ccff00]/40 text-[#ccff00]' : 'bg-zinc-950 border-white/5 text-zinc-500'}`} title={t('sav.toggleSidebar')}><LayoutTemplate size={14} /></button>
              <button onClick={() => setShowMonitors(!showMonitors)} className={`p-2 rounded border transition-all ${showMonitors ? 'bg-[#ccff00]/10 border-[#ccff00]/40 text-[#ccff00]' : 'bg-zinc-950 border-white/5 text-zinc-500'}`} title={t('sav.toggleMonitors')}><Monitor size={14} /></button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          
          {/* SIDEBAR: AVAILABLE TEMPLATES - Berubah sesuai Target Game */}
          <aside className={`border-r border-white/5 bg-black flex flex-col shrink-0 transition-all duration-300 ease-in-out ${showList ? 'w-64 opacity-100 p-6' : 'w-0 opacity-0 p-0 pointer-events-none'}`}>
              <h3 className="text-[8px] font-black text-zinc-700 tracking-[0.4em] uppercase mb-6 italic">{t('sav.availableTemplates')}</h3>
              <div className="space-y-3 overflow-y-auto no-scrollbar">
                  {gameSpecificAssets.map(asset => (
                      <div 
                          key={asset.id} 
                          onClick={() => setSelectedAssetId(asset.id)} 
                          className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${selectedAssetId === asset.id ? 'border-[#ccff00] bg-[#ccff00]/5' : 'border-white/5 bg-zinc-900/20 opacity-50 hover:opacity-100 hover:border-white/20'}`}
                      >
                          {selectedAssetId === asset.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#ccff00] rounded-r-full shadow-[0_0_10px_#ccff00]" />}
                          <h4 className={`text-[10px] font-black uppercase tracking-widest ${selectedAssetId === asset.id ? 'text-[#ccff00]' : 'text-white'}`}>{asset.name}</h4>
                          <p className="text-[7px] font-black text-zinc-600 mt-1 uppercase">{asset.type}</p>
                      </div>
                  ))}
                  {gameSpecificAssets.length === 0 && (
                      <div className="py-10 text-center opacity-20 border border-dashed border-white/10 rounded-xl">
                          <span className="text-[8px] font-black uppercase tracking-widest">{t('sav.noAssetsFound')}</span>
                      </div>
                  )}
              </div>
          </aside>

          {/* MAIN WORKSPACE EDITOR */}
          <main className="flex-1 bg-[#050505] flex flex-col overflow-hidden relative">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
              <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative z-10">
                  <div className="max-w-2xl mx-auto space-y-8">
                      
                      <div className="flex items-center justify-between border-b border-white/5 pb-6">
                          <div className="flex items-center gap-5">
                              <div className="w-12 h-12 bg-[#ccff00] rounded-xl flex items-center justify-center text-black font-[1000] italic text-sm transform skew-x-[-8deg] shadow-[0_0_20px_rgba(204,255,0,0.15)]">BHS</div>
                              <div>
                                  <h2 className="text-2xl font-[1000] italic text-white uppercase tracking-tighter leading-none">{t('sav.customizeUiLabel')} <span className="text-[#ccff00]">{t('sav.customizeUiAccent')}</span></h2>
                                  <p className="text-[7px] font-black text-zinc-700 tracking-[0.4em] uppercase mt-1">{t('sav.configuringLabel')} {activeAsset.name}</p>
                              </div>
                          </div>
                      </div>

                      <div className="flex bg-zinc-950 p-0.5 rounded-xl border border-white/5 shadow-2xl">
                          {['DATA', 'VISUAL', 'ANIMATION'].map((tab) => (
                              <button key={tab} onClick={() => setConfigTab(tab as any)} className={`flex-1 py-2 text-[8px] font-black tracking-widest uppercase rounded-lg flex items-center justify-center gap-2 transition-all ${configTab === tab ? 'bg-[#ccff00] text-black shadow-lg' : 'text-zinc-600 hover:text-white'}`}>
                                  {tab} INPUT
                              </button>
                          ))}
                      </div>

                      {/* MOCK EDITOR INPUTS */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
                              <h3 className="text-[9px] font-black text-zinc-500 tracking-[0.2em] uppercase flex items-center gap-2"><Type size={12} /> {t('sav.mainTitle')}</h3>
                              <div className="space-y-3">
                                  <input type="text" value={matchInfo.title} onChange={(e) => setMatchInfo({...matchInfo, title: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold text-white uppercase focus:border-[#ccff00] outline-none" />
                                  <div className="grid grid-cols-3 gap-2">
                                      <div><label className="text-[7px] font-black text-zinc-700 mb-1 block">{t('sav.labelSize')}</label><ScrollableInput value={typography.titleSize} onChange={(v) => setTypography({...typography, titleSize: v})} className="w-full bg-black border border-white/10 rounded px-2 py-1.5 text-center text-[10px] font-black text-white" /></div>
                                      <div><label className="text-[7px] font-black text-zinc-700 mb-1 block">{t('sav.labelX')}</label><ScrollableInput value={typography.titleX} onChange={(v) => setTypography({...typography, titleX: v})} className="w-full bg-black border border-white/10 rounded px-2 py-1.5 text-center text-[10px] font-black text-white" /></div>
                                      <div><label className="text-[7px] font-black text-zinc-700 mb-1 block">{t('sav.labelY')}</label><ScrollableInput value={typography.titleY} onChange={(v) => setTypography({...typography, titleY: v})} className="w-full bg-black border border-white/10 rounded px-2 py-1.5 text-center text-[10px] font-black text-white" /></div>
                                  </div>
                              </div>
                          </div>
                          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
                              <h3 className="text-[9px] font-black text-zinc-500 tracking-[0.2em] uppercase flex items-center gap-2"><ImageIcon size={12} /> {t('sav.globalSkin')}</h3>
                              <div className="grid grid-cols-1 gap-2">
                                  <div className="flex items-center justify-between p-2 bg-black border border-white/5 rounded-lg">
                                      <span className="text-[8px] font-black text-zinc-600 uppercase">{t('sav.colorPrimary')}</span>
                                      <div className="w-4 h-4 rounded bg-[#ccff00] shadow-[0_0_5px_#ccff00]" />
                                  </div>
                                  <div className="flex items-center justify-between p-2 bg-black border border-white/5 rounded-lg">
                                      <span className="text-[8px] font-black text-zinc-600 uppercase">{t('sav.colorSecondary')}</span>
                                      <div className="w-4 h-4 rounded bg-zinc-900" />
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="pt-4 border-t border-white/5">
                          <div className="flex items-center justify-between mb-4">
                              <h3 className="text-[9px] font-black text-zinc-500 tracking-[0.3em] uppercase italic">{t('sav.liveStatsDeployment')}</h3>
                              <button className="text-[8px] font-black text-[#ccff00] hover:underline">{t('sav.randomize')}</button>
                          </div>
                          <div className="space-y-2">
                              {fraggers.map((f, i) => (
                                  <div key={i} className="flex items-center gap-3 bg-zinc-950 border border-white/5 p-3 rounded-xl hover:border-[#ccff00]/20 transition-all">
                                      <div className="w-6 h-6 rounded-full bg-[#ccff00] text-black font-black text-[10px] flex items-center justify-center">{f.rank}</div>
                                      <input type="text" value={f.name} onChange={(e) => updateFragger(i, 'name', e.target.value)} className="flex-1 bg-transparent text-[10px] font-bold text-white uppercase outline-none" />
                                      <div className="w-20"><ScrollableInput value={f.elims} onChange={(v) => updateFragger(i, 'elims', v)} className="w-full bg-black/40 border border-white/5 rounded py-1 text-center text-[10px] font-black text-[#ccff00]" /></div>
                                  </div>
                              ))}
                          </div>
                      </div>

                  </div>
              </div>
          </main>

          <div className={`transition-all duration-300 flex shrink-0 ${showMonitors ? 'opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}>
            <PanelControlMonitor userRole={userRole} customPreview={renderLivePreview()} />
          </div>
        </div>
      </div>
    );
  };

  return renderContent();
};

export default SetupAssetView;
