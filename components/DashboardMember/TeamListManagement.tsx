import React from 'react';
import { X, Shield, Users, Trash2, LayoutGrid, Info, ImageIcon, Edit3 } from 'lucide-react';
import { PlayerData } from '../../types';

interface TeamListManagementProps {
  players: PlayerData[];
  onUpdatePlayers: (players: PlayerData[]) => void;
  onEditTeam: (teamName: string) => void; 
  onArchiveTeam?: (teamName: string) => void; // New callback for archiving
  onClose: () => void;
}

const TeamListManagement: React.FC<TeamListManagementProps> = ({ players, onUpdatePlayers, onEditTeam, onArchiveTeam, onClose }) => {
  // Group players by team
  const teams = players.reduce((acc, player) => {
    if (!acc[player.team]) {
      acc[player.team] = {
        name: player.team,
        logo: player.teamLogo || '',
        players: []
      };
    }
    acc[player.team].players.push(player);
    return acc;
  }, {} as Record<string, { name: string; logo: string; players: PlayerData[] }>);

  const teamList = Object.values(teams) as { name: string; logo: string; players: PlayerData[] }[];

  const handleDeleteTeam = (teamName: string) => {
    if (onArchiveTeam) {
        onArchiveTeam(teamName);
    } else {
        if (window.confirm(`HAPUS SELURUH DATA TEAM: ${teamName.toUpperCase()}?`)) {
            onUpdatePlayers(players.filter(p => p.team !== teamName));
        }
    }
  };

  const handleDeletePlayer = (playerId: string) => {
    onUpdatePlayers(players.filter(p => p.id !== playerId));
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-in fade-in" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl bg-[#0a0a0a] border border-white/5 rounded-3xl md:rounded-[48px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="p-6 md:p-10 pb-4 md:pb-6 flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-xl md:text-4xl font-[1000] italic text-white uppercase tracking-tighter leading-none mb-2">
              TEAM <span className="text-blue-500">DATABASE</span>
            </h2>
            <p className="text-[7px] md:text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">STORED PERSONNEL ARCHIVE</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-all hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 pt-0 custom-scrollbar space-y-6 md:space-y-10">
          
          {teamList.length === 0 ? (
            <div className="py-20 flex flex-col items-center text-center opacity-40">
                <Shield size={64} className="text-zinc-800 mb-4" />
                <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600">NO TEAM DATA FOUND IN THIS NODE</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8">
              {teamList.map((team, tIdx) => (
                <div key={tIdx} className="bg-zinc-900/40 border border-white/5 rounded-[32px] overflow-hidden group hover:border-blue-500/20 transition-all">
                  {/* Team Sub-Header */}
                  <div className="p-4 md:p-6 bg-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-black border border-white/10 flex items-center justify-center overflow-hidden shadow-inner">
                            {team.logo ? (
                                <img src={team.logo} className="w-full h-full object-contain p-1" alt="Logo" />
                            ) : (
                                <Shield size={20} className="text-zinc-800" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg md:text-2xl font-[1000] italic text-white uppercase tracking-tight leading-none">{team.name}</h3>
                            <p className="text-[8px] md:text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1">{team.players.length} PERSONNEL DEPLOYED</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button 
                            onClick={() => onEditTeam(team.name)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[8px] md:text-[9px] font-[1000] uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                        >
                            <Edit3 size={12} strokeWidth={3} /> UPDATE <span className="md:hidden">DATA</span>
                        </button>
                        <button 
                            onClick={() => handleDeleteTeam(team.name)}
                            className="p-3 rounded-xl bg-red-500/5 text-zinc-600 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20"
                            title={onArchiveTeam ? "Archive Team (Move to History)" : "Delete entire team"}
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                  </div>

                  {/* Player Grid inside Team */}
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {team.players.map((player) => (
                      <div key={player.id} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center gap-4 relative group/player">
                        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/10 overflow-hidden shrink-0 shadow-inner">
                            {player.image ? (
                                <img src={player.image} className="w-full h-full object-cover" alt={player.name} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-800"><Users size={20} /></div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-black text-white uppercase truncate">{player.name}</p>
                            <p className="text-[7px] font-bold text-zinc-600 uppercase tracking-widest">ID: {player.id.substring(0, 5)}</p>
                        </div>
                        <button 
                            onClick={() => handleDeletePlayer(player.id)}
                            className="opacity-0 group-hover/player:opacity-100 p-2 text-zinc-700 hover:text-red-500 transition-all"
                        >
                            <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="p-6 md:p-8 border-t border-white/5 bg-zinc-950 flex flex-col md:flex-row justify-between items-center shrink-0 gap-4">
             <div className="flex items-center gap-3">
                <Info size={14} className="text-blue-500" />
                <p className="text-[8px] md:text-[9px] font-black text-zinc-500 uppercase tracking-widest">Total of {players.length} players across {teamList.length} organizations</p>
             </div>
             <button 
               onClick={onClose}
               className="w-full md:w-auto px-8 py-3 rounded-xl bg-zinc-900 border border-white/10 text-[8px] md:text-[9px] font-black text-white uppercase tracking-widest hover:bg-white/5 transition-all text-center"
             >
                CLOSE TERMINAL
             </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.4); }
      `}</style>
    </div>
  );
};

export default TeamListManagement;