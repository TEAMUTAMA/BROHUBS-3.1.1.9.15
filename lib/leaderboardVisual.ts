/** Overall Ranking visual — sync via BROHUBS_LEADERBOARD_VISUAL */

import type { CSSProperties } from 'react';
import { isValidImageUrl, panelSurfaceStyle } from '@/lib/eliminationBannerVisual';

export type LeaderboardDesignMode = 'panels' | 'customImage';

export const LEADERBOARD_DESIGN_MODE_LABELS: Record<LeaderboardDesignMode, string> = {
  panels: 'Panel (warna)',
  customImage: 'Custom Image (LINK)',
};

export const DEFAULT_LEADERBOARD_DESIGN_MODE: LeaderboardDesignMode = 'panels';

/** Lebar panel Overall Ranking (px) */
export const LEADERBOARD_PANEL_WIDTH_NO_FLAGS_PX = 380;
export const LEADERBOARD_PANEL_WIDTH_WITH_FLAGS_PX = 450;
export const DEFAULT_LEADERBOARD_PANEL_WIDTH_PX = LEADERBOARD_PANEL_WIDTH_WITH_FLAGS_PX;
export const LEADERBOARD_PANEL_WIDTH_MIN = 280;
export const LEADERBOARD_PANEL_WIDTH_MAX = 560;

export function leaderboardPanelWidthForFlags(showFlags: boolean): number {
  return showFlags
    ? LEADERBOARD_PANEL_WIDTH_WITH_FLAGS_PX
    : LEADERBOARD_PANEL_WIDTH_NO_FLAGS_PX;
}

export function resolveLeaderboardPanelWidth(
  px?: number,
  showFlags?: boolean
): number {
  const fallback =
    showFlags === undefined
      ? DEFAULT_LEADERBOARD_PANEL_WIDTH_PX
      : leaderboardPanelWidthForFlags(showFlags);
  const n = px ?? fallback;
  return Math.min(
    LEADERBOARD_PANEL_WIDTH_MAX,
    Math.max(LEADERBOARD_PANEL_WIDTH_MIN, Number.isFinite(n) ? n : fallback)
  );
}

export function isLeaderboardPanelDesignMode(visual: {
  leaderboardDesignMode?: LeaderboardDesignMode;
}): boolean {
  return (visual.leaderboardDesignMode ?? DEFAULT_LEADERBOARD_DESIGN_MODE) === 'panels';
}

export function isLeaderboardCustomImageMode(visual: {
  leaderboardDesignMode?: LeaderboardDesignMode;
}): boolean {
  return !isLeaderboardPanelDesignMode(visual);
}

export const LEADERBOARD_BG_IMAGE_KEYS = [
  'leaderboardPanelBgImage',
  'headerBgImage',
  'rowEvenBgImage',
  'rowOddBgImage',
  'eliminatedBgImage',
  'winnerBgImage',
] as const;

export type LeaderboardBgImageKey = (typeof LEADERBOARD_BG_IMAGE_KEYS)[number];

export const LEADERBOARD_BG_IMAGE_LABELS: Record<LeaderboardBgImageKey, string> = {
  leaderboardPanelBgImage: 'Panel penuh (LINK)',
  headerBgImage: 'Header & footer (LINK)',
  rowEvenBgImage: 'Baris genap (LINK)',
  rowOddBgImage: 'Baris ganjil (LINK)',
  eliminatedBgImage: 'Baris eliminasi (LINK)',
  winnerBgImage: 'Baris winner (LINK)',
};

export const LEADERBOARD_BG_IMAGE_HINTS: Record<LeaderboardBgImageKey, string> = {
  leaderboardPanelBgImage: 'Satu gambar di belakang seluruh panel · lebar = PANEL WIDTH (px)',
  headerBgImage: 'Judul + legenda ALIVE/KNOCK bawah',
  rowEvenBgImage: 'Rank 1, 3, 5…',
  rowOddBgImage: 'Rank 2, 4, 6…',
  eliminatedBgImage: 'Tim yang sudah ter-eliminasi',
  winnerBgImage: 'Tim pemenang (1 tim tersisa)',
};

export interface LeaderboardBackgroundImages {
  leaderboardPanelBgImage: string;
  headerBgImage: string;
  rowEvenBgImage: string;
  rowOddBgImage: string;
  eliminatedBgImage: string;
  winnerBgImage: string;
}

export const DEFAULT_LEADERBOARD_BACKGROUND_IMAGES: LeaderboardBackgroundImages = {
  leaderboardPanelBgImage: '',
  headerBgImage: '',
  rowEvenBgImage: '',
  rowOddBgImage: '',
  eliminatedBgImage: '',
  winnerBgImage: '',
};

export function leaderboardSurfaceStyle(color: string, imageUrl?: string): CSSProperties {
  return panelSurfaceStyle(color, imageUrl?.trim() ?? '');
}

export function resolveLeaderboardSurfaceStyle(
  color: string,
  imageUrl: string | undefined,
  visual: { leaderboardDesignMode?: LeaderboardDesignMode }
): CSSProperties {
  if (isLeaderboardPanelDesignMode(visual)) {
    return { backgroundColor: color };
  }
  return leaderboardSurfaceStyle(color, imageUrl);
}

export function hasLeaderboardBgImage(
  url: string | undefined,
  visual: { leaderboardDesignMode?: LeaderboardDesignMode }
): boolean {
  return isLeaderboardCustomImageMode(visual) && isValidImageUrl(url?.trim() ?? '');
}

export const LEADERBOARD_PANEL_BG_COLOR_KEYS = [
  'headerBg',
  'rowEvenBg',
  'rowOddBg',
  'eliminatedBg',
  'winnerBg',
] as const;

export const LEADERBOARD_TEXT_COLOR_KEYS = [
  'headerText',
  'teamNameColor',
  'rankColor',
  'pointsColor',
  'deltaPointsColor',
  'eliminatedText',
  'winnerText',
  'statusAlive',
  'statusKnock',
  'statusDead',
  'statusBorder',
  'statusText',
] as const;

export type LeaderboardPanelBgColorKey = (typeof LEADERBOARD_PANEL_BG_COLOR_KEYS)[number];
export type LeaderboardTextColorKey = (typeof LEADERBOARD_TEXT_COLOR_KEYS)[number];

export const LEADERBOARD_COLOR_LABELS: Record<
  LeaderboardPanelBgColorKey | LeaderboardTextColorKey,
  string
> = {
  headerBg: 'HEADER BG',
  rowEvenBg: 'ROW EVEN',
  rowOddBg: 'ROW ODD',
  eliminatedBg: 'ELIM BG',
  winnerBg: 'WINNER BG',
  headerText: 'HEADER TEXT',
  teamNameColor: 'TEAM NAME',
  rankColor: 'RANK COLOR',
  pointsColor: 'POINTS',
  deltaPointsColor: 'DELTA PTS',
  eliminatedText: 'ELIM TEXT',
  winnerText: 'WINNER TEXT',
  statusAlive: 'STATUS ALIVE',
  statusKnock: 'STATUS KNOCK',
  statusDead: 'STATUS DEAD',
  statusBorder: 'STATUS BORDER',
  statusText: 'STATUS TEXT',
};
