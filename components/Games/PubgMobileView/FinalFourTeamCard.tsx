import React from 'react';
import { Shield } from 'lucide-react';
import { PubgLevel3HelmetIcon } from './PubgLevel3HelmetIcon';

/** Palet & ukuran disesuaikan ke referensi desain WWCD card */
const CARD_W = 388;
const CARD_H = 128;
const TAG_H = 38;
const LEFT_W = 132;
const TAG_DIAG = 22;

const C = {
  tagGreen: '#5B835B',
  panelDark: '#141414',
  panelRow: '#1A1A1A',
  wwcdGreen: '#66BB6A',
  border: 'rgba(255,255,255,0.14)',
} as const;

/** Sudut chamfer seperti referensi: potong kiri-atas & kanan-bawah */
const CARD_CLIP =
  'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)';

/** Trapesium tag tim — sisi kanan miring ke kanan (sesuai referensi) */
const TAG_CLIP = `polygon(0 0, calc(100% - ${TAG_DIAG}px) 0, 100% 100%, 0 100%)`;

export type FinalFourTeamCardData = {
  teamAbbreviation: string;
  teamName: string;
  teamLogo: string;
  wwcdPotentialPct: number;
  playerStatus: number[];
};

export const FinalFourTeamCard = ({ entry }: { entry: FinalFourTeamCardData }) => {
  const statuses =
    entry.playerStatus.length >= 4
      ? entry.playerStatus.slice(0, 4)
      : [...entry.playerStatus, ...Array(4 - entry.playerStatus.length).fill(0)];

  const tagBlockW = LEFT_W + TAG_DIAG;

  return (
    <div
      className="relative shrink-0"
      style={{
        width: CARD_W,
        height: CARD_H,
        filter: `drop-shadow(0 0 0 1px ${C.border}) drop-shadow(0 10px 22px rgba(0,0,0,0.42))`,
      }}
    >
      <div
        className="absolute inset-0 overflow-hidden flex flex-col"
        style={{
          clipPath: CARD_CLIP,
          backgroundColor: C.panelDark,
        }}
      >
        {/* Baris atas — tag hijau + WWCD POTENTIAL (satu baris terpadu) */}
        <div className="relative shrink-0" style={{ height: TAG_H }}>
          <div className="absolute inset-0" style={{ backgroundColor: C.panelRow }} />

          <div
            className="absolute left-0 top-0 bottom-0 flex items-center justify-center"
            style={{
              width: tagBlockW,
              backgroundColor: C.tagGreen,
              clipPath: TAG_CLIP,
            }}
          >
            <span
              className="font-black uppercase text-white leading-none tracking-tight select-none"
              style={{
                fontSize: 23,
                paddingRight: TAG_DIAG + 4,
                fontFamily: 'Oswald, sans-serif',
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
              className="uppercase text-white font-bold leading-none select-none"
              style={{
                fontSize: 13.5,
                letterSpacing: '0.04em',
                fontFamily: 'Oswald, sans-serif',
              }}
            >
              WWCD POTENTIAL
            </span>
            <span
              className="font-black tabular-nums leading-none select-none"
              style={{
                color: C.wwcdGreen,
                fontSize: 15,
                fontFamily: 'Oswald, sans-serif',
              }}
            >
              {Number.isFinite(entry.wwcdPotentialPct)
                ? entry.wwcdPotentialPct.toFixed(1)
                : '0.0'}
              %
            </span>
          </div>
        </div>

        {/* Baris bawah — logo tim & status helm */}
        <div className="flex flex-1 min-h-0">
          <div
            className="flex items-center justify-center shrink-0 bg-white"
            style={{ width: LEFT_W }}
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
            style={{ backgroundColor: C.panelDark }}
          >
            {statuses.map((status, i) => (
              <PubgLevel3HelmetIcon key={i} alive={status === 1} size={44} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
