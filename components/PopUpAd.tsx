import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Ad } from '../types';

interface PopUpAdProps {
  ad: Ad | null;
  onClose: () => void;
}

const PopUpAd: React.FC<PopUpAdProps> = ({ ad, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (ad) {
      // Small delay to allow animation to trigger
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [ad]);

  if (!ad) return null;

  const getSizeClasses = () => {
    switch (ad.popUpSize) {
      case 'SMALL': return 'max-w-md';
      case 'LARGE': return 'max-w-5xl';
      case 'ASPECT_16_9': return 'w-full max-w-5xl aspect-video';
      case 'MEDIUM':
      default: return 'max-w-2xl';
    }
  };

  const isAspect16_9 = ad.popUpSize === 'ASPECT_16_9';

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-500 ${isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }} 
      />
      <div className={`relative w-full ${getSizeClasses()} bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 transform ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'}`}>
        <button 
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/50 hover:bg-black text-white rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-colors"
        >
          <X size={16} />
        </button>
        
        <a href={ad.targetUrl} target="_blank" rel="noopener noreferrer" className={`block relative group ${isAspect16_9 ? 'w-full h-full' : ''}`}>
          <img 
            src={ad.imageUrl} 
            alt="Advertisement" 
            className={`w-full object-cover ${isAspect16_9 ? 'h-full aspect-video' : 'h-auto max-h-[70vh]'}`}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 bg-[#ccff00] text-black px-6 py-3 rounded-xl font-black text-xs tracking-widest uppercase shadow-2xl">
              Learn More
            </div>
          </div>
        </a>
      </div>
    </div>
  );
};

export default PopUpAd;
