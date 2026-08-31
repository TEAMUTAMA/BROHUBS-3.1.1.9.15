import { describe, expect, it } from 'vitest';
import {
  applyMatchEndPlacementRanks,
  finalizeTeamAtIndex,
  finalizeTeamsWithoutAlive,
  getTeamsInContention,
  resetCurrentMatchTeamState,
  totalTeamKills,
} from './matchPlacements';
import type { LeaderboardTeamState } from './leaderboardKillLogic';

function team(partial: Partial<LeaderboardTeamState> & Pick<LeaderboardTeamState, 'playerKills' | 'status'>): LeaderboardTeamState {
  return {
    placementRank: null,
    active: true,
    rank: 1,
    playerFinishCredit: [null, null, null, null],
    playerKnockCredit: [null, null, null, null],
    ...partial,
  };
}

describe('matchPlacements', () => {
  it('excludes knock-only teams from contention (no alive player)', () => {
    const teams = [
      team({ playerKills: [3, 0, 0, 0], status: [2, 2, 0, 0] }),
      team({ playerKills: [1, 0, 0, 0], status: [1, 1, 1, 1] }),
    ];
    expect(getTeamsInContention(teams)).toHaveLength(1);
  });

  it('finalizeTeamAtIndex does not elim other teams with only knocks', () => {
    const teams = [
      team({ playerKills: [0, 0, 0, 0], status: [0, 0, 0, 0], placementRank: 15 }),
      team({ playerKills: [0, 0, 0, 0], status: [2, 2, 2, 2] }),
    ];
    const result = finalizeTeamAtIndex(teams, 0);
    expect(result[0].placementRank).toBe(15);
    expect(result[1].placementRank).toBe(null);
    expect(result[1].status).toEqual([2, 2, 2, 2]);
  });

  it('finalizeTeamsWithoutAlive assigns placement when no alive left', () => {
    const teams = [
      team({ playerKills: [0, 0, 0, 0], status: [2, 2, 2, 2] }),
      team({ playerKills: [1, 0, 0, 0], status: [1, 1, 1, 1] }),
    ];
    const result = finalizeTeamsWithoutAlive(teams);
    expect(result[0].placementRank).toBe(2);
    expect(result[0].status.every((s) => s === 0)).toBe(true);
    expect(getTeamsInContention(result)).toHaveLength(1);
  });

  it('resetCurrentMatchTeamState clears match progress but keeps extra fields', () => {
    const teams = [
      {
        ...team({
          playerKills: [3, 1, 0, 0],
          status: [0, 0, 0, 0],
          placementRank: 2,
        }),
        points: 42,
        totalPlacementPoints: 10,
        totalWwcds: 1,
      },
    ];
    const result = resetCurrentMatchTeamState(teams);
    expect(result[0].points).toBe(42);
    expect(result[0].totalPlacementPoints).toBe(10);
    expect(result[0].totalWwcds).toBe(1);
    expect(result[0].playerKills).toEqual([0, 0, 0, 0]);
    expect(result[0].placementRank).toBe(null);
    expect(result[0].status).toEqual([1, 1, 1, 1]);
  });

  it('assigns placement 1 and 2 by kills when ending with two in contention', () => {
    const teams = [
      team({ playerKills: [5, 0, 0, 0], status: [1, 1, 1, 1] }),
      team({ playerKills: [2, 0, 0, 0], status: [2, 2, 2, 2] }),
      team({ placementRank: 3, playerKills: [0, 0, 0, 0], status: [0, 0, 0, 0] }),
    ];
    const result = applyMatchEndPlacementRanks(teams);
    expect(result[0].placementRank).toBe(1);
    expect(result[1].placementRank).toBe(2);
    expect(result[2].placementRank).toBe(3);
    expect(totalTeamKills(result[0])).toBe(5);
  });
});
