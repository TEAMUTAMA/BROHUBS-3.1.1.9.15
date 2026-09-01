import React, { useMemo, useState, useEffect } from 'react';
import { X, Crosshair, Users, Search, Skull } from 'lucide-react';
import type { PlayerRef } from '@/features/games/pubg-mobile/logic/leaderboardKillLogic';
import { getPlayerStatus } from '@/features/games/pubg-mobile/logic/leaderboardKillLogic';
import { useT } from '@/i18n/LanguageContext';

interface TeamRow {
  team: string;
  teamAbbreviation?: string;
  playerNames: string[];
  status: number[];
}

interface ElimCauseModalProps {
  isOpen: boolean;
  victim: PlayerRef | null;
  teams: TeamRow[];
  onClose: () => void;
  /** null = Self / Zone / bleed · PlayerRef = finisher musuh (+1 kill) */
  onSelectElim: (finisher: PlayerRef | null) => void;
}

const ElimCauseModal: React.FC<ElimCauseModalProps> = ({
  isOpen,
  victim,
  teams,
  onClose,
  onSelectElim,
}) => {
  const t = useT();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) setSearch('');
  }, [isOpen, victim?.teamIndex, victim?.playerIndex]);

  const victimInfo = useMemo(() => {
    if (!victim) return null;
    const team = teams[victim.teamIndex];
    if (!team) return null;
    const status = getPlayerStatus(team as { status: number[] }, victim.playerIndex);
    const statusLabel = status === 2 ? 'KNOCK' : status === 1 ? 'ALIVE' : 'DEAD';
    return {
      name: team.playerNames[victim.playerIndex] || `P${victim.playerIndex + 1}`,
      tag: team.teamAbbreviation?.trim() || team.team,
      statusLabel,
    };
  }, [victim, teams]);

  const finisherOptions = useMemo(() => {
    if (!victim) return [];
    const options: Array<
      PlayerRef & { label: string; teamTag: string; sameTeam: boolean; statusLabel: string }
    > = [];
    teams.forEach((team, teamIndex) => {
      team.playerNames.forEach((playerName, playerIndex) => {
        if (teamIndex === victim.teamIndex && playerIndex === victim.playerIndex) return;
        const status = getPlayerStatus(team as { status: number[] }, playerIndex);
        if (status === 0) return;
        const sameTeam = teamIndex === victim.teamIndex;
        options.push({
          teamIndex,
          playerIndex,
          label: playerName || `P${playerIndex + 1}`,
          teamTag: team.teamAbbreviation?.trim() || team.team,
          sameTeam,
          statusLabel: status === 2 ? 'KNOCK' : 'ALIVE',
        });
      });
    });
    return options;
  }, [victim, teams]);

  const filteredFinisherOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return finisherOptions;
    return finisherOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.teamTag.toLowerCase().includes(q) ||
        `p${opt.playerIndex + 1}`.includes(q)
    );
  }, [finisherOptions, search]);

  if (!isOpen || !victim || !victimInfo) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#0c0c0c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95">
        <div className="p-5 border-b border-white/5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">{t('pmod.elimTitle')}</p>
            <h3 className="text-lg font-[1000] text-white uppercase tracking-tight leading-tight">
              {victimInfo.name}
            </h3>
            <p className="text-[10px] font-black text-[#ccff00] uppercase mt-0.5">
              {victimInfo.tag} · {victimInfo.statusLabel}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide leading-relaxed">
            {t('pmod.elimQuestion')}
          </p>

          <button
            type="button"
            onClick={() => onSelectElim(null)}
            className="w-full p-4 rounded-2xl border border-white/10 bg-[#151515] hover:border-zinc-500/50 text-left transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white">
                <Skull size={18} />
              </div>
              <div>
                <p className="text-[11px] font-black text-white uppercase">{t('pmod.selfFallZone')}</p>
                <p className="text-[8px] font-medium text-zinc-500 uppercase mt-0.5">
                  {t('pmod.selfFallZoneHint')}
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
              placeholder={t('pmod.searchFinisherPlaceholder')}
              className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-[10px] font-bold text-white uppercase outline-none focus:border-[#ccff00]/40 placeholder:text-zinc-600"
            />
          </div>

          <div className="max-h-[220px] overflow-y-auto space-y-1.5 custom-scrollbar">
            {filteredFinisherOptions.map((opt) => (
              <button
                key={`${opt.teamIndex}-${opt.playerIndex}`}
                type="button"
                onClick={() =>
                  onSelectElim({ teamIndex: opt.teamIndex, playerIndex: opt.playerIndex })
                }
                className="w-full flex items-center justify-between gap-2 p-3 rounded-xl border border-white/5 bg-black/40 hover:border-[#ccff00]/40 hover:bg-[#ccff00]/5 transition-all text-left"
              >
                <span className="text-[10px] font-black text-white uppercase truncate flex items-center gap-2">
                  <Crosshair size={12} className="text-[#ccff00] shrink-0" />
                  {opt.label}
                  {opt.sameTeam && (
                    <span className="text-[7px] text-zinc-500 normal-case">→ knocker</span>
                  )}
                </span>
                <span className="text-[9px] font-black text-[#ccff00] uppercase shrink-0">
                  {opt.teamTag}
                </span>
              </button>
            ))}
          </div>

          {filteredFinisherOptions.length === 0 && (
            <p className="text-[9px] text-zinc-600 uppercase text-center py-2">
              {finisherOptions.length === 0 ? t('pmod.noOtherTeams') : t('pmod.notFound')}
            </p>
          )}
        </div>

        <div className="px-5 pb-5 flex items-center gap-2 text-[8px] font-medium text-zinc-600 uppercase">
          <Users size={10} />
          <span>{t('pmod.elimFooter')}</span>
        </div>
      </div>
    </div>
  );
};

export default ElimCauseModal;
