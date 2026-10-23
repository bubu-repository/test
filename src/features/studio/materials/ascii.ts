/*
 * ASCII: the art typed out in monospace characters from a density ramp, on a card. Dark ink types
 * onto a paper card (a little uneven, like a typewriter); light ink, and every photo, glows on a
 * small terminal window. A photo is classic ASCII art: brightness picks the character, the photo's
 * colour tints it.
 */

import {
  clamp01,
  css,
  ctxOf,
  hash2,
  hexRGB,
  lightDir,
  luma,
  makeCanvas,
  noiseField,
  output,
  PINK,
  readArt,
  rgbToHsl,
  hslToRgb,
  roundRectDist,
  softShadows,
  toCanvas,
  type RGB,
} from "./core";
import type { MaterialInput } from "./types";

const RAMP = " .:-=+*#%@";

/** The page's monospace face if it defines one, then sensible fallbacks. */
function monoFamily(): string {
  let fam = "";
  try {
    // In the render worker there is no page to ask: the worker loads JetBrains Mono itself.
    if (typeof document !== "undefined") fam = getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim();
  } catch {
    fam = "";
  }
  const fallback = '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  return fam ? `${fam}, ${fallback}` : fallback;
}

export function ascii(input: MaterialInput): HTMLCanvasElement {
  const art = readArt(input, (_u, pad) => pad * 0.95);
  const { w, h, u, photo } = art;
  const L = lightDir(input.light);
  const ink = hexRGB(input.color);
  const terminal = photo || luma(ink) > 0.5;

  // Character grid over the art.
  const rows = photo ? 32 : 24;
  const chH = Math.max(6, art.bh / rows);
  const chW = chH * 0.6;
  const cols = Math.max(4, Math.ceil(art.bw / chW));
  const gx0 = art.cx - (cols * chW) / 2;
  const gy0 = art.cy - (rows * chH) / 2;
  const nC = cols * rows;
  const cov = new Float32Array(nC);
  const cnt = new Float32Array(nC);
  const cr = new Float32Array(nC);
  const cg = new Float32Array(nC);
  const cb = new Float32Array(nC);
  for (let y = 0; y < h; y++) {
    const r = Math.floor((y + 0.5 - gy0) / chH);
    if (r < 0 || r >= rows) continue;
    for (let x = 0; x < w; x++) {
      const c = Math.floor((x + 0.5 - gx0) / chW);
      if (c < 0 || c >= cols) continue;
      const i = y * w + x;
      const k = r * cols + c;
      const a = art.alpha[i];
      cov[k] += a;
      cnt[k]++;
      cr[k] += art.rgba[i * 4] * a;
      cg[k] += art.rgba[i * 4 + 1] * a;
      cb[k] += art.rgba[i * 4 + 2] * a;
    }
  }

  // The card.
  const padX = chW * 3;
  const padY = chH * 1.5;
  const bar = terminal ? chH * 2.2 : 0;
  const hw = (cols * chW) / 2 + padX;
  const hh = (rows * chH) / 2 + padY + bar / 2;
  const ccx = art.cx;
  const ccy = art.cy - bar / 2;
  const rad = Math.min(hh * 0.3, chH * 2.2);
  const grain = noiseField(w, h, 1.5, input.seed + 1, 1);
  const mottle = noiseField(w, h, u * 0.3, input.seed + 2, 2);
  const px = new Uint8ClampedArray(w * h * 4);
  const mask = new Float32Array(w * h);
  const top: RGB = terminal ? [26, 40, 64] : [255, 254, 250];
  const bot: RGB = terminal ? [10, 20, 36] : [246, 243, 234];
  for (let y = 0; y < h; y++) {
    const t = clamp01((y - (ccy - hh)) / (hh * 2));
    for (let x = 0; x < w; x++) {
      const d = roundRectDist(x + 0.5, y + 0.5, ccx, ccy, hw, hh, rad);
      if (d > 0.5) continue;
      const i = y * w + x;
      const a = clamp01(0.5 - d);
      let r = top[0] + (bot[0] - top[0]) * t;
      let g = top[1] + (bot[1] - top[1]) * t;
      let b = top[2] + (bot[2] - top[2]) * t;
      const k = terminal ? 1 + mottle[i] * 0.04 : 1 + grain[i] * 0.025 + mottle[i] * 0.015;
      r *= k;
      g *= k;
      b *= k;
      // A soft bevel: light along the rim facing the light.
      const rim = clamp01(1 + d / 2.5);
      const ex = (x + 0.5 - ccx) / hw;
      const ey = (y + 0.5 - ccy) / hh;
      const facing = -(ex * L[0] + ey * L[1]);
      const lift = rim * facing * (terminal ? 40 : 18);
      r += lift;
      g += lift;
      b += lift;
      if (terminal && y + 0.5 < ccy - hh + bar) {
        // Title bar.
        r += 10;
        g += 12;
        b += 16;
        if (Math.abs(y + 0.5 - (ccy - hh + bar)) < 0.75) {
          r = 8;
          g = 16;
          b = 30;
        }
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
  softShadows(ctx, mask, art, L, 1.2);
  ctx.drawImage(toCanvas(px, w, h), 0, 0);

  // Title-bar dots on the terminal.
  if (terminal) {
    const dots: RGB[] = [
      PINK,
      [255, 210, 110],
      [120, 220, 170],
    ];
    const r0 = chH * 0.38;
    dots.forEach((c, k) => {
      ctx.fillStyle = css(c);
      ctx.beginPath();
      ctx.arc(ccx - hw + padX * 0.55 + k * r0 * 3, ccy - hh + bar / 2, r0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Photos: stretch the brightness range so the picture reads in characters.
  let lo = 0;
  let hi = 1;
  if (photo) {
    const lums: number[] = [];
    for (let k = 0; k < nC; k++) {
      if (!cnt[k] || cov[k] / cnt[k] < 0.5) continue;
      lums.push((cr[k] * 0.299 + cg[k] * 0.587 + cb[k] * 0.114) / cov[k] / 255);
    }
    lums.sort((a, b) => a - b);
    if (lums.length > 10) {
      lo = lums[Math.floor(lums.length * 0.03)];
      hi = lums[Math.floor(lums.length * 0.97)];
      if (hi - lo < 0.1) hi = lo + 0.1;
    }
  }

  // Type the characters onto their own layer (so a glow can be added in one pass).
  const layer = makeCanvas(w, h);
  const lc = ctxOf(layer);
  lc.font = `${Math.round(chH * 0.98 * 10) / 10}px ${monoFamily()}`;
  lc.textAlign = "center";
  lc.textBaseline = "middle";
  let last = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = r * cols + c;
      if (!cnt[k]) continue;
      const a = cov[k] / cnt[k];
      let level: number;
      let col: RGB;
      if (photo) {
        if (a < 0.5) continue;
        const rr = cr[k] / cov[k];
        const gg = cg[k] / cov[k];
        const bb = cb[k] / cov[k];
        const lum = (rr * 0.299 + gg * 0.587 + bb * 0.114) / 255;
        level = Math.round(clamp01((lum - lo) / (hi - lo)) * (RAMP.length - 1));
        // Bright enough to read on the dark glass, keeping the hue.
        const hsl = rgbToHsl([rr, gg, bb]);
        col = hslToRgb(hsl[0], Math.min(1, hsl[1] * 1.2 + 0.1), Math.max(0.55, Math.min(0.9, hsl[2] * 0.6 + 0.4)));
      } else {
        level = Math.round(clamp01((a - 0.04) / 0.8) * (RAMP.length - 1));
        col = ink;
      }
      if (level <= 0) continue;
      const ch = RAMP[level];
      // A typewriter is never perfectly even.
      const jit = terminal ? 0 : (hash2(c, r, input.seed) - 0.5) * chH * 0.08;
      const alpha = terminal ? 1 : 0.8 + hash2(c, r, input.seed + 1) * 0.2;
      const style = css(col, alpha);
      if (style !== last) {
        lc.fillStyle = style;
        last = style;
      }
      lc.fillText(ch, gx0 + (c + 0.5) * chW + jit, gy0 + (r + 0.55) * chH + jit * 0.5);
    }
  }
  if (terminal) {
    ctx.save();
    ctx.shadowColor = photo ? "rgba(140,200,255,0.55)" : css(ink, 0.7);
    ctx.shadowBlur = chH * 0.9;
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
    // Faint scanlines over the glass.
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(ccx - hw, ccy - hh + bar, hw * 2, hh * 2 - bar, [0, 0, rad, rad]);
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    for (let y = ccy - hh + bar; y < ccy + hh; y += 3) ctx.fillRect(ccx - hw, y, hw * 2, 1);
    // A glass sheen across the top.
    const gl = ctx.createLinearGradient(0, ccy - hh, 0, ccy + hh);
    gl.addColorStop(0, "rgba(255,255,255,0.10)");
    gl.addColorStop(0.45, "rgba(255,255,255,0.02)");
    gl.addColorStop(0.46, "rgba(255,255,255,0)");
    ctx.fillStyle = gl;
    ctx.fillRect(ccx - hw, ccy - hh, hw * 2, hh * 2);
    ctx.restore();
  } else {
    ctx.drawImage(layer, 0, 0);
  }
  return canvas;
}
