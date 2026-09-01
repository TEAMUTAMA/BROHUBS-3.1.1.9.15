import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Construction,
  Crown,
  Filter,
  Globe,
  Layout,
  Lock,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldAlert,
  Trophy,
  Unlock,
  Upload,
} from 'lucide-react';
import { Asset, Game, Theme, PlayerData } from '../../../types';
import AssetView from '@/features/assets/AssetView';
import { ASSET_DATABASE } from '@/features/assets/assets';
import { getDefaultThemes, getGames } from '../../../services/gameService';
import { useT } from '../../../i18n/LanguageContext';
import { compressImage, BACKGROUND_PRESET } from '@/lib/imageCompression';
import { uploadImageFile } from '@/lib/supabaseStorage';
import OverlayTeamRosterView from './overlays/theme-01/team-roster';
import OverlayDrafNPickView from './overlays/theme-01/draf-n-pick';

const HIDDEN_MLBB_THEME_IDS = new Set(['mlbb-t1', 'mlbb-t2']);
const MLBB_MYTHIC_ARENA_THEME_ID = 'mlbb-theme-02';
const MLBB_MYTHIC_ARENA_THEME: Theme = {
  id: MLBB_MYTHIC_ARENA_THEME_ID,
  gameId: 'mlbb',
  name: 'MYTHIC ARENA',
  desc: 'Mobile Legends Mythic Theme 2',
  image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop',
  tier: 'ULTIMATE',
  locked: false,
};

interface MobileLegendsViewProps {
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
  projectPlayers?: PlayerData[];
  isDeployMode?: boolean;
  deployedAssetIds?: string[];
  onBackToProject?: () => void;
  onBackToTerminal?: () => void;
}

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
  onUpdateDesc,
}) => {
  const t = useT();
  const [showAdminTools, setShowAdminTools] = useState(false);
  const levels: Record<string, number> = { BASIC: 0, PREMIUM: 1, ULTIMATE: 2 };
  const isTierLocked = (levels[memberPackage] ?? 0) < (levels[theme.tier] ?? 0);
  const isLockedVisual = theme.locked || isTierLocked;

  const getTierColor = (tier: Theme['tier']) => {
    if (tier === 'ULTIMATE') return 'text-[#ccff00] border-[#ccff00]/30 bg-[#ccff00]/10';
    if (tier === 'PREMIUM') return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
    return 'text-white border-white/20 bg-white/10';
  };

  const handleCardClick = () => {
    if (isLockedVisual && userRole === 'member') return;
    onSelect();
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative aspect-[16/10] overflow-hidden rounded-[32px] border bg-black shadow-xl transition-all duration-500 ${
        isLockedVisual ? 'border-white/5' : 'cursor-pointer border-white/10 hover:border-[#ccff00]/50 hover:shadow-[0_0_30px_rgba(204,255,0,0.1)]'
      }`}
    >
      <img
        src={theme.image}
        className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
          isLockedVisual ? 'scale-100 opacity-20 grayscale' : 'opacity-50 grayscale group-hover:scale-105 group-hover:opacity-70 group-hover:grayscale-0'
        }`}
        alt={theme.name}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

      {theme.locked && (
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <Construction size={20} className="text-gray-400" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{t('pmv.comingSoon')}</span>
        </div>
      )}

      {!theme.locked && isTierLocked && (
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-[1px]">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
            <Lock size={20} className="text-red-500" />
          </div>
          <span className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-red-500">{t('pmv.locked')}</span>
          <span className="rounded bg-white/5 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-gray-400">
            {t('pmv.reqTier').replace('{tier}', theme.tier)}
          </span>
        </div>
      )}

      {userRole === 'admin' && showAdminTools && (
        <>
          <div
            className="absolute left-4 top-4 z-40 flex items-center gap-3 rounded-xl border border-white/10 bg-black/80 p-1.5 pl-2 shadow-lg backdrop-blur-md animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onToggleLock} className={`flex h-6 w-6 items-center justify-center transition-colors ${theme.locked ? 'text-red-500' : 'text-[#ccff00]'}`}>
              {theme.locked ? <Lock size={14} fill="currentColor" /> : <Unlock size={14} />}
            </button>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-1">
              {(['BASIC', 'PREMIUM', 'ULTIMATE'] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => onSetTier?.(tier)}
                  className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-black transition-all ${
                    theme.tier === tier
                      ? tier === 'ULTIMATE'
                        ? 'bg-[#ccff00] text-black shadow-[0_0_10px_#ccff00]'
                        : tier === 'PREMIUM'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-black'
                      : 'text-gray-500 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {tier[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="absolute right-4 top-20 z-40 flex flex-col gap-2 animate-in fade-in slide-in-from-right-4 duration-300" onClick={(e) => e.stopPropagation()}>
            <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-black/20 bg-[#ccff00] text-black shadow-lg transition-all hover:scale-110" title={t('pmv.uploadCustomImage')}>
              <input type="file" accept="image/*" className="hidden" onChange={onImageUpload} />
              <Upload size={14} strokeWidth={3} />
            </label>
            <button onClick={() => onResetImage?.()} className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-lg transition-all hover:scale-110 hover:bg-red-500 hover:text-white" title={t('pmv.resetToDefaultImage')}>
              <RotateCcw size={14} strokeWidth={3} />
            </button>
          </div>
        </>
      )}

      {!showAdminTools && (
        <div className="absolute left-4 top-4 z-20 animate-in fade-in duration-300">
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 shadow-lg backdrop-blur-md ${getTierColor(theme.tier)}`}>
            {theme.tier === 'ULTIMATE' ? <Crown size={10} /> : <ShieldAlert size={10} />}
            <span className="text-[8px] font-black uppercase tracking-widest">{theme.tier}</span>
          </div>
        </div>
      )}

      <div className={`absolute bottom-0 left-0 z-10 w-full p-6 transition-opacity ${isLockedVisual && userRole === 'member' ? 'opacity-20' : 'opacity-100'}`}>
        <div onClick={(e) => e.stopPropagation()}>
          {userRole === 'admin' ? (
            <input value={theme.name} onChange={(e) => onUpdateName?.(e.target.value)} className="mb-1 w-full border-none bg-transparent p-0 text-xl font-[900] uppercase italic leading-none text-white placeholder-white/20 focus:ring-0" />
          ) : (
            <h3 className="mb-1 text-xl font-[900] uppercase italic leading-none text-white">{theme.name}</h3>
          )}
          <p className="mb-6 text-[10px] font-bold tracking-wide text-gray-400">{theme.desc}</p>
        </div>
        <div
          className="flex cursor-pointer items-center justify-between border-t border-white/10 pt-4"
          onClick={(e) => {
            e.stopPropagation();
            if (userRole === 'admin') setShowAdminTools(!showAdminTools);
            else handleCardClick();
          }}
        >
          <div>
            <p className="mb-0.5 text-[9px] font-black uppercase tracking-wider text-white">{userRole === 'admin' ? t('pmv.adminControls') : t('pmv.configure')}</p>
            <p className="text-[7px] font-bold uppercase tracking-[0.2em] text-gray-600">{t('pmv.fullyCustomizable')}</p>
          </div>
          {userRole === 'admin' && (
            <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${showAdminTools ? 'rotate-90 scale-110 bg-[#ccff00] text-black shadow-[0_0_15px_#ccff00]' : 'bg-[#ccff00]/10 text-[#ccff00] group-hover:-rotate-45 group-hover:bg-[#ccff00] group-hover:text-black'}`}>
              <Settings2 size={14} />
            </div>
          )}
        </div>
      </div>
      {!isLockedVisual && <div className="absolute bottom-6 left-0 top-6 w-1 rounded-r-full bg-[#ccff00] opacity-0 transition-opacity group-hover:opacity-100" />}
    </div>
  );
};

const MobileLegendsView: React.FC<MobileLegendsViewProps> = ({
  onBack,
  themes,
  setThemes,
  onSelectTheme,
  selectedTheme,
  selectedAsset,
  onSelectAsset,
  onPreviewAsset,
  userRole,
  memberPackage,
  globalLogo,
  projectPlayers = [],
  isDeployMode = false,
  deployedAssetIds = [],
  onBackToProject,
  onBackToTerminal,
}) => {
  const t = useT();
  const [games, setGames] = useState<Game[]>([]);
  const mlbbThemes = themes.filter((theme) => theme.gameId === 'mlbb' && !HIDDEN_MLBB_THEME_IDS.has(theme.id));
  const mlbbAssets =
    selectedTheme?.id === MLBB_MYTHIC_ARENA_THEME_ID
      ? ASSET_DATABASE.filter((asset) => asset.id === 'mlbb-draf-n-pick')
      : ASSET_DATABASE.filter((asset) => asset.gameId === 'mlbb');

  useEffect(() => { getGames().then(setGames); }, []);
  useEffect(() => {
    setThemes((prev) => {
      if (prev.some((theme) => theme.id === MLBB_MYTHIC_ARENA_THEME_ID)) return prev;
      return [...prev, MLBB_MYTHIC_ARENA_THEME];
    });
  }, [setThemes]);

  const updateTheme = (id: string, updates: Partial<Theme>) => {
    setThemes((prev) => prev.map((theme) => (theme.id === id ? { ...theme, ...updates } : theme)));
  };

  const handleThemeImageUpload = (e: React.ChangeEvent<HTMLInputElement>, themeId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void compressImage(file, BACKGROUND_PRESET).then((dataUrl) =>
      uploadImageFile(file, `catalog/themes/${themeId}`, dataUrl)
    ).then((image) => updateTheme(themeId, { image }));
  };

  const handleThemeReset = async (themeId: string) => {
    const defaults = await getDefaultThemes();
    const original = defaults.find((theme) => theme.id === themeId);
    if (original) updateTheme(themeId, { image: original.image });
  };

  if (selectedTheme && selectedAsset) {
    if (selectedAsset.id === 'mlbb-team-roster') {
      return (
        <OverlayTeamRosterView
          asset={selectedAsset}
          theme={selectedTheme}
          games={games}
          themes={mlbbThemes}
          availableAssets={mlbbAssets}
          userRole={userRole}
          onBack={() => { onSelectAsset(null); onSelectTheme(null as any); }}
          onSelectTheme={onSelectTheme}
          onSelectAsset={onSelectAsset}
          globalLogo={globalLogo}
          projectPlayers={projectPlayers}
        />
      );
    }
    if (selectedAsset.id === 'mlbb-draf-n-pick') {
      return (
        <OverlayDrafNPickView
          asset={selectedAsset}
          theme={selectedTheme}
          games={games}
          themes={mlbbThemes}
          availableAssets={mlbbAssets}
          userRole={userRole}
          onBack={() => { onSelectAsset(null); onSelectTheme(null as any); }}
          onSelectAsset={onSelectAsset}
          projectPlayers={projectPlayers}
        />
      );
    }
  }

  if (selectedTheme) {
    return (
      <AssetView
        gameId="mlbb"
        theme={selectedTheme}
        assets={mlbbAssets}
        onBackToGame={() => onSelectTheme(null as any)}
        onBackToHub={onBack}
        onSelectAsset={onSelectAsset}
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
    <div className="flex min-h-full flex-col font-sans animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="group relative mb-8 h-80 w-full shrink-0 overflow-hidden rounded-[40px]">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop"
            className="h-full w-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105"
            alt="MLBB Background"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-transparent to-transparent" />
        </div>
        <div className="absolute left-6 top-6 z-20 flex items-center gap-2">
          {isDeployMode && onBackToTerminal && (
            <button onClick={onBackToTerminal} className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-bold text-gray-400 backdrop-blur-md transition-colors hover:bg-black/60 hover:text-white">
              <ArrowLeft size={14} /> {t('pmv.terminal')}
            </button>
          )}
          <button onClick={onBack} className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-bold text-gray-400 backdrop-blur-md transition-colors hover:bg-black/60 hover:text-white">
            <ArrowLeft size={14} /> {isDeployMode ? t('pmv.backToProject') : t('pmv.backToHub')}
          </button>
        </div>
        <div className="absolute bottom-8 left-8 z-20 max-w-2xl">
          <div className="mb-2 flex items-center gap-3 animate-in slide-in-from-left-4 duration-500 delay-100">
            <div className="rounded bg-[#ccff00] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black">{t('pmv.officialPartner')}</div>
            <div className="flex items-center gap-1 rounded bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black">
              <Trophy size={10} /> MPL READY
            </div>
          </div>
          <h1 className="mb-4 text-5xl font-black uppercase italic leading-none tracking-tighter text-white drop-shadow-2xl animate-in slide-in-from-left-4 duration-500 delay-200 md:text-7xl">
            MOBILE <span className="bg-gradient-to-r from-[#ccff00] to-white bg-clip-text text-transparent">LEGENDS</span>
          </h1>
          <p className="max-w-lg text-sm font-medium leading-relaxed text-gray-400 animate-in slide-in-from-left-4 duration-500 delay-300">{t('gph.mobileLegendsDesc')}</p>
        </div>
        <div className="absolute bottom-8 right-8 z-20 hidden gap-4 animate-in fade-in duration-700 delay-500 md:flex">
          <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
            <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-gray-500">{t('pmv.liveNodes')}</p>
            <div className="flex items-center gap-2"><div className="h-2 w-2 animate-pulse rounded-full bg-[#ccff00]" /><span className="text-xl font-black text-white">613</span></div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
            <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-gray-500">{t('pmv.activeRegion')}</p>
            <div className="flex items-center gap-2"><Globe size={14} className="text-blue-500" /><span className="text-xl font-black text-white">{t('pmv.global')}</span></div>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-40 mb-8 flex flex-col items-center justify-between gap-4 border-b border-white/5 bg-zinc-950/95 py-4 backdrop-blur md:flex-row">
        <div className="flex items-end gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-800 to-black shadow-lg">
            <Layout size={26} className="text-[#ccff00]" />
          </div>
          <div>
            <h2 className="mb-1 text-2xl font-black uppercase italic leading-none tracking-tight text-white">{t('pmv.selectLayout')}</h2>
            <p className="text-xs font-medium text-gray-500">{t('pmv.selectLayoutDesc')}</p>
          </div>
        </div>
        <div className="flex w-full items-center gap-3 md:w-auto">
          <div className="mr-2 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{userRole === 'admin' ? t('pmv.overrideLabel') : t('pmv.planLabel')}</span>
            <span className="text-xs font-black uppercase tracking-widest text-[#ccff00]">{memberPackage}</span>
          </div>
          <div className="group relative flex-1 md:flex-none">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 transition-colors group-focus-within:text-[#ccff00]" />
            <input type="text" placeholder={t('pmv.searchAssets')} className="w-full rounded-xl border border-white/10 bg-zinc-900 py-3 pl-10 pr-4 text-xs font-bold uppercase tracking-wider text-white placeholder:text-gray-700 transition-all focus:border-[#ccff00]/50 focus:outline-none md:w-64" />
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 text-gray-500 transition-all hover:border-[#ccff00]/30 hover:text-white">
            <Filter size={16} />
          </button>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-[40px] border border-white/5 bg-zinc-900/30 p-8 pb-20 md:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="relative z-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          {mlbbThemes.map((theme) => (
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
          <div className="group relative flex aspect-[16/10] cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-[32px] border-2 border-dashed border-white/10 bg-white/[0.02] transition-all hover:border-[#ccff00]/30 hover:bg-[#ccff00]/5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/5 bg-white/5 transition-transform group-hover:scale-110 group-hover:border-[#ccff00]/20 group-hover:bg-[#ccff00]/20">
              <Plus size={24} className="text-gray-400 group-hover:text-[#ccff00]" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 transition-colors group-hover:text-white">{t('pmv.importDesign')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileLegendsView;
