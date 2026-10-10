// ============================================================================
// LanguageSwitcher — tombol pilih bahasa (globe + dropdown).
// Dipakai di footer sidebar dashboard, berlaku untuk admin & member.
// Menyesuaikan keadaan sidebar: `isExpanded` true = lebar berlabel, false = ikon saja.
// Dropdown membuka ke ATAS karena posisinya di bagian bawah sidebar.
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface LanguageSwitcherProps {
  isExpanded?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ isExpanded = true }) => {
  const { lang, setLang, t, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = languages.find((l) => l.code === lang) ?? languages[0];

  // Tutup dropdown saat klik di luar.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className={`relative ${isExpanded ? 'w-full' : 'w-14'}`}>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-44 max-w-[12rem] rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl shadow-black/60 overflow-hidden z-[80] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <p className="px-4 pt-3 pb-2 text-[8px] font-black tracking-[0.3em] uppercase text-gray-600">
            {t('common.chooseLanguage')}
          </p>
          {languages.map((l) => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${
                  active ? 'bg-[#ccff00]/10 text-[#ccff00]' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-base leading-none">{l.flag}</span>
                <span className="text-[11px] font-bold tracking-wide flex-1">{l.label}</span>
                {active && <Check size={14} className="text-[#ccff00]" />}
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        title={!isExpanded ? t('common.language') : ''}
        className={`border border-white/10 rounded-2xl uppercase tracking-[0.2em] text-zinc-400 hover:text-[#ccff00] hover:border-[#ccff00]/30 transition-all active:scale-95 flex items-center justify-center ${
          isExpanded ? 'w-full py-3 px-4 gap-2 text-[10px] font-bold justify-between' : 'w-14 h-14'
        }`}
      >
        {isExpanded ? (
          <>
            <div className="flex items-center gap-2">
              <Globe size={14} />
              <span>{current.short}</span>
            </div>
            <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </>
        ) : (
          <Globe size={20} />
        )}
      </button>
    </div>
  );
};

export default LanguageSwitcher;
