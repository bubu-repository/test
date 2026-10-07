/*
 * Bloom: CPU fallback engine.
 * Same Gray–Scott model on a small Float32 grid, shaded in JS and scaled up with Canvas2D.
 * Used when WebGL2 or float render targets are unavailable (or with ?renderer=cpu).
 */

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function mix3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function createCPUEngine(canvas) {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;

  const grid = document.createElement("canvas");
  const gctx = grid.getContext("2d");
  if (!gctx) return null;

  let w = 0;
  let h = 0;
  let A = null;
  let B = null;
  let A2 = null;
  let B2 = null;
  let image = null;
  let cssW = 1;
  let cssH = 1;
  let feed = 0.0545;
  let kill = 0.062;
  let palette = null;

  function sizeFor(width, height) {
    const cell = 4; // CSS px per cell: low-res on purpose
    let gw = Math.max(40, Math.round(width / cell));
    let gh = Math.max(40, Math.round(height / cell));
    const max = 36000;
    if (gw * gh > max) {
      const k = Math.sqrt(max / (gw * gh));
      gw = Math.round(gw * k);
      gh = Math.round(gh * k);
    }
    return [gw, gh];
  }

  function alloc(gw, gh) {
    const nA = new Float32Array(gw * gh).fill(1);
    const nB = new Float32Array(gw * gh);
    if (A) {
      for (let y = 0; y < gh; y++) {
        const sy = Math.min(h - 1, Math.floor((y / gh) * h));
        for (let x = 0; x < gw; x++) {
          const sx = Math.min(w - 1, Math.floor((x / gw) * w));
          nA[y * gw + x] = A[sy * w + sx];
          nB[y * gw + x] = B[sy * w + sx];
        }
      }
    }
    w = gw;
    h = gh;
    A = nA;
    B = nB;
    A2 = new Float32Array(w * h);
    B2 = new Float32Array(w * h);
    grid.width = w;
    grid.height = h;
    image = gctx.createImageData(w, h);
  }

  const engine = {
    kind: "cpu",
    label: "Canvas2D · CPU",

    get simSize() {
      return [w, h];
    },

    resize(width, height, dpr) {
      cssW = Math.max(1, width);
      cssH = Math.max(1, height);
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
      const [gw, gh] = sizeFor(cssW, cssH);
      if (!A || Math.abs(gw - w) / w > 0.06 || Math.abs(gh - h) / h > 0.06) alloc(gw, gh);
    },

    setRecipe(f, k) {
      feed = f;
      kill = k;
    },

    setPalette(p) {
      palette = p;
    },

    clear() {
      A.fill(1);
      B.fill(0);
    },

    step(n) {
      const W = w;
      const H = h;
      for (let s = 0; s < n; s++) {
        for (let y = 0; y < H; y++) {
          const yu = ((y - 1 + H) % H) * W;
          const yc = y * W;
          const yd = ((y + 1) % H) * W;
          for (let x = 0; x < W; x++) {
            const xl = (x - 1 + W) % W;
            const xr = (x + 1) % W;
            const i = yc + x;
            const a = A[i];
            const b = B[i];
            const lapA =
              0.2 * (A[yc + xl] + A[yc + xr] + A[yu + x] + A[yd + x]) +
              0.05 * (A[yu + xl] + A[yu + xr] + A[yd + xl] + A[yd + xr]) -
              a;
            const lapB =
              0.2 * (B[yc + xl] + B[yc + xr] + B[yu + x] + B[yd + x]) +
              0.05 * (B[yu + xl] + B[yu + xr] + B[yd + xl] + B[yd + xr]) -
              b;
            const abb = a * b * b;
            const na = a + (lapA - abb + feed * (1 - a));
            const nb = b + (0.5 * lapB + abb - (kill + feed) * b);
            A2[i] = na < 0 ? 0 : na > 1 ? 1 : na;
            B2[i] = nb < 0 ? 0 : nb > 1 ? 1 : nb;
          }
        }
        let t = A;
        A = A2;
        A2 = t;
        t = B;
        B = B2;
        B2 = t;
      }
    },

    paint(u0, v0, u1, v1, radiusCss, erase) {
      const x0 = u0 * w;
      const y0 = v0 * h;
      const x1 = u1 * w;
      const y1 = v1 * h;
      const r = Math.max(1.2, (radiusCss * w) / cssW);
      const minX = Math.max(0, Math.floor(Math.min(x0, x1) - r));
      const maxX = Math.min(w - 1, Math.ceil(Math.max(x0, x1) + r));
      const minY = Math.max(0, Math.floor(Math.min(y0, y1) - r));
      const maxY = Math.min(h - 1, Math.ceil(Math.max(y0, y1) + r));
      const bx = x1 - x0;
      const by = y1 - y0;
      const bb = Math.max(1e-5, bx * bx + by * by);
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const px = x + 0.5 - x0;
          const py = y + 0.5 - y0;
          const t = Math.min(1, Math.max(0, (px * bx + py * by) / bb));
          const d = Math.hypot(px - bx * t, py - by * t);
          const m = 1 - smoothstep(r * 0.6, r, d);
          if (m <= 0) continue;
          const i = y * w + x;
          if (erase) {
            A[i] += (1 - A[i]) * m;
            B[i] -= B[i] * m;
          } else {
            B[i] = Math.max(B[i], 0.9 * m);
            A[i] = Math.min(A[i], 1 - 0.5 * m);
          }
        }
      }
    },

    render() {
      if (!palette || !image) return;
      const P = palette;
      const dark = P.dark;
      const data = image.data;
      const ground = P.ground;
      const tint = mix3(P.accent, [1, 1, 1], dark ? 0.22 : 0.3);
      const deepK = dark ? 0.82 : 0.88;
      const deep = [P.deep[0] * deepK, P.deep[1] * deepK, P.deep[2] * deepK];
      const L = [-0.55, 0.6, 0.7];
      const ll = Math.hypot(L[0], L[1], L[2]);
      L[0] /= ll;
      L[1] /= ll;
      L[2] /= ll;
      const lxy = Math.hypot(L[0], L[1]);
      const Hv = [L[0], L[1], L[2] + 1];
      const hl = Math.hypot(Hv[0], Hv[1], Hv[2]);
      Hv[0] /= hl;
      Hv[1] /= hl;
      Hv[2] /= hl;
      const specK = dark ? 0.08 : 0.1;
      const ht = (b) => smoothstep(0.05, 0.3, b);
      for (let y = 0; y < h; y++) {
        const yu = ((y - 1 + h) % h) * w;
        const yd = ((y + 1) % h) * w;
        const yc = y * w;
        for (let x = 0; x < w; x++) {
          const xl = (x - 1 + w) % w;
          const xr = (x + 1) % w;
          const b = B[yc + x];
          const cover = smoothstep(0.1, 0.16, b);
          let col = ground;
          if (cover > 0) {
            // y grows downward here, so "up" is the previous row
            const gx = 0.5 * (ht(B[yc + xr]) - ht(B[yc + xl]));
            const gy = 0.5 * (ht(B[yu + x]) - ht(B[yd + x]));
            let nx = -gx * 1.5;
            let ny = -gy * 1.5;
            let nz = 1;
            const nl = Math.hypot(nx, ny, nz);
            nx /= nl;
            ny /= nl;
            nz /= nl;
            const lit = (nx * L[0] + ny * L[1]) / lxy;
            const ndh = Math.max(0, nx * Hv[0] + ny * Hv[1] + nz * Hv[2]);
            const s = Math.pow(ndh, 70) * specK;
            let j = mix3(P.accent, tint, smoothstep(0, 0.5, lit) * 0.5);
            j = mix3(j, deep, smoothstep(0, 0.5, -lit) * 0.65);
            j = [j[0] + s, j[1] + s, j[2] + s];
            col = mix3(ground, j, cover);
          }
          const o = (yc + x) * 4;
          data[o] = Math.min(255, col[0] * 255);
          data[o + 1] = Math.min(255, col[1] * 255);
          data[o + 2] = Math.min(255, col[2] * 255);
          data[o + 3] = 255;
        }
      }
      gctx.putImageData(image, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(grid, 0, 0, canvas.width, canvas.height);
    },

    destroy() {},
  };

  return engine;
}
