/**
 * Simulasi lengkap Overlay Ranking:
 * eliminasi tim 1-by-1 (4 pemain per tim) sampai 1 tim tersisa.
 *
 * Tujuan: menemukan bug di alur placementRank, kill credit, cascade,
 *         winner-detection, dan undo.
 */
import { describe, it, expect } from 'vitest';
import {
  applyKnockAction,
  applyFinishAction,
  applyManualElimAction,
  undoKillFeedEvent,
  assignPlacementOnTeamElim,
  DEFAULT_MATCH_KILL_RULES,
  type LeaderboardTeamState,
  type PlayerRef,
} from './leaderboardKillLogic';
import {
  getTeamsInContention,
  isTeamMatchEliminated,
  teamHasAlivePlayer,
  totalTeamKills,
  applyMatchEndPlacementRanks,
} from './matchPlacements';

/* ── helpers ─────────────────────────────────────────────────── */
function makeTeam(rank: number, status: number[] = [1, 1, 1, 1]): LeaderboardTeamState {
  return {
    rank,
    status: [...status],
    playerKills: [0, 0, 0, 0],
    playerFinishCredit: [null, null, null, null],
    playerKnockCredit: [null, null, null, null],
    placementRank: null,
    active: true,
  };
}

/** Eliminasi seluruh pemain tim secara manual (tanpa finisher) */
function elimWholeTeam(teams: LeaderboardTeamState[], teamIdx: number) {
  let cur = teams;
  for (let p = 0; p < 4; p++) {
    const victim: PlayerRef = { teamIndex: teamIdx, playerIndex: p };
    const res = applyManualElimAction(cur, victim);
    // Kalau event null pemain sudah mati (bisa skip)
    if (res.event !== null) cur = res.teams;
  }
  return cur;
}

/* ── 1. Placement rank — alur standar 4 tim ─────────────────── */
describe('Placement rank — 4 tim sequential elimination', () => {
  it('tim pertama mati → rank 4, tim kedua → rank 3, tim ketiga → rank 2', () => {
    let teams = [makeTeam(1), makeTeam(2), makeTeam(3), makeTeam(4)];

    // Eliminasi T0
    teams = elimWholeTeam(teams, 0);
    expect(teams[0].placementRank).toBe(4);
    expect(teams[0].status.every((s) => s === 0)).toBe(true);

    // Eliminasi T1
    teams = elimWholeTeam(teams, 1);
    expect(teams[1].placementRank).toBe(3);

    // Eliminasi T2
    teams = elimWholeTeam(teams, 2);
    expect(teams[2].placementRank).toBe(2);

    // T3 harus belum punya placementRank (masih hidup = winner)
    expect(teams[3].placementRank).toBeNull();
    expect(teamHasAlivePlayer(teams[3])).toBe(true);
  });

  it('getTeamsInContention kembali 1 setelah 3 tim mati', () => {
    let teams = [makeTeam(1), makeTeam(2), makeTeam(3), makeTeam(4)];
    teams = elimWholeTeam(teams, 0);
    teams = elimWholeTeam(teams, 1);
    teams = elimWholeTeam(teams, 2);
    const contention = getTeamsInContention(teams);
    expect(contention).toHaveLength(1);
    expect(contention[0].rank).toBe(4);
  });

  it('isTeamMatchEliminated benar pada semua state', () => {
    let teams = [makeTeam(1), makeTeam(2)];
    expect(isTeamMatchEliminated(teams[0])).toBe(false); // masih hidup
    teams = elimWholeTeam(teams, 0);
    expect(isTeamMatchEliminated(teams[0])).toBe(true);  // sudah mati
    expect(isTeamMatchEliminated(teams[1])).toBe(false); // survivor
  });
});

/* ── 2. Placement rank — 16 tim (standar produksi) ─────────────── */
describe('Placement rank — 16 tim', () => {
  it('rank turun berurutan: 16, 15, ..., 2; tim terakhir tetap null', () => {
    let teams: LeaderboardTeamState[] = Array.from({ length: 16 }, (_, i) =>
      makeTeam(i + 1)
    );

    for (let t = 0; t < 15; t++) {
      teams = elimWholeTeam(teams, t);
      const expectedRank = 16 - t;
      expect(teams[t].placementRank).toBe(expectedRank);
    }

    // Tim ke-16 masih hidup
    expect(teams[15].placementRank).toBeNull();
    expect(teamHasAlivePlayer(teams[15])).toBe(true);
    expect(getTeamsInContention(teams)).toHaveLength(1);
  });
});

/* ── 3. Cascade knock wipe ───────────────────────────────────── */
describe('Cascade knock wipe', () => {
  it('knock pemain terakhir hidup → semua knocked teammate juga mati, kill ke knocker', () => {
    // T0: P0 alive, P1 P2 P3 knocked by A1 (from team 1)
    const A1: PlayerRef = { teamIndex: 1, playerIndex: 0 };
    let teams: LeaderboardTeamState[] = [makeTeam(1), makeTeam(2)];

    // Knock P1, P2, P3 dari T0 oleh A1
    teams = applyKnockAction(teams, { teamIndex: 0, playerIndex: 1 }, DEFAULT_MATCH_KILL_RULES, A1).teams;
    teams = applyKnockAction(teams, { teamIndex: 0, playerIndex: 2 }, DEFAULT_MATCH_KILL_RULES, A1).teams;
    teams = applyKnockAction(teams, { teamIndex: 0, playerIndex: 3 }, DEFAULT_MATCH_KILL_RULES, A1).teams;

    // Knock satu-satunya pemain hidup P0 → harus trigger cascade → T0 full dead
    const knockResult = applyKnockAction(
      teams,
      { teamIndex: 0, playerIndex: 0 },
      DEFAULT_MATCH_KILL_RULES,
      A1
    );
    const after = knockResult.teams;

    // Semua pemain T0 harus dead
    expect(after[0].status.every((s) => s === 0)).toBe(true);

    // T0 harus dapat placementRank
    expect(knockResult.eliminatedRank).not.toBeNull();

    // A1 harus mendapat 4 kill (P0 + cascade P1+P2+P3)
    expect(after[1].playerKills[0]).toBe(4);
  });

  it('knock P0 (satu-satunya hidup, yang lain sudah mati) → tim langsung elim', () => {
    // T0: P0 alive, P1 P2 P3 dead
    let teams: LeaderboardTeamState[] = [
      { ...makeTeam(1), status: [1, 0, 0, 0] },
      makeTeam(2),
    ];
    const A1: PlayerRef = { teamIndex: 1, playerIndex: 0 };
    const knockResult = applyKnockAction(teams, { teamIndex: 0, playerIndex: 0 }, DEFAULT_MATCH_KILL_RULES, A1);
    expect(knockResult.teams[0].status.every((s) => s === 0)).toBe(true);
    expect(knockResult.eliminatedRank).not.toBeNull();
  });
});

/* ── 4. Kill credit — finish dengan knock credit sebelumnya ──── */
describe('Kill credit — finish dengan knock credit berbeda tim', () => {
  it('finish oleh tim knocker → kill tetap ke knocker', () => {
    // T0 = victim team, T1 = knocker team, (T1P0=knocker, T1P1=finisher satu tim)
    let teams: LeaderboardTeamState[] = [makeTeam(1), makeTeam(2)];
    const T1P0: PlayerRef = { teamIndex: 1, playerIndex: 0 }; // knocker
    const T1P1: PlayerRef = { teamIndex: 1, playerIndex: 1 }; // finisher, SATU TIM dgn knocker

    // T1P0 knock T0P0
    teams = applyKnockAction(teams, { teamIndex: 0, playerIndex: 0 }, DEFAULT_MATCH_KILL_RULES, T1P0).teams;
    // T1P1 (satu tim dengan knocker) finish T0P0 → kill tetap ke knocker T1P0, bukan finisher
    const res = applyFinishAction(teams, T1P1, { teamIndex: 0, playerIndex: 0 });
    expect(res.event).not.toBeNull();
    expect(res.teams[1].playerKills[0]).toBe(1); // knocker T1P0 dapat kill
    expect(res.teams[1].playerKills[1]).toBe(0); // finisher T1P1 TIDAK dapat kill
  });

  it('finish oleh musuh (tim lain dari knocker) → kill ke finisher musuh', () => {
    let teams: LeaderboardTeamState[] = [makeTeam(1), makeTeam(2), makeTeam(3)];
    const T1P0: PlayerRef = { teamIndex: 1, playerIndex: 0 };
    const T2P0: PlayerRef = { teamIndex: 2, playerIndex: 0 };

    // T1P0 knock victim T0P0
    teams = applyKnockAction(teams, { teamIndex: 0, playerIndex: 0 }, DEFAULT_MATCH_KILL_RULES, T1P0).teams;
    // T2P0 (tim berbeda dari knocker T1) finish T0P0 → kill ke T2P0
    const res = applyFinishAction(teams, T2P0, { teamIndex: 0, playerIndex: 0 });
    expect(res.teams[2].playerKills[0]).toBe(1); // finisher musuh dapat kill
    expect(res.teams[1].playerKills[0]).toBe(0); // knocker TIDAK dapat kill
  });
});

/* ── 5. Winner detection via applyMatchEndPlacementRanks ─────── */
describe('Winner detection', () => {
  it('tim terakhir hidup mendapat rank 1 saat end match', () => {
    let teams: LeaderboardTeamState[] = [makeTeam(1), makeTeam(2), makeTeam(3), makeTeam(4)];
    teams = elimWholeTeam(teams, 0);
    teams = elimWholeTeam(teams, 1);
    teams = elimWholeTeam(teams, 2);

    const final = applyMatchEndPlacementRanks(teams);
    expect(final[3].placementRank).toBe(1);
  });

  it('2 tim tersisa: winner by kills saat end match', () => {
    let teams: LeaderboardTeamState[] = [
      makeTeam(1), // akan jadi winner
      makeTeam(2),
      makeTeam(3),
    ];
    teams = elimWholeTeam(teams, 2);

    // T0 punya 5 kill, T1 punya 2 kill
    const T0P0: PlayerRef = { teamIndex: 0, playerIndex: 0 };
    const T1P0: PlayerRef = { teamIndex: 1, playerIndex: 0 };
    for (let i = 0; i < 5; i++) {
      teams = applyFinishAction(teams, T0P0, { teamIndex: 2, playerIndex: i % 4 }).teams;
    }
    for (let i = 0; i < 2; i++) {
      teams = applyFinishAction(teams, T1P0, { teamIndex: 2, playerIndex: i % 4 }).teams;
    }

    const final = applyMatchEndPlacementRanks(teams);
    expect(final[0].placementRank).toBe(1); // T0 lebih banyak kill
    expect(final[1].placementRank).toBe(2);
  });
});

/* ── 6. Undo kill event ──────────────────────────────────────── */
describe('Undo kill event', () => {
  it('undo manual_elim mengembalikan pemain ke alive', () => {
    let teams: LeaderboardTeamState[] = [makeTeam(1), makeTeam(2)];
    const victim: PlayerRef = { teamIndex: 0, playerIndex: 0 };
    const { teams: after, event } = applyManualElimAction(teams, victim);
    expect(event).not.toBeNull();
    const { teams: undone } = undoKillFeedEvent(after, event!, DEFAULT_MATCH_KILL_RULES);
    expect(undone[0].status[0]).toBe(1);
  });

  it('undo finish mengembalikan kill counter', () => {
    let teams: LeaderboardTeamState[] = [makeTeam(1), makeTeam(2)];
    const finisher: PlayerRef = { teamIndex: 1, playerIndex: 0 };
    const victim: PlayerRef = { teamIndex: 0, playerIndex: 0 };
    const { teams: after, event } = applyFinishAction(teams, finisher, victim);
    expect(after[1].playerKills[0]).toBe(1);
    const { teams: undone } = undoKillFeedEvent(after, event!, DEFAULT_MATCH_KILL_RULES);
    expect(undone[1].playerKills[0]).toBe(0);
    expect(undone[0].status[0]).toBe(1);
  });

  it('undo finish dengan cascade kills — kill counter semua kembali 0', () => {
    // T0: 3 pemain knocked oleh T1P0, P0 masih hidup
    const T1P0: PlayerRef = { teamIndex: 1, playerIndex: 0 };
    const T1P1: PlayerRef = { teamIndex: 1, playerIndex: 1 };
    let teams: LeaderboardTeamState[] = [makeTeam(1), makeTeam(2)];
    teams = applyKnockAction(teams, { teamIndex: 0, playerIndex: 1 }, DEFAULT_MATCH_KILL_RULES, T1P0).teams;
    teams = applyKnockAction(teams, { teamIndex: 0, playerIndex: 2 }, DEFAULT_MATCH_KILL_RULES, T1P0).teams;
    teams = applyKnockAction(teams, { teamIndex: 0, playerIndex: 3 }, DEFAULT_MATCH_KILL_RULES, T1P0).teams;

    // T1P1 finish T0P0 → cascade T0P1+P2+P3 ke T1P0
    const { teams: after, event } = applyFinishAction(teams, T1P1, { teamIndex: 0, playerIndex: 0 });
    expect(after[1].playerKills[0]).toBe(3); // T1P0 cascade kill P1+P2+P3
    expect(after[1].playerKills[1]).toBe(1); // T1P1 kill P0

    // Undo
    const { teams: undone } = undoKillFeedEvent(after, event!, DEFAULT_MATCH_KILL_RULES);
    expect(undone[1].playerKills[0]).toBe(0); // T1P0 kill kembali 0
    expect(undone[1].playerKills[1]).toBe(0); // T1P1 kill kembali 0
    expect(undone[0].status[0]).toBe(1);      // P0 kembali hidup
    expect(undone[0].status[1]).toBe(2);      // P1 kembali knocked
  });

  it('undo knock biasa → pemain kembali alive', () => {
    let teams: LeaderboardTeamState[] = [makeTeam(1), makeTeam(2)];
    const knocker: PlayerRef = { teamIndex: 1, playerIndex: 0 };
    const { teams: after, event } = applyKnockAction(
      teams, { teamIndex: 0, playerIndex: 0 }, DEFAULT_MATCH_KILL_RULES, knocker
    );
    expect(after[0].status[0]).toBe(2);
    const { teams: undone } = undoKillFeedEvent(after, event!, DEFAULT_MATCH_KILL_RULES);
    expect(undone[0].status[0]).toBe(1);
  });
});

/* ── 7. Bug guard: BUG line-728 di undo finish (cascadeKills tidak ada ?? []) */
describe('Bug guard: undo finish event tanpa cascadeKills', () => {
  it('undo finish event dengan cascadeKills=undefined tidak crash', () => {
    let teams: LeaderboardTeamState[] = [makeTeam(1), makeTeam(2)];
    const finisher: PlayerRef = { teamIndex: 1, playerIndex: 0 };
    const victim: PlayerRef = { teamIndex: 0, playerIndex: 0 };
    const { teams: after, event } = applyFinishAction(teams, finisher, victim);
    expect(event).not.toBeNull();

    // Simulasikan event yang disimpan dari versi lama tanpa cascadeKills
    const brokenEvent = { ...event!, cascadeKills: undefined as any };
    // Harus tidak crash
    expect(() => undoKillFeedEvent(after, brokenEvent, DEFAULT_MATCH_KILL_RULES)).not.toThrow();
  });
});

/* ── 8. Inactive teams — rank tidak terpengaruh oleh slot inactive ── */
describe('Inactive teams tidak mengacaukan placement rank', () => {
  it('4 active + 12 inactive: rank pertama mati harus 4 bukan 16', () => {
    const active4 = Array.from({ length: 4 }, (_, i) => makeTeam(i + 1));
    const inactive12 = Array.from({ length: 12 }, (_, i) => ({
      ...makeTeam(i + 5),
      active: false,
    }));
    let teams: LeaderboardTeamState[] = [...active4, ...inactive12];

    // Eliminasi T0 (yang active)
    teams = elimWholeTeam(teams, 0);

    // Setelah fix: rank harus 4 (active count), bukan 16 (teams.length)
    expect(teams[0].placementRank).toBe(4);
  });
});

/* ── 9. Full match simulation end-to-end ─────────────────────── */
describe('Full match simulation — 4 tim, tiap tim 4 pemain, eliminasi berurutan', () => {
  it('semua pemain setiap tim mati satu per satu → placementRank berurutan', () => {
    let teams: LeaderboardTeamState[] = [makeTeam(1), makeTeam(2), makeTeam(3), makeTeam(4)];

    const steps: { teamIdx: number; playerIdx: number }[] = [
      // T0 eliminasi pemain P0→P1→P2→P3
      { teamIdx: 0, playerIdx: 0 },
      { teamIdx: 0, playerIdx: 1 },
      { teamIdx: 0, playerIdx: 2 },
      { teamIdx: 0, playerIdx: 3 },
      // T1 eliminasi
      { teamIdx: 1, playerIdx: 0 },
      { teamIdx: 1, playerIdx: 1 },
      { teamIdx: 1, playerIdx: 2 },
      { teamIdx: 1, playerIdx: 3 },
      // T2 eliminasi
      { teamIdx: 2, playerIdx: 0 },
      { teamIdx: 2, playerIdx: 1 },
      { teamIdx: 2, playerIdx: 2 },
      { teamIdx: 2, playerIdx: 3 },
      // T3 TIDAK dieliminasi → winner
    ];

    for (const { teamIdx, playerIdx } of steps) {
      const victim: PlayerRef = { teamIndex: teamIdx, playerIndex: playerIdx };
      const res = applyManualElimAction(teams, victim);
      if (res.event) teams = res.teams;
    }

    // Placement ranks berurutan
    expect(teams[0].placementRank).toBe(4);
    expect(teams[1].placementRank).toBe(3);
    expect(teams[2].placementRank).toBe(2);
    expect(teams[3].placementRank).toBeNull(); // winner belum punya rank sampai end match

    // Kontesi: hanya T3
    expect(getTeamsInContention(teams)).toHaveLength(1);
    expect(getTeamsInContention(teams)[0].rank).toBe(4);

    // isTeamMatchEliminated
    expect(isTeamMatchEliminated(teams[0])).toBe(true);
    expect(isTeamMatchEliminated(teams[1])).toBe(true);
    expect(isTeamMatchEliminated(teams[2])).toBe(true);
    expect(isTeamMatchEliminated(teams[3])).toBe(false);

    // End match → T3 dapat rank 1
    const ended = applyMatchEndPlacementRanks(teams);
    expect(ended[3].placementRank).toBe(1);
  });

  it('skenario knock → revive → knock lagi → mati: kill credit tidak dobel', () => {
    let teams: LeaderboardTeamState[] = [makeTeam(1), makeTeam(2)];
    const attacker: PlayerRef = { teamIndex: 1, playerIndex: 0 };
    const victim: PlayerRef = { teamIndex: 0, playerIndex: 0 };

    // Knock
    teams = applyKnockAction(teams, victim, DEFAULT_MATCH_KILL_RULES, attacker).teams;
    expect(teams[0].status[0]).toBe(2);

    // Revive (K button = knock lagi pada status 2 → revive ke alive)
    teams = applyKnockAction(teams, victim, DEFAULT_MATCH_KILL_RULES).teams;
    expect(teams[0].status[0]).toBe(1);
    expect(teams[1].playerKills[0]).toBe(0); // masih 0, belum mati

    // Knock lagi oleh attacker yang sama
    teams = applyKnockAction(teams, victim, DEFAULT_MATCH_KILL_RULES, attacker).teams;
    expect(teams[0].status[0]).toBe(2);

    // Manual elim (bleed out) → kill ke knocker terakhir
    const res = applyManualElimAction(teams, victim);
    expect(res.event).not.toBeNull();
    expect(res.teams[1].playerKills[0]).toBe(1); // tepat 1 kill
  });
});
