import React from 'react';

/** Aset helm L3 — segmen hijau, background transparan (celah = panel kartu) */
const HELMET_SRC = '/assets/pubg-l3-helmet-transparent.png';

export const PubgLevel3HelmetIcon = ({
  status,
  size = 44,
}: {
  status: number;
  size?: number;
}) => {
  const filter =
    status === 1
      ? 'drop-shadow(0 0 1.5px rgba(0,0,0,0.55))'
      : status === 2
        ? 'sepia(1) saturate(4.2) hue-rotate(318deg) brightness(1.18) contrast(1.18) drop-shadow(0 0 5px rgba(255,55,72,0.86)) drop-shadow(0 0 13px rgba(180,0,24,0.42))'
        : 'grayscale(1) saturate(0) brightness(1.32) drop-shadow(0 0 1.5px rgba(0,0,0,0.55))';

  return (
    <img
      src={HELMET_SRC}
      alt=""
      aria-hidden
      draggable={false}
      width={size}
      height={size}
      className="shrink-0 select-none pointer-events-none"
      style={{
        display: 'block',
        objectFit: 'contain',
        filter,
      }}
    />
  );
};
