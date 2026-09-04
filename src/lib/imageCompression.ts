// imageCompression.ts — kompresi/resize gambar sisi-klien (berbasis <canvas>) saat upload.
//
// Tujuan: mencegah base64 besar memicu limit kuota localStorage, TANPA penurunan ketajaman
// yang terlihat di siaran. Prinsip:
//   - Hanya MENGECILKAN yang kebesaran (tidak pernah memperbesar → tidak bikin buram).
//   - Logo/grafis (berpotensi transparan) → jalur LOSSLESS (PNG): tepi tajam, alpha utuh, tanpa artefak.
//   - Foto/background → jalur LOSSY kualitas tinggi + "dynamic scaling" sampai target ukuran.
//   - Aman-gagal: error / SVG / file kecil → kembalikan data URL asli, upload tak pernah putus.

export interface CompressOptions {
  /** Batas dimensi (hanya mengecilkan, menjaga rasio). */
  maxWidth?: number;
  maxHeight?: number;
  /** Kualitas 0..1 untuk jalur lossy. */
  quality?: number;
  /** Target "dynamic scaling" jalur lossy — turunkan kualitas bertahap sampai di bawah ini. */
  maxSizeKB?: number;
  /** 'auto' = Pintar (logo→lossless, foto→lossy). */
  mode?: 'auto' | 'lossless' | 'lossy';
}

/** Logo/grafis: kecil di layar, lossless, transparansi dipertahankan. */
export const LOGO_PRESET: CompressOptions = { maxWidth: 512, maxHeight: 512, mode: 'lossless' };
/** Foto pemain: lossy kualitas tinggi. */
export const PHOTO_PRESET: CompressOptions = { maxWidth: 512, maxHeight: 512, mode: 'lossy', quality: 0.8, maxSizeKB: 80 };
/** Background full-screen overlay: lossy, target wajar. */
export const BACKGROUND_PRESET: CompressOptions = { maxWidth: 1920, maxHeight: 1080, mode: 'lossy', quality: 0.85, maxSizeKB: 300 };

/** Lewati kompresi bila file mentah sudah di bawah ini. */
const SKIP_BYTES = 40 * 1024;

let webpSupported: boolean | null = null;
function supportsWebpEncode(): boolean {
  if (webpSupported !== null) return webpSupported;
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    webpSupported = c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    webpSupported = false;
  }
  return webpSupported;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

/** Perkiraan ukuran byte (raw-equivalent) dari payload base64 sebuah data URL. */
function dataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(',');
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

/**
 * Kompres satu File gambar → data URL (base64) yang sudah teroptimasi.
 * Selalu mengembalikan data URL valid (terkompres ATAU asli) — tidak pernah throw.
 */
export async function compressImage(file: File, opts: CompressOptions = {}): Promise<string> {
  try {
    if (!file || typeof file.type !== 'string' || !file.type.startsWith('image/')) {
      return await readAsDataURL(file);
    }
    // SVG = vektor: jangan diraster (akan kehilangan ketajaman/skalabilitas).
    if (file.type.includes('svg')) {
      return await readAsDataURL(file);
    }
    // Sudah kecil → biarkan apa adanya.
    if (file.size > 0 && file.size < SKIP_BYTES) {
      return await readAsDataURL(file);
    }

    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.85,
      maxSizeKB,
      mode = 'auto',
    } = opts;

    const objectUrl = URL.createObjectURL(file);
    let img: HTMLImageElement;
    try {
      img = await loadImage(objectUrl);
    } catch {
      URL.revokeObjectURL(objectUrl);
      return await readAsDataURL(file);
    }
    URL.revokeObjectURL(objectUrl);

    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    if (!srcW || !srcH) return await readAsDataURL(file);

    // Hanya mengecilkan: ratio <= 1.
    const ratio = Math.min(1, maxWidth / srcW, maxHeight / srcH);
    const w = Math.max(1, Math.round(srcW * ratio));
    const h = Math.max(1, Math.round(srcH * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return await readAsDataURL(file);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const alphaCapable =
      file.type.includes('png') || file.type.includes('webp') || file.type.includes('gif');
    const useLossless = mode === 'lossless' || (mode === 'auto' && alphaCapable);

    let out: string;
    if (useLossless) {
      // PNG = truly lossless + alpha utuh (paling aman untuk ketajaman logo).
      out = canvas.toDataURL('image/png');
    } else {
      const type = supportsWebpEncode() ? 'image/webp' : 'image/jpeg';
      let q = quality;
      out = canvas.toDataURL(type, q);
      if (maxSizeKB) {
        const target = maxSizeKB * 1024;
        let guard = 0;
        while (dataUrlBytes(out) > target && q > 0.4 && guard < 6) {
          q = Math.round((q - 0.1) * 100) / 100;
          out = canvas.toDataURL(type, q);
          guard += 1;
        }
      }
    }

    // Jika hasil malah ≥ ukuran asli → pakai asli (no-op aman).
    if (dataUrlBytes(out) >= file.size) {
      return await readAsDataURL(file);
    }

    // Sengaja TIDAK memakai `import.meta.env && …`: menyebut import.meta.env
    // tanpa nama kunci memaksa Vite menyalin SELURUH objek env ke bundle,
    // sehingga semua variabel VITE_* ikut terbit walau tidak pernah dipakai.
    if (import.meta.env.DEV) {
      const before = Math.round(file.size / 1024);
      const after = Math.round(dataUrlBytes(out) / 1024);
      // eslint-disable-next-line no-console
      console.info(`[imageCompression] ${file.name}: ${srcW}x${srcH} ${before}KB → ${w}x${h} ${after}KB`);
    }

    return out;
  } catch {
    try {
      return await readAsDataURL(file);
    } catch {
      return '';
    }
  }
}
