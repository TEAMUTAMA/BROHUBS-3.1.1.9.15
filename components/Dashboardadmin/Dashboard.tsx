
import React, { useState, useEffect, useMemo } from 'react';
import MasterOutputView from './MasterOutputView';
import { 
  LayoutDashboard, 
  Layers, 
  Settings2, 
  Radio, 
  Share2, 
  Users, 
  Menu, 
  LogOut, 
  ChevronRight, 
  User, 
  Activity, 
  Zap, 
  Bot, 
  Clock, 
  Settings, 
  X, 
  Check, 
  Star, 
  Crown, 
  Globe, 
  Trophy, 
  Gamepad2, 
  Swords, 
  Video, 
  Signal, 
  Wifi, 
  ArrowRight, 
  ArrowLeft,
  ImageIcon, 
  RotateCcw, 
  Info, 
  Lock, 
  Plus,
  Monitor,
  Copy,
  Download,
  Palette,
  Loader2,
  Unlock,
  Edit3,
  Eye,
  EyeOff,
  Construction,
  Trophy as TrophyIcon,
  Database,
  PlayCircle,
  LayoutTemplate,
  Type,
  Move,
  Layout,
  AlertTriangle,
  Timer,
  Key,
  ShieldAlert,
  Settings2 as SettingsIcon,
  Megaphone,
  Link as LinkIcon,
  Trash2,
  Upload,
  ShieldCheck,
  ClipboardList
} from 'lucide-react';
import MemberOutputView from '../DashboardMember/MemberOutputView';
import MemberManagement from '../MemberManagement';
import GlobalStudio from './GlobalStudio';
import GameView from '../Games/GameView/GameView'; 
import AssetView from '../AssetView'; 
import PubgMobileView from '../Games/PubgMobileView/PubgMobileView'; 
import MobileLegendsView from '../Games/MobileLegendsView/MobileLegendsView';
import ValorantView from '../Games/ValorantView/ValorantView';
import FreeFireView from '../Games/FreeFireView/FreeFireView';
import HonorOfKingsView from '../Games/HonorOfKingsView/HonorOfKingsView';
import Dota2View from '../Games/Dota2View/Dota2View';
import PricingModal from '../PricingModal';
import MemberProjectTerminal from '../DashboardMember/MemberProjectTerminal'; 
import MemberProjectDetailsView from '../DashboardMember/MemberProjectDetailsView';
import MemberBroadcastView from '../DashboardMember/MemberBroadcastView';
import AssetPreviewModal from '../AssetPreviewModal';
import PopUpAd from '../PopUpAd';
import OverlayTopFraggersView from '../Games/PubgMobileView/OverlayPubgMobileTheme01/OverlayTopFraggersView';
import TasksManagement from './TasksManagement';
import { Member, Game, Theme, Asset, AccessTier, Project, PlayerData, Ad, AppUpdateTask } from '../../types';
import { getMembers, saveMembers } from '../../services/memberService';
import { getGames, saveGames, saveThemes, getThemes, getDefaultGames } from '../../services/gameService';
import { getTasks, saveTasks } from '../../services/taskService';

interface DashboardProps {
  globalLogo: string | null;
  adminLogo: string | null;
  onExit: () => void;
  onOpenAI: () => void;
  userRole: 'admin' | 'member';
  currentUserEmail?: string;
  onSwitchRole: (role: 'admin' | 'member') => void;
  resetRequests: string[];
  onClearRequest: (email: string) => void;
  adminTier?: 'BASIC' | 'PREMIUM' | 'ULTIMATE';
  setAdminTier?: (tier: 'BASIC' | 'PREMIUM' | 'ULTIMATE') => void;
  ads: Ad[];
  onUpdateAds: (ads: Ad[]) => void;
  onGlobalUpload?: (logo: string) => void;
  onGlobalReset?: () => void;
  onAdminUpload?: (logo: string) => void;
  onAdminReset?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  globalLogo, 
  adminLogo, 
  onExit, 
  onOpenAI, 
  userRole, 
  currentUserEmail,
  onSwitchRole, 
  resetRequests, 
  onClearRequest,
  adminTier = 'ULTIMATE',
  setAdminTier,
  ads,
  onUpdateAds,
  onGlobalUpload,
  onGlobalReset,
  onAdminUpload,
  onAdminReset
}) => {
  const [uptime, setUptime] = useState('0h 0m 0s');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('OVERVIEW');
  const [settingsSubTab, setSettingsSubTab] = useState<'BRANDING' | 'ADS'>('BRANDING');
  
  const [selectedMonitorOperator, setSelectedMonitorOperator] = useState<string>('ALL');
  const [selectedMonitorFolder, setSelectedMonitorFolder] = useState<string>('ALL');
  const [isOperatorDropdownOpen, setIsOperatorDropdownOpen] = useState(false);
  const [copiedTransmissionId, setCopiedTransmissionId] = useState<string | null>(null);
  
  const [memberProjectView, setMemberProjectView] = useState<'TERMINAL' | 'HUB'>('TERMINAL');

  const [activeBroadcastProject, setActiveBroadcastProject] = useState<Project | null>(null);

  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const [isDeployingToProject, setIsDeployingToProject] = useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [tasks, setTasks] = useState<AppUpdateTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]); 
  const [historyProjects, setHistoryProjects] = useState<Project[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  const [activeAdminTool, setActiveAdminTool] = useState<string | null>(null);

  const [currentMemberEmail, setCurrentMemberEmail] = useState<string | null>(null);
  const [subModal, setSubModal] = useState<'WARNING' | 'EXPIRED' | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number>(30); 

  const [showMemberSuccessModal, setShowMemberSuccessModal] = useState(false);
  const [generatedNewPassword, setGeneratedNewPassword] = useState('');
  const [isCopiedNewPass, setIsCopiedNewPass] = useState(false);
  const [isCopiedOutput, setIsCopiedOutput] = useState(false);
  const [activePopUpAd, setActivePopUpAd] = useState<Ad | null>(null);

  // Secure verification code state for Admin entering Member POV
  const [verificationMember, setVerificationMember] = useState<Member | null>(null);
  const [verificationInput, setVerificationInput] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const handleInitiateVerification = (member: Member) => {
    // Generate an authentic 4-digit token
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setVerificationMember(member);
    setVerificationCode(code);
    setVerificationInput('');
    setVerificationError(null);
  };

  const handleVerifyAndEnterPOV = () => {
    if (!verificationInput) {
      setVerificationError('MASUKKAN KODE VERIFIKASI');
      return;
    }
    
    if (verificationInput.trim() === verificationCode) {
      const targetEmail = verificationMember!.email;
      setVerificationMember(null);
      setVerificationInput('');
      setVerificationCode('');
      setVerificationError(null);
      setCurrentMemberEmail(targetEmail);
      onSwitchRole('member');
    } else {
      setVerificationError('KODE TIDAK COCOK. PERIKSA OUTBOX TELEMETRI DI BAWAH.');
    }
  };

  useEffect(() => {
    if (userRole !== 'member') return;

    let location: 'DASHBOARD' | 'PROJECTS' | 'GAMES' | 'ASSETS' | null = null;

    if (selectedAsset) {
      location = 'ASSETS';
    } else if (selectedGame) {
      location = 'GAMES';
    } else if (activeTab === 'PROJECTS') {
      location = 'PROJECTS';
    } else if (activeTab === 'OVERVIEW') {
      location = 'DASHBOARD';
    }

    if (location) {
      const ad = ads.find(a => a.active && a.displayLocation === location);
      if (ad && activePopUpAd?.id !== ad.id) {
        setActivePopUpAd(ad);
      }
    } else if (activePopUpAd) {
      setActivePopUpAd(null);
    }
  }, [activeTab, selectedGame, selectedAsset, userRole, ads]);

  const BHS_LOGO_URL = "https://i.ibb.co.com/VpS0V5f/bhs-logo.png";

  // DYNAMIC KEYS FOR ACCOUNT ISOLATION
  const userIdentifier = useMemo(() => currentUserEmail || 'GUEST', [currentUserEmail]);
  const PROJECTS_STORAGE_KEY = useMemo(() => `BROHUBS_PROJECTS_${userIdentifier}`, [userIdentifier]);
  const HISTORY_STORAGE_KEY = useMemo(() => `BROHUBS_PROJECTS_HISTORY_${userIdentifier}`, [userIdentifier]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setIsDataLoaded(false); // Reset loaded state on user change
      
      try {
        const [fetchedMembers, fetchedGames, fetchedThemes, fetchedTasks] = await Promise.all([
            getMembers(),
            getGames(),
            getThemes(),
            getTasks()
        ]);
        
        // Load User Specific Projects
        const savedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
        if (savedProjects) {
          setProjects(JSON.parse(savedProjects));
        } else {
          setProjects([]); // Clear for new user
        }

        const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (savedHistory) {
          setHistoryProjects(JSON.parse(savedHistory));
        } else {
          setHistoryProjects([]); // Clear for new user
        }

        setMembers(fetchedMembers);
        setGames(fetchedGames);
        setThemes(fetchedThemes);
        setTasks(fetchedTasks);
        setIsDataLoaded(true);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentUserEmail, PROJECTS_STORAGE_KEY, HISTORY_STORAGE_KEY]); // Dependency on Email Change

  useEffect(() => {
    if (isDataLoaded) {
        saveMembers(members);
    }
  }, [members, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
        saveGames(games);
    }
  }, [games, isDataLoaded]);

  useEffect(() => {
      if (isDataLoaded) {
          saveThemes(themes);
      }
  }, [themes, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
        saveTasks(tasks);
    }
  }, [tasks, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      try {
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
      } catch (e) {
        console.warn("Storage full!", e);
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          alert("DATABASE STORAGE IS FULL. PLEASE REMOVE SOME PROJECTS OR USE SMALLER IMAGES.");
        }
      }
    }
  }, [projects, isDataLoaded, PROJECTS_STORAGE_KEY]);

  useEffect(() => {
    if (isDataLoaded) {
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyProjects));
      } catch (e) {
        console.warn("History storage quota exceeded.", e);
      }
    }
  }, [historyProjects, isDataLoaded, HISTORY_STORAGE_KEY]);

  useEffect(() => {
    if (userRole === 'member' && isDataLoaded && members.length > 0) {
        const targetEmail = currentUserEmail || currentMemberEmail || (members.length > 0 ? members[0].email : ''); 
        const member = members.find(m => m.email === targetEmail);
        
        if (member && member.expiryDate) {
            const now = new Date();
            const expiry = new Date(member.expiryDate);
            const diffTime = expiry.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (daysRemaining !== diffDays) {
                setDaysRemaining(diffDays);
            }

            if (diffDays < 0 && subModal !== 'EXPIRED') {
                setSubModal('EXPIRED');
            } else if (diffDays <= 7 && diffDays >= 0 && subModal !== 'WARNING') {
                setSubModal('WARNING');
            } else if (diffDays > 7 && subModal !== null) {
                setSubModal(null);
            }
        }
    } else if (subModal !== null) {
        setSubModal(null);
    }
  }, [userRole, isDataLoaded, currentMemberEmail, currentUserEmail, members]);

  const generateSystemPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pass = "BHS";
    for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    return pass;
  };

  const handleMemberDenyReset = () => {
     const email = currentUserEmail || currentMemberEmail || (members.length > 0 ? members[0].email : '');
     if (!email) return;
     setMembers(prev => prev.map(m => m.email === email ? { ...m, resetStatus: 'IDLE' } : m));
  };

  const handleMemberAcceptReset = () => {
     const email = currentUserEmail || currentMemberEmail || (members.length > 0 ? members[0].email : '');
     if (!email) return;

     const newPass = generateSystemPassword();
     setGeneratedNewPassword(newPass);
     setIsCopiedNewPass(false);

     setMembers(prev => prev.map(m => {
        if (m.email === email) {
            return { ...m, resetStatus: 'CONFIRMED', tempPassword: newPass };
        }
        return m;
     }));

     setShowMemberSuccessModal(true);
  };

  const handleSubAction = (action: 'CONTINUE' | 'EXTEND' | 'CANCEL') => {
      const email = currentUserEmail || currentMemberEmail || (members.length > 0 ? members[0].email : null);
      if (!email) return;

      if (action === 'CONTINUE') {
          setSubModal(null); 
      }
      else if (action === 'EXTEND') {
          setMembers(prev => prev.map(m => {
              if (m.email === email) {
                  return { ...m, isExtensionFlagged: true };
              }
              return m;
          }));
          setIsPackageModalOpen(true);
          setSubModal(null);
      }
      else if (action === 'CANCEL') {
          setSubModal(null);
          if (subModal === 'EXPIRED') {
              onExit();
          }
      } 
  };
  
  const handlePackageRequest = (tier: string) => {
    const email = currentUserEmail || currentMemberEmail || (members.length > 0 ? members[0].email : null);
    if (!email) return;

    let wasExpired = false;

    setMembers(prev => prev.map(m => {
      if (m.email === email) {
        wasExpired = !!m.isExpired;
        return {
          ...m,
          extensionPending: true,
          isExtensionFlagged: true,
          requestedPackage: tier
        };
      }
      return m;
    }));

    window.alert("REQUEST SENT TO ADMIN. PLEASE WAIT FOR APPROVAL.");
    setIsPackageModalOpen(false);

    if (wasExpired) {
        onExit();
    }
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    if (activeProject?.id === updatedProject.id) {
        setActiveProject(updatedProject);
    }
    if (activeBroadcastProject?.id === updatedProject.id) {
        setActiveBroadcastProject(updatedProject);
    }
  };

  const totalMembers = members.length;
  const activeBroadcasters = members.filter(m => m.status === 'IN STREAM').length;
  const onlinePresence = members.filter(m => m.status === 'ONLINE').length;
  const broadcastPercent = totalMembers > 0 ? (activeBroadcasters / totalMembers) * 100 : 0;
  const onlinePercent = totalMembers > 0 ? (onlinePresence / totalMembers) * 100 : 0;

  useEffect(() => {
    let seconds = 11;
    const interval = setInterval(() => {
      seconds++;
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      setUptime(`${h}h ${m}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (userRole === 'member' && (activeTab === 'OVERVIEW' || activeTab === 'MEMBER')) {
      setActiveTab('PROJECTS');
      setMemberProjectView('TERMINAL');
    }
  }, [userRole, activeTab]);

  useEffect(() => {
    setSelectedGame(null);
    setSelectedTheme(null);
    setSelectedAsset(null);
    setActiveProject(null);
    setIsDeployingToProject(null);
  }, [activeTab]);

  const handleDeployAsset = (asset: Asset) => {
    if (!isDeployingToProject) {
        setSelectedAsset(asset);
        return;
    }

    setProjects(prev => prev.map(p => {
        if (p.id === isDeployingToProject) {
            const currentAssets = p.deployedAssets || [];
            if (currentAssets.find(a => a.id === asset.id)) {
                window.alert("ASSET ALREADY DEPLOYED TO THIS PROJECT.");
                return p;
            }
            const updated = { ...p, deployedAssets: [...currentAssets, asset] };
            if (activeProject?.id === p.id) setActiveProject(updated);
            if (activeBroadcastProject?.id === p.id) setActiveBroadcastProject(updated);
            return updated;
        }
        return p;
    }));

    setIsDeployingToProject(null);
    setSelectedGame(null);
    setSelectedTheme(null);
    setActiveTab('PROJECTS');
  };

  const handleRemoveAssetFromProject = (projectId: string, assetId: string) => {
    setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
            const updatedAssets = (p.deployedAssets || []).filter(a => a.id !== assetId);
            const updated = { ...p, deployedAssets: updatedAssets };
            if (activeProject?.id === p.id) setActiveProject(updated);
            if (activeBroadcastProject?.id === p.id) setActiveBroadcastProject(updated);
            return updated;
        }
        return p;
    }));
  };

  const renderAdsManagement = () => {
    const handleAddAd = () => {
      const newAd: Ad = {
        id: Date.now().toString(),
        imageUrl: 'https://picsum.photos/seed/' + Date.now() + '/1200/400',
        targetUrl: 'https://',
        active: true
      };
      onUpdateAds([...ads, newAd]);
    };

    const handleRemoveAd = (id: string) => {
      onUpdateAds(ads.filter(ad => ad.id !== id));
    };

    const handleUpdateAd = (id: string, updates: Partial<Ad>) => {
      onUpdateAds(ads.map(ad => ad.id === id ? { ...ad, ...updates } : ad));
    };

    const handleAdImageUpload = (e: React.ChangeEvent<HTMLInputElement>, adId: string) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          handleUpdateAd(adId, { imageUrl: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    };

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="flex flex-col md:flex-row justify-between items-start mb-12 gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2 uppercase italic text-white">Ad Management</h1>
            <p className="text-gray-500 text-sm max-w-lg leading-relaxed font-medium">Manage advertisements displayed on the landing page slider.</p>
          </div>
          <button 
            onClick={handleAddAd}
            className="flex items-center gap-2 bg-[#ccff00] text-black px-6 py-3 rounded-xl font-black text-xs tracking-widest uppercase hover:scale-105 transition-all shadow-[0_0_20px_rgba(204,255,0,0.2)]"
          >
            <Plus size={16} /> ADD NEW AD
          </button>
        </header>

        <div className="grid grid-cols-1 gap-8">
          {ads.map((ad, index) => (
            <div key={ad.id} className="bg-zinc-900/50 border border-white/5 rounded-[32px] overflow-hidden group hover:border-[#ccff00]/30 transition-all">
              <div className="flex flex-col lg:flex-row">
                {/* Preview Section */}
                <div className="lg:w-1/2 aspect-[21/9] relative bg-black overflow-hidden group/img">
                  <img src={ad.imageUrl} alt={`Ad ${index + 1}`} className="w-full h-full object-cover opacity-60 group-hover/img:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                    <label className="bg-white text-black px-6 py-3 rounded-xl font-black text-[10px] tracking-widest uppercase cursor-pointer hover:scale-105 transition-all">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAdImageUpload(e, ad.id)} />
                      CHANGE IMAGE
                    </label>
                  </div>
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-lg bg-black/80 border border-white/10 backdrop-blur-md">
                    <span className="text-[10px] font-black text-[#ccff00] tracking-widest uppercase">AD #{index + 1}</span>
                  </div>
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/30 backdrop-blur-md">
                    <span className="text-[10px] font-black text-red-500 tracking-widest uppercase italic">REC: 1200 x 400</span>
                  </div>
                </div>

                {/* Controls Section */}
                <div className="lg:w-1/2 p-8 flex flex-col justify-between">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${ad.active ? 'bg-[#ccff00] shadow-[0_0_10px_#ccff00]' : 'bg-zinc-700'}`} />
                        <span className={`text-[10px] font-black tracking-widest uppercase ${ad.active ? 'text-[#ccff00]' : 'text-zinc-500'}`}>
                          {ad.active ? 'ACTIVE NODE' : 'INACTIVE'}
                        </span>
                      </div>
                      <button 
                        onClick={() => handleUpdateAd(ad.id, { active: !ad.active })}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${ad.active ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-[#ccff00]/10 text-[#ccff00] border border-[#ccff00]/20 hover:bg-[#ccff00] hover:text-black'}`}
                      >
                        {ad.active ? 'DEACTIVATE' : 'ACTIVATE'}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase">Target URL / Destination</label>
                      <div className="relative group/input">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within/input:text-[#ccff00] transition-colors">
                          <LinkIcon size={14} />
                        </div>
                        <input 
                          type="text" 
                          value={ad.targetUrl}
                          onChange={(e) => handleUpdateAd(ad.id, { targetUrl: e.target.value })}
                          placeholder="https://example.com"
                          className="w-full bg-black border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm font-medium text-white focus:border-[#ccff00] focus:ring-1 focus:ring-[#ccff00] outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-white/5">
                      <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase">Display Location</label>
                      <select
                        value={ad.displayLocation || 'LANDING'}
                        onChange={(e) => handleUpdateAd(ad.id, { displayLocation: e.target.value as any })}
                        className="w-full bg-black border border-white/10 rounded-xl py-4 px-4 text-sm font-medium text-white focus:border-[#ccff00] focus:ring-1 focus:ring-[#ccff00] outline-none transition-all appearance-none"
                      >
                        <option value="LANDING">Landing Page Slider</option>
                        <option value="LANDING_POPUP">Landing Page (Pop-up)</option>
                        <option value="DASHBOARD">Member Dashboard (Pop-up)</option>
                        <option value="PROJECTS">Member Projects (Pop-up)</option>
                        <option value="GAMES">Member Games (Pop-up)</option>
                        <option value="ASSETS">Member Assets (Pop-up)</option>
                      </select>
                    </div>

                    {ad.displayLocation && ad.displayLocation !== 'LANDING' && (
                      <div className="space-y-3 pt-4 border-t border-white/5">
                        <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase">Pop-up Size</label>
                        <select
                          value={ad.popUpSize || 'MEDIUM'}
                          onChange={(e) => handleUpdateAd(ad.id, { popUpSize: e.target.value as any })}
                          className="w-full bg-black border border-white/10 rounded-xl py-4 px-4 text-sm font-medium text-white focus:border-[#ccff00] focus:ring-1 focus:ring-[#ccff00] outline-none transition-all appearance-none"
                        >
                          <option value="SMALL">Small (Max 448px)</option>
                          <option value="MEDIUM">Medium (Max 672px)</option>
                          <option value="LARGE">Large (Max 1024px)</option>
                          <option value="ASPECT_16_9">16:9 Streaming (1024x576px)</option>
                        </select>
                      </div>
                    )}

                    <div className="space-y-3 pt-4 border-t border-white/5">
                      <label className="text-[10px] font-black text-gray-500 tracking-widest uppercase">Overlay Controls</label>
                      <div className="grid grid-cols-3 gap-4">
                        <button
                          onClick={() => handleUpdateAd(ad.id, { showLogoOverlay: !ad.showLogoOverlay })}
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${ad.showLogoOverlay ? 'bg-[#ccff00]/10 border-[#ccff00]/30 text-[#ccff00]' : 'bg-black border-white/10 text-gray-500 hover:border-white/30 hover:text-white'}`}
                        >
                          <div className={`w-2 h-2 rounded-full ${ad.showLogoOverlay ? 'bg-[#ccff00]' : 'bg-gray-600'}`} />
                          <span className="text-[10px] font-black tracking-widest uppercase">LOGO</span>
                        </button>
                        <button
                          onClick={() => handleUpdateAd(ad.id, { showStatusOverlay: !ad.showStatusOverlay })}
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${ad.showStatusOverlay ? 'bg-[#ccff00]/10 border-[#ccff00]/30 text-[#ccff00]' : 'bg-black border-white/10 text-gray-500 hover:border-white/30 hover:text-white'}`}
                        >
                          <div className={`w-2 h-2 rounded-full ${ad.showStatusOverlay ? 'bg-[#ccff00]' : 'bg-gray-600'}`} />
                          <span className="text-[10px] font-black tracking-widest uppercase">STATUS</span>
                        </button>
                        <button
                          onClick={() => handleUpdateAd(ad.id, { showPingOverlay: !ad.showPingOverlay })}
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${ad.showPingOverlay ? 'bg-[#ccff00]/10 border-[#ccff00]/30 text-[#ccff00]' : 'bg-black border-white/10 text-gray-500 hover:border-white/30 hover:text-white'}`}
                        >
                          <div className={`w-2 h-2 rounded-full ${ad.showPingOverlay ? 'bg-[#ccff00]' : 'bg-gray-600'}`} />
                          <span className="text-[10px] font-black tracking-widest uppercase">PING</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Info size={12} />
                      <span className="text-[9px] font-bold tracking-widest uppercase italic">Changes are saved automatically</span>
                    </div>
                    <button 
                      onClick={() => handleRemoveAd(ad.id)}
                      className="flex items-center gap-2 text-red-500/50 hover:text-red-500 transition-colors text-[10px] font-black tracking-widest uppercase"
                    >
                      <Trash2 size={14} /> REMOVE AD
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {ads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.02]">
              <Megaphone size={48} className="text-zinc-800 mb-6" />
              <h3 className="text-xl font-black text-zinc-500 uppercase italic tracking-tight mb-2">No active advertisements</h3>
              <p className="text-[10px] font-bold text-zinc-600 tracking-[0.2em] uppercase mb-8 text-center max-w-xs">Your landing page slider is currently empty. Add your first ad to begin broadcasting.</p>
              <button 
                onClick={handleAddAd}
                className="bg-white/5 border border-white/10 text-white px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-[#ccff00] hover:text-black hover:border-[#ccff00] transition-all"
              >
                INITIALIZE FIRST AD
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const pendingExtensionCount = members.filter(m => m.extensionPending).length;

  const allNavItems = [
    { icon: LayoutDashboard, label: 'OVERVIEW', roles: ['admin'] },
    { icon: Layers, label: 'PROJECTS', roles: ['admin', 'member'] },
    { icon: LayoutTemplate, label: 'STUDIO', roles: ['admin'] },
    { icon: Radio, label: 'BROADCAST', roles: ['admin', 'member'] },
    { icon: Share2, label: 'OUTPUT', roles: ['admin', 'member'] },
    { icon: ClipboardList, label: 'TASKS', roles: ['admin', 'member'] },
    { icon: SettingsIcon, label: 'SETTINGS', roles: ['admin'] },
    { icon: Users, label: 'MEMBER', roles: ['admin'], notification: resetRequests.length > 0 || pendingExtensionCount > 0 },
  ];

  const filteredNavItems = allNavItems.filter(item => item.roles.includes(userRole));

  const handleGameImageUpload = (e: React.ChangeEvent<HTMLInputElement>, gameId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGames(prev => prev.map(game => 
          game.id === gameId ? { ...game, image: reader.result as string } : game
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGameReset = async (gameId: string) => {
     const defaults = await getDefaultGames();
     const defaultGame = defaults.find(g => g.id === gameId);
     if (defaultGame) {
        setGames(prev => prev.map(game => 
            game.id === gameId ? { ...game, image: defaultGame.image } : game
        ));
     }
  };

  const getActiveMember = () => {
    const targetEmail = currentUserEmail || currentMemberEmail || (members.length > 0 ? members[0].email : null);
    if (!targetEmail) return null;
    return members.find(m => m.email === targetEmail) || null;
  };

  const getSidebarPlanLabel = () => {
    if (userRole === 'admin') return 'AUTH: LEVEL 04 (ROOT)';
    const member = getActiveMember();
    if (!member) return 'PLAN: UNKNOWN';
    switch (member.package) {
      case 'BASIC': return 'UPGRADE PREMIUM';
      case 'PREMIUM': return 'UPGRADE ULTIMATE';
      case 'ULTIMATE': return 'NO LIMITS ACCESS';
      default: return `PLAN: ${member.package}`;
    }
  };

  const toggleGameRelease = (gameId: string) => {
    setGames(prev => prev.map(g => g.id === gameId ? { ...g, isReleased: !g.isReleased } : g));
  };

  const setGameTier = (gameId: string, tier: AccessTier) => {
    setGames(prev => prev.map(g => g.id === gameId ? { ...g, tier } : g));
  };

  const renderOutputView = () => {
    // 1. Check if the current user is a Member (non-admin)
    if (userRole !== 'admin') {
      const memberId = currentUserEmail || currentMemberEmail || '';
      const member = members.find(m => m.email === memberId);
      const allAssets = projects.flatMap(p => (p.deployedAssets || []).map(a => ({ ...a, projectId: p.id, ownerId: memberId })));
      
      return (
        <MemberOutputView 
          assets={allAssets} 
          projects={projects} 
          povMember={{
            id: memberId,
            name: member?.name || 'Member',
            email: memberId,
            role: member?.package || 'Member',
            status: member?.status === 'ONLINE' ? 'Online' : member?.status === 'IN STREAM' ? 'In Stream' : 'Offline',
            joinDate: member?.expiryDate || ''
          }} 
        />
      );
    }

    // 2. Otherwise (User is Administrator), render the high-end Network Output Monitor exactly matching user request!
    
    // Construct robust, uniform members list matching exact types
    const unifiedMembers = [
      // Real members
      ...members.map(m => ({
        id: m.email,
        name: m.name,
        email: m.email,
        role: m.package || 'Operator',
        status: (m.status === 'ONLINE' ? 'Online' : m.status === 'IN STREAM' ? 'In Stream' : 'Offline') as any,
        joinDate: m.expiryDate || ''
      }))
    ];

    // Seeding admin member defaults if not exists
    if (!unifiedMembers.some(m => m.name.toLowerCase().includes('alex') || m.email.toLowerCase().includes('alex'))) {
      unifiedMembers.unshift({
        id: 'alex@brohubs.com',
        name: 'Alex River',
        email: 'alex@brohubs.com',
        role: 'ADMINISTRATOR',
        status: 'Online',
        joinDate: '2026-01-01'
      });
    }
    if (!unifiedMembers.some(m => m.name.toLowerCase().includes('sarah') || m.email.toLowerCase().includes('sarah'))) {
      unifiedMembers.push({
        id: 'sarah@brohubs.com',
        name: 'Sarah Stream',
        email: 'sarah@brohubs.com',
        role: 'ADMINISTRATOR',
        status: 'Offline',
        joinDate: '2026-01-01'
      });
    }

    const unifiedProjects: any[] = [];
    const unifiedAssets: any[] = [];

    const addProjsAndAssetsForOwner = (ownerId: string, projs: any[]) => {
      projs.forEach(p => {
        if (!unifiedProjects.some(up => up.id === p.id)) {
          unifiedProjects.push({
            id: p.id,
            ownerId: ownerId,
            name: p.name,
            description: p.description || '',
            status: 'Active',
            createdAt: p.timestamp || new Date().toISOString()
          });
        }

        const assets = p.deployedAssets || [];
        if (assets.length > 0) {
          assets.forEach((asset: any) => {
            const assetUrl = `${window.location.origin}${window.location.pathname}?view=program&project=${p.id}&asset=${asset.id}`;
            unifiedAssets.push({
              id: `${p.id}_${asset.id}`,
              ownerId: ownerId,
              projectId: p.id,
              title: asset.name.toUpperCase(),
              type: asset.type || 'Overlay',
              url: assetUrl,
              status: 'Active'
            });
          });
        }
      });
    };

    // Load admin / guest projects
    addProjsAndAssetsForOwner('alex@brohubs.com', projects);

    // Load member projects
    members.forEach(m => {
      try {
        const key = `BROHUBS_PROJECTS_${m.email}`;
        const dataStr = localStorage.getItem(key);
        if (dataStr) {
          const projs = JSON.parse(dataStr);
          if (Array.isArray(projs)) {
            addProjsAndAssetsForOwner(m.email, projs);
          }
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Backport fallback items matching the requested screen layout
    if (unifiedAssets.filter(a => a.ownerId === 'alex@brohubs.com').length === 0) {
      if (!unifiedProjects.some(up => up.id === 'proj_dgsgsdg')) {
        unifiedProjects.push({
          id: 'proj_dgsgsdg',
          ownerId: 'alex@brohubs.com',
          name: 'DGSGSDG',
          description: 'Default Seed Folder',
          status: 'Active',
          createdAt: new Date().toISOString()
        });
      }

      unifiedAssets.push({
        id: 'seed_top_1',
        ownerId: 'alex@brohubs.com',
        projectId: 'proj_dgsgsdg',
        title: 'MATCH SUMMARY',
        type: 'Overlay',
        url: 'https://5p4mashexq53mgkscvtibxfddg10sv31cw7wyfxd18lh0obsy-h917864466.scf.user.run.app/?view=program&mock=summary',
        status: 'Active'
      });
      unifiedAssets.push({
        id: 'seed_top_2',
        ownerId: 'alex@brohubs.com',
        projectId: 'proj_dgsgsdg',
        title: 'TEAM H2H',
        type: 'Overlay',
        url: 'https://5p4mashexq53mgkscvtibxfddg10sv31cw7wyfxd18lh0obsy-h917864466.scf.user.run.app/?view=program&mock=h2h',
        status: 'Active'
      });
      unifiedAssets.push({
        id: 'seed_top_3',
        ownerId: 'alex@brohubs.com',
        projectId: 'proj_dgsgsdg',
        title: 'OVERLAY MVP',
        type: 'Overlay',
        url: 'https://5p4mashexq53mgkscvtibxfddg10sv31cw7wyfxd18lh0obsy-h917864466.scf.user.run.app/?view=program&mock=mvp',
        status: 'Active'
      });
    }

    return (
      <MasterOutputView 
        assets={unifiedAssets}
        members={unifiedMembers as any}
        projects={unifiedProjects as any}
      />
    );
  };

  const renderSettingsManagement = () => {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end border-b border-white/5 pb-6 gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2 uppercase italic">System Settings</h1>
            <p className="text-gray-500 text-sm font-medium">Configure global assets and advertisement systems.</p>
          </div>
          
          <div className="flex gap-2 bg-zinc-950 border border-white/5 p-1 rounded-2xl shrink-0">
            <button
              onClick={() => setSettingsSubTab('BRANDING')}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${settingsSubTab === 'BRANDING' ? 'bg-[#ccff00] text-black shadow-[0_0_15px_rgba(204,255,0,0.15)]' : 'text-zinc-500 hover:text-white bg-transparent'}`}
            >
              BRANDING
            </button>
            <button
              onClick={() => setSettingsSubTab('ADS')}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${settingsSubTab === 'ADS' ? 'bg-[#ccff00] text-black shadow-[0_0_15px_rgba(204,255,0,0.15)]' : 'text-zinc-500 hover:text-white bg-transparent'}`}
            >
              ADS MANAGEMENT
            </button>
          </div>
        </header>

        {settingsSubTab === 'BRANDING' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Global Branding Section */}
            <div className="bg-zinc-900 border border-white/5 rounded-[32px] p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#ccff00]/10 flex items-center justify-center text-[#ccff00]">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white uppercase italic">Global Branding</h3>
                  <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Visible to all users</p>
                </div>
              </div>
              
              <div className="relative group aspect-video mb-6">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && onGlobalUpload) {
                      const reader = new FileReader();
                      reader.onloadend = () => onGlobalUpload(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`
                  w-full h-full border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center transition-all duration-300
                  ${globalLogo ? 'border-white/20 bg-white/5' : 'border-white/10 bg-white/5 hover:border-white/30'}
                `}>
                  {globalLogo ? (
                    <img src={globalLogo} alt="Global Preview" className="h-24 w-auto object-contain drop-shadow-2xl" />
                  ) : (
                    <>
                      <Upload size={32} className="text-gray-600 mb-4 group-hover:text-white transition-colors" />
                      <p className="text-gray-500 font-bold text-xs tracking-widest uppercase text-center">UPLOAD BROHUBS LOGO</p>
                    </>
                  )}
                </div>
              </div>
              
              <button 
                onClick={() => onGlobalReset && onGlobalReset()}
                disabled={!globalLogo}
                className="w-full py-4 bg-white/5 text-gray-400 rounded-xl font-black text-[10px] tracking-widest border border-white/5 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 uppercase flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} /> RESET GLOBAL LOGO
              </button>
            </div>

            {/* Admin Branding Section */}
            <div className="bg-zinc-900 border border-white/5 rounded-[32px] p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#ccff00]/10 flex items-center justify-center text-[#ccff00]">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white uppercase italic">Admin Hub (BHS)</h3>
                  <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Exclusive to dashboard</p>
                </div>
              </div>
              
              <div className="relative group aspect-video mb-6">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && onAdminUpload) {
                      const reader = new FileReader();
                      reader.onloadend = () => onAdminUpload(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`
                  w-full h-full border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center transition-all duration-300
                  ${adminLogo ? 'border-[#ccff00] bg-[#ccff00]/5 shadow-[inset_0_0_20px_rgba(204,255,0,0.05)]' : 'border-[#ccff00]/40 bg-[#ccff00]/5 hover:border-[#ccff00]'}
                `}>
                  {adminLogo ? (
                    <img src={adminLogo} alt="Admin Preview" className="h-24 w-auto object-contain drop-shadow-2xl" />
                  ) : (
                    <>
                      <Upload size={32} className="text-[#ccff00] mb-4 group-hover:text-white transition-colors" />
                      <p className="text-[#ccff00] font-bold text-xs tracking-widest uppercase text-center">UPLOAD BHS MENU LOGO</p>
                    </>
                  )}
                </div>
              </div>

              <button 
                onClick={() => onAdminReset && onAdminReset()}
                disabled={!adminLogo}
                className="w-full py-4 bg-red-500/10 text-red-500 rounded-xl font-black text-[10px] tracking-widest border border-red-500/20 hover:bg-red-500 hover:text-white transition-all disabled:opacity-30 uppercase flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} /> RESET ADMIN LOGO
              </button>
            </div>
          </div>
        ) : (
          renderAdsManagement()
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in duration-500">
                <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-[#ccff00] animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-[#ccff00] rounded-full shadow-[0_0_10px_#ccff00]" />
                    </div>
                </div>
                <h3 className="text-xl font-black italic text-white uppercase tracking-tight mb-2 animate-pulse">INITIALIZING BROHUBS CORE</h3>
                <p className="text-[10px] font-bold text-gray-500 tracking-[0.3em] uppercase">ESTABLISHING SECURE UPLINK...</p>
            </div>
        );
    }

    if (activeTab === 'SETTINGS' && userRole === 'admin') {
      return renderSettingsManagement();
    }

    if (activeTab === 'OUTPUT') {
      return renderOutputView();
    }

    if (activeTab === 'TASKS') {
      return (
        <TasksManagement 
          tasks={tasks}
          onUpdateTasks={setTasks}
          userRole={userRole}
          currentUserEmail={currentUserEmail}
        />
      );
    }

    if (activeTab === 'BROADCAST' && userRole === 'member') {
        return null;
    }

    if (activeTab === 'MEMBER') {
      return (
        <MemberManagement 
            members={members}
            setMembers={setMembers}
            onSelectMember={(m) => {
                handleInitiateVerification(m);
            }} 
            resetRequests={resetRequests}
            onClearRequest={onClearRequest}
        />
      );
    }

    if (activeTab === 'PROJECTS') {
        const commonProps = {
            onBack: () => { setSelectedGame(null); setSelectedTheme(null); },
            themes: themes,
            setThemes: setThemes,
            onSelectTheme: setSelectedTheme,
            selectedTheme: selectedTheme,
            selectedAsset: selectedAsset,
            onSelectAsset: handleDeployAsset,
            onPreviewAsset: setPreviewAsset,
            userRole: userRole,
            memberPackage: userRole === 'admin' ? adminTier : (getActiveMember()?.package || "BASIC"),
            adminTierOverride: userRole === 'admin' ? adminTier : undefined
        };

        if (activeProject && !isDeployingToProject) {
          return (
            <MemberProjectDetailsView 
              project={activeProject} 
              onBack={() => setActiveProject(null)} 
              onDeployNode={() => setIsDeployingToProject(activeProject.id)}
              onRemoveAsset={(assetId) => handleRemoveAssetFromProject(activeProject.id, assetId)}
              onOpenAsset={setSelectedAsset}
              onUpdateProject={handleUpdateProject}
            />
          );
        }

        if (isDeployingToProject) {
            const project = projects.find(p => p.id === isDeployingToProject);
            if (project) {
                if (!selectedGame) {
                    setSelectedGame(project.gameId);
                }
            }
        }

        const deployProject = isDeployingToProject
          ? projects.find((p) => p.id === isDeployingToProject)
          : null;
        if (selectedGame === 'pubg')
          return (
            <PubgMobileView
              {...commonProps}
              globalLogo={globalLogo}
              projectPlayers={deployProject?.players ?? []}
            />
          );
        if (selectedGame === 'mlbb') return <MobileLegendsView {...commonProps} />;
        if (selectedGame === 'val') return <ValorantView {...commonProps} />;
        if (selectedGame === 'ff') return <FreeFireView {...commonProps} />;
        if (selectedGame === 'hok') return <HonorOfKingsView {...commonProps} />;
        if (selectedGame === 'dota') return <Dota2View {...commonProps} />;
        if (selectedGame) return <GameView selectedGame={selectedGame} {...commonProps} />;

        if (userRole === 'member') {
           return (
             <MemberProjectTerminal 
                onNewProject={() => setMemberProjectView('HUB')} 
                games={games.filter(g => g.isReleased)}
                onSelectGame={(id) => setSelectedGame(id)}
                projects={projects}
                onUpdateProjects={setProjects}
                historyProjects={historyProjects}
                onUpdateHistory={setHistoryProjects}
                themes={themes}
                onSelectTheme={setSelectedTheme}
                onOpenProject={setActiveProject}
                onPreviewAsset={setPreviewAsset}
                memberPackage={userRole === 'admin' ? adminTier : (getActiveMember()?.package || "BASIC")}
             />
           );
        }

        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">Master Asset Hub</h1>
                        <p className="text-gray-500 text-sm font-medium">Select a game title to access overlay templates and widgets.</p>
                    </div>
                </div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
                     <button className="bg-[#ccff00] text-black px-6 py-2.5 rounded-xl font-black text-[10px] tracking-[0.2em] uppercase hover:scale-105 transition-all shadow-[0_0_15px_rgba(204,255,0,0.3)] border border-[#ccff00]">ALL GAMES</button>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#ccff00]/10 border border-[#ccff00]/20 text-[#ccff00]">
                        <Info size={14} />
                        <span className="text-[10px] font-black tracking-widest uppercase">SERVER UPLINK: STABLE</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {games.map((game) => {
                        const isAdminControlOpen = activeAdminTool === game.id;
                        return (
                        <div 
                            key={game.id} 
                            onClick={() => { if (game.active) setSelectedGame(game.id); }}
                            className={`group relative aspect-[16/10] rounded-[32px] overflow-hidden border border-white/5 bg-zinc-900 shadow-2xl transition-all ${game.active ? 'cursor-pointer hover:border-[#ccff00]/50 hover:scale-[1.02]' : 'cursor-not-allowed'}`}
                        >
                             <div className="absolute bottom-5 right-5 z-[60]" onClick={(e) => e.stopPropagation()}>
                                 <button 
                                     onClick={() => setActiveAdminTool(isAdminControlOpen ? null : game.id)}
                                     className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${isAdminControlOpen ? 'bg-white text-black rotate-180 shadow-[0_0_20px_white]' : 'bg-[#ccff00]/30 hover:bg-[#ccff00] text-black shadow-[0_0_15px_rgba(204,255,0,0.2)] hover:scale-110'}`}
                                 >
                                     <SettingsIcon size={14} />
                                 </button>
                             </div>

                             <div className="absolute right-20 top-6 px-2.5 py-1.5 rounded-lg bg-Black/95 border border-white/60 backdrop-blur-xr pointer-events-none whitespace-nowrap shadow-x0">
                                   <p className="text-[7px] font-black text-[#FF0000] uppercase tracking-widest leading-none mb-0.5">REC: SIZE</p>
                                   <p className="text-[8px] font-bold text-[#FF0000] tracking-wider leading-none">1920 x 1080</p>
                             </div>

                             <div className={`absolute top-5 right-5 z-20 flex flex-col gap-2 transition-opacity duration-500 ${isAdminControlOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} onClick={(e) => e.stopPropagation()}>
                                 <label className="w-10 h-10 bg-black/60 hover:bg-[#ccff00] hover:text-black text-white rounded-full flex items-center justify-center cursor-pointer backdrop-blur-md border border-white/10 transition-all group/edit shadow-lg relative">
                                     <input type="file" accept="image/*" className="hidden" onChange={(e) => handleGameImageUpload(e, game.id)} />
                                     <ImageIcon size={16} />
                                 </label>
                                 <button onClick={(e) => { e.stopPropagation(); handleGameReset(game.id); }} className="w-10 h-10 bg-black/60 hover:bg-red-500 hover:text-white text-gray-400 rounded-full flex items-center justify-center cursor-pointer backdrop-blur-md border border-white/10 transition-all group/reset shadow-lg relative">
                                     <RotateCcw size={16} />
                                 </button>
                             </div>

                             <div className={`absolute top-5 right-5 z-[70] transition-opacity duration-500 ${isAdminControlOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={(e) => e.stopPropagation()}>
                                 <div className="bg-black/90 backdrop-blur-2xl border border-[#ccff00]/20 rounded-full px-3 py-1.5 flex items-center gap-3 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
                                     <button 
                                         onClick={() => toggleGameRelease(game.id)}
                                         className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${game.isReleased ? 'text-[#ccff00]' : 'text-red-500'}`}
                                     >
                                         {game.isReleased ? <Unlock size={14} /> : <Lock size={14} fill="currentColor" />}
                                     </button>
                                     <div className="w-px h-4 bg-white/10" />
                                     {(['BASIC', 'PREMIUM', 'ULTIMATE'] as AccessTier[]).map(t => (
                                         <button 
                                             key={t}
                                             onClick={() => setGameTier(game.id, t)}
                                             className={`text-[9px] font-black w-7 h-7 rounded-full flex items-center justify-center transition-all ${game.tier === t ? (t === 'ULTIMATE' ? 'bg-[#ccff00] text-black shadow-[0_0_10px_#ccff00]' : t === 'PREMIUM' ? 'bg-blue-500 text-white' : 'bg-white text-black') : 'text-gray-500 hover:text-white'}`}
                                         >
                                             {t[0]}
                                         </button>
                                     ))}
                                 </div>
                             </div>

                             <img src={game.image} alt={game.title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-90 group-hover:scale-110 transition-all duration-700 grayscale group-hover:grayscale-0" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 group-hover:opacity-70 transition-opacity" />
                             
                             <div className="absolute bottom-0 left-0 p-8 w-full z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-2xl font-[900] italic tracking-tighter text-white uppercase drop-shadow-lg transform skew-x-[-5deg]">{game.title}</h3>
                                    {!game.isReleased && (<span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded tracking-tighter">UNRELEASED</span>)}
                                </div>
                                <div className="flex items-center gap-2 text-[#ccff00] text-[10px] font-black tracking-widest uppercase animate-in slide-in-from-left-2 fade-in duration-300">
                                    <span>ENTER HUB</span>
                                    <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                </div>
                             </div>
                        </div>
                    )})}
                </div>
            </div>
        );
    }

    if (activeTab === 'STUDIO') {
        return null;
    }

    if (activeTab === 'ADS' && userRole === 'admin') {
      return renderAdsManagement();
    }

    if (activeTab === 'OVERVIEW') {
        return (
          <>
            <header className="flex flex-col md:flex-row justify-between items-start mb-16 gap-6">
              <div className="animate-in slide-in-from-top-4 duration-500">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2 uppercase italic text-white">Operational Overview</h1>
                <p className="text-gray-500 text-sm max-w-lg leading-relaxed font-medium">Live telemetry for all active broadcast nodes and members.</p>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-[#ccff00]/20 bg-[#ccff00]/5 self-start shadow-[0_0_20px_rgba(204,255,0,0.05)]">
                <div className="w-2 h-2 bg-[#ccff00] rounded-full animate-pulse shadow-[0_0_10px_#ccff00]" />
                <span className="text-[10px] font-black tracking-[0.2em] text-[#ccff00] uppercase">SYSTEM NOMINAL</span>
              </div>
            </header>
            
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="p-8 rounded-[24px] bg-zinc-900 border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-8 z-10 relative">
                  <p className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">TOTAL HUB MEMBERS</p>
                  <Users size={20} className="text-gray-600 group-hover:text-white transition-colors" />
                </div>
                <div className="flex flex-col gap-1 mb-6 z-10 relative">
                  <span className="text-5xl font-black tracking-tighter text-white">{totalMembers}</span>
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">REGISTERED ACCOUNTS</span>
                </div>
                <div className="w-full h-1.5 bg-black rounded-full overflow-hidden z-10 relative"><div className="w-full h-full bg-zinc-600" /></div>
              </div>
              <div className="p-8 rounded-[24px] bg-zinc-900 border border-white/5 hover:border-[#ccff00]/30 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#ccff00]/5 blur-[50px] rounded-full translate-x-10 -translate-y-10" />
                <div className="flex justify-between items-start mb-8 z-10 relative">
                  <p className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">ACTIVE BROADCASTERS</p>
                  <Video size={20} className="text-[#ccff00]/50 group-hover:text-[#ccff00] transition-colors" />
                </div>
                <div className="flex flex-col gap-1 mb-6 z-10 relative">
                  <span className="text-5xl font-black tracking-tighter text-[#ccff00]">{activeBroadcasters}</span>
                  <span className="text-[10px] font-bold text-[#ccff00]/60 uppercase tracking-widest">CURRENTLY IN-STREAM</span>
                </div>
                <div className="w-full h-1.5 bg-black rounded-full overflow-hidden z-10 relative">
                   <div className="h-full bg-[#ccff00] shadow-[0_0_10px_#ccff00] transition-all duration-700" style={{ width: `${broadcastPercent}%`, minWidth: activeBroadcasters > 0 ? '5%' : '0%' }} />
                </div>
              </div>
              <div className="p-8 rounded-[24px] bg-zinc-900 border border-white/5 hover:border-blue-500/30 transition-all group relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] rounded-full translate-x-10 -translate-y-10" />
                <div className="flex justify-between items-start mb-8 z-10 relative">
                  <p className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">ONLINE PRESENCE</p>
                  <Wifi size={20} className="text-blue-500/50 group-hover:text-blue-500 transition-colors" />
                </div>
                <div className="flex flex-col gap-1 mb-6 z-10 relative">
                  <span className="text-5xl font-black tracking-tighter text-blue-500">{onlinePresence}</span>
                  <span className="text-[10px] font-bold text-blue-500/60 uppercase tracking-widest">IDLE IN DASHBOARD</span>
                </div>
                <div className="w-full h-1.5 bg-black rounded-full overflow-hidden z-10 relative">
                   <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-700" style={{ width: `${onlinePercent}%`, minWidth: onlinePresence > 0 ? '5%' : '0%' }} />
                </div>
              </div>
            </div>
            <section className="animate-in slide-in-from-bottom-4 duration-700">
               <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                <h2 className="text-[11px] font-black text-gray-500 tracking-[0.2em] uppercase">MEMBER NETWORK HEALTH</h2>
              </div>
              <div className="space-y-3">
                {members.map((member, idx) => (
                  <div key={idx} className="p-5 rounded-[20px] bg-black border border-white/5 hover:border-white/10 transition-all flex items-center justify-between group cursor-default">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-xs font-black relative shrink-0">
                        <span className="text-white">{member.initial}</span>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${member.status === 'IN STREAM' ? 'bg-[#ccff00]' : (member.status === 'ONLINE' ? 'bg-blue-500' : 'bg-zinc-700')} rounded-full border-[3px] border-black`} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white mb-0.5">{member.name}</h4>
                        <p className="text-[10px] font-black text-gray-600 tracking-wider uppercase">{member.package} MEMBER</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-lg font-black ${member.status === 'IN STREAM' ? 'text-white' : (member.status === 'ONLINE' ? 'text-blue-500' : 'text-zinc-600')}`}>{member.status === 'OFFLINE' ? 'OFFLINE' : 'STABLE'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        );
    }
    return null;
  };

    const targetEmail = currentUserEmail || currentMemberEmail || (members.length > 0 ? members[0]?.email : null);
    const pendingReset = userRole === 'member' && members.find(m => m.email === targetEmail && m.resetStatus === 'PENDING_APPROVAL');

    return (
    <div className="flex h-screen bg-black text-white font-inter overflow-hidden relative flex-col md:flex-row">
      <aside className={`
        bg-zinc-950 border-white/5 flex transition-all duration-500 ease-in-out relative z-[60]
        fixed bottom-0 left-0 w-full h-20 flex-row border-t md:static md:h-screen md:flex-col md:border-r md:p-4
        ${isExpanded ? 'md:w-64' : 'md:w-24'}
      `}>
        <div className="hidden md:flex flex-col items-center mb-10 w-full">
          <button onClick={() => setIsExpanded(!isExpanded)} className={`mb-4 flex items-center justify-center rounded-xl border border-white/5 bg-zinc-900/50 hover:bg-zinc-900 transition-all group ${isExpanded ? 'w-full py-3 px-4 justify-between' : 'w-12 h-12'}`}>{isExpanded ? (<><span className="text-[10px] font-black tracking-[0.2em] text-gray-500 uppercase">Hide Menu</span><X size={16} className="text-[#ccff00]" /></>) : (<Menu size={20} className="text-gray-400 group-hover:text-white" />)}</button>
          {!isExpanded && (<div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center"><div className="w-12 h-12 flex items-center justify-center bg-[#ccff00] rounded-2xl shadow-[0_0_20px_rgba(204,255,0,0.2)] transition-all duration-300 overflow-hidden mb-3"><img src={globalLogo || BHS_LOGO_URL} alt="BHS Logo" className="w-full h-full object-contain filter brightness-0 p-2.5" /></div><div className="w-1 h-1 bg-[#ccff00] rounded-full animate-pulse" /></div>)}
          {isExpanded && (<div className="w-full px-2 mt-2 animate-in fade-in slide-in-from-top-4 duration-500"><div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 shadow-inner"><p className="text-[9px] font-black text-gray-600 tracking-[0.4em] uppercase mb-2 flex items-center gap-2">SYSTEM NODE</p><h3 className="text-sm font-[1000] italic tracking-tighter uppercase text-white leading-none mb-4">BRO<span className="text-[#ccff00]">HUBS</span> {userRole === 'admin' ? 'ADMIN' : 'STUDIO'}</h3><div onClick={() => userRole === 'member' && setIsPackageModalOpen(true)} className={`flex items-center gap-2 group/meta ${userRole === 'member' ? 'cursor-pointer hover:opacity-80' : ''}`}><div className="w-1.5 h-1.5 rounded-full bg-[#ccff00] shadow-[0_0_8px_#ccff00] animate-pulse" /><span className="text-[8px] font-black text-[#ccff00] tracking-[0.2em] uppercase">{getSidebarPlanLabel()}</span>{userRole === 'member' && <ChevronRight size={10} className="text-[#ccff00] opacity-0 group-hover/meta:opacity-100 transition-opacity" />}</div></div></div>)}
        </div>

        <div className="flex flex-row md:flex-col items-center justify-around md:justify-start md:space-y-2 mb-auto w-full md:flex-1">{filteredNavItems.map((item) => { 
          const isActive = activeTab === item.label; 
          return (
            <button 
              key={item.label} 
              title={!isExpanded ? item.label : ''} 
              onClick={() => setActiveTab(item.label)} 
              className={`flex flex-col md:flex-row items-center rounded-xl transition-all group overflow-hidden relative ${isExpanded ? 'md:w-full md:px-4 md:py-3 md:gap-3' : 'md:w-14 md:h-14 md:justify-center'} ${isActive ? 'md:bg-[#ccff00] text-black font-bold shadow-[0_0_20px_rgba(204,255,0,0.15)] md:text-black' : 'text-gray-500 hover:text-white md:hover:bg-white/5'} flex-1 md:flex-none py-2`}
            >
              <div className="relative">
                <item.icon size={20} className={`shrink-0 ${isActive && window.innerWidth < 768 ? 'text-[#ccff00]' : ''}`} />
                {item.notification && (<div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black animate-pulse" />)}
              </div>
              <span className={`text-[8px] md:text-xs tracking-widest whitespace-nowrap md:animate-in md:slide-in-from-left-2 duration-300 md:flex items-center justify-between w-full mt-1 md:mt-0 ${isActive && window.innerWidth < 768 ? 'text-[#ccff00]' : ''} ${isExpanded ? 'md:inline-block' : 'md:hidden'}`}>
                {item.label}
                {isExpanded && item.notification && (<span className="w-2 h-2 bg-red-500 rounded-full animate-pulse hidden md:block" />)}
              </span>
              {isActive && !isExpanded && (<div className="absolute left-0 w-1 h-6 bg-black rounded-r-full hidden md:block" />)}
            </button>
          ); 
        })}</div>

        <div className="hidden md:flex mt-auto space-y-4 w-full flex-col items-center"><div className={`rounded-2xl bg-zinc-900/50 border border-white/5 flex flex-col transition-all overflow-hidden ${isExpanded ? 'p-4 w-full' : 'p-3 w-14 items-center justify-center'}`}>{isExpanded ? (<><div className="flex items-center gap-2 mb-1"><Clock size={10} className="text-gray-500" /><p className="text-[8px] font-bold text-gray-600 tracking-widest uppercase">UPTIME</p></div><p className="text-[#ccff00] font-mono text-[10px]">{uptime}</p></>) : (<Clock size={20} className="text-[#ccff00] animate-pulse" />)}</div><button onClick={onExit} className={`border border-white/10 rounded-2xl font-bold tracking-[0.2em] uppercase hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 transition-all active:scale-95 flex items-center justify-center ${isExpanded ? 'w-full py-4 text-[10px]' : 'w-14 h-14'}`}>{isExpanded ? (<div className="flex items-center gap-2"><LogOut size={14} /><span>EXIT</span></div>) : (<LogOut size={20} />)}</button></div>
      </aside>
      
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-zinc-950/20 relative z-10 pb-24 md:pb-0">
        <div className="w-full min-h-full p-4 sm:p-6 md:p-8 pb-32">
          {/* Persistent Broadcast View for Members to preserve monitor previews */}
          {userRole === 'member' && (
            <div style={{ display: activeTab === 'BROADCAST' ? 'block' : 'none' }}>
              <MemberBroadcastView 
                  projects={projects}
                  games={games}
                  themes={themes}
                  globalLogo={globalLogo}
                  memberPackage={(getActiveMember()?.package as AccessTier) || 'BASIC'}
                  selectedProject={activeBroadcastProject}
                  setSelectedProject={setActiveBroadcastProject}
              />
            </div>
          )}

          {/* Persistent Studio View for Admin to preserve monitor previews */}
          {userRole === 'admin' && (
            <div style={{ display: activeTab === 'STUDIO' ? 'block' : 'none' }}>
              <GlobalStudio 
                games={games}
                themes={themes}
                userRole={userRole}
                globalLogo={globalLogo}
              />
            </div>
          )}

          {renderContent()}
        </div>
      </main>
      
      {subModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl animate-in fade-in" onClick={() => { if(subModal !== 'EXPIRED') handleSubAction('CONTINUE') }} />
            <div className={`
                relative w-full max-w-[380px] bg-zinc-950 border rounded-[40px] overflow-hidden p-10 animate-in zoom-in-95 shadow-[0_0_60px_rgba(0,0,0,0.9)] text-center flex flex-col items-center
                ${subModal === 'EXPIRED' ? 'border-red-600/30' : 'border-yellow-500/30'}
            `}>
                {subModal !== 'EXPIRED' && (
                  <button onClick={() => handleSubAction('CONTINUE')} className="absolute top-8 right-8 text-gray-600 hover:text-white transition-colors"><X size={20} /></button>
                )}
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-8 ${subModal === 'EXPIRED' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                  {subModal === 'EXPIRED' ? <Timer size={40} className="animate-pulse" /> : <AlertTriangle size={40} />}
                </div>
                <h2 className="text-2xl font-[1000] tracking-tight uppercase text-white mb-2 leading-none">{subModal === 'EXPIRED' ? 'ACCESS EXPIRED' : 'RENEWAL NOTICE'}</h2>
                <p className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase mb-10">{subModal === 'EXPIRED' ? 'UPLINK TERMINATED' : `EXPIRES IN ${daysRemaining} DAYS`}</p>
                <div className="flex flex-col gap-4 w-full">
                    {subModal === 'EXPIRED' ? (
                         <button onClick={() => handleSubAction('EXTEND')} className="w-full py-5 rounded-2xl bg-[#ccff00] text-black font-[1000] text-sm tracking-widest transition-all uppercase hover:scale-[1.02] shadow-[0_0_30px_rgba(204,255,0,0.4)]">RENEW ACCESS</button>
                    ) : (
                        <>
                            <button onClick={() => handleSubAction('EXTEND')} className={`w-full py-5 rounded-2xl font-black text-[10px] tracking-widest transition-all uppercase hover:scale-[1.02] ${daysRemaining <= 3 ? 'bg-yellow-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'bg-white text-black'}`}>EXTEND PLAN</button>
                             <button onClick={() => handleSubAction('CONTINUE')} className="w-full py-5 rounded-2xl bg-zinc-900 border border-white/5 text-[10px] font-black tracking-widest text-gray-400 hover:text-white uppercase">CONTINUE LATER</button>
                        </>
                    )}
                </div>
            </div>
        </div>
      )}

      {pendingReset && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
          <div className="relative w-full max-w-md bg-zinc-950 border border-amber-500/20 rounded-[32px] overflow-hidden p-8 animate-in zoom-in-95 shadow-2xl flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-amber-500/5 border border-amber-500/20 flex items-center justify-center mb-6 text-amber-500"><ShieldAlert size={32} /></div>
            <h2 className="text-2xl font-black tracking-wide uppercase text-white mb-4">SECURITY REQUEST</h2>
            <p className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase leading-relaxed max-w-[280px] mb-8">Admin has initiated a credential reset for your account. Do you accept?</p>
            <div className="grid grid-cols-2 gap-4 w-full">
                <button onClick={handleMemberDenyReset} className="py-4 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition-all text-[10px] font-black tracking-widest uppercase">CANCEL/DENY</button>
                <button onClick={handleMemberAcceptReset} className="py-4 rounded-xl bg-amber-500 text-black border border-amber-500 hover:bg-amber-400 transition-all text-[10px] font-black tracking-widest uppercase shadow-[0_0_20px_rgba(245,158,11,0.3)]">RESET & ACCEPT</button>
            </div>
          </div>
        </div>
      )}

      {showMemberSuccessModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowMemberSuccessModal(false)} />
          <div className="relative w-full max-w-[380px] bg-zinc-950 border border-white/10 rounded-[32px] overflow-hidden p-8 animate-in zoom-in-95 shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#ccff00]/10 border border-[#ccff00]/20 flex items-center justify-center mb-6 text-[#ccff00]"><Key size={32} /></div>
            <h2 className="text-xl font-black tracking-wide uppercase text-white mb-2">ACCESS GRANTED</h2>
            <p className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase mb-6">New System Generated Key</p>
            <div className="w-full space-y-4">
               <div className="bg-black/50 border border-white/10 rounded-xl p-4 relative"><p className="text-2xl font-mono font-bold text-[#ccff00] tracking-wider select-all break-all">{generatedNewPassword}</p></div>
               <div className="grid grid-cols-1 gap-3 mt-4">
                  <button onClick={() => { navigator.clipboard.writeText(generatedNewPassword); setIsCopiedNewPass(true); setTimeout(() => setIsCopiedNewPass(false), 2000); }} className={`py-4 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${isCopiedNewPass ? 'bg-green-500/20 text-green-500 border border-green-500/50' : 'bg-white/5 text-white border border-white/10'}`}>{isCopiedNewPass ? (<><span className="text-xs">COPIED</span></>) : (<><span className="text-xs">COPY ACCESS</span></>)}</button>
                  <button onClick={() => setShowMemberSuccessModal(false)} className="py-4 rounded-xl bg-[#ccff00] text-black text-[10px] font-black tracking-widest uppercase shadow-[0_0_20px_rgba(204,255,0,0.15)]">DONE</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {getActiveMember() && (
        <PricingModal 
            isOpen={isPackageModalOpen}
            onClose={() => { if (daysRemaining >= 0) setIsPackageModalOpen(false); else onExit(); }}
            daysRemaining={daysRemaining}
            onExit={onExit}
            currentPackage={getActiveMember()?.package || 'BASIC'}
            isExpired={daysRemaining < 0}
            onRequestPackage={handlePackageRequest}
        />
      )}

      {previewAsset && themes.length > 0 && (
        <AssetPreviewModal 
            asset={previewAsset}
            theme={themes.find(t => t.gameId.toLowerCase() === previewAsset.gameId.toLowerCase()) || themes[0]}
            onClose={() => setPreviewAsset(null)}
        />
      )}

      {/* Verification modal for Admin entering Member POV */}
      {verificationMember && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setVerificationMember(null)} />
          <div className="relative w-full max-w-sm bg-[#080808] border border-white/10 hover:border-[#ccff00]/20 transition-all rounded-[32px] overflow-hidden p-8 animate-in zoom-in-95 shadow-2xl flex flex-col items-center">
            
            <button 
              onClick={() => setVerificationMember(null)} 
              className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors animate-in fade-in duration-300"
            >
              <X size={18} />
            </button>

            <div className="w-16 h-16 rounded-full bg-[#ccff00]/5 border border-[#ccff00]/20 flex items-center justify-center mb-6 text-[#ccff00] shadow-[0_0_15px_rgba(204,255,0,0.1)]">
              <Lock size={28} />
            </div>

            <h2 className="text-lg font-black tracking-tight text-white uppercase text-center mb-1">
              POV VERIFICATION
            </h2>
            <p className="text-[9px] font-black text-[#ccff00] tracking-[0.25em] uppercase mb-6 text-center">
              Event & Tech Support Authorization
            </p>

            <div className="text-center mb-6">
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Admin memerlukan izin otorisasi untuk masuk ke POV <span className="text-white font-bold">{verificationMember.name}</span> guna membantu setup kebutuhan Event atau memperbaiki kendala teknis.
              </p>
            </div>

            {/* Simulated Device Outbox Notification */}
            <div className="w-full bg-zinc-905/40 border border-white/5 rounded-2xl p-4 mb-6 text-left relative overflow-hidden bg-black/40">
              <div className="absolute top-0 right-0 px-2 py-0.5 bg-[#ccff00]/10 text-[#ccff00] text-[6px] font-black tracking-widest rounded-bl uppercase">
                Device Outbox Sim
              </div>
              <span className="text-[8px] font-black text-[#ccff00]/85 tracking-widest uppercase block mb-1">
                📩 SMS DIKIRIM KE {verificationMember.name.toUpperCase()}
              </span>
              <p className="text-[10px] text-zinc-400 font-medium leading-relaxed italic">
                "{verificationMember.name}, Brohubs Security: Gunakan kode verification <strong className="text-white not-italic font-extrabold bg-[#ccff00]/10 px-1.5 py-0.5 rounded font-mono text-xs">{verificationCode}</strong> untuk mengizinkan Admin masuk ke POV akun Anda."
              </p>
              
              <button
                type="button"
                onClick={() => setVerificationInput(verificationCode)}
                className="mt-3 text-[9px] font-black text-[#ccff00] hover:text-[#d4ff33] uppercase tracking-wider flex items-center gap-1 hover:underline transition-all"
              >
                <Zap size={10} className="fill-current" /> TEMPELKAN KODE OTOMATIS
              </button>
            </div>

            {/* Verification input field */}
            <div className="w-full space-y-4">
              <div className="relative">
                <input
                  type="text"
                  maxLength={4}
                  placeholder="KODE"
                  value={verificationInput}
                  onChange={(e) => {
                    setVerificationInput(e.target.value.replace(/\D/g, ''));
                    setVerificationError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVerifyAndEnterPOV();
                  }}
                  className="bg-black border border-white/10 hover:border-[#ccff00]/30 focus:border-[#ccff00] focus:ring-1 focus:focus:ring-[#ccff00] transition-all text-[#ccff00] text-3xl font-black font-mono tracking-[0.4em] text-center rounded-2xl p-4 w-full h-14 uppercase placeholder:text-zinc-800"
                />
              </div>

              {verificationError && (
                <div className="text-red-500 font-bold uppercase tracking-wider text-[9px] text-center animate-pulse">
                  ⚠️ {verificationError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-4 pt-1">
                <button 
                  type="button"
                  onClick={() => setVerificationMember(null)}
                  className="py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-500 hover:text-white transition-all text-[10px] font-black tracking-widest uppercase"
                >
                  BATAL
                </button>
                <button 
                  type="button"
                  onClick={handleVerifyAndEnterPOV}
                  className="py-3.5 rounded-xl bg-[#ccff00] text-black font-black hover:bg-[#d4ff33] transition-all text-[10px] tracking-widest uppercase shadow-[0_0_20px_rgba(204,255,0,0.15)] hover:shadow-[0_0_25px_rgba(204,255,0,0.25)] flex items-center justify-center gap-1.5"
                >
                  <Unlock size={12} />
                  VERIFIKASI
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
                    setVerificationCode(newCode);
                    setVerificationInput('');
                    setVerificationError(null);
                  }}
                  className="text-[8px] font-bold text-zinc-600 hover:text-white uppercase tracking-widest transition-colors"
                >
                  KIRIM ULANG KODE VERIFIKASI (RESEND CODE)
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      <PopUpAd ad={activePopUpAd} onClose={() => setActivePopUpAd(null)} />
    </div>
  );
};

export default Dashboard;
