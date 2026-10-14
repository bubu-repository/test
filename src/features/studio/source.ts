import { cssFont, type StudioFont } from "./fonts";

/*
 * What the Studio's materials are made from: lettering, or a photo. Both come out as a transparent
 * canvas with the art in the middle and room around it (PAD of the shorter side on every edge) for
 * the material's borders, stands, rings and shadows.
 */

export const PAD = 0.18;

/** Seeded randomness (mulberry32): the same seed gives the same wobble. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Splits a long line in two at the space nearest its middle. */
export function lines(text: string): string[] {
  const clean = text.replace(/[ \t]+/g, " ").trim() || "hello";
  if (clean.includes("\n")) return clean.split("\n").slice(0, 2);
  if (clean.length <= 11 || !clean.includes(" ")) return [clean];
  const mid = clean.length / 2;
  let best = -1;
  for (let i = 0; i < clean.length; i++) if (clean[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return [clean.slice(0, best), clean.slice(best + 1)];
}

/**
 * Lettering: each letter set on its own, nudged by hand (a little turn, lift, size and spacing),
 * so it looks cut or stitched one piece at a time rather than typed. `wobble` 0 is neat, 1 is loose.
 */
export function renderLettering({ text, font, ink, wobble, seed, size = 300 }: { text: string; font: StudioFont; ink: string; wobble: number; seed: number; size?: number }): HTMLCanvasElement {
  const rand = rng(seed * 7919 + 13);
  const rows = lines(text);
  const measure = canvas(8, 8).getContext("2d")!;
  measure.font = cssFont(font, size);
  const lineHeight = size * 1.02;
  type Glyph = { ch: string; x: number; y: number; w: number; rot: number; scale: number };
  const glyphs: Glyph[] = [];
  let maxW = 0;
  rows.forEach((row, r) => {
    let x = 0;
    for (const ch of Array.from(row)) {
      const w = measure.measureText(ch).width;
      const j = ch === " " ? 0 : wobble;
      glyphs.push({ ch, x, y: r * lineHeight + (rand() - 0.5) * size * 0.09 * j, w, rot: (rand() - 0.5) * 0.2 * j, scale: 1 + (rand() - 0.5) * 0.12 * j });
      x += w + size * (0.01 + (rand() - 0.5) * 0.03 * j);
    }
    // Centre each row.
    const rowGlyphs = glyphs.slice(glyphs.length - Array.from(row).length);
    const rowW = x;
    maxW = Math.max(maxW, rowW);
    rowGlyphs.forEach((g) => (g.x -= rowW / 2));
  });
  const artW = maxW + size * 0.2;
  const artH = rows.length * lineHeight + size * 0.25;
  const pad = Math.min(artW, artH) * PAD + size * 0.08;
  const out = canvas(artW + pad * 2, artH + pad * 2);
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.font = cssFont(font, size);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = ink;
  const top = pad + size * 0.125 + lineHeight / 2;
  for (const g of glyphs) {
    if (g.ch === " ") continue;
    ctx.save();
    ctx.translate(out.width / 2 + g.x + g.w / 2, top + g.y);
    ctx.rotate(g.rot);
    ctx.scale(g.scale, g.scale);
    ctx.fillText(g.ch, -g.w / 2, 0);
    ctx.restore();
  }
  return trim(out, pad);
}

/** Crops a canvas to its drawn pixels, then puts `pad` of empty room back around them. */
export function trim(src: HTMLCanvasElement, pad: number): HTMLCanvasElement {
  const ctx = src.getContext("2d", { willReadFrequently: true })!;
  const { width: w, height: h } = src;
  const data = ctx.getImageData(0, 0, w, h).data;
  let x0 = w,
    y0 = h,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return src;
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const p = Math.round(Math.max(pad, Math.min(bw, bh) * PAD));
  const out = canvas(bw + p * 2, bh + p * 2);
  out.getContext("2d", { willReadFrequently: true })!.drawImage(src, x0, y0, bw, bh, p, p, bw, bh);
  return out;
}

/** Crops a finished piece to what's drawn (shadows included), keeping a small margin, so layouts can show it big. */
export function tight(src: HTMLCanvasElement, margin = 0.04): HTMLCanvasElement {
  const { width: w, height: h } = src;
  const data = src.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, w, h).data;
  let x0 = w,
    y0 = h,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < h; y += 2)
    for (let x = 0; x < w; x += 2)
      if (data[(y * w + x) * 4 + 3] > 6) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) return src;
  const m = Math.round(Math.min(x1 - x0, y1 - y0) * margin) + 2;
  x0 = Math.max(0, x0 - m);
  y0 = Math.max(0, y0 - m);
  x1 = Math.min(w - 1, x1 + m);
  y1 = Math.min(h - 1, y1 + m);
  const out = canvas(x1 - x0 + 1, y1 - y0 + 1);
  out.getContext("2d")!.drawImage(src, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

/* ---------- Photos ---------- */

export type FilterId = "natural" | "film" | "aqua" | "pink" | "dreamy" | "mono" | "disposable";

export const FILTERS: { id: FilterId; name: string }[] = [
  { id: "natural", name: "Natural" },
  { id: "aqua", name: "Aqua" },
  { id: "pink", name: "Pink pop" },
  { id: "dreamy", name: "Dreamy" },
  { id: "film", name: "Film" },
  { id: "disposable", name: "Disposable" },
  { id: "mono", name: "Mono" },
];

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** A camera filter, on the CPU: a colour matrix, a tone curve, then glow, vignette and grain. */
export function applyFilter(src: HTMLCanvasElement, id: FilterId, seed = 1): HTMLCanvasElement {
  const out = canvas(src.width, src.height);
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  if (id === "natural") return out;
  const { width: w, height: h } = out;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  // [r g b] gains, offsets (lift), saturation, contrast.
  const look = {
    film: { gain: [1.06, 1.0, 0.9], lift: [14, 10, 6], sat: 0.82, con: 0.92, grain: 10, vig: 0.25 },
    aqua: { gain: [0.92, 1.03, 1.1], lift: [0, 8, 16], sat: 1.05, con: 1.02, grain: 0, vig: 0.12 },
    pink: { gain: [1.08, 0.96, 1.04], lift: [16, 4, 12], sat: 1.15, con: 1.06, grain: 0, vig: 0.1 },
    dreamy: { gain: [1.04, 1.0, 1.06], lift: [18, 14, 22], sat: 0.95, con: 0.88, grain: 0, vig: 0.08 },
    mono: { gain: [1, 1, 1], lift: [6, 6, 6], sat: 0, con: 1.12, grain: 6, vig: 0.2 },
    disposable: { gain: [1.1, 1.02, 0.86], lift: [8, 4, 0], sat: 1.12, con: 1.15, grain: 14, vig: 0.42 },
  }[id];
  const rand = rng(seed);
  const cx = w / 2;
  const cy = h / 2;
  const maxD = Math.hypot(cx, cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = d[i] * look.gain[0];
      let g = d[i + 1] * look.gain[1];
      let b = d[i + 2] * look.gain[2];
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      r = l + (r - l) * look.sat;
      g = l + (g - l) * look.sat;
      b = l + (b - l) * look.sat;
      r = (r - 128) * look.con + 128 + look.lift[0] * (1 - r / 255);
      g = (g - 128) * look.con + 128 + look.lift[1] * (1 - g / 255);
      b = (b - 128) * look.con + 128 + look.lift[2] * (1 - b / 255);
      const v = 1 - look.vig * Math.pow(Math.hypot(x - cx, y - cy) / maxD, 2.2);
      const n = look.grain ? (rand() - 0.5) * look.grain : 0;
      d[i] = clamp(r * v + n);
      d[i + 1] = clamp(g * v + n);
      d[i + 2] = clamp(b * v + n);
    }
  }
  ctx.putImageData(img, 0, 0);
  if (id === "dreamy" || id === "pink") glow(out, id === "dreamy" ? 0.45 : 0.25);
  return out;
}

/** Bloom without ctx.filter: a tiny copy scaled back up is a blur; screen it over the highlights. */
function glow(c: HTMLCanvasElement, amount: number) {
  const small = canvas(Math.max(1, c.width / 16), Math.max(1, c.height / 16));
  const sctx = small.getContext("2d")!;
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(c, 0, 0, small.width, small.height);
  const ctx = c.getContext("2d")!;
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = "screen";
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(small, 0, 0, c.width, c.height);
  ctx.restore();
}

/** Draws an image (or video frame) cropped to cover `aspect` (w / h), at most `long` px on its longer side. */
export function cover(img: CanvasImageSource & { width?: number; height?: number; videoWidth?: number; videoHeight?: number }, aspect: number, long = 900, mirror = false): HTMLCanvasElement {
  const iw = (img as HTMLVideoElement).videoWidth || (img as HTMLImageElement).naturalWidth || (img.width as number);
  const ih = (img as HTMLVideoElement).videoHeight || (img as HTMLImageElement).naturalHeight || (img.height as number);
  const w = aspect >= 1 ? long : long * aspect;
  const h = aspect >= 1 ? long / aspect : long;
  const out = canvas(w, h);
  const ctx = out.getContext("2d")!;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.imageSmoothingQuality = "high";
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return out;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** A photo as the materials want it: cut to a rounded rectangle, with room around it. */
export function renderPhoto(photo: HTMLCanvasElement, radius = 0.07): HTMLCanvasElement {
  const pad = Math.round(Math.min(photo.width, photo.height) * PAD);
  const out = canvas(photo.width + pad * 2, photo.height + pad * 2);
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  roundRect(ctx, pad, pad, photo.width, photo.height, Math.min(photo.width, photo.height) * radius);
  ctx.save();
  ctx.clip();
  ctx.drawImage(photo, pad, pad);
  ctx.restore();
  return out;
}

/** Loads a file the visitor picked, entirely in the browser. */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't an image this browser can open."));
    };
    img.src = url;
  });
}
