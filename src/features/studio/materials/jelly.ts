/*
 * Clear jelly, like a translucent mochi sweet: a soft dome of see-through colour, milky at the top
 * where light scatters, saturated where it pools at the bottom and in the thick middle, with a
 * dark refraction line at the very edge, light caught along the bottom inside (a caustic), a big
 * soft highlight and a sharp one, and a coloured shadow. `phase` wobbles it (squash and stretch).
 * A photo is seen through a jelly slab: magnified and bent at the edges, milky on top.
 */

import {
  clamp01,
  downsample,
  drawShadow,
  gauss,
  halfVec,
  hexRGB,
  hslToRgb,
  lightDir,
  makeCanvas,
  ctxOf,
  output,
  readArt,
  rgbToHsl,
  signedDistance,
  softShadows,
  toCanvas,
  upsample,
} from "./core";
import type { MaterialInput } from "./types";

/** The source squashed and stretched about the bottom of its art, for the wobble. */
function wobble(input: MaterialInput): MaterialInput {
  const s = Math.sin(input.phase * Math.PI * 2);
  const k = Math.sin(input.phase * Math.PI * 4) * 0.5;
  if (Math.abs(s) < 1e-4 && Math.abs(k) < 1e-4) return input;
  const probe = readArt(input, 0);
  const ax = probe.ox + probe.cx;
  const ay = probe.oy + probe.y1;
  const src = input.source;
  const c = makeCanvas(src.width, src.height);
  const ctx = ctxOf(c);
  ctx.translate(ax, ay);
  ctx.transform(1, 0, -0.035 * k, 1, 0, 0);
  ctx.scale(1 - 0.035 * s, 1 + 0.05 * s);
  ctx.translate(-ax, -ay);
  ctx.drawImage(src, 0, 0);
  return { ...input, source: c };
}

export function jelly(input: MaterialInput): HTMLCanvasElement {
  const art = readArt(wobble(input), (u) => u * 0.06 + 8);
  const { w, h, u, photo } = art;
  const L = lightDir(input.light);
  const [hx, hy, hz] = halfVec(L);
  const [lx, ly] = L;
  const base = hexRGB(input.color);
  const hsl = rgbToHsl(base);
  const deep = hslToRgb(hsl[0], Math.min(1, hsl[1] * 1.2 + 0.1), hsl[2] * 0.72);
  const vivid = hslToRgb(hsl[0], 1, Math.max(0.5, Math.min(0.62, hsl[2] + 0.08)));
  const mid = hslToRgb(hsl[0], Math.min(1, hsl[1] * 1.05), Math.min(0.62, hsl[2] * 0.95 + 0.04));
  const milk = hslToRgb(hsl[0], hsl[1] * 0.55, 0.93);
  const clear = hslToRgb(hsl[0], Math.min(1, hsl[1] * 0.95), 0.74);
  const f = 2;
  const n = w * h;

  // A soft, rounded body.
  const a2 = downsample(art.alpha, w, h, f);
  const gw = a2.w;
  const gh = a2.h;
  const soft = photo ? a2.data : gauss(a2.data, gw, gh, (u * 0.014) / f);
  const sd2 = signedDistance(soft, gw, gh);
  let maxIn = 1;
  for (let i = 0; i < sd2.length; i++) if (-sd2[i] * f > maxIn) maxIn = -sd2[i] * f;
  const R = photo ? u * 0.085 : Math.min(maxIn * 1.05, u * 0.17);
  // Height on the coarse grid, smoothed there, then brought up: soft and free of ripples.
  const h2 = new Float32Array(gw * gh);
  for (let i = 0; i < h2.length; i++) {
    const t = clamp01((-sd2[i] * f + 0.5) / R);
    h2[i] = R * Math.sqrt(1 - (1 - t) * (1 - t));
  }
  const hs = upsample(gauss(h2, gw, gh, Math.max(1, (u * 0.012) / f)), gw, gh, w, h);
  const sd = upsample(sd2, gw, gh, w, h, f);

  const px = new Uint8ClampedArray(n * 4);
  const mask = new Float32Array(n);
  const y0 = art.y0;
  const bh = art.bh || 1;
  for (let y = 0; y < h; y++) {
    const yn = clamp01((y - y0) / bh);
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const d = sd[i];
      if (d > 1) continue;
      const cov = clamp01(0.5 - d);
      const hdx = (hs[x + 1 < w ? i + 1 : i] - hs[x > 0 ? i - 1 : i]) * 0.5;
      const hdy = (hs[y + 1 < h ? i + w : i] - hs[y > 0 ? i - w : i]) * 0.5;
      const nz = 1 / Math.sqrt(hdx * hdx + hdy * hdy + 1);
      const nx = -hdx * nz;
      const ny = -hdy * nz;
      const th = clamp01(hs[i] / R);
      const edge = 1 - nz; // 0 facing us, → 1 at the silhouette
      let r: number;
      let g: number;
      let b: number;
      if (photo) {
        // The photo through the slab: bent towards the edges (magnified), tinted, milky on top.
        const k = R * 0.45;
        const sx = Math.max(0, Math.min(w - 1.001, x - nx * k));
        const sy = Math.max(0, Math.min(h - 1.001, y - ny * k));
        const xi = sx | 0;
        const yi = sy | 0;
        const tx = sx - xi;
        const ty = sy - yi;
        const j00 = (yi * w + xi) * 4;
        const j10 = j00 + 4;
        const j01 = j00 + w * 4;
        const j11 = j01 + 4;
        const P = art.rgba;
        const w00 = (1 - tx) * (1 - ty);
        const w10 = tx * (1 - ty);
        const w01 = (1 - tx) * ty;
        const w11 = tx * ty;
        r = P[j00] * w00 + P[j10] * w10 + P[j01] * w01 + P[j11] * w11;
        g = P[j00 + 1] * w00 + P[j10 + 1] * w10 + P[j01 + 1] * w01 + P[j11 + 1] * w11;
        b = P[j00 + 2] * w00 + P[j10 + 2] * w10 + P[j01 + 2] * w01 + P[j11 + 2] * w11;
        const tint = 0.08 + 0.4 * edge;
        r += (deep[0] - r) * tint;
        g += (deep[1] - g) * tint;
        b += (deep[2] - b) * tint;
        const haze = clamp01((0.5 - yn) * 1.4) * 0.3;
        r += (milk[0] - r) * haze;
        g += (milk[1] - g) * haze;
        b += (milk[2] - b) * haze;
      } else {
        // Seen through: light in the middle, saturated where the view grazes the edges and where
        // the colour pools at the bottom.
        const pool = clamp01(Math.pow(edge, 1.1) * 1.25 + yn * yn * 0.45 - 0.05);
        const lite = clear;
        r = lite[0] + (deep[0] - lite[0]) * pool;
        g = lite[1] + (deep[1] - lite[1]) * pool;
        b = lite[2] + (deep[2] - lite[2]) * pool;
        // Light travelling through the body glows vivid just inside the edges.
        const gb = (edge - 0.32) / 0.2;
        const glowK = Math.exp(-gb * gb) * 0.55;
        r += (vivid[0] - r) * glowK;
        g += (vivid[1] - g) * glowK;
        b += (vivid[2] - b) * glowK;
        // Milky haze in the top of the body.
        const haze = clamp01(1.05 - yn * 1.6) * clamp01(0.45 - ny * 1.4) * (0.3 + 0.7 * th) * 0.9;
        r += (milk[0] - r) * haze;
        g += (milk[1] - g) * haze;
        b += (milk[2] - b) * haze;
      }
      // Caustic: light focused on the inside of the far (lower) wall.
      const cx2 = -(nx * lx + ny * ly);
      const caustic = clamp01(cx2 * 1.8 - 0.1) * Math.exp(-((th - 0.5) * (th - 0.5)) / 0.08) * (photo ? 0.3 : 0.85);
      const cr = milk[0] * 0.6 + mid[0] * 0.4;
      const cg = milk[1] * 0.6 + mid[1] * 0.4;
      const cbb = milk[2] * 0.6 + mid[2] * 0.4;
      r += (cr - r) * caustic;
      g += (cg - g) * caustic;
      b += (cbb - b) * caustic;
      // The thin refraction line right at the silhouette, in the deep colour.
      const rl = (d + 1.2) / 1.3;
      const rim = Math.exp(-rl * rl) * 0.35;
      r += (deep[0] * 0.85 - r) * rim;
      g += (deep[1] * 0.85 - g) * rim;
      b += (deep[2] * 0.85 - b) * rim;
      // Highlights: a big soft sheen, a sharp window, and the lit rim catching the sky.
      const nh = Math.max(0, nx * hx + ny * hy + nz * hz);
      let s = nh * nh;
      s *= s;
      s *= s; // ^8
      const soft8 = s;
      s *= s;
      s *= s; // ^32
      s *= s;
      s *= s; // ^128
      let s2 = s * s;
      s2 *= s2; // ^512
      const litRim = edge * edge * clamp01(-(nx * L[0] + ny * L[1]) * 3 - 0.2);
      const spec = soft8 * 0.26 + clamp01(s2 * 2.5) * 0.95 + s * 0.3 + litRim * 0.55;
      r += (255 - r) * spec;
      g += (255 - g) * spec;
      b += (255 - b) * spec;
      // See-through: the middle lets the page through a little, the edges much less.
      const a = cov * (photo ? 0.97 : 0.7 + 0.3 * Math.sqrt(edge)) + spec * 0.3;
      const j = i * 4;
      px[j] = r;
      px[j + 1] = g;
      px[j + 2] = b;
      px[j + 3] = clamp01(a) * 255;
      mask[i] = cov;
    }
  }

  const { canvas, ctx } = output(art);
  // A coloured shadow: navy where the jelly blocks light, the jelly's colour where it focuses it.
  softShadows(ctx, mask, art, L, 1, 0.55);
  const er = new Float32Array(n);
  for (let i = 0; i < n; i++) er[i] = clamp01((-sd[i] - R * 0.35) / (R * 0.3));
  const tint = hslToRgb(hsl[0], Math.min(1, hsl[1] * 1.1), 0.6);
  drawShadow(ctx, er, w, h, { blur: u * 0.035, dx: -L[0] * u * 0.045, dy: -L[1] * u * 0.08 + u * 0.05, opacity: 0.45, color: tint });
  ctx.drawImage(toCanvas(px, w, h), 0, 0);
  return canvas;
}
