
import React, { useState } from 'react';
import { 
  LayoutTemplate, 
  Lock, 
  Trash2, 
  Edit3,
  Settings2,
  Unlock,
  ChevronRight,
  Eye,
  Plus
} from 'lucide-react';
import { Asset, AccessTier } from '../types';

interface AssetCardProps {
  asset: Asset;
  onSelect: (asset: Asset) => void;
  onPreview?: (asset: Asset) => void;
  userRole?: 'admin' | 'member';
  memberTier?: string;
  onToggleRelease?: (id: string) => void;
  onSetTier?: (id: string, tier: AccessTier) => void;
  onPricingOpen?: () => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ 
  asset, 
  onSelect, 
  onPreview,
  userRole = 'member', 
  memberTier = 'BASIC',
  onToggleRelease,
  onSetTier,
  onPricingOpen,
}) => {
  const [isAdminToolOpen, setIsAdminToolOpen] = useState(false);
  // ... (rest of the component)
  // Inside the card, I'll add the UI for OnAir and Slot Selection

  const hasAccess = () => {
    if (userRole === 'admin') return true;
    const levels = { 'BASIC': 0, 'PREMIUM': 1, 'ULTIMATE': 2 };
    const aTier = asset.tier || 'BASIC';
    return levels[memberTier as keyof typeof levels] >= levels[aTier as keyof typeof levels];
  };

  const isLocked = !hasAccess();

  const handleCardClick = (e: React.MouseEvent) => {
    if (isAdminToolOpen) return;
    if (userRole === 'member' && isLocked) {
      onPricingOpen?.();
      return;
    }
    onSelect(asset);
  };

  const currentTier = asset.tier || 'BASIC';

  const getTierColor = (tier: string) => {
    switch(tier) {
      case 'ULTIMATE': return 'text-[#ccff00] border-[#ccff00]/30 bg-[#ccff00]/10 shadow-[0_0_15px_rgba(204,255,0,0.1)]';
      case 'PREMIUM': return 'text-blue-400 border-blue-500/30 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]';
      default: return 'text-zinc-500 border-white/10 bg-white/5';
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`group relative bg-zinc-950 border rounded-[24px] p-6 transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col min-h-[400px]
        ${isLocked && userRole === 'member' ? 'grayscale blur-[1px] border-white/5' : 'border-white/10 hover:border-[#ccff00]/40 cursor-pointer hover:scale-[1.01]'}
      `}
    >
        {/* MEMBER LOCKED OVERLAY */}
        {isLocked && userRole === 'member' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/20">
             <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4 shadow-2xl">
                <Lock size={32} />
             </div>
             <span className="text-[10px] font-black text-red-500 tracking-[0.3em] uppercase">UPGRADE TO UNLOCK</span>
          </div>
        )}

        {/* Card Header Actions */}
        <div className="flex items-start justify-between mb-6 relative z-30">
            <div className="w-10 h-10 rounded-xl border border-[#ccff00]/20 bg-[#ccff00]/5 flex items-center justify-center text-[#ccff00] group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(204,255,0,0.05)]">
                <LayoutTemplate size={18} />
            </div>

            <div className="flex items-center gap-2">
                {userRole === 'admin' ? (
                  <div className="relative flex items-center justify-end h-8 gap-2">
                    <div className={`px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase border transition-all ${getTierColor(currentTier)}`}>
                        {currentTier}
                    </div>

                    <div className="flex items-center relative">
                        <div className="w-[1px] h-4 bg-white/10 mr-2" />
                        <button 
                          onClick={(e) => { e.stopPropagation(); setIsAdminToolOpen(!isAdminToolOpen); }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isAdminToolOpen ? 'bg-[#ccff00] text-black shadow-[0_0_15px_#ccff00]' : 'bg-white/5 text-zinc-500 hover:text-white border border-white/5'}`}
                        >
                          <Settings2 size={14} />
                        </button>

                        {isAdminToolOpen && (
                          <div className="absolute top-0 right-10 h-8 bg-zinc-900 border border-white/10 rounded-full px-4 flex items-center gap-3 animate-in slide-in-from-right-4 duration-300 shadow-2xl whitespace-nowrap">
                             <div className="flex items-center gap-1">
                                {(['BASIC', 'PREMIUM', 'ULTIMATE'] as const).map(t => (
                                    <button 
                                        key={t}
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            onSetTier?.(asset.id, t);
                                        }}
                                        className={`
                                            w-6 h-6 rounded-full text-[9px] font-black transition-all flex items-center justify-center
                                            ${currentTier === t 
                                                ? (t === 'ULTIMATE' ? 'bg-[#ccff00] text-black' : t === 'PREMIUM' ? 'bg-blue-500 text-white' : 'bg-white text-black')
                                                : 'text-zinc-600 hover:text-white'
                                            }
                                        `}
                                    >
                                        {t[0]}
                                    </button>
                                ))}
                             </div>
                             <div className="w-px h-3 bg-white/10" />
                             <button 
                                onClick={(e) => { e.stopPropagation(); onToggleRelease?.(asset.id); }}
                                className={`flex items-center gap-1.5 text-[8px] font-black uppercase transition-colors ${asset.isReleased ? 'text-[#ccff00]' : 'text-red-500'}`}
                             >
                                {asset.isReleased ? <Unlock size={10} /> : <Lock size={10} fill="currentColor" />}
                                {asset.isReleased ? 'LIVE' : 'HIDDEN'}
                             </button>
                             <div className="w-px h-3 bg-white/10" />
                             <button 
                                onClick={(e) => { e.stopPropagation(); }} 
                                className="text-zinc-500 hover:text-red-500 transition-colors"
                             >
                                <Trash2 size={12} />
                             </button>
                          </div>
                        )}
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onPricingOpen?.(); }}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black tracking-widest uppercase border transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ${getTierColor(currentTier)}`}
                  >
                    {currentTier}
                    {isLocked && <Lock size={8} className="opacity-60" />}
                  </button>
                )}
            </div>
        </div>

        {/* Content Area */}
        <div className="relative z-10 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-lg font-bold text-white group-hover:text-[#ccff00] transition-colors">{asset.name}</h3>
            {userRole === 'admin' && !asset.isReleased && (
              <span className="bg-red-500/20 border border-red-500/30 text-red-500 text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">HIDDEN</span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 rounded bg-white/5 border border-white/5 text-[8px] font-black tracking-widest text-zinc-400 uppercase">{asset.type}</span>
              <span className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-[8px] font-black tracking-widest text-blue-400 uppercase">{asset.gameId}</span>
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed mb-6 flex-1">{asset.description}</p>

          <div className="mt-auto flex flex-col gap-2 mb-6">
            {userRole === 'admin' ? (
                <button 
                onClick={(e) => { e.stopPropagation(); onSelect(asset); }}
                className="w-full py-3 rounded-xl border border-white/10 bg-white/5 text-[10px] font-black tracking-[0.2em] text-zinc-300 uppercase hover:bg-[#ccff00] hover:text-black hover:border-[#ccff00] transition-all flex items-center justify-center gap-2 group/btn shadow-inner"
                >
                    <Edit3 size={12} className="group-hover/btn:scale-110 transition-transform" />
                    CUSTOMIZE DEFAULT
                </button>
            ) : (
                <>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onPreview?.(asset); }}
                        className="w-full py-3 rounded-xl border border-white/10 bg-black text-[9px] font-black tracking-[0.2em] text-white uppercase hover:bg-zinc-900 transition-all flex items-center justify-center gap-2"
                    >
                        <Eye size={14} /> PREVIEW ASSET
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); if(!isLocked) onSelect(asset); else onPricingOpen?.(); }}
                        className={`w-full py-3 rounded-xl border font-black text-[9px] tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 shadow-inner
                        ${isLocked 
                            ? 'bg-zinc-900 border-white/5 text-zinc-600' 
                            : 'bg-[#ccff00] border-[#ccff00] text-black hover:scale-[1.02] shadow-[0_0_20px_rgba(204,255,0,0.2)]'
                        }
                        `}
                    >
                        {isLocked ? <Lock size={12} /> : <Plus size={14} strokeWidth={3} />}
                        {isLocked ? 'UPGRADE TO ADD' : 'ADD ASSET TO PROJECT'}
                    </button>
                </>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[9px] font-black tracking-[0.2em] uppercase">
                <span className="text-zinc-600">{asset.category}</span>
                <span className="text-[#ccff00]">{asset.nodeStatus}</span>
            </div>
        </div>
    </div>
  );
};
