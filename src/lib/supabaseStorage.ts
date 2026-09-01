import { getSupabase, isSupabaseConfigured } from './supabase';

export const PROJECT_ASSETS_BUCKET = 'brohubs-assets';

const DATA_URL_RE = /^data:([^;]+);base64,(.+)$/;
const uploadedDataUrlCache = new Map<string, string>();

function extensionForMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('svg')) return 'svg';
  return 'bin';
}

function decodeBase64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Simpan satu gambar ke Storage bila Supabase aktif. Saat mode lokal/offline,
 * data URL tetap dikembalikan agar alur upload tidak terputus.
 */
export async function uploadImageFile(
  file: File,
  pathPrefix: string,
  optimizedDataUrl?: string
): Promise<string> {
  const dataUrl = optimizedDataUrl ?? (await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  }));

  if (!dataUrl || !isSupabaseConfigured()) return dataUrl;

  const ext = extensionForMime(file.type || DATA_URL_RE.exec(dataUrl)?.[1] || 'image/png');
  const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  try {
    return await uploadDataUrl(dataUrl, path);
  } catch (error) {
    console.warn('[supabaseStorage] Upload gambar gagal, tetap pakai data lokal:', error);
    return dataUrl;
  }
}

export async function uploadDataUrl(dataUrl: string, storagePath: string): Promise<string> {
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) return dataUrl;

  const mime = match[1]!;
  const base64 = match[2]!;
  const bytes = decodeBase64ToBytes(base64);
  const supabase = getSupabase();

  const { error } = await supabase.storage.from(PROJECT_ASSETS_BUCKET).upload(storagePath, bytes, {
    contentType: mime,
    upsert: true,
  });

  if (error) {
    console.warn('[supabaseStorage] Upload gagal, tetap pakai base64:', error.message);
    return dataUrl;
  }

  const { data } = supabase.storage.from(PROJECT_ASSETS_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/** Ganti data-URL base64 di objek dengan URL Supabase Storage (hemat quota DB). */
export async function uploadEmbeddedImages<T>(
  value: T,
  pathPrefix: string,
  keyHint = 'asset'
): Promise<T> {
  if (!isSupabaseConfigured()) return value;

  let counter = 0;

  async function walk(node: unknown, prefix: string): Promise<unknown> {
    if (typeof node === 'string') {
      if (!DATA_URL_RE.test(node)) return node;
      const cached = uploadedDataUrlCache.get(node);
      if (cached) return cached;
      counter += 1;
      const ext = extensionForMime(DATA_URL_RE.exec(node)![1]!);
      const storagePath = `${pathPrefix}/${keyHint}-${counter}.${ext}`;
      const uploaded = await uploadDataUrl(node, storagePath);
      if (!uploaded.startsWith('data:')) uploadedDataUrlCache.set(node, uploaded);
      return uploaded;
    }

    if (Array.isArray(node)) {
      const out: unknown[] = [];
      for (let i = 0; i < node.length; i += 1) {
        out.push(await walk(node[i], `${prefix}-${i}`));
      }
      return out;
    }

    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        out[k] = await walk(v, `${prefix}-${k}`);
      }
      return out;
    }

    return node;
  }

  return (await walk(value, pathPrefix)) as T;
}

/** Unggah objek JSON ke Storage (mis. manifest branding). Aman-gagal → false. */
export async function uploadJson(value: unknown, storagePath: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = getSupabase();
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    const { error } = await supabase.storage
      .from(PROJECT_ASSETS_BUCKET)
      .upload(storagePath, bytes, { contentType: 'application/json', upsert: true });
    if (error) {
      console.warn('[supabaseStorage] uploadJson gagal:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[supabaseStorage] uploadJson error:', e);
    return false;
  }
}

/** Baca JSON publik dari Storage (cache-bust agar selalu terbaru). Aman-gagal → null. */
export async function fetchPublicJson<T = unknown>(storagePath: string): Promise<T | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = getSupabase();
    const { data } = supabase.storage.from(PROJECT_ASSETS_BUCKET).getPublicUrl(storagePath);
    if (!data?.publicUrl) return null;
    const res = await fetch(`${data.publicUrl}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
