/*
 * Crumpled foil, smoothed out again: the art as a piece of metal foil (edges a little ragged), its
 * surface broken into facets at several scales with soft creases between them, each facet a tilted
 * mirror. Tinted by `color` (gold by default). `phase` swings the light in a small circle so the
 * facets shimmer. A photo is printed on the foil: its colours stay, with the sheen and creases over.
 */

import {
  clamp01,
  downsample,
  gauss,
  hash2,
  hexRGB,
  hslToRgb,
  lightDir,
  noiseField,
  output,
  readArt,
  rgbToHsl,
  signedDistance,
  softShadows,
  toCanvas,
  upsample,
  type Vec3,
} from "./core";
import type { MaterialInput } from "./types";

/**
 * Adds a crumple to the height field: Voronoi cells of size `c`, each a soft pillow rising from
 * sharp creases along its edges, tipped at its own small angle.
 */
function crumple(hgt: Float32Array, w: number, h: number, c: number, amp: number, seed: number) {
  const cw = Math.ceil(w / c) + 2;
  const ch = Math.ceil(h / c) + 2;
  const n = cw * ch;
  const px = new Float32Array(n);
  const py = new Float32Array(n);
  const ax = new Float32Array(n);
  const ay = new Float32Array(n);
  const lift = new Float32Array(n);
  for (let j = 0; j < ch; j++) {
    for (let i = 0; i < cw; i++) {
      const k = j * cw + i;
      px[k] = (i + 0.1 + hash2(i, j, seed) * 0.8) * c;
      py[k] = (j + 0.1 + hash2(i, j, seed + 1) * 0.8) * c;
      const a = hash2(i, j, seed + 2) * Math.PI * 2;
      const t = hash2(i, j, seed + 3) * 0.55;
      ax[k] = Math.cos(a) * t;
      ay[k] = Math.sin(a) * t;
      lift[k] = 0.6 + hash2(i, j, seed + 4) * 0.8;
    }
  }
  const inv = 1 / c;
  for (let y = 0; y < h; y++) {
    const gy = Math.floor(y * inv);
    for (let x = 0; x < w; x++) {
      const gx = Math.floor(x * inv);
      let d1 = 1e9;
      let d2 = 1e9;
      let best = 0;
      for (let j = gy - 1; j <= gy + 1; j++) {
        if (j < 0 || j >= ch) continue;
        for (let i = gx - 1; i <= gx + 1; i++) {
          if (i < 0 || i >= cw) continue;
          const k = j * cw + i;
          const dx = px[k] - x;
          const dy = py[k] - y;
          const dd = dx * dx + dy * dy;
          if (dd < d1) {
            d2 = d1;
            d1 = dd;
            best = k;
          } else if (dd < d2) d2 = dd;
        }
      }
      // Distance to the nearest edge (≈ half of F2 - F1), as a fraction of the cell.
      const e = (Math.sqrt(d2) - Math.sqrt(d1)) * inv;
      const pillow = Math.sqrt(Math.min(1, e * 2.2));
      const tip = ((x - px[best]) * ax[best] + (y - py[best]) * ay[best]) * inv;
      hgt[y * w + x] += amp * (pillow * lift[best] + tip);
    }
  }
}

export function foil(input: MaterialInput): HTMLCanvasElement {
  const art = readArt(input, (u) => u * 0.05 + 8);
  const { w, h, u, photo } = art;
  const L0 = lightDir(input.light);
  const ph = input.phase * Math.PI * 2;
  let L: Vec3 = [L0[0] + 0.22 * Math.cos(ph), L0[1] + 0.22 * Math.sin(ph), L0[2]];
  const ll = Math.hypot(L[0], L[1], L[2]);
  L = [L[0] / ll, L[1] / ll, L[2] / ll];
  const hl = Math.hypot(L[0], L[1], L[2] + 1);
  const hx = L[0] / hl;
  const hy = L[1] / hl;
  const hz = (L[2] + 1) / hl;
  const base = hexRGB(input.color);
  const hsl = rgbToHsl(base);
  const dark = hslToRgb(hsl[0] - 0.015, Math.min(1, hsl[1] * 1.3 + 0.1), hsl[2] * 0.3);
  const mid = base;
  const bright = hslToRgb(hsl[0], hsl[1] * 0.7, Math.min(0.96, hsl[2] * 0.4 + 0.6));
  const f = 2;
  const n = w * h;

  // The foil piece: slightly larger than the art, its edge ragged where it was crumpled.
  const a2 = downsample(art.alpha, w, h, f);
  const gw = a2.w;
  const gh = a2.h;
  const sd2 = signedDistance(a2.data, gw, gh);
  const rag = noiseField(gw, gh, (u * 0.05) / f, input.seed + 4, 3);
  for (let i = 0; i < sd2.length; i++) sd2[i] = sd2[i] * f - (photo ? 0 : u * 0.012) + rag[i] * u * (photo ? 0.004 : 0.008);
  const sd = upsample(sd2, gw, gh, w, h);

  // Crumples at two scales on the half grid; normals there, then interpolated.
  const h2 = new Float32Array(gw * gh);
  crumple(h2, gw, gh, (u * (photo ? 0.16 : 0.22)) / f, (u * 0.016) / f, input.seed + 10);
  crumple(h2, gw, gh, (u * (photo ? 0.06 : 0.075)) / f, (u * 0.005) / f, input.seed + 20);
  // Big soft undulations: the sheet isn't flat after smoothing.
  const wave = noiseField(gw, gh, (u * 0.5) / f, input.seed + 30, 2);
  for (let i = 0; i < h2.length; i++) h2[i] += wave[i] * ((u * 0.05) / f);
  const hs2 = gauss(h2, gw, gh, 0.6);
  const nx2 = new Float32Array(gw * gh);
  const ny2 = new Float32Array(gw * gh);
  for (let y = 1; y < gh - 1; y++) {
    for (let x = 1; x < gw - 1; x++) {
      const i = y * gw + x;
      nx2[i] = -(hs2[i + 1] - hs2[i - 1]) * 0.5;
      ny2[i] = -(hs2[i + gw] - hs2[i - gw]) * 0.5;
    }
  }
  const TX = upsample(nx2, gw, gh, w, h);
  const TY = upsample(ny2, gw, gh, w, h);
  const grain = noiseField(w, h, Math.max(2, u * 0.006), input.seed + 40, 1);

  const px = new Uint8ClampedArray(n * 4);
  const mask = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const d = sd[i];
      if (d > 0.5) continue;
      const a = photo ? Math.min(clamp01(0.5 - d), art.alpha[i] > 0 ? 1 : 0) : clamp01(0.5 - d);
      if (a <= 0) continue;
      let nx = TX[i] + grain[i] * 0.03;
      let ny = TY[i];
      // The piece curls up a little at its edge.
      const lip = clamp01(1 + d / (u * 0.02));
      let nz = 1;
      const nl = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx *= nl;
      ny *= nl;
      nz *= nl;
      // A soft studio environment: brighter above, a band of light, darker below.
      const ry = 2 * nz * ny;
      const rx = 2 * nz * nx;
      let env = 0.5 - ry * 1.6 + rx * 0.5;
      env = clamp01(env);
      env = env * env * (3 - 2 * env);
      const nh = Math.max(0, nx * hx + ny * hy + nz * hz);
      let s = nh * nh;
      s *= s;
      s *= s;
      s *= s; // ^16
      const s16 = s;
      s *= s;
      s *= s;
      s *= s; // ^128
      let v = env * 0.7 + s16 * 0.55;
      v = clamp01(v);
      let r: number;
      let g: number;
      let b: number;
      if (photo) {
        const j = i * 4;
        const k = 0.45 + 0.85 * v;
        r = art.rgba[j] * k;
        g = art.rgba[j + 1] * k;
        b = art.rgba[j + 2] * k;
        r += (mid[0] - r) * 0.12;
        g += (mid[1] - g) * 0.12;
        b += (mid[2] - b) * 0.12;
      } else if (v < 0.5) {
        const t = v * 2;
        r = dark[0] + (mid[0] - dark[0]) * t;
        g = dark[1] + (mid[1] - dark[1]) * t;
        b = dark[2] + (mid[2] - dark[2]) * t;
      } else {
        const t = (v - 0.5) * 2;
        r = mid[0] + (bright[0] - mid[0]) * t;
        g = mid[1] + (bright[1] - mid[1]) * t;
        b = mid[2] + (bright[2] - mid[2]) * t;
      }
      const spec = s * 1.1;
      r += (255 - r) * spec;
      g += (255 - g) * spec;
      b += (255 - b) * spec;
      // A dark rolled rim, with a glint on the lit side.
      const rimK = lip * lip;
      r *= 1 - rimK * 0.35;
      g *= 1 - rimK * 0.35;
      b *= 1 - rimK * 0.35;
      const j = i * 4;
      px[j] = r;
      px[j + 1] = g;
      px[j + 2] = b;
      px[j + 3] = a * 255;
      mask[i] = a;
    }
  }

  const { canvas, ctx } = output(art);
  softShadows(ctx, mask, art, L0, 0.7);
  ctx.drawImage(toCanvas(px, w, h), 0, 0);
  return canvas;
}
