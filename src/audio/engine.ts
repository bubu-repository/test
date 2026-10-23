/* ==========================================================================
   The room's sound engine — Web Audio, zero samples.
   Graph:  [sfx]──┐
           [ui]───┼──► master ─► glue compressor ─► limiter ─► destination
           [amb]──┤                                   └► analyser
           [music]┘
   Every sound in the site is synthesised (see sfx.ts, music.ts, ambience.ts).
   ========================================================================== */
import { RECIPES, type SfxName } from './sfx';

export type { SfxName };

class Engine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfxBus!: GainNode;
  uiBus!: GainNode;
  ambBus!: GainNode;
  musicBus!: GainNode;
  /** reverb send shared by sfx + instruments */
  reverbSend!: GainNode;
  analyser!: AnalyserNode;
  noise!: AudioBuffer;
  private muted = false;
  private listeners = new Set<() => void>();

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** Must be called from a user gesture (the Enter button). */
  async unlock() {
    if (!this.ctx) this.build();
    if (this.ctx!.state !== 'running') await this.ctx!.resume().catch(() => {});
    this.emit();
  }

  private build() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC({ latencyHint: 'interactive' });
    this.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 3;
    comp.attack.value = 0.008;
    comp.release.value = 0.2;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -2;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.08;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.8;

    this.master.connect(comp).connect(limiter).connect(ctx.destination);
    limiter.connect(this.analyser);

    const bus = (v: number) => {
      const g = ctx.createGain();
      g.gain.value = v;
      g.connect(this.master);
      return g;
    };
    this.sfxBus = bus(0.8);
    this.uiBus = bus(0.55);
    this.ambBus = bus(0.35);
    this.musicBus = bus(0.55);

    // shared plate-ish reverb (procedural impulse response)
    const conv = ctx.createConvolver();
    conv.buffer = this.impulse(2.2, 2.8);
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    this.reverbSend = ctx.createGain();
    this.reverbSend.connect(conv).connect(wet).connect(this.master);

    // white noise buffer reused by recipes
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  impulse(seconds: number, decay: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(m ? 0 : 0.9, t, 0.08);
    }
    this.emit();
  }

  isMuted() {
    return this.muted;
  }

  /** Duck the music bus (e.g. while a video/voice plays). */
  duck(amount = 0.35, seconds = 0.4) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(0.55 * amount, t, seconds / 3);
  }
  unduck(seconds = 0.8) {
    if (!this.ctx) return;
    this.musicBus.gain.setTargetAtTime(0.55, this.ctx.currentTime, seconds / 3);
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    this.listeners.forEach((f) => f());
  }
}

export const audio = new Engine();

export interface SfxOptions {
  /** semitone offset */
  pitch?: number;
  gain?: number;
  /** -1..1 */
  pan?: number;
  bus?: 'sfx' | 'ui';
}

let lastHover = 0;

/** Fire-and-forget sound effect. Safe to call before unlock (no-op). */
export function sfx(name: SfxName, opts: SfxOptions = {}) {
  if (!audio.ready) return;
  if (name === 'hover') {
    const now = performance.now();
    if (now - lastHover < 70) return;
    lastHover = now;
  }
  const recipe = RECIPES[name];
  if (!recipe) return;
  const ctx = audio.ctx!;
  const out = ctx.createGain();
  out.gain.value = opts.gain ?? 1;
  let node: AudioNode = out;
  if (opts.pan) {
    const p = ctx.createStereoPanner();
    p.pan.value = opts.pan;
    out.connect(p);
    node = p;
  }
  const bus = opts.bus === 'ui' || recipe.bus === 'ui' ? audio.uiBus : audio.sfxBus;
  node.connect(bus);
  if (recipe.reverb) {
    const send = ctx.createGain();
    send.gain.value = recipe.reverb;
    out.connect(send).connect(audio.reverbSend);
  }
  try {
    recipe.play(ctx, out, ctx.currentTime + 0.005, opts.pitch ?? 0);
  } catch {
    /* never let audio break interaction */
  }
}
