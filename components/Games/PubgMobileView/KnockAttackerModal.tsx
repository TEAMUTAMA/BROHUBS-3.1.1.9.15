import React, { useMemo, useState, useEffect } from 'react';
import { X, Crosshair, Users, Search, Zap } from 'lucide-react';
import type { PlayerRef } from '@/lib/leaderboardKillLogic';
import { getPlayerStatus } from '@/lib/leaderboardKillLogic';

interface TeamRow {
  team: string;
  teamAbbreviation?: string;
  playerNames: string[];
  status: number[];
}

interface KnockAttackerModalProps {
  isOpen: boolean;
  victim: PlayerRef | null;
  teams: TeamRow[];
  onClose: () => void;
  onSelectKnocker: (knocker: PlayerRef | null) => void;
}

const KnockAttackerModal: React.FC<KnockAttackerModalProps> = ({
  isOpen,
  victim,
  teams,
  onClose,
  onSelectKnocker,
}) => {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) setSearch('');
  }, [isOpen, victim?.teamIndex, victim?.playerIndex]);

  const victimInfo = useMemo(() => {
    if (!victim) return null;
    const team = teams[victim.teamIndex];
    if (!team) return null;
    return {
      name: team.playerNames[victim.playerIndex] || `P${victim.playerIndex + 1}`,
      tag: team.teamAbbreviation?.trim() || team.team,
    };
  }, [victim, teams]);

  const knockerOptions = useMemo(() => {
    if (!victim) return [];
    const options: Array<PlayerRef & { label: string; teamTag: string }> = [];
    teams.forEach((team, teamIndex) => {
      team.playerNames.forEach((playerName, playerIndex) => {
        if (teamIndex === victim.teamIndex && playerIndex === victim.playerIndex) return;
        const status = getPlayerStatus(team as { status: number[] }, playerIndex);
        if (status !== 1) return;
        options.push({
          teamIndex,
          playerIndex,
          label: playerName || `P${playerIndex + 1}`,
          teamTag: team.teamAbbreviation?.trim() || team.team,
        });
      });
    });
    return options;
  }, [victim, teams]);

  const filteredKnockerOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return knockerOptions;
    return knockerOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.teamTag.toLowerCase().includes(q) ||
        `p${opt.playerIndex + 1}`.includes(q)
    );
  }, [knockerOptions, search]);

  if (!isOpen || !victim || !victimInfo) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#0c0c0c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95">
        <div className="p-5 border-b border-white/5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Knock</p>
            <h3 className="text-lg font-[1000] text-white uppercase tracking-tight leading-tight">
              {victimInfo.name}
            </h3>
            <p className="text-[10px] font-black text-[#ccff00] uppercase mt-0.5">{victimInfo.tag}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide leading-relaxed">
            Siapa yang knock pemain ini?
          </p>

          <button
            type="button"
            onClick={() => onSelectKnocker(null)}
            className="w-full p-4 rounded-2xl border border-white/10 bg-[#151515] hover:border-zinc-500/50 text-left transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white">
                <Zap size={18} />
              </div>
              <div>
                <p className="text-[11px] font-black text-white uppercase">Self / Jatuh / Zone</p>
                <p className="text-[8px] font-medium text-zinc-500 uppercase mt-0.5">
                  Tanpa credit knock · bleed/zone tidak dapat kill
                </p>
              </div>
            </div>
          </button>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari pemain / tag tim..."
              className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-[10px] font-bold text-white uppercase outline-none focus:border-[#ccff00]/40 placeholder:text-zinc-600"
            />
          </div>

          <div className="max-h-[220px] overflow-y-auto space-y-1.5 custom-scrollbar">
            {filteredKnockerOptions.map((opt) => (
              <button
                key={`${opt.teamIndex}-${opt.playerIndex}`}
                type="button"
                onClick={() =>
                  onSelectKnocker({ teamIndex: opt.teamIndex, playerIndex: opt.playerIndex })
                }
                className="w-full flex items-center justify-between gap-2 p-3 rounded-xl border border-white/5 bg-black/40 hover:border-[#ccff00]/40 hover:bg-[#ccff00]/5 transition-all text-left"
              >
                <span className="text-[10px] font-black text-white uppercase truncate flex items-center gap-2">
                  <Crosshair size={12} className="text-[#ccff00] shrink-0" />
                  {opt.label}
                </span>
                <span className="text-[9px] font-black text-[#ccff00] uppercase shrink-0">
                  {opt.teamTag}
                </span>
              </button>
            ))}
          </div>

          {filteredKnockerOptions.length === 0 && (
            <p className="text-[9px] text-zinc-600 uppercase text-center py-2">
              {knockerOptions.length === 0
                ? 'Tidak ada pemain Alive untuk dijadikan knocker.'
                : 'Tidak ditemukan.'}
            </p>
          )}
        </div>

        <div className="px-5 pb-5 flex items-center gap-2 text-[8px] font-medium text-zinc-600 uppercase">
          <Users size={10} />
          <span>Knock credit dipakai saat bleed / zone / finish tim sendiri</span>
        </div>
      </div>
    </div>
  );
};

export default KnockAttackerModal;
