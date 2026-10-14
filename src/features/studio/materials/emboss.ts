/*
 * Metal emboss: a brushed-metal plate (horizontal grain, an anisotropic streak of light across it)
 * with bevelled edges and four screws, the art pressed up out of it with crisp lit and shaded
 * bevels. `phase` sweeps the light across the plate and back. A photo becomes a soft low relief of
 * its own light and dark, pressed into the plate, its light parts polished and its dark ones satin.
 */

import {
  clamp,
  clamp01,
  downsample,
  drawShadow,
  gauss,
  halfVec,
  hash2,
  lightDir,
  noiseField,
  output,
  readArt,
  roundRectDist,
  signedDistance,
  softShadows,
  toCanvas,
  upsample,
} from "./core";
import type { MaterialInput } from "./types";

const METAL: [number, number, number] = [176, 188, 200];

export function emboss(input: MaterialInput): HTMLCanvasElement {
  const art = readArt(input, (u, pad) => pad * 0.95);
  const { w, h, u, photo } = art;
  const L = lightDir(input.light);
  const [lx, ly, lz] = L;
  const [khx, khy, khz] = halfVec(L);
  const f = 2;
  const n = w * h;

  // The plate.
  const m = Math.min(u * 0.15, art.pad * 0.7);
  const pcx = art.cx;
  const pcy = art.cy;
  const phw = art.bw / 2 + m;
  const phh = art.bh / 2 + m;
  const pr = Math.min(u * 0.09, phh * 0.5);
  const bevel = Math.max(3, u * 0.022);

  // The art's relief: a crisp bevel for lettering; the photo's tones for a photo.
  const a2 = downsample(art.alpha, w, h, f);
  const gw = a2.w;
  const gh = a2.h;
  const sd2 = signedDistance(a2.data, gw, gh);
  const ab = Math.max(3, u * (photo ? 0.02 : 0.034));
  const Ha = u * (photo ? 0.03 : 0.028);
  const h2 = new Float32Array(gw * gh);
  if (!photo) {
    for (let i = 0; i < h2.length; i++) {
      const t = clamp01((-sd2[i] * f + ab * 0.3) / ab);
      h2[i] = Ha * t * t * (3 - 2 * t);
    }
  } else {
    // Luminance relief (on the coarse grid), with a soft rise at the photo's edge. The tones are
    // stretched to the photo's own 5th–95th percentile first, so a soft photo still presses deep.
    const lum = new Float32Array(gw * gh);
    const hist = new Int32Array(256);
    let count = 0;
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x;
        const sx = Math.min(w - 1, x * f);
        const sy = Math.min(h - 1, y * f);
        const j = (sy * w + sx) * 4;
        const l = (art.rgba[j] * 0.3 + art.rgba[j + 1] * 0.59 + art.rgba[j + 2] * 0.11) / 255;
        lum[i] = l;
        if (sd2[i] < 0) {
          hist[Math.min(255, Math.round(l * 255))]++;
          count++;
        }
      }
    }
    let lo = 0;
    let hi = 1;
    if (count > 16) {
      let acc = 0;
      let b = 0;
      for (; b < 256 && acc + hist[b] < count * 0.05; b++) acc += hist[b];
      lo = b / 255;
      for (; b < 256 && acc + hist[b] < count * 0.95; b++) acc += hist[b];
      hi = Math.max(lo + 0.08, b / 255);
    }
    // The tones, squared (so the light parts rise), as broad domes with a little of the detail on
    // top: clouds become soft pillows, not cracked noise. The photo's edge stays crisp.
    const tone = new Float32Array(gw * gh);
    for (let i = 0; i < lum.length; i++) {
      const t = clamp01((-sd2[i] * f) / ab);
      const e = t * t * (3 - 2 * t);
      const l = clamp01((lum[i] - lo) / (hi - lo));
      h2[i] = Ha * 0.25 * e;
      tone[i] = l * l * Ha * 0.8 * e;
    }
    const domes = gauss(tone, gw, gh, (u * 0.014) / f);
    const detail = gauss(tone, gw, gh, (u * 0.006) / f);
    for (let i = 0; i < h2.length; i++) h2[i] += domes[i] * 0.85 + detail[i] * 0.15;
  }
  const hs2 = gauss(h2, gw, gh, 0.7);
  const nx2 = new Float32Array(gw * gh);
  const ny2 = new Float32Array(gw * gh);
  for (let y = 1; y < gh - 1; y++) {
    for (let x = 1; x < gw - 1; x++) {
      const i = y * gw + x;
      nx2[i] = -(hs2[i + 1] - hs2[i - 1]) / (2 * f);
      ny2[i] = -(hs2[i + gw] - hs2[i - gw]) / (2 * f);
    }
  }
  const NX = upsample(nx2, gw, gh, w, h);
  const NY = upsample(ny2, gw, gh, w, h);
  const AH = upsample(hs2, gw, gh, w, h);
  // The relief's own shadow on the plate, away from the light.
  const shadowSrc = new Float32Array(gw * gh);
  for (let i = 0; i < shadowSrc.length; i++) shadowSrc[i] = hs2[i] / Ha;
  const sh2 = gauss(shadowSrc, gw, gh, Math.max(1, (u * 0.008) / f));
  const SH = upsample(sh2, gw, gh, w, h);
  const sdx = Math.round(-lx * u * 0.018);
  const sdy = Math.round(-ly * u * 0.018);

  // Brushed grain: long horizontal streaks at two scales.
  const streak = noiseField(w, h, 1.1, input.seed + 1, 2, 0.6, 160, 1);
  const streak2 = noiseField(w, h, 3, input.seed + 2, 1, 0.5, 30, 1);

  // The sweeping light: a point light high over the plate.
  const sweep = Math.sin(input.phase * Math.PI * 2) * 0.38;
  const LX = (input.light.x + sweep) * art.W - art.ox - lx * art.W * 0.15;
  const LY = input.light.y * art.H - art.oy - ly * art.H * 0.4;
  const LZ = Math.max(art.W, art.H) * 0.55;

  // Screws in the corners.
  const sr = clamp(u * 0.032, 4, m * 0.32);
  const inset = Math.max(sr * 2, m * 0.5);
  const screws = [
    [pcx - phw + inset, pcy - phh + inset],
    [pcx + phw - inset, pcy - phh + inset],
    [pcx - phw + inset, pcy + phh - inset],
    [pcx + phw - inset, pcy + phh - inset],
  ];

  const px = new Uint8ClampedArray(n * 4);
  const mask = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const X = x + 0.5;
      const Y = y + 0.5;
      const dp = roundRectDist(X, Y, pcx, pcy, phw, phh, pr);
      if (dp > 0.5) continue;
      const a = clamp01(0.5 - dp);
      // Surface normal: the plate's rounded bevel, plus the relief.
      let nx = NX[i];
      let ny = NY[i];
      if (dp > -bevel) {
        const t = (dp + bevel) / bevel; // 0 → 1 towards the edge
        const slope = t * 1.6;
        // Outward direction of the rounded rect.
        const ex = X - pcx;
        const ey = Y - pcy;
        const qx = Math.abs(ex) - (phw - pr);
        const qy = Math.abs(ey) - (phh - pr);
        let ox = 0;
        let oy = 0;
        if (qx > 0 && qy > 0) {
          const l = Math.sqrt(qx * qx + qy * qy) || 1;
          ox = (qx / l) * Math.sign(ex);
          oy = (qy / l) * Math.sign(ey);
        } else if (qx > qy) ox = Math.sign(ex);
        else oy = Math.sign(ey);
        nx += ox * slope;
        ny += oy * slope;
      }
      // Screws: domed heads with a cross slot.
      let screw = 0;
      let slot = 0;
      for (let k = 0; k < 4; k++) {
        const sx = X - screws[k][0];
        const sy = Y - screws[k][1];
        const d2 = sx * sx + sy * sy;
        if (d2 < sr * sr * 1.44) {
          const d = Math.sqrt(d2);
          if (d < sr) {
            screw = 1;
            const q = d / sr;
            nx = (sx / sr) * 0.9;
            ny = (sy / sr) * 0.9;
            const rot = hash2(k, 3, input.seed) * Math.PI;
            const ca = Math.cos(rot);
            const sa = Math.sin(rot);
            const u1 = sx * ca + sy * sa;
            const v1 = -sx * sa + sy * ca;
            const sw = sr * 0.14;
            if ((Math.abs(u1) < sw || Math.abs(v1) < sw) && q < 0.72) slot = 1;
          } else {
            // Countersink ring.
            const t = (d - sr) / (sr * 0.2);
            nx -= (sx / d) * (1 - t) * 0.8;
            ny -= (sy / d) * (1 - t) * 0.8;
            screw = 2;
          }
        }
      }
      let nz = 1;
      const nl = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx *= nl;
      ny *= nl;
      nz *= nl;
      // Point light for the anisotropic streak.
      let plx = LX - X;
      let ply = LY - Y;
      let plz = LZ;
      const pl = 1 / Math.sqrt(plx * plx + ply * ply + plz * plz);
      plx *= pl;
      ply *= pl;
      plz *= pl;
      let hx = plx;
      let hy = ply;
      let hz = plz + 1;
      const hl = 1 / Math.sqrt(hx * hx + hy * hy + hz * hz);
      hx *= hl;
      hy *= hl;
      hz *= hl;
      // Brushed metal: grooves run along x, so light streaks across them (Kajiya-Kay along T).
      const tz = -nx / (nz || 1);
      const tl = 1 / Math.sqrt(1 + tz * tz);
      const th = (hx + hz * tz) * tl;
      let aniso = 1 - th * th;
      aniso *= aniso;
      aniso *= aniso;
      aniso *= aniso;
      aniso *= aniso; // ^16 of sin²
      const ndl = nx * lx + ny * ly + nz * lz;
      const ndh = Math.max(0, nx * hx + ny * hy + nz * hz);
      let spec = ndh * ndh;
      spec *= spec;
      spec *= spec;
      spec *= spec;
      spec *= spec; // ^32
      const g = streak[i] * 0.07 + streak2[i] * 0.04;
      // The pressed-up face is a touch more polished than the plate.
      const raised = photo ? 0 : clamp01(AH[i] / Ha);
      // A photo is also etched: its dark parts are pressed down and satin, the light ones polished.
      const etch = photo ? 1 - art.alpha[i] * (1 - clamp01((AH[i] / Ha - 0.25) * 1.4)) : 1;
      // Key light: flat metal sits at a mid value; bevels facing it brighten, the far ones darken.
      const kh = Math.max(0, nx * khx + ny * khy + nz * khz);
      let ks = kh * kh;
      ks *= ks;
      ks *= ks;
      ks *= ks;
      ks *= ks; // ^32
      const tilted = 1 - nz;
      let v = 0.72 + 1.1 * (ndl - lz) + aniso * (0.3 + g * 2) * (0.45 + 0.55 * etch) + spec * 0.22 + ks * tilted * 2.2 + g * (1 - raised * 0.4) + raised * 0.03;
      if (photo) v *= 0.8 + 0.3 * etch;
      if (screw === 1) v = 0.42 + 0.5 * clamp01(ndl) + spec * 0.8;
      if (slot) v *= 0.35;
      // The relief's shadow on the plate.
      if (!screw) {
        const sx = x - sdx;
        const sy = y - sdy;
        if (sx >= 0 && sy >= 0 && sx < w && sy < h) {
          const occ = SH[sy * w + sx] - AH[i] / Ha;
          if (occ > 0) v *= 1 - occ * (photo ? 0.25 : 0.42);
        }
      }
      const j = i * 4;
      px[j] = METAL[0] * v;
      px[j + 1] = METAL[1] * v;
      px[j + 2] = METAL[2] * v * 1.02;
      px[j + 3] = a * 255;
      mask[i] = a;
    }
  }

  const { canvas, ctx } = output(art);
  softShadows(ctx, mask, art, L, 1.3);
  drawShadow(ctx, mask, w, h, { blur: 2, dx: -0.25, dy: 1.5, opacity: 0.3 });
  ctx.drawImage(toCanvas(px, w, h), 0, 0);
  return canvas;
}
