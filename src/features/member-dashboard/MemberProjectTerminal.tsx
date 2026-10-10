
import React, { useState } from 'react';
import { Plus, History, X, ShieldCheck, Box, ExternalLink, Trash2, Clock, Gamepad2, Check, RotateCcw, AlertTriangle, ArrowRight, Layout, FolderOpen, Eye, Lock } from 'lucide-react';
import { Game, Project, Theme, Asset, AccessTier } from '@/types';
import { ASSET_DATABASE } from '@/features/assets/assets';
import { useT } from '@/i18n/LanguageContext';

interface MemberProjectTerminalProps {
  onNewProject: () => void;
  games: Game[];
  onSelectGame: (gameId: string) => void;
  projects: Project[];
  onUpdateProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  historyProjects: Project[];
  onUpdateHistory: React.Dispatch<React.SetStateAction<Project[]>>;
  themes: Theme[];
  onSelectTheme: (theme: Theme) => void;
  onOpenProject: (project: Project) => void; // New prop to handle project opening
  onPreviewAsset: (asset: Asset) => void;
  memberPackage: string;
}

const MemberProjectTerminal: React.FC<MemberProjectTerminalProps> = ({ 
  onNewProject, 
  games, 
  onSelectGame,
  projects,
  onUpdateProjects,
  historyProjects,
  onUpdateHistory,
  themes,
  onSelectTheme,
  onOpenProject,
  onPreviewAsset,
  memberPackage
}) => {
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectIdentifier, setProjectIdentifier] = useState('');
  const [operationalDescription, setOperationalDescription] = useState('');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  
  const [activeHubGameId, setActiveHubGameId] = useState<string | null>(null);

  const t = useT();

  const handleAuthorize = () => {
    if (!projectIdentifier.trim() || !selectedGameId) return;
    
    const game = games.find(g => g.id === selectedGameId);
    
    const newProject: Project = {
      id: Math.random().toString(36).substring(7),
      name: projectIdentifier,
      description: operationalDescription,
      gameId: selectedGameId,
      gameTitle: game?.title || 'Unknown Game',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      deployedAssets: []
    };

    onUpdateProjects(prev => [newProject, ...prev]);
    setIsProjectModalOpen(false);
    setProjectIdentifier('');
    setOperationalDescription('');
    setSelectedGameId(null);
  };

  const initiateDelete = (project: Project) => {
    setProjectToDelete(project);
  };

  const confirmDelete = () => {
    if (!projectToDelete) return;
    onUpdateHistory(prev => [projectToDelete, ...prev]);
    onUpdateProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
    setProjectToDelete(null);
  };

  const restoreProject = (id: string) => {
    const projectToRestore = historyProjects.find(p => p.id === id);
    if (!projectToRestore) return;
    onUpdateProjects(prev => [projectToRestore, ...prev]);
    onUpdateHistory(prev => prev.filter(p => p.id !== id));
  };

  const permanentDelete = (id: string) => {
    onUpdateHistory(prev => prev.filter(p => p.id !== id));
  };

  const activeGames = games.filter(g => g.isReleased);
  const filteredHubThemes = themes.filter(t => t.gameId === activeHubGameId);
  const filteredHubAssets = ASSET_DATABASE.filter(a => a.gameId === activeHubGameId);

  const getTierPriority = (tier?: string) => {
    if (tier === 'ULTIMATE') return 3;
    if (tier === 'PREMIUM') return 2;
    return 1;
  };

  const userTierPriority = getTierPriority(memberPackage);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2 flex items-center gap-3">
            {t('mpt.projectTerminal')}
          </h1>
          <p className="text-gray-500 text-sm font-medium">{t('mpt.accessPrivateProjects')}</p>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 bg-zinc-900/50 text-xs font-bold text-gray-400 hover:text-white hover:bg-zinc-800 transition-all uppercase tracking-wider"
          >
            <History size={14} />
            <span>{t('mpt.historyLogs').replace('{count}', String(historyProjects.length))}</span>
          </button>
          
          <button 
            onClick={() => setIsProjectModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#ccff00] text-black text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(204,255,0,0.3)]"
          >
            <Plus size={16} strokeWidth={3} />
            <span>{t('mpt.newProject')}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[400px]">
        {projects.length === 0 ? (
          <div className="h-full rounded-[32px] border-2 border-dashed border-white/10 bg-zinc-900/20 flex flex-col items-center justify-center relative overflow-hidden group hover:border-white/20 transition-colors py-12 mb-12">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center mb-4 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                    <Plus size={24} className="text-zinc-700 group-hover:text-[#ccff00] transition-colors" />
                </div>
                <h3 className="text-[10px] font-black text-zinc-600 tracking-[0.2em] uppercase mb-1 group-hover:text-zinc-400 transition-colors">{t('mpt.noProjectsActive')}</h3>
                <p className="text-[9px] text-zinc-700 max-w-xs font-medium leading-relaxed">{t('mpt.initializeBroadcast')}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {projects.map((project) => (
              <div key={project.id} className="group relative bg-zinc-900/50 border border-white/10 rounded-[32px] p-8 hover:border-[#ccff00]/40 transition-all hover:bg-zinc-900 animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-[#ccff00] group-hover:scale-110 transition-transform"><Box size={24} /></div>
                  <button onClick={() => initiateDelete(project)} className="p-2 text-zinc-600 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                </div>
                <div className="mb-2 flex items-center gap-2"><span className="text-[8px] font-black bg-white/5 border border-white/10 text-zinc-500 px-2 py-0.5 rounded tracking-widest uppercase">{project.gameTitle}</span></div>
                <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight group-hover:text-[#ccff00] transition-colors">{project.name}</h3>
                <p className="text-sm text-zinc-500 line-clamp-2 mb-6 font-medium leading-relaxed">{project.description || t('mpt.operationalBroadcastInstance')}</p>
                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <div className="flex items-center gap-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest"><Clock size={12} />{project.timestamp}</div>
                  <button onClick={() => onOpenProject(project)} className="flex items-center gap-2 text-[10px] font-black text-[#ccff00] uppercase tracking-widest group-hover:translate-x-1 transition-transform">{t('mpt.openProject')} <ExternalLink size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="animate-in slide-in-from-bottom-8 duration-700 mt-auto">
        <div className="mb-6 border-t border-white/5 pt-6">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-1">{t('mpt.masterAssetHub')}</h2>
            <p className="text-gray-500 text-xs font-medium">{t('mpt.selectGameModule')}</p>
        </div>

        <div className="flex overflow-x-auto pb-6 gap-4 no-scrollbar">
            {games.map((game, index) => {
                // Sisi yang menempel ke batas area dibuat lurus, sisi ke arah dalam tetap miring.
                const isFirst = index === 0;
                const isLast = index === games.length - 1;
                const slant = '12px';
                const clipPath =
                    isFirst && isLast
                        ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'
                        : isFirst
                            ? `polygon(0 0, 100% 0, calc(100% - ${slant}) 100%, 0 100%)`
                            : isLast
                                ? `polygon(${slant} 0, 100% 0, 100% 100%, 0 100%)`
                                : `polygon(${slant} 0, 100% 0, calc(100% - ${slant}) 100%, 0 100%)`;
                return (
                <button
                    key={game.id}
                    onClick={() => setActiveHubGameId(activeHubGameId === game.id ? null : game.id)}
                    disabled={!game.active}
                    style={{ clipPath }}
                    className={`
                        group relative h-14 min-w-[180px] px-8 flex items-center justify-center
                        transition-all duration-300 border shrink-0
                        ${game.active
                            ? (activeHubGameId === game.id
                                ? 'bg-[#ccff00] border-[#ccff00] shadow-[0_0_30px_rgba(204,255,0,0.4)]'
                                : 'bg-zinc-900 border-white/10 hover:bg-zinc-800 hover:border-white/20 cursor-pointer')
                            : 'bg-zinc-950 border-white/5 opacity-40 cursor-not-allowed'
                        }
                    `}
                >
                    <span className={`
                        text-[12px] font-black tracking-widest uppercase transition-colors
                        ${activeHubGameId === game.id
                            ? 'text-black'
                            : 'text-zinc-500 group-hover:text-white'
                        }
                    `}>
                        {game.title}
                    </span>
                    {game.active && activeHubGameId !== game.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/5 group-hover:bg-[#ccff00]/40 transition-colors" />
                    )}
                </button>
                );
            })}
        </div>

        {activeHubGameId && (
            <div className="mb-12 p-8 rounded-[40px] bg-zinc-900/40 border border-white/5 animate-in slide-in-from-top-4 duration-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                
                <div className="relative z-10 flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#ccff00] flex items-center justify-center text-black shadow-[0_0_15px_rgba(204,255,0,0.3)]">
                            <Layout size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black italic text-white uppercase tracking-tight">{t('mpt.masterAssetHubTitle')}</h3>
                            <p className="text-[10px] font-black text-zinc-600 tracking-[0.2em] uppercase">{games.find(g => g.id === activeHubGameId)?.title}</p>
                        </div>
                    </div>
                    <button onClick={() => setActiveHubGameId(null)} className="p-2 text-zinc-600 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredHubAssets.length > 0 ? (
                        filteredHubAssets.map((asset) => {
                            const assetTierPriority = getTierPriority(asset.tier);
                            const isLocked = assetTierPriority > userTierPriority;

                            return (
                                <div
                                    key={asset.id}
                                    className={`group relative bg-black/40 border border-white/5 rounded-3xl p-6 transition-all hover:border-[#ccff00]/30 ${isLocked ? 'opacity-60 grayscale' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`px-3 py-1 rounded-lg text-[8px] font-black tracking-widest uppercase ${isLocked ? 'bg-zinc-800 text-zinc-500' : 'bg-[#ccff00]/10 text-[#ccff00]'}`}>
                                            {asset.tier || 'BASIC'}
                                        </div>
                                        {isLocked && <Lock size={14} className="text-zinc-600" />}
                                    </div>
                                    
                                    <h4 className="text-lg font-black italic text-white uppercase tracking-tight mb-1 group-hover:text-[#ccff00] transition-colors">{asset.name}</h4>
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6">{asset.type}</p>
                                    
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${asset.nodeStatus === 'GLOBAL NODE' ? 'bg-blue-500' : 'bg-[#ccff00]'}`} />
                                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{asset.nodeStatus}</span>
                                        </div>
                                        
                                        <button
                                            onClick={() => !isLocked && onPreviewAsset(asset)}
                                            disabled={isLocked}
                                            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${isLocked ? 'text-zinc-700 cursor-not-allowed' : 'text-[#ccff00] hover:scale-105'}`}
                                        >
                                            <Eye size={14} />
                                            {t('mpt.previewAsset')}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-3xl opacity-40">
                            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">{t('mpt.noAssetsConfigured')}</p>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      {isProjectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsProjectModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#050505] border border-white/5 rounded-[48px] p-10 animate-in zoom-in-95 duration-300 shadow-[0_0_100px_rgba(0,0,0,0.9)] overflow-hidden">
            <button onClick={() => setIsProjectModalOpen(false)} className="absolute top-8 right-8 text-gray-700 hover:text-white transition-colors"><X size={28} /></button>
            <div className="mb-10">
                <div className="flex items-center gap-2 mb-2"><div className="w-1.5 h-1.5 bg-[#ccff00] rounded-full animate-pulse" /><span className="text-[10px] font-black text-zinc-500 tracking-[0.4em] uppercase">{t('mpt.deploymentUnit')}</span></div>
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">{t('mpt.newOperationalInstance')}</h2>
            </div>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-600 tracking-widest uppercase ml-4">{t('mpt.identification')}</label>
                    <input type="text" value={projectIdentifier} onChange={(e) => setProjectIdentifier(e.target.value)} placeholder={t('mpt.projectIdentifierPlaceholder')} className="w-full bg-[#111] border border-white/5 rounded-3xl px-8 py-5 text-white placeholder:text-zinc-700 outline-none focus:border-[#ccff00]/30 transition-all font-bold text-lg" />
                </div>
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-600 tracking-widest uppercase ml-4">{t('mpt.moduleSelection')}</label>
                    <div className="grid grid-cols-2 gap-3">
                        {activeGames.map((game) => (
                            <button key={game.id} onClick={() => setSelectedGameId(game.id)} className={`relative py-4 px-6 rounded-2xl border text-[10px] font-black tracking-widest uppercase transition-all flex items-center justify-between group/game ${selectedGameId === game.id ? 'bg-[#ccff00] border-[#ccff00] text-black shadow-[0_0_15px_rgba(204,255,0,0.2)]' : 'bg-[#111] border-white/5 text-zinc-500 hover:border-white/10 hover:text-white'}`}>
                                <span>{game.title}</span>
                                {selectedGameId === game.id ? <Check size={14} strokeWidth={4} /> : <Gamepad2 size={14} className="opacity-20 group-hover/game:opacity-100" />}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-600 tracking-widest uppercase ml-4">{t('mpt.descriptionOptional')}</label>
                    <textarea value={operationalDescription} onChange={(e) => setOperationalDescription(e.target.value)} placeholder={t('mpt.descriptionPlaceholder')} rows={3} className="w-full bg-[#111] border border-white/5 rounded-3xl px-8 py-5 text-white placeholder:text-zinc-700 outline-none focus:border-[#ccff00]/30 transition-all font-bold text-base resize-none" />
                </div>
              </div>
              <button onClick={handleAuthorize} disabled={!projectIdentifier.trim() || !selectedGameId} className="w-full bg-[#ccff00] text-black py-7 rounded-[32px] font-black text-sm tracking-[0.3em] uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_50px_rgba(204,255,0,0.3)] mt-2 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed">{t('mpt.authorizeDeployment')}</button>
            </div>
          </div>
        </div>
      )}

      {projectToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setProjectToDelete(null)} />
          <div className="relative w-full max-w-md bg-[#050505] border border-red-500/20 rounded-[40px] p-10 animate-in zoom-in-95 duration-300 shadow-[0_0_80px_rgba(239,68,68,0.1)] flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 text-red-500"><AlertTriangle size={40} strokeWidth={2.5} /></div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">{t('mpt.confirmArchive')}</h2>
            <p className="text-[10px] font-black text-zinc-600 tracking-[0.2em] uppercase mb-8 leading-relaxed max-w-[280px]">{t('mpt.archiveConfirmText').replace('{name}', projectToDelete.name)}</p>
            <div className="grid grid-cols-2 gap-4 w-full">
                <button onClick={() => setProjectToDelete(null)} className="py-5 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-all text-[10px] font-black tracking-[0.2em] uppercase">{t('mpt.cancel')}</button>
                <button onClick={confirmDelete} className="py-5 rounded-2xl bg-red-600 text-white font-black text-[10px] tracking-[0.2em] uppercase shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:scale-105 transition-all">{t('mpt.yesArchive')}</button>
            </div>
          </div>
        </div>
      )}

      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setIsHistoryModalOpen(false)} />
          
          <div className="relative w-full max-w-2xl bg-[#050505] border border-white/5 rounded-[48px] p-10 animate-in zoom-in-95 duration-300 shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden">
            <button onClick={() => setIsHistoryModalOpen(false)} className="absolute top-10 right-10 text-gray-700 hover:text-white transition-colors"><X size={28} /></button>
            <div className="mb-10">
                <div className="flex items-center gap-2 mb-2"><div className="w-1.5 h-1.5 bg-[#ccff00] rounded-full" /><span className="text-[10px] font-black text-zinc-500 tracking-[0.4em] uppercase">{t('mpt.archiveTerminal')}</span></div>
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">{t('mpt.historyLogsTitle')}</h2>
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                {historyProjects.length === 0 ? (
                    <div className="py-20 text-center opacity-30 border border-dashed border-white/10 rounded-3xl"><History size={48} className="mx-auto mb-4" /><p className="text-xs font-black tracking-widest uppercase">{t('mpt.noArchivedProjects')}</p></div>
                ) : (
                    historyProjects.map((project) => (
                        <div key={project.id} className="bg-[#111] border border-white/5 rounded-2xl p-6 flex items-center justify-between group hover:border-[#ccff00]/30 transition-all">
                            <div className="flex items-center gap-5">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-[#ccff00] transition-colors"><Box size={20} /></div>
                                <div>
                                    <h4 className="text-sm font-bold text-white uppercase tracking-tight mb-0.5">{project.name}</h4>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[8px] font-black bg-white/5 text-zinc-500 px-1.5 py-0.5 rounded tracking-widest uppercase">{project.gameTitle}</span>
                                        <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-widest flex items-center gap-1"><Clock size={8} /> {project.timestamp}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => restoreProject(project.id)} className="flex items-center gap-2 px-4 py-2 bg-[#ccff00]/10 border border-[#ccff00]/20 rounded-xl text-[9px] font-black text-[#ccff00] uppercase tracking-widest hover:bg-[#ccff00] hover:text-black transition-all"><RotateCcw size={12} /> {t('mpt.restore')}</button>
                                <button onClick={() => permanentDelete(project.id)} className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all" title={t('mpt.deletePermanently')}><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-center"><p className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">{t('mpt.archivedNodes').replace('{count}', String(historyProjects.length))}</p><button onClick={() => setIsHistoryModalOpen(false)} className="text-[9px] font-black text-[#ccff00] uppercase tracking-widest hover:underline">{t('mpt.closeArchive')}</button></div>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(204, 255, 0, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(204, 255, 0, 0.4); }
      `}</style>
    </div>
  );
};

export default MemberProjectTerminal;
