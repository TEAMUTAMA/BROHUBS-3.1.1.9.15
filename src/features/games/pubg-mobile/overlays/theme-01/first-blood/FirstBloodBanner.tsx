import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Droplets, Shield } from 'lucide-react';
import {
  BROADCAST_CUT_ORIGINAL_PALETTE,
  BROADCAST_CUT_FILE_PALETTE,
  HERO_SPLIT_FILE_PALETTE,
  HERO_SPLIT_ORIGINAL_PALETTE,
  clampFirstBloodPlayerImageScale,
  clampFirstBloodPosition,
  clampFirstBloodScale,
  type FirstBloodTarget,
  type FirstBloodVisualConfig,
} from '@/features/games/pubg-mobile/logic/firstBloodVisual';
import { ensureOverlayGoogleFontsLoaded } from '@/features/games/pubg-mobile/logic/eliminationBannerFonts';

const DEFAULT_FIRST_BLOOD_PLAYER_IMAGE = '/assets/overlays/terminator-default-player.png';
const FIRST_BLOOD_BROADCAST_CUT_BG = '/assets/overlays/first-blood-broadcast-cut-clean-transparent.png';
const FIRST_BLOOD_HERO_SPLIT_BG = '/assets/overlays/first-blood-hero-split-clean-transparent.png';
const FIRST_BLOOD_BROADCAST_CUT_PHOTO_MASK = '/assets/overlays/mark-foto-first-blood-broadcast-cut-photo-crop-mask.png';
const FIRST_BLOOD_HERO_SPLIT_PHOTO_MASK = '/assets/overlays/mark-foto-first-blood-hero-split-photo-crop-mask.png';
const FIRST_BLOOD_HERO_TITLE_FONT = '"AMBOY", "Jersey 15", "Graduate", "Bebas Neue", Arial, sans-serif';
const FIRST_BLOOD_HERO_CONDENSED_FONT = 'Impact, "Anton", "Bebas Neue", "Oswald", Arial, sans-serif';
const FIRST_BLOOD_HERO_META_FONT = '"Oswald", "Teko", "Bebas Neue", Arial, sans-serif';

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const colorDist = (a: [number, number, number], b: [number, number, number]) =>
  Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

const PALETTE_THRESHOLD = 60;

const remapImagePixels = (
  src: string,
  originalColors: readonly string[],
  overrideColors: string[]
): Promise<string> =>
  new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      let imageData: ImageData;
      try {
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch {
        resolve(src);
        return;
      }
      const data = imageData.data;
      const origRgb = originalColors.map(hexToRgb);
      const newRgb = overrideColors.map(hexToRgb);
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 10) continue;
        const pixel: [number, number, number] = [data[i], data[i + 1], data[i + 2]];
        let bestIdx = -1;
        let bestDist = PALETTE_THRESHOLD;
        for (let j = 0; j < origRgb.length; j++) {
          const d = colorDist(pixel, origRgb[j]);
          if (d < bestDist) { bestDist = d; bestIdx = j; }
        }
        if (bestIdx >= 0) {
          const blend = Math.max(0, 1 - bestDist / PALETTE_THRESHOLD);
          const [or, og, ob] = origRgb[bestIdx];
          const [nr, ng, nb] = newRgb[bestIdx] ?? origRgb[bestIdx];
          data[i]     = Math.round(data[i]     + blend * (nr - or));
          data[i + 1] = Math.round(data[i + 1] + blend * (ng - og));
          data[i + 2] = Math.round(data[i + 2] + blend * (nb - ob));
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });

const useRemappedImage = (
  src: string,
  originalColors: readonly string[],
  overrideColors: string[],
  enabled: boolean
): string => {
  const [remappedSrc, setRemappedSrc] = React.useState<string>(src);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const overrideKey = overrideColors.join(',');
  const isIdentity = overrideColors.every((c, i) => c.toLowerCase() === originalColors[i]?.toLowerCase());

  React.useEffect(() => {
    if (!enabled || isIdentity) {
      setRemappedSrc(src);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      remapImagePixels(src, originalColors, overrideColors)
        .then(setRemappedSrc);
    }, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, overrideKey, enabled, isIdentity]);

  return remappedSrc;
};

const getHeroSplitPlayerNameFontSize = (name: string) => {
  const length = name.trim().length;
  if (length <= 7) return 142;
  if (length <= 9) return 132;
  if (length <= 11) return 120;
  return 106;
};

const getHeroSplitPlayerNameTracking = (name: string) => {
  const length = name.trim().length;
  if (length <= 7) return '0.035em';
  if (length <= 10) return '0.02em';
  return '0.005em';
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

const repeat = (count: number) => Array.from({ length: count }, (_, index) => index);

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
  x: number;
  y: number;
  scale: number;
}> = ({ src, x, y, scale }) => {
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
    return <div className="h-full w-full rounded-t-full bg-black/20" style={{ transform, transformOrigin: 'bottom center' }} />;
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

const CrosshairMark: React.FC<{ color: string; accentColor: string }> = ({ color, accentColor }) => (
  <svg viewBox="0 0 148 148" className="h-full w-full" aria-hidden="true">
    <g fill="none" stroke={color} strokeWidth="2" opacity="0.74">
      <circle cx="74" cy="74" r="34" />
      <circle cx="74" cy="74" r="49" opacity="0.78" />
      <path d="M74 12v42M74 94v42M12 74h42M94 74h42" />
      <path d="M18 18h24M18 18v24M130 18h-24M130 18v24M18 130h24M18 130v-24M130 130h-24M130 130v-24" opacity="0.8" />
    </g>
    <circle cx="74" cy="74" r="10" fill={color} opacity="0.8" />
    <circle cx="74" cy="74" r="4" fill={accentColor} />
  </svg>
);

const TacticalTicks: React.FC<{
  count?: number;
  color: string;
  className?: string;
}> = ({ count = 4, color, className = '' }) => (
  <div className={`flex gap-1 ${className}`} aria-hidden="true">
    {repeat(count).map((index) => (
      <span key={index} className="block h-4 w-2 -skew-x-[22deg]" style={{ backgroundColor: color }} />
    ))}
  </div>
);

export const FirstBloodBanner: React.FC<FirstBloodBannerProps> = ({
  target,
  config,
  className = 'absolute',
  forceShow = false,
}) => {
  React.useEffect(() => {
    ensureOverlayGoogleFontsLoaded();
  }, []);

  const scale = clampFirstBloodScale(config.scale) / 100;
  const x = clampFirstBloodPosition(config.x, 92);
  const y = clampFirstBloodPosition(config.y, 96);
  const customDesignUrl = config.useCustomBackground ? config.customBackgroundUrl.trim() : '';
  const hasCustomDesign = Boolean(customDesignUrl);
  const designVariant = hasCustomDesign ? 'classic-lock' : config.designVariant;

  const isBroadcastCut = !hasCustomDesign && designVariant === 'default-reference';
  const isHeroSplit = !hasCustomDesign && designVariant === 'photo-split';
  const paletteOverride = (config.assetPaletteOverride?.length ?? 0) >= BROADCAST_CUT_ORIGINAL_PALETTE.length
    ? config.assetPaletteOverride
    : isHeroSplit ? [...HERO_SPLIT_ORIGINAL_PALETTE]
    : [...BROADCAST_CUT_ORIGINAL_PALETTE];
  const remappedBgSrc = useRemappedImage(
    FIRST_BLOOD_BROADCAST_CUT_BG,
    BROADCAST_CUT_FILE_PALETTE,
    paletteOverride,
    isBroadcastCut
  );
  const remappedHeroSplitBgSrc = useRemappedImage(
    FIRST_BLOOD_HERO_SPLIT_BG,
    HERO_SPLIT_FILE_PALETTE,
    paletteOverride,
    isHeroSplit
  );
  const isDefaultReferenceDesign = isBroadcastCut;
  const heroSplitPlayerNameFontSize = getHeroSplitPlayerNameFontSize(target?.player ?? '');
  const heroSplitPlayerNameTracking = getHeroSplitPlayerNameTracking(target?.player ?? '');
  const frameClass =
    hasCustomDesign
      ? 'flex h-[540px] w-[960px] flex-col'
      : designVariant === 'default-reference'
        ? 'h-[863px] w-[1823px]'
        : designVariant === 'diagonal-strike'
          ? 'h-[300px] w-[930px]'
          : designVariant === 'photo-split'
            ? 'h-[916px] w-[1717px]'
            : designVariant === 'compact-hud'
              ? 'h-[184px] w-[790px]'
              : 'w-[760px]';
  const frameRadiusClass =
    !hasCustomDesign && designVariant !== 'classic-lock' ? 'rounded-none' : 'rounded-xl';

  const renderLogo = (className = 'h-[82px] w-[82px]', iconSize = 50) => (
    <div
      className={`flex ${className} items-center justify-center overflow-hidden border border-black/20 bg-black/10`}
      style={{ boxShadow: 'inset 0 0 0 3px rgb(255 255 255 / 0.12)' }}
    >
      {target?.logo ? (
        <img src={target.logo} className="h-full w-full object-contain p-2" referrerPolicy="no-referrer" alt="" />
      ) : (
        <Shield size={iconSize} strokeWidth={2.5} style={{ color: config.accentColor }} />
      )}
    </div>
  );

  const renderPlayerFrame = (
    keySuffix: string,
    className: string,
    photoClassName = 'absolute bottom-0 right-0 h-full w-full'
  ) => (
    <div className={`overflow-hidden ${className}`}>
      <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(135deg,#000_1px,transparent_1px)] [background-size:12px_12px]" />
      <div className={photoClassName}>
        <PlayerPhoto
          key={`${target?.teamName}-${target?.player}-${target?.image || 'default'}-${keySuffix}`}
          src={target?.image}
          x={config.playerImageX}
          y={config.playerImageY}
          scale={config.playerImageScale}
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />
    </div>
  );

  const renderDefaultReference = () => (
    <div className="relative h-[863px] w-[1823px] overflow-hidden" style={{ color: config.textColor }}>
      <img
        src={remappedBgSrc}
        className="absolute inset-0 h-full w-full object-fill"
        alt=""
        aria-hidden="true"
      />
      {config.bgTintOpacity > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: config.bgTintColor,
            opacity: config.bgTintOpacity / 100,
            mixBlendMode: 'color',
          }}
        />
      )}

      <div className="absolute left-[206px] top-[246px] w-[930px]">
        <h1
          className="whitespace-nowrap text-[148px] font-normal uppercase leading-[0.88] tracking-[0.01em]"
          style={{ color: config.textColor, fontFamily: FIRST_BLOOD_HERO_TITLE_FONT }}
        >
          {config.title}
        </h1>
      </div>
      <div className="absolute left-[255px] top-[420px] flex w-[770px] items-center gap-3">
        <span className="text-[30px] font-[900] leading-none" style={{ color: config.accentColor }}>+</span>
        <span className="h-[2px] flex-1" style={{ backgroundColor: config.accentColor, opacity: 0.5 }} />
        <p
          className="shrink-0 text-[34px] font-[900] uppercase leading-none tracking-[0.30em]"
          style={{ color: config.mutedTextColor, fontFamily: FIRST_BLOOD_HERO_META_FONT }}
        >
          {config.subtitle}
        </p>
        <span className="h-[2px] flex-1" style={{ backgroundColor: config.accentColor, opacity: 0.5 }} />
        <span className="text-[30px] font-[900] leading-none" style={{ color: config.accentColor }}>+</span>
      </div>

      <div className="absolute left-[300px] top-[596px] w-[310px]">
        <h2
          className="truncate text-[66px] font-[900] uppercase leading-none tracking-[0.01em]"
          style={{ color: config.textColor, fontFamily: FIRST_BLOOD_HERO_CONDENSED_FONT }}
        >
          {target.player}
        </h2>
      </div>
      <div className="absolute left-[654px] top-[596px] h-[62px] w-[2px]" style={{ backgroundColor: config.accentColor, opacity: 0.7 }} />
      <div className="absolute left-[720px] top-[594px] w-[160px]">
        <p
          className="truncate text-[66px] font-[900] uppercase leading-none"
          style={{ color: config.textColor, fontFamily: FIRST_BLOOD_HERO_CONDENSED_FONT }}
        >
          {target.team}
        </p>
      </div>
      <div className="absolute left-[922px] top-[598px] w-[210px]">
        <p
          className="whitespace-nowrap text-[56px] font-[900] uppercase leading-none tracking-[0]"
          style={{ color: config.textColor, fontFamily: FIRST_BLOOD_HERO_META_FONT }}
        >
          Kill #{target.kills}
        </p>
      </div>

      <div
        className="absolute left-[1127px] top-[210px] h-[450px] w-[375px] overflow-hidden grayscale contrast-125"
        style={{
          maskImage: `url(${FIRST_BLOOD_BROADCAST_CUT_PHOTO_MASK})`,
          WebkitMaskImage: `url(${FIRST_BLOOD_BROADCAST_CUT_PHOTO_MASK})`,
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskSize: '100% 100%',
          WebkitMaskSize: '100% 100%',
          maskMode: 'alpha',
        }}
      >
        <div className="absolute bottom-[-8px] left-[-12px] h-[430px] w-[390px]">
          <PlayerPhoto
            key={`${target.teamName}-${target.player}-${target.image || 'default'}-broadcast-cut`}
            src={target.image}
            x={config.playerImageX}
            y={config.playerImageY}
            scale={config.playerImageScale}
          />
        </div>
        <div
          className="absolute inset-x-0 bottom-0 h-36"
          style={{ background: `linear-gradient(to top, ${config.footerBg}99, transparent)` }}
        />
      </div>

      <div
        className="absolute left-[1410px] top-[220px] flex h-[420px] w-[420px] items-center justify-center overflow-hidden"
        style={{ clipPath: 'polygon(50% 0, 93% 24%, 93% 76%, 50% 100%, 7% 76%, 7% 24%)' }}
      >
        <div className="flex h-[320px] w-[320px] items-center justify-center overflow-hidden">
          {target.logo ? (
            <img src={target.logo} className="h-full w-full object-contain" referrerPolicy="no-referrer" alt="" />
          ) : (
            <Shield size={300} strokeWidth={2.3} style={{ color: config.bodyBg }} />
          )}
        </div>
      </div>
    </div>
  );

  const renderDiagonalStrike = () => (
    <div
      className="relative h-[300px] w-[930px] overflow-hidden"
      style={{
        color: config.textColor,
        clipPath: 'polygon(4% 0, 100% 0, 96% 100%, 0 100%, 0 22%)',
      }}
    >
      <div className="absolute inset-0 bg-[#111411]" />
      <div
        className="absolute inset-[14px]"
        style={{
          backgroundColor: config.bodyBg,
          clipPath: 'polygon(4% 0, 100% 0, 95% 100%, 0 100%, 0 22%)',
        }}
      />
      <div className="absolute inset-0 opacity-[0.075] [background-image:linear-gradient(90deg,#000_1px,transparent_1px),linear-gradient(0deg,#000_1px,transparent_1px)] [background-size:36px_36px]" />

      <div
        className="absolute left-[38px] top-[34px] h-[74px] w-[560px]"
        style={{
          backgroundColor: config.headerBg,
          clipPath: 'polygon(0 0, 100% 0, 91% 100%, 0 100%)',
          boxShadow: 'inset 0 0 0 3px rgb(0 0 0 / 0.22)',
        }}
      />
      <div className="absolute left-[66px] top-[51px] flex items-center gap-4">
        <Droplets size={32} strokeWidth={3} className="text-black/80" />
        <h1 className="text-[50px] font-[1000] uppercase italic leading-none tracking-[0.04em] text-black">
          {config.title}
        </h1>
      </div>

      <div className="absolute left-[54px] top-[128px] w-[455px]">
        <p
          className="text-[12px] font-[1000] uppercase leading-none tracking-[0.42em]"
          style={{ color: config.mutedTextColor }}
        >
          {config.subtitle}
        </p>
        <h2 className="mt-4 truncate text-[64px] font-[1000] uppercase leading-[0.86] tracking-[0.01em] text-black">
          {target.player}
        </h2>
        <div className="mt-5 flex items-center gap-4">
          <span className="h-[34px] px-4 pt-[8px] text-[18px] font-[1000] uppercase leading-none text-black" style={{ backgroundColor: config.accentColor }}>
            {target.team}
          </span>
          <span className="text-[20px] font-[1000] uppercase leading-none tracking-[0.12em] text-black/70">
            Kill #{target.kills}
          </span>
        </div>
      </div>

      <div
        className="absolute left-[555px] top-[130px] h-[110px] w-[118px]"
        style={{
          backgroundColor: config.footerBg,
          clipPath: 'polygon(15% 0, 100% 0, 86% 100%, 0 100%)',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">{renderLogo('h-[76px] w-[76px]', 48)}</div>
      </div>

      <div
        className="absolute right-[32px] top-[28px] h-[244px] w-[280px]"
        style={{
          backgroundColor: '#eeece4',
          clipPath: 'polygon(18% 0, 100% 0, 100% 100%, 0 100%, 8% 62%)',
        }}
      >
        {renderPlayerFrame('diagonal', 'absolute inset-0', 'absolute bottom-[-8px] right-[-4px] h-[238px] w-[250px] grayscale contrast-125')}
      </div>

      <div className="absolute bottom-[24px] left-[392px] h-[8px] w-[235px]" style={{ backgroundColor: config.accentColor }} />
      <TacticalTicks color={config.accentColor} className="absolute left-[616px] top-[48px]" count={7} />
    </div>
  );

  const renderPhotoSplit = () => (
    <div className="relative h-[916px] w-[1717px] overflow-hidden" style={{ color: config.textColor }}>
      <img
        src={remappedHeroSplitBgSrc}
        className="absolute inset-0 h-full w-full object-fill"
        alt=""
        aria-hidden="true"
      />
      {config.bgTintOpacity > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: config.bgTintColor,
            opacity: config.bgTintOpacity / 100,
            mixBlendMode: 'color',
          }}
        />
      )}

      <div
        className="absolute left-[136px] top-[73px] h-[759px] w-[510px] overflow-hidden"
        style={{
          maskImage: `url(${FIRST_BLOOD_HERO_SPLIT_PHOTO_MASK})`,
          WebkitMaskImage: `url(${FIRST_BLOOD_HERO_SPLIT_PHOTO_MASK})`,
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskSize: '100% 100%',
            WebkitMaskSize: '100% 100%',
            maskMode: 'alpha',
          }}
        >
        <div className="absolute bottom-[-18px] left-[-18px] h-[730px] w-[530px]">
          <PlayerPhoto
            key={`${target.teamName}-${target.player}-${target.image || 'default'}-hero-split`}
            src={target.image}
            x={config.playerImageX}
            y={config.playerImageY}
            scale={config.playerImageScale}
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/65 to-transparent" />
      </div>

      <div className="absolute left-[734px] top-[119px] w-[666px]">
        <h1
          className="whitespace-nowrap text-[112px] font-normal uppercase leading-none tracking-[0.018em]"
          style={{
            color: config.accentColor,
            fontFamily: FIRST_BLOOD_HERO_TITLE_FONT,
            textShadow: '0 2px 0 rgb(0 0 0 / 0.18)',
          }}
        >
          {config.title}
        </h1>
      </div>

      <div className="absolute left-[719px] top-[304px] w-[364px]">
        <p
          className="truncate text-[30px] font-[900] uppercase leading-none tracking-[0.055em]"
          style={{
            color: config.mutedTextColor,
            fontFamily: FIRST_BLOOD_HERO_META_FONT,
            textShadow: '0 2px 0 rgb(0 0 0 / 0.12)',
          }}
        >
          {config.subtitle}
        </p>
      </div>
      <div className="absolute left-[717px] top-[420px] w-[570px]">
        <h2
          className="truncate font-[900] uppercase leading-[0.9]"
          style={{
            color: config.textColor,
            fontFamily: FIRST_BLOOD_HERO_CONDENSED_FONT,
            fontSize: `${heroSplitPlayerNameFontSize}px`,
            letterSpacing: heroSplitPlayerNameTracking,
            transform: 'scaleX(0.9)',
            transformOrigin: 'left center',
          }}
        >
          {target.player}
        </h2>
      </div>
      <div className="absolute left-[719px] top-[598px] w-[485px]">
        <p
          className="truncate text-[57px] font-[900] uppercase leading-none tracking-[0.01em]"
          style={{
            color: config.mutedTextColor,
            fontFamily: FIRST_BLOOD_HERO_META_FONT,
          }}
        >
          {target.teamName}
        </p>
      </div>

      <div className="absolute left-[714px] top-[704px] w-[166px]">
        <p
          className="text-center text-[85px] font-[900] uppercase leading-none tracking-[0.035em]"
          style={{
            color: config.textColor,
            fontFamily: FIRST_BLOOD_HERO_CONDENSED_FONT,
            transform: 'scaleX(0.92)',
          }}
        >
          {target.team}
        </p>
      </div>
      <div className="absolute left-[991px] top-[723px] w-[238px]">
        <p
          className="whitespace-nowrap text-[56px] font-[900] uppercase leading-none tracking-[0]"
          style={{
            color: config.textColor,
            fontFamily: FIRST_BLOOD_HERO_META_FONT,
          }}
        >
          Kill #{target.kills}
        </p>
      </div>

      <div className="absolute left-[1252px] top-[319px] flex h-[440px] w-[440px] items-center justify-center overflow-visible">
        <div className="flex h-[440px] w-[440px] items-center justify-center overflow-hidden">
          {target.logo ? (
            <img src={target.logo} className="h-full w-full object-contain" referrerPolicy="no-referrer" alt="" />
          ) : (
            <Shield size={408} strokeWidth={2.4} style={{ color: config.headerBg }} />
          )}
        </div>
      </div>

    </div>
  );

  const renderCompactHud = () => (
    <div
      className="relative h-[184px] w-[790px] overflow-hidden"
      style={{
        color: config.textColor,
        clipPath: 'polygon(3% 0, 100% 0, 96% 100%, 0 100%, 0 20%)',
      }}
    >
      <div className="absolute inset-0 bg-[#111411]" />
      <div className="absolute inset-[10px]" style={{ backgroundColor: config.bodyBg, clipPath: 'polygon(3% 0, 100% 0, 95% 100%, 0 100%, 0 20%)' }} />
      <div className="absolute left-[26px] top-[28px] h-[128px] w-[118px]" style={{ backgroundColor: '#eeece4', clipPath: 'polygon(0 0, 100% 0, 82% 100%, 0 100%)' }}>
        {renderPlayerFrame('compact', 'absolute inset-0', 'absolute bottom-[-2px] left-[4px] h-[126px] w-[104px] grayscale contrast-125')}
      </div>
      <div className="absolute left-[152px] top-[28px] h-[44px] w-[250px]" style={{ backgroundColor: config.headerBg, clipPath: 'polygon(0 0, 100% 0, 94% 100%, 0 100%)' }}>
        <h1 className="pt-[7px] text-center text-[28px] font-[1000] uppercase italic leading-none tracking-[0.04em] text-black">
          {config.title}
        </h1>
      </div>
      <div className="absolute left-[164px] top-[86px] w-[350px]">
        <h2 className="truncate text-[44px] font-[1000] uppercase leading-none text-black">
          {target.player}
        </h2>
        <p className="mt-3 text-[11px] font-[1000] uppercase tracking-[0.24em]" style={{ color: config.mutedTextColor }}>
          {target.teamName}
        </p>
      </div>
      <div className="absolute right-[154px] top-[50px]">{renderLogo('h-[78px] w-[78px]', 48)}</div>
      <div className="absolute right-[34px] top-[42px] flex h-[92px] w-[98px] flex-col items-center justify-center border-2 border-black/20" style={{ backgroundColor: config.footerBg }}>
        <span className="text-[9px] font-[1000] uppercase tracking-[0.22em] text-black/60">Kill</span>
        <span className="mt-1 text-[44px] font-[1000] leading-none text-black">{target.kills}</span>
      </div>
      <div className="absolute bottom-[24px] left-[160px] h-[7px] w-[275px]" style={{ backgroundColor: config.accentColor }} />
      <TacticalTicks color={config.accentColor} className="absolute bottom-[24px] right-[38px]" count={5} />
    </div>
  );

  const renderClassic = () => (
    <>
      <div
        className="relative z-10 px-7 py-5"
        style={{ backgroundColor: hasCustomDesign ? 'transparent' : config.headerBg, color: config.textColor }}
      >
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Droplets size={28} strokeWidth={3} />
              <h1 className="truncate text-[44px] font-[1000] uppercase leading-none tracking-[0.08em]">
                {config.title}
              </h1>
            </div>
            <p className="mt-2 text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: config.mutedTextColor }}>
              {config.subtitle}
            </p>
          </div>
          <div className="flex h-[92px] w-[92px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/20 bg-black/15">
            {target.logo ? (
              <img src={target.logo} className="h-full w-full object-contain p-2" referrerPolicy="no-referrer" alt="" />
            ) : (
              <Shield size={54} className="text-white/80" />
            )}
          </div>
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
              {target.player}
            </h2>
            <div className="mt-3 inline-flex items-center gap-2 rounded bg-black px-3 py-1.5">
              <span
                className="text-[12px] font-[1000] uppercase tracking-[0.16em]"
                style={{ color: config.accentColor }}
              >
                {target.team} / Kill #{target.kills}
              </span>
            </div>
          </div>

          <div className="w-[290px] shrink-0">
            <div className="flex h-[174px] w-full items-end justify-center overflow-visible">
              <PlayerPhoto
                key={`${target.teamName}-${target.player}-${target.image || 'default'}`}
                src={target.image}
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
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{
              backgroundColor: config.accentColor,
              boxShadow: `0 0 14px ${config.accentColor}`,
            }}
          />
          <span className="text-[11px] font-[1000] uppercase tracking-[0.26em]" style={{ color: config.textColor }}>
            Match opened
          </span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: config.mutedTextColor }}>
          {target.teamName}
        </span>
      </div>
    </>
  );

  const renderDesign = () => {
    if (isDefaultReferenceDesign) return renderDefaultReference();
    if (designVariant === 'diagonal-strike') return renderDiagonalStrike();
    if (designVariant === 'photo-split') return renderPhotoSplit();
    if (designVariant === 'compact-hud') return renderCompactHud();
    return renderClassic();
  };

  return (
    <AnimatePresence mode="wait">
      {target && (config.enabled || forceShow) && (
        <motion.div
          key={`${target.team}-${target.player}-${target.kills}`}
          className={`${className} ${frameClass} ${frameRadiusClass} overflow-hidden pointer-events-none z-[510] ${isDefaultReferenceDesign || designVariant === 'photo-split' ? '' : 'shadow-2xl'}`}
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
