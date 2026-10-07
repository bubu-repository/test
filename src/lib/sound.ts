"use client";

/**
 * Jelly sound effects, synthesised live with the Web Audio API (no audio files).
 * Silent unless <html data-sound="on">. The AudioContext is created on first use, which is
 * always inside a user gesture because sound starts off.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
/** When the last sound started (performance.now()), so the global layer never doubles a component's own sound. */
let lastAt = -Infinity;

function enabled() {
  return typeof document !== "undefined" && document.documentElement.getAttribute("data-sound") === "on";
}

function audio(): AudioContext | null {
  if (!enabled()) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** The shared audio graph (context + master volume), or null while sound is off. For the music player. */
export function audioGraph(): { ctx: AudioContext; master: GainNode } | null {
  const ac = audio();
  return ac && master ? { ctx: ac, master } : null;
}

type ToneOptions = {
  type?: OscillatorType;
  from: number;
  to?: number;
  duration: number;
  gain?: number;
  delay?: number;
  attack?: number;
};

function tone({ type = "sine", from, to = from, duration, gain = 0.5, delay = 0, attack = 0.005 }: ToneOptions) {
  const ac = audio();
  if (!ac || !master) return;
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + duration);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(env).connect(master);
  osc.start(t);
  osc.stop(t + duration + 0.02);
  lastAt = performance.now();
}

function noise(duration: number, gain = 0.2, filterFrom = 4000, filterTo = 600, type: BiquadFilterType = "bandpass") {
  const ac = audio();
  if (!ac || !master) return;
  lastAt = performance.now();
  const t = ac.currentTime;
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * duration), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(filterFrom, t);
  filter.frequency.exponentialRampToValueAtTime(filterTo, t + duration);
  const env = ac.createGain();
  env.gain.value = gain;
  src.connect(filter).connect(env).connect(master);
  src.start(t);
}

export const sfx = {
  /** When the last sound started; see SoundHost. */
  lastAt: () => lastAt,
  /** Soft hover tick. */
  tick: () => tone({ type: "triangle", from: 1800, to: 1400, duration: 0.03, gain: 0.08 }),
  /** Hovering anything you can press: a faint high tick. */
  hover: () => tone({ type: "sine", from: 2400, to: 2100, duration: 0.025, gain: 0.04 }),
  /** Pressing anything that has no sound of its own: a small glass tap. */
  tap: () => {
    tone({ type: "sine", from: 1250, to: 1520, duration: 0.06, gain: 0.14 });
    tone({ type: "sine", from: 2900, duration: 0.04, gain: 0.035, delay: 0.005 });
  },
  /** A drop in the sea. */
  plop: () => {
    tone({ type: "sine", from: 1100, to: 260, duration: 0.14, gain: 0.32 });
    noise(0.22, 0.08, 1800, 400, "lowpass");
  },
  /** Changing page: a small wave washing in. */
  wave: () => noise(0.7, 0.07, 1400, 260, "lowpass"),
  /** Button press: a jelly pop. */
  pop: () => tone({ type: "sine", from: 520, to: 880, duration: 0.09, gain: 0.35 }),
  /** Boop the mascot: a wobbly drop. */
  boop: () => {
    tone({ type: "sine", from: 900, to: 220, duration: 0.22, gain: 0.45 });
    tone({ type: "triangle", from: 300, to: 520, duration: 0.18, gain: 0.15, delay: 0.08 });
  },
  /** Panel open. */
  whoosh: () => noise(0.18, 0.12, 2400, 500),
  /** Typing in the terminal. */
  key: () => tone({ type: "square", from: 2400 + Math.random() * 400, duration: 0.012, gain: 0.03 }),
  /** Success: three rising notes. */
  success: () => {
    [523.25, 659.25, 783.99].forEach((f, i) => tone({ type: "triangle", from: f, duration: 0.16, gain: 0.25, delay: i * 0.07 }));
  },
  /** Sticker unlocked: a sparkly arpeggio. */
  sparkle: () => {
    [880, 1174.66, 1567.98, 2093].forEach((f, i) => tone({ type: "sine", from: f, duration: 0.22, gain: 0.18, delay: i * 0.05 }));
  },
  /** Error / bump. */
  bump: () => tone({ type: "sawtooth", from: 180, to: 90, duration: 0.18, gain: 0.12 }),
  /** Foil pack tearing. */
  tear: () => noise(0.35, 0.3, 6000, 1200),
  /** Coin / token eaten. */
  coin: () => {
    tone({ type: "square", from: 988, duration: 0.06, gain: 0.08 });
    tone({ type: "square", from: 1319, duration: 0.12, gain: 0.08, delay: 0.06 });
  },
  /** Gumball knob click. */
  click: () => tone({ type: "square", from: 300, to: 120, duration: 0.04, gain: 0.12 }),
  /** Keys on a ring: a few small metal clinks. */
  jingle: () => {
    [3150, 4280, 3720, 5100].forEach((f, i) => tone({ type: "triangle", from: f + Math.random() * 180, to: f * 0.97, duration: 0.07, gain: 0.05, delay: i * 0.045 + Math.random() * 0.02 }));
  },
};

type Ambience = { stop: () => void };
let sea: Ambience | null = null;
const seaListeners = new Set<() => void>();

/**
 * The sea, as an ambient loop: brown noise through a low-pass filter, with a slow swell on both the
 * filter and the volume so it breathes like waves on a beach. Starts only inside a user gesture.
 */
export const ambience = {
  isOn: () => sea !== null,
  subscribe(listener: () => void) {
    seaListeners.add(listener);
    return () => {
      seaListeners.delete(listener);
    };
  },
  start() {
    const ac = audio();
    if (!ac || !master || sea) return;
    const t = ac.currentTime;
    const length = ac.sampleRate * 4;
    const buffer = ac.createBuffer(2, length, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        data[i] = last * 3.2;
      }
    }
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const lowpass = ac.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 520;
    lowpass.Q.value = 0.5;
    const swell = ac.createGain();
    swell.gain.value = 0.55;
    const out = ac.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.6, t + 2.5);
    // One wave about every eight seconds: the same slow oscillator opens the filter and the volume.
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.12;
    const toGain = ac.createGain();
    toGain.gain.value = 0.4;
    const toFilter = ac.createGain();
    toFilter.gain.value = 360;
    lfo.connect(toGain).connect(swell.gain);
    lfo.connect(toFilter).connect(lowpass.frequency);
    src.connect(lowpass).connect(swell).connect(out).connect(master);
    src.start(t);
    lfo.start(t);
    sea = {
      stop: () => {
        const now = ac.currentTime;
        out.gain.cancelScheduledValues(now);
        out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), now);
        out.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
        src.stop(now + 1);
        lfo.stop(now + 1);
      },
    };
    seaListeners.forEach((l) => l());
  },
  stop() {
    if (!sea) return;
    sea.stop();
    sea = null;
    seaListeners.forEach((l) => l());
  },
};
