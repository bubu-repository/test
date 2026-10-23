/* ==========================================================================
   A die-cut holo vinyl sticker (ported from the old adelia.cc Sticker.tsx):
   the illustration, a thick white edge cut around its silhouette, a thin
   cool-grey edge underneath where the vinyl has thickness, and a soft shadow
   cast to the LEFT (window light from the right). The edge comes from an SVG
   filter that grows the silhouette and rounds it off, so every drawing gets
   its own cut line.
   Locked: the sticker's own silhouette pressed into the page. Mystery (a
   locked secret): a dashed ring with a question mark.

   Performance: SVG filters are expensive to repaint, so every sticker is
   drawn ONCE per (art, look, size) into a bitmap (stickerURL) and shown as
   an <img>. The holo foil is an HTML layer masked by the sticker's cut
   silhouette, so it can drift with the pointer without repainting a filter.
   ========================================================================== */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { STICKER_ART } from './StickerArt';
import './sticker.css';

export type StickerLook = 'on' | 'holo' | 'locked' | 'mystery' | 'sil';

/** The drawing's 100×100 box, padded so the cut edge and the shadow are never clipped. */
const PAD = 7;
const VIEW = `${-PAD} ${-PAD} ${100 + PAD * 2} ${100 + PAD * 2}`;
/** The image is this much larger than the sticker's box (it bleeds by PAD on every side). */
export const BLEED = (100 + PAD * 2) / 100;

const CUT = (
  <>
    <feMorphology in="SourceAlpha" operator="dilate" radius="4.5" result="grown" />
    <feGaussianBlur in="grown" stdDeviation="1.6" result="soft" />
    <feComponentTransfer in="soft" result="cut">
      <feFuncA type="linear" slope="6" intercept="-1.8" />
    </feComponentTransfer>
  </>
);

/** A puffy "?" drawn as paths (an SVG image can't use the page's web fonts). */
const QUESTION = (
  <g fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M41.5 41a8.5 8.5 0 1 1 12.2 7.7c-3 1.5-3.9 3-3.9 6.3" stroke="#5E708A" strokeWidth="6" />
    <circle cx="49.8" cy="65.5" r="3.9" fill="#5E708A" />
  </g>
);

/** The sticker as a standalone SVG document (rasterised by stickerURL). */
export function StickerSVG({ art, look, px }: { art: string; look: StickerLook; px: number }) {
  const drawing: ReactNode = STICKER_ART[art] ?? STICKER_ART.hello;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={VIEW} width={px} height={px}>
      {look === 'mystery' ? (
        <>
          <circle cx="50" cy="50" r="36" fill="#F6F9FD" />
          <circle cx="50" cy="50" r="36" fill="none" stroke="#8496AD" strokeOpacity=".75" strokeWidth="2.6" strokeDasharray="5.5 5.5" strokeLinecap="round" />
          {QUESTION}
        </>
      ) : look === 'locked' ? (
        <>
          <defs>
            <filter id="ghost" x="-30%" y="-30%" width="160%" height="170%" colorInterpolationFilters="sRGB">
              {CUT}
              <feFlood floodColor="#E3EBF4" result="paper" />
              <feComposite in="paper" in2="cut" operator="in" result="bed" />
              <feOffset in="cut" dx="1" dy="-1.5" result="up" />
              <feComposite in="cut" in2="up" operator="out" result="lip" />
              <feFlood floodColor="#FFFFFF" result="white" />
              <feComposite in="white" in2="lip" operator="in" result="light" />
              <feFlood floodColor="#BCCADB" result="slate" />
              <feComposite in="slate" in2="SourceAlpha" operator="in" result="shape" />
              <feMerge>
                <feMergeNode in="bed" />
                <feMergeNode in="light" />
                <feMergeNode in="shape" />
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#ghost)" opacity=".9">
            {drawing}
          </g>
        </>
      ) : look === 'sil' ? (
        <>
          <defs>
            <filter id="sil" x="-30%" y="-30%" width="160%" height="170%" colorInterpolationFilters="sRGB">
              {CUT}
              <feFlood floodColor="#FFFFFF" result="white" />
              <feComposite in="white" in2="cut" operator="in" />
            </filter>
          </defs>
          <g filter="url(#sil)">{drawing}</g>
        </>
      ) : (
        <>
          <defs>
            <filter id="cut" x="-30%" y="-30%" width="160%" height="170%" colorInterpolationFilters="sRGB">
              {CUT}
              <feFlood floodColor="#FFFFFF" result="white" />
              <feComposite in="white" in2="cut" operator="in" result="edge" />
              <feOffset in="cut" dx="-1.2" dy="2" result="cutDown" />
              <feFlood floodColor="#C5D0DE" result="grey" />
              <feComposite in="grey" in2="cutDown" operator="in" result="thickness" />
              <feGaussianBlur in="cutDown" stdDeviation="3" result="blur" />
              <feOffset in="blur" dx="-2.4" dy="2.4" result="blurDown" />
              <feFlood floodColor="#18263A" floodOpacity="0.22" result="ink" />
              <feComposite in="ink" in2="blurDown" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="thickness" />
                <feMergeNode in="edge" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {look === 'holo' && (
              <>
                <filter id="sil" x="-30%" y="-30%" width="160%" height="170%" colorInterpolationFilters="sRGB">
                  {CUT}
                  <feFlood floodColor="#FFFFFF" result="white" />
                  <feComposite in="white" in2="cut" operator="in" />
                </filter>
                <mask id="m" maskUnits="userSpaceOnUse" x="-20" y="-20" width="140" height="140">
                  <g filter="url(#sil)">{drawing}</g>
                </mask>
                <linearGradient id="foil" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="60" y2="60" spreadMethod="repeat">
                  <stop offset="0" stopColor="#FFC2DE" />
                  <stop offset=".2" stopColor="#C4E4FF" />
                  <stop offset=".4" stopColor="#C9F5E2" />
                  <stop offset=".6" stopColor="#FFF0B8" />
                  <stop offset=".8" stopColor="#E2D6FF" />
                  <stop offset="1" stopColor="#FFC2DE" />
                </linearGradient>
              </>
            )}
          </defs>
          <g filter="url(#cut)">{drawing}</g>
          {look === 'holo' && (
            <g mask="url(#m)">
              <rect x="-20" y="-20" width="140" height="140" fill="url(#foil)" opacity=".4" style={{ mixBlendMode: 'multiply' }} />
            </g>
          )}
        </>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------- rasteriser */
const done = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
const queue: (() => Promise<void>)[] = [];
let running = 0;
const CONCURRENCY = 4;

function pump() {
  while (running < CONCURRENCY && queue.length) {
    const job = queue.shift()!;
    running++;
    // outside React's render/commit (flushSync can't run inside it)
    setTimeout(() => {
      job().finally(() => {
        running--;
        pump();
      });
    }, 0);
  }
}

/** Unique, XML-safe ids (React's useId ids aren't safe in a standalone SVG document). */
function cleanIds(xml: string) {
  const ids = [...new Set([...xml.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))];
  ids.forEach((id, i) => {
    const safe = `i${i}`;
    xml = xml.split(`id="${id}"`).join(`id="${safe}"`).split(`url(#${id})`).join(`url(#${safe})`);
  });
  return xml;
}

/** The sticker as an SVG document URL (synchronous). */
function svgURL(art: string, look: StickerLook, px: number): string {
  const host = document.createElement('div');
  const root = createRoot(host);
  flushSync(() => root.render(<StickerSVG art={art} look={look} px={px} />));
  const svg = host.querySelector('svg');
  const xml = svg ? cleanIds(new XMLSerializer().serializeToString(svg)) : '';
  root.unmount();
  return URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
}

async function rasterise(art: string, look: StickerLook, px: number): Promise<string> {
  const src = svgURL(art, look, px);
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = c.height = px;
    // a CPU canvas: no GPU read-back when it is encoded (that read-back is the slow part)
    c.getContext('2d', { willReadFrequently: true })!.drawImage(img, 0, 0, px, px);
    const png = c.toDataURL('image/png');
    URL.revokeObjectURL(src);
    return png;
  } catch {
    // a browser that taints SVG-on-canvas: the SVG itself is the image
    return src;
  }
}

/** A bitmap (PNG data URL) of a sticker, drawn once per art/look/size and cached for the session. */
export function stickerURL(art: string, look: StickerLook, px: number): Promise<string> {
  const key = `${art}|${look}|${px}`;
  const hit = done.get(key);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(key);
  if (!p) {
    p = new Promise<string>((resolve, reject) => {
      queue.push(() =>
        rasterise(art, look, px).then(
          (url) => {
            done.set(key, url);
            resolve(url);
          },
          (e) => {
            pending.delete(key);
            reject(e);
          },
        ),
      );
      pump();
    });
    pending.set(key, p);
  }
  return p;
}

const rasterPx = (size: number) => Math.min(512, Math.ceil(size * BLEED * Math.min(2, Math.max(1, window.devicePixelRatio || 1))));

export function useStickerURL(art: string, look: StickerLook, size: number, enabled = true): string | null {
  const px = rasterPx(size);
  const key = `${art}|${look}|${px}`;
  const [url, setUrl] = useState<string | null>(() => done.get(key) ?? null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const hit = done.get(key);
    if (hit) setUrl(hit);
    else {
      setUrl(null);
      stickerURL(art, look, px).then((u) => alive && setUrl(u), () => {});
    }
    return () => {
      alive = false;
    };
  }, [key, enabled, art, look, px]);
  return enabled ? url : null;
}

/* ------------------------------------------------------------- component */
export interface StickerProps {
  /** art key in STICKER_ART (see artOf() in stickers.ts for an achievement's art) */
  art: string;
  size?: number;
  locked?: boolean;
  /** a locked secret: dashed outline and "?" instead of its shape */
  mystery?: boolean;
  /** pastel foil over the cut (drifts while `.stk--live`, follows --hx/--hy) */
  holo?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Sticker({ art, size = 72, locked = false, mystery = false, holo = false, className = '', style }: StickerProps) {
  const look: StickerLook = mystery ? 'mystery' : locked ? 'locked' : 'on';
  const url = useStickerURL(art, look, size);
  const foil = holo && look === 'on';
  const sil = useStickerURL(art, 'sil', size, foil);
  return (
    <span aria-hidden className={`stk stk--${look} ${foil ? 'stk--holo' : ''} ${url ? 'is-ready' : ''} ${className}`} style={{ width: size, height: size, ...style }}>
      {url && <img className="stk__img" src={url} alt="" draggable={false} />}
      {foil && sil && (
        <>
          <span className="stk__foil" style={{ '--sil': `url("${sil}")` } as CSSProperties} />
          <span className="stk__glare" style={{ '--sil': `url("${sil}")` } as CSSProperties} />
        </>
      )}
    </span>
  );
}
