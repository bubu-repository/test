/*
 * Glitter glue: a raised bead of glossy glue (rounded like a liquid that dried) packed with glitter
 * flakes. Every flake is a tiny tilted mirror, so only the ones facing the light flash; `phase`
 * circles the light a little so different flakes take turns. A photo gets a glitter-glue line
 * traced round its outline and a sprinkle of flakes over it.
 */

import {
  clamp01,
  downsample,
  gauss,
  hash2,
  hexRGB,
  hslToRgb,
  hslInto,
  lightDir,
  output,
  readArt,
  rgbToHsl,
  shade,
  signedDistance,
  softShadows,
  toCanvas,
  upsample,
  type Vec3,
} from "./core";
import type { MaterialInput } from "./types";

export function glitter(input: MaterialInput): HTMLCanvasElement {
  const art = readArt(input, (u) => u * 0.1 + 8);
  const { w, h, u, photo } = art;
  const L0 = lightDir(input.light);
  const ph = input.phase * Math.PI * 2;
  let L: Vec3 = [L0[0] + 0.2 * Math.cos(ph), L0[1] + 0.2 * Math.sin(ph), L0[2]];
  const ll = Math.hypot(L[0], L[1], L[2]);
  L = [L[0] / ll, L[1] / ll, L[2] / ll];
  const hl = Math.hypot(L[0], L[1], L[2] + 1);
  const [hx, hy, hz] = [L[0] / hl, L[1] / hl, (L[2] + 1) / hl];
  const base = hexRGB(input.color);
  const hsl = rgbToHsl(base);
  const dark = hslToRgb(hsl[0], Math.min(1, hsl[1] * 1.1), hsl[2] * 0.32);
  const mid = hslToRgb(hsl[0], Math.min(1, hsl[1] * 1.05), Math.min(0.62, hsl[2] * 0.85));
  const lite = shade(base, 0.25);
  const hc = new Float32Array(3);
  const f = 2;
  const n = w * h;

  // --- The glue bead ---
  const a2 = downsample(art.alpha, w, h, f);
  const gw = a2.w;
  const gh = a2.h;
  let glueSd2: Float32Array;
  let bead: number;
  let sdPhoto: Float32Array | null = null;
  if (!photo) {
    // Squeezed from a tube: corners soften, the bead rounds over.
    const soft = gauss(a2.data, gw, gh, (u * 0.016) / f);
    glueSd2 = signedDistance(soft, gw, gh);
    for (let i = 0; i < glueSd2.length; i++) glueSd2[i] = glueSd2[i] * f - u * 0.006;
    bead = u * 0.06;
  } else {
    const sd2 = signedDistance(a2.data, gw, gh);
    sdPhoto = upsample(sd2, gw, gh, w, h, f);
    bead = u * 0.032;
    glueSd2 = new Float32Array(gw * gh);
    for (let i = 0; i < glueSd2.length; i++) glueSd2[i] = Math.abs(sd2[i] * f + bead * 0.15) - bead;
    glueSd2 = gauss(glueSd2, gw, gh, 1);
  }
  const glueSd = upsample(glueSd2, gw, gh, w, h);
  const Hg = bead * (photo ? 0.9 : 0.75);
  const hgt = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const d = glueSd[i];
    if (d > 1) continue;
    const t = clamp01(-d / bead);
    // A meniscus: steep at the edge, flattening on top.
    hgt[i] = Hg * Math.sqrt(1 - (1 - t) * (1 - t));
  }

  // --- Flakes: a jittered grid, nearest point wins (Voronoi) ---
  const c = Math.max(2.2, u * 0.0105);
  const cw = Math.ceil(w / c) + 2;
  const ch = Math.ceil(h / c) + 2;
  const nc = cw * ch;
  const jx = new Float32Array(nc);
  const jy = new Float32Array(nc);
  const fnx = new Float32Array(nc);
  const fny = new Float32Array(nc);
  const kind = new Float32Array(nc);
  for (let j = 0; j < ch; j++) {
    for (let i = 0; i < cw; i++) {
      const k = j * cw + i;
      jx[k] = (i + 0.15 + hash2(i, j, input.seed + 1) * 0.7) * c;
      jy[k] = (j + 0.15 + hash2(i, j, input.seed + 2) * 0.7) * c;
      const a = hash2(i, j, input.seed + 3) * Math.PI * 2;
      const t = Math.sqrt(hash2(i, j, input.seed + 4)) * 0.95;
      fnx[k] = Math.cos(a) * t;
      fny[k] = Math.sin(a) * t;
      kind[k] = hash2(i, j, input.seed + 5);
    }
  }
  // Sparse sprinkles for photos: bigger flakes on a coarser grid, mostly empty.
  const c2 = c * 2.6;

  const px = new Uint8ClampedArray(n * 4);
  const mask = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const d = glueSd[i];
      const inGlue = d < 0.5;
      let sprinkle = false;
      if (!inGlue) {
        if (!photo || !sdPhoto || sdPhoto[i] > -1) continue;
        // On the photo: a sparse sprinkle of loose glitter.
        const ci = Math.floor(x / c2);
        const cj = Math.floor(y / c2);
        if (hash2(ci, cj, input.seed + 8) > 0.07) continue;
        const ox = (ci + 0.3 + hash2(ci, cj, input.seed + 9) * 0.4) * c2;
        const oy = (cj + 0.3 + hash2(ci, cj, input.seed + 10) * 0.4) * c2;
        const rr = c * (0.32 + hash2(ci, cj, input.seed + 11) * 0.3);
        if ((x + 0.5 - ox) ** 2 + (y + 0.5 - oy) ** 2 > rr * rr) continue;
        sprinkle = true;
      }
      // Surface normal of the glue.
      let snx = 0;
      let sny = 0;
      let snz = 1;
      if (inGlue) {
        const hdx = (hgt[x + 1 < w ? i + 1 : i] - hgt[x > 0 ? i - 1 : i]) * 0.5;
        const hdy = (hgt[y + 1 < h ? i + w : i] - hgt[y > 0 ? i - w : i]) * 0.5;
        snz = 1 / Math.sqrt(hdx * hdx + hdy * hdy + 1);
        snx = -hdx * snz;
        sny = -hdy * snz;
      }
      // Nearest flake.
      const gx = Math.floor(x / c);
      const gy = Math.floor(y / c);
      let d1 = 1e9;
      let d2 = 1e9;
      let best = 0;
      for (let j = gy - 1; j <= gy + 1; j++) {
        if (j < 0 || j >= ch) continue;
        for (let k = gx - 1; k <= gx + 1; k++) {
          if (k < 0 || k >= cw) continue;
          const id = j * cw + k;
          const dx = jx[id] - x - 0.5;
          const dy = jy[id] - y - 0.5;
          const dd = dx * dx + dy * dy;
          if (dd < d1) {
            d2 = d1;
            d1 = dd;
            best = id;
          } else if (dd < d2) d2 = dd;
        }
      }
      const gap = Math.sqrt(d2) - Math.sqrt(d1);
      // Flake normal: its own tilt on top of the glue's surface.
      let nx = fnx[best] + snx * 0.8;
      let ny = fny[best] + sny * 0.8;
      let nz = 1;
      const nl = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx *= nl;
      ny *= nl;
      nz *= nl;
      const nh = Math.max(0, nx * hx + ny * hy + nz * hz);
      let s8 = nh * nh;
      s8 *= s8;
      s8 *= s8;
      let s64 = s8 * s8;
      s64 *= s64;
      s64 *= s64;
      const kd = kind[best];
      let r: number;
      let g: number;
      let b: number;
      const v = 0.18 + 0.82 * s8;
      if (kd > 0.95) {
        // Holographic flakes: the colour turns with the angle.
        hslInto(hsl[0] + (kd - 0.975) * 8 + nx * 0.6 + ny * 0.4, 0.8, 0.3 + 0.5 * v, hc);
        r = hc[0];
        g = hc[1];
        b = hc[2];
      } else if (kd > 0.9) {
        // A few silver flakes.
        r = 90 + 165 * v;
        g = 96 + 159 * v;
        b = 110 + 145 * v;
      } else {
        const t = v < 0.5 ? v * 2 : (v - 0.5) * 2;
        if (v < 0.5) {
          r = dark[0] + (mid[0] - dark[0]) * t;
          g = dark[1] + (mid[1] - dark[1]) * t;
          b = dark[2] + (mid[2] - dark[2]) * t;
        } else {
          r = mid[0] + (lite[0] - mid[0]) * t;
          g = mid[1] + (lite[1] - mid[1]) * t;
          b = mid[2] + (lite[2] - mid[2]) * t;
        }
      }
      // The flash.
      const flash = s64 * 1.1;
      r += 255 * flash;
      g += 255 * flash;
      b += 255 * flash;
      // Glue shows between flakes.
      const gk = clamp01(gap / (c * 0.12));
      const gl = 0.55 + 0.45 * gk;
      r *= gl;
      g *= gl;
      b *= gl;
      let a = 1;
      if (inGlue) {
        // The clear glue on top: a gloss highlight and a darker, thinner rim.
        const sh = Math.max(0, snx * hx + sny * hy + snz * hz);
        let gl8 = sh * sh;
        gl8 *= gl8;
        gl8 *= gl8;
        let gl64 = gl8 * gl8;
        gl64 *= gl64;
        gl64 *= gl64;
        const gloss = gl64 * 0.85 + gl8 * 0.07;
        const rim = 0.62 + 0.38 * snz;
        r = r * rim + (255 - r * rim) * gloss;
        g = g * rim + (255 - g * rim) * gloss;
        b = b * rim + (255 - b * rim) * gloss;
        a = clamp01(0.5 - d);
        // The thin edge of the glue is clearer.
        const edge = clamp01(-d / (bead * 0.18));
        a *= 0.55 + 0.45 * edge;
        r = r * (0.6 + 0.4 * edge) + mid[0] * (1 - edge) * 0.4;
        g = g * (0.6 + 0.4 * edge) + mid[1] * (1 - edge) * 0.4;
        b = b * (0.6 + 0.4 * edge) + mid[2] * (1 - edge) * 0.4;
      } else if (sprinkle) {
        // Loose flakes catch the light more than they show colour.
        r = r * 0.7 + 255 * 0.3;
        g = g * 0.7 + 255 * 0.3;
        b = b * 0.7 + 255 * 0.3;
        a = 0.95;
      }
      if (photo && !inGlue && !sprinkle) continue;
      const j = i * 4;
      px[j] = r;
      px[j + 1] = g;
      px[j + 2] = b;
      px[j + 3] = a * 255;
      mask[i] = inGlue ? a : 0;
    }
  }

  const { canvas, ctx } = output(art);
  if (photo) {
    softShadows(ctx, art.alpha, art, L0, 0.7);
    ctx.drawImage(input.source, -art.ox, -art.oy);
    softShadows(ctx, mask, art, L0, 0.35, 0.8);
  } else {
    softShadows(ctx, mask, art, L0, 0.75);
  }
  ctx.drawImage(toCanvas(px, w, h), 0, 0);
  return canvas;
}
