
import React, { useState } from 'react';
import { X, Trophy, Crosshair, Save, RotateCcw, BarChart3, Check } from 'lucide-react';

interface PlacementScoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (rules: number[], killPoints: number) => void;
  currentRules: number[];
  currentKillPoints: number;
}

const PRESETS = [
  { name: 'OFFICIAL 2024', rules: [10, 6, 5, 4, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0], killPts: 1 },
  { name: 'CLASSIC (OLD)', rules: [15, 12, 10, 8, 6, 4, 2, 1, 1, 1, 1, 0, 0, 0, 0, 0], killPts: 1 },
  { name: 'HIGH STAKES', rules: [25, 15, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], killPts: 2 },
];

const PlacementScoringModal: React.FC<PlacementScoringModalProps> = ({ 
  isOpen, onClose, onApply, currentRules, currentKillPoints 
}) => {
  const [rules, setRules] = useState<number[]>(currentRules.length > 0 ? currentRules : PRESETS[0].rules);
  const [killPoints, setKillPoints] = useState<number>(currentKillPoints);

  if (!isOpen) return null;

  const handleRuleChange = (index: number, value: string) => {
    const val = parseInt(value) || 0;
    const newRules = [...rules];
    newRules[index] = val;
    setRules(newRules);
  };

  const loadPreset = (preset: typeof PRESETS[0]) => {
    setRules([...preset.rules]);
    setKillPoints(preset.killPts);
  };

  // Helper to determine rank color
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-[#ccff00] border-[#ccff00]/50 bg-[#ccff00]/10'; // 1st
    if (rank === 2) return 'text-zinc-300 border-white/30 bg-white/5'; // 2nd
    if (rank === 3) return 'text-amber-600 border-amber-600/30 bg-amber-600/10'; // 3rd
    if (rank <= 8) return 'text-blue-400 border-blue-500/20 bg-blue-500/5'; // Top 8
    return 'text-zinc-600 border-zinc-800 bg-black/20'; // Bottom
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-in fade-in" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-[#0c0c0c] border border-white/10 rounded-[32px] overflow-hidden flex flex-col max-h-[85vh] shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in zoom-in-95">
        
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#111]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.1)]">
              <Trophy size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-[1000] italic text-white uppercase tracking-tighter leading-none mb-1">
                SCORING <span className="text-blue-500">MATRIX</span>
              </h2>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">
                PLACEMENT POINTS & ELIMINATION MULTIPLIER
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Sidebar: Presets & Global Settings */}
          <div className="w-full md:w-72 bg-[#0a0a0a] border-r border-white/5 p-6 flex flex-col gap-8 overflow-y-auto">
            
            {/* Kill Points Config */}
            <div className="space-y-3">
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Crosshair size={12} className="text-red-500" /> ELIMINATION POINTS
              </label>
              <div className="flex items-center bg-[#151515] border border-white/10 rounded-xl p-1 relative group focus-within:border-red-500/50 transition-colors">
                <input 
                  type="number" 
                  value={killPoints}
                  onChange={(e) => setKillPoints(Number(e.target.value))}
                  className="w-full bg-transparent text-center font-[1000] text-xl text-white outline-none py-2"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-zinc-700 uppercase">PTS / KILL</div>
              </div>
              <p className="text-[8px] text-zinc-600 leading-relaxed font-medium">
                Points awarded per confirmed kill. This value is multiplied by the total kills of the team.
              </p>
            </div>

            <div className="h-px w-full bg-white/5" />

            {/* Presets */}
            <div className="space-y-3">
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <BarChart3 size={12} /> QUICK PRESETS
              </label>
              <div className="space-y-2">
                {PRESETS.map((preset) => (
                  <button 
                    key={preset.name}
                    onClick={() => loadPreset(preset)}
                    className="w-full p-3 rounded-xl border border-white/5 bg-[#151515] hover:bg-[#202020] hover:border-white/10 transition-all text-left group relative overflow-hidden"
                  >
                    <span className="text-[9px] font-black text-white uppercase tracking-wider relative z-10">{preset.name}</span>
                    <div className="flex gap-0.5 mt-1 relative z-10 opacity-50">
                        {preset.rules.slice(0, 5).map((p, i) => (
                            <div key={i} className="text-[8px] font-mono text-zinc-400">#{i+1}:{p}</div>
                        ))}
                    </div>
                    {/* Visual selection indicator */}
                    {JSON.stringify(preset.rules) === JSON.stringify(rules) && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ccff00] z-10">
                            <Check size={16} strokeWidth={3} />
                        </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Area: Placement Grid */}
          <div className="flex-1 bg-[#111] p-6 md:p-8 overflow-y-auto custom-scrollbar">
             <div className="flex justify-between items-end mb-6">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">RANKING DISTRIBUTION</h3>
                <button 
                    onClick={() => setRules(Array(16).fill(0))}
                    className="text-[8px] font-bold text-zinc-600 hover:text-white flex items-center gap-1 uppercase tracking-widest transition-colors"
                >
                    <RotateCcw size={10} /> RESET ALL
                </button>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {rules.map((points, index) => {
                    const rank = index + 1;
                    const style = getRankColor(rank);
                    const maxPoints = Math.max(...rules);
                    const barHeight = maxPoints > 0 ? (points / maxPoints) * 100 : 0;

                    return (
                        <div key={index} className={`relative p-4 rounded-2xl border bg-black/40 flex flex-col items-center gap-2 group transition-all ${style}`}>
                            <span className="text-[10px] font-black tracking-widest uppercase opacity-70">RANK #{rank}</span>
                            <input 
                                type="number"
                                value={points}
                                onChange={(e) => handleRuleChange(index, e.target.value)}
                                className="w-full bg-transparent text-center font-[1000] text-3xl outline-none py-1 z-10 relative"
                                style={{ color: 'inherit' }}
                            />
                            
                            {/* Visual Bar Background */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-current opacity-20" />
                            <div 
                                className="absolute bottom-0 left-0 right-0 bg-current opacity-10 transition-all duration-500 rounded-b-xl"
                                style={{ height: `${barHeight}%` }}
                            />
                        </div>
                    );
                })}
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-[#0a0a0a] flex justify-end gap-4 shrink-0">
            <button 
                onClick={onClose}
                className="px-8 py-4 rounded-2xl border border-white/10 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-white hover:bg-white/5 transition-all"
            >
                CANCEL
            </button>
            <button 
                onClick={() => onApply(rules, killPoints)}
                className="px-8 py-4 rounded-2xl bg-blue-600 text-white shadow-[0_0_30px_rgba(37,99,235,0.4)] text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 hover:scale-105 transition-all flex items-center gap-2"
            >
                <Save size={14} /> UPDATE CONFIGURATION
            </button>
        </div>
      </div>
    </div>
  );
};

export default PlacementScoringModal;
