import {
  applyKnockAction,
  applyFinishAction,
  applyManualElimAction,
  DEFAULT_MATCH_KILL_RULES,
  type LeaderboardTeamState,
} from './leaderboardKillLogic';

const baseTeam = {
  playerKills: [0, 0, 0, 0],
  playerKnockCredit: [null, null, null, null],
  playerFinishCredit: [null, null, null, null],
  placementRank: null,
  active: true,
};

function teamA(status: number[]) {
  return { rank: 1, ...baseTeam, status } as LeaderboardTeamState;
}

function teamU(status: number[]) {
  return { rank: 2, ...baseTeam, status } as LeaderboardTeamState;
}

const A1 = { teamIndex: 0, playerIndex: 0 };
const A3 = { teamIndex: 0, playerIndex: 2 };
const U1 = { teamIndex: 1, playerIndex: 0 };
const U2 = { teamIndex: 1, playerIndex: 1 };
const U3 = { teamIndex: 1, playerIndex: 2 };

let teams: LeaderboardTeamState[] = [teamA([1, 1, 1, 1]), teamU([1, 1, 1, 1])];

teams = applyKnockAction(teams, U1, DEFAULT_MATCH_KILL_RULES, A1).teams;
teams = applyKnockAction(teams, U2, DEFAULT_MATCH_KILL_RULES, A1).teams;
teams = applyKnockAction(teams, U3, DEFAULT_MATCH_KILL_RULES, A1).teams;
teams = applyKnockAction(teams, { teamIndex: 1, playerIndex: 3 }, DEFAULT_MATCH_KILL_RULES, A1).teams;

// All 4 knocked, no alive — finish U1 wipes team, cascade credits A1 for U2–U4
const result = applyFinishAction(teams, A3, U1);
const final = result.teams;

const a1Kills = final[0].playerKills[0];
if (a1Kills !== 4) {
  console.error(`Expected A1 to have 4 kills (full team knock wipe), got ${a1Kills}`);
  process.exit(1);
}
if (final[0].playerKills[2] !== 0) {
  console.error('A3 should not get kills for teammate finish');
  process.exit(1);
}
console.log('cascade knock wipe: A1 gets 4 kills — OK');

// 2 pemain tersisa: 1 knock + 1 hidup — knock yang hidup → tim langsung elim (tanpa revive)
teams = [teamA([1, 1, 1, 1]), teamU([2, 1, 0, 0])];
const lastAliveKnock = applyKnockAction(
  teams,
  { teamIndex: 1, playerIndex: 1 },
  DEFAULT_MATCH_KILL_RULES,
  A1
);
const wiped = lastAliveKnock.teams[1];
if (!wiped.status.every((s) => s === 0)) {
  console.error('Expected full team dead after last alive knocked with no reviver');
  process.exit(1);
}
if (lastAliveKnock.eliminatedRank === null) {
  console.error('Expected placement rank when team wiped on knock');
  process.exit(1);
}
if (lastAliveKnock.teams[0].playerKills[0] < 2) {
  console.error('Expected A1 credited for knocked bleed deaths');
  process.exit(1);
}
console.log('last alive knocked with no reviver — team eliminated — OK');

// 1-slot roster: K/E harus wipe tim tanpa memaksa status menjadi 4 slot.
const oneSlotBase = {
  placementRank: null,
  active: true,
  playerKills: [0],
  playerKnockCredit: [null],
  playerFinishCredit: [null],
};
const oneSlotKnock = applyKnockAction(
  [
    { rank: 1, ...oneSlotBase, status: [1] } as LeaderboardTeamState,
    teamA([1, 1, 1, 1]),
  ],
  { teamIndex: 0, playerIndex: 0 },
  DEFAULT_MATCH_KILL_RULES,
  A1
);
if (oneSlotKnock.teams[0].status.length !== 1 || oneSlotKnock.teams[0].status[0] !== 0) {
  console.error('Expected one-slot K wipe to keep a single dead status');
  process.exit(1);
}

const oneSlotElim = applyManualElimAction(
  [
    { rank: 1, ...oneSlotBase, status: [1] } as LeaderboardTeamState,
    teamA([1, 1, 1, 1]),
  ],
  { teamIndex: 0, playerIndex: 0 }
);
if (oneSlotElim.teams[0].status.length !== 1 || oneSlotElim.teams[0].status[0] !== 0) {
  console.error('Expected one-slot E wipe to keep a single dead status');
  process.exit(1);
}
console.log('one-slot roster K/E wipe — OK');

// Legacy saved data: roster tampil 1 pemain, tapi array status/kill lama masih 4 slot.
const legacyOneNameKnock = applyKnockAction(
  [
    {
      rank: 1,
      ...baseTeam,
      playerNames: ['SOLO'],
      status: [1, 1, 1, 1],
    } as LeaderboardTeamState,
    teamA([1, 1, 1, 1]),
  ],
  { teamIndex: 0, playerIndex: 0 },
  DEFAULT_MATCH_KILL_RULES,
  A1
);
if (
  legacyOneNameKnock.teams[0].status.length !== 1 ||
  legacyOneNameKnock.teams[0].status[0] !== 0 ||
  legacyOneNameKnock.eliminatedRank === null
) {
  console.error('Expected legacy one-name K wipe to ignore phantom saved slots');
  process.exit(1);
}
console.log('legacy one-name K wipe ignores phantom slots — OK');
