
import React, { useState, useEffect } from 'react';
import { X, ArrowUp, ArrowDown, RotateCcw, ShieldCheck, Settings2, Info, Target } from 'lucide-react';
import type { MatchKillRules } from '@/lib/leaderboardKillLogic';
import { DEFAULT_MATCH_KILL_RULES } from '@/lib/leaderboardKillLogic';

export type TieBreakerCriteria = 
  | 'TOTAL_POINTS' 
  | 'TOTAL_WWCD' 
  | 'TOTAL_PLACEMENT' 
  | 'ALIVE_PLAYERS' 
  | 'MATCH_KILLS' 
  | 'SLOT_RANK';

export interface TieBreakerConfig {
  order: TieBreakerCriteria[];
  matchKillRules: MatchKillRules;
}

interface TieBreakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (config: TieBreakerConfig) => void;
  currentOrder: TieBreakerCriteria[];
  currentMatchKillRules: MatchKillRules;
  currentMatch?: number;
}

const CRITERIA_LABELS: Record<TieBreakerCriteria, { label: string; desc: string }> = {
  TOTAL_POINTS: { label: 'TOTAL POINTS', desc: 'Akumulasi poin turnamen + kill match berjalan.' },
  TOTAL_WWCD: { label: 'TOTAL WWCD', desc: 'Jumlah total kemenangan (Juara 1) match sebelumnya.' },
  TOTAL_PLACEMENT: { label: 'PLACEMENT POINTS', desc: 'Akumulasi poin peringkat saja (tanpa kill).' },
  ALIVE_PLAYERS: { label: 'ALIVE PLAYERS', desc: 'Jumlah pemain yang masih hidup di match berjalan.' },
  MATCH_KILLS: { label: 'MATCH KILLS', desc: 'Jumlah kill khusus pada match yang sedang berlangsung.' },
  SLOT_RANK: { label: 'SLOT RANK', desc: 'Urutan slot tim asli (Fallback terakhir).' },
};

const DEFAULT_ORDER: TieBreakerCriteria[] = [
  'TOTAL_POINTS',
  'TOTAL_WWCD',
  'TOTAL_PLACEMENT',
  'ALIVE_PLAYERS',
  'MATCH_KILLS',
  'SLOT_RANK'
];

const TieBreakerModal: React.FC<TieBreakerModalProps> = ({
  isOpen,
  onClose,
  onApply,
  currentOrder,
  currentMatchKillRules,
  currentMatch = 1,
}) => {
  const [order, setOrder] = useState<TieBreakerCriteria[]>(currentOrder);
  const [matchKillRules, setMatchKillRules] = useState<MatchKillRules>(currentMatchKillRules);
  const [isCustom, setIsCustom] = useState(JSON.stringify(currentOrder) !== JSON.stringify(DEFAULT_ORDER));

  useEffect(() => {
    if (isOpen) {
      setOrder(currentOrder);
      setMatchKillRules(currentMatchKillRules);
      setIsCustom(JSON.stringify(currentOrder) !== JSON.stringify(DEFAULT_ORDER));
    }
  }, [isOpen, currentOrder, currentMatchKillRules]);

  if (!isOpen) return null;

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (!isCustom) return;
    const newOrder = [...order];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setOrder(newOrder);
  };

  const handleToggleMode = (mode: 'DEFAULT' | 'CUSTOM') => {
    if (mode === 'DEFAULT') {
      setOrder(DEFAULT_ORDER);
      setIsCustom(false);
    } else {
      setIsCustom(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-in fade-in" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-[#0c0c0c] border border-white/10 rounded-[40px] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 max-h-[90vh]">
        
        <div className="p-8 border-b border-white/5 bg-[#111] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#ccff00]/10 border border-[#ccff00]/20 flex items-center justify-center text-[#ccff00]">
              <Settings2 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-[1000] italic text-white uppercase tracking-tighter leading-none mb-1">
                TIE-BREAKER <span className="text-[#ccff00]">LOGIC</span>
              </h2>
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">MATCH {currentMatch} CONFIGURATION</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        {/* Match kill rules */}
        <div className="p-6 bg-[#0a0a0a] border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Target size={14} className="text-[#ccff00]" />
            <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Match Rules — Revive & Kill</h3>
          </div>
          <div className="flex bg-zinc-900 p-1 rounded-2xl border border-white/5">
            <button
              type="button"
              onClick={() => setMatchKillRules({ finisherKeepsKillOnRevive: false })}
              className={`flex-1 py-3 px-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all ${
                !matchKillRules.finisherKeepsKillOnRevive
                  ? 'bg-orange-600 text-white shadow-lg'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              ON — Kill berkurang
            </button>
            <button
              type="button"
              onClick={() => setMatchKillRules({ finisherKeepsKillOnRevive: true })}
              className={`flex-1 py-3 px-2 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all ${
                matchKillRules.finisherKeepsKillOnRevive
                  ? 'bg-[#ccff00] text-black shadow-lg'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              OFF — Kill tetap
            </button>
          </div>
          <p className="text-[8px] font-medium text-zinc-600 uppercase tracking-wide mt-3 leading-relaxed">
            {!matchKillRules.finisherKeepsKillOnRevive
              ? 'ON: Revive dari Dead (K) — kill finisher −1. Mode uji / salah klik.'
              : 'OFF: Revive dari Dead (K) — finisher tetap dapat kill. Mode PUBG / Recall.'}
          </p>
        </div>

        <div className="p-6 bg-black/40 border-b border-white/5 shrink-0">
          <div className="flex bg-zinc-900 p-1 rounded-2xl border border-white/5">
            <button 
              onClick={() => handleToggleMode('DEFAULT')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${!isCustom ? 'bg-[#ccff00] text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
            >
              <ShieldCheck size={14} /> OFFICIAL DEFAULT
            </button>
            <button 
              onClick={() => handleToggleMode('CUSTOM')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${isCustom ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
            >
              <RotateCcw size={14} /> CUSTOM OVERRIDE
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-2 custom-scrollbar min-h-0">
          {order.map((criteria, idx) => (
            <div 
              key={criteria}
              className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                !isCustom ? 'opacity-60 bg-zinc-900/50 border-white/5' : 'bg-[#151515] border-white/10 hover:border-blue-500/40 group'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-[#ccff00] text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                {idx + 1}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className={`text-[11px] font-black uppercase tracking-widest ${idx === 0 ? 'text-white' : 'text-zinc-400'}`}>
                  {CRITERIA_LABELS[criteria].label}
                </h4>
                <p className="text-[8px] font-medium text-zinc-600 uppercase tracking-tighter truncate">
                  {CRITERIA_LABELS[criteria].desc}
                </p>
              </div>

              {isCustom && (
                <div className="flex items-center gap-1">
                  <button 
                    disabled={idx === 0}
                    onClick={() => moveItem(idx, 'up')}
                    className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-zinc-500 hover:text-blue-400 disabled:opacity-20"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button 
                    disabled={idx === order.length - 1}
                    onClick={() => moveItem(idx, 'down')}
                    className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-zinc-500 hover:text-blue-400 disabled:opacity-20"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-8 bg-[#111] border-t border-white/5 flex flex-col gap-4 shrink-0">
          <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[9px] font-medium text-blue-400/70 uppercase leading-relaxed tracking-wide">
              {isCustom 
                ? "Mode Custom aktif. Anda dapat menarik urutan untuk menentukan prioritas saat terjadi poin yang sama." 
                : "Mode Default mengikuti standar kompetisi internasional (PMPL/PMGC)."}
            </p>
          </div>
          <div className="flex gap-4">
            <button onClick={onClose} className="flex-1 py-4 rounded-2xl bg-zinc-900 border border-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-white">CANCEL</button>
            <button 
              onClick={() => onApply({ order, matchKillRules })}
              className="flex-1 py-4 rounded-2xl bg-[#ccff00] text-black font-black text-[10px] uppercase tracking-widest shadow-[0_0_30px_rgba(204,255,0,0.3)] hover:scale-[1.02] transition-all"
            >
              APPLY LOGIC
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TieBreakerModal;
export { DEFAULT_ORDER, DEFAULT_MATCH_KILL_RULES };
