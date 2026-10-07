"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { getCursor, subscribePreferences } from "@/lib/preferences";

const INTERACTIVE = "a, button, [role='button'], [role='option'], summary, label, select, [data-cursor]";
const TEXT = "input, textarea, [contenteditable='true']";

/**
 * The jelly cursor: a dot that tracks exactly, and a blob that follows on a spring, squashes
 * along its velocity, and morphs into a labelled pill over interactive things.
 * Elements with [data-magnetic] lean toward it. Fine pointers only; off under reduced motion.
 */
export function Cursor() {
  const on = useSyncExternalStore(subscribePreferences, getCursor, () => false);
  const dotRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!on) return;
    const dot = dotRef.current!;
    const blob = blobRef.current!;
    const label = labelRef.current!;
    let x = -100,
      y = -100,
      bx = -100,
      by = -100,
      vx = 0,
      vy = 0,
      w = 34,
      h = 34,
      raf = 0,
      visible = false,
      pressed = false,
      hoverEl: Element | null = null;
    const magnets = new Map<HTMLElement, { x: number; y: number }>();

    const setHover = (target: Element | null) => {
      const interactive = target?.closest(INTERACTIVE) ?? null;
      const text = target?.closest(TEXT) ?? null;
      hoverEl = text ? null : interactive;
      blob.dataset.mode = text ? "text" : interactive ? "hover" : "idle";
      const text_ = interactive?.getAttribute("data-cursor") ?? "";
      label.textContent = text ? "" : text_;
      blob.dataset.label = text_ ? "on" : "off";
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      if (!visible) {
        bx = x;
        by = y;
        visible = true;
        dot.style.opacity = blob.style.opacity = "1";
      }
      setHover(e.target as Element);
    };
    const onLeave = () => {
      visible = false;
      dot.style.opacity = blob.style.opacity = "0";
    };
    const onDown = () => {
      pressed = true;
    };
    const onUp = (e: PointerEvent) => {
      pressed = false;
      if (e.pointerType === "mouse") burst(e.clientX, e.clientY);
    };

    const burst = (cx: number, cy: number) => {
      if (!document.body) return;
      // One quiet ripple where you clicked.
      const s = document.createElement("span");
      s.className = "cursor-spark";
      document.body.append(s);
      s.animate(
        [
          { transform: `translate(${cx}px, ${cy}px) scale(0.3)`, opacity: 0.9 },
          { transform: `translate(${cx}px, ${cy}px) scale(2.4)`, opacity: 0 },
        ],
        { duration: 460, easing: "cubic-bezier(.22,1,.36,1)" },
      ).onfinish = () => s.remove();
    };

    const tick = () => {
      // Blob size: fit a label pill, grow over interactive things, shrink to a bar over text.
      let tw = 34,
        th = 34;
      const mode = blob.dataset.mode;
      if (mode === "hover") {
        if (blob.dataset.label === "on") {
          tw = Math.max(64, label.offsetWidth + 26);
          th = 34;
        } else {
          tw = th = 58;
        }
      } else if (mode === "text") {
        tw = 4;
        th = 26;
      }
      if (pressed) {
        tw *= 0.82;
        th *= 0.82;
      }

      // Spring toward the pointer.
      const ax = (x - bx) * 0.2;
      const ay = (y - by) * 0.2;
      vx = (vx + ax) * 0.58;
      vy = (vy + ay) * 0.58;
      bx += vx;
      by += vy;
      w += (tw - w) * 0.25;
      h += (th - h) * 0.25;

      const speed = Math.min(Math.hypot(vx, vy), 40);
      const stretch = mode === "idle" ? speed / 60 : 0;
      const angle = Math.atan2(vy, vx);
      blob.style.width = `${w}px`;
      blob.style.height = `${h}px`;
      blob.style.transform = `translate3d(${bx - w / 2}px, ${by - h / 2}px, 0) rotate(${angle}rad) scale(${1 + stretch}, ${1 - stretch * 0.6}) rotate(${-angle}rad)`;
      dot.style.transform = `translate3d(${x - 3}px, ${y - 3}px, 0)`;

      // Magnetic elements lean toward the pointer.
      const near = hoverEl?.closest<HTMLElement>("[data-magnetic]") ?? null;
      for (const [el, m] of magnets) {
        if (el !== near) {
          m.x *= 0.8;
          m.y *= 0.8;
          if (Math.abs(m.x) < 0.1 && Math.abs(m.y) < 0.1) {
            el.style.translate = "";
            magnets.delete(el);
            continue;
          }
          el.style.translate = `${m.x}px ${m.y}px`;
        }
      }
      if (near) {
        const r = near.getBoundingClientRect();
        const pull = Number(near.dataset.magnetic) || 0.25;
        const m = magnets.get(near) ?? { x: 0, y: 0 };
        m.x += ((x - (r.left + r.width / 2 - m.x)) * pull - m.x) * 0.2;
        m.y += ((y - (r.top + r.height / 2 - m.y)) * pull - m.y) * 0.2;
        magnets.set(near, m);
        near.style.translate = `${m.x}px ${m.y}px`;
      }

      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      for (const el of magnets.keys()) el.style.translate = "";
    };
  }, [on]);

  if (!on) return null;
  return (
    <div className="cursor-layer" aria-hidden="true">
      <div ref={blobRef} className="cursor-blob" data-mode="idle" data-label="off">
        <span ref={labelRef} className="cursor-label" />
      </div>
      <div ref={dotRef} className="cursor-dot" />
    </div>
  );
}
