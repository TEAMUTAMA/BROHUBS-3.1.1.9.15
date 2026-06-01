
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Ad } from '../types';

interface AdSliderProps {
  ads: Ad[];
  globalLogo: string | null;
}

const AdSlider: React.FC<AdSliderProps> = ({ ads, globalLogo }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeAds = ads.filter(ad => ad.active && (!ad.displayLocation || ad.displayLocation === 'LANDING'));

  useEffect(() => {
    if (activeAds.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeAds.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeAds.length]);

  if (activeAds.length === 0) return null;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % activeAds.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + activeAds.length) % activeAds.length);
  };

  const currentAd = activeAds[currentIndex];

  return (
    <div className="relative w-full h-full group overflow-hidden rounded-3xl border border-white/10 bg-black">
      {/* Slides */}
      <div 
        className="flex transition-transform duration-700 ease-in-out h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {activeAds.map((ad) => (
          <a 
            key={ad.id}
            href={ad.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-full h-full relative block"
          >
            <img 
              src={ad.imageUrl} 
              alt="Advertisement" 
              className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            
            {/* Click Indicator */}
            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full">
              <span className="text-[10px] font-black tracking-widest text-white uppercase">VISIT LINK</span>
              <ExternalLink size={12} className="text-[#ccff00]" />
            </div>
          </a>
        ))}
      </div>

      {/* Overlays */}
      {currentAd?.showLogoOverlay && (
        <div className="absolute top-8 left-8 flex items-center gap-4 pointer-events-none transition-opacity duration-500">
          <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-3">
            {globalLogo ? (
              <img src={globalLogo} alt="Dashboard Logo" className="h-6 w-auto object-contain" />
            ) : (
              <div className="w-6 h-6 bg-[#ccff00] rounded-lg" />
            )}
            <span className="text-white text-[10px] font-black tracking-widest uppercase">
              BRO<span className="text-[#ccff00]">HUBS</span> STUDIO
            </span>
          </div>
        </div>
      )}

      {currentAd?.showStatusOverlay && (
        <div className="absolute bottom-8 left-8 p-6 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 flex flex-col items-start gap-1 pointer-events-none transition-opacity duration-500">
          <span className="text-[#ccff00] text-[10px] font-black tracking-widest">SYSTEM STATUS</span>
          <div className="flex items-center gap-3">
            <span className="text-white text-xl font-bold tracking-tight">ONLINE</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#ccff00] shadow-[0_0_10px_#ccff00]" />
            <span className="text-gray-400 text-sm font-medium">US-EAST-1</span>
          </div>
        </div>
      )}

      {currentAd?.showPingOverlay && (
        <div className="absolute top-8 right-8 flex gap-4 pointer-events-none transition-opacity duration-500">
           <div className="w-12 h-12 rounded-full bg-black/60 border border-white/10 flex items-center justify-center">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
           </div>
        </div>
      )}

      {/* Navigation Arrows */}
      {activeAds.length > 1 && (
        <>
          <button 
            onClick={(e) => { e.preventDefault(); prevSlide(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-[#ccff00] hover:text-black"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={(e) => { e.preventDefault(); nextSlide(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-[#ccff00] hover:text-black"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Indicators */}
      {activeAds.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {activeAds.map((_, i) => (
            <button 
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-[#ccff00] w-6' : 'bg-white/20'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdSlider;
