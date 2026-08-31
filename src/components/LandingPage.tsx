
import React, { useState, useEffect } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { PRICING_TIERS } from '../constants/pricing';
import { Ad } from '../types';
import AdSlider from '@/features/ads/AdSlider';
import PopUpAd from '@/features/ads/PopUpAd';
import { useT } from '../i18n/LanguageContext';

interface LandingPageProps {
  // Use globalLogo specifically for the Dashboard Preview as per the latest request
  globalLogo: string | null;
  ads: Ad[];
}

const LandingPage: React.FC<LandingPageProps> = ({ globalLogo, ads }) => {
  const t = useT();
  const [activePopUpAd, setActivePopUpAd] = useState<Ad | null>(null);

  useEffect(() => {
    const popupAd = ads.find(a => a.active && a.displayLocation === 'LANDING_POPUP');
    if (popupAd) {
      setActivePopUpAd(popupAd);
    }
  }, [ads]);

  const getThemeStyles = (id: string) => {
    switch (id) {
      case 'PREMIUM':
        return {
          card: 'bg-blue-900/10 border border-blue-500/20 hover:border-blue-500/50 transform hover:-translate-y-2',
          title: 'text-blue-400',
          subtitle: 'text-blue-500/60',
          price: 'text-white',
          checkBg: 'bg-blue-500/20 border border-blue-500/20',
          checkColor: 'text-blue-400',
          featureText: 'text-gray-300',
          button: 'bg-blue-600 border border-blue-500 text-white hover:bg-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.3)]',
          badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
        };
      case 'ULTIMATE':
        return {
          card: 'bg-[#ccff00]/5 border border-[#ccff00]/20 hover:border-[#ccff00] transform hover:-translate-y-4',
          title: 'text-[#ccff00]',
          subtitle: 'text-[#ccff00]/60',
          price: 'text-white',
          checkBg: 'bg-[#ccff00]/20 border border-[#ccff00]/20',
          checkColor: 'text-[#ccff00]',
          featureText: 'text-white',
          button: 'bg-[#ccff00] text-black hover:scale-105 shadow-[0_0_40px_rgba(204,255,0,0.3)]',
          badge: 'bg-[#ccff00] text-black shadow-[0_0_15px_#ccff00]'
        };
      default: // BASIC
        return {
          card: 'bg-zinc-900/50 border border-white/5 hover:border-white/20',
          title: 'text-white',
          subtitle: 'text-gray-500',
          price: 'text-white',
          checkBg: 'bg-white/5 border border-white/5',
          checkColor: 'text-gray-400',
          featureText: 'text-gray-400',
          button: 'bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black',
          badge: ''
        };
    }
  };

  return (
    <div className="relative pt-24 md:pt-40 pb-20 px-4 md:px-6 flex flex-col items-center text-center">
      {/* Badge */}
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 mb-8 md:mb-12 transition-all hover:border-[#ccff00]/30 cursor-default">
        <div className="w-2 h-2 bg-[#ccff00] rounded-full animate-pulse" />
        <span className="text-[10px] font-bold tracking-[0.2em] text-gray-400">{t('landing.badge')}</span>
      </div>

      {/* Main Heading */}
      <h1 className="flex flex-col text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[0.9] mb-8">
        <span className="text-white opacity-40 italic">{t('landing.heroLine1')}</span>
        <span className="text-white uppercase">{t('landing.heroLine2')}</span>
      </h1>

      {/* Subtext */}
      <p className="max-w-xl text-gray-500 text-sm md:text-lg leading-relaxed mb-12 px-2">
        {t('landing.subtitle')}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 w-full max-w-md sm:max-w-none">
        {/* Button 1: Get Started */}
        <button className="w-full sm:w-auto group flex items-center justify-center gap-3 bg-[#ccff00] text-black px-8 md:px-10 py-4 md:py-5 rounded-full font-[900] text-xs md:text-sm tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(204,255,0,0.3)] whitespace-nowrap">
          {t('landing.getStarted')} <ArrowRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
        </button>
        
        {/* Button 2: Watch Demo */}
        <button className="w-full sm:w-auto flex items-center justify-center bg-zinc-900 border border-white/10 text-white px-8 md:px-10 py-4 md:py-5 rounded-full font-[900] text-xs md:text-sm tracking-widest hover:bg-zinc-800 hover:border-white/20 transition-all whitespace-nowrap">
          {t('landing.watchDemo')}
        </button>

        {/* Button 3: Terminal Preview */}
        <button className="w-full sm:w-auto flex items-center justify-center gap-3 border border-[#ccff00]/50 text-[#ccff00] px-8 md:px-10 py-4 md:py-5 rounded-full font-[900] text-xs md:text-sm tracking-widest bg-black hover:bg-[#ccff00]/5 transition-all shadow-[0_0_20px_rgba(204,255,0,0.15)] group whitespace-nowrap">
          <span className="text-[#ccff00] group-hover:text-white transition-colors">{'</>'}</span> {t('landing.terminalPreview')}
        </button>
      </div>

      {/* Stats Card Preview / Ad Slider */}
      <div className="mt-16 md:mt-24 w-full max-w-5xl rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/5 to-transparent aspect-video md:aspect-[21/9] relative group">
        <AdSlider ads={ads} globalLogo={globalLogo} />
      </div>

      {/* --- PRICING SECTION --- */}
      <div id="pricing" className="mt-40 w-full max-w-6xl text-left">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-white/10 pb-8 gap-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase mb-2 text-white">
              {t('landing.tiersHeadA')} <span className="text-[#ccff00]">{t('landing.tiersHeadB')}</span>
            </h2>
            <p className="text-gray-500 text-xs font-bold tracking-[0.2em] uppercase">
              {t('landing.selectPower')}
            </p>
          </div>
        </div>

        {/* Content - Plan Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PRICING_TIERS.map((tier) => {
              const styles = getThemeStyles(tier.id);
              
              return (
                <div key={tier.id} className={`p-10 rounded-[40px] flex flex-col group relative overflow-hidden transition-all ${styles.card}`}>
                  {tier.highlight && (
                    <div className="absolute top-0 right-0 p-6">
                      <div className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase ${styles.badge}`}>
                        {tier.highlightText ? t(tier.highlightText) : ''}
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-8">
                    <h3 className={`text-3xl font-black italic uppercase tracking-tighter mb-2 ${styles.title}`}>
                      {tier.name}
                    </h3>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${styles.subtitle}`}>
                      {t(tier.subtitle)}
                    </p>
                  </div>
                  
                  <div className={`text-5xl font-black mb-10 tracking-tighter ${styles.price}`}>
                    ${tier.price}
                    <span className="text-sm text-gray-500 font-bold ml-1 align-baseline">{t('landing.perMonth')}</span>
                  </div>
                  
                  <div className="space-y-5 mb-10 flex-1">
                    {tier.features.map((feat, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${styles.checkBg}`}>
                          <Check size={12} className={styles.checkColor} />
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wide ${styles.featureText}`}>
                          {t(feat)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => window.open('https://discord.gg/Qper2dY2Y', '_blank')}
                    className={`w-full py-5 rounded-2xl font-black text-xs tracking-[0.2em] uppercase transition-all ${styles.button}`}
                  >
                    {t('landing.contactUs')}
                  </button>
                </div>
              );
            })}
        </div>
      </div>

      <PopUpAd ad={activePopUpAd} onClose={() => setActivePopUpAd(null)} />
    </div>
  );
};

export default LandingPage;
