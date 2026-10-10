import React from 'react';
import {
  OVERLAY_FONT_FAMILY_OPTIONS,
  resolveOverlayFontFamilyId,
  getOverlayFontCssFamily,
} from '@/features/games/pubg-mobile/logic/eliminationBannerFonts';

interface OverlayFontFamilySelectProps {
  value: string | undefined | null;
  onChange: (fontFamilyId: string) => void;
  className?: string;
}

const OverlayFontFamilySelect: React.FC<OverlayFontFamilySelectProps> = ({
  value,
  onChange,
  className = 'w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-[11px] text-white font-bold outline-none focus:border-[#ccff00] cursor-pointer',
}) => {
  const resolvedId = resolveOverlayFontFamilyId(value);
  return (
    <select
      value={resolvedId}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      style={{ fontFamily: getOverlayFontCssFamily(resolvedId) }}
    >
      {OVERLAY_FONT_FAMILY_OPTIONS.map((opt) => (
        <option key={opt.id} value={opt.id} style={{ fontFamily: opt.cssFamily }}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

export default OverlayFontFamilySelect;
