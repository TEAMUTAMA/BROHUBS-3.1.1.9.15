import React from 'react';
import { Shield } from 'lucide-react';
import { PubgLevel3HelmetIcon } from './PubgLevel3HelmetIcon';
import {
  pickFinalFourColors,
  resolveFinalFourCardSurface,
  type FinalFourVisualFields,
} from '@/lib/finalFourOverlayVisual';

const CARD_W = 388;
const CARD_H = 128;
const TAG_H = 38;
const LEFT_W = 132;
const TAG_DIAG = 22;

const CARD_CLIP =
  'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)';

const TAG_CLIP = `polygon(0 0, calc(100% - ${TAG_DIAG}px) 0, 100% 100%, 0 100%)`;

export type FinalFourTeamCardData = {
  teamAbbreviation: string;
  teamName: string;
  teamLogo: string;
  wwcdPotentialPct: number;
  playerStatus: number[];
};

export type FinalFourCardLayout = {
  tagFontSize: number;
  wwcdLabelFontSize: number;
  wwcdPctFontSize: number;
  fontFamily?: string;
};

export const FinalFourTeamCard = ({
  entry,
  visual,
  layout,
}: {
  entry: FinalFourTeamCardData;
  visual: Partial<FinalFourVisualFields>;
  layout: FinalFourCardLayout;
}) => {
  const colors = pickFinalFourColors(visual);
  const statuses =
    entry.playerStatus.length >= 4
      ? entry.playerStatus.slice(0, 4)
      : [...entry.playerStatus, ...Array(4 - entry.playerStatus.length).fill(0)];

  const tagBlockW = LEFT_W + TAG_DIAG;
  const cardSurface = resolveFinalFourCardSurface(visual, colors.finalFourPanelDark);
  const fontFamily = layout.fontFamily ?? 'Oswald, sans-serif';

  return (
    <div
      className="relative shrink-0"
      style={{
        width: CARD_W,
        height: CARD_H,
        filter: `drop-shadow(0 0 0 1px ${colors.finalFourBorder}) drop-shadow(0 10px 22px rgba(0,0,0,0.42))`,
      }}
    >
      <div
        className="absolute inset-0 overflow-hidden flex flex-col"
        style={{
          clipPath: CARD_CLIP,
          ...cardSurface,
        }}
      >
        <div className="relative shrink-0" style={{ height: TAG_H }}>
          <div
            className="absolute inset-0"
            style={{ backgroundColor: colors.finalFourPanelRow }}
          />

          <div
            className="absolute left-0 top-0 bottom-0 flex items-center justify-center"
            style={{
              width: tagBlockW,
              backgroundColor: colors.finalFourTagGreen,
              clipPath: TAG_CLIP,
            }}
          >
            <span
              className="font-black uppercase leading-none tracking-tight select-none"
              style={{
                fontSize: layout.tagFontSize,
                paddingRight: TAG_DIAG + 4,
                fontFamily,
                color: colors.finalFourTagText,
              }}
            >
              {entry.teamAbbreviation}
            </span>
          </div>

          <div
            className="absolute inset-0 flex items-center justify-between pointer-events-none"
            style={{
              paddingLeft: tagBlockW - 6,
              paddingRight: 16,
            }}
          >
            <span
              className="uppercase font-bold leading-none select-none"
              style={{
                fontSize: layout.wwcdLabelFontSize,
                letterSpacing: '0.04em',
                fontFamily,
                color: colors.finalFourWwcdLabelText,
              }}
            >
              WWCD POTENTIAL
            </span>
            <span
              className="font-black tabular-nums leading-none select-none"
              style={{
                color: colors.finalFourWwcdGreen,
                fontSize: layout.wwcdPctFontSize,
                fontFamily,
              }}
            >
              {Number.isFinite(entry.wwcdPotentialPct)
                ? entry.wwcdPotentialPct.toFixed(1)
                : '0.0'}
              %
            </span>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <div
            className="flex items-center justify-center shrink-0"
            style={{ width: LEFT_W, backgroundColor: colors.finalFourLogoBg }}
          >
            {entry.teamLogo ? (
              <img
                src={entry.teamLogo}
                alt={entry.teamName}
                className="max-h-[78px] max-w-[118px] w-full object-contain"
                draggable={false}
              />
            ) : (
              <Shield size={48} className="text-zinc-300" strokeWidth={1.1} />
            )}
          </div>

          <div
            className="flex-1 flex items-center justify-center gap-[11px] min-w-0"
            style={{ backgroundColor: colors.finalFourPanelDark }}
          >
            {statuses.map((status, i) => (
              <span key={i} className="inline-flex shrink-0">
                <PubgLevel3HelmetIcon alive={status === 1} size={44} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
