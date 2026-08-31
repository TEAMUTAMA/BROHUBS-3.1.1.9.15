
import React from 'react';
import { X, Check } from 'lucide-react';
import { PRICING_TIERS } from '@/constants/pricing';
import { useT } from '@/i18n/LanguageContext';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  daysRemaining: number;
  onExit: () => void;
  currentPackage: string; 
  isExpired?: boolean; 
  onRequestPackage?: (tier: string) => void; 
}

const PricingModal: React.FC<PricingModalProps> = ({ 
  isOpen, 
  onClose, 
  daysRemaining, 
  onExit, 
  currentPackage, 
  isExpired = false,
  onRequestPackage
}) => {
  const t = useT();
  if (!isOpen) return null;

  const handleAction = (tier: string) => {
    if (onRequestPackage) {
        onRequestPackage(tier);
    }
  };

  const getTierStateStyles = (tierId: string, isCurrent: boolean) => {
    switch (tierId) {
      case 'PREMIUM':
        return {
          card: isCurrent && !isExpired
            ? 'bg-blue-900/20 border-blue-500/20 shadow-[0_0_40px_rgba(37,99,235,0.15)]'
            : 'bg-blue-900/10 border-blue-500/10 hover:border-blue-500/40 transform hover:-translate-y-2',
          title: 'text-blue-400',
          subtitle: 'text-blue-500/60',
          checkBg: 'bg-blue-500/20',
          checkColor: 'text-blue-400',
          featureText: 'text-gray-300',
          button: isCurrent && !isExpired
            ? 'bg-blue-600/20 border border-blue-500/50 text-blue-200 hover:bg-blue-600/30'
            : 'bg-blue-600 border border-blue-500 text-white hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]',
          badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
        };
      case 'ULTIMATE':
        return {
          card: isCurrent && !isExpired
            ? 'bg-[#ccff00]/10 border-[#ccff00]/20 shadow-[0_0_40px_rgba(204,255,0,0.15)]'
            : 'bg-[#ccff00]/5 border-[#ccff00]/10 hover:border-[#ccff00] transform hover:-translate-y-2',
          title: 'text-[#ccff00]',
          subtitle: 'text-[#ccff00]/60',
          checkBg: 'bg-[#ccff00]/20',
          checkColor: 'text-[#ccff00]',
          featureText: 'text-white',
          button: isCurrent && !isExpired
            ? 'bg-[#ccff00]/20 border border-[#ccff00]/50 text-[#ccff00] hover:bg-[#ccff00]/30'
            : 'bg-[#ccff00] text-black hover:scale-105 shadow-[0_0_25px_rgba(204,255,0,0.4)]',
          badge: 'bg-[#ccff00] text-black shadow-[0_0_10px_#ccff00]'
        };
      default: // BASIC
        return {
          card: isCurrent && !isExpired
            ? 'bg-zinc-900 border-white/5'
            : 'bg-zinc-900/50 border-white/5 hover:border-white/20',
          title: 'text-white',
          subtitle: 'text-gray-500',
          checkBg: 'bg-white/5',
          checkColor: 'text-gray-400',
          featureText: 'text-gray-400',
          button: isCurrent && !isExpired
            ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
            : 'bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black',
          badge: ''
        };
    }
  };

  const getButtonText = (tierId: string, currentPkg: string, expired: boolean, defaultText: string) => {
    if (expired) return defaultText;

    const tierLevels: Record<string, number> = {
        'BASIC': 0,
        'PREMIUM': 1,
        'ULTIMATE': 2
    };

    const currentLevel = tierLevels[currentPkg] ?? 0;
    const targetLevel = tierLevels[tierId] ?? 0;

    if (targetLevel === currentLevel) return 'pm.requestExtension';
    if (targetLevel < currentLevel) return 'pm.requestDowngrade';
    return 'pm.requestUpgrade';
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300" />
      
      <div className="relative w-full max-w-6xl bg-zinc-950 border border-white/5 rounded-[48px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] z-10">
        {/* Header - Precise match to Screenshot 2 */}
        <div className="p-10 border-b border-white/5 flex justify-between items-center bg-zinc-950 shrink-0">
          <div>
            <h2 className="text-4xl font-[1000] italic tracking-tight uppercase mb-2">
              {t('pm.renewalA')} <span className="text-[#ccff00]">{t('pm.renewalB')}</span>
            </h2>
            <p className="text-zinc-500 text-[10px] font-black tracking-[0.3em] uppercase opacity-60">
              {isExpired ? t('pm.expiredMsg') : t('pm.selectTier')}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-[#ccff00] hover:text-black transition-all border border-white/5 shadow-xl"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content - Plan Grid */}
        <div className="flex-1 overflow-y-auto p-10 bg-black/40">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {PRICING_TIERS.map((tier) => {
              const isCurrent = currentPackage === tier.id;
              const styles = getTierStateStyles(tier.id, isCurrent);
              const buttonLabel = getButtonText(tier.id, currentPackage, isExpired, tier.buttonText);

              return (
                <div key={tier.id} className={`p-10 rounded-[40px] border transition-all flex flex-col group relative overflow-hidden ${styles.card}`}>
                  {tier.highlight && !isCurrent && !isExpired && (
                    <div className="absolute top-0 right-0 p-6">
                      <div className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase ${styles.badge}`}>
                        {tier.highlightText ? t(tier.highlightText) : ''}
                      </div>
                    </div>
                  )}

                  <div className="mb-8">
                    <h3 className={`text-3xl font-[1000] italic uppercase tracking-tighter mb-2 ${styles.title}`}>
                      {tier.name}
                    </h3>
                    <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${styles.subtitle}`}>
                      {t(tier.subtitle)}
                    </p>
                  </div>

                  <div className="text-6xl font-black text-white mb-10 tracking-tighter flex items-baseline">
                    <span className="text-4xl mr-1 font-black">$</span>{tier.price}
                    <span className="text-xs text-zinc-600 font-black ml-2 tracking-widest">{t('landing.perMonth')}</span>
                  </div>
                  
                  <div className="space-y-5 mb-12 flex-1">
                    {tier.features.map((feat, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border border-white/10 ${styles.checkBg}`}>
                          <Check size={12} className={styles.checkColor} strokeWidth={4} />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${styles.featureText}`}>
                          {t(feat)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => handleAction(tier.id)}
                    className={`w-full py-5 rounded-2xl font-[1000] text-xs tracking-[0.25em] uppercase transition-all ${styles.button}`}
                  >
                    {t(buttonLabel)}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingModal;
