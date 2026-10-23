/* ==========================================================================
   Her ID card, printed onto the blank badge hanging from the chrome hook in
   the room plate (LIVE.idCard, plate px). Mounted by the stage on hit
   'lanyard' (box origin = ox, oy). One static SVG, no animation: a navy
   band with her domain, the monogram (until a real photo exists), her name
   and role, Bekasi · WIB, an "Open to work" LED, and a tiny QR mark (a real
   QR to her site, far too small to scan from the room — it reads as print).
   Multiplied onto the plate so the room's light and the sleeve stay on it.
   ========================================================================== */
import { useMemo } from 'react';
import { LIVE } from '@/stage/plate';
import { identity } from '@/content/profile';
import { qrMatrix, qrPath } from './qr';

/** The card face, drawn in an 82 × 112 box (the plate's card size). */
const W = 82;
const H = 112;

export function IdCardLive({ ox, oy }: { ox: number; oy: number }) {
  const { x, y, w, h } = LIVE.idCard;
  const qr = useMemo(() => {
    const m = qrMatrix(identity.url);
    return { n: m.length, d: qrPath(m) };
  }, []);
  const [first, ...rest] = identity.name.split(' ');
  const last = rest.join(' ');
  const roleWords = identity.role.split(' ');
  const role1 = roleWords.slice(0, -1).join(' ');
  const role2 = roleWords[roleWords.length - 1];
  const QR = 17;
  return (
    <svg
      className="idcard-live"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ position: 'absolute', left: x - ox, top: y - oy, width: w, height: h, pointerEvents: 'none', mixBlendMode: 'multiply', opacity: 0.94 }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="idcl-photo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".45" stopColor="#DCEEFC" />
          <stop offset="1" stopColor="#A9D6F5" />
        </linearGradient>
        <linearGradient id="idcl-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#A9D6F5" />
          <stop offset=".55" stopColor="#FFD6E8" />
          <stop offset="1" stopColor="#A9D6F5" />
        </linearGradient>
        <pattern id="idcl-dots" width="2.2" height="2.2" patternUnits="userSpaceOnUse">
          <circle cx="1.1" cy="1.1" r="0.38" fill="#A9D6F5" opacity=".28" />
        </pattern>
      </defs>

      {/* band: navy with a dot-matrix grain, the punched slot, her domain */}
      <rect x="0" y="0" width={W} height="22" fill="#1A2A40" />
      <rect x="0" y="0" width={W} height="22" fill="url(#idcl-dots)" />
      <rect x="0" y="21.2" width={W} height="0.9" fill="url(#idcl-line)" />
      <rect x="32" y="3" width="18" height="3.4" rx="1.7" fill="#FFFFFF" />
      <circle cx="8.6" cy="11.6" r="3.6" fill="#FFFFFF" />
      <text x="8.6" y="13.2" textAnchor="middle" fontSize="4.6" fontWeight="800" fill="#18263A" style={{ fontFamily: 'var(--font-ui)' }}>
        a.
      </text>
      <text x="14" y="13.6" fontSize="5.4" fontWeight="800" fill="#FFFFFF" style={{ fontFamily: 'var(--font-ui)' }}>
        {identity.domain}
      </text>
      <text x={W - 4} y="13.2" textAnchor="end" fontSize="2.6" letterSpacing=".4" fill="#A9D6F5" style={{ fontFamily: 'var(--font-mono)' }}>
        PASS
      </text>

      {/* photo slot: the monogram until a real photo exists */}
      <rect x="5.5" y="17" width="23" height="30" rx="1.8" fill="#FFFFFF" />
      <rect x="6.5" y="18" width="21" height="28" rx="1.4" fill="url(#idcl-photo)" />
      <text x="17" y="36" textAnchor="middle" fontSize="11" fontWeight="800" letterSpacing="-.6" fill="#18263A" style={{ fontFamily: 'var(--font-ui)' }}>
        AT
      </text>

      {/* name and role */}
      <text x="32" y="30" fontSize="2.5" letterSpacing=".35" fill="#5E708A" style={{ fontFamily: 'var(--font-mono)' }}>
        NAME
      </text>
      <text x="32" y="37" fontSize="7" fontWeight="800" letterSpacing="-.2" fill="#18263A" style={{ fontFamily: 'var(--font-ui)' }}>
        {first}
      </text>
      <text x="32" y="44" fontSize="7" fontWeight="800" letterSpacing="-.2" fill="#18263A" style={{ fontFamily: 'var(--font-ui)' }}>
        {last}
      </text>
      <text x="6" y="54.5" fontSize="4.1" fontWeight="700" fill="#3C4D66" style={{ fontFamily: 'var(--font-ui)' }}>
        {role1} {role2}
      </text>

      {/* printed fields */}
      <rect x="6" y="58.5" width={W - 12} height="0.4" fill="#DDE7F2" />
      <text x="6" y="64.5" fontSize="2.3" letterSpacing=".3" fill="#5E708A" style={{ fontFamily: 'var(--font-mono)' }}>
        BASE
      </text>
      <text x="6" y="69" fontSize="3.3" fill="#18263A" style={{ fontFamily: 'var(--font-mono)' }}>
        {identity.city} · WIB
      </text>
      <text x="44" y="64.5" fontSize="2.3" letterSpacing=".3" fill="#5E708A" style={{ fontFamily: 'var(--font-mono)' }}>
        CLASS
      </text>
      <text x="44" y="69" fontSize="3.3" fill="#18263A" style={{ fontFamily: 'var(--font-mono)' }}>
        {identity.cohort.replace(/\D+/g, '')}
      </text>
      <text x="6" y="76" fontSize="2.3" letterSpacing=".3" fill="#5E708A" style={{ fontFamily: 'var(--font-mono)' }}>
        DEGREE
      </text>
      <text x="6" y="80.5" fontSize="3.3" fill="#18263A" style={{ fontFamily: 'var(--font-mono)' }}>
        {identity.degree}
      </text>

      {/* open to work, and a tiny QR to her site */}
      <circle cx="7.6" cy="95.4" r="1.4" fill="#2FBF8A" />
      <text x="10.6" y="96.6" fontSize="3" fontWeight="700" letterSpacing=".3" fill="#13704F" style={{ fontFamily: 'var(--font-mono)' }}>
        OPEN TO WORK
      </text>
      <g transform={`translate(${W - 6 - QR} ${84.5}) scale(${QR / qr.n})`}>
        <rect x="-1" y="-1" width={qr.n + 2} height={qr.n + 2} fill="#FFFFFF" />
        <path d={qr.d} fill="#18263A" />
      </g>

      {/* the strip along the bottom */}
      <rect x="0" y="104" width={W} height="8" fill="#A9D6F5" />
      <text x={W / 2} y="109.2" textAnchor="middle" fontSize="2.4" fontWeight="700" letterSpacing=".6" fill="#18263A" style={{ fontFamily: 'var(--font-mono)' }}>
        AT-26 · STUDIO PASS
      </text>
    </svg>
  );
}
