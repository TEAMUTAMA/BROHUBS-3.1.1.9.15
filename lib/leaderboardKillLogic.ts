/** Player status: 1 = Alive, 2 = Knock, 0 = Dead */

export interface PlayerRef {
  teamIndex: number;
  playerIndex: number;
}

export interface FinishCredit {
  finisherTeamIndex: number;
  finisherPlayerIndex: number;
}

export interface LeaderboardTeamState {
  status: number[];
  playerKills: number[];
  playerFinishCredit?: Array<FinishCredit | null>;
  playerKnockCredit?: Array<FinishCredit | null>;
  placementRank: number | null;
  active: boolean;
  rank: number;
}

export interface MatchKillRules {
  /** OFF = finisher keeps kill when victim is revived from Dead via K */
  finisherKeepsKillOnRevive: boolean;
}

export type KillFeedEvent =
  | {
      id: string;
      type: 'knock';
      victim: PlayerRef;
      knocker: PlayerRef | null;
      /** Knock → dead karena tidak ada pemain hidup yang bisa revive */
      cascadeKills?: CascadeKillRecord[];
      at: number;
    }
  | { id: string; type: 'revive_knock'; victim: PlayerRef; priorKnocker: PlayerRef | null; at: number }
  | { id: string; type: 'revive_dead'; victim: PlayerRef; finisher: PlayerRef | null; revokedKill: boolean; at: number }
  | {
      id: string;
      type: 'manual_elim';
      victim: PlayerRef;
      killRecipient: PlayerRef | null;
      priorStatus: 1 | 2;
      priorKnocker: PlayerRef | null;
      cascadeKills?: CascadeKillRecord[];
      at: number;
    }
  | {
      id: string;
      type: 'finish';
      finisher: PlayerRef;
      victim: PlayerRef;
      killRecipient: PlayerRef;
      priorStatus: 1 | 2;
      priorKnocker: PlayerRef | null;
      cascadeKills?: CascadeKillRecord[];
      at: number;
    };

export interface CascadeKillRecord {
  victim: PlayerRef;
  killRecipient: PlayerRef;
  priorKnocker: PlayerRef | null;
}

export const DEFAULT_MATCH_KILL_RULES: MatchKillRules = {
  finisherKeepsKillOnRevive: true,
};

export function createEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function countAlivePlayers(status: number[]): number {
  return status.filter((s) => s === 1).length;
}

export function getPlayerStatus(team: LeaderboardTeamState, playerIndex: number): number {
  return team.status[playerIndex] ?? 1;
}

export function cloneLeaderboardTeams<T extends LeaderboardTeamState>(teams: T[]): T[] {
  return teams.map((t) => ({
    ...t,
    status: [...t.status] as number[],
    playerKills: [...t.playerKills],
    playerFinishCredit: t.playerFinishCredit
      ? [...t.playerFinishCredit]
      : [null, null, null, null],
    playerKnockCredit: t.playerKnockCredit
      ? [...t.playerKnockCredit]
      : [null, null, null, null],
  }));
}

function ensureFinishCredit(team: LeaderboardTeamState): Array<FinishCredit | null> {
  if (!team.playerFinishCredit || team.playerFinishCredit.length < 4) {
    return [null, null, null, null];
  }
  return [...team.playerFinishCredit];
}

function ensureKnockCredit(team: LeaderboardTeamState): Array<FinishCredit | null> {
  if (!team.playerKnockCredit || team.playerKnockCredit.length < 4) {
    return [null, null, null, null];
  }
  return [...team.playerKnockCredit];
}

function creditToRef(credit: FinishCredit): PlayerRef {
  return { teamIndex: credit.finisherTeamIndex, playerIndex: credit.finisherPlayerIndex };
}

function creditFromRef(ref: PlayerRef): FinishCredit {
  return { finisherTeamIndex: ref.teamIndex, finisherPlayerIndex: ref.playerIndex };
}

/** Resolve who receives +1 kill based on knock / finish / bleed rules */
export function resolveKillRecipient(
  teams: LeaderboardTeamState[],
  victim: PlayerRef,
  finisher: PlayerRef | null
): PlayerRef | null {
  const victimTeam = teams[victim.teamIndex];
  if (!victimTeam) return finisher;

  const knockCredits = ensureKnockCredit(victimTeam);
  const knockCredit = knockCredits[victim.playerIndex];
  if (!knockCredit) return finisher;

  const knocker = creditToRef(knockCredit);

  // Bleed out / zone while knocked — credit original knocker
  if (!finisher) return knocker;

  // Finish oleh tim knocker ATAU tim korban → kill tetap ke knocker asli
  if (
    finisher.teamIndex === knocker.teamIndex ||
    finisher.teamIndex === victim.teamIndex
  ) {
    return knocker;
  }

  // Finish musuh (tim lain dari knocker & korban) → kill ke finisher
  return finisher;
}

export function applyNoAliveCascade(status: number[]): number[] {
  const next = [...status];
  if (!next.includes(1)) {
    for (let i = 0; i < next.length; i++) {
      if (next[i] === 2) next[i] = 0;
    }
  }
  return next;
}

export function isTeamEliminationSealed(team: LeaderboardTeamState | undefined): boolean {
  return team != null && team.placementRank !== null;
}

export function assignPlacementOnTeamElim<T extends LeaderboardTeamState>(
  teams: T[],
  teamIndex: number
): { teams: T[]; placementRank: number | null } {
  const team = teams[teamIndex];
  if (!team || !team.status.every((s) => s === 0)) {
    return { teams, placementRank: null };
  }

  const assignedRanks = teams
    .filter((_, idx) => idx !== teamIndex)
    .map((t) => t.placementRank)
    .filter((r): r is number => r !== null);

  const placementRank = teams.length - assignedRanks.length;
  const next = teams.map((t, idx) =>
    idx === teamIndex
      ? { ...t, placementRank, status: [0, 0, 0, 0] as number[] }
      : t
  );
  return { teams: next, placementRank };
}

export function clearPlacementOnTeamRevive<T extends LeaderboardTeamState>(
  teams: T[],
  teamIndex: number
): T[] {
  const team = teams[teamIndex];
  if (!team || team.status.every((s) => s === 0)) return teams;
  if (team.placementRank === null) return teams;
  teams[teamIndex] = { ...team, placementRank: null };
  return teams;
}

function incrementFinisherKill<T extends LeaderboardTeamState>(teams: T[], recipient: PlayerRef): T[] {
  const team = teams[recipient.teamIndex];
  if (!team) return teams;
  const kills = [...team.playerKills];
  kills[recipient.playerIndex] = (kills[recipient.playerIndex] || 0) + 1;
  teams[recipient.teamIndex] = { ...team, playerKills: kills };
  return teams;
}

function decrementFinisherKill<T extends LeaderboardTeamState>(teams: T[], recipient: PlayerRef): T[] {
  const team = teams[recipient.teamIndex];
  if (!team) return teams;
  const kills = [...team.playerKills];
  kills[recipient.playerIndex] = Math.max(0, (kills[recipient.playerIndex] || 0) - 1);
  teams[recipient.teamIndex] = { ...team, playerKills: kills };
  return teams;
}

function setVictimDead<T extends LeaderboardTeamState>(
  teams: T[],
  victim: PlayerRef,
  killRecipient: PlayerRef | null,
  /** Finisher for resolve on cascade knock deaths (null = bleed/zone) */
  finisherContext: PlayerRef | null
): { teams: T[]; cascadeKills: CascadeKillRecord[] } {
  const team = teams[victim.teamIndex];
  if (!team) return { teams, cascadeKills: [] };

  const statusBefore = [...team.status];
  const status = [...team.status];
  status[victim.playerIndex] = 0;
  const cascaded = applyNoAliveCascade(status);

  const knockCredits = ensureKnockCredit(team);
  const finishCredits = ensureFinishCredit(team);
  const cascadeKills: CascadeKillRecord[] = [];

  // Knocked teammates wiped with team — each gets kill credit to their knocker
  for (let i = 0; i < statusBefore.length; i++) {
    if (i === victim.playerIndex) continue;
    if (statusBefore[i] !== 2 || cascaded[i] !== 0) continue;

    const cascadeVictim: PlayerRef = { teamIndex: victim.teamIndex, playerIndex: i };
    const priorKnocker = knockCredits[i] ? creditToRef(knockCredits[i]!) : null;
    const cascadeRecipient = resolveKillRecipient(teams, cascadeVictim, finisherContext);

    if (cascadeRecipient) {
      cascadeKills.push({
        victim: cascadeVictim,
        killRecipient: cascadeRecipient,
        priorKnocker,
      });
      teams = incrementFinisherKill(teams, cascadeRecipient);
    }

    knockCredits[i] = null;
    finishCredits[i] = cascadeRecipient ? creditFromRef(cascadeRecipient) : null;
  }

  finishCredits[victim.playerIndex] = killRecipient ? creditFromRef(killRecipient) : null;
  knockCredits[victim.playerIndex] = null;

  teams[victim.teamIndex] = {
    ...team,
    status: cascaded as number[],
    playerFinishCredit: finishCredits,
    playerKnockCredit: knockCredits,
  };

  return { teams, cascadeKills };
}

/**
 * Jika tidak ada pemain hidup (status 1), semua yang knock bleed → dead + kill credit.
 */
function applyKnockedBleedWhenNoAlive<T extends LeaderboardTeamState>(
  teams: T[],
  teamIndex: number,
  statusAfterKnock: number[],
  knockCredits: Array<FinishCredit | null>,
  finisherContext: PlayerRef | null
): { teams: T[]; cascadeKills: CascadeKillRecord[]; status: number[] } {
  const cascaded = applyNoAliveCascade(statusAfterKnock);
  if (cascaded.includes(1)) {
    return { teams, cascadeKills: [], status: statusAfterKnock };
  }

  const team = teams[teamIndex];
  if (!team) return { teams, cascadeKills: [], status: statusAfterKnock };

  const finishCredits = ensureFinishCredit(team);
  const cascadeKills: CascadeKillRecord[] = [];

  for (let i = 0; i < cascaded.length; i++) {
    if (cascaded[i] !== 0 || statusAfterKnock[i] !== 2) continue;

    const cascadeVictim: PlayerRef = { teamIndex, playerIndex: i };
    const priorKnocker = knockCredits[i] ? creditToRef(knockCredits[i]!) : null;
    const cascadeRecipient = resolveKillRecipient(teams, cascadeVictim, finisherContext);

    if (cascadeRecipient) {
      cascadeKills.push({
        victim: cascadeVictim,
        killRecipient: cascadeRecipient,
        priorKnocker,
      });
      teams = incrementFinisherKill(teams, cascadeRecipient);
    }

    knockCredits[i] = null;
    finishCredits[i] = cascadeRecipient ? creditFromRef(cascadeRecipient) : null;
  }

  teams[teamIndex] = {
    ...team,
    status: cascaded as number[],
    playerKnockCredit: knockCredits,
    playerFinishCredit: finishCredits,
  };

  return { teams, cascadeKills, status: cascaded };
}

/**
 * K — Alive→Knock (with knocker), Knock→Alive, Dead→Alive
 */
export function applyKnockAction<T extends LeaderboardTeamState>(
  teams: T[],
  victim: PlayerRef,
  rules: MatchKillRules,
  knocker: PlayerRef | null = null
): { teams: T[]; event: KillFeedEvent | null; eliminatedRank: number | null } {
  const victimTeamBefore = teams[victim.teamIndex];
  if (isTeamEliminationSealed(victimTeamBefore)) {
    return { teams, event: null, eliminatedRank: null };
  }

  let next = cloneLeaderboardTeams(teams);
  const team = next[victim.teamIndex];
  if (!team) return { teams, event: null, eliminatedRank: null };

  const current = getPlayerStatus(team, victim.playerIndex);
  let event: KillFeedEvent | null = null;
  let eliminatedRank: number | null = null;

  if (current === 1) {
    const statusAfterKnock = [...team.status];
    statusAfterKnock[victim.playerIndex] = 2;
    const knockCredits = ensureKnockCredit(team);
    knockCredits[victim.playerIndex] = knocker ? creditFromRef(knocker) : null;

    const wasEliminated = team.status.every((s) => s === 0);
    const bleedResult = applyKnockedBleedWhenNoAlive(
      next,
      victim.teamIndex,
      statusAfterKnock,
      knockCredits,
      knocker
    );
    next = bleedResult.teams;

    if (bleedResult.cascadeKills.length === 0) {
      next[victim.teamIndex] = {
        ...next[victim.teamIndex],
        status: bleedResult.status as number[],
        playerKnockCredit: knockCredits,
      };
    }

    const after = next[victim.teamIndex];
    const isEliminated = after?.status.every((s) => s === 0) ?? false;
    if (isEliminated && !wasEliminated) {
      const result = assignPlacementOnTeamElim(next, victim.teamIndex);
      next = result.teams;
      eliminatedRank = result.placementRank;
    }

    event = {
      id: createEventId(),
      type: 'knock',
      victim,
      knocker,
      cascadeKills:
        bleedResult.cascadeKills.length > 0 ? bleedResult.cascadeKills : undefined,
      at: Date.now(),
    };
  } else if (current === 2) {
    if (team.placementRank !== null) {
      return { teams, event: null, eliminatedRank: null };
    }
    const status = [...team.status];
    status[victim.playerIndex] = 1;
    const knockCredits = ensureKnockCredit(team);
    const priorKnocker = knockCredits[victim.playerIndex]
      ? creditToRef(knockCredits[victim.playerIndex]!)
      : null;
    knockCredits[victim.playerIndex] = null;
    next[victim.teamIndex] = {
      ...team,
      status: status as number[],
      playerKnockCredit: knockCredits,
    };
    next = clearPlacementOnTeamRevive(next, victim.teamIndex);
    event = {
      id: createEventId(),
      type: 'revive_knock',
      victim,
      priorKnocker,
      at: Date.now(),
    };
  } else if (current === 0) {
    if (team.placementRank !== null) {
      return { teams, event: null, eliminatedRank: null };
    }
    const credits = ensureFinishCredit(team);
    const credit = credits[victim.playerIndex];
    let revokedKill = false;

    if (credit && !rules.finisherKeepsKillOnRevive) {
      next = decrementFinisherKill(next, creditToRef(credit));
      revokedKill = true;
    }

    const status = [...team.status];
    status[victim.playerIndex] = 1;
    credits[victim.playerIndex] = null;
    next[victim.teamIndex] = {
      ...team,
      status: applyNoAliveCascade(status) as number[],
      playerFinishCredit: credits,
    };
    next = clearPlacementOnTeamRevive(next, victim.teamIndex);

    event = {
      id: createEventId(),
      type: 'revive_dead',
      victim,
      finisher: credit ? creditToRef(credit) : null,
      revokedKill,
      at: Date.now(),
    };
  }

  return { teams: next, event, eliminatedRank };
}

/**
 * E — self / zone / bleed (no enemy finisher). Kill to knocker if knocked.
 */
export function applyManualElimAction<T extends LeaderboardTeamState>(
  teams: T[],
  victim: PlayerRef
): { teams: T[]; event: KillFeedEvent | null; eliminatedRank: number | null } {
  if (isTeamEliminationSealed(teams[victim.teamIndex])) {
    return { teams, event: null, eliminatedRank: null };
  }

  let next = cloneLeaderboardTeams(teams);
  const team = next[victim.teamIndex];
  if (!team) return { teams, event: null, eliminatedRank: null };

  const current = getPlayerStatus(team, victim.playerIndex);
  if (current === 0) return { teams: next, event: null, eliminatedRank: null };

  const killRecipient = resolveKillRecipient(next, victim, null);
  const wasEliminated = team.status.every((s) => s === 0);

  const knockCredits = ensureKnockCredit(team);
  const priorKnocker =
    current === 2 && knockCredits[victim.playerIndex]
      ? creditToRef(knockCredits[victim.playerIndex]!)
      : null;

  const deadResult = setVictimDead(next, victim, killRecipient, null);
  next = deadResult.teams;
  if (killRecipient) {
    next = incrementFinisherKill(next, killRecipient);
  }

  const after = next[victim.teamIndex];
  const isEliminated = after?.status.every((s) => s === 0) ?? false;

  let eliminatedRank: number | null = null;
  if (isEliminated && !wasEliminated) {
    const result = assignPlacementOnTeamElim(next, victim.teamIndex);
    next = result.teams;
    eliminatedRank = result.placementRank;
  }

  const event: KillFeedEvent = {
    id: createEventId(),
    type: 'manual_elim',
    victim,
    killRecipient,
    priorStatus: current === 2 ? 2 : 1,
    priorKnocker,
    cascadeKills: deadResult.cascadeKills,
    at: Date.now(),
  };
  return { teams: next, event, eliminatedRank };
}

/**
 * Enemy finish — knock credit rules apply (same-team finish → knocker keeps kill)
 */
export function applyFinishAction<T extends LeaderboardTeamState>(
  teams: T[],
  finisher: PlayerRef,
  victim: PlayerRef
): { teams: T[]; event: KillFeedEvent | null; eliminatedRank: number | null } {
  if (isTeamEliminationSealed(teams[victim.teamIndex])) {
    return { teams, event: null, eliminatedRank: null };
  }

  let next = cloneLeaderboardTeams(teams);
  const victimTeam = next[victim.teamIndex];
  if (!victimTeam) return { teams, event: null, eliminatedRank: null };

  const current = getPlayerStatus(victimTeam, victim.playerIndex);
  if (current === 0) return { teams: next, event: null, eliminatedRank: null };

  const killRecipient = resolveKillRecipient(next, victim, finisher);
  if (!killRecipient) return { teams: next, event: null, eliminatedRank: null };

  const wasEliminated = victimTeam.status.every((s) => s === 0);

  const knockCredits = ensureKnockCredit(victimTeam);
  const priorKnocker =
    current === 2 && knockCredits[victim.playerIndex]
      ? creditToRef(knockCredits[victim.playerIndex]!)
      : null;

  const deadResult = setVictimDead(next, victim, killRecipient, finisher);
  next = deadResult.teams;
  next = incrementFinisherKill(next, killRecipient);

  const after = next[victim.teamIndex];
  const isEliminated = after?.status.every((s) => s === 0) ?? false;
  let eliminatedRank: number | null = null;
  if (isEliminated && !wasEliminated) {
    const result = assignPlacementOnTeamElim(next, victim.teamIndex);
    next = result.teams;
    eliminatedRank = result.placementRank;
  }

  const event: KillFeedEvent = {
    id: createEventId(),
    type: 'finish',
    finisher,
    victim,
    killRecipient,
    priorStatus: current === 2 ? 2 : 1,
    priorKnocker,
    cascadeKills: deadResult.cascadeKills,
    at: Date.now(),
  };
  return { teams: next, event, eliminatedRank };
}

export function killFeedEventAffectsTeam(event: KillFeedEvent, teamIndex: number): boolean {
  if (event.victim.teamIndex === teamIndex) return true;
  return (event.cascadeKills ?? []).some((ck) => ck.victim.teamIndex === teamIndex);
}

/** Indeks aksi terakhir di log yang menyentuh tim ini (-1 jika tidak ada) */
export function findLastKillEventIndexForTeam(
  log: KillFeedEvent[],
  teamIndex: number
): number {
  for (let i = log.length - 1; i >= 0; i--) {
    if (killFeedEventAffectsTeam(log[i], teamIndex)) return i;
  }
  return -1;
}

export function undoKillFeedEvent<T extends LeaderboardTeamState>(
  teams: T[],
  event: KillFeedEvent,
  rules: MatchKillRules
): { teams: T[]; eliminatedRank: number | null } {
  let next = cloneLeaderboardTeams(teams);

  switch (event.type) {
    case 'knock': {
      const team = next[event.victim.teamIndex];
      if (!team) break;

      if (event.cascadeKills?.length) {
        for (const ck of event.cascadeKills) {
          next = decrementFinisherKill(next, ck.killRecipient);
        }
        const status = [...team.status];
        status[event.victim.playerIndex] = 1;
        const knockCredits = ensureKnockCredit(team);
        knockCredits[event.victim.playerIndex] = null;
        const finishCredits = ensureFinishCredit(team);
        finishCredits[event.victim.playerIndex] = null;
        for (const ck of event.cascadeKills) {
          if (ck.victim.playerIndex === event.victim.playerIndex) continue;
          status[ck.victim.playerIndex] = 2;
          knockCredits[ck.victim.playerIndex] = ck.priorKnocker
            ? creditFromRef(ck.priorKnocker)
            : null;
          finishCredits[ck.victim.playerIndex] = null;
        }
        next[event.victim.teamIndex] = {
          ...team,
          status: status as number[],
          playerKnockCredit: knockCredits,
          playerFinishCredit: finishCredits,
        };
        next = clearPlacementOnTeamRevive(next, event.victim.teamIndex);
      } else {
        const status = [...team.status];
        if (status[event.victim.playerIndex] === 2) status[event.victim.playerIndex] = 1;
        const knockCredits = ensureKnockCredit(team);
        knockCredits[event.victim.playerIndex] = null;
        next[event.victim.teamIndex] = {
          ...team,
          status: status as number[],
          playerKnockCredit: knockCredits,
        };
      }
      break;
    }
    case 'revive_knock': {
      const team = next[event.victim.teamIndex];
      if (!team) break;
      const status = [...team.status];
      if (status[event.victim.playerIndex] === 1) status[event.victim.playerIndex] = 2;
      const knockCredits = ensureKnockCredit(team);
      knockCredits[event.victim.playerIndex] = event.priorKnocker
        ? creditFromRef(event.priorKnocker)
        : null;
      next[event.victim.teamIndex] = {
        ...team,
        status: status as number[],
        playerKnockCredit: knockCredits,
      };
      break;
    }
    case 'revive_dead': {
      const team = next[event.victim.teamIndex];
      if (!team) break;
      const status = [...team.status];
      status[event.victim.playerIndex] = 0;
      const credits = ensureFinishCredit(team);
      if (event.finisher) {
        credits[event.victim.playerIndex] = creditFromRef(event.finisher);
        if (event.revokedKill) {
          next = incrementFinisherKill(next, event.finisher);
        }
      } else {
        credits[event.victim.playerIndex] = null;
      }
      const cascaded = applyNoAliveCascade(status);
      next[event.victim.teamIndex] = {
        ...team,
        status: cascaded as number[],
        playerFinishCredit: credits,
      };
      if (cascaded.every((s) => s === 0)) {
        const result = assignPlacementOnTeamElim(next, event.victim.teamIndex);
        next = result.teams;
      }
      break;
    }
    case 'manual_elim': {
      const team = next[event.victim.teamIndex];
      if (!team) break;
      if (event.killRecipient) {
        next = decrementFinisherKill(next, event.killRecipient);
      }
      for (const ck of event.cascadeKills ?? []) {
        next = decrementFinisherKill(next, ck.killRecipient);
      }
      const status = [...team.status];
      status[event.victim.playerIndex] = event.priorStatus;
      const knockCredits = ensureKnockCredit(team);
      if (event.priorStatus === 2) {
        knockCredits[event.victim.playerIndex] = event.priorKnocker
          ? creditFromRef(event.priorKnocker)
          : null;
      }
      for (const ck of event.cascadeKills ?? []) {
        status[ck.victim.playerIndex] = 2;
        knockCredits[ck.victim.playerIndex] = ck.priorKnocker
          ? creditFromRef(ck.priorKnocker)
          : null;
      }
      next[event.victim.teamIndex] = {
        ...team,
        status: applyNoAliveCascade(status) as number[],
        playerKnockCredit: knockCredits,
        playerFinishCredit: ensureFinishCredit(team).map((c, i) =>
          i === event.victim.playerIndex ||
          event.cascadeKills?.some((ck) => ck.victim.playerIndex === i)
            ? null
            : c
        ),
      };
      next = clearPlacementOnTeamRevive(next, event.victim.teamIndex);
      break;
    }
    case 'finish': {
      const team = next[event.victim.teamIndex];
      if (!team) break;
      next = decrementFinisherKill(next, event.killRecipient);
      for (const ck of event.cascadeKills ?? []) {
        next = decrementFinisherKill(next, ck.killRecipient);
      }
      const status = [...team.status];
      status[event.victim.playerIndex] = event.priorStatus;
      const knockCredits = ensureKnockCredit(team);
      if (event.priorStatus === 2) {
        knockCredits[event.victim.playerIndex] = event.priorKnocker
          ? creditFromRef(event.priorKnocker)
          : null;
      }
      for (const ck of event.cascadeKills ?? []) {
        status[ck.victim.playerIndex] = 2;
        knockCredits[ck.victim.playerIndex] = ck.priorKnocker
          ? creditFromRef(ck.priorKnocker)
          : null;
      }
      const credits = ensureFinishCredit(team);
      credits[event.victim.playerIndex] = null;
      for (const ck of event.cascadeKills) {
        credits[ck.victim.playerIndex] = null;
      }
      next[event.victim.teamIndex] = {
        ...team,
        status: status as number[],
        playerKnockCredit: knockCredits,
        playerFinishCredit: credits,
      };
      next = clearPlacementOnTeamRevive(next, event.victim.teamIndex);
      break;
    }
    default:
      break;
  }

  return { teams: next, eliminatedRank: null };
}
