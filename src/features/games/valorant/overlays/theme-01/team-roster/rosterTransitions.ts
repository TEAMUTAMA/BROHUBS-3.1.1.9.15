import type { AnimationConfig } from '@/constants/transitions';
import { ANIMATION_PRESETS } from '@/constants/transitions';

/**
 * Style transisi esports khusus asset TEAM ROSTER. inType/outType di sini hanya
 * untuk label IN/OUT di kartu preset; animasi sebenarnya dibangun per-style di
 * `rosterTransitionStyles.ts` berdasarkan presetId. Durasi & stagger configurable.
 */
export const TEAM_ROSTER_STYLE_PRESETS: typeof ANIMATION_PRESETS = [
  {
    id: 'slide-up-pro',
    name: 'SLIDE UP PRO',
    description: 'DEFAULT. Container naik + scale halus; header 100ms setelahnya; player rows stagger dari bawah. OUT: player reverse stagger ke atas, container turun sedikit + fade.',
    config: {
      inType: 'slide-up', outType: 'slide-down', duration: 0.72, delay: 0,
      easing: 'easeOut', useSpring: false, staggerChildren: true, staggerDirection: 'top-down', staggerDelay: 0.07,
    },
  },
  {
    id: 'minimal-fade',
    name: 'MINIMAL FADE',
    description: 'Halus & ringan (tanpa blur): naik 8px + fade + scale sangat tipis, stagger ringan. OUT: turun 6px + fade, reverse stagger sangat halus.',
    config: {
      inType: 'fade', outType: 'fade', duration: 0.4, delay: 0,
      easing: 'easeOut', useSpring: false, staggerChildren: true, staggerDirection: 'top-down', staggerDelay: 0.045,
    },
  },
  {
    id: 'side-swipe',
    name: 'SIDE SWIPE',
    description: 'Masuk dari samping - header dulu, baris pemain menyusul horizontal. OUT: pemain keluar berlawanan, container geser keluar layar.',
    config: {
      inType: 'slide-right', outType: 'slide-left', duration: 0.7, delay: 0,
      easing: 'easeOut', useSpring: false, staggerChildren: true, staggerDirection: 'top-down', staggerDelay: 0.08,
    },
  },
  {
    id: 'hud-scan',
    name: 'HUD SCAN',
    description: 'Garis scan menyapu roster, kartu terbuka via clip reveal satu per satu. OUT: scan menutup konten lalu fade.',
    config: {
      inType: 'fade', outType: 'fade', duration: 0.8, delay: 0,
      easing: 'easeInOut', useSpring: false, staggerChildren: true, staggerDirection: 'top-down', staggerDelay: 0.1,
    },
  },
];

/**
 * Preset transisi khusus Team Roster - PRESET MODE menampilkan ini.
 * Roster Default (roster-reveal) = transisi utama (paling atas), lalu style esports.
 * Default-on-load tetap DEFAULT_TEAM_ROSTER_PRESET_ID. scale-pop builder tetap di kode
 * untuk kompat tapi tidak ditawarkan di picker.
 */
export const TEAM_ROSTER_ANIMATION_PRESETS = [
  ...ANIMATION_PRESETS.filter((p) => p.id === 'roster-reveal'),
  ...TEAM_ROSTER_STYLE_PRESETS,
];

/** Preset id default + config awal untuk asset Team Roster (default-on-load = Roster Default). */
export const DEFAULT_TEAM_ROSTER_PRESET_ID = 'roster-reveal';
export const DEFAULT_TEAM_ROSTER_ANIMATION: AnimationConfig = {
  mode: 'default',
  presetId: DEFAULT_TEAM_ROSTER_PRESET_ID,
  // Ambil dari daftar lengkap (memuat roster-reveal) agar staggerDirection 'roster-default' & wave gap ikut.
  ...(TEAM_ROSTER_ANIMATION_PRESETS.find((p) => p.id === DEFAULT_TEAM_ROSTER_PRESET_ID)?.config ??
    TEAM_ROSTER_ANIMATION_PRESETS[0].config),
};
