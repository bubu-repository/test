/* A tiny live window: the same createSky() renderer the room uses, cropped
   to the skyline. Follows the weather override instantly. */
import { useEffect, useRef } from 'react';
import { createSky } from '@/stage/live/sky';
import { hourIn, useWeather } from '@/lib/weather';

export function SkyPreview({ className = '', crop = true, label = 'Live view of the sky over Bekasi from her window' }: { className?: string; crop?: boolean; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const sky = createSky();
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let last = -1e9;
    let hour = hourIn();
    let hourAt = performance.now();

    const resize = () => {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(2, Math.round(r.width * dpr));
      const h = Math.max(2, Math.round(r.height * dpr));
      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
        last = -1e9;
      }
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(c);

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < (reduce ? 1000 : 33)) return;
      last = now;
      if (now - hourAt > 5000) {
        hour = hourIn();
        hourAt = now;
      }
      const ws = useWeather.getState();
      const s = { t: now / 1000, hour, kind: ws.override ?? ws.home.kind, isDay: ws.home.isDay };
      const W = c.width;
      const H = c.height;
      if (crop) {
        // draw a taller virtual window and show the band with the skyline
        const vh = Math.round(H * 1.9);
        ctx.save();
        ctx.translate(0, -Math.round(vh * 0.36));
        sky.draw(ctx, W, vh, s);
        ctx.restore();
      } else sky.draw(ctx, W, H, s);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      sky.dispose();
    };
  }, [crop]);

  return <canvas ref={ref} className={className} role="img" aria-label={label} />;
}
