/* ==========================================================================
   LINTAS RUNNER — the morning commute from Bekasi to Jakarta as an endless
   runner (Lintas is her commute planner). The commuter jumps / double-jumps
   over potholes and stacks of 214-page tenders, ducks under flying delay
   alerts and picks up hearts. Station names on the old Bekasi line pass by
   as milestones. (Game id 'trend-runner' is dside's leaderboard key.)
   ========================================================================== */
import { HUD_H, pick, rand, randi, type GameApi, type GameDef, type GameInstance } from './engine';
import { blink, draw, P, rect, sprite, text, W, H, type Sprite } from './pixel';

const GROUND = 126;
const PX = 26; // player x
/** Milestones, every 500 points: stations on the Bekasi line into Jakarta. */
const STATIONS = ['KRANJI', 'CAKUNG', 'KLENDER', 'JATINEGARA', 'MANGGARAI', 'SUDIRMAN'];

/* ---------------------------------------------------------------- sprites */
let S: Record<string, Sprite> | null = null;
function sprites() {
  if (S) return S;
  // the commuter: hair bun, pink jacket, a baby-blue tote
  const head = ['...rrr....', '..rrrrr...', '.rrrrrrr..', '.rlllllr..', '.lkllkll..', '.lylllyl..', '..lllll...', '..ooooob..', '.looooobb.', '..ooooobb.'];
  S = {
    runA: sprite([...head, '..s....s..', '.ss....ss.']),
    runB: sprite([...head, '...s..s...', '...ss.ss..']),
    jump: sprite([...head, '.ss....ss.', '..........']),
    duck: sprite(['..........', '..rrrrr...', '.rrrrrrr..', '.lkllklr..', '.lylllyl..', '.ooooooob.', 'looooooobb', '.ss....ss.']),
    // a 214-page tender: a fat stack of paper with a pink clip
    tender: sprite([
      '..ooo....',
      'llllllla.',
      'lwwwwwwia',
      'lwssssswl',
      'lwwwwwwwl',
      'lwsssswwl',
      'lwwwwwwwl',
      'liiiiiiil',
      'lwwwwwwwl',
      'liiiiiiil',
      'lwwwwwwwl',
      'aaaaaaaaa',
    ]),
    // a delay alert: a speech bubble with "!"
    alertA: sprite([
      '..vvvvvvv..',
      '.vvvvvvvvv.',
      'vvvvvkvvvvv',
      'vvvvvkvvvvv',
      'vvvvvkvvvvv',
      'vvvvvvvvvvv',
      'vvvvvkvvvvv',
      '.vvvvvvvvv.',
      '..vvvvvvv..',
      '...vv......',
      '...v.......',
    ]),
    alertB: sprite([
      '..ooooooo..',
      '.ooooooooo.',
      'oooookooooo',
      'oooookooooo',
      'oooookooooo',
      'ooooooooooo',
      'oooookooooo',
      '.ooooooooo.',
      '..ooooooo..',
      '...oo......',
      '...o.......',
    ]),
    heart: sprite(['.o.o.', 'ooooo', 'ooooo', '.ooo.', '..o..']),
  };
  return S;
}

/* --------------------------------------------------------------- the commute */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const TILE = 256;
let FAR: HTMLCanvasElement | null = null;
let MID: HTMLCanvasElement | null = null;

/** far: the city ahead, soft lilac towers */
function buildFar() {
  const c = document.createElement('canvas');
  c.width = TILE;
  c.height = 70;
  const g = c.getContext('2d')!;
  const r = seeded(26);
  let x = 0;
  while (x < TILE) {
    const w = 7 + Math.floor(r() * 12);
    const h = 14 + Math.floor(r() * 36);
    g.fillStyle = P.deep;
    g.fillRect(x, 70 - h, w, h);
    if (r() < 0.3) g.fillRect(x + Math.floor(w / 2), 70 - h - 5, 1, 5); // antenna
    if (r() < 0.2) {
      g.fillStyle = P.pinkDk;
      g.fillRect(x + Math.floor(w / 2), 70 - h - 6, 1, 1); // a red-light beacon
    }
    x += w + Math.floor(r() * 3);
  }
  return c;
}

/** mid: low houses with roofs, and the elevated track */
function buildMid() {
  const c = document.createElement('canvas');
  c.width = TILE;
  c.height = 44;
  const g = c.getContext('2d')!;
  const r = seeded(7);
  let x = 0;
  while (x < TILE) {
    const w = 12 + Math.floor(r() * 14);
    const h = 8 + Math.floor(r() * 12);
    g.fillStyle = P.night;
    g.fillRect(x, 44 - h, w, h);
    // a pitched roof
    g.fillStyle = r() < 0.5 ? P.steel : P.deep;
    for (let i = 0; i < 3; i++) g.fillRect(x - 1 + i, 44 - h - 3 + i, w + 2 - i * 2, 1);
    // windows
    for (let wy = 44 - h + 3; wy < 42; wy += 4)
      for (let wx = x + 2; wx < x + w - 2; wx += 4) {
        const v = r();
        if (v < 0.4) continue;
        g.fillStyle = v > 0.94 ? P.pink : v > 0.82 ? P.butter : P.steel;
        g.fillRect(wx, wy, 1, 1);
      }
    x += w + 2 + Math.floor(r() * 5);
  }
  // the elevated track over the houses: deck + pillars
  g.fillStyle = P.alu;
  g.fillRect(0, 8, TILE, 2);
  g.fillStyle = P.steel;
  for (let px = 6; px < TILE; px += 32) g.fillRect(px, 10, 2, 34);
  return c;
}

/* ------------------------------------------------------------------ game */
type ObKind = 'tender' | 'tall' | 'wide' | 'hole' | 'alert' | 'alertHi';
interface Ob {
  kind: ObKind;
  x: number;
  y: number;
  w: number;
  h: number;
  t: number;
}
interface Heart {
  x: number;
  y: number;
  got: boolean;
}

class LintasRunner implements GameInstance {
  y = GROUND;
  vy = 0;
  onGround = true;
  jumps = 0;
  coyote = 0;
  buffer = 0;
  ducking = false;
  speed = 1.6;
  dist = 0;
  scored = 0;
  t = 0;
  obs: Ob[] = [];
  hearts: Heart[] = [];
  nextOb = 140;
  farX = 0;
  midX = 0;
  dead = 0;
  spin = 0;
  streak = 0;
  streakT = 0;
  milestone = 500;
  station = 0;
  trainX = W + 80;
  dust: { x: number; y: number; life: number }[] = [];

  constructor(private api: GameApi) {
    sprites();
    FAR ??= buildFar();
    MID ??= buildMid();
  }

  private hitbox() {
    return this.ducking ? { x: PX + 1, y: this.y - 6, w: 8, h: 6 } : { x: PX + 2, y: this.y - 11, w: 7, h: 11 };
  }

  update() {
    const { input, fx } = this.api;
    this.t++;
    const sec = this.t / 60;

    if (this.dead) {
      this.dead--;
      this.vy += 0.3;
      this.y += this.vy;
      this.spin++;
      if (this.dead === 0) this.api.over();
      return;
    }

    this.speed = 1.6 + Math.min(2.2, sec * 0.028);
    this.dist += this.speed;
    const s = Math.floor(this.dist / 10);
    if (s > this.scored) {
      this.api.addScore(s - this.scored);
      this.scored = s;
    }
    if (this.api.score >= this.milestone) {
      const name = STATIONS[this.station % STATIONS.length];
      this.station++;
      fx.float(W / 2, 34, name, P.blue);
      this.api.sfx('beep', { pitch: 7 });
      this.milestone += 500;
    }
    this.farX = (this.farX + this.speed * 0.12) % TILE;
    this.midX = (this.midX + this.speed * 0.38) % TILE;
    // a train on the elevated track, now and then
    this.trainX -= this.speed * 0.38 + 1.2;
    if (this.trainX < -90) this.trainX = W + 200 + rand(0, 300);

    // jump buffer / coyote time
    const jumpPressed = input.pressed('a') || input.pressed('up');
    const jumpHeld = input.held.a || input.held.up;
    if (jumpPressed) this.buffer = 7;
    else if (this.buffer > 0) this.buffer--;
    if (this.onGround) this.coyote = 6;
    else if (this.coyote > 0) this.coyote--;

    if (this.buffer > 0) {
      if (this.onGround || this.coyote > 0) {
        this.vy = -4.3;
        this.onGround = false;
        this.coyote = 0;
        this.jumps = 1;
        this.buffer = 0;
        this.api.sfx('pop', { gain: 0.55 });
        for (let i = 0; i < 4; i++) this.dust.push({ x: PX + rand(0, 9), y: GROUND - 1, life: 10 });
      } else if (this.jumps < 2) {
        this.vy = -3.7;
        this.jumps = 2;
        this.buffer = 0;
        this.api.sfx('pop', { pitch: 5, gain: 0.55 });
        fx.burst(PX + 5, this.y, P.blueLt, 6, 1.2, { g: 0.04, life: 14 });
      }
    }

    const down = input.held.down || input.held.b;
    this.ducking = this.onGround && down;
    if (!this.onGround) {
      let g = jumpHeld && this.vy < 0 ? 0.2 : 0.34;
      if (down) g += 0.35;
      this.vy += g;
      this.y += this.vy;
      if (this.y >= GROUND) {
        this.y = GROUND;
        this.vy = 0;
        this.onGround = true;
        this.jumps = 0;
        this.api.sfx('tick', { gain: 0.5 });
        for (let i = 0; i < 3; i++) this.dust.push({ x: PX + rand(0, 9), y: GROUND - 1, life: 8 });
      }
    }
    this.dust.forEach((d) => {
      d.x -= this.speed * 0.6;
      d.y -= 0.15;
      d.life--;
    });
    this.dust = this.dust.filter((d) => d.life > 0);

    // spawn obstacles + heart arcs
    this.nextOb -= this.speed;
    if (this.nextOb <= 0) this.spawn(sec);

    for (const o of this.obs) {
      o.x -= this.speed * (o.kind.startsWith('alert') ? 1.25 : 1);
      o.t++;
    }
    this.obs = this.obs.filter((o) => o.x + o.w > -4);
    for (const h of this.hearts) h.x -= this.speed;
    this.hearts = this.hearts.filter((h) => h.x > -6 && !h.got);

    if (this.streakT > 0) this.streakT--;
    else this.streak = 0;

    // collisions
    const hb = this.hitbox();
    for (const h of this.hearts) {
      if (Math.abs(h.x - (hb.x + hb.w / 2)) < 6 && h.y > hb.y - 4 && h.y < hb.y + hb.h + 3) {
        h.got = true;
        this.streak++;
        this.streakT = 50;
        this.api.addScore(25);
        this.api.sfx('coin', { pitch: Math.min(12, this.streak - 1), gain: 0.65 });
        fx.burst(h.x, h.y, P.pink, 8, 1.4);
        fx.float(h.x, h.y - 8, '+25', P.pinkLt);
      }
    }
    for (const o of this.obs) {
      if (o.kind === 'hole') {
        // a pothole only catches you on the ground, over its middle
        if (this.onGround && PX + 3 > o.x + 2 && PX + 7 < o.x + o.w - 2) {
          this.crash(true);
          break;
        }
        continue;
      }
      const ox = o.x + 1;
      const oy = o.y + 1;
      const ow = o.w - 2;
      const oh = o.h - 2;
      if (hb.x < ox + ow && hb.x + hb.w > ox && hb.y < oy + oh && hb.y + hb.h > oy) {
        this.crash(false);
        break;
      }
    }
  }

  private spawn(sec: number) {
    const kinds: ObKind[] = ['tender', 'hole'];
    if (sec > 8) kinds.push('wide', 'tall', 'hole');
    if (sec > 16) kinds.push('alert', 'alertHi', 'tall');
    if (sec > 35) kinds.push('alert', 'wide');
    const kind = pick(kinds);
    const o: Ob =
      kind === 'tender'
        ? { kind, x: W + 6, y: GROUND - 12, w: 9, h: 12, t: 0 }
        : kind === 'hole'
          ? { kind, x: W + 6, y: GROUND, w: 14 + randi(0, 6), h: 4, t: 0 }
          : kind === 'wide'
            ? { kind, x: W + 6, y: GROUND - 12, w: 20, h: 12, t: 0 }
            : kind === 'tall'
              ? { kind, x: W + 6, y: GROUND - 23, w: 11, h: 23, t: 0 }
              : kind === 'alert'
                ? { kind, x: W + 6, y: GROUND - 20, w: 11, h: 11, t: 0 }
                : { kind, x: W + 6, y: GROUND - 34, w: 11, h: 11, t: 0 };
    this.obs.push(o);
    // a heart arc over (or under) the obstacle
    if (Math.random() < 0.75) {
      const n = randi(3, 5);
      const low = kind === 'alertHi';
      const top = kind === 'hole' ? GROUND - 6 : o.y;
      for (let i = 0; i < n; i++) {
        const k = n === 1 ? 0.5 : i / (n - 1);
        const arc = Math.sin(k * Math.PI);
        this.hearts.push({ x: o.x + o.w / 2 + (k - 0.5) * 40, y: low ? GROUND - 6 : top - 8 - arc * 12, got: false });
      }
    }
    const gap = rand(78, 150) + this.speed * 14;
    this.nextOb = gap * (kind === 'wide' || kind === 'tall' ? 1.15 : 1);
  }

  private crash(hole: boolean) {
    const { fx } = this.api;
    this.dead = 56;
    this.vy = hole ? -1.6 : -3.2;
    this.onGround = false;
    this.api.sfx('error');
    fx.shake(5);
    fx.flash(6);
    fx.float(PX + 18, this.y - 22, hole ? 'POTHOLE!' : 'OOF', P.white);
    fx.burst(PX + 5, this.y - 6, P.pink, 22, 2.4);
    fx.burst(PX + 5, this.y - 6, P.light, 12, 1.8);
  }

  render(g: CanvasRenderingContext2D, t: number) {
    const sp = sprites();
    // dawn sky: deep ink at the top, lilac bands at the horizon
    rect(g, 0, HUD_H, W, GROUND - HUD_H, P.black);
    rect(g, 0, 52, W, 10, P.night);
    rect(g, 0, 62, W, 10, P.deep);
    rect(g, 0, 72, W, 54, P.graphite);
    for (let i = 0; i < 14; i++) {
      const sx = (i * 37 + 11) % W;
      const sy = HUD_H + 4 + ((i * 23) % 34);
      if ((t + i * 13) % 90 < 80) rect(g, sx, sy, 1, 1, i % 5 === 0 ? P.light : P.steel);
    }
    // the sun coming up over the city: pastel, banded
    const cx = 118;
    const cy = 88;
    const rr = 18;
    for (let dy = -rr; dy <= rr; dy++) {
      const yy = cy + dy;
      if (dy > 2 && (dy + (t >> 4)) % 4 === 0) continue;
      const half = Math.floor(Math.sqrt(rr * rr - dy * dy));
      rect(g, cx - half, yy, half * 2, 1, dy < -6 ? P.pinkLt : dy < 6 ? P.pink : P.pinkDk);
    }
    // parallax: the city ahead, then the houses and the elevated track
    const fy = GROUND - 70;
    g.drawImage(FAR!, -Math.floor(this.farX), fy);
    g.drawImage(FAR!, TILE - Math.floor(this.farX), fy);
    const my = GROUND - 44;
    // the train on the track (drawn between the layers' deck and pillars)
    const tx = Math.round(this.trainX);
    if (tx < W && tx > -90) {
      for (let k = 0; k < 3; k++) {
        const x0 = tx + k * 28;
        rect(g, x0, my + 1, 26, 7, P.light);
        rect(g, x0, my + 6, 26, 1, P.pink);
        for (let w = 0; w < 4; w++) rect(g, x0 + 3 + w * 6, my + 3, 3, 2, P.blue);
      }
    }
    g.drawImage(MID!, -Math.floor(this.midX), my);
    g.drawImage(MID!, TILE - Math.floor(this.midX), my);

    // the road
    rect(g, 0, GROUND, W, H - GROUND, P.night);
    rect(g, 0, GROUND, W, 1, P.alu2);
    rect(g, 0, GROUND + 1, W, 1, P.steel);
    const off = Math.floor(this.dist) % 16;
    for (let x = -off; x < W; x += 16) rect(g, x, GROUND + 8, 8, 1, P.butter);
    const off2 = Math.floor(this.dist * 1.2) % 7;
    for (let x = -off2; x < W; x += 7) rect(g, x, GROUND + 14, 1, 1, P.graphite);

    // potholes cut into the road
    for (const o of this.obs) {
      if (o.kind !== 'hole') continue;
      rect(g, o.x, GROUND, o.w, 1, P.black);
      rect(g, o.x + 1, GROUND + 1, o.w - 2, 3, P.black);
      rect(g, o.x + 3, GROUND + 4, o.w - 6, 2, P.black);
      rect(g, o.x - 1, GROUND, 1, 1, P.alu);
      rect(g, o.x + o.w, GROUND, 1, 1, P.alu);
    }

    // hearts
    for (const h of this.hearts) draw(g, sp.heart, h.x - 2, h.y - 2 + (blink(t + h.x, 10) ? 0 : 1));

    // tenders + alerts
    for (const o of this.obs) {
      if (o.kind === 'hole') continue;
      if (o.kind === 'tender') draw(g, sp.tender, o.x, o.y);
      else if (o.kind === 'wide') {
        draw(g, sp.tender, o.x, o.y);
        draw(g, sp.tender, o.x + 11, o.y);
      } else if (o.kind === 'tall') {
        draw(g, sp.tender, o.x + 2, o.y);
        draw(g, sp.tender, o.x, o.y + 11);
      } else {
        const flip = (o.t >> 2) % 2 === 0;
        draw(g, flip ? sp.alertB : sp.alertA, o.x, o.y + Math.sin(o.t * 0.15) * 1.5);
      }
    }
    // the first tender of a run is labelled, so the joke lands
    const first = this.obs.find((o) => o.kind === 'tender' || o.kind === 'wide');
    if (first && this.t < 60 * 14) text(g, '214P', first.x - 3, first.y - 9, { color: P.alu2 });

    for (const d of this.dust) rect(g, d.x, d.y, 1, 1, d.life > 5 ? P.alu2 : P.steel);

    // the commuter
    if (this.dead) {
      g.save();
      g.translate(PX + 5, this.y - 6);
      g.rotate(this.spin * 0.25);
      g.drawImage(sp.jump, -5, -6);
      g.restore();
    } else {
      const s = this.ducking ? sp.duck : !this.onGround ? sp.jump : (this.t >> 3) % 2 ? sp.runA : sp.runB;
      draw(g, s, PX, this.y - s.height);
    }
  }

  hud(g: CanvasRenderingContext2D) {
    const km = (this.dist / 500).toFixed(1);
    text(g, `${km}KM`, 80, 3, { color: P.alu2, align: 'center' });
  }
}

export const trendRunner: GameDef = {
  id: 'trend-runner',
  title: 'LINTAS RUNNER',
  short: 'RUNNER',
  how: ['COMMUTE BEKASI→JAKARTA', 'JUMP POTHOLES + TENDERS', 'DUCK THE DELAY ALERTS'],
  controls: ['A/↑ JUMP X2', '↓ DUCK'],
  threshold: 1200,
  create: (api) => new LintasRunner(api),
  icon(g, x, y, t) {
    const sp = sprites();
    const s = (t >> 3) % 2 ? sp.runA : sp.runB;
    g.drawImage(s, x, y - 2);
  },
};
