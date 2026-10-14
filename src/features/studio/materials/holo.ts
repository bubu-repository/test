/*
 * Holographic die-cut sticker: the art in cracked-ice holo foil (a mid-grey silver mirror broken
 * into facets, with fine diffraction lines and a rainbow only in the band facing the light, which
 * sweeps across with `light` and `phase`) inside a thick white die-cut vinyl border, under a glossy
 * laminate, with one corner peeling up to show the sticker's back and the shadow beneath it. A
 * photo is printed on the foil in clear inks, so it keeps its colours and the foil shines through.
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

  // Holo textures: a gentle warp for the rainbow band, sparkle, and the cracked-ice shards.
  const wav = noiseField(w, h, u * 0.35, input.seed + 1, 2);
  const cell = Math.max(6, u * (photo ? 0.036 : 0.06));
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
  // Each shard's grating faces its own way, so it catches the light at its own moment in the loop.
  const lightAng = Math.atan2(L[1], L[0]) + TAU * phase;
  const hc = new Float32Array(3);
  const tgw = (w + 1) >> 1;
  const tgh = (h + 1) >> 1;
  const tiltG = new Float32Array(tgw * tgh);
  // The cracks between shards: thin lines where the two nearest shard centres are equally far.
  const crackG = new Float32Array(tgw * tgh);
  for (let gy = 0; gy < tgh; gy++) {
    const y = gy * 2 + 1;
    const cj = Math.floor(y / cell) + 1;
    for (let gx = 0; gx < tgw; gx++) {
      const x = gx * 2 + 1;
      const ci = Math.floor(x / cell) + 1;
      let d1 = 1e9;
      let d2 = 1e9;
      let shard = 0;
      for (let jj = cj - 1; jj <= cj + 1; jj++) {
        for (let ii = ci - 1; ii <= ci + 1; ii++) {
          const k = jj * sw + ii;
          const sx = shX[k] - x;
          const sy = shY[k] - y;
          const dd = sx * sx + sy * sy;
          if (dd < d1) {
            d2 = d1;
            d1 = dd;
            shard = shV[k];
          } else if (dd < d2) d2 = dd;
        }
      }
      const k = gy * tgw + gx;
      tiltG[k] = Math.cos(shard * TAU - lightAng);
      const e = (Math.sqrt(d2) - Math.sqrt(d1)) * 0.5;
      crackG[k] = e < 1.4 ? 1 - e / 1.4 : 0;
    }
  }
  const tiltF = upsample(tiltG, tgw, tgh, tgw * 2, tgh * 2);
  const crackF = upsample(crackG, tgw, tgh, tgw * 2, tgh * 2);
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
        // Cracked-ice shards (Voronoi, looked up on the half grid): -1..1, how squarely each one's
        // grating faces the light.
        const tilt = tiltF[y * tiltW + x];
        const crack = crackF[y * tiltW + x];
        // Where this point sits across the rainbow band (0 at its centre): the band faces the light,
        // sweeps across once per loop and bends a little with the foil.
        const s = diag * 1.15 - lshift * 1.3 - phase + wav[i] * 0.06 + tilt * 0.035;
        const fr = s - Math.round(s);
        const band = Math.exp(-fr * fr * 42);
        // Fine diffraction lines, stronger in the band.
        const fine = Math.sin(((x * 0.866 + y * 0.5) * TAU) / 2.6 + fr * 40) * (0.025 + 0.035 * band);
        // A silver mirror, softly warped; each facet a step lighter or darker, a few catching the
        // light outright, and bright hairline cracks between them.
        let glint = tilt > 0 ? tilt * tilt : 0;
        glint *= glint * glint;
        const spark = clamp01(sparkle[i] * 3 - 2.2);
        const m = 0.9 + wav[i] * 0.1 + tilt * 0.12 + glint * 0.3 + crack * 0.2 + fine + spark * 0.6;
        // The rainbow lives only in the band: the spectrum runs across it, each facet shifted a little.
        hslInto(0.62 - fr * 2.3 + tilt * 0.06, 0.9, 0.58 + tilt * 0.08 + band * 0.12, hc);
        const rb = band * 0.88;
        let hr = 150 * m + (hc[0] * (m + 0.15) - 150 * m) * rb;
        let hg = 158 * m + (hc[1] * (m + 0.15) - 158 * m) * rb;
        let hb = 174 * m + (hc[2] * (m + 0.15) - 174 * m) * rb;
        if (photo) {
          // A photo printed on the foil in clear inks: its own colours, lit up or dimmed by how far
          // the foil strays from its mid silver, and more so in the photo's light parts.
          const pr = art.rgba[j];
          const pg = art.rgba[j + 1];
          const pb = art.rgba[j + 2];
          const k = (0.16 + 0.26 * ((pr * 0.3 + pg * 0.59 + pb * 0.11) / 255)) / 140;
          hr = pr * (1 + (hr - 140) * k);
          hg = pg * (1 + (hg - 148) * k);
          hb = pb * (1 + (hb - 162) * k);
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
