import { renderMaterial } from './materials';
import type { MaterialId } from './materials/types';
import { applyFilter, plain, renderPhoto, tight, type FilterId } from './source';

/*
 * The heavy part of a print: a photo filter, the material, and the crop. A pure function of its
 * inputs, run in the render worker (render.worker.ts) or, where workers can't draw, on the page
 * from a lazy chunk (renderer.ts decides).
 */

export type MaterialChoice = MaterialId | 'none';

export type ArtRecipe = {
  kind: 'text' | 'photo';
  /** Photos only: the camera filter to apply first. */
  filter?: FilterId;
  material: MaterialChoice;
  color: string;
  light: { x: number; y: number };
  phase: number;
  seed: number;
  /** The sticker layout keeps the room around the piece for its die-cut edge; the others crop tight. */
  sticker: boolean;
};

/** A plain photo (no material) fills its frame edge to edge; everything else sits in it. */
export type ArtResult = { canvas: HTMLCanvasElement; fill: boolean };

export function makeArt(source: HTMLCanvasElement, r: ArtRecipe): ArtResult {
  let src = source;
  if (r.kind === 'photo') {
    const filtered = r.filter ? applyFilter(src, r.filter, r.seed) : src;
    if (r.material === 'none') return r.sticker ? { canvas: plain(renderPhoto(filtered)), fill: false } : { canvas: filtered, fill: true };
    src = renderPhoto(filtered);
  }
  const out = r.material === 'none' ? plain(src) : renderMaterial(r.material, { source: src, kind: r.kind, color: r.color, light: r.light, phase: r.phase, seed: r.seed });
  return { canvas: r.sticker ? out : tight(out), fill: false };
}

/** A small swatch for the material picker. */
export function makeThumb(source: HTMLCanvasElement, r: ArtRecipe): HTMLCanvasElement {
  return r.material === 'none' ? plain(source) : renderMaterial(r.material, { source, kind: r.kind, color: r.color, light: r.light, phase: 0, seed: r.seed });
}
