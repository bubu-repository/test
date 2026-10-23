import type { ArtRecipe, ArtResult } from './pipeline';
import type { WorkerRequest, WorkerResponse } from './render.worker';
import { canvas } from './source';

/*
 * The page's side of rendering. Materials are heavy (hundreds of milliseconds of pixel maths), so
 * they run in a worker and the room never stalls while a print is made. One job at a time goes to
 * the worker: the print first, swatches when it's free; a newer print replaces one still waiting.
 * Where a worker can't draw (no OffscreenCanvas), the same code runs on the page from a lazy chunk,
 * one piece per task.
 */

export class Superseded extends Error {
  constructor() {
    super('superseded');
  }
}

type Job = {
  key: string;
  priority: number;
  build: () => Promise<{ msg: WorkerRequest; transfer: Transferable[] }>;
  local: () => Promise<unknown>;
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
};

let worker: Worker | null = null;
let broken = false;
let seq = 0;
let busy = false;
const queue: Job[] = [];
const waiting = new Map<number, { resolve: (r: WorkerResponse) => void }>();

/** The worker draws only if it has a 2D OffscreenCanvas; checked once. */
const canOffload = (() => {
  let ok: boolean | null = null;
  return () => {
    if (ok !== null) return ok;
    try {
      ok = typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap === 'function' && !!new OffscreenCanvas(1, 1).getContext('2d');
    } catch {
      ok = false;
    }
    return ok;
  };
})();

function getWorker(): Worker | null {
  if (broken || !canOffload()) return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('./render.worker.ts', import.meta.url), { type: 'module', name: 'studio-render' });
  } catch {
    broken = true;
    return null;
  }
  worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
    const w = waiting.get(e.data.id);
    waiting.delete(e.data.id);
    w?.resolve(e.data);
  };
  worker.onerror = () => {
    // The worker didn't start (or died): finish what's waiting on the page instead.
    broken = true;
    worker?.terminate();
    worker = null;
    for (const [id, w] of waiting) w.resolve({ id, ok: false, error: 'worker' });
    waiting.clear();
  };
  return worker;
}

let pipeline: Promise<typeof import('./pipeline')> | null = null;
const local = () => (pipeline ??= import('./pipeline'));
const nextTask = () => new Promise<void>((r) => setTimeout(r, 0));

/** A job the worker never answers (it was killed, say for memory) would hold up every print after it. */
const WATCHDOG_MS = 90_000;

function post(msg: WorkerRequest, transfer: Transferable[]): Promise<WorkerResponse> {
  const w = getWorker();
  if (!w) return Promise.resolve({ id: msg.id, ok: false, error: 'worker' });
  return new Promise((resolve) => {
    const dog = setTimeout(() => {
      // Start a fresh worker for the next job; this one fails (the Studio offers to try again).
      if (waiting.delete(msg.id)) {
        if (worker === w) worker = null;
        w.terminate();
        resolve({ id: msg.id, ok: false, error: 'timeout' });
      }
    }, WATCHDOG_MS);
    waiting.set(msg.id, {
      resolve: (r) => {
        clearTimeout(dog);
        resolve(r);
      },
    });
    w.postMessage(msg, transfer);
  });
}

async function pump() {
  if (busy) return;
  const job = queue.sort((a, b) => a.priority - b.priority).shift();
  if (!job) return;
  busy = true;
  try {
    let value: unknown;
    if (getWorker()) {
      const { msg, transfer } = await job.build();
      const res = await post(msg, transfer);
      if (res.ok) value = res;
      else if (res.error === 'worker') value = await job.local();
      else throw new Error(res.error);
    } else {
      await nextTask();
      value = await job.local();
    }
    job.resolve(value);
  } catch (e) {
    job.reject(e);
  } finally {
    busy = false;
    void pump();
  }
}

function enqueue<T>(key: string, priority: number, build: Job['build'], run: () => Promise<T>): Promise<T | WorkerResponse> {
  // A newer job with the same key replaces one still waiting (the newest print wins).
  for (let i = queue.length - 1; i >= 0; i--)
    if (queue[i].key === key) {
      queue[i].reject(new Superseded());
      queue.splice(i, 1);
    }
  return new Promise((resolve, reject) => {
    queue.push({ key, priority, build, local: run, resolve: resolve as (v: unknown) => void, reject });
    void pump();
  });
}

const bitmapOf = (c: HTMLCanvasElement) => createImageBitmap(c);

function canvasOf(b: ImageBitmap): HTMLCanvasElement {
  const c = canvas(b.width, b.height);
  // CPU-backed, like the layouts it is drawn into (no GPU readback when the print is saved).
  c.getContext('2d', { willReadFrequently: true })!.drawImage(b, 0, 0);
  b.close();
  return c;
}

/** The piece in its material (photo filtered first), cropped for its layout. */
export async function renderArt(source: HTMLCanvasElement, recipe: ArtRecipe, key = 'art', priority = 0): Promise<ArtResult> {
  const id = ++seq;
  const res = await enqueue(
    key,
    priority,
    async () => {
      const bmp = await bitmapOf(source);
      return { msg: { id, type: 'art', source: bmp, recipe }, transfer: [bmp] };
    },
    async () => (await local()).makeArt(source, recipe),
  );
  if ('canvas' in (res as ArtResult)) return res as ArtResult;
  const r = res as Extract<WorkerResponse, { ok: true }>;
  return { canvas: canvasOf(r.bitmap!), fill: !!r.fill };
}

/** A material swatch, as an object URL (the caller revokes it). Low priority: prints go first. */
export async function renderThumb(source: HTMLCanvasElement, recipe: ArtRecipe, key: string): Promise<string> {
  const id = ++seq;
  const res = await enqueue(
    key,
    5,
    async () => {
      const bmp = await bitmapOf(source);
      return { msg: { id, type: 'thumb', source: bmp, recipe }, transfer: [bmp] };
    },
    async () => {
      const c = (await local()).makeThumb(source, recipe);
      return await new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('thumb'))), 'image/png'));
    },
  );
  const blob = res instanceof Blob ? res : (res as Extract<WorkerResponse, { ok: true }>).blob!;
  return URL.createObjectURL(blob);
}

/** Frames (already flattened and scaled down to w × h) to a GIF, encoded off the page. */
export async function renderGif(frames: HTMLCanvasElement[], w: number, h: number, delay: number): Promise<Blob> {
  const id = ++seq;
  const res = await enqueue(
    `gif-${id}`,
    0,
    async () => {
      const bmps = await Promise.all(frames.map(bitmapOf));
      return { msg: { id, type: 'gif', frames: bmps, w, h, delay }, transfer: bmps };
    },
    async () => (await import('./gif')).encodeGif(frames, w, h, delay),
  );
  return res instanceof Blob ? res : (res as Extract<WorkerResponse, { ok: true }>).blob!;
}

/** Drops swatches still waiting (the recipe they were for has changed). */
export function cancel(prefix: string) {
  for (let i = queue.length - 1; i >= 0; i--)
    if (queue[i].key.startsWith(prefix)) {
      queue[i].reject(new Superseded());
      queue.splice(i, 1);
    }
}

/** Whether prints are drawn off the page (for the record, and for tests). */
export const offloaded = () => !!getWorker();
