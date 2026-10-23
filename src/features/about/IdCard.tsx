/* ==========================================================================
   Her ID card on its lanyard (ported from the legacy hero/IdBadge.tsx),
   re-skinned clear tech: a CR80 card with a navy dot-matrix band, the
   monogram until a real photo exists, printed fields, a barcode, a holo
   seal that catches the light as it swings, and "Open to work". Back: a
   magnetic stripe, a real QR code to her site, the email, a signature panel.
   Drag it and it swings back on its lanyard (spring physics); click, Enter
   or Space flips it; Left/Right arrows swing it. On a phone a vertical swipe
   over it still scrolls the sheet; only a sideways pull picks it up.
   Reduced motion: no swing, no flip animation.
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react';
import { identity } from '@/content/profile';
import { sfx } from '@/audio/engine';
import { qrMatrix, qrPath } from './qr';

/** CONTOH — ganti dengan data asli (ID no., dept.) — from the legacy card. */
const FIELDS = [
  { k: 'ID No.', v: 'AT-0x24' },
  { k: 'Dept.', v: 'AI × Product' },
  { k: 'Base', v: `${identity.city}, ID` },
  { k: 'Zone', v: 'WIB · UTC+7' },
  { k: 'Degree', v: identity.degree },
  { k: 'Class', v: identity.cohort.replace(/\D+/g, '') },
];

export function QrCode({ text, className }: { text: string; className?: string }) {
  const { n, d } = useMemo(() => {
    const m = qrMatrix(text);
    return { n: m.length, d: qrPath(m) };
  }, [text]);
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} className={className} shapeRendering="crispEdges" role="img" aria-label={`QR code for ${text}`}>
      <rect x="-2" y="-2" width={n + 4} height={n + 4} fill="#fff" />
      <path d={d} fill="#18263A" />
    </svg>
  );
}

/** A Code-128-looking barcode, drawn from the ID so it is the same on every render. */
function Barcode({ code }: { code: string }) {
  const bars = useMemo(() => {
    const out: { x: number; w: number }[] = [];
    let x = 0;
    const widths = [2, 1, 1, 3, 1, 2, 2, 1];
    for (const ch of `*${code}*`) {
      const n = ch.charCodeAt(0);
      for (let k = 0; k < 6; k++) {
        const w = widths[(n + k * 3) % widths.length];
        if (k % 2 === 0) out.push({ x, w });
        x += w;
      }
      x += 1;
    }
    return { out, total: x };
  }, [code]);
  return (
    <svg viewBox={`0 0 ${bars.total} 10`} preserveAspectRatio="none" className="idc__barcode" aria-hidden="true">
      {bars.out.map((b) => (
        <rect key={b.x} x={b.x} width={b.w} height="10" fill="#18263A" />
      ))}
    </svg>
  );
}

/** A press has to travel this far (px) before it counts as a drag or a scroll. */
const SLOP = 8;
/** How stiff the lanyard is, and how much of its swing it keeps per 60 Hz frame. */
const STIFF = 0.06;
const DAMP = 0.86;
/** The fastest a flick can throw the card (px per 60 Hz frame). */
const MAX_FLING = 32;

/** Soft limit: the further you pull past `reach`, the less the card follows. */
const band = (v: number, reach: number) => reach * Math.tanh(v / reach);
/** The pull that `band` turns into `v`, so a drag picks the card up where it is. */
function unband(v: number, reach: number) {
  const r = Math.max(-0.995, Math.min(0.995, v / reach));
  return reach * Math.atanh(r);
}

type Sample = { t: number; x: number; y: number };

export function IdCard({ strap = 44, onFlip }: { strap?: number; onFlip?: (back: boolean) => void }) {
  const [flipped, setFlipped] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const strapRef = useRef<HTMLSpanElement>(null);
  const motion = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    va: 0,
    t: 0,
    pending: false,
    dragging: false,
    pointer: -1,
    px: 0,
    py: 0,
    ox: 0,
    oy: 0,
    samples: [] as Sample[],
    moved: false,
    raf: 0,
  });

  useEffect(() => {
    const el = ref.current!;
    const m = motion.current;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // how far the card can be pulled from its hook: it swings, it doesn't come off the lanyard
    const reachX = 70;
    const reachUp = 18;
    const reachDown = 40;
    const bandY = (v: number) => (v < 0 ? band(v, reachUp) : band(v, reachDown));
    const unbandY = (v: number) => (v < 0 ? unband(v, reachUp) : unband(v, reachDown));

    const step = (now: number) => {
      // scaled to the real frame time, so the swing is the same at 60, 90 or 120 Hz
      const k = m.t ? Math.min(now - m.t, 34) / 16.667 : 1;
      m.t = now;
      if (!m.dragging) {
        const keep = Math.pow(DAMP, k);
        m.vx = (m.vx - m.x * STIFF * k) * keep;
        m.vy = (m.vy - m.y * STIFF * k) * keep;
        m.x += m.vx * k;
        m.y += m.vy * k;
      }
      m.va = (m.va + (-m.vx * 0.9 - m.angle) * 0.08 * k) * Math.pow(0.9, k);
      m.angle += m.va * k;
      el.style.translate = `${m.x.toFixed(1)}px ${m.y.toFixed(1)}px`;
      el.style.rotate = `${m.angle.toFixed(2)}deg`;
      // the lanyard stays attached: it turns and stretches from its hook to the card
      const s = strapRef.current;
      if (s && strap > 0) {
        const reach = strap + m.y;
        s.style.transform = `rotate(${((-Math.atan2(m.x, reach) * 180) / Math.PI).toFixed(2)}deg) scaleY(${(Math.hypot(m.x, reach) / strap).toFixed(3)})`;
      }
      el.style.setProperty('--sway', m.angle.toFixed(2));
      const moving = m.dragging || Math.abs(m.x) + Math.abs(m.y) + Math.abs(m.vx) + Math.abs(m.va) + Math.abs(m.angle) > 0.05;
      m.raf = moving ? requestAnimationFrame(step) : 0;
      if (!moving) m.t = 0;
    };
    const kick = () => {
      if (!m.raf && !calm) m.raf = requestAnimationFrame(step);
    };
    const velocity = (now: number) => {
      const recent = m.samples.filter((s) => now - s.t <= 60);
      const newest = recent[recent.length - 1];
      if (!newest || now - newest.t > 50 || recent.length < 2) return { vx: 0, vy: 0 };
      const oldest = recent[0];
      const dt = Math.max(newest.t - oldest.t, 1);
      const clamp = (v: number) => Math.max(-MAX_FLING, Math.min(MAX_FLING, v));
      return { vx: clamp(((newest.x - oldest.x) / dt) * 16.667), vy: clamp(((newest.y - oldest.y) / dt) * 16.667) };
    };
    const begin = () => {
      m.pending = false;
      m.dragging = true;
      try {
        el.setPointerCapture(m.pointer);
      } catch {}
      el.dataset.dragging = '';
      kick();
    };
    const onDown = (e: PointerEvent) => {
      if (calm || !e.isPrimary || e.button !== 0 || m.pending || m.dragging) return;
      m.pointer = e.pointerId;
      m.moved = false;
      m.px = e.clientX;
      m.py = e.clientY;
      m.ox = unband(m.x, reachX);
      m.oy = unbandY(m.y);
      m.samples = [{ t: e.timeStamp, x: m.x, y: m.y }];
      m.pending = true;
      // a mouse can start dragging at once; a finger has to show it means sideways first
      if (e.pointerType !== 'touch') begin();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== m.pointer) return;
      const dx = e.clientX - m.px;
      const dy = e.clientY - m.py;
      if (m.pending) {
        if (Math.abs(dy) > SLOP && Math.abs(dy) >= Math.abs(dx)) {
          m.pending = false; // a scroll: the sheet has it
          return;
        }
        if (Math.abs(dx) <= SLOP) return;
        begin();
      }
      if (!m.dragging) return;
      const nx = band(m.ox + dx, reachX);
      const ny = bandY(m.oy + dy);
      m.samples.push({ t: e.timeStamp, x: nx, y: ny });
      if (m.samples.length > 12) m.samples.shift();
      m.vx = velocity(e.timeStamp).vx;
      if (Math.hypot(dx, dy) > 6) m.moved = true;
      m.x = nx;
      m.y = ny;
    };
    const onHover = (e: PointerEvent) => {
      if (m.dragging || e.pointerType === 'touch') return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--hx', ((e.clientX - r.left) / r.width).toFixed(3));
      el.style.setProperty('--hy', ((e.clientY - r.top) / r.height).toFixed(3));
    };
    const onUp = () => {
      m.pending = false;
      if (!m.dragging) return;
      m.dragging = false;
      delete el.dataset.dragging;
      const v = velocity(performance.now());
      m.vx = v.vx;
      m.vy = v.vy;
      if (m.moved) sfx('pop');
      kick();
    };
    const onLost = (e: PointerEvent) => {
      if (e.target === el) onUp();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (m.dragging && e.cancelable) e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        m.vx += e.key === 'ArrowLeft' ? -12 : 12;
        kick();
      }
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onHover);
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    el.addEventListener('lostpointercapture', onLost);
    window.addEventListener('blur', onUp);
    el.addEventListener('keydown', onKey);
    // a little swing on arrival, as if the card was just lifted off its hook
    if (!calm) {
      m.vx = 7;
      kick();
    }
    return () => {
      cancelAnimationFrame(m.raf);
      m.raf = 0;
      m.t = 0;
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onHover);
      el.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      el.removeEventListener('lostpointercapture', onLost);
      window.removeEventListener('blur', onUp);
      el.removeEventListener('keydown', onKey);
    };
  }, [strap]);

  return (
    <div className="idc-lanyard" style={{ ['--strap' as string]: `${strap}px` }}>
      <span className="idc-hook" aria-hidden="true" />
      <span ref={strapRef} className="idc-strap" aria-hidden="true" />
      <button
        ref={ref}
        type="button"
        className="idc-badge"
        aria-pressed={flipped}
        aria-label={
          flipped
            ? `Her ID card, back: a QR code to ${identity.domain} and her email, ${identity.email}. Press to flip to the front.`
            : `Her ID card: ${identity.name} (photo coming soon), ${identity.role}, ${identity.degree}, ${identity.cohort.toLowerCase()}, ${identity.city}. Open to work. Press to flip it over; left and right arrows swing it.`
        }
        onClick={() => {
          if (motion.current.moved) {
            motion.current.moved = false;
            return;
          }
          sfx('pop');
          setFlipped(!flipped);
          onFlip?.(!flipped);
        }}
      >
        <span className="idc-clip" aria-hidden="true" />
        <span className="idc-card" data-flipped={flipped}>
          {/* Front */}
          <span className="idc-face" aria-hidden={flipped}>
            <span className="idc">
              <span className="idc__band">
                <span className="idc__brand">
                  <span className="idc__logo">
                    a<b>.</b>
                  </span>
                  {identity.domain}
                </span>
                <span className="idc__pass">
                  Studio
                  <br />
                  pass
                </span>
              </span>
              <span className="idc__main">
                {/* CONTOH — swap the monogram for her photo (an <img> in .idc__photo) once she sends one */}
                <span className="idc__photo" role="img" aria-label="Photo coming soon">
                  <span className="idc__mono" aria-hidden="true">
                    AT
                  </span>
                  <span className="idc__holo" />
                </span>
                <span className="idc__who">
                  <span className="idc__label">Name</span>
                  <span className="idc__name">{identity.name}</span>
                  <span className="idc__label idc__label--gap">Role</span>
                  <span className="idc__role">{identity.role}</span>
                </span>
              </span>
              <span className="idc__fields">
                {FIELDS.map((f) => (
                  <span key={f.k}>
                    <span className="idc__label">{f.k}</span>
                    <span className="idc__val">{f.v}</span>
                  </span>
                ))}
              </span>
              <span className="idc__bottom">
                <span className="idc__code">
                  <Barcode code="AT0X24" />
                  <span className="idc__status">
                    <span className="idc__led" />
                    Open to work
                  </span>
                </span>
                <span className="idc__seal">AT</span>
              </span>
              <span className="idc__strip">AT-26 · Studio pass · {identity.domain} · AT-26 · Studio pass</span>
            </span>
          </span>

          {/* Back */}
          <span className="idc-face idc-face--back" aria-hidden={!flipped}>
            <span className="idc idc--back">
              <span className="idc__mag" />
              <span className="idc__back-row">
                <QrCode text={identity.url} className="idc__qr" />
                <span className="idc__back-text">
                  <span className="idc__label">Scan to visit</span>
                  <span className="idc__url">{identity.domain}</span>
                  <span className="idc__label idc__label--gap">Or write to</span>
                  <span className="idc__email">{identity.email}</span>
                </span>
              </span>
              <span className="idc__return">
                If found, please return to {identity.name}, {identity.location}.
              </span>
              <span className="idc__sig">
                <span className="idc__label">Authorised signature</span>
                <span className="idc__sig-panel">
                  <svg viewBox="0 0 120 36">
                    <path
                      d="M6 28C10 10 17 5 16 24s8-12 12-6 4 10 10 2 6-14 4-6-3 14 6 10 8-14 10-8-2 12 6 8 8-12 10-6 2 8 8 4M70 8l3 24M18 31c30-3 60-5 96-6"
                      fill="none"
                      stroke="#1F5F96"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </span>
              <span className="idc__micro">This pass remains the property of its holder · Not valid for travel · AT-26</span>
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}
