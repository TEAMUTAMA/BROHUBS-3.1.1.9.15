import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield } from 'lucide-react';
import { useEliminationBannerFonts } from '@/features/games/pubg-mobile/useEliminationBannerFonts';
import type { TeamEliminationAlert } from '@/features/games/pubg-mobile/logic/teamEliminationAlert';
import type { EliminationBannerVisual } from '@/features/games/pubg-mobile/logic/eliminationBannerVisual';
import {
  DEFAULT_ELIMINATION_BANNER_VISUAL,
  DEFAULT_ELIMINATION_BANNER_FULL_LAYOUT,
  fullOverlayAnchorStyle,
  fullCustomImageBackgroundStyle,
  fullCustomImageContainerClass,
  isValidImageUrl,
  panelSurfaceStyle,
  shouldShowCustomImageTeamOverlays,
  isEliminationBannerPanelDesignMode,
  resolveEliminationBannerTypography,
  resolveEliminationBannerTextFontFamily,
} from '@/features/games/pubg-mobile/logic/eliminationBannerVisual';

interface TeamEliminatedBannerProps {
  alert: TeamEliminationAlert | null;
  visual?: EliminationBannerVisual;
  className?: string;
  /** Penyesuaian live saat Preview Sementara — tanpa animasi masuk ulang */
  tuningPreview?: boolean;
}

const LOGO_CLIP = 'polygon(0 0, 100% 0, 82% 100%, 0 100%, 8% 50%)';
const MAIN_CLIP = 'polygon(4% 0, 100% 0, 96% 100%, 0 100%, 6% 50%)';
const SIDE_CLIP = 'polygon(12% 0, 100% 0, 100% 100%, 0 100%)';

const TeamEliminatedBanner: React.FC<TeamEliminatedBannerProps> = ({
  alert,
  visual = DEFAULT_ELIMINATION_BANNER_VISUAL,
  className = '',
  tuningPreview = false,
}) => {
  useEliminationBannerFonts();
  const v = visual;
  const bannerFontFamily = resolveEliminationBannerTextFontFamily(v);
  const isPanelDesignMode = isEliminationBannerPanelDesignMode(v);
  const showTextOverlay = v.elimBannerShowTextOverlay !== false;
  const showClassicPanelText =
    isPanelDesignMode || shouldShowCustomImageTeamOverlays(v) || showTextOverlay;
  const isCustomImageMode = v.elimBannerDesignMode === 'full';
  const showEliminatedText = isPanelDesignMode;
  const customVariant = v.elimBannerCustomImageVariant ?? 'fullLink';
  const fullLayout = v.elimBannerFullLayout ?? DEFAULT_ELIMINATION_BANNER_FULL_LAYOUT;
  const typo = resolveEliminationBannerTypography(v);
  const useFullLinkCanvas =
    isCustomImageMode && customVariant === 'fullLink';
  const useFullLinkDesign = useFullLinkCanvas && isValidImageUrl(v.elimBannerFullImageUrl);
  const showTeamDataOverlays =
    shouldShowCustomImageTeamOverlays(v) || showTextOverlay;
  const mainGradient = `linear-gradient(135deg, ${v.elimBannerMainBgEnd} 0%, ${v.elimBannerMainBg} 45%, ${v.elimBannerMainBgEnd} 100%)`;
  const classicBannerHeight = Math.max(
    96,
    Math.ceil(typo.eliminated + 34),
    Math.ceil((typo.placement + typo.tag) * 1.1 + 38)
  );
  const classicLogoWidth = Math.max(104, Math.ceil(classicBannerHeight * 1.08));
  const classicLogoSize = Math.max(68, Math.ceil(classicBannerHeight * 0.7));
  const classicEliminatedTextWidth = typo.eliminated * (10 * 0.72 + 9 * 0.14);
  const classicMainMinWidth = Math.max(
    272,
    Math.ceil(classicEliminatedTextWidth + classicBannerHeight * 0.42 + 36)
  );
  const classicSideWidth = Math.max(140, Math.ceil(Math.max(typo.placement * 2.6, typo.tag * 5.8) + 34));
  const classicMainTextInsetLeft = Math.max(24, Math.ceil(classicBannerHeight * 0.26));
  const classicMainTextInsetRight = Math.max(18, Math.ceil(classicBannerHeight * 0.16));

  const renderTeamLogo = (className = '') => (
    <>
      {alert!.teamLogo ? (
        <img
          key={`${alert!.id}-logo-${alert!.teamIndex}`}
          src={alert!.teamLogo}
          alt={alert!.teamName}
          className={`w-full h-full object-contain ${className}`}
        />
      ) : alert!.country ? (
        <img
          key={`${alert!.id}-flag-${alert!.teamIndex}`}
          src={`https://flagcdn.com/w80/${alert!.country.toLowerCase()}.png`}
          alt={alert!.country}
          className="w-12 h-auto rounded-sm"
        />
      ) : (
        <Shield size={44} className="text-zinc-400" strokeWidth={1.5} />
      )}
    </>
  );

  const renderLogoSlot = () => (
    <div
      className="relative z-10 flex items-center justify-center shrink-0 overflow-hidden"
      style={{
        width: classicLogoWidth,
        ...panelSurfaceStyle(v.elimBannerLogoBg, v.elimBannerLogoBgImage),
        clipPath: LOGO_CLIP,
      }}
    >
      <div
        className="flex items-center justify-center relative z-10"
        style={{ width: classicLogoSize, height: classicLogoSize }}
      >
        {renderTeamLogo()}
      </div>
    </div>
  );

  const renderMainPanel = () => (
    <div
      className="relative flex-1 flex flex-col items-center justify-center px-5 -ml-3 overflow-hidden"
      style={{ minWidth: classicMainMinWidth }}
    >
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          ...panelSurfaceStyle(v.elimBannerMainBg, v.elimBannerMainBgImage, mainGradient),
          clipPath: MAIN_CLIP,
        }}
      />
      {!isValidImageUrl(v.elimBannerMainBgImage) && (
        <div
          className="absolute inset-0 opacity-25 mix-blend-overlay pointer-events-none overflow-hidden"
          style={{
            clipPath: MAIN_CLIP,
            backgroundImage:
              'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.18) 4px, rgba(0,0,0,0.18) 8px)',
          }}
        />
      )}
      {showClassicPanelText && showEliminatedText && (
        <div
          className="absolute inset-y-0 z-10 flex items-center justify-center"
          style={{
            left: classicMainTextInsetLeft,
            right: classicMainTextInsetRight,
          }}
        >
          <span
            className="whitespace-nowrap text-center font-[1000] uppercase tracking-[0.14em] leading-none"
            style={{
              color: v.elimBannerMainText,
              fontFamily: bannerFontFamily,
              fontSize: `${typo.eliminated}px`,
              textShadow: '2px 3px 0 rgba(0,0,0,0.55), 0 0 24px rgba(255,80,80,0.25)',
              transform: 'translateX(8px)',
            }}
          >
            ELIMINATED
          </span>
        </div>
      )}
    </div>
  );

  const renderSidePanel = () => (
    <div className="flex flex-col -ml-2 shrink-0" style={{ width: classicSideWidth }}>
      <div
        className="relative flex-1 flex items-center justify-center px-3 overflow-hidden"
      >
        <div
          className="absolute inset-0"
          style={{
            ...panelSurfaceStyle(v.elimBannerPlacementBg, v.elimBannerPlacementBgImage),
            clipPath: SIDE_CLIP,
          }}
        />
        {showClassicPanelText && (
          <span
            className="font-[1000] leading-none tracking-tight relative z-10 whitespace-nowrap"
            style={{
              color: v.elimBannerPlacementText,
              fontFamily: bannerFontFamily,
              fontSize: `${typo.placement}px`,
              textShadow: '1px 2px 0 rgba(0,0,0,0.35), 0 0 10px rgba(0,0,0,0.25)',
            }}
          >
            #{alert!.placementRank}
          </span>
        )}
      </div>
      <div
        className="relative flex-1 flex items-center justify-center px-3 border-t border-black/50 overflow-hidden"
      >
        <div
          className="absolute inset-0"
          style={{
            ...panelSurfaceStyle(v.elimBannerNameBg, v.elimBannerNameBgImage),
            clipPath: SIDE_CLIP,
          }}
        />
        {showClassicPanelText && (
          <span
            className="font-[1000] uppercase tracking-wide text-center leading-tight relative z-10"
            style={{
              color: v.elimBannerNameText,
              fontFamily: bannerFontFamily,
              fontSize: `${typo.tag}px`,
            }}
            title={alert!.teamName}
          >
            {alert!.teamLabel}
          </span>
        )}
      </div>
    </div>
  );

  const renderFullDesign = () => {
    const { logo, placement, teamName } = fullLayout;
    const imageFit = v.elimBannerFullImageFit ?? 'contain';

    return (
      <div
        className={fullCustomImageContainerClass(imageFit)}
        style={fullCustomImageBackgroundStyle(
          v.elimBannerFullImageUrl,
          imageFit,
          v.elimBannerFullImagePosX ?? 50,
          v.elimBannerFullImagePosY ?? 50,
          v.elimBannerFullImageZoom ?? 100
        )}
      >
        {showTeamDataOverlays && (
          <>
            {logo.visible && (
              <div
                className="z-20 flex items-center justify-center pointer-events-none"
                style={{
                  ...fullOverlayAnchorStyle(logo),
                  width: `${logo.size}%`,
                  aspectRatio: '1',
                  maxHeight: '85%',
                  minWidth: 48,
                  minHeight: 48,
                }}
              >
                <div className="w-full h-full flex items-center justify-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                  {renderTeamLogo('drop-shadow-lg')}
                </div>
              </div>
            )}

            {placement.visible && (
              <div
                className="z-20 flex items-center justify-center pointer-events-none"
                style={fullOverlayAnchorStyle(placement)}
              >
                <span
                  className="font-[1000] leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] whitespace-nowrap"
                  style={{
                    color: v.elimBannerPlacementText,
                    fontFamily: bannerFontFamily,
                    fontSize: `${typo.placement}px`,
                    textShadow: '1px 2px 0 rgba(0,0,0,0.45), 0 0 10px rgba(0,0,0,0.35)',
                    WebkitTextStroke: '1px rgba(0,0,0,0.35)',
                  }}
                >
                  #{alert!.placementRank}
                </span>
              </div>
            )}

            {teamName.visible && (
              <div
                className="z-20 flex items-center justify-center pointer-events-none px-1 max-w-[32%]"
                style={fullOverlayAnchorStyle(teamName)}
              >
                <span
                  className="font-[1000] uppercase text-center leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                  style={{
                    color: v.elimBannerNameText,
                    fontFamily: bannerFontFamily,
                    fontSize: `${typo.tag}px`,
                    WebkitTextStroke: '1px rgba(0,0,0,0.35)',
                  }}
                  title={alert!.teamName}
                >
                  {alert!.teamLabel}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const bannerInner = alert ? (
    <>
      <div
        className="relative"
        style={{ filter: 'drop-shadow(0 16px 48px rgba(0,0,0,0.65))' }}
      >
        {useFullLinkCanvas ? (
          renderFullDesign()
        ) : (
          <div
            className="relative flex items-stretch min-w-[560px]"
            style={{ height: classicBannerHeight }}
          >
            {renderLogoSlot()}
            {renderMainPanel()}
            {renderSidePanel()}
          </div>
        )}
      </div>
    </>
  ) : null;

  if (tuningPreview) {
    if (!alert) return null;
    return (
      <div
        className={`pointer-events-none z-[500] flex flex-col items-center gap-3 ${className}`}
      >
        {bannerInner}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {alert && (
        <motion.div
          key={alert.id}
          className={`pointer-events-none z-[500] flex flex-col items-center gap-3 ${className}`}
          initial={{
            opacity: 0,
            x: -180,
            y: 16,
            scale: 0.84,
            rotate: -1.5,
            filter: 'blur(8px)',
          }}
          animate={{
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            rotate: 0,
            filter: 'blur(0px)',
            transition: {
              type: 'spring',
              stiffness: 420,
              damping: 28,
              mass: 0.9,
            },
          }}
          exit={{
            opacity: 0,
            x: 260,
            y: -18,
            scale: 0.82,
            rotate: 2.5,
            filter: 'blur(10px)',
            transition: {
              duration: 0.9,
              ease: [0.22, 1, 0.36, 1],
              opacity: { duration: 0.68, delay: 0.18 },
              filter: { duration: 0.75 },
            },
          }}
        >
          <motion.div
            className="absolute inset-y-0 -left-24 w-24 bg-white/35 blur-md mix-blend-screen"
            initial={{ x: -80, opacity: 0 }}
            animate={{
              x: 740,
              opacity: [0, 0.75, 0],
              transition: { duration: 0.7, ease: 'easeOut', delay: 0.08 },
            }}
            exit={{
              x: 900,
              opacity: [0, 0.55, 0],
              transition: { duration: 0.55, ease: 'easeInOut' },
            }}
          />
          {bannerInner}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TeamEliminatedBanner;
