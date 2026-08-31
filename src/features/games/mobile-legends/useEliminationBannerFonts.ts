import { useEffect } from 'react';
import { ensureOverlayGoogleFontsLoaded } from '@/features/games/mobile-legends/logic/eliminationBannerFonts';

/** Muat Google Fonts untuk semua overlay (sekali per tab). */
export function useOverlayFonts(): void {
  useEffect(() => {
    ensureOverlayGoogleFontsLoaded();
  }, []);
}

/** @deprecated gunakan useOverlayFonts */
export const useEliminationBannerFonts = useOverlayFonts;
