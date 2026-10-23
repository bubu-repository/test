/* ==========================================================================
   CLOUD ARCADE — engine helpers
   • Loop   fixed-timestep 60 Hz update, render once per animation frame
   • Input  8 logical buttons fed by keyboard + the on-device controls,
            with per-step edge detection (pressed / released)
   • Fx     particles, floating score text, screen shake, flash
   ========================================================================== */
import { P, rect, text, W, H } from './pixel';

export const STEP_MS = 1000 / 60;

export class Loop {
  private raf = 0;
  private last = 0;
  private acc = 0;
  running = false;

  constructor(
    private step: () => void,
    private render: () => void,
  ) {}

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.acc = 0;
    this.raf = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private tick = (now: number) => {
    if (!this.running) return;
    // clamp long frames (tab switches, GC) so we never spiral
    const dt = Math.min(200, now - this.last);
    this.last = now;
    this.acc += dt;
    let n = 0;
    while (this.acc >= STEP_MS && n < 4) {
      this.step();
      this.acc -= STEP_MS;
      n++;
    }
    if (n === 4) this.acc = 0;
    this.render();
    this.raf = requestAnimationFrame(this.tick);
  };
}

/* ------------------------------------------------------------------ input */
export type Btn = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'start' | 'select';
export const BTNS: Btn[] = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'];

export const KEYMAP: Record<string, Btn> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  Space: 'a',
  Enter: 'a',
  NumpadEnter: 'a',
  KeyZ: 'a',
  KeyX: 'b',
  ShiftLeft: 'b',
  ShiftRight: 'b',
  KeyP: 'start',
  Escape: 'start',
  Backspace: 'select',
  KeyM: 'select',
};

export class Input {
  held = Object.fromEntries(BTNS.map((b) => [b, false])) as Record<Btn, boolean>;
  private down = new Set<Btn>();
  private up = new Set<Btn>();
  /** sources holding each button (keyboard + pointer can overlap) */
  private sources = Object.fromEntries(BTNS.map((b) => [b, new Set<string>()])) as Record<Btn, Set<string>>;
  onChange?: (b: Btn, down: boolean) => void;

  set(b: Btn, isDown: boolean, source = 'kbd') {
    const s = this.sources[b];
    const was = s.size > 0;
    if (isDown) s.add(source);
    else s.delete(source);
    const now = s.size > 0;
    if (now === was) return;
    this.held[b] = now;
    if (now) this.down.add(b);
    else this.up.add(b);
    this.onChange?.(b, now);
  }

  pressed(b: Btn) {
    return this.down.has(b);
  }
  released(b: Btn) {
    return this.up.has(b);
  }
  any() {
    return this.down.size > 0;
  }
  /** call once at the end of every fixed step */
  endStep() {
    this.down.clear();
    this.up.clear();
  }
  releaseAll() {
    for (const b of BTNS) {
      this.sources[b].clear();
      if (this.held[b]) {
        this.held[b] = false;
        this.onChange?.(b, false);
      }
    }
    this.down.clear();
    this.up.clear();
  }
}

/* -------------------------------------------------------------------- fx */
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randi = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  g: number;
  size: number;
}
interface Floater {
  x: number;
  y: number;
  str: string;
  color: string;
  life: number;
}

const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Fx {
  parts: Particle[] = [];
  floats: Floater[] = [];
  shakeAmt = 0;
  flashT = 0;
  flashColor: string = P.white;
  /** called for big hits so the device itself can jolt */
  onJolt?: (power: number) => void;

  burst(x: number, y: number, color: string, n = 10, speed = 1.6, opts: { g?: number; life?: number; size?: number; up?: boolean } = {}) {
    for (let i = 0; i < n; i++) {
      const a = opts.up ? rand(-Math.PI * 0.95, -Math.PI * 0.05) : rand(0, Math.PI * 2);
      const s = rand(0.3, 1) * speed;
      const life = Math.round(rand(0.6, 1) * (opts.life ?? 26));
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, g: opts.g ?? 0.06, size: opts.size ?? 1 });
    }
    if (this.parts.length > 400) this.parts.splice(0, this.parts.length - 400);
  }

  float(x: number, y: number, str: string, color: string = P.white) {
    this.floats.push({ x, y, str, color, life: 40 });
  }

  shake(amount: number) {
    if (reduced) return;
    this.shakeAmt = Math.max(this.shakeAmt, amount);
    if (amount >= 3) this.onJolt?.(amount);
  }

  flash(frames = 4, color: string = P.white) {
    if (reduced) return;
    this.flashT = frames;
    this.flashColor = color;
  }

  update() {
    for (const p of this.parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.g;
      p.vx *= 0.98;
      p.life--;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const f of this.floats) {
      f.y -= f.life > 28 ? 0.6 : 0.2;
      f.life--;
    }
    this.floats = this.floats.filter((f) => f.life > 0);
    this.shakeAmt = this.shakeAmt > 0.2 ? this.shakeAmt * 0.85 : 0;
    if (this.flashT > 0) this.flashT--;
  }

  offset(): [number, number] {
    if (!this.shakeAmt) return [0, 0];
    return [Math.round(rand(-1, 1) * this.shakeAmt), Math.round(rand(-1, 1) * this.shakeAmt)];
  }

  render(g: CanvasRenderingContext2D) {
    for (const p of this.parts) {
      // fade by switching to a darker shade near the end (no alpha in the palette)
      const c = p.life < p.max * 0.3 ? fadeOf(p.color) : p.color;
      rect(g, p.x, p.y, p.size, p.size, c);
    }
    for (const f of this.floats) {
      if (f.life < 10 && f.life % 2) continue;
      text(g, f.str, f.x, f.y, { color: f.color, align: 'center', shadow: P.black });
    }
  }

  renderFlash(g: CanvasRenderingContext2D) {
    if (this.flashT > 0 && this.flashT % 2 === 0) {
      g.globalAlpha = 0.55;
      rect(g, 0, 0, W, H, this.flashColor);
      g.globalAlpha = 1;
    }
  }

  clear() {
    this.parts = [];
    this.floats = [];
    this.shakeAmt = 0;
    this.flashT = 0;
  }
}

function fadeOf(c: string) {
  switch (c) {
    case P.pink:
    case P.pinkLt:
      return P.pinkDk;
    case P.mint:
    case P.lilac:
    case P.butter:
      return P.steel;
    case P.white:
    case P.light:
      return P.alu;
    case P.alu:
    case P.alu2:
      return P.steel;
    case P.blue:
    case P.blueLt:
      return P.steel;
    default:
      return P.graphite;
  }
}

/* ------------------------------------------------------------ game types */
export type GameId = 'signal-catcher' | 'trend-runner' | 'culture-snake';

export interface GameApi {
  input: Input;
  fx: Fx;
  sfx: (name: 'coin' | 'error' | 'beep' | 'success' | 'pop' | 'tick' | 'press' | 'release' | 'whoosh' | 'switch' | 'click', opts?: { pitch?: number; gain?: number; pan?: number }) => void;
  addScore: (n: number) => void;
  readonly score: number;
  /** end the run (the arcade shows GAME OVER) */
  over: () => void;
}

export interface GameInstance {
  update(): void;
  /** draw the playfield (y ≥ HUD_H). The arcade draws the HUD bar. */
  render(g: CanvasRenderingContext2D, t: number): void;
  /** optional extra HUD drawing (lives, combo…) in the centre of the bar */
  hud?(g: CanvasRenderingContext2D, t: number): void;
}

export interface GameDef {
  id: GameId;
  title: string;
  short: string;
  /** title-card copy (≤ 24 chars per line) */
  how: string[];
  controls: string[];
  /** score that unlocks the High Score achievement (a skilled 60–90 s run) */
  threshold: number;
  create(api: GameApi): GameInstance;
  /** little animated icon for the menu / title card */
  icon(g: CanvasRenderingContext2D, x: number, y: number, t: number): void;
}

export const HUD_H = 12;
