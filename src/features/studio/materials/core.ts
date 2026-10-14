/*
 * Shared helpers for the material renderers: canvases and pixels, fields (Float32Array images)
 * with fast blurs and signed distances, seeded randomness and noise, contour tracing, lighting
 * and colour. Everything works on typed arrays so a 1000×560 render stays in budget; nothing
 * allocates per pixel.
 *
 * Conventions: a "field" is a Float32Array of w*h values, row-major. Distances are in pixels of the
 * grid they were computed on; a signed distance is negative inside the shape and positive outside.
 */

import type { MaterialInput } from "./types";

export type RGB = [number, number, number];
export type Vec3 = [number, number, number];
export type Path = { pts: Float32Array; closed: boolean };

/** The navy that every shadow is tinted with, never pure black. */
export const SHADOW: RGB = [8, 40, 80];

/** The site's pink and its soft tint (tokens.css --pink and --pink-soft). */
export const PINK: RGB = [255, 126, 182];
export const PINK_SOFT: RGB = [255, 214, 232];

/* ------------------------------------------------------------------ maths */

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ------------------------------------------------------------- randomness */

/** mulberry32: a tiny, good-enough seeded PRNG returning [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stateless integer hash of a lattice point to [0, 1). */
export function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/**
 * A whole field of fractal value noise in about [-1, 1]: the lattice is hashed once per octave and
 * interpolated per pixel, so it is cheap even at full resolution. `scale` is the size of the
 * coarsest feature in pixels; `sx`/`sy` stretch it (anisotropic noise, e.g. sy = 0.2 for streaks).
 */
export function noiseField(
  w: number,
  h: number,
  scale: number,
  seed: number,
  octaves = 3,
  gain = 0.5,
  sx = 1,
  sy = 1,
): Float32Array {
  // Smooth noise doesn't need every pixel: make it smaller and stretch it back.
  const finest = scale * Math.min(sx, sy) * Math.pow(0.5, octaves - 1);
  const f = finest >= 16 ? 4 : finest >= 7 ? 2 : 1;
  if (f > 1) {
    const sw = Math.ceil(w / f) + 1;
    const sh = Math.ceil(h / f) + 1;
    const small = noiseRaw(sw, sh, scale / f, seed, octaves, gain, sx, sy);
    return crop(upsample(small, sw, sh, sw * f, sh * f), sw * f, w, h);
  }
  return noiseRaw(w, h, scale, seed, octaves, gain, sx, sy);
}

function crop(src: Float32Array, sw: number, w: number, h: number): Float32Array {
  if (sw === w) return src.length === w * h ? src : src.slice(0, w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) out.set(src.subarray(y * sw, y * sw + w), y * w);
  return out;
}

function noiseRaw(w: number, h: number, scale: number, seed: number, octaves: number, gain: number, sx: number, sy: number): Float32Array {
  const out = new Float32Array(w * h);
  let amp = 1;
  let norm = 0;
  let cell = scale;
  const xi = new Int32Array(w);
  const xt = new Float32Array(w);
  for (let o = 0; o < octaves; o++) {
    const cx = Math.max(0.5, cell * sx);
    const cy = Math.max(0.5, cell * sy);
    const lw = Math.ceil(w / cx) + 2;
    const lh = Math.ceil(h / cy) + 2;
    const lat = new Float32Array(lw * lh);
    const s = seed + o * 7919;
    for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) lat[j * lw + i] = hash2(i, j, s) * 2 - 1;
    for (let x = 0; x < w; x++) {
      const fx = x / cx;
      const i = Math.floor(fx);
      const t = fx - i;
      xi[x] = i;
      xt[x] = t * t * (3 - 2 * t);
    }
    for (let y = 0; y < h; y++) {
      const fy = y / cy;
      const j = Math.floor(fy);
      let ty = fy - j;
      ty = ty * ty * (3 - 2 * ty);
      const r0 = j * lw;
      const r1 = r0 + lw;
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const i = xi[x];
        const tx = xt[x];
        const a = lat[r0 + i];
        const b = lat[r0 + i + 1];
        const c = lat[r1 + i];
        const d = lat[r1 + i + 1];
        const top = a + (b - a) * tx;
        const bot = c + (d - c) * tx;
        out[row + x] += (top + (bot - top) * ty) * amp;
      }
    }
    norm += amp;
    amp *= gain;
    cell *= 0.5;
  }
  const inv = 1 / norm;
  for (let i = 0; i < out.length; i++) out[i] *= inv;
  return out;
}

/* --------------------------------------------------------------- canvases */

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** A 2D context; `readback` keeps it on the CPU for canvases we read pixels back from. */
export function ctxOf(c: HTMLCanvasElement, readback = false): CanvasRenderingContext2D {
  const ctx = c.getContext("2d", readback ? { willReadFrequently: true } : undefined);
  if (!ctx) throw new Error("Canvas 2D is unavailable");
  return ctx;
}

/** An RGBA buffer as a fresh canvas. */
export function toCanvas(rgba: Uint8ClampedArray, w: number, h: number): HTMLCanvasElement {
  const c = makeCanvas(w, h);
  const ctx = ctxOf(c);
  const img = ctx.createImageData(w, h);
  img.data.set(rgba);
  ctx.putImageData(img, 0, 0);
  return c;
}

/* -------------------------------------------------------------------- art */

export type Art = {
  /** The whole canvas. */
  W: number;
  H: number;
  /**
   * The working crop: everything below is relative to it (the art's box plus a margin), so the
   * per-pixel work skips the empty padding. `output()` places the crop back on the canvas.
   */
  ox: number;
  oy: number;
  w: number;
  h: number;
  /** The source pixels in the crop, straight (not premultiplied) RGBA. */
  rgba: Uint8ClampedArray;
  /** Coverage, 0..1, in the crop. */
  alpha: Float32Array;
  /** Bounding box of the art in crop coordinates (x1/y1 exclusive), its size and centre. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  bw: number;
  bh: number;
  cx: number;
  cy: number;
  /** The size unit: the art's height, kept sane for very flat or very tall art. */
  u: number;
  /** Room around the art (about 18% of the shorter side). */
  pad: number;
  photo: boolean;
  /** The ink colour of lettering (average colour of solid pixels). */
  ink: RGB;
};

/**
 * Reads the source and crops it to the art's box grown by `margin` (a number of pixels, or a
 * function of the art's height `u` and padding `pad`); `Infinity` keeps the whole canvas.
 */
export function readArt(input: MaterialInput, margin: number | ((u: number, pad: number) => number) = Infinity): Art {
  const src = input.source;
  const W = src.width;
  const H = src.height;
  const c = makeCanvas(W, H);
  const ctx = ctxOf(c, true);
  ctx.drawImage(src, 0, 0);
  const full = ctx.getImageData(0, 0, W, H).data;
  let bx0 = W;
  let by0 = H;
  let bx1 = 0;
  let by1 = 0;
  for (let y = 0; y < H; y++) {
    const row = y * W * 4 + 3;
    let first = -1;
    let last = -1;
    for (let x = 0; x < W; x++) {
      if (full[row + x * 4] > 20) {
        if (first < 0) first = x;
        last = x;
      }
    }
    if (first >= 0) {
      if (first < bx0) bx0 = first;
      if (last + 1 > bx1) bx1 = last + 1;
      if (y < by0) by0 = y;
      by1 = y + 1;
    }
  }
  if (bx1 <= bx0 || by1 <= by0) {
    bx0 = Math.round(W * 0.3);
    bx1 = Math.round(W * 0.7);
    by0 = Math.round(H * 0.3);
    by1 = Math.round(H * 0.7);
  }
  const short = Math.min(W, H);
  const pad = short * 0.18;
  const u = clamp(by1 - by0, short * 0.2, short * 0.7);
  const m = Math.ceil(typeof margin === "function" ? margin(u, pad) : margin);
  const ox = Math.max(0, bx0 - m);
  const oy = Math.max(0, by0 - m);
  const w = Math.min(W, bx1 + m) - ox;
  const h = Math.min(H, by1 + m) - oy;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const alpha = new Float32Array(w * h);
  let ir = 0;
  let ig = 0;
  let ib = 0;
  let iw = 0;
  for (let y = 0; y < h; y++) {
    const srow = ((y + oy) * W + ox) * 4;
    rgba.set(full.subarray(srow, srow + w * 4), y * w * 4);
    for (let x = 0; x < w; x++) {
      const j = srow + x * 4;
      const a = full[j + 3];
      alpha[y * w + x] = a / 255;
      if (a > 230) {
        ir += full[j];
        ig += full[j + 1];
        ib += full[j + 2];
        iw++;
      }
    }
  }
  const x0 = bx0 - ox;
  const y0 = by0 - oy;
  const x1 = bx1 - ox;
  const y1 = by1 - oy;
  return {
    W,
    H,
    ox,
    oy,
    w,
    h,
    rgba,
    alpha,
    x0,
    y0,
    x1,
    y1,
    bw: x1 - x0,
    bh: y1 - y0,
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    u,
    pad,
    photo: input.kind === "photo",
    ink: iw ? [ir / iw, ig / iw, ib / iw] : [30, 40, 60],
  };
}

/* ----------------------------------------------------------------- fields */

/** Box-averages a field down by an integer factor. */
export function downsample(src: Float32Array, w: number, h: number, f: number) {
  const dw = Math.ceil(w / f);
  const dh = Math.ceil(h / f);
  const out = new Float32Array(dw * dh);
  const map = new Int32Array(w);
  for (let x = 0; x < w; x++) map[x] = (x / f) | 0;
  for (let y = 0; y < h; y++) {
    const dy = ((y / f) | 0) * dw;
    const row = y * w;
    for (let x = 0; x < w; x++) out[dy + map[x]] += src[row + x];
  }
  for (let y = 0; y < dh; y++) {
    const ny = Math.min(f, h - y * f);
    for (let x = 0; x < dw; x++) out[y * dw + x] /= ny * Math.min(f, w - x * f);
  }
  return { data: out, w: dw, h: dh };
}

/** Bilinear resize of a field (values multiplied by `mul`, e.g. to rescale distances). */
export function upsample(src: Float32Array, sw: number, sh: number, dw: number, dh: number, mul = 1): Float32Array {
  const out = new Float32Array(dw * dh);
  const fx = sw / dw;
  const fy = sh / dh;
  const x0 = new Int32Array(dw);
  const x1 = new Int32Array(dw);
  const tx = new Float32Array(dw);
  for (let x = 0; x < dw; x++) {
    const sx = clamp((x + 0.5) * fx - 0.5, 0, sw - 1);
    x0[x] = sx | 0;
    x1[x] = Math.min(x0[x] + 1, sw - 1);
    tx[x] = sx - x0[x];
  }
  for (let y = 0; y < dh; y++) {
    const sy = clamp((y + 0.5) * fy - 0.5, 0, sh - 1);
    const y0 = sy | 0;
    const y1 = Math.min(y0 + 1, sh - 1);
    const ty = sy - y0;
    const r0 = y0 * sw;
    const r1 = y1 * sw;
    const row = y * dw;
    for (let x = 0; x < dw; x++) {
      const a = src[r0 + x0[x]];
      const b = src[r0 + x1[x]];
      const c = src[r1 + x0[x]];
      const d = src[r1 + x1[x]];
      const t = tx[x];
      const top = a + (b - a) * t;
      const bot = c + (d - c) * t;
      out[row + x] = (top + (bot - top) * ty) * mul;
    }
  }
  return out;
}

/** Bilinear sample with clamping. */
export function sample(f: Float32Array, w: number, h: number, x: number, y: number): number {
  if (x < 0) x = 0;
  else if (x > w - 1) x = w - 1;
  if (y < 0) y = 0;
  else if (y > h - 1) y = h - 1;
  const xi = x | 0;
  const yi = y | 0;
  const tx = x - xi;
  const ty = y - yi;
  const xj = xi + 1 < w ? xi + 1 : xi;
  const yj = yi + 1 < h ? yi + 1 : yi;
  const a = f[yi * w + xi];
  const b = f[yi * w + xj];
  const c = f[yj * w + xi];
  const d = f[yj * w + xj];
  const top = a + (b - a) * tx;
  return top + (c + (d - c) * tx - top) * ty;
}

function boxH(src: Float32Array, dst: Float32Array, w: number, h: number, r: number) {
  const inv = 1 / (2 * r + 1);
  const lead = Math.min(r, w - 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = 0;
    for (let i = 0; i <= lead; i++) acc += src[row + i];
    // x - r < 0 and x + r + 1 < w: only adding.
    let x = 0;
    const a = Math.min(r, w - r - 1);
    for (; x < a; x++) {
      dst[row + x] = acc * inv;
      acc += src[row + x + r + 1];
    }
    // Both ends inside.
    const b = w - r - 1;
    for (; x < b; x++) {
      dst[row + x] = acc * inv;
      acc += src[row + x + r + 1] - src[row + x - r];
    }
    for (; x < w; x++) {
      dst[row + x] = acc * inv;
      const add = x + r + 1;
      const sub = x - r;
      if (add < w) acc += src[row + add];
      if (sub >= 0) acc -= src[row + sub];
    }
  }
}

function boxV(src: Float32Array, dst: Float32Array, w: number, h: number, r: number, acc: Float64Array) {
  const inv = 1 / (2 * r + 1);
  acc.fill(0);
  for (let i = 0; i <= r && i < h; i++) {
    const row = i * w;
    for (let x = 0; x < w; x++) acc[x] += src[row + x];
  }
  for (let y = 0; y < h; y++) {
    const row = y * w;
    const add = y + r + 1;
    const sub = y - r;
    if (add < h && sub >= 0) {
      const ra = add * w;
      const rs = sub * w;
      for (let x = 0; x < w; x++) {
        const v = acc[x];
        dst[row + x] = v * inv;
        acc[x] = v + src[ra + x] - src[rs + x];
      }
    } else {
      for (let x = 0; x < w; x++) dst[row + x] = acc[x] * inv;
      if (add < h) {
        const ra = add * w;
        for (let x = 0; x < w; x++) acc[x] += src[ra + x];
      }
      if (sub >= 0) {
        const rs = sub * w;
        for (let x = 0; x < w; x++) acc[x] -= src[rs + x];
      }
    }
  }
}

/** Separable box blur, `passes` times (3 passes ≈ a gaussian). Zero outside the field. */
export function boxBlur(src: Float32Array, w: number, h: number, r: number, passes = 3): Float32Array {
  const a = new Float32Array(src);
  r = Math.round(r);
  if (r < 1) return a;
  const b = new Float32Array(w * h);
  const acc = new Float64Array(w);
  for (let p = 0; p < passes; p++) {
    boxH(a, b, w, h, r);
    boxV(b, a, w, h, r, acc);
  }
  return a;
}

/** Gaussian blur of standard deviation `sigma` (three box passes). */
export function gauss(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const r = Math.max(0, Math.round(Math.sqrt(sigma * sigma + 0.25) - 0.5));
  return boxBlur(src, w, h, r, 3);
}

/* -------------------------------------------------------- distance fields */

const INF = 1e20;

function edt1d(f: Float64Array, d: Float64Array, v: Int32Array, z: Float64Array, n: number) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
}

/** Squared Euclidean distance transform in place (Felzenszwalb & Huttenlocher). */
function edt(grid: Float64Array, w: number, h: number) {
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, d, v, z, h);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) f[x] = grid[row + x];
    edt1d(f, d, v, z, w);
    for (let x = 0; x < w; x++) grid[row + x] = d[x];
  }
}

/**
 * Signed distance to the 0.5 coverage edge of `alpha`, sub-pixel accurate on anti-aliased edges
 * (the tiny-sdf trick): negative inside, positive outside, in pixels of this grid.
 */
export function signedDistance(alpha: Float32Array, w: number, h: number): Float32Array {
  const n = w * h;
  const outer = new Float64Array(n);
  const inner = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = alpha[i];
    if (a >= 0.999) {
      outer[i] = 0;
      inner[i] = INF;
    } else if (a <= 0.001) {
      outer[i] = INF;
      inner[i] = 0;
    } else {
      const o = Math.max(0, 0.5 - a);
      const n2 = Math.max(0, a - 0.5);
      outer[i] = o * o;
      inner[i] = n2 * n2;
    }
  }
  edt(outer, w, h);
  edt(inner, w, h);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.sqrt(outer[i]) - Math.sqrt(inner[i]);
  return out;
}

/**
 * Fills holes (regions below `level` that don't reach the border) smaller than `maxArea` cells, by
 * setting them to `fill`. Works on any field where "inside" is `>= level`; for a signed distance
 * pass the negated field or use `inside: "below"`.
 */
export function fillHoles(f: Float32Array, w: number, h: number, maxArea: number, insideBelow: boolean, fill: number) {
  const n = w * h;
  const isOut = (i: number) => (insideBelow ? f[i] >= 0 : f[i] < 0.5);
  const label = new Int32Array(n).fill(-1);
  const stack = new Int32Array(n);
  let next = 0;
  for (let s = 0; s < n; s++) {
    if (label[s] >= 0 || !isOut(s)) continue;
    const id = next++;
    let sp = 0;
    stack[sp++] = s;
    label[s] = id;
    let touches = false;
    let count = 0;
    const members: number[] = [];
    while (sp) {
      const i = stack[--sp];
      count++;
      if (count <= maxArea) members.push(i);
      const x = i % w;
      const y = (i / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true;
      if (x > 0 && label[i - 1] < 0 && isOut(i - 1)) {
        label[i - 1] = id;
        stack[sp++] = i - 1;
      }
      if (x < w - 1 && label[i + 1] < 0 && isOut(i + 1)) {
        label[i + 1] = id;
        stack[sp++] = i + 1;
      }
      if (y > 0 && label[i - w] < 0 && isOut(i - w)) {
        label[i - w] = id;
        stack[sp++] = i - w;
      }
      if (y < h - 1 && label[i + w] < 0 && isOut(i + w)) {
        label[i + w] = id;
        stack[sp++] = i + w;
      }
    }
    if (!touches && count <= maxArea) for (const i of members) f[i] = fill;
  }
}

/* -------------------------------------------------------------- contours */

/** Edges of a marching-squares cell: 0 top, 1 right, 2 bottom, 3 left. */
const MS: number[][] = [
  [],
  [3, 0],
  [0, 1],
  [3, 1],
  [1, 2],
  [3, 0, 1, 2],
  [0, 2],
  [3, 2],
  [2, 3],
  [0, 2],
  [0, 1, 2, 3],
  [1, 2],
  [3, 1],
  [0, 1],
  [3, 0],
  [],
];

/**
 * Iso-lines of a field at `level` (marching squares, linked into polylines). Points are in grid
 * coordinates of pixel centres (x + 0.5 is the canvas coordinate on a full-res grid).
 */
export function contours(f: Float32Array, w: number, h: number, level: number, minPoints = 8): Path[] {
  const nE = w * h * 2;
  const nb0 = new Int32Array(nE).fill(-1);
  const nb1 = new Int32Array(nE).fill(-1);
  const link = (a: number, b: number) => {
    if (nb0[a] < 0) nb0[a] = b;
    else nb1[a] = b;
    if (nb0[b] < 0) nb0[b] = a;
    else nb1[b] = a;
  };
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const i = y * w + x;
      const a = f[i] < level ? 1 : 0;
      const b = f[i + 1] < level ? 2 : 0;
      const c = f[i + w + 1] < level ? 4 : 0;
      const d = f[i + w] < level ? 8 : 0;
      let cs = a | b | c | d;
      if (cs === 0 || cs === 15) continue;
      if (cs === 5 || cs === 10) {
        const centre = (f[i] + f[i + 1] + f[i + w] + f[i + w + 1]) / 4 < level;
        if ((cs === 5) !== centre) cs = cs === 5 ? 10 : 5;
      }
      const segs = MS[cs];
      const e = [i * 2, (i + 1) * 2 + 1, (i + w) * 2, i * 2 + 1];
      for (let s = 0; s < segs.length; s += 2) link(e[segs[s]], e[segs[s + 1]]);
    }
  }
  const pos = (id: number, out: number[]) => {
    const cell = id >> 1;
    const x = cell % w;
    const y = (cell / w) | 0;
    if ((id & 1) === 0) {
      const fa = f[cell];
      const fb = f[cell + 1];
      out.push(x + clamp01((level - fa) / (fb - fa || 1e-6)), y);
    } else {
      const fa = f[cell];
      const fb = f[cell + w];
      out.push(x, y + clamp01((level - fa) / (fb - fa || 1e-6)));
    }
  };
  const seen = new Uint8Array(nE);
  const paths: Path[] = [];
  const walk = (start: number) => {
    const pts: number[] = [];
    let prev = -1;
    let cur = start;
    let closed = false;
    while (cur >= 0 && !seen[cur]) {
      seen[cur] = 1;
      pos(cur, pts);
      const n0 = nb0[cur];
      const n1 = nb1[cur];
      const next = n0 !== prev ? n0 : n1;
      if (next === start) closed = true;
      prev = cur;
      cur = next;
    }
    if (pts.length / 2 >= minPoints) paths.push({ pts: Float32Array.from(pts), closed });
  };
  for (let id = 0; id < nE; id++) if (nb0[id] >= 0 && nb1[id] < 0 && !seen[id]) walk(id);
  for (let id = 0; id < nE; id++) if (nb0[id] >= 0 && !seen[id]) walk(id);
  return paths;
}

/** Laplacian smoothing of a polyline. */
export function smoothPath(p: Path, iterations = 2): Path {
  let a = p.pts;
  const n = a.length / 2;
  for (let it = 0; it < iterations; it++) {
    const b = new Float32Array(a.length);
    for (let i = 0; i < n; i++) {
      const ip = p.closed ? (i - 1 + n) % n : Math.max(0, i - 1);
      const inx = p.closed ? (i + 1) % n : Math.min(n - 1, i + 1);
      b[i * 2] = a[i * 2] * 0.5 + (a[ip * 2] + a[inx * 2]) * 0.25;
      b[i * 2 + 1] = a[i * 2 + 1] * 0.5 + (a[ip * 2 + 1] + a[inx * 2 + 1]) * 0.25;
    }
    a = b;
  }
  return { pts: a, closed: p.closed };
}

/** Maps grid coordinates to canvas coordinates: (g + 0.5) * scale. */
export function scalePath(p: Path, scale: number): Path {
  const pts = new Float32Array(p.pts.length);
  for (let i = 0; i < pts.length; i++) pts[i] = (p.pts[i] + 0.5) * scale;
  return { pts, closed: p.closed };
}

export function pathLength(p: Path): number {
  const a = p.pts;
  const n = a.length / 2;
  let len = 0;
  for (let i = 1; i < n; i++) len += Math.hypot(a[i * 2] - a[i * 2 - 2], a[i * 2 + 1] - a[i * 2 - 1]);
  if (p.closed && n > 1) len += Math.hypot(a[0] - a[n * 2 - 2], a[1] - a[n * 2 - 1]);
  return len;
}

/**
 * Evenly spaced points along a path, with unit tangents: [x, y, tx, ty] per point. A closed path
 * gets a spacing adjusted so the points wrap around evenly.
 */
export function resamplePath(p: Path, spacing: number): Float32Array {
  const a = p.pts;
  const n = a.length / 2;
  if (n < 2) return new Float32Array(0);
  const total = pathLength(p);
  const count = Math.max(2, Math.round(total / spacing));
  const step = total / (p.closed ? count : count - 1);
  const out = new Float32Array(count * 4);
  const segs = p.closed ? n : n - 1;
  let seg = 0;
  let segStart = 0;
  let ax = a[0];
  let ay = a[1];
  let bx = a[2];
  let by = a[3];
  let segLen = Math.hypot(bx - ax, by - ay);
  for (let k = 0; k < count; k++) {
    const target = k * step;
    while (target > segStart + segLen && seg < segs - 1) {
      segStart += segLen;
      seg++;
      const i0 = seg;
      const i1 = (seg + 1) % n;
      ax = a[i0 * 2];
      ay = a[i0 * 2 + 1];
      bx = a[i1 * 2];
      by = a[i1 * 2 + 1];
      segLen = Math.hypot(bx - ax, by - ay);
    }
    const t = segLen > 0 ? clamp01((target - segStart) / segLen) : 0;
    const inv = segLen > 0 ? 1 / segLen : 0;
    out[k * 4] = ax + (bx - ax) * t;
    out[k * 4 + 1] = ay + (by - ay) * t;
    out[k * 4 + 2] = (bx - ax) * inv;
    out[k * 4 + 3] = (by - ay) * inv;
  }
  // Smooth the tangents a little so stitches don't flick on polyline corners.
  const tg = out.slice();
  for (let k = 0; k < count; k++) {
    const kp = p.closed ? (k - 1 + count) % count : Math.max(0, k - 1);
    const kn = p.closed ? (k + 1) % count : Math.min(count - 1, k + 1);
    let tx = tg[kp * 4 + 2] + tg[k * 4 + 2] * 2 + tg[kn * 4 + 2];
    let ty = tg[kp * 4 + 3] + tg[k * 4 + 3] * 2 + tg[kn * 4 + 3];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    out[k * 4 + 2] = tx;
    out[k * 4 + 3] = ty;
  }
  return out;
}

/**
 * Iso-line paths of a field that is already on a coarse grid (`scale` canvas pixels per cell), in
 * canvas coordinates. `level` is in the grid's own units.
 */
export function gridPaths(field: Float32Array, gw: number, gh: number, level: number, scale: number, smooth = 2): Path[] {
  return contours(field, gw, gh, level, 6).map((p) => scalePath(smoothPath(p, smooth), scale));
}

/* --------------------------------------------------------------- shapes */

/** Signed distance to a rounded rectangle centred at (cx, cy), half-size (hw, hh), radius r. */
export function roundRectDist(px: number, py: number, cx: number, cy: number, hw: number, hh: number, r: number): number {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ox = qx > 0 ? qx : 0;
  const oy = qy > 0 ? qy : 0;
  return Math.sqrt(ox * ox + oy * oy) + Math.min(qx > qy ? qx : qy, 0) - r;
}

/**
 * Position along the outline of a rounded rectangle (arc length, clockwise from the top-left end
 * of the top edge) of the outline point nearest to (px, py). The full loop is
 * `roundRectLength(hw, hh, r)` long.
 */
export function roundRectArc(px: number, py: number, cx: number, cy: number, hw: number, hh: number, r: number): number {
  const a = hw - r;
  const b = hh - r;
  const x = px - cx;
  const y = py - cy;
  const qx = Math.abs(x) - a;
  const qy = Math.abs(y) - b;
  const q = (Math.PI * r) / 2;
  if (qx > 0 && qy > 0) {
    // On a corner arc.
    const t = Math.atan2(qy, qx); // 0 at the side, π/2 at top/bottom
    if (x > 0 && y < 0) return 2 * a + r * (Math.PI / 2 - t);
    if (x > 0 && y >= 0) return 2 * a + q + 2 * b + r * t;
    if (x <= 0 && y >= 0) return 4 * a + q * 2 + 2 * b + r * (Math.PI / 2 - t);
    return 4 * a + q * 3 + 4 * b + r * t;
  }
  if (qx > qy) {
    if (x > 0) return 2 * a + q + (y + b);
    return 4 * a + q * 3 + 2 * b + (b - y);
  }
  if (y < 0) return x + a;
  return 2 * a + q * 2 + 2 * b + (a - x);
}

export function roundRectLength(hw: number, hh: number, r: number): number {
  return 4 * (hw - r) + 4 * (hh - r) + 2 * Math.PI * r;
}

/** Polynomial smooth minimum (for melting two distance fields together). */
export function smin(a: number, b: number, k: number): number {
  const hh = clamp01(0.5 + (0.5 * (b - a)) / k);
  return b + (a - b) * hh - k * hh * (1 - hh);
}

/* --------------------------------------------------------------- lighting */

/**
 * The key light's direction (towards the light), from `light`: {0.5, 0.5} is the house light, up
 * and to the right (where the site's sun is drawn); moving the pointer swings it around. Shadows
 * therefore fall down and a little to the left.
 */
export function lightDir(light: { x: number; y: number }): Vec3 {
  const lx = (light.x - 0.5) * 1.7 + 0.35;
  const ly = (light.y - 0.5) * 1.7 - 0.6;
  const l = Math.hypot(lx, ly, 1);
  return [lx / l, ly / l, 1 / l];
}

/** The half vector between the light and a viewer straight in front. */
export function halfVec(L: Vec3): Vec3 {
  const x = L[0];
  const y = L[1];
  const z = L[2] + 1;
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

/** Surface normals of a height field (pixels of height per pixel of distance, times `k`). */
export function normals(hgt: Float32Array, w: number, h: number, k = 1) {
  const n = w * h;
  const nx = new Float32Array(n);
  const ny = new Float32Array(n);
  const nz = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    const ym = y > 0 ? -w : 0;
    const yp = y < h - 1 ? w : 0;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const xm = x > 0 ? -1 : 0;
      const xp = x < w - 1 ? 1 : 0;
      const dx = (hgt[i + xp] - hgt[i + xm]) * 0.5 * k;
      const dy = (hgt[i + yp] - hgt[i + ym]) * 0.5 * k;
      const l = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      nx[i] = -dx * l;
      ny[i] = -dy * l;
      nz[i] = l;
    }
  }
  return { nx, ny, nz };
}

/* ---------------------------------------------------------------- shadows */

export type ShadowOpts = {
  /** Blur radius (≈ sigma) in pixels. */
  blur: number;
  dx: number;
  dy: number;
  opacity: number;
  /** Grow (>0) the silhouette before blurring, as a coverage multiplier. */
  spread?: number;
  color?: RGB;
};

/**
 * A soft, navy-tinted shadow of a coverage field (in the art's crop), blurred at reduced resolution
 * with room for its blur, and stretched back over `ctx` (whose origin is the crop's) offset by dx, dy.
 * `pre` is the coverage already reduced by `preF` (to share work between several shadows).
 */
export function drawShadow(
  ctx: CanvasRenderingContext2D,
  alpha: Float32Array,
  w: number,
  h: number,
  o: ShadowOpts,
  pre?: { data: Float32Array; w: number; h: number; f: number },
) {
  let f = clamp(Math.round(o.blur / 2.5), o.blur >= 1.5 ? 2 : 1, 8);
  let d: { data: Float32Array; w: number; h: number };
  if (pre && f >= pre.f) {
    const k = Math.max(1, Math.round(f / pre.f));
    d = k > 1 ? downsample(pre.data, pre.w, pre.h, k) : pre;
    f = k * pre.f;
  } else d = downsample(alpha, w, h, f);
  const m = Math.ceil((o.blur * 2.6) / f) + 1;
  const pw = d.w + m * 2;
  const ph = d.h + m * 2;
  const grid = new Float32Array(pw * ph);
  const spread = 1 + (o.spread ?? 0);
  for (let y = 0; y < d.h; y++) {
    const row = (y + m) * pw + m;
    const src = y * d.w;
    for (let x = 0; x < d.w; x++) {
      const v = d.data[src + x] * spread;
      grid[row + x] = v > 1 ? 1 : v;
    }
  }
  const b = gauss(grid, pw, ph, o.blur / f);
  const c = o.color ?? SHADOW;
  const px = new Uint8ClampedArray(pw * ph * 4);
  const k = o.opacity * 255;
  for (let i = 0, j = 0; i < b.length; i++, j += 4) {
    px[j] = c[0];
    px[j + 1] = c[1];
    px[j + 2] = c[2];
    px[j + 3] = b[i] * k;
  }
  const layer = toCanvas(px, pw, ph);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(layer, o.dx - m * f, o.dy - m * f, pw * f, ph * f);
  ctx.restore();
}

/** Coverage reduced by 2, to share between shadows. */
export function shadowBase(alpha: Float32Array, w: number, h: number) {
  const d = downsample(alpha, w, h, 2);
  return { ...d, f: 2 };
}

/**
 * The usual pair: a tight contact shadow and a wide ambient one, falling away from the light (with
 * the house light, down and slightly left: dx ≈ -0.15·dy).
 */
export function softShadows(ctx: CanvasRenderingContext2D, alpha: Float32Array, art: Art, L: Vec3, lift = 1, strength = 1) {
  const u = art.u;
  const ox = -L[0] * 0.5;
  const oy = -L[1] * 0.5 + 0.55;
  const pre = shadowBase(alpha, art.w, art.h);
  drawShadow(
    ctx,
    alpha,
    art.w,
    art.h,
    { blur: Math.max(5, u * 0.012 * lift + 1), dx: ox * u * 0.012 * lift, dy: oy * u * 0.014 * lift, opacity: 0.32 * strength },
    pre,
  );
  drawShadow(
    ctx,
    alpha,
    art.w,
    art.h,
    { blur: u * 0.05 * lift, dx: ox * u * 0.05 * lift, dy: oy * u * 0.06 * lift, opacity: 0.2 * strength },
    pre,
  );
}

/* ------------------------------------------------------------------ colour */

export function hexRGB(hex: string): RGB {
  let s = hex.trim().replace("#", "");
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const n = parseInt(s.slice(0, 6), 16);
  if (!Number.isFinite(n)) return [...PINK];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Relative luminance, 0..1, of an sRGB colour (approximate, gamma 2.2). */
export function luma(c: RGB): number {
  return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
}

export function rgbToHsl(c: RGB): RGB {
  const r = c[0] / 255;
  const g = c[1] / 255;
  const b = c[2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hh: number;
  if (max === r) hh = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) hh = (b - r) / d + 2;
  else hh = (r - g) / d + 4;
  return [hh / 6, s, l];
}

export function hslToRgb(hh: number, s: number, l: number): RGB {
  hh = ((hh % 1) + 1) % 1;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(hh + 1 / 3) * 255, f(hh) * 255, f(hh - 1 / 3) * 255];
}

function hueChan(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  else if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 0.5) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

/** HSL to RGB (0..255) written into `out`, for hot loops: no allocation. */
export function hslInto(hh: number, s: number, l: number, out: Float32Array) {
  hh -= Math.floor(hh);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  out[0] = hueChan(p, q, hh + 1 / 3) * 255;
  out[1] = hueChan(p, q, hh) * 255;
  out[2] = hueChan(p, q, hh - 1 / 3) * 255;
}

export function mixRGB(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** A colour as a CSS rgba() string. */
export function css(c: RGB, a = 1): string {
  return `rgba(${Math.round(clamp(c[0], 0, 255))},${Math.round(clamp(c[1], 0, 255))},${Math.round(clamp(c[2], 0, 255))},${a})`;
}

/** Shifts lightness in HSL (dl in -1..1) and optionally saturation. */
export function shade(c: RGB, dl: number, ds = 0): RGB {
  const [hh, s, l] = rgbToHsl(c);
  return hslToRgb(hh, clamp01(s + ds), clamp01(l + dl));
}

/**
 * K-means palette of a set of colours (flat [r,g,b,...]), deterministic: centres start at evenly
 * spaced luminance quantiles, are fitted on an even subsample, then every colour is assigned to its
 * nearest centre. Returns the centres and each colour's index.
 */
export function kmeans(cols: Float32Array, k: number, iterations = 8, maxFit = 4000) {
  const n = cols.length / 3;
  k = Math.max(1, Math.min(k, n));
  // Seeds: mean colour of the luminance bin at each quantile.
  const lum = new Uint8Array(n);
  const hist = new Int32Array(256);
  for (let i = 0; i < n; i++) {
    const l = Math.min(255, Math.max(0, Math.round(cols[i * 3] * 0.3 + cols[i * 3 + 1] * 0.59 + cols[i * 3 + 2] * 0.11)));
    lum[i] = l;
    hist[l]++;
  }
  const binOf = new Int32Array(k);
  let acc = 0;
  let j = 0;
  for (let b = 0; b < 256 && j < k; b++) {
    acc += hist[b];
    while (j < k && acc >= ((j + 0.5) / k) * n) binOf[j++] = b;
  }
  for (; j < k; j++) binOf[j] = 255;
  const cent = new Float32Array(k * 3);
  const sum = new Float64Array(k * 3);
  const cnt = new Int32Array(k);
  for (let i = 0; i < n; i++) {
    for (let q = 0; q < k; q++) {
      if (lum[i] !== binOf[q]) continue;
      sum[q * 3] += cols[i * 3];
      sum[q * 3 + 1] += cols[i * 3 + 1];
      sum[q * 3 + 2] += cols[i * 3 + 2];
      cnt[q]++;
    }
  }
  for (let q = 0; q < k; q++) {
    const c = cnt[q] || 1;
    cent[q * 3] = sum[q * 3] / c;
    cent[q * 3 + 1] = sum[q * 3 + 1] / c;
    cent[q * 3 + 2] = sum[q * 3 + 2] / c;
  }
  const nearest = (i: number) => {
    let best = 0;
    let bd = Infinity;
    const r = cols[i * 3];
    const g = cols[i * 3 + 1];
    const b = cols[i * 3 + 2];
    for (let q = 0; q < k; q++) {
      const dr = r - cent[q * 3];
      const dg = g - cent[q * 3 + 1];
      const db = b - cent[q * 3 + 2];
      const dd = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      if (dd < bd) {
        bd = dd;
        best = q;
      }
    }
    return best;
  };
  const stride = Math.max(1, Math.floor(n / maxFit));
  for (let it = 0; it < iterations; it++) {
    sum.fill(0);
    cnt.fill(0);
    for (let i = 0; i < n; i += stride) {
      const q = nearest(i);
      sum[q * 3] += cols[i * 3];
      sum[q * 3 + 1] += cols[i * 3 + 1];
      sum[q * 3 + 2] += cols[i * 3 + 2];
      cnt[q]++;
    }
    for (let q = 0; q < k; q++) {
      if (!cnt[q]) continue;
      cent[q * 3] = sum[q * 3] / cnt[q];
      cent[q * 3 + 1] = sum[q * 3 + 1] / cnt[q];
      cent[q * 3 + 2] = sum[q * 3 + 2] / cnt[q];
    }
  }
  const idx = new Int32Array(n);
  for (let i = 0; i < n; i++) idx[i] = nearest(i);
  return { cent, idx, k };
}

/* --------------------------------------------------------------- drawing */

/**
 * The output: a blank canvas the size of the source, with a context whose origin is the art's crop,
 * so layers and paths in crop coordinates land in place.
 */
export function output(art: Art) {
  const c = makeCanvas(art.W, art.H);
  const ctx = ctxOf(c);
  ctx.translate(art.ox, art.oy);
  return { canvas: c, ctx };
}
