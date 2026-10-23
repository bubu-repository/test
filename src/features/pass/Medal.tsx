/* ==========================================================================
   The sticker book's medal (ported from the old adelia.cc): a coin with a
   white rosette and a star. It earns ribbons, then a glow with rays, then
   sparkles, as the collection grows. Before the first medal it is an empty
   pressed outline where the coin will go. Decorative: say the tier in text.
   ========================================================================== */
import { useId } from 'react';
import { medalFor, type MedalTier } from './medals';

const rosette = (() => {
  const pts: string[] = [];
  const bumps = 12;
  for (let i = 0; i <= bumps * 10; i++) {
    const a = (i / (bumps * 10)) * Math.PI * 2;
    const r = 19 + Math.cos(a * bumps) * 2.4;
    pts.push(`${(50 + Math.cos(a) * r).toFixed(2)},${(48 + Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
})();

const spark = (x: number, y: number, r: number) =>
  `M${x} ${y - r}l${r * 0.25} ${r * 0.75} ${r * 0.75} ${r * 0.25}-${r * 0.75} ${r * 0.25}-${r * 0.25} ${r * 0.75}-${r * 0.25}-${r * 0.75}-${r * 0.75}-${r * 0.25} ${r * 0.75}-${r * 0.25}Z`;

const STAR = 'M50 39.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6Z';

export function Medal({ count, total, size = 64, tier }: { count: number; total: number; size?: number; tier?: MedalTier | null }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const t = tier === undefined ? medalFor(count, total) : tier;
  if (!t) {
    return (
      <svg viewBox="0 0 100 110" width={size} height={size * 1.1} aria-hidden className="medal medal--none" style={{ overflow: 'visible', flex: 'none' }}>
        <circle cx="50" cy="48" r="31" fill="#EDF3FA" />
        <circle cx="50" cy="48" r="31" fill="none" stroke="#B9C8D9" strokeWidth="2" strokeDasharray="5 5" />
        <path d={STAR} fill="#D3DEEB" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * 1.1} aria-hidden className={`medal medal--${t.id}`} style={{ overflow: 'visible', flex: 'none' }}>
      <defs>
        <linearGradient id={`${id}coin`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.coin[0]} />
          <stop offset="1" stopColor={t.coin[1]} />
        </linearGradient>
        <radialGradient id={`${id}core`} cx=".6" cy=".35" r=".8">
          <stop offset="0" stopColor={t.core[0]} />
          <stop offset="1" stopColor={t.core[1]} />
        </radialGradient>
        {t.glow && (
          <radialGradient id={`${id}glow`}>
            <stop offset="0" stopColor={t.glow} stopOpacity=".6" />
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
      <circle cx="47.5" cy="51" r="32" fill="#18263A" opacity=".14" />
      <circle cx="50" cy="48" r="32" fill={`url(#${id}coin)`} />
      <circle cx="50" cy="48" r="32" fill="none" stroke="#FFFFFF" strokeOpacity=".6" strokeWidth="2.5" />
      <circle cx="50" cy="48" r="27" fill="none" stroke="#18263A" strokeOpacity=".08" strokeWidth="2" />
      <path d={rosette} fill="#FFFFFF" opacity=".92" />
      <circle cx="50" cy="48" r="13.5" fill={`url(#${id}core)`} />
      <path d={STAR} fill="#FFFFFF" />
      <ellipse cx="62" cy="30" rx="9" ry="4.5" transform="rotate(35 62 30)" fill="#FFFFFF" opacity=".45" />
      {t.sparkles && (
        <g fill="#FFFFFF">
          <path d={spark(86, 26, 6)} />
          <path d={spark(14, 70, 5)} />
          <path d={spark(18, 18, 3.5)} />
          <circle cx="80" cy="74" r="1.8" />
        </g>
      )}
    </svg>
  );
}
