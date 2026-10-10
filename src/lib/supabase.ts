import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseClientConfig {
  url: string;
  anonKey: string;
}

export function readSupabaseConfigFromEnv(): SupabaseClientConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return readSupabaseConfigFromEnv() !== null;
}

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const config = readSupabaseConfigFromEnv();
  if (!config) {
    throw new Error(
      '[supabase] Config kosong. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env.local.'
    );
  }

  supabaseClient = createClient(config.url, config.anonKey);
  return supabaseClient;
}
