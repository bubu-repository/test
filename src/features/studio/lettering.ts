import { cssFont, type StudioFont } from './fonts';
import { PAD, canvas, rng, trim } from './source';

/*
 * Lettering, on the page (it needs the page's web fonts): each letter set on its own, nudged by
 * hand (a little turn, lift, size and spacing), so it looks cut or stitched one piece at a time
 * rather than typed. `wobble` 0 is neat, 1 is loose.
 */

/** Splits a long line in two at the space nearest its middle. */
export function lines(text: string): string[] {
  const clean = text.replace(/[ \t]+/g, ' ').trim() || 'hello';
  if (clean.includes('\n')) return clean.split('\n').slice(0, 2);
  if (clean.length <= 11 || !clean.includes(' ')) return [clean];
  const mid = clean.length / 2;
  let best = -1;
  for (let i = 0; i < clean.length; i++) if (clean[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return [clean.slice(0, best), clean.slice(best + 1)];
}

export function renderLettering({ text, font, ink, wobble, seed, size = 300 }: { text: string; font: StudioFont; ink: string; wobble: number; seed: number; size?: number }): HTMLCanvasElement {
  const rand = rng(seed * 7919 + 13);
  const rows = lines(text);
  const measure = canvas(8, 8).getContext('2d')!;
  measure.font = cssFont(font, size);
  const lineHeight = size * 1.02;
  type Glyph = { ch: string; x: number; y: number; w: number; rot: number; scale: number };
  const glyphs: Glyph[] = [];
  let maxW = 0;
  rows.forEach((row, r) => {
    let x = 0;
    const chars = Array.from(row);
    for (const ch of chars) {
      const w = measure.measureText(ch).width;
      const j = ch === ' ' ? 0 : wobble;
      glyphs.push({ ch, x, y: r * lineHeight + (rand() - 0.5) * size * 0.09 * j, w, rot: (rand() - 0.5) * 0.2 * j, scale: 1 + (rand() - 0.5) * 0.12 * j });
      x += w + size * (0.01 + (rand() - 0.5) * 0.03 * j);
    }
    // Centre each row.
    const rowGlyphs = glyphs.slice(glyphs.length - chars.length);
    maxW = Math.max(maxW, x);
    rowGlyphs.forEach((g) => (g.x -= x / 2));
  });
  const artW = maxW + size * 0.2;
  const artH = rows.length * lineHeight + size * 0.25;
  const pad = Math.min(artW, artH) * PAD + size * 0.08;
  const out = canvas(artW + pad * 2, artH + pad * 2);
  const ctx = out.getContext('2d', { willReadFrequently: true })!;
  ctx.font = cssFont(font, size);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = ink;
  const top = pad + size * 0.125 + lineHeight / 2;
  for (const g of glyphs) {
    if (g.ch === ' ') continue;
    ctx.save();
    ctx.translate(out.width / 2 + g.x + g.w / 2, top + g.y);
    ctx.rotate(g.rot);
    ctx.scale(g.scale, g.scale);
    ctx.fillText(g.ch, -g.w / 2, 0);
    ctx.restore();
  }
  return trim(out, pad);
}
