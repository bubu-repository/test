"use client";

import qrcode from "qrcode-generator";
import { useEffect, useMemo, useRef, useState } from "react";
import { MociAvatar } from "@/components/MociAvatar";
import { identity } from "@/content/profile";
import { labItems } from "@/content/lab";
import { projects } from "@/content/projects";
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

/**
 * The ID badge, a frosted-glass card on a magenta lanyard with a pastel checker strip (after the
 * "JELLYBELLY123" badge on the reference board). Drag it and it swings back on its lanyard;
 * click, Enter or Space flips it to a QR code.
 */
export function IdBadge({ className, strap = 0 }: { className?: string; strap?: number }) {
  const [flipped, setFlipped] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
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
    const onMove = (e: PointerEvent) => {
      if (!m.dragging) return;
      const nx = e.clientX - m.sx;
      const ny = e.clientY - m.sy;
      m.vx = nx - m.x;
      m.vy = ny - m.y;
      if (Math.hypot(nx, ny) > 6) m.moved = true;
      m.x = nx;
      m.y = ny;
    };
    const onUp = () => {
      if (!m.dragging) return;
      m.dragging = false;
      if (m.moved) sfx.pop();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        m.vx += e.key === "ArrowLeft" ? -14 : 14;
        kick();
      }
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(m.raf);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("keydown", onKey);
    };
  }, []);

  const subdomains = labItems.filter((l) => l.where === "subdomain").length;

  return (
    <div className={className}>
      {strap > 0 && <div className="badge-strap" aria-hidden="true" style={{ ["--strap" as string]: `${strap}px` }} />}
      <div className="badge-clip" aria-hidden="true" />
      <button
        ref={ref}
        type="button"
        data-tour="badge"
        data-cursor={flipped ? "Flip" : "Drag · Flip"}
        aria-pressed={flipped}
        aria-label={flipped ? "ID badge, back: QR code to adelia.cc. Press to flip to the front." : `ID badge: ${identity.name}. Press to flip for a QR code. Left and right arrows swing it.`}
        className="badge touch-none select-none"
        onClick={() => {
          if (motion.current.moved) {
            motion.current.moved = false;
            return;
          }
          sfx.pop();
          setFlipped((f) => !f);
        }}
        data-xr="IdBadge · lanyard spring physics + 3D flip"
      >
        <span className="badge__card" data-flipped={flipped}>
          <span className="badge__face">
            <span className="badge__inner">
              <span className="badge__strip checker" aria-hidden="true" />
              <span className="flex items-center justify-between">
                <span className="type-pixel text-muted">ID · 0x24</span>
                <span className="chip" data-tone="mint">
                  Open to work
                </span>
              </span>
              <span className="mt-3 grid place-items-center">
                <MociAvatar size={68} />
              </span>
              <span className="mt-3 block text-center text-24 leading-none font-bold tracking-[-0.03em]">{identity.name}</span>
              <span className="mt-1 block text-center text-14 text-muted">{identity.role}</span>
              <span className="mt-3 flex justify-center gap-2">
                <span className="badge__stat" style={{ ["--tone" as string]: "var(--accent)" }}>
                  <span className="text-24 leading-none font-bold tabular-nums">{String(projects.length).padStart(2, "0")}</span>
                  <span className="type-pixel mt-1 text-[10px] text-muted">shipped</span>
                </span>
                <span className="badge__stat" style={{ ["--tone" as string]: "var(--cobalt)" }}>
                  <span className="text-24 leading-none font-bold tabular-nums">{String(subdomains).padStart(2, "0")}</span>
                  <span className="type-pixel mt-1 text-[10px] text-muted">subdomains</span>
                </span>
              </span>
            </span>
          </span>
          <span className="badge__face badge__face--back">
            <span className="badge__inner grid place-items-center content-center gap-2 text-center">
              <span className="type-pixel text-muted">Scan me</span>
              <span className="overflow-hidden rounded-[14px]">
                <QrCode text={identity.url} size={124} />
              </span>
              <span className="text-18 leading-none font-bold tracking-tight">adelia.cc</span>
              <span className="text-12 break-all text-muted">{identity.email}</span>
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}
