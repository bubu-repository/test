/*
 * Agent Swarm: canvas renderer.
 * Flat and calm, like adelia.cc: a plain paper stage, small dots, hairlines and one magenta accent.
 * Every colour and the type face come from the design tokens at runtime (lab.token), re-read
 * whenever the theme changes. Agents and task chips are pre-rendered to small sprites so a frame
 * is mostly drawImage.
 */
import { TRAIL } from "./swarm.js";

const TAU = Math.PI * 2;

/* ---------- Color helpers (tokens arrive as hex or rgb/rgba strings) ---------- */
function parseColor(str) {
  const s = (str || "").trim();
  let m = s.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = h.split("").map((c) => c + c).join("");
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    };
  }
  m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  return { r: 128, g: 128, b: 128, a: 1 };
}
const mix = (a, b, t) => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t, a: 1 });
const css = (c, alpha = 1) => `rgba(${c.r | 0},${c.g | 0},${c.b | 0},${(alpha * (c.a ?? 1)).toFixed(3)})`;

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

const FALLBACK_FONT = '"Mona Sans Variable", "Mona Sans", ui-sans-serif, system-ui, sans-serif';

export class Renderer {
  constructor(canvas, swarm, lab) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.swarm = swarm;
    this.lab = lab;
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.showMessages = true;
    this.fx = true;
    this.hover = null;
    this.previewUntil = 0;
    this.chips = new Map();
    this.spriteKey = "";
    this.scratch = document.createElement("canvas").getContext("2d");
    this.readTheme();
  }

  setSize(w, h, dpr) {
    this.w = w;
    this.h = h;
    const W = Math.round(w * dpr);
    const H = Math.round(h * dpr);
    if (this.canvas.width !== W) this.canvas.width = W;
    if (this.canvas.height !== H) this.canvas.height = H;
    if (dpr !== this.dpr) {
      this.dpr = dpr;
      this.chips.clear();
    }
    this.ensureSprites();
  }

  readTheme() {
    const lab = this.lab;
    const t = (name) => parseColor(lab.token(name));
    this.dark = lab.theme === "dark";
    const ink = t("--ink");
    const bg = t("--surface-2");
    const line = t("--line");
    this.c = {
      bg, // the stage: the same plain grey as every card
      ink,
      line,
      surface: t("--surface"),
      accent: t("--accent"),
      accentStrong: t("--accent-strong"),
      onAccent: t("--on-accent"),
      cobalt: t("--cobalt"),
      sun: t("--sun"),
      lime: t("--lime"),
      mint: t("--mint"),
      sky: t("--sky"),
      violet: t("--violet"),
    };
    // Chips (tasks, the count badge) sit one step above the stage, with a firmer hairline.
    this.c.chip = this.dark ? mix(bg, ink, 0.07) : this.c.surface;
    this.c.chipLine = mix(line, ink, this.dark ? 0.14 : 0.12);
    this.font = lab.token("--font-body") || FALLBACK_FONT;
    this.taskColors = [this.c.sun, this.c.lime, this.c.mint, this.c.sky, this.c.violet];
    this.chips.clear();
    this.spriteKey = "";
    this.ensureSprites();
  }

  fontsChanged() {
    this.chips.clear();
  }

  /** Task colours are small accents: on white paper they get a little ink so they still read. */
  dotColor(col) {
    return this.dark ? col : mix(col, this.c.ink, 0.16);
  }

  /** Lines and rings in a task colour need more ink on the light stage. */
  lineColor(col) {
    return this.dark ? col : mix(col, this.c.ink, 0.38);
  }

  /* ---------- Sprites ---------- */

  sprite(w, h, draw) {
    const s = this.dpr * 1.5;
    const c = document.createElement("canvas");
    c.width = Math.ceil(w * s);
    c.height = Math.ceil(h * s);
    const g = c.getContext("2d");
    g.scale(s, s);
    draw(g, s);
    return { c, w, h };
  }

  /** A flat dot. Carriers get a thin ink ring with a gap of stage colour. */
  dot(R, color, ring) {
    const { bg, ink } = this.c;
    const pad = ring ? 4 : 1;
    const size = (R + pad) * 2;
    return this.sprite(size, size, (g) => {
      const c = size / 2;
      if (ring) {
        g.fillStyle = css(ink);
        g.beginPath();
        g.arc(c, c, R + 3, 0, TAU);
        g.fill();
        g.fillStyle = css(bg);
        g.beginPath();
        g.arc(c, c, R + 1.6, 0, TAU);
        g.fill();
      }
      g.fillStyle = css(color);
      g.beginPath();
      g.arc(c, c, R, 0, TAU);
      g.fill();
    });
  }

  ensureSprites() {
    const R = this.swarm.agentR;
    const key = `${R}|${this.dpr}|${this.dark}`;
    if (key === this.spriteKey) return;
    this.spriteKey = key;
    const { accent, cobalt } = this.c;
    this.spr = {
      idle: this.dot(R, accent, false),
      informed: this.dot(R, cobalt, false),
      carrier: this.dot(R * 1.1, accent, true),
    };
  }

  chipMetrics(label) {
    const fs = this.swarm.compact ? 11 : 12;
    const font = `600 ${fs}px ${this.font}`;
    this.scratch.font = font;
    const tw = Math.ceil(this.scratch.measureText(label).width);
    const h = fs + 13;
    const padX = 10;
    const dot = 7;
    const gap = 6;
    return { fs, font, tw, h, padX, dot, gap, w: padX + dot + gap + tw + padX };
  }

  /** Half the chip's width plus a margin, used to keep chips on stage. */
  chipHalf(label) {
    return this.chipMetrics(label).w / 2 + 6;
  }

  /** A task: a flat pill with a small colour dot and the label in the body face. */
  chip(label, colorIdx) {
    const key = label + "|" + colorIdx + "|" + this.swarm.compact;
    let s = this.chips.get(key);
    if (s) return s;
    const { chip, chipLine, ink } = this.c;
    const color = this.dotColor(this.taskColors[colorIdx]);
    const m = this.chipMetrics(label);
    const sp = 2;
    s = this.sprite(m.w + sp * 2, m.h + sp * 2, (g) => {
      const x0 = sp;
      const y0 = sp;
      roundRect(g, x0, y0, m.w, m.h, m.h / 2);
      g.fillStyle = css(chip);
      g.fill();
      roundRect(g, x0 + 0.5, y0 + 0.5, m.w - 1, m.h - 1, (m.h - 1) / 2);
      g.lineWidth = 1;
      g.strokeStyle = css(chipLine);
      g.stroke();
      g.fillStyle = css(color);
      g.beginPath();
      g.arc(x0 + m.padX + m.dot / 2, y0 + m.h / 2, m.dot / 2, 0, TAU);
      g.fill();
      g.font = m.font;
      g.textBaseline = "middle";
      g.fillStyle = css(ink);
      g.fillText(label, x0 + m.padX + m.dot + m.gap, y0 + m.h / 2 + 0.5);
    });
    this.chips.set(key, s);
    return s;
  }

  /* ---------- Frame ---------- */

  draw(realNow) {
    const { ctx } = this;
    if (!this.w || !this.h) return;
    this.ensureSprites();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = css(this.c.bg);
    ctx.fillRect(0, 0, this.w, this.h);
    this.drawLanding();
    this.drawVision();
    if (this.showMessages) this.drawMessages();
    if (this.fx) {
      this.drawTails();
      this.drawTrails();
    }
    this.drawPreview(realNow);
    this.drawAgents();
    this.drawHub();
    this.drawOpenTasks();
    this.drawCarried();
    this.drawRings();
    this.drawBits();
    this.drawFloaters();
    this.drawHover();
  }

  /** A thin dashed arch over the hub: where carriers deliver. */
  drawLanding() {
    const { ctx } = this;
    const hub = this.swarm.hub;
    ctx.save();
    ctx.setLineDash([2, 6]);
    ctx.lineDashOffset = this.fx ? -this.swarm.time * 8 : 0;
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = css(this.c.accent, this.dark ? 0.55 : 0.45);
    ctx.beginPath();
    ctx.arc(hub.cx, hub.cy, hub.cr + 16, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    ctx.restore();
  }

  drawVision() {
    const { ctx, swarm: S } = this;
    const t = S.time;
    for (const task of S.tasks) {
      if (task.state !== "open") continue;
      const col = this.taskColors[task.color];
      const lc = this.lineColor(col);
      ctx.fillStyle = css(col, this.dark ? 0.06 : 0.1);
      ctx.beginPath();
      ctx.arc(task.x, task.y, task.vision, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.setLineDash([3, 5]);
      ctx.lineDashOffset = this.fx ? t * 6 : 0;
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = css(lc, this.dark ? 0.55 : 0.45);
      ctx.beginPath();
      ctx.arc(task.x, task.y, task.vision, 0, TAU);
      ctx.stroke();
      ctx.restore();
      if (this.fx) {
        const p = ((t + task.id * 0.37) % 2) / 2;
        ctx.lineWidth = 1.25;
        ctx.strokeStyle = css(lc, (1 - p) * 0.3);
        ctx.beginPath();
        ctx.arc(task.x, task.y, 10 + (task.vision - 10) * easeOut(p), 0, TAU);
        ctx.stroke();
      }
    }
  }

  drawMessages() {
    const { ctx, swarm: S } = this;
    const msgs = S.messages;
    if (!msgs.length) return;
    const col = this.c.cobalt;
    const wires = new Path2D();
    const comets = new Path2D();
    const heads = new Path2D();
    for (const m of msgs) {
      const ax = m.from.x;
      const ay = m.from.y;
      const bx = m.to.x;
      const by = m.to.y;
      const dx = bx - ax;
      const dy = by - ay;
      const px = (ax + bx) / 2 - dy * m.bend;
      const py = (ay + by) / 2 + dx * m.bend;
      wires.moveTo(ax, ay);
      wires.quadraticCurveTo(px, py, bx, by);
      // Comet: the sub-curve from t0 to t1 via blossoming.
      const t1 = Math.min(1, m.t);
      const t0 = Math.max(0, t1 - 0.38);
      const b = (u, v, p0, p1, p2) => (1 - u) * (1 - v) * p0 + ((1 - u) * v + u * (1 - v)) * p1 + u * v * p2;
      const q0x = b(t0, t0, ax, px, bx);
      const q0y = b(t0, t0, ay, py, by);
      const q1x = b(t0, t1, ax, px, bx);
      const q1y = b(t0, t1, ay, py, by);
      const q2x = b(t1, t1, ax, px, bx);
      const q2y = b(t1, t1, ay, py, by);
      comets.moveTo(q0x, q0y);
      comets.quadraticCurveTo(q1x, q1y, q2x, q2y);
      heads.moveTo(q2x + 2.2, q2y);
      heads.arc(q2x, q2y, 2.2, 0, TAU);
    }
    ctx.lineCap = "round";
    ctx.lineWidth = 1;
    ctx.strokeStyle = css(col, this.dark ? 0.2 : 0.14);
    ctx.stroke(wires);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = css(col, 0.75);
    ctx.stroke(comets);
    ctx.fillStyle = css(col);
    ctx.fill(heads);
  }

  drawTails() {
    const { ctx, swarm: S } = this;
    const idle = new Path2D();
    const inf = new Path2D();
    const k = 0.1;
    for (const a of S.agents) {
      if (a.task) continue;
      const p = a.knows ? inf : idle;
      p.moveTo(a.x, a.y);
      p.lineTo(a.x - a.vx * k, a.y - a.vy * k);
    }
    ctx.lineCap = "round";
    ctx.lineWidth = S.agentR * 1.2;
    ctx.strokeStyle = css(this.c.accent, this.dark ? 0.22 : 0.16);
    ctx.stroke(idle);
    ctx.strokeStyle = css(this.c.cobalt, this.dark ? 0.26 : 0.18);
    ctx.stroke(inf);
  }

  drawTrails() {
    const { ctx, swarm: S } = this;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const task of S.tasks) {
      if (task.trailN < 2 || task.state === "open") continue;
      const col = this.lineColor(this.taskColors[task.color]);
      const n = task.trailN;
      const head = task.trailHead;
      const fade = task.state === "done" ? 1 - Math.min(1, task.doneT / 0.55) : 1;
      // Four chunks, older chunks fainter.
      const chunks = 4;
      for (let cIdx = 0; cIdx < chunks; cIdx++) {
        const from = Math.floor((cIdx * (n - 1)) / chunks);
        const to = Math.floor(((cIdx + 1) * (n - 1)) / chunks);
        if (to <= from) continue;
        const path = new Path2D();
        for (let i = from; i <= to; i++) {
          const idx = (head - n + i + TRAIL * 2) % TRAIL;
          const x = task.trail[idx * 2];
          const y = task.trail[idx * 2 + 1];
          if (i === from) path.moveTo(x, y);
          else path.lineTo(x, y);
        }
        const a = ((cIdx + 1) / chunks) * fade;
        ctx.lineWidth = 5;
        ctx.strokeStyle = css(this.c.bg, 0.8 * a);
        ctx.stroke(path);
        ctx.lineWidth = 2;
        ctx.strokeStyle = css(col, 0.8 * a);
        ctx.stroke(path);
      }
    }
  }

  /** Small canvas text with a halo of stage colour, so it reads over agents and lines. */
  label(text, x, y, color, alpha = 1, weight = 600) {
    const { ctx } = this;
    ctx.font = `${weight} 11px ${this.font}`;
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = css(this.c.bg, 0.9 * alpha);
    ctx.strokeText(text, x, y);
    ctx.fillStyle = css(color, alpha);
    ctx.fillText(text, x, y);
  }

  drawPreview(realNow) {
    if (realNow >= this.previewUntil) return;
    const { ctx, swarm: S } = this;
    if (!S.agents.length) return;
    // The agent closest to the middle of the stage shows its gossip radius.
    let best = S.agents[0];
    let bd = Infinity;
    const mx = this.w / 2;
    const my = this.h * 0.42;
    for (const a of S.agents) {
      const d = (a.x - mx) ** 2 + (a.y - my) ** 2;
      if (d < bd) {
        bd = d;
        best = a;
      }
    }
    const left = (this.previewUntil - realNow) / 1600;
    const alpha = Math.min(1, left * 2.5);
    const R = S.gossipRadius;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = css(this.c.cobalt, 0.07);
    ctx.strokeStyle = css(this.c.cobalt, 0.7);
    ctx.lineWidth = 1.25;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(best.x, best.y, R, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    this.label(`Gossip radius ${Math.round(R)} px`, best.x, best.y - R - 5, this.dark ? this.c.ink : this.c.cobalt);
    ctx.restore();
  }

  drawAgents() {
    const { ctx, swarm: S, spr } = this;
    const flashes = [];
    for (const a of S.agents) {
      let s = spr.idle;
      if (a.task) s = spr.carrier;
      else if (a.knows) s = spr.informed;
      const k = a.size;
      const w = s.w * k;
      const h = s.h * k;
      if (s === spr.informed && a.knowT < 1) {
        ctx.drawImage(spr.idle.c, a.x - (spr.idle.w * k) / 2, a.y - (spr.idle.h * k) / 2, spr.idle.w * k, spr.idle.h * k);
        ctx.globalAlpha = Math.max(0, a.knowT);
        ctx.drawImage(s.c, a.x - w / 2, a.y - h / 2, w, h);
        ctx.globalAlpha = 1;
      } else {
        ctx.drawImage(s.c, a.x - w / 2, a.y - h / 2, w, h);
      }
      if (a.flash > 0.02) flashes.push(a);
    }
    if (this.showMessages && flashes.length) {
      ctx.lineWidth = 1.25;
      for (const a of flashes) {
        const r = S.agentR * a.size + 2 + (1 - a.flash) * 7;
        ctx.strokeStyle = css(a.task ? this.c.accent : this.c.cobalt, a.flash * 0.55);
        ctx.beginPath();
        ctx.arc(a.x, a.y, r, 0, TAU);
        ctx.stroke();
      }
    }
  }

  /** The Done hub: a flat magenta half disc on a hairline, with a count chip on its shoulder. */
  drawHub() {
    const { ctx, swarm: S } = this;
    const { accentStrong, onAccent, chip, chipLine, ink, accent } = this.c;
    const hub = S.hub;
    const R = hub.r;
    const x = hub.x;
    const base = Math.round(hub.base);

    ctx.fillStyle = css(chipLine);
    ctx.fillRect(x - R * 1.7, base, R * 3.4, 1);

    ctx.beginPath();
    ctx.moveTo(x - R, base);
    ctx.arc(x, base, R, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = css(accentStrong);
    ctx.fill();

    ctx.font = `600 ${R > 40 ? 13 : 11}px ${this.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = css(onAccent);
    ctx.fillText("Done", x, base - R * 0.38);

    // Count chip: hairline turns magenta for a moment after each delivery.
    const label = String(S.stats.done);
    ctx.font = `700 ${R > 40 ? 12 : 11}px ${this.font}`;
    const tw = ctx.measureText(label).width;
    const bh = R > 40 ? 22 : 20;
    const bw = Math.max(bh, tw + 14);
    const bx = Math.round(x + R * 0.76);
    const by = Math.round(base - R * 0.8);
    roundRect(ctx, bx - bw / 2, by - bh / 2, bw, bh, bh / 2);
    ctx.fillStyle = css(chip);
    ctx.fill();
    roundRect(ctx, bx - bw / 2 + 0.5, by - bh / 2 + 0.5, bw - 1, bh - 1, (bh - 1) / 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = css(hub.glow > 0.01 ? mix(chipLine, accent, Math.min(1, hub.glow * 1.5)) : chipLine);
    ctx.stroke();
    ctx.fillStyle = css(ink);
    ctx.fillText(label, bx, by + 0.5);
  }

  drawOpenTasks() {
    const { ctx, swarm: S } = this;
    for (const task of S.tasks) {
      if (task.state !== "open") continue;
      const s = this.chip(task.label, task.color);
      const p = task.pop;
      const scale = this.fx ? 0.92 + 0.08 * easeOut(p) : 1;
      ctx.save();
      ctx.globalAlpha = this.fx ? Math.min(1, p * 2.5) : p;
      ctx.translate(Math.round(task.x), Math.round(task.y));
      if (scale !== 1) ctx.scale(scale, scale);
      ctx.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h);
      ctx.restore();
    }
  }

  /** A carried task is a small square in its colour riding just above the carrier. */
  drawCarried() {
    const { ctx, swarm: S } = this;
    const lift = S.agentR * 1.4 + 7;
    const size = S.compact ? 7 : 8;
    ctx.lineWidth = 1;
    for (const task of S.tasks) {
      let x;
      let y;
      let scale = 1;
      if (task.state === "carried") {
        const c = task.carrier;
        x = c.x;
        y = c.y - lift;
        const h = S.handoffs.find((hh) => hh.task === task);
        if (h) {
          const e = easeInOut(h.t);
          const tx = x;
          const ty = y;
          const mx = (h.fx + tx) / 2;
          const my = Math.min(h.fy, ty) - 22;
          x = (1 - e) * (1 - e) * h.fx + 2 * (1 - e) * e * mx + e * e * tx;
          y = (1 - e) * (1 - e) * h.fy + 2 * (1 - e) * e * my + e * e * ty;
          // The arc it travels along.
          ctx.save();
          ctx.setLineDash([3, 4]);
          ctx.lineWidth = 1.5;
          ctx.lineCap = "round";
          ctx.strokeStyle = css(this.lineColor(this.taskColors[task.color]), (1 - h.t) * 0.85);
          ctx.beginPath();
          ctx.moveTo(h.fx, h.fy);
          ctx.quadraticCurveTo(mx, my, tx, ty);
          ctx.stroke();
          ctx.restore();
        }
      } else if (task.state === "done") {
        if (task.doneT > 0.45) continue;
        const hub = S.hub;
        const e = easeInOut(Math.min(1, task.doneT / 0.45));
        x = task.fromX + (hub.x - task.fromX) * e;
        y = task.fromY + (hub.base - hub.r * 0.5 - task.fromY) * e;
        scale = 1 - e * 0.85;
      } else {
        continue;
      }
      const z = size * scale;
      roundRect(ctx, x - z / 2, y - z / 2, z, z, Math.min(2.5, z / 2));
      ctx.fillStyle = css(this.dotColor(this.taskColors[task.color]));
      ctx.fill();
      ctx.strokeStyle = css(this.c.ink, 0.8);
      ctx.stroke();
    }
  }

  drawRings() {
    const { ctx, swarm: S } = this;
    for (const r of S.rings) {
      const e = easeOut(r.t);
      const col = r.color === -1 ? this.c.accent : this.lineColor(this.taskColors[r.color]);
      ctx.lineWidth = 1.5 * (1 - r.t) + 0.5;
      ctx.strokeStyle = css(col, (1 - r.t) * 0.6);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * e, 0, TAU);
      ctx.stroke();
    }
  }

  /** The simulation's little bursts, drawn as small flat dots that fade out. */
  drawBits() {
    const { ctx, swarm: S } = this;
    for (const s of S.sparkles) {
      const p = s.life / s.dur;
      const a = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
      const col = s.color < 0 ? this.c.accent : this.lineColor(this.taskColors[s.color]);
      ctx.fillStyle = css(col, a * 0.75);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 0.32 * (0.6 + 0.4 * (1 - p)), 0, TAU);
      ctx.fill();
    }
  }

  drawFloaters() {
    const { ctx, swarm: S } = this;
    if (!S.floaters.length) return;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const f of S.floaters) {
      const e = easeOut(f.t);
      const a = f.t < 0.7 ? 1 : 1 - (f.t - 0.7) / 0.3;
      this.label(f.text, f.x, f.y - e * 16, this.c.ink, a);
    }
  }

  drawHover() {
    const h = this.hover;
    if (!h) return;
    const { ctx, swarm: S } = this;
    const s = this.chip(S.peekLabel(), S.nextColor());
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.translate(Math.round(h.x), Math.round(h.y));
    ctx.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h);
    ctx.restore();
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = css(this.c.accent, 0.7);
    ctx.beginPath();
    ctx.arc(h.x, h.y, 26, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}
