
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import LandingPage from '@/components/LandingPage';
import AIAssist from '@/components/AIAssist';
import Dashboard from '@/features/admin-dashboard/Dashboard';
import PubgMobileView from '@/features/games/pubg-mobile/PubgMobileView';
import StandaloneProgramView from '@/features/companion/StandaloneProgramView';
import { Bot, Shield, User as UserIcon, ArrowLeft, Radio, Signal, Wifi, Activity } from 'lucide-react';

import { getAds, saveAds } from '@/features/ads/adService';
import { getMembers } from '@/services/memberService';
import { getBranding, saveBrandingLogo, resetBrandingLogo } from '@/services/brandingService';
import { Ad, Member } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';
import { restoreSession, logoutUser, emailOf } from '@/features/auth/authService';

const EMPTY_FAVICON =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22/%3E';

const updateBrowserFavicon = (logoUrl: string | null) => {
  if (typeof document === 'undefined') return;
  const faviconId = 'brohubs-dynamic-favicon';
  const href = logoUrl?.trim() || EMPTY_FAVICON;
  const iconLinks = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="alternate icon"]')
  );
  let link = document.querySelector<HTMLLinkElement>(`link#${faviconId}`) ?? iconLinks[0];

  if (!link) {
    link = document.createElement('link');
    document.head.appendChild(link);
  }

  const iconType = href.startsWith('data:image/svg+xml') ? 'image/svg+xml' : 'image/png';
  const faviconLinks = iconLinks.length > 0 ? iconLinks : [link];
  faviconLinks.forEach((faviconLink) => {
    faviconLink.id = faviconLink === link ? faviconId : faviconLink.id;
    faviconLink.rel = 'icon';
    faviconLink.type = iconType;
    faviconLink.href = href;
  });
};

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'dashboard' | 'studio' | 'broadcast_showcase' | 'program'>('landing');
  const [isAIOpen, setIsAIOpen] = useState(false);
  // Default 'member', bukan 'admin': sebelum ada sesi terverifikasi, hak paling
  // rendah yang berlaku. Peran sebenarnya datang dari kolom `role` di profiles.
  const [userRole, setUserRole] = useState<'admin' | 'member'>('member');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [memberRequiresPasswordSetup, setMemberRequiresPasswordSetup] = useState(false);
  
  const [adminTier, setAdminTier] = useState<'BASIC' | 'PREMIUM' | 'ULTIMATE'>('ULTIMATE');
  const [globalLogo, setGlobalLogo] = useState<string | null>(null);
  const [adminLogo, setAdminLogo] = useState<string | null>(null);
  const [resetRequests, setResetRequests] = useState<string[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);

  // Bahasa: pra-login SELALU English; pasca-login (dashboard) pakai pilihan user.
  const { setLoggedIn } = useLanguage();
  useEffect(() => { setLoggedIn(view === 'dashboard'); }, [view, setLoggedIn]);

  useEffect(() => {
    updateBrowserFavicon(globalLogo);
  }, [globalLogo]);

  useEffect(() => {
    // Enable direct navigation to the standalone program overlay view
    const params = new URLSearchParams(window.location.search);
    const isProgramView =
      params.get('view') === 'program' || window.location.pathname.includes('/o/');

    if (isProgramView) {
      setView('program');
      return;
    }

    // Pulihkan sesi Supabase yang masih hidup. Link output OBS (/o/...) sengaja
    // dilewati: halaman itu harus tetap tampil tanpa login.
    void restoreSession()
      .then((result) => {
        if (!result) return;
        setUserRole(result.role);
        setCurrentUserEmail(emailOf(result));
        setMemberRequiresPasswordSetup(
          result.role === 'member' && result.requiresPasswordSetup
        );
        setView('dashboard');
      })
      .catch((error) => {
        console.error('[auth] Gagal memulihkan sesi:', error);
      });
  }, []);

  useEffect(() => {
    // 1) Cache localStorage dulu — paint instan & fallback offline.
    const savedGlobal = localStorage.getItem('globalLogo');
    const savedAdmin = localStorage.getItem('adminLogo');
    if (savedGlobal) setGlobalLogo(savedGlobal);
    if (savedAdmin) setAdminLogo(savedAdmin);
    getAds().then(setAds);
    // 2) Lalu timpa dengan sumber kebenaran dari cloud (lintas-PC, terlihat semua user).
    getBranding()
      .then((b) => {
        if (!b) return;
        setGlobalLogo(b.globalLogoUrl);
        setAdminLogo(b.adminLogoUrl);
        if (b.globalLogoUrl) localStorage.setItem('globalLogo', b.globalLogoUrl);
        else localStorage.removeItem('globalLogo');
        if (b.adminLogoUrl) localStorage.setItem('adminLogo', b.adminLogoUrl);
        else localStorage.removeItem('adminLogo');
      })
      .catch(() => {
        /* offline → tetap pakai cache localStorage */
      });
  }, []);

  const handleUpdateAds = (newAds: Ad[]) => {
    setAds(newAds);
    void saveAds(newAds);
  };

  const handleGlobalLogoUpload = async (logoBase64: string) => {
    // Optimistic: tampilkan & cache lokal segera, lalu unggah ke cloud.
    setGlobalLogo(logoBase64);
    localStorage.setItem('globalLogo', logoBase64);
    try {
      const url = await saveBrandingLogo('global', logoBase64);
      setGlobalLogo(url);
      localStorage.setItem('globalLogo', url);
    } catch {
      /* cloud gagal/offline → tetap tersimpan lokal (perilaku lama) */
    }
  };

  const handleAdminLogoUpload = async (logoBase64: string) => {
    setAdminLogo(logoBase64);
    localStorage.setItem('adminLogo', logoBase64);
    try {
      const url = await saveBrandingLogo('admin', logoBase64);
      setAdminLogo(url);
      localStorage.setItem('adminLogo', url);
    } catch {
      /* offline → tetap lokal */
    }
  };

  const handleGlobalLogoReset = () => {
    setGlobalLogo(null);
    localStorage.removeItem('globalLogo');
    void resetBrandingLogo('global').catch(() => {});
  };

  const handleAdminLogoReset = () => {
    setAdminLogo(null);
    localStorage.removeItem('adminLogo');
    void resetBrandingLogo('admin').catch(() => {});
  };

  const handleResetRequest = (email: string) => {
    if (!resetRequests.includes(email)) {
      setResetRequests(prev => [...prev, email]);
    }
  };

  const handleClearRequest = (email: string) => {
    setResetRequests(prev => prev.filter(req => req !== email));
  };

  const handleReturnToHome = () => {
    setView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (view === 'program') {
    return <StandaloneProgramView />;
  }

  if (view === 'dashboard') {
    return (
      <Dashboard 
        globalLogo={globalLogo} 
        adminLogo={adminLogo}
        userRole={userRole}
        currentUserEmail={currentUserEmail}
        onSwitchRole={setUserRole}
        onExit={() => {
          void logoutUser();
          setView('landing');
          setUserRole('member');
          setCurrentUserEmail('');
          setMemberRequiresPasswordSetup(false);
        }}
        requiresPasswordSetup={memberRequiresPasswordSetup}
        onClearPasswordSetup={() => setMemberRequiresPasswordSetup(false)}
        onOpenAI={() => setIsAIOpen(true)}
        resetRequests={resetRequests}
        onClearRequest={handleClearRequest}
        adminTier={adminTier}
        setAdminTier={setAdminTier}
        ads={ads}
        onUpdateAds={handleUpdateAds}
        onGlobalUpload={handleGlobalLogoUpload}
        onGlobalReset={handleGlobalLogoReset}
        onAdminUpload={handleAdminLogoUpload}
        onAdminReset={handleAdminLogoReset}
      />
    );
  }

  if (view === 'studio') {
    return (
      <div className="min-h-screen bg-black text-white selection:bg-[#ccff00] selection:text-black flex flex-col">
         <Navbar 
            onOpenAI={() => setIsAIOpen(true)} 
            logo={adminLogo}
            userRole={userRole}
            onLogin={(role, email, requiresPasswordSetup) => {
              setUserRole(role);
              if (email) setCurrentUserEmail(email.trim().toUpperCase());
              setMemberRequiresPasswordSetup(!!requiresPasswordSetup);
              setView('dashboard');
            }}
            onResetRequest={handleResetRequest}
            onStudioClick={() => {}}
            onBroadcastClick={() => setView('broadcast_showcase')}
            onBrandClick={handleReturnToHome}
          />
          <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(204,255,0,0.05)_0%,transparent_70%)] pointer-events-none" />
             <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
             <div className="relative z-10 text-center animate-in zoom-in-95 duration-700">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-[#ccff00]/20 bg-[#ccff00]/5 mb-8">
                  <div className="w-2 h-2 bg-[#ccff00] rounded-full animate-pulse shadow-[0_0_10px_#ccff00]" />
                  <span className="text-[10px] font-black tracking-[0.3em] text-[#ccff00] uppercase">STUDIO MODULE // PHASE 1</span>
                </div>
                <h1 className="text-6xl md:text-8xl font-[1000] italic text-white uppercase tracking-tighter leading-none mb-4">
                  COMING <span className="text-[#ccff00] animate-pulse">SOON</span>
                </h1>
                <p className="text-zinc-500 font-bold tracking-[0.2em] uppercase text-xs md:text-sm max-w-md mx-auto leading-relaxed mb-12">
                  Our next-generation white-label broadcasting engine is currently under development. Stay tuned for the ultimate creator experience.
                </p>
                <button 
                  onClick={handleReturnToHome}
                  className="inline-flex items-center gap-3 bg-white/5 border border-white/10 hover:border-[#ccff00] hover:bg-[#ccff00] hover:text-black px-10 py-5 rounded-2xl font-black text-xs tracking-widest transition-all group"
                >
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  RETURN TO HOME
                </button>
             </div>
          </main>
          <AIAssist isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} logo={adminLogo} />
      </div>
    );
  }

  if (view === 'broadcast_showcase') {
    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-[#ccff00] selection:text-black flex flex-col font-sans">
            <Navbar 
                onOpenAI={() => setIsAIOpen(true)} 
                logo={adminLogo}
                userRole={userRole}
                onLogin={(role, email, requiresPasswordSetup) => {
                    setUserRole(role);
                    if (email) setCurrentUserEmail(email.trim().toUpperCase());
                    setMemberRequiresPasswordSetup(!!requiresPasswordSetup);
                    setView('dashboard');
                }}
                onResetRequest={handleResetRequest}
                onStudioClick={() => setView('studio')}
                onBroadcastClick={() => {}}
                onBrandClick={handleReturnToHome}
            />
            
            <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                {/* Scanline Effect */}
                <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,118,0.06))] bg-[length:100%_2px,3px_100%]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

                <div className="relative z-10 w-full max-w-4xl animate-in fade-in duration-1000">
                    <div className="flex flex-col items-center text-center mb-16">
                        <div className="w-20 h-20 bg-[#ccff00] rounded-3xl flex items-center justify-center text-black mb-8 shadow-[0_0_40px_rgba(204,255,0,0.2)] transform -rotate-12 group hover:rotate-0 transition-transform duration-500">
                            <Radio size={40} strokeWidth={2.5} className="animate-pulse" />
                        </div>
                        <h1 className="text-5xl md:text-7xl font-[1000] italic tracking-tighter uppercase mb-4 leading-none">
                            BROADCAST <span className="text-[#ccff00]">TERMINAL</span>
                        </h1>
                        <p className="text-zinc-500 font-black tracking-[0.4em] uppercase text-[10px] md:text-xs">
                            System Node: Deployment Readiness Check
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                         {[
                             { icon: Signal, label: 'Uplink Status', val: 'Searching...', color: 'text-amber-500' },
                             { icon: Wifi, label: 'Network Latency', val: '-- ms', color: 'text-zinc-700' },
                             { icon: Activity, label: 'Core Load', val: 'Standby', color: 'text-zinc-700' }
                         ].map((stat, i) => (
                             <div key={i} className="bg-white/5 border border-white/10 rounded-[32px] p-8 flex flex-col items-center group hover:border-[#ccff00]/30 transition-all">
                                <stat.icon size={24} className={`mb-4 ${stat.color}`} />
                                <span className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase mb-1">{stat.label}</span>
                                <span className={`text-sm font-black uppercase tracking-widest ${stat.color}`}>{stat.val}</span>
                             </div>
                         ))}
                    </div>

                    <div className="flex flex-col items-center gap-8">
                        <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-zinc-900 border border-white/5">
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                            <span className="text-[10px] font-black text-zinc-400 tracking-[0.2em] uppercase italic">Awaiting Operator Authorization</span>
                        </div>
                        
                        <div className="flex gap-4">
                            <button 
                                onClick={handleReturnToHome}
                                className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 font-black text-[10px] tracking-widest uppercase hover:bg-white/10 hover:text-white transition-all"
                            >
                                ABORT MISSION
                            </button>
                            <button 
                                onClick={() => setIsAIOpen(true)}
                                className="px-8 py-4 rounded-2xl bg-[#ccff00] text-black font-black text-[10px] tracking-widest uppercase shadow-[0_0_30px_rgba(204,255,0,0.3)] hover:scale-105 transition-all"
                            >
                                CONTACT SUPPORT
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            <AIAssist isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} logo={adminLogo} />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#ccff00] selection:text-black">
      <Navbar 
        onOpenAI={() => setIsAIOpen(true)} 
        logo={adminLogo}
        userRole={userRole}
        onLogin={(role, email, requiresPasswordSetup) => {
          setUserRole(role);
          if (email) setCurrentUserEmail(email.trim().toUpperCase());
          setMemberRequiresPasswordSetup(!!requiresPasswordSetup);
          setView('dashboard');
        }}
        onResetRequest={handleResetRequest}
        onStudioClick={() => setView('studio')}
        onBroadcastClick={() => setView('broadcast_showcase')}
        onBrandClick={handleReturnToHome}
      />
      
      <main className="relative z-10">
        <LandingPage globalLogo={globalLogo} ads={ads} />
        
        <section className="py-32 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-zinc-950 border border-white/5 hover:border-[#ccff00]/30 transition-all group">
              <div className="w-12 h-12 bg-[#ccff00]/10 rounded-2xl flex items-center justify-center mb-6 text-[#ccff00] group-hover:scale-110 transition-transform">
                <Bot size={24} />
              </div>
              <h3 className="text-xl font-bold mb-4 uppercase italic">SMART AUTOMATION</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Streamline your workflow with AI-driven scene switching and dynamic metadata management for BROHUBS.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-zinc-950 border border-white/5 hover:border-[#ccff00]/30 transition-all group">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.45l8.27 14.3H3.73L12 5.45z"/></svg>
              </div>
              <h3 className="text-xl font-bold mb-4 uppercase italic">ULTRA LATENCY</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Deliver content globally with sub-500ms latency using our proprietary BROHUBS uplink network.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-zinc-950 border border-white/5 hover:border-[#ccff00]/30 transition-all group">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <h3 className="text-xl font-bold mb-4 uppercase italic">4K MASTERY</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Native support for high-bitrate 4K 60FPS streams without compromising your studio's CPU load.
              </p>
            </div>
          </div>
        </section>
      </main>

      {userRole === 'admin' && (
        <div className="fixed bottom-8 left-8 z-[100] flex items-center gap-2 bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-1.5 rounded-full shadow-2xl">
          <button 
            onClick={() => setUserRole('admin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black tracking-widest transition-all ${userRole === 'admin' ? 'bg-[#ccff00] text-black shadow-[0_0_15px_#ccff00]' : 'text-gray-500 hover:text-white'}`}
          >
            <Shield size={12} /> ADMIN
          </button>
        </div>
      )}

      {!isAIOpen && (
        <button 
          onClick={() => setIsAIOpen(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-[#ccff00] text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-40 glow-green"
        >
          <Bot size={24} />
        </button>
      )}

      <AIAssist isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} logo={adminLogo} />

      <footer className="py-20 border-t border-white/5 text-center text-gray-600 text-[10px] font-bold tracking-[0.2em] uppercase">
        &copy; 2024 BROHUBS MEDIA CORP. ALL RIGHTS RESERVED.
      </footer>
      
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[60%] bg-[#ccff00]/5 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[60%] h-[60%] bg-blue-500/5 blur-[150px] rounded-full" />
      </div>
    </div>
  );
};

export default App;
