
import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Search, 
  Filter,
  Globe,
  ArrowLeft,
  Layout,
  Plus,
  Image as ImageIcon,
  Construction,
  Crown, 
  ShieldAlert,
  Settings2,
  Unlock,
  Lock,
  Check,
  ChevronRight,
  Upload,
  RotateCcw
} from 'lucide-react';
import { Theme, Asset, Game, PlayerData } from '../../../types';
import AssetView from '../../AssetView';
import OverlayTopFraggersView from './OverlayPubgMobileTheme01/OverlayTopFraggersView';
import OverlayLeaderboardView from './OverlayPubgMobileTheme01/OverlayLeaderboardView';
import { getGames, getDefaultThemes } from '../../../services/gameService';
import { ASSET_DATABASE } from '../../../constants/assets';

interface PubgMobileViewProps {
  onBack: () => void;
  themes: Theme[];
  setThemes: React.Dispatch<React.SetStateAction<Theme[]>>;
  onSelectTheme: (theme: Theme) => void;
  selectedTheme: Theme | null;
  selectedAsset: Asset | null;
  onSelectAsset: (asset: Asset | null) => void;
  onPreviewAsset?: (asset: Asset) => void;
  userRole: 'admin' | 'member';
  memberPackage: string;
  globalLogo?: string | null;
  adminTierOverride?: 'BASIC' | 'PREMIUM' | 'ULTIMATE';
  projectPlayers?: PlayerData[];
}

// --- THEME CARD COMPONENT ---
interface ThemeCardProps {
  theme: Theme;
  userRole: 'admin' | 'member';
  memberPackage: string;
  onSelect: () => void;
  onToggleLock?: () => void;
  onSetTier?: (tier: Theme['tier']) => void;
  onImageUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetImage?: () => void;
  onUpdateName?: (name: string) => void;
  onUpdateDesc?: (desc: string) => void;
}

const ThemeCard: React.FC<ThemeCardProps> = ({
  theme,
  userRole,
  memberPackage,
  onSelect,
  onToggleLock,
  onSetTier,
  onImageUpload,
  onResetImage,
  onUpdateName,
  onUpdateDesc
}) => {
  const [showAdminTools, setShowAdminTools] = useState(false);

  const hasAccess = (themeTier: Theme['tier'], userPkg: string) => {
      const levels: Record<string, number> = { 'BASIC': 0, 'PREMIUM': 1, 'ULTIMATE': 2 };
      const userLevel = levels[userPkg] ?? 0;
      const themeLevel = levels[themeTier] ?? 0;
      return userLevel >= themeLevel;
  };

  const getTierColor = (tier: Theme['tier']) => {
      switch (tier) {
          case 'BASIC': return 'text-white border-white/20 bg-white/10';
          case 'PREMIUM': return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
          case 'ULTIMATE': return 'text-[#ccff00] border-[#ccff00]/30 bg-[#ccff00]/10';
          default: return 'text-gray-400';
      }
  };

  const isGlobalLocked = theme.locked;
  const isTierLocked = !hasAccess(theme.tier, memberPackage);
  const isLockedVisual = isGlobalLocked || isTierLocked;

  const handleCardClick = () => {
      if (isLockedVisual && userRole === 'member') return;
      onSelect();
  };

  const handleActionClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (userRole === 'admin') {
          setShowAdminTools(!showAdminTools);
      } else {
          handleCardClick();
      }
  };

  return (
    <div 
        onClick={handleCardClick}
        className={`group relative aspect-[16/10] rounded-[32px] overflow-hidden border bg-black shadow-xl transition-all duration-500 ${
            isLockedVisual 
                ? 'border-white/5' 
                : 'cursor-pointer border-white/10 hover:border-[#ccff00]/50 hover:shadow-[0_0_30px_rgba(204,255,0,0.1)]'
        }`}
    >
        <img 
            src={theme.image} 
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 
                ${isLockedVisual ? 'opacity-20 grayscale scale-100' : 'opacity-50 group-hover:opacity-70 group-hover:scale-105 grayscale group-hover:grayscale-0'}
            `} 
            alt={theme.name} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        
        {!isGlobalLocked && userRole === 'admin' && (
            <div className="absolute right-4 top-4 px-2.5 py-1.5 rounded-lg bg-black/95 border border-white/60 backdrop-blur-sm pointer-events-none whitespace-nowrap z-20 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[6px] font-black text-[#FF0000] uppercase tracking-widest leading-none mb-0.5">REC: SIZE</p>
                <p className="text-[7px] font-bold text-[#FF0000] tracking-wider leading-none">1920 x 1080</p>
            </div>
        )}
        
        {isGlobalLocked && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] pointer-events-none">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 border border-white/10">
                    <Construction size={20} className="text-gray-400" />
                </div>
                <span className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">COMING SOON</span>
            </div>
        )}

        {!isGlobalLocked && isTierLocked && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-[1px] pointer-events-none">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3 border border-red-500/20">
                    <Lock size={20} className="text-red-500" />
                </div>
                <span className="text-[10px] font-black text-red-500 tracking-[0.2em] uppercase mb-1">LOCKED</span>
                <span className="text-[8px] font-bold text-gray-400 tracking-wider uppercase bg-white/5 px-2 py-1 rounded">
                    REQ: {theme.tier}
                </span>
            </div>
        )}

        {userRole === 'admin' && showAdminTools && (
            <>
                <div 
                    className="absolute top-4 left-4 z-40 flex items-center gap-3 p-1.5 pl-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 shadow-lg animate-in fade-in zoom-in duration-200" 
                    onClick={(e) => e.stopPropagation()}
                >
                    <button onClick={onToggleLock} className={`w-6 h-6 flex items-center justify-center transition-colors ${theme.locked ? 'text-red-500' : 'text-[#ccff00]'}`}>{theme.locked ? <Lock size={14} fill="currentColor" /> : <Unlock size={14} />}</button>
                    <div className="w-[1px] h-4 bg-white/20" />
                    <div className="flex items-center gap-1">
                        {(['BASIC', 'PREMIUM', 'ULTIMATE'] as const).map((tier) => (
                            <button key={tier} onClick={() => onSetTier?.(tier)} className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black transition-all ${theme.tier === tier ? (tier === 'ULTIMATE' ? 'bg-[#ccff00] text-black shadow-[0_0_10px_#ccff00]' : tier === 'PREMIUM' ? 'bg-blue-500 text-white' : 'bg-white text-black') : 'text-gray-500 hover:text-white hover:bg-white/10'}`}>{tier[0]}</button>
                        ))}
                    </div>
                </div>

                <div className="absolute top-20 right-4 z-40 flex flex-col gap-2 animate-in fade-in slide-in-from-right-4 duration-300" onClick={(e) => e.stopPropagation()}>
                    <label 
                        className="w-8 h-8 rounded-full bg-[#ccff00] text-black flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-all border border-black/20" 
                        title="Upload Custom Image"
                    >
                        <input type="file" accept="image/*" className="hidden" onChange={onImageUpload} />
                        <Upload size={14} strokeWidth={3} />
                    </label>
                    <button 
                        onClick={() => onResetImage?.()}
                        className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:bg-red-500 hover:text-white hover:scale-110 transition-all border border-black/10"
                        title="Reset to Default Image"
                    >
                        <RotateCcw size={14} strokeWidth={3} />
                    </button>
                </div>
            </>
        )}
        
        {(!showAdminTools) && (
             <div className="absolute top-4 left-4 z-20 animate-in fade-in duration-300">
                <div className={`px-3 py-1.5 rounded-lg border backdrop-blur-md flex items-center gap-2 shadow-lg ${getTierColor(theme.tier)}`}>
                    {theme.tier === 'ULTIMATE' ? <Crown size={10} /> : <ShieldAlert size={10} />}
                    <span className="text-[8px] font-black tracking-widest uppercase">{theme.tier}</span>
                </div>
            </div>
        )}

        <div className={`absolute bottom-0 left-0 w-full p-6 z-10 transition-opacity ${isLockedVisual && userRole === 'member' ? 'opacity-20' : 'opacity-100'}`}>
            <div onClick={(e) => e.stopPropagation()}>
                {userRole === 'admin' ? (<input type="text" value={theme.name} onChange={(e) => onUpdateName?.(e.target.value)} className="w-full bg-transparent border-none p-0 text-xl font-[900] italic uppercase mb-1 text-white leading-none focus:ring-0 placeholder-white/20" />) : (<h3 className="text-xl font-[900] italic uppercase mb-1 text-white leading-none">{theme.name}</h3>)}
                <p className="text-[10px] text-gray-400 font-bold mb-6 tracking-wide">{theme.desc}</p>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-4 cursor-pointer" onClick={handleActionClick}>
                <div>
                    <p className="text-[9px] font-black text-white uppercase tracking-wider mb-0.5">{userRole === 'admin' ? 'ADMIN CONTROLS' : 'CONFIGURE'}</p>
                    <p className="text-[7px] font-bold text-gray-600 uppercase tracking-[0.2em]">FULLY CUSTOMIZABLE</p>
                </div>
                {userRole === 'admin' && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all transform duration-300 ${showAdminTools ? 'bg-[#ccff00] text-black rotate-90 scale-110 shadow-[0_0_15px_#ccff00]' : 'bg-[#ccff00]/10 text-[#ccff00] group-hover:bg-[#ccff00] group-hover:text-black group-hover:rotate-[-45deg]'}`}>
                        <Settings2 size={14} />
                    </div>
                )}
            </div>
        </div>
        {!isLockedVisual && (<div className={`absolute top-6 bottom-6 left-0 w-1 rounded-r-full transition-opacity opacity-0 group-hover:opacity-100 ${theme.tier === 'ULTIMATE' ? 'bg-[#ccff00]' : (theme.tier === 'PREMIUM' ? 'bg-blue-500' : 'bg-white')}`} />)}
    </div>
  );
};

const PubgMobileView: React.FC<PubgMobileViewProps> = ({
  onBack, themes, setThemes, onSelectTheme, selectedTheme, selectedAsset, onSelectAsset, onPreviewAsset, userRole, memberPackage, globalLogo, adminTierOverride, projectPlayers: projectPlayersProp = [],
}) => {
  const [activeTab, setActiveTab] = useState<'TEMPLATES' | 'WIDGETS' | 'CONFIG'>('TEMPLATES');
  const [games, setGames] = useState<Game[]>([]);

  const pubgThemes = themes.filter(t => t.gameId === 'pubg');
  const pubgAssets = ASSET_DATABASE.filter(a => a.gameId === 'pubg');

  useEffect(() => { getGames().then(setGames); }, []);

  const updateTheme = (id: string, updates: Partial<Theme>) => { setThemes(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t)); };

  const handleThemeImageUpload = (e: React.ChangeEvent<HTMLInputElement>, themeId: string) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => { setThemes(prev => prev.map(t => t.id === themeId ? { ...t, image: reader.result as string } : t)); };
          reader.readAsDataURL(file);
      }
  };

  const handleThemeReset = async (themeId: string) => {
      const defaults = await getDefaultThemes();
      const original = defaults.find(t => t.id === themeId);
      if (original) {
          setThemes(prev => prev.map(t => t.id === themeId ? { ...t, image: original.image } : t));
      }
  };

  if (selectedTheme && selectedAsset) {
      const projectPlayers = projectPlayersProp ?? [];
      // Logic for Top Fraggers
      if (selectedAsset.id === 'pmgc-fraggers') {
          return (
            <OverlayTopFraggersView 
                asset={selectedAsset} 
                theme={selectedTheme} 
                games={games} 
                themes={pubgThemes} 
                availableAssets={pubgAssets} 
                userRole={userRole} 
                onBack={() => { onSelectAsset(null); onSelectTheme(null as any); }} 
                onSelectTheme={onSelectTheme} 
                onSelectAsset={onSelectAsset} 
                globalLogo={globalLogo}
                projectPlayers={projectPlayers}
            />
          );
      }

      // Logic for Leaderboard (Overall Ranking)
      if (selectedAsset.id === 'pmgc-leaderboard') {
          return (
            <OverlayLeaderboardView 
                asset={selectedAsset} 
                theme={selectedTheme} 
                games={games} 
                themes={pubgThemes} 
                availableAssets={pubgAssets} 
                userRole={userRole} 
                onBack={() => { onSelectAsset(null); onSelectTheme(null as any); }} 
                onSelectTheme={onSelectTheme} 
                onSelectAsset={onSelectAsset} 
                globalLogo={globalLogo}
                projectPlayers={projectPlayers}
            />
          );
      }
      
      // Fallback for missing/deleted overlay components
      return (
        <div className="flex flex-col h-full bg-black text-white items-center justify-center p-8 animate-in fade-in">
            <h3 className="text-xl font-black mb-2 text-[#ccff00] uppercase tracking-widest">ASSET EDITOR UNAVAILABLE</h3>
            <p className="text-zinc-500 text-xs mb-8 uppercase tracking-widest max-w-md text-center">
                The configuration module for this asset has been removed or is currently under maintenance.
            </p>
            <button 
                onClick={() => onSelectAsset(null)} 
                className="px-8 py-3 bg-zinc-900 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400"
            >
                RETURN TO MENU
            </button>
        </div>
      );
  }

  if (selectedTheme) {
      return (
        <AssetView 
          gameId="pubg" 
          theme={selectedTheme} 
          assets={pubgAssets} 
          onBackToGame={() => onSelectTheme(null as any)} 
          onBackToHub={onBack} 
          onSelectAsset={onSelectAsset}
          onPreviewAsset={onPreviewAsset}
          userRole={userRole}
          memberPackage={memberPackage}
        />
      );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 min-h-full flex flex-col font-sans">
      <div className="relative w-full h-80 rounded-[40px] overflow-hidden mb-8 group shrink-0">
        <div className="absolute inset-0"><img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000" alt="PUBG Background" /><div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" /><div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-transparent to-transparent" /></div>
        <div className="absolute top-6 left-6 z-20"><button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 hover:bg-black/60"><ArrowLeft size={14} /> BACK TO HUB</button></div>
        <div className="absolute bottom-8 left-8 z-20 max-w-2xl"><div className="flex items-center gap-3 mb-2 animate-in slide-in-from-left-4 duration-500 delay-100"><div className="bg-[#ccff00] text-black text-[10px] font-black px-2 py-0.5 rounded tracking-widest uppercase">OFFICIAL PARTNER</div><div className="bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded tracking-widest uppercase flex items-center gap-1"><Trophy size={10} /> PMPL READY</div></div><h1 className="text-5xl md:text-7xl font-black italic tracking-tighter text-white uppercase leading-none mb-4 drop-shadow-2xl animate-in slide-in-from-left-4 duration-500 delay-200">PUBG <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ccff00] to-white">MOBILE</span></h1><p className="text-gray-400 text-sm font-medium max-w-lg leading-relaxed animate-in slide-in-from-left-4 duration-500 delay-300">Access the official broadcast toolkit for PUBG Mobile tournaments. Features automated kill feeds, survival status, and map telemetry integration.</p></div>
        <div className="absolute right-8 bottom-8 z-20 flex gap-4 animate-in fade-in duration-700 delay-500 hidden md:flex"><div className="bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-2xl"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">LIVE NODES</p><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#ccff00] animate-pulse" /><span className="text-xl font-black text-white">842</span></div></div><div className="bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-2xl"><p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">ACTIVE REGION</p><div className="flex items-center gap-2"><Globe size={14} className="text-blue-500" /><span className="text-xl font-black text-white">GLOBAL</span></div></div></div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4 sticky top-0 bg-zinc-950/95 backdrop-blur z-40 py-4 border-b border-white/5">
        <div className="flex items-center gap-2 bg-zinc-900/50 p-1.5 rounded-xl border border-white/5">{['TEMPLATES', 'WIDGETS', 'CONFIG'].map((tab) => (<button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-2.5 rounded-lg text-[10px] font-black tracking-[0.2em] uppercase transition-all ${activeTab === tab ? 'bg-[#ccff00] text-black shadow-[0_0_15px_rgba(204,255,0,0.2)]' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>{tab}</button>))}</div>
        <div className="flex items-center gap-3 w-full md:w-auto"><div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2 mr-4"><span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{userRole === 'admin' ? 'OVERRIDE:' : 'PLAN:'}</span><span className="text-xs font-black text-[#ccff00] tracking-widest uppercase">{memberPackage}</span></div><div className="relative group flex-1 md:flex-none"><Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-[#ccff00] transition-colors" /><input type="text" placeholder="SEARCH ASSETS..." className="w-full md:w-64 bg-zinc-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-white placeholder:text-gray-700 focus:outline-none focus:border-[#ccff00]/50 transition-all uppercase tracking-wider" /></div><button className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:border-[#ccff00]/30 transition-all"><Filter size={16} /></button></div>
      </div>

      <div className="relative w-full bg-zinc-900/30 border border-white/5 rounded-[40px] p-8 md:p-10 overflow-hidden pb-20"><div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" /><div className="relative z-10 flex items-end gap-4 mb-8 border-b border-white/5 pb-6"><div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-white/10 flex items-center justify-center shadow-lg"><Layout size={32} className="text-[#ccff00]" /></div><div><h2 className="text-3xl font-black italic uppercase text-white tracking-tight leading-none mb-1">Select Layout</h2><p className="text-sm text-gray-500 font-medium">Choose a visual style for your broadcast overlay.</p></div></div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-8">
            {pubgThemes.map((theme) => (
                <ThemeCard 
                    key={theme.id} 
                    theme={theme} 
                    userRole={userRole} 
                    memberPackage={memberPackage} 
                    onSelect={() => onSelectTheme(theme)} 
                    onToggleLock={() => updateTheme(theme.id, { locked: !theme.locked })} 
                    onSetTier={(tier) => updateTheme(theme.id, { tier })} 
                    onImageUpload={(e) => handleThemeImageUpload(e, theme.id)} 
                    onResetImage={() => handleThemeReset(theme.id)}
                    onUpdateName={(name) => updateTheme(theme.id, { name })} 
                    onUpdateDesc={(desc) => updateTheme(theme.id, { desc })} 
                />
            ))}
            <div className="group relative aspect-[16/10] rounded-[32px] overflow-hidden border-2 border-dashed border-white/10 hover:border-[#ccff00]/30 hover:bg-[#ccff00]/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 bg-white/[0.02]"><div className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform group-hover:bg-[#ccff00]/20 group-hover:border-[#ccff00]/20"><Plus size={24} className="text-gray-400 group-hover:text-[#ccff00]" /></div><span className="text-xs font-bold text-gray-500 group-hover:text-white uppercase tracking-widest transition-colors">Import Design</span></div>
        </div>
      </div>
    </div>
  );
};

export default PubgMobileView;
