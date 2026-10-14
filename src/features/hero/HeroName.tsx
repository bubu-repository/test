"use client";

import { useEffect, useRef } from "react";
import { identity } from "@/content/profile";

/**
 * The name, set big and quiet. Letters rise in once; after that, the ones nearest the cursor
 * catch the light (pale aqua) and lift a hair, like sun on water. Screen readers get the plain name.
 */
export function HeroName() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(pointer: coarse)").matches) return;
    const letters = Array.from(root.querySelectorAll<HTMLElement>("[data-letter]"));
    let raf = 0;
    let px = -9999;
    let py = -9999;
    const paint = () => {
      raf = 0;
      for (const el of letters) {
        const r = el.getBoundingClientRect();
        const d = Math.hypot(px - (r.left + r.width / 2), (py - (r.top + r.height / 2)) * 1.3);
        const k = Math.max(0, 1 - d / 260);
        el.style.setProperty("--k", (k * k * (3 - 2 * k)).toFixed(3));
      }
    };
    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  let i = 0;
  return (
    <h1 className="hero-name" data-tour="name">
      <span className="sr-only">{identity.name}</span>
      <span ref={ref} aria-hidden="true">
        {identity.name.split(" ").map((word, w) => (
          <span key={word}>
            {w > 0 && " "}
            <span className="inline-block whitespace-nowrap">
              {Array.from(word).map((ch) => {
                const n = i++;
                return (
                  <span key={n} data-letter className="hero-name__letter" style={{ ["--i" as string]: n }}>
                    {ch}
                  </span>
                );
              })}
            </span>
          </span>
        ))}
      </span>
    </h1>
  );
}
