/** Final Four / WWCD bar — sync via BROHUBS_LEADERBOARD_VISUAL & BROHUBS_FINAL_FOUR_LAYOUT */

import type { CSSProperties } from 'react';
import { isValidImageUrl, panelSurfaceStyle } from '@/lib/eliminationBannerVisual';
import { DEFAULT_OVERLAY_FONT_FAMILY_ID } from '@/lib/eliminationBannerFonts';

export type FinalFourDesignMode = 'panels' | 'customImage';

export const FINAL_FOUR_DESIGN_MODE_LABELS: Record<FinalFourDesignMode, string> = {
  panels: 'Panel (warna)',
  customImage: 'Custom Image (LINK)',
};

export const DEFAULT_FINAL_FOUR_DESIGN_MODE: FinalFourDesignMode = 'panels';

/** Kunci warna yang bisa diatur lewat color picker (hex) */
export const FINAL_FOUR_COLOR_KEYS = [
  'finalFourTagGreen',
  'finalFourPanelDark',
  'finalFourPanelRow',
  'finalFourWwcdGreen',
  'finalFourLogoBg',
  'finalFourTagText',
  'finalFourWwcdLabelText',
] as const;

export type FinalFourColorKey = (typeof FINAL_FOUR_COLOR_KEYS)[number];

export const FINAL_FOUR_COLOR_LABELS: Record<FinalFourColorKey, string> = {
  finalFourTagGreen: 'TAG BG',
  finalFourPanelDark: 'PANEL DARK',
  finalFourPanelRow: 'PANEL ROW',
  finalFourWwcdGreen: 'WWCD %',
  finalFourLogoBg: 'LOGO BG',
  finalFourTagText: 'TAG TEXT',
  finalFourWwcdLabelText: 'WWCD LABEL',
};

export interface FinalFourVisualFields {
  finalFourDesignMode: FinalFourDesignMode;
  finalFourCardBgImage: string;
  finalFourTagGreen: string;
  finalFourPanelDark: string;
  finalFourPanelRow: string;
  finalFourWwcdGreen: string;
  finalFourBorder: string;
  finalFourLogoBg: string;
  finalFourTagText: string;
  finalFourWwcdLabelText: string;
}

export const DEFAULT_FINAL_FOUR_VISUAL: FinalFourVisualFields = {
  finalFourDesignMode: DEFAULT_FINAL_FOUR_DESIGN_MODE,
  finalFourCardBgImage: '',
  finalFourTagGreen: '#5B835B',
  finalFourPanelDark: '#141414',
  finalFourPanelRow: '#1A1A1A',
  finalFourWwcdGreen: '#66BB6A',
  finalFourBorder: 'rgba(255,255,255,0.14)',
  finalFourLogoBg: '#ffffff',
  finalFourTagText: '#ffffff',
  finalFourWwcdLabelText: '#ffffff',
};

export interface FinalFourLayoutConfig {
  scale: number;
  /** Geser dari tengah horizontal — positif = kanan */
  xOffset: number;
  /** Jarak dari atas canvas (px) */
  yOffset: number;
  /** Jarak antar kartu (px) */
  cardGap: number;
  /** Tahan bar saat 1 tim tersisa (ms) sebelum transisi keluar */
  soloExitDelayMs: number;
  fontFamilyId?: string;
  tagFontSize: number;
  wwcdLabelFontSize: number;
  wwcdPctFontSize: number;
}

export const DEFAULT_FINAL_FOUR_LAYOUT: FinalFourLayoutConfig = {
  scale: 100,
  xOffset: 0,
  yOffset: 56,
  cardGap: 20,
  soloExitDelayMs: 3200,
  fontFamilyId: DEFAULT_OVERLAY_FONT_FAMILY_ID,
  tagFontSize: 23,
  wwcdLabelFontSize: 13.5,
  wwcdPctFontSize: 15,
};

export const FINAL_FOUR_SOLO_EXIT_DELAY_MIN_MS = 500;
export const FINAL_FOUR_SOLO_EXIT_DELAY_MAX_MS = 15000;

export function resolveFinalFourSoloExitDelayMs(ms?: number): number {
  const fallback = DEFAULT_FINAL_FOUR_LAYOUT.soloExitDelayMs;
  const n = ms ?? fallback;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(
    FINAL_FOUR_SOLO_EXIT_DELAY_MAX_MS,
    Math.max(FINAL_FOUR_SOLO_EXIT_DELAY_MIN_MS, Math.round(n))
  );
}

export function isFinalFourPanelDesignMode(visual: {
  finalFourDesignMode?: FinalFourDesignMode;
}): boolean {
  return (visual.finalFourDesignMode ?? DEFAULT_FINAL_FOUR_DESIGN_MODE) === 'panels';
}

export function isFinalFourCustomImageMode(visual: {
  finalFourDesignMode?: FinalFourDesignMode;
}): boolean {
  return !isFinalFourPanelDesignMode(visual);
}

export function pickFinalFourColors(
  visual: Partial<FinalFourVisualFields>
): Record<FinalFourColorKey, string> {
  return {
    finalFourTagGreen:
      visual.finalFourTagGreen ?? DEFAULT_FINAL_FOUR_VISUAL.finalFourTagGreen,
    finalFourPanelDark:
      visual.finalFourPanelDark ?? DEFAULT_FINAL_FOUR_VISUAL.finalFourPanelDark,
    finalFourPanelRow:
      visual.finalFourPanelRow ?? DEFAULT_FINAL_FOUR_VISUAL.finalFourPanelRow,
    finalFourWwcdGreen:
      visual.finalFourWwcdGreen ?? DEFAULT_FINAL_FOUR_VISUAL.finalFourWwcdGreen,
    finalFourBorder:
      visual.finalFourBorder ?? DEFAULT_FINAL_FOUR_VISUAL.finalFourBorder,
    finalFourLogoBg:
      visual.finalFourLogoBg ?? DEFAULT_FINAL_FOUR_VISUAL.finalFourLogoBg,
    finalFourTagText:
      visual.finalFourTagText ?? DEFAULT_FINAL_FOUR_VISUAL.finalFourTagText,
    finalFourWwcdLabelText:
      visual.finalFourWwcdLabelText ?? DEFAULT_FINAL_FOUR_VISUAL.finalFourWwcdLabelText,
  };
}

export function resolveFinalFourCardSurface(
  visual: Partial<FinalFourVisualFields>,
  fallbackColor: string
): CSSProperties {
  if (isFinalFourPanelDesignMode(visual)) {
    return { backgroundColor: fallbackColor };
  }
  const url = visual.finalFourCardBgImage?.trim() ?? '';
  return panelSurfaceStyle(fallbackColor, url);
}

export function hasFinalFourCardBgImage(
  visual: Partial<FinalFourVisualFields>
): boolean {
  return (
    isFinalFourCustomImageMode(visual) &&
    isValidImageUrl(visual.finalFourCardBgImage?.trim() ?? '')
  );
}
