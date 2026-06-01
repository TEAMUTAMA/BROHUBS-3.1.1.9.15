
import React from 'react';
import { 
  Project, Asset, Game, Theme, AccessTier
} from '../../types';
import { 
  Radio, 
  ArrowLeft, 
  Box, 
  Settings, 
  Signal, 
  Activity, 
  Monitor, 
  ChevronRight 
} from 'lucide-react';
import GlobalStudio from '../Dashboardadmin/GlobalStudio';
import { useSharedState } from '../../lib/useSharedState';

interface MemberBroadcastViewProps {
  projects: Project[];
  games: Game[];
  themes: Theme[];
  globalLogo: string | null;
  memberPackage: AccessTier;
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
}

const TIER_ORDER: Record<AccessTier, number> = { 'BASIC': 1, 'PREMIUM': 2, 'ULTIMATE': 3 };

const MemberBroadcastView: React.FC<MemberBroadcastViewProps> = ({ 
  projects, games, themes, globalLogo, memberPackage, selectedProject, setSelectedProject
}) => {
  const [activeAssetId, setActiveAssetId] = useSharedState<string | null>('activeAssetId', null);

  // Check if asset is accessible based on subscription package
  const isAssetAccessible = (asset: Asset) => {
      if (!asset.tier) return true; // Default to accessible if no tier
      return TIER_ORDER[asset.tier] <= TIER_ORDER[memberPackage];
  };

  // If a project is selected, render GlobalStudio
  if (selectedProject) {
      return (
          <GlobalStudio 
            games={games} 
            themes={themes} 
            userRole="member" 
            globalLogo={globalLogo}
            project={selectedProject}
            onBack={() => setSelectedProject(null)}
          />
      );
  }

  // If no project selected, show project selection screen
  if (!selectedProject) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]" />
            <span className="text-[10px] font-black text-zinc-500 tracking-[0.4em] uppercase">BROADCAST SELECTION UNIT</span>
          </div>
          <h1 className="text-4xl font-black italic text-white uppercase tracking-tighter mb-4">Start <span className="text-[#ccff00]">Broadcast</span></h1>
          <p className="text-gray-500 text-sm max-w-lg leading-relaxed">Select an operational project to begin real-time data orchestration and overlay control.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length === 0 ? (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-[40px] bg-zinc-900/10">
                <Box size={48} className="text-zinc-800 mx-auto mb-4" />
                <h3 className="text-zinc-600 font-black tracking-widest uppercase text-sm mb-1">NO PROJECTS FOUND</h3>
                <p className="text-zinc-700 text-xs">Create a project in the Terminal to start broadcasting.</p>
            </div>
          ) : (
            projects.map((project) => (
              <div 
                key={project.id} 
                onClick={() => setSelectedProject(project)}
                className="group relative bg-zinc-900/40 border border-white/5 rounded-[32px] p-8 hover:border-[#ccff00]/40 transition-all hover:bg-zinc-900 cursor-pointer shadow-xl overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Radio size={80} className="text-white" />
                </div>

                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[#ccff00]/10 border border-[#ccff00]/20 flex items-center justify-center text-[#ccff00]">
                        <Signal size={20} />
                    </div>
                    <span className="text-[9px] font-black text-zinc-500 tracking-widest uppercase">{project.gameTitle}</span>
                </div>

                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2 group-hover:text-[#ccff00] transition-colors">{project.name}</h3>
                <p className="text-xs text-zinc-600 font-medium line-clamp-1 mb-8 uppercase tracking-widest">{project.deployedAssets?.length || 0} Assets Deployed</p>

                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2">
                        <Activity size={12} className="text-zinc-700" />
                        <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">READY_FOR_HANDSHAKE</span>
                    </div>
                    <button className="flex items-center gap-2 text-[10px] font-black text-[#ccff00] uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                        INITIALIZE <ChevronRight size={14} strokeWidth={3} />
                    </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Project selected, asset configuration selection
  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500 flex flex-col h-full">
      <header className="mb-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div>
          <button 
            onClick={() => setSelectedProject(null)}
            className="flex items-center gap-2 text-[10px] font-black text-zinc-600 hover:text-white transition-all uppercase tracking-[0.2em] mb-4 bg-white/5 border border-white/5 px-4 py-2 rounded-xl"
          >
            <ArrowLeft size={12} /> Change Project
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#ccff00] flex items-center justify-center text-black shadow-[0_0_20px_rgba(204,255,0,0.3)]">
                <Radio size={24} />
            </div>
            <div>
                <h1 className="text-3xl font-black italic text-white uppercase tracking-tighter leading-none mb-2">
                    Broadcast <span className="text-[#ccff00]">Console</span>
                </h1>
                <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-black text-zinc-500 uppercase tracking-widest">ACTIVE SESSION</span>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{selectedProject.name} <span className="mx-1 text-zinc-800">//</span> {selectedProject.gameTitle}</span>
                </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-zinc-900/50 border border-white/5 p-4 rounded-3xl">
             <div className="flex flex-col items-end border-r border-white/5 pr-4">
                <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">SESSION UPLINK</span>
                <span className="text-[#ccff00] text-[10px] font-black tracking-widest uppercase">STABLE // 4K</span>
             </div>
             <div className="flex flex-col items-end">
                <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">ACTIVE NODES</span>
                <span className="text-white text-[10px] font-black tracking-widest uppercase">{selectedProject.deployedAssets?.length || 0} DEPLOYED</span>
             </div>
        </div>
      </header>

      <div className="flex-1">
        <h2 className="text-[11px] font-black text-zinc-500 tracking-[0.3em] uppercase mb-6 border-b border-white/5 pb-4">Operational Assets</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
            {(selectedProject.deployedAssets || []).length > 0 ? (
                (selectedProject.deployedAssets || []).map((asset) => {
                    const accessible = isAssetAccessible(asset);
                    return (
                    <div 
                        key={asset.id}
                        onClick={() => accessible && setActiveAssetId(asset.id)}
                        className={`group relative bg-zinc-950 border ${accessible ? 'border-white/10 hover:border-[#ccff00]/60 hover:bg-zinc-900 cursor-pointer' : 'border-zinc-800 opacity-60'} rounded-[28px] p-8 flex flex-col items-center text-center transition-all shadow-2xl overflow-hidden`}
                    >
                        <div className={`w-20 h-20 rounded-2xl bg-white/5 border ${accessible ? 'border-white/10' : 'border-zinc-800'} flex items-center justify-center mb-6`}>
                            <Monitor size={40} className={`text-zinc-700 ${accessible ? 'group-hover:text-[#ccff00]' : ''} transition-colors`} />
                        </div>
                        
                        <h3 className={`text-md font-black text-white uppercase tracking-tight mb-2 ${accessible ? 'group-hover:text-[#ccff00]' : ''} transition-colors line-clamp-1`}>
                            {asset.name}
                        </h3>
                        <p className="text-[8px] font-black text-zinc-600 tracking-[0.2em] uppercase mb-8">
                            {asset.type}
                        </p>

                        <button className={`w-full py-3 ${accessible ? 'bg-[#ccff00]/10 border-[#ccff00]/20 text-[#ccff00] hover:bg-[#ccff00] hover:text-black' : 'bg-zinc-800 border-zinc-700 text-zinc-500'} rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2`}>
                            {accessible ? <><Settings size={12} /> CONFIGURE NODE</> : 'LOCKED - UPGRADE'}
                        </button>

                        <div className="absolute top-4 right-4">
                            <div className={`w-1.5 h-1.5 rounded-full ${accessible ? 'bg-[#ccff00] shadow-[0_0_8px_#ccff00] animate-pulse' : 'bg-red-500'}`} />
                        </div>
                    </div>
                )})
            ) : (
                <div className="col-span-full py-12 text-center border border-dashed border-zinc-800 rounded-[32px] opacity-40">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">No assets available for your subscription tier.</p>
                </div>
            )}
        </div>
      </div>

      <footer className="mt-auto py-8 border-t border-white/5 flex items-center justify-between opacity-30">
          <div className="flex items-center gap-3">
              <Signal size={14} className="text-zinc-500" />
              <span className="text-[9px] font-black text-white uppercase tracking-widest">Operational Console v4.2.1-Member</span>
          </div>
          <div className="flex items-center gap-2">
              <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">System Health:</span>
              <span className="text-[8px] font-black text-[#ccff00] uppercase tracking-widest">Optimal</span>
          </div>
      </footer>
    </div>
  );
};

export default MemberBroadcastView;
