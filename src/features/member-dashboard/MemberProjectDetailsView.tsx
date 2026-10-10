import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Upload, FileText, ExternalLink, ShieldCheck, Gamepad2, Info, Plus, Trash2, Zap, Users, Database, Shield, ChevronRight, Globe, Link, FileSpreadsheet, Server, Wifi, X, Key, Eye, HelpCircle, Download, RefreshCw, Activity, CheckCircle2, FileUp, Share2, ClipboardCheck, UserPlus, Edit3, History, RotateCcw, AlertTriangle } from 'lucide-react';
import { Project, Asset, PlayerData, ArchivedTeam } from '@/types';
import PlayerDataManagement from './PlayerDataManagement';
import TeamListManagement from './TeamListManagement';
import { useT } from '@/i18n/LanguageContext';

// Default team slots: TEAM A .. TEAM Z (maks 26). Jumlah pemain per tim default kini bisa diatur.
const DEFAULT_TEAM_SLOTS = 16;
const MAX_TEAM_SLOTS = 26;
const DEFAULT_PLAYERS_PER_TEAM = 4;
const MAX_PLAYERS_PER_DEFAULT_TEAM = 10;

const clampTeamSlots = (raw: number): number => {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_TEAM_SLOTS, n);
};

const clampPlayersPerTeam = (raw: number): number => {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_PLAYERS_PER_DEFAULT_TEAM, n);
};

/** Bangun roster tim default TEAM A, B, C, … sebanyak `slots`, masing-masing `playersPerTeam` pemain placeholder. */
const buildDefaultTeamPlayers = (
  slots: number,
  playersPerTeam: number = DEFAULT_PLAYERS_PER_TEAM
): PlayerData[] => {
  const count = clampTeamSlots(slots);
  const perTeam = clampPlayersPerTeam(playersPerTeam);
  const players: PlayerData[] = [];
  for (let i = 0; i < count; i++) {
    const letter = String.fromCharCode(65 + i);
    for (let p = 1; p <= perTeam; p++) {
      players.push({
        id: `default-team-${i}-p${p}`,
        name: `P${p}`,
        team: `TEAM ${letter}`,
        teamAbbreviation: letter,
        teamLogo: '',
        image: '',
        role: 'PLAYER',
        kills: 0,
        damage: 0,
        assists: 0,
        survivalTime: '00:00',
      });
    }
  }
  return players;
};

/** Pemain placeholder dari tim default (TEAM A-Z, nama P#, tanpa foto/logo/stat). */
const isDefaultTemplatePlayer = (p: PlayerData): boolean =>
  /^TEAM [A-Z]$/.test(p.team || '') &&
  /^P\d+$/.test((p.name || '').trim()) &&
  !p.image && !p.teamLogo &&
  (p.kills ?? 0) === 0 && (p.damage ?? 0) === 0 && (p.assists ?? 0) === 0;

/** Roster dianggap "default murni" bila kosong atau semua pemain masih placeholder default. */
const isPristineDefaultRoster = (players: PlayerData[]): boolean =>
  players.length === 0 || players.every(isDefaultTemplatePlayer);

/**
 * Buang tim template default (TEAM A-Z murni) begitu ada minimal satu tim NYATA.
 * Sebuah tim dianggap default hanya bila namanya TEAM A-Z DAN semua pemainnya placeholder,
 * jadi tim nyata yang kebetulan bernama "TEAM A" tidak ikut terhapus.
 */
const dropDefaultTeamsWhenRealExists = (list: PlayerData[]): PlayerData[] => {
  const byTeam = new Map<string, PlayerData[]>();
  for (const p of list) {
    const key = p.team || '';
    const bucket = byTeam.get(key);
    if (bucket) bucket.push(p);
    else byTeam.set(key, [p]);
  }

  const defaultTeamNames = new Set<string>();
  let hasRealTeam = false;
  byTeam.forEach((teamPlayers, name) => {
    const isDefault = /^TEAM [A-Z]$/.test(name) && teamPlayers.every(isDefaultTemplatePlayer);
    if (isDefault) defaultTeamNames.add(name);
    else hasRealTeam = true;
  });

  if (!hasRealTeam || defaultTeamNames.size === 0) return list;
  return list.filter((p) => !defaultTeamNames.has(p.team || ''));
};

interface MemberProjectDetailsViewProps {
  project: Project;
  onBack: () => void;
  onDeployNode: () => void;
  onRemoveAsset: (assetId: string) => void;
  onOpenAsset: (asset: Asset) => void;
  onUpdateProject: (project: Project) => void;
}

const MemberProjectDetailsView: React.FC<MemberProjectDetailsViewProps> = ({ 
  project, 
  onBack, 
  onDeployNode, 
  onRemoveAsset,
  onOpenAsset,
  onUpdateProject
}) => {
  const t = useT();
  const [activeSubView, setActiveSubView] = useState<'MAIN' | 'MANUAL_PAGE'>('MAIN');
  const [isPlayerDataOpen, setIsPlayerDataOpen] = useState(false);
  const [isTeamListOpen, setIsTeamListOpen] = useState(false);
  const [isIpModalOpen, setIsIpModalOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [editingTeamName, setEditingTeamName] = useState<string | null>(null);
  const [teamToArchive, setTeamToArchive] = useState<string | null>(null);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  
  // History / Recycle Bin State (Derived from Project to ensure persistence)
  const deletedTeams = project.archivedTeams || [];
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(project.name);

  // Sheets Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [sheetId, setSheetId] = useState('');
  const [sheetKey, setSheetKey] = useState('');

  const deployedFiles = project.deployedAssets || [];
  const players = project.players || [];

  // Helper to group players for the preview in Manual Page
  const teamListManagementData = Object.values(players.reduce((acc, player) => {
    if (!acc[player.team]) {
      acc[player.team] = {
        name: player.team,
        logo: player.teamLogo || '',
        players: []
      };
    }
    acc[player.team].players.push(player);
    return acc;
  }, {} as Record<string, { name: string; logo: string; players: PlayerData[] }>)) as { name: string; logo: string; players: PlayerData[] }[];

  // Grouped players by team for metadata
  const uniqueTeams = Array.from(new Set(players.map(p => p.team)));
  const teamCount = uniqueTeams.length;

  // Jumlah slot tim default (TEAM A-Z) — bisa diatur user, tersimpan di project
  const teamSlots = clampTeamSlots(project.defaultTeamSlots ?? DEFAULT_TEAM_SLOTS);
  // Jumlah pemain per tim default — kini bisa diatur (dulunya tetap 4)
  const playersPerTeam = clampPlayersPerTeam(project.defaultPlayersPerTeam ?? DEFAULT_PLAYERS_PER_TEAM);

  // Auto-isi tim default saat halaman Manual Entry dibuka dalam keadaan kosong
  useEffect(() => {
    if (activeSubView !== 'MANUAL_PAGE') return;
    if (players.length > 0) return;
    onUpdateProject({ ...project, players: buildDefaultTeamPlayers(teamSlots, playersPerTeam) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubView, players.length, teamSlots, playersPerTeam]);

  // Ubah jumlah slot: regenerasi langsung bila roster masih default murni; jika sudah ada data nyata, simpan setelan saja
  const handleChangeTeamSlots = (raw: number) => {
    const next = clampTeamSlots(raw);
    if (next === teamSlots && project.defaultTeamSlots !== undefined) return;
    if (isPristineDefaultRoster(players)) {
      onUpdateProject({
        ...project,
        defaultTeamSlots: next,
        players: buildDefaultTeamPlayers(next, playersPerTeam),
      });
    } else {
      onUpdateProject({ ...project, defaultTeamSlots: next });
    }
  };

  // Ubah jumlah pemain per tim default: regenerasi bila roster masih default murni; jika sudah ada data nyata, simpan setelan saja
  const handleChangePlayersPerTeam = (raw: number) => {
    const next = clampPlayersPerTeam(raw);
    if (next === playersPerTeam && project.defaultPlayersPerTeam !== undefined) return;
    if (isPristineDefaultRoster(players)) {
      onUpdateProject({
        ...project,
        defaultPlayersPerTeam: next,
        players: buildDefaultTeamPlayers(teamSlots, next),
      });
    } else {
      onUpdateProject({ ...project, defaultPlayersPerTeam: next });
    }
  };

  const BHS_DARK_GUN_BANNER = "https://images.unsplash.com/photo-1595590424283-b8f17842773f?q=80&w=2070&auto=format&fit=crop";

  const handleUpdatePlayers = (updatedPlayers: PlayerData[]) => {
    // Tim default TEAM A-Z otomatis hilang begitu ada data tim nyata yang diinput
    onUpdateProject({ ...project, players: dropDefaultTeamsWhenRealExists(updatedPlayers) });
  };

  const handleEditTeamFromDB = (teamName: string) => {
    setEditingTeamName(teamName);
    setIsTeamListOpen(false);
    setIsPlayerDataOpen(true);
  };

  // Trigger Confirmation Modal
  const handleArchiveTeam = (teamName: string) => {
    setTeamToArchive(teamName);
  };

  // Execute Archive after Confirmation
  const confirmArchiveTeam = () => {
    if (!teamToArchive) return;
    
    const teamPlayers = players.filter(p => p.team === teamToArchive);
    let newArchivedTeams = [...deletedTeams];
    
    if (teamPlayers.length > 0) {
        const newArchive: ArchivedTeam = {
            name: teamToArchive,
            logo: teamPlayers[0].teamLogo || '',
            players: teamPlayers,
            deletedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        newArchivedTeams = [newArchive, ...newArchivedTeams];
    }
    
    // Update Project: Remove players from active list AND add to archive
    onUpdateProject({ 
        ...project, 
        players: players.filter(p => p.team !== teamToArchive),
        archivedTeams: newArchivedTeams
    });

    setTeamToArchive(null);
  };

  // Archive ALL teams to the recycle bin in one action (restorable from History)
  const confirmArchiveAllTeams = () => {
    if (teamListManagementData.length === 0) {
      setIsDeleteAllConfirmOpen(false);
      return;
    }

    const deletedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newArchives: ArchivedTeam[] = teamListManagementData.map(td => ({
      name: td.name,
      logo: td.players[0]?.teamLogo || td.logo || '',
      players: td.players,
      deletedAt
    }));

    onUpdateProject({
      ...project,
      players: [],
      archivedTeams: [...newArchives, ...deletedTeams]
    });

    setIsDeleteAllConfirmOpen(false);
  };

  const handleRestoreTeam = (team: ArchivedTeam) => {
      // Check if team name already exists to avoid merge conflicts visually
      const exists = players.some(p => p.team === team.name);
      if (exists) {
          alert(t('mpd.teamAlreadyExists').replace('{team}', team.name));
          return;
      }

      onUpdateProject({
          ...project,
          players: dropDefaultTeamsWhenRealExists([...players, ...team.players]),
          archivedTeams: deletedTeams.filter(t => t.name !== team.name)
      });
  };

  const handlePermanentDelete = (teamName: string) => {
      if(confirm(t('mpd.confirmDeletePermanent'))) {
          onUpdateProject({
              ...project,
              archivedTeams: deletedTeams.filter(t => t.name !== teamName)
          });
      }
  };

  const handleClosePlayerData = () => {
    setIsPlayerDataOpen(false);
    setEditingTeamName(null);
  };

  const handleSaveName = () => {
      onUpdateProject({ ...project, name: editedName });
      setIsEditingName(false);
  };

  const handleDownloadTemplate = () => {
    const headers = "TEAM NAME,TEAM ABBREVIATION,PLAYER NAME,ROLE,TOTAL KILLS,DAMAGE,ASSISTS,SURVIVAL TIME,PLAYER IMAGE URL,TEAM LOGO URL\n";
    const blob = new Blob([headers], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'BROHUBS_SYNC_TEMPLATE.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleStartSync = () => {
    if (!sheetId || !sheetKey) {
        alert(t('mpd.alertEnterSheetInfo'));
        return;
    }
    setIsSyncing(true);
    // Simulated handshake delay
    setTimeout(() => {
        setIsSyncing(false);
        setHasSynced(true);
    }, 2500);
  };

  // Render Halaman Manual Entry
  if (activeSubView === 'MANUAL_PAGE') {
    return (
      <div className="animate-in fade-in slide-in-from-right-8 duration-500 h-full flex flex-col font-inter">
        <header className="mb-10 flex flex-col">
            <button 
              onClick={() => setActiveSubView('MAIN')}
              className="flex items-center gap-2 text-[10px] font-black text-zinc-500 hover:text-[#ccff00] transition-all uppercase tracking-[0.2em] mb-4 w-fit"
            >
              <ArrowLeft size={14} /> {t('mpd.backToProject')}
            </button>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#ccff00] flex items-center justify-center text-black shadow-[0_0_20px_rgba(204,255,0,0.3)]">
                    <Users size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-[1000] italic text-white uppercase tracking-tighter leading-none mb-2">
                        {t('mpd.manualEntryWord1')} <span className="text-[#ccff00]">{t('mpd.manualEntryWord2')}</span>
                    </h1>
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">{t('mpd.playerRosterDatabase')}</p>
                </div>
              </div>

              {/* ACTION BUTTONS GROUP */}
              <div className="flex items-center gap-3">
                  {/* TEAM SLOT COUNT */}
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl"
                    title={t('mpd.teamSlotsHint')}
                  >
                    <Users size={14} className="text-zinc-500" />
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest hidden sm:block">{t('mpd.teamSlotsLabel')}</span>
                    <input
                      type="number"
                      min={1}
                      max={MAX_TEAM_SLOTS}
                      value={teamSlots}
                      onChange={(e) => handleChangeTeamSlots(Number(e.target.value))}
                      className="w-12 bg-black border border-white/10 rounded-lg px-2 py-1 text-center text-white text-[12px] font-black outline-none focus:border-[#ccff00]/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  {/* PLAYERS PER TEAM COUNT — jumlah pemain per tim default (dulu tetap 4) */}
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-2xl"
                    title={t('mpd.playersPerTeamHint')}
                  >
                    <UserPlus size={14} className="text-zinc-500" />
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest hidden sm:block">{t('mpd.playersPerTeamLabel')}</span>
                    <input
                      type="number"
                      min={1}
                      max={MAX_PLAYERS_PER_DEFAULT_TEAM}
                      value={playersPerTeam}
                      onChange={(e) => handleChangePlayersPerTeam(Number(e.target.value))}
                      className="w-12 bg-black border border-white/10 rounded-lg px-2 py-1 text-center text-white text-[12px] font-black outline-none focus:border-[#ccff00]/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  {/* DELETE ALL BUTTON — hanya saat ada data nyata (bukan template default) */}
                  {teamListManagementData.length > 0 && !isPristineDefaultRoster(players) && (
                    <button
                      onClick={() => setIsDeleteAllConfirmOpen(true)}
                      className="flex items-center gap-2 px-5 py-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:border-red-500 hover:text-white text-red-500 rounded-2xl transition-all uppercase tracking-widest text-[10px] font-black active:scale-95"
                      title={t('mpd.deleteAllTeamsTitle')}
                    >
                      <Trash2 size={16} />
                      {t('mpd.deleteAllTeams')}
                    </button>
                  )}

                  {/* HISTORY BUTTON */}
                  <button
                    onClick={() => setIsHistoryOpen(true)}
                    className="relative group flex items-center justify-center w-14 h-14 bg-zinc-900 border border-white/10 hover:border-white/30 rounded-2xl transition-all"
                    title={t('mpd.deletedTeamsHistory')}
                  >
                    <History size={20} className="text-zinc-500 group-hover:text-white transition-colors" />
                    {deletedTeams.length > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-black text-white border-2 border-black">
                            {deletedTeams.length}
                        </div>
                    )}
                  </button>

                  {/* ADD TEAM BUTTON */}
                  <button 
                    onClick={() => setIsPlayerDataOpen(true)}
                    className="group flex items-center gap-4 bg-[#ccff00] hover:bg-[#ddff33] text-black px-6 py-3 rounded-2xl transition-all shadow-[0_0_30px_rgba(204,255,0,0.2)] active:scale-95"
                  >
                    <div className="w-8 h-8 rounded-lg bg-black/10 flex items-center justify-center">
                        <UserPlus size={16} strokeWidth={3} />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-[1000] uppercase tracking-widest leading-none mb-1">{t('mpd.addNewTeam')}</p>
                      <p className="text-[6px] font-black opacity-60 uppercase tracking-widest">{t('mpd.inputManualRoster')}</p>
                    </div>
                  </button>
              </div>
            </div>
        </header>

        {/* COMPACT HORIZONTAL LIST OF TEAMS */}
        <div className="flex flex-col gap-4 pb-20 px-2 sm:px-0">
            {teamListManagementData.length > 0 && (
                <div className="hidden md:grid grid-cols-12 px-6 py-2 text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em] border-b border-white/5 mb-2">
                    <div className="col-span-1">{t('mpd.colLogo')}</div>
                    <div className="col-span-4">{t('mpd.colTeamIdentity')}</div>
                    <div className="col-span-3">{t('mpd.colRosterCount')}</div>
                    <div className="col-span-4 text-right">{t('mpd.colControls')}</div>
                </div>
            )}

            {teamListManagementData.map((team, idx) => (
                <div key={idx} className="flex flex-col md:grid md:grid-cols-12 items-start md:items-center bg-zinc-900/30 border border-white/5 p-4 md:p-3 rounded-2xl md:rounded-2xl hover:border-white/20 transition-all group overflow-hidden relative gap-4 md:gap-0">
                    {/* Logo & Identity Row (Mobile) / Logo Column (Desktop) */}
                    <div className="flex md:col-span-1 items-center gap-4 md:gap-0 md:justify-center w-full md:w-auto">
                        <div className="w-12 h-12 md:w-10 md:h-10 rounded-xl bg-black border border-white/5 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                            {team.logo ? (
                                <img src={team.logo} className="w-full h-full object-contain p-1.5" />
                            ) : (
                                <Shield size={16} className="text-zinc-800" />
                            )}
                        </div>
                        <div className="md:hidden">
                            <h3 className="text-base font-black text-white uppercase tracking-tight leading-none truncate">{team.name}</h3>
                            <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-1.5">{t('mpd.verifiedNode')}</p>
                        </div>
                    </div>
                    
                    {/* Team Info Column (Desktop Only) */}
                    <div className="hidden md:block md:col-span-4">
                        <h3 className="text-sm font-black text-white uppercase tracking-tight leading-none truncate">{team.name}</h3>
                        <p className="text-[7px] font-bold text-zinc-600 uppercase tracking-widest mt-1">{t('mpd.verifiedNode')}</p>
                    </div>

                    {/* Roster Column */}
                    <div className="md:col-span-3 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                        <div className="flex items-center justify-between md:justify-start gap-3">
                            <div className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[9px] font-black uppercase tracking-widest">
                                {t('mpd.playerCount').replace('{n}', String(team.players.length))}
                            </div>
                            <div className="flex -space-x-2">
                                {team.players.slice(0, 5).map((p, i) => (
                                    <div key={i} className="w-6 h-6 md:w-6 md:h-6 rounded-full border border-black bg-zinc-800 overflow-hidden shadow-lg">
                                        {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Users size={12} className="m-auto text-zinc-600 h-full w-full p-1.5" />}
                                    </div>
                                ))}
                                {team.players.length > 5 && (
                                    <div className="w-6 h-6 md:w-6 md:h-6 rounded-full border border-black bg-zinc-900 flex items-center justify-center text-[7px] font-black text-zinc-500 shadow-lg">
                                        +{team.players.length - 5}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Controls Column */}
                    <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
                        <button 
                            onClick={() => handleEditTeamFromDB(team.name)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 md:px-4 py-3 md:py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] md:text-[9px] font-black text-white hover:bg-[#ccff00] hover:text-black hover:border-[#ccff00] transition-all uppercase tracking-widest"
                        >
                            <Edit3 size={14} className="md:w-3 md:h-3" />
                            {t('mpd.editTeamBtn')}
                        </button>
                        <button 
                            onClick={() => handleArchiveTeam(team.name)}
                            className="w-12 h-12 md:w-10 md:h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shrink-0"
                            title={t('mpd.archiveTeamTitle')}
                        >
                            <Trash2 size={18} className="md:w-4 md:h-4" />
                        </button>
                    </div>
                </div>
            ))}

            {teamListManagementData.length === 0 && (
                <div className="py-32 flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-white/5 rounded-[40px] bg-zinc-900/10">
                    <Database size={48} className="text-zinc-700 mb-4" />
                    <p className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500">{t('mpd.noTeamDataLoaded')}</p>
                </div>
            )}
        </div>

        {/* TEAM HISTORY MODAL */}
        {isHistoryOpen && (
            <div className="fixed inset-0 z-[180] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-in fade-in" onClick={() => setIsHistoryOpen(false)} />
                <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[32px] overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 shadow-2xl">
                    <div className="p-8 border-b border-white/5 flex justify-between items-center bg-zinc-950/50">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-500">
                                <History size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black italic text-white uppercase tracking-tighter">{t('mpd.archivedTeams')}</h3>
                                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{t('mpd.recycleBin')}</p>
                            </div>
                        </div>
                        <button onClick={() => setIsHistoryOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                        {deletedTeams.length === 0 ? (
                            <div className="py-12 text-center opacity-30">
                                <Trash2 size={32} className="mx-auto mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest">{t('mpd.binIsEmpty')}</p>
                            </div>
                        ) : (
                            deletedTeams.map((team, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-zinc-900/40 border border-white/5 p-4 rounded-2xl group hover:border-white/10 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-black border border-white/5 flex items-center justify-center p-1">
                                            {team.logo ? <img src={team.logo} className="w-full h-full object-contain" /> : <Shield size={16} className="text-zinc-800" />}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-white uppercase tracking-tight">{team.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{t('mpd.playerCount').replace('{n}', String(team.players.length))}</span>
                                                <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-widest">&bull;</span>
                                                <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{t('mpd.deletedAt').replace('{time}', team.deletedAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleRestoreTeam(team)}
                                            className="flex items-center gap-2 px-4 py-2 bg-[#ccff00]/10 border border-[#ccff00]/20 rounded-xl text-[9px] font-black text-[#ccff00] uppercase tracking-widest hover:bg-[#ccff00] hover:text-black transition-all"
                                        >
                                            <RotateCcw size={12} /> {t('mpd.restore')}
                                        </button>
                                        <button 
                                            onClick={() => handlePermanentDelete(team.name)}
                                            className="p-2.5 rounded-xl bg-red-500/5 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                            title={t('mpd.deleteForever')}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* CONFIRMATION POPUP FOR DELETION */}
        {teamToArchive && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setTeamToArchive(null)} />
                <div className="relative w-full max-w-md bg-[#050505] border border-red-500/20 rounded-[40px] p-10 animate-in zoom-in-95 duration-300 shadow-[0_0_80px_rgba(239,68,68,0.1)] flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 text-red-500">
                        <AlertTriangle size={40} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">
                        {t('mpd.confirmDeletionTitle')}
                    </h2>
                    <p className="text-[10px] font-black text-zinc-600 tracking-[0.2em] uppercase mb-8 leading-relaxed max-w-[280px]">
                        {t('mpd.confirmDeletionBody').replace('{team}', teamToArchive ?? '')}
                    </p>
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <button
                            onClick={() => setTeamToArchive(null)}
                            className="py-5 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-all text-[10px] font-black tracking-[0.2em] uppercase"
                        >
                            {t('mpd.cancel')}
                        </button>
                        <button
                            onClick={confirmArchiveTeam}
                            className="py-5 rounded-2xl bg-red-600 text-white font-black text-[10px] tracking-[0.2em] uppercase shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:scale-105 transition-all"
                        >
                            {t('mpd.yesDelete')}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* CONFIRMATION POPUP FOR DELETE ALL */}
        {isDeleteAllConfirmOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsDeleteAllConfirmOpen(false)} />
                <div className="relative w-full max-w-md bg-[#050505] border border-red-500/20 rounded-[40px] p-10 animate-in zoom-in-95 duration-300 shadow-[0_0_80px_rgba(239,68,68,0.1)] flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 text-red-500">
                        <AlertTriangle size={40} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-2">
                        {t('mpd.confirmDeleteAllTitle')}
                    </h2>
                    <p className="text-[10px] font-black text-zinc-600 tracking-[0.2em] uppercase mb-8 leading-relaxed max-w-[280px]">
                        {t('mpd.confirmDeleteAllBody').replace('{count}', String(teamListManagementData.length))}
                    </p>
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <button
                            onClick={() => setIsDeleteAllConfirmOpen(false)}
                            className="py-5 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white transition-all text-[10px] font-black tracking-[0.2em] uppercase"
                        >
                            {t('mpd.cancel')}
                        </button>
                        <button
                            onClick={confirmArchiveAllTeams}
                            className="py-5 rounded-2xl bg-red-600 text-white font-black text-[10px] tracking-[0.2em] uppercase shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:scale-105 transition-all"
                        >
                            {t('mpd.yesDeleteAll')}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* RE-RENDER MODAL IN SUBVIEW CONTEXT */}
        {isPlayerDataOpen && (
          <PlayerDataManagement 
            players={players} 
            editTeamName={editingTeamName}
            onUpdatePlayers={handleUpdatePlayers}
            onClose={handleClosePlayerData} 
          />
        )}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-right-8 duration-500 h-full flex flex-col font-inter">
      {/* HERO BANNER SECTION */}
      <div className="relative w-full h-[320px] rounded-[40px] overflow-hidden group shadow-2xl mb-12 border border-white/5 bg-[#0a0a0a]">
        <img 
          src={BHS_DARK_GUN_BANNER} 
          alt={t('mpd.projectHeroAlt')}
          className="w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-1000 grayscale-[0.2]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        
        <div className="absolute top-8 left-8 z-20">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-black text-white hover:bg-black/60 transition-all uppercase tracking-widest"
          >
            <ArrowLeft size={14} strokeWidth={3} />
            <span>{t('mpd.backTerminal')}</span>
          </button>
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10 px-6">
           <div className="flex items-center gap-2 px-3 py-1 bg-[#ccff00] text-black rounded font-black text-[9px] tracking-widest uppercase mb-4 shadow-[0_0_15px_rgba(204,255,0,0.3)]">
             <Gamepad2 size={12} fill="black" />
             {project.gameTitle || 'PUBG MOBILE'}
           </div>
           <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-[1000] text-white tracking-tighter uppercase leading-none mb-3 drop-shadow-[0_10px_30px_rgba(0,0,0,1)] flex items-center gap-4 justify-center">
             {isEditingName ? (
                 <input 
                     value={editedName} 
                     onChange={(e) => setEditedName(e.target.value)}
                     className="bg-transparent text-white border-b border-white outline-none w-full text-center"
                 />
             ) : (
                 project.name
             )}
             <button 
                 onClick={() => isEditingName ? handleSaveName() : setIsEditingName(true)}
                 className="text-zinc-500 hover:text-[#ccff00] transition-colors"
             >
                 {isEditingName ? <CheckCircle2 size={32} /> : <Edit3 size={32} />}
             </button>
           </h1>
           <p className="text-zinc-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] opacity-80 max-w-lg mb-4 md:mb-0">
             {project.description || t('mpd.defaultDescription')}
           </p>
        </div>

        <div className="absolute bottom-8 right-8 z-20 flex flex-col items-end gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-black text-white hover:bg-[#ccff00] hover:text-black hover:border-[#ccff00] transition-all uppercase tracking-widest group/cover shadow-2xl">
            <Upload size={14} className="group-hover/cover:scale-110 transition-transform" />
            <span>{t('mpd.changeCover')}</span>
          </button>
          <div className="px-3 py-1 rounded bg-black/40 backdrop-blur-sm border border-white/5">
             <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{t('mpd.recResolution')}</p>
          </div>
        </div>
      </div>

      {/* ACTION BAR: DATA MANAGEMENT */}
      <div className="flex items-center gap-4 mb-8 px-4 overflow-x-auto no-scrollbar pb-2">
          {/* Input Button: Manual */}
          <button 
            onClick={() => setActiveSubView('MANUAL_PAGE')}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-zinc-900 border border-white/5 hover:border-[#ccff00]/40 transition-all group shadow-xl shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-[#ccff00]/10 border border-[#ccff00]/20 flex items-center justify-center text-[#ccff00] group-hover:scale-110 transition-transform">
              <Users size={16} />
            </div>
            <div className="text-left min-w-[120px]">
              <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none mb-1">{t('mpd.dataPemain')}</p>
              <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{t('mpd.halamanInputData')}</p>
            </div>
            <ArrowRight size={14} className="text-zinc-700 group-hover:text-[#ccff00] transition-colors ml-2" />
          </button>

          {/* Input Button: IP Connect */}
          <button 
            onClick={() => setIsIpModalOpen(true)}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-zinc-900 border border-white/5 hover:border-purple-500/40 transition-all group shadow-xl shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
              <Server size={16} />
            </div>
            <div className="text-left min-w-[120px]">
              <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none mb-1">{t('mpd.ipConnect')}</p>
              <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{t('mpd.gameDeveloperLink')}</p>
            </div>
            <Wifi size={14} className="text-zinc-700 group-hover:text-purple-500 transition-colors ml-2" />
          </button>

          {/* Input Button: Google Sheets */}
          <button 
            onClick={() => setIsSheetsModalOpen(true)}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-zinc-900 border border-white/5 hover:border-green-500/40 transition-all group shadow-xl shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
              <FileSpreadsheet size={16} />
            </div>
            <div className="text-left min-w-[120px]">
              <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none mb-1">{t('mpd.googleSheets')}</p>
              <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{t('mpd.syncExternalData')}</p>
            </div>
            <Link size={14} className="text-zinc-700 group-hover:text-green-500 transition-colors ml-2" />
          </button>

          <div className="h-10 w-px bg-white/5 mx-2 shrink-0" />

          {/* Database View Button */}
          <button 
            onClick={() => setIsTeamListOpen(true)}
            disabled={teamCount === 0}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all shadow-xl group shrink-0 ${
              teamCount > 0 
              ? 'bg-zinc-900 border-white/10 hover:border-blue-500/40 cursor-pointer' 
              : 'bg-zinc-950 border-white/5 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${teamCount > 0 ? 'bg-blue-500/10 border border-blue-500/20 text-blue-500' : 'bg-white/5 text-zinc-600'}`}>
              <Shield size={16} />
            </div>
            <div className="text-left min-w-[100px]">
              <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${teamCount > 0 ? 'text-white' : 'text-zinc-600'}`}>{t('mpd.dataTeam')}</p>
              <p className={`text-[8px] font-bold uppercase tracking-widest ${teamCount > 0 ? 'text-blue-500' : 'text-zinc-800'}`}>
                {teamCount > 0 ? t('mpd.teamsSaved').replace('{n}', String(teamCount)) : t('mpd.noData')}
              </p>
            </div>
            {teamCount > 0 && <ChevronRight size={14} className="text-zinc-700 group-hover:text-blue-500 transition-colors ml-2" />}
          </button>
      </div>

      {/* DEPLOYED NODE FILES SECTION */}
      <section className="px-4 flex-1">
        <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-[12px] font-black text-zinc-500 tracking-[0.5em] uppercase">{t('mpd.deployedNodeFiles')}</h2>
            <div className="px-2.5 py-1 rounded bg-[#ccff00]/10 border border-[#ccff00]/20 text-[#ccff00] text-[9px] font-black shadow-[0_0_15px_#ccff0022]">
                {t('mpd.activeCount').replace('{n}', String(deployedFiles.length))}
            </div>
          </div>
          <div className="h-[1px] flex-1 bg-zinc-900 mx-8" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 pb-32">
          {deployedFiles.map((file) => (
            <div 
              key={file.id}
              onClick={() => onOpenAsset(file)}
              className="group relative bg-zinc-900/20 border border-white/5 rounded-[32px] p-8 flex flex-col items-center text-center hover:border-[#ccff00]/40 hover:bg-zinc-900/40 transition-all cursor-pointer shadow-[0_15px_30px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform group-hover:bg-[#ccff00]/5 group-hover:border-[#ccff00]/20">
                <FileText size={32} className="text-zinc-700 group-hover:text-[#ccff00] transition-colors" />
              </div>
              <h4 className="text-md font-black text-white uppercase tracking-tight mb-1 group-hover:text-[#ccff00] transition-colors">{file.name}</h4>
              <p className="text-[9px] font-black text-zinc-700 tracking-widest uppercase">{file.type}</p>
              <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button 
                    onClick={(e) => { e.stopPropagation(); onRemoveAsset(file.id); }}
                    className="p-2 rounded-xl bg-red-500/5 text-zinc-800 hover:bg-red-500 hover:text-white transition-all border border-transparent hover:border-red-500/20 shadow-xl"
                 ><Trash2 size={14} /></button>
              </div>
            </div>
          ))}

          <button 
            onClick={onDeployNode}
            className="group border-2 border-dashed border-white/5 bg-transparent rounded-[32px] p-8 flex flex-col items-center justify-center hover:border-zinc-700 hover:bg-white/[0.02] transition-all min-h-[240px]"
          >
             <div className="w-14 h-14 rounded-full border border-white/5 flex items-center justify-center mb-5 group-hover:border-[#ccff00]/30 transition-colors">
                <Plus size={24} className="text-zinc-800 group-hover:text-[#ccff00]" />
             </div>
             <span className="text-[10px] font-black text-zinc-800 tracking-[0.2em] uppercase group-hover:text-zinc-500 transition-colors">{t('mpd.deployNewNode')}</span>
          </button>
        </div>
      </section>

      {/* Modal Management */}
      {isPlayerDataOpen && (
        <PlayerDataManagement 
          players={players} 
          editTeamName={editingTeamName}
          onUpdatePlayers={handleUpdatePlayers}
          onClose={handleClosePlayerData} 
        />
      )}

      {isTeamListOpen && (
        <TeamListManagement 
          players={players}
          onUpdatePlayers={handleUpdatePlayers}
          onEditTeam={handleEditTeamFromDB}
          onArchiveTeam={handleArchiveTeam} // Pass archive handler here
          onClose={() => setIsTeamListOpen(false)}
        />
      )}

      {/* IP Connect & Sheets Modals (same as before) */}
      {isIpModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-in fade-in" onClick={() => setIsIpModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#0a0a0a] border border-purple-500/30 rounded-[48px] p-10 shadow-2xl animate-in zoom-in-95">
            <button onClick={() => setIsIpModalOpen(false)} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-2"><Wifi size={14} className="text-purple-500 animate-pulse"/><span className="text-[10px] font-black text-zinc-500 tracking-[0.4em] uppercase">{t('mpd.devLinkTag')}</span></div>
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{t('mpd.ipConnectWord1')} <span className="text-purple-500">{t('mpd.ipConnectWord2')}</span></h2>
            </div>
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-600 tracking-widest uppercase ml-4">{t('mpd.serverIpLabel')}</label>
                    <input type="text" placeholder="192.168.1.100:8080" className="w-full bg-[#111] border border-white/5 rounded-3xl px-6 py-4 text-white placeholder:text-zinc-800 outline-none focus:border-purple-500/30 transition-all font-bold text-lg" />
                </div>
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-600 tracking-widest uppercase ml-4">{t('mpd.accessTokenLabel')}</label>
                    <input type="password" placeholder="••••••••••••" className="w-full bg-[#111] border border-white/5 rounded-3xl px-6 py-4 text-white placeholder:text-zinc-800 outline-none focus:border-purple-500/30 transition-all font-bold text-lg" />
                </div>
                <button className="w-full bg-purple-600 text-white py-5 rounded-[24px] font-black text-xs tracking-[0.2em] uppercase hover:bg-purple-500 transition-all shadow-[0_0_30px_rgba(168,85,247,0.3)] mt-4">{t('mpd.establishHandshake')}</button>
            </div>
          </div>
        </div>
      )}

      {isSheetsModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-in fade-in" onClick={() => setIsSheetsModalOpen(false)} />
          
          <div className="relative w-full max-w-5xl bg-[#0a0a0a] border border-green-500/20 rounded-[48px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 flex flex-col max-h-[95vh]">
            <button onClick={() => setIsSheetsModalOpen(false)} className="absolute top-8 right-8 z-30 text-zinc-500 hover:text-white transition-colors"><X size={28} /></button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 h-full overflow-hidden">
                {/* CONFIGURATION COLUMN */}
                <div className="p-10 border-r border-white/5 flex flex-col h-full overflow-hidden">
                    <div className="mb-6 shrink-0">
                        <div className="flex items-center gap-2 mb-2">
                            <FileSpreadsheet size={16} className="text-green-500"/>
                            <span className="text-[10px] font-black text-zinc-500 tracking-[0.4em] uppercase">{t('mpd.syncCoreTag')}</span>
                        </div>
                        <h2 className="text-3xl font-[1000] text-white italic uppercase tracking-tighter leading-none mb-1">{t('mpd.googleSheetsWord1')} <span className="text-green-500">{t('mpd.googleSheetsWord2')}</span></h2>
                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest leading-relaxed">{t('mpd.sheetsSubtitle')}</p>
                    </div>

                    <div className="space-y-4 shrink-0">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-zinc-600 tracking-widest uppercase ml-4 flex items-center gap-2">
                                <Key size={10} className="text-green-500" /> {t('mpd.googleApiKeyLabel')}
                            </label>
                            <input
                                type="password"
                                value={sheetKey}
                                onChange={(e) => setSheetKey(e.target.value)}
                                placeholder={t('mpd.enterApiKeyPlaceholder')}
                                className="w-full bg-zinc-900 border border-white/5 rounded-3xl px-6 py-4 text-white placeholder:text-zinc-800 outline-none focus:border-green-500/30 transition-all font-mono text-sm" 
                            />
                        </div>

                        <div className="space-y-2 relative">
                            <label className="text-[9px] font-black text-zinc-600 tracking-widest uppercase ml-4 flex items-center gap-2">
                                <Link size={10} className="text-green-500" /> {t('mpd.spreadsheetUrlLabel')}
                            </label>
                            <input 
                                type="text" 
                                value={sheetId}
                                onChange={(e) => setSheetId(e.target.value)}
                                placeholder="https://docs.google.com/spreadsheets/d/..." 
                                className="w-full bg-zinc-900 border border-white/5 rounded-3xl px-6 py-4 pr-20 text-white placeholder:text-zinc-800 outline-none focus:border-green-500/30 transition-all font-bold text-xs" 
                            />
                            <button className="absolute right-2 bottom-2 bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">
                                {t('mpd.add')}
                            </button>
                        </div>
                    </div>

                    {/* REAL-TIME INFORMATION FEED */}
                    <div className="mt-6 flex-1 flex flex-col bg-black/40 border border-white/5 rounded-[32px] p-6 overflow-hidden min-h-[200px]">
                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <div className="flex items-center gap-2">
                                <Activity size={14} className={isSyncing ? "text-[#ccff00] animate-pulse" : "text-zinc-600"} />
                                <span className="text-[9px] font-black text-zinc-500 tracking-widest uppercase">{t('mpd.realtimeFeed')}</span>
                            </div>
                            {hasSynced && (
                                <div className="flex items-center gap-1 text-[8px] font-black text-[#ccff00]">
                                    <CheckCircle2 size={10} /> {t('mpd.connected')}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                            {isSyncing ? (
                                <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50">
                                    <RefreshCw size={24} className="animate-spin text-green-500" />
                                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{t('mpd.pollingDataStream')}</p>
                                </div>
                            ) : hasSynced ? (
                                <>
                                    {[
                                        { time: '14:20:01', msg: 'UPLINK ESTABLISHED' },
                                        { time: '14:20:02', msg: 'PARSING SHEET HEADERS...' },
                                        { time: '14:20:03', msg: 'FOUND 16 TEAMS, 64 PLAYERS' },
                                        { time: '14:20:05', msg: 'AUTO-SYNC ACTIVE (5S INTERVAL)' },
                                        { time: '14:20:10', msg: 'STREAMING ROW: [RYZEN, BTR RA]' },
                                        { time: '14:20:15', msg: 'STREAMING ROW: [ZUXXY, BTR RA]' },
                                        { time: '14:20:20', msg: 'BUFFER STATUS: NOMINAL' },
                                    ].map((log, i) => (
                                        <div key={i} className="flex gap-4 font-mono text-[9px] border-b border-white/[0.02] pb-1.5 last:border-0">
                                            <span className="text-zinc-600 shrink-0">{log.time}</span>
                                            <span className="text-[#ccff00] truncate">{log.msg}</span>
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-6">
                                    <Zap size={24} className="mb-3" />
                                    <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{t('mpd.awaitingHandshake')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-6 shrink-0">
                        <button 
                            onClick={handleStartSync}
                            disabled={isSyncing}
                            className={`w-full bg-green-600 text-white py-5 rounded-[32px] font-black text-sm tracking-[0.3em] uppercase hover:bg-green-500 transition-all shadow-[0_0_40px_rgba(34,197,94,0.3)] hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSyncing ? (
                                <><RefreshCw size={18} className="animate-spin" /> {t('mpd.synchronizing')}</>
                            ) : hasSynced ? t('mpd.reinitializeUplink') : t('mpd.initializeHandshake')}
                        </button>
                    </div>
                </div>

                {/* USER GUIDE & TEMPLATE COLUMN */}
                <div className="bg-zinc-900/50 p-10 flex flex-col h-full overflow-y-auto custom-scrollbar">
                    <div className="flex items-center gap-3 mb-10 shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500">
                            <HelpCircle size={22} />
                        </div>
                        <div>
                            <h3 className="text-md font-black text-white uppercase tracking-widest leading-none mb-1">{t('mpd.userGuide')}</h3>
                            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{t('mpd.howToSyncData')}</p>
                        </div>
                    </div>

                    {/* Step by Step Guide */}
                    <div className="space-y-8 flex-1">
                        <div className="space-y-4">
                            <div className="flex gap-5">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-[10px] font-black text-green-500 shrink-0">01</div>
                                <div className="space-y-2">
                                    <h4 className="text-[11px] font-black text-white uppercase tracking-widest">{t('mpd.step1Title')}</h4>
                                    <p className="text-[9px] text-zinc-500 leading-relaxed uppercase font-medium">{t('mpd.step1Desc')}</p>
                                    <button
                                        onClick={handleDownloadTemplate}
                                        className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all mt-2"
                                    >
                                        <Download size={14} /> {t('mpd.downloadTemplateBtn')}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-5">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-[10px] font-black text-green-500 shrink-0">02</div>
                                <div className="space-y-2">
                                    <h4 className="text-[11px] font-black text-white uppercase tracking-widest">{t('mpd.step2Title')}</h4>
                                    <p className="text-[9px] text-zinc-500 leading-relaxed uppercase font-medium">{t('mpd.step2Desc')}</p>
                                </div>
                            </div>

                            <div className="flex gap-5">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-[10px] font-black text-green-500 shrink-0">03</div>
                                <div className="space-y-2">
                                    <h4 className="text-[11px] font-black text-white uppercase tracking-widest">{t('mpd.step3Title')}</h4>
                                    <p className="text-[9px] text-zinc-500 leading-relaxed uppercase font-medium">{t('mpd.step3Desc')}</p>
                                </div>
                            </div>

                            <div className="flex gap-5">
                                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-[10px] font-black text-green-500 shrink-0">04</div>
                                <div className="space-y-2">
                                    <h4 className="text-[11px] font-black text-white uppercase tracking-widest">{t('mpd.step4Title')}</h4>
                                    <p className="text-[9px] text-zinc-500 leading-relaxed uppercase font-medium">{t('mpd.step4Desc')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-green-500/5 border border-green-500/10 rounded-[32px] flex items-start gap-4">
                            <Info size={18} className="text-green-500 mt-0.5 shrink-0" />
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">{t('mpd.proTip')}</p>
                                <p className="text-[9px] font-medium text-green-500/70 uppercase tracking-widest leading-relaxed">{t('mpd.proTipDesc')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(204, 255, 0, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(204, 255, 0, 0.4);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default MemberProjectDetailsView;