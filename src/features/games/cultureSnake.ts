/* ==========================================================================
   EVAL SNAKE — grow the test set by eating eval cases (pink case cards).
   Every five cases the set level (and the score multiplier) goes up and so
   does the speed. Blue citations are a limited-time bonus: a case with its
   receipt. (Game id 'culture-snake' is dside's leaderboard key.)
   ========================================================================== */
import { HUD_H, randi, type GameApi, type GameDef, type GameInstance } from './engine';
import { blink, frame, P, rect, text, W } from './pixel';

/** A labelled eval case: a little card with a tick (7×7, centred on cx, cy). */
function caseCard(g: CanvasRenderingContext2D, cx: number, cy: number, big: boolean) {
  const x = Math.round(cx) - 3;
  const y = Math.round(cy) - 3;
  rect(g, x, y, 7, 7, big ? P.pink : P.pinkDk);
  rect(g, x + 1, y + 1, 5, 5, P.pink);
  rect(g, x + 5, y, 2, 2, P.pinkLt); // folded corner
  // the tick
  rect(g, x + 1, y + 3, 1, 1, P.white);
  rect(g, x + 2, y + 4, 1, 1, P.white);
  rect(g, x + 3, y + 3, 1, 1, P.white);
  rect(g, x + 4, y + 2, 1, 1, P.white);
}

/** A citation: a blue quote mark on a pale chip. */
function citation(g: CanvasRenderingContext2D, cx: number, cy: number, c: string) {
  const x = Math.round(cx) - 3;
  const y = Math.round(cy) - 3;
  rect(g, x, y + 1, 7, 5, c);
  rect(g, x + 1, y, 5, 7, c);
  rect(g, x + 1, y + 2, 2, 2, P.white);
  rect(g, x + 4, y + 2, 2, 2, P.white);
  rect(g, x + 2, y + 4, 1, 1, P.white);
  rect(g, x + 5, y + 4, 1, 1, P.white);
}

const CELL = 8;
const COLS = 19;
const ROWS = 16;
const OX = 4;
const OY = HUD_H + 2; // 14 → 14 + 128 = 142

type Dir = { x: number; y: number };
const DIRS: Record<'up' | 'down' | 'left' | 'right', Dir> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
type Cell = { x: number; y: number };

class CultureSnake implements GameInstance {
  body: Cell[] = [
    { x: 6, y: 8 },
    { x: 5, y: 8 },
    { x: 4, y: 8 },
  ];
  dir: Dir = DIRS.right;
  queue: Dir[] = [];
  grow = 0;
  eaten = 0;
  tick = 0;
  food: Cell = { x: 12, y: 8 };
  trend: (Cell & { life: number }) | null = null;
  dying = 0;
  popIdx = 0;
  t = 0;
  wobble = 0;

  constructor(private api: GameApi) {}

  get level() {
    return 1 + Math.floor(this.eaten / 5);
  }
  get interval() {
    return Math.max(3, 9 - Math.floor(this.eaten / 5));
  }

  private free(): Cell {
    for (let tries = 0; tries < 400; tries++) {
      const c = { x: randi(0, COLS - 1), y: randi(0, ROWS - 1) };
      if (this.body.some((b) => b.x === c.x && b.y === c.y)) continue;
      if (this.food && this.food.x === c.x && this.food.y === c.y) continue;
      if (this.trend && this.trend.x === c.x && this.trend.y === c.y) continue;
      return c;
    }
    return { x: 0, y: 0 };
  }

  update() {
    const { input, fx } = this.api;
    this.t++;
    if (this.wobble > 0) this.wobble--;

    if (this.dying) {
      this.dying--;
      // segments pop off one by one
      if (this.dying % 3 === 0 && this.popIdx < this.body.length) {
        const b = this.body[this.popIdx++];
        fx.burst(OX + b.x * CELL + 4, OY + b.y * CELL + 4, this.popIdx === 1 ? P.pink : P.lilac, 5, 1.2, { g: 0.03, life: 16 });
        this.api.sfx('tick', { pitch: -this.popIdx, gain: 0.5 });
      }
      if (this.dying === 0) this.api.over();
      return;
    }

    for (const k of ['up', 'down', 'left', 'right'] as const) {
      if (!input.pressed(k)) continue;
      const last = this.queue[this.queue.length - 1] ?? this.dir;
      const d = DIRS[k];
      if (d.x === -last.x && d.y === -last.y) continue; // no 180°
      if (d.x === last.x && d.y === last.y) continue;
      if (this.queue.length < 3) this.queue.push(d);
    }

    if (this.trend && --this.trend.life <= 0) {
      fx.burst(OX + this.trend.x * CELL + 4, OY + this.trend.y * CELL + 4, P.steel, 6, 1);
      this.trend = null;
    }

    // hold A to sprint (more risk, same reward)
    const step = this.api.input.held.a ? Math.max(2, Math.floor(this.interval / 2)) : this.interval;
    if (++this.tick < step) return;
    this.tick = 0;

    if (this.queue.length) this.dir = this.queue.shift()!;
    const head = this.body[0];
    const nx = head.x + this.dir.x;
    const ny = head.y + this.dir.y;
    const willGrow = this.grow > 0;
    const bodyToCheck = willGrow ? this.body : this.body.slice(0, -1);
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || bodyToCheck.some((b) => b.x === nx && b.y === ny)) {
      this.dying = Math.max(36, this.body.length * 3 + 12);
      this.api.sfx('error');
      fx.shake(5);
      fx.flash(6);
      return;
    }
    this.body.unshift({ x: nx, y: ny });
    if (willGrow) this.grow--;
    else this.body.pop();

    const px = OX + nx * CELL + 4;
    const py = OY + ny * CELL + 4;
    if (nx === this.food.x && ny === this.food.y) {
      const lvBefore = this.level;
      this.eaten++;
      this.grow += 2;
      const pts = 10 * lvBefore;
      this.api.addScore(pts);
      this.api.sfx('coin', { pitch: (this.eaten - 1) % 12, gain: 0.7 });
      fx.burst(px, py, P.pink, 10, 1.5);
      fx.float(px, py - 10, `+${pts}`, P.pinkLt);
      this.wobble = 8;
      this.food = this.free();
      if (this.level > lvBefore) {
        fx.float(W / 2, 40, `SET ${this.level}`, P.pink);
        this.api.sfx('beep', { pitch: this.level * 2 });
        fx.shake(1.5);
      }
      if (this.eaten % 7 === 0 && !this.trend) this.trend = { ...this.free(), life: 6 * 60 };
    } else if (this.trend && nx === this.trend.x && ny === this.trend.y) {
      const pts = 50 * this.level;
      this.api.addScore(pts);
      this.api.sfx('success', { gain: 0.7 });
      fx.burst(px, py, P.blue, 16, 1.8);
      fx.burst(px, py, P.white, 6, 1.2);
      fx.float(px, py - 10, `+${pts}`, P.blueLt);
      fx.shake(2);
      this.grow += 1;
      this.trend = null;
    }
  }

  render(g: CanvasRenderingContext2D, t: number) {
    rect(g, 0, HUD_H, W, 144 - HUD_H, P.black);
    // dot grid
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) rect(g, OX + x * CELL + 4, OY + y * CELL + 4, 1, 1, P.deep);
    frame(g, OX - 1, OY - 1, COLS * CELL + 2, ROWS * CELL + 2, P.steel);
    frame(g, OX - 3, OY - 1, COLS * CELL + 6, ROWS * CELL + 2, P.deep);

    // food: an eval case
    const fx0 = OX + this.food.x * CELL + 4;
    const fy0 = OY + this.food.y * CELL + 4;
    caseCard(g, fx0, fy0 - (blink(t, 14) ? 1 : 0), blink(t, 14));
    if (this.trend) {
      const show = this.trend.life > 90 || blink(t, 6);
      if (show) citation(g, OX + this.trend.x * CELL + 4, OY + this.trend.y * CELL + 4, blink(t, 4) ? P.blue : P.blueLt);
      // timer bar
      const w = Math.round((this.trend.life / 360) * 20);
      rect(g, OX + this.trend.x * CELL - 6, OY + this.trend.y * CELL - 3, w, 1, P.blue);
    }

    // snake
    const n = this.body.length;
    for (let i = n - 1; i >= 0; i--) {
      if (this.dying && i < this.popIdx) continue;
      const b = this.body[i];
      const x = OX + b.x * CELL;
      const y = OY + b.y * CELL;
      if (i === 0) {
        const c = this.dying && blink(t, 4) ? P.white : P.mint;
        rect(g, x + 1, y, 6, 8, c);
        rect(g, x, y + 1, 8, 6, c);
        // eyes look where we go
        const ex = this.dir.x;
        const ey = this.dir.y;
        const e1 = ex !== 0 ? { x: 4 + ex * 1, y: 2 } : { x: 2, y: 4 + ey * 1 };
        const e2 = ex !== 0 ? { x: 4 + ex * 1, y: 5 } : { x: 5, y: 4 + ey * 1 };
        rect(g, x + e1.x, y + e1.y, 1, 1, P.black);
        rect(g, x + e2.x, y + e2.y, 1, 1, P.black);
      } else {
        const wob = this.wobble > 0 && i % 2 === (this.wobble >> 1) % 2 ? 1 : 0;
        // the body is the growing test set: pastel cases in a row
        const c = i % 4 === 0 ? P.pink : i % 4 === 2 ? P.blue : i > n * 0.7 ? P.alu : P.lilac;
        rect(g, x + 1 - wob, y + 1 - wob, 6 + wob * 2, 6 + wob * 2, c);
        rect(g, x + 2, y + 2, 2, 1, P.white);
      }
    }
  }

  hud(g: CanvasRenderingContext2D) {
    text(g, `SET ${this.level}`, 80, 3, { color: P.alu2, align: 'center' });
  }
}

export const cultureSnake: GameDef = {
  id: 'culture-snake',
  title: 'EVAL SNAKE',
  short: 'SNAKE',
  how: ['EAT EVAL CASES, GROW', 'THE TEST SET. BLUE =', 'A CITATION. NO TAILS!'],
  controls: ['↑↓←→ STEER', 'HOLD A SPRINT'],
  threshold: 500,
  create: (api) => new CultureSnake(api),
  icon(g, x, y, t) {
    const k = (t >> 4) % 2;
    rect(g, x, y + 4, 3, 3, P.lilac);
    rect(g, x + 3, y + 4 - k, 3, 3, P.blue);
    rect(g, x + 6, y + 4, 3, 3, P.mint);
    rect(g, x + 10, y + 4, 2, 3, P.pink);
  },
};
