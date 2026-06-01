
export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface PlayerData {
  id: string;
  name: string;
  team: string;
  teamAbbreviation?: string;
  role: string;
  kills: number;
  damage: number;
  assists: number;
  survivalTime: string;
  image?: string;
  teamLogo?: string;
  country?: string; // Menambahkan data negara (kode ISO 2 huruf)
}

export interface Member {
  name: string;
  email: string;
  status: 'ONLINE' | 'IN STREAM' | 'OFFLINE';
  package: string;
  initial: string;
  tempPassword?: string;
  expiryDate: string; // ISO String
  extensionPending?: boolean;
  requestedPackage?: string; // New: Stores the package tier requested by the member
  resetStatus?: 'IDLE' | 'PENDING_APPROVAL' | 'CONFIRMED';
  // New Subscription Flags
  isExtensionFlagged?: boolean; // H-3 to H-0 trigger
  needsNewPassword?: boolean; // Silent reset triggered
  isExpired?: boolean; // Past expiry date
}

export type AccessTier = 'BASIC' | 'PREMIUM' | 'ULTIMATE';

export interface Game {
  title: string;
  id: string;
  active: boolean;
  image: string;
  isReleased?: boolean;
  tier?: AccessTier;
}

export interface Theme {
  id: string;
  name: string;
  desc: string;
  image: string;
  tier: AccessTier;
  locked: boolean;
  gameId: string; // Added link to Game ID
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  gameId: string;
  description: string;
  active: boolean;
  locked: boolean;
  category: 'PREGAME' | 'SOCIAL' | 'INGAME' | 'ENDGAME';
  nodeStatus: 'GLOBAL NODE' | 'LOCAL NODE';
  isReleased?: boolean;
  tier?: AccessTier;
}

export interface ArchivedTeam {
  name: string;
  logo: string;
  players: PlayerData[];
  deletedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  timestamp: string;
  gameId: string;
  gameTitle: string;
  deployedAssets?: Asset[]; // New: Dynamic assets deployed to this project
  players?: PlayerData[]; // New: Manual player data input for the project
  archivedTeams?: ArchivedTeam[]; // New: Persistent history of deleted teams
}

export interface Ad {
  id: string;
  imageUrl: string;
  targetUrl: string;
  active: boolean;
  showLogoOverlay?: boolean;
  showStatusOverlay?: boolean;
  showPingOverlay?: boolean;
  displayLocation?: 'LANDING' | 'LANDING_POPUP' | 'DASHBOARD' | 'PROJECTS' | 'GAMES' | 'ASSETS';
  popUpSize?: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ASPECT_16_9';
}

export type TaskCategory = 'OVERLAY' | 'SYSTEM' | 'WIDGET' | 'THEME' | 'BUGFIX' | 'FEATURE';
export type TaskStatus = 'PLANNED' | 'DEVELOPMENT' | 'TESTING' | 'RERELEASE_TESTING' | 'RELEASED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AppUpdateTask {
  id: string;
  title: string;
  description: string;
  version?: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  targetVersion?: string;
  progressPercentage: number;
  devNotes?: string;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
  upvotes?: number; // Allowed for member interactions
  acknowledgedBy?: string[]; // Array of member emails who acknowledged the update
}

