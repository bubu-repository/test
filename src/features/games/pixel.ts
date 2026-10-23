/* ==========================================================================
   CLOUD ARCADE — pixel kit (the cloud handheld in Adelia’s room)
   160×144 dot-matrix screen, a deliberately tiny pastel palette on a deep
   ink LCD (lilac greys, pink, baby blue, mint, lilac, butter), a
   hand-drawn 5×7 bitmap font cached into per-colour atlases, and a
   string-map sprite format. The grey keys keep dside's names (black …
   white) so the games read the same; they are ink and lilac now.
   ========================================================================== */

export const W = 160;
export const H = 144;

export const P = {
  black: '#141a2b', // the LCD
  night: '#1a2136',
  deep: '#242c45',
  graphite: '#323b5a',
  steel: '#4e587c',
  alu: '#8b93b6',
  alu2: '#b4bad8',
  light: '#dfe3f3',
  white: '#f8f9fd',
  pink: '#ff8fc4',
  pinkDk: '#b9487f',
  pinkLt: '#ffc6df',
  blue: '#7dc3f2',
  blueLt: '#c6e5fb',
  mint: '#a6ebcf',
  lilac: '#c9b6f6',
  butter: '#ffe39a',
} as const;
export type Color = (typeof P)[keyof typeof P];

/* --------------------------------------------------------------------------
   5×7 bitmap font ('#' = lit). Letters/punctuation are trimmed to their
   ink (proportional); digits stay 5 wide so scores never jitter.
   -------------------------------------------------------------------------- */
const GLYPHS: Record<string, string> = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#',
  B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.###.|#...#|#....|#....|#....|#...#|.###.',
  D: '###..|#..#.|#...#|#...#|#...#|#..#.|###..',
  E: '#####|#....|#....|####.|#....|#....|#####',
  F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.###.|#...#|#....|#.###|#...#|#...#|.####',
  H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '###|.#.|.#.|.#.|.#.|.#.|###',
  J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
  L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
  N: '#...#|#...#|##..#|#.#.#|#..##|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
  R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.',
  T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.',
  X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
  Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  '0': '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
  '1': '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
  '2': '.###.|#...#|....#|...#.|..#..|.#...|#####',
  '3': '####.|....#|....#|.###.|....#|....#|####.',
  '4': '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
  '5': '#####|#....|####.|....#|....#|#...#|.###.',
  '6': '..##.|.#...|#....|####.|#...#|#...#|.###.',
  '7': '#####|....#|...#.|..#..|.#...|.#...|.#...',
  '8': '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  '9': '.###.|#...#|#...#|.####|....#|...#.|.##..',
  '.': '.|.|.|.|.|#|#',
  ',': '..|..|..|..|.#|.#|#.',
  ':': '.|#|#|.|#|#|.',
  ';': '..|.#|.#|..|.#|.#|#.',
  '!': '#|#|#|#|#|.|#',
  '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
  '-': '...|...|...|###|...|...|...',
  '+': '.....|..#..|..#..|#####|..#..|..#..|.....',
  '/': '....#|....#|...#.|..#..|.#...|#....|#....',
  "'": '#|#|.|.|.|.|.',
  '"': '#.#|#.#|...|...|...|...|...',
  '(': '..#|.#.|#..|#..|#..|.#.|..#',
  ')': '#..|.#.|..#|..#|..#|.#.|#..',
  '#': '.#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#.',
  '%': '##...|##..#|...#.|..#..|.#...|#..##|...##',
  '*': '.....|#...#|.#.#.|..#..|.#.#.|#...#|.....',
  '>': '#...|.#..|..#.|...#|..#.|.#..|#...',
  '<': '...#|..#.|.#..|#...|.#..|..#.|...#',
  '=': '....|....|####|....|####|....|....',
  _: '.....|.....|.....|.....|.....|.....|#####',
  '·': '..|..|..|##|##|..|..',
  '↑': '..#..|.###.|#.#.#|..#..|..#..|..#..|.....',
  '↓': '.....|..#..|..#..|..#..|#.#.#|.###.|..#..',
  '←': '.....|..#..|.#...|#####|.#...|..#..|.....',
  '→': '.....|..#..|...#.|#####|...#.|..#..|.....',
  '♥': '.....|.#.#.|#####|#####|.###.|..#..|.....',
  '★': '..#..|..#..|#####|.###.|.###.|.#.#.|.....',
  '♪': '..##|..#.|..#.|..#.|.##.|###.|.#..',
};

interface GlyphInfo {
  x: number;
  w: number;
  rows: string[];
}
const ORDER = Object.keys(GLYPHS);
const INFO: Record<string, GlyphInfo> = {};
let atlasW = 0;
for (const ch of ORDER) {
  const rows = GLYPHS[ch].split('|');
  const w = rows[0].length;
  INFO[ch] = { x: atlasW, w, rows };
  atlasW += w + 1;
}
const SPACE_W = 3;
export const LINE_H = 7;

const atlases = new Map<string, HTMLCanvasElement>();
function atlas(color: string) {
  let c = atlases.get(color);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = atlasW;
  c.height = LINE_H;
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  for (const ch of ORDER) {
    const gi = INFO[ch];
    gi.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] === '#') g.fillRect(gi.x + x, y, 1, 1);
    });
  }
  atlases.set(color, c);
  return c;
}

function glyphOf(ch: string): GlyphInfo | null {
  if (ch === ' ') return null;
  const up = ch.toUpperCase();
  return INFO[up] ?? INFO['?'];
}

/** Width in screen pixels (before scale). */
export function measure(str: string, spacing = 1) {
  let w = 0;
  for (const ch of str) {
    const gi = glyphOf(ch);
    w += (gi ? gi.w : SPACE_W) + spacing;
  }
  return Math.max(0, w - spacing);
}

export interface TextOpts {
  color?: string;
  scale?: number;
  align?: 'left' | 'center' | 'right';
  spacing?: number;
  /** 1px drop shadow colour */
  shadow?: string;
}

export function text(g: CanvasRenderingContext2D, str: string, x: number, y: number, o: TextOpts = {}) {
  const { color = P.white, scale = 1, align = 'left', spacing = 1, shadow } = o;
  if (shadow) text(g, str, x + 1, y + 1, { ...o, color: shadow, shadow: undefined });
  const w = measure(str, spacing) * scale;
  let cx = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
  const cy = Math.round(y);
  const img = atlas(color);
  for (const ch of str) {
    const gi = glyphOf(ch);
    if (!gi) {
      cx += (SPACE_W + spacing) * scale;
      continue;
    }
    g.drawImage(img, gi.x, 0, gi.w, LINE_H, cx, cy, gi.w * scale, LINE_H * scale);
    cx += (gi.w + spacing) * scale;
  }
  return w;
}

/** Restrict a string to glyphs the font can draw (for names from the API). */
export function printable(str: string) {
  return Array.from(str.toUpperCase())
    .map((c) => (c === ' ' || INFO[c] ? c : '?'))
    .join('');
}

export const pad = (n: number, len = 6) => String(Math.max(0, Math.floor(n))).padStart(len, '0');

/* --------------------------------------------------------------------------
   Sprites — rows of single-char colour keys, '.' = transparent.
   Pre-rendered once into canvases; flipping handled at draw time.
   -------------------------------------------------------------------------- */
const KEYS: Record<string, string> = {
  k: P.black,
  n: P.night,
  d: P.deep,
  r: P.graphite,
  s: P.steel,
  a: P.alu,
  i: P.alu2,
  l: P.light,
  w: P.white,
  o: P.pink,
  O: P.pinkDk,
  y: P.pinkLt,
  b: P.blue,
  B: P.blueLt,
};

export type Sprite = HTMLCanvasElement;
export function sprite(rows: string[]): Sprite {
  const c = document.createElement('canvas');
  c.width = Math.max(...rows.map((r) => r.length));
  c.height = rows.length;
  const g = c.getContext('2d')!;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = KEYS[row[x]];
      if (col) {
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
  });
  return c;
}

export function draw(g: CanvasRenderingContext2D, s: Sprite, x: number, y: number, flip = false) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  if (!flip) {
    g.drawImage(s, rx, ry);
    return;
  }
  g.save();
  g.translate(rx + s.width, ry);
  g.scale(-1, 1);
  g.drawImage(s, 0, 0);
  g.restore();
}

export function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** 1px outline rectangle */
export function frame(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  rect(g, x, y, w, 1, color);
  rect(g, x, y + h - 1, w, 1, color);
  rect(g, x, y, 1, h, color);
  rect(g, x + w - 1, y, 1, h, color);
}

/** checkerboard dither over a region (retro "dim") */
let ditherCache: CanvasPattern | null = null;
let ditherColor = '';
export function dither(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string = P.black) {
  if (!ditherCache || ditherColor !== color) {
    const c = document.createElement('canvas');
    c.width = 2;
    c.height = 2;
    const cg = c.getContext('2d')!;
    cg.fillStyle = color;
    cg.fillRect(0, 0, 1, 1);
    cg.fillRect(1, 1, 1, 1);
    ditherCache = g.createPattern(c, 'repeat');
    ditherColor = color;
  }
  g.fillStyle = ditherCache!;
  g.fillRect(x, y, w, h);
}

/** diamond "signal" glyph of radius r (r=3 → 7×7) */
export function diamond(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, core?: string) {
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  for (let dy = -r; dy <= r; dy++) {
    const half = r - Math.abs(dy);
    rect(g, x0 - half, y0 + dy, half * 2 + 1, 1, color);
  }
  if (core) rect(g, x0, y0, 1, 1, core);
}

export const blink = (t: number, period = 30) => Math.floor(t / period) % 2 === 0;
