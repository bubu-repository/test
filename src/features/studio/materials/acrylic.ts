/*
 * Clear acrylic: the art printed on (or set inside) clear cast acrylic. Three objects share the
 * look: a die-cut standee in a little base, a die-cut keychain charm on a ball chain, and a thick
 * block with the art floating inside. Acrylic reads as acrylic by its edges: a bright polished rim,
 * a darker refraction line just inside it, a tinted band of thickness, faint glare streaks across
 * the face (they slide with `phase`), and a slight tint from `color`.
 */

import {
  clamp,
  clamp01,
  ctxOf,
  downsample,
  drawShadow,
  fillHoles,
  gauss,
  hexRGB,
  lightDir,
  makeCanvas,
  mixRGB,
  output,
  readArt,
  roundRectDist,
  sample,
  signedDistance,
  smin,
  toCanvas,
  upsample,
  type Art,
  type RGB,
  type Vec3,
} from "./core";
import type { MaterialInput } from "./types";

const TAU = Math.PI * 2;

/** Edge tint of the acrylic: a cool clear blue-green, nudged towards `color`. */
function edgeTint(color: string): RGB {
  const c = hexRGB(color);
  const cool: RGB = [196, 226, 236];
  const isWhite = c[0] > 240 && c[1] > 240 && c[2] > 240;
  return isWhite ? cool : mixRGB(cool, c, 0.55);
}

/** Diagonal glare streaks: a broad one and a thin one, repeating, sliding with phase. */
function glareAt(x: number, y: number, span: number, phase: number, lx: number): number {
  const g = (x * 0.8 - y) / span - phase - lx * 0.3;
  const fr = g - Math.floor(g);
  if (fr < 0.1 || fr > 0.52) return 0;
  const a = fr - 0.3;
  const b = fr - 0.4;
  return Math.exp(-(a * a) / 0.004) * 0.5 + Math.exp(-(b * b) / 0.0004) * 0.55;
}

/** Joins every separate island of a shape (negative inside) to the largest with a rounded bridge. */
function bridge(c2: Float32Array, gw: number, gh: number, radius: number) {
  for (let pass = 0; pass < 8; pass++) {
    const label = new Int32Array(gw * gh).fill(-1);
    const sizes: number[] = [];
    const stack = new Int32Array(gw * gh);
    for (let s0 = 0; s0 < gw * gh; s0++) {
      if (label[s0] >= 0 || c2[s0] >= 0) continue;
      const id = sizes.length;
      let sp = 0;
      let count = 0;
      stack[sp++] = s0;
      label[s0] = id;
      while (sp) {
        const i = stack[--sp];
        count++;
        const x = i % gw;
        if (x > 0 && label[i - 1] < 0 && c2[i - 1] < 0) {
          label[i - 1] = id;
          stack[sp++] = i - 1;
        }
        if (x < gw - 1 && label[i + 1] < 0 && c2[i + 1] < 0) {
          label[i + 1] = id;
          stack[sp++] = i + 1;
        }
        if (i >= gw && label[i - gw] < 0 && c2[i - gw] < 0) {
          label[i - gw] = id;
          stack[sp++] = i - gw;
        }
        if (i + gw < gw * gh && label[i + gw] < 0 && c2[i + gw] < 0) {
          label[i + gw] = id;
          stack[sp++] = i + gw;
        }
      }
      sizes.push(count);
    }
    if (sizes.length <= 1) return;
    let main = 0;
    for (let k = 1; k < sizes.length; k++) if (sizes[k] > sizes[main]) main = k;
    // Edge pixels of each island.
    const edges: number[][] = sizes.map(() => []);
    for (let y = 1; y < gh - 1; y++) {
      for (let x = 1; x < gw - 1; x++) {
        const i = y * gw + x;
        const l = label[i];
        if (l < 0) continue;
        if (c2[i - 1] >= 0 || c2[i + 1] >= 0 || c2[i - gw] >= 0 || c2[i + gw] >= 0) edges[l].push(i);
      }
    }
    // Join the island nearest to the main one, then go again.
    let best = Infinity;
    let pa = 0;
    let pb = 0;
    for (let k = 0; k < sizes.length; k++) {
      if (k === main) continue;
      for (const a of edges[k]) {
        const ax = a % gw;
        const ay = (a / gw) | 0;
        for (let q = 0; q < edges[main].length; q += 2) {
          const b = edges[main][q];
          const dx = (b % gw) - ax;
          const dy = ((b / gw) | 0) - ay;
          const d = dx * dx + dy * dy;
          if (d < best) {
            best = d;
            pa = a;
            pb = b;
          }
        }
      }
    }
    const ax = pa % gw;
    const ay = (pa / gw) | 0;
    const bx = pb % gw;
    const by = (pb / gw) | 0;
    const ex = bx - ax;
    const ey = by - ay;
    const el = ex * ex + ey * ey || 1;
    const x0 = Math.max(0, Math.min(ax, bx) - Math.ceil(radius) - 2);
    const x1 = Math.min(gw - 1, Math.max(ax, bx) + Math.ceil(radius) + 2);
    const y0 = Math.max(0, Math.min(ay, by) - Math.ceil(radius) - 2);
    const y1 = Math.min(gh - 1, Math.max(ay, by) + Math.ceil(radius) + 2);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const qx = x - ax;
        const qy = y - ay;
        const t = clamp01((qx * ex + qy * ey) / el);
        const dx = qx - ex * t;
        const dy = qy - ey * t;
        const d = Math.sqrt(dx * dx + dy * dy) - radius;
        const i = y * gw + x;
        c2[i] = smin(c2[i], d, radius * 0.8);
      }
    }
  }
}

/**
 * The die-line: the art closed (gaps between letters filled, as a cutter would) and grown by D,
 * islands bridged into one piece, small holes closed, smoothed into easy curves. Half-res field,
 * in full-res pixels.
 */
function dieLine(art: Art, D: number) {
  // Quarter resolution is plenty: the outline is smoothed far more than that afterwards.
  const f = 4;
  const a2 = downsample(art.alpha, art.w, art.h, f);
  const gw = a2.w;
  const gh = a2.h;
  const sd2 = signedDistance(a2.data, gw, gh);
  // Closing: grow by R, then shrink back to D.
  const R = Math.max(D * 1.5, art.u * 0.16);
  const grown = new Float32Array(gw * gh);
  for (let i = 0; i < grown.length; i++) grown[i] = clamp01(0.5 - (sd2[i] * f - R) / f);
  const sdC = signedDistance(grown, gw, gh);
  const c2 = new Float32Array(gw * gh);
  for (let i = 0; i < c2.length; i++) c2[i] = Math.max(sdC[i] * f + (R - D), sd2[i] * f - R);
  bridge(c2, gw, gh, (art.u * 0.07) / f);
  fillHoles(c2, gw, gh, ((art.u * 0.6) / f) ** 2, true, -D);
  return { f, gw, gh, cut: gauss(c2, gw, gh, (art.u * 0.03) / f) };
}

/**
 * Renders a flat clear-acrylic piece given its outline distance (full-res, negative inside) and
 * the art printed on it. Returns straight RGBA and coverage.
 */
function sheet(art: Art, pieceD: Float32Array, L: Vec3, tint: RGB, phase: number, light: { x: number; y: number }) {
  const { w, h, u } = art;
  const n = w * h;
  const px = new Uint8ClampedArray(n * 4);
  const mask = new Float32Array(n);
  const T = Math.max(4, u * 0.034);
  const span = Math.max(art.bw, art.bh) * 0.9;
  const lx = light.x - 0.5;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const d = pieceD[i];
      if (d > 0.5) continue;
      const cov = clamp01(0.5 - d);
      const din = -d;
      // Outward normal of the edge (for which side catches the light).
      const ex = pieceD[x + 1 < w ? i + 1 : i] - pieceD[x > 0 ? i - 1 : i];
      const ey = pieceD[y + 1 < h ? i + w : i] - pieceD[y > 0 ? i - w : i];
      const el = Math.sqrt(ex * ex + ey * ey) || 1;
      const facing = -(ex * L[0] + ey * L[1]) / el; // +1 facing the light
      // Clear face: barely there, a whisper of white.
      let r = 250;
      let g = 252;
      let b = 255;
      let a = 0.07 + 0.04 * (1 - y / h);
      if (din < T) {
        // The polished edge seen through the face: bright rim, dark refraction line, tinted band.
        const t = din / T;
        const rim = Math.exp(-(din * din) / 2.2);
        const dark = Math.exp(-((t - 0.4) * (t - 0.4)) / 0.015);
        const lit = 0.5 + 0.5 * facing;
        r = tint[0] + (255 - tint[0]) * rim * lit;
        g = tint[1] + (255 - tint[1]) * rim * lit;
        b = tint[2] + (255 - tint[2]) * rim * lit;
        r *= 1 - dark * 0.35;
        g *= 1 - dark * 0.3;
        b *= 1 - dark * 0.25;
        a = 0.1 + rim * 0.85 * lit + dark * 0.38 + (1 - t) * (1 - t) * 0.35;
      }
      // The print.
      const pa = art.alpha[i];
      if (pa > 0) {
        const j = i * 4;
        r += (art.rgba[j] - r) * pa;
        g += (art.rgba[j + 1] - g) * pa;
        b += (art.rgba[j + 2] - b) * pa;
        a += (1 - a) * pa;
      }
      // Glare on the surface (weaker over the print).
      const gl = glareAt(x + art.ox, y + art.oy, span, phase, lx) * (pa > 0.5 ? 0.45 : 1);
      r += (255 - r) * gl;
      g += (255 - g) * gl;
      b += (255 - b) * gl;
      a = Math.min(1, a + gl * 0.5);
      const j = i * 4;
      px[j] = r;
      px[j + 1] = g;
      px[j + 2] = b;
      px[j + 3] = a * cov * 255;
      mask[i] = cov;
    }
  }
  return { px, mask, T };
}

/**
 * The thickness of the sheet: the side wall showing just past the face's outline (offset away from
 * the light), and the back face's edge seen faintly through the clear face.
 */
function thickness(ctx: CanvasRenderingContext2D, pieceD: Float32Array, w: number, h: number, tint: RGB, dx: number, dy: number) {
  const len = Math.hypot(dx, dy);
  const steps = Math.max(2, Math.ceil(len));
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const d = pieceD[i];
      if (d > len + 1.5) continue;
      let wall = 0;
      let line = 0;
      if (d > -0.5) {
        // Side wall: the face's outline swept back.
        for (let k = 1; k <= steps; k++) {
          const sd = sample(pieceD, w, h, x - (dx * k) / steps, y - (dy * k) / steps);
          const c = clamp01(0.5 - sd);
          if (c > wall) wall = c;
          if (wall >= 1) break;
        }
        wall *= clamp01(d + 0.5);
      } else if (d > -len - 3) {
        // The back edge through the face.
        const bd = sample(pieceD, w, h, x - dx, y - dy);
        line = Math.exp(-(bd * bd) / 0.9) * 0.22;
      }
      const a = Math.max(wall * 0.92, line);
      if (a <= 0.01) continue;
      const j = i * 4;
      const k = wall > line ? 0.84 : 1.02;
      px[j] = tint[0] * k;
      px[j + 1] = tint[1] * k;
      px[j + 2] = Math.min(255, tint[2] * k + 6);
      px[j + 3] = a * 255;
    }
  }
  ctx.drawImage(toCanvas(px, w, h), 0, 0);
}

/**
 * The shadow of a clear piece: clear PMMA only blocks light where it refracts it away, at its
 * edges, and focuses light through its middle. So: a navy band under the edges, a whisper of
 * shadow under the whole piece, and a white caustic where the light comes through.
 */
function clearShadow(ctx: CanvasRenderingContext2D, mask: Float32Array, pieceD: Float32Array, T: number, w: number, h: number, blur: number, dx: number, dy: number) {
  const n = w * h;
  const band = new Float32Array(n);
  const core = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const m = mask[i];
    if (m <= 0) continue;
    const din = -pieceD[i];
    band[i] = m * clamp01(1 - din / (T * 1.2));
    core[i] = din > T ? m : 0;
  }
  drawShadow(ctx, band, w, h, { blur, dx, dy, opacity: 0.2 });
  drawShadow(ctx, mask, w, h, { blur: blur * 1.4, dx, dy, opacity: 0.04 });
  // The caustic is sharper than the shadow (the piece focuses the light it lets through), and
  // brighter than the page it lands on.
  drawShadow(ctx, core, w, h, { blur: blur * 0.6, dx, dy, opacity: 0.5, color: [255, 255, 255] });
}

/* ------------------------------------------------------------------ standee */

export function acrylicStandee(input: MaterialInput): HTMLCanvasElement {
  const art = readArt(input);
  const { w, h, u } = art;
  const L = lightDir(input.light);
  const tint = edgeTint(input.color);
  const D = Math.min(u * 0.06, art.pad * 0.3);
  const dl = dieLine(art, D);
  // Room below the art for the tab and the base.
  const room = Math.min(h - art.y1, u * 0.75);
  const baseC = art.y1 + room * 0.52;
  const topH = room * 0.34;
  const thick = room * 0.13;
  const baseW = clamp(art.bw * 0.55, u * 0.9, art.bw * 0.95);
  const tabW = clamp(art.bw * 0.22, u * 0.25, baseW * 0.5);
  const cx = art.cx;
  // Piece: die-line ∪ tab (down into the slot), smoothly joined.
  const cut = upsample(dl.cut, dl.gw, dl.gh, w, h);
  const pieceD = cut;
  const tabTop = art.y1 - D * 2;
  const tabR = Math.min(tabW * 0.12, 6);
  const tx0 = Math.max(0, Math.floor(cx - tabW / 2 - u * 0.1));
  const tx1 = Math.min(w - 1, Math.ceil(cx + tabW / 2 + u * 0.1));
  for (let y = Math.max(0, Math.floor(tabTop - u * 0.2)); y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let d = cut[i];
      if (x >= tx0 && x <= tx1 && y < baseC + 2) {
        const tb = roundRectDist(x + 0.5, y + 0.5, cx, (tabTop + baseC) / 2, tabW / 2, (baseC - tabTop) / 2, tabR);
        d = smin(d, tb, u * 0.04);
      }
      if (y + 0.5 > baseC) d = Math.max(d, y + 0.5 - baseC);
      pieceD[i] = d;
    }
  }
  const s = sheet(art, pieceD, L, tint, input.phase, input.light);

  const { canvas, ctx } = output(art);
  // Ground shadow under the base, with a little light focused through it.
  const sh = new Float32Array(w * h);
  const ecy = baseC + topH * 0.35 + thick;
  const erx = baseW * 0.52 * 1.2;
  const ery = topH * 0.55 * 1.2;
  for (let y = Math.max(0, Math.floor(ecy - ery)); y < Math.min(h, Math.ceil(ecy + ery)); y++) {
    for (let x = Math.max(0, Math.floor(cx - erx)); x < Math.min(w, Math.ceil(cx + erx)); x++) {
      const ex = (x + 0.5 - cx) / (baseW * 0.52);
      const ey = (y + 0.5 - ecy) / (topH * 0.55);
      sh[y * w + x] = clamp01(1.2 - Math.sqrt(ex * ex + ey * ey));
    }
  }
  drawShadow(ctx, sh, w, h, { blur: u * 0.04, dx: -L[0] * u * 0.007, dy: u * 0.014, opacity: 0.35 });
  // A soft hint of the standee's own shadow falling behind it on the ground.
  clearShadow(ctx, s.mask, pieceD, s.T, w, h, u * 0.03, -L[0] * u * 0.02, -L[1] * u * 0.02 + u * 0.03);

  // The base: a clear rounded slab seen from a little above (top face, then its front edge).
  const base = makeCanvas(w, h);
  const bctx = ctxOf(base);
  const bx = cx - baseW / 2;
  const by = baseC - topH / 2;
  const br = topH * 0.5;
  // Front face (thickness).
  const fg = bctx.createLinearGradient(0, by + topH / 2, 0, by + topH + thick);
  fg.addColorStop(0, `rgba(${tint[0]},${tint[1]},${tint[2]},0.75)`);
  fg.addColorStop(1, `rgba(${tint[0] * 0.8},${tint[1] * 0.86},${tint[2] * 0.92},0.6)`);
  bctx.fillStyle = fg;
  bctx.beginPath();
  bctx.roundRect(bx, by + thick, baseW, topH, br);
  bctx.fill();
  // Top face.
  const tg = bctx.createLinearGradient(0, by, 0, by + topH);
  tg.addColorStop(0, "rgba(255,255,255,0.55)");
  tg.addColorStop(1, `rgba(${tint[0]},${tint[1]},${tint[2]},0.4)`);
  bctx.fillStyle = tg;
  bctx.beginPath();
  bctx.roundRect(bx, by, baseW, topH, br);
  bctx.fill();
  bctx.strokeStyle = "rgba(255,255,255,0.95)";
  bctx.lineWidth = Math.max(1, u * 0.006);
  bctx.stroke();
  // Refraction line inside the top face's rim.
  bctx.strokeStyle = `rgba(${tint[0] * 0.6},${tint[1] * 0.7},${tint[2] * 0.8},0.35)`;
  bctx.lineWidth = Math.max(1, u * 0.004);
  bctx.beginPath();
  bctx.roundRect(bx + u * 0.012, by + u * 0.008, baseW - u * 0.024, topH - u * 0.016, Math.max(1, br - u * 0.01));
  bctx.stroke();
  // The slot.
  bctx.fillStyle = "rgba(20,50,80,0.45)";
  bctx.beginPath();
  bctx.roundRect(cx - tabW * 0.56, baseC - Math.max(1.5, u * 0.007), tabW * 1.12, Math.max(3, u * 0.014), Math.max(1, u * 0.006));
  bctx.fill();
  // Glint along the front edge.
  bctx.strokeStyle = "rgba(255,255,255,0.8)";
  bctx.lineWidth = Math.max(1, u * 0.005);
  bctx.beginPath();
  bctx.moveTo(bx + br, by + topH + thick * 0.15);
  bctx.lineTo(bx + baseW - br, by + topH + thick * 0.15);
  bctx.stroke();
  ctx.drawImage(base, 0, 0);

  // The standing piece: its thickness, then the face.
  thickness(ctx, pieceD, w, h, tint, -L[0] * s.T * 0.9, -L[1] * s.T * 0.9);
  ctx.drawImage(toCanvas(s.px, w, h), 0, 0);
  return canvas;
}

/* ----------------------------------------------------------------- keychain */

export function acrylicKeychain(input: MaterialInput): HTMLCanvasElement {
  const art = readArt(input);
  const { w, h, u } = art;
  const L = lightDir(input.light);
  const tint = edgeTint(input.color);
  const D = Math.min(u * 0.06, art.pad * 0.3);
  const dl = dieLine(art, D);
  const cut = upsample(dl.cut, dl.gw, dl.gh, w, h);
  // Tab with the hole: on the top edge, near the middle.
  const rt = clamp(u * 0.09, 8, art.pad * 0.32);
  let tx = art.cx;
  let ty = art.y0;
  let best = Infinity;
  for (let x = Math.round(art.cx - art.bw * 0.2); x <= art.cx + art.bw * 0.2; x += 2) {
    for (let y = 0; y < h; y += 1) {
      if (cut[y * w + Math.max(0, Math.min(w - 1, x))] < 0) {
        const score = y + Math.abs(x - art.cx) * 0.25;
        if (score < best) {
          best = score;
          tx = x;
          ty = y;
        }
        break;
      }
    }
  }
  const hcx = tx;
  const hcy = Math.max(rt + 2, ty - rt * 0.15);
  const rh = rt * 0.42;
  const pieceD = cut;
  const reach = rt * 2.6;
  const ky0 = Math.max(0, Math.floor(hcy - reach));
  const ky1 = Math.min(h - 1, Math.ceil(hcy + reach));
  const kx0 = Math.max(0, Math.floor(hcx - reach));
  const kx1 = Math.min(w - 1, Math.ceil(hcx + reach));
  for (let y = ky0; y <= ky1; y++) {
    for (let x = kx0; x <= kx1; x++) {
      const i = y * w + x;
      const dx = x + 0.5 - hcx;
      const dy = y + 0.5 - hcy;
      const dc = Math.sqrt(dx * dx + dy * dy);
      pieceD[i] = Math.max(smin(cut[i], dc - rt, rt * 0.7), rh - dc);
    }
  }
  const s = sheet(art, pieceD, L, tint, input.phase, input.light);

  // Everything is drawn under one transform, so the whole charm swings about the chain's top.
  const { canvas, ctx: lc } = output(art);
  const topY = -art.oy - u * 0.05;
  const pivX0 = hcx + u * 0.05 * 0.3;
  const ang = Math.sin(input.phase * TAU) * 0.045;
  lc.translate(pivX0, topY);
  lc.rotate(ang);
  lc.translate(-pivX0, -topY);
  clearShadow(lc, s.mask, pieceD, s.T, w, h, u * 0.035, -L[0] * u * 0.025, -L[1] * u * 0.04 + u * 0.03);
  // Ring geometry: a jump ring through the hole, seen almost edge-on.
  const ringRy = rt * 1.12;
  const ringRx = ringRy * 0.42;
  const ringCx = hcx;
  const ringCy = hcy - ringRy + rh * 0.9;
  const tube = Math.max(1.8, u * 0.013);
  const metal = (c: CanvasRenderingContext2D, start: number, end: number) => {
    c.save();
    c.lineCap = "round";
    const passes: [string, number, number][] = [
      ["rgba(70,80,96,1)", tube * 2, 0],
      ["rgba(170,180,194,1)", tube * 1.5, 0],
      ["rgba(236,240,246,1)", tube * 0.7, -tube * 0.25],
      ["rgba(255,255,255,0.95)", tube * 0.28, -tube * 0.45],
    ];
    for (const [col, lw, off] of passes) {
      c.strokeStyle = col;
      c.lineWidth = lw;
      c.beginPath();
      c.ellipse(ringCx + off * 0.6, ringCy + off * 0.3, ringRx, ringRy, 0.08, start, end);
      c.stroke();
    }
    c.restore();
  };
  // Back half of the ring, behind the charm.
  metal(lc, -Math.PI / 2, Math.PI / 2);
  thickness(lc, pieceD, w, h, tint, -L[0] * s.T * 0.9, -L[1] * s.T * 0.9);
  lc.drawImage(toCanvas(s.px, w, h), 0, 0);
  // Front half of the ring, over it.
  metal(lc, Math.PI / 2, (Math.PI * 3) / 2);
  // Ball chain up out of the frame, a gentle curve.
  const startY = ringCy - ringRy - tube;
  const rb = Math.max(2, u * 0.017);
  const step = rb * 2.7;
  const len = startY - topY;
  const count = Math.max(2, Math.ceil(len / step));
  const sway = u * 0.05;
  const pts: number[] = [];
  for (let k = 0; k <= count; k++) {
    const t = k / count;
    pts.push(ringCx + Math.sin(t * Math.PI) * sway * 0.5 + t * sway * 0.3, startY - t * len);
  }
  lc.save();
  lc.strokeStyle = "rgba(110,120,136,1)";
  lc.lineWidth = Math.max(1, rb * 0.4);
  lc.beginPath();
  lc.moveTo(pts[0], pts[1]);
  for (let k = 2; k < pts.length; k += 2) lc.lineTo(pts[k], pts[k + 1]);
  lc.stroke();
  for (let k = 0; k < pts.length; k += 2) {
    const bx = pts[k];
    const by = pts[k + 1];
    const g = lc.createRadialGradient(bx + L[0] * rb * 0.45, by + L[1] * rb * 0.45, rb * 0.1, bx, by, rb);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(205,212,224,1)");
    g.addColorStop(0.85, "rgba(120,130,148,1)");
    g.addColorStop(1, "rgba(80,90,106,1)");
    lc.fillStyle = g;
    lc.beginPath();
    lc.arc(bx, by, rb, 0, TAU);
    lc.fill();
  }
  lc.restore();
  return canvas;
}

/* -------------------------------------------------------------------- block */

export function acrylicBlock(input: MaterialInput): HTMLCanvasElement {
  const art = readArt(input);
  const { w, h, u } = art;
  const L = lightDir(input.light);
  const tint = edgeTint(input.color);
  const n = w * h;
  // Block geometry: front face round the art, the back face up and to the right (oblique view).
  const above = art.y0;
  const depth = clamp(u * 0.16, 8, above * 0.75);
  const ddx = depth * 0.5;
  const ddy = -depth * 0.75;
  const m = Math.min(u * 0.12, art.pad * 0.55);
  const fhw = art.bw / 2 + m;
  const fhh = art.bh / 2 + m;
  const fcx = art.cx - ddx * 0.5;
  const fcy = art.cy - ddy * 0.5;
  const R = Math.min(u * 0.06, fhh * 0.3);
  const steps = 8;
  const span = Math.max(art.bw, art.bh) * 0.9;
  const lx = input.light.x - 0.5;
  const px = new Uint8ClampedArray(n * 4);
  const mask = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const X = x + 0.5;
      const Y = y + 0.5;
      const dFront = roundRectDist(X, Y, fcx, fcy, fhw, fhh, R);
      const dBack = roundRectDist(X, Y, fcx + ddx, fcy + ddy, fhw, fhh, R);
      // Silhouette: the front face swept to the back face.
      let dHull = Math.min(dFront, dBack);
      if (dHull > -2) {
        for (let k = 1; k < steps; k++) {
          const t = k / steps;
          const d = roundRectDist(X, Y, fcx + ddx * t, fcy + ddy * t, fhw, fhh, R);
          if (d < dHull) dHull = d;
        }
      }
      if (dHull > 0.5) continue;
      const i = y * w + x;
      const cov = clamp01(0.5 - dHull);
      let r: number;
      let g: number;
      let b: number;
      let a: number;
      if (dFront < 0.5) {
        // Looking in through the front face.
        r = 250;
        g = 252;
        b = 255;
        a = 0.1;
        const din = -dFront;
        // Polished front edge: bright rim, refraction line inside it.
        const rim = Math.exp(-(din * din) / 1.6);
        const ex = (X - fcx) / fhw;
        const ey = (Y - fcy) / fhh;
        const facing = clamp01(-(ex * L[0] + ey * L[1]) * 1.5 + 0.4);
        const T = Math.max(5, u * 0.05);
        const dark = Math.exp(-((din - T * 0.55) ** 2) / (T * 0.08));
        const band = clamp01(1 - din / T);
        r = r + (tint[0] - r) * band * 0.9;
        g = g + (tint[1] - g) * band * 0.9;
        b = b + (tint[2] - b) * band * 0.9;
        r = r * (1 - dark * 0.35) + (255 - r) * rim * (0.4 + 0.6 * facing);
        g = g * (1 - dark * 0.3) + (255 - g) * rim * (0.4 + 0.6 * facing);
        b = b * (1 - dark * 0.22) + (255 - b) * rim * (0.4 + 0.6 * facing);
        a = 0.04 + band * band * 0.45 + rim * 0.65 + dark * 0.28;
        // The art inside, and its reflection in the bottom face just below it.
        const pa = art.alpha[i];
        if (pa > 0) {
          const j = i * 4;
          r += (art.rgba[j] - r) * pa;
          g += (art.rgba[j + 1] - g) * pa;
          b += (art.rgba[j + 2] - b) * pa;
          a += (1 - a) * pa;
        } else {
          const mirrorY = 2 * (fcy + fhh - m * 0.25) - Y;
          const ry = Math.round(mirrorY - 0.5);
          if (ry >= 0 && ry < h && Y > art.y1) {
            const k = ry * w + x;
            const ra = art.alpha[k] * 0.18 * clamp01(1 - (Y - art.y1) / (m * 0.9));
            if (ra > 0) {
              r += (art.rgba[k * 4] - r) * ra;
              g += (art.rgba[k * 4 + 1] - g) * ra;
              b += (art.rgba[k * 4 + 2] - b) * ra;
              a += (1 - a) * ra;
            }
          }
        }
      } else {
        // Top or side face, seen through the block's edge: brighter, tinted, with the art
        // reflected in it (total internal reflection), squashed.
        const top = Y < fcy - fhh + 1 || (Y < fcy + ddy * 0.5 && X < fcx + fhw);
        const t = top ? clamp01((fcy - fhh - Y) / -ddy) : clamp01((X - (fcx + fhw)) / ddx);
        if (top) {
          // The top face catches the sky: light, a little tinted towards the back.
          r = 246 + (tint[0] - 246) * t * 0.6;
          g = 250 + (tint[1] - 250) * t * 0.6;
          b = 254 + (tint[2] - 254) * t * 0.6;
          a = 0.5 - t * 0.15;
        } else {
          r = tint[0] * 0.95;
          g = tint[1] * 0.97;
          b = tint[2];
          a = 0.45;
        }
        // Mirror image of the art in the face.
        let sx: number;
        let sy: number;
        if (top) {
          sx = X - ddx * t;
          sy = art.y0 + t * art.bh * 0.9;
        } else {
          sx = art.x1 - t * art.bw * 0.25;
          sy = Y - ddy * t;
        }
        const ra = sample(art.alpha, w, h, sx - 0.5, sy - 0.5) * 0.38 * (1 - t * 0.5);
        if (ra > 0) {
          const xi = Math.max(0, Math.min(w - 1, Math.round(sx - 0.5)));
          const yi = Math.max(0, Math.min(h - 1, Math.round(sy - 0.5)));
          const k = (yi * w + xi) * 4;
          r += (art.rgba[k] - r) * ra;
          g += (art.rgba[k + 1] - g) * ra;
          b += (art.rgba[k + 2] - b) * ra;
          a += (1 - a) * ra;
        }
        // Back edges: a fine bright line.
        const back = Math.exp(-(dBack * dBack) / 1.2) * (dBack > -3 ? 1 : 0);
        r += (255 - r) * back * 0.7;
        g += (255 - g) * back * 0.7;
        b += (255 - b) * back * 0.7;
        a += back * 0.35;
        // The front top/right edge where the faces meet: a crisp highlight.
        const crease = Math.exp(-(dFront * dFront) / 1.4);
        r += (255 - r) * crease;
        g += (255 - g) * crease;
        b += (255 - b) * crease;
        a += crease * 0.6;
      }
      // Glare streaks across the whole block.
      const gl = glareAt(X + art.ox, Y + art.oy, span, input.phase, lx) * 0.8;
      r += (255 - r) * gl;
      g += (255 - g) * gl;
      b += (255 - b) * gl;
      a = Math.min(1, a + gl * 0.4);
      // Silhouette rim.
      const sil = Math.exp(-(dHull * dHull) / 1.2);
      r = r * (1 - sil * 0.15);
      g = g * (1 - sil * 0.12);
      b = b * (1 - sil * 0.08);
      a = Math.min(1, a + sil * 0.35);
      const j = i * 4;
      px[j] = r;
      px[j + 1] = g;
      px[j + 2] = b;
      px[j + 3] = a * cov * 255;
      mask[i] = cov;
    }
  }
  const { canvas, ctx } = output(art);
  // The block sits on the page: a contact shadow along its base and a soft ambient one.
  const foot = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = roundRectDist(x + 0.5, y + 0.5, fcx + ddx * 0.5, fcy + fhh + ddy * 0.25, fhw + ddx * 0.4, -ddy * 0.35 + 2, R);
      foot[y * w + x] = clamp01(0.5 - d);
    }
  }
  drawShadow(ctx, foot, w, h, { blur: u * 0.025, dx: -L[0] * u * 0.006, dy: u * 0.012, opacity: 0.32 });
  drawShadow(ctx, foot, w, h, { blur: u * 0.07, dx: -L[0] * u * 0.02, dy: u * 0.04, opacity: 0.14 });
  ctx.drawImage(toCanvas(px, w, h), 0, 0);
  return canvas;
}
