import React, { useMemo, useState, useEffect } from 'react';
import { X, Crosshair, Users, Search } from 'lucide-react';
import type { PlayerRef } from '@/lib/leaderboardKillLogic';
import { getPlayerStatus } from '@/lib/leaderboardKillLogic';

interface TeamRow {
  team: string;
  teamAbbreviation?: string;
  playerNames: string[];
  status: number[];
}

interface KillVictimModalProps {
  isOpen: boolean;
  finisher: PlayerRef | null;
  teams: TeamRow[];
  onClose: () => void;
  onSelectVictim: (victim: PlayerRef) => void;
}

const KillVictimModal: React.FC<KillVictimModalProps> = ({
  isOpen,
  finisher,
  teams,
  onClose,
  onSelectVictim,
}) => {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) setSearch('');
  }, [isOpen, finisher?.teamIndex, finisher?.playerIndex]);

  const finisherInfo = useMemo(() => {
    if (!finisher) return null;
    const team = teams[finisher.teamIndex];
    if (!team) return null;
    return {
      name: team.playerNames[finisher.playerIndex] || `P${finisher.playerIndex + 1}`,
      tag: team.teamAbbreviation?.trim() || team.team,
    };
  }, [finisher, teams]);

  const victimOptions = useMemo(() => {
    if (!finisher) return [];
    const options: Array<PlayerRef & { label: string; teamTag: string; statusLabel: string; sameTeam: boolean }> = [];
    teams.forEach((team, teamIndex) => {
      team.playerNames.forEach((playerName, playerIndex) => {
        if (teamIndex === finisher.teamIndex && playerIndex === finisher.playerIndex) return;
        const status = getPlayerStatus(team as { status: number[] }, playerIndex);
        if (status === 0) return;
        const sameTeam = teamIndex === finisher.teamIndex;
        options.push({
          teamIndex,
          playerIndex,
          label: playerName || `P${playerIndex + 1}`,
          teamTag: team.teamAbbreviation?.trim() || team.team,
          statusLabel: status === 2 ? 'KNOCK' : 'ALIVE',
          sameTeam,
        });
      });
    });
    return options;
  }, [finisher, teams]);

  const filteredVictimOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return victimOptions;
    return victimOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.teamTag.toLowerCase().includes(q) ||
        opt.statusLabel.toLowerCase().includes(q) ||
        `p${opt.playerIndex + 1}`.includes(q)
    );
  }, [victimOptions, search]);

  if (!isOpen || !finisher || !finisherInfo) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#0c0c0c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95">
        <div className="p-5 border-b border-white/5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">+ Kill</p>
            <h3 className="text-lg font-[1000] text-white uppercase tracking-tight leading-tight">
              {finisherInfo.name}
            </h3>
            <p className="text-[10px] font-black text-[#ccff00] uppercase mt-0.5">{finisherInfo.tag}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Crosshair size={12} className="text-[#ccff00]" />
            Siapa yang dimatikan pemain ini?
          </p>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari pemain / tag tim..."
              className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-[10px] font-bold text-white uppercase outline-none focus:border-[#ccff00]/40 placeholder:text-zinc-600"
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto space-y-1.5 custom-scrollbar">
            {filteredVictimOptions.map((opt) => (
              <button
                key={`${opt.teamIndex}-${opt.playerIndex}`}
                type="button"
                onClick={() => onSelectVictim({ teamIndex: opt.teamIndex, playerIndex: opt.playerIndex })}
                className="w-full flex items-center justify-between gap-2 p-3 rounded-xl border border-white/5 bg-black/40 hover:border-[#ccff00]/40 hover:bg-[#ccff00]/5 transition-all text-left"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-black text-white uppercase truncate block">
                    {opt.label}
                    {opt.sameTeam && (
                      <span className="text-[7px] text-zinc-500 normal-case ml-1">→ knocker</span>
                    )}
                  </span>
                  <span className="text-[8px] font-bold text-zinc-500 uppercase">{opt.statusLabel}</span>
                </div>
                <span className="text-[9px] font-black text-[#ccff00] uppercase shrink-0">{opt.teamTag}</span>
              </button>
            ))}
          </div>
          {filteredVictimOptions.length === 0 && (
            <p className="text-[9px] text-zinc-600 uppercase text-center py-4">
              {victimOptions.length === 0
                ? 'Tidak ada korban hidup/knock.'
                : 'Tidak ditemukan.'}
            </p>
          )}
        </div>

        <div className="px-5 pb-5 flex items-center gap-2 text-[8px] font-medium text-zinc-600 uppercase">
          <Users size={10} />
          <span>Finish musuh = +1 kill · finish tim sendiri = credit ke knocker</span>
        </div>
      </div>
    </div>
  );
};

export default KillVictimModal;
