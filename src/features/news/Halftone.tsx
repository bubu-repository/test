/* ==========================================================================
   Newspaper halftone "photo" — a real AM screen (dots on a 45° grid, area
   proportional to ink) rendered from a crop of her room plate or a wall
   poster. Drawn once per size onto a canvas; a CSS dot screen shows while
   the source image decodes (and stays if it fails).
   ========================================================================== */
import { useEffect, useRef } from 'react';

const ROOM = { src: '/assets/room/room-1600.webp', w: 1600, h: 679 };
const POSTER = { w: 415, h: 590 };

type Crop = { cx: number; cy: number; w: number; caption: string } | { poster: 1 | 2 | 3 | 4; caption: string };

/* Crops of her room plate (fractions of 6336×2688; see stage/plate.ts) and the four posters. */
const CROPS: Record<string, Crop> = {
  room: { cx: 0.5, cy: 0.5, w: 0.62, caption: 'Her room, Bekasi.' },
  posters: { cx: 0.414, cy: 0.25, w: 0.34, caption: 'The Wall of Work: four case studies.' },
  computer: { cx: 0.499, cy: 0.55, w: 0.16, caption: 'Adelia OS, booting.' },
  desk: { cx: 0.342, cy: 0.62, w: 0.16, caption: 'Today’s paper, on her desk.' },
  shelf: { cx: 0.12, cy: 0.42, w: 0.2, caption: 'The toolkit, on the chrome shelf.' },
  jar: { cx: 0.095, cy: 0.39, w: 0.1, caption: 'The jar of marbles: one per case labelled by hand.' },
  lanyard: { cx: 0.337, cy: 0.5, w: 0.12, caption: 'Her ID card, on its hook.' },
  window: { cx: 0.883, cy: 0.32, w: 0.22, caption: 'Bekasi, through her window.' },
  p1: { poster: 1, caption: 'Tenderlens, from the Wall of Work.' },
  p2: { poster: 2, caption: 'Ask HR, from the Wall of Work.' },
  p3: { poster: 3, caption: 'Catat, from the Wall of Work.' },
  p4: { poster: 4, caption: 'Lintas, from the Wall of Work.' },
};
/** Her NEWS ids → a photo; anything new (added in /admin) gets a stable pick from the pool. */
const BY_ARTICLE: Record<string, keyof typeof CROPS> = {
  now: 'room',
  'lintas-still': 'p4',
  'regression-gate': 'jar',
  handover: 'p1',
  graduated: 'lanyard',
  thesis: 'computer',
  'ask-hr': 'p2',
};
const POOL = Object.keys(CROPS);

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Source image + rect (in image px) for an article photo of aspect `a` (w/h). */
function source(id: string, a: number) {
  const c = CROPS[BY_ARTICLE[id] ?? POOL[hash(id) % POOL.length]];
  if ('poster' in c) {
    const { w: iw, h: ih } = POSTER;
    let sw = iw;
    let sh = iw / a;
    if (sh > ih) {
      sh = ih;
      sw = ih * a;
    }
    return { src: `/assets/posters/poster-${c.poster}.webp`, sx: (iw - sw) / 2, sy: (ih - sh) * 0.5, sw, sh, caption: c.caption };
  }
  const { w: iw, h: ih } = ROOM;
  let sw = c.w * iw;
  let sh = sw / a;
  if (sh > ih) {
    sh = ih;
    sw = sh * a;
  }
  const sx = Math.min(iw - sw, Math.max(0, c.cx * iw - sw / 2));
  const sy = Math.min(ih - sh, Math.max(0, c.cy * ih - sh / 2));
  return { src: ROOM.src, sx, sy, sw, sh, caption: c.caption };
}

const cache = new Map<string, Promise<HTMLImageElement>>();
function load(src: string) {
  let p = cache.get(src);
  if (!p) {
    p = new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });
    p.catch(() => cache.delete(src));
    cache.set(src, p);
  }
  return p;
}

export function captionFor(id: string) {
  return source(id, 1).caption;
}

export function Halftone({ id, aspect, spot, dot = 5, className = '' }: { id: string; aspect: number; spot?: boolean; dot?: number; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const s = source(id, aspect);

  useEffect(() => {
    const el = wrap.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    let alive = true;
    let img: HTMLImageElement | null = null;
    let lastW = 0;

    const draw = () => {
      if (!img || !alive) return;
      const W = Math.round(el.clientWidth);
      if (!W || W === lastW) return;
      lastW = W;
      const H = Math.round(W / aspect);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      // sample the crop at half resolution
      const sw = Math.max(1, Math.round(W / 2));
      const sh = Math.max(1, Math.round(H / 2));
      const off = document.createElement('canvas');
      off.width = sw;
      off.height = sh;
      const octx = off.getContext('2d', { willReadFrequently: true });
      if (!octx) return;
      octx.filter = 'grayscale(1) contrast(1.18)';
      octx.drawImage(img, s.sx, s.sy, s.sw, s.sh, 0, 0, sw, sh);
      const px = octx.getImageData(0, 0, sw, sh).data;
      const lum = (x: number, y: number) => {
        const ix = Math.min(sw - 1, Math.max(0, Math.round(x / 2)));
        const iy = Math.min(sh - 1, Math.max(0, Math.round(y / 2)));
        const i = (iy * sw + ix) * 4;
        return (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 255;
      };

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = spot ? '#ff7eb6' : '#161b26';
      const ang = Math.PI / 4;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      const diag = Math.hypot(W, H);
      const n = Math.ceil(diag / dot) + 2;
      const cx = W / 2;
      const cy = H / 2;
      const rMax = dot * 0.74;
      ctx.beginPath();
      for (let i = -n / 2; i <= n / 2; i++) {
        for (let j = -n / 2; j <= n / 2; j++) {
          const u = i * dot;
          const v = j * dot;
          const x = cx + u * cos - v * sin;
          const y = cy + u * sin + v * cos;
          if (x < -dot || y < -dot || x > W + dot || y > H + dot) continue;
          // ink coverage with a little lift in the highlights (newsprint dot gain)
          const k = Math.min(1, Math.max(0, (1 - lum(x, y) - 0.04) / 0.82));
          if (k < 0.035) continue;
          const r = rMax * Math.sqrt(k);
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
      }
      ctx.fill();
      el.classList.add('is-ready');
    };

    load(s.src)
      .then((i) => {
        img = i;
        draw();
      })
      .catch(() => el.classList.add('is-error'));
    const ro = new ResizeObserver(() => draw());
    ro.observe(el);
    return () => {
      alive = false;
      ro.disconnect();
    };
  }, [s.src, s.sx, s.sy, s.sw, s.sh, aspect, spot, dot]);

  return (
    <figure className={`news-photo ${className}`}>
      <div ref={wrap} className={`news-ht ${spot ? 'news-ht--spot' : ''}`} style={{ aspectRatio: String(aspect) }}>
        <canvas ref={canvas} aria-hidden />
      </div>
      <figcaption>{s.caption}</figcaption>
    </figure>
  );
}
