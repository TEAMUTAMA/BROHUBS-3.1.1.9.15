import {
  collection,
  doc,
  getDocs,
  writeBatch,
  type DocumentData,
  type DocumentReference,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

const BATCH_LIMIT = 450;

function stripUndefined(obj: object): DocumentData {
  const out: DocumentData = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export async function listFirestoreCollection<T>(collectionName: string): Promise<T[]> {
  const db = getFirebaseDb();
  const snap = await getDocs(collection(db, collectionName));
  return snap.docs.map((entry) => entry.data() as T);
}

export async function replaceAllFirestoreCollection<T extends object>(
  collectionName: string,
  items: T[],
  getDocId: (item: T) => string
): Promise<void> {
  const db = getFirebaseDb();
  const existing = await getDocs(collection(db, collectionName));
  const nextIds = new Set(items.map(getDocId));

  type BatchOp =
    | { kind: 'set'; id: string; data: DocumentData }
    | { kind: 'delete'; ref: DocumentReference<DocumentData> };

  const ops: BatchOp[] = [
    ...items.map((item) => ({
      kind: 'set' as const,
      id: getDocId(item),
      data: stripUndefined(item),
    })),
    ...existing.docs
      .filter((entry) => !nextIds.has(entry.id))
      .map((entry) => ({ kind: 'delete' as const, ref: entry.ref })),
  ];

  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const op of ops.slice(i, i + BATCH_LIMIT)) {
      if (op.kind === 'set') {
        batch.set(doc(db, collectionName, op.id), op.data);
      } else {
        batch.delete(op.ref);
      }
    }
    await batch.commit();
  }
}

export function memberFirestoreDocId(email: string): string {
  return email.toUpperCase();
}
