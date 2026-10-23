/* ==========================================================================
   AS-30 · Adelia’s sound system — the baby-blue synth's engine.
   16 pads (4 drums + 12 notes in a selectable scale), a 4-track × 16-step
   sequencer on a lookahead scheduler, and global TEMPO / SWING / FILTER /
   DECAY / LEVEL. Output: voices → performance low-pass → level → master.
   ========================================================================== */
import { audio } from '@/audio/engine';
import { bell, ep, hat, kick, snare, type Ctx } from '@/audio/instruments';

export type ScaleId = 'minor' | 'dorian' | 'pelog' | 'slendro' | 'chromatic';
export type InstId = 'synth' | 'keys' | 'bell';
export type TrackName = 'kick' | 'snare' | 'hat' | 'bell';

export const TRACK_NAMES: TrackName[] = ['kick', 'snare', 'hat', 'bell'];

/** Scales in cents above the root. Pelog/slendro are approximations of
 *  Javanese tunings (they vary from gamelan to gamelan). */
export const SCALES: { id: ScaleId; label: string; cents: number[]; cipher?: string[] }[] = [
  { id: 'minor', label: 'Minor Pent.', cents: [0, 300, 500, 700, 1000] },
  { id: 'dorian', label: 'Dorian', cents: [0, 200, 300, 500, 700, 900, 1000] },
  { id: 'pelog', label: 'Pelog-ish', cents: [0, 120, 270, 540, 670, 785, 950], cipher: ['1', '2', '3', '4', '5', '6', '7'] },
  { id: 'slendro', label: 'Slendro-ish', cents: [0, 240, 480, 720, 960], cipher: ['1', '2', '3', '5', '6'] },
  { id: 'chromatic', label: 'Chromatic', cents: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100] },
];

const ROOT = 261.63 / 2; // C3
const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

/** frequency of note pad k (0..11) in a scale */
export function noteFreq(scale: ScaleId, k: number) {
  const s = SCALES.find((x) => x.id === scale)!;
  const n = s.cents.length;
  const c = s.cents[k % n] + 1200 * Math.floor(k / n);
  return ROOT * 2 * Math.pow(2, c / 1200);
}

/** display label for note pad k: note name (12-TET) or cipher (gamelan) + octave */
export function noteLabel(scale: ScaleId, k: number): { main: string; oct: number } {
  const s = SCALES.find((x) => x.id === scale)!;
  const n = s.cents.length;
  const oct = Math.floor(k / n);
  if (s.cipher) return { main: s.cipher[k % n], oct };
  const semi = Math.round(s.cents[k % n] / 100);
  return { main: NAMES[semi % 12], oct: 3 + oct + Math.floor(semi / 12) };
}

export interface Pattern {
  /** [track][step] 0 off · 1 on · 2 accent */
  steps: number[][];
  /** note pad index (0..11) per step of the bell track */
  notes: number[];
}

export interface Settings {
  bpm: number;
  swing: number; // 50..75 (%)
  cutoff: number; // 0..1
  decay: number; // 0..1
  level: number; // 0..1
  scale: ScaleId;
  inst: InstId;
}

export interface Preset extends Settings {
  id: string;
  name: string;
  pattern: Pattern;
}

const row = (on: number[], accent: number[] = []) => Array.from({ length: 16 }, (_, i) => (accent.includes(i) ? 2 : on.includes(i) ? 1 : 0));

export const PRESETS: Preset[] = [
  {
    // gamelan bells in the rain on the window: the room's own weather
    id: 'bekasi-rain',
    name: 'Bekasi rain',
    bpm: 94,
    swing: 57,
    cutoff: 0.78,
    decay: 0.55,
    level: 0.8,
    scale: 'pelog',
    inst: 'bell',
    pattern: {
      steps: [row([0, 7, 10], [0]), row([4, 12], [12]), row([0, 2, 4, 6, 8, 10, 12, 14, 15]), row([2, 6, 9, 14])],
      notes: [0, 0, 4, 0, 0, 0, 3, 0, 0, 2, 0, 0, 0, 0, 7, 0],
    },
  },
  {
    // the morning commute into Jakarta, at a koplo-ish trot (Lintas)
    id: 'commuter-line',
    name: 'Commuter line',
    bpm: 128,
    swing: 50,
    cutoff: 0.9,
    decay: 0.35,
    level: 0.8,
    scale: 'minor',
    inst: 'synth',
    pattern: {
      steps: [row([0, 3, 7, 8, 11, 14], [0, 8]), row([4, 6, 12], [4, 12]), row([2, 3, 6, 10, 11, 14]), row([0, 5, 8, 13])],
      notes: [5, 0, 0, 0, 0, 7, 0, 0, 6, 0, 0, 0, 0, 4, 0, 0],
    },
  },
  {
    // lo-fi keys for labelling eval cases at the desk
    id: 'soft-focus',
    name: 'Soft focus',
    bpm: 84,
    swing: 62,
    cutoff: 0.62,
    decay: 0.6,
    level: 0.8,
    scale: 'dorian',
    inst: 'keys',
    pattern: {
      steps: [row([0, 7, 10], [0]), row([4, 12]), row([0, 2, 4, 6, 8, 10, 11, 12, 14]), row([0, 6, 11])],
      notes: [7, 0, 0, 0, 0, 0, 9, 0, 0, 0, 0, 8, 0, 0, 0, 0],
    },
  },
];

export const emptyPattern = (): Pattern => ({ steps: TRACK_NAMES.map(() => row([])), notes: Array(16).fill(7) });

export function randomPattern(scale: ScaleId): Pattern {
  const r = Math.random;
  const steps = [
    row([0, ...[3, 6, 7, 8, 10, 11, 14].filter(() => r() < 0.28)], [0]),
    row([4, 12, ...[7, 9, 15].filter(() => r() < 0.18)], r() < 0.5 ? [12] : []),
    row([...[0, 2, 4, 6, 8, 10, 12, 14].filter(() => r() < 0.85), ...[1, 3, 5, 7, 9, 11, 13, 15].filter(() => r() < 0.2)]),
    row([...Array(16).keys()].filter(() => r() < 0.26)),
  ];
  const n = SCALES.find((s) => s.id === scale)!.cents.length;
  const notes = Array.from({ length: 16 }, () => Math.floor(r() * Math.min(12, n + 3)));
  return { steps, notes };
}

export const activeSteps = (p: Pattern) => p.steps.reduce((a, r) => a + r.filter(Boolean).length, 0);

/* ---------------------------------------------------------------- voices */
function synthVoice(ctx: Ctx, dest: AudioNode, t: number, f: number, vel: number, decay: number) {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 5;
  lp.frequency.setValueAtTime(Math.min(16000, f * (5 + vel * 9)), t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(120, f * 1.6), t + 0.05 + decay * 0.5);
  const g = ctx.createGain();
  const peak = 0.14 * (0.35 + vel * 0.65);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05 + decay);
  lp.connect(g).connect(dest);
  for (const [type, det, mul] of [
    ['sawtooth', -7, 1],
    ['square', 6, 1],
    ['sine', 0, 0.5],
  ] as [OscillatorType, number, number][]) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f * mul;
    o.detune.value = det;
    o.connect(lp);
    o.start(t);
    o.stop(t + 0.1 + decay);
  }
}

class PO30 implements Settings {
  bpm = 96;
  swing = 56;
  cutoff = 0.8;
  decay = 0.5;
  level = 0.8;
  scale: ScaleId = 'minor';
  inst: InstId = 'synth';
  pattern: Pattern = emptyPattern();
  mute = [false, false, false, false];

  playing = false;
  /** scheduled step times (for the UI playhead) */
  private queue: { step: number; time: number }[] = [];
  private nextStep = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private bus: GainNode | null = null;
  private lp: BiquadFilterNode | null = null;
  private out: GainNode | null = null;
  onHit?: (pad: number, delayMs: number) => void;

  private chain() {
    if (this.bus || !audio.ctx) return this.bus;
    const ctx = audio.ctx;
    this.out = ctx.createGain();
    this.out.gain.value = this.level;
    this.out.connect(audio.master);
    this.lp = ctx.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.Q.value = 1.1;
    this.lp.frequency.value = this.cutoffHz();
    this.lp.connect(this.out);
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.9;
    this.bus.connect(this.lp);
    const send = ctx.createGain();
    send.gain.value = 0.12;
    this.lp.connect(send).connect(audio.reverbSend);
    return this.bus;
  }

  cutoffHz() {
    return 180 * Math.pow(100, this.cutoff);
  }

  set<K extends keyof Settings>(k: K, v: Settings[K]) {
    (this as Settings)[k] = v;
    const ctx = audio.ctx;
    if (!ctx) return;
    if (k === 'cutoff' && this.lp) this.lp.frequency.setTargetAtTime(this.cutoffHz(), ctx.currentTime, 0.03);
    if (k === 'level' && this.out) this.out.gain.setTargetAtTime(this.level, ctx.currentTime, 0.03);
  }

  /** Sound one pad (0..3 drums, 4..15 notes) at time t (default: now). */
  hit(pad: number, vel = 0.85, t?: number, note?: number) {
    if (!audio.ready) return;
    const ctx = audio.ctx!;
    const dest = this.chain()!;
    const at = t ?? ctx.currentTime + 0.004;
    const d = this.decay;
    if (pad === 0) kick(ctx, dest, at, { vel, f0: 160, f1: 46, decay: 0.2 + d * 0.6, click: 0.45 });
    else if (pad === 1) snare(ctx, dest, at, { vel, decay: 0.08 + d * 0.28, bright: 7500, tone: 200 });
    else if (pad === 2) hat(ctx, dest, at, { vel: vel * 1.1, decay: 0.02 + d * d * 0.28, hp: 7600 });
    else if (pad === 3) bell(ctx, dest, at, noteFreq(this.scale, note ?? 7) * 2, { vel, decay: 0.4 + d * 3, ombak: 5, pan: -0.1 });
    else {
      const k = pad - 4;
      const f = noteFreq(this.scale, k);
      if (this.inst === 'bell') bell(ctx, dest, at, f * 2, { vel, decay: 0.4 + d * 3, ombak: 5 });
      else if (this.inst === 'keys') ep(ctx, dest, at, f, 0.1 + d * 1.6, { vel: 0.45 + vel * 0.5 });
      else synthVoice(ctx, dest, at, f, vel, 0.1 + d * 1.5);
    }
  }

  /* ----------------------------------------------------- sequencer */
  get stepDur() {
    return 60 / this.bpm / 4;
  }

  start() {
    if (this.playing || !audio.ready) return false;
    this.chain();
    this.playing = true;
    this.nextStep = 0;
    this.nextTime = audio.ctx!.currentTime + 0.06;
    this.queue = [];
    this.tick();
    this.timer = window.setInterval(() => this.tick(), 25);
    return true;
  }

  stop() {
    this.playing = false;
    if (this.timer != null) clearInterval(this.timer);
    this.timer = null;
    this.queue = [];
  }

  private tick() {
    const ctx = audio.ctx;
    if (!ctx || !this.playing) return;
    const now = ctx.currentTime;
    if (this.nextTime < now - 0.2) this.nextTime = now + 0.02; // stalled tab: resync
    while (this.nextTime < now + 0.1) {
      const s = this.nextStep;
      const sw = s % 2 === 1 ? ((this.swing - 50) / 50) * this.stepDur : 0;
      const t = this.nextTime + sw;
      let first = -1;
      this.pattern.steps.forEach((r, tr) => {
        const v = r[s];
        if (!v || this.mute[tr]) return;
        const vel = v === 2 ? 1 : tr === 2 ? (s % 4 === 0 ? 0.75 : 0.55) : 0.8;
        this.hit(tr, vel, t, tr === 3 ? this.pattern.notes[s] : undefined);
        if (first < 0) first = tr === 3 ? 4 + this.pattern.notes[s] : tr;
      });
      if (first >= 0) this.onHit?.(first, Math.max(0, (t - now) * 1000));
      this.queue.push({ step: s, time: t });
      if (this.queue.length > 32) this.queue.shift();
      this.nextStep = (s + 1) % 16;
      this.nextTime += this.stepDur;
    }
  }

  /** the step currently sounding (−1 when stopped) */
  currentStep() {
    const ctx = audio.ctx;
    if (!this.playing || !ctx) return -1;
    const now = ctx.currentTime;
    let cur = -1;
    for (const q of this.queue) if (q.time <= now) cur = q.step;
    return cur;
  }

  /** nearest step to "now" (for live recording) */
  nearestStep() {
    const ctx = audio.ctx;
    if (!ctx || !this.playing) return -1;
    const now = ctx.currentTime;
    let best = -1;
    let bd = Infinity;
    for (const q of this.queue) {
      const d = Math.abs(q.time - now);
      if (d < bd) {
        bd = d;
        best = q.step;
      }
    }
    // the next step may not be queued yet
    return best;
  }
}

export const po30 = new PO30();
