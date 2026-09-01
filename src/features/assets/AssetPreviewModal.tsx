
import React, { useRef, useState, useEffect } from 'react';
import { X, Monitor, Signal, Maximize2, Zap, Activity, Target } from 'lucide-react';
import { Asset, Theme, Game, PlayerData } from '@/types';
import { useT } from '@/i18n/LanguageContext';
import { ASSET_DATABASE } from './assets';
import { useSharedState } from '@/lib/useSharedState';
import OverlayTopFraggersView from '@/features/games/pubg-mobile/overlays/theme-01/top-fraggers';
import OverlayOverallRankingView from '@/features/games/pubg-mobile/overlays/theme-01/leaderboard';
import OverlayTeamRosterView from '@/features/games/pubg-mobile/overlays/theme-01/team-roster';
import OverlayMlbbDrafNPickView from '@/features/games/mobile-legends/overlays/theme-01/draf-n-pick';

interface AssetPreviewModalProps {
  asset: Asset;
  theme: Theme;
  onClose: () => void;
  /** Data yang dibutuhkan overlay asli supaya Preview = persis yang tayang. */
  games?: Game[];
  themes?: Theme[];
  userRole?: 'admin' | 'member';
  globalLogo?: string | null;
  projectPlayers?: PlayerData[];
  companionProjectScope?: string | null;
}

/**
 * Skala konten 1920×1080 agar pas di dalam kotak 16:9 modal — meniru pola monitor
 * (PanelControlMonitor): kotak tetap 1920×1080 lalu `transform: scale(lebar/1920)`.
 */
const StageScaler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / 1920);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div
        className="w-[1920px] h-[1080px] shrink-0 origin-center pointer-events-none relative"
        style={{ transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
};

const AssetPreviewModal: React.FC<AssetPreviewModalProps> = ({
  asset,
  theme,
  onClose,
  games,
  themes,
  userRole,
  globalLogo,
  projectPlayers,
  companionProjectScope,
}) => {
  const t = useT();

  // Tema yang dipakai = sama persis seperti yang tayang (mengikuti renderProgramAsset).
  const [selectedThemeId] = useSharedState<string>('BROHUBS_STUDIO_SELECTED_THEME_ID', '');
  const themeList = themes && themes.length > 0 ? themes : [theme];
  const themeToUse =
    themeList.find((tm) => tm.id === selectedThemeId) ||
    themeList.find((tm) => tm.gameId === asset.gameId) ||
    theme;

  // Mock background images for realistic preview context
  const getContextBg = () => {
    const gameId = asset.gameId.toLowerCase();
    if (gameId === 'pubg') return "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070";
    if (gameId === 'mlbb') return "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071";
    if (gameId === 'val') return "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=2070";
    if (gameId === 'ff') return "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?q=80&w=2070";
    return "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070";
  };

  /**
   * Render overlay ASLI (komponen yang sama dengan output siaran), bukan mockup.
   * Props mengikuti StandaloneProgramView (mode tampilan bersih, read-only via visualOnly).
   * Mengembalikan null bila asset belum punya overlay asli → tampil fallback jujur.
   */
  const renderRealOverlay = (): React.ReactNode => {
    const commonProps = {
      asset,
      theme: themeToUse,
      games: games ?? [],
      themes: themeList,
      availableAssets: ASSET_DATABASE,
      userRole: 'member' as const, // tampilan bersih tanpa kontrol editor
      onBack: () => {},
      globalLogo: globalLogo ?? null,
      projectPlayers: projectPlayers ?? [],
      companionProjectScope: companionProjectScope ?? null,
      isGlobalStudio: true,
      visualOnly: true,
    };

    if (asset.gameId === 'pubg') {
      if (asset.id === 'pmgc-fraggers') {
        return <OverlayTopFraggersView key={asset.id} {...commonProps} />;
      }
      if (asset.id === 'pmgc-leaderboard') {
        return <OverlayOverallRankingView key={asset.id} {...commonProps} />;
      }
      if (asset.id === 'pmgc-team-roster') {
        return <OverlayTeamRosterView key={asset.id} {...commonProps} />;
      }
    }
    if (asset.gameId === 'mlbb') {
      if (asset.id === 'mlbb-draf-n-pick') {
        return <OverlayMlbbDrafNPickView key={asset.id} {...commonProps} />;
      }
    }
    return null;
  };

  const realOverlay = renderRealOverlay();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative w-full max-w-6xl bg-zinc-950 border border-white/10 rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col animate-in zoom-in-95 duration-300">

        {/* Header Console */}
        <div className="h-16 bg-black border-b border-white/5 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#ccff00] animate-pulse shadow-[0_0_10px_#ccff00]" />
                <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] italic">{t('apm.previewStagingMode')}</h2>
             </div>
             <div className="h-4 w-px bg-white/10" />
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t('apm.assetLabel')}</span>
                <span className="text-[10px] font-black text-[#ccff00] uppercase tracking-widest">{asset.name}</span>
             </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded bg-[#ccff00]/5 border border-[#ccff00]/10 text-[#ccff00] text-[9px] font-black uppercase tracking-widest">
                <Signal size={10} /> {t('apm.uplinkReady')}
             </div>
             <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:bg-red-500/20 hover:border-red-500/40 transition-all"
             >
                <X size={20} />
             </button>
          </div>
        </div>

        {/* 16:9 Preview Window */}
        <div className="flex-1 bg-[#050505] p-6 md:p-12 flex items-center justify-center relative overflow-hidden group">
            {/* Contextual Backdrop (Simulated Game) */}
            <div className="absolute inset-0 z-0">
                <img src={getContextBg()} className="w-full h-full object-cover opacity-20 blur-sm grayscale" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
                {/* Scanline Effect */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,118,0.06))] bg-[length:100%_2px,3px_100%]" />
            </div>

            {/* Asset Render Area */}
            <div className="relative z-10 w-full aspect-video max-w-5xl rounded border border-white/5 bg-[#050505] shadow-2xl flex items-center justify-center overflow-hidden">
                {/* Checkerboard Background for Transparency Visualization */}
                <div className="absolute inset-0 opacity-40" style={{
                    backgroundImage: 'conic-gradient(#0a0a0a 90deg, #050505 90deg 180deg, #0a0a0a 180deg 270deg, #050505 270deg)',
                    backgroundSize: '24px 24px'
                }} />

                <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
                    <div className="px-2 py-0.5 bg-red-600 text-white text-[8px] font-black rounded-sm">{t('apm.previewBadge')}</div>
                    <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">REC: 00:00:12:00</span>
                </div>

                {/* RENDER OVERLAY ASLI (sama dengan output siaran) — atau fallback jujur */}
                {realOverlay ? (
                    <StageScaler>{realOverlay}</StageScaler>
                ) : (
                    <div className="relative z-10 text-center space-y-6 animate-in fade-in zoom-in duration-500 px-6">
                        <div className="relative inline-block">
                            <div className="w-32 h-32 rounded-[40px] bg-zinc-900 border border-white/5 flex items-center justify-center shadow-2xl">
                                <Monitor size={64} className="text-zinc-800" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Zap size={32} className="text-[#ccff00] animate-pulse" />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-4xl font-[1000] italic text-white uppercase tracking-tighter leading-none">{asset.name}</h3>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">{themeToUse.name} {t('apm.designSystem')}</p>
                            <p className="text-[10px] font-bold text-zinc-600 normal-case tracking-wide max-w-md mx-auto pt-2">
                                Preview realtime belum tersedia untuk asset ini.
                            </p>
                            <div className="flex items-center justify-center gap-4 mt-8">
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                    <Activity size={12} className="text-[#ccff00]" />
                                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{asset.type}</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                    <Target size={12} className="text-blue-500" />
                                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{asset.nodeStatus}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Decorative Viewfinder */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/10 z-20" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/10 z-20" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/10 z-20" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/10 z-20" />
            </div>
        </div>

        {/* Footer Info */}
        <div className="h-14 bg-black border-t border-white/5 flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-3">
                <Maximize2 size={14} className="text-zinc-700" />
                <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">{t('apm.resolution')}</span>
            </div>
            <p className="text-[8px] font-black text-zinc-800 uppercase tracking-[0.3em]">{t('apm.virtualDisplayUnit')}</p>
        </div>
      </div>
    </div>
  );
};

export default AssetPreviewModal;
