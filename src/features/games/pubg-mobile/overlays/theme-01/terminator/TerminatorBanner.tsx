import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crosshair, Shield } from 'lucide-react';
import {
  clampTerminatorPosition,
  clampTerminatorPlayerImageScale,
  clampTerminatorScale,
  clampTerminatorKillThreshold,
  type TerminatorVisualConfig,
} from '@/features/games/pubg-mobile/logic/terminatorVisual';

const DEFAULT_TERMINATOR_PLAYER_IMAGE = '/assets/overlays/terminator-default-player.png';
const TERMINATOR_A_BG = '/assets/overlays/Master-terminator-A-Polos.webp';
const TERMINATOR_A_CONDENSED_FONT = 'Impact, "Anton", "Bebas Neue", "Oswald", Arial, sans-serif';
const TERMINATOR_A_META_FONT = '"Oswald", "Teko", "Bebas Neue", Arial, sans-serif';

const getTerminatorATitleFontSize = (title: string) => {
  const len = title.trim().length;
  if (len <= 4) return 230;
  if (len <= 6) return 200;
  if (len <= 8) return 165;
  if (len <= 10) return 128;
  return 108;
};

const extractImageUrl = (raw?: string): string => {
  const value = raw?.trim() || '';
  if (!value) return '';
  const markdownMatch = value.match(/!\[[^\]]*\]\(([^)]+)\)/);
  if (markdownMatch?.[1]) return markdownMatch[1].trim();
  const urlMatch = value.match(/https?:\/\/[^\s"'<>]+/);
  return (urlMatch?.[0] || value).trim();
};

const buildImageCandidates = (raw?: string): string[] => {
  const source = extractImageUrl(raw);
  if (!source) return [];

  const candidates = [source];

  try {
    const url = new URL(source);

    if (url.hostname.includes('drive.google.com')) {
      const fileId =
        url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ||
        url.searchParams.get('id');
      if (fileId) {
        candidates.push(
          `https://drive.google.com/uc?export=view&id=${fileId}`,
          `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`
        );
      }
    }

    if (url.hostname.includes('dropbox.com')) {
      url.searchParams.set('raw', '1');
      url.searchParams.delete('dl');
      candidates.push(url.toString());
    }

    if (url.hostname === 'github.com' && url.pathname.includes('/blob/')) {
      candidates.push(
        `https://raw.githubusercontent.com${url.pathname.replace('/blob/', '/')}`
      );
    }
  } catch {
    // Non-URL values (for example data URLs) are used as-is.
  }

  return Array.from(new Set(candidates.filter(Boolean)));
};

export const preloadTerminatorImage = (raw?: string): void => {
  buildImageCandidates(raw).forEach((src) => {
    const img = new window.Image();
    img.referrerPolicy = 'no-referrer';
    img.src = src;
  });
};

export interface TerminatorTarget {
  player: string;
  team: string;
  teamName: string;
  logo?: string;
  image?: string;
  kills: number;
  cumulativeKills: number;
  rank: number;
}

interface TerminatorBannerProps {
  target: TerminatorTarget | null;
  config: TerminatorVisualConfig;
  currentMatch?: number;
  className?: string;
  forceShow?: boolean;
}

export const TERMINATOR_PREVIEW_TARGET: TerminatorTarget = {
  player: 'APYKAZE',
  team: 'APX',
  teamName: 'APEX WOLVES',
  image: '',
  kills: 8,
  cumulativeKills: 8,
  rank: 1,
};

const PlayerSilhouette: React.FC<{ color: string; accentColor: string }> = ({
  color,
  accentColor,
}) => (
  <svg viewBox="0 0 290 174" className="h-full w-full" role="img" aria-label="Player silhouette">
    <defs>
      <linearGradient id="terminator-silhouette-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.88" />
        <stop offset="100%" stopColor={color} stopOpacity="0.46" />
      </linearGradient>
    </defs>
    <path d="M36 174c12-66 55-101 109-101s97 35 109 101H36z" fill="url(#terminator-silhouette-body)" />
    <circle cx="145" cy="50" r="36" fill={color} opacity="0.82" />
    <path d="M93 174c9-46 29-72 52-72s43 26 52 72H93z" fill="rgba(255,255,255,0.12)" />
    <path d="M74 170h142" stroke={accentColor} strokeOpacity="0.45" strokeWidth="4" />
    <path d="M18 150c29-10 52-15 84-16" stroke={accentColor} strokeOpacity="0.28" strokeWidth="3" />
    <path d="M188 134c37 1 62 7 84 16" stroke={accentColor} strokeOpacity="0.28" strokeWidth="3" />
  </svg>
);

const PlayerPhoto: React.FC<{
  src?: string;
  mutedColor: string;
  accentColor: string;
  x: number;
  y: number;
  scale: number;
}> = ({ src, mutedColor, accentColor, x, y, scale }) => {
  const candidates = React.useMemo(() => buildImageCandidates(src), [src]);
  const [candidateIndex, setCandidateIndex] = React.useState(0);
  const [defaultHasError, setDefaultHasError] = React.useState(false);
  const imageSrc = candidates[candidateIndex] || DEFAULT_TERMINATOR_PLAYER_IMAGE;
  const transform = `translate(${clampTerminatorPosition(x)}px, ${clampTerminatorPosition(y)}px) scale(${clampTerminatorPlayerImageScale(scale) / 100})`;

  React.useEffect(() => {
    setCandidateIndex(0);
    setDefaultHasError(false);
  }, [candidates.join('|')]);

  if (defaultHasError && imageSrc === DEFAULT_TERMINATOR_PLAYER_IMAGE) {
    return (
      <div className="h-full w-full" style={{ transform, transformOrigin: 'bottom center' }}>
        <PlayerSilhouette color={mutedColor} accentColor={accentColor} />
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      className="h-full w-full object-contain object-top"
      style={{ transform, transformOrigin: 'bottom center' }}
      referrerPolicy="no-referrer"
      onError={() => {
        if (imageSrc === DEFAULT_TERMINATOR_PLAYER_IMAGE) {
          setDefaultHasError(true);
          return;
        }
        setCandidateIndex((current) => current + 1);
      }}
      alt=""
    />
  );
};

export const TerminatorBanner: React.FC<TerminatorBannerProps> = ({
  target,
  config,
  currentMatch,
  className = 'absolute',
  forceShow = false,
}) => {
  const scale = clampTerminatorScale(config.scale) / 100;
  const x = clampTerminatorPosition(config.x, 92);
  const y = clampTerminatorPosition(config.y, 96);
  const customDesignUrl = config.useCustomBackground ? config.customBackgroundUrl.trim() : '';
  const hasCustomDesign = Boolean(customDesignUrl);
  const designVariant = hasCustomDesign ? 'classic-lock' : config.designVariant;
  const isTerminatorA = !hasCustomDesign && designVariant === 'terminator-a';
  const frameClass = hasCustomDesign
    ? 'flex h-[540px] w-[960px] flex-col'
    : isTerminatorA
      ? 'h-[1024px] w-[1536px]'
      : 'flex h-auto w-[760px] flex-col';
  const frameRadiusClass = isTerminatorA ? 'rounded-none' : 'rounded-xl';
  const terminatorATitleFontSize = getTerminatorATitleFontSize(config.title);
  // Angka di kill counter: "threshold" = target syarat jadi Terminator,
  // "cumulative" = total kill gabungan Match 1 → saat ingame ini.
  const killCounterValue =
    config.killCounterSource === 'threshold'
      ? clampTerminatorKillThreshold(config.killThreshold)
      : target?.cumulativeKills ?? target?.kills ?? 0;

  const renderPlayerPhoto = (widthClass = 'w-[290px]', heightClass = 'h-[174px]') => (
    <div className={`${widthClass} shrink-0`}>
      <div className={`flex ${heightClass} w-full items-end justify-center overflow-visible`}>
        <PlayerPhoto
          key={`${target?.teamName}-${target?.player}-${target?.image || 'default'}`}
          src={target?.image}
          mutedColor={config.mutedTextColor}
          accentColor={config.accentColor}
          x={config.playerImageX}
          y={config.playerImageY}
          scale={config.playerImageScale}
        />
      </div>
    </div>
  );

  const renderLogo = (className = 'h-[92px] w-[92px]') => (
    <div className={`flex ${className} items-center justify-center overflow-hidden rounded-lg border border-white/20 bg-black/15`}>
      {target?.logo ? (
        <img src={target.logo} className="h-full w-full object-contain p-2" referrerPolicy="no-referrer" />
      ) : (
        <Shield size={54} className="text-white/80" />
      )}
    </div>
  );

  const renderClassic = () => (
    <>
      <div
        className="relative z-10 px-7 py-5 text-white"
        style={{ backgroundColor: hasCustomDesign ? 'transparent' : config.headerBg }}
      >
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Crosshair size={28} strokeWidth={3} />
            <h1 className="text-[44px] font-[1000] uppercase leading-none tracking-[0.08em]">
              {config.title}
            </h1>
          </div>
          {renderLogo()}
        </div>
      </div>

      <div
        className={`relative z-10 px-7 py-6 ${hasCustomDesign ? 'flex flex-1 items-center' : ''}`}
        style={{ backgroundColor: hasCustomDesign ? 'transparent' : config.bodyBg, color: config.textColor }}
      >
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0">
            <p
              className="text-[12px] font-[1000] uppercase tracking-[0.32em]"
              style={{ color: config.mutedTextColor }}
            >
              Player
            </p>
            <h2 className="truncate text-[42px] font-[1000] uppercase leading-none">
              {target?.player}
            </h2>
            <div className="mt-3 inline-flex items-center gap-2 rounded bg-black px-3 py-1.5">
              <span
                className="text-[12px] font-[1000] uppercase tracking-[0.16em]"
                style={{ color: config.accentColor }}
              >
                {target?.team} / #{target?.rank}
              </span>
            </div>
          </div>
          {renderPlayerPhoto()}
        </div>
      </div>

      <div
        className="relative z-10 flex items-center justify-between border-t-2 px-7 py-3"
        style={{
          backgroundColor: hasCustomDesign ? 'transparent' : config.footerBg,
          borderColor: hasCustomDesign ? 'transparent' : 'rgb(0 0 0 / 0.1)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: config.accentColor, boxShadow: `0 0 14px ${config.accentColor}` }}
          />
          <span className="text-[11px] font-[1000] uppercase tracking-[0.26em] text-white">
            Target locked
          </span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.28em] text-white/70">
          {target?.teamName}
        </span>
      </div>
    </>
  );

  const renderTerminatorA = () => (
    <div className="relative h-[1024px] w-[1536px] overflow-hidden" style={{ color: config.textColor }}>
      {/* Background asset */}
      <img
        src={TERMINATOR_A_BG}
        className="absolute inset-0 h-full w-full object-fill"
        alt=""
        aria-hidden="true"
      />

      {/* Foto pemain — mengisi zona #c0c0c0 di background (scan-based)
          Top extended ke atas zona supaya foto bisa "menonjol" keluar dari frame.
          Kiri/kanan/bawah tetap di-clip mengikuti bentuk bg. */}
      <div
        className="absolute"
        style={{
          left: 243,
          top: 0,
          width: 445,
          height: 695,
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 23%, 78% 100%, 0% 100%)',
        }}
      >
        <div className="absolute inset-0">
          <PlayerPhoto
            key={`${target?.teamName}-${target?.player}-${target?.image || 'default'}-terminator-a`}
            src={target?.image}
            mutedColor={config.mutedTextColor}
            accentColor={config.accentColor}
            x={config.playerImageX}
            y={config.playerImageY}
            scale={config.playerImageScale}
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* Judul (TERMINATOR) — panel cream kanan, baris atas */}
      <div className="absolute overflow-hidden" style={{ left: 752, top: 255, width: 588 }}>
        <h1
          className="font-[900] uppercase leading-none"
          style={{
            color: config.textColor,
            fontFamily: TERMINATOR_A_CONDENSED_FONT,
            fontSize: terminatorATitleFontSize,
            letterSpacing: '0.025em',
            transform: 'scaleX(0.88)',
            transformOrigin: 'left center',
            whiteSpace: 'nowrap',
          }}
        >
          {config.title}
        </h1>
      </div>

      {/* Logo Team — panel cream kanan, baris bawah */}
      <div
        className="absolute flex shrink-0 items-center justify-center overflow-hidden"
        style={{
          left: 726,
          top: 380,
          width: 274,
          height: 270,
        }}
      >
        {target?.logo ? (
          <img src={target.logo} className="h-full w-full object-contain p-2" referrerPolicy="no-referrer" alt="" />
        ) : (
          <Shield className="h-full w-full p-2" strokeWidth={2.5} style={{ color: config.accentColor }} />
        )}
      </div>

      {/* Nama Pemain — posisi independen dari logo.
          Wrap otomatis: turun ke baris ke-2 saat teks melebihi `width` (285px),
          maksimal 2 baris (line-clamp-2). Ubah `width` untuk geser batas 2 baris. */}
      <p
        className="absolute line-clamp-2 break-words font-[900] uppercase leading-[0.95] tracking-[0.01em]"
        style={{
          left: 1050,
          top: 400,
          color: config.textColor,
          fontFamily: TERMINATOR_A_META_FONT,
          fontSize: 45,
          width: 285,
          textAlign: 'right',
        }}
      >
        {target?.player}
      </p>

      {/* Kill counter — overlay di atas kotak TOTAL KILL di background */}
      <div className="absolute text-center" style={{ left: 1155, top: 525, width: 160 }}>
        <p
          className="font-[900] leading-none"
          style={{
            color: config.textColor,
            fontFamily: TERMINATOR_A_CONDENSED_FONT,
            fontSize: 70,
            letterSpacing: '0.01em',
          }}
        >
          {String(killCounterValue).padStart(2, '0')}
        </p>
      </div>
    </div>
  );

  const renderDesign = () => {
    if (isTerminatorA) return renderTerminatorA();
    return renderClassic();
  };

  return (
    <AnimatePresence mode="wait">
      {target && (config.enabled || forceShow) && (
        <motion.div
          key={`${target.team}-${target.player}-${target.kills}`}
          className={`${className} ${frameClass} ${frameRadiusClass} overflow-hidden pointer-events-none z-[500] ${isTerminatorA ? '' : 'shadow-2xl'}`}
          style={{ left: x, bottom: y, transformOrigin: 'bottom left' }}
          initial={{ opacity: 0, x: -220, y: 18, scale: scale * 0.86, filter: 'blur(8px)' }}
          animate={{
            opacity: 1,
            x: 0,
            y: 0,
            scale,
            filter: 'blur(0px)',
            transition: { type: 'spring', stiffness: 410, damping: 29, mass: 0.9 },
          }}
          exit={{
            opacity: 0,
            x: -260,
            y: -18,
            scale: scale * 0.82,
            filter: 'blur(10px)',
            transition: {
              duration: 0.85,
              ease: [0.22, 1, 0.36, 1],
              opacity: { duration: 0.62, delay: 0.16 },
            },
          }}
        >
          {hasCustomDesign && (
            <img
              src={customDesignUrl}
              className="absolute inset-0 z-0 h-full w-full object-contain"
              referrerPolicy="no-referrer"
              alt=""
            />
          )}
          <motion.div
            className="absolute inset-y-0 -left-24 z-20 w-24 bg-white/35 blur-md mix-blend-screen"
            initial={{ x: -90, opacity: 0 }}
            animate={{
              x: 860,
              opacity: [0, 0.78, 0],
              transition: { duration: 0.72, ease: 'easeOut', delay: 0.08 },
            }}
            exit={{
              x: 940,
              opacity: [0, 0.55, 0],
              transition: { duration: 0.5, ease: 'easeInOut' },
            }}
          />
          {renderDesign()}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
