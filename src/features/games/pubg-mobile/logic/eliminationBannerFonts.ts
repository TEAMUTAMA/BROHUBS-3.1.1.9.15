/** Daftar font overlay (elimination banner, overall ranking, top fragger) */

export interface EliminationBannerFontFamilyOption {
  /** ID disimpan di BROHUBS_LEADERBOARD_VISUAL */
  id: string;
  label: string;
  cssFamily: string;
  /** Nama family di Google Fonts (jika ada) */
  googleFamily?: string;
}

const q = (name: string, fallback = 'Arial, Helvetica, sans-serif') =>
  `"${name}", ${fallback}` as const;

export const ELIMINATION_BANNER_FONT_FAMILY_OPTIONS: readonly EliminationBannerFontFamilyOption[] =
  [
    { id: 'arial', label: 'Arial', cssFamily: 'Arial, Helvetica, sans-serif' },
    { id: 'ethnocentric', label: 'Ethnocentric', cssFamily: q('Ethnocentric') },
    { id: 'orbitron', label: 'Orbitron', cssFamily: q('Orbitron'), googleFamily: 'Orbitron' },
    { id: 'nulshock', label: 'Nulshock', cssFamily: q('Nulshock') },
    { id: 'azonix', label: 'Azonix', cssFamily: q('Azonix') },
    { id: 'neuropol', label: 'Neuropol', cssFamily: q('Neuropol') },
    { id: 'exan-3', label: 'Exan-3', cssFamily: q('Exan-3') },
    { id: 'anurati', label: 'Anurati', cssFamily: q('Anurati') },
    { id: 'nexa-rust', label: 'Nexa Rust', cssFamily: q('Nexa Rust') },
    { id: 'microgramma', label: 'Microgramma', cssFamily: q('Microgramma') },
    { id: 'eurostile-extended', label: 'Eurostile Extended', cssFamily: q('Eurostile Extended') },
    {
      id: 'black-ops-one',
      label: 'Black Ops One',
      cssFamily: q('Black Ops One'),
      googleFamily: 'Black Ops One',
    },
    {
      id: 'amboy',
      label: 'AMBOY',
      cssFamily: q('AMBOY'),
    },
    {
      id: 'industry-black',
      label: 'Industry Black',
      cssFamily: q('Industry Black'),
    },
    {
      id: 'teko-extra-bold',
      label: 'Teko ExtraBold',
      cssFamily: q('Teko ExtraBold'),
    },
    { id: 'teko', label: 'Teko', cssFamily: q('Teko'), googleFamily: 'Teko' },
    {
      id: 'bebas-neue',
      label: 'Bebas Neue',
      cssFamily: q('Bebas Neue'),
      googleFamily: 'Bebas Neue',
    },
    { id: 'anton', label: 'Anton', cssFamily: q('Anton'), googleFamily: 'Anton' },
    { id: 'russo-one', label: 'Russo One', cssFamily: q('Russo One'), googleFamily: 'Russo One' },
    { id: 'vermin-vibes-1989', label: 'Vermin Vibes 1989', cssFamily: q('Vermin Vibes 1989') },
    { id: 'thunder', label: 'Thunder', cssFamily: q('Thunder') },
    { id: 'badaboom-bb', label: 'Badaboom BB', cssFamily: q('Badaboom BB') },
    { id: 'headliner-no-45', label: 'Headliner No. 45', cssFamily: q('Headliner No. 45') },
    { id: 'korataki', label: 'Korataki', cssFamily: q('Korataki') },
    { id: 'cyberway-riders', label: 'Cyberway Riders', cssFamily: q('Cyberway Riders') },
    { id: 'aquire', label: 'Aquire', cssFamily: q('Aquire') },
    { id: 'xirod', label: 'Xirod', cssFamily: q('Xirod') },
    {
      id: 'blade-runner-movie-font',
      label: 'Blade Runner Movie Font',
      cssFamily: q('Blade Runner Movie Font'),
    },
    { id: 'overseer', label: 'Overseer', cssFamily: q('Overseer') },
    { id: 'space-age', label: 'Space Age', cssFamily: q('Space Age') },
    { id: 'horizon', label: 'Horizon', cssFamily: q('Horizon') },
    { id: 'audiowide', label: 'Audiowide', cssFamily: q('Audiowide'), googleFamily: 'Audiowide' },
    { id: 'rajdhani', label: 'Rajdhani', cssFamily: q('Rajdhani'), googleFamily: 'Rajdhani' },
    { id: 'oxanium', label: 'Oxanium', cssFamily: q('Oxanium'), googleFamily: 'Oxanium' },
    {
      id: 'chakra-petch',
      label: 'Chakra Petch',
      cssFamily: q('Chakra Petch'),
      googleFamily: 'Chakra Petch',
    },
    { id: 'exo-2', label: 'Exo 2', cssFamily: q('Exo 2'), googleFamily: 'Exo 2' },
    { id: 'michroma', label: 'Michroma', cssFamily: q('Michroma'), googleFamily: 'Michroma' },
    { id: 'quantico', label: 'Quantico', cssFamily: q('Quantico'), googleFamily: 'Quantico' },
    { id: 'bank-gothic', label: 'Bank Gothic', cssFamily: q('Bank Gothic') },
    { id: 'agency-fb', label: 'Agency FB', cssFamily: q('Agency FB') },
    { id: 'reaver', label: 'Reaver', cssFamily: q('Reaver') },
    { id: 'akira-expanded', label: 'Akira Expanded', cssFamily: q('Akira Expanded') },
    { id: 'gtek-technology', label: 'Gtek Technology', cssFamily: q('Gtek Technology') },
    { id: 'nasalization', label: 'Nasalization', cssFamily: q('Nasalization') },
    { id: 'hemi-head', label: 'Hemi Head', cssFamily: q('Hemi Head') },
    { id: 'hyperion', label: 'Hyperion', cssFamily: q('Hyperion') },
    { id: 'gunship', label: 'Gunship', cssFamily: q('Gunship') },
    { id: 'proxon', label: 'Proxon', cssFamily: q('Proxon') },
    { id: 'zekton', label: 'Zekton', cssFamily: q('Zekton') },
    { id: 'righteous', label: 'Righteous', cssFamily: q('Righteous'), googleFamily: 'Righteous' },
    { id: 'aldrich', label: 'Aldrich', cssFamily: q('Aldrich'), googleFamily: 'Aldrich' },
    { id: 'tomorrow', label: 'Tomorrow', cssFamily: q('Tomorrow'), googleFamily: 'Tomorrow' },
    { id: 'syncopate', label: 'Syncopate', cssFamily: q('Syncopate'), googleFamily: 'Syncopate' },
    {
      id: 'kdam-thmor-pro',
      label: 'Kdam Thmor Pro',
      cssFamily: q('Kdam Thmor Pro'),
      googleFamily: 'Kdam Thmor Pro',
    },
    {
      id: 'bebas',
      label: 'Bebas',
      cssFamily: q('Bebas Neue', 'Bebas, sans-serif'),
      googleFamily: 'Bebas Neue',
    },
    { id: 'inter', label: 'Inter', cssFamily: q('Inter'), googleFamily: 'Inter' },
    { id: 'roboto', label: 'Roboto', cssFamily: q('Roboto'), googleFamily: 'Roboto' },
    {
      id: 'montserrat',
      label: 'Montserrat',
      cssFamily: q('Montserrat'),
      googleFamily: 'Montserrat',
    },
    { id: 'oswald', label: 'Oswald', cssFamily: q('Oswald'), googleFamily: 'Oswald' },
    { id: 'poppins', label: 'Poppins', cssFamily: q('Poppins'), googleFamily: 'Poppins' },
  ] as const;

/** Alias — dipakai semua overlay */
export const OVERLAY_FONT_FAMILY_OPTIONS = ELIMINATION_BANNER_FONT_FAMILY_OPTIONS;

/** Nama font lama (string) → id */
const LEGACY_FONT_NAME_TO_ID: Record<string, EliminationBannerFontFamilyId> = {
  Inter: 'inter',
  Roboto: 'roboto',
  Montserrat: 'montserrat',
  Oswald: 'oswald',
  'Bebas Neue': 'bebas-neue',
  'Chakra Petch': 'chakra-petch',
  Orbitron: 'orbitron',
  Poppins: 'poppins',
  Arial: 'arial',
};

export type EliminationBannerFontFamilyId =
  (typeof ELIMINATION_BANNER_FONT_FAMILY_OPTIONS)[number]['id'];

export type OverlayFontFamilyOption = EliminationBannerFontFamilyOption;
export type OverlayFontFamilyId = EliminationBannerFontFamilyId;

export const DEFAULT_ELIMINATION_BANNER_FONT_FAMILY_ID: EliminationBannerFontFamilyId =
  'orbitron';

export const DEFAULT_OVERLAY_FONT_FAMILY_ID = DEFAULT_ELIMINATION_BANNER_FONT_FAMILY_ID;

const FONT_BY_ID = new Map(
  ELIMINATION_BANNER_FONT_FAMILY_OPTIONS.map((f) => [f.id, f] as const)
);

export function resolveEliminationBannerFontFamilyId(
  id: string | undefined | null
): EliminationBannerFontFamilyId {
  if (!id) return DEFAULT_ELIMINATION_BANNER_FONT_FAMILY_ID;
  if (FONT_BY_ID.has(id)) return id as EliminationBannerFontFamilyId;
  const byLabel = ELIMINATION_BANNER_FONT_FAMILY_OPTIONS.find((f) => f.label === id);
  if (byLabel) return byLabel.id;
  const legacy = LEGACY_FONT_NAME_TO_ID[id];
  if (legacy) return legacy;
  return DEFAULT_ELIMINATION_BANNER_FONT_FAMILY_ID;
}

export const resolveOverlayFontFamilyId = resolveEliminationBannerFontFamilyId;

export function getEliminationBannerFontCssFamily(id: string | undefined | null): string {
  const resolved = resolveEliminationBannerFontFamilyId(id);
  return FONT_BY_ID.get(resolved)!.cssFamily;
}

export const getOverlayFontCssFamily = getEliminationBannerFontCssFamily;

const GOOGLE_WEIGHTS = '400;700;900';

export const ELIMINATION_BANNER_GOOGLE_FONT_FAMILIES = [
  ...new Set(
    ELIMINATION_BANNER_FONT_FAMILY_OPTIONS.map((f) => f.googleFamily).filter(
      (g): g is string => Boolean(g)
    )
  ),
];

export const ELIMINATION_BANNER_GOOGLE_FONTS_HREF = `https://fonts.googleapis.com/css2?${ELIMINATION_BANNER_GOOGLE_FONT_FAMILIES.map(
  (family) =>
    `family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@${GOOGLE_WEIGHTS}`
).join('&')}&display=swap`;

export const ELIMINATION_BANNER_GOOGLE_FONTS_LINK_ID = 'brohubs-overlay-fonts';
export const OVERLAY_GOOGLE_FONTS_LINK_ID = ELIMINATION_BANNER_GOOGLE_FONTS_LINK_ID;

export function ensureEliminationBannerGoogleFontsLoaded(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(ELIMINATION_BANNER_GOOGLE_FONTS_LINK_ID)) return;
  const link = document.createElement('link');
  link.id = ELIMINATION_BANNER_GOOGLE_FONTS_LINK_ID;
  link.rel = 'stylesheet';
  link.href = ELIMINATION_BANNER_GOOGLE_FONTS_HREF;
  document.head.appendChild(link);
}

export const ensureOverlayGoogleFontsLoaded = ensureEliminationBannerGoogleFontsLoaded;
