import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import TeamRosterView from '@/features/games/mobile-legends/overlays/theme-01/team-roster/TeamRosterView';
import { useSharedState } from '@/lib/useSharedState';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { notifyCompanionData } from '@/features/companion/overlayData';
import OverlayFontFamilySelect from '@/components/shared/OverlayFontFamilySelect';
import { getOverlayFontCssFamily } from '@/features/games/mobile-legends/logic/eliminationBannerFonts';
import { loadProjectPlayers } from '@/lib/projectPlayers';
import {
  resolveProjectScopeFromLocation,
  resolveProjectScopeFromLocationAsync,
} from '@/lib/outputRoute';
import { notifyCompanionTrigger } from '@/features/companion/companionProgram';
import { buildRosterTeamsFromProject } from '@/features/games/mobile-legends/logic/teamRosterSync';
import type { PlayerData } from '@/types';

const DRAF_N_PICK_BLUE_SIDE_ASSET = '/MLBB/THEME%201/Draf%20N%20Pick/Left.webp';
const DRAF_N_PICK_CENTER_ASSET = '/MLBB/THEME%201/Draf%20N%20Pick/Center.webp';
const DRAF_N_PICK_RED_SIDE_ASSET = '/MLBB/THEME%201/Draf%20N%20Pick/Right.webp';
const DRAF_N_PICK_HERO_ASSET_ROOT = '/MLBB/MYTHIC_ARENA_DRAFT/HeroPick';
const DRAF_N_PICK_HERO_VIDEO_ROOT = '/MLBB/HeroVideo/optimized';
const DRAF_N_PICK_BAN_HERO_COLOR_ROOT = '/MLBB/HeroImage/Hero All Mlbb New';
const DRAF_N_PICK_BAN_HERO_BW_ROOT = '/MLBB/HeroImage/Hero Ban Hitam Putih';
const DRAF_N_PICK_BAN_COLOR_TO_BW_MS = 500;
// Durasi animasi masuk ban (FADE kosong -> ada) & crossfade warna -> hitam putih.
const DRAF_N_PICK_BAN_ENTER_MS = 550;
const DRAF_N_PICK_BAN_FADE_MS = 700;
// Durasi animasi masuk pick (luar frame -> dalam frame).
const DRAF_N_PICK_PICK_ENTER_MS = 550;
// Durasi fade-out foto pemain saat berganti ke media hero.
// Foto pemain tetap di tempat (tidak geser) lalu memudar, video hero baru masuk dari luar frame.
const DRAF_N_PICK_PLAYER_FADE_MS = 380;
const DRAF_N_PICK_DATA_KEY = 'BROHUBS_MLBB_DRAFNPICK_DATA_PLAYER_HERO_SWAP';
const DRAF_N_PICK_LAYOUT_KEY = 'BROHUBS_MLBB_DRAFNPICK_LAYOUT_UI_DELTA_CENTER_FIXED';
const DRAF_N_PICK_ANIMATION_KEY = 'BROHUBS_MLBB_DRAFNPICK_ANIMATION_TRUE_OUT_FRAME';
const DRAF_N_PICK_TEAM_NAME_VISUAL_KEY = 'BROHUBS_MLBB_DRAFNPICK_TEAM_NAME_VISUAL_DELTA_POS_DEFAULT';
// Pengaturan muat nama tim: auto-fit (font mengecil agar tidak melebihi box) + wrap multi-baris.
const DRAF_N_PICK_TEAM_NAME_FIT_KEY = 'BROHUBS_MLBB_DRAFNPICK_TEAM_NAME_FIT';
const DRAF_N_PICK_PICK_SLOT_VISUAL_KEY = 'BROHUBS_MLBB_DRAFNPICK_PICK_SLOT_VISUAL_DELTA';
const DRAF_N_PICK_BAN_SLOT_VISUAL_KEY = 'BROHUBS_MLBB_DRAFNPICK_BAN_SLOT_VISUAL_DELTA';
// Crop/ukuran foto pemain terpisah dari hero pick (nanti dipakai juga untuk opsi logo tim).
// Penyesuaian OBJEK (foto pemain / logo) DI DALAM kotak crop — terpisah dari Area Crop.
// Per sisi (blue/red) & per mode (photo/logo): geser X/Y + zoom. Kotak crop tetap di tempat.
const DRAF_N_PICK_OBJECT_ADJUST_KEY = 'BROHUBS_MLBB_DRAFNPICK_OBJECT_ADJUST';

interface ObjectAdjust {
  x: number;
  y: number;
  scale: number;
  // Cara memuat objek di kotak: 'cover' = penuh (bisa terpotong), 'contain' = utuh (tampil penuh).
  fit?: 'cover' | 'contain';
}

interface ObjectAdjustSide {
  photo: ObjectAdjust;
  logo: ObjectAdjust;
}

interface ObjectAdjustMap {
  blue: ObjectAdjustSide;
  red: ObjectAdjustSide;
}

const DEFAULT_OBJECT_ADJUST: ObjectAdjust = { x: 0, y: 0, scale: 100 };

// Base geser vertikal objek foto (dipakai bila perlu). Head-crop diatasi via object-position: top,
// jadi base = 0; "Geser Y" di UI tetap bisa menaikkan/menurunkan. Logo tim tidak digeser.
const PLAYER_PHOTO_OBJECT_BASE_Y = 0;

const DEFAULT_OBJECT_ADJUST_MAP: ObjectAdjustMap = {
  blue: { photo: { ...DEFAULT_OBJECT_ADJUST }, logo: { ...DEFAULT_OBJECT_ADJUST } },
  red: { photo: { ...DEFAULT_OBJECT_ADJUST }, logo: { ...DEFAULT_OBJECT_ADJUST } },
};

const normalizeObjectAdjust = (o: Partial<ObjectAdjust> | undefined): ObjectAdjust => ({
  x: o?.x ?? 0,
  y: o?.y ?? 0,
  scale: typeof o?.scale === 'number' && o.scale > 0 ? o.scale : 100,
  fit: o?.fit === 'contain' || o?.fit === 'cover' ? o.fit : undefined,
});

const normalizeObjectAdjustSide = (s: Partial<ObjectAdjustSide> | undefined): ObjectAdjustSide => ({
  photo: normalizeObjectAdjust(s?.photo),
  logo: normalizeObjectAdjust(s?.logo),
});

// Kotak/crop foto pemain kini PER-MODE (photo & logo punya posisi/ukuran sendiri) & per sisi.
const DRAF_N_PICK_PLAYER_BOX_KEY = 'BROHUBS_MLBB_DRAFNPICK_PLAYER_BOX_MODE';

interface PlayerBoxSide {
  photo: PickSlotVisualPart;
  logo: PickSlotVisualPart;
}

interface PlayerBoxMap {
  blue: PlayerBoxSide;
  red: PlayerBoxSide;
}

const EMPTY_BOX_PART: PickSlotVisualPart = { x: 0, y: 0, width: 0, height: 0 };

const DEFAULT_PLAYER_BOX_MAP: PlayerBoxMap = {
  blue: { photo: { ...EMPTY_BOX_PART }, logo: { ...EMPTY_BOX_PART } },
  red: { photo: { ...EMPTY_BOX_PART }, logo: { ...EMPTY_BOX_PART } },
};

const normalizePlayerBoxPart = (p: Partial<PickSlotVisualPart> | undefined): PickSlotVisualPart => ({
  x: p?.x ?? 0,
  y: p?.y ?? 0,
  width: p?.width ?? 0,
  height: p?.height ?? 0,
});

const normalizePlayerBoxSide = (s: Partial<PlayerBoxSide> | undefined): PlayerBoxSide => ({
  photo: normalizePlayerBoxPart(s?.photo),
  logo: normalizePlayerBoxPart(s?.logo),
});
// Posisi/ukuran logo tim di panel tengah (pojok kiri-bawah = biru, kanan-bawah = merah).
const DRAF_N_PICK_LOGO_VISUAL_KEY = 'BROHUBS_MLBB_DRAFNPICK_LOGO_VISUAL_DELTA';
// Visual tulisan fase (Ban/Pick) di panel tengah.
const DRAF_N_PICK_PHASE_VISUAL_KEY = 'BROHUBS_MLBB_DRAFNPICK_PHASE_VISUAL_DELTA';
// Panah penunjuk tim yang sedang giliran (di bawah tulisan fase).
// Posisi panah kiri & kanan (offset dari base masing-masing) + gambar custom (base64) dari PC untuk kedua panah.
const DRAF_N_PICK_PHASE_ARROW_KEY = 'BROHUBS_MLBB_DRAFNPICK_PHASE_ARROW_LR';
const DRAF_N_PICK_PHASE_ARROW_IMAGE_KEY = 'BROHUBS_MLBB_DRAFNPICK_PHASE_ARROW_IMAGE';
// Icon Gembok di slot Ban 4 & 5: tampil selama slot masih "terkunci" (fase ban kedua tim tsb
// belum dimulai), lalu fade-out begitu giliran Ban 4 sisi tersebut tiba (blue: #14, red: #13).
const DRAF_N_PICK_BAN_LOCK_KEY = 'BROHUBS_MLBB_DRAFNPICK_BAN_LOCK';

// Konfigurasi Icon Gembok: gambar custom (base64/link; kosong = gembok putih default)
// + offset posisi/ukuran dari kotak slot ban (berlaku sama untuk keempat gembok).
interface BanLockConfig {
  image: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEFAULT_BAN_LOCK_CONFIG: BanLockConfig = { image: '', x: 0, y: 0, width: 0, height: 0 };

const normalizeBanLockConfig = (c?: Partial<BanLockConfig> | null): BanLockConfig => ({
  image: typeof c?.image === 'string' ? c.image : '',
  x: typeof c?.x === 'number' ? c.x : 0,
  y: typeof c?.y === 'number' ? c.y : 0,
  width: typeof c?.width === 'number' ? c.width : 0,
  height: typeof c?.height === 'number' ? c.height : 0,
});

// Deteksi apakah sumber media panah = video (data URL video, atau ekstensi video pada link).
const isPhaseArrowVideo = (src: string): boolean => {
  const s = (src || '').trim().toLowerCase();
  if (s.startsWith('data:video')) return true;
  if (s.startsWith('data:image')) return false;
  return /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/.test(s);
};
// Visual teks nama pemain per slot pick (posisi/ukuran/font). Offset dari posisi dasar tiap slot.
const DRAF_N_PICK_PLAYER_NAME_VISUAL_KEY = 'BROHUBS_MLBB_DRAFNPICK_PLAYER_NAME_VISUAL_DELTA';

type DrafNPickViewProps = React.ComponentProps<typeof TeamRosterView>;

type DraftPhotoMode = 'photo' | 'logo';

interface DraftTeamData {
  name: string;
  bans: string[];
  picks: string[];
  playerPhotos: string[];
  // Nama pemain per slot pick (ditampilkan sebagai teks di bawah foto). Auto dari DB, tetap bisa custom.
  playerNames: string[];
  pickHeroImages: string[];
  logo: string;
  // Sumber gambar area pemain: 'photo' = foto pemain per slot, 'logo' = logo tim (sama untuk semua slot).
  photoMode: DraftPhotoMode;
}

interface DraftData {
  title: string;
  subtitle: string;
  phaseBanLabel: string;
  phasePickLabel: string;
  phaseDoneLabel: string;
  blue: DraftTeamData;
  red: DraftTeamData;
}

interface DraftLayoutPart {
  x: number;
  y: number;
  width: number;
  height: number;
  size?: number;
}

interface DraftLayout {
  blue: DraftLayoutPart;
  center: DraftLayoutPart;
  red: DraftLayoutPart;
}

interface TeamNameVisualPart {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  fontFamilyId?: string;
  fontType?: 'regular' | 'bold' | 'black' | 'italic' | 'bold-italic';
  color: string;
  shadowColor: string;
  shadowStrength: number;
}

interface TeamNameVisual {
  blue: TeamNameVisualPart;
  red: TeamNameVisualPart;
}

// Pengaturan muat teks nama tim di dalam box-nya.
interface TeamNameFitPart {
  // Auto-fit: font mengecil otomatis bila nama melebihi box (tidak pernah keluar box).
  autoFit: boolean;
  // Wrap: izinkan nama pindah ke baris berikutnya bila terlalu panjang.
  wrap: boolean;
  // Maksimal jumlah baris saat wrap aktif.
  maxLines: number;
}

interface TeamNameFit {
  blue: TeamNameFitPart;
  red: TeamNameFitPart;
}

const DEFAULT_TEAM_NAME_FIT: TeamNameFit = {
  blue: { autoFit: true, wrap: true, maxLines: 2 },
  red: { autoFit: true, wrap: true, maxLines: 2 },
};

const normalizeTeamNameFitPart = (part: Partial<TeamNameFitPart> | undefined): TeamNameFitPart => ({
  autoFit: part?.autoFit ?? true,
  wrap: part?.wrap ?? true,
  maxLines: Math.max(1, Math.min(4, Math.floor(part?.maxLines ?? 2))),
});

interface PickSlotVisualPart {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PickSlotVisual {
  blue: PickSlotVisualPart;
  red: PickSlotVisualPart;
}

type DraftTransitionType =
  | 'fade'
  | 'slide-right'
  | 'slide-left'
  | 'slide-up'
  | 'slide-down'
  | 'zoom'
  | 'zoom-out';

type DraftEasing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'backOut';

interface DraftAnimationTrack {
  inType: DraftTransitionType;
  outType: DraftTransitionType;
  duration: number;
  delay: number;
  easing: DraftEasing;
}

interface DraftAnimationConfig {
  sides: DraftAnimationTrack & {
    redDelayOffset: number;
  };
  center: DraftAnimationTrack;
}

const DEFAULT_DRAFT_DATA: DraftData = {
  title: 'DRAF N PICK',
  subtitle: 'MOBILE LEGENDS',
  phaseBanLabel: 'BAN PHASE',
  phasePickLabel: 'PICK PHASE',
  phaseDoneLabel: 'LAST CHANGE',
  blue: {
    name: 'BLUE TEAM',
    bans: ['BAN 1', 'BAN 2', 'BAN 3', 'BAN 4', 'BAN 5'],
    picks: ['PICK 1', 'PICK 2', 'PICK 3', 'PICK 4', 'PICK 5'],
    playerPhotos: ['', '', '', '', ''],
    playerNames: ['', '', '', '', ''],
    pickHeroImages: ['', '', '', '', ''],
    logo: '',
    photoMode: 'photo',
  },
  red: {
    name: 'RED TEAM',
    bans: ['BAN 1', 'BAN 2', 'BAN 3', 'BAN 4', 'BAN 5'],
    picks: ['PICK 1', 'PICK 2', 'PICK 3', 'PICK 4', 'PICK 5'],
    playerPhotos: ['', '', '', '', ''],
    playerNames: ['', '', '', '', ''],
    pickHeroImages: ['', '', '', '', ''],
    logo: '',
    photoMode: 'photo',
  },
};

const DRAFT_HERO_OPTIONS = [
  ['Aamon', 'aamon.png'],
  ['Akai', 'akai.png'],
  ['Aldous', 'aldous.png'],
  ['Alice', 'alice.png'],
  ['Alpha', 'alpha.png'],
  ['Alucard', 'alucard.png'],
  ['Angela', 'angela.png'],
  ['Arlott', 'arlot.png'],
  ['Atlas', 'atlas.png'],
  ['Aurora', 'aurora.png'],
  ['Badang', 'badang.png'],
  ['Balmond', 'balmond.png'],
  ['Bane', 'bane.png'],
  ['Barats', 'barats.png'],
  ['Baxia', 'baxia.png'],
  ['Beatrix', 'beatrix.png'],
  ['Benedetta', 'benedetta.png'],
  ['Brody', 'brody.png'],
  ['Bruno', 'bruno.png'],
  ['Cecilion', 'cecilion.png'],
  ["Chang'e", 'chang_e.png'],
  ['Chip', 'chip.png'],
  ['Chou', 'chou.png'],
  ['Cici', 'cici.png'],
  ['Claude', 'claude.png'],
  ['Clint', 'clint.png'],
  ['Cyclops', 'cyclops.png'],
  ['Diggie', 'diggie.png'],
  ['Dyrroth', 'dyroth.png'],
  ['Edith', 'edith.png'],
  ['Esmeralda', 'esmeralda.png'],
  ['Estes', 'estes.png'],
  ['Eudora', 'eudora.png'],
  ['Fanny', 'fanny.png'],
  ['Faramis', 'faramis.png'],
  ['Floryn', 'floryn.png'],
  ['Franco', 'franco.png'],
  ['Fredrinn', 'fredrin.png'],
  ['Freya', 'freya.png'],
  ['Gatotkaca', 'gatotkaca.png'],
  ['Gloo', 'gloo.png'],
  ['Gord', 'gord.png'],
  ['Granger', 'granger.png'],
  ['Grock', 'grock.png'],
  ['Guinevere', 'guinevere.png'],
  ['Gusion', 'gusion.png'],
  ['Hanabi', 'hanabi.png'],
  ['Hanzo', 'hanzo.png'],
  ['Harith', 'harith.png'],
  ['Harley', 'harley.png'],
  ['Hayabusa', 'hayabusa.png'],
  ['Helcurt', 'helcurt.png'],
  ['Hilda', 'hilda.png'],
  ['Hylos', 'hylos.png'],
  ['Irithel', 'irithel.png'],
  ['Ixia', 'ixia.png'],
  ['Jawhead', 'jawhead.png'],
  ['Johnson', 'johnson.png'],
  ['Joy', 'joy.png'],
  ['Julian', 'julian.png'],
  ['Kadita', 'kadita.png'],
  ['Kagura', 'kagura.png'],
  ['Kaja', 'kaja.png'],
  ['Karina', 'karina.png'],
  ['Karrie', 'karrie.png'],
  ['Khaleed', 'khaleed.png'],
  ['Khufra', 'khufra.png'],
  ['Kimmy', 'kimmy.png'],
  ['Lancelot', 'lancelot.png'],
  ['Lapu-Lapu', 'lapulapu.png'],
  ['Layla', 'layla.png'],
  ['Leomord', 'leomord.png'],
  ['Lesley', 'lesley.png'],
  ['Ling', 'ling.png'],
  ['Lolita', 'lolita.png'],
  ['Lukas', 'lukas.png'],
  ['Lunox', 'lunox.png'],
  ['Luo Yi', 'luoyi.png'],
  ['Lylia', 'lylia.png'],
  ['Martis', 'martis.png'],
  ['Masha', 'masha.png'],
  ['Mathilda', 'mathilda.png'],
  ['Melissa', 'melissa.png'],
  ['Minotaur', 'minotour.png'],
  ['Minsitthar', 'minsitthar.png'],
  ['Miya', 'miya.png'],
  ['Moskov', 'moskov.png'],
  ['Nana', 'nana.png'],
  ['Natalia', 'natalia.png'],
  ['Natan', 'nathan.png'],
  ['Nolan', 'nolan.png'],
  ['Novaria', 'novaria.png'],
  ['Odette', 'odette.png'],
  ['Paquito', 'paquito.png'],
  ['Pharsa', 'parsha.png'],
  ['Phoveus', 'phoveus.png'],
  ['Popol and Kupa', 'popolandkupa.png'],
  ['Rafaela', 'rafaela.png'],
  ['Roger', 'roger.png'],
  ['Ruby', 'ruby.png'],
  ['Saber', 'saber.png'],
  ['Selena', 'selena.png'],
  ['Silvanna', 'silvanna.png'],
  ['Sun', 'sun.png'],
  ['Suyou', 'suyou.png'],
  ['Terizla', 'terizla.png'],
  ['Thamuz', 'thamuz.png'],
  ['Tigreal', 'tigreal.png'],
  ['Uranus', 'uranus.png'],
  ['Vale', 'vale.png'],
  ['Valentina', 'valentina.png'],
  ['Valir', 'valir.png'],
  ['Vexana', 'vexana.png'],
  ['Wanwan', 'wanwan.png'],
  ['Xavier', 'xavier.png'],
  ['X.Borg', 'xborg.png'],
  ['Yin', 'yin.png'],
  ['Yi Sun-shin', 'yisunshin.png'],
  ['Yu Zhong', 'yuzhong.png'],
  ['Yve', 'yve.png'],
  ['Zhask', 'zhask.png'],
  ['Zhuxin', 'zhuxin.png'],
  ['Zilong', 'zilong.png'],
] as const;

const DRAFT_HERO_IMAGE_BY_NAME = new Map(
  DRAFT_HERO_OPTIONS.map(([name, file]) => [name.toLowerCase(), `${DRAF_N_PICK_HERO_ASSET_ROOT}/${file}`])
);

const DRAFT_HERO_VIDEO_FILE_OVERRIDES: Record<string, string> = {
  "chang'e": 'Change.mp4',
  'lapu-lapu': 'Lapu%20Lapu.mp4',
  silvanna: 'Silvana.mp4',
  suyou: 'Soyou.mp4',
  'yi sun-shin': 'Yi%20Sun%20Shin.mp4',
};

const DRAFT_HERO_VIDEO_BY_NAME = new Map(
  DRAFT_HERO_OPTIONS.map(([name]) => {
    const key = name.toLowerCase();
    const file = DRAFT_HERO_VIDEO_FILE_OVERRIDES[key] ?? `${encodeURIComponent(name)}.mp4`;
    return [key, `${DRAF_N_PICK_HERO_VIDEO_ROOT}/${file}`];
  })
);

const DRAFT_BAN_HERO_FILE_OVERRIDES: Record<string, string> = {
  "chang'e": 'Change',
  'lapu-lapu': 'Lapu Lapu',
  'luo yi': 'Luo yi',
  'x.borg': 'X.Borg',
  'yi sun-shin': 'Yi Sun Shin',
};

const DRAFT_BAN_HERO_BW_FILE_OVERRIDES: Record<string, string> = {
  ...DRAFT_BAN_HERO_FILE_OVERRIDES,
  'x.borg': 'X.borg',
};

const isKnownDraftHero = (value: string) =>
  DRAFT_HERO_OPTIONS.some(([name]) => name.toLowerCase() === value.trim().toLowerCase());

const resolveBanHeroFileStem = (value: string, bw = false) => {
  const key = value.trim().toLowerCase();
  if (!key || !isKnownDraftHero(value)) return '';
  const overrides = bw ? DRAFT_BAN_HERO_BW_FILE_OVERRIDES : DRAFT_BAN_HERO_FILE_OVERRIDES;
  if (overrides[key]) return overrides[key];
  const match = DRAFT_HERO_OPTIONS.find(([name]) => name.toLowerCase() === key);
  return match?.[0] ?? value.trim();
};

const resolveBanHeroColorImage = (value: string) => {
  const stem = resolveBanHeroFileStem(value);
  if (!stem) return '';
  return `${DRAF_N_PICK_BAN_HERO_COLOR_ROOT}/${encodeURIComponent(`${stem}.webp`)}`;
};

const resolveBanHeroBwImage = (value: string) => {
  const stem = resolveBanHeroFileStem(value, true);
  if (!stem) return '';
  return `${DRAF_N_PICK_BAN_HERO_BW_ROOT}/${encodeURIComponent(`${stem}.webp`)}`;
};

const BAN_PHOTO_SLOTS = {
  blue: [
    { x: 277, y: 35, width: 65, height: 66 },
    { x: 352, y: 35, width: 66, height: 66 },
    { x: 426, y: 35, width: 65, height: 66 },
    { x: 500, y: 35, width: 66, height: 66 },
    { x: 574, y: 35, width: 66, height: 66 },
  ],
  red: [
    { x: 384, y: 36, width: 66, height: 64 },
    { x: 310, y: 36, width: 66, height: 64 },
    { x: 237, y: 35, width: 65, height: 65 },
    { x: 164, y: 36, width: 65, height: 64 },
    { x: 88, y: 36, width: 66, height: 64 },
  ],
} as const;

const PICK_PHOTO_SLOTS = {
  blue: [
    { x: 32, y: 134, width: 122, height: 128 },
    { x: 168, y: 134, width: 121, height: 128 },
    { x: 300, y: 134, width: 122, height: 128 },
    { x: 436, y: 134, width: 122, height: 128 },
    { x: 572, y: 134, width: 123, height: 128 },
  ],
  red: [
    { x: 576, y: 134, width: 122, height: 128 },
    { x: 439, y: 134, width: 123, height: 128 },
    { x: 303, y: 134, width: 123, height: 128 },
    { x: 170, y: 134, width: 122, height: 128 },
    { x: 34, y: 134, width: 122, height: 128 },
  ],
} as const;

const DEFAULT_PICK_SLOT_VISUAL: PickSlotVisual = {
  blue: { x: 0, y: 0, width: 0, height: 0 },
  red: { x: 0, y: 0, width: 0, height: 0 },
};

// Posisi dasar logo tim relatif frame tengah (canvas lokal center 377x355).
// Biru = pojok kiri-bawah, Merah = pojok kanan-bawah. Bisa digeser via Logo Visual.
const CENTER_LOGO_SLOTS = {
  blue: { x: 14, y: 200, width: 176, height: 111 },
  red: { x: 222, y: 200, width: 121, height: 111 },
} as const;

// Kotak nama tim disetel mengikuti AREA PUTIH pada Left.webp (biru, pojok kiri-atas)
// dan Right.webp (merah, pojok kanan-atas). Koordinat lokal asset (biru 728×331, merah 729×331).
const TEAM_NAME_VISUAL_BASE: TeamNameVisual = {
  blue: {
    x: 15,
    y: 28,
    width: 247,
    height: 68,
    fontSize: 31,
    fontWeight: 900,
    italic: true,
    fontFamilyId: 'orbitron',
    fontType: 'black',
    color: '#7ee7ff',
    shadowColor: '#00c2ff',
    shadowStrength: 10,
  },
  red: {
    x: 466,
    y: 26,
    width: 246,
    height: 70,
    fontSize: 31,
    fontWeight: 900,
    italic: true,
    fontFamilyId: 'orbitron',
    fontType: 'black',
    color: '#ff61c8',
    shadowColor: '#ff26ae',
    shadowStrength: 10,
  },
};

const DEFAULT_TEAM_NAME_VISUAL: TeamNameVisual = {
  blue: {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    fontSize: 0,
    fontWeight: 0,
    italic: true,
    fontFamilyId: 'orbitron',
    fontType: 'black',
    color: '',
    shadowColor: '',
    shadowStrength: 0,
  },
  red: {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    fontSize: 0,
    fontWeight: 0,
    italic: true,
    fontFamilyId: 'orbitron',
    fontType: 'black',
    color: '',
    shadowColor: '',
    shadowStrength: 0,
  },
} as const;

// Posisi dasar tulisan fase (koordinat lokal panel tengah 377x355), teks rata tengah.
const PHASE_VISUAL_BASE: TeamNameVisualPart = {
  x: 38,
  y: 66,
  width: 300,
  height: 46,
  fontSize: 26,
  fontWeight: 900,
  italic: true,
  fontFamilyId: 'orbitron',
  fontType: 'black',
  color: '#ffffff',
  shadowColor: '#00c2ff',
  shadowStrength: 10,
};

// Posisi dasar panah penunjuk giliran, di bawah tulisan fase (koordinat lokal tengah 377x355).
// Dua panah penunjuk giliran: kiri (menunjuk kiri) & kanan (menunjuk kanan). Koordinat lokal tengah 377x355.
const PHASE_ARROW_BASE: Record<'left' | 'right', PickSlotVisualPart> = {
  left: { x: 10, y: 113, width: 150, height: 80 },
  right: { x: 217, y: 113, width: 150, height: 80 },
};

interface PhaseArrowPos {
  left: PickSlotVisualPart;
  right: PickSlotVisualPart;
}

const DEFAULT_PHASE_ARROW_POS: PhaseArrowPos = {
  left: { x: 0, y: 0, width: 0, height: 0 },
  right: { x: 0, y: 0, width: 0, height: 0 },
};

const normalizePhaseArrowPart = (
  part: Partial<PickSlotVisualPart> | undefined
): PickSlotVisualPart => ({
  x: part?.x ?? 0,
  y: part?.y ?? 0,
  width: part?.width ?? 0,
  height: part?.height ?? 0,
});

// Timer draft di panel tengah. SEMENTARA: hitung mundur otomatis durasi Ban/Pick.
// Nantinya sumber waktu akan diambil langsung dari VisionOCR (baca timer in-game).
const DRAF_N_PICK_TIMER_KEY = 'BROHUBS_MLBB_DRAFNPICK_TIMER_CONF';
const DRAF_N_PICK_TIMER_VISUAL_KEY = 'BROHUBS_MLBB_DRAFNPICK_TIMER_VISUAL';

interface DraftTimerConf {
  show: boolean;
  banSec: number;
  pickSec: number;
  // Durasi fase "Last Change" (setelah semua Ban/Pick selesai).
  lastChangeSec: number;
  // Beep 10 detik terakhir (tick 10..1) + bunyi akhir di 0.
  sound: boolean;
}

const DEFAULT_TIMER_CONF: DraftTimerConf = {
  show: true,
  banSec: 30,
  pickSec: 50,
  lastChangeSec: 30,
  sound: true,
};

const normalizeTimerConf = (c: Partial<DraftTimerConf> | undefined): DraftTimerConf => ({
  show: c?.show ?? true,
  banSec: typeof c?.banSec === 'number' && c.banSec > 0 ? Math.floor(c.banSec) : 30,
  pickSec: typeof c?.pickSec === 'number' && c.pickSec > 0 ? Math.floor(c.pickSec) : 50,
  lastChangeSec:
    typeof c?.lastChangeSec === 'number' && c.lastChangeSec > 0 ? Math.floor(c.lastChangeSec) : 30,
  sound: c?.sound ?? true,
});

// Posisi/font dasar timer (koordinat lokal panel tengah 377x355), teks rata tengah.
const TIMER_VISUAL_BASE: TeamNameVisualPart = {
  x: 88,
  y: 150,
  width: 200,
  height: 70,
  fontSize: 44,
  fontWeight: 900,
  italic: true,
  fontFamilyId: 'orbitron',
  fontType: 'black',
  color: '#ffffff',
  shadowColor: '#00c2ff',
  shadowStrength: 12,
};

const DEFAULT_TIMER_VISUAL: TeamNameVisualPart = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  fontSize: 0,
  fontWeight: 0,
  italic: true,
  fontFamilyId: '',
  fontType: 'black',
  color: '',
  shadowColor: '',
  shadowStrength: 0,
};

const resolveTimerVisual = (visual: TeamNameVisualPart): TeamNameVisualPart => ({
  x: TIMER_VISUAL_BASE.x + (visual.x ?? 0),
  y: TIMER_VISUAL_BASE.y + (visual.y ?? 0),
  width: TIMER_VISUAL_BASE.width + (visual.width ?? 0),
  height: TIMER_VISUAL_BASE.height + (visual.height ?? 0),
  fontSize: TIMER_VISUAL_BASE.fontSize + (visual.fontSize ?? 0),
  fontWeight: TIMER_VISUAL_BASE.fontWeight + (visual.fontWeight ?? 0),
  italic: visual.italic ?? TIMER_VISUAL_BASE.italic,
  fontFamilyId: visual.fontFamilyId || TIMER_VISUAL_BASE.fontFamilyId,
  fontType: visual.fontType || TIMER_VISUAL_BASE.fontType,
  color: visual.color || TIMER_VISUAL_BASE.color,
  shadowColor: visual.shadowColor || TIMER_VISUAL_BASE.shadowColor,
  shadowStrength: TIMER_VISUAL_BASE.shadowStrength + (visual.shadowStrength ?? 0),
});

const formatDraftTimer = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

const DEFAULT_PHASE_VISUAL: TeamNameVisualPart = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  fontSize: 0,
  fontWeight: 0,
  italic: true,
  fontFamilyId: 'orbitron',
  fontType: 'black',
  color: '',
  shadowColor: '',
  shadowStrength: 0,
};

// Posisi dasar teks nama pemain per slot pick, relatif top-left tiap slot foto (koordinat lokal frame sisi).
// x/y ditambahkan ke slot.x/slot.y; width ditambahkan ke slot.width (default = selebar foto). height absolut.
const PLAYER_NAME_VISUAL_BASE: TeamNameVisualPart = {
  x: 0,
  y: 132,
  width: 0,
  height: 26,
  fontSize: 15,
  fontWeight: 900,
  italic: true,
  fontFamilyId: 'orbitron',
  fontType: 'black',
  color: '#ffffff',
  shadowColor: '#000000',
  shadowStrength: 6,
};

// Nilai tersimpan = offset dari PLAYER_NAME_VISUAL_BASE (font/warna kosong = pakai base). Per sisi.
const DEFAULT_PLAYER_NAME_VISUAL: TeamNameVisual = {
  blue: {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    fontSize: 0,
    fontWeight: 0,
    italic: true,
    fontFamilyId: '',
    fontType: 'black',
    color: '',
    shadowColor: '',
    shadowStrength: 0,
  },
  red: {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    fontSize: 0,
    fontWeight: 0,
    italic: true,
    fontFamilyId: '',
    fontType: 'black',
    color: '',
    shadowColor: '',
    shadowStrength: 0,
  },
};

const DRAFT_LAYOUT_BASE: DraftLayout = {
  blue: { x: 27, y: 740, width: 728, height: 331, size: 110 },
  center: { x: 763, y: 725, width: 377, height: 355, size: 100 },
  red: { x: 1156, y: 740, width: 729, height: 331, size: 110 },
};

const DEFAULT_DRAFT_LAYOUT: DraftLayout = {
  blue: { x: 0, y: 0, width: 0, height: 0, size: 0 },
  center: { x: 0, y: 0, width: 0, height: 0, size: 0 },
  red: { x: 0, y: 0, width: 0, height: 0, size: 0 },
};

type DraftSide = 'blue' | 'red';

/** Urutan global draft MLBB per slot (index 0 = slot 1). */
const MLBB_DRAFT_BAN_ORDER: Record<DraftSide, readonly number[]> = {
  blue: [1, 3, 5, 14, 16],
  red: [2, 4, 6, 13, 15],
};

const MLBB_DRAFT_PICK_ORDER: Record<DraftSide, readonly number[]> = {
  blue: [7, 10, 11, 18, 19],
  red: [8, 9, 12, 17, 20],
};

// Meta tiap nomor urut draft (sisi + jenis).
const DRAFT_ORDER_META: Record<number, { side: DraftSide; kind: 'ban' | 'pick' }> = {};
(['blue', 'red'] as const).forEach((side) => {
  MLBB_DRAFT_BAN_ORDER[side].forEach((o) => {
    DRAFT_ORDER_META[o] = { side, kind: 'ban' };
  });
  MLBB_DRAFT_PICK_ORDER[side].forEach((o) => {
    DRAFT_ORDER_META[o] = { side, kind: 'pick' };
  });
});

// "Sesi" = run berurutan (n, n+1, …) dengan sisi & jenis SAMA → satu countdown bersama.
// Contoh: Pick 18 & 19 (blue) = satu sesi; kedua slot menyala bersamaan, timer tidak reset di antaranya.
const DRAFT_SESSION_OF_ORDER: Record<number, number> = (() => {
  const map: Record<number, number> = {};
  let sessionId = -1;
  for (let o = 1; o <= 20; o++) {
    const meta = DRAFT_ORDER_META[o];
    if (!meta) continue;
    const prev = DRAFT_ORDER_META[o - 1];
    const sameSession = !!prev && prev.side === meta.side && prev.kind === meta.kind;
    if (!sameSession) sessionId += 1;
    map[o] = sessionId;
  }
  return map;
})();

const getDraftBanOrder = (side: DraftSide, index: number) => MLBB_DRAFT_BAN_ORDER[side][index];
const getDraftPickOrder = (side: DraftSide, index: number) => MLBB_DRAFT_PICK_ORDER[side][index];
const draftBanLabel = (side: DraftSide, index: number) =>
  `#${getDraftBanOrder(side, index)} - B${index + 1}`;
const draftPickLabel = (side: DraftSide, index: number) =>
  `#${getDraftPickOrder(side, index)} - HERO P${index + 1}`;

const DEFAULT_DRAFT_ANIMATION: DraftAnimationConfig = {
  sides: {
    inType: 'slide-right',
    outType: 'slide-left',
    duration: 0.55,
    delay: 0,
    redDelayOffset: 0,
    easing: 'easeOut',
  },
  center: {
    inType: 'slide-up',
    outType: 'slide-down',
    duration: 0.55,
    delay: 0,
    easing: 'easeOut',
  },
};

const SIDE_TRANSITIONS: DraftTransitionType[] = [
  'fade',
  'slide-right',
  'slide-left',
  'slide-up',
  'slide-down',
  'zoom',
  'zoom-out',
];

const CENTER_TRANSITIONS: DraftTransitionType[] = [
  'fade',
  'zoom',
  'zoom-out',
  'slide-up',
  'slide-down',
  'slide-right',
  'slide-left',
];

const EASING_OPTIONS: DraftEasing[] = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'backOut'];

const mirrorHorizontalTransition = (transition: DraftTransitionType): DraftTransitionType => {
  if (transition === 'slide-right') return 'slide-left';
  if (transition === 'slide-left') return 'slide-right';
  return transition;
};

const easingValue = (easing: DraftEasing) => {
  if (easing === 'backOut') return [0.34, 1.56, 0.64, 1] as const;
  return easing;
};

const resolvePartSize = (part: DraftLayoutPart) => {
  const scale = (part.size ?? 100) / 100;
  return {
    width: part.width * scale,
    height: part.height * scale,
  };
};

const resolvePartFrame = (part: DraftLayoutPart) => {
  const effectiveSize = resolvePartSize(part);
  return {
    left: part.x - (effectiveSize.width - part.width) / 2,
    top: part.y - (effectiveSize.height - part.height) / 2,
    width: effectiveSize.width,
    height: effectiveSize.height,
    scaleX: effectiveSize.width / part.width,
    scaleY: effectiveSize.height / part.height,
  };
};

const resolveDraftLayoutPart = (part: keyof DraftLayout, layout: DraftLayout): DraftLayoutPart => ({
  x: DRAFT_LAYOUT_BASE[part].x + (layout[part].x ?? 0),
  y: DRAFT_LAYOUT_BASE[part].y + (layout[part].y ?? 0),
  width: DRAFT_LAYOUT_BASE[part].width + (layout[part].width ?? 0),
  height: DRAFT_LAYOUT_BASE[part].height + (layout[part].height ?? 0),
  size: DRAFT_LAYOUT_BASE[part].size + (layout[part].size ?? 0),
});

const resolveTeamNameVisualPart = (
  side: keyof TeamNameVisual,
  visual: TeamNameVisual
): TeamNameVisualPart => ({
  x: TEAM_NAME_VISUAL_BASE[side].x + (visual[side].x ?? 0),
  y: TEAM_NAME_VISUAL_BASE[side].y + (visual[side].y ?? 0),
  width: TEAM_NAME_VISUAL_BASE[side].width + (visual[side].width ?? 0),
  height: TEAM_NAME_VISUAL_BASE[side].height + (visual[side].height ?? 0),
  fontSize: TEAM_NAME_VISUAL_BASE[side].fontSize + (visual[side].fontSize ?? 0),
  fontWeight: TEAM_NAME_VISUAL_BASE[side].fontWeight + (visual[side].fontWeight ?? 0),
  italic: visual[side].italic ?? TEAM_NAME_VISUAL_BASE[side].italic,
  fontFamilyId: visual[side].fontFamilyId || TEAM_NAME_VISUAL_BASE[side].fontFamilyId,
  fontType: visual[side].fontType || TEAM_NAME_VISUAL_BASE[side].fontType,
  color: visual[side].color || TEAM_NAME_VISUAL_BASE[side].color,
  shadowColor: visual[side].shadowColor || TEAM_NAME_VISUAL_BASE[side].shadowColor,
  shadowStrength: TEAM_NAME_VISUAL_BASE[side].shadowStrength + (visual[side].shadowStrength ?? 0),
});

const resolvePhaseVisual = (visual: TeamNameVisualPart): TeamNameVisualPart => ({
  x: PHASE_VISUAL_BASE.x + (visual.x ?? 0),
  y: PHASE_VISUAL_BASE.y + (visual.y ?? 0),
  width: PHASE_VISUAL_BASE.width + (visual.width ?? 0),
  height: PHASE_VISUAL_BASE.height + (visual.height ?? 0),
  fontSize: PHASE_VISUAL_BASE.fontSize + (visual.fontSize ?? 0),
  fontWeight: PHASE_VISUAL_BASE.fontWeight + (visual.fontWeight ?? 0),
  italic: visual.italic ?? PHASE_VISUAL_BASE.italic,
  fontFamilyId: visual.fontFamilyId || PHASE_VISUAL_BASE.fontFamilyId,
  fontType: visual.fontType || PHASE_VISUAL_BASE.fontType,
  color: visual.color || PHASE_VISUAL_BASE.color,
  shadowColor: visual.shadowColor || PHASE_VISUAL_BASE.shadowColor,
  shadowStrength: PHASE_VISUAL_BASE.shadowStrength + (visual.shadowStrength ?? 0),
});

const resolvePlayerNameVisualPart = (
  side: keyof TeamNameVisual,
  visual: TeamNameVisual
): TeamNameVisualPart => ({
  x: PLAYER_NAME_VISUAL_BASE.x + (visual[side].x ?? 0),
  y: PLAYER_NAME_VISUAL_BASE.y + (visual[side].y ?? 0),
  width: PLAYER_NAME_VISUAL_BASE.width + (visual[side].width ?? 0),
  height: PLAYER_NAME_VISUAL_BASE.height + (visual[side].height ?? 0),
  fontSize: PLAYER_NAME_VISUAL_BASE.fontSize + (visual[side].fontSize ?? 0),
  fontWeight: PLAYER_NAME_VISUAL_BASE.fontWeight + (visual[side].fontWeight ?? 0),
  italic: visual[side].italic ?? PLAYER_NAME_VISUAL_BASE.italic,
  fontFamilyId: visual[side].fontFamilyId || PLAYER_NAME_VISUAL_BASE.fontFamilyId,
  fontType: visual[side].fontType || PLAYER_NAME_VISUAL_BASE.fontType,
  color: visual[side].color || PLAYER_NAME_VISUAL_BASE.color,
  shadowColor: visual[side].shadowColor || PLAYER_NAME_VISUAL_BASE.shadowColor,
  shadowStrength: PLAYER_NAME_VISUAL_BASE.shadowStrength + (visual[side].shadowStrength ?? 0),
});

const resolveTeamNameFontType = (fontType: TeamNameVisualPart['fontType']) => {
  if (fontType === 'regular') return { fontWeight: 400, italic: false };
  if (fontType === 'bold') return { fontWeight: 700, italic: false };
  if (fontType === 'italic') return { fontWeight: 400, italic: true };
  if (fontType === 'bold-italic') return { fontWeight: 700, italic: true };
  return { fontWeight: 900, italic: false };
};

const TEAM_NAME_FONT_TYPE_OPTIONS: Array<{
  value: NonNullable<TeamNameVisualPart['fontType']>;
  label: string;
}> = [
    { value: 'regular', label: 'Regular' },
    { value: 'bold', label: 'Bold' },
    { value: 'black', label: 'Black' },
    { value: 'italic', label: 'Italic' },
    { value: 'bold-italic', label: 'Bold Italic' },
  ];

const outsideFrameOffset = {
  left: (part: DraftLayoutPart) => -(part.x + resolvePartSize(part).width + 80),
  right: (part: DraftLayoutPart) => 1920 - part.x + 80,
  top: (part: DraftLayoutPart) => -(part.y + resolvePartSize(part).height + 80),
  bottom: (part: DraftLayoutPart) => 1080 - part.y + 80,
};

const transitionInitialState = (type: DraftTransitionType, part: DraftLayoutPart) => {
  if (type === 'slide-right') return { opacity: 1, x: outsideFrameOffset.left(part), y: 0, scale: 1 };
  if (type === 'slide-left') return { opacity: 1, x: outsideFrameOffset.right(part), y: 0, scale: 1 };
  if (type === 'slide-up') return { opacity: 1, x: 0, y: outsideFrameOffset.bottom(part), scale: 1 };
  if (type === 'slide-down') return { opacity: 1, x: 0, y: outsideFrameOffset.top(part), scale: 1 };
  if (type === 'zoom') return { opacity: 1, x: 0, y: 0, scale: 0.86 };
  if (type === 'zoom-out') return { opacity: 1, x: 0, y: 0, scale: 1.12 };
  return { opacity: 0, x: 0, y: 0, scale: 1 };
};

const transitionExitState = (type: DraftTransitionType, part: DraftLayoutPart) => {
  if (type === 'slide-right') return { opacity: 1, x: outsideFrameOffset.right(part), y: 0, scale: 1 };
  if (type === 'slide-left') return { opacity: 1, x: outsideFrameOffset.left(part), y: 0, scale: 1 };
  if (type === 'slide-up') return { opacity: 1, x: 0, y: outsideFrameOffset.top(part), scale: 1 };
  if (type === 'slide-down') return { opacity: 1, x: 0, y: outsideFrameOffset.bottom(part), scale: 1 };
  if (type === 'zoom') return { opacity: 1, x: 0, y: 0, scale: 1.12 };
  if (type === 'zoom-out') return { opacity: 1, x: 0, y: 0, scale: 0.86 };
  return { opacity: 0, x: 0, y: 0, scale: 1 };
};

const buildDraftVariants = (track: DraftAnimationTrack, part: DraftLayoutPart, delayOffset = 0): Variants => ({
  initial: transitionInitialState(track.inType, part),
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      duration: track.duration,
      delay: track.delay + delayOffset,
      ease: easingValue(track.easing),
    },
  },
  exit: {
    ...transitionExitState(track.outType, part),
    transition: {
      duration: track.duration,
      delay: track.delay + delayOffset,
      ease: easingValue(track.easing),
    },
  },
});

// Warna denyut "giliran" per sisi (ikut warna nama tim).
const DRAFT_TURN_PULSE_COLOR: Record<DraftSide, string> = {
  blue: '#7ee7ff',
  red: '#ff61c8',
};

// Overlay berkedip lembut menandakan slot ini sedang giliran untuk Ban/Pick.
// Layer warna dengan opasitas puncak ~30%, nyala-mati mulus (easeInOut) dan berulang.
const DraftTurnPulse: React.FC<{ side: DraftSide; style: React.CSSProperties }> = ({ side, style }) => (
  <motion.div
    className="pointer-events-none absolute"
    style={{ ...style, background: DRAFT_TURN_PULSE_COLOR[side] }}
    initial={{ opacity: 0 }}
    animate={{ opacity: [0, 0.3, 0] }}
    transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity }}
  />
);

// Teks nama tim yang muat di dalam box: font mengecil otomatis (auto-fit) dan/atau wrap multi-baris.
// Pengukuran via ref: font diturunkan bertahap sampai lebar & tinggi konten muat di box.
const TeamNameAutoFitText: React.FC<{
  text: string;
  boxWidth: number;
  boxHeight: number;
  maxFontSize: number;
  autoFit: boolean;
  wrap: boolean;
  maxLines: number;
  color: string;
  fontFamily: string;
  fontWeight: number;
  italic: boolean;
  textShadow: string;
}> = ({
  text,
  boxWidth,
  boxHeight,
  maxFontSize,
  autoFit,
  wrap,
  maxLines,
  color,
  fontFamily,
  fontWeight,
  italic,
  textShadow,
}) => {
    const measureRef = React.useRef<HTMLSpanElement>(null);
    const [fontSize, setFontSize] = React.useState(maxFontSize);
    const lineHeight = wrap ? 1.05 : 1;
    const effectiveLines = wrap ? Math.max(1, maxLines) : 1;
    const PADDING_X = 8;

    React.useLayoutEffect(() => {
      const el = measureRef.current;
      const target = Math.max(1, maxFontSize);
      if (!el || !autoFit) {
        setFontSize(target);
        return;
      }
      const availW = Math.max(1, boxWidth - PADDING_X * 2);
      const availH = Math.max(1, boxHeight);
      let size = target;
      const minSize = 6;
      const fits = () => {
        el.style.fontSize = `${size}px`;
        const widthOk = el.scrollWidth <= availW + 0.5;
        if (!wrap) return widthOk; // satu baris: cukup cek lebar (tinggi ikut box)
        const heightOk = el.scrollHeight <= availH + 0.5;
        const lineHeightPx = size * lineHeight;
        const lines = lineHeightPx > 0 ? Math.round(el.scrollHeight / lineHeightPx) : 1;
        return widthOk && heightOk && lines <= effectiveLines;
      };
      let guard = 0;
      while (!fits() && size > minSize && guard < 400) {
        size -= 1;
        guard += 1;
      }
      setFontSize(size);
    }, [text, boxWidth, boxHeight, maxFontSize, autoFit, wrap, effectiveLines, lineHeight]);

    return (
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden"
        style={{ paddingLeft: PADDING_X, paddingRight: PADDING_X }}
      >
        <span
          ref={measureRef}
          style={{
            color,
            fontFamily,
            fontWeight,
            fontStyle: italic ? 'italic' : 'normal',
            fontSize,
            lineHeight,
            textAlign: 'center',
            textShadow,
            textTransform: 'uppercase',
            whiteSpace: wrap ? 'normal' : 'nowrap',
            wordBreak: wrap ? 'break-word' : 'normal',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: effectiveLines,
            overflow: 'hidden',
          }}
        >
          {text}
        </span>
      </div>
    );
  };

const DraftField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <label className="block space-y-1.5">
    <span className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">{label}</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#ccff00]"
    />
  </label>
);

const NumberField: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
}> = ({ label, value, onChange }) => (
  <label className="block space-y-1.5">
    <span className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">{label}</span>
    <input
      type="number"
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full rounded-lg border border-white/10 bg-black px-2 py-2 text-center text-[10px] font-black text-white outline-none focus:border-[#ccff00]"
    />
  </label>
);

const SelectField = <T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) => (
  <label className="block space-y-1.5">
    <span className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className="w-full rounded-lg border border-white/10 bg-black px-2 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#ccff00]"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option.replace('-', ' ')}
        </option>
      ))}
    </select>
  </label>
);

const HeroSearchField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  excluded?: Set<string>;
  // Bila diisi (mode Last Change): daftar HANYA menampilkan hero dalam set ini (hero yang sudah dipick tim).
  allowList?: Set<string>;
  // Mode swap (Last Change): hero TERKUNCI. Mengetik hanya menyaring daftar (query sementara) dan
  // TIDAK mengubah pick; hero hanya berubah bila memilih opsi dari daftar (memicu swap).
  swapMode?: boolean;
  status?: 'next' | 'warn';
}> = ({ label, value, onChange, excluded, allowList, swapMode, status }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  // Query pencarian sementara — hanya dipakai di mode swap; tidak pernah menyentuh nilai pick.
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);
  // Saat slot ini jadi giliran berikutnya, arahkan kursor + gulir langsung ke sini.
  React.useEffect(() => {
    if (status !== 'next') return;
    const el = inputRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [status]);
  const search = (swapMode ? query : value).trim().toLowerCase();
  const options = DRAFT_HERO_OPTIONS.filter(([name]) => {
    const lower = name.toLowerCase();
    // Mode Last Change: batasi daftar HANYA ke hero yang sudah dipick tim ini (abaikan filter "excluded").
    if (allowList) return allowList.has(lower) && lower.includes(search);
    // Hero yang sudah dipakai (ban/pick) disembunyikan, kecuali pilihan field ini sendiri.
    if (excluded?.has(lower) && lower !== search) return false;
    return lower.includes(search);
  }).slice(0, 10);

  const labelColor =
    status === 'next' ? 'text-emerald-400' : status === 'warn' ? 'text-red-400' : 'text-zinc-600';
  const inputState =
    status === 'next'
      ? 'border-emerald-400 ring-1 ring-emerald-400/50 focus:border-emerald-300'
      : status === 'warn'
        ? 'border-red-500 ring-1 ring-red-500/50 focus:border-red-400'
        : 'border-white/10 focus:border-[#ccff00]';

  return (
    <label className="relative block space-y-1.5">
      <span className={`flex items-center gap-1 text-[7px] font-black uppercase tracking-[0.25em] ${labelColor}`}>
        {status === 'next' && <span aria-hidden>➜</span>}
        {status === 'warn' && <span aria-hidden>⚠</span>}
        {label}
      </span>
      <input
        ref={inputRef}
        // Mode swap: saat terbuka tampilkan query pencarian; saat tertutup tampilkan hero terkunci.
        value={swapMode ? (isOpen ? query : value) : value}
        onFocus={() => {
          setIsOpen(true);
          if (swapMode) setQuery('');
        }}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        onChange={(event) => {
          setIsOpen(true);
          // Mode swap: HANYA saring daftar, jangan ubah pick (hero terkunci).
          if (swapMode) setQuery(event.target.value);
          else onChange(event.target.value);
        }}
        className={`w-full rounded-lg border ${inputState} bg-black px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none`}
        placeholder={swapMode ? 'Tukar hero…' : 'Cari hero'}
      />
      {status === 'next' && (
        <span className="block text-[7px] font-bold uppercase tracking-[0.2em] text-emerald-400">
          Giliran mengisi
        </span>
      )}
      {status === 'warn' && (
        <span className="block text-[7px] font-bold uppercase tracking-[0.2em] text-red-400">
          Urutan salah — isi slot hijau dulu
        </span>
      )}
      {isOpen && options.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-44 overflow-y-auto rounded-lg border border-white/10 bg-zinc-950 p-1 shadow-2xl">
          {options.map(([name]) => (
            <button
              key={name}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(name);
                setIsOpen(false);
                if (swapMode) setQuery('');
              }}
              className="block w-full rounded-md px-2 py-1.5 text-left text-[9px] font-black uppercase tracking-widest text-zinc-300 hover:bg-[#ccff00] hover:text-black"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </label>
  );
};

const BanHeroSlotMedia: React.FC<{
  slotKey: string;
  colorSrc: string;
  bwSrc: string;
}> = ({ slotKey, colorSrc, bwSrc }) => {
  const [showBw, setShowBw] = React.useState(false);

  React.useEffect(() => {
    setShowBw(false);
    const timer = window.setTimeout(() => setShowBw(true), DRAF_N_PICK_BAN_COLOR_TO_BW_MS);
    return () => window.clearTimeout(timer);
  }, [slotKey, colorSrc, bwSrc]);

  const mediaStyle: React.CSSProperties = {
    objectPosition: 'center top',
    transform: 'translateY(-2%) scale(1.35)',
    transformOrigin: 'center top',
  };

  return (
    <motion.div
      className="absolute inset-0"
      // Animasi masuk ban = FADE (kosong → ada), bukan slide. Lalu crossfade berwarna → hitam-putih.
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DRAF_N_PICK_BAN_ENTER_MS / 1000, ease: 'easeInOut' }}
    >
      {/* Warna TETAP penuh (opacity 1) di bawah — tidak dipudarkan, supaya tak ada momen tembus pandang. */}
      <img
        src={colorSrc}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={mediaStyle}
        draggable={false}
      />
      {/* Hitam-putih MENIMPA di atas warna dengan fade-in; setelah penuh, warna tertutup sepenuhnya. */}
      <motion.img
        src={bwSrc}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={mediaStyle}
        initial={{ opacity: 0 }}
        animate={{ opacity: showBw ? 1 : 0 }}
        transition={{ duration: DRAF_N_PICK_BAN_FADE_MS / 1000, ease: 'easeInOut' }}
        draggable={false}
      />
    </motion.div>
  );
};

// Tanda silang (X) merah menandai hero yang di-BAN. Ditumpuk di tengah box ban, di atas foto hero.
// viewBox 0..90 = ruang koordinat asli path (group scale 2.81 dari 256px sumber).
const BanCrossOverlay: React.FC = () => (
  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
    <svg
      viewBox="0 0 90 90"
      className="h-1/2 w-1/2"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.55))' }}
      aria-hidden
    >
      <path
        d="M 13.4 88.492 L 1.508 76.6 c -2.011 -2.011 -2.011 -5.271 0 -7.282 L 69.318 1.508 c 2.011 -2.011 5.271 -2.011 7.282 0 L 88.492 13.4 c 2.011 2.011 2.011 5.271 0 7.282 L 20.682 88.492 C 18.671 90.503 15.411 90.503 13.4 88.492 z"
        fill="rgb(236,0,0)"
      />
      <path
        d="M 69.318 88.492 L 1.508 20.682 c -2.011 -2.011 -2.011 -5.271 0 -7.282 L 13.4 1.508 c 2.011 -2.011 5.271 -2.011 7.282 0 l 67.809 67.809 c 2.011 2.011 2.011 5.271 0 7.282 L 76.6 88.492 C 74.589 90.503 71.329 90.503 69.318 88.492 z"
        fill="rgb(236,0,0)"
      />
    </svg>
  </div>
);

// Media hero pick + animasi masuk "In" (dari luar frame ke dalam). Komponen MANDIRI (mengelola state
// sendiri) agar andal baik di Studio maupun di Output OBS/vMix — pola sama seperti BanHeroSlotMedia.
// Aturan animasi:
//  - Hero MUNCUL baru (kosong → hero) ATAU bukan fase Last Change → SELALU slide In dari luar frame.
//  - PERTUKARAN hero saat Last Change (hero → hero di slot yang sama, `instant`=true) → langsung, tanpa slide.
const PickHeroSlotMedia: React.FC<{
  heroVideo: string;
  heroImage: string;
  enterDelayMs: number;
  instant: boolean;
  mediaStyle: React.CSSProperties;
}> = ({ heroVideo, heroImage, enterDelayMs, instant, mediaStyle }) => {
  const src = heroVideo || heroImage;
  const [entered, setEntered] = React.useState(false);
  const prevSrcRef = React.useRef('');
  React.useEffect(() => {
    const wasEmpty = !prevSrcRef.current;
    prevSrcRef.current = src;
    if (!src) {
      setEntered(false);
      return;
    }
    // Swap saat Last Change (hero → hero): tampil langsung tanpa slide.
    if (instant && !wasEmpty) {
      setEntered(true);
      return;
    }
    // Kemunculan baru / bukan Last Change: reset ke luar frame lalu slide In (2x rAF agar sempat ter-paint).
    setEntered(false);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [src, instant]);

  const slideStyle: React.CSSProperties = {
    transform: entered ? 'translateY(0%)' : 'translateY(100%)',
    opacity: entered ? 1 : 0,
    transition: entered
      ? `transform ${DRAF_N_PICK_PICK_ENTER_MS}ms ease-out ${enterDelayMs}ms, opacity ${DRAF_N_PICK_PICK_ENTER_MS}ms ease-out ${enterDelayMs}ms`
      : 'none',
    willChange: 'transform, opacity',
  };

  return (
    <div className="absolute inset-0" style={slideStyle}>
      {heroVideo ? (
        <video
          key={heroVideo}
          src={heroVideo}
          className="h-full w-full object-cover"
          style={mediaStyle}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          key={heroImage}
          src={heroImage}
          alt=""
          className="h-full w-full object-cover"
          style={mediaStyle}
          draggable={false}
        />
      )}
    </div>
  );
};

const updateSlot = (items: string[], index: number, value: string) =>
  Array.from({ length: 5 }, (_, itemIndex) =>
    itemIndex === index ? value : (Array.isArray(items) ? items[itemIndex] : '') || ''
  );

const normalizeSlots = (items: unknown, fallback: string[]) =>
  Array.from({ length: 5 }, (_, index) =>
    typeof (items as string[] | undefined)?.[index] === 'string'
      ? (items as string[])[index]
      : fallback[index] || ''
  );

const normalizeDraftTeam = (
  team: Partial<DraftTeamData> | undefined,
  fallback: DraftTeamData
): DraftTeamData => ({
  name: typeof team?.name === 'string' ? team.name : fallback.name,
  bans: normalizeSlots(team?.bans, fallback.bans),
  picks: normalizeSlots(team?.picks, fallback.picks),
  playerPhotos: normalizeSlots(team?.playerPhotos, fallback.playerPhotos),
  playerNames: normalizeSlots(team?.playerNames, fallback.playerNames),
  pickHeroImages: normalizeSlots(team?.pickHeroImages, fallback.pickHeroImages),
  logo: typeof team?.logo === 'string' ? team.logo : fallback.logo,
  photoMode: team?.photoMode === 'logo' ? 'logo' : 'photo',
});

const normalizeDraftData = (data: Partial<DraftData> | undefined): DraftData => ({
  title: typeof data?.title === 'string' ? data.title : DEFAULT_DRAFT_DATA.title,
  subtitle: typeof data?.subtitle === 'string' ? data.subtitle : DEFAULT_DRAFT_DATA.subtitle,
  phaseBanLabel:
    typeof data?.phaseBanLabel === 'string' ? data.phaseBanLabel : DEFAULT_DRAFT_DATA.phaseBanLabel,
  phasePickLabel:
    typeof data?.phasePickLabel === 'string' ? data.phasePickLabel : DEFAULT_DRAFT_DATA.phasePickLabel,
  phaseDoneLabel:
    typeof data?.phaseDoneLabel === 'string' && data.phaseDoneLabel !== 'DRAFT COMPLETE'
      ? data.phaseDoneLabel
      : DEFAULT_DRAFT_DATA.phaseDoneLabel,
  blue: normalizeDraftTeam(data?.blue, DEFAULT_DRAFT_DATA.blue),
  red: normalizeDraftTeam(data?.red, DEFAULT_DRAFT_DATA.red),
});

const updateDraftData = (
  setDraftData: (value: DraftData | ((value: DraftData) => DraftData)) => void,
  updater: (current: DraftData) => DraftData
) => {
  setDraftData((prev) => updater(normalizeDraftData(prev)));
};

const resolveHeroImage = (value: string) => DRAFT_HERO_IMAGE_BY_NAME.get(value.trim().toLowerCase()) ?? '';

const resolveHeroVideo = (value: string) => DRAFT_HERO_VIDEO_BY_NAME.get(value.trim().toLowerCase()) ?? '';

// Kompres foto pemain saat upload: turunkan resolusi + encode WebP (jaga transparansi).
// Ukuran base64 jadi jauh lebih kecil supaya andal tersinkron ke Output OBS/vMix lewat SSE,
// sekaligus mengurangi beban localStorage. Slot pick hanya ~122px, 640px sudah lebih dari cukup.
const readImageFileCompressed = (
  file: File,
  callback: (dataUrl: string) => void,
  maxSize = 640,
  quality = 0.82
) => {
  const reader = new FileReader();
  reader.onload = () => {
    const original = String(reader.result ?? '');
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        callback(original);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        const compressed = canvas.toDataURL('image/webp', quality);
        // Pakai hasil kompres hanya bila memang lebih kecil & valid webp.
        callback(compressed.startsWith('data:image/webp') && compressed.length < original.length ? compressed : original);
      } catch {
        callback(original);
      }
    };
    img.onerror = () => callback(original);
    img.src = original;
  };
  reader.readAsDataURL(file);
};

const DrafNPickView: React.FC<DrafNPickViewProps> = (props) => {
  const [storedDraftData, setDraftData] = useSharedState<DraftData>(
    DRAF_N_PICK_DATA_KEY,
    DEFAULT_DRAFT_DATA
  );
  const [draftLayout, setDraftLayout] = useSharedState<DraftLayout>(
    DRAF_N_PICK_LAYOUT_KEY,
    DEFAULT_DRAFT_LAYOUT
  );
  const [draftAnimation, setDraftAnimation] = useSharedState<DraftAnimationConfig>(
    DRAF_N_PICK_ANIMATION_KEY,
    DEFAULT_DRAFT_ANIMATION
  );
  const [teamNameVisual, setTeamNameVisual] = useSharedState<TeamNameVisual>(
    DRAF_N_PICK_TEAM_NAME_VISUAL_KEY,
    DEFAULT_TEAM_NAME_VISUAL
  );
  const [teamNameFit, setTeamNameFit] = useSharedState<TeamNameFit>(
    DRAF_N_PICK_TEAM_NAME_FIT_KEY,
    DEFAULT_TEAM_NAME_FIT
  );
  const [pickSlotVisual, setPickSlotVisual] = useSharedState<PickSlotVisual>(
    DRAF_N_PICK_PICK_SLOT_VISUAL_KEY,
    DEFAULT_PICK_SLOT_VISUAL
  );
  const [banSlotVisual, setBanSlotVisual] = useSharedState<PickSlotVisual>(
    DRAF_N_PICK_BAN_SLOT_VISUAL_KEY,
    DEFAULT_PICK_SLOT_VISUAL
  );
  const [playerBox, setPlayerBox] = useSharedState<PlayerBoxMap>(
    DRAF_N_PICK_PLAYER_BOX_KEY,
    DEFAULT_PLAYER_BOX_MAP
  );
  const [objectAdjust, setObjectAdjust] = useSharedState<ObjectAdjustMap>(
    DRAF_N_PICK_OBJECT_ADJUST_KEY,
    DEFAULT_OBJECT_ADJUST_MAP
  );
  const [logoVisual, setLogoVisual] = useSharedState<PickSlotVisual>(
    DRAF_N_PICK_LOGO_VISUAL_KEY,
    DEFAULT_PICK_SLOT_VISUAL
  );
  const [phaseVisual, setPhaseVisual] = useSharedState<TeamNameVisualPart>(
    DRAF_N_PICK_PHASE_VISUAL_KEY,
    DEFAULT_PHASE_VISUAL
  );
  const [phaseArrowPos, setPhaseArrowPos] = useSharedState<PhaseArrowPos>(
    DRAF_N_PICK_PHASE_ARROW_KEY,
    DEFAULT_PHASE_ARROW_POS
  );
  const [phaseArrowImage, setPhaseArrowImage] = useSharedState<string>(
    DRAF_N_PICK_PHASE_ARROW_IMAGE_KEY,
    ''
  );
  const [banLock, setBanLock] = useSharedState<BanLockConfig>(
    DRAF_N_PICK_BAN_LOCK_KEY,
    DEFAULT_BAN_LOCK_CONFIG
  );
  const [timerConf, setTimerConf] = useSharedState<DraftTimerConf>(
    DRAF_N_PICK_TIMER_KEY,
    DEFAULT_TIMER_CONF
  );
  const [timerVisual, setTimerVisual] = useSharedState<TeamNameVisualPart>(
    DRAF_N_PICK_TIMER_VISUAL_KEY,
    DEFAULT_TIMER_VISUAL
  );
  const [timeLeft, setTimeLeft] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevTimeRef = useRef(0);

  // Beep pendek via Web Audio (tanpa file). Dipakai untuk tick 10..1 & bunyi akhir di 0.
  const playBeep = useCallback((freq: number, durationMs: number, volume: number) => {
    try {
      if (typeof window === 'undefined') return;
      if (!audioCtxRef.current) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        audioCtxRef.current = new AC();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + durationMs / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + durationMs / 1000 + 0.02);
    } catch {
      /* audio tidak tersedia / diblokir autoplay — abaikan */
    }
  }, []);
  const [playerNameVisual, setPlayerNameVisual] = useSharedState<TeamNameVisual>(
    DRAF_N_PICK_PLAYER_NAME_VISUAL_KEY,
    DEFAULT_PLAYER_NAME_VISUAL
  );
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  // Preview area crop (garis batas kotak) — hanya di studio (state lokal, tidak disinkron ke Output).
  const [showCropPreview, setShowCropPreview] = useState(false);
  const draftData = useMemo(() => normalizeDraftData(storedDraftData), [storedDraftData]);

  // Pemain dari Project Event DB (prop studio, atau localStorage saat output OBS).
  const effectiveProjectPlayers = useMemo<PlayerData[]>(() => {
    if (props.projectPlayers && props.projectPlayers.length > 0) return props.projectPlayers;
    if (typeof window === 'undefined') return [];
    return loadProjectPlayers(resolveProjectScopeFromLocation());
  }, [props.projectPlayers]);

  // Daftar tim hasil kelompok pemain Project DB (nama + logo + foto/nama pemain per tim).
  const projectDbTeams = useMemo(
    () => buildRosterTeamsFromProject(effectiveProjectPlayers),
    [effectiveProjectPlayers]
  );

  // Isi otomatis satu sisi (blue/red) dari tim di Project DB. Semua hasil tetap bisa diedit manual.
  const applyTeamFromDb = (side: DraftSide, teamId: string) => {
    const dbTeam = projectDbTeams.find((team) => team.id === teamId);
    if (!dbTeam) return;
    const photos = Array.from({ length: 5 }, (_, i) => dbTeam.players[i]?.image || '');
    const names = Array.from({ length: 5 }, (_, i) => {
      const name = dbTeam.players[i]?.name?.trim();
      return name && name !== '—' ? name : '';
    });
    // Logo bawaan dicebear (placeholder) tidak dipakai — biarkan logo lama / kosong.
    const dbLogo = dbTeam.teamLogo && !dbTeam.teamLogo.includes('dicebear') ? dbTeam.teamLogo : '';
    setDraftData((prev) => {
      const current = normalizeDraftData(prev);
      return {
        ...current,
        [side]: {
          ...current[side],
          name: dbTeam.name,
          logo: dbLogo || current[side].logo,
          playerPhotos: photos,
          playerNames: names,
        },
      };
    });
  };

  // Kosongkan semua hero Ban & Pick kedua tim (foto pemain & nama tim tetap).
  const resetAllHeroes = () => {
    setDraftData((prev) => {
      const current = normalizeDraftData(prev);
      const clearTeam = (team: DraftTeamData): DraftTeamData => ({
        ...team,
        bans: ['', '', '', '', ''],
        picks: ['', '', '', '', ''],
        pickHeroImages: ['', '', '', '', ''],
      });
      return { ...current, blue: clearTeam(current.blue), red: clearTeam(current.red) };
    });
  };
  // Reset data input roster satu sisi: Nama Pemain + Foto Pemain + Logo (nama tim & hero tetap).
  const resetSideRoster = (side: DraftSide) => {
    setDraftData((prev) => {
      const current = normalizeDraftData(prev);
      return {
        ...current,
        [side]: {
          ...current[side],
          logo: '',
          playerPhotos: ['', '', '', '', ''],
          playerNames: ['', '', '', '', ''],
        },
      };
    });
  };
  // Mode area pemain kini GLOBAL: satu toggle mengatur kedua tim (blue & red) sekaligus.
  const setBothPhotoMode = (mode: DraftPhotoMode) => {
    setDraftData((prev) => {
      const current = normalizeDraftData(prev);
      return {
        ...current,
        blue: { ...current.blue, photoMode: mode },
        red: { ...current.red, photoMode: mode },
      };
    });
  };
  const usedHeroes = useMemo(() => {
    const set = new Set<string>();
    (['blue', 'red'] as const).forEach((side) => {
      [...draftData[side].bans, ...draftData[side].picks].forEach((hero) => {
        const key = hero.trim().toLowerCase();
        if (key && isKnownDraftHero(hero)) set.add(key);
      });
    });
    return set;
  }, [draftData]);

  // Urutan draft 1..20: slot berikutnya = nomor urut terkecil yang masih kosong.
  const nextDraftOrder = useMemo(() => {
    const emptyOrders: number[] = [];
    (['blue', 'red'] as const).forEach((side) => {
      draftData[side].bans.forEach((value, index) => {
        if (!isKnownDraftHero(value)) emptyOrders.push(getDraftBanOrder(side, index));
      });
      draftData[side].picks.forEach((value, index) => {
        if (!isKnownDraftHero(value)) emptyOrders.push(getDraftPickOrder(side, index));
      });
    });
    return emptyOrders.length ? Math.min(...emptyOrders) : null;
  }, [draftData]);

  // Fase draft berjalan: 'ban' jika slot berikutnya adalah ban, 'pick' jika pick, 'done' bila selesai.
  const draftPhase: 'ban' | 'pick' | 'done' = useMemo(() => {
    if (nextDraftOrder == null) return 'done';
    const isBan = (['blue', 'red'] as const).some((side) =>
      MLBB_DRAFT_BAN_ORDER[side].includes(nextDraftOrder)
    );
    return isBan ? 'ban' : 'pick';
  }, [nextDraftOrder]);

  // Fase Last Change (untuk fitur tukar hero) = SEMUA slot PICK kedua tim sudah terisi hero.
  // Sengaja TIDAK menunggu slot ban penuh, karena ban boleh dibiarkan kosong pada penggunaan nyata.
  const picksComplete = useMemo(
    () =>
      (['blue', 'red'] as const).every((side) =>
        draftData[side].picks.every((h) => isKnownDraftHero(h))
      ),
    [draftData]
  );

  // Mode "swap-instan" (pertukaran hero tanpa slide) sengaja DITUNDA sesaat setelah semua pick terisi.
  // Tujuannya: pick TERAKHIR — yang justru memicu Last Change — tetap sempat tampil dengan animasi In
  // (slide) dulu; baru setelah animasinya selesai, pertukaran berikutnya berlangsung instan.
  const [swapInstant, setSwapInstant] = useState(false);
  useEffect(() => {
    if (!picksComplete) {
      setSwapInstant(false);
      return;
    }
    const t = window.setTimeout(
      () => setSwapInstant(true),
      DRAF_N_PICK_PICK_ENTER_MS + DRAF_N_PICK_PLAYER_FADE_MS
    );
    return () => window.clearTimeout(t);
  }, [picksComplete]);

  // Sesi giliran saat ini (giliran berurutan sisi-sama = 1 sesi). Timer reset per sesi, bukan per slot.
  const currentSession = useMemo(
    () => (nextDraftOrder != null ? DRAFT_SESSION_OF_ORDER[nextDraftOrder] ?? null : null),
    [nextDraftOrder]
  );

  const phaseText =
    draftPhase === 'ban'
      ? draftData.phaseBanLabel
      : draftPhase === 'pick'
        ? draftData.phasePickLabel
        : draftData.phaseDoneLabel;

  // Sisi tim yang sedang giliran (untuk arah panah): biru = kiri, merah = kanan.
  const activeSide = useMemo<DraftSide | null>(() => {
    if (nextDraftOrder == null) return null;
    const isBlue =
      MLBB_DRAFT_BAN_ORDER.blue.includes(nextDraftOrder) ||
      MLBB_DRAFT_PICK_ORDER.blue.includes(nextDraftOrder);
    return isBlue ? 'blue' : 'red';
  }, [nextDraftOrder]);

  // Timer otomatis (sementara sebelum VisionOCR): reset tiap giliran/fase, hitung mundur 1 detik.
  const timerConfN = normalizeTimerConf(timerConf);
  useEffect(() => {
    // Reset HANYA saat pindah sesi (giliran berurutan sisi-sama tidak reset — dianggap 1 countdown).
    // Last Change dimulai begitu SEMUA pick terisi (ban boleh kosong) — konsisten dgn definisi picksComplete.
    if (picksComplete) setTimeLeft(timerConfN.lastChangeSec);
    else if (draftPhase === 'ban') setTimeLeft(timerConfN.banSec);
    else if (draftPhase === 'pick') setTimeLeft(timerConfN.pickSec);
    else setTimeLeft(timerConfN.lastChangeSec); // done = Last Change
  }, [
    currentSession,
    draftPhase,
    picksComplete,
    timerConfN.banSec,
    timerConfN.pickSec,
    timerConfN.lastChangeSec,
  ]);
  useEffect(() => {
    const id = window.setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, []);
  // Efek suara: tick tiap detik saat 10..1, bunyi akhir di 0. Hanya saat menghitung mundur (bukan reset naik).
  useEffect(() => {
    const prev = prevTimeRef.current;
    prevTimeRef.current = timeLeft;
    if (!timerConfN.show || !timerConfN.sound) return;
    if (timeLeft >= prev) return; // reset / lompat naik → tidak berbunyi
    if (timeLeft >= 1 && timeLeft <= 10) playBeep(880, 90, 0.25);
    else if (timeLeft === 0) playBeep(1320, 420, 0.32);
  }, [timeLeft, timerConfN.show, timerConfN.sound, draftPhase, playBeep]);

  // ——— Auto-Out saat countdown Last Change habis (khusus link Output) ———
  // Ketika hitung mundur Last Change mencapai 0, overlay ini otomatis di-CUT dari program bus lewat
  // BROADCAST 'stop' ke server (/api/companion/trigger). Server menyebarkannya via SSE ke SEMUA klien —
  // Output OBS/vMix DAN monitor Control operator — jadi keduanya ter-Stop serempak (bukan hanya Output).
  // Jika operator SUDAH meng-cut lebih dulu selama Last Change (asset tak lagi di layer program), trigger mati.
  // Scope project untuk broadcast STOP — di-resolve ASYNC agar SAMA dengan StandaloneProgramView
  // (bisa berasal dari cloud). Versi sync dipakai sebagai nilai awal sebelum async selesai.
  const [outProjectScope, setOutProjectScope] = useState<string>(() =>
    resolveProjectScopeFromLocation()
  );
  useEffect(() => {
    let cancelled = false;
    resolveProjectScopeFromLocationAsync().then((scope) => {
      if (!cancelled) setOutProjectScope(scope);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const autoOutFiredRef = useRef(false);
  const lastChangeArmedRef = useRef(false);
  // Saat true: panel Ban N Pick memainkan animasi Out (slide keluar frame) secara LOKAL — andal, tidak
  // tergantung propagasi exit AnimatePresence. Setelah selesai baru broadcast STOP untuk cut dari program.
  const [autoOutPlaying, setAutoOutPlaying] = useState(false);
  useEffect(() => {
    if (!props.programFeed) return; // fitur hanya berlaku di link Output
    if (!picksComplete) {
      // Keluar dari Last Change → reset penanda agar bisa memicu lagi di draft berikutnya.
      autoOutFiredRef.current = false;
      lastChangeArmedRef.current = false;
      if (autoOutPlaying) setAutoOutPlaying(false);
      return;
    }
    if (timeLeft > 0) {
      lastChangeArmedRef.current = true; // countdown Last Change sedang berjalan
      return;
    }
    // timeLeft === 0: hanya picu bila countdown memang sempat berjalan & belum pernah dipicu.
    // Catatan: "sudah di-Out duluan" oleh operator tertangani otomatis — overlay ikut UNMOUNT saat di-cut,
    // sehingga timer & efek ini berhenti dan tidak pernah sampai ke titik ini.
    if (!lastChangeArmedRef.current || autoOutFiredRef.current) return;
    autoOutFiredRef.current = true;
    const assetId = props.asset?.id;
    if (!assetId) return;
    // 1) Mainkan transisi Out (panel slide keluar frame) di overlay ini.
    setAutoOutPlaying(true);
    // 2) Setelah animasi Out selesai, broadcast STOP → cut dari program bus (Output + Control serempak).
    const sides = draftAnimation?.sides;
    const center = draftAnimation?.center;
    const outSec = Math.max(
      (sides?.duration ?? 0.55) + (sides?.delay ?? 0) + (sides?.redDelayOffset ?? 0),
      (center?.duration ?? 0.55) + (center?.delay ?? 0)
    );
    window.setTimeout(() => {
      void notifyCompanionTrigger(assetId, 'stop', undefined, outProjectScope);
    }, Math.round(outSec * 1000) + 250);
  }, [
    props.programFeed,
    props.asset,
    picksComplete,
    timeLeft,
    outProjectScope,
    draftAnimation,
    autoOutPlaying,
  ]);

  const draftSlotStatus = (
    kind: 'ban' | 'pick',
    side: DraftSide,
    index: number,
    value: string
  ): 'next' | 'warn' | undefined => {
    if (nextDraftOrder == null) return undefined;
    const order = kind === 'ban' ? getDraftBanOrder(side, index) : getDraftPickOrder(side, index);
    if (order === nextDraftOrder) return 'next';
    if (isKnownDraftHero(value) && order > nextDraftOrder) return 'warn';
    return undefined;
  };

  useEffect(() => {
    if (JSON.stringify(storedDraftData) !== JSON.stringify(draftData)) {
      setDraftData(draftData);
    }
  }, [draftData, setDraftData, storedDraftData]);

  useEffect(() => {
    if (props.visualOnly || props.monitorFeed) return;
    const timer = setTimeout(() => {
      void notifyCompanionData(
        {
          assetId: props.asset.id,
          data: {
            [DRAF_N_PICK_DATA_KEY]: draftData,
            [DRAF_N_PICK_LAYOUT_KEY]: draftLayout,
            [DRAF_N_PICK_ANIMATION_KEY]: draftAnimation,
            [DRAF_N_PICK_TEAM_NAME_VISUAL_KEY]: teamNameVisual,
            [DRAF_N_PICK_PICK_SLOT_VISUAL_KEY]: pickSlotVisual,
            [DRAF_N_PICK_BAN_SLOT_VISUAL_KEY]: banSlotVisual,
            [DRAF_N_PICK_PLAYER_BOX_KEY]: playerBox,
            [DRAF_N_PICK_OBJECT_ADJUST_KEY]: objectAdjust,
            [DRAF_N_PICK_LOGO_VISUAL_KEY]: logoVisual,
            [DRAF_N_PICK_PHASE_VISUAL_KEY]: phaseVisual,
            [DRAF_N_PICK_PHASE_ARROW_KEY]: phaseArrowPos,
            [DRAF_N_PICK_PHASE_ARROW_IMAGE_KEY]: phaseArrowImage,
            [DRAF_N_PICK_BAN_LOCK_KEY]: banLock,
            [DRAF_N_PICK_TIMER_KEY]: timerConf,
            [DRAF_N_PICK_TIMER_VISUAL_KEY]: timerVisual,
            [DRAF_N_PICK_PLAYER_NAME_VISUAL_KEY]: playerNameVisual,
            [DRAF_N_PICK_TEAM_NAME_FIT_KEY]: teamNameFit,
          },
        },
        props.companionProjectScope
      );
    }, 250);
    return () => clearTimeout(timer);
  }, [
    props.asset.id,
    props.companionProjectScope,
    props.monitorFeed,
    props.visualOnly,
    draftData,
    draftLayout,
    draftAnimation,
    teamNameVisual,
    pickSlotVisual,
    banSlotVisual,
    playerBox,
    objectAdjust,
    logoVisual,
    phaseVisual,
    phaseArrowPos,
    phaseArrowImage,
    banLock,
    timerConf,
    timerVisual,
    playerNameVisual,
    teamNameFit,
  ]);

  const updateLayoutPart = (part: keyof DraftLayout, patch: Partial<DraftLayoutPart>) => {
    setDraftLayout((prev) => ({
      ...prev,
      [part]: { ...prev[part], ...patch },
    }));
  };

  const updateSideAnimation = (patch: Partial<DraftAnimationConfig['sides']>) => {
    setDraftAnimation((prev) => ({
      ...prev,
      sides: { ...prev.sides, ...patch },
    }));
  };

  // Set hero untuk satu slot pick.
  // Saat fase Last Change ('done'): bila hero yang dipilih sedang dipegang slot lain di tim yang sama,
  // lakukan TUKAR (slot lain menerima hero + gambar yang tadinya di slot ini) supaya tidak ada duplikat.
  // Pemain (nama & foto) tetap di slotnya — yang berpindah hanya hero-nya.
  const setPickHero = (side: DraftSide, index: number, value: string) => {
    setDraftData((prev) => {
      const norm = normalizeDraftData(prev);
      const picks = [...norm[side].picks];
      const imgs = [...norm[side].pickHeroImages];
      const target = value.trim().toLowerCase();
      // Last Change: memilih hero yang sama dengan yang sudah di slot ini = tanpa efek (jaga gambar custom).
      if (picksComplete && target === picks[index].trim().toLowerCase()) return prev;
      const otherIndex = isKnownDraftHero(value)
        ? picks.findIndex(
            (h, i) => i !== index && isKnownDraftHero(h) && h.toLowerCase() === target
          )
        : -1;
      if (picksComplete && otherIndex >= 0) {
        // TUKAR penuh (nama + gambar) antara slot ini dan slot pemegang hero terpilih.
        const prevHero = picks[index];
        const prevImg = imgs[index];
        picks[index] = value;
        imgs[index] = imgs[otherIndex];
        picks[otherIndex] = prevHero;
        imgs[otherIndex] = prevImg;
      } else {
        picks[index] = value;
        imgs[index] = resolveHeroImage(value);
      }
      return { ...norm, [side]: { ...norm[side], picks, pickHeroImages: imgs } };
    });
  };

  const updateCenterAnimation = (patch: Partial<DraftAnimationTrack>) => {
    setDraftAnimation((prev) => ({
      ...prev,
      center: { ...prev.center, ...patch },
    }));
  };

  const updateTeamNameVisualPart = (
    side: keyof TeamNameVisual,
    patch: Partial<TeamNameVisualPart>
  ) => {
    setTeamNameVisual((prev) => ({
      ...prev,
      [side]: { ...prev[side], ...patch },
    }));
  };

  const updateTeamNameFitPart = (side: keyof TeamNameFit, patch: Partial<TeamNameFitPart>) => {
    setTeamNameFit((prev) => ({
      ...prev,
      [side]: { ...normalizeTeamNameFitPart(prev?.[side]), ...patch },
    }));
  };

  const updatePickSlotVisualPart = (
    side: keyof PickSlotVisual,
    patch: Partial<PickSlotVisualPart>
  ) => {
    setPickSlotVisual((prev) => ({
      ...prev,
      [side]: { ...prev[side], ...patch },
    }));
  };

  const updateBanSlotVisualPart = (
    side: keyof PickSlotVisual,
    patch: Partial<PickSlotVisualPart>
  ) => {
    setBanSlotVisual((prev) => ({
      ...prev,
      [side]: { ...prev[side], ...patch },
    }));
  };

  const updateBanLockPart = (patch: Partial<BanLockConfig>) => {
    setBanLock((prev) => ({ ...normalizeBanLockConfig(prev), ...patch }));
  };

  const updatePlayerBox = (
    side: 'blue' | 'red',
    mode: DraftPhotoMode,
    patch: Partial<PickSlotVisualPart>
  ) => {
    setPlayerBox((prev) => {
      const cur: PlayerBoxMap = {
        blue: normalizePlayerBoxSide(prev?.blue),
        red: normalizePlayerBoxSide(prev?.red),
      };
      return { ...cur, [side]: { ...cur[side], [mode]: { ...cur[side][mode], ...patch } } };
    });
  };

  const updateObjectAdjust = (
    side: 'blue' | 'red',
    mode: DraftPhotoMode,
    patch: Partial<ObjectAdjust>
  ) => {
    setObjectAdjust((prev) => {
      const cur: ObjectAdjustMap = {
        blue: normalizeObjectAdjustSide(prev?.blue),
        red: normalizeObjectAdjustSide(prev?.red),
      };
      return { ...cur, [side]: { ...cur[side], [mode]: { ...cur[side][mode], ...patch } } };
    });
  };

  const updateLogoVisualPart = (
    side: keyof PickSlotVisual,
    patch: Partial<PickSlotVisualPart>
  ) => {
    setLogoVisual((prev) => ({
      ...prev,
      [side]: { ...prev[side], ...patch },
    }));
  };

  const updatePhaseVisual = (patch: Partial<TeamNameVisualPart>) => {
    setPhaseVisual((prev) => ({ ...prev, ...patch }));
  };

  const updateTimerConf = (patch: Partial<DraftTimerConf>) => {
    setTimerConf((prev) => ({ ...normalizeTimerConf(prev), ...patch }));
  };

  const updateTimerVisual = (patch: Partial<TeamNameVisualPart>) => {
    setTimerVisual((prev) => ({ ...prev, ...patch }));
  };

  const updatePhaseArrowPos = (key: 'left' | 'right', patch: Partial<PickSlotVisualPart>) => {
    setPhaseArrowPos((prev) => ({
      ...prev,
      [key]: { ...normalizePhaseArrowPart(prev?.[key]), ...patch },
    }));
  };

  const updatePlayerNameVisualPart = (
    side: keyof TeamNameVisual,
    patch: Partial<TeamNameVisualPart>
  ) => {
    setPlayerNameVisual((prev) => ({
      ...prev,
      [side]: { ...prev[side], ...patch },
    }));
  };

  const blueTrack = draftAnimation.sides;
  const resolvedDraftLayout: DraftLayout = {
    blue: resolveDraftLayoutPart('blue', draftLayout),
    center: resolveDraftLayoutPart('center', draftLayout),
    red: resolveDraftLayoutPart('red', draftLayout),
  };
  const resolvedTeamNameVisual: TeamNameVisual = {
    blue: resolveTeamNameVisualPart('blue', teamNameVisual),
    red: resolveTeamNameVisualPart('red', teamNameVisual),
  };
  const resolvedPlayerNameVisual: TeamNameVisual = {
    blue: resolvePlayerNameVisualPart('blue', playerNameVisual),
    red: resolvePlayerNameVisualPart('red', playerNameVisual),
  };
  const redTrack: DraftAnimationTrack = {
    ...draftAnimation.sides,
    inType: mirrorHorizontalTransition(draftAnimation.sides.inType),
    outType: mirrorHorizontalTransition(draftAnimation.sides.outType),
    delay: draftAnimation.sides.delay + draftAnimation.sides.redDelayOffset,
  };

  const renderPart = (
    part: DraftLayoutPart,
    src: string,
    alt: string,
    zIndex: number
  ) => {
    const frame = resolvePartFrame(part);
    return (
      <motion.img
        src={src}
        alt={alt}
        className="absolute object-contain"
        style={{
          left: frame.left,
          top: frame.top,
          width: frame.width,
          height: frame.height,
          transformOrigin: 'center center',
          zIndex,
        }}
        draggable={false}
      />
    );
  };

  const renderDraftAnimationArea = (
    key: string,
    variants: Variants,
    children: React.ReactNode
  ) => (
    <motion.div
      key={key}
      className="absolute inset-0"
      variants={variants}
      initial="initial"
      // Auto-Out (Last Change habis): animasikan panel ke variant 'exit' (slide keluar frame) secara lokal.
      animate={autoOutPlaying ? 'exit' : 'animate'}
      exit="exit"
    >
      {children}
    </motion.div>
  );

  const renderBanPhotoSlots = (side: keyof PickSlotVisual) =>
    draftData[side].bans.map((ban, index) => {
      const slot = BAN_PHOTO_SLOTS[side][index];
      const slotOffset = banSlotVisual[side] ?? DEFAULT_PICK_SLOT_VISUAL[side];
      const frame = resolvePartFrame(resolvedDraftLayout[side]);
      const colorSrc = resolveBanHeroColorImage(ban);
      const bwSrc = resolveBanHeroBwImage(ban);
      if (!slot || !colorSrc || !bwSrc) return null;

      return (
        <div
          key={`${side}-ban-photo-${index}-${ban}`}
          className="absolute overflow-hidden bg-black/20"
          style={{
            left: frame.left + (slot.x + slotOffset.x) * frame.scaleX,
            top: frame.top + (slot.y + slotOffset.y) * frame.scaleY,
            width: (slot.width + slotOffset.width) * frame.scaleX,
            height: (slot.height + slotOffset.height) * frame.scaleY,
            zIndex: 15,
          }}
        >
          <BanHeroSlotMedia slotKey={`${side}-ban-${index}-${ban}`} colorSrc={colorSrc} bwSrc={bwSrc} />
          <BanCrossOverlay />
        </div>
      );
    });

  // Icon Gembok di slot Ban 4 & 5: menandai slot masih terkunci sampai fase ban KEDUA sisi tsb
  // dimulai (giliran Ban 4 tiba — blue: urutan #14, red: #13). Hilang dengan fade saat fase masuk;
  // muncul lagi otomatis bila draft di-reset (urutan kembali sebelum fase ban kedua).
  const banLockVisibleFor = (side: DraftSide) =>
    nextDraftOrder != null && nextDraftOrder < getDraftBanOrder(side, 3);

  const renderBanLockSlots = (side: DraftSide) => {
    const conf = normalizeBanLockConfig(banLock);
    const slotOffset = banSlotVisual[side] ?? DEFAULT_PICK_SLOT_VISUAL[side];
    const frame = resolvePartFrame(resolvedDraftLayout[side]);
    const visible = banLockVisibleFor(side);
    return [3, 4].map((index) => {
      const slot = BAN_PHOTO_SLOTS[side][index];
      if (!slot) return null;
      return (
        <AnimatePresence key={`${side}-ban-lock-${index}`}>
          {visible && (
            <motion.div
              className="pointer-events-none absolute flex items-center justify-center"
              style={{
                left: frame.left + (slot.x + slotOffset.x + conf.x) * frame.scaleX,
                top: frame.top + (slot.y + slotOffset.y + conf.y) * frame.scaleY,
                width: (slot.width + slotOffset.width + conf.width) * frame.scaleX,
                height: (slot.height + slotOffset.height + conf.height) * frame.scaleY,
                zIndex: 17,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              {conf.image ? (
                <img
                  src={conf.image}
                  alt=""
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              ) : (
                // Gembok putih default (tanpa file) — badan + shackle + lubang kunci.
                <svg
                  viewBox="0 0 100 100"
                  className="h-[58%] w-[58%] drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <path
                    d="M32 46 v-12 a18 18 0 0 1 36 0 v12"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={9}
                    strokeLinecap="round"
                  />
                  <rect x="22" y="44" width="56" height="42" rx="9" fill="#ffffff" stroke="rgba(0,0,0,0.45)" strokeWidth={3} />
                  <circle cx="50" cy="61" r="6.5" fill="rgba(0,0,0,0.75)" />
                  <rect x="46.5" y="63" width="7" height="13" rx="3.5" fill="rgba(0,0,0,0.75)" />
                </svg>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      );
    });
  };

  const renderPickPhotoSlots = (side: keyof PickSlotVisual) => {
    return draftData[side].picks.map((pick, index) => {
      const slot = PICK_PHOTO_SLOTS[side][index];
      const heroOffset = pickSlotVisual[side] ?? DEFAULT_PICK_SLOT_VISUAL[side];
      // Kotak foto/logo per-mode: pilih setelan kotak sesuai mode aktif sisi ini.
      const playerBoxMode: DraftPhotoMode = draftData[side].photoMode === 'logo' ? 'logo' : 'photo';
      const playerOffset = normalizePlayerBoxPart(playerBox?.[side]?.[playerBoxMode]);
      const frame = resolvePartFrame(resolvedDraftLayout[side]);
      const autoHeroImage = resolveHeroImage(pick);
      const customHeroImage = draftData[side].pickHeroImages[index];
      const heroImage = customHeroImage || autoHeroImage;
      const heroVideo = customHeroImage && customHeroImage !== autoHeroImage ? '' : resolveHeroVideo(pick);
      // Mode 'logo' → semua slot pemain memakai logo tim yang sama; 'photo' → foto per slot.
      const useTeamLogo = draftData[side].photoMode === 'logo';
      const playerPhoto = useTeamLogo ? draftData[side].logo : draftData[side].playerPhotos[index];
      const hasHeroMedia = Boolean(heroVideo || heroImage);
      // Giliran pemain ini & hero belum dipilih → denyut penanda ("Api") di area foto pemain.
      // Giliran berurutan sisi-sama (mis. Pick 18 & 19) = 1 sesi → SEMUA slot sesi itu menyala bersamaan.
      const inCurrentSession = (order: number) =>
        currentSession != null && DRAFT_SESSION_OF_ORDER[order] === currentSession;
      const isTurn =
        !hasHeroMedia &&
        (inCurrentSession(getDraftPickOrder(side, index)) ||
          inCurrentSession(getDraftBanOrder(side, index)));
      // Tidak ada yang perlu ditampilkan sama sekali.
      if (!slot || (!hasHeroMedia && !playerPhoto && !isTurn)) return null;

      const heroMediaStyle: React.CSSProperties = {
        objectPosition: 'center top',
        transform: 'translateY(-2%) scale(1.75)',
        transformOrigin: 'center top',
      };
      // Penyesuaian OBJEK (foto/logo) di dalam kotak crop — ikut mode aktif; kotak crop tetap.
      const objAdj = normalizeObjectAdjust(
        useTeamLogo ? objectAdjust?.[side]?.logo : objectAdjust?.[side]?.photo
      );
      // Cara memuat: default foto = cover (penuh), logo = contain (utuh). Bisa diubah user.
      const objFit = objAdj.fit ?? (useTeamLogo ? 'contain' : 'cover');
      // Foto pemain default turun (base); logo tidak. "Geser Y" user menambah di atasnya.
      const baseObjY = useTeamLogo ? 0 : PLAYER_PHOTO_OBJECT_BASE_Y;
      const objMediaStyle: React.CSSProperties = {
        // Foto: jangkar ke ATAS supaya kepala tidak terpotong (yang ter-crop bagian bawah/kaki). Logo: tengah.
        objectPosition: useTeamLogo ? 'center center' : 'center top',
        transform: `translate(${objAdj.x * frame.scaleX}px, ${(objAdj.y + baseObjY) * frame.scaleY}px) scale(${objAdj.scale / 100})`,
        transformOrigin: 'center top',
      };
      // Kotak foto pemain & hero pick punya crop/ukuran sendiri-sendiri.
      const boxStyle = (offset: PickSlotVisualPart, zIndex: number): React.CSSProperties => ({
        left: frame.left + (slot.x + offset.x) * frame.scaleX,
        top: frame.top + (slot.y + offset.y) * frame.scaleY,
        width: (slot.width + offset.width) * frame.scaleX,
        height: (slot.height + offset.height) * frame.scaleY,
        zIndex,
      });

      return (
        <React.Fragment key={`${side}-pick-photo-${index}`}>
          {isTurn && <DraftTurnPulse side={side} style={boxStyle(playerOffset, 18)} />}
          {playerPhoto && (
            // Foto pemain (nanti juga logo tim): kotak & ukuran terpisah, tetap di tempat lalu fade.
            // TANPA latar hitam — foto PNG transparan tampil bersih (tidak ada kotak hitam saat digeser).
            <motion.div
              className="absolute overflow-hidden"
              style={boxStyle(playerOffset, 16)}
              initial={{ opacity: 0 }}
              animate={{ opacity: hasHeroMedia ? 0 : 1 }}
              transition={{ duration: DRAF_N_PICK_PLAYER_FADE_MS / 1000, ease: 'easeInOut' }}
            >
              <img
                src={playerPhoto}
                alt=""
                className={`absolute inset-0 h-full w-full ${objFit === 'contain' ? 'object-contain' : 'object-cover'}`}
                style={objMediaStyle}
                draggable={false}
              />
            </motion.div>
          )}
          {hasHeroMedia && (
            // Media hero: kotak sendiri, masuk dari luar frame (bawah) di atas foto pemain yang memudar.
            // Slide In selalu jalan (Studio & Output); hanya swap saat Last Change yang tampil langsung.
            <div className="absolute overflow-hidden bg-black/20" style={boxStyle(heroOffset, 17)}>
              <PickHeroSlotMedia
                heroVideo={heroVideo}
                heroImage={heroImage}
                enterDelayMs={playerPhoto ? DRAF_N_PICK_PLAYER_FADE_MS * 0.6 : 0}
                instant={swapInstant}
                mediaStyle={heroMediaStyle}
              />
            </div>
          )}
        </React.Fragment>
      );
    });
  };

  // Teks nama pemain per slot pick — mengikuti kolom foto tiap slot, font/posisi diatur di tab Visual.
  const renderPickPlayerNames = (side: keyof PickSlotVisual) => {
    const vis = resolvedPlayerNameVisual[side];
    const fontType = resolveTeamNameFontType(vis.fontType);
    const frame = resolvePartFrame(resolvedDraftLayout[side]);
    const fontScale = (frame.scaleX + frame.scaleY) / 2;
    return draftData[side].picks.map((_, index) => {
      const slot = PICK_PHOTO_SLOTS[side][index];
      const name = draftData[side].playerNames[index]?.trim();
      if (!slot || !name) return null;
      return (
        <div
          key={`${side}-player-name-${index}`}
          className="absolute flex items-center justify-center overflow-hidden px-1 text-center uppercase leading-none"
          style={{
            left: frame.left + (slot.x + vis.x) * frame.scaleX,
            top: frame.top + (slot.y + vis.y) * frame.scaleY,
            width: (slot.width + vis.width) * frame.scaleX,
            height: vis.height * frame.scaleY,
            color: vis.color,
            fontSize: Math.max(1, vis.fontSize * fontScale),
            fontWeight: Math.max(100, fontType.fontWeight + (playerNameVisual[side].fontWeight ?? 0)),
            fontFamily: getOverlayFontCssFamily(vis.fontFamilyId),
            fontStyle: fontType.italic ? 'italic' : 'normal',
            textShadow: `0 0 ${Math.max(0, vis.shadowStrength)}px ${vis.shadowColor}, 0 2px 0 rgba(0,0,0,0.8)`,
            zIndex: 19,
          }}
        >
          {name}
        </div>
      );
    });
  };

  const renderTeamNamePlate = (side: keyof TeamNameVisual) => {
    const plate = resolvedTeamNameVisual[side];
    const fontType = resolveTeamNameFontType(plate.fontType);
    const frame = resolvePartFrame(resolvedDraftLayout[side]);
    const fontScale = (frame.scaleX + frame.scaleY) / 2;
    const boxWidth = plate.width * frame.scaleX;
    const boxHeight = plate.height * frame.scaleY;
    const fit = normalizeTeamNameFitPart(teamNameFit?.[side]);
    return (
      <div
        key={`${side}-team-name-plate`}
        className="absolute overflow-hidden"
        style={{
          left: frame.left + plate.x * frame.scaleX,
          top: frame.top + plate.y * frame.scaleY,
          width: boxWidth,
          height: boxHeight,
          zIndex: 26,
        }}
      >
        <TeamNameAutoFitText
          text={draftData[side].name}
          boxWidth={boxWidth}
          boxHeight={boxHeight}
          maxFontSize={Math.max(1, plate.fontSize * fontScale)}
          autoFit={fit.autoFit}
          wrap={fit.wrap}
          maxLines={fit.maxLines}
          color={plate.color}
          fontFamily={getOverlayFontCssFamily(plate.fontFamilyId)}
          fontWeight={Math.max(100, fontType.fontWeight + (teamNameVisual[side].fontWeight ?? 0))}
          italic={fontType.italic}
          textShadow={`0 0 ${Math.max(0, plate.shadowStrength)}px ${plate.shadowColor}, 0 2px 0 rgba(0,0,0,0.8)`}
        />
      </div>
    );
  };

  // Tulisan fase (Ban/Pick) di panel tengah — otomatis mengikuti fase draft berjalan.
  const renderPhaseText = () => {
    if (!phaseText) return null;
    const plate = resolvePhaseVisual(phaseVisual);
    const fontType = resolveTeamNameFontType(plate.fontType);
    const frame = resolvePartFrame(resolvedDraftLayout.center);
    const fontScale = (frame.scaleX + frame.scaleY) / 2;
    return (
      <div
        key="center-phase-text"
        className="absolute flex items-center justify-center overflow-hidden px-2 text-center uppercase leading-none"
        style={{
          left: frame.left + plate.x * frame.scaleX,
          top: frame.top + plate.y * frame.scaleY,
          width: plate.width * frame.scaleX,
          height: plate.height * frame.scaleY,
          color: plate.color,
          fontSize: Math.max(1, plate.fontSize * fontScale),
          fontWeight: Math.max(100, fontType.fontWeight + (phaseVisual.fontWeight ?? 0)),
          fontFamily: getOverlayFontCssFamily(plate.fontFamilyId),
          fontStyle: fontType.italic ? 'italic' : 'normal',
          textShadow: `0 0 ${Math.max(0, plate.shadowStrength)}px ${plate.shadowColor}, 0 2px 0 rgba(0,0,0,0.8)`,
          zIndex: 24,
        }}
      >
        {phaseText}
      </div>
    );
  };

  // Dua panah penunjuk giliran (kiri & kanan) — KEDUANYA selalu tampil, warna putih.
  // Sisi yang sedang giliran berdenyut terang; sisi lain tampil redup statis.
  // Bisa diganti gambar custom dari PC (dipakai panah kiri, dicerminkan untuk kanan).
  const renderPhaseArrows = () => {
    const frame = resolvePartFrame(resolvedDraftLayout.center);
    const arrows: Array<{ key: 'left' | 'right'; side: DraftSide; pointLeft: boolean }> = [
      { key: 'left', side: 'blue', pointLeft: true },
      { key: 'right', side: 'red', pointLeft: false },
    ];
    return arrows.map(({ key, side, pointLeft }) => {
      const base = PHASE_ARROW_BASE[key];
      const off = normalizePhaseArrowPart(phaseArrowPos?.[key]);
      const isActive = activeSide === side;
      return (
        <motion.div
          key={`center-phase-arrow-${key}`}
          className="pointer-events-none absolute flex items-center justify-center"
          style={{
            left: frame.left + (base.x + off.x) * frame.scaleX,
            top: frame.top + (base.y + off.y) * frame.scaleY,
            width: (base.width + off.width) * frame.scaleX,
            height: (base.height + off.height) * frame.scaleY,
            zIndex: 24,
          }}
          initial={{ opacity: isActive ? 0.4 : 0.45 }}
          animate={isActive ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.45 }}
          transition={
            isActive
              ? { duration: 1.2, ease: 'easeInOut', repeat: Infinity }
              : { duration: 0.3 }
          }
        >
          {phaseArrowImage ? (
            isPhaseArrowVideo(phaseArrowImage) ? (
              <video
                src={phaseArrowImage}
                className="h-full w-full object-contain"
                style={{ transform: pointLeft ? 'none' : 'scaleX(-1)' }}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={phaseArrowImage}
                alt=""
                className="h-full w-full object-contain"
                style={{ transform: pointLeft ? 'none' : 'scaleX(-1)' }}
                draggable={false}
              />
            )
          ) : (
            <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
              <polygon
                points={pointLeft ? '78,12 78,88 18,50' : '22,12 22,88 82,50'}
                fill="#ffffff"
                stroke="rgba(0,0,0,0.55)"
                strokeWidth={4}
                strokeLinejoin="round"
              />
            </svg>
          )}
        </motion.div>
      );
    });
  };

  // Timer draft di tengah (hitung mundur otomatis; nanti dari VisionOCR).
  const renderTimer = () => {
    if (!timerConfN.show) return null;
    const plate = resolveTimerVisual(timerVisual);
    const fontType = resolveTeamNameFontType(plate.fontType);
    const frameRect = resolvePartFrame(resolvedDraftLayout.center);
    const fontScale = (frameRect.scaleX + frameRect.scaleY) / 2;
    // 10 detik terakhir (10..0): angka countdown berubah jadi merah untuk penanda urgensi.
    const isUrgent = timeLeft <= 10;
    const timerColor = isUrgent ? '#ff2d2d' : plate.color;
    return (
      <div
        key="center-timer"
        className="absolute flex items-center justify-center overflow-hidden text-center leading-none"
        style={{
          left: frameRect.left + plate.x * frameRect.scaleX,
          top: frameRect.top + plate.y * frameRect.scaleY,
          width: plate.width * frameRect.scaleX,
          height: plate.height * frameRect.scaleY,
          color: timerColor,
          fontSize: Math.max(1, plate.fontSize * fontScale),
          fontWeight: Math.max(100, fontType.fontWeight + (timerVisual.fontWeight ?? 0)),
          fontFamily: getOverlayFontCssFamily(plate.fontFamilyId),
          fontStyle: fontType.italic ? 'italic' : 'normal',
          textShadow: `0 0 ${Math.max(0, plate.shadowStrength)}px ${plate.shadowColor}, 0 2px 0 rgba(0,0,0,0.8)`,
          zIndex: 25,
        }}
      >
        {formatDraftTimer(timeLeft)}
      </div>
    );
  };

  // Logo tim di panel tengah: biru pojok kiri-bawah, merah pojok kanan-bawah.
  const renderCenterLogos = () => {
    const frame = resolvePartFrame(resolvedDraftLayout.center);
    return (['blue', 'red'] as const).map((side) => {
      const logo = draftData[side].logo;
      if (!logo) return null;
      const base = CENTER_LOGO_SLOTS[side];
      const offset = logoVisual[side] ?? DEFAULT_PICK_SLOT_VISUAL[side];
      return (
        <img
          key={`center-logo-${side}`}
          src={logo}
          alt=""
          className="absolute object-contain"
          style={{
            left: frame.left + (base.x + offset.x) * frame.scaleX,
            top: frame.top + (base.y + offset.y) * frame.scaleY,
            width: (base.width + offset.width) * frame.scaleX,
            height: (base.height + offset.height) * frame.scaleY,
            zIndex: 22,
          }}
          draggable={false}
        />
      );
    });
  };

  // Garis batas area crop foto pemain (5 slot) — bantuan visual saat mengatur posisi objek.
  const renderCropPreview = (side: keyof PickSlotVisual) => {
    if (!showCropPreview) return null;
    const frameRect = resolvePartFrame(resolvedDraftLayout[side]);
    const previewMode: DraftPhotoMode = draftData[side].photoMode === 'logo' ? 'logo' : 'photo';
    const playerOffset = normalizePlayerBoxPart(playerBox?.[side]?.[previewMode]);
    const accent = side === 'blue' ? 'rgba(126,231,255,0.95)' : 'rgba(255,97,200,0.95)';
    return PICK_PHOTO_SLOTS[side].map((slot, index) => (
      <div
        key={`${side}-crop-preview-${index}`}
        className="pointer-events-none absolute flex items-start justify-start"
        style={{
          left: frameRect.left + (slot.x + playerOffset.x) * frameRect.scaleX,
          top: frameRect.top + (slot.y + playerOffset.y) * frameRect.scaleY,
          width: (slot.width + playerOffset.width) * frameRect.scaleX,
          height: (slot.height + playerOffset.height) * frameRect.scaleY,
          border: `2px dashed ${accent}`,
          background: 'rgba(204,255,0,0.06)',
          zIndex: 60,
        }}
      >
        <span
          className="m-0.5 rounded bg-black/70 px-1 text-[8px] font-black leading-tight text-white"
          style={{ color: accent }}
        >
          {index + 1}
        </span>
      </div>
    ));
  };

  const frame = (
    <div className="absolute inset-0 overflow-hidden bg-transparent">
      {renderDraftAnimationArea(
        'blue-draft-animation-area',
        buildDraftVariants(blueTrack, resolvedDraftLayout.blue),
        <>
          {renderBanPhotoSlots('blue')}
          {renderBanLockSlots('blue')}
          {renderPickPhotoSlots('blue')}
          {renderPickPlayerNames('blue')}
          {renderPart(resolvedDraftLayout.blue, DRAF_N_PICK_BLUE_SIDE_ASSET, 'Blue draft panel', 10)}
          {renderTeamNamePlate('blue')}
          {renderCropPreview('blue')}
        </>
      )}
      {renderDraftAnimationArea(
        'red-draft-animation-area',
        buildDraftVariants(redTrack, resolvedDraftLayout.red),
        <>
          {renderBanPhotoSlots('red')}
          {renderBanLockSlots('red')}
          {renderPickPhotoSlots('red')}
          {renderPickPlayerNames('red')}
          {renderPart(resolvedDraftLayout.red, DRAF_N_PICK_RED_SIDE_ASSET, 'Red draft panel', 10)}
          {renderTeamNamePlate('red')}
          {renderCropPreview('red')}
        </>
      )}
      {renderDraftAnimationArea(
        'center-draft-animation-area',
        buildDraftVariants(draftAnimation.center, resolvedDraftLayout.center),
        <>
          {renderPart(resolvedDraftLayout.center, DRAF_N_PICK_CENTER_ASSET, 'Center draft panel', 20)}
          {renderPhaseText()}
          {renderPhaseArrows()}
          {renderTimer()}
          {renderCenterLogos()}
        </>
      )}
    </div>
  );

  const dataPanel = (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-[20px] border border-white/5 bg-zinc-900 p-6 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ccff00]">Match Info</h3>
          <DraftField
            label="Judul"
            value={draftData.title}
            onChange={(title) => setDraftData((prev) => ({ ...prev, title }))}
          />
          <DraftField
            label="Subtitle"
            value={draftData.subtitle}
            onChange={(subtitle) => setDraftData((prev) => ({ ...prev, subtitle }))}
          />
        </div>
        <div className="rounded-[20px] border border-white/5 bg-zinc-900 p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Phase Text (Tengah)</h3>
            <span className="rounded-md border border-[#ccff00]/30 bg-[#ccff00]/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-[#ccff00]">
              Aktif: {phaseText || '—'}
            </span>
          </div>
          <p className="text-[9px] font-bold leading-relaxed text-zinc-500">
            Tulisan fase otomatis mengikuti giliran draft (Ban → Pick → Selesai). Atur posisi/font di tab Visual.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <DraftField
              label="Label Ban"
              value={draftData.phaseBanLabel}
              onChange={(phaseBanLabel) => setDraftData((prev) => ({ ...prev, phaseBanLabel }))}
            />
            <DraftField
              label="Label Pick"
              value={draftData.phasePickLabel}
              onChange={(phasePickLabel) => setDraftData((prev) => ({ ...prev, phasePickLabel }))}
            />
            <DraftField
              label="Label Selesai"
              value={draftData.phaseDoneLabel}
              onChange={(phaseDoneLabel) => setDraftData((prev) => ({ ...prev, phaseDoneLabel }))}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400">Reset Draft</h3>
          <p className="mt-1 text-[9px] font-bold leading-relaxed text-zinc-500">
            Kosongkan semua hero Ban &amp; Pick kedua tim (foto pemain &amp; nama tim tetap).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="shrink-0 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-red-300 transition hover:bg-red-500 hover:text-white"
        >
          Reset All Hero Ban N Pick
        </button>
      </div>

      {/* Toggle GLOBAL area pemain — mengatur Blue & Red sekaligus. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white">Area Pemain (Kedua Tim)</h3>
          <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-600">
            Pilih sekali → berlaku untuk Blue &amp; Red sekaligus
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 p-0.5">
          {(['photo', 'logo'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setBothPhotoMode(mode)}
              className={`rounded-md px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition ${
                draftData.blue.photoMode === mode ? 'bg-[#ccff00] text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {mode === 'photo' ? 'Foto Pemain' : 'Logo Tim'}
            </button>
          ))}
        </div>
      </div>

      {(['blue', 'red'] as const).map((side) => {
        const team = draftData[side];
        const accent = side === 'blue' ? 'text-cyan-300' : 'text-pink-400';
        return (
          <div key={side} className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] ${accent}`}>
                {side === 'blue' ? 'Blue Side' : 'Red Side'}
              </h3>
              <span className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-600">
                {side === 'blue' ? 'Left.webp' : 'Right.webp'}
              </span>
            </div>
            {/* Dropdown DB, Nama Tim, Logo Tim — 1 baris horizontal; menumpuk vertikal saat area sempit (flex-wrap ikut lebar container). */}
            <div className="flex flex-wrap items-end gap-3">
              {projectDbTeams.length > 0 && (
                <label
                  className="min-w-[190px] flex-1 space-y-1.5"
                  title="Mengisi nama tim, logo, foto & nama pemain. Semua tetap bisa diedit manual."
                >
                  <span className="block text-[7px] font-black uppercase tracking-[0.25em] text-[#ccff00]">
                    Ambil dari DB Pemain
                  </span>
                  <select
                    value=""
                    onChange={(event) => {
                      const teamId = event.target.value;
                      if (teamId) applyTeamFromDb(side, teamId);
                      event.target.value = '';
                    }}
                    className="w-full rounded-lg border border-[#ccff00]/30 bg-black px-2 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#ccff00]"
                  >
                    <option value="">— Pilih Tim dari DB —</option>
                    {projectDbTeams.map((dbTeam) => (
                      <option key={dbTeam.id} value={dbTeam.id}>
                        {dbTeam.name} ({dbTeam.players.length} pemain)
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="min-w-[190px] flex-1">
                <DraftField
                  label="Nama Tim"
                  value={team.name}
                  onChange={(name) =>
                    setDraftData((prev) => ({ ...prev, [side]: { ...prev[side], name } }))
                  }
                />
              </div>
              <div className="flex min-w-[210px] flex-1 items-end gap-3">
                <label className="block flex-1">
                  <span className="mb-1.5 block text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">
                    Logo Tim ({side === 'blue' ? 'kiri bawah' : 'kanan bawah'})
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      readImageFileCompressed(
                        file,
                        (logo) =>
                          setDraftData((prev) => ({ ...prev, [side]: { ...prev[side], logo } })),
                        512
                      );
                    }}
                    className="w-full text-[9px] font-bold uppercase tracking-widest text-zinc-500 file:mr-2 file:rounded-md file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-[8px] file:font-black file:uppercase file:tracking-widest file:text-[#ccff00]"
                  />
                </label>
                {/* Kotak logo + tombol Reset MENEMPEL. Reset = kosongkan Nama Pemain + Foto Pemain + Logo. */}
                <div className="flex shrink-0 items-stretch overflow-hidden rounded-lg ring-1 ring-white/10">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-black">
                    {team.logo ? (
                      <img src={team.logo} alt="" className="h-full w-full object-contain p-0.5" />
                    ) : (
                      <span className="text-[7px] font-black uppercase tracking-widest text-zinc-600">Logo</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => resetSideRoster(side)}
                    title="Reset roster sisi ini: Nama Pemain + Foto Pemain + Logo (nama tim & hero tetap)"
                    className="border-l border-white/10 bg-white/5 px-2.5 text-[8px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-red-500 hover:text-white"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
            <div>
              <p className="mb-2 text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">Ban Slots</p>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                {team.bans.map((ban, index) => (
                  <div key={`${side}-ban-${index}`} className="space-y-2 rounded-xl border border-white/5 bg-black/30 p-2">
                    <HeroSearchField
                      label={draftBanLabel(side, index)}
                      value={ban}
                      excluded={usedHeroes}
                      status={draftSlotStatus('ban', side, index, ban)}
                      onChange={(value) =>
                        setDraftData((prev) => ({
                          ...prev,
                          [side]: { ...prev[side], bans: updateSlot(prev[side].bans, index, value) },
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraftData((prev) => ({
                          ...prev,
                          [side]: {
                            ...prev[side],
                            bans: updateSlot(prev[side].bans, index, ''),
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[8px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white hover:text-black"
                    >
                      Clear Hero
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">Pick Slots</p>
                <span className="text-[7px] font-black uppercase tracking-[0.2em] text-zinc-600">
                  Area Pemain: <span className="text-[#ccff00]">{team.photoMode === 'logo' ? 'Logo Tim' : 'Foto Pemain'}</span>
                </span>
              </div>
              {team.photoMode === 'logo' && (
                <p className="mb-2 text-[8px] font-bold leading-relaxed text-zinc-500">
                  Semua slot pemain memakai <span className="text-[#ccff00]">Logo Tim</span>
                  {team.logo ? '.' : ' — upload logo di kolom “Logo Tim” di atas.'}
                </p>
              )}
              {picksComplete && (
                // Fase Last Change: kolom "Cari hero" tiap slot otomatis terfilter — hanya menampilkan
                // hero yang sudah dipick tim ini. Memilih hero milik slot lain akan menukarnya (tanpa duplikat).
                <p className="mb-2 rounded-lg border border-[#ccff00]/25 bg-[#ccff00]/[0.04] px-2.5 py-1.5 text-[8px] font-bold leading-relaxed text-zinc-400">
                  <span className="font-black uppercase tracking-widest text-[#ccff00]">Last Change aktif</span> — kolom “Cari hero” tiap slot kini hanya menampilkan hero milik <span className="text-[#ccff00]">teman satu tim</span> (hero slot itu sendiri disembunyikan). Pilih salah satunya untuk <span className="text-[#ccff00]">menukar</span> (pemain tetap, tanpa animasi masuk).
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                {team.picks.map((pick, index) => (
                  <div key={`${side}-pick-${index}`} className="space-y-2 rounded-xl border border-white/5 bg-black/30 p-2">
                    <HeroSearchField
                      label={draftPickLabel(side, index)}
                      value={pick}
                      excluded={usedHeroes}
                      // Last Change: daftar hero hanya berisi hero yang dipick TEMAN satu tim —
                      // hero milik slot ini sendiri dikecualikan (yang muncul = kandidat untuk ditukar).
                      allowList={
                        picksComplete
                          ? new Set(
                              team.picks
                                .filter((h, i) => i !== index && isKnownDraftHero(h))
                                .map((h) => h.toLowerCase())
                            )
                          : undefined
                      }
                      swapMode={picksComplete}
                      status={draftSlotStatus('pick', side, index, pick)}
                      onChange={(value) => setPickHero(side, index, value)}
                    />
                    {team.photoMode === 'photo' && (
                      <label className="block">
                        <span className="mb-1.5 block text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">
                          Foto Pemain
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            readImageFileCompressed(file, (photo) =>
                              setDraftData((prev) => ({
                                ...prev,
                                [side]: {
                                  ...prev[side],
                                  playerPhotos: updateSlot(prev[side].playerPhotos, index, photo),
                                },
                              }))
                            );
                          }}
                          className="w-full text-[9px] font-bold uppercase tracking-widest text-zinc-500 file:mr-2 file:rounded-md file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-[8px] file:font-black file:uppercase file:tracking-widest file:text-[#ccff00]"
                        />
                      </label>
                    )}
                    <DraftField
                      label="Nama Pemain"
                      value={team.playerNames[index]}
                      onChange={(value) =>
                        setDraftData((prev) => ({
                          ...prev,
                          [side]: {
                            ...prev[side],
                            playerNames: updateSlot(prev[side].playerNames, index, value),
                          },
                        }))
                      }
                    />
                    <DraftField
                      label="Hero Image URL"
                      value={team.pickHeroImages[index]}
                      onChange={(value) =>
                        setDraftData((prev) => ({
                          ...prev,
                          [side]: {
                            ...prev[side],
                            pickHeroImages: updateSlot(prev[side].pickHeroImages, index, value),
                          },
                        }))
                      }
                    />
                    <div className="flex gap-2">
                      {/* Last Change: hero TERKUNCI — tombol hapus per-slot disembunyikan; hapus hanya via "Reset Semua Hero". */}
                      {!picksComplete && (
                        <button
                          type="button"
                          onClick={() =>
                            setDraftData((prev) => ({
                              ...prev,
                              [side]: {
                                ...prev[side],
                                picks: updateSlot(prev[side].picks, index, ''),
                                pickHeroImages: updateSlot(prev[side].pickHeroImages, index, ''),
                              },
                            }))
                          }
                          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[8px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white hover:text-black"
                        >
                          Clear Hero
                        </button>
                      )}
                      {team.photoMode === 'photo' && (
                        <button
                          type="button"
                          onClick={() =>
                            setDraftData((prev) => ({
                              ...prev,
                              [side]: {
                                ...prev[side],
                                playerPhotos: updateSlot(prev[side].playerPhotos, index, ''),
                              },
                            }))
                          }
                          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[8px] font-black uppercase tracking-widest text-zinc-300 hover:bg-white hover:text-black"
                        >
                          Clear Foto
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {showResetConfirm &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => setShowResetConfirm(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-zinc-950 p-6 shadow-2xl animate-in zoom-in-95 duration-150"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-400">
                  <AlertTriangle size={18} />
                </div>
                <h3 className="text-[12px] font-black uppercase tracking-widest text-white">
                  Reset Draft?
                </h3>
              </div>
              <p className="mt-3 text-[10px] font-bold leading-relaxed text-zinc-400">
                Semua hero <span className="text-red-300">Ban &amp; Pick</span> kedua tim akan dikosongkan.
                Foto pemain &amp; nama tim tetap. Tindakan ini tidak bisa dibatalkan.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-white/10"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetAllHeroes();
                    setShowResetConfirm(false);
                  }}
                  className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-red-300 transition hover:bg-red-500 hover:text-white"
                >
                  Ya, Reset
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );

  const visualPanel = (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
      {/* Toggle preview garis batas area crop foto pemain (studio saja) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white">Preview Area Crop</h3>
          <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-600">
            Tampilkan garis batas kotak foto pemain (bantuan atur posisi) — tidak ikut ke Output OBS
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCropPreview((v) => !v)}
          className={`rounded-lg border px-4 py-2 text-[9px] font-black uppercase tracking-widest transition ${
            showCropPreview
              ? 'border-[#ccff00] bg-[#ccff00] text-black'
              : 'border-white/10 bg-white/5 text-[#ccff00] hover:bg-[#ccff00] hover:text-black'
          }`}
        >
          {showCropPreview ? 'Preview: ON' : 'Preview: OFF'}
        </button>
      </div>

      <div className="rounded-2xl border border-[#ccff00]/20 bg-[#ccff00]/5 p-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ccff00]">
          3-Part Draft Frame Layout
        </h3>
        <p className="mt-2 text-[9px] font-bold leading-relaxed text-zinc-500">
          Atur posisi dan ukuran tiap bagian asset: biru, tengah, dan magenta. Nilai memakai canvas 1920x1080.
        </p>
      </div>

      {(['blue', 'center', 'red'] as const).map((partName) => {
        const part = draftLayout[partName];
        const label =
          partName === 'blue' ? 'Blue Side / Right.webp' : partName === 'center' ? 'Center.webp' : 'Red Side / Left.webp';
        return (
          <div key={partName} className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white">{label}</h3>
              <button
                type="button"
                onClick={() => updateLayoutPart(partName, DEFAULT_DRAFT_LAYOUT[partName])}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-[#ccff00] transition hover:bg-[#ccff00] hover:text-black"
              >
                Reset
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <NumberField label="X" value={part.x} onChange={(x) => updateLayoutPart(partName, { x })} />
              <NumberField label="Y" value={part.y} onChange={(y) => updateLayoutPart(partName, { y })} />
              <NumberField
                label="Width"
                value={part.width}
                onChange={(width) => updateLayoutPart(partName, { width })}
              />
              <NumberField
                label="Height"
                value={part.height}
                onChange={(height) => updateLayoutPart(partName, { height })}
              />
              <NumberField
                label="Size Offset"
                value={part.size ?? 100}
                onChange={(size) => updateLayoutPart(partName, { size })}
              />
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => setDraftLayout(DEFAULT_DRAFT_LAYOUT)}
        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-[#ccff00] transition hover:bg-[#ccff00] hover:text-black"
      >
        Reset Layout 3 Bagian
      </button>

      <div className="rounded-2xl border border-[#ccff00]/20 bg-[#ccff00]/5 p-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ccff00]">
          Ban Crop Area
        </h3>
        <p className="mt-2 text-[9px] font-bold leading-relaxed text-zinc-500">
          Kotak crop khusus Hero Ban, terpisah dari pick. Kotak <span className="text-pink-400">Merah = Ban Kanan</span> dan <span className="text-cyan-300">Biru = Ban Kiri</span>. Nilai menggeser semua kotak ban di sisi terkait.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        {(['blue', 'red'] as const).map((side) => {
          const crop = banSlotVisual[side] ?? DEFAULT_PICK_SLOT_VISUAL[side];
          const accent = side === 'blue' ? 'text-cyan-300' : 'text-pink-400';
          return (
            <div key={`${side}-ban-slot-visual`} className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] ${accent}`}>
                  {side === 'blue' ? 'Blue Ban Crop (Kiri)' : 'Red Ban Crop (Kanan)'}
                </h3>
                <button
                  type="button"
                  onClick={() => updateBanSlotVisualPart(side, DEFAULT_PICK_SLOT_VISUAL[side])}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-[#ccff00] transition hover:bg-[#ccff00] hover:text-black"
                >
                  Reset
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <NumberField label="X" value={crop.x} onChange={(x) => updateBanSlotVisualPart(side, { x })} />
                <NumberField label="Y" value={crop.y} onChange={(y) => updateBanSlotVisualPart(side, { y })} />
                <NumberField label="Width" value={crop.width} onChange={(width) => updateBanSlotVisualPart(side, { width })} />
                <NumberField label="Height" value={crop.height} onChange={(height) => updateBanSlotVisualPart(side, { height })} />
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setBanSlotVisual(DEFAULT_PICK_SLOT_VISUAL)}
        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
      >
        Reset Ban Crop Area
      </button>

      {/* Icon Gembok Ban 4 & 5: gambar custom + offset posisi/ukuran (berlaku untuk keempat gembok). */}
      <div className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white">Icon Gembok (Ban 4 &amp; 5)</h3>
          <button
            type="button"
            onClick={() => setBanLock(DEFAULT_BAN_LOCK_CONFIG)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-[#ccff00] transition hover:bg-[#ccff00] hover:text-black"
          >
            Reset
          </button>
        </div>
        {(() => {
          const conf = normalizeBanLockConfig(banLock);
          return (
            <>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <label className="block">
                    <span className="mb-1 block text-[8px] font-black uppercase tracking-widest text-zinc-500">
                      Gambar Gembok (dari PC)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        readImageFileCompressed(file, (img) => updateBanLockPart({ image: img }), 256);
                      }}
                      className="w-full text-[9px] font-bold uppercase tracking-widest text-zinc-500 file:mr-2 file:rounded-md file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-[8px] file:font-black file:uppercase file:tracking-widest file:text-[#ccff00]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[8px] font-black uppercase tracking-widest text-zinc-500">
                      Atau tempel Link/URL Gambar
                    </span>
                    <input
                      type="text"
                      value={conf.image.startsWith('data:') ? '' : conf.image}
                      onChange={(event) => updateBanLockPart({ image: event.target.value })}
                      placeholder="https://… .png / .webp (kosong = gembok putih default)"
                      className="w-full rounded-lg border border-white/10 bg-black px-2 py-2 text-[9px] font-bold tracking-widest text-white outline-none focus:border-[#ccff00]"
                    />
                  </label>
                </div>
                {conf.image ? (
                  <div className="flex shrink-0 items-stretch overflow-hidden rounded-lg ring-1 ring-white/10">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-black">
                      <img src={conf.image} alt="" className="h-full w-full object-contain p-1" />
                    </div>
                    <button
                      type="button"
                      onClick={() => updateBanLockPart({ image: '' })}
                      className="bg-white/5 px-2 text-[8px] font-black uppercase tracking-widest text-red-300 transition hover:bg-red-500 hover:text-white"
                    >
                      Hapus
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <NumberField label="X" value={conf.x} onChange={(x) => updateBanLockPart({ x })} />
                <NumberField label="Y" value={conf.y} onChange={(y) => updateBanLockPart({ y })} />
                <NumberField label="Width" value={conf.width} onChange={(width) => updateBanLockPart({ width })} />
                <NumberField label="Height" value={conf.height} onChange={(height) => updateBanLockPart({ height })} />
              </div>
            </>
          );
        })()}
        <p className="text-[9px] font-bold leading-relaxed text-zinc-500">
          Gembok tampil di slot <span className="text-[#ccff00]">Ban 4 &amp; 5</span> kedua tim selama fase ban kedua belum dimulai, lalu
          <span className="text-[#ccff00]"> hilang otomatis (fade)</span> begitu giliran Ban 4 tim tersebut tiba (Merah: urutan #13, Biru: #14).
          Kosongkan gambar untuk memakai ikon gembok putih bawaan. Offset X/Y/W/H dihitung dari kotak slot ban (ikut Ban Crop Area).
        </p>
      </div>

      <div className="rounded-2xl border border-[#ccff00]/20 bg-[#ccff00]/5 p-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ccff00]">
          Pick Crop Area
        </h3>
        <p className="mt-2 text-[9px] font-bold leading-relaxed text-zinc-500">
          Area crop khusus kotak pick/pemain, mengikuti frame Right/Left. Nilai ini menggeser semua kotak pick di sisi terkait.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        {(['blue', 'red'] as const).map((side) => {
          const crop = pickSlotVisual[side] ?? DEFAULT_PICK_SLOT_VISUAL[side];
          const accent = side === 'blue' ? 'text-cyan-300' : 'text-pink-400';
          return (
            <div key={`${side}-pick-slot-visual`} className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] ${accent}`}>
                  {side === 'blue' ? 'Blue Pick Crop (Kiri)' : 'Red Pick Crop (Kanan)'}
                </h3>
                <button
                  type="button"
                  onClick={() => updatePickSlotVisualPart(side, DEFAULT_PICK_SLOT_VISUAL[side])}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-[#ccff00] transition hover:bg-[#ccff00] hover:text-black"
                >
                  Reset
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <NumberField label="X" value={crop.x} onChange={(x) => updatePickSlotVisualPart(side, { x })} />
                <NumberField label="Y" value={crop.y} onChange={(y) => updatePickSlotVisualPart(side, { y })} />
                <NumberField label="Width" value={crop.width} onChange={(width) => updatePickSlotVisualPart(side, { width })} />
                <NumberField label="Height" value={crop.height} onChange={(height) => updatePickSlotVisualPart(side, { height })} />
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setPickSlotVisual(DEFAULT_PICK_SLOT_VISUAL)}
        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
      >
        Reset Crop Area
      </button>

      {(() => {
        const boxMode = draftData.blue.photoMode;
        const modeLabel = boxMode === 'logo' ? 'Logo Tim' : 'Foto Pemain';
        return (
          <>
            <div className="rounded-2xl border border-[#ccff00]/20 bg-[#ccff00]/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ccff00]">
                  Posisi &amp; Ukuran Kotak — {modeLabel}
                </h3>
                {/* Toggle mode di sini juga (global) supaya kontrol langsung berganti Foto/Logo */}
                <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 p-0.5">
                  {(['photo', 'logo'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setBothPhotoMode(mode)}
                      className={`rounded-md px-3 py-1 text-[8px] font-black uppercase tracking-widest transition ${
                        boxMode === mode ? 'bg-[#ccff00] text-black' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {mode === 'photo' ? 'Foto Pemain' : 'Logo Tim'}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-[9px] font-bold leading-relaxed text-zinc-500">
                Ukuran &amp; posisi <span className="text-[#ccff00]">KOTAK</span> untuk mode <span className="text-[#ccff00]">{modeLabel}</span>. Setelan Foto &amp; Logo <span className="text-[#ccff00]">terpisah</span> — ganti mode di atas untuk mengatur yang lain. Menggeser/zoom isi objek ada di bagian “Posisi Objek” di bawah.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
              {(['blue', 'red'] as const).map((side) => {
                const crop = normalizePlayerBoxPart(playerBox?.[side]?.[boxMode]);
                const accent = side === 'blue' ? 'text-cyan-300' : 'text-pink-400';
                return (
                  <div key={`${side}-player-box`} className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] ${accent}`}>
                        {side === 'blue' ? 'Blue' : 'Red'} — Area Crop {modeLabel}
                      </h3>
                      <button
                        type="button"
                        onClick={() => updatePlayerBox(side, boxMode, EMPTY_BOX_PART)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-[#ccff00] transition hover:bg-[#ccff00] hover:text-black"
                      >
                        Reset
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                      <NumberField label="X" value={crop.x} onChange={(x) => updatePlayerBox(side, boxMode, { x })} />
                      <NumberField label="Y" value={crop.y} onChange={(y) => updatePlayerBox(side, boxMode, { y })} />
                      <NumberField label="Width" value={crop.width} onChange={(width) => updatePlayerBox(side, boxMode, { width })} />
                      <NumberField label="Height" value={crop.height} onChange={(height) => updatePlayerBox(side, boxMode, { height })} />
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                updatePlayerBox('blue', boxMode, EMPTY_BOX_PART);
                updatePlayerBox('red', boxMode, EMPTY_BOX_PART);
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
            >
              Reset Kotak {modeLabel} (Blue &amp; Red)
            </button>
          </>
        );
      })()}

      {/* Posisi OBJEK (foto/logo) DI DALAM kotak crop — kotak crop tetap. Mengikuti mode aktif (global). */}
      {(() => {
        const objMode = draftData.blue.photoMode;
        return (
          <>
            <div className="rounded-2xl border border-[#ccff00]/20 bg-[#ccff00]/5 p-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ccff00]">
                Posisi Objek — {objMode === 'logo' ? 'Logo Tim' : 'Foto Pemain'}
              </h3>
              <p className="mt-2 text-[9px] font-bold leading-relaxed text-zinc-500">
                Geser &amp; zoom <span className="text-[#ccff00]">isi objek</span> di dalam kotak crop — <span className="text-[#ccff00]">kotak crop TIDAK berubah</span>. Kontrol ini mengikuti mode aktif
                (<span className="text-[#ccff00]">{objMode === 'logo' ? 'LOGO TIM' : 'FOTO PEMAIN'}</span>); ganti mode di tab Data. Setelan Foto &amp; Logo disimpan terpisah.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
              {(['blue', 'red'] as const).map((side) => {
                const adj = normalizeObjectAdjust(objectAdjust?.[side]?.[objMode]);
                const effFit = adj.fit ?? (objMode === 'logo' ? 'contain' : 'cover');
                const accent = side === 'blue' ? 'text-cyan-300' : 'text-pink-400';
                return (
                  <div key={`${side}-object-adjust`} className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] ${accent}`}>
                        {side === 'blue' ? 'Blue' : 'Red'} — {objMode === 'logo' ? 'Logo' : 'Foto'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => updateObjectAdjust(side, objMode, DEFAULT_OBJECT_ADJUST)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-[#ccff00] transition hover:bg-[#ccff00] hover:text-black"
                      >
                        Reset
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/40 p-1">
                      <span className="px-1 text-[7px] font-black uppercase tracking-[0.2em] text-zinc-500">Muat:</span>
                      <div className="flex flex-1 items-center gap-1">
                        {(['cover', 'contain'] as const).map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => updateObjectAdjust(side, objMode, { fit: f })}
                            className={`flex-1 rounded-md px-2 py-1 text-[7px] font-black uppercase tracking-widest transition ${
                              effFit === f ? 'bg-[#ccff00] text-black' : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            {f === 'cover' ? 'Penuh (crop)' : 'Utuh (full)'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <NumberField label="Geser X" value={adj.x} onChange={(x) => updateObjectAdjust(side, objMode, { x })} />
                      <NumberField label="Geser Y" value={adj.y} onChange={(y) => updateObjectAdjust(side, objMode, { y })} />
                      <NumberField label="Zoom %" value={adj.scale} onChange={(scale) => updateObjectAdjust(side, objMode, { scale })} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}

      <div className="rounded-2xl border border-[#ccff00]/20 bg-[#ccff00]/5 p-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ccff00]">
          Logo Tim (Center)
        </h3>
        <p className="mt-2 text-[9px] font-bold leading-relaxed text-zinc-500">
          Posisi &amp; ukuran logo di panel tengah. <span className="text-cyan-300">Biru = pojok kiri bawah</span>, <span className="text-pink-400">Merah = pojok kanan bawah</span>. Nilai adalah geseran dari posisi dasar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        {(['blue', 'red'] as const).map((side) => {
          const pos = logoVisual[side] ?? DEFAULT_PICK_SLOT_VISUAL[side];
          const accent = side === 'blue' ? 'text-cyan-300' : 'text-pink-400';
          return (
            <div key={`${side}-logo-visual`} className="space-y-3 rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] ${accent}`}>
                  {side === 'blue' ? 'Blue Logo (Kiri Bawah)' : 'Red Logo (Kanan Bawah)'}
                </h3>
                <button
                  type="button"
                  onClick={() => updateLogoVisualPart(side, DEFAULT_PICK_SLOT_VISUAL[side])}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-[#ccff00] transition hover:bg-[#ccff00] hover:text-black"
                >
                  Reset
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <NumberField label="X" value={pos.x} onChange={(x) => updateLogoVisualPart(side, { x })} />
                <NumberField label="Y" value={pos.y} onChange={(y) => updateLogoVisualPart(side, { y })} />
                <NumberField label="Width" value={pos.width} onChange={(width) => updateLogoVisualPart(side, { width })} />
                <NumberField label="Height" value={pos.height} onChange={(height) => updateLogoVisualPart(side, { height })} />
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setLogoVisual(DEFAULT_PICK_SLOT_VISUAL)}
        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
      >
        Reset Logo Tim
      </button>

      <div className="rounded-2xl border border-[#ccff00]/20 bg-[#ccff00]/5 p-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ccff00]">
          Phase Text (Center)
        </h3>
        <p className="mt-2 text-[9px] font-bold leading-relaxed text-zinc-500">
          Posisi, ukuran &amp; font tulisan fase (Ban/Pick) di panel tengah. Nilai angka adalah offset dari default.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white">Phase Text</h3>
          <button
            type="button"
            onClick={() => setPhaseVisual(DEFAULT_PHASE_VISUAL)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-[#ccff00] transition hover:bg-[#ccff00] hover:text-black"
          >
            Reset
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
          <NumberField label="X" value={phaseVisual.x} onChange={(x) => updatePhaseVisual({ x })} />
          <NumberField label="Y" value={phaseVisual.y} onChange={(y) => updatePhaseVisual({ y })} />
          <NumberField label="Width" value={phaseVisual.width} onChange={(width) => updatePhaseVisual({ width })} />
          <NumberField label="Height" value={phaseVisual.height} onChange={(height) => updatePhaseVisual({ height })} />
          <NumberField label="Font Size" value={phaseVisual.fontSize} onChange={(fontSize) => updatePhaseVisual({ fontSize })} />
          <NumberField label="Font Weight" value={phaseVisual.fontWeight} onChange={(fontWeight) => updatePhaseVisual({ fontWeight })} />
          <NumberField label="Shadow" value={phaseVisual.shadowStrength} onChange={(shadowStrength) => updatePhaseVisual({ shadowStrength })} />
          <label className="block space-y-1.5 lg:col-span-2">
            <span className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">Jenis Font</span>
            <OverlayFontFamilySelect
              value={phaseVisual.fontFamilyId}
              onChange={(fontFamilyId) => updatePhaseVisual({ fontFamilyId })}
              className="w-full rounded-lg border border-white/10 bg-black px-2 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#ccff00]"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">Type Font</span>
            <select
              value={phaseVisual.fontType ?? PHASE_VISUAL_BASE.fontType}
              onChange={(event) =>
                updatePhaseVisual({ fontType: event.target.value as NonNullable<TeamNameVisualPart['fontType']> })
              }
              className="w-full rounded-lg border border-white/10 bg-black px-2 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#ccff00]"
            >
              {TEAM_NAME_FONT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">Color</span>
            <input
              type="color"
              value={phaseVisual.color || PHASE_VISUAL_BASE.color}
              onChange={(event) => updatePhaseVisual({ color: event.target.value })}
              className="h-[34px] w-full rounded-lg border border-white/10 bg-black px-2 py-1 outline-none"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">Shadow Color</span>
            <input
              type="color"
              value={phaseVisual.shadowColor || PHASE_VISUAL_BASE.shadowColor}
              onChange={(event) => updatePhaseVisual({ shadowColor: event.target.value })}
              className="h-[34px] w-full rounded-lg border border-white/10 bg-black px-2 py-1 outline-none"
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white">Phase Arrow (Kiri &amp; Kanan)</h3>
            <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-600">
              Keduanya selalu tampil • yang giliran berdenyut • warna putih
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPhaseArrowPos(DEFAULT_PHASE_ARROW_POS)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-[#ccff00] transition hover:bg-[#ccff00] hover:text-black"
          >
            Reset Posisi
          </button>
        </div>

        {/* Media custom panah (opsional): upload gambar/video dari PC ATAU tempel link. Dipakai panah kiri, dicerminkan untuk kanan. */}
        <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[180px] flex-1">
              <span className="mb-1.5 block text-[7px] font-black uppercase tracking-[0.25em] text-[#ccff00]">
                Gambar / Video Panah (dari PC)
              </span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.type.startsWith('video/')) {
                    if (file.size > 5 * 1024 * 1024) {
                      alert('Video terlalu besar (maks ~5MB untuk upload). Untuk video besar, pakai kolom Link/URL.');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => setPhaseArrowImage(String(reader.result ?? ''));
                    reader.readAsDataURL(file);
                  } else {
                    readImageFileCompressed(file, (img) => setPhaseArrowImage(img), 256);
                  }
                }}
                className="w-full text-[9px] font-bold uppercase tracking-widest text-zinc-500 file:mr-2 file:rounded-md file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-[8px] file:font-black file:uppercase file:tracking-widest file:text-[#ccff00]"
              />
            </label>
            <label className="min-w-[180px] flex-1">
              <span className="mb-1.5 block text-[7px] font-black uppercase tracking-[0.25em] text-[#ccff00]">
                Atau tempel Link (gambar/video)
              </span>
              <input
                type="text"
                value={phaseArrowImage.startsWith('data:') ? '' : phaseArrowImage}
                onChange={(event) => setPhaseArrowImage(event.target.value)}
                placeholder="https://… .png / .webp / .mp4 / .webm"
                className="w-full rounded-lg border border-white/10 bg-black px-2 py-2 text-[9px] font-bold tracking-widest text-white outline-none focus:border-[#ccff00]"
              />
            </label>
            {phaseArrowImage ? (
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-black ring-1 ring-white/10">
                  {isPhaseArrowVideo(phaseArrowImage) ? (
                    <video src={phaseArrowImage} className="h-full w-full object-contain" autoPlay muted loop playsInline />
                  ) : (
                    <img src={phaseArrowImage} alt="" className="h-full w-full object-contain p-0.5" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPhaseArrowImage('')}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-widest text-zinc-300 transition hover:bg-red-500 hover:text-white"
                >
                  Hapus
                </button>
              </div>
            ) : null}
          </div>
          <span className="block text-[7px] font-bold leading-relaxed tracking-[0.15em] text-zinc-500">
            Kosong = panah putih default. Media dipakai untuk panah <span className="text-[#ccff00]">KIRI</span>, otomatis dicerminkan untuk <span className="text-[#ccff00]">KANAN</span>. Video di-loop tanpa suara — untuk video besar disarankan pakai <span className="text-[#ccff00]">Link/URL</span> (upload maks ~5MB).
          </span>
        </div>

        {/* Posisi & ukuran tiap panah */}
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          {(['left', 'right'] as const).map((key) => {
            const pos = normalizePhaseArrowPart(phaseArrowPos?.[key]);
            return (
              <div key={`phase-arrow-${key}`} className="space-y-2 rounded-xl border border-white/5 bg-black/30 p-3">
                <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-300">
                  {key === 'left' ? 'Panah Kiri (giliran biru)' : 'Panah Kanan (giliran merah)'}
                </h4>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  <NumberField label="X" value={pos.x} onChange={(x) => updatePhaseArrowPos(key, { x })} />
                  <NumberField label="Y" value={pos.y} onChange={(y) => updatePhaseArrowPos(key, { y })} />
                  <NumberField label="Width" value={pos.width} onChange={(width) => updatePhaseArrowPos(key, { width })} />
                  <NumberField label="Height" value={pos.height} onChange={(height) => updatePhaseArrowPos(key, { height })} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-[#ccff00]/20 bg-[#ccff00]/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ccff00]">
            Timer (Center) — Otomatis
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateTimerConf({ show: !timerConfN.show })}
              className={`rounded-lg border px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition ${
                timerConfN.show ? 'border-[#ccff00] bg-[#ccff00] text-black' : 'border-white/10 bg-white/5 text-[#ccff00] hover:bg-[#ccff00] hover:text-black'
              }`}
            >
              {timerConfN.show ? 'Tampil: ON' : 'Tampil: OFF'}
            </button>
            <button
              type="button"
              onClick={() => updateTimerConf({ sound: !timerConfN.sound })}
              className={`rounded-lg border px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition ${
                timerConfN.sound ? 'border-[#ccff00] bg-[#ccff00] text-black' : 'border-white/10 bg-white/5 text-[#ccff00] hover:bg-[#ccff00] hover:text-black'
              }`}
            >
              {timerConfN.sound ? '🔊 Suara: ON' : '🔇 Suara: OFF'}
            </button>
          </div>
        </div>
        <p className="mt-2 text-[9px] font-bold leading-relaxed text-zinc-500">
          Hitung mundur otomatis durasi <span className="text-[#ccff00]">Ban</span> &amp; <span className="text-[#ccff00]">Pick</span> — reset tiap giliran. Beep di <span className="text-[#ccff00]">10 detik terakhir</span> (tick 10→1) + bunyi akhir di 0. Sementara sebelum terhubung <span className="text-[#ccff00]">VisionOCR</span>.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white">Timer</h3>
          <button
            type="button"
            onClick={() => {
              setTimerVisual(DEFAULT_TIMER_VISUAL);
              updateTimerConf(DEFAULT_TIMER_CONF);
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-[#ccff00] transition hover:bg-[#ccff00] hover:text-black"
          >
            Reset
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          <NumberField label="Durasi Ban (dtk)" value={timerConfN.banSec} onChange={(banSec) => updateTimerConf({ banSec: Math.max(1, banSec) })} />
          <NumberField label="Durasi Pick (dtk)" value={timerConfN.pickSec} onChange={(pickSec) => updateTimerConf({ pickSec: Math.max(1, pickSec) })} />
          <NumberField label="Durasi Last Change (dtk)" value={timerConfN.lastChangeSec} onChange={(lastChangeSec) => updateTimerConf({ lastChangeSec: Math.max(1, lastChangeSec) })} />
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
          <NumberField label="X" value={timerVisual.x} onChange={(x) => updateTimerVisual({ x })} />
          <NumberField label="Y" value={timerVisual.y} onChange={(y) => updateTimerVisual({ y })} />
          <NumberField label="Width" value={timerVisual.width} onChange={(width) => updateTimerVisual({ width })} />
          <NumberField label="Height" value={timerVisual.height} onChange={(height) => updateTimerVisual({ height })} />
          <NumberField label="Font Size" value={timerVisual.fontSize} onChange={(fontSize) => updateTimerVisual({ fontSize })} />
          <NumberField label="Font Weight" value={timerVisual.fontWeight} onChange={(fontWeight) => updateTimerVisual({ fontWeight })} />
          <NumberField label="Shadow" value={timerVisual.shadowStrength} onChange={(shadowStrength) => updateTimerVisual({ shadowStrength })} />
          <label className="block space-y-1.5 lg:col-span-2">
            <span className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">Jenis Font</span>
            <OverlayFontFamilySelect
              value={timerVisual.fontFamilyId}
              onChange={(fontFamilyId) => updateTimerVisual({ fontFamilyId })}
              className="w-full rounded-lg border border-white/10 bg-black px-2 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#ccff00]"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">Type Font</span>
            <select
              value={timerVisual.fontType ?? TIMER_VISUAL_BASE.fontType}
              onChange={(event) => updateTimerVisual({ fontType: event.target.value as NonNullable<TeamNameVisualPart['fontType']> })}
              className="w-full rounded-lg border border-white/10 bg-black px-2 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#ccff00]"
            >
              {TEAM_NAME_FONT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">Color</span>
            <input
              type="color"
              value={timerVisual.color || TIMER_VISUAL_BASE.color}
              onChange={(event) => updateTimerVisual({ color: event.target.value })}
              className="h-[34px] w-full rounded-lg border border-white/10 bg-black px-2 py-1 outline-none"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">Shadow Color</span>
            <input
              type="color"
              value={timerVisual.shadowColor || TIMER_VISUAL_BASE.shadowColor}
              onChange={(event) => updateTimerVisual({ shadowColor: event.target.value })}
              className="h-[34px] w-full rounded-lg border border-white/10 bg-black px-2 py-1 outline-none"
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-[#ccff00]/20 bg-[#ccff00]/5 p-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ccff00]">
          Team Name Visual
        </h3>
        <p className="mt-2 text-[9px] font-bold leading-relaxed text-zinc-500">
          Nilai angka adalah offset dari default. Warna dan italic memakai nilai final.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        {(['blue', 'red'] as const).map((side) => {
          const visual = teamNameVisual[side];
          const fit = normalizeTeamNameFitPart(teamNameFit?.[side]);
          const accent = side === 'blue' ? 'text-cyan-300' : 'text-pink-400';
          return (
            <div key={`${side}-team-name-visual`} className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] ${accent}`}>
                  {side === 'blue' ? 'Blue Team Name' : 'Red Team Name'}
                </h3>
                <button
                  type="button"
                  onClick={() => updateTeamNameVisualPart(side, DEFAULT_TEAM_NAME_VISUAL[side])}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-[#ccff00] transition hover:bg-[#ccff00] hover:text-black"
                >
                  Reset
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
                <NumberField label="X" value={visual.x} onChange={(x) => updateTeamNameVisualPart(side, { x })} />
                <NumberField label="Y" value={visual.y} onChange={(y) => updateTeamNameVisualPart(side, { y })} />
                <NumberField label="Width" value={visual.width} onChange={(width) => updateTeamNameVisualPart(side, { width })} />
                <NumberField label="Height" value={visual.height} onChange={(height) => updateTeamNameVisualPart(side, { height })} />
                <NumberField label="Font Size" value={visual.fontSize} onChange={(fontSize) => updateTeamNameVisualPart(side, { fontSize })} />
                <NumberField label="Font Weight" value={visual.fontWeight} onChange={(fontWeight) => updateTeamNameVisualPart(side, { fontWeight })} />
                <NumberField label="Shadow" value={visual.shadowStrength} onChange={(shadowStrength) => updateTeamNameVisualPart(side, { shadowStrength })} />
                <label className="block space-y-1.5 lg:col-span-2">
                  <span className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">Jenis Font</span>
                  <OverlayFontFamilySelect
                    value={visual.fontFamilyId}
                    onChange={(fontFamilyId) => updateTeamNameVisualPart(side, { fontFamilyId })}
                    className="w-full rounded-lg border border-white/10 bg-black px-2 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#ccff00]"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">Type Font</span>
                  <select
                    value={visual.fontType ?? TEAM_NAME_VISUAL_BASE[side].fontType}
                    onChange={(event) =>
                      updateTeamNameVisualPart(side, {
                        fontType: event.target.value as NonNullable<TeamNameVisualPart['fontType']>,
                      })
                    }
                    className="w-full rounded-lg border border-white/10 bg-black px-2 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#ccff00]"
                  >
                    {TEAM_NAME_FONT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2 lg:col-span-2">
                  <label className="block space-y-1.5">
                    <span className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">Color</span>
                    <input
                      type="color"
                      value={visual.color || TEAM_NAME_VISUAL_BASE[side].color}
                      onChange={(event) => updateTeamNameVisualPart(side, { color: event.target.value })}
                      className="h-[34px] w-full rounded-lg border border-white/10 bg-black px-2 py-1 outline-none"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">Shadow Color</span>
                    <input
                      type="color"
                      value={visual.shadowColor || TEAM_NAME_VISUAL_BASE[side].shadowColor}
                      onChange={(event) => updateTeamNameVisualPart(side, { shadowColor: event.target.value })}
                      className="h-[34px] w-full rounded-lg border border-white/10 bg-black px-2 py-1 outline-none"
                    />
                  </label>
                </div>
                {/* Muat nama tim di box: auto-fit + wrap multi-baris */}
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/40 p-2.5 lg:col-span-3 xl:col-span-4">
                  <button
                    type="button"
                    onClick={() => updateTeamNameFitPart(side, { autoFit: !fit.autoFit })}
                    className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-[8px] font-black uppercase tracking-widest transition ${fit.autoFit
                      ? 'border-[#ccff00]/40 bg-[#ccff00]/10 text-[#ccff00]'
                      : 'border-white/10 bg-black text-zinc-500 hover:text-white'
                      }`}
                  >
                    <span>Auto-Fit (muat box)</span>
                    <span>{fit.autoFit ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTeamNameFitPart(side, { wrap: !fit.wrap })}
                    className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-[8px] font-black uppercase tracking-widest transition ${fit.wrap
                      ? 'border-[#ccff00]/40 bg-[#ccff00]/10 text-[#ccff00]'
                      : 'border-white/10 bg-black text-zinc-500 hover:text-white'
                      }`}
                  >
                    <span>Multi-Baris (wrap)</span>
                    <span>{fit.wrap ? 'ON' : 'OFF'}</span>
                  </button>
                  <div className={`col-span-2 ${fit.wrap ? '' : 'pointer-events-none opacity-40'}`}>
                    <NumberField
                      label="Maks Baris (saat wrap)"
                      value={fit.maxLines}
                      onChange={(maxLines) => updateTeamNameFitPart(side, { maxLines })}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          setTeamNameVisual(DEFAULT_TEAM_NAME_VISUAL);
          setTeamNameFit(DEFAULT_TEAM_NAME_FIT);
        }}
        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
      >
        Reset Team Name Visual
      </button>

      <div className="rounded-2xl border border-[#ccff00]/20 bg-[#ccff00]/5 p-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ccff00]">
          Player Name Visual
        </h3>
        <p className="mt-2 text-[9px] font-bold leading-relaxed text-zinc-500">
          Posisi, ukuran &amp; font teks nama pemain di tiap slot pick. Nilai angka adalah offset dari default
          (posisi mengikuti kolom foto pemain). Berlaku untuk kelima slot di sisi yang sama.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        {(['blue', 'red'] as const).map((side) => {
          const visual = playerNameVisual[side];
          const accent = side === 'blue' ? 'text-cyan-300' : 'text-pink-400';
          return (
            <div key={`${side}-player-name-visual`} className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] ${accent}`}>
                  {side === 'blue' ? 'Blue Player Names' : 'Red Player Names'}
                </h3>
                <button
                  type="button"
                  onClick={() => updatePlayerNameVisualPart(side, DEFAULT_PLAYER_NAME_VISUAL[side])}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest text-[#ccff00] transition hover:bg-[#ccff00] hover:text-black"
                >
                  Reset
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
                <NumberField label="X" value={visual.x} onChange={(x) => updatePlayerNameVisualPart(side, { x })} />
                <NumberField label="Y" value={visual.y} onChange={(y) => updatePlayerNameVisualPart(side, { y })} />
                <NumberField label="Width" value={visual.width} onChange={(width) => updatePlayerNameVisualPart(side, { width })} />
                <NumberField label="Height" value={visual.height} onChange={(height) => updatePlayerNameVisualPart(side, { height })} />
                <NumberField label="Font Size" value={visual.fontSize} onChange={(fontSize) => updatePlayerNameVisualPart(side, { fontSize })} />
                <NumberField label="Font Weight" value={visual.fontWeight} onChange={(fontWeight) => updatePlayerNameVisualPart(side, { fontWeight })} />
                <NumberField label="Shadow" value={visual.shadowStrength} onChange={(shadowStrength) => updatePlayerNameVisualPart(side, { shadowStrength })} />
                <label className="block space-y-1.5 lg:col-span-2">
                  <span className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">Jenis Font</span>
                  <OverlayFontFamilySelect
                    value={visual.fontFamilyId}
                    onChange={(fontFamilyId) => updatePlayerNameVisualPart(side, { fontFamilyId })}
                    className="w-full rounded-lg border border-white/10 bg-black px-2 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#ccff00]"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">Type Font</span>
                  <select
                    value={visual.fontType ?? PLAYER_NAME_VISUAL_BASE.fontType}
                    onChange={(event) =>
                      updatePlayerNameVisualPart(side, {
                        fontType: event.target.value as NonNullable<TeamNameVisualPart['fontType']>,
                      })
                    }
                    className="w-full rounded-lg border border-white/10 bg-black px-2 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-[#ccff00]"
                  >
                    {TEAM_NAME_FONT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2 lg:col-span-2">
                  <label className="block space-y-1.5">
                    <span className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">Color</span>
                    <input
                      type="color"
                      value={visual.color || PLAYER_NAME_VISUAL_BASE.color}
                      onChange={(event) => updatePlayerNameVisualPart(side, { color: event.target.value })}
                      className="h-[34px] w-full rounded-lg border border-white/10 bg-black px-2 py-1 outline-none"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-[7px] font-black uppercase tracking-[0.25em] text-zinc-600">Shadow Color</span>
                    <input
                      type="color"
                      value={visual.shadowColor || PLAYER_NAME_VISUAL_BASE.shadowColor}
                      onChange={(event) => updatePlayerNameVisualPart(side, { shadowColor: event.target.value })}
                      className="h-[34px] w-full rounded-lg border border-white/10 bg-black px-2 py-1 outline-none"
                    />
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setPlayerNameVisual(DEFAULT_PLAYER_NAME_VISUAL)}
        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
      >
        Reset Player Name Visual
      </button>
    </div>
  );

  const animationPanel = (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl border border-[#ccff00]/20 bg-[#ccff00]/5 p-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ccff00]">
          Custom Draft Animation
        </h3>
        <p className="mt-2 text-[9px] font-bold leading-relaxed text-zinc-500">
          Blue Side menjadi kontrol utama. Red Side otomatis mirror arah horizontal: slide right menjadi slide left, dan sebaliknya.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">
              Side Panels
            </h3>
            <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-600">
              Blue controls, Red mirrors
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black px-3 py-2 text-[8px] font-black uppercase tracking-widest text-zinc-400">
            Red IN: <span className="text-pink-400">{mirrorHorizontalTransition(blueTrack.inType).replace('-', ' ')}</span>
            {' / '}
            Red OUT: <span className="text-pink-400">{mirrorHorizontalTransition(blueTrack.outType).replace('-', ' ')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SelectField
            label="Blue IN"
            value={blueTrack.inType}
            options={SIDE_TRANSITIONS}
            onChange={(inType) => updateSideAnimation({ inType })}
          />
          <SelectField
            label="Blue OUT"
            value={blueTrack.outType}
            options={SIDE_TRANSITIONS}
            onChange={(outType) => updateSideAnimation({ outType })}
          />
          <SelectField
            label="Easing"
            value={blueTrack.easing}
            options={EASING_OPTIONS}
            onChange={(easing) => updateSideAnimation({ easing })}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <NumberField
            label="Duration"
            value={blueTrack.duration}
            onChange={(duration) => updateSideAnimation({ duration: Math.max(0.05, duration) })}
          />
          <NumberField
            label="Blue Delay"
            value={blueTrack.delay}
            onChange={(delay) => updateSideAnimation({ delay: Math.max(0, delay) })}
          />
          <NumberField
            label="Red Delay Offset"
            value={blueTrack.redDelayOffset}
            onChange={(redDelayOffset) => updateSideAnimation({ redDelayOffset })}
          />
          <button
            type="button"
            onClick={() => updateSideAnimation(DEFAULT_DRAFT_ANIMATION.sides)}
            className="mt-[19px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-300 hover:text-black"
          >
            Reset Sides
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5 space-y-4">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ccff00]">
            Center Panel
          </h3>
          <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-600">
            Independent animation track
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SelectField
            label="Center IN"
            value={draftAnimation.center.inType}
            options={CENTER_TRANSITIONS}
            onChange={(inType) => updateCenterAnimation({ inType })}
          />
          <SelectField
            label="Center OUT"
            value={draftAnimation.center.outType}
            options={CENTER_TRANSITIONS}
            onChange={(outType) => updateCenterAnimation({ outType })}
          />
          <SelectField
            label="Easing"
            value={draftAnimation.center.easing}
            options={EASING_OPTIONS}
            onChange={(easing) => updateCenterAnimation({ easing })}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <NumberField
            label="Duration"
            value={draftAnimation.center.duration}
            onChange={(duration) => updateCenterAnimation({ duration: Math.max(0.05, duration) })}
          />
          <NumberField
            label="Delay"
            value={draftAnimation.center.delay}
            onChange={(delay) => updateCenterAnimation({ delay: Math.max(0, delay) })}
          />
          <button
            type="button"
            onClick={() => updateCenterAnimation(DEFAULT_DRAFT_ANIMATION.center)}
            className="mt-[19px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#ccff00] transition hover:bg-[#ccff00] hover:text-black"
          >
            Reset Center
          </button>
          <button
            type="button"
            onClick={() => setDraftAnimation(DEFAULT_DRAFT_ANIMATION)}
            className="mt-[19px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
          >
            Reset All
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <TeamRosterView
      {...props}
      masterFrameContent={frame}
      customDataPanel={dataPanel}
      customVisualPanel={visualPanel}
      customAnimationPanel={animationPanel}
    />
  );
};

export default DrafNPickView;
