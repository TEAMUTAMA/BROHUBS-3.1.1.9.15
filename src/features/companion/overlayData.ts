import { applyCompanionSharedState } from './overlayAnimation';

export interface CompanionDataPayload {
  assetId: string;
  data: Record<string, unknown>;
  projectScope?: string;
}

// Server menerima body sampai 25MB (express.json limit di server.ts). Batas klien dibuat
// di bawahnya (20MB) supaya foto/gambar base64 IKUT tersinkron ke Output OBS/vMix lewat SSE
// — Output CEF tidak berbagi localStorage dengan panel kontrol, jadi SSE satu-satunya jalur.
const COMPANION_SAFE_POST_BYTES = 20 * 1024 * 1024;
const DATA_IMAGE_PREFIX = 'data:image/';
let didWarnAboutCompanionPayload = false;

/** Hanya Overall Ranking yang boleh menulis state match/teams ke storage (hindari stale echo SSE). */
export const LEADERBOARD_COMPANION_ASSET_ID = 'pmgc-leaderboard';

const LEADERBOARD_OWNED_KEYS = new Set([
  'BROHUBS_LEADERBOARD_TEAMS',
  'BROHUBS_LEADERBOARD_MATCH',
  'BROHUBS_LEADERBOARD_TITLE',
  'BROHUBS_LEADERBOARD_VISUAL',
  'BROHUBS_LEADERBOARD_LAYOUT',
  'BROHUBS_LEADERBOARD_MATCH_KILL_RULES',
  'BROHUBS_LEADERBOARD_KILL_LOG',
  'BROHUBS_ELIMINATION_BANNER_LAYOUT',
  'BROHUBS_FINAL_FOUR_LAYOUT',
  'BROHUBS_OVERALL_RANKING_PROGRAM_PREVIEW',
  'BROHUBS_LEADERBOARD_PROGRAM_VISIBLE',
]);

export function applyCompanionDataPayload(payload: CompanionDataPayload): void {
  if (!payload?.data) return;
  for (const [key, value] of Object.entries(payload.data)) {
    if (LEADERBOARD_OWNED_KEYS.has(key) && payload.assetId !== LEADERBOARD_COMPANION_ASSET_ID) {
      continue;
    }
    applyCompanionSharedState(key, value);
  }
}

function jsonBytes(value: unknown): number {
  return new Blob([JSON.stringify(value)]).size;
}

function containsEmbeddedImage(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.startsWith(DATA_IMAGE_PREFIX);
  }
  if (Array.isArray(value)) {
    return value.some(containsEmbeddedImage);
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some(containsEmbeddedImage);
  }
  return false;
}

function buildCompanionRequestBody(payload: CompanionDataPayload, projectScope: string): string | null {
  const body = { ...payload, projectScope };
  if (jsonBytes(body) <= COMPANION_SAFE_POST_BYTES) {
    return JSON.stringify(body);
  }

  // Last resort: payload masih > 20MB walau server sanggup 25MB (mis. banyak foto tak terkompres).
  // Daripada mengosongkan gambar lalu mengirimnya (yang meng-clobber nilai penerima jadi kosong),
  // BUANG key yang memuat gambar base64 dari payload; key non-gambar tetap dikirim. Idealnya foto
  // sudah dikompres saat upload sehingga cabang ini jarang terpakai.
  const trimmedData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload.data)) {
    if (containsEmbeddedImage(value)) continue;
    trimmedData[key] = value;
  }
  const trimmedBody = { ...payload, data: trimmedData, projectScope };
  const trimmedJson = JSON.stringify(trimmedBody);
  if (new Blob([trimmedJson]).size <= COMPANION_SAFE_POST_BYTES) {
    if (!didWarnAboutCompanionPayload) {
      didWarnAboutCompanionPayload = true;
      console.warn(
        'Companion data sync: key dengan gambar base64 tidak dikirim lewat SSE (pakai localStorage same-PC).'
      );
    }
    return trimmedJson;
  }

  if (!didWarnAboutCompanionPayload) {
    didWarnAboutCompanionPayload = true;
    console.warn('Companion data sync dilewati: payload masih terlalu besar setelah membuang gambar.');
  }
  return null;
}

export async function notifyCompanionData(
  payload: CompanionDataPayload,
  projectScope?: string | null
): Promise<void> {
  if (!projectScope) return;
  const body = buildCompanionRequestBody(payload, projectScope);
  if (!body) return;

  try {
    const response = await fetch('/api/companion/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!response.ok) {
      console.warn(`Companion data sync failed: ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    console.warn('Companion data sync failed:', err);
  }
}
