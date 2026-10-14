/*
 * Felt: the art cut from thick felt a little larger than itself, stuffed so the art puffs up like a
 * plush, with a running stitch in contrasting thread along the art's outline. A photo is printed
 * on a felt patch and stitched around.
 */

import {
  clamp01,
  ctxOf,
  downsample,
  gauss,
  hexRGB,
  gridPaths,
  fillHoles,
  lightDir,
  luma,
  makeCanvas,
  noiseField,
  normals,
  readArt,
  rng,
  shade,
  signedDistance,
  softShadows,
  toCanvas,
  upsample,
  css,
  output,
  resamplePath,
  sample,
  type RGB,
} from "./core";
import { drawStitches, runningStitch } from "./stitch";
import type { MaterialInput } from "./types";

const TILE = 256;
let fibreTile: Float32Array | null = null;

/** A tileable field of felt fibres (short random curls, lighter and darker), made once. */
export function feltFibres(): Float32Array {
  if (fibreTile) return fibreTile;
  const c = makeCanvas(TILE, TILE);
  const ctx = ctxOf(c, true);
  ctx.fillStyle = "rgb(128,128,128)";
  ctx.fillRect(0, 0, TILE, TILE);
  const r = rng(4242);
  ctx.lineCap = "round";
  for (let batch = 0; batch < 16; batch++) {
    const light = batch % 2 === 0;
    ctx.strokeStyle = light ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.2)";
    ctx.lineWidth = 0.55 + (batch % 3) * 0.2;
    ctx.beginPath();
    for (let i = 0; i < 260; i++) {
      const x = r() * TILE;
      const y = r() * TILE;
      const a = r() * Math.PI * 2;
      const len = 3 + r() * 10;
      const bend = (r() - 0.5) * 1.4;
      for (const ox of [-TILE, 0, TILE]) {
        for (const oy of [-TILE, 0, TILE]) {
          const sx = x + ox;
          const sy = y + oy;
          if (sx < -14 || sx > TILE + 14 || sy < -14 || sy > TILE + 14) continue;
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(
            sx + Math.cos(a + bend) * len * 0.5,
            sy + Math.sin(a + bend) * len * 0.5,
            sx + Math.cos(a) * len,
            sy + Math.sin(a) * len,
          );
        }
      }
    }
    ctx.stroke();
  }
  const px = ctx.getImageData(0, 0, TILE, TILE).data;
  const f = new Float32Array(TILE * TILE);
  for (let i = 0; i < f.length; i++) f[i] = (px[i * 4] - 128) / 128;
  fibreTile = f;
  return f;
}

/** Samples the fibre tile (wrapping, bilinear) at a scale. */
export function fibreAt(tile: Float32Array, x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const tx = x - xi;
  const ty = y - yi;
  const x0 = xi & (TILE - 1);
  const y0 = yi & (TILE - 1);
  const x1 = (x0 + 1) & (TILE - 1);
  const y1 = (y0 + 1) & (TILE - 1);
  const a = tile[y0 * TILE + x0];
  const b = tile[y0 * TILE + x1];
  const c = tile[y1 * TILE + x0];
  const d = tile[y1 * TILE + x1];
  const top = a + (b - a) * tx;
  return top + (c + (d - c) * tx - top) * ty;
}

export function felt(input: MaterialInput): HTMLCanvasElement {
  const art = readArt(input, (u) => u * 0.1 + 12);
  const { w, h, u, photo } = art;
  const L = lightDir(input.light);
  const base = hexRGB(input.color);
  const f = 2;

  // Distances at half resolution, in full-res pixels.
  const a2 = downsample(art.alpha, w, h, f);
  const sd2 = signedDistance(a2.data, a2.w, a2.h);
  const D = Math.min(u * (photo ? 0.065 : 0.055), art.pad * 0.42);
  const wob = noiseField(a2.w, a2.h, (u * 0.12) / f, input.seed + 3, 2);
  const fe2 = new Float32Array(sd2.length);
  for (let i = 0; i < fe2.length; i++) fe2[i] = sd2[i] * f - D + wob[i] * u * 0.007;
  // Felt can't be cut with tiny holes: small counters stay closed.
  fillHoles(fe2, a2.w, a2.h, ((u * 0.3) / f) ** 2, true, -D * 0.5);
  const feS = gauss(fe2, a2.w, a2.h, (u * 0.014) / f);
  const feltDist = upsample(feS, a2.w, a2.h, w, h);
  const sd = upsample(sd2, a2.w, a2.h, w, h, f);
  const pil = upsample(gauss(a2.data, a2.w, a2.h, (u * (photo ? 0.06 : 0.035)) / f), a2.w, a2.h, w, h);

  // Thread and stitch geometry.
  const tw = Math.max(2, u * (photo ? 0.011 : 0.016));
  const stitchLevel = photo ? D * 0.45 : tw * 0.4;
  const thread: RGB = luma(base) > 0.8 ? shade(base, -0.42, 0.1) : [255, 249, 238];

  // Height: a thin felt margin with a rounded cut edge, the art stuffed into a pillow, and a groove
  // where the stitch pulls the two layers together.
  const T = u * 0.02;
  const Hp = u * (photo ? 0.05 : 0.075);
  const hgt = new Float32Array(w * h);
  const tile = feltFibres();
  const fs = Math.max(0.6, u / 300);
  const cov = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const fd = feltDist[i];
      if (fd > 3) continue;
      const fib = fibreAt(tile, x / fs, y / fs);
      // Fuzzy, slightly hairy cut edge.
      cov[i] = clamp01(0.5 - fd + fib * 0.9);
      const e = clamp01(-fd / T);
      let hh = T * Math.sqrt(1 - (1 - e) * (1 - e));
      const p = clamp01((pil[i] - 0.5) * 2);
      hh += Hp * (photo ? p * 0.5 : Math.sqrt(p));
      const g = (sd[i] - stitchLevel) / (tw * 1.3);
      hh -= u * 0.007 * Math.exp(-g * g);
      hgt[i] = hh;
    }
  }
  const { nx, ny, nz } = normals(hgt, w, h, 1);
  const mottle = noiseField(w, h, u * 0.18, input.seed + 11, 3);

  const px = new Uint8ClampedArray(w * h * 4);
  const [lx, ly, lz] = L;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const c = cov[i];
      if (c <= 0) continue;
      const fib = fibreAt(tile, x / fs, y / fs);
      const nl = nx[i] * lx + ny[i] * ly + nz[i] * lz;
      // Wrapped diffuse, low contrast: felt scatters light, it never shines.
      let lit = 0.58 + 0.42 * clamp01((nl + 0.3) / 1.3);
      // Fuzz catches light at grazing angles.
      lit += (1 - nz[i]) * 0.12;
      // Groove occlusion.
      const g = (sd[i] - stitchLevel) / (tw * 1.6);
      lit *= 1 - 0.18 * Math.exp(-g * g);
      const tex = 1 + fib * 0.3 + mottle[i] * 0.08;
      let r = base[0];
      let gg = base[1];
      let b = base[2];
      if (photo && art.alpha[i] > 0.01) {
        // The photo printed on felt: ink sits in the fibres, contrast a little soft.
        const a = art.alpha[i];
        const pr = art.rgba[i * 4] * 0.9 + 18;
        const pg = art.rgba[i * 4 + 1] * 0.9 + 18;
        const pb = art.rgba[i * 4 + 2] * 0.9 + 18;
        r += (pr - r) * a;
        gg += (pg - gg) * a;
        b += (pb - b) * a;
      }
      const k = lit * tex;
      px[i * 4] = r * k;
      px[i * 4 + 1] = gg * k;
      px[i * 4 + 2] = b * k;
      px[i * 4 + 3] = c * 255;
    }
  }

  const { canvas, ctx } = output(art);
  softShadows(ctx, cov, art, L, 1.2);
  ctx.drawImage(toCanvas(px, w, h), 0, 0);

  // Stray fibres poking out of the cut edge.
  const edge = gridPaths(feS, a2.w, a2.h, 0, f, 1);
  const r = rng(input.seed * 31 + 5);
  ctx.save();
  ctx.lineCap = "round";
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = css(pass ? shade(base, 0.1) : shade(base, -0.06), 0.45);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (const p of edge) {
      const pts = resamplePath(p, 2.2 * fs);
      for (let k = 0; k < pts.length; k += 4) {
        if (r() > 0.3) continue;
        const x = pts[k];
        const y = pts[k + 1];
        let nxo = pts[k + 3];
        let nyo = -pts[k + 2];
        if (sample(feltDist, w, h, x + nxo * 2 - 0.5, y + nyo * 2 - 0.5) < sample(feltDist, w, h, x - 0.5, y - 0.5)) {
          nxo = -nxo;
          nyo = -nyo;
        }
        const ang = Math.atan2(nyo, nxo) + (r() - 0.5) * 2.2;
        const len = (1.2 + r() * r() * 5) * Math.min(fs, 1.4);
        const sx = x - nxo * 1.2;
        const sy = y - nyo * 1.2;
        const bend = (r() - 0.5) * 1.5;
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(
          sx + Math.cos(ang + bend) * len * 0.5,
          sy + Math.sin(ang + bend) * len * 0.5,
          sx + Math.cos(ang) * len,
          sy + Math.sin(ang) * len,
        );
      }
    }
    ctx.stroke();
  }
  ctx.restore();

  // The running stitch.
  const paths = gridPaths(sd2, a2.w, a2.h, stitchLevel / f, f, 3);
  const dashes = runningStitch(paths, u * (photo ? 0.03 : 0.042), u * (photo ? 0.022 : 0.03), 0.3);
  drawStitches(ctx, dashes, {
    width: tw,
    color: thread,
    L,
    holes: 0.28,
    shadow: 0.3,
    shadowColor: shade(base, -0.45),
    sheen: 0.55,
  });
  return canvas;
}
