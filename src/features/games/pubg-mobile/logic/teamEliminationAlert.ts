export const TEAM_ELIMINATION_ALERT_KEY = 'BROHUBS_TEAM_ELIMINATION_ALERT';

export interface TeamEliminationAlert {
  id: string;
  teamIndex: number;
  placementRank: number;
  teamRank: number;
  teamLabel: string;
  teamName: string;
  teamLogo: string;
  country?: string;
  at: number;
}
