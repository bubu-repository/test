/*
 * Thread on canvas: runs of stitches drawn as short, shaded thread segments (a shadow, the
 * thread's body, a sheen line and the twist of the plies), batched into one path per layer so
 * thousands of stitches stay cheap.
 */

import { css, shade, type Path, type RGB, type Vec3 } from "./core";

export type Stitch = Float32Array; // polyline [x0, y0, x1, y1, ...]

export type ThreadStyle = {
  width: number;
  color: RGB;
  L: Vec3;
  /** How dark the needle holes at both ends are (0..1). */
  holes?: number;
  /** Shadow opacity under the thread. */
  shadow?: number;
  /** Shadow colour (defaults to a dark shade of the thread's ground). */
  shadowColor?: RGB;
  /** Draw the ply twist. */
  twist?: boolean;
  /** Sheen strength 0..1. */
  sheen?: number;
};

function trace(ctx: CanvasRenderingContext2D, s: Stitch, ox: number, oy: number) {
  ctx.moveTo(s[0] + ox, s[1] + oy);
  for (let i = 2; i < s.length; i += 2) ctx.lineTo(s[i] + ox, s[i + 1] + oy);
}

/** Draws stitches (each a short polyline) as shaded thread. */
export function drawStitches(ctx: CanvasRenderingContext2D, stitches: Stitch[], st: ThreadStyle) {
  const w = st.width;
  const [lx, ly] = st.L;
  const ll = Math.hypot(lx, ly) || 1;
  const ux = lx / ll;
  const uy = ly / ll;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Needle holes: the felt or cloth dimples where the thread dives in.
  if (st.holes) {
    ctx.fillStyle = css(st.shadowColor ?? [8, 40, 80], st.holes);
    ctx.beginPath();
    for (const s of stitches) {
      const n = s.length;
      for (const [x, y] of [
        [s[0], s[1]],
        [s[n - 2], s[n - 1]],
      ]) {
        ctx.moveTo(x + w * 0.62, y);
        ctx.arc(x, y, w * 0.62, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }
  // Shadow, away from the light.
  ctx.strokeStyle = css(st.shadowColor ?? [8, 40, 80], st.shadow ?? 0.35);
  ctx.lineWidth = w * 1.15;
  ctx.beginPath();
  for (const s of stitches) trace(ctx, s, -ux * w * 0.45, -uy * w * 0.45 + w * 0.2);
  ctx.stroke();
  // Body: a darker rim, then the thread colour.
  ctx.strokeStyle = css(shade(st.color, -0.16));
  ctx.lineWidth = w;
  ctx.beginPath();
  for (const s of stitches) trace(ctx, s, 0, 0);
  ctx.stroke();
  ctx.strokeStyle = css(st.color);
  ctx.lineWidth = w * 0.68;
  ctx.beginPath();
  for (const s of stitches) trace(ctx, s, 0, 0);
  ctx.stroke();
  // Twist of the plies: short slanted marks across the thread.
  if (st.twist !== false && w >= 2) {
    ctx.strokeStyle = css(shade(st.color, -0.25), 0.45);
    ctx.lineWidth = Math.max(0.6, w * 0.16);
    ctx.lineCap = "butt";
    ctx.beginPath();
    const step = w * 0.95;
    for (const s of stitches) {
      for (let i = 0; i + 2 < s.length; i += 2) {
        const x0 = s[i];
        const y0 = s[i + 1];
        const dx = s[i + 2] - x0;
        const dy = s[i + 3] - y0;
        const len = Math.hypot(dx, dy);
        if (len < 1e-3) continue;
        const tx = dx / len;
        const ty = dy / len;
        const nx = -ty;
        const ny = tx;
        for (let d = step * 0.6; d < len - step * 0.3; d += step) {
          const cx = x0 + tx * d;
          const cy = y0 + ty * d;
          ctx.moveTo(cx - nx * w * 0.42 - tx * w * 0.28, cy - ny * w * 0.42 - ty * w * 0.28);
          ctx.lineTo(cx + nx * w * 0.42 + tx * w * 0.28, cy + ny * w * 0.42 + ty * w * 0.28);
        }
      }
    }
    ctx.stroke();
    ctx.lineCap = "round";
  }
  // Sheen: a thin bright line on the side facing the light.
  const sheen = st.sheen ?? 0.6;
  if (sheen > 0) {
    ctx.strokeStyle = css(shade(st.color, 0.3), sheen);
    ctx.lineWidth = Math.max(0.6, w * 0.22);
    ctx.beginPath();
    for (const s of stitches) {
      // Shorten a little so the sheen doesn't reach the holes.
      const n = s.length;
      if (n < 4) continue;
      const sx = s[0] * 0.85 + s[n - 2] * 0.15;
      const sy = s[1] * 0.85 + s[n - 1] * 0.15;
      const ex = s[0] * 0.15 + s[n - 2] * 0.85;
      const ey = s[1] * 0.15 + s[n - 1] * 0.85;
      if (n === 4) {
        ctx.moveTo(sx + ux * w * 0.18, sy + uy * w * 0.18);
        ctx.lineTo(ex + ux * w * 0.18, ey + uy * w * 0.18);
      } else {
        const ox = ux * w * 0.18;
        const oy = uy * w * 0.18;
        const k0 = 2;
        const k1 = n - 4;
        ctx.moveTo(s[k0] + ox, s[k0 + 1] + oy);
        for (let i = k0 + 2; i <= k1; i += 2) ctx.lineTo(s[i] + ox, s[i + 1] + oy);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Cuts paths into a running stitch: dashes of `dash` px separated by gaps of `gap` px, each dash a
 * polyline following the path. Returns the dashes.
 */
export function runningStitch(paths: Path[], dash: number, gap: number, offset = 0): Stitch[] {
  const out: Stitch[] = [];
  for (const p of paths) {
    const a = p.pts;
    const n = a.length / 2;
    if (n < 3) continue;
    // Arc length at each vertex.
    const segs = p.closed ? n : n - 1;
    let total = 0;
    const cum = new Float32Array(segs + 1);
    for (let i = 0; i < segs; i++) {
      const j = (i + 1) % n;
      total += Math.hypot(a[j * 2] - a[i * 2], a[j * 2 + 1] - a[i * 2 + 1]);
      cum[i + 1] = total;
    }
    if (total < dash) continue;
    // Fit a whole number of stitches on a closed loop so it doesn't end in a stub.
    const period = dash + gap;
    const count = Math.max(1, Math.round(total / period));
    const k = p.closed ? total / (count * period) : 1;
    const d = dash * k;
    const per = period * k;
    const at = (s: number, out2: number[]) => {
      let lo = 0;
      let hi = segs;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] <= s) lo = mid;
        else hi = mid;
      }
      const i = lo;
      const j = (i + 1) % n;
      const t = (s - cum[i]) / (cum[i + 1] - cum[i] || 1);
      out2.push(a[i * 2] + (a[j * 2] - a[i * 2]) * t, a[i * 2 + 1] + (a[j * 2 + 1] - a[i * 2 + 1]) * t);
    };
    for (let s0 = offset * per; s0 + d <= total + 1e-3; s0 += per) {
      const pts: number[] = [];
      const steps = Math.max(1, Math.ceil(d / 3));
      for (let q = 0; q <= steps; q++) at(Math.min(total, s0 + (d * q) / steps), pts);
      out.push(Float32Array.from(pts));
    }
  }
  return out;
}
