import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Member, Asset, Project } from '../../types';
import { useSharedState } from '../../lib/useSharedState';
import { getProgramLayersKey } from '../../lib/programLayers';

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

interface MemberOutputViewProps {
  povMember: Member;
  assets: Asset[];
  projects: Project[];
}

const AssetStatusBadge: React.FC<{ asset: Asset; project: Project | undefined }> = ({ asset, project }) => {
  const [previewAssetId] = useSharedState<string | null>('BROHUBS_STUDIO_PREVIEW_ASSET', null);
  const [programLayers] = useSharedState<Record<number, string | null>>(
    getProgramLayersKey(project?.id),
    { 1: null, 2: null, 3: null, 4: null, 5: null }
  );

  const isProgramLive = Object.values(programLayers).includes(asset.id);
  const isPreviewStandby = previewAssetId === asset.id;

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

const MemberOutputView: React.FC<MemberOutputViewProps> = ({ povMember, assets, projects }) => {
  const [activeAssetId, setActiveAssetId] = useSharedState<string | null>('activeAssetId', null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const slugify = (text: string) => text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

  const getPublicUrl = (asset: Asset) => {
    const baseUrl = window.location.origin;
    // Map existing Member 'name' to the slugified username
    const memberSlug = slugify(povMember.name);
    // Map existing Asset 'name' to the slugified asset name
    const assetSlug = slugify(asset.name);
    
    const project =
      projects.find((p) => p.deployedAssets?.some((a) => a.id === asset.id)) ||
      projects[0];
    const projectSlug = project ? slugify(project.name) : 'default';
    
    const projectScope = project?.id || 'GLOBAL';
    return `${baseUrl}/o/${memberSlug}/${projectSlug}/${assetSlug}?project=${encodeURIComponent(projectScope)}`;
  };

  const handleCopy = async (url: string) => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopyFeedback(url);
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  // Adjusted filtering to match types.ts
  const memberAssets = assets.filter(a => a.category !== undefined); // Adjust based on how assets are assigned to members
  const filteredAssets = memberAssets.filter(a => 
    (activeFilter === 'all' || (a as any).projectId === activeFilter) &&
    (searchQuery === '' || (projects.find(p => p.id === (a as any).projectId)?.name.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const memberProjectsWithAssets = projects;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/5 pb-8 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold tracking-tight text-white">{povMember.name}'s Output Hub</h2>
            <span className="px-2 py-0.5 bg-[#c1ff00] text-black text-[9px] font-black uppercase rounded-md shadow-[0_0_10px_rgba(193,255,0,0.3)]">MEMBER NODE</span>
          </div>
          <p className="text-white/30 text-sm">Unique transmission links for your active broadcast assets.</p>
        </div>
        <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Active Signal Tracking</span>
        </div>
      </div>

      {/* FOLDER FILTER BAR */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Project Repository Filter</span>
          <span className="text-[8px] font-mono text-[#c1ff00]/40 uppercase">Total: {filteredAssets.length} Nodes</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full bg-white/5 border border-white/5 rounded-xl p-4 text-[10px] font-black uppercase text-white tracking-widest flex items-center justify-between hover:border-white/20 transition-all">
                {activeFilter === 'all' ? 'All Projects' : memberProjectsWithAssets.find(p => p.id === activeFilter)?.name || 'Select Project'}
                <ChevronDown size={16} />
            </button>
            {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#111] border border-white/10 rounded-xl overflow-hidden z-20 shadow-2xl">
                    <button onClick={() => { setActiveFilter('all'); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/5">All Projects</button>
                    {memberProjectsWithAssets.map(proj => (
                        <button key={proj.id} onClick={() => { setActiveFilter(proj.id); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/5">
                            {proj.name}
                        </button>
                    ))}
                </div>
            )}
          </div>
          <div className="flex-1">
              <input 
                  type="text" 
                  placeholder="Search Project Link..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl p-4 text-[10px] font-black uppercase tracking-widest text-white placeholder:text-white/20 focus:outline-none focus:border-[#c1ff00]/30 transition-all"
              />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAssets.length > 0 ? (
          filteredAssets.map((asset) => {
            const publicUrl = getPublicUrl(asset);
            const project = projects.find(p => p.id === (asset as any).projectId);
            
            const isLive = asset.id === activeAssetId;
            return (
              <div key={asset.id} className="p-8 bg-white/5 border border-white/5 rounded-[2rem] group hover:border-[#c1ff00]/30 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                   <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>

                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center">
                        <div className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black text-[#c1ff00] uppercase tracking-[0.2em] border border-white/5 shadow-inner">
                           FOLDER: {project?.name || 'ROOT'}
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-white uppercase italic font-orbitron tracking-tighter">{asset.name}</h3>
                  </div>
                  <AssetStatusBadge asset={asset} project={project} />
                </div>
                
                <div className="space-y-4 relative z-10">
                  <div className="bg-black/60 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group/input relative overflow-hidden hover:border-white/20 transition-all">
                    <div className="flex flex-col min-w-0">
                       <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Triple-Segment Endpoint</span>
                       <code className="text-[11px] font-mono text-[#c1ff00]/80 truncate pr-4">{publicUrl}</code>
                    </div>
                    
                    <button 
                      onClick={() => handleCopy(publicUrl)}
                      className={`flex-shrink-0 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 border shadow-lg ${
                        copyFeedback === publicUrl 
                          ? 'bg-[#c1ff00] text-black border-[#c1ff00] scale-105' 
                          : 'bg-white text-black border-white hover:bg-[#c1ff00] hover:border-[#c1ff00] active:scale-95'
                      }`}
                    >
                      {copyFeedback === publicUrl ? 'COPIED!' : 'COPY URL'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-24 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-[2.5rem]">
            <p className="text-white/20 font-bold uppercase tracking-[0.4em] text-xs">No active nodes detected in this filter</p>
            <button 
              onClick={() => setActiveFilter('all')}
              className="mt-4 text-[10px] font-black text-[#c1ff00] uppercase tracking-widest hover:underline"
            >
              Reset to All Transmissions
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberOutputView;

