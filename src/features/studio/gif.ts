import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { canvas } from "./source";

/**
 * Frames to an animated GIF, in the browser (gifenc). Frames are scaled to at most `maxSide` and
 * flattened onto white (GIF has no soft transparency), with one palette per frame.
 */
export function encodeGif(frames: HTMLCanvasElement[], delayMs: number, maxSide = 600): Blob {
  const first = frames[0];
  const scale = Math.min(1, maxSide / Math.max(first.width, first.height));
  const w = Math.max(1, Math.round(first.width * scale));
  const h = Math.max(1, Math.round(first.height * scale));
  const gif = GIFEncoder();
  const work = canvas(w, h);
  const ctx = work.getContext("2d", { willReadFrequently: true })!;
  for (const frame of frames) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(frame, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, w, h, { palette, delay: delayMs, repeat: 0 });
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: "image/gif" });
}

/** A boomerang: forwards, then backwards without repeating the ends. */
export const boomerang = <T,>(frames: T[]): T[] => (frames.length < 3 ? frames : [...frames, ...frames.slice(1, -1).reverse()]);
