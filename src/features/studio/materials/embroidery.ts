/*
 * Embroidery: the art in satin stitch, long parallel floats of shiny thread laid across each stroke
 * (their direction follows the shape, turning gently round the curves), raised over padding, with
 * a split-stitch outline in a darker shade, on a twill backing cut close round it. A photo is
 * posterised into a few thread colours, each region satin-stitched its own way, inside a satin
 * border.
 */

import {
  clamp01,
  downsample,
  fillHoles,
  gauss,
  gridPaths,
  halfVec,
  hash2,
  hexRGB,
  kmeans,
  lightDir,
  luma,
  noiseField,
  output,
  readArt,
  rng,
  shade,
  signedDistance,
  softShadows,
  drawShadow,
  toCanvas,
  upsample,
  type RGB,
} from "./core";
import { drawStitches, runningStitch } from "./stitch";
import type { MaterialInput } from "./types";

/**
 * Evenly spaced streamlines of a direction field (Jobard & Lefer): the threads of a satin stitch.
 * `region` gives the region id at a point (-1 outside); a thread never leaves its region.
 * `dir` writes the unit direction at a point into `out` (sign is arbitrary).
 */
function streamlines(
  w: number,
  h: number,
  sep: number,
  region: (x: number, y: number) => number,
  dir: (x: number, y: number, out: Float32Array) => void,
  seeds: number[],
): Float32Array[] {
  const cell = sep;
  const gw = Math.ceil(w / cell) + 1;
  const gh = Math.ceil(h / cell) + 1;
  const head = new Int32Array(gw * gh).fill(-1);
  let cap = 1 << 16;
  let nxt = new Int32Array(cap);
  let pxs = new Float32Array(cap);
  let pys = new Float32Array(cap);
  let count = 0;
  const addPt = (x: number, y: number) => {
    if (count >= cap) {
      cap *= 2;
      const a = new Int32Array(cap);
      a.set(nxt);
      nxt = a;
      const b = new Float32Array(cap);
      b.set(pxs);
      pxs = b;
      const c = new Float32Array(cap);
      c.set(pys);
      pys = c;
    }
    const g = Math.floor(y / cell) * gw + Math.floor(x / cell);
    pxs[count] = x;
    pys[count] = y;
    nxt[count] = head[g];
    head[g] = count++;
  };
  const clear = (x: number, y: number, d: number) => {
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    const d2 = d * d;
    for (let j = cy - 1; j <= cy + 1; j++) {
      if (j < 0 || j >= gh) continue;
      for (let i = cx - 1; i <= cx + 1; i++) {
        if (i < 0 || i >= gw) continue;
        for (let k = head[j * gw + i]; k >= 0; k = nxt[k]) {
          const dx = pxs[k] - x;
          const dy = pys[k] - y;
          if (dx * dx + dy * dy < d2) return false;
        }
      }
    }
    return true;
  };
  const dtest = sep * 0.6;
  const step = Math.max(1, sep * 0.7);
  const v = new Float32Array(2);
  const trace = (x0: number, y0: number, sx: number, sy: number, reg: number, out: number[]) => {
    let x = x0;
    let y = y0;
    let px = sx;
    let py = sy;
    for (let k = 0; k < 600; k++) {
      dir(x, y, v);
      let dx = v[0];
      let dy = v[1];
      if (dx * px + dy * py < 0) {
        dx = -dx;
        dy = -dy;
      }
      // Don't let a thread kink.
      if (dx * px + dy * py < 0.7) break;
      const nx2 = x + dx * step;
      const ny2 = y + dy * step;
      if (nx2 < 1 || ny2 < 1 || nx2 > w - 2 || ny2 > h - 2) break;
      if (region(nx2, ny2) !== reg || !clear(nx2, ny2, dtest)) break;
      x = nx2;
      y = ny2;
      px = dx;
      py = dy;
      out.push(x, y);
    }
  };
  const lines: Float32Array[] = [];
  const queue: number[] = [];
  const tryLine = (x: number, y: number) => {
    const reg = region(x, y);
    if (reg < 0 || !clear(x, y, sep * 0.95)) return;
    dir(x, y, v);
    const d0x = v[0];
    const d0y = v[1];
    const fwd: number[] = [];
    const back: number[] = [];
    trace(x, y, d0x, d0y, reg, fwd);
    trace(x, y, -d0x, -d0y, reg, back);
    const n = back.length / 2 + 1 + fwd.length / 2;
    if (n < 3) return;
    const pts = new Float32Array(n * 2);
    let o = 0;
    for (let k = back.length - 2; k >= 0; k -= 2) {
      pts[o++] = back[k];
      pts[o++] = back[k + 1];
    }
    pts[o++] = x;
    pts[o++] = y;
    for (let k = 0; k < fwd.length; k++) pts[o++] = fwd[k];
    for (let k = 0; k < pts.length; k += 2) addPt(pts[k], pts[k + 1]);
    lines.push(pts);
    // New seeds a thread's width to either side, every few steps.
    const every = Math.max(1, Math.round(sep / step));
    for (let k = 0; k + 2 < pts.length; k += every * 2) {
      const tx = pts[k + 2] - pts[k];
      const ty = pts[k + 3] - pts[k + 1];
      const tl = Math.sqrt(tx * tx + ty * ty) || 1;
      const nx = (-ty / tl) * sep;
      const ny = (tx / tl) * sep;
      queue.push(pts[k] + nx, pts[k + 1] + ny, pts[k] - nx, pts[k + 1] - ny);
    }
  };
  for (let s = 0; s < seeds.length; s += 2) {
    tryLine(seeds[s], seeds[s + 1]);
    while (queue.length) {
      const y = queue.pop()!;
      const x = queue.pop()!;
      tryLine(x, y);
    }
  }
  return lines;
}

export function embroidery(input: MaterialInput): HTMLCanvasElement {
  const art = readArt(input, (u) => u * 0.12 + 10);
  const { w, h, u, photo } = art;
  const L = lightDir(input.light);
  const Hv = halfVec(L);
  const color = hexRGB(input.color);
  const f = 2;
  const n = w * h;

  const a2 = downsample(art.alpha, w, h, f);
  const gw = a2.w;
  const gh = a2.h;
  const sd2 = signedDistance(a2.data, gw, gh);
  const sd = upsample(sd2, gw, gh, w, h, f);

  // Thread width and the twill backing cut round the art.
  const tw = Math.max(1.6, u * (photo ? 0.01 : 0.011));
  const D = Math.min(u * 0.05, art.pad * 0.4);
  const fe2 = new Float32Array(gw * gh);
  for (let i = 0; i < fe2.length; i++) fe2[i] = sd2[i] * f - D;
  if (!photo) fillHoles(fe2, gw, gh, ((u * 0.3) / f) ** 2, true, -D * 0.5);
  const feS = gauss(fe2, gw, gh, (u * 0.012) / f);
  const fabricDist = upsample(feS, gw, gh, w, h);

  // Stitch direction: across the stroke (the distance gradient), as a doubled-angle field so it
  // can be blurred into gentle turns. Photos: one direction per colour region.
  const j1 = new Float32Array(gw * gh);
  const j2 = new Float32Array(gw * gh);
  let labels: Uint8Array | null = null;
  let regionCols: RGB[] = [];
  let edge2: Float32Array | null = null;
  if (!photo) {
    const ss = gauss(sd2, gw, gh, 1.5);
    for (let y = 1; y < gh - 1; y++) {
      for (let x = 1; x < gw - 1; x++) {
        const i = y * gw + x;
        const gx = ss[i + 1] - ss[i - 1];
        const gy = ss[i + gw] - ss[i - gw];
        j1[i] = gx * gx - gy * gy;
        j2[i] = 2 * gx * gy;
      }
    }
  } else {
    // Posterise: k-means over the softened photo at quarter resolution, cleaned into regions big
    // enough to stitch, then brought up to the half-res grid.
    const q = 2;
    const qw = Math.ceil(gw / q);
    const qh = Math.ceil(gh / q);
    // Block-average the colours straight from the pixels.
    const fq = f * q;
    const nq = qw * qh;
    const sr = new Float32Array(nq);
    const sg = new Float32Array(nq);
    const sb = new Float32Array(nq);
    const aq = new Float32Array(nq);
    const cnt = new Float32Array(nq);
    const colQ = new Int32Array(w);
    for (let x = 0; x < w; x++) colQ[x] = (x / fq) | 0;
    const P = art.rgba;
    for (let y = 0; y < h; y++) {
      const row = ((y / fq) | 0) * qw;
      let k = y * w * 4;
      for (let x = 0; x < w; x++, k += 4) {
        const j = row + colQ[x];
        sr[j] += P[k];
        sg[j] += P[k + 1];
        sb[j] += P[k + 2];
        aq[j] += P[k + 3];
        cnt[j]++;
      }
    }
    for (let j = 0; j < nq; j++) {
      const c = cnt[j] || 1;
      sr[j] /= c;
      sg[j] /= c;
      sb[j] /= c;
      aq[j] /= c * 255;
    }
    const chan = [gauss(sr, qw, qh, 1.2), gauss(sg, qw, qh, 1.2), gauss(sb, qw, qh, 1.2)];
    const cols: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i < qw * qh; i++) {
      if (aq[i] < 0.5) continue;
      cols.push(chan[0][i], chan[1][i], chan[2][i]);
      idx.push(i);
    }
    const km = kmeans(Float32Array.from(cols), 6, 8, 2500);
    regionCols = [];
    for (let k = 0; k < km.k; k++) regionCols.push([km.cent[k * 3], km.cent[k * 3 + 1], km.cent[k * 3 + 2]]);
    let lq = new Uint8Array(qw * qh).fill(255);
    idx.forEach((i, k) => (lq[i] = km.idx[k]));
    const votes = new Int32Array(16);
    const mode = (src: Uint8Array, ww: number, hh: number, r: number) => {
      const out = src.slice();
      for (let y = r; y < hh - r; y++) {
        for (let x = r; x < ww - r; x++) {
          const i = y * ww + x;
          if (src[i] === 255) continue;
          votes.fill(0);
          for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
              const v = src[i + dy * ww + dx];
              if (v !== 255) votes[v]++;
            }
          }
          let best = src[i];
          for (let k = 0; k < km.k; k++) if (votes[k] > votes[best]) best = k;
          out[i] = best;
        }
      }
      return out;
    };
    lq = mode(mode(lq, qw, qh, 1), qw, qh, 1);
    // Merge islands too small to stitch into their surroundings.
    const comp = new Int32Array(qw * qh).fill(-1);
    const stack = new Int32Array(qw * qh);
    const minArea = Math.max(6, ((u * 0.07) / (f * q)) ** 2);
    for (let s0 = 0; s0 < qw * qh; s0++) {
      if (comp[s0] >= 0 || lq[s0] === 255) continue;
      const v = lq[s0];
      const members: number[] = [];
      let sp = 0;
      stack[sp++] = s0;
      comp[s0] = s0;
      votes.fill(0);
      while (sp) {
        const i = stack[--sp];
        members.push(i);
        const x = i % qw;
        for (let q = 0; q < 4; q++) {
          const j = q === 0 ? (x > 0 ? i - 1 : -1) : q === 1 ? (x < qw - 1 ? i + 1 : -1) : q === 2 ? i - qw : i + qw;
          if (j < 0 || j >= qw * qh) continue;
          const lv = lq[j];
          if (lv === v) {
            if (comp[j] < 0) {
              comp[j] = s0;
              stack[sp++] = j;
            }
          } else if (lv !== 255) votes[lv]++;
        }
      }
      if (members.length < minArea) {
        let best = -1;
        for (let k = 0; k < km.k; k++) if (votes[k] > 0 && (best < 0 || votes[k] > votes[best])) best = k;
        if (best >= 0) for (const i of members) lq[i] = best;
      }
    }
    let lab = new Uint8Array(gw * gh).fill(255);
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const i = y * gw + x;
        if (a2.data[i] < 0.5) continue;
        const v = lq[Math.min(qh - 1, (y / q) | 0) * qw + Math.min(qw - 1, (x / q) | 0)];
        lab[i] = v === 255 ? 0 : v;
      }
    }
    lab = mode(lab, gw, gh, 1);
    labels = lab;
    // Distance to region boundaries (on the quarter grid the regions came from), for each
    // region's own padding; brought up to the half grid in half-grid units.
    const bnd = new Float32Array(qw * qh);
    for (let y = 1; y < qh - 1; y++) {
      for (let x = 1; x < qw - 1; x++) {
        const i = y * qw + x;
        const v = lq[i];
        bnd[i] = v !== 255 && lq[i + 1] === v && lq[i - 1] === v && lq[i + qw] === v && lq[i - qw] === v ? 1 : 0;
      }
    }
    edge2 = upsample(signedDistance(bnd, qw, qh), qw, qh, gw, gh, q);
    // One stitch direction per region, mostly across the picture like long satin floats.
    for (let i = 0; i < gw * gh; i++) {
      const v = lab[i];
      if (v === 255) continue;
      const th = (hash2(v, 7, input.seed) - 0.5) * 1.6 + (v % 2 ? Math.PI / 2 : 0);
      j1[i] = Math.cos(th * 2);
      j2[i] = Math.sin(th * 2);
    }
  }
  const sig = photo ? 0.6 : (u * 0.035) / f;
  const lab = labels;

  // Satin border for photos: a column round the outline, stitched across it.
  const border = photo ? u * 0.045 : 0;

  // Threads: evenly spaced streamlines of the stitch direction, drawn into a texture.
  const j1h = gauss(j1, gw, gh, sig);
  const j2h = gauss(j2, gw, gh, sig);
  const sepT = tw;
  // Region and direction on the half-res grid, looked up nearest (the field is smooth).
  const regG = new Int16Array(gw * gh);
  const dxG = new Float32Array(gw * gh);
  const dyG = new Float32Array(gw * gh);
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const i = y * gw + x;
      const d = sd2[i] * f;
      let reg = -1;
      if (d < -0.35) {
        if (border && d > -border) reg = 254;
        else if (lab) reg = lab[i] === 255 ? -1 : lab[i];
        else reg = 0;
      }
      regG[i] = reg;
      if (reg === 254) {
        const ddx = sd2[Math.min(i + 1, gw * gh - 1)] - sd2[Math.max(i - 1, 0)];
        const ddy = sd2[Math.min(i + gw, gw * gh - 1)] - sd2[Math.max(i - gw, 0)];
        const l = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
        dxG[i] = ddx / l;
        dyG[i] = ddy / l;
      } else {
        let c2 = j1h[i];
        let s2 = j2h[i];
        const l = Math.sqrt(c2 * c2 + s2 * s2);
        if (l < 1e-9) {
          c2 = 1;
          s2 = 0;
        } else {
          c2 /= l;
          s2 /= l;
        }
        dxG[i] = Math.sqrt(Math.max(0, (1 + c2) * 0.5));
        dyG[i] = (s2 < 0 ? -1 : 1) * Math.sqrt(Math.max(0, (1 - c2) * 0.5));
      }
    }
  }
  const cellOf = (x: number, y: number) => {
    let gx = (x / f) | 0;
    let gy = (y / f) | 0;
    if (gx >= gw) gx = gw - 1;
    if (gy >= gh) gy = gh - 1;
    return gy * gw + gx;
  };
  const regionAt = (x: number, y: number) => regG[cellOf(x, y)];
  const dirAt = (x: number, y: number, out: Float32Array) => {
    const c = cellOf(x, y);
    out[0] = dxG[c];
    out[1] = dyG[c];
  };
  const seeds: number[] = [];
  const sg = Math.max(4, u * 0.05);
  for (let y = art.y0; y < art.y1; y += sg) for (let x = art.x0; x < art.x1; x += sg) seeds.push(x + 0.5, y + 0.5);
  const lines = streamlines(w, h, sepT, regionAt, dirAt, seeds);
  // Rasterise the threads: a round profile across each, max-blended, a little brighter or darker
  // thread by thread. Where no thread landed, the underlay shows, darker.
  const tex = new Float32Array(n);
  const rr = rng(input.seed + 23);
  const rad = sepT * 0.62;
  for (const l of lines) {
    const tone = 0.86 + rr() * 0.14;
    for (let k = 0; k + 2 < l.length; k += 2) {
      const ax = l[k];
      const ay = l[k + 1];
      const bx = l[k + 2];
      const by = l[k + 3];
      const ex = bx - ax;
      const ey = by - ay;
      const el = ex * ex + ey * ey || 1;
      const xmin = Math.max(0, Math.floor(Math.min(ax, bx) - rad));
      const xmax = Math.min(w - 1, Math.ceil(Math.max(ax, bx) + rad));
      const ymin = Math.max(0, Math.floor(Math.min(ay, by) - rad));
      const ymax = Math.min(h - 1, Math.ceil(Math.max(ay, by) + rad));
      for (let y = ymin; y <= ymax; y++) {
        for (let x = xmin; x <= xmax; x++) {
          const qx = x + 0.5 - ax;
          const qy = y + 0.5 - ay;
          let t = (qx * ex + qy * ey) / el;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const dx = qx - ex * t;
          const dy = qy - ey * t;
          const d2 = (dx * dx + dy * dy) / (rad * rad);
          if (d2 >= 1) continue;
          const v = Math.sqrt(1 - d2) * tone;
          const i = y * w + x;
          if (v > tex[i]) tex[i] = v;
        }
      }
    }
  }

  // Height: satin rolls over padding, a little ridge just inside the edge. Built on the half grid;
  // its normals are interpolated up (smooth, no stair-steps).
  const pil2 = gauss(a2.data, gw, gh, (u * (photo ? 0.02 : 0.03)) / f);
  const Hs = u * (photo ? 0.02 : 0.03);
  const ridgeW = Math.max(tw * 0.9, f * 0.9);
  const h2 = new Float32Array(gw * gh);
  for (let i = 0; i < h2.length; i++) {
    const d = sd2[i] * f;
    if (d > 3) continue;
    let hh = Hs * Math.sqrt(clamp01((pil2[i] - 0.45) * 1.9));
    const e = (d + ridgeW) / ridgeW;
    hh += u * 0.006 * Math.exp(-e * e);
    if (edge2) hh += u * 0.006 * Math.sqrt(clamp01((-edge2[i] * f) / (u * 0.025)));
    if (border) {
      const q = (d + border) / border;
      if (q > 0) hh += u * 0.022 * Math.sqrt(Math.max(0, 1 - (q * 2 - 1) ** 2));
    }
    h2[i] = hh;
  }
  const hs2 = gauss(h2, gw, gh, 0.6);
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

  const fabricLight = luma(color) < 0.72;
  const fabric: RGB = fabricLight ? [242, 238, 228] : [36, 54, 88];
  const grain = noiseField(w, h, u * 0.2, input.seed + 5, 2);
  const [lx, ly, lz] = L;
  const [hx, hy, hz] = Hv;
  const borderCol = photo ? color : color;
  const pxF = new Uint8ClampedArray(n * 4);
  const pxS = new Uint8ClampedArray(n * 4);
  const satinMask = new Float32Array(n);
  const fabricMask = new Float32Array(n);
  const twill = Math.max(2.2, u * 0.012);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const fd = fabricDist[i];
      if (fd > 1) continue;
      // --- Backing twill (only where the satin doesn't hide it) ---
      const fa = clamp01(0.5 - fd);
      fabricMask[i] = fa;
      if (sd[i] >= -1.5) {
        const tw1 = (x + y * 0.55) / twill;
        const tri = Math.abs(tw1 - Math.floor(tw1) - 0.5) * 2;
        let k = 0.93 + tri * 0.07 + grain[i] * 0.03;
        // Hot-cut edge: sealed, a touch darker, with a soft bevel.
        const rim = clamp01(1 + fd / 2.2);
        k *= 1 - rim * 0.18;
        pxF[i * 4] = fabric[0] * k;
        pxF[i * 4 + 1] = fabric[1] * k;
        pxF[i * 4 + 2] = fabric[2] * k;
        pxF[i * 4 + 3] = fa * 255;
      }

      // --- Satin ---
      const d = sd[i];
      if (d > 1) continue;
      const sa = clamp01(0.5 - d);
      satinMask[i] = sa;
      // Stitch direction from the grid.
      const gc = cellOf(x, y);
      let dx = dxG[gc];
      let dy = dyG[gc];
      let col: RGB = color;
      let edgeDist = d;
      if (border && d > -border) {
        // In the border column the stitches cross the outline: along the distance gradient.
        const gx = sd[i + 1 < n ? i + 1 : i] - sd[i > 0 ? i - 1 : i];
        const gy = sd[i + w < n ? i + w : i] - sd[i >= w ? i - w : i];
        const gl = Math.sqrt(gx * gx + gy * gy) || 1;
        dx = gx / gl;
        dy = gy / gl;
        col = borderCol;
        edgeDist = Math.max(d, -(d + border));
      } else if (lab) {
        const v = lab[Math.min(gh - 1, (y / f) | 0) * gw + Math.min(gw - 1, (x / f) | 0)];
        if (v !== 255) col = regionCols[v];
      }
      // The thread texture: 1 on a thread's crest, 0 in the grooves between threads.
      const th = tex[i] > 0.05 ? tex[i] : photo ? 0.55 : 0.3;
      // Thread tangent rolls over the padding: tilt by the height slope along it.
      const nxx = NX[i];
      const nyy = NY[i];
      const nzz = Math.sqrt(Math.max(0.0001, 1 - nxx * nxx - nyy * nyy));
      const tz = -(nxx * dx + nyy * dy) / (nzz || 1);
      const tl = 1 / Math.sqrt(1 + tz * tz);
      const Tx = dx * tl;
      const Ty = dy * tl;
      const Tz = tz * tl;
      const TH = Tx * hx + Ty * hy + Tz * hz;
      let sp = 1 - TH * TH;
      sp *= sp;
      sp *= sp;
      sp *= sp;
      const spec = (sp * sp * 0.4 + sp * 0.16) * th * th;
      const TL = Tx * lx + Ty * ly + Tz * lz;
      const diffK = Math.sqrt(Math.max(0, 1 - TL * TL));
      const nl = clamp01(nxx * lx + nyy * ly + nzz * lz);
      let kk = (0.34 + 0.46 * nl + 0.24 * diffK) * (0.5 + 0.55 * th);
      // Threads dive into the cloth at the edges.
      kk *= 0.72 + 0.28 * clamp01(-edgeDist / (tw * 1.2));
      // Thread sheen is a lighter tint of the thread, not white.
      pxS[i * 4] = col[0] * kk + (255 - col[0] * 0.55) * spec;
      pxS[i * 4 + 1] = col[1] * kk + (255 - col[1] * 0.55) * spec;
      pxS[i * 4 + 2] = col[2] * kk + (255 - col[2] * 0.55) * spec;
      pxS[i * 4 + 3] = sa * 255;
    }
  }

  const { canvas, ctx } = output(art);
  softShadows(ctx, fabricMask, art, L, 0.9);
  ctx.drawImage(toCanvas(pxF, w, h), 0, 0);
  // The satin stands proud of the twill.
  drawShadow(ctx, satinMask, w, h, { blur: Math.max(2, u * 0.008), dx: -L[0] * u * 0.008, dy: -L[1] * u * 0.008 + u * 0.004, opacity: 0.4 });
  ctx.drawImage(toCanvas(pxS, w, h), 0, 0);

  // Split-stitch outline in a darker shade (for photos, between border and picture).
  const outline = shade(photo ? color : color, -0.24, 0.05);
  const level = photo ? -border - tw * 0.2 : -tw * 0.55;
  const paths = gridPaths(sd2, gw, gh, level / f, f, 2);
  const chain = runningStitch(paths, tw * 2.6, -tw * 0.9, 0);
  drawStitches(ctx, chain, { width: tw * 1.45, color: outline, L, shadow: 0.25, sheen: 0.7, twist: true });
  return canvas;
}
