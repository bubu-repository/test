/* ==========================================================================
   Dev-only QA: render a generative track (or sfx) in an OfflineAudioContext
   and measure it. Not imported by the app — loaded by test scripts via
   `await import('/src/audio/qa.ts')` in a dev-server page.
   ========================================================================== */
import type { TrackId } from '@/lib/content';
import { Player } from './player';
import { TRACK_DEFS } from './tracks';
import { impulse } from './instruments';

export interface RenderStats {
  id: string;
  seconds: number;
  peak: number;
  rmsDb: number;
  silentSeconds: number;
  /** loudest / quietest 1-second RMS in dBFS */
  maxSecDb: number;
  minSecDb: number;
  nodesCreated: number;
  maxConcurrentSources: number;
  renderMs: number;
}

function instrument(ctx: OfflineAudioContext) {
  let created = 0;
  const intervals: [number, number][] = [];
  const proto = Object.getPrototypeOf(Object.getPrototypeOf(ctx)) as Record<string, unknown>;
  for (const k of Object.getOwnPropertyNames(proto)) {
    if (!k.startsWith('create') || k === 'createBuffer' || k === 'createPeriodicWave') continue;
    const orig = (ctx as unknown as Record<string, (...a: unknown[]) => unknown>)[k];
    if (typeof orig !== 'function') continue;
    (ctx as unknown as Record<string, unknown>)[k] = (...args: unknown[]) => {
      created++;
      const node = orig.apply(ctx, args) as AudioNode;
      if (node instanceof AudioScheduledSourceNode) {
        const rec: [number, number] = [0, Infinity];
        intervals.push(rec);
        const s = node.start.bind(node) as (when?: number, ...r: number[]) => void;
        const st = node.stop.bind(node);
        (node as unknown as { start: (when?: number, ...r: number[]) => void }).start = (when = 0, ...r: number[]) => {
          rec[0] = when;
          s(when, ...r);
        };
        node.stop = (when = 0) => {
          rec[1] = Math.min(rec[1], when);
          st(when);
        };
      }
      return node;
    };
  }
  return {
    count: () => created,
    maxConcurrent: (until: number) => {
      const ev: [number, number][] = [];
      for (const [a, b] of intervals) {
        ev.push([a, 1]);
        ev.push([Math.min(b, until), -1]);
      }
      ev.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
      let cur = 0,
        max = 0;
      for (const [, d] of ev) {
        cur += d;
        max = Math.max(max, cur);
      }
      return max;
    },
  };
}

function analyse(buf: AudioBuffer) {
  const sr = buf.sampleRate;
  const L = buf.getChannelData(0);
  const R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
  let peak = 0,
    sum = 0;
  const secs: number[] = [];
  let acc = 0,
    n = 0;
  for (let i = 0; i < L.length; i++) {
    const a = Math.abs(L[i]),
      b = Math.abs(R[i]);
    peak = Math.max(peak, a, b);
    const e = (L[i] * L[i] + R[i] * R[i]) / 2;
    sum += e;
    acc += e;
    if (++n === sr) {
      secs.push(Math.sqrt(acc / n));
      acc = 0;
      n = 0;
    }
  }
  const db = (x: number) => (x > 0 ? 20 * Math.log10(x) : -200);
  return {
    peak,
    rmsDb: db(Math.sqrt(sum / L.length)),
    silentSeconds: secs.filter((x) => db(x) < -60).length,
    maxSecDb: db(Math.max(...secs)),
    minSecDb: db(Math.min(...secs)),
  };
}

/** Render `seconds` of a track starting at `startBar`, through the same gain
 *  staging as the live engine (fader 0.8 → musicBus 0.55 → master 0.9). */
export async function renderTrack(id: TrackId, seconds = 8, startBar = 0, sampleRate = 22050, reverb = true): Promise<RenderStats> {
  const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * seconds), sampleRate);
  const probe = instrument(ctx);
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  const musicBus = ctx.createGain();
  musicBus.gain.value = 0.55;
  musicBus.connect(master);
  const rev = ctx.createGain();
  if (reverb) {
    const conv = ctx.createConvolver();
    conv.buffer = impulse(ctx, 2.2, 2.8);
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    rev.connect(conv).connect(wet).connect(master);
  }
  const fader = ctx.createGain();
  fader.gain.value = 0.8;
  fader.connect(musicBus);
  const p = new Player(ctx, TRACK_DEFS[id], fader, rev, 0.02, startBar, 1234);
  p.fadeIn(0.02, 0.3);
  p.schedule(seconds);
  const t0 = performance.now();
  const buf = await ctx.startRendering();
  const renderMs = performance.now() - t0;
  return { id, seconds, ...analyse(buf), nodesCreated: probe.count(), maxConcurrentSources: probe.maxConcurrent(seconds), renderMs: Math.round(renderMs) };
}

/** Render one SFX recipe through the engine's gain staging (sfx/ui bus → master). */
export async function renderSfx(name: string, seconds = 4, pitch = 0, sampleRate = 22050) {
  const { RECIPES } = await import('./sfx');
  const recipe = (RECIPES as Record<string, { bus?: string; reverb?: number; play: (c: BaseAudioContext, o: AudioNode, t: number, p: number) => void }>)[name];
  const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * seconds), sampleRate);
  const probe = instrument(ctx);
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  const bus = ctx.createGain();
  bus.gain.value = recipe.bus === 'ui' ? 0.55 : 0.8;
  bus.connect(master);
  const out = ctx.createGain();
  out.connect(bus);
  if (recipe.reverb) {
    const conv = ctx.createConvolver();
    conv.buffer = impulse(ctx, 2.2, 2.8);
    const wet = ctx.createGain();
    wet.gain.value = 0.32 * recipe.reverb;
    out.connect(conv).connect(wet).connect(master);
  }
  recipe.play(ctx, out, 0.01, pitch);
  const buf = await ctx.startRendering();
  const a = analyse(buf);
  // audible duration (last sample above -60 dB)
  const L = buf.getChannelData(0);
  let last = 0;
  for (let i = L.length - 1; i >= 0; i--)
    if (Math.abs(L[i]) > 0.001) {
      last = i;
      break;
    }
  return { name, peak: a.peak, rmsDb: a.rmsDb, tail: +(last / sampleRate).toFixed(2), nodes: probe.count(), maxSrc: probe.maxConcurrent(seconds) };
}

/** Section start bars of a track, for targeted renders. */
export function sectionBars(id: TrackId) {
  let acc = 0;
  return TRACK_DEFS[id].sections.map((s) => {
    const r = { kind: s.kind, bar: acc, bars: s.bars };
    acc += s.bars;
    return r;
  });
}
