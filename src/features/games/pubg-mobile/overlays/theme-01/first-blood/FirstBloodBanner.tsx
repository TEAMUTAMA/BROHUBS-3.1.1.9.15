import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame } from 'lucide-react';
import {
  clampFirstBloodPlayerImageScale,
  clampFirstBloodPosition,
  clampFirstBloodScale,
  type FirstBloodTarget,
  type FirstBloodVisualConfig,
} from '@/features/games/pubg-mobile/logic/firstBloodVisual';

const DEFAULT_FIRST_BLOOD_PLAYER_IMAGE = '/assets/overlays/terminator-default-player.png';

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
    // Non-URL values are used as-is.
  }

  return Array.from(new Set(candidates.filter(Boolean)));
};

export const preloadFirstBloodImage = (raw?: string): void => {
  buildImageCandidates(raw).forEach((src) => {
    const img = new window.Image();
    img.referrerPolicy = 'no-referrer';
    img.src = src;
  });
};

interface FirstBloodBannerProps {
  target: FirstBloodTarget | null;
  config: FirstBloodVisualConfig;
  className?: string;
  forceShow?: boolean;
}

export const FIRST_BLOOD_PREVIEW_TARGET: FirstBloodTarget = {
  player: 'APYKAZE',
  team: 'APX',
  teamName: 'APEX WOLVES',
  image: '',
  kills: 1,
  rank: 1,
};

const PlayerPhoto: React.FC<{
  src?: string;
  accentColor: string;
  x: number;
  y: number;
  scale: number;
}> = ({ src, accentColor, x, y, scale }) => {
  const candidates = React.useMemo(() => buildImageCandidates(src), [src]);
  const [candidateIndex, setCandidateIndex] = React.useState(0);
  const [hasError, setHasError] = React.useState(false);
  const imageSrc = candidates[candidateIndex] || DEFAULT_FIRST_BLOOD_PLAYER_IMAGE;
  const transform = `translate(${clampFirstBloodPosition(x)}px, ${clampFirstBloodPosition(y)}px) scale(${clampFirstBloodPlayerImageScale(scale) / 100})`;

  React.useEffect(() => {
    setCandidateIndex(0);
    setHasError(false);
  }, [candidates.join('|')]);

  if (hasError && imageSrc === DEFAULT_FIRST_BLOOD_PLAYER_IMAGE) {
    return (
      <div className="h-full w-full" style={{ transform, transformOrigin: 'bottom center' }}>
        <div
          className="mx-auto h-full w-[72%] rounded-t-[999px] border-2 bg-black/35"
          style={{ borderColor: accentColor, boxShadow: `0 0 28px ${accentColor}55` }}
        />
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
        if (imageSrc === DEFAULT_FIRST_BLOOD_PLAYER_IMAGE) {
          setHasError(true);
          return;
        }
        setCandidateIndex((current) => current + 1);
      }}
      alt=""
    />
  );
};

export const FirstBloodBanner: React.FC<FirstBloodBannerProps> = ({
  target,
  config,
  className = 'absolute',
  forceShow = false,
}) => {
  const scale = clampFirstBloodScale(config.scale) / 100;
  const x = clampFirstBloodPosition(config.x, 92);
  const y = clampFirstBloodPosition(config.y, 96);
  const customDesignUrl = config.useCustomBackground ? config.customBackgroundUrl.trim() : '';
  const hasCustomDesign = Boolean(customDesignUrl);
  const frameBackground = `linear-gradient(115deg, ${config.headerBg} 0%, ${config.bodyBg} 48%, rgba(0,0,0,0.94) 100%)`;

  return (
    <AnimatePresence mode="wait">
      {target && (config.enabled || forceShow) && (
        <motion.div
          key={`${target.team}-${target.player}-${target.kills}`}
          className={`${className} ${
            hasCustomDesign ? 'h-[540px] w-[960px]' : 'h-[286px] w-[820px]'
          } overflow-visible pointer-events-none z-[510]`}
          style={{ left: x, bottom: y, transformOrigin: 'bottom left' }}
          initial={{ opacity: 0, x: -90, y: 64, rotate: -3, scale: scale * 0.72, filter: 'blur(10px)' }}
          animate={{
            opacity: 1,
            x: 0,
            y: 0,
            rotate: 0,
            scale,
            filter: 'blur(0px)',
            transition: { type: 'spring', stiffness: 520, damping: 24, mass: 0.82 },
          }}
          exit={{
            opacity: 0,
            x: 120,
            y: -24,
            rotate: 2,
            scale: scale * 0.8,
            filter: 'blur(12px)',
            transition: {
              duration: 0.58,
              ease: [0.22, 1, 0.36, 1],
              opacity: { duration: 0.38, delay: 0.06 },
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
            className="absolute -inset-y-8 -left-24 z-30 w-20 rotate-12 bg-white/55 blur-md mix-blend-screen"
            initial={{ x: -90, opacity: 0 }}
            animate={{
              x: 900,
              opacity: [0, 0.85, 0],
              transition: { duration: 0.5, ease: 'easeOut', delay: 0.04 },
            }}
            exit={{
              x: 760,
              opacity: [0, 0.55, 0],
              transition: { duration: 0.32, ease: 'easeInOut' },
            }}
          />
          <div
            className="absolute inset-0 overflow-hidden rounded-[30px] border-2 shadow-[0_24px_70px_rgba(0,0,0,0.62)]"
            style={{
              background: hasCustomDesign ? 'transparent' : frameBackground,
              borderColor: hasCustomDesign ? 'transparent' : config.accentColor,
              clipPath: 'polygon(0 0, 94% 0, 100% 18%, 100% 100%, 6% 100%, 0 82%)',
              color: config.textColor,
            }}
          >
            {!hasCustomDesign && (
              <>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.22),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(255,176,0,0.22),transparent_34%)]" />
                <div
                  className="absolute -right-20 top-0 h-full w-[360px] skew-x-[-18deg] opacity-95"
                  style={{ backgroundColor: config.footerBg }}
                />
                <div className="absolute left-0 top-0 h-full w-2" style={{ backgroundColor: config.accentColor }} />
              </>
            )}

            <div className="relative z-10 grid h-full grid-cols-[1fr_276px] items-stretch">
              <div className="flex min-w-0 flex-col justify-between px-8 py-7">
                <div className="flex items-start gap-5">
                  <div
                    className="flex h-[78px] w-[78px] shrink-0 items-center justify-center rounded-[18px] border-2 bg-black/35"
                    style={{ borderColor: config.accentColor, boxShadow: `0 0 24px ${config.accentColor}55` }}
                  >
                    <span className="text-[40px] font-[1000] leading-none" style={{ color: config.accentColor }}>
                      01
                    </span>
                  </div>
                  <div className="min-w-0 pt-1">
                    <div className="mb-2 flex items-center gap-2">
                      <Flame size={24} strokeWidth={3} style={{ color: config.accentColor }} />
                      <p
                        className="text-[11px] font-[1000] uppercase tracking-[0.32em]"
                        style={{ color: config.mutedTextColor }}
                      >
                        {config.subtitle}
                      </p>
                    </div>
                    <h1 className="truncate text-[54px] font-[1000] uppercase italic leading-[0.82] tracking-normal">
                      {config.title}
                    </h1>
                  </div>
                </div>

                <div className="min-w-0">
                  <p
                    className="mb-2 text-[11px] font-[1000] uppercase tracking-[0.32em]"
                    style={{ color: config.mutedTextColor }}
                  >
                    First eliminator
                  </p>
                  <div className="flex items-end gap-4">
                    <h2 className="truncate text-[46px] font-[1000] uppercase leading-none">
                      {target.player}
                    </h2>
                    <div
                      className="mb-1 shrink-0 rounded-full px-4 py-2 text-[12px] font-[1000] uppercase tracking-[0.16em]"
                      style={{ backgroundColor: config.accentColor, color: config.bodyBg }}
                    >
                      {target.team} / Kill #{target.kills}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative flex h-full items-end justify-center overflow-visible">
                {target.logo && (
                  <div
                    className="absolute right-7 top-7 z-20 flex h-[86px] w-[86px] items-center justify-center overflow-hidden rounded-full border-2 bg-black/35"
                    style={{ borderColor: config.bodyBg }}
                  >
                    <img src={target.logo} className="h-full w-full object-contain p-2" referrerPolicy="no-referrer" alt="" />
                  </div>
                )}
                <div
                  className="absolute bottom-5 right-5 z-20 max-w-[210px] rounded-full bg-black/55 px-4 py-2 text-right text-[10px] font-[1000] uppercase tracking-[0.22em]"
                  style={{ color: config.textColor }}
                >
                  {target.teamName}
                </div>
                <div className="relative z-10 h-[245px] w-[246px]">
                  <PlayerPhoto
                    key={`${target.teamName}-${target.player}-${target.image || 'default'}`}
                    src={target.image}
                    accentColor={config.accentColor}
                    x={config.playerImageX}
                    y={config.playerImageY}
                    scale={config.playerImageScale}
                  />
                </div>
              </div>
            </div>

            <div
              className="absolute bottom-0 left-10 right-12 z-20 h-1"
              style={{
                background: `linear-gradient(90deg, transparent, ${config.accentColor}, transparent)`,
                boxShadow: `0 0 18px ${config.accentColor}`,
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
