
import React, { useState } from 'react';
import { Copy, RefreshCw, Activity, X, Lock, Check, Key, AlertTriangle, ShieldAlert, BadgeAlert, Calendar, Clock, MoreVertical, Trash2, Loader2, Zap, Search, Bell, Inbox, ChevronRight, Filter } from 'lucide-react';
import { Member } from '@/types';
import { useT } from '@/i18n/LanguageContext';

interface MemberManagementProps {
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  onSelectMember: (member: Member) => void;
  resetRequests?: string[]; 
  onClearRequest?: (email: string) => void; 
}

const MemberManagement: React.FC<MemberManagementProps> = ({
    members,
    setMembers,
    onSelectMember,
    resetRequests = [],
    onClearRequest
}) => {
  const t = useT();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false); // New Inbox Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  
  // Inbox Filter State
  const [requestSearchTerm, setRequestSearchTerm] = useState('');
  const [requestFilterType, setRequestFilterType] = useState<'ALL' | 'RESET' | 'EXTENSION'>('ALL');

  // Reset Flow State
  const [resetTarget, setResetTarget] = useState<Member | null>(null);
  const [extensionTarget, setExtensionTarget] = useState<Member | null>(null);
  
  // Feedback States
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Registration State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    package: 'BASIC',
    duration: '1' // Months as string
  });

  // Re-activation State
  const [extensionData, setExtensionData] = useState({
      duration: '1',
      package: 'PREMIUM'
  });
  
  // Password Generation State
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Identify members with pending extensions
  const pendingExtensions = members.filter(m => m.extensionPending);
  const totalRequests = resetRequests.length + pendingExtensions.length;

  // Filtered Requests Logic
  const filteredResetRequests = resetRequests.filter(req => {
      const matchesSearch = req.toLowerCase().includes(requestSearchTerm.toLowerCase());
      const matchesType = requestFilterType === 'ALL' || requestFilterType === 'RESET';
      return matchesSearch && matchesType;
  });

  const filteredExtensionRequests = pendingExtensions.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(requestSearchTerm.toLowerCase()) || 
                            member.email.toLowerCase().includes(requestSearchTerm.toLowerCase());
      const matchesType = requestFilterType === 'ALL' || requestFilterType === 'EXTENSION';
      return matchesSearch && matchesType;
  });

  const hasFilteredResults = filteredResetRequests.length > 0 || filteredExtensionRequests.length > 0;

  const cyclePackage = (email: string) => {
    setMembers(prev => prev.map(m => {
      if (m.email === email) {
        // Cycle through packages: BASIC -> PREMIUM -> ULTIMATE -> BASIC
        const nextPkg = m.package === 'BASIC' ? 'PREMIUM' : m.package === 'PREMIUM' ? 'ULTIMATE' : 'BASIC';
        return { ...m, package: nextPkg };
      }
      return m;
    }));
  };

  const getPackageStyles = (pkg: string) => {
    switch (pkg) {
      case 'PRO':
      case 'PREMIUM':
        return 'border border-blue-600/50 bg-blue-600/10 text-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.2)]';
      case 'ULTRA':
      case 'ULTIMATE':
        return 'border border-[#ccff00]/50 bg-[#ccff00]/10 text-[#ccff00] shadow-[0_0_10px_rgba(204,255,0,0.2)]';
      case 'BASIC':
      default:
        return 'border border-zinc-700 bg-zinc-900 text-zinc-400';
    }
  };

  const generateSystemPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pass = "BHS";
    for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    return pass;
  };

  // --- Add Member Logic ---

  const handleAddMember = () => {
    if (!formData.name || !formData.email) return;

    // Generate Password
    const newPassword = generateSystemPassword();
    setGeneratedPassword(newPassword);

    // Calculate Expiry
    const date = new Date();
    date.setMonth(date.getMonth() + parseInt(formData.duration));
    const expiryISO = date.toISOString().split('T')[0];

    // Create Member
    const newMember: Member = {
      name: formData.name,
      email: formData.email.toUpperCase(),
      status: 'OFFLINE',
      package: formData.package,
      initial: formData.name.charAt(0).toUpperCase(),
      expiryDate: expiryISO,
      resetStatus: 'CONFIRMED',
      tempPassword: newPassword,
      needsNewPassword: true,
    };

    setMembers(prev => [...prev, newMember]);
    
    // Switch Modals
    setIsModalOpen(false);
    setShowSuccessModal(true);
    setIsCopied(false);
  };

  // --- Re-activation Logic ---
  const handleExtendPlan = () => {
      if(!extensionTarget) return;

      const newPass = generateSystemPassword();
      setGeneratedPassword(newPass);

      const date = new Date();
      date.setMonth(date.getMonth() + parseInt(extensionData.duration));
      const expiryISO = date.toISOString().split('T')[0];

      setMembers(prev => prev.map(m => {
          if (m.email === extensionTarget.email) {
              return {
                  ...m,
                  expiryDate: expiryISO,
                  package: extensionData.package,
                  status: 'ONLINE', // Reactivate
                  isExtensionFlagged: false,
                  isExpired: false,
                  extensionPending: false,
                  requestedPackage: undefined, // Clear request
                  tempPassword: newPass,
                  needsNewPassword: true,
              };
          }
          return m;
      }));

      setExtensionTarget(null);
      setShowSuccessModal(true); // Show new password to admin
      setIsCopied(false);
  };

  const handleCloseSuccess = () => {
    setFormData({ name: '', email: '', package: 'BASIC', duration: '1' });
    setGeneratedPassword('');
    setShowSuccessModal(false);
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // --- Row Action Logic ---

  const handleCopyUser = (member: Member) => {
    const textToCopy = `${member.name} | ${member.email}`;
    navigator.clipboard.writeText(textToCopy);
    
    setCopyFeedback(member.email); // Show copied state for this specific row
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const initiateReset = (member: Member) => {
    setResetTarget(member);
  };

  const confirmReset = () => {
    if (!resetTarget) return;

    setMembers(prev => prev.map(m => {
      if (m.email === resetTarget.email) {
        return { ...m, resetStatus: 'PENDING_APPROVAL', tempPassword: undefined };
      }
      return m;
    }));

    setResetTarget(null);
  };

  // Approve request coming from Navbar (Forgot Password flow)
  const approveRequest = (email: string) => {
    const member = members.find(m => m.email === email || m.name === email);
    
    if (member) {
        // Auto reset
        const newPass = generateSystemPassword();
        setMembers(prev => prev.map(m => {
            if (m.email === member.email) {
                return { ...m, tempPassword: newPass, resetStatus: 'CONFIRMED' };
            }
            return m;
        }));
    } else {
        alert("Member not found in database, but request cleared.");
    }

    if (onClearRequest) onClearRequest(email);
    
    // Close modal if no more requests
    if (totalRequests <= 1) {
        setIsRequestsModalOpen(false);
    }
  };

  const handleApproveExtension = (member: Member) => {
      // Close the request list modal first
      setIsRequestsModalOpen(false);
      
      // Just opens the modal pre-filled
      setExtensionTarget(member);
      // Auto-fill with requested package if available, else current package
      setExtensionData({ 
        duration: '1', 
        package: member.requestedPackage || member.package 
      });
  };

  // Filter members based on search term and sort by extension request priority
  const filteredMembers = members
    .filter(member => 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
        // Show extensionPending = true first
        if (a.extensionPending === b.extensionPending) return 0;
        return a.extensionPending ? -1 : 1;
    });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <h1 className="text-4xl font-black tracking-tight text-white shrink-0">{t('mm.title')}</h1>
        
        {/* Search Input */}
        <div className="flex-1 w-full md:max-w-md relative group mx-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#ccff00] transition-colors" size={16} />
            <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('mm.searchPlaceholder')}
                className="w-full bg-black border border-white/10 rounded-xl py-4 pl-12 pr-4 text-xs font-bold text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#ccff00]/50 transition-all uppercase tracking-wider shadow-inner"
            />
        </div>

        <div className="flex items-center gap-4 shrink-0">
            {/* INBOX BUTTON */}
            <button 
                onClick={() => setIsRequestsModalOpen(true)}
                className={`
                    relative p-4 rounded-xl border transition-all group
                    ${totalRequests > 0 
                        ? 'bg-zinc-900 border-white/20 hover:bg-zinc-800 hover:border-white/40' 
                        : 'bg-zinc-950 border-white/5 hover:bg-zinc-900 text-gray-600'
                    }
                `}
            >
                <Inbox size={20} className={totalRequests > 0 ? "text-white" : "text-gray-500"} />
                {totalRequests > 0 && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white border-2 border-black animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                        {totalRequests}
                    </div>
                )}
            </button>

            <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#ccff00] text-black px-8 py-4 rounded-xl font-black text-xs tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(204,255,0,0.3)] uppercase"
            >
            {t('mm.addNewMember')}
            </button>
        </div>
      </div>

      {/* REQUESTS MODAL (INBOX) */}
      {isRequestsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsRequestsModalOpen(false)} />
            <div className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[32px] overflow-hidden p-8 animate-in zoom-in-95 shadow-2xl flex flex-col max-h-[80vh]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                    <div>
                        <h2 className="text-2xl font-black tracking-wide uppercase text-white mb-2 flex items-center gap-3">
                            {t('mm.adminInbox')}
                            {totalRequests > 0 && (
                                <span className="px-3 py-1 bg-red-500 text-white rounded-full text-[10px] font-black tracking-wider">
                                    {totalRequests} {t('mm.pending')}
                                </span>
                            )}
                        </h2>
                        <p className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">
                            {t('mm.systemNotifications')}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        {/* Inbox Search */}
                        <div className="relative group flex-1 md:w-48">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#ccff00] transition-colors" size={14} />
                            <input 
                                type="text"
                                value={requestSearchTerm}
                                onChange={(e) => setRequestSearchTerm(e.target.value)}
                                placeholder={t('mm.filterRequests')}
                                className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-[10px] font-bold text-white focus:border-[#ccff00]/50 outline-none transition-all uppercase placeholder:text-zinc-700"
                            />
                        </div>

                        {/* Filter Button */}
                        <button 
                            onClick={() => setRequestFilterType(prev => prev === 'ALL' ? 'RESET' : prev === 'RESET' ? 'EXTENSION' : 'ALL')}
                            className={`p-2.5 rounded-xl border transition-all ${requestFilterType !== 'ALL' ? 'bg-[#ccff00]/10 border-[#ccff00]/30 text-[#ccff00]' : 'bg-black/50 border-white/10 text-zinc-500 hover:text-white'}`}
                            title={t('mm.filterLabel').replace('{type}', requestFilterType)}
                        >
                            <Filter size={16} />
                        </button>

                        <button 
                            onClick={() => setIsRequestsModalOpen(false)}
                            className="p-2.5 text-gray-500 hover:text-white transition-colors bg-black/50 border border-transparent hover:border-white/10 rounded-xl"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                    {!hasFilteredResults && totalRequests > 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                            <Search size={24} className="mb-2 opacity-50" />
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t('mm.noMatchingRequests')}</p>
                        </div>
                    ) : totalRequests === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <Check size={32} className="text-[#ccff00]" />
                            </div>
                            <h3 className="text-white font-bold uppercase tracking-widest mb-1">{t('mm.allCaughtUp')}</h3>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">{t('mm.noPendingRequests')}</p>
                        </div>
                    ) : (
                        <>
                            {/* Security / Reset Requests */}
                            {filteredResetRequests.map((req, i) => (
                                <div key={`reset-${i}`} className="flex items-center justify-between bg-red-500/5 p-5 rounded-2xl border border-red-500/20 group hover:border-red-500/40 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                                            <ShieldAlert size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-bold text-white uppercase">{req}</span>
                                                <span className="text-[8px] font-black bg-red-500 text-white px-2 py-0.5 rounded tracking-widest">{t('mm.critical')}</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-red-400/60 uppercase tracking-wider">{t('mm.requestedPasswordReset')}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => approveRequest(req)}
                                        className="bg-red-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)] flex items-center gap-2"
                                    >
                                        {t('mm.approve')} <ChevronRight size={12} />
                                    </button>
                                </div>
                            ))}

                            {/* Extension Requests */}
                            {filteredExtensionRequests.map((member) => (
                                <div key={`ext-${member.email}`} className="flex items-center justify-between bg-amber-500/5 p-5 rounded-2xl border border-amber-500/20 group hover:border-amber-500/40 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-bold text-white uppercase">{member.name}</span>
                                                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">| {member.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500/80 uppercase tracking-wider">
                                                <span>{t('mm.reqPrefix')}: {member.requestedPackage || t('mm.renewal')}</span>
                                                <span className="text-zinc-700">&bull;</span>
                                                <span>{t('mm.curPrefix')}: {member.package}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleApproveExtension(member)}
                                        className="bg-amber-500 text-black px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase hover:bg-amber-400 transition-colors shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-2"
                                    >
                                        {t('mm.review')} <ChevronRight size={12} />
                                    </button>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-black border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
        {/* Table Header - HIDDEN ON MOBILE */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-6 border-b border-white/5">
          <div className="col-span-4 text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase">{t('mm.colUserDetails')}</div>
          <div className="col-span-2 text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase text-center">{t('mm.colStatus')}</div>
          <div className="col-span-2 text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase text-center">{t('mm.colPackage')}</div>
          <div className="col-span-2 text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase">{t('mm.colSubscription')}</div>
          <div className="col-span-2 text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase text-right">{t('mm.colControls')}</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-white/5">
          {filteredMembers.length > 0 ? (
            filteredMembers.map((member, idx) => {
                const isRequested = resetRequests.includes(member.email);
                const hasNewAccess = !!member.tempPassword || member.resetStatus === 'CONFIRMED';
                const isPendingApproval = member.resetStatus === 'PENDING_APPROVAL';
                
                // Automatic Expiry Detection & Extension Request Handling
                const isDateExpired = new Date(member.expiryDate) < new Date();
                
                const needsExtension = member.isExtensionFlagged || member.needsNewPassword || member.isExpired || isDateExpired || member.extensionPending;
                
                const isCritical = member.needsNewPassword || member.isExpired || isDateExpired; 

                return (
                <div 
                    key={member.email} 
                    className="flex flex-col md:grid md:grid-cols-12 gap-4 px-6 md:px-8 py-6 items-start md:items-center hover:bg-zinc-900/30 transition-colors group relative"
                >
                    {/* User Details */}
                    <div 
                      className="md:col-span-4 flex items-center gap-4 cursor-pointer w-full"
                      onClick={() => onSelectMember(member)}
                    >
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-900 flex items-center justify-center text-xs md:text-sm font-black text-white border border-white/5 group-hover:border-[#ccff00]/40 transition-colors">
                          {member.initial}
                      </div>
                      <div className="flex-1">
                          <h4 className="font-bold text-sm md:text-base text-white group-hover:text-[#ccff00] transition-colors leading-tight">
                            {member.name}
                          </h4>
                          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-0.5">{member.email}</p>
                      </div>
                      <div className="md:hidden flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                            member.status === 'OFFLINE' ? 'bg-zinc-600' : 'bg-[#ccff00] shadow-[0_0_8px_#ccff00] animate-pulse'
                        }`} />
                      </div>
                    </div>

                    {/* Status - Desktop Only Section or inline on mobile */}
                    <div className="hidden md:flex col-span-2 items-center justify-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                          member.status === 'OFFLINE' ? 'bg-zinc-600' : 'bg-[#ccff00] shadow-[0_0_8px_#ccff00] animate-pulse'
                      }`} />
                      <span className={`text-[10px] font-black tracking-widest uppercase ${
                          member.status === 'OFFLINE' ? 'text-zinc-600' : 'text-white'
                      }`}>
                          {member.status}
                      </span>
                    </div>

                    {/* Mobile Stats Row */}
                    <div className="flex md:hidden items-center justify-between w-full py-2 border-y border-white/5 my-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-black text-zinc-600 tracking-[0.2em] uppercase">{t('mm.mobilePackage')}</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              cyclePackage(member.email);
                            }}
                            className={`px-3 py-1 rounded-lg text-[8px] font-black tracking-widest uppercase min-w-[70px] text-center transition-all ${getPackageStyles(member.package)}`}
                          >
                            {member.package}
                          </button>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                            <span className="text-[8px] font-black text-zinc-600 tracking-[0.2em] uppercase">{t('mm.mobileExpiry')}</span>
                            <div className="flex items-center gap-2 text-zinc-500">
                                <Calendar size={12} />
                                <span className={`text-[10px] font-bold tracking-widest uppercase ${isDateExpired ? 'text-red-500' : 'text-zinc-400'}`}>
                                    {member.expiryDate}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Package - Desktop Only */}
                    <div className="hidden md:flex col-span-2 justify-center">
                    <button 
                        onClick={(e) => {
                        e.stopPropagation();
                        cyclePackage(member.email);
                        }}
                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase min-w-[80px] text-center transition-all ${getPackageStyles(member.package)} hover:scale-105`}
                    >
                        {member.package}
                    </button>
                    </div>

                    {/* Subscription - Desktop Only */}
                    <div className="hidden md:flex md:col-span-2 items-center justify-center gap-2 text-zinc-500">
                    <Calendar size={14} />
                    <span className={`text-[10px] font-bold tracking-widest uppercase ${isDateExpired ? 'text-red-500' : 'text-zinc-400'}`}>
                        {member.expiryDate}
                    </span>
                    {member.extensionPending && (
                        <div 
                            className="w-4 h-4 rounded bg-amber-500/20 text-amber-500 flex items-center justify-center animate-pulse relative group/tooltip cursor-help"
                            title={t('mm.extensionRequested')}
                        >
                            <Clock size={10} />
                            {member.requestedPackage && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black border border-white/10 text-[8px] whitespace-nowrap hidden group-hover/tooltip:block z-50 rounded text-white font-black tracking-wider uppercase">
                                    {t('mm.reqPrefix')}: {member.requestedPackage}
                                </div>
                            )}
                        </div>
                    )}
                    </div>

                    {/* Controls */}
                    <div className="md:col-span-2 flex items-center justify-end relative w-full md:w-auto">
                        {/* The Overlay Button covers controls if extension/renewal is needed */}
                        {needsExtension ? (
                            <div className="relative flex items-center justify-end w-full z-10">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleApproveExtension(member);
                                    }}
                                    className={`
                                        w-full md:w-auto px-6 py-4 md:py-3 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all shadow-lg flex items-center justify-center gap-2 animate-in zoom-in duration-300
                                        ${isCritical 
                                            ? 'bg-[#ccff00] text-black shadow-[0_0_15px_#ccff00]' // Expired/Reset (Critical -> Green)
                                            : 'bg-amber-500 text-black border border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' // Warning (H-3 / Request -> Amber)
                                        }
                                    `}
                                >
                                    {isCritical ? <Zap size={14} fill="currentColor" /> : <Clock size={14} />}
                                    {t('mm.extendPlan')}
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-2">
                                {hasNewAccess ? (
                                    <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(member.tempPassword || '');
                                        setCopyFeedback(`${member.email}-pass`);
                                        setTimeout(() => setCopyFeedback(null), 2000);
                                    }}
                                    className={`flex-1 md:flex-none px-3 py-3 md:py-2 text-[9px] font-black border rounded-lg transition-all tracking-widest uppercase flex items-center justify-center gap-2 ${
                                        copyFeedback === `${member.email}-pass`
                                        ? 'bg-green-500/20 text-green-500 border-green-500' 
                                        : 'bg-[#ccff00]/10 text-[#ccff00] border-[#ccff00]/50 hover:bg-[#ccff00]/20'
                                    }`}
                                    title={t('mm.copySystemPassword')}
                                    >
                                    {copyFeedback === `${member.email}-pass` ? <Check size={12} /> : <Key size={12} />}
                                    {copyFeedback === `${member.email}-pass` ? t('mm.copied') : t('mm.copyKode')}
                                    </button>
                                ) : isPendingApproval ? (
                                    <button 
                                    disabled
                                    className="flex-1 md:flex-none px-3 py-3 md:py-2 text-[9px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded-lg transition-all tracking-widest uppercase flex items-center justify-center gap-2 cursor-wait"
                                    >
                                    <Loader2 size={12} className="animate-spin" />
                                    {t('mm.waiting')}
                                    </button>
                                ) : isRequested ? (
                                    <button 
                                    onClick={() => approveRequest(member.email)}
                                    className="flex-1 md:flex-none px-3 py-3 md:py-2 text-[9px] font-black text-white bg-red-500 hover:bg-red-600 border border-red-500 rounded-lg transition-all tracking-widest uppercase flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse"
                                    title={t('mm.approveResetRequest')}
                                    >
                                    <ShieldAlert size={12} />
                                    {t('mm.accReset')}
                                    </button>
                                ) : (
                                    <button 
                                    onClick={() => initiateReset(member)}
                                    className="flex-1 md:flex-none px-3 py-3 md:py-2 text-[9px] font-black text-zinc-600 hover:text-white border border-transparent hover:border-white/10 hover:bg-white/5 rounded-lg transition-all tracking-widest uppercase text-center"
                                    title={t('mm.resetAccessTitle')}
                                    >
                                    {t('mm.resetAccess')}
                                    </button>
                                )}
                                
                                <div className="w-px h-4 bg-zinc-800 mx-2 hidden md:block" />
                                
                                <button 
                                onClick={() => handleCopyUser(member)}
                                className={`px-4 md:px-3 py-3 md:py-2 text-[9px] font-black rounded-lg transition-all tracking-widest uppercase flex items-center justify-center gap-2 ${copyFeedback === member.email ? 'text-[#ccff00] bg-[#ccff00]/10' : 'text-zinc-600 hover:text-white hover:bg-white/5 border border-white/5 md:border-transparent hover:border-white/10'}`}
                                title={t('mm.copySystemPassword')}
                                >
                                {copyFeedback === member.email ? <Check size={12} /> : <Copy size={12} />}
                                {copyFeedback === member.email ? t('mm.copied') : t('mm.copy')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                );
            })
          ) : (
             <div className="p-12 text-center text-zinc-600 flex flex-col items-center">
                <Search size={24} className="mb-2 opacity-50" />
                <span className="text-[10px] font-bold tracking-widest uppercase">{t('mm.noMatchingMembers')}</span>
             </div>
          )}
        </div>
      </div>

      {/* Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-[32px] overflow-hidden p-8 animate-in zoom-in-95 shadow-2xl">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="mb-8">
              <h2 className="text-2xl font-black tracking-wide uppercase text-[#ccff00] mb-2">
                {t('mm.registerMember')}
              </h2>
              <p className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">
                {t('mm.personnelDeployment')}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase block">
                  {t('mm.memberIdentification')}
                </label>
                <input
                  type="text"
                  placeholder={t('mm.fullNamePlaceholder')}
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#ccff00]/50 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase block">
                  {t('mm.networkAddress')}
                </label>
                <input
                  type="email"
                  placeholder={t('mm.emailPlaceholder')}
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#ccff00]/50 outline-none transition-all"
                />
              </div>

               <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase block">
                  {t('mm.duration')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { label: t('mm.dur1mo'), val: '1' },
                        { label: t('mm.dur3mo'), val: '3' },
                        { label: t('mm.dur6mo'), val: '6' },
                        { label: t('mm.dur1yr'), val: '12' }
                    ].map((opt) => (
                        <button
                            key={opt.val}
                            onClick={() => setFormData({...formData, duration: opt.val})}
                            className={`py-2 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${
                                formData.duration === opt.val 
                                ? 'bg-[#ccff00] text-black'
                                : 'bg-white/5 text-gray-400 hover:text-white'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase block">
                  {t('mm.subscriptionPackage')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['BASIC', 'PREMIUM', 'ULTIMATE'].map((pkg) => (
                    <button
                      key={pkg}
                      onClick={() => setFormData({...formData, package: pkg})}
                      className={`
                        py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all
                        ${formData.package === pkg 
                          ? 'bg-white text-black' 
                          : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'
                        }
                      `}
                    >
                      {pkg}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleAddMember}
                className="w-full bg-[#ccff00] text-black py-4 rounded-xl font-black text-xs tracking-[0.2em] uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(204,255,0,0.2)] mt-4"
              >
                {t('mm.authorizeNode')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REACTIVATION / EXTENSION MODAL */}
      {extensionTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setExtensionTarget(null)} />
          <div className="relative w-full max-w-md bg-zinc-950 border border-[#ccff00]/20 rounded-[32px] overflow-hidden p-8 animate-in zoom-in-95 shadow-[0_0_50px_rgba(204,255,0,0.1)]">
             <button 
              onClick={() => setExtensionTarget(null)}
              className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="mb-8">
              <h2 className="text-2xl font-black tracking-wide uppercase text-white mb-2">
                {t('mm.reactivateMember')}
              </h2>
              <p className="text-[10px] font-black text-[#ccff00] tracking-[0.2em] uppercase">
                {extensionTarget.name}
              </p>
            </div>

            <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase block">
                    {t('mm.duration')}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { label: t('mm.dur1mo'), val: '1' },
                            { label: t('mm.dur3mo'), val: '3' },
                            { label: t('mm.dur6mo'), val: '6' },
                            { label: t('mm.dur1yr'), val: '12' }
                        ].map((opt) => (
                            <button
                                key={opt.val}
                                onClick={() => setExtensionData({...extensionData, duration: opt.val})}
                                className={`py-2 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${
                                    extensionData.duration === opt.val 
                                    ? 'bg-[#ccff00] text-black'
                                    : 'bg-white/5 text-gray-400 hover:text-white'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase block">
                    {t('mm.subscriptionPackage')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                    {['BASIC', 'PREMIUM', 'ULTIMATE'].map((pkg) => (
                        <button
                        key={pkg}
                        onClick={() => setExtensionData({...extensionData, package: pkg})}
                        className={`
                            py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all
                            ${extensionData.package === pkg 
                            ? 'bg-white text-black' 
                            : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'
                            }
                        `}
                        >
                        {pkg}
                        </button>
                    ))}
                    </div>
                 </div>

                 <button 
                    onClick={handleExtendPlan}
                    className="w-full bg-[#ccff00] text-black py-4 rounded-xl font-black text-xs tracking-[0.2em] uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(204,255,0,0.2)] mt-4"
                >
                    {t('mm.confirmExtension')}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setResetTarget(null)} />
          <div className="relative w-full max-w-md bg-zinc-950 border border-amber-500/20 rounded-[32px] overflow-hidden p-8 animate-in zoom-in-95 shadow-[0_0_50px_rgba(204,255,0,0.1)] flex flex-col items-center text-center">
            
            <div className="w-20 h-20 rounded-full bg-amber-500/5 border border-amber-500/20 flex items-center justify-center mb-6 text-amber-500">
                <ShieldAlert size={32} />
            </div>

            <h2 className="text-2xl font-black tracking-wide uppercase text-white mb-4">
              {t('mm.revokeAccess')}
            </h2>

            <p className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase leading-relaxed max-w-[280px] mb-8">
              {t('mm.revokeConfirmMsg').split('{name}')[0]}<span className="text-white">{resetTarget.name}</span>{t('mm.revokeConfirmMsg').split('{name}')[1]}
            </p>

            {/* Terminal Status */}
            <div className="w-full bg-amber-950/10 border border-amber-500/10 rounded-xl p-6 mb-8 text-left">
                <div className="font-mono text-[10px] font-bold text-amber-500/80 space-y-3">
                    <p className="flex items-center gap-3">
                        <span className="text-amber-500">&gt;</span> {t('mm.initiatingHandshake')}
                    </p>
                    <p className="flex items-center gap-3">
                        <span className="text-amber-500">&gt;</span> {t('mm.waitingAdminApproval')}
                    </p>
                    <p className="flex items-center gap-3 animate-pulse">
                        <span className="text-amber-500">&gt;</span> {t('mm.generatingKey')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
                <button 
                    onClick={() => setResetTarget(null)}
                    className="py-4 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all text-[10px] font-black tracking-widest uppercase"
                >
                    {t('mm.cancel')}
                </button>
                <button
                    onClick={confirmReset}
                    className="py-4 rounded-xl bg-amber-500 text-black border border-amber-500 hover:bg-amber-400 transition-all text-[10px] font-black tracking-widest uppercase shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                >
                    {t('mm.confirmReset')}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Success / Password Display Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={handleCloseSuccess} />
          <div className="relative w-full max-w-sm bg-zinc-950 border border-white/10 rounded-[32px] overflow-hidden p-8 animate-in zoom-in-95 shadow-2xl flex flex-col items-center text-center">
            
            <div className="w-16 h-16 rounded-full bg-[#ccff00]/10 border border-[#ccff00]/20 flex items-center justify-center mb-6 text-[#ccff00]">
              <Key size={32} />
            </div>

            <h2 className="text-xl font-black tracking-wide uppercase text-white mb-2">
              {t('mm.registrationComplete')}
            </h2>
            <p className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase mb-6">
              {t('mm.verifCodeHint')}
            </p>

            <div className="w-full space-y-4">
               <div className="bg-black/50 border border-white/10 rounded-xl p-4 relative group">
                  <p className="text-2xl font-mono font-bold text-[#ccff00] tracking-wider select-all break-all">
                    {generatedPassword}
                  </p>
                  <div className="absolute top-0 right-0 p-1">
                    <div className="w-2 h-2 bg-[#ccff00] rounded-full animate-pulse shadow-[0_0_5px_#ccff00]" />
                  </div>
               </div>
               
               <p className="text-[9px] text-gray-600 font-medium">
                 {t('mm.sendCodeInstruction')}
               </p>

               <div className="grid grid-cols-1 gap-3 mt-4">
                  <button 
                    onClick={copyPassword}
                    className={`
                      py-4 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2
                      ${isCopied 
                        ? 'bg-green-500/20 text-green-500 border border-green-500/50' 
                        : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                      }
                    `}
                  >
                    {isCopied ? (
                      <>
                        <Check size={14} /> {t('mm.copiedToClipboard')}
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> {t('mm.copyVerifCode')}
                      </>
                    )}
                  </button>

                  <button 
                    onClick={handleCloseSuccess}
                    className="py-4 rounded-xl bg-[#ccff00] text-black text-[10px] font-black tracking-widest uppercase hover:opacity-90 transition-all shadow-[0_0_20px_rgba(204,255,0,0.15)]"
                  >
                    {t('mm.done')}
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberManagement;
