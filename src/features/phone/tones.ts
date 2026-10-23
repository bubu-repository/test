/* Telephone line tones, synthesised on the engine's sfx bus. */
import { audio } from '@/audio/engine';

const noop = () => {};

/** continuous dial tone (350 + 440 Hz). Returns a stopper. */
export function dialTone(): () => void {
  if (!audio.ready) return noop;
  const ctx = audio.ctx!;
  const t = ctx.currentTime;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.045, t + 0.06);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  g.connect(lp).connect(audio.sfxBus);
  const oscs = [350, 440].map((f) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(g);
    o.start(t);
    return o;
  });
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    const n = ctx.currentTime;
    g.gain.cancelScheduledValues(n);
    g.gain.setTargetAtTime(0.0001, n, 0.02);
    oscs.forEach((o) => o.stop(n + 0.15));
  };
}

/** "special information tone" — the three rising beeps before "not in service" */
export function sitTone() {
  if (!audio.ready) return;
  const ctx = audio.ctx!;
  const t0 = ctx.currentTime + 0.02;
  [913.8, 1370.6, 1776.7].forEach((f, i) => {
    const t = t0 + i * 0.34;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
    g.gain.setValueAtTime(0.06, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.33);
    o.connect(g).connect(audio.sfxBus);
    o.start(t);
    o.stop(t + 0.36);
  });
}

/** line click when the call connects / ends */
export function lineClick() {
  if (!audio.ready) return;
  const ctx = audio.ctx!;
  const t = ctx.currentTime + 0.005;
  const src = ctx.createBufferSource();
  src.buffer = audio.noise;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1200;
  f.Q.value = 2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  src.connect(f).connect(g).connect(audio.sfxBus);
  src.start(t, Math.random());
  src.stop(t + 0.06);
}
