
import React, { useEffect, useState } from 'react';
import { Settings, X, User, Lock, ArrowRight, ShieldCheck, AlertCircle, Loader2, HelpCircle, ArrowLeft, Mail, Eye, EyeOff, Menu as MenuIcon } from 'lucide-react';
import { loginUser } from '@/features/auth/authService';
import { motion, AnimatePresence } from 'motion/react';
import { useT } from '@/i18n/LanguageContext';

interface NavbarProps {
  onOpenAI: () => void;
  onLogin: (role: 'admin' | 'member', email?: string, requiresPasswordSetup?: boolean) => void;
  logo: string | null;
  userRole: 'admin' | 'member';
  onResetRequest: (email: string) => void;
  onStudioClick: () => void;
  onBroadcastClick: () => void;
  onBrandClick?: () => void; // Prop baru untuk kembali ke awal
}

const Navbar: React.FC<NavbarProps> = ({ 
  onOpenAI, 
  onLogin, 
  logo, 
  userRole, 
  onResetRequest, 
  onStudioClick,
  onBroadcastClick,
  onBrandClick
}) => {
  const t = useT();
  // id = penanda tetap untuk scroll/logika; key = teks yang diterjemahkan.
  const navItems = [
    { id: 'explore', key: 'nav.explore' },
    { id: 'broadcast', key: 'nav.broadcast' },
    { id: 'pricing', key: 'nav.pricing' },
    { id: 'studio', key: 'nav.studio' },
  ];
  
  // Login Modal State
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [modalView, setModalView] = useState<'login' | 'forgot'>('login');
  
  // Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Feedback States
  const [loginError, setLoginError] = useState('');
  const [isResetSent, setIsResetSent] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoUnavailable, setIsLogoUnavailable] = useState(false);

  useEffect(() => {
    setIsLogoUnavailable(false);
  }, [logo]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    
    if (!username.trim()) {
        setLoginError(t('auth.errEnterUserId'));
        shakeModal();
        return;
    }

    setLoginError('');
    setIsLoggingIn(true);
    
    try {
        const result = await loginUser(username, password);
        
        if (result) {
            onLogin(
              result.role,
              result.role === 'member' ? result.memberEmail : username,
              result.role === 'member' ? result.requiresPasswordSetup : false
            );
            handleClose();
        } else {
            setLoginError(t('auth.errInvalidCredentials'));
            shakeModal();
        }
    } catch (error) {
        setLoginError(t('auth.errConnectionFailed'));
    } finally {
        setIsLoggingIn(false);
    }
  };

  const handleClose = () => {
    setIsLoginOpen(false);
    setTimeout(() => {
        setModalView('login');
        setUsername('');
        setPassword('');
        setShowPassword(false);
        setResetEmail('');
        setLoginError('');
        setIsResetSent(false);
        setIsLoggingIn(false);
    }, 300);
  };

  const shakeModal = () => {
    const modal = document.getElementById('login-modal-content');
    if (modal) {
      modal.classList.add('animate-shake');
      setTimeout(() => modal.classList.remove('animate-shake'), 500);
    }
  };

  const handleSubmitReset = () => {
    if (!resetEmail.trim()) {
        setLoginError(t('auth.errEnterUserId'));
        shakeModal();
        return;
    }
    
    onResetRequest(resetEmail);
    setIsResetSent(true);
    setTimeout(() => {
        setModalView('login');
        setIsResetSent(false);
        setResetEmail('');
        setLoginError(t('auth.requestSentToAdmin'));
    }, 2000);
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    
    if (id === 'studio') {
        onStudioClick();
        return;
    }

    if (id === 'broadcast') {
        onBroadcastClick();
        return;
    }

    // Jika sedang di view lain, panggil onBrandClick dulu untuk kembali ke landing
    if (onBrandClick) {
        onBrandClick();
    }

    // Beri sedikit delay agar view landing merender elemen ID sebelum scroll
    setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
            const offset = 100;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = element.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, 100);
  };

  const handleBrandClick = () => {
    if (onBrandClick) onBrandClick();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/5 px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group logo-container" onClick={handleBrandClick}>
          <div className="flex items-center glitch-step transition-transform duration-300">
            {logo && !isLogoUnavailable ? (
              <div className="h-8 md:h-10 w-auto flex items-center animate-logo-float">
                <img
                  src={logo}
                  alt=""
                  onError={() => setIsLogoUnavailable(true)}
                  className="h-full w-auto object-contain mr-2 filter drop-shadow-[0_0_8px_rgba(204,255,0,0.3)]"
                />
              </div>
            ) : (
              <div className="w-1.5 md:w-2 h-6 md:h-8 bg-[#ccff00] rounded-full mr-2 group-hover:h-10 transition-all duration-500 shadow-[0_0_15px_#ccff00]" />
            )}
            <span className="text-xl md:text-2xl font-[900] italic tracking-tighter text-white leading-none select-none">
              BRO<span className="text-[#ccff00] animate-neon-text">HUBS</span>
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => handleNavClick(e, item.id)}
              className={`text-xs font-bold tracking-widest text-gray-400 hover:text-white transition-colors relative overflow-hidden group/link ${
                item.id === 'pricing' ? 'border-b-2 border-transparent hover:border-[#ccff00]' : ''
              }`}
            >
              {t(item.key)}
              <span className="absolute bottom-0 left-0 w-full h-[1px] bg-[#ccff00] translate-x-[-100%] group-hover/link:translate-x-0 transition-transform duration-300" />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 md:gap-6">
          <button 
            onClick={() => setIsLoginOpen(true)}
            className="hidden sm:block text-xs font-bold tracking-widest text-white hover:text-[#ccff00] transition-colors"
          >
            {t('auth.login')}
          </button>
          <button
            onClick={onOpenAI}
            className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 md:px-4 py-2 rounded-full hover:bg-[#ccff00]/10 hover:border-[#ccff00]/40 transition-all group"
          >
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#ccff00] rounded-full animate-pulse shadow-[0_0_8px_#ccff00]" />
            <span className="text-[10px] md:text-xs font-bold tracking-widest text-white uppercase group-hover:text-[#ccff00] transition-colors whitespace-nowrap">{t('common.aiAssist')}</span>
          </button>
          
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex md:hidden items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
          >
            {isMobileMenuOpen ? <X size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[45] bg-black/95 backdrop-blur-xl pt-24 px-6 md:hidden"
          >
            <div className="flex flex-col gap-6">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    handleNavClick(e, item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-2xl font-black italic tracking-tighter text-white hover:text-[#ccff00] transition-colors border-b border-white/5 pb-4 last:border-0"
                >
                  {t(item.key)}
                </a>
              ))}
              <div className="pt-6 border-t border-white/10 mt-4">
                <button 
                  onClick={() => {
                    setIsLoginOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-[#ccff00] text-black py-5 rounded-2xl font-black text-sm tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(204,255,0,0.2)]"
                >
                  {t('auth.loginToHub')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={handleClose} />
          
          <div 
            id="login-modal-content"
            className="relative w-full max-w-sm bg-zinc-950 border border-white/10 rounded-[32px] overflow-hidden p-8 animate-in zoom-in-95 shadow-2xl flex flex-col"
          >
            <button 
              onClick={handleClose}
              className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {modalView === 'login' ? (
                <>
                    <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#ccff00]/10 border border-[#ccff00]/20 mb-4 text-[#ccff00]">
                        <ShieldCheck size={32} />
                    </div>
                    <h2 className="text-2xl font-black tracking-wide uppercase text-white mb-1">
                        {t('auth.systemAccess')}
                    </h2>
                    <p className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">
                        {t('auth.secureGateway')}
                    </p>
                    </div>

                    <form
                      className="space-y-4"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void handleLogin();
                      }}
                    >
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 tracking-[0.2em] uppercase ml-2">
                        {t('auth.emailOrUsername')}
                        </label>
                        <div className="relative">
                        <input 
                            type="text" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isLoggingIn}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder:text-gray-700 focus:border-[#ccff00]/50 outline-none transition-all disabled:opacity-50"
                            placeholder={t('auth.usernamePlaceholder')}
                        />
                        <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 tracking-[0.2em] uppercase ml-2">
                        {t('auth.password')}
                        </label>
                        <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"} 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoggingIn}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 pr-10 text-sm text-white placeholder:text-gray-700 focus:border-[#ccff00]/50 outline-none transition-all disabled:opacity-50"
                            placeholder="••••••••"
                        />
                        <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        </div>
                    </div>

                    {loginError && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500">
                        <AlertCircle size={14} />
                        <span className="text-[10px] font-bold tracking-widest uppercase">{loginError}</span>
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isLoggingIn}
                        className="w-full bg-[#ccff00] text-black py-4 rounded-xl font-black text-xs tracking-[0.2em] uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(204,255,0,0.2)] mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-wait"
                    >
                        {isLoggingIn ? (
                            <>
                                <Loader2 size={14} className="animate-spin" /> {t('auth.verifying')}
                            </>
                        ) : (
                            <>
                                {t('auth.authenticate')} <ArrowRight size={14} />
                            </>
                        )}
                    </button>

                    <div className="pt-4 border-t border-white/5 text-center">
                        <button 
                        onClick={() => {
                            if (!isLoggingIn) {
                                setModalView('forgot');
                                setLoginError('');
                            }
                        }}
                        className="text-[9px] font-bold text-gray-500 hover:text-[#ccff00] transition-colors tracking-widest uppercase flex items-center justify-center gap-2 mx-auto"
                        >
                        <HelpCircle size={12} />
                        {t('auth.forgotPassword')}
                        </button>
                    </div>
                    </form>
                </>
            ) : (
                <>
                     <div className="mb-8 text-center animate-in slide-in-from-right duration-300">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/20 mb-4 text-orange-500">
                            <Lock size={32} />
                        </div>
                        <h2 className="text-2xl font-black tracking-wide uppercase text-white mb-1">
                            {t('auth.accountRecovery')}
                        </h2>
                        <p className="text-[10px] font-black text-gray-500 tracking-[0.2em] uppercase">
                            {t('auth.adminApprovalRequired')}
                        </p>
                    </div>

                    <div className="space-y-4 animate-in slide-in-from-right duration-300 delay-100">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-500 tracking-[0.2em] uppercase ml-2">
                                {t('auth.enterUserIdEmail')}
                            </label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder:text-gray-700 focus:border-orange-500/50 outline-none transition-all uppercase"
                                    placeholder={t('auth.resetEmailPlaceholder')}
                                />
                                <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                            </div>
                        </div>

                         {loginError && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500">
                            <AlertCircle size={14} />
                            <span className="text-[10px] font-bold tracking-widest uppercase">{loginError}</span>
                            </div>
                        )}

                        <button 
                            onClick={handleSubmitReset}
                            className={`
                                w-full py-4 rounded-xl font-black text-xs tracking-[0.2em] uppercase hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(249,115,22,0.2)] mt-2 flex items-center justify-center gap-2
                                ${isResetSent 
                                    ? 'bg-green-500 text-black' 
                                    : 'bg-orange-500 text-black'
                                }
                            `}
                        >
                             {isResetSent ? t('auth.requestSent') : t('auth.sendRequest')}
                             {!isResetSent && <ArrowRight size={14} />}
                        </button>

                         <div className="pt-4 border-t border-white/5 text-center">
                            <button 
                                onClick={() => {
                                    setModalView('login');
                                    setLoginError('');
                                }}
                                className="text-[9px] font-bold text-gray-500 hover:text-white transition-colors tracking-widest uppercase flex items-center justify-center gap-2 mx-auto"
                            >
                                <ArrowLeft size={12} />
                                {t('auth.returnToLogin')}
                            </button>
                        </div>
                    </div>
                </>
            )}
            
          </div>
        </div>
      )}

      <style>{`
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </>
  );
};

export default Navbar;
