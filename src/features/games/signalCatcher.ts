/* ==========================================================================
   ANSWER CATCHER — catch the cited answers (pink ticks) and let the
   "?" pass: those are "Can’t tell yet", and catching one means guessing
   (it costs a heart). Consecutive catches build a combo multiplier; rare
   blue receipts (an answer with its source) are worth a bonus. It keeps
   speeding up. (Game id 'signal-catcher' is dside's leaderboard key.)
   ========================================================================== */
import { clamp, HUD_H, rand, type GameApi, type GameDef, type GameInstance } from './engine';
import { blink, diamond, P, rect, text, W, H } from './pixel';

type Kind = 'sig' | 'noise' | 'trend';
interface Item {
  x: number;
  y: number;
  vy: number;
  kind: Kind;
  phase: number;
}

const PAD_Y = 131;
/** "Can't tell yet": a lilac speech bubble with a question mark (let it pass). */
function drawUnsure(g: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  const x0 = Math.round(cx) - 4;
  const y0 = Math.round(cy) - 4;
  const c = blink(t, 16) ? P.alu : P.lilac;
  rect(g, x0 + 1, y0, 7, 8, c);
  rect(g, x0, y0 + 1, 9, 6, c);
  rect(g, x0 + 2, y0 + 8, 2, 1, c); // the bubble's tail
  text(g, '?', x0 + 2, y0 + 1, { color: P.black });
}

/** A cited answer: a pink chip with a white tick. */
function drawAnswer(g: CanvasRenderingContext2D, cx: number, cy: number, glint: boolean) {
  const x = Math.round(cx) - 3;
  const y = Math.round(cy) - 3;
  rect(g, x + 1, y, 5, 7, P.pink);
  rect(g, x, y + 1, 7, 5, P.pink);
  rect(g, x + 1, y + 3, 1, 1, P.white);
  rect(g, x + 2, y + 4, 1, 1, P.white);
  rect(g, x + 3, y + 3, 1, 1, P.white);
  rect(g, x + 4, y + 2, 1, 1, P.white);
  rect(g, x + 5, y + 1, 1, 1, glint ? P.white : P.pinkLt);
}

function drawPaddle(g: CanvasRenderingContext2D, x: number, w: number, glow: number, t: number) {
  const x0 = Math.round(x - w / 2);
  rect(g, x0 + 1, PAD_Y, w - 2, 1, P.white);
  rect(g, x0, PAD_Y + 1, w, 2, P.alu2);
  rect(g, x0 + 1, PAD_Y + 3, w - 2, 1, P.steel);
  // antenna nubs
  rect(g, x0 + 1, PAD_Y - 2, 1, 2, P.alu2);
  rect(g, x0 + w - 2, PAD_Y - 2, 1, 2, P.alu2);
  // centre LED
  const c = glow > 0 ? (glow % 4 < 2 ? P.white : P.blueLt) : blink(t, 40) ? P.blue : P.steel;
  rect(g, x0 + w / 2 - 2, PAD_Y + 1, 4, 2, c);
}

class SignalCatcher implements GameInstance {
  x = W / 2;
  vx = 0;
  w = 22;
  items: Item[] = [];
  lives = 3;
  combo = 0;
  t = 0;
  spawnIn = 50;
  inv = 0;
  glow = 0;
  dashCd = 0;
  dashT = 0;
  facing = 1;
  dying = 0;
  okAt = -99;
  trail: { x: number; life: number }[] = [];
  stars = Array.from({ length: 26 }, () => ({ x: rand(0, W), y: rand(HUD_H, H), s: rand(0.05, 0.25) }));

  constructor(private api: GameApi) {}

  get mult() {
    return Math.min(8, 1 + Math.floor(this.combo / 4));
  }

  update() {
    const { input, fx } = this.api;
    this.t++;
    const sec = this.t / 60;

    for (const s of this.stars) {
      s.y += s.s + sec * 0.004;
      if (s.y > H) {
        s.y = HUD_H;
        s.x = rand(0, W);
      }
    }

    if (this.dying) {
      this.dying--;
      if (this.dying === 0) this.api.over();
      this.items.forEach((it) => (it.y += it.vy * 0.3));
      return;
    }

    // movement: accel + friction, A = dash
    const L = input.held.left;
    const R = input.held.right;
    if (L && !R) {
      this.vx -= 0.55;
      this.facing = -1;
    } else if (R && !L) {
      this.vx += 0.55;
      this.facing = 1;
    } else this.vx *= 0.72;
    const max = 2.7;
    if (this.dashT > 0) {
      this.dashT--;
      this.trail.push({ x: this.x, life: 10 });
    } else this.vx = clamp(this.vx, -max, max);
    if (this.dashCd > 0) this.dashCd--;
    if (input.pressed('a') && this.dashCd === 0) {
      this.vx = this.facing * 6.5;
      this.dashT = 7;
      this.dashCd = 36;
      this.api.sfx('whoosh', { gain: 0.5 });
      fx.burst(this.x - this.facing * this.w * 0.5, PAD_Y + 2, P.alu2, 6, 1, { g: 0, life: 12 });
    }
    this.x += this.vx;
    const half = this.w / 2;
    if (this.x < half + 1 || this.x > W - half - 1) {
      this.x = clamp(this.x, half + 1, W - half - 1);
      this.vx = 0;
    }
    this.trail.forEach((tr) => tr.life--);
    this.trail = this.trail.filter((tr) => tr.life > 0);

    // spawning — the ramp: faster, denser, noisier
    const interval = Math.max(15, 50 - sec * 0.55);
    const baseV = Math.min(2.7, 0.75 + sec * 0.02);
    const noiseRatio = Math.min(0.5, 0.18 + sec * 0.0045);
    if (--this.spawnIn <= 0) {
      this.spawnIn = interval * rand(0.7, 1.25);
      const r = Math.random();
      const kind: Kind = r < 0.045 ? 'trend' : r < 0.045 + noiseRatio ? 'noise' : 'sig';
      this.items.push({ x: rand(6, W - 6), y: HUD_H - 4, vy: baseV * rand(0.85, 1.2) * (kind === 'trend' ? 1.25 : 1), kind, phase: rand(0, 6.28) });
    }

    if (this.inv > 0) this.inv--;
    if (this.glow > 0) this.glow--;

    for (const it of this.items) {
      it.y += it.vy;
      if (it.kind === 'sig') it.x += Math.sin(this.t * 0.05 + it.phase) * 0.25;
      if (it.kind === 'noise') it.x += Math.sin(this.t * 0.2 + it.phase) * 0.35;
      it.x = clamp(it.x, 4, W - 4);
    }

    // catch / collide
    const keep: Item[] = [];
    for (const it of this.items) {
      const hitY = it.y + 3 >= PAD_Y - 1 && it.y - 3 <= PAD_Y + 3;
      const hitX = Math.abs(it.x - this.x) <= half + 2;
      if (hitY && hitX) {
        this.collect(it);
        continue;
      }
      if (it.y > H + 4) {
        if (it.kind !== 'noise' && this.combo > 0) {
          if (this.combo >= 4) fx.float(clamp(it.x, 14, W - 14), H - 18, 'MISS', P.alu);
          this.combo = 0;
          this.api.sfx('tick', { gain: 0.6 });
        } else if (it.kind === 'noise' && this.t - this.okAt > 50) {
          // letting "can't tell yet" through is the right call
          this.okAt = this.t;
          fx.float(clamp(it.x, 20, W - 20), H - 18, 'OK', P.mint);
        }
        continue;
      }
      keep.push(it);
    }
    this.items = keep;
  }

  private collect(it: Item) {
    const { fx } = this.api;
    if (it.kind === 'noise') {
      if (this.inv > 0) return;
      this.lives--;
      this.combo = 0;
      this.inv = 70;
      this.api.sfx('error');
      fx.shake(4);
      fx.flash(6, P.white);
      fx.float(clamp(it.x, 20, W - 20), PAD_Y - 14, 'GUESSED', P.lilac);
      fx.burst(it.x, PAD_Y - 2, P.lilac, 16, 2.2);
      fx.burst(it.x, PAD_Y - 2, P.light, 8, 1.4);
      if (this.lives <= 0) {
        this.dying = 50;
        fx.shake(6);
        fx.burst(this.x, PAD_Y, P.pink, 26, 2.6);
        fx.burst(this.x, PAD_Y, P.white, 14, 1.8);
      }
      return;
    }
    const before = this.mult;
    this.combo++;
    const pts = (it.kind === 'trend' ? 50 : 10) * this.mult;
    this.api.addScore(pts);
    this.glow = 10;
    fx.float(it.x, PAD_Y - 12, `+${pts}`, it.kind === 'trend' ? P.blueLt : P.pinkLt);
    if (it.kind === 'trend') {
      this.api.sfx('success', { gain: 0.7 });
      fx.burst(it.x, PAD_Y - 2, P.blue, 18, 2, { up: true });
      fx.burst(it.x, PAD_Y - 2, P.white, 8, 1.4, { up: true });
      fx.shake(1.5);
    } else {
      this.api.sfx('coin', { pitch: Math.min(12, (this.combo - 1) % 13), gain: 0.7 });
      fx.burst(it.x, PAD_Y - 2, P.pink, 9, 1.5, { up: true });
    }
    if (this.mult > before) {
      fx.float(W / 2, 40, `COMBO X${this.mult}`, P.pink);
      this.api.sfx('beep', { pitch: this.mult * 2 });
    }
  }

  render(g: CanvasRenderingContext2D, t: number) {
    rect(g, 0, HUD_H, W, H - HUD_H, P.black);
    // data-rain background
    for (const s of this.stars) rect(g, s.x, s.y, 1, s.s > 0.18 ? 2 : 1, s.s > 0.18 ? P.graphite : P.deep);
    // floor line
    for (let x = (t >> 2) % 4; x < W; x += 4) rect(g, x, H - 6, 2, 1, P.deep);

    for (const it of this.items) {
      if (it.kind === 'noise') drawUnsure(g, it.x, it.y, t + Math.round(it.phase * 10));
      else if (it.kind === 'trend') {
        rect(g, it.x, it.y - 7, 1, 3, P.steel);
        diamond(g, it.x, it.y, 3, blink(t, 4) ? P.blue : P.blueLt, P.white);
      } else {
        rect(g, it.x, it.y - 6, 1, 2, P.pinkDk);
        drawAnswer(g, it.x, it.y, blink(t + it.phase * 10, 12));
      }
    }

    for (const tr of this.trail) if (tr.life % 2) rect(g, tr.x - this.w / 2, PAD_Y + 1, this.w, 2, P.steel);
    if (!this.dying && !(this.inv > 0 && (this.inv >> 2) % 2)) drawPaddle(g, this.x, this.w, this.glow, t);
    // dash ready pip
    if (!this.dying && this.dashCd === 0) rect(g, this.x - 1, PAD_Y + 6, 2, 1, P.alu);
  }

  hud(g: CanvasRenderingContext2D) {
    for (let i = 0; i < 3; i++) text(g, '♥', 66 + i * 7, 3, { color: i < this.lives ? P.pink : P.graphite });
    if (this.mult > 1) text(g, `X${this.mult}`, 90, 3, { color: P.white });
  }
}

export const signalCatcher: GameDef = {
  id: 'signal-catcher',
  title: 'ANSWER CATCHER',
  short: 'CATCHER',
  how: ['CATCH THE CITED ANSWERS', "LET ? PASS: CAN'T TELL", 'BLUE = A RECEIPT, X5'],
  controls: ['←→ MOVE', 'A DASH'],
  threshold: 1500,
  create: (api) => new SignalCatcher(api),
  icon(g, x, y, t) {
    drawAnswer(g, x + 4, y + 3 + ((t >> 3) % 3), true);
    rect(g, x, y + 9, 9, 1, P.alu2);
    rect(g, x + 3, y + 9, 3, 1, P.blue);
  },
};
