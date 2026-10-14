/*
 * Liquid Y2K chrome: the art inflated into rounded metal and mirrored onto an environment of sky,
 * a dark horizon line, a bright horizon and warm ground, with crisp highlights and a couple of star
 * glints. `phase` turns the environment round so the reflections slide (and loop). A photo gets a
 * chrome tube frame and a glassy sheen, so it still reads as the photo.
 */

import {
  clamp01,
  downsample,
  gauss,
  halfVec,
  lightDir,
  output,
  readArt,
  signedDistance,
  softShadows,
  toCanvas,
  upsample,
} from "./core";
import type { MaterialInput } from "./types";

const TAU = Math.PI * 2;

/**
 * The environment seen in a mirror direction (rx, ry, rz) (y down), shifted by `shift` in
 * elevation and turned by `phase`. Writes RGB into out.
 */
export function chromeEnv(rx: number, ry: number, rz: number, shift: number, phase: number, out: Float32Array) {
  // Horizontal position in the world: bounded, so nothing wraps.
  const az = rx * 1.7 + (rz < 0 ? Math.sign(rx) * -rz * 0.6 : 0);
  // The horizon undulates as the world turns: hills, buildings, a window.
  const hz = 0.035 * Math.sin(az * 2 + TAU * phase) + 0.018 * Math.sin(az * 5 - TAU * phase * 2) - 0.02;
  const v = -ry * 0.62 + shift - hz;
  // Sky: white at the horizon, deep Aero blue overhead, a few soft clouds.
  const t = clamp01(v / 0.75);
  const tt = Math.sqrt(t);
  let sr = 240 + (48 - 240) * tt;
  let sg = 247 + (128 - 247) * tt;
  let sb = 255 + (220 - 255) * tt;
  // Clouds drift with the turning world (periodic in phase, so a GIF loops).
  const cl = Math.sin(az * 3.1 + TAU * phase + v * 5) * Math.sin(az * 1.7 - TAU * phase + 1.3 + v * 2.2);
  const cloud = clamp01(cl * 1.4 - 0.15) * (1 - t) * 0.45;
  sr += (255 - sr) * cloud;
  sg += (255 - sg) * cloud;
  sb += (255 - sb) * cloud;
  // Ground: dark warm earth at the horizon, lighter and sandier towards us.
  const gt = clamp01(-v / 0.65);
  const gk = Math.pow(gt, 0.7);
  const gr = 70 + (246 - 70) * gk;
  const gg = 52 + (222 - 52) * gk;
  const gb = 50 + (196 - 50) * gk;
  // Blend across the horizon smoothly, then lay the dark horizon line over it.
  const m = clamp01((v + 0.012) / 0.024);
  const k = m * m * (3 - 2 * m);
  let r = gr + (sr - gr) * k;
  let g = gg + (sg - gg) * k;
  let b = gb + (sb - gb) * k;
  const dl = (v + 0.035) / 0.03;
  const line = Math.exp(-dl * dl) * 0.7;
  r += (24 - r) * line;
  g += (30 - g) * line;
  b += (48 - b) * line;
  out[0] = r;
  out[1] = g;
  out[2] = b;
}

export function chrome(input: MaterialInput): HTMLCanvasElement {
  const art = readArt(input, (u) => u * (input.kind === "photo" ? 0.08 : 0.04) + 8);
  const { w, h, u, photo } = art;
  const L = lightDir(input.light);
  const [hx, hy, hz] = halfVec(L);
  const phase = input.phase;
  const f = 2;
  const n = w * h;
  const a2 = downsample(art.alpha, w, h, f);
  const gw = a2.w;
  const gh = a2.h;
  const soft = photo ? a2.data : gauss(a2.data, gw, gh, (u * 0.006) / f);
  const sd2 = signedDistance(soft, gw, gh);

  // Height: inflated, rounded metal (text); a tube frame (photo).
  const frameW = u * 0.07;
  const frameC = u * 0.012;
  let maxIn = 1;
  for (let i = 0; i < sd2.length; i++) if (-sd2[i] * f > maxIn) maxIn = -sd2[i] * f;
  const R = Math.min(maxIn, u * 0.14);
  const h2 = new Float32Array(gw * gh);
  for (let i = 0; i < h2.length; i++) {
    const d = sd2[i] * f;
    if (!photo) {
      const t = clamp01((-d + 0.5) / R);
      h2[i] = R * Math.sqrt(1 - (1 - t) * (1 - t));
    } else {
      const c = (d - frameC) / (frameW / 2);
      h2[i] = Math.abs(c) < 1 ? (frameW / 2) * Math.sqrt(1 - c * c) : 0;
    }
  }
  // Normals on the coarse grid, then interpolated: smooth reflections without stair-steps.
  const hs2 = gauss(h2, gw, gh, Math.max(1, (u * 0.006) / f));
  const nx2 = new Float32Array(gw * gh);
  const ny2 = new Float32Array(gw * gh);
  for (let y = 1; y < gh - 1; y++) {
    for (let x = 1; x < gw - 1; x++) {
      const i = y * gw + x;
      const dx = (hs2[i + 1] - hs2[i - 1]) / (2 * f);
      const dy = (hs2[i + gw] - hs2[i - gw]) / (2 * f);
      const l = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      nx2[i] = -dx * l;
      ny2[i] = -dy * l;
    }
  }
  const NX = upsample(nx2, gw, gh, w, h);
  const NY = upsample(ny2, gw, gh, w, h);
  const sd = upsample(sd2, gw, gh, w, h, f);

  const px = new Uint8ClampedArray(n * 4);
  const mask = new Float32Array(n);
  const env = new Float32Array(3);
  const specMax: number[] = [];
  const cy = art.cy;
  for (let y = 0; y < h; y++) {
    const shift = ((cy - y) / (art.bh || u)) * 0.75;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const d = sd[i];
      const inFrame = photo && Math.abs(d - frameC) < frameW / 2 + 0.5;
      if (photo ? d > frameC + frameW / 2 + 0.5 : d > 0.5) continue;
      let r: number;
      let g: number;
      let b: number;
      let a: number;
      if (photo && !inFrame) {
        // The photo behind glass inside the frame, a soft diagonal sheen across it.
        const j = i * 4;
        r = art.rgba[j];
        g = art.rgba[j + 1];
        b = art.rgba[j + 2];
        const diag = (x - art.x0) / art.bw - (y - art.y0) / art.bh * 0.6;
        const sheen = Math.exp(-((diag - 0.25 - L[0] * 0.3) ** 2) / 0.012) * 0.28 + Math.exp(-((diag - 0.42 - L[0] * 0.3) ** 2) / 0.002) * 0.18;
        r += (255 - r) * sheen;
        g += (255 - g) * sheen;
        b += (255 - b) * sheen;
        // Inner shadow from the frame.
        const sh = clamp01(1 - (frameC - frameW / 2 - d) / (u * 0.03)) * 0.35;
        r *= 1 - sh;
        g *= 1 - sh;
        b *= 1 - sh;
        a = art.alpha[i];
      } else {
        const nx = NX[i];
        const ny = NY[i];
        const nz = Math.sqrt(Math.max(0.0001, 1 - nx * nx - ny * ny));
        // Mirror direction for a viewer straight in front.
        const rx = 2 * nz * nx;
        const ry = 2 * nz * ny;
        const rz = 2 * nz * nz - 1;
        chromeEnv(rx, ry, rz, shift, phase, env);
        r = env[0];
        g = env[1];
        b = env[2];
        // Chrome is a slightly dark mirror; edges at grazing angles go darker still.
        const k = 0.86 + 0.14 * nz;
        r *= k;
        g *= k;
        b *= k;
        const nh = Math.max(0, nx * hx + ny * hy + nz * hz);
        let s = nh * nh;
        s *= s;
        s *= s;
        s *= s;
        s *= s; // ^32
        let s2 = s * s;
        s2 *= s2;
        s2 *= s2; // ^256
        const spec = s * 0.25 + s2 * 1.2;
        r += (255 - r) * Math.min(1, spec);
        g += (255 - g) * Math.min(1, spec);
        b += (255 - b) * Math.min(1, spec);
        if (s2 > 0.85) specMax.push(x, y, s2);
        a = photo ? clamp01(frameW / 2 + 0.5 - Math.abs(d - frameC)) : clamp01(0.5 - d);
        // A crisp darker line right at the silhouette.
        const edge = photo ? 0 : Math.exp(-((d + 0.8) ** 2) / 0.8) * 0.35;
        r *= 1 - edge;
        g *= 1 - edge;
        b *= 1 - edge;
      }
      const j = i * 4;
      px[j] = r;
      px[j + 1] = g;
      px[j + 2] = b;
      px[j + 3] = a * 255;
      mask[i] = a;
    }
  }

  const { canvas, ctx } = output(art);
  softShadows(ctx, mask, art, L, 1);
  ctx.drawImage(toCanvas(px, w, h), 0, 0);

  // Star glints on the brightest highlights, twinkling with phase.
  const stars: number[] = [];
  const minSep = u * 0.25;
  const order = Array.from({ length: specMax.length / 3 }, (_, k) => k).sort((a, b) => specMax[b * 3 + 2] - specMax[a * 3 + 2] || a - b);
  for (const k3 of order) {
    if (stars.length >= 6) break;
    const x = specMax[k3 * 3];
    const y = specMax[k3 * 3 + 1];
    let ok = true;
    for (let q = 0; q < stars.length; q += 2) if ((stars[q] - x) ** 2 + (stars[q + 1] - y) ** 2 < minSep * minSep) ok = false;
    if (ok) stars.push(x, y);
  }
  ctx.save();
  for (let q = 0; q < stars.length; q += 2) {
    const idx = q / 2;
    const tw = 0.55 + 0.45 * Math.cos(TAU * (phase + idx * 0.37));
    const x = stars[q] + 0.5;
    const y = stars[q + 1] + 0.5;
    const len = u * (0.07 + 0.03 * (idx === 0 ? 1 : 0)) * tw;
    const g1 = ctx.createRadialGradient(x, y, 0, x, y, len);
    g1.addColorStop(0, "rgba(255,255,255,1)");
    g1.addColorStop(0.25, "rgba(225,240,255,0.7)");
    g1.addColorStop(1, "rgba(200,225,255,0)");
    ctx.fillStyle = g1;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + Math.PI / 4 + 0.15;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const wd = len * 0.07;
      ctx.moveTo(x - sa * wd, y + ca * wd);
      ctx.lineTo(x + ca * len, y + sa * len);
      ctx.lineTo(x + sa * wd, y - ca * wd);
      ctx.closePath();
    }
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, len * 0.16, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  return canvas;
}
