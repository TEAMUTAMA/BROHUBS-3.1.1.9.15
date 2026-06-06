
import React from 'react';
import { X, Monitor, Signal, Maximize2, Zap, Trophy, Shield, Swords, Activity, User, Target, Skull } from 'lucide-react';
import { Asset, Theme } from '../types';

interface AssetPreviewModalProps {
  asset: Asset;
  theme: Theme;
  onClose: () => void;
}

const AssetPreviewModal: React.FC<AssetPreviewModalProps> = ({ asset, theme, onClose }) => {
  // Mock background images for realistic preview context
  const getContextBg = () => {
    const gameId = asset.gameId.toLowerCase();
    if (gameId === 'pubg') return "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070";
    if (gameId === 'mlbb') return "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071";
    if (gameId === 'val') return "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=2070";
    if (gameId === 'ff') return "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?q=80&w=2070";
    return "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070";
  };

  const renderAssetPreview = () => {
    const assetId = asset.id.toLowerCase();
    const gameId = asset.gameId.toLowerCase();

    // 1. TOP FRAGGERS PREVIEW
    if (assetId.includes('fraggers')) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-700">
           <div className="text-center mb-10">
               <h1 className="text-white font-[1000] italic uppercase leading-none text-5xl md:text-7xl tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">TOP <span className="text-[#ccff00]">FRAGGERS</span></h1>
               <div className="bg-white px-6 py-1.5 mt-4 transform -skew-x-12 inline-block">
                   <span className="text-black font-black uppercase text-xs md:text-sm transform skew-x-12 block tracking-[0.3em]">LIVE PERFORMANCE TELEMETRY</span>
               </div>
           </div>
           <div className="flex gap-4 items-end">
               {[1, 2, 3].map((rank) => (
                   <div key={rank} className={`relative w-48 md:w-56 bg-[#ccff00] flex flex-col items-center pt-8 pb-4 shadow-2xl transform transition-all duration-500 hover:scale-105 ${rank === 1 ? 'h-[360px] z-20' : 'h-[320px] opacity-90'}`}>
                       <span className="absolute top-4 left-4 text-black font-black text-4xl md:text-5xl italic opacity-20">#{rank}</span>
                       <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/40 flex items-center justify-center"><Shield size={16} className="text-black" /></div>
                       <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Player${rank}`} className="h-40 object-contain mb-4 drop-shadow-2xl" />
                       <h3 className="text-black font-[1000] text-xl md:text-2xl uppercase italic leading-none">PLAYER_{rank}</h3>
                       <p className="text-black/60 font-black uppercase text-[10px] tracking-widest mb-4">TEAM_ALPHA</p>
                       <div className="w-full px-4 space-y-2">
                           <div className="bg-black/10 py-2 rounded-lg text-center">
                               <span className="block text-3xl font-black text-black leading-none">{10 - rank}</span>
                               <span className="text-[8px] font-black uppercase text-black/40 tracking-widest">ELIMINATIONS</span>
                           </div>
                       </div>
                   </div>
               ))}
           </div>
        </div>
      );
    }

    // 2. DRAFT PICK / AGENT SELECT PREVIEW
    if (assetId.includes('draft') || assetId.includes('agent')) {
      return (
        <div className="w-full h-full flex flex-col justify-between p-12 animate-in fade-in duration-1000">
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"><Shield size={24} /></div>
                        <div>
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">TEAM <span className="text-blue-500">BLUE</span></h3>
                            <p className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">3 BANS REMAINING</p>
                        </div>
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-5xl font-[1000] italic text-[#ccff00] leading-none mb-1">00:45</div>
                    <div className="text-[10px] font-black text-zinc-600 tracking-[0.4em] uppercase">DRAFT PHASE</div>
                </div>
                <div className="space-y-2 text-right">
                    <div className="flex items-center gap-3 justify-end">
                        <div>
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">TEAM <span className="text-red-500">RED</span></h3>
                            <p className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">2 BANS REMAINING</p>
                        </div>
                        <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]"><Shield size={24} /></div>
                    </div>
                </div>
            </div>

            <div className="flex justify-center gap-4">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="w-32 h-64 bg-zinc-900/80 border border-white/10 rounded-2xl flex flex-col items-center justify-end p-4 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <User size={48} className="text-zinc-800 mb-8" />
                        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-4">
                            <div className="w-1/2 h-full bg-blue-500" />
                        </div>
                        <div className="text-[10px] font-black text-white uppercase tracking-widest">PLAYER_{i}</div>
                    </div>
                ))}
            </div>
        </div>
      );
    }

    // 3. TEAM ROSTER PREVIEW
    if (assetId.includes('team-roster') || assetId.includes('roster')) {
      const clip = 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)';
      const previewTeams = [
        { name: 'ASI8', players: ['GHANTAGAMII', 'NEW', 'PLAYER 3'], body: '#e8e6df' },
        { name: 'HORAA', players: ['WISER', 'SANTEY', 'PLAYER 3', 'PLAYER 4', 'PLAYER 5'], body: '#dcdcdc' },
        { name: '4T', players: ['PLAYER 1'], body: '#e8e6df' },
        { name: '313', players: ['PLAYER 1', 'PLAYER 2'], body: '#dcdcdc' },
      ];
      return (
        <div className="w-full h-full flex flex-col p-12 animate-in fade-in duration-700 relative">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 50% 40% at 15% 20%, #74a57f22 0%, transparent 70%)' }}
          />
          <div className="flex items-end justify-between mb-10 relative z-10">
            <div>
              <h1 className="text-[#74a57f] font-[1000] uppercase leading-none text-5xl md:text-6xl tracking-tighter drop-shadow-lg">
                TEAM ROSTERS
              </h1>
              <div className="h-1 mt-3 w-56 bg-gradient-to-r from-[#74a57f] to-transparent" />
            </div>
            <div className="text-right space-y-2">
              <div className="bg-[#74a57f] px-5 py-1.5 -skew-x-12 shadow-lg">
                <p className="text-white font-bold uppercase text-sm tracking-[0.3em] skew-x-12">ROUND ROBIN FINALS</p>
              </div>
              <p className="text-white/70 text-xs font-bold tracking-widest border border-white/20 px-3 py-1 inline-block">&lt; 1 / 2 &gt;</p>
            </div>
          </div>
          <div className="flex gap-5 items-stretch justify-center flex-1 relative z-10">
            {previewTeams.map((team) => (
              <div
                key={team.name}
                className="w-52 flex flex-col shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
                style={{ clipPath: clip }}
              >
                <div className="bg-[#74a57f] flex-[2] flex flex-col items-center justify-between py-5 px-3 relative">
                  <span className="absolute top-2 right-2 text-[8px] font-black text-white/80 bg-black/20 px-1.5 py-0.5">
                    {team.players.length}/5
                  </span>
                  <div className="w-16 h-16 bg-[#a3cfaa] flex items-center justify-center mt-2" style={{ clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}>
                    <Shield size={28} className="text-white/80" />
                  </div>
                  <h3 className="text-white font-[1000] text-xl uppercase">{team.name}</h3>
                </div>
                <div className="flex-1 flex flex-col justify-center px-3 py-3 gap-1.5" style={{ backgroundColor: team.body }}>
                  {team.players.map((p, i) => (
                    <div key={p} className="flex items-center gap-2 px-1.5 py-1.5 bg-black/[0.04] border-l-2 border-[#74a57f]">
                      <span className="w-6 h-6 bg-[#74a57f] text-white text-[8px] font-black flex items-center justify-center">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-black font-bold uppercase text-[10px] truncate">{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 4. LEADERBOARD / STANDINGS PREVIEW
    if (assetId.includes('leaderboard') || assetId.includes('standings')) {
        return (
            <div className="w-full h-full flex items-center justify-center p-12">
                <div className="w-full max-w-3xl bg-zinc-950/80 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
                    <div className="bg-[#ccff00] p-6 flex justify-between items-center">
                        <h3 className="text-2xl font-[1000] italic text-black uppercase tracking-tighter">OVERALL <span className="opacity-50">STANDINGS</span></h3>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-[8px] font-black text-black/40 uppercase tracking-widest">MATCH</p>
                                <p className="text-sm font-black text-black">05 / 12</p>
                            </div>
                            <Trophy size={24} className="text-black" />
                        </div>
                    </div>
                    <div className="p-2">
                        {[1, 2, 3, 4, 5].map(rank => (
                            <div key={rank} className={`flex items-center justify-between p-4 rounded-xl mb-1 transition-all hover:bg-white/5 ${rank === 1 ? 'bg-white/10' : ''}`}>
                                <div className="flex items-center gap-6">
                                    <span className={`text-xl font-black w-8 ${rank === 1 ? 'text-[#ccff00]' : 'text-zinc-500'}`}>#{rank}</span>
                                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center"><Shield size={16} className="text-zinc-600" /></div>
                                    <span className="text-sm font-black text-white uppercase tracking-widest">TEAM_BROHUBS_{rank}</span>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="text-center">
                                        <p className="text-[8px] font-black text-zinc-600 uppercase">WWCD</p>
                                        <p className="text-xs font-black text-white">{rank === 1 ? 2 : 1}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] font-black text-zinc-600 uppercase">KILLS</p>
                                        <p className="text-xs font-black text-white">{45 - (rank * 5)}</p>
                                    </div>
                                    <div className="w-16 text-right">
                                        <p className="text-[8px] font-black text-zinc-600 uppercase">TOTAL</p>
                                        <p className="text-lg font-black text-[#ccff00]">{120 - (rank * 10)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // DEFAULT FALLBACK
    return (
      <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
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
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">{theme.name} // DESIGN_SYSTEM</p>
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
    );
  };

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
                <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] italic">PREVIEW // STAGING_MODE</h2>
             </div>
             <div className="h-4 w-px bg-white/10" />
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">ASSET:</span>
                <span className="text-[10px] font-black text-[#ccff00] uppercase tracking-widest">{asset.name}</span>
             </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded bg-[#ccff00]/5 border border-[#ccff00]/10 text-[#ccff00] text-[9px] font-black uppercase tracking-widest">
                <Signal size={10} /> 4K_UPLINK_READY
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
                    <div className="px-2 py-0.5 bg-red-600 text-white text-[8px] font-black rounded-sm">PREVIEW</div>
                    <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">REC: 00:00:12:00</span>
                </div>
                
                {/* DYNAMIC ASSET RENDER */}
                {renderAssetPreview()}

                {/* Decorative Viewfinder */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/10" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/10" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/10" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/10" />
            </div>
        </div>

        {/* Footer Info */}
        <div className="h-14 bg-black border-t border-white/5 flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-3">
                <Maximize2 size={14} className="text-zinc-700" />
                <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">Resolution: 3840x2160 (Native)</span>
            </div>
            <p className="text-[8px] font-black text-zinc-800 uppercase tracking-[0.3em]">BROHUBS VIRTUAL_DISPLAY_UNIT</p>
        </div>
      </div>
    </div>
  );
};

export default AssetPreviewModal;
