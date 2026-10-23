/* ==========================================================================
   2D camera maths for the room plate.
   A camera is { x, y, s }: the plate point shown at the viewport centre and
   the absolute scale (CSS px per plate px).
   ========================================================================== */
import { PLATE, type Box } from './plate';

export interface Cam {
  x: number;
  y: number;
  s: number;
}

export interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const MAX_SCALE = 1.4;
/** The world is drawn 1.2% larger (around the viewport centre) so parallax never shows an edge. */
export const OVERSCAN = 1.012;

/** Where a plate box lands on screen for camera `c` (parallax ignored). */
export function project(box: Box, c: Cam, vw: number, vh: number): Area {
  const k = c.s * OVERSCAN;
  return { x: (box.x - c.x) * k + vw / 2, y: (box.y - c.y) * k + vh / 2, w: box.w * k, h: box.h * k };
}

export function coverScale(vw: number, vh: number) {
  return Math.max(vw / PLATE.w, vh / PLATE.h);
}

/** Keep the plate covering the viewport. */
export function clampCam(c: Cam, vw: number, vh: number): Cam {
  const s = Math.max(c.s, coverScale(vw, vh));
  const hw = vw / (2 * s);
  const hh = vh / (2 * s);
  return {
    s,
    x: Math.min(PLATE.w - hw, Math.max(hw, c.x)),
    y: Math.min(PLATE.h - hh, Math.max(hh, c.y)),
  };
}

/**
 * Frame `box` inside the visible `area` of the viewport (screen px), with padding.
 * `minScale` lets overview shots zoom out to cover only.
 */
export function fitBox(box: Box, vw: number, vh: number, area?: Area, pad = 0.12): Cam {
  const a = area ?? { x: 0, y: 0, w: vw, h: vh };
  let s = Math.min(a.w / (box.w * (1 + pad)), a.h / (box.h * (1 + pad)));
  s = Math.min(MAX_SCALE, Math.max(s, coverScale(vw, vh)));
  const bx = box.x + box.w / 2;
  const by = box.y + box.h / 2;
  // place the box centre at the centre of the visible area
  const acx = a.x + a.w / 2;
  const acy = a.y + a.h / 2;
  return clampCam({ s, x: bx - (acx - vw / 2) / s, y: by - (acy - vh / 2) / s }, vw, vh);
}

export function lerpCam(a: Cam, b: Cam, t: number): Cam {
  // interpolate scale in log space so zooms feel even
  const ls = Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * t;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, s: Math.exp(ls) };
}

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const smooth = (t: number) => t * t * (3 - 2 * t);

/** Screen-space distance-ish between two cams (for tween durations). */
export function camDistance(a: Cam, b: Cam) {
  const s = Math.min(a.s, b.s);
  return Math.hypot((a.x - b.x) * s, (a.y - b.y) * s) + Math.abs(Math.log(a.s / b.s)) * 600;
}
