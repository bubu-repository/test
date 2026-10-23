/* Adelia OS app icons — 40×40 clear-tech line glyphs: white and clear
   plastic, graphite strokes, one pink or baby-blue signal each. */
import type { ReactNode } from 'react';
import type { AppId } from './wm';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const PINK = 'var(--accent)';
const BLUE = 'var(--primary)';
const BABY = 'var(--baby)';
const INK = 'var(--ink)';
const SCREEN = '#10141c';
const W = '#ffffff';
const ICE2 = '#eff1f4';
const ICE3 = '#e3e6eb';

/** a small heart centred on (x, y), r ≈ half its width */
const heart = (x: number, y: number, r: number) =>
  `M${x} ${y + r * 0.95}s${-r} ${-r * 0.62} ${-r} ${-r * 1.3}a${r * 0.52} ${r * 0.52} 0 0 1 ${r} ${-r * 0.3}a${r * 0.52} ${r * 0.52} 0 0 1 ${r} ${r * 0.3}c0 ${r * 0.68} ${-r} ${r * 1.3} ${-r} ${r * 1.3}z`;

export function AppIcon({ id, size = 40, full = true }: { id: AppId; size?: number; full?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="os-ico">
      {GLYPHS[id](full)}
    </svg>
  );
}

const GLYPHS: Record<AppId, (full: boolean) => ReactNode> = {
  // her ID card: a jelly-drop portrait, three lines, a pink heart
  about: () => (
    <>
      <rect x="4" y="8" width="32" height="24" rx="3.2" {...S} fill={W} />
      <rect x="7.5" y="12" width="10" height="13" rx="2" fill={ICE2} />
      <path d="M12.5 14.2c-2.3 2.6-3.4 4.4-3.4 6a3.4 3.4 0 0 0 6.8 0c0-1.6-1.1-3.4-3.4-6z" fill={BABY} stroke={INK} strokeWidth={1.1} strokeLinejoin="round" />
      <circle cx="11.3" cy="20.6" r="0.7" fill={INK} />
      <circle cx="13.7" cy="20.6" r="0.7" fill={INK} />
      <path d="M20.5 15h11M20.5 19h11M20.5 23h7" {...S} strokeWidth={1.4} />
      <path d={heart(31.2, 26.4, 2.3)} fill={PINK} />
      <path d="M7.5 28.5h10" {...S} strokeWidth={1.2} opacity={0.5} />
    </>
  ),
  // a case folder with a pink index tab
  cases: () => (
    <>
      <path d="M4 10h11.5l3 3H36v21H4z" {...S} fill={ICE3} />
      <path d="M4 17h32v17H4z" {...S} fill={W} />
      <rect x="14" y="21.5" width="12" height="7" rx="1.3" fill={PINK} />
      <text x="20" y="26.8" textAnchor="middle" fontSize="5.4" fontFamily="JetBrains Mono, monospace" fontWeight="700" fill={INK}>
        04
      </text>
      <path d="M8 31h24" {...S} strokeWidth={1.1} opacity={0.35} />
    </>
  ),
  // a filing box with a baby-blue year chip
  archive: () => (
    <>
      <path d="M6 13h28v21H6z" {...S} fill={ICE3} />
      <rect x="4" y="7.5" width="32" height="6.5" rx="1.6" {...S} fill={W} />
      <rect x="13.5" y="20" width="13" height="7" rx="1.3" fill={BLUE} />
      <text x="20" y="25.4" textAnchor="middle" fontSize="5.4" fontFamily="JetBrains Mono, monospace" fontWeight="700" fill={INK}>
        26
      </text>
      <path d="M16.5 30.5h7" {...S} strokeWidth={1.3} />
    </>
  ),
  // a graphite screen, baby-blue prompt, pink LED
  terminal: () => (
    <>
      <rect x="4" y="7" width="32" height="26" rx="3.2" {...S} fill={SCREEN} />
      <path d="M10 15l5 4-5 4" stroke={BABY} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 24h9" stroke="#f3f5f8" strokeWidth={2} strokeLinecap="round" />
      <circle cx="31" cy="11" r="1.3" fill={PINK} />
    </>
  ),
  // an envelope sealed with a pink heart
  mail: () => (
    <>
      <rect x="4" y="9" width="32" height="22" rx="2.2" {...S} fill={W} />
      <path d="M4.6 10.2 20 22l15.4-11.8" {...S} />
      <path d={heart(20, 22.6, 3.4)} fill={PINK} stroke={INK} strokeWidth={1} strokeLinejoin="round" />
    </>
  ),
  // two chain links, one baby blue
  links: () => (
    <>
      <circle cx="20" cy="20" r="15" fill={ICE2} />
      <rect x="7.5" y="20.5" width="16" height="9" rx="4.5" transform="rotate(-45 15.5 25)" {...S} strokeWidth={2} />
      <rect x="16.5" y="10.5" width="16" height="9" rx="4.5" transform="rotate(-45 24.5 15)" fill="none" stroke={BLUE} strokeWidth={2.4} />
    </>
  ),
  // a chrome dial with a baby-blue pointer
  settings: () => (
    <>
      <circle cx="20" cy="20" r="14" {...S} fill={ICE3} />
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return <path key={i} d={`M${20 + Math.cos(a) * 11} ${20 + Math.sin(a) * 11}L${20 + Math.cos(a) * 13.2} ${20 + Math.sin(a) * 13.2}`} {...S} strokeWidth={1} />;
      })}
      <circle cx="20" cy="20" r="7.5" {...S} fill={W} />
      <path d="M20 20l4.6-4.6" stroke={BLUE} strokeWidth={2.4} strokeLinecap="round" />
    </>
  ),
  // a clear acrylic bin; full = a crumpled pink-soft page on top
  trash: (full) => (
    <>
      <path d="M9 12h22l-2 23H11z" {...S} fill="rgba(255,255,255,0.78)" />
      <path d="M7 12h26M16 12V8.5h8V12" {...S} />
      <path d="M15 17l1 14M20 17v14M25 17l-1 14" {...S} strokeWidth={1.1} opacity={0.55} />
      {full && (
        <>
          <path d="M14.5 12c-.6-3.4 1.6-5.6 4.2-5.2 1.4-1.9 4.9-1.6 5.8.6 2.3.2 3.2 2.4 2.4 4.6" {...S} fill="#ffe3ef" strokeWidth={1.2} />
          <path d="M18.5 8.4l2 1.6 1.6-1.4M23 9.2l.6 1.8" {...S} strokeWidth={1} />
        </>
      )}
    </>
  ),
  // the computer itself: clear plastic, graphite glass, pink LED
  sysinfo: () => (
    <>
      <rect x="6.5" y="4" width="27" height="25" rx="4" {...S} fill={W} />
      <rect x="10.5" y="8" width="19" height="14" rx="1.6" fill={SCREEN} />
      <path d="M20 11.2c-1.9 2.1-2.8 3.5-2.8 4.8a2.8 2.8 0 0 0 5.6 0c0-1.3-.9-2.7-2.8-4.8z" fill={BABY} />
      <circle cx="28.5" cy="25.5" r="1.3" fill={PINK} />
      <path d="M12 29v3.5h16V29M9 35h22" {...S} />
    </>
  ),
};

/** generic small glyphs used inside apps */
export function FolderGlyph({ size = 44, label, open = false }: { size?: number; label?: string; open?: boolean }) {
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 44 36" aria-hidden className="os-ico">
      <path d="M2 6h14l3 3h23v25H2z" {...S} fill={open ? '#e2f0fb' : ICE3} />
      <path d="M2 13h40" {...S} />
      {open && <rect x="31" y="16" width="7" height="3" rx="1.5" fill={BLUE} />}
      {label && (
        <text x="22" y="27" textAnchor="middle" fontSize="9" fontFamily="JetBrains Mono, monospace" fontWeight="700" fill="currentColor">
          {label}
        </text>
      )}
    </svg>
  );
}

export function FileGlyph({ size = 36, ext = 'TXT', accent = false }: { size?: number; ext?: string; accent?: boolean }) {
  return (
    <svg width={size * 0.8} height={size} viewBox="0 0 32 40" aria-hidden className="os-ico">
      <path d="M4 2h17l7 7v29H4z" {...S} fill={W} />
      <path d="M21 2v7h7" {...S} />
      <rect x="4" y="24" width="24" height="9" fill={accent ? PINK : SCREEN} />
      <text x="16" y="31" textAnchor="middle" fontSize="6.5" fontFamily="JetBrains Mono, monospace" fontWeight="700" fill={accent ? INK : '#fff'}>
        {ext}
      </text>
    </svg>
  );
}

/** The Adelia OS mark: a clear jelly drop with a face (Moci's cousin). */
export function DropMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className="os-drop">
      <path d="M8 1.4C5.3 4.4 3 7.2 3 9.9a5 5 0 0 0 10 0C13 7.2 10.7 4.4 8 1.4z" fill={BABY} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M5.6 7.6c.4-1 1-1.8 1.6-2.6" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.9" />
      <circle cx="6.5" cy="10.4" r="0.8" fill={INK} />
      <circle cx="9.5" cy="10.4" r="0.8" fill={INK} />
      <rect x="4.4" y="11.6" width="1.5" height="0.7" rx="0.35" fill={PINK} />
      <rect x="10.1" y="11.6" width="1.5" height="0.7" rx="0.35" fill={PINK} />
    </svg>
  );
}

/** A heart path for inline use (hearts are the points). */
export function HeartGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden className="os-heart">
      <path d={heart(6, 6.2, 4.6)} fill="currentColor" />
    </svg>
  );
}
