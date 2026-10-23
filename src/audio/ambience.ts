/* ==========================================================================
   Room ambience — a very quiet bed that makes the studio feel inhabited:
     • fluorescent tubes: 50 Hz mains (Indonesia) ballast hum + harmonics
     • HVAC: soft filtered air with a slow "breath"
     • Bekasi outside, by WIB hour: traffic rumble, a far motorbike now
       and then, the odd distant horn, birds in the morning, crickets and a
       tokek (gecko) at night
     • rain that follows the live weather (drizzle / rain / storm) with
       occasional distant thunder
   Contract: start() after the door opens, setWeather(kind, isDay),
   setFocus(bool) ducks slightly on close-ups. Voices are pure functions of
   (ctx, dest, t) so they can be rendered offline for QA.
   ========================================================================== */
import { audio } from './engine';
import { buffer, type Ctx } from './instruments';
import { hourIn, roomWeather, useWeather, type WeatherKind } from '@/lib/weather';

const EPS = 0.0001;

/* ----------------------------------------------------------- voices */
function loopSrc(ctx: Ctx, kind: Parameters<typeof buffer>[1], t: number) {
  const s = ctx.createBufferSource();
  s.buffer = buffer(ctx, kind);
  s.loop = true;
  s.start(t, Math.random() * s.buffer.duration);
  return s;
}

function biquad(ctx: Ctx, type: BiquadFilterType, freq: number, q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

/** 50 Hz ballast hum: strong 100 Hz (2× mains), weaker 50/150/200/300 Hz. */
function humWave(ctx: Ctx) {
  const real = new Float32Array(12);
  const imag = new Float32Array(12);
  const amps = [0, 0.32, 1, 0.16, 0.42, 0.06, 0.2, 0.04, 0.1, 0.02, 0.05, 0.02];
  amps.forEach((a, i) => (imag[i] = a));
  return ctx.createPeriodicWave(real, imag);
}

/** A distant motorbike passing (≈5 s): buzzy engine, doppler, pan sweep. */
export function motorbike(ctx: Ctx, dest: AudioNode, t: number, o: { gain?: number; dir?: 1 | -1 } = {}) {
  const dur = 4.2 + Math.random() * 2.2;
  const f = 62 + Math.random() * 40;
  const dir = o.dir ?? (Math.random() < 0.5 ? 1 : -1);
  const pan = ctx.createStereoPanner();
  pan.pan.setValueAtTime(-0.85 * dir, t);
  pan.pan.linearRampToValueAtTime(0.85 * dir, t + dur);
  const lp = biquad(ctx, 'lowpass', 500, 1.2);
  lp.frequency.setValueAtTime(420, t);
  lp.frequency.linearRampToValueAtTime(1400, t + dur * 0.5);
  lp.frequency.linearRampToValueAtTime(380, t + dur);
  const g = ctx.createGain();
  const peak = o.gain ?? 0.05;
  g.gain.setValueAtTime(EPS, t);
  g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.5);
  g.gain.exponentialRampToValueAtTime(EPS, t + dur);
  lp.connect(g).connect(pan).connect(dest);
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  const sq = ctx.createOscillator();
  sq.type = 'square';
  // throttle wobble + doppler (higher approaching, lower leaving)
  const pts: [number, number][] = [[0, 1.05]];
  for (let x = 0.3; x < dur * 0.5; x += 0.35 + Math.random() * 0.3) pts.push([x, 1.04 + Math.random() * 0.05]);
  pts.push([dur * 0.47, 1.06], [dur * 0.56, 0.93], [dur, 0.9]);
  for (const [o2, mul] of [[osc, 1], [sq, 0.5]] as [OscillatorNode, number][]) {
    o2.frequency.setValueAtTime(f * pts[0][1] * mul, t);
    for (const [x, v] of pts.slice(1)) o2.frequency.linearRampToValueAtTime(f * v * mul, t + x);
  }
  const sg = ctx.createGain();
  sg.gain.value = 0.35;
  sq.connect(sg).connect(lp);
  osc.connect(lp);
  const n = ctx.createBufferSource();
  n.buffer = buffer(ctx, 'white');
  n.loop = true;
  const nb = biquad(ctx, 'bandpass', 320, 1.5);
  const ng = ctx.createGain();
  ng.gain.value = 0.25;
  n.connect(nb).connect(ng).connect(lp);
  for (const s of [osc, sq, n]) {
    s.start(t);
    s.stop(t + dur + 0.05);
  }
}

/** A far-away two-tone car horn ("tin-tin"). */
export function horn(ctx: Ctx, dest: AudioNode, t: number, gain = 0.018) {
  const lp = biquad(ctx, 'lowpass', 1100, 0.8);
  const pan = ctx.createStereoPanner();
  pan.pan.value = Math.random() * 1.6 - 0.8;
  lp.connect(pan).connect(dest);
  const taps = Math.random() < 0.5 ? 1 : 2;
  for (let k = 0; k < taps; k++) {
    const at = t + k * 0.24;
    const len = 0.12 + Math.random() * 0.14;
    for (const f of [415, 520]) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = f * (0.97 + Math.random() * 0.06);
      const g = ctx.createGain();
      g.gain.setValueAtTime(EPS, at);
      g.gain.linearRampToValueAtTime(gain, at + 0.015);
      g.gain.setValueAtTime(gain, at + len);
      g.gain.linearRampToValueAtTime(EPS, at + len + 0.03);
      o.connect(g).connect(lp);
      o.start(at);
      o.stop(at + len + 0.05);
    }
  }
}

/** Morning birds: sparrow chirps or a bulbul's liquid whistle. */
export function bird(ctx: Ctx, dest: AudioNode, t: number, gain = 0.02) {
  const pan = ctx.createStereoPanner();
  pan.pan.value = Math.random() * 1.6 - 0.8;
  const hp = biquad(ctx, 'highpass', 1800);
  hp.connect(pan).connect(dest);
  const chirp = (at: number, f0: number, f1: number, f2: number, len: number, a: number) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, at);
    o.frequency.exponentialRampToValueAtTime(f1, at + len * 0.4);
    o.frequency.exponentialRampToValueAtTime(f2, at + len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(EPS, at);
    g.gain.linearRampToValueAtTime(a, at + len * 0.2);
    g.gain.exponentialRampToValueAtTime(EPS, at + len);
    o.connect(g).connect(hp);
    o.start(at);
    o.stop(at + len + 0.02);
  };
  if (Math.random() < 0.6) {
    // sparrow: quick chirps
    const n = 2 + Math.floor(Math.random() * 4);
    for (let k = 0; k < n; k++) {
      const base = 3400 + Math.random() * 1600;
      chirp(t + k * (0.11 + Math.random() * 0.07), base, base * 1.35, base * 0.9, 0.06 + Math.random() * 0.04, gain * (0.6 + Math.random() * 0.4));
    }
  } else {
    // bulbul: 3–4 note whistled phrase with glides
    const notes = [2200, 2600, 2950, 2450, 3300];
    let at = t;
    const n = 3 + Math.floor(Math.random() * 2);
    for (let k = 0; k < n; k++) {
      const a = notes[Math.floor(Math.random() * notes.length)];
      const b = notes[Math.floor(Math.random() * notes.length)];
      const len = 0.12 + Math.random() * 0.14;
      chirp(at, a, (a + b) / 2, b, len, gain);
      at += len + 0.03;
    }
  }
}

/** Tokek gecko: a throaty "to-KEK", repeated, slowing down. */
export function tokek(ctx: Ctx, dest: AudioNode, t: number, gain = 0.03) {
  const pan = ctx.createStereoPanner();
  pan.pan.value = Math.random() < 0.5 ? -0.6 : 0.6;
  const bp = biquad(ctx, 'bandpass', 900, 1.4);
  bp.connect(pan).connect(dest);
  const reps = 3 + Math.floor(Math.random() * 4);
  let at = t;
  for (let k = 0; k < reps; k++) {
    const fade = 1 - k * 0.12;
    // "to"
    const o1 = ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.setValueAtTime(560, at);
    o1.frequency.exponentialRampToValueAtTime(430, at + 0.09);
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(EPS, at);
    g1.gain.linearRampToValueAtTime(gain * 0.7 * fade, at + 0.012);
    g1.gain.exponentialRampToValueAtTime(EPS, at + 0.1);
    o1.connect(g1).connect(bp);
    o1.start(at);
    o1.stop(at + 0.12);
    // "KEK"
    const k2 = at + 0.17;
    const o2 = ctx.createOscillator();
    o2.type = 'square';
    o2.frequency.setValueAtTime(820, k2);
    o2.frequency.exponentialRampToValueAtTime(690, k2 + 0.12);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(EPS, k2);
    g2.gain.linearRampToValueAtTime(gain * fade, k2 + 0.008);
    g2.gain.exponentialRampToValueAtTime(EPS, k2 + 0.14);
    o2.connect(g2).connect(bp);
    o2.start(k2);
    o2.stop(k2 + 0.16);
    at += 0.75 + k * 0.08;
  }
}

/** Distant thunder: rolling brown-noise rumble, sometimes with a crack. */
export function thunder(ctx: Ctx, dest: AudioNode, t: number, o: { gain?: number; near?: boolean } = {}) {
  const near = o.near ?? Math.random() < 0.3;
  const peak = o.gain ?? (near ? 0.5 : 0.32);
  const dur = 5 + Math.random() * 4;
  const pan = ctx.createStereoPanner();
  pan.pan.value = Math.random() * 1.2 - 0.6;
  pan.connect(dest);
  const s = ctx.createBufferSource();
  s.buffer = buffer(ctx, 'brown');
  s.loop = true;
  const lp = biquad(ctx, 'lowpass', near ? 900 : 420, 0.5);
  lp.frequency.setValueAtTime(near ? 1100 : 480, t);
  lp.frequency.exponentialRampToValueAtTime(110, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(EPS, t);
  // a few rolling swells
  let at = t + (near ? 0.04 : 0.3);
  g.gain.exponentialRampToValueAtTime(peak, at);
  const rolls = 3 + Math.floor(Math.random() * 3);
  for (let k = 0; k < rolls; k++) {
    at += 0.4 + Math.random() * 0.9;
    g.gain.exponentialRampToValueAtTime(peak * (0.25 + Math.random() * 0.25), at);
    at += 0.2 + Math.random() * 0.5;
    g.gain.exponentialRampToValueAtTime(peak * (0.5 + Math.random() * 0.45) * (1 - k / (rolls + 1)), at);
  }
  g.gain.exponentialRampToValueAtTime(EPS, Math.max(at + 0.5, t + dur));
  s.connect(lp).connect(g).connect(pan);
  s.start(t, Math.random());
  s.stop(Math.max(at + 0.6, t + dur + 0.1));
  if (near) {
    const c = ctx.createBufferSource();
    c.buffer = buffer(ctx, 'white');
    const hp = biquad(ctx, 'bandpass', 2200, 0.6);
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(EPS, t);
    cg.gain.linearRampToValueAtTime(peak * 0.25, t + 0.01);
    cg.gain.exponentialRampToValueAtTime(EPS, t + 0.35);
    c.connect(hp).connect(cg).connect(pan);
    c.start(t);
    c.stop(t + 0.4);
  }
}

/** A single drop ticking on the window / AC unit. */
function drop(ctx: Ctx, dest: AudioNode, t: number, gain: number) {
  const s = ctx.createBufferSource();
  s.buffer = buffer(ctx, 'white');
  const bp = biquad(ctx, 'bandpass', 2500 + Math.random() * 3000, 6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(EPS, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.001);
  g.gain.exponentialRampToValueAtTime(EPS, t + 0.03);
  const pan = ctx.createStereoPanner();
  pan.pan.value = Math.random() * 1.6 - 0.8;
  s.connect(bp).connect(g).connect(pan).connect(dest);
  s.start(t, Math.random());
  s.stop(t + 0.05);
}

/* ------------------------------------------------------- the bed */
type RainKind = 'none' | 'drizzle' | 'rain' | 'storm';
const RAIN: Record<RainKind, { hiss: number; body: number; lp: number; drops: number; thunderEvery: [number, number] | null }> = {
  none: { hiss: 0, body: 0, lp: 3000, drops: 0, thunderEvery: null },
  drizzle: { hiss: 0.16, body: 0, lp: 3600, drops: 0.7, thunderEvery: null },
  rain: { hiss: 0.34, body: 0.14, lp: 6000, drops: 2.4, thunderEvery: [110, 240] },
  storm: { hiss: 0.42, body: 0.3, lp: 7800, drops: 4, thunderEvery: [22, 60] },
};

const rainKind = (k: WeatherKind): RainKind => (k === 'drizzle' || k === 'rain' || k === 'storm' ? k : 'none');

/** Traffic level by WIB hour (0..1). */
function trafficAt(h: number) {
  if (h >= 6 && h < 9.5) return 1;
  if (h >= 16 && h < 20) return 1;
  if (h >= 9.5 && h < 16) return 0.78;
  if (h >= 20 && h < 23) return 0.6;
  return 0.32;
}

class Ambience {
  started = false;
  private out: GainNode | null = null;
  private wet: GainNode | null = null;
  private city: GainNode | null = null;
  private rainHiss: { g: GainNode; lp: BiquadFilterNode } | null = null;
  private rainBody: GainNode | null = null;
  private crickets: { g: GainNode; nodes: AudioScheduledSourceNode[] } | null = null;
  private sources: AudioScheduledSourceNode[] = [];
  private kind: RainKind = 'none';
  private isDay = true;
  private focused = false;
  private timer: number | null = null;
  private nextBike = 0;
  private nextHorn = 0;
  private nextBird = 0;
  private nextTokek = 0;
  private nextThunder = Infinity;
  private dropAcc = 0;
  private lastTick = 0;
  private unsubWeather: (() => void) | null = null;

  start() {
    if (this.started) return;
    if (!audio.ctx) {
      // audio not unlocked yet — start as soon as it is
      const un = audio.subscribe(() => {
        if (audio.ctx) {
          un();
          this.start();
        }
      });
      return;
    }
    this.started = true;
    const ctx = audio.ctx;
    const t = ctx.currentTime + 0.05;
    this.out = ctx.createGain();
    this.out.gain.setValueAtTime(EPS, t);
    this.out.gain.linearRampToValueAtTime(1, t + 4);
    this.out.connect(audio.ambBus);
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.5;
    this.wet.connect(audio.reverbSend);

    // fluorescent hum (fades in with the lights)
    const hum = ctx.createOscillator();
    hum.setPeriodicWave(humWave(ctx));
    hum.frequency.value = 50;
    const humG = ctx.createGain();
    humG.gain.value = 0.016;
    const humLfo = ctx.createOscillator();
    humLfo.frequency.value = 0.07;
    const humLfoG = ctx.createGain();
    humLfoG.gain.value = 0.003;
    humLfo.connect(humLfoG).connect(humG.gain);
    hum.connect(humG).connect(this.out);
    // the tubes' faint high buzz
    const buzz = ctx.createOscillator();
    buzz.type = 'sawtooth';
    buzz.frequency.value = 100;
    const buzzHP = biquad(ctx, 'bandpass', 3200, 0.8);
    const buzzG = ctx.createGain();
    buzzG.gain.value = 0.0011;
    buzz.connect(buzzHP).connect(buzzG).connect(this.out);

    // HVAC air
    const air = loopSrc(ctx, 'pink', t);
    const airLP = biquad(ctx, 'lowpass', 650, 0.5);
    const airHP = biquad(ctx, 'highpass', 70);
    const airG = ctx.createGain();
    airG.gain.value = 0.1;
    const airLfo = ctx.createOscillator();
    airLfo.frequency.value = 0.035;
    const airLfoG = ctx.createGain();
    airLfoG.gain.value = 0.025;
    airLfo.connect(airLfoG).connect(airG.gain);
    air.connect(airHP).connect(airLP).connect(airG).connect(this.out);
    const whistle = biquad(ctx, 'bandpass', 1150, 4);
    const whG = ctx.createGain();
    whG.gain.value = 0.05;
    air.connect(whistle).connect(whG).connect(this.out);

    // city rumble (through the window)
    const city = loopSrc(ctx, 'brown', t);
    const cityLP = biquad(ctx, 'lowpass', 240, 0.5);
    const cityHP = biquad(ctx, 'highpass', 35);
    this.city = ctx.createGain();
    this.city.gain.value = 0.1 * trafficAt(hourIn());
    const cityLfo = ctx.createOscillator();
    cityLfo.frequency.value = 0.05;
    const cityLfoG = ctx.createGain();
    cityLfoG.gain.value = 0.03;
    cityLfo.connect(cityLfoG).connect(this.city.gain);
    city.connect(cityHP).connect(cityLP).connect(this.city).connect(this.out);

    for (const s of [hum, humLfo, buzz, airLfo, cityLfo]) s.start(t);
    this.sources.push(hum, humLfo, buzz, air, airLfo, city, cityLfo);

    const now = ctx.currentTime;
    this.nextBike = now + 8 + Math.random() * 15;
    this.nextHorn = now + 30 + Math.random() * 40;
    this.nextBird = now + 3 + Math.random() * 6;
    this.nextTokek = now + 40 + Math.random() * 60;
    this.lastTick = now;

    const w = roomWeather();
    this.setWeather(w.kind, w.isDay);
    this.unsubWeather = useWeather.subscribe(() => {
      const r = roomWeather();
      this.setWeather(r.kind, r.isDay);
    });
    this.timer = window.setInterval(() => this.tick(), 250);
  }

  setWeather(kind: WeatherKind, isDay: boolean) {
    this.isDay = isDay;
    const rk = rainKind(kind);
    if (!this.out || !audio.ctx) {
      this.kind = rk;
      return;
    }
    const ctx = audio.ctx;
    const t = ctx.currentTime;
    if (rk !== 'none' && !this.rainHiss) {
      const s = loopSrc(ctx, 'rain', t);
      const hp = biquad(ctx, 'highpass', 380);
      const lp = biquad(ctx, 'lowpass', 4000, 0.5);
      const g = ctx.createGain();
      g.gain.value = EPS;
      s.connect(hp).connect(lp).connect(g).connect(this.out);
      const b = loopSrc(ctx, 'brown', t);
      const blp = biquad(ctx, 'lowpass', 520, 0.6);
      const bg = ctx.createGain();
      bg.gain.value = EPS;
      b.connect(blp).connect(bg).connect(this.out);
      this.sources.push(s, b);
      this.rainHiss = { g, lp };
      this.rainBody = bg;
    }
    const spec = RAIN[rk];
    if (this.rainHiss && this.rainBody) {
      this.rainHiss.g.gain.setTargetAtTime(Math.max(EPS, spec.hiss), t, 1.5);
      this.rainHiss.lp.frequency.setTargetAtTime(spec.lp, t, 1.5);
      this.rainBody.gain.setTargetAtTime(Math.max(EPS, spec.body), t, 2);
    }
    if (rk !== this.kind) {
      this.nextThunder = spec.thunderEvery ? t + spec.thunderEvery[0] * (0.3 + Math.random() * 0.5) : Infinity;
    }
    this.kind = rk;
    this.updateNight();
  }

  setFocus(focused: boolean) {
    this.focused = focused;
    if (!this.out || !audio.ctx) return;
    this.out.gain.setTargetAtTime(focused ? 0.68 : 1, audio.ctx.currentTime, 0.35);
  }

  private updateNight() {
    const ctx = audio.ctx;
    if (!ctx || !this.out) return;
    const h = hourIn();
    const night = h >= 19 || h < 5.2;
    const t = ctx.currentTime;
    if (night && !this.crickets) {
      // crickets: 4.6 kHz carrier, 30 Hz chirp gate, slow on/off phrasing
      const c = ctx.createOscillator();
      c.frequency.value = 4600;
      // gate = (½ + ½·square29) × (½ + ½·squarePhrase)
      const am1 = ctx.createGain();
      am1.gain.value = 0.5;
      const am2 = ctx.createGain();
      am2.gain.value = 0.5;
      const lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = 29;
      const lfoG = ctx.createGain();
      lfoG.gain.value = 0.5;
      lfo.connect(lfoG).connect(am1.gain);
      const phr = ctx.createOscillator();
      phr.type = 'square';
      phr.frequency.value = 0.9;
      const phrG = ctx.createGain();
      phrG.gain.value = 0.5;
      phr.connect(phrG).connect(am2.gain);
      const g = ctx.createGain();
      g.gain.setValueAtTime(EPS, t);
      g.gain.linearRampToValueAtTime(0.0045, t + 6);
      c.connect(am1).connect(am2).connect(g).connect(this.out);
      for (const s of [c, lfo, phr]) s.start(t);
      this.crickets = { g, nodes: [c, lfo, phr] };
    } else if (!night && this.crickets) {
      const cr = this.crickets;
      cr.g.gain.setTargetAtTime(EPS, t, 1.5);
      cr.nodes.forEach((n) => n.stop(t + 8));
      this.crickets = null;
    }
    if (this.city) this.city.gain.setTargetAtTime(0.1 * trafficAt(h) * (this.kind === 'storm' ? 0.6 : 1), t, 4);
  }

  private tick() {
    const ctx = audio.ctx;
    if (!ctx || !this.out || ctx.state !== 'running' || audio.isMuted()) return;
    const now = ctx.currentTime;
    const dt = Math.min(1, now - this.lastTick);
    this.lastTick = now;
    const h = hourIn();
    const traffic = trafficAt(h);
    const out = this.out;

    if (now >= this.nextBike) {
      motorbike(ctx, out, now + 0.1, { gain: 0.055 + 0.045 * traffic * Math.random() });
      this.nextBike = now + (traffic > 0.5 ? 14 : 45) + Math.random() * (traffic > 0.5 ? 30 : 90);
    }
    if (now >= this.nextHorn) {
      if (h >= 6 && h < 22) horn(ctx, out, now + 0.1, 0.012 + Math.random() * 0.01);
      this.nextHorn = now + 50 + Math.random() * 90;
    }
    if (now >= this.nextBird) {
      const morning = h >= 5 && h < 9.5;
      const day = h >= 9.5 && h < 17.5;
      if ((morning || (day && Math.random() < 0.25)) && this.kind !== 'storm' && this.kind !== 'rain') bird(ctx, out, now + 0.1, morning ? 0.09 : 0.05);
      this.nextBird = now + (morning ? 5 : 25) + Math.random() * (morning ? 12 : 40);
    }
    if (now >= this.nextTokek) {
      if (h >= 19 || h < 4.5) tokek(ctx, out, now + 0.1, 0.06);
      this.nextTokek = now + 120 + Math.random() * 180;
    }
    if (now >= this.nextThunder) {
      const spec = RAIN[this.kind];
      if (spec.thunderEvery) {
        thunder(ctx, out, now + 0.1, { near: this.kind === 'storm' && Math.random() < 0.35 });
        if (this.wet) thunder(ctx, this.wet, now + 0.1, { gain: 0.08, near: false });
        this.nextThunder = now + spec.thunderEvery[0] + Math.random() * (spec.thunderEvery[1] - spec.thunderEvery[0]);
      } else this.nextThunder = Infinity;
    }
    const rate = RAIN[this.kind].drops;
    if (rate) {
      this.dropAcc += rate * dt;
      while (this.dropAcc >= 1) {
        this.dropAcc -= 1;
        drop(ctx, out, now + 0.05 + Math.random() * 0.25, 0.02 + Math.random() * 0.03);
      }
    }
    // re-evaluate the hour every ~minute
    if (Math.floor(now / 60) !== Math.floor((now - dt) / 60)) this.updateNight();
  }

  /** Tear everything down (not used by the site; handy for HMR/tests). */
  dispose() {
    if (this.timer) clearInterval(this.timer);
    this.unsubWeather?.();
    const t = audio.ctx?.currentTime ?? 0;
    this.sources.forEach((s) => {
      try {
        s.stop(t + 0.1);
      } catch {
        /* noop */
      }
    });
    this.crickets?.nodes.forEach((n) => n.stop(t + 0.1));
    this.out?.disconnect();
    this.started = false;
    this.out = null;
    this.rainHiss = null;
    this.rainBody = null;
    this.crickets = null;
    this.sources = [];
  }
}

export const ambience = new Ambience();
