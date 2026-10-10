import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export function readFirebaseConfigFromEnv(): FirebaseClientConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim();
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim();
  if (!apiKey || !projectId) return null;

  return {
    apiKey,
    projectId,
    authDomain:
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || `${projectId}.firebaseapp.com`,
    storageBucket:
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || `${projectId}.appspot.com`,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim() || '',
  };
}

export function isFirebaseConfigured(): boolean {
  return readFirebaseConfigFromEnv() !== null;
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

export function getFirebaseDb(): Firestore {
  if (firestoreDb) return firestoreDb;

  const config = readFirebaseConfigFromEnv();
  if (!config) {
    throw new Error(
      '[firebase] Config kosong. Isi VITE_FIREBASE_* di .env.local (lihat .env.example).'
    );
  }

  firebaseApp = getApps().length > 0 ? getApps()[0]! : initializeApp(config);

  try {
    // Long polling — hindari error WebChannel 400 di beberapa browser/jaringan
    firestoreDb = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: false,
    });
  } catch {
    firestoreDb = getFirestore(firebaseApp);
  }

  return firestoreDb;
}
