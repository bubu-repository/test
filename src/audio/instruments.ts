/* ==========================================================================
   Instrument voices shared by the BGM (music.ts) and the PO-30 synth panel.
   Every voice is a tiny, fire-and-forget Web Audio graph scheduled at time t
   into `dest`; sources are always stopped right after their envelope ends so
   the graph never grows. Works with any BaseAudioContext (live or offline).
   ========================================================================== */

export type Ctx = BaseAudioContext;

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
export const cents = (f: number, c: number) => f * Math.pow(2, c / 1200);

const EPS = 0.0001;

/* ------------------------------------------------------------------ cache */
interface Res {
  buffers: Map<string, AudioBuffer>;
  waves: Map<string, PeriodicWave>;
}
const cache = new WeakMap<Ctx, Res>();
function res(ctx: Ctx): Res {
  let r = cache.get(ctx);
  if (!r) {
    r = { buffers: new Map(), waves: new Map() };
    cache.set(ctx, r);
  }
  return r;
}

export type BufferKind = 'white' | 'brown' | 'pink' | 'crackle' | 'nesLong' | 'nesShort' | 'rain';

/** Procedural noise buffers, generated once per context and reused. */
export function buffer(ctx: Ctx, kind: BufferKind): AudioBuffer {
  const r = res(ctx);
  const hit = r.buffers.get(kind);
  if (hit) return hit;
  const sr = ctx.sampleRate;
  let b: AudioBuffer;
  if (kind === 'nesShort' || kind === 'nesLong') {
    // NES APU noise: 15-bit LFSR, short mode (bit 6 tap) is the metallic 93-step loop
    const len = kind === 'nesShort' ? 93 * 8 : 32767;
    b = ctx.createBuffer(1, len, sr);
    const d = b.getChannelData(0);
    let reg = 1;
    const tap = kind === 'nesShort' ? 6 : 1;
    for (let i = 0; i < len; i++) {
      const fb = (reg & 1) ^ ((reg >> tap) & 1);
      reg = (reg >> 1) | (fb << 14);
      d[i] = reg & 1 ? 0.8 : -0.8;
    }
  } else {
    const secs = kind === 'crackle' ? 6 : kind === 'rain' ? 4 : 2;
    const len = Math.floor(sr * secs);
    b = ctx.createBuffer(kind === 'rain' ? 2 : 1, len, sr);
    for (let c = 0; c < b.numberOfChannels; c++) {
      const d = b.getChannelData(c);
      if (kind === 'white') for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      else if (kind === 'brown') {
        let last = 0;
        for (let i = 0; i < len; i++) {
          last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
          d[i] = last * 3.5;
        }
      } else if (kind === 'pink' || kind === 'rain') {
        // Paul Kellet's pink filter; rain adds sparse droplet ticks on top
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856;
          b4 = 0.55 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        }
        if (kind === 'rain') {
          const drops = Math.floor(secs * 70);
          for (let k = 0; k < drops; k++) {
            const at = Math.floor(Math.random() * (len - 400));
            const a = 0.15 + Math.random() * 0.45;
            const decay = 40 + Math.random() * 160;
            for (let j = 0; j < 400; j++) d[at + j] += (Math.random() * 2 - 1) * a * Math.exp(-j / decay);
          }
        }
      } else {
        // vinyl crackle: very low hiss + sparse dust pops of varying size
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.012;
        const pops = Math.floor(secs * 26);
        for (let k = 0; k < pops; k++) {
          const at = Math.floor(Math.random() * (len - 200));
          const big = Math.random() < 0.08;
          const a = (big ? 0.6 : 0.12 + Math.random() * 0.25) * (Math.random() < 0.5 ? -1 : 1);
          const w = big ? 60 : 6 + Math.random() * 20;
          for (let j = 0; j < w * 3; j++) d[at + j] += a * Math.exp(-j / w) * (j % 2 ? -0.6 : 1);
        }
      }
    }
  }
  r.buffers.set(kind, b);
  return b;
}

/** Band-limited pulse wave with duty cycle (0.125 / 0.25 / 0.5). */
export function pulseWave(ctx: Ctx, duty: number): PeriodicWave {
  const key = 'pulse' + duty;
  const r = res(ctx);
  const hit = r.waves.get(key);
  if (hit) return hit;
  const n = 64;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    // fourier series of a pulse: (2/(kπ)) sin(kπd), cosine terms
    real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  }
  const w = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  r.waves.set(key, w);
  return w;
}

/** 4-bit stepped triangle like the NES triangle channel. */
export function nesTriangle(ctx: Ctx): PeriodicWave {
  const r = res(ctx);
  const hit = r.waves.get('nestri');
  if (hit) return hit;
  // sample one period of a 32-step triangle, take DFT for first 48 harmonics
  const N = 32;
  const steps: number[] = [];
  for (let i = 0; i < N; i++) steps.push(i < 16 ? 15 - i : i - 16);
  const H = 48;
  const real = new Float32Array(H);
  const imag = new Float32Array(H);
  for (let k = 1; k < H; k++) {
    let re = 0,
      im = 0;
    for (let i = 0; i < N; i++) {
      const v = steps[i] / 7.5 - 1;
      // integrate each flat step exactly (box) to keep it band-limited-ish
      const a0 = (2 * Math.PI * k * i) / N;
      const a1 = (2 * Math.PI * k * (i + 1)) / N;
      re += (v * (Math.sin(a1) - Math.sin(a0))) / (2 * Math.PI * k);
      im += (v * (Math.cos(a0) - Math.cos(a1))) / (2 * Math.PI * k);
    }
    real[k] = re * 2;
    imag[k] = im * 2;
  }
  const w = ctx.createPeriodicWave(real, imag);
  r.waves.set('nestri', w);
  return w;
}

const curves = new Map<string, Float32Array<ArrayBuffer>>();
/** Waveshaper curves: soft tanh saturation or a bit-crush staircase. */
export function curve(kind: 'soft' | 'warm' | 'crush'): Float32Array<ArrayBuffer> {
  const hit = curves.get(kind);
  if (hit) return hit;
  const n = 2048;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    if (kind === 'soft') c[i] = Math.tanh(1.6 * x) / Math.tanh(1.6);
    else if (kind === 'warm') c[i] = Math.tanh(2.6 * x) / Math.tanh(2.6);
    else c[i] = Math.round(x * 64) / 64;
  }
  curves.set(kind, c);
  return c;
}

/* ---------------------------------------------------------------- helpers */
function panned(ctx: Ctx, dest: AudioNode, pan?: number): AudioNode {
  if (!pan) return dest;
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  p.connect(dest);
  return p;
}

/** percussive gain env: attack a, exponential decay d (to silence) */
function perc(ctx: Ctx, dest: AudioNode, t: number, peak: number, a: number, d: number) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(EPS, t);
  g.gain.linearRampToValueAtTime(Math.max(peak, EPS), t + a);
  g.gain.exponentialRampToValueAtTime(EPS, t + a + d);
  g.connect(dest);
  return g;
}

function noiseSrc(ctx: Ctx, kind: BufferKind, t: number, dur: number, rate = 1) {
  const s = ctx.createBufferSource();
  s.buffer = buffer(ctx, kind);
  s.loop = true;
  s.playbackRate.value = rate;
  const b = s.buffer;
  s.start(t, Math.random() * b.duration * 0.9);
  s.stop(t + dur + 0.02);
  return s;
}

export interface HitOpts {
  vel?: number;
  pan?: number;
}

/* ------------------------------------------------------------------ drums */
export function kick(ctx: Ctx, dest: AudioNode, t: number, o: HitOpts & { f0?: number; f1?: number; decay?: number; click?: number; sweep?: number } = {}) {
  const vel = o.vel ?? 1;
  const decay = o.decay ?? 0.42;
  const out = panned(ctx, dest, o.pan);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  const f0 = o.f0 ?? 140;
  const f1 = o.f1 ?? 46;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f1, t + (o.sweep ?? 0.07));
  osc.frequency.exponentialRampToValueAtTime(f1 * 0.92, t + decay);
  const g = ctx.createGain();
  g.gain.setValueAtTime(EPS, t);
  g.gain.linearRampToValueAtTime(vel, t + 0.002);
  g.gain.exponentialRampToValueAtTime(vel * 0.5, t + Math.min(0.09, decay * 0.3));
  g.gain.exponentialRampToValueAtTime(EPS, t + decay);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + decay + 0.03);
  const click = o.click ?? 0.4;
  if (click > 0) {
    const n = noiseSrc(ctx, 'white', t, 0.012);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 3200;
    f.Q.value = 0.8;
    n.connect(f).connect(perc(ctx, out, t, vel * click * 0.5, 0.001, 0.008));
  }
}

export function snare(ctx: Ctx, dest: AudioNode, t: number, o: HitOpts & { tone?: number; decay?: number; bright?: number; body?: number } = {}) {
  const vel = o.vel ?? 1;
  const decay = o.decay ?? 0.17;
  const out = panned(ctx, dest, o.pan);
  const tone = o.tone ?? 185;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(tone * 1.35, t);
  osc.frequency.exponentialRampToValueAtTime(tone, t + 0.03);
  osc.connect(perc(ctx, out, t, vel * 0.55 * (o.body ?? 1), 0.001, 0.09));
  osc.start(t);
  osc.stop(t + 0.14);
  const n = noiseSrc(ctx, 'white', t, decay + 0.02);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 900;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = o.bright ?? 7000;
  n.connect(hp).connect(lp).connect(perc(ctx, out, t, vel * 0.5, 0.001, decay));
}

export function clap(ctx: Ctx, dest: AudioNode, t: number, o: HitOpts & { decay?: number } = {}) {
  const vel = o.vel ?? 1;
  const out = panned(ctx, dest, o.pan);
  const n = noiseSrc(ctx, 'white', t, 0.3);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1250;
  bp.Q.value = 1.1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(EPS, t);
  // three hand slaps then the room tail
  [0, 0.012, 0.025].forEach((d) => {
    g.gain.setValueAtTime(vel * 0.7, t + d);
    g.gain.exponentialRampToValueAtTime(vel * 0.08, t + d + 0.009);
  });
  g.gain.setValueAtTime(vel * 0.45, t + 0.036);
  g.gain.exponentialRampToValueAtTime(EPS, t + 0.036 + (o.decay ?? 0.16));
  n.connect(bp).connect(g).connect(out);
}

export function hat(ctx: Ctx, dest: AudioNode, t: number, o: HitOpts & { decay?: number; hp?: number; open?: boolean } = {}) {
  const vel = o.vel ?? 1;
  const decay = o.decay ?? (o.open ? 0.32 : 0.045);
  const out = panned(ctx, dest, o.pan);
  const n = noiseSrc(ctx, 'white', t, decay + 0.02);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = o.hp ?? 7200;
  const pk = ctx.createBiquadFilter();
  pk.type = 'peaking';
  pk.frequency.value = 10500;
  pk.gain.value = 6;
  n.connect(hp).connect(pk).connect(perc(ctx, out, t, vel * 0.32, 0.001, decay));
}

export function shaker(ctx: Ctx, dest: AudioNode, t: number, o: HitOpts & { decay?: number } = {}) {
  const vel = o.vel ?? 1;
  const out = panned(ctx, dest, o.pan);
  const n = noiseSrc(ctx, 'white', t, 0.12);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 6200;
  bp.Q.value = 0.9;
  n.connect(bp).connect(perc(ctx, out, t, vel * 0.22, 0.012, o.decay ?? 0.055));
}

/** Low hand-drum (kendang-ish "dhe"/"dut") — pitched membrane thump. */
export function tom(ctx: Ctx, dest: AudioNode, t: number, o: HitOpts & { f?: number; decay?: number } = {}) {
  const vel = o.vel ?? 1;
  const f = o.f ?? 160;
  const out = panned(ctx, dest, o.pan);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(f * 1.6, t);
  osc.frequency.exponentialRampToValueAtTime(f, t + 0.03);
  osc.frequency.exponentialRampToValueAtTime(f * 0.86, t + (o.decay ?? 0.3));
  osc.connect(perc(ctx, out, t, vel * 0.7, 0.002, o.decay ?? 0.3));
  osc.start(t);
  osc.stop(t + (o.decay ?? 0.3) + 0.05);
  const n = noiseSrc(ctx, 'white', t, 0.02);
  const lp = ctx.createBiquadFilter();
  lp.type = 'bandpass';
  lp.frequency.value = 1400;
  n.connect(lp).connect(perc(ctx, out, t, vel * 0.18, 0.001, 0.015));
}

/* ------------------------------------------------------- tuned percussion */
/** Gamelan-inspired metallophone (saron/bonang-ish): inharmonic partials,
 *  a padded mallet and the "ombak" — the slow beating between a pair of
 *  instruments deliberately tuned a few Hz apart. */
export function bell(ctx: Ctx, dest: AudioNode, t: number, f: number, o: HitOpts & { decay?: number; ombak?: number; bright?: number } = {}) {
  const vel = o.vel ?? 1;
  const decay = o.decay ?? 2.2;
  const out = panned(ctx, dest, o.pan);
  const bright = o.bright ?? 1;
  const partials: [number, number, number][] = [
    [1, 1, decay],
    [2.76, 0.32 * bright, decay * 0.32],
    [5.4, 0.1 * bright, decay * 0.12],
  ];
  for (const [r, a, d] of partials) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f * r;
    osc.connect(perc(ctx, out, t, vel * a * 0.26, 0.003, d));
    osc.start(t);
    osc.stop(t + d + 0.1);
  }
  const om = o.ombak ?? 5;
  if (om) {
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f + om;
    o2.connect(perc(ctx, out, t, vel * 0.17, 0.004, decay * 0.9));
    o2.start(t);
    o2.stop(t + decay + 0.1);
  }
  const n = noiseSrc(ctx, 'white', t, 0.015);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = Math.min(9000, f * 4);
  bp.Q.value = 2;
  n.connect(bp).connect(perc(ctx, out, t, vel * 0.08, 0.001, 0.01));
}

/** Gong ageng / kempul: low, long, with a slow beat and a soft padded thump. */
export function gong(ctx: Ctx, dest: AudioNode, t: number, f: number, o: HitOpts & { decay?: number } = {}) {
  const vel = o.vel ?? 1;
  const decay = o.decay ?? 7;
  const out = panned(ctx, dest, o.pan);
  const parts: [number, number, number, number][] = [
    // ratio, amp, decay factor, attack
    [1, 1, 1, 0.03],
    [1.012, 0.7, 0.9, 0.05],
    [2.01, 0.28, 0.55, 0.02],
    [2.93, 0.12, 0.3, 0.01],
    [4.16, 0.05, 0.16, 0.005],
  ];
  for (const [r, a, d, at] of parts) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f * r * 1.01, t);
    osc.frequency.exponentialRampToValueAtTime(f * r, t + 0.4);
    osc.connect(perc(ctx, out, t, vel * a * 0.3, at, decay * d));
    osc.start(t);
    osc.stop(t + decay * d + 0.1);
  }
  const n = noiseSrc(ctx, 'white', t, 0.07);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 260;
  n.connect(lp).connect(perc(ctx, out, t, vel * 0.25, 0.004, 0.06));
}

/* ----------------------------------------------------------------- tonal */
/** FM electric piano (Rhodes-ish): sine carrier + 1:1 modulator whose index
 *  decays (the bark), plus a short 14:1 "tine" ping. */
export function ep(ctx: Ctx, dest: AudioNode, t: number, f: number, dur: number, o: HitOpts = {}) {
  const vel = o.vel ?? 0.8;
  const out = panned(ctx, dest, o.pan);
  const car = ctx.createOscillator();
  car.type = 'sine';
  car.frequency.value = f;
  const mod = ctx.createOscillator();
  mod.type = 'sine';
  mod.frequency.value = f;
  const mg = ctx.createGain();
  const idx = f * (0.6 + vel * 1.1);
  mg.gain.setValueAtTime(idx, t);
  mg.gain.setTargetAtTime(f * 0.12, t + 0.005, 0.25);
  mod.connect(mg).connect(car.frequency);
  const g = ctx.createGain();
  const peak = 0.16 * vel;
  g.gain.setValueAtTime(EPS, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.004);
  g.gain.setTargetAtTime(peak * 0.42, t + 0.01, 0.35);
  g.gain.setTargetAtTime(EPS, t + dur, 0.09);
  car.connect(g).connect(out);
  const end = t + dur + 0.55;
  car.start(t);
  mod.start(t);
  car.stop(end);
  mod.stop(end);
  // tine
  const tine = ctx.createOscillator();
  tine.type = 'sine';
  tine.frequency.value = Math.min(f * 7, 9000);
  tine.connect(perc(ctx, out, t, peak * 0.12 * vel, 0.001, 0.08));
  tine.start(t);
  tine.stop(t + 0.12);
}

/** Round bass: sine fundamental + a little 2nd harmonic for small speakers. */
export function bass(ctx: Ctx, dest: AudioNode, t: number, f: number, dur: number, o: HitOpts & { harm?: number; glide?: number } = {}) {
  const vel = o.vel ?? 0.9;
  const out = panned(ctx, dest, o.pan);
  const g = ctx.createGain();
  const peak = 0.42 * vel;
  g.gain.setValueAtTime(EPS, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.012);
  g.gain.setTargetAtTime(peak * 0.7, t + 0.02, 0.18);
  g.gain.setTargetAtTime(EPS, t + dur, 0.05);
  g.connect(out);
  const end = t + dur + 0.3;
  const a = ctx.createOscillator();
  a.type = 'sine';
  if (o.glide) {
    a.frequency.setValueAtTime(o.glide, t);
    a.frequency.exponentialRampToValueAtTime(f, t + 0.06);
  } else a.frequency.value = f;
  a.connect(g);
  a.start(t);
  a.stop(end);
  const h = o.harm ?? 0.22;
  if (h > 0) {
    const b = ctx.createOscillator();
    b.type = 'triangle';
    b.frequency.value = f * 2;
    const bg = ctx.createGain();
    bg.gain.value = h;
    b.connect(bg).connect(g);
    b.start(t);
    b.stop(end);
  }
}

/** Detuned two-oscillator pad voice (route into a filtered pad bus). */
export function padVoice(ctx: Ctx, dest: AudioNode, t: number, f: number, dur: number, o: HitOpts & { attack?: number; release?: number; detune?: number; type?: OscillatorType } = {}) {
  const vel = o.vel ?? 0.7;
  const out = panned(ctx, dest, o.pan);
  const attack = o.attack ?? 1.6;
  const release = o.release ?? 2.4;
  const g = ctx.createGain();
  const peak = 0.07 * vel;
  g.gain.setValueAtTime(EPS, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + Math.max(attack, dur));
  g.gain.setTargetAtTime(EPS, t + Math.max(attack, dur), release / 5);
  g.connect(out);
  const end = t + Math.max(attack, dur) + release + 0.1;
  const dt = o.detune ?? 8;
  for (const d of [-dt, dt]) {
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sawtooth';
    osc.frequency.value = f;
    osc.detune.value = d;
    osc.connect(g);
    osc.start(t);
    osc.stop(end);
  }
}

/** Soft pluck: triangle + sine octave with a quick decay. */
export function pluck(ctx: Ctx, dest: AudioNode, t: number, f: number, o: HitOpts & { decay?: number; type?: OscillatorType; oct?: number } = {}) {
  const vel = o.vel ?? 0.7;
  const out = panned(ctx, dest, o.pan);
  const decay = o.decay ?? 0.7;
  const a = ctx.createOscillator();
  a.type = o.type ?? 'triangle';
  a.frequency.value = f;
  a.connect(perc(ctx, out, t, vel * 0.14, 0.003, decay));
  a.start(t);
  a.stop(t + decay + 0.05);
  const oct = o.oct ?? 0.35;
  if (oct > 0) {
    const b = ctx.createOscillator();
    b.type = 'sine';
    b.frequency.value = f * 2;
    b.connect(perc(ctx, out, t, vel * 0.14 * oct, 0.002, decay * 0.4));
    b.start(t);
    b.stop(t + decay * 0.4 + 0.05);
  }
}

/** Soft lead (flute/muted horn-ish): sine+triangle, slow attack, delayed vibrato. */
export function lead(ctx: Ctx, dest: AudioNode, t: number, f: number, dur: number, o: HitOpts & { vib?: number } = {}) {
  const vel = o.vel ?? 0.7;
  const out = panned(ctx, dest, o.pan);
  const g = ctx.createGain();
  const peak = 0.09 * vel;
  g.gain.setValueAtTime(EPS, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.035);
  g.gain.setTargetAtTime(peak * 0.75, t + 0.05, 0.2);
  g.gain.setTargetAtTime(EPS, t + dur, 0.08);
  g.connect(out);
  const end = t + dur + 0.45;
  const v = o.vib ?? 0.004;
  for (const [type, mul, amp] of [
    ['sine', 1, 1],
    ['triangle', 2, 0.18],
  ] as [OscillatorType, number, number][]) {
    const osc = ctx.createOscillator();
    osc.type = type;
    const base = f * mul;
    osc.frequency.setValueAtTime(base, t);
    // delayed vibrato as automation (no LFO node to leak)
    if (dur > 0.35 && v > 0) {
      let k = 0;
      for (let x = t + 0.22; x < t + dur; x += 0.09) {
        osc.frequency.linearRampToValueAtTime(base * (1 + (k++ % 2 ? -v : v)), x);
      }
    }
    const ag = ctx.createGain();
    ag.gain.value = amp;
    osc.connect(ag).connect(g);
    osc.start(t);
    osc.stop(end);
  }
}

/** Filtered chord stab (deep house): saws through a per-stab envelope filter. */
export function stab(ctx: Ctx, dest: AudioNode, t: number, freqs: number[], dur: number, o: HitOpts & { cutoff?: number; env?: number; q?: number } = {}) {
  const vel = o.vel ?? 0.8;
  const out = panned(ctx, dest, o.pan);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  const cut = o.cutoff ?? 1200;
  lp.Q.value = o.q ?? 3;
  lp.frequency.setValueAtTime(cut * (o.env ?? 2.4), t);
  lp.frequency.exponentialRampToValueAtTime(cut, t + 0.12);
  lp.frequency.exponentialRampToValueAtTime(Math.max(120, cut * 0.6), t + dur + 0.2);
  const g = ctx.createGain();
  const peak = (0.12 * vel) / Math.sqrt(freqs.length);
  g.gain.setValueAtTime(EPS, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.004);
  g.gain.setTargetAtTime(peak * 0.6, t + 0.01, 0.12);
  g.gain.setTargetAtTime(EPS, t + dur, 0.05);
  lp.connect(g).connect(out);
  const end = t + dur + 0.3;
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    osc.detune.value = (i % 2 ? 1 : -1) * 6;
    osc.connect(lp);
    osc.start(t);
    osc.stop(end);
  });
}

/* ----------------------------------------------------------------- chip */
/** NES-style pulse note with an optional delayed vibrato and a short decay. */
export function chipPulse(ctx: Ctx, dest: AudioNode, t: number, f: number, dur: number, o: HitOpts & { duty?: number; vib?: boolean; decay?: number } = {}) {
  const vel = o.vel ?? 0.8;
  const out = panned(ctx, dest, o.pan);
  const osc = ctx.createOscillator();
  osc.setPeriodicWave(pulseWave(ctx, o.duty ?? 0.25));
  osc.frequency.setValueAtTime(f, t);
  if (o.vib && dur > 0.3) {
    let k = 0;
    for (let x = t + 0.16; x < t + dur; x += 0.065) osc.frequency.setValueAtTime(f * (k++ % 2 ? 0.994 : 1.006), x);
  }
  const g = ctx.createGain();
  const peak = 0.075 * vel;
  g.gain.setValueAtTime(EPS, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.003);
  g.gain.setTargetAtTime(peak * 0.62, t + 0.01, o.decay ?? 0.18);
  g.gain.setValueAtTime(peak * 0.5, t + dur - 0.012);
  g.gain.linearRampToValueAtTime(EPS, t + dur);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Fast arpeggio as one oscillator with stepped frequency automation. */
export function chipArp(ctx: Ctx, dest: AudioNode, t: number, freqs: number[], rate: number, dur: number, o: HitOpts & { duty?: number } = {}) {
  const vel = o.vel ?? 0.6;
  const out = panned(ctx, dest, o.pan);
  const osc = ctx.createOscillator();
  osc.setPeriodicWave(pulseWave(ctx, o.duty ?? 0.125));
  let i = 0;
  for (let x = t; x < t + dur; x += rate) osc.frequency.setValueAtTime(freqs[i++ % freqs.length], x);
  const g = ctx.createGain();
  const peak = 0.05 * vel;
  g.gain.setValueAtTime(EPS, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.004);
  g.gain.setValueAtTime(peak, t + dur - 0.01);
  g.gain.linearRampToValueAtTime(EPS, t + dur);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Triangle-channel bass line for one bar: one oscillator, gated notes. */
export function chipBass(ctx: Ctx, dest: AudioNode, notes: { t: number; f: number; dur: number }[], o: HitOpts = {}) {
  if (!notes.length) return;
  const vel = o.vel ?? 1;
  const osc = ctx.createOscillator();
  osc.setPeriodicWave(nesTriangle(ctx));
  const g = ctx.createGain();
  g.gain.value = 0;
  const t0 = notes[0].t;
  let end = t0;
  for (const n of notes) {
    osc.frequency.setValueAtTime(n.f, n.t);
    g.gain.setValueAtTime(0, n.t);
    g.gain.linearRampToValueAtTime(0.2 * vel, n.t + 0.003);
    g.gain.setValueAtTime(0.2 * vel, n.t + n.dur - 0.008);
    g.gain.linearRampToValueAtTime(0, n.t + n.dur);
    end = Math.max(end, n.t + n.dur);
  }
  osc.connect(g).connect(panned(ctx, dest, o.pan));
  osc.start(t0);
  osc.stop(end + 0.02);
}

/** NES noise channel hit (long = hiss/snare, short = metallic hat). */
export function chipNoise(ctx: Ctx, dest: AudioNode, t: number, o: HitOpts & { mode?: 'long' | 'short'; rate?: number; decay?: number } = {}) {
  const vel = o.vel ?? 1;
  const out = panned(ctx, dest, o.pan);
  const s = ctx.createBufferSource();
  s.buffer = buffer(ctx, o.mode === 'short' ? 'nesShort' : 'nesLong');
  s.loop = true;
  s.playbackRate.value = o.rate ?? 1;
  const decay = o.decay ?? 0.1;
  s.connect(perc(ctx, out, t, vel * 0.16, 0.001, decay));
  s.start(t, Math.random() * 0.1);
  s.stop(t + decay + 0.03);
}

/** Triangle "thump" kick used by chip tracks. */
export function chipKick(ctx: Ctx, dest: AudioNode, t: number, o: HitOpts = {}) {
  const vel = o.vel ?? 1;
  const osc = ctx.createOscillator();
  osc.setPeriodicWave(nesTriangle(ctx));
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(48, t + 0.09);
  osc.connect(perc(ctx, dest, t, vel * 0.42, 0.001, 0.13));
  osc.start(t);
  osc.stop(t + 0.16);
  chipNoise(ctx, dest, t, { vel: vel * 0.5, decay: 0.025, rate: 0.5 });
}

/* ---------------------------------------------------------------- fx */
/** Filtered noise riser / swell into a downbeat. */
export function riser(ctx: Ctx, dest: AudioNode, t: number, dur: number, o: HitOpts & { from?: number; to?: number } = {}) {
  const vel = o.vel ?? 0.6;
  const n = noiseSrc(ctx, 'white', t, dur + 0.05);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(o.from ?? 400, t);
  bp.frequency.exponentialRampToValueAtTime(o.to ?? 6000, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(EPS, t);
  g.gain.exponentialRampToValueAtTime(0.09 * vel, t + dur * 0.96);
  g.gain.linearRampToValueAtTime(EPS, t + dur + 0.04);
  n.connect(bp).connect(g).connect(panned(ctx, dest, o.pan));
}

/** A procedural stereo plate (for offline renders and per-player sends). */
export function impulse(ctx: Ctx, seconds: number, decay: number) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}
