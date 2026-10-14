"use client";

import qrcode from "qrcode-generator";
import { useEffect, useMemo, useRef, useState } from "react";
import { identity } from "@/content/profile";
import { sfx } from "@/lib/sound";

function QrCode({ text, size = 132 }: { text: string; size?: number }) {
  const cells = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const out: string[] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) out.push(`M${c} ${r}h1v1h-1z`);
    return { n, d: out.join("") };
  }, [text]);
  return (
    <svg viewBox={`-2 -2 ${cells.n + 4} ${cells.n + 4}`} width={size} height={size} shapeRendering="crispEdges" role="img" aria-label={`QR code for ${text}`}>
      <rect x="-2" y="-2" width={cells.n + 4} height={cells.n + 4} fill="#fff" />
      <path d={cells.d} fill="#111" />
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
        <rect key={b.x} x={b.x} width={b.w} height="10" fill="#0e1726" />
      ))}
    </svg>
  );
}

/* CONTOH — ganti dengan data asli (ID no., dept., masa berlaku) */
const FIELDS = [
  { k: "ID No.", v: "AT-0x24" },
  { k: "Dept.", v: "AI × Product" },
  { k: "Base", v: "Bekasi, ID" },
  { k: "Zone", v: "WIB · UTC+7" },
  { k: "Degree", v: "B.Sc. Informatics" },
  { k: "Class", v: "2026" },
];

/** A press has to travel this far (px) before it counts as a drag or a scroll. */
const SLOP = 8;
/** How stiff the lanyard is, and how much of its swing it keeps per 60 Hz frame. */
const STIFF = 0.06;
const DAMP = 0.86;
/** The fastest a flick can throw the card (px per 60 Hz frame). */
const MAX_FLING = 32;

/** Soft limit: the further you pull past `reach`, the less the card follows (it never stops dead). */
function band(v: number, reach: number): number {
  return reach * Math.tanh(v / reach);
}

/** The pull that `band` turns into `v`, so a drag picks the card up where it is. */
function unband(v: number, reach: number): number {
  const r = Math.max(-0.995, Math.min(0.995, v / reach));
  return reach * Math.atanh(r);
}

type Sample = { t: number; x: number; y: number };

/**
 * The ID badge: a real CR80 card on a magenta lanyard. Front: a guilloche band with the slot
 * punched through, a photo, name and role, printed fields, a barcode, a holographic seal that
 * shifts as the card swings, and the open-to-work status. Back: a magnetic stripe, a QR code,
 * a return address and a signature panel. Drag it and it swings back on its lanyard; click,
 * Enter or Space flips it over. On a phone a vertical swipe over it still scrolls the page; only a
 * sideways pull picks it up.
 */
export function IdBadge({ className, strap = 0 }: { className?: string; strap?: number }) {
  const [flipped, setFlipped] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const strapRef = useRef<HTMLDivElement>(null);
  const motion = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    va: 0,
    /** The last frame's time, 0 while the loop is asleep. */
    t: 0,
    /** A press that hasn't yet shown whether it's a drag or a scroll. */
    pending: false,
    dragging: false,
    pointer: -1,
    /** Where the press began, the pull it began from, and how much the card is scaled on screen. */
    px: 0,
    py: 0,
    ox: 0,
    oy: 0,
    scale: 1,
    samples: [] as Sample[],
    moved: false,
    raf: 0,
  });

  useEffect(() => {
    const el = ref.current!;
    const m = motion.current;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // How far the card can be pulled from its hook: it swings, it doesn't come off the lanyard.
    const reachX = 90;
    const reachUp = 24;
    const reachDown = 56;
    const bandY = (v: number) => (v < 0 ? band(v, reachUp) : band(v, reachDown));
    const unbandY = (v: number) => (v < 0 ? unband(v, reachUp) : unband(v, reachDown));

    const step = (now: number) => {
      // Scaled to the real frame time, so the swing is the same at 60, 90 or 120 Hz (and a slow frame doesn't explode it).
      const k = m.t ? Math.min(now - m.t, 34) / 16.667 : 1;
      m.t = now;
      if (!m.dragging) {
        // Spring back to the hook, swinging like a badge on a lanyard.
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
      // The lanyard stays attached: it turns and stretches from its hook to the card.
      const strapEl = strapRef.current;
      if (strapEl && strap > 0) {
        const reach = strap + m.y;
        strapEl.style.transform = `rotate(${((-Math.atan2(m.x, reach) * 180) / Math.PI).toFixed(2)}deg) scaleY(${(Math.hypot(m.x, reach) / strap).toFixed(3)})`;
      }
      // The holographic seal catches the light as the card swings.
      el.style.setProperty("--sway", m.angle.toFixed(2));
      const moving = m.dragging || Math.abs(m.x) + Math.abs(m.y) + Math.abs(m.vx) + Math.abs(m.va) + Math.abs(m.angle) > 0.05;
      m.raf = moving ? requestAnimationFrame(step) : 0;
      if (!moving) m.t = 0;
    };
    const kick = () => {
      if (!m.raf && !calm) m.raf = requestAnimationFrame(step);
    };

    /** Velocity (px per 60 Hz frame) over the last 60 ms of pointer samples; 0 if the pointer has been still for 50 ms. */
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
      el.setPointerCapture(m.pointer);
      el.dataset.dragging = "";
      // On the desk the card is shown at half size: divide by that, so it stays under the finger.
      const holder = el.parentElement;
      m.scale = holder && holder.offsetWidth ? holder.getBoundingClientRect().width / holder.offsetWidth || 1 : 1;
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
      // A mouse or pen can start dragging at once; a finger has to show it means sideways first,
      // so a vertical swipe over the card still scrolls the page (touch-action: pan-y).
      if (e.pointerType !== "touch") begin();
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== m.pointer) return;
      const dx = e.clientX - m.px;
      const dy = e.clientY - m.py;
      if (m.pending) {
        if (Math.abs(dy) > SLOP && Math.abs(dy) >= Math.abs(dx)) {
          m.pending = false; // a scroll: the page has it
          return;
        }
        if (Math.abs(dx) <= SLOP) return;
        begin();
      }
      if (!m.dragging) return;
      const nx = band(m.ox + dx / m.scale, reachX);
      const ny = bandY(m.oy + dy / m.scale);
      m.samples.push({ t: e.timeStamp, x: nx, y: ny });
      if (m.samples.length > 12) m.samples.shift();
      // While held, the card swings from how fast it is being carried.
      m.vx = velocity(e.timeStamp).vx;
      if (Math.hypot(dx, dy) > 6) m.moved = true;
      m.x = nx;
      m.y = ny;
    };
    const onHover = (e: PointerEvent) => {
      if (m.dragging || e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--hx", ((e.clientX - r.left) / r.width).toFixed(3));
      el.style.setProperty("--hy", ((e.clientY - r.top) / r.height).toFixed(3));
    };
    const onUp = () => {
      m.pending = false;
      if (!m.dragging) return;
      m.dragging = false;
      delete el.dataset.dragging;
      // Let go with the speed it was moving at just now, not the last event's jitter.
      const v = velocity(performance.now());
      m.vx = v.vx;
      m.vy = v.vy;
      if (m.moved) sfx.pop();
      kick();
    };
    // Taking over a finger's capture from the part of the card it landed on fires a (bubbling)
    // lostpointercapture on that part: only the card itself losing it ends the drag.
    const onLost = (e: PointerEvent) => {
      if (e.target === el) onUp();
    };
    // Once a finger is dragging the card, the page must not scroll under it.
    const onTouchMove = (e: TouchEvent) => {
      if (m.dragging && e.cancelable) e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        m.vx += e.key === "ArrowLeft" ? -14 : 14;
        kick();
      }
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onHover);
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    // A drag that ends any other way (a scroll taking over, leaving the window, a lost capture)
    // still lets go, so the card always swings back to its hook.
    window.addEventListener("pointercancel", onUp);
    el.addEventListener("lostpointercapture", onLost);
    window.addEventListener("blur", onUp);
    el.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(m.raf);
      m.raf = 0;
      m.t = 0;
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onHover);
      el.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.removeEventListener("lostpointercapture", onLost);
      window.removeEventListener("blur", onUp);
      el.removeEventListener("keydown", onKey);
    };
  }, [strap]);

  return (
    <div className={className}>
      {strap > 0 && <div ref={strapRef} className="badge-strap" aria-hidden="true" style={{ ["--strap" as string]: `${strap}px`, transformOrigin: "50% 0" }} />}
      <button
        ref={ref}
        type="button"
        data-tour="badge"
        data-cursor={flipped ? "Flip" : "Drag · Flip"}
        aria-pressed={flipped}
        aria-label={
          flipped
            ? `ID card, back: QR code to ${identity.domain} and ${identity.email}. Press to flip to the front.`
            : `ID card: ${identity.name}, ${identity.role}, ${identity.city}. Open to work. Press to flip for a QR code. Left and right arrows swing it.`
        }
        className="badge touch-pan-y select-none"
        onClick={() => {
          if (motion.current.moved) {
            motion.current.moved = false;
            return;
          }
          sfx.pop();
          setFlipped((f) => !f);
        }}
      >
        <span className="badge-clip" aria-hidden="true" />
        <span className="badge__card" data-flipped={flipped}>
          {/* Front */}
          <span className="badge__face">
            <span className="idc">
              <span className="idc__band">
                <span className="idc__brand">
                  <span className="idc__logo">
                    <span>
                      a<b>.</b>
                    </span>
                  </span>
                  {identity.domain}
                </span>
                <span className="idc__pass">
                  Studio
                  <br />
                  pass
                </span>
                <svg className="idc__nfc" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 8.5a5 5 0 0 1 0 7M10.5 6a8.5 8.5 0 0 1 0 12M14 3.5a12 12 0 0 1 0 17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>

              <span className="idc__main">
                {/* CONTOH — ganti dengan foto asli */}
                <span className="idc__photo">
                  <svg viewBox="0 0 60 80" aria-hidden="true">
                    <defs>
                      <linearGradient id="idc-mono" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#7FE3F7" />
                        <stop offset=".55" stopColor="#1A8FE8" />
                        <stop offset="1" stopColor="#0A58BE" />
                      </linearGradient>
                    </defs>
                    <rect width="60" height="80" fill="url(#idc-mono)" />
                    <circle cx="48" cy="12" r="16" fill="#FFFFFF" opacity=".18" />
                    <text x="30" y="49" textAnchor="middle" fontSize="27" fontWeight="800" letterSpacing="-1.5" fill="#FFFFFF" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
                      AT
                    </text>
                  </svg>
                  <span className="idc__holo" />
                </span>
                <span className="idc__who">
                  <span className="idc__label">Name</span>
                  <span className="idc__name">{identity.name}</span>
                  <span className="idc__label mt-[2.4cqi]">Role</span>
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
                <span className="min-w-0">
                  <Barcode code="AT0X24" />
                  <span className="idc__status">
                    <span className="idc__led" />
                    Open to work
                  </span>
                </span>
                <span className="idc__seal" aria-hidden="true">
                  AT
                </span>
              </span>

              <span className="idc__strip" aria-hidden="true">
                AT-26 · Studio pass · {identity.domain} · AT-26 · Studio pass · {identity.domain}
              </span>
            </span>
          </span>

          {/* Back */}
          <span className="badge__face badge__face--back">
            <span className="idc idc--back">
              <span className="idc__mag" aria-hidden="true" />
              <span className="idc__back-row">
                <span className="idc__qr">
                  <QrCode text={identity.url} size={88} />
                </span>
                <span className="min-w-0">
                  <span className="idc__label">Scan to visit</span>
                  <span className="idc__url">{identity.domain}</span>
                  <span className="idc__label mt-[2.4cqi]">Or write to</span>
                  <span className="idc__email">{identity.email}</span>
                </span>
              </span>
              <span className="idc__return">
                If found, please return to {identity.name}, {identity.location}.
              </span>
              <span className="idc__sig">
                <span className="idc__label">Authorised signature</span>
                <span className="idc__sig-panel">
                  <svg viewBox="0 0 120 36" aria-hidden="true">
                    <path
                      d="M6 28C10 10 17 5 16 24s8-12 12-6 4 10 10 2 6-14 4-6-3 14 6 10 8-14 10-8-2 12 6 8 8-12 10-6 2 8 8 4M70 8l3 24M18 31c30-3 60-5 96-6"
                      fill="none"
                      stroke="#1b2f73"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </span>
              <span className="idc__micro" aria-hidden="true">
                This pass remains the property of its holder · Not valid for travel · AT-26 · 0x24
              </span>
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}
