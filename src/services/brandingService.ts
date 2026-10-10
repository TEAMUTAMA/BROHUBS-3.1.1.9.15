// brandingService.ts — logo Global & Admin di cloud (Supabase Storage),
// agar terbawa antar-PC dan terlihat semua user (bukan terkunci di localStorage 1 PC).
//
// Byte logo disimpan di bucket Storage (path ber-versi → bebas cache CDN),
// dan "penunjuk"-nya di branding/manifest.json. Semua PC membaca manifest itu.

import { uploadDataUrl, uploadJson, fetchPublicJson } from '../lib/supabaseStorage';

export type BrandingSlot = 'global' | 'admin';

export interface BrandingManifest {
  globalLogoUrl: string | null;
  adminLogoUrl: string | null;
  updatedAt?: string;
}

const MANIFEST_PATH = 'branding/manifest.json';
const EMPTY: BrandingManifest = { globalLogoUrl: null, adminLogoUrl: null };

function slotKey(slot: BrandingSlot): 'globalLogoUrl' | 'adminLogoUrl' {
  return slot === 'global' ? 'globalLogoUrl' : 'adminLogoUrl';
}

function extFromDataUrl(dataUrl: string): string {
  const m = /^data:image\/([^;]+);/.exec(dataUrl);
  const t = (m?.[1] || 'png').toLowerCase();
  if (t.includes('jpeg') || t.includes('jpg')) return 'jpg';
  if (t.includes('webp')) return 'webp';
  if (t.includes('gif')) return 'gif';
  if (t.includes('svg')) return 'svg';
  return 'png';
}

/** Baca manifest branding dari cloud. null bila Supabase tak ada / belum pernah di-set. */
export async function getBranding(): Promise<BrandingManifest | null> {
  return fetchPublicJson<BrandingManifest>(MANIFEST_PATH);
}

async function writeManifest(next: BrandingManifest): Promise<void> {
  const ok = await uploadJson(
    { ...next, updatedAt: new Date().toISOString() },
    MANIFEST_PATH
  );
  if (!ok) throw new Error('[branding] gagal menulis manifest ke cloud');
}

/**
 * Unggah logo (data URL terkompres) ke cloud + perbarui manifest. Balikkan URL publik.
 * Throw bila gagal (pemanggil fallback ke localStorage).
 */
export async function saveBrandingLogo(slot: BrandingSlot, dataUrl: string): Promise<string> {
  const current = (await getBranding()) ?? EMPTY;

  // Sudah berupa URL (bukan base64) → cukup catat di manifest.
  if (!dataUrl.startsWith('data:')) {
    await writeManifest({ ...current, [slotKey(slot)]: dataUrl });
    return dataUrl;
  }

  const path = `branding/${slot}-${Date.now()}.${extFromDataUrl(dataUrl)}`;
  const url = await uploadDataUrl(dataUrl, path);
  // uploadDataUrl mengembalikan dataUrl asli bila gagal/Supabase mati → anggap gagal.
  if (!url || url.startsWith('data:')) {
    throw new Error('[branding] gagal mengunggah logo ke Storage');
  }

  await writeManifest({ ...current, [slotKey(slot)]: url });
  return url;
}

/** Kosongkan satu slot logo di cloud. */
export async function resetBrandingLogo(slot: BrandingSlot): Promise<void> {
  const current = (await getBranding()) ?? EMPTY;
  await writeManifest({ ...current, [slotKey(slot)]: null });
}
