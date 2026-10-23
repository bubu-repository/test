/* Small helpers shared by Adelia OS apps (and the phone, Moci, the sea and her ID card). */
import { audio } from '@/audio/engine';
import { game } from '@/state/game';
import { useUI } from '@/state/ui';

/** per-profile "do this once" flags — reset with game().reset() (new sessionId) */
const key = (name: string) => `adelia.once.${name}.${game().sessionId}`;
export function hasOnce(name: string) {
  try {
    return localStorage.getItem(key(name)) === '1';
  } catch {
    return false;
  }
}
/** returns true the first time it is called for this profile */
export function once(name: string) {
  if (hasOnce(name)) return false;
  try {
    localStorage.setItem(key(name), '1');
  } catch {}
  return true;
}

function noiseBurst(t: number, dur: number, freq: number, q: number, peak: number, out: AudioNode) {
  const ctx = audio.ctx!;
  const src = ctx.createBufferSource();
  src.buffer = audio.noise;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 1.5);
  src.stop(t + dur + 0.02);
}

/** paper being crumpled: a flurry of crackly band-passed noise grains */
export function crumple() {
  if (!audio.ready) return;
  const t0 = audio.ctx!.currentTime + 0.01;
  for (let i = 0; i < 34; i++) {
    const t = t0 + Math.pow(Math.random(), 0.8) * 0.75;
    noiseBurst(t, 0.015 + Math.random() * 0.05, 1800 + Math.random() * 5200, 1.5 + Math.random() * 3, 0.08 + Math.random() * 0.22, audio.sfxBus);
  }
  // the final toss into the bin
  noiseBurst(t0 + 0.95, 0.12, 700, 1.2, 0.3, audio.sfxBus);
}

/** CRT power-down: descending whine + thump */
export function powerDown() {
  if (!audio.ready) return;
  const ctx = audio.ctx!;
  const t = ctx.currentTime + 0.01;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(1400, t);
  o.frequency.exponentialRampToValueAtTime(60, t + 0.5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  o.connect(g).connect(audio.sfxBus);
  o.start(t);
  o.stop(t + 0.6);
  noiseBurst(t + 0.02, 0.18, 220, 0.7, 0.35, audio.sfxBus);
}

/** master volume preference (0..1) layered on top of the engine's mute */
const VOL_KEY = 'adelia.os.volume';
export function getVolume() {
  try {
    const v = Number(localStorage.getItem(VOL_KEY));
    return Number.isFinite(v) && localStorage.getItem(VOL_KEY) !== null ? Math.max(0, Math.min(1, v)) : 1;
  } catch {
    return 1;
  }
}
export function setVolume(v: number) {
  try {
    localStorage.setItem(VOL_KEY, String(v));
  } catch {}
  applyVolume(v);
}
export function applyVolume(v = getVolume()) {
  if (!audio.ctx || audio.isMuted()) return;
  audio.master.gain.setTargetAtTime(0.9 * v, audio.ctx.currentTime, 0.05);
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* ---- motion: the system setting, plus Adelia OS's own "Reduced" switch (Settings) ---- */
const MOTION_KEY = 'adelia.os.motion';
export type MotionPref = 'full' | 'reduced';
export const systemReducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export function getMotionPref(): MotionPref {
  try {
    return localStorage.getItem(MOTION_KEY) === 'reduced' ? 'reduced' : 'full';
  } catch {
    return 'full';
  }
}
export function setMotionPref(v: MotionPref) {
  try {
    localStorage.setItem(MOTION_KEY, v);
  } catch {}
}
/** true when either the system or the visitor asked for less motion */
export const calmMotion = () => systemReducedMotion() || getMotionPref() === 'reduced';

/** true when a click came from a finger (single tap opens things on touch screens) */
export function isTap(e: Event) {
  const pt = (e as PointerEvent).pointerType;
  if (pt) return pt === 'touch' || pt === 'pen';
  return typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
}

/** tell the room's monitor overlay that someone is typing (throttled) */
let lastKey = 0;
export function pingKey() {
  const now = Date.now();
  if (now - lastKey < 90) return;
  lastKey = now;
  useUI.getState().setFlag('osKey', now);
}
