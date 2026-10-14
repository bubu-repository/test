/*
 * Holographic die-cut sticker: the art in rainbow holographic foil (a diagonal spectrum with a
 * fine diffraction pattern, both shifting with `light` and `phase`) inside a thick white die-cut
 * vinyl border, under a glossy laminate, with one corner peeling up to show the sticker's back and
 * the shadow beneath it. A photo keeps its colours with a holo shimmer over it.
 */

import {
  clamp01,
  downsample,
  fillHoles,
  gauss,
  hash2,
  hslInto,
  lightDir,
  noiseField,
  output,
  readArt,
  sample,
  signedDistance,
  drawShadow,
  toCanvas,
  upsample,
} from "./core";
import type { MaterialInput } from "./types";

const TAU = Math.PI * 2;

export function holo(input: MaterialInput): HTMLCanvasElement {
  const art = readArt(input, (u, pad) => Math.min(pad * 0.9, u * 0.16 + 10));
  const { w, h, u, photo } = art;
  const L = lightDir(input.light);
  const phase = input.phase;
  const f = 2;
  const n = w * h;

  // Die-cut outline: grown, smoothed into easy curves, small holes closed.
  const a2 = downsample(art.alpha, w, h, f);
  const gw = a2.w;
  const gh = a2.h;
  const sd2 = signedDistance(a2.data, gw, gh);
  const D = Math.min(u * (photo ? 0.06 : 0.085), art.pad * 0.55);
  const c2 = new Float32Array(gw * gh);
  for (let i = 0; i < c2.length; i++) c2[i] = sd2[i] * f - D;
  fillHoles(c2, gw, gh, ((u * 0.5) / f) ** 2, true, -D);
  const cut2 = gauss(c2, gw, gh, (u * 0.035) / f);
  const cut = upsample(cut2, gw, gh, w, h);
  const sd = upsample(sd2, gw, gh, w, h, f);

  // The peel: fold line across the bottom-right-most corner of the sticker.
  let nx = 0.62;
  let ny = 1;
  const nl = Math.hypot(nx, ny);
  nx /= nl;
  ny /= nl;
  let px0 = art.cx;
  let py0 = art.cy;
  let best = -Infinity;
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (cut2[y * gw + x] > 0) continue;
      const v = x * nx + y * ny;
      if (v > best) {
        best = v;
        px0 = (x + 0.5) * f;
        py0 = (y + 0.5) * f;
      }
    }
  }
  const F = u * (photo ? 0.16 : 0.2);
  const foldS = (x: number, y: number) => (x - px0) * nx + (y - py0) * ny + F;

  // Holo textures: a wavy spectrum and a fine mosaic of diffraction gratings.
  const wav = noiseField(w, h, u * 0.35, input.seed + 1, 2);
  const cell = Math.max(5, u * 0.045);
  const sparkle = noiseField(w, h, 1.3, input.seed + 2, 1);
  // Shard centres on a jittered grid (one cell of margin all round).
  const sw = Math.ceil(w / cell) + 3;
  const shh = Math.ceil(h / cell) + 3;
  const shX = new Float32Array(sw * shh);
  const shY = new Float32Array(sw * shh);
  const shV = new Float32Array(sw * shh);
  for (let jj = 0; jj < shh; jj++) {
    for (let ii = 0; ii < sw; ii++) {
      const k = jj * sw + ii;
      shX[k] = (ii - 1 + hash2(ii, jj, input.seed + 3)) * cell;
      shY[k] = (jj - 1 + hash2(ii, jj, input.seed + 4)) * cell;
      shV[k] = hash2(ii, jj, input.seed + 5);
    }
  }
  const lshift = (input.light.x - 0.5) * 0.9 + (input.light.y - 0.5) * 0.5;
  const lightAng = Math.atan2(L[1], L[0]) + TAU * phase;
  const hueSway = 0.08 * Math.sin(TAU * phase);
  const hc = new Float32Array(3);
  const tgw = (w + 1) >> 1;
  const tgh = (h + 1) >> 1;
  const tiltG = new Float32Array(tgw * tgh);
  for (let gy = 0; gy < tgh; gy++) {
    const y = gy * 2 + 1;
    const cj = Math.floor(y / cell) + 1;
    for (let gx = 0; gx < tgw; gx++) {
      const x = gx * 2 + 1;
      const ci = Math.floor(x / cell) + 1;
      let d1 = 1e9;
      let shard = 0;
      for (let jj = cj - 1; jj <= cj + 1; jj++) {
        for (let ii = ci - 1; ii <= ci + 1; ii++) {
          const k = jj * sw + ii;
          const sx = shX[k] - x;
          const sy = shY[k] - y;
          const dd = sx * sx + sy * sy;
          if (dd < d1) {
            d1 = dd;
            shard = shV[k];
          }
        }
      }
      tiltG[gy * tgw + gx] = Math.cos(shard * TAU - lightAng);
    }
  }
  const tiltF = upsample(tiltG, tgw, tgh, tgw * 2, tgh * 2);
  const tiltW = tgw * 2;

  const px = new Uint8ClampedArray(n * 4);
  const front = new Float32Array(n);
  const flapM = new Float32Array(n);
  const diagLen = art.bw + art.bh * 0.8;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const s = foldS(x + 0.5, y + 0.5);
      const j = i * 4;
      if (s < 0 && s > -F - 2) {
        // Is the curled-back flap over this pixel? (Only within F of the fold.)
        const qx = x + 0.5 - 2 * s * nx;
        const qy = y + 0.5 - 2 * s * ny;
        const fd = sample(cut, w, h, qx - 0.5, qy - 0.5);
        if (fd < 0.5) {
          const fa = clamp01(0.5 - fd);
          const t = clamp01(-s / F); // 0 at the fold → tip
          // Back of the sticker: matte white liner side, rounded at the fold.
          let k = 0.8 + 0.14 * Math.sin(Math.min(1, t * 1.4) * Math.PI) + 0.08 * (1 - t);
          k *= 1 - 0.1 * clamp01(t - 0.6);
          const crest = Math.exp(-((t - 0.07) * (t - 0.07)) / 0.002) * 0.12;
          const r = (236 + 19 * crest) * k;
          const g = (239 + 16 * crest) * k;
          const b = (244 + 11 * crest) * k;
          // Hairline edge of the flap.
          const edgeK = clamp01(1 - (0.5 - fd) / 1.5) * 0.25;
          px[j] = r * (1 - edgeK);
          px[j + 1] = g * (1 - edgeK);
          px[j + 2] = b * (1 - edgeK);
          px[j + 3] = fa * 255 + (1 - fa) * (cut[i] < 0 ? 255 : 0);
          flapM[i] = fa;
          if (fa >= 0.999) {
            front[i] = clamp01(0.5 - cut[i]);
            continue;
          }
          // Partial flap coverage over the sticker: fall through and blend below.
        }
      } else if (s >= 0) {
        continue; // lifted away
      }
      const d = cut[i];
      if (d > 0.5) {
        continue;
      }
      const ca = clamp01(0.5 - d);
      front[i] = ca;
      let r = 252;
      let g = 252;
      let b = 253;
      const da = sd[i];
      if (da < 0.5) {
        // Holographic foil.
        const aa = photo ? art.alpha[i] : clamp01(0.5 - da);
        const diag = ((x - art.x0) * 0.8 + (y - art.y0) * 0.6) / diagLen;
        // Cracked-ice shards (Voronoi, looked up on the half grid): each tilts the spectrum a little.
        const tilt = tiltF[y * tiltW + x];
        // The band of rainbow sweeps across once per loop; the hues only sway a little (a GIF
        // shouldn't strobe through the whole spectrum).
        const hue = diag * 1.25 + wav[i] * 0.04 + lshift + hueSway + tilt * 0.03;
        const band = 0.5 + 0.5 * Math.cos(TAU * (diag * 1.3 - lshift * 1.3 - phase + tilt * 0.04));
        // Fine diffraction lines.
        const fine = Math.sin(((x * 0.866 + y * 0.5) * TAU) / 2.3 + hue * TAU) * 0.5 + 0.5;
        // A silver mirror: the rainbow only lives in the band facing the light; the cracked-ice
        // facets show as steps in lightness.
        const b2 = band * band;
        const flash = b2 * b2 * b2;
        const light = 0.4 + band * 0.26 + flash * 0.22 + fine * 0.06 + tilt * 0.1 + clamp01(sparkle[i] * 3 - 2.2) * 0.35;
        hslInto(hue, 0.3 + 0.55 * band, Math.min(0.95, light), hc);
        const nb = 1 - band;
        const silver = 0.72 * nb * nb;
        let hr = hc[0] + (146 - hc[0]) * silver;
        let hg = hc[1] + (154 - hc[1]) * silver;
        let hb = hc[2] + (168 - hc[2]) * silver;
        if (photo) {
          const k = 0.32;
          hr = art.rgba[j] * (1 - k) + hr * k;
          hg = art.rgba[j + 1] * (1 - k) + hg * k;
          hb = art.rgba[j + 2] * (1 - k) + hb * k;
        } else {
          // A printed keyline so the letters stay crisp against the white.
          const kl = clamp01(1 - (-da) / 1.6) * 0.3;
          hr *= 1 - kl;
          hg *= 1 - kl;
          hb *= 1 - kl;
        }
        r += (hr - r) * aa;
        g += (hg - g) * aa;
        b += (hb - b) * aa;
      }
      // Laminate gloss: a soft diagonal band and a crisp line, sweeping with phase.
      const gd = (x - art.x0 + (y - art.y0) * 0.55) / diagLen;
      const gp = gd - 0.25 - (input.light.x - 0.5) * 0.6 - phase;
      const fr = gp - Math.floor(gp);
      const gl = Math.exp(-((fr - 0.5) * (fr - 0.5)) / 0.012) * 0.3 + Math.exp(-((fr - 0.58) * (fr - 0.58)) / 0.0006) * 0.35;
      r += (255 - r) * gl;
      g += (255 - g) * gl;
      b += (255 - b) * gl;
      // Cut edge: a bright lip on the lit side, a little shade on the far side.
      const ex = cut[x + 1 < w ? i + 1 : i] - cut[x > 0 ? i - 1 : i];
      const ey = cut[y + 1 < h ? i + w : i] - cut[y > 0 ? i - w : i];
      const el = Math.sqrt(ex * ex + ey * ey) || 1;
      const facing = -(ex * L[0] + ey * L[1]) / el;
      const rim = clamp01(1 - -d / 2.2);
      const lip = rim * facing;
      r += lip > 0 ? (255 - r) * lip * 0.5 : r * lip * 0.25;
      g += lip > 0 ? (255 - g) * lip * 0.5 : g * lip * 0.25;
      b += lip > 0 ? (255 - b) * lip * 0.5 : b * lip * 0.2;
      // The flap's soft shadow is applied later as a layer; here just blend under a partial flap.
      const fa = flapM[i];
      const pr = px[j];
      const pg = px[j + 1];
      const pb = px[j + 2];
      px[j] = r * (1 - fa) + pr * fa;
      px[j + 1] = g * (1 - fa) + pg * fa;
      px[j + 2] = b * (1 - fa) + pb * fa;
      px[j + 3] = Math.max(ca, fa) * 255;
    }
  }

  const { canvas, ctx } = output(art);
  // Shadows: the sticker lies flat (tight), the flap stands off the page (soft, further).
  drawShadow(ctx, front, w, h, { blur: Math.max(2, u * 0.008), dx: -L[0] * u * 0.002, dy: u * 0.004, opacity: 0.28 });
  drawShadow(ctx, front, w, h, { blur: u * 0.03, dx: -L[0] * u * 0.008, dy: u * 0.015, opacity: 0.12 });
  drawShadow(ctx, flapM, w, h, { blur: u * 0.035, dx: -L[0] * u * 0.04 + nx * u * 0.03, dy: -L[1] * u * 0.04 + ny * u * 0.03, opacity: 0.3 });
  // The vinyl's thickness: a hairline of its edge below the face.
  const edgeLayer = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const a = front[i];
    if (a <= 0) continue;
    edgeLayer[i * 4] = 196;
    edgeLayer[i * 4 + 1] = 204;
    edgeLayer[i * 4 + 2] = 216;
    edgeLayer[i * 4 + 3] = a * 255;
  }
  ctx.drawImage(toCanvas(edgeLayer, w, h), -L[0] * 1.2, -L[1] * 1.2 + 0.8);
  // Sticker face (with the flap drawn in), then the flap's shadow onto the face.
  const face = toCanvas(px, w, h);
  ctx.drawImage(face, 0, 0);
  // Shadow cast by the flap onto the face just beside it.
  const sh = makeFlapShadow(flapM, front, w, h, u, nx, ny);
  ctx.drawImage(sh, 0, 0);
  return canvas;
}

/** The flap's shadow on the sticker face around it (not on the flap itself). */
function makeFlapShadow(flapM: Float32Array, front: Float32Array, w: number, h: number, u: number, nx: number, ny: number) {
  const f = 2;
  const d = downsample(flapM, w, h, f);
  const b = gauss(d.data, d.w, d.h, (u * 0.02) / f);
  const big = upsample(b, d.w, d.h, w, h);
  const px = new Uint8ClampedArray(w * h * 4);
  const ox = Math.round(nx * u * 0.02);
  const oy = Math.round(ny * u * 0.02);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (front[i] <= 0) continue;
      const sx = x - ox;
      const sy = y - oy;
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      const v = big[sy * w + sx] * (1 - flapM[i]) * front[i];
      if (v <= 0.01) continue;
      px[i * 4] = 8;
      px[i * 4 + 1] = 40;
      px[i * 4 + 2] = 80;
      px[i * 4 + 3] = Math.min(1, v * 0.9) * 0.4 * 255;
    }
  }
  return toCanvas(px, w, h);
}
