import type { PlayerData } from '@/types';

/** Baris kill per pemain dari state leaderboard match berjalan */
export interface MatchPlayerKillRow {
  name: string;
  team: string;
  teamLogo?: string;
  image?: string;
  elims: number;
  damage: number;
  survival: string;
  teamIndex: number;
  playerIndex: number;
}

export interface TopFraggerSlot {
  rank: number;
  name: string;
  team: string;
  teamLogo?: string;
  elims: number;
  damage: number;
  survival: string;
  image?: string;
}

export type LeaderboardTeamForFragger = {
  active: boolean;
  team: string;
  teamLogo?: string;
  playerNames: string[];
  playerKills: number[];
  status: number[];
  placementRank?: number | null;
  totalWwcds?: number;
};

export function countAliveTeams(teams: LeaderboardTeamForFragger[]): number {
  return teams.filter((t) => t.active && !t.status.every((s) => s === 0)).length;
}

/** Siap sync Top Fragger: sisa 1 tim hidup atau ada tim pemenang (WWCD / placement #1) */
export function isMatchReadyForTopFraggerSync(teams: LeaderboardTeamForFragger[]): boolean {
  if (!teams.length) return false;

  const aliveTeams = countAliveTeams(teams);
  if (aliveTeams <= 1) return true;

  const hasLiveWinner = teams.some(
    (t) =>
      t.active &&
      t.placementRank === 1 &&
      t.status.some((s) => s === 1 || s === 2)
  );
  if (hasLiveWinner) return true;

  return teams.some((t) => t.active && (t.totalWwcds ?? 0) > 0);
}

export function collectCurrentMatchKillRows(
  teams: LeaderboardTeamForFragger[],
  projectPlayers: PlayerData[] = []
): MatchPlayerKillRow[] {
  const rows: MatchPlayerKillRow[] = [];

  teams.forEach((team, teamIndex) => {
    if (!team.active) return;

    team.playerNames.forEach((rawName, playerIndex) => {
      const trimmed = rawName?.trim();
      if (!trimmed) return;

      const db =
        projectPlayers.find(
          (p) =>
            p.name.toLowerCase() === trimmed.toLowerCase() &&
            p.team.toLowerCase() === team.team.toLowerCase()
        ) ??
        projectPlayers.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());

      rows.push({
        name: db?.name ?? trimmed,
        team: team.team,
        teamLogo: team.teamLogo || db?.teamLogo,
        image: db?.image,
        elims: (team.playerKills[playerIndex] ?? 0) || db?.kills || 0,
        damage: db?.damage || 0,
        survival: db?.survivalTime || '0 M 00 S',
        teamIndex,
        playerIndex,
      });
    });
  });

  return rows.sort((a, b) => b.elims - a.elims || a.name.localeCompare(b.name));
}

export function buildTopFraggersFromMatch(
  teams: LeaderboardTeamForFragger[],
  projectPlayers: PlayerData[] = [],
  slots = 5,
  defaults?: { teamLogo: string; playerImage: string; survival: string }
): TopFraggerSlot[] {
  const rows = collectCurrentMatchKillRows(teams, projectPlayers).slice(0, slots);
  const teamLogoDefault = defaults?.teamLogo ?? '';
  const imageDefault = defaults?.playerImage ?? '';
  const survivalDefault = defaults?.survival ?? '0 M 00 S';

  const built = rows.map((row, index) => ({
    rank: index + 1,
    name: row.name,
    team: row.team,
    teamLogo: row.teamLogo?.trim() || teamLogoDefault,
    elims: row.elims,
    damage: row.damage,
    survival: row.survival?.trim() || survivalDefault,
    image: row.image?.trim() || imageDefault,
  }));

  while (built.length < slots) {
    const n = built.length + 1;
    built.push({
      rank: n,
      name: `PLAYER ${n}`,
      team: `TEAM ${String.fromCharCode(64 + n)}`,
      teamLogo: teamLogoDefault,
      elims: 0,
      damage: 0,
      survival: survivalDefault,
      image: imageDefault,
    });
  }

  return built;
}

/** Update elims pada slot fragger yang sudah ada (tanpa ganti nama) */
export function mergeFraggersElimsFromMatch<T extends TopFraggerSlot>(
  fraggers: T[],
  teams: LeaderboardTeamForFragger[],
  projectPlayers: PlayerData[] = []
): T[] | null {
  const rows = collectCurrentMatchKillRows(teams, projectPlayers);
  let changed = false;

  const next = fraggers.map((f) => {
    const row = rows.find((r) => r.name.toLowerCase() === f.name.toLowerCase());
    if (!row) return f;

    const patch: Partial<T> = {};
    if (f.elims !== row.elims) {
      (patch as TopFraggerSlot).elims = row.elims;
      changed = true;
    }
    if (row.teamLogo && f.teamLogo !== row.teamLogo) {
      (patch as TopFraggerSlot).teamLogo = row.teamLogo;
      changed = true;
    }
    if (row.image && f.image !== row.image) {
      (patch as TopFraggerSlot).image = row.image;
      changed = true;
    }
    if (row.team && f.team !== row.team) {
      (patch as TopFraggerSlot).team = row.team;
      changed = true;
    }
    if (f.damage !== row.damage) {
      (patch as TopFraggerSlot).damage = row.damage;
      changed = true;
    }
    if (row.survival && f.survival !== row.survival) {
      (patch as TopFraggerSlot).survival = row.survival;
      changed = true;
    }

    return Object.keys(patch).length ? { ...f, ...patch } : f;
  });

  if (!changed) return null;

  const sorted = [...next].sort((a, b) => b.elims - a.elims);
  sorted.forEach((f, i) => {
    f.rank = i + 1;
  });
  return sorted;
}

/** Pemain untuk modal Project Personnel DB (Project DB + roster match live) */
export type PersonnelDbPlayer = PlayerData & { elims: number };

function personnelRowKey(team: string, name: string): string {
  return `${team.toLowerCase().trim()}::${name.toLowerCase().trim()}`;
}

/** Gabungkan roster project dengan pemain/kill dari leaderboard match berjalan */
export function buildPersonnelDbRows(
  projectPlayers: PlayerData[],
  teams: LeaderboardTeamForFragger[]
): PersonnelDbPlayer[] {
  const map = new Map<string, PersonnelDbPlayer>();

  for (const p of projectPlayers) {
    const name = p.name?.trim();
    if (!name || !p.team?.trim()) continue;
    const key = personnelRowKey(p.team, name);
    map.set(key, {
      ...p,
      elims: p.kills ?? 0,
    });
  }

  for (const team of teams) {
    if (!team.active) continue;
    team.playerNames.forEach((rawName, idx) => {
      const name = rawName?.trim();
      if (!name || !team.team?.trim()) return;

      const key = personnelRowKey(team.team, name);
      const kills = team.playerKills[idx] ?? 0;
      const prev = map.get(key);

      if (prev) {
        const elims = kills || prev.kills || prev.elims || 0;
        map.set(key, {
          ...prev,
          elims,
          kills: elims,
          teamLogo: prev.teamLogo || team.teamLogo,
        });
        return;
      }

      map.set(key, {
        id: key,
        name,
        team: team.team,
        role: '',
        kills,
        damage: 0,
        assists: 0,
        survivalTime: '0 M 00 S',
        teamLogo: team.teamLogo,
        elims: kills,
      });
    });
  }

  return Array.from(map.values()).sort(
    (a, b) => b.elims - a.elims || a.name.localeCompare(b.name)
  );
}

export function filterPersonnelDbRows(
  rows: PersonnelDbPlayer[],
  options: { teamFilter: string; search: string }
): PersonnelDbPlayer[] {
  const q = options.search.trim().toLowerCase();
  const teamFilter = options.teamFilter;

  return rows
    .filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.team.toLowerCase().includes(q) ||
        (p.id ?? '').toLowerCase().includes(q);
      const matchesTeam =
        teamFilter === 'ALL' ||
        p.team.toLowerCase() === teamFilter.toLowerCase();
      return matchesSearch && matchesTeam;
    })
    .sort((a, b) => b.elims - a.elims || a.name.localeCompare(b.name));
}

export function listPersonnelDbTeams(rows: PersonnelDbPlayer[]): string[] {
  return Array.from(new Set(rows.map((p) => p.team).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}
