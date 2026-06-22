import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crosshair, Shield } from 'lucide-react';
import {
  clampTerminatorPosition,
  clampTerminatorPlayerImageScale,
  clampTerminatorScale,
  type TerminatorVisualConfig,
} from '@/features/games/pubg-mobile/logic/terminatorVisual';

const DEFAULT_TERMINATOR_PLAYER_IMAGE = '/assets/overlays/terminator-default-player.png';

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
  className = 'absolute',
  forceShow = false,
}) => {
  const scale = clampTerminatorScale(config.scale) / 100;
  const x = clampTerminatorPosition(config.x, 92);
  const y = clampTerminatorPosition(config.y, 96);
  const customDesignUrl = config.useCustomBackground ? config.customBackgroundUrl.trim() : '';
  const hasCustomDesign = Boolean(customDesignUrl);
  const designPreset = config.designPreset ?? 'tactical-lime';
  const isStrikeFrame = designPreset === 'crimson-hunter';
  const isVectorShield = designPreset === 'ice-vector';
  const panelClipPath = isStrikeFrame
    ? 'polygon(0 0, 96% 0, 100% 22%, 100% 100%, 4% 100%, 0 82%)'
    : isVectorShield
      ? 'polygon(3% 0, 100% 0, 100% 82%, 95% 100%, 0 100%, 0 18%)'
      : undefined;
  const bodyBackground = isStrikeFrame
    ? `linear-gradient(112deg, ${config.bodyBg} 0%, ${config.bodyBg} 55%, ${config.headerBg} 56%, ${config.headerBg} 100%)`
    : isVectorShield
      ? `linear-gradient(110deg, ${config.bodyBg} 0%, ${config.bodyBg} 62%, ${config.accentColor}22 100%)`
      : config.bodyBg;

  return (
    <AnimatePresence mode="wait">
      {target && (config.enabled || forceShow) && (
        <motion.div
          key={`${target.team}-${target.player}-${target.kills}`}
          className={`${className} ${
            hasCustomDesign ? 'flex h-[540px] w-[960px] flex-col' : 'w-[760px]'
          } overflow-visible rounded-xl shadow-2xl pointer-events-none z-[500]`}
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
          <div
            className="relative z-10 px-7 py-5 text-white"
            style={{
              backgroundColor: hasCustomDesign ? 'transparent' : config.headerBg,
              clipPath: hasCustomDesign ? undefined : panelClipPath,
            }}
          >
            {!hasCustomDesign && !isStrikeFrame && !isVectorShield && (
              <>
                <div className="absolute inset-y-0 left-0 w-2" style={{ backgroundColor: config.accentColor }} />
                <div
                  className="absolute left-2 top-1/2 h-11 w-1.5 -translate-y-1/2 rounded-full"
                  style={{ backgroundColor: config.accentColor, boxShadow: `0 0 16px ${config.accentColor}` }}
                />
                <div className="absolute left-5 top-4 h-2 w-2 rotate-45 bg-white/60" />
                <div className="absolute left-5 bottom-4 h-2 w-2 rotate-45 bg-white/35" />
              </>
            )}
            {!hasCustomDesign && isStrikeFrame && (
              <>
                <div className="absolute inset-y-0 left-0 w-3" style={{ backgroundColor: config.accentColor }} />
                <div
                  className="absolute -right-10 top-0 h-full w-[180px] -skew-x-12 opacity-70"
                  style={{ backgroundColor: config.accentColor }}
                />
              </>
            )}
            {!hasCustomDesign && isVectorShield && (
              <>
                <div className="absolute left-0 top-0 h-2 w-28" style={{ backgroundColor: config.accentColor }} />
                <div className="absolute bottom-0 right-0 h-2 w-36" style={{ backgroundColor: config.accentColor }} />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.20),transparent_32%,rgba(255,255,255,0.08))]" />
              </>
            )}
            <div className="flex items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3">
                  <Crosshair size={28} strokeWidth={3} />
                  <h1 className="text-[44px] font-[1000] uppercase leading-none tracking-[0.08em]">
                    {config.title}
                  </h1>
                </div>
              </div>
              <div className="flex h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-lg border border-white/20 bg-black/15">
                {target.logo ? (
                  <img src={target.logo} className="h-full w-full object-contain p-2" referrerPolicy="no-referrer" />
                ) : (
                  <Shield size={54} className="text-white/80" />
                )}
              </div>
            </div>
          </div>

          <div
            className={`relative z-10 px-7 py-6 ${hasCustomDesign ? 'flex flex-1 items-center' : ''}`}
            style={{
              background: hasCustomDesign ? 'transparent' : bodyBackground,
              color: config.textColor,
            }}
          >
            {!hasCustomDesign && !isStrikeFrame && !isVectorShield && (
              <>
                <div className="absolute inset-y-0 left-0 w-2" style={{ backgroundColor: config.accentColor }} />
                <div className="absolute left-5 top-5 h-[68px] w-[46px] rounded-lg border-2 border-black/10 bg-white/18" />
                <div
                  className="absolute left-7 top-7 h-[52px] w-1 rounded-full"
                  style={{ backgroundColor: config.accentColor, boxShadow: `0 0 12px ${config.accentColor}` }}
                />
                <div className="absolute left-12 top-7 h-1.5 w-5 rounded-full bg-black/25" />
                <div className="absolute left-12 top-14 h-1.5 w-8 rounded-full bg-black/20" />
                <div className="absolute left-12 top-[68px] h-1.5 w-4 rounded-full bg-black/20" />
              </>
            )}
            {!hasCustomDesign && isStrikeFrame && (
              <div
                className="absolute bottom-0 right-0 top-0 w-[300px] -skew-x-12 opacity-95"
                style={{ backgroundColor: config.footerBg }}
              />
            )}
            {!hasCustomDesign && isVectorShield && (
              <>
                <div
                  className="absolute bottom-0 right-0 top-0 w-[250px] opacity-75"
                  style={{ background: `linear-gradient(135deg, transparent 0%, ${config.accentColor}88 100%)` }}
                />
                <div className="absolute left-7 top-5 h-12 w-12 border-l-4 border-t-4" style={{ borderColor: config.accentColor }} />
                <div className="absolute bottom-5 right-7 h-12 w-12 border-b-4 border-r-4" style={{ borderColor: config.accentColor }} />
              </>
            )}
            <div className="flex items-center justify-between gap-6">
              <div className="min-w-0">
                <p
                  className="text-[12px] font-[1000] uppercase tracking-[0.32em]"
                  style={{ color: config.mutedTextColor }}
                >
                  Player
                </p>
                <h2 className="truncate text-[42px] font-[1000] uppercase leading-none">
                  {target.player}
                </h2>
                <div className="mt-3 inline-flex items-center gap-2 rounded bg-black px-3 py-1.5">
                  <span
                    className="text-[12px] font-[1000] uppercase tracking-[0.16em]"
                    style={{ color: config.accentColor }}
                  >
                    {target.team} / #{target.rank}
                  </span>
                </div>
              </div>

              <div className="relative z-30 w-[290px] shrink-0">
                <div
                  className="relative flex h-[174px] w-full items-end justify-center overflow-visible"
                  style={{ clipPath: 'inset(-260px -260px -48px -260px)' }}
                >
                  {!hasCustomDesign && isStrikeFrame && (
                    <div
                      className="absolute right-10 h-[168px] w-[170px] rounded-full opacity-45 blur-sm"
                      style={{ backgroundColor: config.accentColor }}
                    />
                  )}
                  {!hasCustomDesign && isVectorShield && (
                    <div
                      className="absolute right-9 h-[174px] w-[174px] rounded-2xl border-4 opacity-70"
                      style={{ borderColor: config.accentColor }}
                    />
                  )}
                  <PlayerPhoto
                    key={`${target.teamName}-${target.player}-${target.image || 'default'}`}
                    src={target.image}
                    mutedColor={config.mutedTextColor}
                    accentColor={config.accentColor}
                    x={config.playerImageX}
                    y={config.playerImageY}
                    scale={config.playerImageScale}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            className="relative z-10 flex items-center justify-between border-t-2 px-7 py-3"
            style={{
              backgroundColor: hasCustomDesign ? 'transparent' : config.footerBg,
              borderColor: hasCustomDesign ? 'transparent' : 'rgb(0 0 0 / 0.1)',
              clipPath: hasCustomDesign ? undefined : panelClipPath,
            }}
          >
            {!hasCustomDesign && !isStrikeFrame && !isVectorShield && (
              <div className="absolute inset-y-0 left-0 w-2" style={{ backgroundColor: config.accentColor }} />
            )}
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor: config.accentColor,
                  boxShadow: `0 0 14px ${config.accentColor}`,
                }}
              />
              <span className="text-[11px] font-[1000] uppercase tracking-[0.26em] text-white">
                Target locked
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-white/70">
              {target.teamName}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
