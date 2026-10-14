/*
 * Rhinestones: the art set with round, faceted, foil-backed gems in silver prong cups. A row of
 * smaller stones traces the outline, the inside is packed on a hex grid and the gaps are filled with
 * tiny ones. Each stone's facets catch the light differently (a point light at `light`), the ones
 * nearest it flash with a star, and the stars twinkle with `phase`. A photo becomes a bling mosaic:
 * every stone takes the colour under it.
 */

import {
  clamp,
  clamp01,
  downsample,
  gridPaths,
  hash2,
  hexRGB,
  hslToRgb,
  hslInto,
  lightDir,
  output,
  readArt,
  resamplePath,
  rgbToHsl,
  rng,
  sample,
  signedDistance,
  softShadows,
  toCanvas,
  type RGB,
} from "./core";
import type { MaterialInput } from "./types";

type Gems = { x: number[]; y: number[]; r: number[] };

export function rhinestone(input: MaterialInput): HTMLCanvasElement {
  const art = readArt(input, (u) => u * 0.04 + 8);
  const { w, h, u, photo } = art;
  const L = lightDir(input.light);
  const base = hexRGB(input.color);
  const f = 2;
  const a2 = downsample(art.alpha, w, h, f);
  const gw = a2.w;
  const gh = a2.h;
  const sd2 = signedDistance(a2.data, gw, gh);
  const sdAt = (x: number, y: number) => sample(sd2, gw, gh, x / f - 0.5, y / f - 0.5) * f;

  // --- Placement ---
  const R = photo ? clamp(u * 0.045, 4, 44) : clamp(u * 0.056, 4, 44);
  const gems: Gems = { x: [], y: [], r: [] };
  const cell = R * 2;
  const cw = Math.ceil(w / cell) + 1;
  const ch = Math.ceil(h / cell) + 1;
  const buckets: number[][] = Array.from({ length: cw * ch }, () => []);
  const fits = (x: number, y: number, r: number) => {
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    for (let j = cy - 1; j <= cy + 1; j++) {
      if (j < 0 || j >= ch) continue;
      for (let i = cx - 1; i <= cx + 1; i++) {
        if (i < 0 || i >= cw) continue;
        for (const g of buckets[j * cw + i]) {
          const dx = gems.x[g] - x;
          const dy = gems.y[g] - y;
          const m = (gems.r[g] + r) * 0.97;
          if (dx * dx + dy * dy < m * m) return false;
        }
      }
    }
    return true;
  };
  const add = (x: number, y: number, r: number) => {
    const k = gems.x.length;
    gems.x.push(x);
    gems.y.push(y);
    gems.r.push(r);
    buckets[Math.floor(y / cell) * cw + Math.floor(x / cell)].push(k);
  };
  // 1. A row of smaller stones along the outline.
  const Re = R * (photo ? 1 : 0.8);
  for (const p of gridPaths(sd2, gw, gh, -Re / f, f, 3)) {
    const pts = resamplePath(p, Re * 2.04);
    for (let k = 0; k < pts.length; k += 4) if (fits(pts[k], pts[k + 1], Re)) add(pts[k], pts[k + 1], Re);
  }
  // 2. The inside on a hex grid.
  const sx = R * 2.04;
  const sy = sx * Math.sqrt(3) * 0.5;
  for (let row = 0, y = art.y0 + R; y < art.y1; row++, y += sy) {
    for (let x = art.x0 + (row % 2 ? sx / 2 : 0); x < art.x1; x += sx) {
      if (sdAt(x, y) < -R * 0.85 && fits(x, y, R)) add(x, y, R);
    }
  }
  // 3. Small stones in the gaps, then tiny ones.
  const rand = rng(input.seed * 7 + 3);
  for (const k of [0.55, 0.38]) {
    const r = R * k;
    const cand: number[] = [];
    for (let y = art.y0; y < art.y1; y += r * 0.6) for (let x = art.x0; x < art.x1; x += r * 0.6) cand.push(x, y);
    for (let i = cand.length / 2 - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tx = cand[i * 2];
      const ty = cand[i * 2 + 1];
      cand[i * 2] = cand[j * 2];
      cand[i * 2 + 1] = cand[j * 2 + 1];
      cand[j * 2] = tx;
      cand[j * 2 + 1] = ty;
    }
    for (let i = 0; i < cand.length; i += 2) {
      const x = cand[i] + (rand() - 0.5) * r * 0.3;
      const y = cand[i + 1] + (rand() - 0.5) * r * 0.3;
      if (sdAt(x, y) < -r * 0.6 && fits(x, y, r)) add(x, y, r);
    }
  }

  // --- Colours ---
  const nG = gems.x.length;
  const cols: RGB[] = [];
  for (let g = 0; g < nG; g++) {
    if (!photo) {
      cols.push(base);
      continue;
    }
    let rr = 0;
    let gg = 0;
    let bb = 0;
    let n = 0;
    const r = gems.r[g] * 0.6;
    for (let k = 0; k < 9; k++) {
      const x = Math.round(gems.x[g] + (((k % 3) - 1) * r) / 1);
      const y = Math.round(gems.y[g] + ((((k / 3) | 0) - 1) * r) / 1);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const i = (y * w + x) * 4;
      if (art.rgba[i + 3] < 128) continue;
      rr += art.rgba[i];
      gg += art.rgba[i + 1];
      bb += art.rgba[i + 2];
      n++;
    }
    const c: RGB = n ? [rr / n, gg / n, bb / n] : base;
    const hsl = rgbToHsl(c);
    // Richer where there is colour; whites and greys stay clear crystal. (Judged by chroma: HSL
    // calls a pale cloud-white fully saturated, which would set it with blue stones.)
    const chroma = (Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2])) / 255;
    const sat = hsl[1] * clamp01((chroma - 0.08) * 5) * 1.15;
    cols.push(hslToRgb(hsl[0], clamp01(sat), clamp(hsl[2], 0.12, 0.9)));
  }

  // --- Render each stone in its own box ---
  const px = new Uint8ClampedArray(w * h * 4);
  const mask = new Float32Array(w * h);
  const lpx = (input.light.x * art.W - art.ox) * 1;
  const lpy = (input.light.y * art.H - art.oy) * 1;
  const lz = Math.max(art.W, art.H) * 0.55;
  const glint = new Float32Array(nG);
  const fire = new Float32Array(3);
  const TAU = Math.PI * 2;
  for (let g = 0; g < nG; g++) {
    const gx = gems.x[g];
    const gy = gems.y[g];
    const r = gems.r[g];
    const c = cols[g];
    const hsl = rgbToHsl(c);
    const deep = hslToRgb(hsl[0], clamp01(hsl[1] * 1.1), hsl[2] * 0.45);
    const lite = hslToRgb(hsl[0], hsl[1] * 0.7, Math.min(0.94, hsl[2] * 0.4 + 0.6));
    const rot = hash2(g, 1, input.seed) * TAU;
    const gr = hash2(g, 2, input.seed);
    // Per-stone point light (so stones near the light flash), biased by the global key light.
    let Lx = (lpx - gx) / lz + L[0] * 0.6;
    let Ly = (lpy - gy) / lz + L[1] * 0.6;
    let Lz = 1;
    const ll = Math.sqrt(Lx * Lx + Ly * Ly + Lz * Lz);
    Lx /= ll;
    Ly /= ll;
    Lz /= ll;
    let Hx = Lx;
    let Hy = Ly;
    let Hz = Lz + 1;
    const hl = Math.sqrt(Hx * Hx + Hy * Hy + Hz * Hz);
    Hx /= hl;
    Hy /= hl;
    Hz /= hl;
    glint[g] = Hz;
    const stoneR = r * 0.84;
    const prongs = r > R * 0.7 ? 6 : 4;
    const x0 = Math.max(0, Math.floor(gx - r - 1));
    const x1 = Math.min(w - 1, Math.ceil(gx + r + 1));
    const y0 = Math.max(0, Math.floor(gy - r - 1));
    const y1 = Math.min(h - 1, Math.ceil(gy + r + 1));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - gx;
        const dy = y + 0.5 - gy;
        const d = Math.sqrt(dx * dx + dy * dy);
        const cov = clamp01(r - d + 0.5);
        if (cov <= 0) continue;
        const i = y * w + x;
        let red: number;
        let grn: number;
        let blu: number;
        const phi = Math.atan2(dy, dx);
        // Prongs: little silver beads holding the stone at its girdle.
        let prong = -1;
        for (let k = 0; k < prongs; k++) {
          const a = rot + (k * TAU) / prongs;
          const px0 = gx + Math.cos(a) * stoneR * 1.02;
          const py0 = gy + Math.sin(a) * stoneR * 1.02;
          const qx = x + 0.5 - px0;
          const qy = y + 0.5 - py0;
          const pr = r * 0.17;
          const q = (qx * qx + qy * qy) / (pr * pr);
          if (q < 1) {
            prong = q;
            const nz = Math.sqrt(1 - q);
            const nx = qx / pr;
            const ny = qy / pr;
            const sp = Math.pow(Math.max(0, nx * Hx + ny * Hy + nz * Hz), 30);
            const v = 0.6 + 0.35 * clamp01(nx * Lx + ny * Ly + nz * Lz) + sp * 0.9;
            red = 204 * v;
            grn = 210 * v;
            blu = 220 * v;
            const j = i * 4;
            px[j] = red;
            px[j + 1] = grn;
            px[j + 2] = blu;
            px[j + 3] = 255;
            mask[i] = 1;
            break;
          }
        }
        if (prong >= 0) continue;
        if (d > stoneR) {
          // The cup: a polished silver rim.
          const cq = clamp((d - (stoneR + r) / 2) / ((r - stoneR) / 2), -1, 1);
          const nr = cq * 0.85;
          const nz = Math.sqrt(1 - nr * nr);
          const nx = (dx / d) * nr;
          const ny = (dy / d) * nr;
          const sp = Math.pow(Math.max(0, nx * Hx + ny * Hy + nz * Hz), 24);
          const env = 0.5 + 0.5 * Math.sin(phi * 3 + rot);
          const v = 0.55 + 0.32 * clamp01(nx * Lx + ny * Ly + nz * Lz) + env * 0.14 + sp * 0.8;
          red = 200 * v;
          grn = 207 * v;
          blu = 218 * v;
          // Shadow where the stone sits in the cup.
          const inner = clamp01(1 - (d - stoneR) / (r * 0.06));
          red *= 1 - inner * 0.45;
          grn *= 1 - inner * 0.45;
          blu *= 1 - inner * 0.4;
        } else {
          // The stone: a round brilliant seen from above.
          const rs = d / stoneR;
          const a = phi - rot;
          const sector = Math.floor((((a % TAU) + TAU) % TAU) / (Math.PI / 4));
          const within = (((a % TAU) + TAU) % TAU) - (sector + 0.5) * (Math.PI / 4);
          const oct = rs * Math.cos(within);
          let facet: number;
          let tilt: number;
          let az: number;
          if (oct < 0.46) {
            facet = 0;
            tilt = 0;
            az = 0;
          } else if (rs < 0.76) {
            const sub = within < 0 ? 0 : 1;
            facet = 1 + sector * 2 + sub;
            tilt = 0.42;
            az = rot + (sector + 0.25 + sub * 0.5) * (Math.PI / 4);
          } else {
            const id = Math.floor((((a + Math.PI / 16) % TAU) + TAU) % TAU / (Math.PI / 8));
            facet = 20 + id;
            tilt = 0.72;
            az = rot + id * (Math.PI / 8);
          }
          const st = Math.sin(tilt);
          const nx = st * Math.cos(az);
          const ny = st * Math.sin(az);
          const nz = Math.cos(tilt);
          const fr = hash2(g, facet, input.seed + 9);
          const nh = nx * Hx + ny * Hy + nz * Hz;
          let sp = Math.max(0, nh);
          sp = Math.pow(sp, facet === 0 ? 60 : 26);
          // Reflected environment: a band of sky and room, broken up per facet.
          const rx = 2 * nz * nx;
          const ry = 2 * nz * ny;
          const env = 0.5 + 0.5 * Math.sin(rx * 4.5 - ry * 3.2 + gr * 9 + fr * 2.5);
          let v: number;
          if (facet === 0) {
            // Through the table: the pavilion's facets reflected off the foil, a star pattern.
            const ring = Math.floor(rs * 4);
            v = 0.5 + 0.3 * (((sector + ring) & 1) * 2 - 1) * (0.5 + 0.5 * fr) + 0.1 * env;
          } else {
            // Crown facets alternate bright and dark (the classic star), lit side brighter.
            const alt = ((sector + (facet >= 20 ? 1 : 0) + (within < 0 ? 0 : 1)) & 1) * 0.42;
            const lit = clamp01(nx * Lx + ny * Ly) * 0.9;
            v = 0.1 + alt + lit * 0.45 + 0.22 * env * fr;
          }
          v = clamp01(v);
          red = deep[0] + (lite[0] - deep[0]) * v;
          grn = deep[1] + (lite[1] - deep[1]) * v;
          blu = deep[2] + (lite[2] - deep[2]) * v;
          // Fire: some facets split the light into colour.
          if (fr > 0.86 && facet !== 0) {
            hslInto(fr * 7 + input.light.x, 0.9, 0.7, fire);
            red += (fire[0] - red) * 0.45;
            grn += (fire[1] - grn) * 0.45;
            blu += (fire[2] - blu) * 0.45;
          }
          // Facet edges read as fine darker lines.
          const edge = Math.min(Math.abs(within) * rs * 6, Math.abs(rs - 0.76) * 14, Math.abs(oct - 0.46) * 14);
          const ek = 0.8 + 0.2 * clamp01(edge * 3);
          red = red * ek + 255 * sp;
          grn = grn * ek + 255 * sp;
          blu = blu * ek + 255 * sp;
          // A darker girdle.
          const gd = clamp01((rs - 0.9) / 0.1);
          red *= 1 - gd * 0.35;
          grn *= 1 - gd * 0.35;
          blu *= 1 - gd * 0.3;
        }
        const j = i * 4;
        const pa = px[j + 3] / 255;
        // Neighbouring cups may touch; keep the stronger coverage.
        if (cov >= pa) {
          px[j] = red;
          px[j + 1] = grn;
          px[j + 2] = blu;
          px[j + 3] = cov * 255;
        }
        if (cov > mask[i]) mask[i] = cov;
      }
    }
  }

  const { canvas, ctx } = output(art);
  softShadows(ctx, mask, art, L, 0.8, 0.7);
  ctx.drawImage(toCanvas(px, w, h), 0, 0);

  // --- Star glints on the stones nearest the light, twinkling with phase ---
  const order = Array.from({ length: nG }, (_, g) => g).sort((a, b) => glint[b] - glint[a]);
  const top = order.slice(0, Math.max(4, Math.round(nG * 0.16)));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const g of top) {
    const pick = hash2(g, 5, input.seed);
    if (pick < 0.3) continue;
    const speed = pick > 0.8 ? 2 : 1;
    const tw = 0.5 + 0.5 * Math.sin(TAU * (input.phase * speed + hash2(g, 6, input.seed)));
    const k = Math.pow(tw, 3) * clamp01((glint[g] - 0.6) * 4) * (0.6 + 0.4 * pick);
    if (k < 0.08) continue;
    const r = gems.r[g];
    // The glint sits on the side of the stone facing the light.
    const sx2 = gems.x[g] + L[0] * r * 0.45;
    const sy2 = gems.y[g] + L[1] * r * 0.45;
    const len = r * (2.4 + pick * pick * 3) * (0.6 + 0.4 * k);
    const glow = ctx.createRadialGradient(sx2, sy2, 0, sx2, sy2, r * 1.3);
    glow.addColorStop(0, `rgba(255,255,255,${0.95 * k})`);
    glow.addColorStop(0.25, `rgba(255,255,255,${0.5 * k})`);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx2, sy2, r * 1.3, 0, TAU);
    ctx.fill();
    // Rays: white at the core, tinted by the stone further out so they still read on a light page.
    const tint = cols[g];
    const tr = Math.round(tint[0] * 0.55 + 40);
    const tg = Math.round(tint[1] * 0.55 + 60);
    const tb = Math.round(tint[2] * 0.55 + 90);
    ctx.globalCompositeOperation = "source-over";
    const rays = ctx.createRadialGradient(sx2, sy2, 0, sx2, sy2, len);
    rays.addColorStop(0, `rgba(255,255,255,${0.95 * k})`);
    rays.addColorStop(0.18, `rgba(255,255,255,${0.75 * k})`);
    rays.addColorStop(0.5, `rgba(${tr},${tg},${tb},${0.4 * k})`);
    rays.addColorStop(1, `rgba(${tr},${tg},${tb},0)`);
    ctx.fillStyle = rays;
    ctx.beginPath();
    const rot = Math.PI / 12;
    for (let q = 0; q < 8; q++) {
      const a = rot + (q * Math.PI) / 4;
      const l = q % 2 === 0 ? len : len * 0.42;
      const wdt = r * (q % 2 === 0 ? 0.16 : 0.11);
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      ctx.moveTo(sx2 - sa * wdt, sy2 + ca * wdt);
      ctx.lineTo(sx2 + ca * l, sy2 + sa * l);
      ctx.lineTo(sx2 + sa * wdt, sy2 - ca * wdt);
      ctx.closePath();
    }
    ctx.fill();
    ctx.globalCompositeOperation = "lighter";
  }
  ctx.restore();
  return canvas;
}
