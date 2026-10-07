"use client";

import { audioGraph } from "@/lib/sound";
import { steps, trackSeconds, type Track, type Voice } from "./tracks";

/**
 * A tiny sequencer for the MP3 player: pad chords, a bass line, a melody (and an optional bell
 * counter-line), soft drums and an echo, scheduled a little ahead on the Web Audio clock. It plays
 * through the site's master volume, so muting the site mutes the music. Real files (a track's
 * `src`, or a song the visitor drops on the player) play through the same bus, so the visualizer
 * sees them too.
 */

type Graph = { ctx: AudioContext; bus: GainNode; send: GainNode; analyser: AnalyserNode };

let graph: Graph | null = null;
let volume = 0.7;

function ensure(): Graph | null {
  const g = audioGraph();
  if (!g) return null;
  if (graph?.ctx === g.ctx) return graph;
  const { ctx, master } = g;
  const bus = ctx.createGain();
  bus.gain.value = volume;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;
  // A soft echo, so the synths sound like they're in a room.
  const send = ctx.createGain();
  send.gain.value = 0.22;
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.33;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.3;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 2400;
  send.connect(delay).connect(tone).connect(feedback).connect(delay);
  tone.connect(bus);
  bus.connect(analyser).connect(master);
  graph = { ctx, bus, send, analyser };
  return graph;
}

const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

/** Every oscillator and source still sounding, so pause can silence them at once. */
const live = new Set<{ stop: (at: number) => void }>();

function envelope(ctx: AudioContext, t: number, peak: number, attack: number, decay: number) {
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(peak, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return env;
}

function osc(g: Graph, type: OscillatorType, freq: number, t: number, end: number, out: AudioNode, detune = 0) {
  const o = g.ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.detune.value = detune;
  o.connect(out);
  o.start(t);
  o.stop(end);
  const handle = { stop: (at: number) => o.stop(at) };
  live.add(handle);
  o.onended = () => live.delete(handle);
  return o;
}

function note(g: Graph, voice: Voice, m: number, t: number, step: number) {
  const f = hz(m);
  const { ctx } = g;
  const shapes: Record<Voice, () => void> = {
    lofi: () => {
      const env = envelope(ctx, t, 0.16, 0.012, 0.7);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1700;
      env.connect(lp);
      lp.connect(g.bus);
      lp.connect(g.send);
      osc(g, "triangle", f, t, t + 0.8, env, -6);
      osc(g, "sine", f * 2, t, t + 0.5, env, 4);
    },
    flute: () => {
      const env = envelope(ctx, t, 0.14, 0.05, step * 2.4);
      env.connect(g.bus);
      env.connect(g.send);
      const o = osc(g, "sine", f, t, t + step * 2.6, env);
      const vib = ctx.createOscillator();
      const depth = ctx.createGain();
      vib.frequency.value = 5.2;
      depth.gain.value = 7;
      vib.connect(depth).connect(o.detune);
      vib.start(t);
      vib.stop(t + step * 2.6);
    },
    piano: () => {
      const env = envelope(ctx, t, 0.11, 0.004, 1.1);
      env.connect(g.bus);
      env.connect(g.send);
      osc(g, "triangle", f, t, t + 1.2, env);
      osc(g, "sine", f * 2, t, t + 0.6, env);
    },
    bell: () => {
      const env = envelope(ctx, t, 0.12, 0.004, 1.8);
      env.connect(g.bus);
      env.connect(g.send);
      osc(g, "sine", f, t, t + 1.9, env);
      osc(g, "sine", f * 2.76, t, t + 0.9, env);
    },
    chip: () => {
      const env = envelope(ctx, t, 0.07, 0.004, step * 1.6);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2600;
      env.connect(lp).connect(g.bus);
      osc(g, "square", f, t, t + step * 1.8, env);
    },
  };
  shapes[voice]();
}

function pad(g: Graph, chord: (number | null)[], t: number, length: number) {
  const env = g.ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(0.035, t + 0.35);
  env.gain.setValueAtTime(0.035, t + length - 0.25);
  env.gain.linearRampToValueAtTime(0.0001, t + length);
  const lp = g.ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  env.connect(lp).connect(g.bus);
  for (const m of chord) {
    if (m === null) continue;
    osc(g, "sawtooth", hz(m), t, t + length + 0.05, env, -5);
    osc(g, "triangle", hz(m), t, t + length + 0.05, env, 5);
  }
}

function bass(g: Graph, m: number, t: number, length: number) {
  const env = envelope(g.ctx, t, 0.2, 0.01, length);
  env.connect(g.bus);
  osc(g, "sine", hz(m - 12), t, t + length + 0.05, env);
  osc(g, "triangle", hz(m - 12), t, t + length + 0.05, env);
}

function hat(g: Graph, t: number, gain = 0.035) {
  const { ctx } = g;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.05), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 7000;
  const env = ctx.createGain();
  env.gain.value = gain;
  src.connect(hp).connect(env).connect(g.bus);
  src.start(t);
}

function kick(g: Graph, t: number, gain = 0.32) {
  const env = envelope(g.ctx, t, gain, 0.003, 0.22);
  env.connect(g.bus);
  const o = osc(g, "sine", 130, t, t + 0.26, env);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
}

function snare(g: Graph, t: number) {
  hat(g, t, 0.06);
  const env = envelope(g.ctx, t, 0.08, 0.002, 0.12);
  env.connect(g.bus);
  osc(g, "triangle", 210, t, t + 0.14, env);
}

/** Waves under "Low Tide": brown noise breathing through a slow filter. */
function sea(g: Graph, t: number, length: number) {
  const { ctx } = g;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 480;
  const swell = ctx.createGain();
  swell.gain.value = 0.12;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.12;
  const depth = ctx.createGain();
  depth.gain.value = 0.09;
  lfo.connect(depth).connect(swell.gain);
  src.connect(lp).connect(swell).connect(g.bus);
  src.start(t);
  lfo.start(t);
  src.stop(t + length);
  lfo.stop(t + length);
  const handle = {
    stop: (at: number) => {
      src.stop(at);
      lfo.stop(at);
    },
  };
  live.add(handle);
  src.onended = () => live.delete(handle);
}

/* ---------- The sequencer ---------- */

type Playing = {
  track: Track;
  melody: (number | null)[];
  counter: (number | null)[] | null;
  chords: (number | null)[][];
  stepDur: number;
  total: number;
  step: number;
  next: number;
  startedAt: number;
  offset: number;
};

let now: Playing | null = null;
let timer = 0;
let element: HTMLAudioElement | null = null;
let elementSource: MediaElementAudioSourceNode | null = null;
let fileMode = false;
let onEnd: (() => void) | null = null;

function schedule(g: Graph, p: Playing, step: number, t: number) {
  const bars = p.chords.length;
  const s = step % 16;
  const bar = Math.floor(step / 16) % bars;
  const barLength = p.stepDur * 16;
  if (s === 0) {
    pad(g, p.chords[bar], t, barLength);
    if (p.track.sea && step % (16 * bars) === 0) sea(g, t, barLength * bars + 0.5);
  }
  const root = p.chords[bar][0];
  if (root !== null && (s === 0 || s === 8 || (p.track.drums === "beat" && s % 4 === 2))) bass(g, root, t, p.stepDur * (p.track.drums === "beat" ? 1.6 : 3.5));
  const m = p.melody[(bar * 16 + s) % p.melody.length];
  if (m != null) note(g, p.track.voice, m, t, p.stepDur);
  const c = p.counter?.[(bar * 16 + s) % p.counter.length];
  if (c != null) note(g, "bell", c, t, p.stepDur);
  if (p.track.drums === "soft") {
    if (s === 0 || s === 8) kick(g, t, 0.18);
    if (s % 4 === 2) hat(g, t, 0.025);
  } else if (p.track.drums === "beat") {
    if (s % 4 === 0) kick(g, t);
    if (s === 4 || s === 12) snare(g, t);
    if (s % 2 === 1) hat(g, t);
  }
}

function tick() {
  const g = graph;
  const p = now;
  if (!g || !p) return;
  while (p.next < g.ctx.currentTime + 0.14) {
    if (p.step >= p.total) {
      window.clearInterval(timer);
      timer = 0;
      const wait = Math.max(0, (p.next - g.ctx.currentTime) * 1000);
      window.setTimeout(() => {
        if (now !== p) return;
        now = null;
        onEnd?.();
      }, wait + 300);
      return;
    }
    schedule(g, p, p.step, p.next);
    p.next += p.stepDur;
    p.step += 1;
  }
}

function silence() {
  const g = graph;
  window.clearInterval(timer);
  timer = 0;
  if (g) {
    const at = g.ctx.currentTime + 0.04;
    for (const h of live) {
      try {
        h.stop(at);
      } catch {
        // already stopped
      }
    }
    live.clear();
  }
  if (element) element.pause();
}

function connectElement(g: Graph) {
  if (!element) {
    element = new Audio();
    element.crossOrigin = "anonymous";
    element.addEventListener("ended", () => {
      if (!fileMode) return;
      fileMode = false;
      onEnd?.();
    });
  }
  if (!elementSource || elementSource.context !== g.ctx) {
    elementSource = g.ctx.createMediaElementSource(element);
    elementSource.connect(g.bus);
  }
  return element;
}

export const music = {
  /** Play a track from `from` seconds. Returns false if sound is off (the caller turns it on first). */
  play(track: Track, from = 0, ended?: () => void): boolean {
    const g = ensure();
    if (!g) return false;
    silence();
    now = null;
    fileMode = false;
    onEnd = ended ?? null;
    g.bus.gain.cancelScheduledValues(g.ctx.currentTime);
    g.bus.gain.setValueAtTime(volume, g.ctx.currentTime);
    if (track.src) {
      const el = connectElement(g);
      if (el.src !== new URL(track.src, location.href).href) el.src = track.src;
      el.currentTime = from;
      fileMode = true;
      void el.play();
      return true;
    }
    const stepDur = 60 / track.bpm / 4;
    const total = Math.round(trackSeconds(track) / stepDur);
    const step = Math.min(total - 1, Math.max(0, Math.round(from / stepDur)));
    const start = g.ctx.currentTime + 0.06;
    now = {
      track,
      melody: steps(track.melody),
      counter: track.counter ? steps(track.counter) : null,
      chords: track.chords.map((c) => c.map((n) => steps(n)[0])),
      stepDur,
      total,
      step,
      next: start,
      startedAt: start,
      offset: step * stepDur,
    };
    timer = window.setInterval(tick, 25);
    tick();
    return true;
  },
  /** Play a file the visitor dropped on the player (an object URL). */
  playFile(url: string, ended?: () => void): boolean {
    const g = ensure();
    if (!g) return false;
    silence();
    now = null;
    onEnd = ended ?? null;
    const el = connectElement(g);
    el.src = url;
    el.currentTime = 0;
    fileMode = true;
    void el.play();
    return true;
  },
  /** Stop, and return where it was (seconds), so it can resume there. */
  pause(): number {
    const at = music.position();
    silence();
    now = null;
    fileMode = false;
    return at;
  },
  position(): number {
    if (fileMode && element) return element.currentTime;
    const g = graph;
    if (!g || !now) return 0;
    return Math.max(0, now.offset + g.ctx.currentTime - now.startedAt);
  },
  /** Length of whatever is loaded: the synth track, or the audio file once it knows. */
  duration(track: Track | null): number {
    if (fileMode && element && Number.isFinite(element.duration)) return element.duration;
    return track ? trackSeconds(track) : 0;
  },
  isPlaying: () => now !== null || (fileMode && !!element && !element.paused),
  analyser: () => graph?.analyser ?? null,
  setVolume(v: number) {
    volume = Math.max(0, Math.min(1, v));
    const g = graph;
    if (g) g.bus.gain.setTargetAtTime(volume, g.ctx.currentTime, 0.03);
  },
  volume: () => volume,
  stop() {
    silence();
    now = null;
    fileMode = false;
  },
};
