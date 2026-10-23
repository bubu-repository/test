import monoUrl from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?url';
import { encodeGif } from './gif';
import { makeArt, makeThumb, type ArtRecipe } from './pipeline';
import { canvas } from './source';

/*
 * The Studio's render worker: materials, photo filters and GIF encoding run here, off the page's
 * main thread, so the room keeps animating and the controls keep answering while a print is made.
 * Canvases here are OffscreenCanvases; pictures travel as ImageBitmaps (transferred, not copied).
 */

export type WorkerRequest =
  | { id: number; type: 'art'; source: ImageBitmap; recipe: ArtRecipe }
  | { id: number; type: 'thumb'; source: ImageBitmap; recipe: ArtRecipe }
  | { id: number; type: 'gif'; frames: ImageBitmap[]; w: number; h: number; delay: number };

export type WorkerResponse =
  | { id: number; ok: true; bitmap?: ImageBitmap; fill?: boolean; blob?: Blob; ms: number }
  | { id: number; ok: false; error: string };

/** The bits of the worker's global scope used here (the project's types are the page's, not a worker's). */
const scope = self as unknown as {
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse, transfer?: Transferable[]): void;
  fonts?: FontFaceSet;
};

// ASCII types in the room's mono face: a worker has no page fonts, so it loads its own copy.
const fontReady: Promise<unknown> = (async () => {
  try {
    const fonts = scope.fonts;
    if (!fonts || typeof FontFace === 'undefined') return;
    const face = new FontFace('JetBrains Mono', `url(${monoUrl})`, { weight: '400' });
    fonts.add(await face.load());
  } catch {
    // monospace it is
  }
})();

/** An ImageBitmap as a canvas the renderers can read from. */
function fromBitmap(b: ImageBitmap): HTMLCanvasElement {
  const c = canvas(b.width, b.height);
  c.getContext('2d', { willReadFrequently: true })!.drawImage(b, 0, 0);
  b.close();
  return c;
}

scope.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  const t0 = performance.now();
  try {
    if (msg.type === 'gif') {
      const blob = encodeGif(msg.frames, msg.w, msg.h, msg.delay);
      msg.frames.forEach((f) => f.close());
      scope.postMessage({ id: msg.id, ok: true, blob, ms: performance.now() - t0 } satisfies WorkerResponse);
      return;
    }
    if (msg.recipe.material === 'ascii') await fontReady;
    const src = fromBitmap(msg.source);
    if (msg.type === 'thumb') {
      const out = makeThumb(src, msg.recipe) as unknown as OffscreenCanvas;
      const blob = await out.convertToBlob({ type: 'image/png' });
      scope.postMessage({ id: msg.id, ok: true, blob, ms: performance.now() - t0 } satisfies WorkerResponse);
      return;
    }
    const { canvas: out, fill } = makeArt(src, msg.recipe);
    const bitmap = await createImageBitmap(out);
    scope.postMessage({ id: msg.id, ok: true, bitmap, fill, ms: performance.now() - t0 } satisfies WorkerResponse, [bitmap]);
  } catch (err) {
    scope.postMessage({ id: msg.id, ok: false, error: err instanceof Error ? err.message : String(err) } satisfies WorkerResponse);
  }
};
