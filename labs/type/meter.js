/*
 * A quiet level meter: one rounded bar per letter on a hairline track, a thin peak-hold tick,
 * and the letter underneath. The loudest bar takes the magenta accent, like the loudest letter
 * on the stage. Every colour and the font are read from the design tokens.
 */

const PEAK_MIN = 0.32; // matches the stage: below this nothing is "loudest"

export class Meter {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.peaks = new Float32Array(0);
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.colors = {};
    this.readColors();
    this.resize();
    if ("ResizeObserver" in window) {
      new ResizeObserver(() => this.resize()).observe(canvas);
    }
  }

  readColors() {
    const cs = getComputedStyle(this.canvas);
    const get = (name) => cs.getPropertyValue(name).trim();
    this.colors = {
      bar: get("--ink") || "#111",
      track: get("--line") || "#e7e8ec",
      peak: get("--muted") || "#666",
      hot: get("--accent") || "#f41b8d",
      hotInk: get("--accent-ink") || "#c8006e",
      label: get("--muted") || "#666",
      font: get("--font-body") || "system-ui, sans-serif",
    };
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w === this.width && h === this.height && dpr === this.dpr) return;
    this.width = w;
    this.height = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.lastArgs && this.draw(...this.lastArgs);
  }

  /**
   * values: 0..1 per letter; labels: one character per letter; dt: seconds since last draw.
   */
  draw(values, labels, dt = 0.016) {
    this.lastArgs = [values, labels, 0];
    const { ctx, width: w, height: h, dpr, colors } = this;
    if (!ctx || w < 2) return;
    const n = Math.max(values.length, 1);
    if (this.peaks.length !== values.length) {
      const next = new Float32Array(values.length);
      next.set(this.peaks.subarray(0, Math.min(this.peaks.length, next.length)));
      this.peaks = next;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const padX = 4;
    const padTop = 4;
    const labelH = values.length ? 22 : 0;
    const gap = n > 18 ? 3 : n > 12 ? 4 : 6;
    const colW = Math.max(3, Math.min(24, Math.floor((w - padX * 2 - gap * (n - 1)) / n)));
    const totalW = colW * n + gap * (n - 1);
    const x0 = Math.round((w - totalW) / 2);
    const bottom = h - labelH;
    const usableH = Math.max(4, bottom - padTop);
    const radius = Math.min(6, colW / 2);

    let loud = -1;
    for (let i = 0; i < values.length; i++) if (loud < 0 || values[i] > values[loud]) loud = i;
    if (loud >= 0 && values[loud] < PEAK_MIN) loud = -1;

    const rounded = (x, y, rw, rh, r) => {
      if (rh <= 0) return;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, rw, rh, Math.min(r, rh / 2));
      else ctx.rect(x, y, rw, rh);
      ctx.fill();
    };

    for (let i = 0; i < n; i++) {
      const v = values.length ? values[i] : 0;
      if (values.length) {
        const decayed = this.peaks[i] - dt * 0.55;
        this.peaks[i] = Math.max(v, decayed, 0);
      }
      const x = x0 + i * (colW + gap);

      // Track
      ctx.fillStyle = colors.track;
      rounded(x, padTop, colW, usableH, radius);

      // Bar
      const barH = Math.round(v * usableH);
      if (barH > 0) {
        ctx.fillStyle = i === loud ? colors.hot : colors.bar;
        rounded(x, bottom - barH, colW, barH, radius);
      }

      // Peak hold
      if (values.length) {
        const py = Math.round(bottom - this.peaks[i] * usableH);
        if (this.peaks[i] > v + 0.02 && py > padTop) {
          ctx.fillStyle = colors.peak;
          ctx.fillRect(x, py - 1, colW, 2);
        }
      }

      if (labels && labels[i]) {
        ctx.fillStyle = i === loud ? colors.hotInk : colors.label;
        ctx.font = `600 ${colW < 12 ? 10 : 12}px ${colors.font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(labels[i], x + colW / 2, h - 5);
      }
    }
  }
}
