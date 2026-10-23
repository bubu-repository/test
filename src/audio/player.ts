/* ==========================================================================
   Player — one playback of one generative track. Owns a "deck" gain (for
   crossfades) and a reverb send, and turns the song clock into 16th-note
   StepInfo calls on the track. The music module drives `schedule(until)`
   from a 25 ms lookahead timer; offline QA renders call it once.
   ========================================================================== */
import type { TrackId } from '@/lib/content';
import { buffer, type BufferKind } from './instruments';

export type SectionKind = 'intro' | 'A' | 'B' | 'break' | 'outro';
export interface Section {
  kind: SectionKind;
  bars: number;
}

export interface StepInfo {
  /** scheduled (swung) time of this 16th */
  t: number;
  /** step in bar 0..15 */
  s: number;
  /** bar within the song (loop-mapped) */
  bar: number;
  /** bars since this playback started (never wraps) */
  n: number;
  sec: Section;
  si: number;
  /** bar in section */
  bis: number;
  /** last bar of a 4-bar / 8-bar phrase */
  fill4: boolean;
  fill8: boolean;
  /** first / last bar of the section */
  first: boolean;
  last: boolean;
  next: Section;
}

export interface TrackDef {
  id: TrackId;
  bpm: number;
  /** 0.5 = straight, 0.66 = triplet swing (applied to odd 16ths) */
  swing: number;
  /** deck level */
  gain: number;
  sections: Section[];
  /** section index the song loops back to */
  loopTo: number;
  create(p: Player): (i: StepInfo) => void;
}

/** mulberry32 */
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

const EPS = 0.0001;

export class Player {
  readonly ctx: BaseAudioContext;
  readonly def: TrackDef;
  /** deck output (crossfade gain) */
  readonly out: GainNode;
  /** reverb send */
  readonly rev: GainNode;
  readonly stepDur: number;
  readonly beatDur: number;
  readonly barDur: number;
  readonly songBars: number;
  readonly loopBar: number;
  /** context time of (virtual) song bar 0, step 0 */
  readonly t0: number;
  readonly startBar: number;
  endAt = Infinity;
  random: () => number;

  private k = 0;
  private fn: (i: StepInfo) => void;
  private held: AudioScheduledSourceNode[] = [];
  private starts: number[] = [];
  private secStart: number[] = [];

  constructor(ctx: BaseAudioContext, def: TrackDef, dest: AudioNode, reverb: AudioNode | null, start: number, startBar = 0, seed = (Math.random() * 2 ** 31) | 0) {
    this.ctx = ctx;
    this.def = def;
    this.random = rng(seed);
    this.beatDur = 60 / def.bpm;
    this.stepDur = this.beatDur / 4;
    this.barDur = this.beatDur * 4;
    let acc = 0;
    for (const s of def.sections) {
      this.secStart.push(acc);
      acc += s.bars;
    }
    this.songBars = acc;
    this.loopBar = this.secStart[def.loopTo] ?? 0;
    this.startBar = Math.max(0, Math.min(startBar, this.songBars - 1));
    this.t0 = start - this.startBar * this.barDur;

    this.out = ctx.createGain();
    this.out.gain.value = EPS;
    this.out.connect(dest);
    this.rev = ctx.createGain();
    this.rev.gain.value = 1;
    if (reverb) this.rev.connect(reverb);
    else this.rev.connect(this.out);
    this.starts.push(start);
    this.fn = def.create(this);
  }

  get start() {
    return this.starts[0];
  }

  /* ------------------------------------------------------------ random */
  r() {
    return this.random();
  }
  chance(p: number) {
    return this.random() < p;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.random() * arr.length)];
  }
  /** humanise: ± ms jitter in seconds (never negative overall) */
  jit(ms: number) {
    return ((this.random() + this.random() - 1) * ms) / 1000;
  }
  /** velocity humanise around v by ±amt */
  vel(v: number, amt = 0.1) {
    return Math.max(0.05, Math.min(1, v * (1 + (this.random() * 2 - 1) * amt)));
  }

  /* ------------------------------------------------------- continuous */
  /** looped noise texture (crackle, rain…) started with the deck */
  loop(kind: BufferKind, gain: number, dest: AudioNode = this.out, filter?: { type: BiquadFilterType; freq: number; q?: number }[]) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = buffer(ctx, kind);
    s.loop = true;
    let node: AudioNode = s;
    for (const f of filter ?? []) {
      const b = ctx.createBiquadFilter();
      b.type = f.type;
      b.frequency.value = f.freq;
      b.Q.value = f.q ?? 0.7;
      node.connect(b);
      node = b;
    }
    const g = ctx.createGain();
    g.gain.value = gain;
    node.connect(g).connect(dest);
    s.start(this.start, Math.random() * s.buffer.duration);
    this.held.push(s);
    return g;
  }

  /** LFO into an AudioParam (stopped with the deck) */
  lfo(freq: number, depth: number, param: AudioParam, type: OscillatorType = 'sine') {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = depth;
    o.connect(g).connect(param);
    o.start(this.start);
    this.held.push(o);
    return o;
  }

  /** a gain bus inside the deck */
  bus(gain = 1, dest: AudioNode = this.out) {
    const g = this.ctx.createGain();
    g.gain.value = gain;
    g.connect(dest);
    return g;
  }

  filter(type: BiquadFilterType, freq: number, q = 0.7, dest: AudioNode = this.out) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    f.connect(dest);
    return f;
  }

  send(amount: number, from: AudioNode) {
    const g = this.ctx.createGain();
    g.gain.value = amount;
    from.connect(g).connect(this.rev);
    return g;
  }

  /** tempo-synced feedback delay (dotted 8th by default) */
  delay(time = this.beatDur * 0.75, feedback = 0.32, tone = 2600, dest: AudioNode = this.out) {
    const ctx = this.ctx;
    const input = ctx.createGain();
    const d = ctx.createDelay(2);
    d.delayTime.value = time;
    const fb = ctx.createGain();
    fb.gain.value = feedback;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = tone;
    input.connect(d);
    d.connect(lp).connect(fb).connect(d);
    lp.connect(dest);
    return input;
  }

  /* --------------------------------------------------------- transport */
  fadeIn(t: number, secs: number) {
    const g = this.out.gain;
    g.cancelScheduledValues(t);
    g.setValueCurveAtTime(equalPower(true, this.def.gain), t, secs);
  }

  /** fade out and stop scheduling after the fade */
  fadeOut(t: number, secs: number) {
    const g = this.out.gain;
    const v = Math.max(EPS, g.value);
    g.cancelScheduledValues(t);
    g.setValueCurveAtTime(equalPower(false, v), t, secs);
    this.endAt = t + secs;
  }

  /** absolute step index (from song bar 0) → context time incl. swing */
  private timeOf(a: number) {
    const sw = a % 2 === 1 ? (this.def.swing - 0.5) * 2 * this.stepDur : 0;
    return this.t0 + a * this.stepDur + sw;
  }

  /** song bar for an absolute bar index (handles the loop) */
  mapBar(n: number) {
    if (n < this.songBars) return n;
    const span = this.songBars - this.loopBar;
    return this.loopBar + ((n - this.songBars) % span);
  }

  /** seconds into the song (loop-mapped), for the now-playing display */
  position(now: number) {
    const bars = Math.max(0, (now - this.t0) / this.barDur);
    const whole = Math.floor(bars);
    return (this.mapBar(whole) + (bars - whole)) * this.barDur;
  }

  get duration() {
    return this.songBars * this.barDur;
  }

  /** bar index (song) currently sounding */
  barAt(now: number) {
    return this.mapBar(Math.floor(Math.max(0, now - this.t0) / this.barDur));
  }

  schedule(until: number, now = -Infinity) {
    for (;;) {
      const a = this.startBar * 16 + this.k;
      const t = this.timeOf(a);
      if (t >= until || t >= this.endAt) break;
      this.k++;
      if (t < now - 0.08) continue; // fell behind (tab stalled): skip, don't burst
      const n = Math.floor(a / 16);
      const bar = this.mapBar(n);
      let si = 0;
      while (si + 1 < this.secStart.length && this.secStart[si + 1] <= bar) si++;
      const sec = this.def.sections[si];
      const bis = bar - this.secStart[si];
      const nextIdx = si + 1 < this.def.sections.length ? si + 1 : this.def.loopTo;
      const info: StepInfo = {
        t,
        s: a % 16,
        bar,
        n: n - this.startBar,
        sec,
        si,
        bis,
        fill4: bis % 4 === 3,
        fill8: bis % 8 === 7,
        first: bis === 0,
        last: bis === sec.bars - 1,
        next: this.def.sections[nextIdx],
      };
      try {
        this.fn(info);
      } catch (e) {
        if (import.meta.env?.DEV) console.warn('[music] step failed', e);
      }
    }
  }

  dispose() {
    const t = this.ctx.currentTime;
    for (const s of this.held) {
      try {
        s.stop(t + 0.05);
      } catch {
        /* already stopped */
      }
    }
    this.held = [];
    setTimeout(() => {
      try {
        this.out.disconnect();
        this.rev.disconnect();
      } catch {
        /* noop */
      }
    }, 200);
  }
}

const curveCache = new Map<string, Float32Array<ArrayBuffer>>();
function equalPower(up: boolean, level: number) {
  const key = `${up}:${level.toFixed(4)}`;
  const hit = curveCache.get(key);
  if (hit) return hit;
  const n = 64;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    c[i] = Math.max(EPS, level * (up ? Math.sin((x * Math.PI) / 2) : Math.cos((x * Math.PI) / 2)));
  }
  if (curveCache.size > 64) curveCache.clear();
  curveCache.set(key, c);
  return c;
}
