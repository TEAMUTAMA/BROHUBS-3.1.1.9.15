import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield } from 'lucide-react';
import { useEliminationBannerFonts } from './useEliminationBannerFonts';
import type { TeamEliminationAlert } from '@/lib/teamEliminationAlert';
import type { EliminationBannerVisual } from '@/lib/eliminationBannerVisual';
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
} from '@/lib/eliminationBannerVisual';

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
      className="relative z-10 flex items-center justify-center w-[104px] shrink-0 overflow-hidden"
      style={{
        ...panelSurfaceStyle(v.elimBannerLogoBg, v.elimBannerLogoBgImage),
        clipPath: LOGO_CLIP,
      }}
    >
      <div className="w-[68px] h-[68px] flex items-center justify-center relative z-10">
        {renderTeamLogo()}
      </div>
    </div>
  );

  const renderMainPanel = () => (
    <div
      className="relative flex-1 flex flex-col items-center justify-center px-6 -ml-3 min-w-[260px] overflow-hidden"
      style={{
        ...panelSurfaceStyle(v.elimBannerMainBg, v.elimBannerMainBgImage, mainGradient),
        clipPath: MAIN_CLIP,
      }}
    >
      {!isValidImageUrl(v.elimBannerMainBgImage) && (
        <div
          className="absolute inset-0 opacity-25 mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.18) 4px, rgba(0,0,0,0.18) 8px)',
          }}
        />
      )}
      {showClassicPanelText && showEliminatedText && (
        <span
          className="relative font-[1000] uppercase tracking-[0.14em] leading-none"
          style={{
            color: v.elimBannerMainText,
            fontFamily: bannerFontFamily,
            fontSize: `${typo.eliminated}px`,
            textShadow: '2px 3px 0 rgba(0,0,0,0.55), 0 0 24px rgba(255,80,80,0.25)',
          }}
        >
          ELIMINATED
        </span>
      )}
    </div>
  );

  const renderSidePanel = () => (
    <div className="flex flex-col -ml-2 shrink-0 w-[140px]">
      <div
        className="flex-1 flex items-center justify-center px-2 min-h-[48px]"
        style={{
          ...panelSurfaceStyle(v.elimBannerPlacementBg, v.elimBannerPlacementBgImage),
          clipPath: SIDE_CLIP,
        }}
      >
        {showClassicPanelText && (
          <span
            className="font-[1000] leading-none tracking-tight relative z-10"
            style={{
              color: v.elimBannerPlacementText,
              fontFamily: bannerFontFamily,
              fontSize: `${typo.placement}px`,
            }}
          >
            #{alert!.placementRank}
          </span>
        )}
      </div>
      <div
        className="flex-1 flex items-center justify-center px-2 border-t border-black/50 min-h-[44px]"
        style={{
          ...panelSurfaceStyle(v.elimBannerNameBg, v.elimBannerNameBgImage),
          clipPath: SIDE_CLIP,
        }}
      >
        {showClassicPanelText && (
          <span
            className="font-[1000] uppercase tracking-wide text-center leading-tight line-clamp-2 relative z-10"
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
                  className="font-[1000] uppercase text-center leading-tight line-clamp-2 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
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

  if (!alert) return null;

  const bannerInner = (
    <>
      <div
        className="relative"
        style={{ filter: 'drop-shadow(0 16px 48px rgba(180,0,0,0.55))' }}
      >
        {useFullLinkCanvas ? (
          renderFullDesign()
        ) : (
          <div className="relative flex items-stretch h-[96px] min-w-[560px] max-w-[720px]">
            {renderLogoSlot()}
            {renderMainPanel()}
            {renderSidePanel()}
          </div>
        )}
      </div>
    </>
  );

  if (tuningPreview) {
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
      <motion.div
        key={alert.id}
        className={`pointer-events-none z-[500] flex flex-col items-center gap-3 ${className}`}
        initial={{ opacity: 0, x: -100, scale: 0.88 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 60, scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      >
        {bannerInner}
      </motion.div>
    </AnimatePresence>
  );
};

export default TeamEliminatedBanner;
