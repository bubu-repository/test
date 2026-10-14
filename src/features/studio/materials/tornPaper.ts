/*
 * Torn paper: the art printed on a sheet of paper in `color` and torn out round it, so a ragged
 * band of the paper's white core shows along the tear, with loose fibres at the very edge, a soft
 * grain, the sheet lifting a little off the page and a strip of washi tape holding a corner down.
 * A photo is a torn photo print, the tear showing its white paper core.
 */

import {
  clamp01,
  css,
  downsample,
  fillHoles,
  gauss,
  gridPaths,
  hexRGB,
  lightDir,
  noiseField,
  output,
  readArt,
  resamplePath,
  rng,
  sample,
  shade,
  signedDistance,
  softShadows,
  toCanvas,
  upsample,
  type RGB,
} from "./core";
import type { MaterialInput } from "./types";

const CORE: RGB = [251, 250, 246];
const TAPE: RGB = [255, 170, 205];

export function tornPaper(input: MaterialInput): HTMLCanvasElement {
  const art = readArt(input, (u, pad) => Math.min(pad * 0.95, u * 0.2 + 12));
  const { w, h, u, photo } = art;
  const L = lightDir(input.light);
  const paper: RGB = input.kind === "photo" ? [252, 252, 250] : hexRGB(input.color);
  const ink = art.ink;
  const f = 2;
  const n = w * h;

  // The sheet: grown round the art (lettering) or the print itself (photo), then torn.
  const a2 = downsample(art.alpha, w, h, f);
  const gw = a2.w;
  const gh = a2.h;
  const sd2 = signedDistance(a2.data, gw, gh);
  const D = photo ? -u * 0.012 : Math.min(u * 0.08, art.pad * 0.5);
  const s0 = new Float32Array(gw * gh);
  for (let i = 0; i < s0.length; i++) s0[i] = sd2[i] * f - D;
  if (!photo) fillHoles(s0, gw, gh, ((u * 0.45) / f) ** 2, true, -D);
  // Torn by hand: the sheet doesn't follow every notch of the letters, and the tear wanders at
  // several scales, with little straight runs where the paper split along its grain.
  const sm = photo ? s0 : gauss(s0, gw, gh, (u * 0.05) / f);
  const tear1 = noiseField(gw, gh, (u * 0.14) / f, input.seed + 1, 2);
  const tear2 = noiseField(gw, gh, (u * 0.035) / f, input.seed + 2, 2);
  const tear3 = noiseField(gw, gh, Math.max(1.5, (u * 0.012) / f), input.seed + 8, 1);
  for (let i = 0; i < sm.length; i++) sm[i] += tear1[i] * u * 0.022 + tear2[i] * u * 0.009 + tear3[i] * u * 0.004;
  const paperD = upsample(sm, gw, gh, w, h);
  // How much white core shows: it comes and goes along the tear.
  const coreN = noiseField(w, h, u * 0.12, input.seed + 3, 2);
  const grain = noiseField(w, h, 1.4, input.seed + 4, 1, 0.5, 1, 2.5);
  const mottle = noiseField(w, h, u * 0.15, input.seed + 5, 3);
  const fibre = grain;
  // A sheet that isn't perfectly flat.
  const bend = noiseField(w, h, u * 0.6, input.seed + 7, 2);

  const px = new Uint8ClampedArray(n * 4);
  const mask = new Float32Array(n);
  const [lx, ly] = L;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const d = paperD[i];
      if (d > 1) continue;
      let a = clamp01(0.5 - d);
      if (a <= 0) continue;
      const cw = Math.pow(clamp01(coreN[i] * 1.1 + 0.5), 1.4) * u * 0.042 + 0.8 + grain[i] * 1.2;
      const lit = 1 + ((bend[x + 1 < w ? i + 1 : i] - bend[i]) * -lx + (bend[y + 1 < h ? i + w : i] - bend[i]) * -ly) * u * 0.035;
      let r: number;
      let g: number;
      let b: number;
      if (d < -cw) {
        // The printed face.
        const gk = (1 + grain[i] * 0.035 + mottle[i] * 0.025) * lit;
        r = paper[0] * gk;
        g = paper[1] * gk;
        b = paper[2] * gk;
        const aa = art.alpha[i];
        if (aa > 0) {
          const j = i * 4;
          // Ink sits in the paper: multiply, a little uneven.
          const ir = photo ? art.rgba[j] : ink[0];
          const ig = photo ? art.rgba[j + 1] : ink[1];
          const ib = photo ? art.rgba[j + 2] : ink[2];
          const k = aa * (photo ? 1 : 0.94 + mottle[i] * 0.05 + grain[i] * 0.02);
          r += ((ir * r) / 255 - r) * k;
          g += ((ig * g) / 255 - g) * k;
          b += ((ib * b) / 255 - b) * k;
        }
        // The face layer's torn lip throws a hairline shadow onto the core.
        const lip = clamp01(1 - (-d - cw) / 1.2);
        r *= 1 - lip * 0.08;
        g *= 1 - lip * 0.08;
        b *= 1 - lip * 0.06;
      } else {
        // White fibrous core, fibres running out across the tear.
        const fk = (0.95 + fibre[i] * 0.06 + grain[i] * 0.02) * lit;
        r = CORE[0] * fk;
        g = CORE[1] * fk;
        b = CORE[2] * fk;
        // Feathered, fibrous very edge.
        a *= clamp01(0.75 + fibre[i] * 0.8 + (-d) * 0.4);
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
  softShadows(ctx, mask, art, L, 1.8, 0.95);
  ctx.drawImage(toCanvas(px, w, h), 0, 0);

  // Loose fibres sticking out of the tear.
  const rand = rng(input.seed * 13 + 1);
  const edge = gridPaths(sm, gw, gh, 0, f, 1);
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (const p of edge) {
    const pts = resamplePath(p, 1.6);
    for (let k = 0; k < pts.length; k += 4) {
      if (rand() > 0.45) continue;
      const x = pts[k];
      const y = pts[k + 1];
      let ox = pts[k + 3];
      let oy = -pts[k + 2];
      if (sample(paperD, w, h, x + ox * 2 - 0.5, y + oy * 2 - 0.5) < sample(paperD, w, h, x - 0.5, y - 0.5)) {
        ox = -ox;
        oy = -oy;
      }
      const ang = Math.atan2(oy, ox) + (rand() - 0.5) * 1.6;
      const len = 0.8 + rand() * rand() * 4.5;
      ctx.moveTo(x - ox, y - oy);
      ctx.quadraticCurveTo(x + Math.cos(ang) * len * 0.5 + (rand() - 0.5), y + Math.sin(ang) * len * 0.5 + (rand() - 0.5), x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    }
  }
  ctx.stroke();
  ctx.restore();

  // Washi tape over the top-left corner of the sheet.
  let bx = art.x0;
  let by = art.y0;
  let best = Infinity;
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (paperD[y * w + x] > -u * 0.03) continue;
      const s = x + y * 1.6;
      if (s < best) {
        best = s;
        bx = x;
        by = y;
      }
    }
  }
  const tl = u * (photo ? 0.32 : 0.4);
  const tw = u * (photo ? 0.1 : 0.13);
  const ang = -0.68 + (rand() - 0.5) * 0.2;
  const cx = bx + u * 0.015;
  const cy = by + u * 0.02;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  const zig = (x0: number, dir: number) => {
    const steps = 7;
    for (let k = 0; k <= steps; k++) {
      const yy = -tw / 2 + (tw * k) / steps;
      const xx = x0 + dir * (k % 2 ? tw * 0.07 : 0) + dir * (rand() - 0.5) * tw * 0.04;
      ctx.lineTo(xx, dir > 0 ? yy : -yy);
    }
  };
  const tapePath = () => {
    ctx.beginPath();
    ctx.moveTo(-tl / 2, -tw / 2);
    ctx.lineTo(tl / 2, -tw / 2);
    zig(tl / 2, 1);
    ctx.lineTo(-tl / 2, tw / 2);
    zig(-tl / 2, -1);
    ctx.closePath();
  };
  // Its faint shadow.
  ctx.save();
  ctx.translate(-L[0] * u * 0.006, -L[1] * u * 0.006 + u * 0.004);
  ctx.fillStyle = "rgba(8,40,80,0.12)";
  tapePath();
  ctx.fill();
  ctx.restore();
  const tg = ctx.createLinearGradient(0, -tw / 2, 0, tw / 2);
  tg.addColorStop(0, css(shade(TAPE, 0.06), 0.82));
  tg.addColorStop(0.5, css(TAPE, 0.78));
  tg.addColorStop(1, css(shade(TAPE, -0.05), 0.84));
  ctx.fillStyle = tg;
  tapePath();
  ctx.fill();
  // Washi pattern: soft white dots, and a sheen.
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  const dot = tw * 0.07;
  for (let yy = -tw / 2 + tw * 0.2; yy < tw / 2; yy += tw * 0.3) {
    for (let xx = -tl / 2 + ((yy / (tw * 0.3)) % 2 ? tw * 0.15 : 0); xx < tl / 2; xx += tw * 0.3) {
      ctx.beginPath();
      ctx.arc(xx, yy, dot, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const sh = ctx.createLinearGradient(-tl / 2, 0, tl / 2, 0);
  sh.addColorStop(0, "rgba(255,255,255,0)");
  sh.addColorStop(0.45 + L[0] * 0.2, "rgba(255,255,255,0.28)");
  sh.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sh;
  ctx.fillRect(-tl, -tw, tl * 2, tw * 2);
  ctx.restore();
  return canvas;
}
