"use client";

import { useEffect, useRef } from "react";

/**
 * A small glass pill beside the pointer that names a gesture you can't see: "Drag · Flip" on the ID
 * card, "Squeeze" on the plush, "Resample" on the hero's words. It reads `data-cursor` from what's
 * under the pointer, waits 350ms on the same thing before it appears, and follows with a little lag.
 * Desktop pointers only, never over a text field, and not at all under reduced motion.
 */
export function CursorHint() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pill = ref.current;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!pill || !fine || calm) return;

    let target: HTMLElement | null = null;
    let timer = 0;
    let raf = 0;
    let shown = false;
    const at = { x: 0, y: 0 };
    const to = { x: 0, y: 0 };

    const follow = () => {
      at.x += (to.x - at.x) * 0.35;
      at.y += (to.y - at.y) * 0.35;
      pill.style.translate = `${at.x + 14}px ${at.y + 18}px`;
      raf = shown && (Math.abs(to.x - at.x) > 0.3 || Math.abs(to.y - at.y) > 0.3) ? requestAnimationFrame(follow) : 0;
    };

    const hide = () => {
      window.clearTimeout(timer);
      target = null;
      shown = false;
      pill.removeAttribute("data-on");
    };

    const onMove = (event: PointerEvent) => {
      to.x = event.clientX;
      to.y = event.clientY;
      const el = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-cursor]") : null;
      const typing = event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]");
      if (!el || typing) return hide();
      if (el !== target) {
        hide();
        target = el;
        timer = window.setTimeout(() => {
          if (target !== el) return;
          pill.textContent = el.dataset.cursor ?? "";
          at.x = to.x;
          at.y = to.y;
          shown = true;
          pill.setAttribute("data-on", "");
          follow();
        }, 350);
        return;
      }
      if (shown && el.dataset.cursor !== pill.textContent) pill.textContent = el.dataset.cursor ?? "";
      if (shown && !raf) raf = requestAnimationFrame(follow);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", hide, { passive: true });
    window.addEventListener("scroll", hide, { passive: true });
    document.addEventListener("pointerleave", hide);
    return () => {
      hide();
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", hide);
      window.removeEventListener("scroll", hide);
      document.removeEventListener("pointerleave", hide);
    };
  }, []);

  return <div ref={ref} className="cursor-hint" aria-hidden="true" />;
}
