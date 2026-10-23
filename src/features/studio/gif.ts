import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { canvas } from './source';

/**
 * Frames to an animated GIF (gifenc), in the render worker. Frames arrive already scaled down and
 * flattened onto white (GIF has no soft transparency); each gets its own palette.
 */
export function encodeGif(frames: CanvasImageSource[], w: number, h: number, delayMs: number): Blob {
  const gif = GIFEncoder();
  const work = canvas(w, h);
  const ctx = work.getContext('2d', { willReadFrequently: true })!;
  for (const frame of frames) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(frame, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, w, h, { palette, delay: delayMs, repeat: 0 });
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}

/** A boomerang: forwards, then backwards without repeating the ends. */
export const boomerang = <T,>(frames: T[]): T[] => (frames.length < 3 ? frames : [...frames, ...frames.slice(1, -1).reverse()]);
