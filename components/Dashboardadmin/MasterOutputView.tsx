import React, { useState, useEffect } from 'react';
import { ASSET_DATABASE } from '../../constants/assets';
import { useSharedState } from '../../lib/useSharedState';
import { getProgramLayersKey, getPreviewAssetKey } from '../../lib/programLayers';

// ============================================================================
// SELF-CONTAINED TYPES: Decoupled for easy copying to other applications
// ============================================================================
export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Online' | 'Offline' | 'In Stream';
  joinDate: string;
  subscription?: 'Basic' | 'Premium' | 'Ultimate';
}

export interface Asset {
  id: string;
  ownerId: string;
  projectId?: string;
  title: string;
  type: string;
  url: string;
  status: 'Active' | 'Deploying';
  config?: any;
}

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  status: 'Active' | 'Draft' | 'Completed';
  createdAt: string;
  gameType?: 'PUBG' | 'MLBB' | 'VALORANT' | 'FREEFIRE' | 'HOK' | 'DOTA 2' | 'General';
  backgroundImage?: string;
}

// ============================================================================
// SELF-CONTAINED UTILITY: Robust copy-to-clipboard (iframe & non-HTTPS safe)
// ============================================================================
const copyToClipboard = async (text: string): Promise<boolean> => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Modern clipboard API failed, attempting fallback...', err);
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed:', err);
    return false;
  }
};

interface MasterOutputViewProps {
  assets: Asset[];
  members: Member[];
  projects: Project[];
}

const AssetStatusBadge: React.FC<{ asset: Asset; project: Project | undefined }> = ({ asset, project }) => {
  const [previewAssetId] = useSharedState<string | null>(
    getPreviewAssetKey(project?.id),
    null
  );
  const [programLayers] = useSharedState<Record<number, string | null>>(
    getProgramLayersKey(project?.id),
    { 1: null, 2: null, 3: null, 4: null, 5: null }
  );

  const assetIdMatch = asset.url.match(/[?&]asset=([^&]+)/);
  const targetAssetId = assetIdMatch ? assetIdMatch[1] : asset.id;

  const isProgramLive = Object.values(programLayers).includes(targetAssetId);
  const isPreviewStandby = previewAssetId === targetAssetId;

  if (isProgramLive) {
    return (
      <div className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.2)]">
        ● SIGNAL LIVE
      </div>
    );
  }

  if (isPreviewStandby) {
    return (
      <div className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.2)]">
        ● STANDBY MONITOR
      </div>
    );
  }

  return (
    <div className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-white/10 text-white/40">
      OFFLINE
    </div>
  );
};

const MasterOutputView: React.FC<MasterOutputViewProps> = ({ assets, members, projects }) => {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  const [activeFolderFilter, setActiveFolderFilter] = useState<string>('all');
  const [connectionFilter, setConnectionFilter] = useState<'all' | 'active' | 'idle'>('active');

  // Reset folder filter when operator selection changes
  useEffect(() => {
    setActiveFolderFilter('all');
  }, [selectedMemberId]);

  const slugify = (text: string) => text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

  const getPublicUrl = (asset: Asset) => {
    return asset.url;
  };

  const getActiveTitle = (asset: Asset) => {
    try {
      const url = new URL(asset.url);
      const mock = url.searchParams.get('mock');
      if (mock) {
        if (mock === 'summary') return 'MATCH SUMMARY';
        if (mock === 'h2h') return 'TEAM H2H';
        if (mock === 'mvp') return 'OVERLAY MVP';
        return mock.toUpperCase() + ' OVERLAY';
      }
      const assetId = url.searchParams.get('asset');
      if (assetId) {
        const dbAsset = ASSET_DATABASE.find(a => a.id === assetId);
        if (dbAsset) {
          return dbAsset.name.toUpperCase();
        }
      }
    } catch (e) {
      // Ignored
    }

    if (asset.url.includes('mock=summary')) return 'MATCH SUMMARY';
    if (asset.url.includes('mock=h2h')) return 'TEAM H2H';
    if (asset.url.includes('mock=mvp')) return 'OVERLAY MVP';

    const assetIdMatch = asset.url.match(/[?&]asset=([^&]+)/);
    if (assetIdMatch && assetIdMatch[1]) {
      const dbAsset = ASSET_DATABASE.find(a => a.id === assetIdMatch[1]);
      if (dbAsset) return dbAsset.name.toUpperCase();
    }

    return asset.title;
  };

  const handleCopy = async (url: string) => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopyFeedback(url);
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  // Double Filtering Logic: stage 1 (Active Operator Check) -> stage 2 (Folder)
  const filteredAssets = assets.filter(a => {
    if (!members || !members.length) return false;
    // Ensure the asset belongs to a registered member who is currently ACTIVE (Online or In Stream)                
    const owner = members.find(m => m.id?.toLowerCase() === a.ownerId?.toLowerCase());
    if (!owner) return false;

    const opStatus = (owner.status || '').toLowerCase();
    const isOwnerActive = opStatus === 'online' || opStatus === 'in stream';
    
    // Filter based on our connectionFilter state
    if (connectionFilter === 'active' && !isOwnerActive) return false;
    if (connectionFilter === 'idle' && isOwnerActive) return false;

    const matchesMember = selectedMemberId === 'all' || a.ownerId === selectedMemberId;
    const matchesFolder = activeFolderFilter === 'all' || a.projectId === activeFolderFilter;
    return matchesMember && matchesFolder;
  });

  // Derived list of projects for the selected member to build the filter bar
  const selectedMemberProjects = projects.filter(p => 
    p.ownerId === selectedMemberId && 
    assets.some(a => a.ownerId === selectedMemberId && a.projectId === p.id)
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between border-b border-white/5 pb-10 gap-8">
        <div className="max-w-xl text-left">
          <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase font-orbitron mb-2">Network Output Monitor</h2>
          <p className="text-white/40 text-sm leading-relaxed">Centralized oversight of all active broadcast endpoints across the operational network.</p>
        </div>


      </div>

      {/* CONNECTION STATE SEGMENTED FILTER */}
      <div className="flex flex-col items-center gap-4 bg-zinc-950/40 border border-white/5 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden text-center max-w-2xl mx-auto">
        <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">
          Broadcast Connection Filter
        </label>
        
        <div className="grid grid-cols-3 gap-2 w-full max-w-lg bg-black/40 p-1.5 rounded-2xl border border-white/5">
          <button
            onClick={() => setConnectionFilter('active')}
            className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 ${
              connectionFilter === 'active'
                ? 'bg-[#c1ff00] text-black font-extrabold shadow-[0_0_15px_rgba(193,255,0,0.25)]'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${connectionFilter === 'active' ? 'bg-black animate-pulse' : 'bg-[#c1ff00]'}`} />
              <span>SIARAN AKTIF</span>
            </div>
            <span className="text-[8px] font-normal opacity-70">Operator Genuinely Online</span>
          </button>
          
          <button
            onClick={() => setConnectionFilter('idle')}
            className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 ${
              connectionFilter === 'idle'
                ? 'bg-[#c1ff00] text-black font-extrabold shadow-[0_0_15px_rgba(193,255,0,0.25)]'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${connectionFilter === 'idle' ? 'bg-black' : 'bg-red-500'}`} />
              <span>BELUM BERJALAN</span>
            </div>
            <span className="text-[8px] font-normal opacity-70 font-sans">Created Folder, Offline</span>
          </button>

          <button
            onClick={() => setConnectionFilter('all')}
            className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1 ${
              connectionFilter === 'all'
                ? 'bg-[#c1ff00] text-black font-extrabold shadow-[0_0_15px_rgba(193,255,0,0.25)]'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${connectionFilter === 'all' ? 'bg-black' : 'bg-blue-400'}`} />
              <span>SEMUA TRANSMISI</span>
            </div>
            <span className="text-[8px] font-normal opacity-70 font-sans">Show All Folders</span>
          </button>
        </div>
      </div>

      {/* SMART FOLDER FILTER BAR (Dynamic, Centered & Smooth Transition) */}
      {selectedMemberId !== 'all' && (
        <div className="flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-500 ease-out">
           <div className="flex items-center gap-3">
              <div className="w-4 h-[1px] bg-white/10"></div>
              <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">Operator Repository Map</span>
              <div className="w-4 h-[1px] bg-white/10"></div>
           </div>
           <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar max-w-full pb-2">
             <button 
               onClick={() => setActiveFolderFilter('all')}
               className={`flex-shrink-0 px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
                 activeFolderFilter === 'all' 
                   ? 'bg-[#c1ff00]/10 border-[#c1ff00] text-[#c1ff00] shadow-[0_0_25px_rgba(193,255,0,0.2)]' 
                   : 'bg-transparent border-white/5 text-white/40 hover:border-white/20 hover:text-white'
               }`}
             >
               All Transmissions
             </button>
             {selectedMemberProjects.map(proj => (
               <button 
                 key={proj.id}
                 onClick={() => setActiveFolderFilter(proj.id)}
                 className={`flex-shrink-0 px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${
                   activeFolderFilter === proj.id 
                     ? 'bg-[#c1ff00]/10 border-[#c1ff00] text-[#c1ff00] shadow-[0_0_25px_rgba(193,255,0,0.2)]' 
                     : 'bg-transparent border-white/5 text-white/40 hover:border-white/20 hover:text-white'
                 }`}
               >
                 {proj.name}
               </button>
             ))}
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
        {filteredAssets.length > 0 ? (
          filteredAssets.map((asset) => {
            const owner = members.find(m => m.id === asset.ownerId);
            const project = projects.find(p => p.id === asset.projectId);
            const publicUrl = getPublicUrl(asset);

            return (
              <div key={asset.id} className="p-8 bg-black border border-white/5 rounded-[2.5rem] group hover:border-[#c1ff00]/40 transition-all relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-6 flex gap-2 items-center">
                  <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[9px] font-black text-blue-400 uppercase tracking-widest">
                    OPERATOR: {owner?.name.split(' ')[0]}
                  </div>
                  <AssetStatusBadge asset={asset} project={project} />
                </div>
                
                <div className="inline-block px-4 py-1.5 bg-white/5 rounded-lg border border-white/5 text-[10px] font-black text-[#c1ff00] uppercase tracking-[0.2em] mb-4 shadow-inner">
                    FOLDER: {project?.name || 'ROOT'}
                </div>
                <h3 className="text-xl font-bold mb-8 text-white uppercase italic tracking-tight">{getActiveTitle(asset)}</h3>
                
                <div className="space-y-4">
                  <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex items-center justify-between group/input relative hover:border-white/20 transition-all">
                    <div className="flex flex-col min-w-0 pr-4">
                       <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Network Transmission URL</span>
                       <code className="text-[11px] font-mono text-white/60 truncate">{publicUrl}</code>
                    </div>
                    <button 
                      onClick={() => handleCopy(publicUrl)}
                      className={`flex-shrink-0 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-2 border ${
                        copyFeedback === publicUrl 
                          ? 'bg-[#c1ff00] text-black border-[#c1ff00]' 
                          : 'bg-white/5 text-white/80 border-white/10 hover:bg-white hover:text-black shadow-lg active:scale-95'
                      }`}
                    >
                      {copyFeedback === publicUrl ? 'COPIED' : 'COPY'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-32 text-center bg-[#050505] border border-dashed border-white/5 rounded-[3rem] animate-in fade-in duration-500">
            <p className="text-red-500/80 font-black uppercase tracking-[0.2em] text-xs mb-3">No Broadcast Signals Detected</p>
            <p className="text-white/40 text-xs px-12 max-w-sm mx-auto leading-relaxed">
              Jika di Folder Project masih kosong, berarti tidak ada Link yang terdaftar aktif di bagian OUTPUT.
            </p>
            {activeFolderFilter !== 'all' && (
              <button 
                onClick={() => setActiveFolderFilter('all')}
                className="mt-8 text-[10px] font-black text-[#c1ff00] uppercase tracking-[0.2em] hover:underline"
              >
                Clear sub-filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MasterOutputView;
