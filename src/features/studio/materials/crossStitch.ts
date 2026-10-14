/*
 * Cross-stitch: the art sampled on a grid and worked in little Xs of two-strand floss on a patch of
 * Aida cloth (woven blocks with holes at the corners), finished with a thick merrowed edge of
 * dense overcast thread. A photo is stitched in up to 16 thread colours.
 */

import {
  clamp,
  clamp01,
  halfVec,
  hash2,
  hexRGB,
  kmeans,
  lightDir,
  noiseField,
  output,
  readArt,
  roundRectArc,
  roundRectDist,
  roundRectLength,
  shade,
  softShadows,
  toCanvas,
  type RGB,
} from "./core";
import type { MaterialInput } from "./types";

const FABRIC: RGB = [247, 244, 236];

export function crossStitch(input: MaterialInput): HTMLCanvasElement {
  const art = readArt(input, (_u, pad) => pad * 0.95);
  const { w, h, photo } = art;
  const u = art.u;
  const L = lightDir(input.light);
  const Hv = halfVec(L);
  const color = hexRGB(input.color);

  // The grid: square cells, centred on the art, with a margin of plain cloth.
  const s = Math.max(5, u / (photo ? 30 : 22));
  const margin = photo ? 1.2 : 1.6;
  const cols = Math.ceil(art.bw / s + margin * 2);
  const rows = Math.ceil(art.bh / s + margin * 2);
  const gx0 = art.cx - (cols * s) / 2;
  const gy0 = art.cy - (rows * s) / 2;

  // Average coverage and colour per cell.
  const nC = cols * rows;
  const cov = new Float32Array(nC);
  const acc = new Float32Array(nC * 3);
  const cnt = new Float32Array(nC);
  for (let y = 0; y < h; y++) {
    const cy = Math.floor((y + 0.5 - gy0) / s);
    if (cy < 0 || cy >= rows) continue;
    for (let x = 0; x < w; x++) {
      const cx = Math.floor((x + 0.5 - gx0) / s);
      if (cx < 0 || cx >= cols) continue;
      const i = y * w + x;
      const c = cy * cols + cx;
      const a = art.alpha[i];
      cov[c] += a;
      cnt[c]++;
      acc[c * 3] += art.rgba[i * 4] * a;
      acc[c * 3 + 1] += art.rgba[i * 4 + 1] * a;
      acc[c * 3 + 2] += art.rgba[i * 4 + 2] * a;
    }
  }
  // Which cells get an X, and in which thread.
  const stitch = new Int16Array(nC).fill(-1);
  let palette: RGB[] = [color];
  if (photo) {
    const list: number[] = [];
    const cells: number[] = [];
    for (let c = 0; c < nC; c++) {
      if (!cnt[c] || cov[c] / cnt[c] < 0.5) continue;
      const k = cov[c] || 1;
      list.push(acc[c * 3] / k, acc[c * 3 + 1] / k, acc[c * 3 + 2] / k);
      cells.push(c);
    }
    const km = kmeans(Float32Array.from(list), 16, 8);
    palette = [];
    for (let j = 0; j < km.k; j++) palette.push([km.cent[j * 3], km.cent[j * 3 + 1], km.cent[j * 3 + 2]]);
    cells.forEach((c, i) => (stitch[c] = km.idx[i]));
  } else {
    for (let c = 0; c < nC; c++) if (cnt[c] && cov[c] / cnt[c] >= 0.42) stitch[c] = 0;
  }
  // Thread shades per palette entry: shadow side, body, highlight.
  const pal = palette.map((p) => ({ base: p, dark: shade(p, -0.18, 0.05), lite: shade(p, 0.16) }));

  // Patch: the cloth rectangle, and a merrowed edge straddling it.
  const pcx = gx0 + (cols * s) / 2;
  const pcy = gy0 + (rows * s) / 2;
  const phw = (cols * s) / 2;
  const phh = (rows * s) / 2;
  const R = Math.min(phh * 0.42, s * 4.5);
  const B = clamp(u * (photo ? 0.055 : 0.075), 6, art.pad * 0.45);
  const bIn = B * 0.42;
  const bOut = B - bIn;
  const perim = roundRectLength(phw, phh, R);
  const wrap = Math.max(1.6, B * 0.16);
  const wraps = Math.round(perim / wrap);
  const wrapK = wraps / perim;
  const merrow: RGB = photo ? color : shade(color, -0.06);
  const mDark = shade(merrow, -0.22, 0.05);

  const grain = noiseField(w, h, s * 0.45, input.seed + 2, 2);
  const lx = L[0];
  const ly = L[1];
  const lz = L[2];
  const hx = Hv[0];
  const hy = Hv[1];
  const hz = Hv[2];
  const SQ = Math.SQRT1_2;
  const HW = 0.245; // thread half width, in cells

  // Per-column and per-row cell coordinates (the grid is axis-aligned, so these separate).
  const colI = new Int32Array(w);
  const colU = new Float32Array(w);
  const rowI = new Int32Array(h);
  const rowV = new Float32Array(h);
  for (let x = 0; x < w; x++) {
    const f = (x + 0.5 - gx0) / s;
    colI[x] = Math.floor(f);
    colU[x] = f - colI[x];
  }
  for (let y = 0; y < h; y++) {
    const f = (y + 0.5 - gy0) / s;
    rowI[y] = Math.floor(f);
    rowV[y] = f - rowI[y];
  }
  // Thread width along a leg: full in the middle, pinched into the holes at the corners.
  const WP = new Float32Array(65);
  for (let k = 0; k <= 64; k++) WP[k] = HW * Math.pow(Math.sin((Math.PI * k) / 64), 0.32);
  // Sheen of each leg: a fibre's highlight depends on its direction against the half vector.
  const thTop = SQ * hx + SQ * hy;
  const thBot = SQ * hx - SQ * hy;
  const sheenTop = Math.pow(Math.max(0, 1 - thTop * thTop), 6) * 0.3;
  const sheenBot = Math.pow(Math.max(0, 1 - thBot * thBot), 6) * 0.3;
  // Cell to cell variation of the floss.
  const vari = new Float32Array(nC);
  for (let c = 0; c < nC; c++) vari[c] = 0.94 + hash2(c % cols, (c / cols) | 0, input.seed) * 0.1;

  const px = new Uint8ClampedArray(w * h * 4);
  const mask = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    const cj = rowI[y];
    const vv = rowV[y];
    const bv = vv * 2 - 1;
    const bv3 = bv * bv * bv;
    const dv = Math.min(vv, 1 - vv);
    for (let x = 0; x < w; x++) {
      const X = x + 0.5;
      const Y = y + 0.5;
      const dp = roundRectDist(X, Y, pcx, pcy, phw, phh, R);
      if (dp > bOut + 1.5) continue;
      const i = y * w + x;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      if (dp < -bIn + 1) {
        // --- Aida cloth and stitches ---
        const ci = colI[x];
        const uu = colU[x];
        const c = ci >= 0 && cj >= 0 && ci < cols && cj < rows ? cj * cols + ci : -1;
        const st = c >= 0 ? stitch[c] : -1;
        // Woven blocks: puffy squares with a fine basket weave and holes at the corners.
        const bu = uu * 2 - 1;
        const bu3 = bu * bu * bu;
        const fbx = -bu3 * (1 - bv3 * bv) * 0.9;
        const fby = -bv3 * (1 - bu3 * bu) * 0.9;
        const fl = 1 / Math.sqrt(fbx * fbx + fby * fby + 1);
        let fab = 0.8 + 0.22 * clamp01((-fbx * lx - fby * ly + lz) * fl);
        // Basket weave: two little bundles per block, alternating across and along.
        const wq = (((uu * 2) | 0) + ((vv * 2) | 0)) & 1;
        const wf = wq ? uu * 4 - Math.floor(uu * 4) : vv * 4 - Math.floor(vv * 4);
        fab *= 1 + (0.5 - Math.abs(wf - 0.5)) * 0.06 + grain[i] * 0.045;
        const du = Math.min(uu, 1 - uu);
        const dc = Math.sqrt(du * du + dv * dv);
        const hole = clamp01((0.13 - dc) / 0.05);
        fab *= 1 - 0.05 * clamp01((0.06 - Math.min(du, dv)) / 0.06);
        r = FABRIC[0] * fab;
        g = FABRIC[1] * fab;
        b = FABRIC[2] * fab;
        r += (96 - r) * hole * 0.8;
        g += (106 - g) * hole * 0.8;
        b += (122 - b) * hole * 0.8;
        a = 1;

        if (st >= 0) {
          // Shadow the stitch casts on the cloth.
          const su = uu + lx * 0.08;
          const sv = vv + ly * 0.08 - 0.04;
          if (Math.abs(su - sv) * SQ < HW || Math.abs(su + sv - 1) * SQ < HW) {
            r *= 0.76;
            g *= 0.79;
            b *= 0.84;
          }
          const p = pal[st];
          // Two legs: "/" underneath, "\" on top; along runs corner to corner, across in cells.
          const tTop = (uu + vv) * 0.5;
          const dTop = (uu - vv) * SQ;
          const tBot = (uu + 1 - vv) * 0.5;
          const dBot = (uu + vv - 1) * SQ;
          const wTop = WP[(tTop * 64) | 0];
          const wBot = WP[(tBot * 64) | 0];
          let leg = 0;
          let ca = 0;
          let along = 0;
          if (Math.abs(dTop) < wTop) {
            leg = 1;
            ca = dTop / wTop;
            along = tTop;
          } else if (Math.abs(dBot) < wBot) {
            leg = 2;
            ca = dBot / wBot;
            along = tBot;
          }
          if (leg) {
            // Round cross-section, two strands side by side, twisted plies.
            const ay = leg === 1 ? -SQ : SQ;
            const nzz = Math.sqrt(Math.max(0, 1 - ca * ca));
            const nx = SQ * ca;
            const ny = ay * ca;
            const diff = clamp01(nx * lx + ny * ly + nzz * lz);
            const pl = along * 9.9 + ca * 0.9;
            const ply = 1 - Math.abs(pl - Math.floor(pl) - 0.5) * 4;
            const strand = 1 - 0.2 * Math.exp(-ca * ca * 30);
            let k = (0.5 + 0.62 * diff) * strand * (0.9 + ply * 0.1) * vari[c];
            // The top leg shades the bottom one where they cross.
            if (leg === 2 && Math.abs(dTop) < wTop + 0.07) k *= 0.72;
            const sp = (leg === 1 ? sheenTop : sheenBot) * nzz * nzz * nzz * (0.75 + 0.25 * ply);
            r = p.base[0] * k + 255 * sp;
            g = p.base[1] * k + 255 * sp;
            b = p.base[2] * k + 255 * sp;
            const rim = clamp01((Math.abs(ca) - 0.75) / 0.25) * 0.5;
            r += (p.dark[0] * 0.8 - r) * rim;
            g += (p.dark[1] * 0.8 - g) * rim;
            b += (p.dark[2] * 0.8 - b) * rim;
          }
        }
      }

      // --- Merrowed edge: a rope of dense overcast wraps over the cloth's edge ---
      if (dp > -bIn - 1) {
        const q = (dp + bIn) / B; // 0 inner .. 1 outer
        const arc = roundRectArc(X, Y, pcx, pcy, phw, phh, R);
        const ph = arc * wrapK + q * 0.55;
        const fr = ph - Math.floor(ph);
        // Each wrap is a tiny cylinder; the rope is a big one.
        const wc = Math.sin(fr * Math.PI);
        const rq = q * 2 - 1;
        const rz = Math.sqrt(Math.max(0, 1 - rq * rq));
        // Rope normal points outward from the patch: approximate with the radial direction.
        const ex = X - pcx;
        const ey = Y - pcy;
        const qx = Math.abs(ex) - (phw - R);
        const qy = Math.abs(ey) - (phh - R);
        let ox = 0;
        let oy = 0;
        if (qx > 0 && qy > 0) {
          const l = Math.hypot(qx, qy) || 1;
          ox = (qx / l) * Math.sign(ex);
          oy = (qy / l) * Math.sign(ey);
        } else if (qx > qy) ox = Math.sign(ex);
        else oy = Math.sign(ey);
        const nx = ox * rq * 0.9;
        const ny = oy * rq * 0.9;
        const nz = rz;
        const diff = clamp01(nx * lx + ny * ly + nz * lz);
        const hn = nx * hx + ny * hy + nz * hz;
        let spec = Math.max(0, hn);
        spec *= spec * spec;
        spec *= spec;
        spec *= spec;
        spec *= spec * 0.35 * wc;
        let k = (0.45 + 0.7 * diff) * (0.62 + 0.38 * wc);
        k *= 0.95 + hash2(Math.floor(arc * wrapK), 3, input.seed) * 0.1;
        let mr = merrow[0] * k + 255 * spec;
        let mg = merrow[1] * k + 255 * spec;
        let mb = merrow[2] * k + 255 * spec;
        // Valleys between wraps.
        const valley = clamp01((0.18 - Math.min(fr, 1 - fr)) / 0.18);
        mr += (mDark[0] * 0.7 - mr) * valley * 0.55;
        mg += (mDark[1] * 0.7 - mg) * valley * 0.55;
        mb += (mDark[2] * 0.7 - mb) * valley * 0.55;
        // Outer edge is scalloped by the wraps; inner edge sits on the cloth.
        const outer = clamp01(bOut - dp + 0.5 - (1 - wc) * 0.9);
        const inner = clamp01(dp + bIn + 0.5 + (1 - wc) * 0.6);
        const ma = Math.min(outer, inner);
        if (a > 0) {
          // Cloth under the inner edge gets a contact shadow.
          const sh = 1 - 0.35 * clamp01(1 - (-(dp + bIn)) / (B * 0.25));
          r *= sh;
          g *= sh;
          b *= sh;
        }
        r += (mr - r) * ma;
        g += (mg - g) * ma;
        b += (mb - b) * ma;
        a = Math.max(a * clamp01(bOut - dp + 0.5), ma);
      }
      if (a <= 0) continue;
      mask[i] = a;
      const j = i * 4;
      px[j] = r;
      px[j + 1] = g;
      px[j + 2] = b;
      px[j + 3] = a * 255;
    }
  }

  const { canvas, ctx } = output(art);
  softShadows(ctx, mask, art, L, 1.1);
  ctx.drawImage(toCanvas(px, w, h), 0, 0);
  return canvas;
}
