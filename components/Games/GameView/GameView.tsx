
import React, { useState } from 'react';
import { 
  Plus,
  ChevronRight, 
  Lock, 
  Unlock, 
  Image as ImageIcon, 
  Construction, 
  Crown, 
  ShieldAlert,
  Settings2,
  Upload,
  RotateCcw
} from 'lucide-react';
import { Theme, Asset } from '../../../types';
import AssetView from '../../AssetView';
import { getDefaultThemes } from '../../../services/gameService';

// --- THEME CARD COMPONENT (Internal) ---

interface ThemeCardProps {
  theme: Theme;
  userRole: 'admin' | 'member';
  memberPackage: string;
  onSelect: () => void;
  // Admin Actions
  onToggleLock?: () => void;
  onSetTier?: (tier: Theme['tier']) => void;
  onImageUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetImage?: () => void;
  onUpdateName?: (name: string) => void;
  onUpdateDesc?: (desc: string) => void;
  adminTierOverride?: 'BASIC' | 'PREMIUM' | 'ULTIMATE';
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
  onUpdateDesc,
  adminTierOverride
}) => {
  const [showAdminTools, setShowAdminTools] = useState(false);

  // Helper to check if member has access based on package tier
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
        {/* Image Background */}
        <img 
            src={theme.image} 
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 
                ${isLockedVisual ? 'opacity-20 grayscale scale-100' : 'opacity-50 group-hover:opacity-70 group-hover:scale-105 grayscale group-hover:grayscale-0'}
            `} 
            alt={theme.name} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        
        {/* Label Rekomendasi Dimensi - ADMIN ONLY */}
        {!isGlobalLocked && userRole === 'admin' && (
            <div className="absolute right-4 top-4 px-2.5 py-1.5 rounded-lg bg-black/95 border border-white/60 backdrop-blur-sm pointer-events-none whitespace-nowrap z-20 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[6px] font-black text-[#FF0000] uppercase tracking-widest leading-none mb-0.5">REC: SIZE</p>
                <p className="text-[7px] font-bold text-[#FF0000] tracking-wider leading-none">1920 x 1080</p>
            </div>
        )}

        {/* --- LOCKED OVERLAYS --- */}
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

        {/* --- ADMIN CONTROLS (TRIGGERED BY GEAR CLICK) --- */}
        {userRole === 'admin' && showAdminTools && (
            <>
                {/* Top Right Control Bar (Lock & Tier) */}
                <div 
                    className="absolute top-4 right-4 z-40 flex items-center gap-3 p-1.5 pl-2 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 shadow-lg animate-in fade-in zoom-in duration-200" 
                    onClick={(e) => e.stopPropagation()}
                >
                    <button 
                        onClick={onToggleLock}
                        className={`w-6 h-6 flex items-center justify-center transition-colors ${
                            theme.locked 
                            ? 'text-red-500 hover:text-red-400' 
                            : 'text-[#ccff00] hover:text-white'
                        }`}
                        title={theme.locked ? "Unlock Theme" : "Lock Theme"}
                    >
                        {theme.locked ? <Lock size={14} fill="currentColor" /> : <Unlock size={14} />}
                    </button>

                    <div className="w-[1px] h-4 bg-white/20" />

                    <div className="flex items-center gap-1">
                        {(['BASIC', 'PREMIUM', 'ULTIMATE'] as const).map((tier) => {
                            const isActive = theme.tier === tier;
                            let activeColor = '';
                            let label = '';
                            
                            if (tier === 'BASIC') { activeColor = 'bg-white text-black'; label = 'B'; }
                            if (tier === 'PREMIUM') { activeColor = 'bg-blue-500 text-white'; label = 'P'; }
                            if (tier === 'ULTIMATE') { activeColor = 'bg-[#ccff00] text-black'; label = 'U'; }

                            return (
                                <button
                                    key={tier}
                                    onClick={() => onSetTier?.(tier)}
                                    className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black transition-all ${
                                        isActive 
                                            ? activeColor 
                                            : 'text-gray-500 hover:text-white hover:bg-white/10'
                                    }`}
                                    title={`Set Tier: ${tier}`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Vertical Image Controls (Right Side) - MOVED DOWN to top-20 */}
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
        
        {/* Tier Badge */}
        {(!showAdminTools) && (
             <div className="absolute top-4 left-4 z-20 animate-in fade-in duration-300">
                <div className={`px-3 py-1.5 rounded-lg border backdrop-blur-md flex items-center gap-2 shadow-lg ${getTierColor(theme.tier)}`}>
                    {theme.tier === 'ULTIMATE' ? <Crown size={10} /> : <ShieldAlert size={10} />}
                    <span className="text-[8px] font-black tracking-widest uppercase">{theme.tier}</span>
                </div>
            </div>
        )}

        {/* Content Area */}
        <div className={`absolute bottom-0 left-0 w-full p-6 z-10 transition-opacity ${isLockedVisual && userRole === 'member' ? 'opacity-20' : 'opacity-100'}`}>
            {/* Editable Name & Description for Admin */}
            <div onClick={(e) => e.stopPropagation()}>
                {userRole === 'admin' ? (
                    <input 
                        type="text" 
                        value={theme.name}
                        onChange={(e) => onUpdateName?.(e.target.value)}
                        className="w-full bg-transparent border-none p-0 text-xl font-[900] italic uppercase mb-1 text-white leading-none focus:ring-0 placeholder-white/20"
                        placeholder="THEME NAME"
                    />
                ) : (
                    <h3 className="text-xl font-[900] italic uppercase mb-1 text-white leading-none">{theme.name}</h3>
                )}
                
                {userRole === 'admin' ? (
                    <input
                        type="text"
                        value={theme.desc}
                        onChange={(e) => onUpdateDesc?.(e.target.value)}
                        className="w-full bg-transparent border-none p-0 text-[10px] text-gray-300 font-bold mb-6 tracking-wide focus:ring-0 placeholder-gray-600"
                        placeholder="Description..."
                    />
                ) : (
                    <p className="text-[10px] text-gray-400 font-bold mb-6 tracking-wide">{theme.desc}</p>
                )}
            </div>
            
            <div 
                className="flex items-center justify-between border-t border-white/10 pt-4 cursor-pointer" 
                onClick={handleActionClick}
            >
                <div>
                    <p className="text-[9px] font-black text-white uppercase tracking-wider mb-0.5">
                        {userRole === 'admin' ? 'ADMIN CONTROLS' : 'CONFIGURE'}
                    </p>
                    <p className="text-[7px] font-bold text-gray-600 uppercase tracking-[0.2em]">
                        {userRole === 'admin' ? (showAdminTools ? 'TAP TO HIDE' : 'TAP TO EDIT') : 'OBS / VMIX READY'}
                    </p>
                </div>
                {userRole === 'admin' && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all transform duration-300 
                        ${showAdminTools 
                            ? 'bg-[#ccff00] text-black rotate-90 scale-110 shadow-[0_0_15px_#ccff00]' 
                            : 'bg-[#ccff00]/10 text-[#ccff00] group-hover:bg-[#ccff00] group-hover:text-black group-hover:rotate-[-45deg]'
                        }`}
                    >
                        <Settings2 size={14} />
                    </div>
                )}
            </div>
        </div>
        
        {/* Active Indicator (Left Border) */}
        {!isLockedVisual && (
            <div className={`absolute top-6 bottom-6 left-0 w-1 rounded-r-full transition-opacity opacity-0 group-hover:opacity-100 ${theme.tier === 'ULTIMATE' ? 'bg-[#ccff00]' : (theme.tier === 'PREMIUM' ? 'bg-blue-500' : 'bg-white')}`} />
        )}
    </div>
  );
};


// --- MAIN GAMEVIEW COMPONENT ---

interface GameViewProps {
  selectedGame: string;
  onBack: () => void;
  themes: Theme[];
  setThemes: React.Dispatch<React.SetStateAction<Theme[]>>;
  onSelectTheme: (theme: Theme | null) => void;
  selectedTheme: Theme | null;
  userRole: 'admin' | 'member';
  memberPackage?: string;
  adminTierOverride?: 'BASIC' | 'PREMIUM' | 'ULTIMATE';
  isDeployMode?: boolean;
  deployedAssetIds?: string[];
  onBackToProject?: () => void;
  onBackToTerminal?: () => void;
  onSelectAsset?: (asset: Asset) => void;
  onPreviewAsset?: (asset: Asset) => void;
}

const GameView: React.FC<GameViewProps> = ({
  selectedGame,
  onBack,
  themes,
  setThemes,
  onSelectTheme,
  selectedTheme,
  userRole,
  memberPackage = 'BASIC',
  adminTierOverride,
  isDeployMode = false,
  deployedAssetIds = [],
  onBackToProject,
  onBackToTerminal,
  onSelectAsset,
  onPreviewAsset,
}) => {

  const filteredThemes = themes.filter(t => t.gameId === selectedGame || t.gameId === selectedGame.toLowerCase());

  const handleThemeImageUpload = (e: React.ChangeEvent<HTMLInputElement>, themeId: string) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setThemes(prev => prev.map(t => t.id === themeId ? { ...t, image: reader.result as string } : t));
          };
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

  const updateTheme = (id: string, updates: Partial<Theme>) => {
      setThemes(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const toggleThemeLock = (theme: Theme) => {
      updateTheme(theme.id, { locked: !theme.locked });
  };

  const setThemeTier = (theme: Theme, tier: Theme['tier']) => {
      updateTheme(theme.id, { tier });
  };

  if (selectedTheme) {
      const genericAssets: Asset[] = []; 
      return (
          <AssetView 
              gameId={selectedGame}
              theme={selectedTheme}
              assets={genericAssets}
              onBackToGame={() => onSelectTheme(null as any)}
              onBackToHub={onBack}
              onSelectAsset={onSelectAsset ?? (() => {})}
              onPreviewAsset={onPreviewAsset}
              userRole={userRole}
              memberPackage={memberPackage}
              isDeployMode={isDeployMode}
              deployedAssetIds={deployedAssetIds}
              onBackToProject={onBackToProject}
              onBackToTerminal={onBackToTerminal}
          />
      );
  }

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500 h-full flex flex-col">
         <div className="mb-8">
             <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">Master Asset Hub</h1>
             <p className="text-gray-500 text-sm font-medium">Select a visual language for your stream overlay.</p>
         </div>

         <div className="flex items-center gap-4 mb-12">
             <button 
                onClick={onBack}
                className="bg-white/5 text-gray-400 border border-white/10 px-6 py-2.5 rounded-xl font-black text-[10px] tracking-[0.2em] uppercase hover:bg-white/10 hover:text-white transition-all"
             >
                GAME HUB
             </button>
             <span className="text-white/20">/</span>
             <button className="bg-[#ccff00] text-black px-6 py-2.5 rounded-xl font-black text-[10px] tracking-[0.2em] uppercase shadow-[0_0_15px_rgba(204,255,0,0.3)] border border-[#ccff00]">
                {selectedGame === 'pubg' ? 'PUBG MOBILE' : selectedGame.toUpperCase()}
             </button>
         </div>

         <div className="relative bg-zinc-900/30 border border-white/5 rounded-[40px] p-8 md:p-12 min-h-[70vh] flex flex-col overflow-hidden w-full h-full">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            
            <div className="hidden md:block absolute top-0 right-0 pointer-events-none opacity-[0.03] select-none overflow-hidden h-full">
                 <span className="text-[12rem] md:text-[16rem] font-[1000] italic leading-none text-white whitespace-nowrap transform -translate-y-12 translate-x-12 inline-block">
                     {selectedGame === 'pubg' ? 'PUBG' : 'GAME'}
                 </span>
            </div>

            <div className="relative z-10 mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-8">
                <div>
                    <h2 className="text-3xl font-black italic text-white mb-2 uppercase tracking-tight">Select Style Variant</h2>
                    <p className="text-gray-500 text-sm max-w-2xl leading-relaxed">
                        Choose a visual theme to manage templates for {selectedGame === 'pubg' ? 'PUBG' : 'this title'}.
                    </p>
                </div>
                <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{userRole === 'admin' ? 'OVERRIDE:' : 'YOUR PLAN:'}</span>
                    <span className="text-xs font-black text-[#ccff00] tracking-widest uppercase">{memberPackage}</span>
                </div>
            </div>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 pb-20">
                {filteredThemes.length > 0 ? (
                    filteredThemes.map((theme, i) => (
                        <ThemeCard 
                            key={i}
                            theme={theme}
                            userRole={userRole}
                            memberPackage={memberPackage}
                            onSelect={() => onSelectTheme(theme)}
                            onToggleLock={() => toggleThemeLock(theme)}
                            onSetTier={(tier) => setThemeTier(theme, tier)}
                            onImageUpload={(e) => handleThemeImageUpload(e, theme.id)}
                            onResetImage={() => handleThemeReset(theme.id)}
                            onUpdateName={(name) => updateTheme(theme.id, { name })}
                            onUpdateDesc={(desc) => updateTheme(theme.id, { desc })}
                            adminTierOverride={adminTierOverride}
                        />
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center flex flex-col items-center opacity-50">
                        <Construction size={48} className="text-gray-600 mb-4" />
                        <h3 className="text-xl font-black text-gray-500 uppercase tracking-widest">No Themes Configured</h3>
                        <p className="text-xs text-gray-600 font-bold tracking-widest uppercase mt-2">Check Game Service Configuration</p>
                    </div>
                )}

                 <div className="group relative aspect-[16/10] rounded-[32px] overflow-hidden border-2 border-dashed border-white/10 hover:border-[#ccff00]/30 hover:bg-[#ccff00]/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 bg-white/[0.02]">
                    <div className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform group-hover:bg-[#ccff00]/20 group-hover:border-[#ccff00]/20">
                        <Plus size={24} className="text-gray-400 group-hover:text-[#ccff00]" />
                    </div>
                    <span className="text-xs font-bold text-gray-500 group-hover:text-white uppercase tracking-widest transition-colors">Import Design</span>
                </div>
            </div>
         </div>
     </div>
  );
};

export default GameView;
