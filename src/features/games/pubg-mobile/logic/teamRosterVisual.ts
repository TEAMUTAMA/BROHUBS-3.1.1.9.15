import { isTeamMatchEliminated, teamHasAlivePlayer } from './matchPlacements';
import type { RosterTeam } from './teamRosterSync';

/** Palet default Overall Ranking PMGO — dipakai Team Roster saat sync visual */
/** Sudut terpotong (chamfer) — sama seperti Final Four / PMGO cards */
export function cutCornerClipPath(cutPx = 14): string {
  const cut = Math.max(0, Math.round(cutPx));
  if (cut <= 0) return 'none';
  return `polygon(${cut}px 0, 100% 0, 100% calc(100% - ${cut}px), calc(100% - ${cut}px) 100%, 0 100%, 0 ${cut}px)`;
}

export const DEFAULT_PMGO_ROSTER_PALETTE = {
  titleColor: '#74a57f',
  subtitleColor: '#ffffff',
  cardHeaderBg: '#74a57f',
  cardHeaderText: '#ffffff',
  cardBodyBg: '#e8e6df',
  cardBodyText: '#000000',
  pageIndicatorColor: '#ffffff',
  accentLineColor: '#ffffff',
  logoPlaceholderBg: '#a3cfaa',
  /** Glow utama frame pemain — sync PMGO header */
  frameGlow: '#74a57f',
  /** Isi frame bawah — sync eliminatedBg Overall Ranking */
  frameBgBottom: '#323232',
  /** Highlight frame — sync rowEvenBg Overall Ranking */
  frameBgMid: '#e8e6df',
  /** Aksen neon HUD — sync deltaPoints / winnerBg */
  accentNeon: '#ccff00',
  /** Shadow teks nama — turunan gelap headerBg */
  nameShadowColor: '#4a6a52',
  /** Warna grid digital background */
  gridColor: 'rgba(116,165,127,0.12)',
  /** Smoke / partikel halus */
  smokeColor: 'rgba(116,165,127,0.07)',
  /** Garis HUD futuristik */
  hudLineColor: 'rgba(204,255,0,0.22)',
  /** Teks nickname — sync statusAlive */
  secondaryTextColor: '#a3cfaa',
  /** Badge captain — sync winnerBg */
  captainBadgeColor: '#ccff00',
  /** Teks badge captain — sync winnerText */
  captainBadgeText: '#000000',
} as const;

export type TeamRosterVisualPalette = {
  [K in keyof typeof DEFAULT_PMGO_ROSTER_PALETTE]: string;
};

export interface LeaderboardVisualForRoster {
  headerBg?: string;
  headerText?: string;
  rowEvenBg?: string;
  rowOddBg?: string;
  teamNameColor?: string;
  eliminatedBg?: string;
  eliminatedText?: string;
  winnerBg?: string;
  winnerText?: string;
  statusAlive?: string;
  deltaPointsColor?: string;
  rankColor?: string;
}

export interface LeaderboardTeamForRosterColor {
  rank: number;
  team: string;
  active: boolean;
  status: number[];
  playerKills: number[];
  playerKnockCredit?: Array<unknown>;
  playerFinishCredit?: Array<unknown>;
  placementRank: number | null;
}

export interface RosterCardColors {
  headerBg: string;
  headerText: string;
  bodyBg: string;
  bodyText: string;
  logoPlaceholderBg: string;
}

function pickString(value: string | undefined, fallback: string): string {
  return value?.trim() ? value : fallback;
}

/** Hex dengan alpha untuk glow CSS */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(116,165,127,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Gelapkan hex untuk shadow teks — senada header PMGO */
export function darkenHex(hex: string, amount = 0.35): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return DEFAULT_PMGO_ROSTER_PALETTE.nameShadowColor;
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount));
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount));
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount));
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

/** Judul, subtitle, dan fallback kartu dari BROHUBS_LEADERBOARD_VISUAL */
export function pickPmgoRosterPalette(
  visual: Partial<LeaderboardVisualForRoster> = {}
): TeamRosterVisualPalette {
  const headerBg = pickString(visual.headerBg, DEFAULT_PMGO_ROSTER_PALETTE.cardHeaderBg);
  const headerText = pickString(visual.headerText, DEFAULT_PMGO_ROSTER_PALETTE.cardHeaderText);
  const rowEvenBg = pickString(visual.rowEvenBg, DEFAULT_PMGO_ROSTER_PALETTE.cardBodyBg);
  const accentNeon = pickString(
    visual.deltaPointsColor,
    pickString(visual.winnerBg, DEFAULT_PMGO_ROSTER_PALETTE.accentNeon)
  );
  const captainBadgeColor = pickString(visual.winnerBg, DEFAULT_PMGO_ROSTER_PALETTE.captainBadgeColor);
  const captainBadgeText = pickString(visual.winnerText, DEFAULT_PMGO_ROSTER_PALETTE.captainBadgeText);
  const frameBgBottom = pickString(visual.eliminatedBg, DEFAULT_PMGO_ROSTER_PALETTE.frameBgBottom);
  const secondaryTextColor = pickString(
    visual.statusAlive,
    DEFAULT_PMGO_ROSTER_PALETTE.secondaryTextColor
  );

  return {
    titleColor: headerBg,
    subtitleColor: headerText,
    cardHeaderBg: headerBg,
    cardHeaderText: headerText,
    cardBodyBg: rowEvenBg,
    cardBodyText: pickString(visual.teamNameColor, DEFAULT_PMGO_ROSTER_PALETTE.cardBodyText),
    pageIndicatorColor: headerText,
    accentLineColor: headerText,
    logoPlaceholderBg: pickString(visual.statusAlive, DEFAULT_PMGO_ROSTER_PALETTE.logoPlaceholderBg),
    frameGlow: headerBg,
    frameBgBottom,
    frameBgMid: rowEvenBg,
    accentNeon,
    nameShadowColor: darkenHex(headerBg, 0.38),
    gridColor: hexToRgba(headerBg, 0.12),
    smokeColor: hexToRgba(headerBg, 0.07),
    hudLineColor: hexToRgba(accentNeon, 0.22),
    secondaryTextColor,
    captainBadgeColor,
    captainBadgeText,
  };
}

/** Clip hexagonal-futuristic untuk frame pemain */
export function rosterFrameClipPath(cutPx = 18): string {
  const c = Math.max(4, Math.round(cutPx));
  return `polygon(${c}px 0, calc(100% - ${c}px) 0, 100% ${c}px, 100% calc(100% - ${c}px), calc(100% - ${c}px) 100%, ${c}px 100%, 0 calc(100% - ${c}px), 0 ${c}px)`;
}

function findLeaderboardTeam(
  rosterTeam: RosterTeam,
  leaderboardTeams: LeaderboardTeamForRosterColor[]
): LeaderboardTeamForRosterColor | undefined {
  const key = rosterTeam.name.toLowerCase().trim();
  return (
    leaderboardTeams.find((t) => t.team.toLowerCase().trim() === key) ??
    (rosterTeam.leaderboardRank != null
      ? leaderboardTeams.find((t) => t.rank === rosterTeam.leaderboardRank)
      : undefined)
  );
}

function sortedActiveLeaderboardTeams(
  leaderboardTeams: LeaderboardTeamForRosterColor[]
): LeaderboardTeamForRosterColor[] {
  return [...leaderboardTeams]
    .filter((t) => t.active)
    .sort((a, b) => a.rank - b.rank);
}

/** Warna kartu per tim — header mengikuti PMGO, body mengikuti baris Overall Ranking */
export function resolveRosterCardColors(
  rosterTeam: RosterTeam,
  cardIndex: number,
  leaderboardTeams: LeaderboardTeamForRosterColor[],
  visual: Partial<LeaderboardVisualForRoster> = {},
  contentionCount = 1
): RosterCardColors {
  const palette = pickPmgoRosterPalette(visual);
  const lbTeam = findLeaderboardTeam(rosterTeam, leaderboardTeams);
  const sorted = sortedActiveLeaderboardTeams(leaderboardTeams);
  const sortedIndex =
    lbTeam != null ? sorted.findIndex((t) => t.rank === lbTeam.rank) : cardIndex;

  const isWinner =
    lbTeam != null &&
    (lbTeam.placementRank === 1 ||
      (contentionCount === 1 && teamHasAlivePlayer(lbTeam)));
  const isEliminated = lbTeam != null && isTeamMatchEliminated(lbTeam);

  let bodyBg = palette.cardBodyBg;
  let bodyText = palette.cardBodyText;

  if (isWinner) {
    bodyBg = pickString(visual.winnerBg, palette.cardBodyBg);
    bodyText = pickString(visual.winnerText, palette.cardBodyText);
  } else if (isEliminated) {
    bodyBg = pickString(visual.eliminatedBg, palette.cardBodyBg);
    bodyText = pickString(visual.eliminatedText, '#ffffff');
  } else if (sortedIndex >= 0) {
    bodyBg =
      sortedIndex % 2 === 0
        ? pickString(visual.rowEvenBg, palette.cardBodyBg)
        : pickString(visual.rowOddBg, pickString(visual.rowEvenBg, palette.cardBodyBg));
    bodyText = pickString(visual.teamNameColor, palette.cardBodyText);
  }

  return {
    headerBg: palette.cardHeaderBg,
    headerText: palette.cardHeaderText,
    bodyBg,
    bodyText,
    logoPlaceholderBg: palette.logoPlaceholderBg,
  };
}
