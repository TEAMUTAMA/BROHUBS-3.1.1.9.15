/** Warna, gambar (URL), & mode desain banner eliminasi — sync via BROHUBS_LEADERBOARD_VISUAL */

import type { CSSProperties } from 'react';
import {
  DEFAULT_ELIMINATION_BANNER_FONT_FAMILY_ID,
  resolveEliminationBannerFontFamilyId,
  getEliminationBannerFontCssFamily,
} from './eliminationBannerFonts';

export {
  ELIMINATION_BANNER_FONT_FAMILY_OPTIONS,
  DEFAULT_ELIMINATION_BANNER_FONT_FAMILY_ID,
  getEliminationBannerFontCssFamily,
  resolveEliminationBannerFontFamilyId,
} from './eliminationBannerFonts';

export type EliminationBannerDesignMode = 'panels' | 'full';

/** Sub-mode saat Custom Image: satu link penuh vs link per panel */
export type EliminationBannerCustomImageVariant = 'fullLink' | 'panelLinks';

export type EliminationBannerFullImageFit = 'contain' | 'cover';

export const ELIMINATION_BANNER_FULL_IMAGE_FIT_LABELS: Record<
  EliminationBannerFullImageFit,
  string
> = {
  contain: 'Utuh (transparan)',
  cover: 'Penuh (crop)',
};

/** Kanvas mode Utuh — 16:9 agar PNG tidak terjepit di strip banner */
export const ELIMINATION_BANNER_FULL_CONTAIN_CANVAS = {
  widthPx: 640,
  aspectRatio: '16 / 9' as const,
  label: '16:9',
} as const;

export const ELIMINATION_BANNER_CUSTOM_IMAGE_VARIANT_LABELS: Record<
  EliminationBannerCustomImageVariant,
  string
> = {
  fullLink: 'Custom Image (LINK)',
  panelLinks: 'Panel BG (LINK)',
};
export interface EliminationBannerFullSlot {
  /** Titik anchor horizontal (%) */
  x: number;
  /** Titik anchor vertikal (%) */
  y: number;
  visible: boolean;
}

export interface EliminationBannerFullLogoSlot extends EliminationBannerFullSlot {
  /** Lebar area logo (% lebar banner) */
  size: number;
}

export interface EliminationBannerFullTextSlot extends EliminationBannerFullSlot {
  fontSize: number;
}

export interface EliminationBannerFullOverlayLayout {
  logo: EliminationBannerFullLogoSlot;
  placement: EliminationBannerFullTextSlot;
  teamName: EliminationBannerFullTextSlot;
}

export const DEFAULT_ELIMINATION_BANNER_FULL_LAYOUT: EliminationBannerFullOverlayLayout = {
  logo: { x: 9, y: 50, size: 14, visible: true },
  placement: { x: 88, y: 28, fontSize: 40, visible: true },
  teamName: { x: 88, y: 72, fontSize: 25, visible: true },
};

/** Ukuran font teks banner (px) — dipakai Panel & Custom Image */
export interface EliminationBannerTypography {
  eliminated: number;
  placement: number;
  tag: number;
}

export const DEFAULT_ELIMINATION_BANNER_TYPOGRAPHY: EliminationBannerTypography = {
  eliminated: 55,
  placement: 40,
  tag: 25,
};

export const ELIMINATION_BANNER_FONT_KEYS = [
  'eliminated',
  'placement',
  'tag',
] as const;

export type EliminationBannerFontKey = (typeof ELIMINATION_BANNER_FONT_KEYS)[number];

export const ELIMINATION_BANNER_FONT_LABELS: Record<EliminationBannerFontKey, string> = {
  eliminated: 'ELIMINATED (px)',
  placement: '# PLACEMENT (px)',
  tag: 'TAG TIM (px)',
};

export const ELIMINATION_BANNER_FONT_KEYS_PANEL = ELIMINATION_BANNER_FONT_KEYS;

export const ELIMINATION_BANNER_FONT_KEYS_CUSTOM_IMAGE = ELIMINATION_BANNER_FONT_KEYS.filter(
  (k) => k !== 'eliminated'
) as Exclude<EliminationBannerFontKey, 'eliminated'>[];

export function resolveEliminationBannerTypography(
  visual: EliminationBannerVisual
): EliminationBannerTypography {
  const typo = {
    ...DEFAULT_ELIMINATION_BANNER_TYPOGRAPHY,
    ...visual.elimBannerTypography,
  };
  const layout = visual.elimBannerFullLayout ?? DEFAULT_ELIMINATION_BANNER_FULL_LAYOUT;
  return {
    eliminated: typo.eliminated,
    placement: layout.placement?.fontSize ?? typo.placement,
    tag: layout.teamName?.fontSize ?? typo.tag,
  };
}

export function resolveEliminationBannerTextFontFamily(visual: EliminationBannerVisual): string {
  return getEliminationBannerFontCssFamily(visual.elimBannerFontFamily);
}

export interface EliminationBannerVisual {
  /**
   * Lama banner bertahan di layar sebelum transisi keluar, dalam detik.
   *
   * Dulu nilainya di-hardcode 5,5 detik di OverallRankingView, padahal First
   * Blood dan Terminator sama-sama punya `displaySeconds` yang bisa diatur.
   * Dijadikan setelan supaya ketiganya seragam.
   */
  elimBannerDisplaySeconds: number;
  elimBannerDesignMode: EliminationBannerDesignMode;
  /** Custom Image: fullLink = satu gambar; panelLinks = logo/main/#/nama */
  elimBannerCustomImageVariant: EliminationBannerCustomImageVariant;
  /** Gambar penuh (PNG/JPG/SVG URL) — Custom Image (LINK) */
  elimBannerFullImageUrl: string;
  /** contain = gambar utuh, pinggir transparan · cover = isi penuh, boleh crop */
  elimBannerFullImageFit: EliminationBannerFullImageFit;
  /** Skala lebar gambar (%) — mode Utuh; 100 = pas, >100 = lebih besar */
  elimBannerFullImageZoom: number;
  /** Posisi gambar saat cover (%) */
  elimBannerFullImagePosX: number;
  elimBannerFullImagePosY: number;
  elimBannerLogoBg: string;
  elimBannerMainBg: string;
  elimBannerMainBgEnd: string;
  elimBannerPlacementBg: string;
  elimBannerNameBg: string;
  /** Latar panel logo (bukan logo tim — tim dari alert) */
  elimBannerLogoBgImage: string;
  elimBannerMainBgImage: string;
  elimBannerPlacementBgImage: string;
  elimBannerNameBgImage: string;
  elimBannerMainText: string;
  elimBannerTagText: string;
  elimBannerPlacementText: string;
  elimBannerNameText: string;
  elimBannerSubtitleText: string;
  /** Tampilkan teks tim / # / ELIMINATED di atas gambar custom */
  elimBannerShowTextOverlay: boolean;
  /** Posisi elemen di mode gambar penuh (% dari lebar/tinggi banner) */
  elimBannerFullLayout: EliminationBannerFullOverlayLayout;
  /** Ukuran font (px) — ELIMINATED, #, TAG */
  elimBannerTypography?: EliminationBannerTypography;
  /** ID font — lihat ELIMINATION_BANNER_FONT_FAMILY_OPTIONS */
  elimBannerFontFamily?: string;
}

export const DEFAULT_ELIMINATION_BANNER_VISUAL: EliminationBannerVisual = {
  // 5,5 detik = nilai hardcoded yang berlaku sebelumnya, dipertahankan sebagai
  // default supaya tampilan yang sudah disetel tidak berubah.
  elimBannerDisplaySeconds: 5.5,
  elimBannerDesignMode: 'panels',
  elimBannerCustomImageVariant: 'fullLink',
  elimBannerFullImageUrl: '',
  elimBannerFullImageFit: 'contain',
  elimBannerFullImageZoom: 100,
  elimBannerFullImagePosX: 50,
  elimBannerFullImagePosY: 50,
  elimBannerLogoBg: '#F4F6F1',
  elimBannerMainBg: '#74A57F',
  elimBannerMainBgEnd: '#4F7F5B',
  elimBannerPlacementBg: '#F4F6F1',
  elimBannerNameBg: '#141414',
  elimBannerLogoBgImage: '',
  elimBannerMainBgImage: '',
  elimBannerPlacementBgImage: '',
  elimBannerNameBgImage: '',
  elimBannerMainText: '#ffffff',
  elimBannerTagText: '#E8E8E8',
  elimBannerPlacementText: '#000000',
  elimBannerNameText: '#ffffff',
  elimBannerSubtitleText: '#74A57F',
  elimBannerShowTextOverlay: true,
  elimBannerFullLayout: DEFAULT_ELIMINATION_BANNER_FULL_LAYOUT,
  elimBannerTypography: DEFAULT_ELIMINATION_BANNER_TYPOGRAPHY,
};

export const ELIMINATION_BANNER_BG_COLOR_KEYS = [
  'elimBannerLogoBg',
  'elimBannerMainBg',
  'elimBannerMainBgEnd',
  'elimBannerPlacementBg',
  'elimBannerNameBg',
] as const;

export const ELIMINATION_BANNER_TEXT_COLOR_KEYS = [
  'elimBannerMainText',
  'elimBannerTagText',
  'elimBannerPlacementText',
  'elimBannerNameText',
  'elimBannerSubtitleText',
] as const;

/** Warna teks overlay Custom Image — tanpa ELIMINATED (sudah di gambar) */
export const ELIMINATION_BANNER_TEXT_COLOR_KEYS_CUSTOM_IMAGE =
  ELIMINATION_BANNER_TEXT_COLOR_KEYS.filter(
    (k) => k !== 'elimBannerMainText' && k !== 'elimBannerTagText'
  ) as Exclude<
    (typeof ELIMINATION_BANNER_TEXT_COLOR_KEYS)[number],
    'elimBannerMainText' | 'elimBannerTagText'
  >[];

export const ELIMINATION_BANNER_COLOR_KEYS = [
  ...ELIMINATION_BANNER_BG_COLOR_KEYS,
  ...ELIMINATION_BANNER_TEXT_COLOR_KEYS,
] as const;

export type EliminationBannerColorKey = (typeof ELIMINATION_BANNER_COLOR_KEYS)[number];

export const ELIMINATION_BANNER_CUSTOM_PANEL_IMAGE_KEYS = [
  'elimBannerLogoBgImage',
  'elimBannerMainBgImage',
  'elimBannerPlacementBgImage',
  'elimBannerNameBgImage',
] as const;

export const ELIMINATION_BANNER_IMAGE_KEYS = [
  'elimBannerFullImageUrl',
  ...ELIMINATION_BANNER_CUSTOM_PANEL_IMAGE_KEYS,
] as const;

export type EliminationBannerImageKey = (typeof ELIMINATION_BANNER_IMAGE_KEYS)[number];

/** @deprecated use ELIMINATION_BANNER_COLOR_KEYS */
export const ELIMINATION_BANNER_VISUAL_KEYS = ELIMINATION_BANNER_COLOR_KEYS;

export function pickEliminationBannerVisual(
  config: Partial<EliminationBannerVisual> | null | undefined
): EliminationBannerVisual {
  const base = { ...DEFAULT_ELIMINATION_BANNER_VISUAL, ...config };
  const layout = config?.elimBannerFullLayout;
  const typo = {
    ...DEFAULT_ELIMINATION_BANNER_TYPOGRAPHY,
    ...config?.elimBannerTypography,
  };
  const placementFont = layout?.placement?.fontSize ?? typo.placement;
  const tagFont = layout?.teamName?.fontSize ?? typo.tag;
  const mergedTypo: EliminationBannerTypography = {
    eliminated: typo.eliminated,
    placement: placementFont,
    tag: tagFont,
  };
  return {
    ...base,
    elimBannerFontFamily: resolveEliminationBannerFontFamilyId(config?.elimBannerFontFamily),
    elimBannerTypography: mergedTypo,
    elimBannerFullLayout: {
      logo: { ...DEFAULT_ELIMINATION_BANNER_FULL_LAYOUT.logo, ...layout?.logo },
      placement: {
        ...DEFAULT_ELIMINATION_BANNER_FULL_LAYOUT.placement,
        ...layout?.placement,
        fontSize: placementFont,
      },
      teamName: {
        ...DEFAULT_ELIMINATION_BANNER_FULL_LAYOUT.teamName,
        ...layout?.teamName,
        fontSize: tagFont,
      },
    },
  };
}

/** Custom Image: logo / # / TAG dari sistem selalu tampil (fullLink & Panel BG LINK) */
export function shouldShowCustomImageTeamOverlays(visual: EliminationBannerVisual): boolean {
  return visual.elimBannerDesignMode === 'full';
}

/** Mode Panel: logo, #, TAG, ELIMINATED selalu tampil — hanya warna yang diatur */
export function isEliminationBannerPanelDesignMode(
  visual: EliminationBannerVisual
): boolean {
  return visual.elimBannerDesignMode === 'panels';
}

/** Posisi absolute dengan anchor di titik (x%, y%) */
export function fullOverlayAnchorStyle(
  slot: EliminationBannerFullSlot
): CSSProperties {
  return {
    position: 'absolute',
    left: `${slot.x}%`,
    top: `${slot.y}%`,
    transform: 'translate(-50%, -50%)',
    display: slot.visible ? undefined : 'none',
  };
}

export const ELIMINATION_BANNER_COLOR_LABELS: Record<EliminationBannerColorKey, string> = {
  elimBannerLogoBg: 'LOGO BG',
  elimBannerMainBg: 'MAIN BG 1',
  elimBannerMainBgEnd: 'MAIN BG 2',
  elimBannerPlacementBg: '# PLACEMENT BG',
  elimBannerNameBg: 'NAMA TIM BG',
  elimBannerMainText: 'ELIMINATED TEXT',
  elimBannerTagText: 'TAG TEXT',
  elimBannerPlacementText: '# TEXT',
  elimBannerNameText: 'TAG TEXT',
  elimBannerSubtitleText: 'SUBTITLE',
};

export const ELIMINATION_BANNER_IMAGE_LABELS: Record<EliminationBannerImageKey, string> = {
  elimBannerFullImageUrl: 'CUSTOM IMAGE (LINK)',
  elimBannerLogoBgImage: 'LOGO PANEL BG (LINK)',
  elimBannerMainBgImage: 'MAIN PANEL (LINK)',
  elimBannerPlacementBgImage: '# PANEL (LINK)',
  elimBannerNameBgImage: 'NAMA PANEL (LINK)',
};

export type EliminationBannerImageSizeHint = {
  /** Ukuran area panel di layar (px) — bukan batas maksimum file */
  canvas: string;
  /** Rasio lebar:tinggi agar crop `cover` tidak aneh */
  ratio: string;
};

/** Petunjuk ukuran aset per panel (banner tinggi 96px di canvas 1080p) */
export const ELIMINATION_BANNER_IMAGE_SIZE_HINTS: Record<
  EliminationBannerImageKey,
  EliminationBannerImageSizeHint
> = {
  elimBannerFullImageUrl: { canvas: '560 × 96', ratio: '~5.8 : 1' },
  elimBannerLogoBgImage: { canvas: '104 × 96', ratio: '~1 : 1' },
  elimBannerMainBgImage: { canvas: '320 × 96', ratio: '~3.3 : 1' },
  elimBannerPlacementBgImage: { canvas: '140 × 48', ratio: '~2.9 : 1' },
  elimBannerNameBgImage: { canvas: '140 × 48', ratio: '~2.9 : 1' },
};

/** Untuk OBS / scale banner >100% — 2× canvas tetap tajam, file tetap ringan jika PNG dioptimasi */
export const ELIMINATION_BANNER_IMAGE_LINK_NOTE =
  'Link https/ CDN sama kualitasnya dengan lokal. Mode Utuh: kanvas 16:9, seluruh PNG tampil, area kosong transparan (OBS) — aset disarankan 16:9 (mis. 1920×1080). Mode Penuh: strip banner, tepi boleh terpotong. PNG transparan disarankan.';

export const ELIMINATION_BANNER_FULL_IMAGE_FIT_NOTE =
  'Utuh: kanvas 16:9 (640×360), seluruh PNG tampil, pinggir transparan — ideal untuk aset 1920×1080 / 1280×720. Zoom gambar % di bawah. Penuh: strip banner klasik (560×96), boleh crop.';

/** ClassName wadah gambar penuh — Utuh = 16:9, Penuh = strip panel */
export function fullCustomImageContainerClass(fit: EliminationBannerFullImageFit): string {
  if (fit === 'contain') {
    return 'relative flex items-stretch w-[640px] max-w-[min(720px,92vw)] aspect-video overflow-hidden bg-transparent';
  }
  return 'relative flex items-stretch h-[96px] min-w-[560px] max-w-[720px] overflow-hidden bg-transparent';
}

export const ELIMINATION_BANNER_FULL_LAYOUT_NOTE =
  'Atur posisi overlay logo / # / nama (%). Pakai Preview Sementara sambil geser angka.';

export function fullCustomImageBackgroundStyle(
  imageUrl: string,
  fit: EliminationBannerFullImageFit,
  posX: number,
  posY: number,
  zoom = 100
): CSSProperties {
  const url = imageUrl.trim();
  const z = Math.min(300, Math.max(25, zoom));
  const styles: CSSProperties = {
    backgroundColor: 'transparent',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: `${posX}% ${posY}%`,
  };
  if (fit === 'contain') {
    styles.backgroundSize = `${z}% auto`;
  } else {
    styles.backgroundSize = 'cover';
  }
  if (isValidImageUrl(url)) {
    styles.backgroundImage = `url("${url.replace(/"/g, '%22')}")`;
  }
  return styles;
}

export function isValidImageUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  return (
    t.startsWith('http://') ||
    t.startsWith('https://') ||
    t.startsWith('data:image/') ||
    t.startsWith('/')
  );
}

export function panelSurfaceStyle(
  color: string,
  imageUrl: string,
  gradient?: string
): CSSProperties {
  const url = imageUrl.trim();
  if (isValidImageUrl(url)) {
    return {
      backgroundColor: color,
      backgroundImage: `url("${url.replace(/"/g, '%22')}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }
  if (gradient) {
    return { background: gradient };
  }
  return { backgroundColor: color };
}

/**
 * Batas aman durasi banner eliminasi (detik).
 *
 * Kelipatan 0,5 supaya 5,5 detik — nilai lama — tetap bisa dipilih persis.
 */
export const clampElimBannerDisplaySeconds = (value: number): number => {
  if (!Number.isFinite(value)) return DEFAULT_ELIMINATION_BANNER_VISUAL.elimBannerDisplaySeconds;
  return Math.max(1, Math.min(30, Math.round(value * 2) / 2));
};
