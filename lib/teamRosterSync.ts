import type { PlayerData } from '../types';

/** Maksimal pemain yang dapat didaftarkan / ditampilkan per tim (PUBGM squad) */
export const MAX_PLAYERS_PER_TEAM = 5;

export const DEFAULT_ROSTER_PLAYER_IMG =
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop';

export interface RosterPlayerEntry {
  name: string;
  image?: string;
  /** Nickname / in-game tag (baris kedua di bawah nama) */
  nickname?: string;
  /** Role / posisi (IGL, FRAGGER, dll.) */
  role?: string;
}

export interface RosterSponsorEntry {
  label: string;
  logo?: string;
}

export interface RosterTeam {
  id: string;
  name: string;
  teamLogo?: string;
  players: RosterPlayerEntry[];
  /** Hashtag tim — tampil di bagian bawah roster */
  hashtag?: string;
  /** Index pemain captain (default tengah = slot 3 / index 2) */
  captainIndex?: number;
  /** Slot rank di Overall Ranking — untuk warna baris genap/ganjil */
  leaderboardRank?: number;
}

export type LeaderboardTeamForRoster = {
  rank?: number;
  active: boolean;
  team: string;
  teamLogo?: string;
  playerNames: string[];
  status?: number[];
  placementRank?: number | null;
};

const DEFAULT_TEAM_LOGO = 'https://api.dicebear.com/7.x/identicon/svg?seed=DEFAULT';

function rosterTeamKey(name: string): string {
  return name.toLowerCase().trim();
}

export function coercePlayerEntry(raw: string | RosterPlayerEntry): RosterPlayerEntry {
  if (typeof raw === 'string') {
    const name = raw?.trim() || '—';
    return { name };
  }
  return {
    name: raw?.name?.trim() || '—',
    image: raw?.image,
    nickname: raw?.nickname?.trim() || undefined,
    role: raw?.role?.trim() || undefined,
  };
}

/** Index captain — default P3 / slot tengah (index 2) */
export function resolveCaptainIndex(team: RosterTeam): number {
  const idx = team.captainIndex ?? 2; // P3
  return Math.max(0, Math.min(MAX_PLAYERS_PER_TEAM - 1, idx));
}

/** Selalu 5 slot — kosong diisi placeholder */
/** Jumlah pemain terisi (1–5) — dipakai urutan animasi roster */
export function getRosterFilledCount(players: Array<string | RosterPlayerEntry>): number {
  return Math.max(1, clampPlayerEntries(players).length);
}

export function getPaddedPlayerSlots(
  players: Array<string | RosterPlayerEntry>
): RosterPlayerEntry[] {
  const filled = clampPlayerEntries(players);
  const slots: RosterPlayerEntry[] = [];
  for (let i = 0; i < MAX_PLAYERS_PER_TEAM; i++) {
    slots.push(filled[i] ?? { name: '—' });
  }
  return slots;
}

export function clampPlayerEntries(
  players: Array<string | RosterPlayerEntry>,
  max = MAX_PLAYERS_PER_TEAM
): RosterPlayerEntry[] {
  return players
    .map(coercePlayerEntry)
    .filter((p) => p.name && p.name !== '—')
    .slice(0, max);
}

export function normalizeRosterTeam(team: RosterTeam): RosterTeam {
  const players = clampPlayerEntries(team.players);
  return {
    ...team,
    players: players.length ? players : [{ name: '—' }],
  };
}

export function normalizeRosterTeams(teams: RosterTeam[]): RosterTeam[] {
  return teams.map(normalizeRosterTeam);
}

function findProjectPlayer(
  projectPlayers: PlayerData[],
  teamName: string,
  playerName: string
): PlayerData | undefined {
  const teamKey = teamName.toLowerCase().trim();
  const nameKey = playerName.toLowerCase().trim();
  return (
    projectPlayers.find(
      (p) => p.name.toLowerCase().trim() === nameKey && p.team.toLowerCase().trim() === teamKey
    ) ?? projectPlayers.find((p) => p.name.toLowerCase().trim() === nameKey)
  );
}

export function enrichRosterImagesFromProject(
  roster: RosterTeam[],
  projectPlayers: PlayerData[] = []
): RosterTeam[] {
  if (!projectPlayers.length) return roster;

  return roster.map((team) => ({
    ...team,
    players: team.players.map((entry) => {
      const coerced = coercePlayerEntry(entry);
      if (coerced.name === '—') return coerced;
      const db = findProjectPlayer(projectPlayers, team.name, coerced.name);
      return {
        name: coerced.name,
        image: coerced.image || db?.image || undefined,
      };
    }),
  }));
}

/** Gabungkan roster dari Project DB per tim (nama + foto pemain) */
export function buildRosterTeamsFromProject(
  projectPlayers: PlayerData[],
  maxPlayersPerTeam = MAX_PLAYERS_PER_TEAM
): RosterTeam[] {
  const map = new Map<string, RosterTeam>();

  for (const p of projectPlayers) {
    const teamName = p.team?.trim();
    const playerName = p.name?.trim();
    if (!teamName || !playerName) continue;

    const key = rosterTeamKey(teamName);
    const prev = map.get(key);
    const entry: RosterPlayerEntry = { name: playerName, image: p.image };

    if (prev) {
      if (
        prev.players.length < maxPlayersPerTeam &&
        !prev.players.some((pl) => pl.name === playerName)
      ) {
        prev.players.push(entry);
      }
      if (!prev.teamLogo && p.teamLogo) prev.teamLogo = p.teamLogo;
      continue;
    }

    map.set(key, {
      id: key,
      name: teamName,
      teamLogo: p.teamLogo || DEFAULT_TEAM_LOGO,
      players: [entry],
    });
  }

  return normalizeRosterTeams(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
}

/** Ambil roster dari tim aktif Overall Ranking */
export function buildRosterTeamsFromLeaderboard(
  teams: LeaderboardTeamForRoster[],
  projectPlayers: PlayerData[] = [],
  maxPlayersPerTeam = MAX_PLAYERS_PER_TEAM
): RosterTeam[] {
  const built: RosterTeam[] = [];

  for (const team of teams) {
    if (!team.active || !team.team?.trim()) continue;

    const entries: RosterPlayerEntry[] = team.playerNames
      .map((n) => n?.trim())
      .filter(Boolean)
      .slice(0, maxPlayersPerTeam)
      .map((name) => {
        const db = findProjectPlayer(projectPlayers, team.team, name);
        return { name, image: db?.image };
      });

    const dbLogo =
      projectPlayers.find((p) => p.team.toLowerCase() === team.team.toLowerCase())?.teamLogo;

    built.push({
      id: rosterTeamKey(team.team),
      name: team.team,
      teamLogo: team.teamLogo || dbLogo || DEFAULT_TEAM_LOGO,
      players: entries.length ? entries : [{ name: '—' }],
      leaderboardRank: team.rank,
    });
  }

  return normalizeRosterTeams(built.sort((a, b) => a.name.localeCompare(b.name)));
}

/** Pemain yang ditampilkan di overlay (maks 5) */
export function getDisplayPlayerEntries(
  players: Array<string | RosterPlayerEntry>
): RosterPlayerEntry[] {
  return clampPlayerEntries(players);
}

export function resolvePlayerPhoto(entry: RosterPlayerEntry): string {
  return entry.image?.trim() || DEFAULT_ROSTER_PLAYER_IMG;
}

/** Sisipkan slot rank & logo dari Overall Ranking ke roster hasil Project DB */
export function mergeLeaderboardRanksIntoRoster(
  roster: RosterTeam[],
  leaderboardTeams: LeaderboardTeamForRoster[]
): RosterTeam[] {
  return roster.map((team) => {
    const lb = leaderboardTeams.find(
      (t) =>
        t.active &&
        t.team?.trim() &&
        t.team.toLowerCase().trim() === team.name.toLowerCase().trim()
    );
    if (!lb) return team;
    return {
      ...team,
      leaderboardRank: lb.rank ?? team.leaderboardRank,
      teamLogo: team.teamLogo || lb.teamLogo,
    };
  });
}

export function rosterTeamsFromProjectDb(
  projectPlayers: PlayerData[],
  leaderboardTeams: LeaderboardTeamForRoster[] = []
): RosterTeam[] {
  const fromProject = buildRosterTeamsFromProject(projectPlayers);
  if (!fromProject.length) return [];
  const withRanks = mergeLeaderboardRanksIntoRoster(fromProject, leaderboardTeams);
  return normalizeRosterTeams(enrichRosterImagesFromProject(withRanks, projectPlayers));
}

export function paginateRosterTeams(
  teams: RosterTeam[],
  page: number,
  perPage: number
): { pageTeams: RosterTeam[]; totalPages: number; safePage: number } {
  const totalPages = Math.max(1, Math.ceil(teams.length / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    pageTeams: teams.slice(start, start + perPage),
    totalPages,
    safePage,
  };
}

const DEMO_PLAYERS = (names: [string, string, string, string, string]): RosterPlayerEntry[] =>
  names.map((name, i) => ({
    name,
    nickname: `@PLAYER${i + 1}`,
    role: i === 2 ? 'IGL / CAPTAIN' : ['FRAGGER', 'SUPPORT', 'IGL / CAPTAIN', 'SCOUT', 'SUB'][i],
  }));

export const DEFAULT_ROSTER_TEAMS: RosterTeam[] = [
  {
    id: 'alpha',
    name: 'TEAM ALPHA',
    teamLogo: DEFAULT_TEAM_LOGO,
    hashtag: '#TEAMALPHA',
    captainIndex: 2,
    players: DEMO_PLAYERS(['NOVA', 'BLAZE', 'PHANTOM', 'STRIKE', 'ECHO']),
  },
  {
    id: 'bravo',
    name: 'TEAM BRAVO',
    teamLogo: DEFAULT_TEAM_LOGO,
    hashtag: '#TEAMBRAVO',
    captainIndex: 2,
    players: DEMO_PLAYERS(['RAVEN', 'FROST', 'VIPER', 'STORM', 'GHOST']),
  },
  {
    id: 'charlie',
    name: 'TEAM CHARLIE',
    teamLogo: DEFAULT_TEAM_LOGO,
    hashtag: '#TEAMCHARLIE',
    captainIndex: 2,
    players: DEMO_PLAYERS(['AXEL', 'ZERO', 'NEXUS', 'PULSE', 'CORE']),
  },
  {
    id: 'delta',
    name: 'TEAM DELTA',
    teamLogo: DEFAULT_TEAM_LOGO,
    hashtag: '#TEAMDELTA',
    captainIndex: 2,
    players: DEMO_PLAYERS(['TITAN', 'ORBIT', 'FLUX', 'PRISM', 'EDGE']),
  },
];
