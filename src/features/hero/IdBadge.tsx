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

/**
 * The ID badge: a real CR80 card on a magenta lanyard. Front: a guilloche band with the slot
 * punched through, a photo, name and role, printed fields, a barcode, a holographic seal that
 * shifts as the card swings, and the open-to-work status. Back: a magnetic stripe, a QR code,
 * a return address and a signature panel. Drag it and it swings back on its lanyard; click,
 * Enter or Space flips it over.
 */
export function IdBadge({ className, strap = 0 }: { className?: string; strap?: number }) {
  const [flipped, setFlipped] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const strapRef = useRef<HTMLDivElement>(null);
  const motion = useRef({ x: 0, y: 0, vx: 0, vy: 0, angle: 0, va: 0, dragging: false, sx: 0, sy: 0, moved: false, raf: 0 });

  useEffect(() => {
    const el = ref.current!;
    const m = motion.current;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = () => {
      if (!m.dragging) {
        // Spring back to the hook, swinging like a badge on a lanyard.
        m.vx = (m.vx - m.x * 0.06) * 0.86;
        m.vy = (m.vy - m.y * 0.06) * 0.86;
        m.x += m.vx;
        m.y += m.vy;
      }
      m.va = (m.va + (-m.vx * 0.9 - m.angle) * 0.08) * 0.9;
      m.angle += m.va;
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
    };
    const kick = () => {
      if (!m.raf && !calm) m.raf = requestAnimationFrame(step);
    };
    const onDown = (e: PointerEvent) => {
      if (calm) return;
      m.dragging = true;
      m.moved = false;
      m.sx = e.clientX - m.x;
      m.sy = e.clientY - m.y;
      el.setPointerCapture(e.pointerId);
      kick();
    };
    // How far the card can be pulled from its hook: it swings, it doesn't come off the lanyard.
    const reachX = 90;
    const reachUp = -24;
    const reachDown = 56;
    const onMove = (e: PointerEvent) => {
      if (!m.dragging) return;
      const nx = Math.max(-reachX, Math.min(reachX, e.clientX - m.sx));
      const ny = Math.max(reachUp, Math.min(reachDown, e.clientY - m.sy));
      m.vx = nx - m.x;
      m.vy = ny - m.y;
      if (Math.hypot(nx, ny) > 6) m.moved = true;
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
      if (!m.dragging) return;
      m.dragging = false;
      if (m.moved) sfx.pop();
      kick();
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
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    // A drag that ends any other way (gesture, leaving the window, a lost capture) still lets go,
    // so the card always swings back to its hook.
    window.addEventListener("pointercancel", onUp);
    el.addEventListener("lostpointercapture", onUp);
    window.addEventListener("blur", onUp);
    el.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(m.raf);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onHover);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.removeEventListener("lostpointercapture", onUp);
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
        className="badge touch-none select-none"
        onClick={() => {
          if (motion.current.moved) {
            motion.current.moved = false;
            return;
          }
          sfx.pop();
          setFlipped((f) => !f);
        }}
        data-xr="IdBadge · CR80 card, lanyard spring physics + 3D flip"
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
