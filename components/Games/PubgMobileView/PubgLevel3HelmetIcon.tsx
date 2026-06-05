import React from 'react';

/** Aset helm L3 — segmen hijau, background transparan (celah = panel kartu) */
const HELMET_SRC = '/assets/pubg-l3-helmet-transparent.png';

export const PubgLevel3HelmetIcon = ({
  alive,
  size = 44,
}: {
  alive: boolean;
  size?: number;
}) => (
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
      filter: alive
        ? 'drop-shadow(0 0 1.5px rgba(0,0,0,0.55))'
        : 'grayscale(1) saturate(0) brightness(1.32) drop-shadow(0 0 1.5px rgba(0,0,0,0.55))',
    }}
  />
);
