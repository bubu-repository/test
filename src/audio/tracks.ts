/* ==========================================================================
   The four generative tracks on the baby-blue turntable in Adelia’s room.
   Each `create()` builds the track's buses once per playback and returns a
   step function that is called for every 16th note with the song position
   (section, bar, fills). Seeded randomness gives every play-through its own
   small variations. Titles live in lib/content.ts (TRACKS); the ids below
   ('studio-hours', 'jakarta-rain', …) are dside’s stable keys, shared with
   music/covers.ts, RecordsPanel, music/po30.ts and stage/director.ts.
   ========================================================================== */
import type { TrackId } from '@/lib/content';
import type { Player, StepInfo, TrackDef } from './player';
import {
  bass,
  bell,
  chipArp,
  chipBass,
  chipKick,
  chipNoise,
  chipPulse,
  clap,
  curve,
  ep,
  gong,
  hat,
  kick,
  lead,
  mtof,
  padVoice,
  pluck,
  riser,
  shaker,
  snare,
  stab,
  tom,
} from './instruments';

interface Chord {
  /** bass root (midi) */
  b: number;
  /** voicing (midi) */
  v: number[];
}

const at = <T,>(arr: readonly T[], i: number) => arr[((i % arr.length) + arr.length) % arr.length];

function setTo(param: AudioParam, v: number, t: number, tc = 0.6) {
  param.setTargetAtTime(v, t, tc);
}

/* ==========================================================================
   A1 · SOFT FOCUS — lo-fi hip-hop, 84 bpm
   ========================================================================== */
const SH_A: Chord[] = [
  { b: 38, v: [53, 57, 60, 64] }, // Dm9
  { b: 31, v: [53, 59, 64, 69] }, // G13
  { b: 36, v: [52, 55, 59, 62] }, // Cmaj9
  { b: 33, v: [55, 59, 61, 65] }, // A7(9,b13)
];
const SH_B: Chord[] = [
  { b: 41, v: [57, 60, 64, 67] }, // Fmaj9
  { b: 40, v: [55, 59, 62, 66] }, // Em9
  { b: 38, v: [53, 57, 60, 64] }, // Dm9
  { b: 31, v: [53, 60, 64, 69] }, // G13sus
];
// [step, length in steps, voices: 0 all / 1 top two]
const SH_COMP: [number, number, number][][] = [
  [[0, 7, 0], [7, 3, 1], [10, 6, 0]],
  [[0, 10, 0], [10, 6, 1]],
  [[0, 16, 0]],
  [[0, 5, 0], [6, 4, 1], [11, 5, 0]],
  [[2, 8, 0], [10, 2, 1], [12, 4, 0]],
];
// [step, interval | 99 = chromatic approach, length]
const SH_BASS: [number, number, number][][] = [
  [[0, 0, 6], [7, 0, 2], [10, 0, 3], [14, 99, 2]],
  [[0, 0, 8], [10, 7, 3], [13, 12, 2]],
  [[0, 0, 5], [6, 0, 2], [8, 12, 2], [10, 0, 4], [15, 99, 1]],
  [[0, 0, 3], [3, 0, 4], [10, 7, 2], [12, 0, 4]],
];
const SH_KICK = [
  [1, 0, 0, 0, 0, 0, 0, 0.45, 0, 0, 0.9, 0, 0, 0, 0, 0],
  [1, 0, 0, 0.55, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0, 0, 0, 0.75, 0, 0.9, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0, 0.45, 0, 0, 0, 1, 0, 0, 0, 0, 0.35],
];
const SH_PENTA = [60, 62, 64, 67, 69, 72, 74, 76, 79];

const softFocus: TrackDef = {
  id: 'studio-hours',
  bpm: 84,
  swing: 0.6,
  gain: 0.62,
  sections: [
    { kind: 'intro', bars: 4 },
    { kind: 'A', bars: 16 },
    { kind: 'B', bars: 16 },
    { kind: 'break', bars: 8 },
    { kind: 'A', bars: 16 },
    { kind: 'outro', bars: 4 },
  ],
  loopTo: 0,
  create(p: Player) {
    const ctx = p.ctx;
    // tape bus: wow (modulated delay) → warm saturation
    const tapeSat = ctx.createWaveShaper();
    tapeSat.curve = curve('soft');
    tapeSat.connect(p.out);
    const wow = ctx.createDelay(0.1);
    wow.delayTime.value = 0.014;
    wow.connect(tapeSat);
    p.lfo(0.42, 0.0011, wow.delayTime);
    p.lfo(5.7, 0.00006, wow.delayTime);
    const tape = p.bus(1, wow);

    const epPan = ctx.createStereoPanner();
    const epLP = p.filter('lowpass', 900, 0.5, epPan);
    epPan.connect(tape);
    p.lfo(0.21, 0.32, epPan.pan);
    const epBus = p.bus(1, epLP);
    p.send(0.22, epBus);

    const bassBus = p.bus(0.62, p.filter('lowpass', 420, 0.6, tape));
    const leadBus = p.bus(0.55, p.filter('lowpass', 2400, 0.5, tape));
    p.send(0.38, leadBus);

    const drumLP = p.filter('lowpass', 6200, 0.5, tapeSat);
    const drums = p.bus(0.42, drumLP);
    p.send(0.07, drums);

    const crackle = p.loop('crackle', 0.5, p.out, [{ type: 'highpass', freq: 400 }, { type: 'lowpass', freq: 7000 }]);

    let comp = SH_COMP[0];
    let bassPat = SH_BASS[0];
    let kickPat = SH_KICK[0];
    let melody: [number, number, number][] = [];
    let lastNote = 67;

    const prog = (i: StepInfo) => (i.sec.kind === 'B' ? SH_B : SH_A);
    const chordOf = (i: StepInfo, off = 0) => at(prog(i), i.bis + off);

    const makePhrase = (i: StepInfo) => {
      // a 2-bar answer phrase on the 8th grid, mostly stepwise in C pentatonic
      const out: [number, number, number][] = [];
      const count = 3 + Math.floor(p.r() * 3);
      const slots = [0, 2, 4, 6, 8, 10, 12, 16, 18, 20, 22, 24].filter(() => p.chance(0.62)).slice(0, count);
      let idx = SH_PENTA.indexOf(lastNote);
      if (idx < 0) idx = 3;
      slots.forEach((s, k) => {
        idx = Math.max(0, Math.min(SH_PENTA.length - 1, idx + p.pick([-2, -1, -1, 1, 1, 2, 0])));
        const nxt = slots[k + 1] ?? 30;
        out.push([s, SH_PENTA[idx], Math.min(nxt - s, 2 + Math.floor(p.r() * 4))]);
      });
      if (out.length) lastNote = out[out.length - 1][1];
      void i;
      return out;
    };

    return (i) => {
      const { t, s, sec } = i;
      const kind = sec.kind;
      const ch = chordOf(i);

      if (s === 0) {
        // per-bar choices + automation
        comp = kind === 'break' || kind === 'intro' || kind === 'outro' ? SH_COMP[2] : p.pick(kind === 'B' ? SH_COMP : SH_COMP.slice(0, 4));
        bassPat = p.pick(SH_BASS);
        if (i.bis % 2 === 0) kickPat = p.pick(SH_KICK);
        const lp =
          kind === 'intro' ? 1500 + (i.bis / 3) * 1100 : kind === 'A' ? 2500 : kind === 'B' ? 3100 : kind === 'break' ? (i.bis < 4 ? 1300 : 1800) : 1800;
        setTo(epLP.frequency, lp, t, 0.8);
        setTo(crackle.gain, kind === 'break' || kind === 'intro' ? 0.85 : 0.5, t, 1.2);
        if (kind === 'B' && i.bis % 2 === 0) melody = makePhrase(i);
        if (kind !== 'B') melody = [];
        if (kind === 'outro' && i.last) setTo(drums.gain, 0.0001, t, 0.6);
        else if (i.first) setTo(drums.gain, 0.42, t, 0.05);
      }

      /* ---- Rhodes */
      for (const [st, len, top] of comp) {
        if (st !== s) continue;
        const voices = top ? ch.v.slice(-2) : ch.v;
        const dur = len * p.stepDur;
        const v = kind === 'break' || kind === 'intro' || kind === 'outro' ? 0.85 : top ? 0.5 : 0.66;
        voices.forEach((m, k) => ep(ctx, epBus, t + k * 0.011 + p.jit(4), mtof(m), dur, { vel: p.vel(v, 0.12) }));
      }

      /* ---- bass */
      if (kind === 'A' || kind === 'B' || (kind === 'outro' && i.bis < 2)) {
        for (const [st, iv, len] of bassPat) {
          if (st !== s) continue;
          let m = ch.b + iv;
          if (iv === 99) {
            const nb = chordOf(i, 1).b;
            m = nb + (nb > ch.b ? -1 : 1);
          }
          bass(ctx, bassBus, t + p.jit(5), mtof(m), len * p.stepDur * 0.92, { vel: p.vel(0.85, 0.08) });
        }
      } else if (kind === 'break' && i.bis >= 2 && s === 0) {
        bass(ctx, bassBus, t, mtof(ch.b), p.barDur * 0.9, { vel: 0.6 });
      }

      /* ---- lead (B) */
      if (kind === 'B') {
        const pos = (i.bis % 2) * 16 + s;
        for (const [st, m, len] of melody) if (st === pos) lead(ctx, leadBus, t + p.jit(8), mtof(m), len * p.stepDur, { vel: p.vel(0.6, 0.15) });
      }

      /* ---- drums */
      const drumsOn = kind === 'A' || kind === 'B' || (kind === 'intro' && i.bis >= 2) || (kind === 'outro' && i.bis < 3) || kind === 'break';
      if (!drumsOn) return;
      const full = kind === 'A' || kind === 'B' || (kind === 'outro' && i.bis < 2);
      // hats (8ths + ghost 16ths)
      if (s % 2 === 0) {
        if (kind !== 'break' || s % 4 === 0) hat(ctx, drums, t + p.jit(6), { vel: p.vel(s % 4 === 0 ? 0.55 : 0.36, 0.2), hp: 6500, decay: 0.04, pan: 0.18 });
      } else if (full && p.chance(kind === 'B' ? 0.32 : 0.18)) {
        hat(ctx, drums, t + p.jit(6), { vel: p.vel(0.16, 0.3), hp: 7500, decay: 0.025, pan: 0.2 });
      }
      if (!full) {
        if (kind === 'intro' && i.last && s === 12) snare(ctx, drums, t, { vel: 0.3, bright: 4500 });
        if (kind === 'intro' && i.last && s === 14) snare(ctx, drums, t, { vel: 0.45, bright: 4500 });
        if (kind === 'break' && i.last) {
          if (s === 0) riser(ctx, p.out, t, p.barDur, { vel: 0.35, from: 300, to: 3200 });
          if (s >= 12) snare(ctx, drums, t, { vel: 0.18 + (s - 12) * 0.12, bright: 4200 });
        }
        return;
      }
      let kv = kickPat[s];
      if (i.fill8 && s >= 12) kv = s === 14 ? 0.7 : 0;
      if (kv) kick(ctx, drums, t + p.jit(4), { vel: p.vel(kv * 0.95, 0.06), f0: 120, f1: 47, decay: 0.38, click: 0.25 });
      if (s === 4 || s === 12) snare(ctx, drums, t + p.jit(7) + 0.006, { vel: p.vel(0.75, 0.08), tone: 190, bright: 5200 });
      else if (i.fill8 && s >= 13) snare(ctx, drums, t + p.jit(5), { vel: 0.22 + (s - 13) * 0.16, bright: 5000 });
      else if (i.fill4 && (s === 15 || s === 14) && p.chance(0.6)) snare(ctx, drums, t + p.jit(5), { vel: 0.2, bright: 4200 });
      else if ((s === 7 || s === 9) && p.chance(0.14)) snare(ctx, drums, t + p.jit(5), { vel: 0.14, bright: 3800 });
      if (i.fill8 && s === 14) hat(ctx, drums, t, { vel: 0.4, open: true, decay: 0.28, hp: 6000 });
    };
  },
};

/* ==========================================================================
   A2 · BEKASI RAIN — ambient, 72 bpm. Pads, plucks, rain on the window and a
   gamelan-inspired bell cycle in a pelog-flavoured mode (D Eb F A Bb, gently
   bent off equal temperament), punctuated by gong and kempul.
   ========================================================================== */
// Javanese cipher → cents above D (pelog-ish, softened so it sits with the pads)
const PELOG: Record<number, number> = { 1: 0, 2: 110, 3: 285, 5: 690, 6: 795 };
const pel = (deg: number, oct = 0) => 587.33 * Math.pow(2, (PELOG[deg] + 1200 * oct) / 1200);
const JR_A: (Chord & { avoid?: number[] })[] = [
  { b: 34, v: [50, 53, 57, 60] }, // Bbmaj9
  { b: 31, v: [46, 50, 53, 57] }, // Gm9
  { b: 39, v: [55, 58, 62, 69] }, // Ebmaj7#11
  { b: 38, v: [53, 57, 60, 67], avoid: [2] }, // Dm7(11)
];
const JR_B: (Chord & { avoid?: number[] })[] = [
  { b: 41, v: [57, 60, 62, 65] }, // F6
  { b: 39, v: [55, 58, 62, 65] }, // Ebmaj9
  { b: 38, v: [53, 57, 58, 62] }, // Bbmaj7/D
  { b: 31, v: [46, 50, 53, 57] }, // Gm9
];
// 16-beat cycles ending on the gong tone (1)
const BAL_SPARSE = [3, 2, 3, 5, 6, 5, 2, 1];
const BAL_FULL = [2, 3, 2, 1, 3, 5, 6, 5, 1, 6, 5, 3, 2, 3, 2, 1];

const bekasiRain: TrackDef = {
  id: 'jakarta-rain',
  bpm: 72,
  swing: 0.5,
  gain: 1.2,
  sections: [
    { kind: 'intro', bars: 4 },
    { kind: 'A', bars: 12 },
    { kind: 'B', bars: 12 },
    { kind: 'break', bars: 8 },
    { kind: 'A', bars: 12 },
    { kind: 'outro', bars: 4 },
  ],
  loopTo: 0,
  create(p: Player) {
    const ctx = p.ctx;
    const padHP = p.filter('highpass', 130, 0.5);
    const padLP = p.filter('lowpass', 1100, 0.6, padHP);
    p.lfo(0.045, 420, padLP.frequency);
    const pads = p.bus(0.8, padLP);
    p.send(0.55, pads);

    const bells = p.bus(0.7);
    p.send(0.6, bells);
    const echo = p.delay(p.beatDur * 1.5, 0.38, 2400, p.out);
    const plucks = p.bus(0.6);
    plucks.connect(echo);
    p.send(0.45, plucks);
    const low = p.bus(0.7, p.filter('lowpass', 300));
    const perc = p.bus(0.5, p.filter('lowpass', 5000));
    p.send(0.25, perc);

    const rain = p.loop('rain', 0.08, p.out, [{ type: 'highpass', freq: 500 }, { type: 'lowpass', freq: 6500 }]);
    const drops = p.bus(0.5);
    p.send(0.6, drops);

    let cycle = BAL_SPARSE.slice();

    const prog = (i: StepInfo) => (i.sec.kind === 'B' ? JR_B : JR_A);
    const chordOf = (i: StepInfo) => at(prog(i), Math.floor(i.bis / 2));

    const vary = (src: number[]) => {
      const out = src.slice();
      for (let k = 0; k < out.length - 1; k++) {
        if (p.chance(0.14)) {
          const opts = [1, 2, 3, 5, 6];
          const j = opts.indexOf(out[k]);
          out[k] = opts[Math.max(0, Math.min(opts.length - 1, j + (p.chance(0.5) ? 1 : -1)))];
        }
      }
      return out;
    };

    return (i) => {
      const { t, s, sec, bis } = i;
      const kind = sec.kind;
      const ch = chordOf(i);
      const beat = s / 4;

      if (s === 0) {
        setTo(rain.gain, kind === 'intro' || kind === 'break' ? 0.13 : kind === 'outro' ? 0.11 : 0.075, t, 2);
        setTo(padLP.frequency, kind === 'B' ? 1500 : kind === 'break' ? 800 : 1100, t, 2.5);
        // pads: a chord every two bars, overlapping release
        if (bis % 2 === 0 && !(kind === 'outro' && bis >= 2)) {
          const dur = p.barDur * 2;
          ch.v.forEach((m, k) => padVoice(ctx, pads, t + k * 0.05, mtof(m), dur, { vel: kind === 'intro' ? 0.6 : 0.75, attack: kind === 'intro' && bis === 0 ? 3.5 : 1.8, release: 3.2, pan: (k - 1.5) * 0.35, detune: 7 }));
          bass(ctx, low, t + 0.1, mtof(ch.b), dur * 0.95, { vel: kind === 'break' ? 0.4 : 0.55, harm: 0.05 });
        }
        if (bis % 4 === 0) cycle = vary(kind === 'B' ? BAL_FULL : BAL_SPARSE);
        // gong at the opening of intro/break/outro, kempul mid-phrase in B
        if (bis === 0 && (kind === 'intro' || kind === 'break' || kind === 'outro')) gong(ctx, p.out, t, 73.42, { vel: 0.8, decay: 8 });
      }

      /* ---- bells */
      const bellsOn = kind === 'A' || kind === 'B' || (kind === 'break' && bis >= 4) || (kind === 'intro' && bis >= 2);
      if (bellsOn && s % 4 === 0) {
        const beatInCycle = (bis % 4) * 4 + beat;
        let deg = 0;
        if (kind === 'B') deg = cycle[beatInCycle];
        else if (beatInCycle % 2 === 1) deg = cycle[(beatInCycle - 1) / 2];
        if (kind === 'break' || kind === 'intro') deg = beatInCycle % 4 === 3 ? cycle[Math.floor(beatInCycle / 2)] : 0;
        if (deg && ch.avoid?.includes(deg)) deg = deg === 2 ? 1 : 3;
        if (deg) {
          const finalBeat = beatInCycle === 15;
          bell(ctx, bells, t + p.jit(6), pel(deg), { vel: p.vel(finalBeat ? 0.8 : 0.62, 0.1), decay: 2.6, ombak: 5.5, pan: -0.15 });
          // cycle end → gong (every 8 bars) or kempul
          if (finalBeat && (kind === 'A' || kind === 'B')) {
            if (bis % 8 === 7) gong(ctx, p.out, t, 73.42, { vel: 0.7, decay: 7 });
            else tom(ctx, perc, t, { f: 110, vel: 0.4, decay: 0.9 });
          }
        }
      }
      // bonang-ish elaboration an octave up, on off-beats (B)
      if (kind === 'B' && s % 4 === 2 && p.chance(0.28)) {
        const opts = [1, 2, 3, 5, 6].filter((d) => !ch.avoid?.includes(d));
        bell(ctx, bells, t + p.jit(6), pel(p.pick(opts), 1), { vel: p.vel(0.32, 0.2), decay: 1.4, ombak: 7, bright: 0.6, pan: 0.35 });
      }

      /* ---- plucks */
      if ((kind === 'A' || kind === 'B') && s % 2 === 0 && p.chance(kind === 'B' ? 0.16 : 0.1)) {
        const m = p.pick(ch.v) + 12;
        pluck(ctx, plucks, t + p.jit(8), mtof(m), { vel: p.vel(0.55, 0.2), decay: 0.9, pan: p.r() * 1.4 - 0.7 });
      }

      /* ---- soft kendang pulse + shaker (B and the return of A) */
      if (kind === 'B' || (kind === 'A' && i.si >= 4)) {
        if (s === 0) tom(ctx, perc, t, { f: 82, vel: 0.38, decay: 0.5 });
        if (s === 10 && p.chance(0.7)) tom(ctx, perc, t + p.jit(6), { f: 96, vel: 0.22, decay: 0.35 });
        if (kind === 'B' && s % 2 === 0) shaker(ctx, perc, t + p.jit(5), { vel: p.vel(s % 4 === 2 ? 0.5 : 0.28, 0.2), pan: 0.3 });
      }

      /* ---- droplets on the sill */
      if (p.chance(kind === 'break' || kind === 'intro' ? 0.06 : 0.035)) {
        const f = 1800 + p.r() * 2600;
        pluck(ctx, drops, t + p.r() * p.stepDur, f, { vel: 0.12 + p.r() * 0.12, decay: 0.05, type: 'sine', oct: 0, pan: p.r() * 2 - 1 });
      }
    };
  },
};

/* ==========================================================================
   B1 · LAST TRAIN HOME — night-ride deep house, 96 bpm (the B-side)
   ========================================================================== */
const SN_A: Chord[] = [
  { b: 36, v: [51, 55, 58, 62] }, // Cm9
  { b: 32, v: [51, 55, 58, 60] }, // Abmaj9
  { b: 29, v: [51, 55, 56, 60] }, // Fm9
  { b: 31, v: [53, 55, 58, 62] }, // Gm7
];
const SN_B: Chord[] = [
  { b: 29, v: [51, 55, 56, 60] }, // Fm9
  { b: 31, v: [53, 55, 58, 62] }, // Gm7
  { b: 32, v: [51, 55, 58, 60] }, // Abmaj9
  { b: 34, v: [50, 53, 55, 58] }, // Bb6
];
const SN_STABS: [number, number][][] = [
  [[0, 3], [6, 2], [10, 3]],
  [[3, 2], [6, 2], [11, 3], [14, 2]],
  [[0, 6], [10, 4]],
  [[2, 2], [6, 3], [12, 3]],
];
const SN_BASS: [number, number, number][][] = [
  [[0, 0, 3], [6, 0, 2], [10, 12, 1], [11, 0, 2], [14, 7, 2]],
  [[2, 0, 2], [6, 0, 2], [10, 0, 2], [14, 12, 2]],
  [[0, 0, 2], [3, 0, 2], [6, 12, 1], [8, 0, 3], [14, 10, 2]],
];
const SN_PENTA = [60, 63, 65, 67, 70, 72, 75, 77, 79];

const lastTrainHome: TrackDef = {
  id: 'senopati-nights',
  bpm: 96,
  swing: 0.54,
  gain: 1,
  sections: [
    { kind: 'intro', bars: 8 },
    { kind: 'A', bars: 16 },
    { kind: 'B', bars: 16 },
    { kind: 'break', bars: 8 },
    { kind: 'A', bars: 16 },
    { kind: 'outro', bars: 8 },
  ],
  loopTo: 0,
  create(p: Player) {
    const ctx = p.ctx;
    const pump = p.bus(1);
    const stabs = p.bus(0.7, pump);
    const dly = p.delay(p.beatDur * 0.75, 0.36, 2000, pump);
    const dlySend = p.bus(0.32, dly);
    stabs.connect(dlySend);
    p.send(0.2, stabs);
    const sub = p.bus(0.7, pump);
    const padLP = p.filter('lowpass', 1400, 0.7, pump);
    const pads = p.bus(0.0001, padLP);
    p.send(0.4, pads);
    const leadBus = p.bus(0.55, pump);
    leadBus.connect(dlySend);
    p.send(0.35, leadBus);
    const drums = p.bus(0.55, p.filter('lowpass', 9000));
    p.send(0.06, drums);

    let stabPat = SN_STABS[0];
    let bassPat = SN_BASS[0];
    let motif: [number, number, number][] = [];
    let padOn = false;

    const prog = (i: StepInfo) => (i.sec.kind === 'B' ? SN_B : SN_A);
    const chordOf = (i: StepInfo) => at(prog(i), i.bis);

    const makeMotif = () => {
      const out: [number, number, number][] = [];
      let idx = 4 + Math.floor(p.r() * 3);
      const steps = [0, 3, 6, 8, 10, 14, 16, 19, 22, 24, 27].filter(() => p.chance(0.5));
      steps.slice(0, 6).forEach((st) => {
        idx = Math.max(0, Math.min(SN_PENTA.length - 1, idx + p.pick([-2, -1, 1, 2, 0])));
        out.push([st, SN_PENTA[idx], p.pick([1, 2, 2, 3])]);
      });
      return out;
    };

    return (i) => {
      const { t, s, sec, bis } = i;
      const kind = sec.kind;
      const ch = chordOf(i);

      if (s === 0) {
        if (bis % 2 === 0) stabPat = p.pick(SN_STABS);
        bassPat = p.pick(SN_BASS);
        if (bis % 4 === 0 && (kind === 'B' || kind === 'break')) motif = makeMotif();
        const wantPad = kind === 'B' || kind === 'break' || kind === 'intro' || (kind === 'A' && i.si >= 4 && bis >= 8) || (kind === 'outro' && bis < 6);
        if (wantPad !== padOn) {
          padOn = wantPad;
          setTo(pads.gain, wantPad ? (kind === 'break' || kind === 'intro' ? 1.1 : 0.7) : 0.0001, t, 1.5);
        }
        if (padOn && bis % 2 === 0) ch.v.forEach((m, k) => padVoice(ctx, pads, t, mtof(m + 12), p.barDur * 2, { vel: 0.8, attack: 1.2, release: 2, pan: (k - 1.5) * 0.4 }));
        if (kind === 'B' && bis === 0) setTo(padLP.frequency, 2200, t, 3);
        if (kind === 'break') setTo(padLP.frequency, 1100 + bis * 140, t, 1);
        if (kind === 'intro' && bis === 0) setTo(padLP.frequency, 1000, t, 0.1);
      }

      const kickOn = (kind === 'intro' && bis >= 2) || kind === 'A' || kind === 'B' || (kind === 'outro' && bis < 7);
      const groove = kind === 'A' || kind === 'B';

      /* ---- kick + sidechain pump */
      if (kickOn && s % 4 === 0) {
        kick(ctx, drums, t, { vel: 0.85, f0: 150, f1: 45, decay: 0.42, click: 0.3 });
        pump.gain.setValueAtTime(0.42, t);
        pump.gain.setTargetAtTime(1, t + 0.02, 0.085);
      }
      if (groove || (kind === 'outro' && bis < 4)) {
        if (s === 4 || s === 12) clap(ctx, drums, t + p.jit(4), { vel: p.vel(0.55, 0.08) });
        if (i.fill8 && (s === 14 || s === 15)) clap(ctx, drums, t, { vel: 0.3 + (s - 14) * 0.15 });
        if (s % 4 === 2) hat(ctx, drums, t + p.jit(3), { open: true, vel: p.vel(0.34, 0.1), decay: 0.16, hp: 7800, pan: -0.15 });
        else hat(ctx, drums, t + p.jit(3), { vel: p.vel(s % 2 ? 0.14 : 0.22, 0.15), hp: 9000, decay: 0.03, pan: 0.2 });
      }
      const shk = kind === 'outro' ? 1 - bis / 9 : 1;
      shaker(ctx, drums, t + p.jit(5), { vel: p.vel((s % 4 === 2 ? 0.36 : s % 2 ? 0.16 : 0.24) * shk, 0.2), pan: 0.35 });

      /* ---- sub bass */
      if ((kind === 'intro' && bis >= 2) || groove || (kind === 'outro' && bis < 6)) {
        for (const [st, iv, len] of bassPat) if (st === s) bass(ctx, sub, t, mtof(ch.b + iv), len * p.stepDur * 0.9, { vel: p.vel(0.82, 0.06), harm: 0.32 });
      } else if (kind === 'break') {
        if (s === 0 && bis % 2 === 0) bass(ctx, sub, t, mtof(ch.b + 12), p.barDur * 1.85, { vel: 0.55, harm: 0.45 });
        if (s % 2 === 0 && bis < sec.bars - 1) hat(ctx, drums, t + p.jit(3), { vel: p.vel(s % 4 === 2 ? 0.2 : 0.1, 0.2), hp: 9000, decay: 0.03, pan: 0.2 });
      }

      /* ---- stabs */
      if (kind === 'outro' && bis === 6 && s === 0) stab(ctx, stabs, t, ch.v.map(mtof), p.barDur * 1.6, { vel: 0.7, cutoff: 1100, q: 3 });
      const stabsOn = kind !== 'outro' || bis < 4;
      if (stabsOn) {
        const prog01 = kind === 'intro' ? 0.2 + bis / 16 : kind === 'break' ? 0.35 : kind === 'outro' ? 0.3 : kind === 'B' ? 1 : 0.65;
        const cutoff = (420 + prog01 * 1500) * (1 + 0.22 * Math.sin(i.n * 0.39));
        for (const [st, len] of stabPat) {
          if (st !== s) continue;
          if (kind === 'break' && p.chance(0.4)) continue;
          stab(ctx, stabs, t + p.jit(3), ch.v.map(mtof), len * p.stepDur, { vel: p.vel(0.72, 0.1), cutoff, q: 4 });
        }
      }

      /* ---- night-drive lead */
      if (kind === 'B' || kind === 'break') {
        const pos = (bis % 2) * 16 + s;
        for (const [st, m, len] of motif) if (st === pos) pluck(ctx, leadBus, t + p.jit(5), mtof(m), { vel: p.vel(0.6, 0.12), decay: 0.35 + len * 0.12, type: 'sine', oct: 0.5, pan: 0.1 });
      }

      /* ---- transitions */
      if (kind === 'break' && bis === sec.bars - 2 && s === 0) riser(ctx, p.out, t, p.barDur * 2, { vel: 0.5, from: 300, to: 7000 });
      if (kind === 'break' && i.last && s >= 8) clap(ctx, drums, t, { vel: 0.12 + (s - 8) * 0.06, decay: 0.08 });
    };
  },
};

/* ==========================================================================
   B2 · GACHA POP — chiptune, 128 bpm (pulse leads, arps, triangle bass,
   LFSR noise drums)
   ========================================================================== */
type Mel = [number, number, number][]; // [step, midi, len]
const AR_MEL_A: Mel[] = [
  [[0, 69, 2], [2, 72, 2], [4, 76, 3], [7, 74, 1], [8, 76, 2], [10, 79, 2], [12, 81, 4]],
  [[0, 79, 2], [2, 77, 2], [4, 76, 2], [6, 72, 2], [8, 77, 4], [12, 76, 2], [14, 74, 2]],
  [[0, 72, 3], [3, 76, 3], [6, 79, 2], [8, 84, 4], [12, 83, 2], [14, 79, 2]],
  [[0, 81, 2], [2, 79, 2], [4, 74, 4], [8, 79, 2], [10, 83, 2], [12, 86, 4]],
  [[0, 81, 3], [3, 79, 1], [4, 76, 4], [8, 72, 2], [10, 74, 2], [12, 76, 4]],
  [[0, 77, 2], [2, 76, 2], [4, 74, 2], [6, 72, 2], [8, 74, 4], [12, 69, 4]],
  [[0, 72, 2], [2, 74, 2], [4, 76, 2], [6, 79, 2], [8, 76, 2], [10, 79, 2], [12, 84, 4]],
  [[0, 83, 6], [6, 81, 2], [8, 79, 4], [12, 74, 2], [14, 71, 2]],
];
const AR_MEL_B: Mel[] = [
  [[0, 77, 1], [1, 77, 1], [3, 81, 2], [6, 84, 2], [8, 81, 2], [10, 77, 2], [12, 79, 4]],
  [[0, 79, 1], [1, 79, 1], [3, 83, 2], [6, 86, 2], [8, 83, 2], [10, 79, 2], [12, 81, 4]],
  [[0, 79, 2], [2, 76, 2], [4, 71, 2], [6, 76, 2], [8, 79, 3], [11, 83, 1], [12, 81, 4]],
  [[0, 81, 2], [2, 84, 2], [4, 88, 4], [8, 86, 2], [10, 84, 2], [12, 81, 4]],
  [[0, 77, 1], [1, 77, 1], [3, 81, 2], [6, 84, 2], [8, 81, 2], [10, 77, 2], [12, 79, 4]],
  [[0, 79, 1], [1, 79, 1], [3, 83, 2], [6, 86, 2], [8, 83, 2], [10, 79, 2], [12, 81, 4]],
  [[0, 83, 2], [2, 79, 2], [4, 76, 2], [6, 79, 2], [8, 83, 2], [10, 86, 2], [12, 88, 4]],
  [[0, 81, 8], [8, 76, 4], [12, 69, 4]],
];
// [root (bass), arp tones]
const AR_A: [number, number[]][] = [
  [45, [69, 72, 76, 81]],
  [41, [69, 72, 77, 81]],
  [48, [67, 72, 76, 79]],
  [43, [67, 71, 74, 79]],
];
const AR_B: [number, number[]][] = [
  [41, [65, 69, 72, 77]],
  [43, [67, 71, 74, 79]],
  [40, [64, 67, 71, 76]],
  [45, [69, 72, 76, 81]],
];
const AR_BRK: [number, number[]][] = [
  [38, [62, 65, 69, 74]],
  [40, [64, 67, 71, 76]],
  [41, [65, 69, 72, 77]],
  [43, [67, 71, 74, 79]],
];

const gachaPop: TrackDef = {
  id: 'arcade-1996',
  bpm: 128,
  swing: 0.5,
  gain: 0.85,
  sections: [
    { kind: 'intro', bars: 4 },
    { kind: 'A', bars: 16 },
    { kind: 'B', bars: 16 },
    { kind: 'break', bars: 8 },
    { kind: 'A', bars: 16 },
    { kind: 'B', bars: 16 },
    { kind: 'outro', bars: 4 },
  ],
  loopTo: 0,
  create(p: Player) {
    const ctx = p.ctx;
    // tonal channels go through a gentle 7-bit crusher (pre-gain up, post-gain
    // down so quiet notes keep a few quantisation steps); drums skip it
    const top = Math.min(9000, ctx.sampleRate * 0.45);
    const chipLP = p.filter('lowpass', top, 0.6);
    const post = p.bus(1 / 2.5, chipLP);
    const crush = ctx.createWaveShaper();
    crush.curve = curve('crush');
    crush.connect(post);
    const chip = p.bus(2.5, crush);
    const drums = p.bus(1, chipLP);
    p.send(0.08, chipLP);
    const leadPan = ctx.createStereoPanner();
    leadPan.pan.value = 0.08;
    leadPan.connect(chip);
    const echoPan = ctx.createStereoPanner();
    echoPan.pan.value = -0.35;
    echoPan.connect(chip);

    const prog = (i: StepInfo) => (i.sec.kind === 'B' ? AR_B : i.sec.kind === 'break' ? AR_BRK : AR_A);
    const chordOf = (i: StepInfo) => at(prog(i), i.bis);
    let secPass = 0;
    let lastSi = -1;

    return (i) => {
      const { t, s, sec, bis } = i;
      const kind = sec.kind;
      const [root, arp] = chordOf(i);
      if (i.si !== lastSi) {
        lastSi = i.si;
        if (kind === 'A' || kind === 'B') secPass = i.si >= 4 ? 1 : 0;
      }

      if (s === 0) {
        setTo(chipLP.frequency, kind === 'break' ? (i.last ? Math.min(6000, top) : 1500) : top, t, kind === 'break' && i.last ? 0.5 : 0.25);
        /* ---- arp: one oscillator per bar, 32nd-note steps */
        const arpOn = kind !== 'outro' || bis >= 1;
        if (arpOn) {
          const order = p.chance(0.5) ? arp : [...arp, ...arp.slice(1, -1).reverse()];
          chipArp(ctx, chip, t, order.map((m) => mtof(m + (kind === 'break' ? 0 : 12))), p.stepDur / 2, p.barDur, {
            vel: kind === 'intro' ? 1 : kind === 'break' ? 0.85 : 0.45,
            duty: kind === 'break' || kind === 'intro' ? 0.25 : 0.125,
            pan: -0.25,
          });
        }
        /* ---- triangle bass */
        const bassOn = (kind === 'intro' && bis >= 1) || kind === 'A' || kind === 'B' || kind === 'break';
        if (bassOn) {
          const notes: { t: number; f: number; dur: number }[] = [];
          const pattern = kind === 'B' ? [0, 0, 12, 0, 7, 12, 0, 12] : [0, 12, 0, 12, 0, 12, 0, 12];
          for (let k = 0; k < 8; k++) {
            let m = root + pattern[k];
            if (i.fill4 && k >= 6) m = root + (k === 6 ? 10 : 11);
            notes.push({ t: t + k * p.stepDur * 2, f: mtof(m), dur: p.stepDur * 1.7 });
          }
          chipBass(ctx, chip, notes, { vel: 1 });
        }
        if (kind === 'outro' && bis === 0) {
          // "stage clear" jingle
          [69, 72, 76, 81].forEach((m, k) => chipPulse(ctx, leadPan, t + k * p.stepDur, mtof(m + 12), p.stepDur * 0.9, { vel: 0.8, duty: 0.25 }));
          chipPulse(ctx, leadPan, t + 4 * p.stepDur, mtof(93), p.stepDur * 10, { vel: 0.8, duty: 0.25, vib: true, decay: 0.6 });
          chipBass(ctx, chip, [{ t: t + 4 * p.stepDur, f: mtof(45), dur: p.stepDur * 10 }]);
        }
        if (i.first && (kind === 'A' || kind === 'B')) chipNoise(ctx, drums, t, { vel: 0.55, decay: 0.55, rate: 0.7 });
      }

      /* ---- melody */
      if (kind === 'A' || kind === 'B') {
        const mel = (kind === 'A' ? AR_MEL_A : AR_MEL_B)[bis % 8];
        for (const [st, m, len] of mel) {
          if (st !== s) continue;
          const dur = len * p.stepDur * 0.92;
          chipPulse(ctx, leadPan, t, mtof(m), dur, { vel: 0.82, duty: 0.25, vib: len >= 4 });
          // the classic one-channel "echo" (second pass / B sections)
          if (secPass || bis >= 8) chipPulse(ctx, echoPan, t + p.stepDur * 3, mtof(m), dur, { vel: 0.32, duty: 0.5 });
        }
      }

      /* ---- noise drums */
      const drumsOn = (kind === 'intro' && bis >= 2) || kind === 'A' || kind === 'B' || kind === 'break' || (kind === 'outro' && bis < 1);
      if (!drumsOn) return;
      const busy = kind === 'A' || kind === 'B';
      const kickHit = busy ? s === 0 || s === 8 || (kind === 'B' && s === 10) || (s === 6 && p.chance(0.15)) : s === 0;
      if (kickHit) chipKick(ctx, drums, t, { vel: 0.9 });
      if (busy && (s === 4 || s === 12)) chipNoise(ctx, drums, t, { vel: 0.8, decay: 0.12, rate: 1 });
      if (busy && i.fill8 && s >= 13) chipNoise(ctx, drums, t, { vel: 0.4 + (s - 13) * 0.2, decay: 0.07, rate: 1 });
      else if (busy && i.fill4 && s === 14) chipNoise(ctx, drums, t, { vel: 0.4, decay: 0.06 });
      if (s % 2 === 0 && (busy || kind === 'intro')) chipNoise(ctx, drums, t, { mode: 'short', vel: s % 4 === 2 ? 0.45 : 0.28, decay: 0.03, rate: 1.6 });
      if (kind === 'break' && i.last && s % 2 === 0) chipNoise(ctx, drums, t, { vel: 0.2 + s * 0.03, decay: 0.05, rate: 0.6 + s * 0.05 });
    };
  },
};

export const TRACK_DEFS: Record<TrackId, TrackDef> = {
  'studio-hours': softFocus,
  'jakarta-rain': bekasiRain,
  'senopati-nights': lastTrainHome,
  'arcade-1996': gachaPop,
};
