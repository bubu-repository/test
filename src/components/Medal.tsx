"use client";

import { useId } from "react";

type Tier = {
  name: string;
  coin: [string, string];
  core: [string, string];
  ribbon?: [string, string];
  glow?: string;
  sparkles?: boolean;
};

/** Six tiers, after a set of game medals: plain metal first, then ribbons, then glow and sparkles. */
const TIERS: Tier[] = [
  { name: "Silver", coin: ["#EEF1F6", "#A3ABBB"], core: ["#C3C9D5", "#848C9E"] },
  { name: "Jade", coin: ["#8AF2C0", "#17A56C"], core: ["#46DE8E", "#0E8F55"] },
  { name: "Gold", coin: ["#FBE39A", "#F5A300"], core: ["#FFBE55", "#F07A00"], ribbon: ["#FFEBB0", "#F5C24A"] },
  { name: "Sapphire", coin: ["#84CCFF", "#1460E8"], core: ["#4A93FF", "#0D3FC2"], ribbon: ["#C6EAFF", "#84CCFF"], glow: "#2C7DFF" },
  { name: "Amethyst", coin: ["#CFC3EE", "#6448B8"], core: ["#A08BE0", "#4E38A8"], ribbon: ["#E6E0F5", "#B5A4E6"], glow: "#8968D4", sparkles: true },
  { name: "Prism", coin: ["#F2C890", "#D8588F"], core: ["#E89A5A", "#AB366C"], ribbon: ["#F2B4D6", "#8968D4"], glow: "#D8588F", sparkles: true },
];

/** Which tier a collection of `count` out of `total` stickers has reached. */
export function medalTier(count: number, total: number) {
  if (count >= total) return TIERS[5];
  const i = Math.min(4, Math.floor((count / total) * 5.4));
  return TIERS[i];
}

const rosette = (() => {
  const pts: string[] = [];
  const bumps = 12;
  for (let i = 0; i <= bumps * 10; i++) {
    const a = (i / (bumps * 10)) * Math.PI * 2;
    const r = 19 + Math.cos(a * bumps) * 2.4;
    pts.push(`${(50 + Math.cos(a) * r).toFixed(2)},${(48 + Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
})();

const spark = (x: number, y: number, r: number) =>
  `M${x} ${y - r}l${r * 0.25} ${r * 0.75} ${r * 0.75} ${r * 0.25}-${r * 0.75} ${r * 0.25}-${r * 0.25} ${r * 0.75}-${r * 0.25}-${r * 0.75}-${r * 0.75}-${r * 0.25} ${r * 0.75}-${r * 0.25}Z`;

/**
 * The sticker collection's medal: a coin with a white rosette and a star. It earns ribbons, then a
 * glow with rays, then sparkles, as the collection grows. Decorative; say the tier in text beside it.
 */
export function Medal({ count, total, size = 64 }: { count: number; total: number; size?: number }) {
  const id = useId();
  const t = medalTier(count, total);
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1} aria-hidden="true" className="shrink-0 overflow-visible">
      <defs>
        <linearGradient id={`${id}coin`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.coin[0]} />
          <stop offset="1" stopColor={t.coin[1]} />
        </linearGradient>
        <radialGradient id={`${id}core`} cx=".4" cy=".35" r=".8">
          <stop offset="0" stopColor={t.core[0]} />
          <stop offset="1" stopColor={t.core[1]} />
        </radialGradient>
        {t.glow && (
          <radialGradient id={`${id}glow`}>
            <stop offset="0" stopColor={t.glow} stopOpacity=".7" />
            <stop offset="1" stopColor={t.glow} stopOpacity="0" />
          </radialGradient>
        )}
      </defs>
      {t.glow && (
        <g>
          <circle cx="50" cy="48" r="52" fill={`url(#${id}glow)`} />
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M50 48 47 -4h6Z" fill={t.glow} opacity=".16" transform={`rotate(${i * 30} 50 48)`} />
          ))}
        </g>
      )}
      {t.ribbon && (
        <g>
          <path d="M38 66 30 102l8-6 7 6 4-34Z" fill={t.ribbon[1]} />
          <path d="M62 66 70 102l-8-6-7 6-4-34Z" fill={t.ribbon[1]} />
          <path d="M41 67 35 96l3-2 3 3 4-29Z" fill={t.ribbon[0]} opacity=".9" />
          <path d="M59 67 65 96l-3-2-3 3-4-29Z" fill={t.ribbon[0]} opacity=".9" />
        </g>
      )}
      <circle cx="50" cy="48" r="32" fill={`url(#${id}coin)`} />
      <circle cx="50" cy="48" r="32" fill="none" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth="2.5" />
      <circle cx="50" cy="48" r="27" fill="none" stroke="#000000" strokeOpacity=".08" strokeWidth="2" />
      <path d={rosette} fill="#FFFFFF" opacity=".92" />
      <circle cx="50" cy="48" r="13.5" fill={`url(#${id}core)`} />
      <path d="M50 39.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6Z" fill="#FFFFFF" />
      <ellipse cx="38" cy="30" rx="9" ry="4.5" transform="rotate(-35 38 30)" fill="#FFFFFF" opacity=".4" />
      {t.sparkles && (
        <g fill="#FFFFFF">
          <path d={spark(14, 26, 6)} />
          <path d={spark(88, 70, 5)} />
          <path d={spark(84, 18, 3.5)} />
          <circle cx="20" cy="74" r="1.8" />
        </g>
      )}
    </svg>
  );
}
