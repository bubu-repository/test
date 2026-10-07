"use client";

import { useEffect, useRef } from "react";

/**
 * Counts the number inside a metric ("2.4×", "11 min", "2.1k") up from zero when it scrolls
 * into view. The server renders the final value, so it reads fine without JS; if the metric is
 * already on screen when the page loads, it doesn't animate.
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const match = value.match(/^(\D*)(\d+(?:[.,]\d+)?)(.*)$/);
    if (!el || !match || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const [, pre, num, post] = match;
    const target = Number(num.replace(",", "."));
    const decimals = num.includes(".") || num.includes(",") ? 1 : 0;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return;
    el.textContent = `${pre}0${post}`;

    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 1100);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = `${pre}${(target * eased).toFixed(decimals)}${post}`;
        if (t < 1) raf = requestAnimationFrame(tick);
        else el.textContent = value;
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      el.textContent = value;
    };
  }, [value]);

  return (
    <span className={className}>
      <span className="sr-only">{value}</span>
      <span ref={ref} aria-hidden="true">
        {value}
      </span>
    </span>
  );
}
