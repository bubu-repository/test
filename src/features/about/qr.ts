/* ==========================================================================
   A tiny QR code encoder (byte mode, versions 1–5, one Reed–Solomon block),
   for the back of her ID card: enough for a URL of up to 106 bytes, with no
   dependency. Versions 1–3 use error correction M, 4–5 use L.
   Returns the module matrix (true = dark), quiet zone not included.
   ========================================================================== */

/** [version, data codewords, EC codewords, EC level bits (M = 0, L = 1)] */
const SPECS: [number, number, number, number][] = [
  [1, 16, 10, 0],
  [2, 28, 16, 0],
  [3, 44, 26, 0],
  [4, 80, 20, 1],
  [5, 108, 26, 1],
];

/* GF(256) with the QR polynomial x^8 + x^4 + x^3 + x^2 + 1 */
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}
const mul = (a: number, b: number) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

function ecc(data: number[], n: number): number[] {
  // generator polynomial (x - α^0)(x - α^1)…(x - α^(n-1)), highest power first, leading 1 dropped
  let gen = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j];
      next[j + 1] ^= mul(gen[j], EXP[i]);
    }
    gen = next;
  }
  const rem = new Array(n).fill(0);
  for (const b of data) {
    const f = b ^ rem.shift()!;
    rem.push(0);
    for (let j = 0; j < n; j++) rem[j] ^= mul(gen[j + 1], f);
  }
  return rem;
}

const MASKS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/** Build the matrix for `text` with one mask (0–7), or the least-penalised mask when omitted. */
export function qrMatrix(text: string, mask?: number): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(text));
  const spec = SPECS.find(([, dc]) => dc * 8 >= 12 + bytes.length * 8);
  if (!spec) throw new Error('Too long for this little QR encoder');
  const [ver, dc, ec, level] = spec;
  const size = 17 + ver * 4;

  // ---- data codewords: mode 0100, an 8-bit count, the bytes, terminator, padding
  const bits: number[] = [];
  const put = (v: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1);
  };
  put(4, 4);
  put(bytes.length, 8);
  bytes.forEach((b) => put(b, 8));
  put(0, Math.min(4, dc * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let pad = 0xec; data.length < dc; pad ^= 0xec ^ 0x11) data.push(pad);
  const all = [...data, ...ecc(data, ec)];

  // ---- function patterns
  const grid: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const fixed: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (c: number, r: number, dark: boolean) => {
    grid[r][c] = dark;
    fixed[r][c] = true;
  };
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
      }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);
  if (ver > 1) {
    const p = size - 7;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(p + dx, p + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  const format = (m: number) => {
    const d = (level << 3) | m;
    let rem = d;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const b = ((d << 10) | rem) ^ 0x5412;
    const bit = (i: number) => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  format(0); // reserve the format areas

  // ---- data, in the zigzag, bottom-right first
  const stream: number[] = [];
  all.forEach((b) => {
    for (let i = 7; i >= 0; i--) stream.push((b >>> i) & 1);
  });
  let k = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < size; v++)
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const up = ((right + 1) & 2) === 0;
        const y = up ? size - 1 - v : v;
        if (!fixed[y][x]) grid[y][x] = k < stream.length ? stream[k++] === 1 : false;
      }
  }

  const masked = (m: number) => {
    const g = grid.map((row, r) => row.map((dark, c) => (fixed[r][c] ? dark : dark !== MASKS[m](r, c))));
    // redraw the format bits for this mask
    const saved = grid.map((row) => row.slice());
    format(m);
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (fixed[r][c]) g[r][c] = grid[r][c];
    for (let r = 0; r < size; r++) grid[r] = saved[r];
    return g;
  };

  if (mask != null) return masked(mask);
  let best = masked(0);
  let bestScore = penalty(best);
  for (let m = 1; m < 8; m++) {
    const g = masked(m);
    const s = penalty(g);
    if (s < bestScore) {
      best = g;
      bestScore = s;
    }
  }
  return best;
}

/** The spec's penalty rules (runs, 2×2 blocks, finder look-alikes, balance), simplified. */
function penalty(g: boolean[][]): number {
  const n = g.length;
  let p = 0;
  for (let pass = 0; pass < 2; pass++)
    for (let a = 0; a < n; a++) {
      let run = 1;
      for (let b = 1; b < n; b++) {
        const cur = pass ? g[b][a] : g[a][b];
        const prev = pass ? g[b - 1][a] : g[a][b - 1];
        if (cur === prev) {
          run++;
          if (run === 5) p += 3;
          else if (run > 5) p++;
        } else run = 1;
        if (b >= 6) {
          const s = [0, 1, 2, 3, 4, 5, 6].map((d) => (pass ? g[b - 6 + d][a] : g[a][b - 6 + d]));
          if (s[0] && !s[1] && s[2] && s[3] && s[4] && !s[5] && s[6]) p += 40;
        }
      }
    }
  let dark = 0;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (g[r][c]) dark++;
      if (r < n - 1 && c < n - 1 && g[r][c] === g[r + 1][c] && g[r][c] === g[r][c + 1] && g[r][c] === g[r + 1][c + 1]) p += 3;
    }
  p += Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5) * 10;
  return p;
}

/** One SVG path for the dark modules (1 unit per module). */
export function qrPath(m: boolean[][]): string {
  let d = '';
  m.forEach((row, y) => row.forEach((dark, x) => dark && (d += `M${x} ${y}h1v1h-1z`)));
  return d;
}
