/**
 * serverData.ts — satu pintu untuk semua penyimpanan data server/cloud.
 *
 * Ganti backend cukup ubah ACTIVE_PROVIDER di bawah (atau panggil setServerDataProvider).
 * UI & service lain cukup import `serverData` — jangan langsung ke Firebase/Supabase/localStorage.
 *
 * Provider yang didukung:
 *   - local    → localStorage (default, jalan tanpa setup)
 *   - firebase → Firestore (isi implementasi di createFirebaseAdapter)
 *   - supabase → PostgreSQL via Supabase (isi di createSupabaseAdapter)
 *   - express  → API Express sendiri /api/data (isi di createExpressAdapter)
 *   - custom   → setCustomServerDataAdapter(yourAdapter)
 */

import type { Ad, AppUpdateTask, Game, Member, Theme } from '../types';
import {
  listFirestoreCollection,
  memberFirestoreDocId,
  replaceAllFirestoreCollection,
} from './firebaseStore';

// ─── Konfigurasi ─────────────────────────────────────────────────────────────

export type ServerDataProvider = 'local' | 'firebase' | 'supabase' | 'express' | 'custom';

/** Koleksi data yang disimpan di server/cloud */
export type ServerCollection =
  | 'admin_tasks'
  | 'public_features'
  | 'members'
  | 'games'
  | 'themes'
  | 'ads';

export interface ServerDataConfig {
  provider: ServerDataProvider;
  /** Base URL untuk provider `express`, mis. '' atau 'http://localhost:3000' */
  expressBaseUrl?: string;
  /** Prefix key localStorage per koleksi (provider `local`) */
  localStoragePrefix?: string;
}

/** Status publik fitur yang dilihat member (bukan task internal admin) */
export type PublicFeatureStatus = 'COMING_SOON' | 'IN_DEVELOPMENT' | 'TESTING' | 'RELEASED';

export interface PublicFeature {
  id: string;
  title: string;
  description: string;
  category: AppUpdateTask['category'];
  status: PublicFeatureStatus;
  progressPercentage: number;
  version?: string;
  createdAt: string;
  updatedAt: string;
  upvotes?: number;
  acknowledgedBy?: string[];
}

// ─── Adapter contract (satu bentuk untuk semua provider) ─────────────────────

export interface ServerDataAdapter {
  readonly id: ServerDataProvider;
  list<T>(collection: ServerCollection): Promise<T[]>;
  replaceAll<T>(collection: ServerCollection, items: T[]): Promise<void>;
}

export class ServerDataNotConfiguredError extends Error {
  constructor(provider: ServerDataProvider, collection: ServerCollection) {
    super(
      `[serverData] Provider "${provider}" belum dikonfigurasi untuk koleksi "${collection}". ` +
        `Lihat lib/serverData.ts → create${provider.charAt(0).toUpperCase() + provider.slice(1)}Adapter`
    );
    this.name = 'ServerDataNotConfiguredError';
  }
}

// ─── Seed data (hanya dipakai saat koleksi masih kosong, provider local) ─────

const SEED_ADMIN_TASKS: AppUpdateTask[] = [
  {
    id: 'rec1',
    title: 'PUBG Mobile Overlay Animation Sync',
    description:
      'Fine-tune responsive draft variables (stagger, ease duration keys) in the HUD leaderboard with multicast operators.',
    category: 'OVERLAY',
    status: 'DEVELOPMENT',
    priority: 'CRITICAL',
    targetVersion: 'v3.1.6',
    progressPercentage: 40,
    devNotes: 'Draft states configured. Integrating state handlers directly inside local storage operators.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    upvotes: 0,
    acknowledgedBy: [],
  },
  {
    id: 'rec2',
    title: 'Automated Real-time Game Telemetry APIs',
    description:
      'Establish customizable API ingestion layers to fetch live score matrices directly from tournament streams.',
    category: 'FEATURE',
    status: 'PLANNED',
    priority: 'HIGH',
    targetVersion: 'v3.2.0',
    progressPercentage: 0,
    devNotes: 'Initial backend structures drafted in pipeline mockups.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    upvotes: 0,
    acknowledgedBy: [],
  },
  {
    id: 'rec3',
    title: 'High-Res Logo Canvas Compression Engine',
    description:
      'Incorporate client-side image compression layers during file upload to prevent localStorage limits from triggering.',
    category: 'SYSTEM',
    status: 'PLANNED',
    priority: 'MEDIUM',
    targetVersion: 'v3.1.8',
    progressPercentage: 0,
    devNotes: 'Testing dynamic scaling factors using manual canvas triggers.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    upvotes: 0,
    acknowledgedBy: [],
  },
];

const getFutureDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const SEED_MEMBERS: Member[] = [
  { name: 'Emma Node', email: 'EMMA@HUB.COM', status: 'ONLINE', package: 'BASIC', initial: 'E', expiryDate: getFutureDate(10) },
  { name: 'Alex River', email: 'ALEX@HUB.COM', status: 'ONLINE', package: 'PREMIUM', initial: 'A', expiryDate: getFutureDate(0) },
  { name: 'Sarah Stream', email: 'SARAH@HUB.COM', status: 'IN STREAM', package: 'ULTIMATE', initial: 'S', expiryDate: getFutureDate(4) },
  { name: 'David Byte', email: 'DAVID@HUB.COM', status: 'OFFLINE', package: 'BASIC', initial: 'D', expiryDate: getFutureDate(-1), isExpired: true },
  { name: 'Lucas Link', email: 'LUCAS@HUB.COM', status: 'OFFLINE', package: 'PREMIUM', initial: 'L', expiryDate: getFutureDate(15) },
];

const SEED_GAMES: Game[] = [
  { title: 'PUBG MOBILE', id: 'pubg', active: true, image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop', isReleased: true, tier: 'BASIC' },
  { title: 'MOBILE LEGENDS', id: 'mlbb', active: true, image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop', isReleased: true, tier: 'BASIC' },
  { title: 'VALORANT', id: 'val', active: true, image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=2070&auto=format&fit=crop', isReleased: true, tier: 'BASIC' },
  { title: 'FREE FIRE', id: 'ff', active: true, image: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?q=80&w=2070&auto=format&fit=crop', isReleased: true, tier: 'BASIC' },
  { title: 'HONOR OF KINGS', id: 'hok', active: true, image: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?q=80&w=2070&auto=format&fit=crop', isReleased: true, tier: 'BASIC' },
  { title: 'DOTA 2', id: 'dota', active: true, image: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?q=80&w=2084&auto=format&fit=crop', isReleased: true, tier: 'BASIC' },
];

const SEED_THEMES: Theme[] = [
  { id: 'pubg-t3', gameId: 'pubg', name: 'PMGC OFFICIAL', desc: 'Global Championship Style', image: 'https://images.unsplash.com/photo-1620505157895-7d5262e3d30e?q=80&w=2070&auto=format&fit=crop', tier: 'ULTIMATE', locked: false },
  { id: 'mlbb-t1', gameId: 'mlbb', name: 'LAND OF DAWN', desc: 'Classic MOBA Interface', image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=2071&auto=format&fit=crop', tier: 'BASIC', locked: false },
  { id: 'mlbb-t2', gameId: 'mlbb', name: 'MYSTIC GOLD', desc: 'M-Series Championship Look', image: 'https://images.unsplash.com/photo-1519669556878-63bd08b1312b?q=80&w=2070&auto=format&fit=crop', tier: 'PREMIUM', locked: false },
  { id: 'mlbb-t3', gameId: 'mlbb', name: 'ABYSSAL VOID', desc: 'Dark Mode Fantasy', image: 'https://images.unsplash.com/photo-1632213702844-1e0615781374?q=80&w=1932&auto=format&fit=crop', tier: 'ULTIMATE', locked: true },
  { id: 'val-t1', gameId: 'val', name: 'PROTOCOL 781-A', desc: 'Clean Future Tech', image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=2070&auto=format&fit=crop', tier: 'BASIC', locked: false },
  { id: 'val-t2', gameId: 'val', name: 'GLITCHPOP', desc: 'Cyberpunk Neon Burst', image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop', tier: 'PREMIUM', locked: false },
  { id: 'ff-t1', gameId: 'ff', name: 'BOOYAH BASE', desc: 'Survivor Default', image: 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?q=80&w=2070&auto=format&fit=crop', tier: 'BASIC', locked: false },
  { id: 'ff-t2', gameId: 'ff', name: 'COBRA INITIATIVE', desc: 'Aggressive Red/Black', image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=2070&auto=format&fit=crop', tier: 'PREMIUM', locked: false },
  { id: 'hok-t1', gameId: 'hok', name: 'DRAGON GATE', desc: 'Traditional MOBA Style', image: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?q=80&w=2070&auto=format&fit=crop', tier: 'BASIC', locked: false },
  { id: 'dota-t1', gameId: 'dota', name: 'THE INTERNATIONAL', desc: 'Aegis Champion Style', image: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?q=80&w=2084&auto=format&fit=crop', tier: 'ULTIMATE', locked: false },
];

const SEED_ADS: Ad[] = [
  {
    id: '1',
    imageUrl: 'https://picsum.photos/seed/ad1/1200/400',
    targetUrl: 'https://discord.gg/Qper2dY2Y',
    active: true,
  },
  {
    id: '2',
    imageUrl: 'https://picsum.photos/seed/ad2/1200/400',
    targetUrl: 'https://ais-dev-alv446s3bayuh33j6o6ikj-39309596873.asia-east1.run.app',
    active: true,
  },
];

const LOCAL_KEYS: Record<ServerCollection, string> = {
  admin_tasks: 'BROHUBS_SERVER_admin_tasks',
  public_features: 'BROHUBS_SERVER_public_features',
  members: 'BROHUBS_SERVER_members',
  games: 'BROHUBS_SERVER_games',
  themes: 'BROHUBS_SERVER_themes',
  ads: 'BROHUBS_SERVER_ads',
};

/** Key lama sebelum serverData — dimigrasi sekali ke key baru */
const LEGACY_LOCAL_KEYS: Partial<Record<ServerCollection, string>> = {
  admin_tasks: 'BROHUBS_UPDATE_TASKS_CLEAN',
  members: 'BROHUBS_MEMBERS',
  games: 'BROHUBS_GAMES',
  themes: 'BROHUBS_THEMES',
  ads: 'BROHUBS_ADS',
};

const LOCAL_SEEDS: Partial<Record<ServerCollection, unknown[]>> = {
  admin_tasks: SEED_ADMIN_TASKS,
  public_features: [],
  members: SEED_MEMBERS,
  games: SEED_GAMES,
  themes: SEED_THEMES,
  ads: SEED_ADS,
};

const FIREBASE_COLLECTIONS = new Set<ServerCollection>([
  'admin_tasks',
  'members',
  'games',
  'themes',
  'ads',
]);

// ─── Provider: local (localStorage) ──────────────────────────────────────────

function createLocalAdapter(prefix = 'BROHUBS_SERVER'): ServerDataAdapter {
  const keys: Record<ServerCollection, string> = {
    admin_tasks: `${prefix}_admin_tasks`,
    public_features: `${prefix}_public_features`,
    members: `${prefix}_members`,
    games: `${prefix}_games`,
    themes: `${prefix}_themes`,
    ads: `${prefix}_ads`,
  };

  return {
    id: 'local',
    async list<T>(collection: ServerCollection): Promise<T[]> {
      await delay(300);
      const storageKey = keys[collection] ?? LOCAL_KEYS[collection];

      const raw = localStorage.getItem(storageKey);
      if (raw) {
        try {
          return JSON.parse(raw) as T[];
        } catch (e) {
          console.error(`[serverData/local] Gagal parse "${collection}"`, e);
        }
      }

      const legacyKey = LEGACY_LOCAL_KEYS[collection];
      if (legacyKey) {
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw) {
          try {
            const migrated = JSON.parse(legacyRaw) as T[];
            localStorage.setItem(storageKey, JSON.stringify(migrated));
            return [...migrated];
          } catch (e) {
            console.error(`[serverData/local] Gagal migrasi legacy "${collection}"`, e);
          }
        }
      }
      const seed = (LOCAL_SEEDS[collection] ?? []) as T[];
      if (seed.length > 0) {
        localStorage.setItem(keys[collection], JSON.stringify(seed));
      }
      return [...seed];
    },
    async replaceAll<T>(collection: ServerCollection, items: T[]): Promise<void> {
      localStorage.setItem(keys[collection], JSON.stringify(items));
    },
  };
}

// ─── Provider: firebase (Firestore) — admin_tasks & members di cloud ───────

function getFirebaseSeed(collection: ServerCollection): unknown[] {
  if (collection === 'admin_tasks') return [...SEED_ADMIN_TASKS];
  if (collection === 'members') return [...SEED_MEMBERS];
  if (collection === 'games') return [...SEED_GAMES];
  if (collection === 'themes') return [...SEED_THEMES];
  if (collection === 'ads') return [...SEED_ADS];
  return [];
}

async function firebaseListWithMigration<T>(
  collection: ServerCollection,
  localFallback: ServerDataAdapter
): Promise<T[]> {
  const remote = await listFirestoreCollection<T>(collection);
  if (remote.length > 0) {
    return remote;
  }

  const local = await localFallback.list<T>(collection);
  const seed = (local.length > 0 ? local : getFirebaseSeed(collection)) as T[];
  if (seed.length > 0) {
    await firebaseReplaceAll(collection, seed);
  }
  return seed;
}

async function firebaseReplaceAll<T>(collection: ServerCollection, items: T[]): Promise<void> {
  if (collection === 'admin_tasks') {
    await replaceAllFirestoreCollection(
      collection,
      items as AppUpdateTask[],
      (task) => task.id
    );
    return;
  }
  if (collection === 'members') {
    await replaceAllFirestoreCollection(
      collection,
      items as Member[],
      (member) => memberFirestoreDocId(member.email)
    );
    return;
  }
  if (collection === 'games') {
    await replaceAllFirestoreCollection(collection, items as Game[], (game) => game.id);
    return;
  }
  if (collection === 'themes') {
    await replaceAllFirestoreCollection(collection, items as Theme[], (theme) => theme.id);
    return;
  }
  if (collection === 'ads') {
    await replaceAllFirestoreCollection(collection, items as Ad[], (ad) => ad.id);
  }
}

/** Katalog default untuk fitur reset di admin */
export function getSeedGames(): Game[] {
  return [...SEED_GAMES];
}

export function getSeedThemes(): Theme[] {
  return [...SEED_THEMES];
}

function createFirebaseAdapter(): ServerDataAdapter {
  const localFallback = () => createLocalAdapter(runtimeConfig.localStoragePrefix);

  return {
    id: 'firebase',
    async list<T>(collection: ServerCollection): Promise<T[]> {
      if (!FIREBASE_COLLECTIONS.has(collection)) {
        return localFallback().list<T>(collection);
      }

      try {
        return await firebaseListWithMigration<T>(collection, localFallback());
      } catch (e) {
        console.error(`[serverData/firebase] Gagal baca "${collection}", fallback localStorage`, e);
        return localFallback().list<T>(collection);
      }
    },
    async replaceAll<T>(collection: ServerCollection, items: T[]): Promise<void> {
      if (!FIREBASE_COLLECTIONS.has(collection)) {
        return localFallback().replaceAll(collection, items);
      }

      try {
        await firebaseReplaceAll(collection, items);
      } catch (e) {
        console.error(`[serverData/firebase] Gagal tulis "${collection}", fallback localStorage`, e);
        return localFallback().replaceAll(collection, items);
      }
    },
  };
}

// ─── Provider: supabase — isi saat sudah setup Supabase ─────────────────────
//
// Langkah nanti:
//   1. npm install @supabase/supabase-js
//   2. createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
//   3. Map koleksi → nama tabel PostgreSQL
//   4. list: .from(table).select('*')
//   5. replaceAll: upsert / delete + insert

function createSupabaseAdapter(): ServerDataAdapter {
  return {
    id: 'supabase',
    async list<T>(collection: ServerCollection): Promise<T[]> {
      throw new ServerDataNotConfiguredError('supabase', collection);
    },
    async replaceAll<T>(_collection: ServerCollection, _items: T[]): Promise<void> {
      throw new ServerDataNotConfiguredError('supabase', _collection);
    },
  };
}

// ─── Provider: express (API server.ts) — isi saat route /api/data siap ───────
//
// Kontrak API yang disarankan:
//   GET  /api/data/:collection        → T[]
//   PUT  /api/data/:collection        → body: T[]  (replace semua)

function createExpressAdapter(baseUrl = ''): ServerDataAdapter {
  const root = baseUrl.replace(/\/$/, '');

  return {
    id: 'express',
    async list<T>(collection: ServerCollection): Promise<T[]> {
      const res = await fetch(`${root}/api/data/${collection}`);
      if (!res.ok) {
        throw new ServerDataNotConfiguredError('express', collection);
      }
      return res.json() as Promise<T[]>;
    },
    async replaceAll<T>(collection: ServerCollection, items: T[]): Promise<void> {
      const res = await fetch(`${root}/api/data/${collection}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      });
      if (!res.ok) {
        throw new ServerDataNotConfiguredError('express', collection);
      }
    },
  };
}

// ─── Registry & runtime config ───────────────────────────────────────────────

let runtimeConfig: ServerDataConfig = {
  provider: 'local',
  localStoragePrefix: 'BROHUBS_SERVER',
};

let customAdapter: ServerDataAdapter | null = null;

function resolveAdapter(): ServerDataAdapter {
  switch (runtimeConfig.provider) {
    case 'local':
      return createLocalAdapter(runtimeConfig.localStoragePrefix);
    case 'firebase':
      return createFirebaseAdapter();
    case 'supabase':
      return createSupabaseAdapter();
    case 'express':
      return createExpressAdapter(runtimeConfig.expressBaseUrl);
    case 'custom':
      if (!customAdapter) {
        throw new Error('[serverData] provider "custom" dipilih tapi setCustomServerDataAdapter() belum dipanggil.');
      }
      return customAdapter;
    default:
      return createLocalAdapter();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listCollection<T>(collection: ServerCollection): Promise<T[]> {
  return resolveAdapter().list<T>(collection);
}

async function replaceCollection<T>(collection: ServerCollection, items: T[]): Promise<void> {
  return resolveAdapter().replaceAll<T>(collection, items);
}

// ─── Public API (yang dipakai service lain) ──────────────────────────────────

/** Ganti provider global — panggil sekali saat app boot jika perlu */
export function configureServerData(config: Partial<ServerDataConfig>): void {
  runtimeConfig = { ...runtimeConfig, ...config };
}

/** Provider aktif saat ini */
export function getServerDataProvider(): ServerDataProvider {
  return runtimeConfig.provider;
}

/** Pasang adapter buatan sendiri (provider: custom) */
export function setCustomServerDataAdapter(adapter: ServerDataAdapter): void {
  customAdapter = adapter;
  runtimeConfig.provider = 'custom';
}

/**
 * Satu pintu data server — import ini di taskService dan service data lain.
 *
 * Contoh ganti ke Firebase nanti (di main.tsx atau App.tsx):
 *   configureServerData({ provider: 'firebase' });
 */
export const serverData = {
  /** Task internal admin (multi-admin, tidak tampil ke member) */
  adminTasks: {
    getAll: (): Promise<AppUpdateTask[]> => listCollection<AppUpdateTask>('admin_tasks'),
    saveAll: (tasks: AppUpdateTask[]): Promise<void> => replaceCollection('admin_tasks', tasks),
  },

  /** Fitur publik yang dilihat member */
  publicFeatures: {
    getAll: (): Promise<PublicFeature[]> => listCollection<PublicFeature>('public_features'),
    saveAll: (features: PublicFeature[]): Promise<void> => replaceCollection('public_features', features),
  },

  /** Daftar member — sync antar PC/admin */
  members: {
    getAll: (): Promise<Member[]> => listCollection<Member>('members'),
    saveAll: (members: Member[]): Promise<void> => replaceCollection('members', members),
  },

  /** Katalog game */
  games: {
    getAll: (): Promise<Game[]> => listCollection<Game>('games'),
    saveAll: (games: Game[]): Promise<void> => replaceCollection('games', games),
  },

  /** Katalog theme per game */
  themes: {
    getAll: (): Promise<Theme[]> => listCollection<Theme>('themes'),
    saveAll: (themes: Theme[]): Promise<void> => replaceCollection('themes', themes),
  },

  /** Iklan / promo slider */
  ads: {
    getAll: (): Promise<Ad[]> => listCollection<Ad>('ads'),
    saveAll: (ads: Ad[]): Promise<void> => replaceCollection('ads', ads),
  },

  /** Akses generik jika nanti ada koleksi baru */
  raw: {
    list: listCollection,
    replaceAll: replaceCollection,
  },
} as const;
