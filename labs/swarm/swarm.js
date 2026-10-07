/*
 * Agent Swarm: the simulation (no DOM, no drawing).
 *
 * Agents flock with boids rules plus noise. Tasks are spotted by agents in range, who gossip
 * about them to neighbours inside the gossip radius (messages travel, they are not instant).
 * The closest agent picks a task up and carries it to the hub, handing it to any neighbour that
 * is closer to the hub. Neighbour lookups go through a uniform spatial hash rebuilt every step.
 */

const TAU = Math.PI * 2;
export const TRAIL = 40; // points kept per task trail
const MAX_TASKS = 24;
const MAX_MESSAGES = 700;
const FANOUT = 4; // neighbours told per broadcast
const SEE_DEPTH = 2; // gossip hops after spotting a task
const CLAIM_DEPTH = 1; // gossip hops after picking one up

export const TASK_LABELS = [
  "parse PDF",
  "write tests",
  "summarise",
  "call API",
  "rank results",
  "review PR",
  "draft email",
  "embed docs",
  "fix bug",
  "translate",
  "classify",
  "fetch data",
  "OCR scan",
  "plan sprint",
  "dedupe rows",
  "tag images",
];

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const rand = (a, b) => a + Math.random() * (b - a);

/** Uniform grid with counting-sort buckets: O(n) rebuild, no allocation per frame. */
export class Grid {
  constructor(cell) {
    this.cell = cell;
    this.cols = 1;
    this.rows = 1;
    this.start = new Int32Array(2);
    this.cursor = new Int32Array(1);
    this.items = new Int32Array(0);
    this.cellOf = new Int32Array(0);
    this.agents = [];
  }

  build(agents, W, H) {
    const cell = this.cell;
    const cols = Math.max(1, Math.ceil(W / cell));
    const rows = Math.max(1, Math.ceil(H / cell));
    const cells = cols * rows;
    const n = agents.length;
    if (this.start.length < cells + 1) {
      this.start = new Int32Array(cells + 1);
      this.cursor = new Int32Array(cells);
    }
    if (this.items.length < n) {
      this.items = new Int32Array(n + 64);
      this.cellOf = new Int32Array(n + 64);
    }
    const start = this.start;
    start.fill(0, 0, cells + 1);
    for (let i = 0; i < n; i++) {
      const a = agents[i];
      const cx = clamp((a.x / cell) | 0, 0, cols - 1);
      const cy = clamp((a.y / cell) | 0, 0, rows - 1);
      const c = cy * cols + cx;
      this.cellOf[i] = c;
      start[c + 1]++;
    }
    for (let c = 0; c < cells; c++) start[c + 1] += start[c];
    this.cursor.set(start.subarray(0, cells));
    for (let i = 0; i < n; i++) this.items[this.cursor[this.cellOf[i]]++] = i;
    this.cols = cols;
    this.rows = rows;
    this.agents = agents;
  }

  /** Writes indices and squared distances of agents within r of (x, y). Returns the count. */
  query(x, y, r, out, outD) {
    const { cell, cols, rows, start, items, agents } = this;
    const x0 = clamp(Math.floor((x - r) / cell), 0, cols - 1);
    const x1 = clamp(Math.floor((x + r) / cell), 0, cols - 1);
    const y0 = clamp(Math.floor((y - r) / cell), 0, rows - 1);
    const y1 = clamp(Math.floor((y + r) / cell), 0, rows - 1);
    const r2 = r * r;
    const cap = out.length;
    let k = 0;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const c = cy * cols + cx;
        for (let s = start[c], e = start[c + 1]; s < e; s++) {
          const j = items[s];
          const b = agents[j];
          if (!b) continue;
          const dx = b.x - x;
          const dy = b.y - y;
          const d2 = dx * dx + dy * dy;
          if (d2 <= r2 && k < cap) {
            out[k] = j;
            outD[k] = d2;
            k++;
          }
        }
      }
    }
    return k;
  }
}

export class Swarm {
  constructor(onEvent = () => {}) {
    this.onEvent = onEvent;
    this.W = 0;
    this.H = 0;
    this.agents = [];
    this.tasks = [];
    this.messages = [];
    this.handoffs = [];
    this.sparkles = [];
    this.rings = [];
    this.floaters = [];
    this.gossipRadius = 70;
    this.chaos = 0.3;
    this.timeScale = 1;
    this.fx = true; // wobble and big bursts; off under reduced motion
    this.time = 0;
    this.msgCount = 0; // messages sent since the UI last sampled
    this.stats = { done: 0, hops: 0, secs: 0, messages: 0 };
    this.hub = { x: 0, base: 0, r: 40, cx: 0, cy: 0, cr: 36, wobble: 0, wobbleV: 0, glow: 0 };
    this.grid = new Grid(40);
    this.buf = new Int32Array(1024);
    this.bufD = new Float32Array(1024);
    this.gbuf = new Int32Array(1024);
    this.gbufD = new Float32Array(1024);
    this.nextId = 1;
    this.seq = 0;
    this.labelBag = [];
    this.agentR = 4.2;
    this.speed = 1;
    this.compact = false;
    this.visionScale = 1;
    /** Half the drawn width of a task sticker; the renderer replaces this with a real measure. */
    this.halfWidthOf = (label) => 30 + label.length * 4;
  }

  /* ---------- Setup ---------- */

  resize(W, H) {
    const oldW = this.W;
    const oldH = this.H;
    this.W = W;
    this.H = H;
    this.compact = W < 560;
    this.visionScale = clamp(Math.min(W, H) / 620, 0.68, 1);
    this.agentR = this.compact ? 3.7 : 4.3;
    this.speed = clamp(Math.min(W, H) / 560, 0.88, 1.15);
    this.layoutHub();
    if (oldW > 0 && oldH > 0 && (oldW !== W || oldH !== H)) {
      const sx = W / oldW;
      const sy = H / oldH;
      for (const a of this.agents) {
        a.x = clamp(a.x * sx, 4, W - 4);
        a.y = clamp(a.y * sy, 4, H - 4);
      }
      for (const t of this.tasks) {
        t.trailN = 0;
        if (t.state === "open") {
          const p = this.safePoint(t.x * sx, t.y * sy, this.halfWidthOf(t.label));
          t.x = p.x;
          t.y = p.y;
        }
      }
    }
  }

  layoutHub() {
    const { W, H, hub } = this;
    const r = clamp(Math.min(W, H) * 0.09, 30, 50);
    hub.r = r;
    hub.x = W / 2;
    hub.base = H - Math.max(16, r * 0.42);
    hub.cx = hub.x;
    hub.cy = hub.base - r * 0.42;
    hub.cr = r * 0.95;
  }

  makeAgent() {
    const id = this.nextId++;
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 20; tries++) {
      x = rand(12, this.W - 12);
      y = rand(12, this.H - 12);
      if (Math.hypot(x - this.hub.cx, y - this.hub.cy) > this.hub.cr + 40) break;
    }
    const ang = Math.random() * TAU;
    const v = 40 * this.speed;
    return {
      id,
      name: "A-" + String(id).padStart(3, "0"),
      x,
      y,
      vx: Math.cos(ang) * v,
      vy: Math.sin(ang) * v,
      wander: ang,
      size: rand(0.86, 1.14),
      task: null,
      carryT: 0,
      knows: null,
      knowT: 0,
      sendAt: -1,
      sendTask: null,
      sendDepth: 0,
      gave: null,
      gaveUntil: 0,
      flash: 0,
      dead: false,
      px: x,
      py: y,
      patrolT: rand(0, 6),
    };
  }

  /** Idle agents patrol: a loose personal waypoint keeps the whole sky covered. */
  newPatrol(a) {
    const { W, hub } = this;
    a.px = rand(30, W - 30);
    a.py = rand(30, Math.max(60, hub.cy - hub.cr - 50));
    a.patrolT = rand(5, 11);
  }

  reset(count) {
    for (const a of this.agents) a.dead = true;
    this.agents = [];
    this.tasks = [];
    this.messages = [];
    this.handoffs = [];
    this.sparkles = [];
    this.rings = [];
    this.floaters = [];
    this.stats = { done: 0, hops: 0, secs: 0, messages: 0 };
    this.msgCount = 0;
    this.nextId = 1;
    this.hub.wobble = 0;
    this.hub.wobbleV = 0;
    this.hub.glow = 0;
    this.setAgentCount(count);
  }

  setAgentCount(n) {
    const agents = this.agents;
    while (agents.length < n) agents.push(this.makeAgent());
    while (agents.length > n) {
      const a = agents.pop();
      a.dead = true;
      if (a.task) {
        // The task falls back on the board where its carrier left.
        const t = a.task;
        const p = this.safePoint(a.x, a.y);
        t.state = "open";
        t.carrier = null;
        t.x = p.x;
        t.y = p.y;
        t.age = 0;
      }
    }
    this.nextId = agents.length ? agents[agents.length - 1].id + 1 : 1;
    this.messages = this.messages.filter((m) => !m.from.dead && !m.to.dead);
    this.handoffs = this.handoffs.filter((h) => !h.to.dead);
  }

  /* ---------- Tasks ---------- */

  peekLabel() {
    if (!this.labelBag.length) this.refillBag();
    return this.labelBag[this.labelBag.length - 1];
  }

  refillBag() {
    const bag = TASK_LABELS.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    this.labelBag = bag;
  }

  nextColor() {
    return this.seq % 5;
  }

  openCount() {
    let n = 0;
    for (const t of this.tasks) if (t.state !== "done") n++;
    return n;
  }

  /** Keeps a point inside the stage and outside the hub's landing zone. */
  safePoint(x, y, half = 22) {
    const { W, H, hub } = this;
    const hx = Math.min(half, W / 2 - 4);
    x = clamp(x, hx, W - hx);
    y = clamp(y, 22, H - 22);
    const dx = x - hub.cx;
    const dy = y - hub.cy;
    const d = Math.hypot(dx, dy);
    const minD = hub.cr + 52;
    if (d < minD) {
      const ux = d > 0.01 ? dx / d : 0;
      const uy = d > 0.01 ? dy / d : -1;
      x = hub.cx + ux * minD;
      y = Math.min(hub.cy + uy * minD, hub.cy - hub.cr - 30);
      x = clamp(x, hx, W - hx);
      y = clamp(y, 22, H - 22);
    }
    return { x, y };
  }

  randomPoint() {
    const { W, hub } = this;
    const top = Math.min(78, this.H * 0.18);
    const bottom = Math.max(top + 20, hub.cy - hub.cr - 60);
    let best = null;
    let bestScore = -1;
    for (let i = 0; i < 24; i++) {
      const x = rand(Math.min(W * 0.08 + 40, W / 2), Math.max(W * 0.92 - 40, W / 2));
      const y = rand(top, bottom);
      // Prefer room around existing stickers (wide stickers count double sideways), then height.
      let nearest = 1e9;
      for (const t of this.tasks) {
        if (t.state !== "open") continue;
        nearest = Math.min(nearest, Math.hypot((t.x - x) * 0.5, t.y - y));
      }
      const score = Math.min(nearest, 160) + (hub.cy - y) * 0.06 + Math.random() * 10;
      if (score > bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
    return this.safePoint(best.x, best.y);
  }

  dropTask(x, y) {
    if (this.openCount() >= MAX_TASKS) return null;
    if (!this.labelBag.length) this.refillBag();
    const label = this.labelBag.pop();
    const p = this.safePoint(x, y, this.halfWidthOf(label));
    const color = this.nextColor();
    this.seq++;
    const task = {
      id: this.seq,
      label,
      color,
      x: p.x,
      y: p.y,
      state: "open",
      born: this.time,
      age: 0,
      pop: 0,
      tilt: rand(-0.16, 0.16),
      vision: 40,
      carrier: null,
      hops: 0,
      doneT: 0,
      fromX: 0,
      fromY: 0,
      trail: new Float32Array(TRAIL * 2),
      trailN: 0,
      trailHead: 0,
      trailT: 0,
    };
    this.tasks.push(task);
    this.burst(p.x, p.y, 7, color, 70);
    this.rings.push({ x: p.x, y: p.y, r0: 6, r1: 34, t: 0, dur: 0.6, color });
    this.onEvent("drop", { label, x: p.x, y: p.y });
    return task;
  }

  /* ---------- Knowledge and messages ---------- */

  learn(a, task, depth) {
    if (a.dead || a.task || task.state === "done" || a.knows === task) return false;
    if (a.gave === task && this.time < a.gaveUntil) return false;
    if (a.knows && a.knows.state === "open") {
      if (task.state !== "open") return false;
      const d1 = (a.x - a.knows.x) ** 2 + (a.y - a.knows.y) ** 2;
      const d2 = (a.x - task.x) ** 2 + (a.y - task.y) ** 2;
      if (d1 <= d2) return false;
    }
    a.knows = task;
    a.knowT = task.state === "open" ? 5 : 2.4;
    a.flash = 1;
    if (depth > 0) {
      a.sendTask = task;
      a.sendDepth = depth;
      a.sendAt = this.time + rand(0.1, 0.26);
    }
    return true;
  }

  broadcast(a) {
    const task = a.sendTask;
    const depth = a.sendDepth;
    a.sendAt = -1;
    a.sendTask = null;
    if (!task || task.state === "done" || depth <= 0) return;
    const R = this.gossipRadius;
    const k = this.grid.query(a.x, a.y, R, this.gbuf, this.gbufD);
    const agents = this.agents;
    // Pick the FANOUT nearest agents that do not know yet (tiny insertion sort).
    const pick = [];
    const pickD = [];
    for (let q = 0; q < k; q++) {
      const b = agents[this.gbuf[q]];
      if (b === a || b.task || b.knows === task || b.dead) continue;
      const d2 = this.gbufD[q];
      let at = pick.length;
      while (at > 0 && pickD[at - 1] > d2) at--;
      if (at >= FANOUT) continue;
      pick.splice(at, 0, b);
      pickD.splice(at, 0, d2);
      if (pick.length > FANOUT) {
        pick.pop();
        pickD.pop();
      }
    }
    for (let i = 0; i < pick.length; i++) {
      if (this.messages.length >= MAX_MESSAGES) break;
      const d = Math.sqrt(pickD[i]);
      this.messages.push({
        from: a,
        to: pick[i],
        task,
        t: 0,
        dur: 0.24 + d / 230,
        depth: depth - 1,
        bend: (Math.random() < 0.5 ? -1 : 1) * rand(0.14, 0.32),
      });
      this.msgCount++;
      this.stats.messages++;
    }
  }

  /* ---------- Task lifecycle ---------- */

  pickUp(task, a) {
    task.state = "carried";
    task.carrier = a;
    task.hops = 1;
    task.trailN = 0;
    a.task = task;
    a.carryT = 0;
    a.knows = null;
    a.flash = 1;
    a.sendTask = task;
    a.sendDepth = CLAIM_DEPTH;
    a.sendAt = this.time + 0.05;
    this.burst(task.x, task.y, 5, task.color, 50);
    this.onEvent("pickup", { agent: a.name, label: task.label });
  }

  handoff(task, from, to) {
    from.task = null;
    from.carryT = 0;
    from.gave = task;
    from.gaveUntil = this.time + 2.5;
    from.knows = null;
    to.task = task;
    to.carryT = 0;
    to.knows = null;
    to.flash = 1;
    to.sendTask = task;
    to.sendDepth = 1;
    to.sendAt = this.time + 0.08;
    task.carrier = to;
    task.hops++;
    this.handoffs.push({ task, fx: from.x, fy: from.y - this.agentR * 1.4 - 7, to, t: 0 });
    // One label per neighbourhood, so a busy relay does not stack labels.
    const crowded = this.floaters.some((f) => f.t < 0.6 && Math.abs(f.x - to.x) < 60 && Math.abs(f.y - to.y) < 26);
    if (!crowded) this.floaters.push({ x: to.x, y: to.y - 14, text: "+1 hop", t: 0, dur: 1 });
    this.onEvent("handoff", { id: task.id, from: from.name, to: to.name, label: task.label, hops: task.hops });
  }

  deliver(task) {
    const c = task.carrier;
    const hub = this.hub;
    c.task = null;
    c.carryT = 0;
    c.knows = null;
    const dx = c.x - hub.cx;
    const dy = c.y - hub.cy;
    const d = Math.hypot(dx, dy) || 1;
    c.vx = (dx / d) * 70 * this.speed;
    c.vy = (dy / d) * 70 * this.speed;
    task.state = "done";
    task.doneT = 0;
    task.carrier = null;
    task.fromX = c.x;
    task.fromY = c.y - this.agentR * 1.4 - 7;
    const secs = this.time - task.born;
    this.stats.done++;
    this.stats.hops += task.hops;
    this.stats.secs += secs;
    if (this.fx) hub.wobbleV += 7;
    hub.glow = 1;
    const top = hub.base - hub.r * 0.95;
    this.burst(hub.x, top, this.fx ? 14 : 6, task.color, this.fx ? 150 : 60, true);
    this.rings.push({ x: hub.x, y: hub.cy, r0: hub.r * 0.8, r1: hub.r * 2.1, t: 0, dur: 0.8, color: -1 });
    this.floaters.push({ x: hub.x, y: top - 14, text: "done!", t: 0, dur: 1.2 });
    this.onEvent("deliver", { agent: c.name, label: task.label, hops: task.hops, secs });
  }

  /* ---------- Effects ---------- */

  burst(x, y, n, color, speed, mixed = false) {
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU + rand(-0.3, 0.3);
      const v = speed * rand(0.45, 1);
      this.sparkles.push({
        x,
        y,
        vx: Math.cos(ang) * v,
        vy: Math.sin(ang) * v - (mixed ? 40 : 0),
        life: 0,
        dur: rand(0.55, 0.95),
        size: rand(3, mixed ? 7 : 5),
        rot: Math.random() * TAU,
        spin: rand(-4, 4),
        color: mixed ? (i % 3 === 0 ? -1 : i % 3 === 1 ? -2 : color) : color,
      });
    }
  }

  /* ---------- Step ---------- */

  update(dtReal) {
    const dt = Math.min(dtReal, 1 / 30) * this.timeScale;
    if (dt <= 0 || !this.W) return;
    this.time += dt;
    const now = this.time;
    const { agents, hub, W, H, buf, bufD } = this;
    const n = agents.length;
    this.grid.build(agents, W, H);

    const sp = this.speed;
    const maxV = 64 * sp;
    const minV = 18 * sp;
    const P = 38;
    const S = 12 + this.agentR;
    const S2 = S * S;
    const chaos = this.chaos;
    const margin = 44;

    for (let i = 0; i < n; i++) {
      const a = agents[i];
      if (a.knows && ((a.knowT -= dt) <= 0 || a.knows.state === "done")) a.knows = null;
      if (a.flash > 0) a.flash = Math.max(0, a.flash - dt * 2.2);
      if (a.sendAt >= 0 && now >= a.sendAt) this.broadcast(a);

      const k = this.grid.query(a.x, a.y, P, buf, bufD);
      let sx = 0;
      let sy = 0;
      let avx = 0;
      let avy = 0;
      let cx = 0;
      let cy = 0;
      let nc = 0;
      for (let q = 0; q < k; q++) {
        const j = buf[q];
        if (j === i) continue;
        const b = agents[j];
        nc++;
        avx += b.vx;
        avy += b.vy;
        cx += b.x;
        cy += b.y;
        const d2 = bufD[q];
        if (d2 < S2) {
          const d = Math.sqrt(d2) || 0.01;
          const f = (S - d) / S;
          sx += ((a.x - b.x) / d) * f;
          sy += ((a.y - b.y) / d) * f;
        }
      }

      const carrying = a.task !== null;
      let ax = 0;
      let ay = 0;
      const wSep = carrying ? 0.7 : 1;
      const wAli = carrying ? 0.25 : 1;
      const wCoh = carrying ? 0 : 1;
      ax += sx * 300 * wSep;
      ay += sy * 300 * wSep;
      if (nc) {
        ax += (avx / nc - a.vx) * 1.5 * wAli;
        ay += (avy / nc - a.vy) * 1.5 * wAli;
        ax += (cx / nc - a.x) * 1.6 * wCoh;
        ay += (cy / nc - a.y) * 1.6 * wCoh;
      }

      // Wandering noise, the "chaos" knob.
      a.wander += (Math.random() - 0.5) * (2 + chaos * 24) * dt;
      const wN = (carrying ? 0.35 : 1) * (14 + chaos * 160) * sp;
      ax += Math.cos(a.wander) * wN;
      ay += Math.sin(a.wander) * wN;
      if (chaos > 0) {
        ax += (Math.random() - 0.5) * chaos * 220 * sp;
        ay += (Math.random() - 0.5) * chaos * 220 * sp;
      }

      // Goals.
      let vmax = maxV;
      let tx = 0;
      let ty = 0;
      let w = 0;
      if (carrying) {
        tx = hub.cx;
        ty = hub.cy;
        w = 2.6;
        vmax = maxV * 0.85;
      } else if (a.knows) {
        const t = a.knows;
        if (t.state === "open") {
          tx = t.x;
          ty = t.y;
          w = 1.6;
          vmax = maxV * 1.08;
        } else if (t.state === "carried" && t.carrier) {
          // Escort: wait a little ahead of the carrier, on the way to the hub.
          const c = t.carrier;
          const dx = hub.cx - c.x;
          const dy = hub.cy - c.y;
          const d = Math.hypot(dx, dy) || 1;
          const lead = Math.min(52, d * 0.5);
          tx = c.x + (dx / d) * lead;
          ty = c.y + (dy / d) * lead;
          w = 0.55;
        }
      } else {
        a.patrolT -= dt;
        if (a.patrolT <= 0 || Math.abs(a.px - a.x) + Math.abs(a.py - a.y) < 40) this.newPatrol(a);
        tx = a.px;
        ty = a.py;
        w = 0.3;
      }
      if (w > 0) {
        const dx = tx - a.x;
        const dy = ty - a.y;
        const d = Math.hypot(dx, dy) || 1;
        ax += ((dx / d) * vmax - a.vx) * w;
        ay += ((dy / d) * vmax - a.vy) * w;
      }

      // Soft walls: a quadratic ramp, and the wander heading turns back toward the sky.
      let wall = false;
      if (a.x < margin) {
        const f = (margin - a.x) / margin;
        ax += f * f * 900 + f * 120;
        wall = true;
      } else if (a.x > W - margin) {
        const f = (a.x - (W - margin)) / margin;
        ax -= f * f * 900 + f * 120;
        wall = true;
      }
      if (a.y < margin) {
        const f = (margin - a.y) / margin;
        ay += f * f * 900 + f * 120;
        wall = true;
      } else if (a.y > H - margin) {
        const f = (a.y - (H - margin)) / margin;
        ay -= f * f * 900 + f * 120;
        wall = true;
      }
      if (wall) {
        const home = Math.atan2(H * 0.45 - a.y, W / 2 - a.x);
        let dA = home - a.wander;
        dA = Math.atan2(Math.sin(dA), Math.cos(dA));
        a.wander += dA * Math.min(1, dt * 4);
      }

      // Everyone but carriers gives the hub some room.
      if (!carrying) {
        const dx = a.x - hub.cx;
        const dy = a.y - hub.cy;
        const d = Math.hypot(dx, dy) || 0.01;
        const R = hub.cr + 18;
        if (d < R) {
          const f = (R - d) * 18;
          ax += (dx / d) * f;
          ay += (dy / d) * f;
        }
      }

      a.vx += ax * dt;
      a.vy += ay * dt;
      const v = Math.hypot(a.vx, a.vy);
      if (v > vmax) {
        a.vx *= vmax / v;
        a.vy *= vmax / v;
      } else if (v < minV) {
        if (v < 0.001) {
          a.vx = Math.cos(a.wander) * minV;
          a.vy = Math.sin(a.wander) * minV;
        } else {
          a.vx *= minV / v;
          a.vy *= minV / v;
        }
      }
      a.x += a.vx * dt;
      a.y += a.vy * dt;

      if (a.x < 3) {
        a.x = 3;
        a.vx = Math.abs(a.vx);
      } else if (a.x > W - 3) {
        a.x = W - 3;
        a.vx = -Math.abs(a.vx);
      }
      if (a.y < 3) {
        a.y = 3;
        a.vy = Math.abs(a.vy);
      } else if (a.y > H - 3) {
        a.y = H - 3;
        a.vy = -Math.abs(a.vy);
      }
      if (!carrying) {
        const dx = a.x - hub.cx;
        const dy = a.y - hub.cy;
        const d = Math.hypot(dx, dy) || 0.01;
        const R = hub.cr + this.agentR + 2;
        if (d < R) {
          a.x = hub.cx + (dx / d) * R;
          a.y = hub.cy + (dy / d) * R;
        }
      }
    }

    // Tasks: spotting, pickup, handoffs and delivery.
    const pickR2 = (this.agentR + 9) ** 2;
    const handR = 26;
    const tasks = this.tasks;
    for (let i = tasks.length - 1; i >= 0; i--) {
      const task = tasks[i];
      task.age += dt;
      if (task.pop < 1) task.pop = Math.min(1, task.pop + dt / 0.5);

      if (task.state === "open") {
        // An unclaimed task "calls louder" the longer it waits.
        task.vision = (40 + Math.min(task.age, 10) * 11) * this.visionScale;
        const k = this.grid.query(task.x, task.y, task.vision, buf, bufD);
        let best = null;
        let bestD = pickR2;
        for (let q = 0; q < k; q++) {
          const a = agents[buf[q]];
          if (a.task || a.dead) continue;
          if (a.knows !== task) this.learn(a, task, SEE_DEPTH);
          if (bufD[q] < bestD) {
            bestD = bufD[q];
            best = a;
          }
        }
        if (best) this.pickUp(task, best);
      } else if (task.state === "carried") {
        const c = task.carrier;
        c.carryT += dt;
        task.x = c.x;
        task.y = c.y;
        task.trailT += dt;
        if (task.trailT > 0.05) {
          task.trailT = 0;
          const h = task.trailHead;
          task.trail[h * 2] = c.x;
          task.trail[h * 2 + 1] = c.y;
          task.trailHead = (h + 1) % TRAIL;
          if (task.trailN < TRAIL) task.trailN++;
        }
        const dC = Math.hypot(c.x - hub.cx, c.y - hub.cy);
        if (dC < hub.cr + this.agentR + 2) {
          this.deliver(task);
          continue;
        }
        if (c.carryT > 1.25) {
          const k = this.grid.query(c.x, c.y, handR, buf, bufD);
          let best = null;
          let bestD = dC - 20;
          for (let q = 0; q < k; q++) {
            const b = agents[buf[q]];
            if (b === c || b.task || b.dead) continue;
            if (b.gave === task && now < b.gaveUntil) continue;
            const dB = Math.hypot(b.x - hub.cx, b.y - hub.cy);
            if (dB < bestD) {
              bestD = dB;
              best = b;
            }
          }
          if (best) this.handoff(task, c, best);
        }
      } else if (task.state === "done") {
        task.doneT += dt;
        if (task.doneT > 0.55) tasks.splice(i, 1);
      }
    }

    // Messages in flight.
    const msgs = this.messages;
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      m.t += dt / m.dur;
      if (m.t >= 1 || m.from.dead || m.to.dead) {
        if (m.t >= 1 && !m.to.dead) this.learn(m.to, m.task, m.depth);
        msgs[i] = msgs[msgs.length - 1];
        msgs.pop();
      }
    }

    for (let i = this.handoffs.length - 1; i >= 0; i--) {
      const h = this.handoffs[i];
      h.t += dt / 0.42;
      if (h.t >= 1) this.handoffs.splice(i, 1);
    }

    const drag = Math.pow(0.9, dt * 60);
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const s = this.sparkles[i];
      s.life += dt;
      if (s.life >= s.dur) {
        this.sparkles.splice(i, 1);
        continue;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= drag;
      s.vy *= drag;
      s.vy += 30 * dt;
      s.rot += s.spin * dt;
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.t += dt / r.dur;
      if (r.t >= 1) this.rings.splice(i, 1);
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.t += dt / f.dur;
      if (f.t >= 1) this.floaters.splice(i, 1);
    }

    // The hub is a jelly: a damped spring.
    hub.wobbleV += (-190 * hub.wobble - 8 * hub.wobbleV) * dt;
    hub.wobble += hub.wobbleV * dt;
    hub.glow = Math.max(0, hub.glow - dt * 1.4);
  }
}
