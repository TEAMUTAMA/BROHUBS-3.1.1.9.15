/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_SERVER_DATA_PROVIDER?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Domain yang ditempelkan ke username saat login (andi → andi@domain). */
  readonly VITE_LOGIN_DOMAIN?: string;
  /** Alias username→email khusus testing; dibuang saat build produksi. */
  readonly VITE_DEV_LOGIN_ALIASES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
