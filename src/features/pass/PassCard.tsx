/* ==========================================================================
   Her Guest Pass — the holo card standing next to the instant camera, built
   in CSS 3D. Clear acrylic with a pearl sheen and chrome details; from the
   Friend tier on, the whole face turns holo foil (the Friend perk). Tilts
   toward the pointer with a moving glare; flips on click / Enter / Space.
   Front: her mark, tier, chip, chrome heart, "Guest Pass" in felt letters,
   the name you typed (embossed), pass number, since, hearts.
   Back: a micro-print strip, signature panel, a pass-code grid, fine print.
   ========================================================================== */
import { useMemo, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import type { Tier } from '@/state/achievements';
import { identity } from '@/content/profile';
import { Mark } from '@/ui/Icon';
import { qrCells, QR_SIZE } from './qr';

interface Props {
  name: string;
  memberNo: string;
  sessionId: string;
  tier: Tier;
  points: number;
  since: string;
  /** Friend tier and up: holo foil face */
  holo: boolean;
  flipped: boolean;
  onFlip: () => void;
  /** increments when the card is (re)embossed → replays the letter press */
  emboss: number;
}

const HEART = 'M12 21s-8.6-5.3-8.6-11.7A4.9 4.9 0 0 1 12 6.2a4.9 4.9 0 0 1 8.6 3.1C20.6 15.7 12 21 12 21Z';

export function PassCard({ name, memberNo, sessionId, tier, points, since, holo, flipped, onFlip, emboss }: Props) {
  const tilt = useRef<HTMLDivElement>(null);
  const dots = useMemo(() => {
    const g = qrCells(sessionId);
    const out: [number, number][] = [];
    g.forEach((row, y) => row.forEach((on, x) => on && out.push([x, y])));
    return out;
  }, [sessionId]);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = tilt.current;
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.style.setProperty('--rx', `${((0.5 - y) * 14).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${((x - 0.5) * 20).toFixed(2)}deg`);
    el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    el.classList.add('is-live');
  };
  const leave = () => {
    const el = tilt.current;
    if (!el) return;
    el.classList.remove('is-live');
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onFlip();
    }
  };

  const display = (name || '').trim().toUpperCase();
  const chars = [...(display || 'YOUR NAME HERE')];

  return (
    <div className="gp-card-wrap" onPointerMove={move} onPointerLeave={leave}>
      <div
        ref={tilt}
        className={`gp-tilt ${flipped ? 'is-flipped' : ''} ${holo ? 'gp-card--holo' : 'gp-card--clear'}`}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={`Guest Pass for ${display || 'a new guest'}, ${memberNo}, ${tier.name} tier, ${points} hearts. Press to flip the card.`}
        onClick={onFlip}
        onKeyDown={key}
        style={{ '--tier': tier.color } as CSSProperties}
      >
        <div className="gp-flip">
          {/* ------------------------------------------------ front */}
          <div className="gp-face gp-front">
            <div className="gp-foil" />
            <div className="gp-front__top">
              <span className="gp-brand">
                <Mark size={30} />
                <span>
                  <b>Adelia’s Room</b>
                  <small>adelia.cc</small>
                </span>
              </span>
              <span className="gp-tierchip">
                <i />
                {tier.name}
              </span>
            </div>

            <div className="gp-front__mid">
              <span className="gp-chip" aria-hidden />
              <svg className="gp-nfc" viewBox="0 0 24 24" aria-hidden>
                <path d="M7 8.5a5 5 0 0 1 0 7 M10.5 6a8.6 8.6 0 0 1 0 12 M14 3.5a12.2 12.2 0 0 1 0 17" />
              </svg>
              <svg className="gp-heart" viewBox="0 0 24 24" aria-hidden>
                <defs>
                  <linearGradient id={`gp-heart-${sessionId.slice(0, 6)}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset=".45" stopColor="#dfe6ee" />
                    <stop offset=".6" stopColor="#aebccd" />
                    <stop offset="1" stopColor="#eef2f6" />
                  </linearGradient>
                </defs>
                <path d={HEART} fill={`url(#gp-heart-${sessionId.slice(0, 6)})`} stroke="rgba(70,88,112,.45)" strokeWidth=".6" />
                <path d="M7.4 9.2c.4-1.3 1.4-2 2.6-2" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              </svg>
              <span className="gp-title">
                Guest
                <br />
                Pass
              </span>
            </div>

            <div className="gp-front__bottom">
              <div className="gp-field gp-field--name">
                <span className="gp-micro">Guest</span>
                <span key={emboss} className={`gp-name ${display ? '' : 'is-placeholder'} ${emboss ? 'is-emboss' : ''}`}>
                  {chars.map((c, i) => (
                    <span key={i} style={{ '--i': i } as CSSProperties}>
                      {c === ' ' ? ' ' : c}
                    </span>
                  ))}
                </span>
              </div>
              <div className="gp-row">
                <div className="gp-field">
                  <span className="gp-micro">No.</span>
                  <span className="gp-no">{memberNo}</span>
                </div>
                <div className="gp-field">
                  <span className="gp-micro">Since</span>
                  <span className="gp-no">{since}</span>
                </div>
                <div className="gp-field gp-field--pts">
                  <span className="gp-micro">Hearts</span>
                  <span className="gp-no">♥ {points.toLocaleString('en-US')}</span>
                </div>
              </div>
            </div>
            <span className="gp-engrave" aria-hidden>
              ADELIA.CC · BEKASI · GUEST PASS · REV 26
            </span>
            <div className="gp-glare" />
          </div>

          {/* ------------------------------------------------ back */}
          <div className="gp-face gp-back" aria-hidden={!flipped}>
            <div className="gp-strip">
              <span>{'ADELIA’S ROOM · GUEST PASS · '.repeat(4)}</span>
            </div>
            <div className="gp-back__row">
              <div className="gp-sig">
                <span>{name || 'Guest signature'}</span>
              </div>
              <span className="gp-cvc">♥ {points.toLocaleString('en-US')}</span>
            </div>
            <div className="gp-back__body">
              <svg className="gp-qr" viewBox={`-1.5 -1.5 ${QR_SIZE + 3} ${QR_SIZE + 3}`} aria-hidden>
                <rect x="-1.5" y="-1.5" width={QR_SIZE + 3} height={QR_SIZE + 3} rx="2" fill="#fff" />
                {dots.map(([x, y]) => (
                  <rect key={`${x}-${y}`} x={x + 0.08} y={y + 0.08} width=".84" height=".84" rx=".28" fill="#18263A" />
                ))}
              </svg>
              <div className="gp-fine">
                <b>Guest Pass · {tier.name}</b>
                <span>Valid in one room in {identity.city}. Hearts don’t expire. If found, return to {identity.email}.</span>
                <span className="gp-fine__code">
                  {memberNo} · {identity.domain.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="gp-glare gp-glare--back" />
          </div>
        </div>
      </div>
      <span className="gp-shadow" aria-hidden />
    </div>
  );
}
