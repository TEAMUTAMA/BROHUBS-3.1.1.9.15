import React, { useState, useEffect } from 'react';
import {
  X, Plus, User, Shield, ImageIcon, Trash2, Save, Upload,
  AlertCircle, CheckCircle2, Edit3, Info, RotateCcw,
  FileSpreadsheet, Download, ClipboardCheck, Lock
} from 'lucide-react';
import { PlayerData } from '@/types';
import { useT } from '@/i18n/LanguageContext';
import { compressImage, LOGO_PRESET, PHOTO_PRESET } from '@/lib/imageCompression';

interface PlayerDataManagementProps {
  players: PlayerData[];
  editTeamName?: string | null;
  onUpdatePlayers: (players: PlayerData[]) => void;
  onClose: () => void;
}

interface PlayerEntry {
  id: string;
  name: string;
  image: string;
  team?: string;
  teamAbbreviation?: string;
  teamLogo?: string;
  role?: string;
  kills?: number;
  damage?: number;
  assists?: number;
  survivalTime?: string;
}

// Global CSV Parser Utility
function parseCSV(text: string) {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return [];

  // Parse headers
  const headers = parseCSVLine(lines[0]);
  const data: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const obj: any = {};
    headers.forEach((header, index) => {
      const cleanHeader = header.trim().toUpperCase().replace(/["']/g, '');
      const value = values[index] ? values[index].trim().replace(/^["']|["']$/g, '') : '';
      obj[cleanHeader] = value;
    });
    data.push(obj);
  }
  return data;
}

function parseCSVLine(line: string) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

const PlayerDataManagement: React.FC<PlayerDataManagementProps> = ({ players, editTeamName, onUpdatePlayers, onClose }) => {
  const t = useT();
  const [teamName, setTeamName] = useState('');
  const [teamAbbreviation, setTeamAbbreviation] = useState('');
  const [teamLogo, setTeamLogo] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [playerEntries, setPlayerEntries] = useState<PlayerEntry[]>([
    { id: Math.random().toString(36).substring(7), name: '', image: '' }
  ]);

  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'MANUAL' | 'BULK_TEXT' | 'IMPORT_EXCEL'>('MANUAL');
  const [bulkText, setBulkText] = useState('');
  const [appendMode, setAppendMode] = useState<boolean>(true);
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    if (editTeamName) {
      const existingTeamPlayers = players.filter(p => p.team === editTeamName);
      if (existingTeamPlayers.length > 0) {
        setTeamName(editTeamName);
        setTeamLogo(existingTeamPlayers[0].teamLogo || '');
        setTeamAbbreviation(existingTeamPlayers[0].teamAbbreviation || '');
        setPlayerEntries(existingTeamPlayers.map(p => ({
          id: p.id,
          name: p.name,
          image: p.image || '',
          team: p.team,
          teamAbbreviation: p.teamAbbreviation,
          role: p.role,
          kills: p.kills,
          damage: p.damage,
          assists: p.assists,
          survivalTime: p.survivalTime
        })));
      }
    }
  }, [editTeamName, players]);

  // Handle Team Edit in grouped list
  const handleTeamEdit = (oldTeam: string, field: 'team' | 'teamAbbreviation' | 'teamLogo', value: string) => {
    setPlayerEntries(playerEntries.map(p => p.team === oldTeam ? { ...p, [field]: value } : p));
  };

  const handleAddPlayer = () => {
    setPlayerEntries([...playerEntries, { id: Math.random().toString(36).substring(7), name: '', image: '' }]);
  };

  const handleRemovePlayer = (id: string) => {
    if (playerEntries.length > 1) {
      setPlayerEntries(playerEntries.filter(p => p.id !== id));
    } else {
      setPlayerEntries([{ id: Math.random().toString(36).substring(7), name: '', image: '' }]);
    }
  };

  const updatePlayerEntry = (id: string, field: keyof PlayerEntry, value: any) => {
    setPlayerEntries(playerEntries.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, id: string | 'team') => {
    const file = e.target.files?.[0];
    if (file) {
      // Batas wajar untuk file mentah; kompresi menangani penyusutan ukuran setelahnya.
      if (file.size > 1024 * 1024 * 20) {
        alert(t('pdm.imageTooLarge'));
        return;
      }
      const preset = id === 'team' ? LOGO_PRESET : PHOTO_PRESET;
      void compressImage(file, preset).then((result) => {
        if (id === 'team') setTeamLogo(result);
        else updatePlayerEntry(id, 'image', result);
      });
    }
  };

  const resetImage = (id: string | 'team') => {
    if (id === 'team') setTeamLogo('');
    else updatePlayerEntry(id, 'image', '');
  };

  const resetForm = () => {
    if (editTeamName) onClose();
    else {
      setTeamName('');
      setTeamAbbreviation('');
      setTeamLogo('');
      setPlayerEntries([{ id: Math.random().toString(36).substring(7), name: '', image: '' }]);
      setIsSaved(false);
      setBulkText('');
      setImportFeedback(null);
    }
  };

  const handleDeploy = () => {
    if (editTeamName && !teamName.trim()) {
      alert(t('pdm.alertEnterTeamName'));
      return;
    }

    let hasTeamValidationError = false;
    const processedPlayers: PlayerData[] = playerEntries
      .filter(p => p.name.trim() !== '') 
      .map(p => {
        const resolvedTeam = (p.team && p.team.trim()) ? p.team.trim() : teamName.trim();
        if (!resolvedTeam) {
          hasTeamValidationError = true;
        }

        const resolvedTeamLogo = (p.teamLogo && p.teamLogo.trim()) ? p.teamLogo.trim() : teamLogo;
        const resolvedTeamAbbreviation = (p.teamAbbreviation && p.teamAbbreviation.trim()) ? p.teamAbbreviation.trim() : teamAbbreviation.trim();

        return {
          id: p.id,
          name: p.name.trim().toUpperCase(),
          team: resolvedTeam.toUpperCase(),
          teamAbbreviation: resolvedTeamAbbreviation.toUpperCase(),
          teamLogo: resolvedTeamLogo,
          image: p.image,
          role: p.role || 'PLAYER',
          kills: typeof p.kills === 'number' ? p.kills : 0,
          damage: typeof p.damage === 'number' ? p.damage : 0,
          assists: typeof p.assists === 'number' ? p.assists : 0,
          survivalTime: p.survivalTime || '00:00'
        };
      });

    if (hasTeamValidationError) {
      alert(t('pdm.alertEnterTeamNameAll'));
      return;
    }

    if (processedPlayers.length === 0) {
      alert(t('pdm.alertAddPlayer'));
      return;
    }

    if (editTeamName) {
      const otherPlayers = players.filter(p => p.team !== editTeamName);
      onUpdatePlayers([...otherPlayers, ...processedPlayers]);
    } else {
      // Find all unique teams inside processed Players batch
      const importedTeamNames = Array.from(new Set(processedPlayers.map(p => p.team)));
      // Filter out existing players belonging to those specific teams to avoid duplicates
      const otherPlayers = players.filter(p => !importedTeamNames.includes(p.team));
      onUpdatePlayers([...otherPlayers, ...processedPlayers]);
    }
    setIsSaved(true);
    setTimeout(() => resetForm(), 1200);
  };

  // Bulk Text Area Process
  const parseAndApplyBulkText = () => {
    if (!bulkText.trim()) {
      alert(t('pdm.alertEnterNicknames'));
      return;
    }
    const names = bulkText
      .split(/[\n,]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (names.length === 0) {
      alert(t('pdm.alertNoValidPlayers'));
      return;
    }

    const newEntries: PlayerEntry[] = names.map(name => ({
      id: Math.random().toString(36).substring(7),
      name: name.toUpperCase(),
      image: '',
      role: 'PLAYER'
    }));

    if (appendMode) {
      const filteredCurrent = playerEntries.filter(p => p.name.trim() !== '');
      setPlayerEntries([...filteredCurrent, ...newEntries]);
    } else {
      setPlayerEntries(newEntries);
    }

    setBulkText('');
    setImportFeedback({ type: 'success', message: t('pdm.feedbackBulkSuccess').replace('{count}', String(names.length)) });
    setTimeout(() => {
      setImportFeedback(null);
      setActiveTab('MANUAL');
    }, 2000);
  };

  // CSV Template Exporter
  const downloadImportTemplate = () => {
    const headers = "TEAM NAME,TEAM ABBREVIATION,PLAYER NAME,ROLE,TOTAL KILLS,DAMAGE,ASSISTS,SURVIVAL TIME,PLAYER IMAGE URL,TEAM LOGO URL\n";
    const sampleRows = "BTR RA,BTR,RYZEN,PLAYER,12,2400,6,15:32,,https://images.unsplash.com/photo-1542751371-adc38448a05e\n" +
                       "BTR RA,BTR,ZUXXY,PLAYER,8,1800,9,18:10,,\n" +
                       "EVOS ESPORTS,EVOS,SABRE,PLAYER,14,3100,5,20:15,,https://images.unsplash.com/photo-1511512578047-dfb367046420\n" +
                       "EVOS ESPORTS,EVOS,VAMP,PLAYER,9,1950,8,18:40,,\n";
    const blob = new Blob([headers + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "BROHUBS_PLAYER_TEMPLATE.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel/CSV Importer Handler
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCSV(text);
        
        if (rows.length === 0) {
          setImportFeedback({ type: 'error', message: t('pdm.feedbackEmptyCSV') });
          return;
        }

        const newEntries: PlayerEntry[] = [];
        let autoTeamName = '';
        let autoTeamLogo = '';

        rows.forEach(row => {
          const name = row['PLAYER NAME'] || row['NICKNAME'] || row['NAME'] || row['PLAYER'] || Object.values(row)[1];
          if (!name || !String(name).trim()) return;

          const image =
            row['PLAYER IMAGE URL'] ||
            row['PLAYER PHOTO URL'] ||
            row['PHOTO URL'] ||
            row['FOTO PEMAIN'] ||
            row['LINK FOTO'] ||
            row['AVATAR URL'] ||
            row['AVATAR'] ||
            row['IMAGE'] ||
            row['PLAYER IMAGE'] ||
            '';
          const team = row['TEAM NAME'] || row['TEAM'] || Object.values(row)[0] || '';
          const teamAbbreviation = row['TEAM ABBREVIATION'] || row['ABBREVIATION'] || row['TAG'] || '';
          const role = row['ROLE'] || 'PLAYER';
          const kills = Number(row['TOTAL KILLS'] || row['KILLS'] || row['ELIMS'] || 0);
          const damage = Number(row['DAMAGE'] || row['DMG'] || 0);
          const assists = Number(row['ASSISTS'] || row['AST'] || 0);
          const survivalTime = row['SURVIVAL TIME'] || row['SURVIVAL_TIME'] || row['SURVIVAL'] || '00:00';
          const playerTeamLogo = row['TEAM LOGO URL'] || row['TEAM LOGO'] || row['LOGO'] || '';

          if (team && !autoTeamName) {
            autoTeamName = String(team).trim();
          }
          if (playerTeamLogo && !autoTeamLogo) {
            autoTeamLogo = String(playerTeamLogo).trim();
          }

          newEntries.push({
            id: Math.random().toString(36).substring(7),
            name: String(name).trim().toUpperCase(),
            image: String(image).trim(),
            team: String(team).trim(),
            teamAbbreviation: String(teamAbbreviation).trim(),
            teamLogo: String(playerTeamLogo).trim(),
            role: String(role).trim().toUpperCase(),
            kills: isNaN(kills) ? 0 : kills,
            damage: isNaN(damage) ? 0 : damage,
            assists: isNaN(assists) ? 0 : assists,
            survivalTime: String(survivalTime).trim()
          });
        });

        if (newEntries.length === 0) {
          setImportFeedback({ type: 'error', message: t('pdm.feedbackNoPlayerNames') });
          return;
        }

        if (autoTeamName && !teamName) {
          setTeamName(autoTeamName);
        }
        if (autoTeamLogo && !teamLogo) {
          setTeamLogo(autoTeamLogo);
        }

        if (appendMode) {
          const filteredCurrent = playerEntries.filter(p => p.name.trim() !== '');
          setPlayerEntries([...filteredCurrent, ...newEntries]);
        } else {
          setPlayerEntries(newEntries);
        }

        const uniqueTeamsInImport = Array.from(new Set(newEntries.map(p => p.team).filter(Boolean)));
        setImportFeedback({
          type: 'success',
          message: t('pdm.feedbackCSVSuccess')
            .replace('{players}', String(newEntries.length))
            .replace('{teams}', String(uniqueTeamsInImport.length))
            .replace('{teamNames}', uniqueTeamsInImport.join(', ').toUpperCase())
        });
        
        setTimeout(() => {
          setImportFeedback(null);
          setActiveTab('MANUAL');
        }, 3500);

      } catch (err) {
        setImportFeedback({ type: 'error', message: t('pdm.feedbackCSVError') });
      }
    };

    reader.readAsText(file);
  };

  const renderGroupedPlayerList = () => {
    // Group by team
    const grouped = playerEntries.reduce((acc, player) => {
      const team = player.team || 'NO TEAM';
      if (!acc[team]) {
        acc[team] = {
           name: team,
           logo: player.teamLogo || '',
           abbr: player.teamAbbreviation || '',
           players: []
        };
      }
      acc[team].players.push(player);
      return acc;
    }, {} as Record<string, { name: string, logo: string, abbr: string, players: PlayerEntry[] }>);

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
        {(Object.values(grouped) as any[]).map(teamData => (
          <div key={teamData.name} className="bg-zinc-900/40 border border-white/5 rounded-3xl p-4 flex flex-col gap-2 shadow-sm">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3 mb-1">
               {/* Team Logo Edit */}
               <label className="relative cursor-pointer group">
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => handleTeamEdit(teamData.name, 'teamLogo', reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }} />
                  {teamData.logo ? (
                      <img 
                        src={teamData.logo} 
                        className="w-8 h-8 rounded-full object-cover border border-white/20" 
                        alt="Logo" 
                        referrerPolicy="no-referrer"
                        onError={(e) => e.currentTarget.style.display = 'none'}
                      />
                  ) : (
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 font-black">+</div>
                  )}
               </label>
               <div className="flex-1">
                 <input className="text-white font-black text-xs uppercase tracking-wider bg-transparent w-full outline-none" value={teamData.name} onChange={e => handleTeamEdit(teamData.name, 'team', e.target.value)} />
                 <input className="text-[#ccff00] font-mono text-[10px] bg-transparent w-full outline-none" value={`[${teamData.abbr || '---'}]`} onChange={e => handleTeamEdit(teamData.name, 'teamAbbreviation', e.target.value.replace(/[\[\]]/g, ''))} />
                  <input className="text-zinc-500 font-mono text-[8px] bg-transparent w-full outline-none border-b border-transparent focus:border-white/10 focus:text-zinc-300 transition-colors mt-0.5" value={teamData.logo} onChange={e => handleTeamEdit(teamData.name, 'teamLogo', e.target.value)} placeholder={t('pdm.placeholderPasteLogoLink')} />
               </div>
            </div>
            {teamData.players.map(player => (
                <div key={player.id} className="flex items-center gap-2 text-zinc-300 font-bold text-[10px] uppercase">
                    <label className="relative cursor-pointer group">
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, player.id)} />
                        {player.image ? (
                           <img 
                             src={player.image} 
                             className="w-6 h-6 rounded-full object-cover border border-white/20" 
                             alt="Player" 
                             referrerPolicy="no-referrer"
                             onError={(e) => e.currentTarget.style.display = 'none'}
                           />
                        ) : (
                           <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 font-black">+</div>
                        )}
                    </label>
                    {editingPlayerId === player.id ? (
                        <div className="flex flex-col gap-1.5 flex-1 bg-black/50 p-2 rounded-lg border border-white/15">
                            <div className="flex items-center gap-1.5">
                                <span className="text-zinc-500 text-[8px] tracking-wider shrink-0">{t('pdm.labelName')}</span>
                                <input 
                                    className="bg-zinc-950 text-white font-bold px-1.5 py-0.5 outline-none rounded border border-white/10 text-[10px] flex-1 min-w-0" 
                                    value={player.name} 
                                    onChange={e => updatePlayerEntry(player.id, 'name', e.target.value)} 
                                    autoFocus 
                                />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-zinc-500 text-[8px] tracking-wider shrink-0">{t('pdm.labelPhotoUrl')}</span>
                                <input 
                                    className="bg-zinc-950 text-zinc-300 font-mono px-1.5 py-0.5 outline-none rounded border border-white/10 text-[8px] flex-1 min-w-0" 
                                    value={player.image || ''} 
                                    placeholder={t('pdm.placeholderPastePhoto')}
                                    onChange={e => updatePlayerEntry(player.id, 'image', e.target.value)} 
                                />
                            </div>
                            <button 
                                className="text-[8px] text-[#ccff00] font-black uppercase tracking-wider text-right hover:underline self-end mt-0.5"
                                onClick={() => setEditingPlayerId(null)}
                            >
                                {t('pdm.btnSaveClose')}
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 flex-1 min-w-0 h-6">
                            <span className="cursor-pointer hover:text-white truncate flex-1" onClick={() => setEditingPlayerId(player.id)}>
                                {player.name || t('pdm.unnamedPlayer')}
                            </span>
                            {player.image && (
                                <span className="text-[8px] text-zinc-500 font-mono shrink-0 select-none bg-zinc-800/40 px-1 py-0.5 rounded border border-white/5" title={player.image}>
                                    {t('pdm.linked')}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-in fade-in" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-[#0a0a0a] border border-white/5 rounded-3xl md:rounded-[48px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
        
        <div className="p-6 md:p-8 pb-4 flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-xl md:text-3xl font-[1000] italic text-white uppercase tracking-tighter leading-none mb-1 text-left">
              {editTeamName ? t('pdm.headingUpdate') : t('pdm.headingPlayer')} <span className={editTeamName ? 'text-blue-500' : 'text-[#ccff00]'}>DATA</span>
            </h2>
            <p className="text-[7px] md:text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em] text-left">{t('pdm.rosterConfiguration')}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-all"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-0 custom-scrollbar space-y-6">
          <section className="bg-zinc-900/40 p-5 md:p-6 rounded-[24px] md:rounded-[32px] border border-white/5 shadow-inner relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
                <Shield size={12} className="text-[#ccff00]" />
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">{t('pdm.sectionTeamIdentity')}</h3>
            </div>
            
            <div className={`flex flex-col md:flex-row gap-4 md:gap-6 items-start transition-all duration-300 ${activeTab === 'IMPORT_EXCEL' && !editTeamName ? 'opacity-20 pointer-events-none select-none blur-[1.5px]' : ''}`}>
              <div className="flex-1 w-full space-y-2">
                <label className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.3em] ml-2 block text-left">
                  {t('pdm.labelTeamName')}
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  className="w-full bg-black/60 border border-white/5 rounded-2xl px-5 py-3 text-white placeholder:text-zinc-800 outline-none focus:border-[#ccff00]/30 transition-all font-black text-lg uppercase"
                  placeholder={t('pdm.placeholderTeamName')}
                  disabled={isSaved || (activeTab === 'IMPORT_EXCEL' && !editTeamName)}
                />
              </div>
              
              <div className="flex-1 w-full space-y-2">
                <label className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.3em] ml-2 block text-left">
                  {t('pdm.labelTeamTag')}
                </label>
                <input
                  type="text"
                  value={teamAbbreviation}
                  onChange={e => setTeamAbbreviation(e.target.value)}
                  className="w-full bg-black/60 border border-white/5 rounded-2xl px-5 py-3 text-white placeholder:text-zinc-800 outline-none focus:border-[#ccff00]/30 transition-all font-black text-lg uppercase"
                  placeholder={t('pdm.placeholderTeamTag')}
                  disabled={isSaved || (activeTab === 'IMPORT_EXCEL' && !editTeamName)}
                />
              </div>
              
              <div className="shrink-0 space-y-1.5 w-full md:w-auto">
                <div className="flex justify-between items-center px-1">
                    <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">{t('pdm.recSize')}</span>
                    {teamLogo && !isSaved && (
                        <button onClick={() => resetImage('team')} className="text-[7px] font-black text-[#ccff00] hover:text-white flex items-center gap-1 uppercase tracking-widest"><RotateCcw size={8}/> {t('pdm.btnReset')}</button>
                    )}
                </div>
                <div className="relative group w-24 h-24 rounded-2xl overflow-hidden border-2 border-dashed border-white/10 hover:border-[#ccff00]/30 transition-all bg-black/60 shadow-inner mx-auto">
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => handleImageUpload(e, 'team')} disabled={isSaved || (activeTab === 'IMPORT_EXCEL' && !editTeamName)} />
                  {teamLogo ? (
                    <img src={teamLogo} className="w-full h-full object-contain p-2" alt="Team Logo" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-zinc-800"><Shield size={24} strokeWidth={1} /></div>
                  )}
                  {!isSaved && !(activeTab === 'IMPORT_EXCEL' && !editTeamName) && <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none transition-opacity"><Upload size={14} className="text-[#ccff00]" /></div>}
                </div>
              </div>
            </div>

            {activeTab === 'IMPORT_EXCEL' && !editTeamName && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[1px] p-6 text-center animate-in fade-in duration-300">
                <div className="bg-[#ccff00]/10 border border-[#ccff00]/30 text-[#ccff00] px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-2xl mb-1.5">
                  <Lock size={12} className="animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-[0.25em]">{t('pdm.identityLocked')}</span>
                </div>
                <p className="text-[8.5px] font-black text-white uppercase tracking-widest leading-normal mb-1">
                  {t('pdm.manualTeamDisabled')}
                </p>
                <p className="text-[7.5px] font-bold text-zinc-500 uppercase tracking-widest max-w-md leading-normal">
                  {t('pdm.manualTeamDisabledDesc')}
                </p>
              </div>
            )}
          </section>

          {/* TAB SEGMENT CHANGER */}
          <section className="space-y-4">
            <div className="flex bg-black/60 p-1 rounded-2xl border border-white/10 shadow-2xl max-w-2xl mx-auto">
              <button 
                type="button"
                onClick={() => setActiveTab('MANUAL')} 
                className={`flex-1 py-3 text-[8px] md:text-[9.5px] font-[1000] tracking-[0.1em] md:tracking-[0.2em] uppercase rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'MANUAL' ? 'bg-[#ccff00] text-black shadow-[0_4px_25px_rgba(204,255,0,0.25)]' : 'text-zinc-500 hover:text-zinc-200'}`}
              >
                <User size={12} /> {t('pdm.tabManualEntry')}
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('BULK_TEXT')} 
                className={`flex-1 py-3 text-[8px] md:text-[9.5px] font-[1000] tracking-[0.1em] md:tracking-[0.2em] uppercase rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'BULK_TEXT' ? 'bg-[#ccff00] text-black shadow-[0_4px_25px_rgba(204,255,0,0.25)]' : 'text-zinc-500 hover:text-zinc-200'}`}
              >
                <ClipboardCheck size={12} /> {t('pdm.tabBulkNicknames')}
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('IMPORT_EXCEL')} 
                className={`flex-1 py-3 text-[8px] md:text-[9.5px] font-[1000] tracking-[0.1em] md:tracking-[0.2em] uppercase rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'IMPORT_EXCEL' ? 'bg-[#ccff00] text-black shadow-[0_4px_25px_rgba(204,255,0,0.25)]' : 'text-zinc-500 hover:text-zinc-200'}`}
              >
                <FileSpreadsheet size={12} /> {t('pdm.tabImportExcel')}
              </button>
            </div>

            {/* IMPORT MESSAGING FEEDBACK */}
            {importFeedback && (
              <div className={`p-4 rounded-2xl border text-center font-black uppercase text-[10px] tracking-widest animate-in fade-in duration-300 ${
                importFeedback.type === 'success' 
                  ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-500'
              }`}>
                {importFeedback.message}
              </div>
            )}
          </section>

          {/* TAB CONTENT: BULK TEXT */}
          {activeTab === 'BULK_TEXT' && (
            <section className="bg-zinc-900/20 border border-white/5 rounded-[32px] p-6 space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#ccff00]/10 border border-[#ccff00]/20 flex items-center justify-center text-[#ccff00]">
                  <ClipboardCheck size={16} />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">{t('pdm.bulkParserTitle')}</h4>
                  <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{t('pdm.bulkParserSubtitle')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <label className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-2">{t('pdm.labelNicknameList')}</label>
                  <textarea 
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    className="w-full h-44 bg-black/65 border border-white/5 rounded-2xl p-5 text-xs text-white placeholder:text-zinc-700 outline-none focus:border-[#ccff00]/30 transition-all font-mono leading-relaxed uppercase"
                    placeholder={"LUXXY\nRYZEN\nZUXXY\nMICROBOY\nCOBB"}
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-black/40 border border-white/5 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="appendMode" 
                      checked={appendMode} 
                      onChange={e => setAppendMode(e.target.checked)}
                      className="w-4 h-4 rounded bg-zinc-900 border-white/10 text-[#ccff00] focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="appendMode" className="text-[8.5px] font-black text-zinc-400 uppercase tracking-widest cursor-pointer select-none">
                      {t('pdm.appendModeLabel').replace('{count}', String(playerEntries.length))}
                    </label>
                  </div>

                  <button 
                    type="button"
                    onClick={parseAndApplyBulkText}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#ccff00] text-black text-[9.5px] font-[1000] tracking-widest uppercase hover:bg-[#ddff33] active:scale-95 transition-all shadow-[0_4px_15px_rgba(204,255,0,0.2)]"
                  >
                    {t('pdm.btnGenerateRosters')}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* TAB CONTENT: IMPORT EXCEL */}
          {activeTab === 'IMPORT_EXCEL' && (
            <section className="bg-zinc-900/20 border border-white/5 rounded-[32px] p-6 space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#ccff00]/10 border border-[#ccff00]/20 flex items-center justify-center text-[#ccff00]">
                    <FileSpreadsheet size={16} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">{t('pdm.excelLoaderTitle')}</h4>
                    <p className="text-[8px] font-bold text-[#ccff00] uppercase tracking-widest flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ccff00] animate-pulse"></span>
                      {t('pdm.excelLoaderSubtitle')}
                    </p>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={downloadImportTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:bg-[#ccff00]/10 hover:border-[#ccff00]/30 rounded-xl text-[8px] font-black text-white uppercase tracking-widest transition-all shadow-md"
                >
                  <Download size={12} /> {t('pdm.btnDownloadTemplate')}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Drag item picker */}
                <div className="relative group min-h-[160px] rounded-2xl border-2 border-dashed border-white/10 hover:border-[#ccff00]/30 transition-all bg-black/40 flex flex-col items-center justify-center p-6 text-center">
                  <input 
                    type="file" 
                    accept=".csv,.txt" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    onChange={handleCSVImport} 
                  />
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                    <Upload size={18} className="text-zinc-500 group-hover:text-[#ccff00] transition-colors" />
                  </div>
                  <p className="text-[9px] font-black text-white uppercase tracking-widest mb-1">{t('pdm.uploadSpreadsheet')}</p>
                  <p className="text-[7px] font-bold text-zinc-600 uppercase">{t('pdm.uploadHint')}</p>
                </div>

                {/* Requirements spec list */}
                <div className="p-5 rounded-2xl border border-white/5 bg-black/20 flex flex-col justify-between text-left">
                  <div>
                    <h5 className="text-[8px] font-black text-zinc-500 tracking-[0.2em] uppercase mb-1 italic">{t('pdm.acceptedColumns')}</h5>
                    <p className="text-[7.5px] font-semibold text-zinc-400 uppercase tracking-widest mb-3 leading-tight">
                      {t('pdm.acceptedColumnsDesc')}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {['TEAM NAME', 'TEAM ABBREVIATION', 'PLAYER NAME', 'ROLE', 'TOTAL KILLS', 'DAMAGE', 'ASSISTS', 'SURVIVAL TIME', 'PLAYER IMAGE URL', 'TEAM LOGO URL'].map((hdr) => (
                        <span key={hdr} className={`text-[6.5px] font-black font-mono border px-1.5 py-0.5 rounded ${
                          hdr === 'TEAM NAME' || hdr === 'TEAM LOGO URL' || hdr === 'TEAM ABBREVIATION'
                            ? 'bg-[#ccff00]/10 border-[#ccff00]/30 text-[#ccff00]' 
                            : 'bg-zinc-900 border-white/5 text-zinc-400'
                        }`}>{hdr}</span>
                      ))}
                    </div>
                    
                    <div className="space-y-1.5 border-t border-white/5 pt-3">
                      <p className="text-[7.5px] font-black text-[#ccff00] uppercase tracking-widest flex items-center gap-1 leading-none mb-1">
                        {t('pdm.multiTeamTipsLabel')}
                      </p>
                      <p className="text-[8px] font-semibold text-zinc-400 leading-normal">
                        {t('pdm.multiTeamTipsPart1')}<span className="text-white font-black">TEAM NAME</span>{t('pdm.multiTeamTipsPart2')}<span className="text-[#ccff00] font-black">Team Identity</span>{t('pdm.multiTeamTipsPart3')}<span className="text-blue-400 font-black">{t('pdm.multiTeamTipsNotRequired')}</span>{t('pdm.multiTeamTipsPart4')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      id="appendModeCSV" 
                      checked={appendMode} 
                      onChange={e => setAppendMode(e.target.checked)}
                      className="w-4 h-4 rounded bg-zinc-900 border-white/10 text-[#ccff00] focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="appendModeCSV" className="text-[8.5px] font-black text-zinc-400 uppercase tracking-widest cursor-pointer select-none">
                      {t('pdm.appendModeCSVLabel')}
                    </label>
                  </div>
                </div>
              </div>

               {/* Preview Section below the Import area */}
              {playerEntries.length > 0 && (
                <div className="pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2 mb-4">
                        <User size={12} className="text-[#ccff00]" />
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">{t('pdm.importPreview').replace('{count}', String(playerEntries.length))}</h3>
                    </div>
                    {renderGroupedPlayerList()}
                </div>
              )}
            </section>
          )}

          {/* TAB CONTENT: MANUAL ENTRY */}
          {activeTab === 'MANUAL' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-t border-white/5 pt-6">
                <div className="flex items-center gap-2">
                  <User size={12} className="text-[#ccff00]" />
                  <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">{t('pdm.operationalRoster').replace('{count}', String(playerEntries.length))}</h3>
                </div>
                {!isSaved && (
                  <button onClick={handleAddPlayer} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ccff00]/10 border border-[#ccff00]/20 text-[#ccff00] text-[9px] font-black tracking-widest uppercase hover:bg-[#ccff00] hover:text-black transition-all">
                    <Plus size={12} strokeWidth={3} /> {t('pdm.btnAddPlayer')}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                {playerEntries.map((player, index) => (
                  <div key={player.id} className="bg-zinc-900/40 border border-white/5 rounded-3xl p-4 flex gap-4 items-center group hover:border-[#ccff00]/20 transition-all shadow-sm">
                    <div className="shrink-0 space-y-1">
                      <div className="flex justify-between items-center px-0.5">
                          <span className="text-[6px] font-black text-zinc-600 uppercase">{t('pdm.recSizePlayer')}</span>
                          {player.image && !isSaved && (
                              <button onClick={() => resetImage(player.id)} className="text-[6px] font-black text-[#ccff00] hover:text-white"><RotateCcw size={6}/></button>
                          )}
                      </div>
                      <div className="relative group w-16 h-16 rounded-xl overflow-hidden border-2 border-dashed border-white/10 hover:border-[#ccff00]/30 transition-all bg-black shrink-0">
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={e => handleImageUpload(e, player.id)} disabled={isSaved} />
                        {player.image ? (
                          <img 
                            src={player.image} 
                            className="w-full h-full object-cover" 
                            alt={`P${index + 1}`} 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-zinc-800"><ImageIcon size={16} /></div>
                        )}
                        {!isSaved && <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none transition-opacity"><Upload size={10} className="text-[#ccff00]" /></div>}
                      </div>
                    </div>

                    <div className="flex-1 space-y-1 text-left">
                      <div className="flex items-center justify-between">
                        <label className="text-[7px] font-black text-zinc-700 uppercase tracking-widest ml-1">{t('pdm.labelNickname')}</label>
                        {(player.kills !== undefined || player.role) && (
                          <span className="text-[6.5px] font-black bg-[#ccff00]/10 text-[#ccff00] px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {t('pdm.statsLoaded').replace('{kills}', String(player.kills || 0)).replace('{role}', player.role || 'PLAYER')}
                          </span>
                        )}
                      </div>
                      <input 
                        type="text" 
                        value={player.name}
                        onChange={e => updatePlayerEntry(player.id, 'name', e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-white uppercase outline-none focus:border-[#ccff00]/20 transition-all"
                        placeholder={t('pdm.placeholderName')}
                        disabled={isSaved}
                      />
                      </div>

                    {!isSaved && (
                      <button onClick={() => handleRemovePlayer(player.id)} className="p-2 rounded-xl bg-red-500/5 text-zinc-800 hover:text-red-500 transition-all">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>

        <div className="absolute bottom-0 left-0 w-full p-4 md:p-8 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent z-20 shrink-0">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 p-1 rounded-2xl md:rounded-3xl bg-black/40 backdrop-blur-md border border-white/5">
            <button onClick={onClose} className="w-full md:flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl bg-zinc-900 border border-white/5 text-[8px] md:text-[9px] font-black tracking-[0.3em] uppercase text-zinc-500 hover:text-white">
              {isSaved ? t('pdm.btnFinish') : t('pdm.btnCancel')}
            </button>
            <button 
              onClick={handleDeploy}
              disabled={isSaved}
              className={`w-full md:flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl text-[8px] md:text-[9px] font-[1000] tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-2 ${
                isSaved ? 'bg-green-500 text-white shadow-[0_0_30px_rgba(34,197,94,0.3)]' : 'bg-[#ccff00] text-black shadow-[0_0_30px_rgba(204,255,0,0.2)]'
              }`}
            >
              {isSaved ? <CheckCircle2 size={14} /> : <Save size={14} />}
              {isSaved ? t('pdm.btnCommitted') : t('pdm.btnSaveRoster')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerDataManagement;
