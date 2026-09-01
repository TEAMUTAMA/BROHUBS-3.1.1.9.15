// ============================================================================
// LanguageProvider — bahasa aktif + fungsi terjemahan t() untuk seluruh app.
//
// ATURAN BAHASA:
//   - SEBELUM login  -> SELALU English (halaman publik: landing, navbar, login modal).
//   - SETELAH login  -> pakai pilihan user (switcher 🌐 di sidebar dashboard),
//                       disimpan di localStorage 'BROHUBS_LANGUAGE' (bertahan + sinkron antar-tab).
//
// App.tsx memanggil setLoggedIn(true) saat masuk dashboard, dan false saat keluar.
// ============================================================================

import React, { createContext, useContext, useCallback, useState } from 'react';
import { useSharedState } from '../lib/useSharedState';
import { LANGUAGES, DEFAULT_LANG, translations, type LangCode } from './translations';

// Bahasa wajib untuk semua tampilan PRA-login.
const PRELOGIN_LANG: LangCode = 'en';

interface LanguageContextValue {
  lang: LangCode;                    // bahasa efektif yang sedang dipakai
  setLang: (code: LangCode) => void; // ubah pilihan tersimpan (dipakai switcher pasca-login)
  t: (key: string) => string;
  languages: typeof LANGUAGES;
  isLoggedIn: boolean;
  setLoggedIn: (v: boolean) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storedLang, setLang] = useSharedState<LangCode>('BROHUBS_LANGUAGE', DEFAULT_LANG);
  const [isLoggedIn, setLoggedIn] = useState(false);

  // Pra-login dipaksa English; pasca-login pakai pilihan tersimpan user.
  const lang: LangCode = isLoggedIn ? storedLang : PRELOGIN_LANG;

  // t('grup.kunci') -> teks bahasa aktif, fallback ke EN, lalu kunci itu sendiri.
  const t = useCallback(
    (key: string): string =>
      translations[lang]?.[key] ??
      translations['en']?.[key] ??
      key,
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, languages: LANGUAGES, isLoggedIn, setLoggedIn }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage harus dipakai di dalam <LanguageProvider>');
  return ctx;
}

// Pintasan bila hanya butuh fungsi terjemahan: const t = useT();
export function useT(): (key: string) => string {
  return useLanguage().t;
}
