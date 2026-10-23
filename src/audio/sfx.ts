/* ==========================================================================
   Procedural SFX recipes. Each recipe schedules nodes into `out` at time t.
   Short, tactile, "hardware-like": aluminium clicks, keycaps, relays, LCD
   beeps, paper, metal — and the cinematic opening (keypad → maglock → steel
   door → fluorescent tubes). Every source is stopped right after its tail.
   ========================================================================== */
import { buffer } from './instruments';

export type SfxName =
  | 'hover'
  | 'click'
  | 'key'
  | 'open'
  | 'close'
  | 'back'
  | 'whoosh'
  | 'beep'
  | 'boot'
  | 'success'
  | 'error'
  | 'coin'
  | 'achievement'
  | 'tier'
  | 'found'
  | 'print'
  | 'paper'
  | 'type'
  | 'dial'
  | 'ring'
  | 'press'
  | 'release'
  | 'door-unlock'
  | 'door-open'
  | 'lights-on'
  | 'tick'
  | 'pop'
  | 'stamp'
  | 'switch'
  | 'scratch'
  // music stations
  | 'knob'
  | 'step'
  | 'needle'
  | 'sleeve';

type Ctx = BaseAudioContext;

interface Recipe {
  bus?: 'sfx' | 'ui';
  reverb?: number;
  play: (ctx: Ctx, out: AudioNode, t: number, pitch: number) => void;
}

const EPS = 0.0001;
const st = (semi: number) => Math.pow(2, semi / 12);
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function env(ctx: Ctx, t: number, a: number, peak: number, d: number, dest: AudioNode, sustainEnd?: number) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(EPS, t);
  g.gain.linearRampToValueAtTime(Math.max(peak, EPS * 2), t + a);
  if (sustainEnd) g.gain.setValueAtTime(Math.max(peak, EPS * 2), sustainEnd);
  g.gain.exponentialRampToValueAtTime(EPS, (sustainEnd ?? t + a) + d);
  g.connect(dest);
  return g;
}

function tone(ctx: Ctx, dest: AudioNode, t: number, freq: number, dur: number, type: OscillatorType = 'sine', peak = 0.3, attack = 0.004) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  const g = env(ctx, t, attack, peak, dur, dest);
  o.connect(g);
  o.start(t);
  o.stop(t + attack + dur + 0.03);
  return o;
}

/** pitched blip that glides f0 → f1 */
function glide(ctx: Ctx, dest: AudioNode, t: number, f0: number, f1: number, dur: number, type: OscillatorType = 'sine', peak = 0.2, attack = 0.002) {
  const o = tone(ctx, dest, t, f0, dur, type, peak, attack);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + attack + dur * 0.8);
  return o;
}

function noise(ctx: Ctx, dest: AudioNode, t: number, dur: number, opts: { type?: BiquadFilterType; freq?: number; q?: number; peak?: number; attack?: number; kind?: 'white' | 'pink' | 'brown' } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = buffer(ctx, opts.kind ?? 'white');
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = opts.type ?? 'bandpass';
  f.frequency.value = opts.freq ?? 2000;
  f.Q.value = opts.q ?? 1;
  const g = env(ctx, t, opts.attack ?? 0.001, opts.peak ?? 0.3, dur, dest);
  src.connect(f).connect(g);
  src.start(t, Math.random() * 1.5);
  src.stop(t + (opts.attack ?? 0.001) + dur + 0.03);
  return { src, f, g };
}

/** precise mechanical click: bright transient + small resonant body */
function clicky(ctx: Ctx, out: AudioNode, t: number, freq: number, body = 0.12) {
  noise(ctx, out, t, 0.006, { type: 'highpass', freq: freq, q: 0.7, peak: 0.42 });
  noise(ctx, out, t, 0.022, { type: 'bandpass', freq: freq * 0.45, q: 9, peak: body * 1.4 });
  glide(ctx, out, t, freq / 14, freq / 22, 0.028, 'sine', body);
}

/** metallic strike: a handful of inharmonic partials */
function metal(ctx: Ctx, out: AudioNode, t: number, f: number, peak: number, decay: number, ratios = [1, 2.32, 3.86, 5.41]) {
  ratios.forEach((r, i) => tone(ctx, out, t, f * r, decay / (1 + i * 0.7), 'sine', peak / (1 + i * 0.8), 0.001));
}

function panner(ctx: Ctx, dest: AudioNode, from: number, to: number, t: number, dur: number) {
  const p = ctx.createStereoPanner();
  p.pan.setValueAtTime(from, t);
  p.pan.linearRampToValueAtTime(to, t + dur);
  p.connect(dest);
  return p;
}

export const RECIPES: Record<SfxName, Recipe> = {
  /* --------------------------------------------------------------- UI */
  hover: {
    bus: 'ui',
    play: (ctx, out, t, p) => {
      tone(ctx, out, t, 2400 * st(p), 0.028, 'sine', 0.03, 0.002);
      noise(ctx, out, t, 0.004, { type: 'highpass', freq: 8500, peak: 0.03 });
    },
  },
  click: {
    bus: 'ui',
    play: (ctx, out, t, p) => clicky(ctx, out, t, 4200 * st(p), 0.13),
  },
  key: {
    bus: 'ui',
    play: (ctx, out, t, p) => {
      const v = 1 + (Math.random() - 0.5) * 0.16;
      // down: switch click + bottom-out thock
      noise(ctx, out, t, 0.008, { type: 'bandpass', freq: 3000 * v * st(p), q: 1.4, peak: 0.36 });
      noise(ctx, out, t + 0.004, 0.03, { type: 'lowpass', freq: 1100 * v, peak: 0.22 });
      glide(ctx, out, t + 0.003, 360 * v * st(p), 190 * v, 0.04, 'sine', 0.13);
      // upstroke
      noise(ctx, out, t + rnd(0.07, 0.095), 0.006, { type: 'bandpass', freq: 4200 * v, q: 2, peak: 0.1 });
    },
  },
  type: {
    bus: 'ui',
    play: (ctx, out, t) => {
      const v = rnd(0.88, 1.15);
      noise(ctx, out, t, 0.006, { type: 'bandpass', freq: 3600 * v, q: 1.2, peak: 0.2 });
      noise(ctx, out, t + 0.003, 0.018, { type: 'lowpass', freq: 1300 * v, peak: 0.1 });
    },
  },
  open: {
    bus: 'ui',
    reverb: 0.18,
    play: (ctx, out, t, p) => {
      // soft slide + two-note chime + magnetic latch
      const { f } = noise(ctx, out, t, 0.16, { type: 'bandpass', freq: 1200, q: 0.9, peak: 0.06, attack: 0.06 });
      f.frequency.exponentialRampToValueAtTime(3200, t + 0.2);
      tone(ctx, out, t + 0.02, 659.25 * st(p), 0.16, 'sine', 0.12, 0.004);
      tone(ctx, out, t + 0.02, 1318.5 * st(p), 0.06, 'sine', 0.02, 0.002);
      tone(ctx, out, t + 0.09, 987.77 * st(p), 0.28, 'sine', 0.11, 0.004);
      clicky(ctx, out, t + 0.17, 3600, 0.06);
    },
  },
  close: {
    bus: 'ui',
    reverb: 0.1,
    play: (ctx, out, t, p) => {
      tone(ctx, out, t, 880 * st(p), 0.07, 'sine', 0.1);
      tone(ctx, out, t + 0.055, 587.33 * st(p), 0.16, 'sine', 0.1);
      clicky(ctx, out, t + 0.07, 2600, 0.08);
    },
  },
  back: {
    bus: 'ui',
    play: (ctx, out, t, p) => {
      clicky(ctx, out, t, 2800 * st(p), 0.1);
      glide(ctx, out, t + 0.015, 520 * st(p), 390 * st(p), 0.09, 'sine', 0.08);
    },
  },
  whoosh: {
    reverb: 0.15,
    play: (ctx, out, t) => {
      const pan = panner(ctx, out, -0.5, 0.5, t, 0.7);
      const { f } = noise(ctx, pan, t, 0.55, { type: 'bandpass', freq: 400, q: 0.9, peak: 0.13, attack: 0.22, kind: 'pink' });
      f.frequency.setValueAtTime(260, t);
      f.frequency.exponentialRampToValueAtTime(2400, t + 0.32);
      f.frequency.exponentialRampToValueAtTime(700, t + 0.78);
      noise(ctx, out, t + 0.05, 0.5, { type: 'lowpass', freq: 220, peak: 0.08, attack: 0.25, kind: 'brown' });
    },
  },
  beep: {
    bus: 'ui',
    play: (ctx, out, t, p) => {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 5200;
      lp.connect(out);
      tone(ctx, lp, t, 2093 * st(p), 0.06, 'square', 0.045, 0.002);
      tone(ctx, out, t, 4186 * st(p), 0.03, 'sine', 0.01, 0.002);
    },
  },
  boot: {
    reverb: 0.3,
    play: (ctx, out, t) => {
      // relay, CRT degauss "bwoom", rising flyback whine, chime
      clicky(ctx, out, t, 2400, 0.22);
      const d = ctx.createOscillator();
      d.type = 'sawtooth';
      d.frequency.setValueAtTime(50, t + 0.03);
      const dl = ctx.createBiquadFilter();
      dl.type = 'lowpass';
      dl.frequency.setValueAtTime(900, t + 0.03);
      dl.frequency.exponentialRampToValueAtTime(120, t + 0.9);
      d.connect(dl).connect(env(ctx, t + 0.03, 0.02, 0.2, 0.9, out));
      d.start(t + 0.03);
      d.stop(t + 1);
      glide(ctx, out, t + 0.03, 90, 48, 0.3, 'sine', 0.38);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(8000, t + 0.08);
      o.frequency.exponentialRampToValueAtTime(15600, t + 1.1);
      o.connect(env(ctx, t + 0.08, 0.3, 0.01, 1.1, out));
      o.start(t + 0.08);
      o.stop(t + 1.6);
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        tone(ctx, out, t + 0.62 + i * 0.085, f, 0.9 - i * 0.12, 'sine', 0.1, 0.006);
        tone(ctx, out, t + 0.62 + i * 0.085, f * 2, 0.25, 'sine', 0.015, 0.003);
      });
    },
  },
  success: {
    reverb: 0.25,
    play: (ctx, out, t, p) => {
      [0, 4, 7, 12].forEach((s, i) => {
        tone(ctx, out, t + i * 0.065, 523.25 * st(s + p), 0.38, 'triangle', 0.1, 0.003);
        tone(ctx, out, t + i * 0.065, 1046.5 * st(s + p), 0.18, 'sine', 0.025, 0.002);
      });
    },
  },
  error: {
    bus: 'ui',
    play: (ctx, out, t) => {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1800;
      lp.connect(out);
      tone(ctx, lp, t, 220, 0.1, 'square', 0.07);
      tone(ctx, lp, t + 0.12, 164.8, 0.17, 'square', 0.07);
      clicky(ctx, out, t, 1800, 0.05);
    },
  },
  coin: {
    play: (ctx, out, t, p) => {
      tone(ctx, out, t, 987.77 * st(p), 0.06, 'square', 0.06);
      tone(ctx, out, t + 0.06, 1318.5 * st(p), 0.26, 'square', 0.06);
    },
  },
  achievement: {
    reverb: 0.45,
    play: (ctx, out, t) => {
      const notes = [783.99, 987.77, 1174.66, 1567.98];
      notes.forEach((f, i) => {
        tone(ctx, out, t + i * 0.08, f, 1.1, 'sine', 0.14, 0.003);
        tone(ctx, out, t + i * 0.08, f * 2.76, 0.32, 'sine', 0.025, 0.002);
        tone(ctx, out, t + i * 0.08, f * 2.003, 0.5, 'sine', 0.035, 0.003);
      });
      noise(ctx, out, t + 0.3, 0.8, { type: 'highpass', freq: 9000, peak: 0.025, attack: 0.2 });
    },
  },
  tier: {
    reverb: 0.5,
    play: (ctx, out, t) => {
      [0, 7, 12, 16, 19, 24].forEach((s, i) => {
        tone(ctx, out, t + i * 0.06, 392 * st(s), 1.4, 'triangle', 0.09);
        tone(ctx, out, t + i * 0.06, 784 * st(s), 0.4, 'sine', 0.02);
      });
      glide(ctx, out, t, 110, 98, 1.2, 'sine', 0.26);
    },
  },
  found: {
    reverb: 0.6,
    play: (ctx, out, t) => {
      const chord = [261.63, 329.63, 392, 493.88];
      chord.forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f * 2;
        o.detune.value = (i - 1.5) * 6;
        const g = ctx.createGain();
        g.gain.setValueAtTime(EPS, t);
        g.gain.exponentialRampToValueAtTime(0.055, t + 0.35);
        g.gain.exponentialRampToValueAtTime(EPS, t + 2.4);
        o.connect(g).connect(out);
        o.start(t + i * 0.04);
        o.stop(t + 2.5);
      });
      tone(ctx, out, t + 0.05, 1567.98, 1.2, 'sine', 0.045);
      tone(ctx, out, t + 0.05, 1567.98 * 2.76, 0.3, 'sine', 0.01);
    },
  },

  /* ------------------------------------------------------- objects */
  print: {
    play: (ctx, out, t) => {
      // thermal printer: stepper whine stuttering at the line rate + ticks
      const steps = 26;
      const rate = 0.045;
      const m = ctx.createOscillator();
      m.type = 'square';
      m.frequency.value = 440;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1500;
      bp.Q.value = 2.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(EPS, t);
      for (let i = 0; i < steps; i++) {
        const at = t + i * rate;
        g.gain.setValueAtTime(0.085, at);
        g.gain.setValueAtTime(0.03, at + rate * 0.55);
        m.frequency.setValueAtTime(440 + (i % 2) * 30, at);
        noise(ctx, out, at, 0.012, { type: 'bandpass', freq: 2600 + (i % 3) * 400, q: 5, peak: 0.16 });
      }
      g.gain.setValueAtTime(0.03, t + steps * rate);
      g.gain.exponentialRampToValueAtTime(EPS, t + steps * rate + 0.04);
      m.connect(bp).connect(g).connect(out);
      m.start(t);
      m.stop(t + steps * rate + 0.06);
      // paper feed hiss
      noise(ctx, out, t + 0.05, steps * rate, { type: 'highpass', freq: 5000, peak: 0.025, attack: 0.08 });
    },
  },
  paper: {
    play: (ctx, out, t) => {
      // a few friction grains + a soft flap
      for (let i = 0; i < 6; i++) {
        const at = t + i * rnd(0.03, 0.06);
        noise(ctx, out, at, rnd(0.03, 0.07), { type: 'bandpass', freq: rnd(2200, 6000), q: rnd(0.6, 1.6), peak: rnd(0.05, 0.11), attack: 0.008 });
      }
      noise(ctx, out, t + 0.22, 0.09, { type: 'lowpass', freq: 700, peak: 0.12, attack: 0.01 });
    },
  },
  dial: {
    play: (ctx, out, t, p) => {
      // DTMF (pitch = key index 0–11 → 1 2 3 / 4 5 6 / 7 8 9 / * 0 #), telephone band
      const rows = [697, 770, 852, 941];
      const cols = [1209, 1336, 1477];
      const i = Math.abs(Math.round(p)) % 12;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1100;
      bp.Q.value = 0.45;
      bp.connect(out);
      tone(ctx, bp, t, rows[Math.floor(i / 3) % 4], 0.13, 'sine', 0.13, 0.003);
      tone(ctx, bp, t, cols[i % 3], 0.13, 'sine', 0.13, 0.003);
      clicky(ctx, out, t, 3000, 0.06);
    },
  },
  ring: {
    play: (ctx, out, t) => {
      // Indonesian ring-back: 425 Hz through the telephone band
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900;
      bp.Q.value = 0.5;
      bp.connect(out);
      tone(ctx, bp, t, 425, 0.8, 'sine', 0.13, 0.02);
      tone(ctx, bp, t, 850, 0.8, 'sine', 0.012, 0.02);
    },
  },
  press: {
    play: (ctx, out, t, p) => {
      // big button: plastic thunk with a spring
      noise(ctx, out, t, 0.006, { type: 'highpass', freq: 2500, peak: 0.2 });
      noise(ctx, out, t, 0.05, { type: 'lowpass', freq: 900, peak: 0.36 });
      glide(ctx, out, t, 170 * st(p), 75 * st(p), 0.12, 'sine', 0.42);
      noise(ctx, out, t + 0.012, 0.09, { type: 'bandpass', freq: 520, q: 12, peak: 0.05 });
    },
  },
  release: {
    play: (ctx, out, t, p) => {
      noise(ctx, out, t, 0.008, { type: 'highpass', freq: 2800, peak: 0.18 });
      glide(ctx, out, t, 240 * st(p), 320 * st(p), 0.05, 'sine', 0.12);
      noise(ctx, out, t + 0.01, 0.06, { type: 'bandpass', freq: 1800, q: 10, peak: 0.03 });
    },
  },
  tick: {
    bus: 'ui',
    play: (ctx, out, t, p) => {
      noise(ctx, out, t, 0.004, { type: 'highpass', freq: 6000 * st(p), peak: 0.14 });
      noise(ctx, out, t, 0.016, { type: 'bandpass', freq: 3400 * st(p), q: 12, peak: 0.05 });
    },
  },
  pop: {
    bus: 'ui',
    play: (ctx, out, t, p) => {
      glide(ctx, out, t, 900 * st(p), 260 * st(p), 0.1, 'sine', 0.22, 0.002);
      noise(ctx, out, t, 0.004, { type: 'highpass', freq: 5000, peak: 0.05 });
    },
  },
  stamp: {
    reverb: 0.2,
    play: (ctx, out, t) => {
      // rubber stamp: ink pad suck + thump on paper
      noise(ctx, out, t, 0.07, { type: 'lowpass', freq: 800, peak: 0.55 });
      glide(ctx, out, t, 120, 60, 0.16, 'sine', 0.45);
      noise(ctx, out, t + 0.008, 0.045, { type: 'bandpass', freq: 3200, q: 0.8, peak: 0.1 });
      noise(ctx, out, t + 0.11, 0.05, { type: 'highpass', freq: 3000, peak: 0.03 });
    },
  },
  switch: {
    play: (ctx, out, t, p) => {
      // toggle: lever snap + contact
      clicky(ctx, out, t, 3400 * st(p), 0.2);
      clicky(ctx, out, t + 0.026, 2300 * st(p), 0.09);
      metal(ctx, out, t + 0.002, 2800 * st(p), 0.03, 0.05);
    },
  },
  scratch: {
    play: (ctx, out, t) => {
      // baby scratch: record dragged forward then back under the needle
      const s = ctx.createBufferSource();
      s.buffer = buffer(ctx, 'crackle');
      s.loop = true;
      const pts: [number, number][] = [
        [0, 0.05],
        [0.07, 2.2],
        [0.13, 0.08],
        [0.2, 1.8],
        [0.28, 0.05],
      ];
      s.playbackRate.setValueAtTime(pts[0][1], t);
      pts.slice(1).forEach(([x, v]) => s.playbackRate.linearRampToValueAtTime(v, t + x));
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 2.2;
      bp.frequency.setValueAtTime(300, t);
      pts.slice(1).forEach(([x, v]) => bp.frequency.linearRampToValueAtTime(300 + v * 900, t + x));
      const g = env(ctx, t, 0.01, 1.4, 0.28, out);
      s.connect(bp).connect(g);
      s.start(t, Math.random() * 3);
      s.stop(t + 0.35);
      // the tonal "wah" of the music on the groove
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(60, t);
      pts.slice(1).forEach(([x, v]) => o.frequency.linearRampToValueAtTime(60 + v * 220, t + x));
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1400;
      o.connect(lp).connect(env(ctx, t, 0.02, 0.16, 0.26, out));
      o.start(t);
      o.stop(t + 0.32);
    },
  },

  /* ---------------------------------------------- music stations */
  knob: {
    bus: 'ui',
    play: (ctx, out, t, p) => {
      // rotary detent: tiny metal tick
      noise(ctx, out, t, 0.003, { type: 'highpass', freq: 5500 * st(p * 0.25), peak: 0.12 });
      noise(ctx, out, t, 0.012, { type: 'bandpass', freq: 2600 * st(p * 0.25), q: 14, peak: 0.04 });
    },
  },
  step: {
    bus: 'ui',
    play: (ctx, out, t, p) => {
      // rubber step key
      noise(ctx, out, t, 0.006, { type: 'bandpass', freq: 2400 * st(p), q: 1.2, peak: 0.22 });
      glide(ctx, out, t, 300 * st(p), 170 * st(p), 0.035, 'sine', 0.1);
    },
  },
  needle: {
    reverb: 0.1,
    play: (ctx, out, t) => {
      // tonearm cue lowers: soft thud, a couple of dust pops, groove hiss swell
      glide(ctx, out, t, 95, 55, 0.09, 'sine', 0.35);
      noise(ctx, out, t, 0.03, { type: 'lowpass', freq: 600, peak: 0.25 });
      for (let i = 0; i < 4; i++) noise(ctx, out, t + rnd(0.04, 0.5), 0.004, { type: 'highpass', freq: rnd(2000, 5000), peak: rnd(0.08, 0.2) });
      noise(ctx, out, t + 0.02, 0.5, { type: 'bandpass', freq: 3800, q: 0.5, peak: 0.03, attack: 0.12 });
    },
  },
  sleeve: {
    play: (ctx, out, t) => {
      // record slides out of a card sleeve
      const { f } = noise(ctx, out, t, 0.32, { type: 'bandpass', freq: 1800, q: 0.7, peak: 0.24, attack: 0.1, kind: 'pink' });
      f.frequency.linearRampToValueAtTime(4200, t + 0.35);
      noise(ctx, out, t + 0.36, 0.05, { type: 'lowpass', freq: 500, peak: 0.2 });
    },
  },

  /* ------------------------------------------------ the opening */
  'door-unlock': {
    reverb: 0.22,
    play: (ctx, out, t) => {
      // keypad: two key beeps + confirm chirp
      [0, 0.085].forEach((d, i) => {
        clicky(ctx, out, t + d, 3800, 0.08);
        tone(ctx, out, t + d + 0.004, 2093 + i * 260, 0.055, 'square', 0.035, 0.002);
      });
      tone(ctx, out, t + 0.19, 2637, 0.05, 'square', 0.04, 0.002);
      tone(ctx, out, t + 0.245, 3520, 0.09, 'square', 0.04, 0.002);
      // maglock: holding hum cut off → release clank
      const hum = ctx.createOscillator();
      hum.type = 'sawtooth';
      hum.frequency.value = 100;
      const hl = ctx.createBiquadFilter();
      hl.type = 'lowpass';
      hl.frequency.value = 600;
      const hg = ctx.createGain();
      hg.gain.setValueAtTime(EPS, t);
      hg.gain.linearRampToValueAtTime(0.03, t + 0.08);
      hg.gain.setValueAtTime(0.03, t + 0.27);
      hg.gain.exponentialRampToValueAtTime(EPS, t + 0.29);
      hum.connect(hl).connect(hg).connect(out);
      hum.start(t);
      hum.stop(t + 0.32);
      const r = t + 0.28;
      noise(ctx, out, r, 0.05, { type: 'bandpass', freq: 3400, q: 3, peak: 0.32 });
      metal(ctx, out, r, 980, 0.07, 0.35, [1, 2.71, 4.93, 7.6]);
      glide(ctx, out, r, 110, 55, 0.14, 'sine', 0.32);
      noise(ctx, out, r, 0.08, { type: 'lowpass', freq: 500, peak: 0.3 });
      // latch bolt retracts
      clicky(ctx, out, r + 0.09, 2200, 0.16);
      clicky(ctx, out, r + 0.13, 1600, 0.1);
    },
  },
  'door-open': {
    reverb: 0.55,
    play: (ctx, out, t) => {
      // heavy steel door: handle, seal break (pressure "whump"), hinge groan,
      // air rushing in, and the door settling on its stop.
      clicky(ctx, out, t, 1800, 0.18);
      noise(ctx, out, t + 0.02, 0.06, { type: 'lowpass', freq: 900, peak: 0.2 });
      // pressure change
      glide(ctx, out, t + 0.1, 46, 30, 0.7, 'sine', 0.42, 0.06);
      const air = noise(ctx, out, t + 0.12, 1.5, { type: 'lowpass', freq: 200, q: 0.6, peak: 0.16, attack: 0.25, kind: 'pink' });
      air.f.frequency.setValueAtTime(180, t + 0.12);
      air.f.frequency.exponentialRampToValueAtTime(1300, t + 0.55);
      air.f.frequency.exponentialRampToValueAtTime(320, t + 1.7);
      // hinge groan: stick-slip pulse train through two resonances
      const grind = ctx.createOscillator();
      grind.type = 'sawtooth';
      grind.frequency.setValueAtTime(22, t + 0.2);
      grind.frequency.linearRampToValueAtTime(34, t + 0.7);
      grind.frequency.linearRampToValueAtTime(18, t + 1.4);
      const gg = ctx.createGain();
      gg.gain.setValueAtTime(EPS, t + 0.2);
      gg.gain.linearRampToValueAtTime(0.5, t + 0.45);
      gg.gain.setValueAtTime(0.5, t + 1.05);
      gg.gain.exponentialRampToValueAtTime(EPS, t + 1.5);
      grind.connect(gg);
      [
        [310, 18, 380, 260, 1],
        [760, 24, 890, 640, 0.55],
        [1240, 30, 1380, 1120, 0.25],
      ].forEach(([f0, q, f1, f2, a]) => {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = q;
        bp.frequency.setValueAtTime(f0, t + 0.2);
        bp.frequency.linearRampToValueAtTime(f1, t + 0.75);
        bp.frequency.linearRampToValueAtTime(f2, t + 1.5);
        const ag = ctx.createGain();
        ag.gain.value = a * 0.55;
        gg.connect(bp).connect(ag).connect(out);
      });
      grind.start(t + 0.2);
      grind.stop(t + 1.55);
      // body resonance of the slab
      glide(ctx, out, t + 0.25, 72, 64, 1.2, 'sine', 0.1, 0.3);
      // settles on the stop
      glide(ctx, out, t + 1.62, 90, 45, 0.25, 'sine', 0.3);
      noise(ctx, out, t + 1.62, 0.12, { type: 'lowpass', freq: 600, peak: 0.18 });
      metal(ctx, out, t + 1.63, 420, 0.03, 0.6, [1, 2.44, 3.9]);
    },
  },
  'lights-on': {
    reverb: 0.45,
    play: (ctx, out, t) => {
      // wall switch
      clicky(ctx, out, t, 2600, 0.24);
      // three banks of tubes: starter ping + flicker buzz bursts, then a contactor clunk
      const banks = [0.18, 0.62, 1.02];
      banks.forEach((b, k) => {
        const pan = ctx.createStereoPanner();
        pan.pan.value = (k - 1) * 0.6;
        pan.connect(out);
        const at = t + b;
        const flick = [0, 0.045, 0.11, 0.13, 0.21];
        flick.forEach((d, j) => {
          metal(ctx, pan, at + d, 3800 + k * 300, 0.035, 0.05, [1, 1.9, 3.1]);
          const o = ctx.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = 100;
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 1400;
          o.connect(lp).connect(env(ctx, at + d, 0.002, 0.06 - j * 0.006, 0.03 + j * 0.01, pan));
          o.start(at + d);
          o.stop(at + d + 0.1);
        });
        // contactor clunk + low boom as the bank strikes
        const s = at + 0.26;
        noise(ctx, pan, s, 0.04, { type: 'bandpass', freq: 1700, q: 2, peak: 0.3 });
        glide(ctx, pan, s, 80, 48, 0.4, 'sine', 0.34);
        noise(ctx, pan, s, 0.1, { type: 'lowpass', freq: 400, peak: 0.25 });
      });
      // ballast hum swells then settles under the room tone
      const h = ctx.createOscillator();
      h.type = 'sawtooth';
      h.frequency.value = 100;
      const hl = ctx.createBiquadFilter();
      hl.type = 'lowpass';
      hl.frequency.value = 500;
      const hg = ctx.createGain();
      hg.gain.setValueAtTime(EPS, t + 0.4);
      hg.gain.linearRampToValueAtTime(0.03, t + 1.4);
      hg.gain.exponentialRampToValueAtTime(EPS, t + 3.6);
      h.connect(hl).connect(hg).connect(out);
      h.start(t + 0.4);
      h.stop(t + 3.7);
      // the high whine of the tubes
      tone(ctx, out, t + 1.3, 11800, 1.8, 'sine', 0.004, 0.4);
    },
  },
};
