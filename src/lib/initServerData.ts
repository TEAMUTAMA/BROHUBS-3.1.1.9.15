import { isFirebaseConfigured } from './firebase';
import { isSupabaseConfigured } from './supabase';
import { configureServerData, getServerDataProvider } from './serverData';

/**
 * Panggil sekali saat app boot (src/main.tsx).
 * Otomatis pakai Firebase jika VITE_FIREBASE_* sudah diisi di .env.local
 */
export function initServerData(): void {
  const forcedProvider = import.meta.env.VITE_SERVER_DATA_PROVIDER?.trim();

  if (forcedProvider === 'local') {
    configureServerData({ provider: 'local' });
    console.info('[serverData] Provider: localStorage (forced).');
    return;
  }

  if (isFirebaseConfigured()) {
    configureServerData({ provider: 'firebase' });
    console.info('[serverData] Provider: Firebase Firestore (admin_tasks, members, games, themes, ads).');
  } else {
    configureServerData({ provider: 'local' });
    console.info(
      '[serverData] Provider: localStorage. Isi .env.local untuk Firebase (lihat .env.example).'
    );
  }

  if (isSupabaseConfigured()) {
    console.info('[serverData] Projects: Supabase (database + storage) — bisa dibuka dari PC mana saja.');
  } else {
    console.info('[serverData] Projects: localStorage. Isi VITE_SUPABASE_* untuk sync antar PC.');
  }
}

export function logActiveServerDataProvider(): void {
  console.info(`[serverData] Active provider: ${getServerDataProvider()}`);
}
