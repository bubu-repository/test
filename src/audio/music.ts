/* ==========================================================================
   Generative BGM — Adelia’s sound system (the baby-blue turntable).
   Four synthesised tracks (tracks.ts) played by a lookahead scheduler: a
   25 ms timer schedules every 16th note ~120 ms ahead on the AudioContext
   clock, so timing is sample-accurate even when the main thread is busy.
   Changing track crossfades (equal-power, ~1.8 s); both decks keep playing
   through the fade. Chain:  deck(s) ─► fader (volume × duck) ─► musicBus
                                                   └► analyser (spectrum/VU)
   Public API (contract): play(id?), stop(), toggle(), next(), current,
   playing, beat(), subscribe(fn) — plus pause(), prev(), setVolume(),
   volume, duck()/unduck(), position(), info(), getLevel(), getSpectrum().
   ========================================================================== */
import { audio } from './engine';
import { TRACKS, type TrackId } from '@/lib/content';
import { Player } from './player';
import { TRACK_DEFS } from './tracks';

type Listener = () => void;

const LOOKAHEAD = 0.12;
const TICK_MS = 25;
const XFADE = 1.8;

const VOL_KEY = 'adelia.musicVol';
/** dside's key: read once, moved to VOL_KEY, then removed. */
const LEGACY_VOL_KEY = 'bubu.musicVol';

function loadVolume() {
  try {
    let raw = localStorage.getItem(VOL_KEY);
    const legacy = localStorage.getItem(LEGACY_VOL_KEY);
    if (raw == null && legacy != null) {
      raw = legacy;
      localStorage.setItem(VOL_KEY, legacy);
    }
    if (legacy != null) localStorage.removeItem(LEGACY_VOL_KEY);
    const v = Number(raw);
    if (raw != null && Number.isFinite(v) && v > 0 && v <= 1) return v;
  } catch {
    /* private mode */
  }
  return 0.8;
}

class Music {
  current: TrackId | null = null;
  playing = false;
  /** user volume 0..1 (persisted) */
  volume = loadVolume();

  private listeners = new Set<Listener>();
  private timer: number | null = null;
  private deck: Player | null = null;
  private fading: Player[] = [];
  private fader: GainNode | null = null;
  private _analyser: AnalyserNode | null = null;
  private duckLevel = 1;
  private resumeBar: Partial<Record<TrackId, number>> = {};
  private autoPaused = false;
  private levelBuf: Float32Array<ArrayBuffer> | null = null;

  constructor() {
    // pause generation while muted (saves CPU), resume on unmute
    audio.subscribe(() => {
      if (!audio.ctx) return;
      if (audio.isMuted() && this.playing) {
        this.autoPaused = true;
        this.pause();
      } else if (!audio.isMuted() && this.autoPaused) {
        this.autoPaused = false;
        if (!this.playing) this.play();
      }
    });
  }

  private ensureChain() {
    if (this.fader || !audio.ctx) return;
    const ctx = audio.ctx;
    this.fader = ctx.createGain();
    this.fader.gain.value = this.volume * this.duckLevel;
    this.fader.connect(audio.musicBus);
    this._analyser = ctx.createAnalyser();
    this._analyser.fftSize = 1024;
    this._analyser.smoothingTimeConstant = 0.78;
    this.fader.connect(this._analyser);
  }

  /** Start (or resume) a track. Same track while playing = no-op. */
  play(id: TrackId = this.current ?? 'studio-hours') {
    if (!audio.ready) return;
    if (this.playing && this.current === id && this.deck) return;
    if (audio.isMuted()) {
      // remember the pick; it starts as soon as sound is switched back on
      if (this.deck) this.pause();
      this.current = id;
      this.autoPaused = true;
      this.emit();
      return;
    }
    this.ensureChain();
    const ctx = audio.ctx!;
    const now = ctx.currentTime;
    const def = TRACK_DEFS[id];
    if (!def) return;
    this.autoPaused = false;
    if (this.deck) {
      this.deck.fadeOut(now, XFADE);
      this.fading.push(this.deck);
    }
    const startBar = this.resumeBar[id] ?? 0;
    delete this.resumeBar[id];
    const start = now + 0.06;
    const p = new Player(ctx, def, this.fader!, audio.reverbSend, start, startBar);
    p.fadeIn(start, this.fading.length ? XFADE : startBar ? 1.2 : 0.6);
    this.deck = p;
    this.current = id;
    this.playing = true;
    p.schedule(now + LOOKAHEAD, now);
    this.startTimer();
    this.emit();
  }

  /** Fade out and remember where we were (resumes from that bar). */
  pause() {
    if (!this.deck || !audio.ctx) {
      this.playing = false;
      this.emit();
      return;
    }
    const now = audio.ctx.currentTime;
    if (this.current) this.resumeBar[this.current] = this.deck.barAt(now);
    this.deck.fadeOut(now, 0.9);
    this.fading.push(this.deck);
    this.deck = null;
    this.playing = false;
    this.emit();
  }

  /** Fade out; next play starts the track from the top. */
  stop(silent = false) {
    if (this.deck && audio.ctx) {
      this.deck.fadeOut(audio.ctx.currentTime, 1.2);
      this.fading.push(this.deck);
    }
    if (this.current) delete this.resumeBar[this.current];
    this.deck = null;
    this.playing = false;
    if (!silent) this.emit();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  next() {
    const i = TRACKS.findIndex((t) => t.id === this.current);
    this.play(TRACKS[(i + 1) % TRACKS.length].id);
  }

  prev() {
    const i = TRACKS.findIndex((t) => t.id === this.current);
    this.play(TRACKS[(i - 1 + TRACKS.length) % TRACKS.length].id);
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    try {
      localStorage.setItem(VOL_KEY, String(this.volume));
    } catch {
      /* noop */
    }
    this.applyFader(0.08);
    this.emit();
  }

  /** Temporarily lower the BGM (e.g. while the synth sequencer plays). */
  duck(level = 0.18, seconds = 0.8) {
    this.duckLevel = Math.max(0, Math.min(1, level));
    this.applyFader(seconds / 3);
  }
  unduck(seconds = 1.6) {
    this.duckLevel = 1;
    this.applyFader(seconds / 3);
  }

  private applyFader(tc: number) {
    if (!this.fader || !audio.ctx) return;
    const t = audio.ctx.currentTime;
    this.fader.gain.cancelScheduledValues(t);
    this.fader.gain.setTargetAtTime(Math.max(0.0001, this.volume * this.duckLevel), t, tc);
  }

  /** Audible time (what you hear now was scheduled ~outputLatency ago). */
  private heardTime() {
    const ctx = audio.ctx!;
    const lat = (ctx as AudioContext).outputLatency || ctx.baseLatency || 0;
    return ctx.currentTime - lat;
  }

  /** 0..1 phase within the current beat — for visual sync (VU meters, LEDs). */
  beat(): number {
    if (!this.playing || !this.deck || !audio.ctx) return 0;
    const el = this.heardTime() - this.deck.t0;
    if (el < 0) return 0;
    return (el / this.deck.beatDur) % 1;
  }

  /** Song position of the current track (seconds) and its length before it loops. */
  position(): { elapsed: number; duration: number } {
    const id = this.current ?? 'studio-hours';
    const def = TRACK_DEFS[id];
    const bars = def.sections.reduce((a, s) => a + s.bars, 0);
    const duration = (bars * 240) / def.bpm;
    if (this.deck && audio.ctx) return { elapsed: Math.min(duration, this.deck.position(this.heardTime())), duration };
    const rb = this.resumeBar[id];
    return { elapsed: rb ? (rb * 240) / def.bpm : 0, duration };
  }

  /** Bar / section info for displays. */
  info(): { bpm: number; bar: number; bars: number; section: string; beatInBar: number } | null {
    if (!this.current) return null;
    const def = TRACK_DEFS[this.current];
    const bars = def.sections.reduce((a, s) => a + s.bars, 0);
    if (!this.deck || !audio.ctx) return { bpm: def.bpm, bar: this.resumeBar[this.current] ?? 0, bars, section: 'PAUSE', beatInBar: 0 };
    const now = this.heardTime();
    const bar = this.deck.barAt(now);
    let acc = 0;
    let section = def.sections[0].kind as string;
    for (const s of def.sections) {
      if (bar < acc + s.bars) {
        section = s.kind;
        break;
      }
      acc += s.bars;
    }
    const beatInBar = Math.floor(Math.max(0, now - this.deck.t0) / this.deck.beatDur) % 4;
    return { bpm: def.bpm, bar, bars, section, beatInBar };
  }

  /** Analyser on the music output only (null until audio has started). */
  get analyser(): AnalyserNode | null {
    return this._analyser;
  }

  /** RMS level 0..1 of the music output. */
  getLevel(): number {
    const a = this._analyser;
    if (!a || !this.playing) return 0;
    if (!this.levelBuf || this.levelBuf.length !== a.fftSize) this.levelBuf = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(this.levelBuf);
    let sum = 0;
    for (let i = 0; i < this.levelBuf.length; i += 2) sum += this.levelBuf[i] * this.levelBuf[i];
    return Math.min(1, Math.sqrt(sum / (this.levelBuf.length / 2)) * 4);
  }

  /** Fill `out` with byte frequency data (returns false when silent/not ready). */
  getSpectrum(out: Uint8Array<ArrayBuffer>): boolean {
    const a = this._analyser;
    if (!a) return false;
    a.getByteFrequencyData(out);
    return true;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private emit() {
    this.listeners.forEach((f) => f());
  }

  /* ------------------------------------------------------- scheduler */
  private startTimer() {
    if (this.timer != null) return;
    this.timer = window.setInterval(() => this.tick(), TICK_MS);
  }

  private tick() {
    const ctx = audio.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    // hidden tabs get throttled timers: schedule further ahead there
    const ahead = typeof document !== 'undefined' && document.hidden ? 1.2 : LOOKAHEAD;
    if (this.deck) this.deck.schedule(now + ahead, now);
    for (const p of this.fading) p.schedule(now + ahead, now);
    const done = this.fading.filter((p) => now > p.endAt + 0.4);
    if (done.length) {
      done.forEach((p) => p.dispose());
      this.fading = this.fading.filter((p) => !done.includes(p));
    }
    if (!this.deck && !this.fading.length && this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const music = new Music();

/** Length (seconds) of a track before it loops. */
export function trackLength(id: TrackId) {
  const def = TRACK_DEFS[id];
  return (def.sections.reduce((a, s) => a + s.bars, 0) * 240) / def.bpm;
}
