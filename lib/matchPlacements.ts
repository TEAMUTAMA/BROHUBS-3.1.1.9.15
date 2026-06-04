import {
  applyNoAliveCascade,
  assignPlacementOnTeamElim,
  type LeaderboardTeamState,
} from './leaderboardKillLogic';

export function teamHasAlivePlayer(team: LeaderboardTeamState): boolean {
  return team.status.some((s) => s === 1);
}

/** Tim sudah keluar dari pertandingan match ini (punya placement atau tidak ada pemain hidup) */
export function isTeamMatchEliminated(team: LeaderboardTeamState): boolean {
  if (!team.active) return true;
  if (team.placementRank !== null) return true;
  if (team.status.every((s) => s === 0)) return true;
  return !teamHasAlivePlayer(team);
}

/** Tim yang masih berebut placement — harus ada minimal 1 pemain hidup (status 1) */
export function getTeamsInContention(teams: LeaderboardTeamState[]): LeaderboardTeamState[] {
  return teams.filter(
    (t) => t.active && t.placementRank === null && teamHasAlivePlayer(t)
  );
}

/**
 * Satu tim saja: tanpa pemain hidup (hanya knock/dead) → knock jadi dead, placement jika full elim.
 * Dipanggil hanya untuk tim yang baru saja kena aksi kill/knock — jangan sweep semua tim.
 */
export function finalizeTeamAtIndex<T extends LeaderboardTeamState>(
  teams: T[],
  teamIndex: number
): T[] {
  const team = teams[teamIndex];
  if (!team?.active || team.placementRank !== null || teamHasAlivePlayer(team)) {
    return teams;
  }

  const next = teams.map((t) => ({ ...t, status: [...t.status] as number[] }));
  const target = next[teamIndex];
  target.status = applyNoAliveCascade(target.status) as number[];
  if (target.status.every((s) => s === 0)) {
    return assignPlacementOnTeamElim(next, teamIndex).teams;
  }
  return next;
}

/** Akhir match: proses semua tim yang masih knock tanpa pemain hidup */
export function finalizeTeamsWithoutAlive<T extends LeaderboardTeamState>(teams: T[]): T[] {
  let next = teams;
  for (let teamIndex = 0; teamIndex < next.length; teamIndex++) {
    const updated = finalizeTeamAtIndex(next, teamIndex);
    if (updated !== next) next = updated;
  }
  return next;
}

export function totalTeamKills(team: LeaderboardTeamState): number {
  return team.playerKills.reduce((sum, k) => sum + (k || 0), 0);
}

/**
 * Batalkan eliminasi tim (salah klik): hapus placement, semua pemain hidup lagi.
 * Kill match tidak diubah — gunakan undo kill feed untuk koreksi kill.
 */
export function reviveTeamFromElimination<T extends LeaderboardTeamState>(
  teams: T[],
  teamIndex: number
): T[] {
  const team = teams[teamIndex];
  if (!team || team.placementRank === null) return teams;

  return teams.map((t, idx) =>
    idx === teamIndex
      ? {
          ...t,
          placementRank: null,
          status: [1, 1, 1, 1],
          playerFinishCredit: [null, null, null, null],
          playerKnockCredit: [null, null, null, null],
        }
      : t
  );
}

/** Reset state match berjalan saja — poin overall / WWCD match sebelumnya tidak diubah */
export function resetCurrentMatchTeamState<T extends LeaderboardTeamState>(teams: T[]): T[] {
  return teams.map((t) => ({
    ...t,
    playerKills: [0, 0, 0, 0],
    playerFinishCredit: [null, null, null, null],
    playerKnockCredit: [null, null, null, null],
    status: [1, 1, 1, 1],
    placementRank: null,
  }));
}

/**
 * Sebelum reset match baru: tim tanpa placementRank dapat rank 1..N
 * (urut total kill match ini). Tim yang sudah elim pakai placementRank existing.
 */
export function applyMatchEndPlacementRanks<T extends LeaderboardTeamState>(
  teams: T[]
): T[] {
  const finalized = finalizeTeamsWithoutAlive(teams);
  const sortedEntries = finalized
    .map((team, teamIndex) => ({ team, teamIndex }))
    .filter(
      ({ team }) =>
        team.active && team.placementRank === null && teamHasAlivePlayer(team)
    )
    .sort((a, b) => totalTeamKills(b.team) - totalTeamKills(a.team));

  const rankByTeamIndex = new Map<number, number>();
  sortedEntries.forEach(({ teamIndex }, idx) => {
    rankByTeamIndex.set(teamIndex, idx + 1);
  });

  return finalized.map((team, teamIndex) => {
    let placementRank = team.placementRank;
    if (placementRank === null && rankByTeamIndex.has(teamIndex)) {
      placementRank = rankByTeamIndex.get(teamIndex)!;
    }
    return { ...team, placementRank };
  });
}
