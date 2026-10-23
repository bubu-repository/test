/* ==========================================================================
   LIVE BEKASI — the view through Adelia's window.

   A procedural, deterministic painter for everything outside the glass:
   sky for the hour, sun / moon / a few brave stars, drifting clouds, a
   layered city skyline towards Jakarta (cranes, towers in atmospheric
   haze), office windows that switch on in the evening, aircraft
   warning lights, rain / drizzle / storm (with lightning) / fog / snow.

     const sky = createSky();                 // one per canvas
     const { flash } = sky.draw(ctx, w, h, { t, hour, kind, isDay });
     drawGlass(glassCtx, w, h, state);        // droplets on the pane (transparent)

   • `t` is monotonic seconds (use performance.now() / 1000 everywhere so
     every sky instance — window, panel preview — flashes in sync).
   • Static work (skyline silhouettes, window grids, cloud sprites) is cached
     per size + seed; tinting is re-done only when the light changes (≈ once
     a WIB minute) or while the weather eases to a new condition.
   ========================================================================== */
import type { WeatherKind } from '@/lib/weather';

export type { WeatherKind };

export interface SkyState {
  /** seconds, monotonic (performance.now() / 1000) */
  t: number;
  /** Bekasi (WIB) hour, 0–24 fractional */
  hour: number;
  kind: WeatherKind;
  isDay: boolean;
  /** extra lightning flash to add (0–1), e.g. a scripted strike */
  flash?: number;
}

export interface SkyFrame {
  /** lightning flash this frame, 0–1 (use it to flash the room too) */
  flash: number;
  /** ambient daylight outside, 0 (night / storm) – 1 (clear noon) */
  light: number;
}

export interface Sky {
  /** paints the full, opaque window view */
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, s: SkyState): SkyFrame;
  /** droplets & rivulets on the glass (transparent), using this sky's eased weather */
  drawGlass(ctx: CanvasRenderingContext2D, w: number, h: number, s: SkyState): void;
  /** flash value of this instance's most recent draw */
  lastFlash(): number;
  /** releases cached canvases */
  dispose(): void;
}

export interface SkyOptions {
  /** skyline / window pattern seed (default 2026) */
  seed?: number;
  /** 'low' halves rain streaks and skips some glow work */
  quality?: 'high' | 'low';
}

/* ------------------------------------------------------------------------ */
/* small math + colour kit                                                   */
/* ------------------------------------------------------------------------ */
type RGB = [number, number, number];

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const smooth = (e0: number, e1: number, x: number) => {
  const k = clamp01((x - e0) / (e1 - e0));
  return k * k * (3 - 2 * k);
};
const hex = (s: string): RGB => {
  const n = parseInt(s.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: RGB, b: RGB, k: number): RGB => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const scale = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
const q = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const css = (c: RGB, a = 1) => (a >= 1 ? `rgb(${q(c[0])},${q(c[1])},${q(c[2])})` : `rgba(${q(c[0])},${q(c[1])},${q(c[2])},${Math.max(0, a).toFixed(3)})`);
const key = (c: RGB) => `${q(c[0])},${q(c[1])},${q(c[2])}`;

/** integer hash → [0, 1) */
function hash(n: number) {
  let x = Math.imul(n | 0, 0x27d4eb2d) ^ 0x9e3779b9;
  x ^= x >>> 15;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Cnv = HTMLCanvasElement;
function canvas(w: number, h: number): Cnv {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}
const c2d = (c: Cnv, read = false) => c.getContext('2d', read ? { willReadFrequently: true } : undefined)!;

/* Software GL (SwiftShader / llvmpipe — VMs, CI, headless) makes every
   full-canvas blit cost ~15 ms in the GPU process; redrawing at 30 fps then
   starves the compositor and the whole page stops animating. Detect it once
   and let the sky self-throttle (a canvas keeps its last frame anyway). */
let SOFT: boolean | null = null;
export function softwareRendering(): boolean {
  if (SOFT !== null) return SOFT;
  SOFT = false;
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl') || c.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const r = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
      SOFT = /swiftshader|llvmpipe|softpipe|software/i.test(r);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    SOFT = false;
  }
  return SOFT;
}

/* Big gradient fills are the slowest thing a 2D canvas does on CPU raster
   (~2 ms for 700×740). Render them into tiny canvases and stretch instead. */
let STRIP: Cnv | null = null;
let GLOWC: Cnv | null = null;
function vgrad(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, stops: [number, string][]) {
  const s = (STRIP ??= canvas(4, 128));
  const g = c2d(s);
  g.clearRect(0, 0, 4, 128);
  const grd = g.createLinearGradient(0, 0, 0, 128);
  for (const [o, c] of stops) grd.addColorStop(clamp01(o), c);
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 128);
  ctx.drawImage(s, 1, 0.5, 2, 127, x, y, w, h);
}
function rglow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stops: [number, string][]) {
  const s = (GLOWC ??= canvas(64, 64));
  const g = c2d(s);
  g.clearRect(0, 0, 64, 64);
  const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [o, c] of stops) rg.addColorStop(o, c);
  g.fillStyle = rg;
  g.fillRect(0, 0, 64, 64);
  ctx.drawImage(s, x - r, y - r, r * 2, r * 2);
}

/* ------------------------------------------------------------------------ */
/* light: sky keyframes by Bekasi (WIB) hour (sunrise ≈ 05:45, sunset ≈ 17:50)    */
/* ------------------------------------------------------------------------ */
interface Pal {
  zen: RGB; // top of the window
  mid: RGB;
  hor: RGB; // horizon band
  glow: RGB; // sun / moon glow
  city: RGB; // nearest buildings
  haze: RGB; // atmospheric perspective target
  cloud: RGB; // lit cloud tone
  light: number; // 0..1 daylight
}

type KeyDef = [number, string, string, string, string, string, string, string, number];
// hour, zenith, mid, horizon, glow, city, haze, cloud, light
const KEYS: KeyDef[] = [
  [0.0, '#070d24', '#111b3e', '#3a2f4a', '#4a3552', '#0a0f1f', '#2b2539', '#2b2738', 0.02],
  [4.6, '#080e26', '#131d42', '#3b304b', '#46334f', '#0b1021', '#2b263a', '#2b2739', 0.02],
  [5.25, '#161a4a', '#302f6e', '#7c5d88', '#9a6a8c', '#1b1d3a', '#4c4266', '#4a4466', 0.1], // pre-dawn indigo
  [5.85, '#3d4c8e', '#a487ab', '#ffb88c', '#ffae74', '#4a4460', '#c49a9e', '#eaa79a', 0.36], // sunrise peach
  [6.6, '#6890cf', '#d4c1c6', '#ffdcb6', '#ffe2b6', '#727a8e', '#e6d3c8', '#f7ddd0', 0.72],
  [8.2, '#5a95d9', '#a6c9ea', '#e3ecf0', '#fff7e2', '#7a8796', '#d5e0e8', '#f5f7f9', 0.95],
  [12.0, '#66a1de', '#b0d0ec', '#edf1ed', '#ffffff', '#808d99', '#dee6e9', '#fbfcfc', 1], // hazy tropical noon
  [15.6, '#5e96d6', '#adc9e4', '#ece7da', '#fff2d4', '#7c8691', '#e1e1da', '#f8f4ec', 0.95],
  [17.0, '#5b80c2', '#d8b28c', '#ffc076', '#ffb15a', '#7f6c68', '#ecc39c', '#ffd5a6', 0.74], // golden hour
  [17.75, '#4a5396', '#d98a70', '#ff8f4e', '#ff883c', '#5c4a58', '#d99a86', '#f3a48a', 0.5], // sunset
  [18.3, '#29296a', '#704f90', '#d6767c', '#e0787a', '#2e2946', '#8a6388', '#a96f8e', 0.24], // dusk violet
  [18.9, '#151e54', '#32397a', '#7a587e', '#7a5378', '#171b33', '#4e4366', '#4c4466', 0.09],
  [19.7, '#0a1431', '#162351', '#43354f', '#4c3653', '#0d1225', '#2e2942', '#2e2a3d', 0.03], // navy + light pollution
  [24.0, '#070d24', '#111b3e', '#3a2f4a', '#4a3552', '#0a0f1f', '#2b2539', '#2b2738', 0.02],
];
const KP: Pal[] = KEYS.map(([, zen, mid, hor, glow, city, haze, cloud, light]) => ({
  zen: hex(zen),
  mid: hex(mid),
  hor: hex(hor),
  glow: hex(glow),
  city: hex(city),
  haze: hex(haze),
  cloud: hex(cloud),
  light,
}));

const mixPal = (a: Pal, b: Pal, k: number): Pal => ({
  zen: mix(a.zen, b.zen, k),
  mid: mix(a.mid, b.mid, k),
  hor: mix(a.hor, b.hor, k),
  glow: mix(a.glow, b.glow, k),
  city: mix(a.city, b.city, k),
  haze: mix(a.haze, b.haze, k),
  cloud: mix(a.cloud, b.cloud, k),
  light: lerp(a.light, b.light, k),
});

function clearPal(hour: number): Pal {
  const h = ((hour % 24) + 24) % 24;
  for (let i = 0; i < KEYS.length - 1; i++) {
    const h0 = KEYS[i][0];
    const h1 = KEYS[i + 1][0];
    if (h >= h0 && h <= h1) return mixPal(KP[i], KP[i + 1], smooth(0, 1, (h - h0) / (h1 - h0)));
  }
  return KP[0];
}

// overcast greys: daylight, and city-lit cloud base at night (orange-brown)
const GREY_DAY: Pal = { zen: hex('#909aa5'), mid: hex('#adb5bd'), hor: hex('#c6cbce'), glow: hex('#e9ecee'), city: hex('#6d7680'), haze: hex('#bcc2c7'), cloud: hex('#c9ced3'), light: 1 };
const GREY_NIGHT: Pal = { zen: hex('#131219'), mid: hex('#211d27'), hor: hex('#3f3236'), glow: hex('#3a3036'), city: hex('#0b0d15'), haze: hex('#2d262c'), cloud: hex('#2f282e'), light: 0 };
const STORM_TINT = hex('#3d4952');
const FOG_DAY = hex('#d2d6d5');
const FOG_NIGHT = hex('#463f46');

/* ------------------------------------------------------------------------ */
/* weather as a continuous vector (so changes can ease)                      */
/* ------------------------------------------------------------------------ */
interface Wx {
  cover: number;
  dark: number;
  fog: number;
  rain: number;
  snow: number;
  storm: number;
}
const WX: Record<WeatherKind, Wx> = {
  clear: { cover: 0.1, dark: 0, fog: 0.1, rain: 0, snow: 0, storm: 0 },
  cloudy: { cover: 0.78, dark: 0.04, fog: 0.16, rain: 0, snow: 0, storm: 0 },
  fog: { cover: 0.5, dark: 0, fog: 0.88, rain: 0, snow: 0, storm: 0 },
  drizzle: { cover: 0.84, dark: 0.1, fog: 0.3, rain: 0.35, snow: 0, storm: 0 },
  rain: { cover: 0.94, dark: 0.22, fog: 0.36, rain: 0.78, snow: 0, storm: 0 },
  storm: { cover: 1, dark: 0.68, fog: 0.26, rain: 1, snow: 0, storm: 1 },
  snow: { cover: 0.9, dark: 0.06, fog: 0.4, rain: 0, snow: 1, storm: 0 },
};
const WX_KEYS = ['cover', 'dark', 'fog', 'rain', 'snow', 'storm'] as const;

interface Look extends Pal {
  eff: number; // effective daylight after weather
  lit: number; // fraction of windows switched on
  win: number; // window glow intensity
}

const LIT_KEYS: [number, number][] = [
  [0, 0.5], [2.5, 0.4], [5, 0.38], [6.2, 0.2], [7.2, 0.1], [16.4, 0.1], [17.5, 0.28], [18.5, 0.62], [19.8, 0.78], [22, 0.7], [24, 0.5],
];
function litAt(hour: number) {
  const h = ((hour % 24) + 24) % 24;
  for (let i = 0; i < LIT_KEYS.length - 1; i++) {
    const [h0, v0] = LIT_KEYS[i];
    const [h1, v1] = LIT_KEYS[i + 1];
    if (h >= h0 && h <= h1) return lerp(v0, v1, (h - h0) / (h1 - h0));
  }
  return 0.5;
}

function look(hour: number, w: Wx): Look {
  const base = clearPal(hour);
  let grey = mixPal(GREY_NIGHT, GREY_DAY, Math.pow(base.light, 0.7));
  grey = mixPal(grey, base, 0.22);
  const p = mixPal(base, grey, w.cover);
  if (w.dark > 0) {
    const k = 1 - w.dark * 0.52;
    for (const f of ['zen', 'mid', 'hor', 'city', 'haze', 'cloud', 'glow'] as const) p[f] = mix(scale(p[f], k), scale(STORM_TINT, base.light * 0.9 + 0.1), w.dark * 0.3);
  }
  if (w.fog > 0) {
    const fc = mix(FOG_NIGHT, FOG_DAY, Math.pow(base.light, 0.8));
    p.hor = mix(p.hor, fc, w.fog * 0.92);
    p.mid = mix(p.mid, fc, w.fog * 0.82);
    p.zen = mix(p.zen, fc, w.fog * 0.6);
    p.haze = mix(p.haze, fc, w.fog * 0.85);
    p.cloud = mix(p.cloud, fc, w.fog * 0.5);
    p.city = mix(p.city, fc, w.fog * 0.28);
  }
  const eff = base.light * (1 - w.cover * 0.22) * (1 - w.dark * 0.62);
  const lit = clamp01(litAt(hour) + (1 - eff) * base.light * 0.35);
  const win = clamp01(1.12 - eff * 1.3) * (1 - w.fog * 0.35);
  return { ...p, light: base.light, eff, lit, win };
}

/* ------------------------------------------------------------------------ */
/* lightning — a pure function of time, so every view flashes together      */
/* ------------------------------------------------------------------------ */
const STRIKE_SLOT = 6.2;
interface Strike {
  id: number;
  t0: number;
  power: number;
  bolt: boolean;
}
function strikesNear(t: number): Strike[] {
  const out: Strike[] = [];
  const i = Math.floor(t / STRIKE_SLOT);
  for (let j = i - 1; j <= i; j++) {
    if (hash(j * 7919 + 13) > 0.64) continue;
    out.push({ id: j, t0: j * STRIKE_SLOT + hash(j * 104729 + 7) * (STRIKE_SLOT - 1.6), power: 0.45 + 0.55 * hash(j * 31 + 5), bolt: hash(j * 97 + 3) > 0.3 });
  }
  return out;
}
function strikeEnvelope(dt: number, power: number) {
  if (dt < 0 || dt > 1.6) return 0;
  const p = (s: number, d: number) => (dt < s ? 0 : Math.exp(-(dt - s) / d));
  const e = 0.65 * p(0, 0.06) + 1 * p(0.13, 0.09) + (power > 0.7 ? 0.55 * p(0.38, 0.07) : 0) + 0.2 * p(0.13, 0.5);
  return Math.min(1, e * power);
}
/** Lightning flash (0–1) at time t for a weather kind. Pure & deterministic. */
export function lightningAt(t: number, kind: WeatherKind | number): number {
  const amt = typeof kind === 'number' ? kind : WX[kind]?.storm ?? 0;
  if (amt <= 0.01) return 0;
  let f = 0;
  for (const s of strikesNear(t)) f = Math.max(f, strikeEnvelope(t - s.t0, s.power));
  return f * amt;
}

/** The strike currently lighting the sky (if any) — handy for syncing a
 *  thunder sound: play it once per new `id`, delayed by `distance` seconds. */
export function lightningInfo(t: number, kind: WeatherKind | number): { flash: number; id: number | null; age: number; power: number; bolt: boolean; distance: number } {
  const amt = typeof kind === 'number' ? kind : WX[kind]?.storm ?? 0;
  let best: Strike | null = null;
  let f = 0;
  if (amt > 0.01)
    for (const s of strikesNear(t)) {
      const e = strikeEnvelope(t - s.t0, s.power);
      if (e > f || (t >= s.t0 && t - s.t0 < 1.6 && !best)) {
        f = Math.max(f, e);
        best = s;
      }
    }
  if (!best) return { flash: 0, id: null, age: 0, power: 0, bolt: false, distance: 0 };
  return { flash: f * amt, id: best.id, age: t - best.t0, power: best.power, bolt: best.bolt, distance: 0.6 + (1 - best.power) * 3.4 };
}

let LAST_FLASH = 0;
/** Flash value of the most recent draw of any sky (0–1). */
export function lastFlash() {
  return LAST_FLASH;
}

/** Ambient light outside for the room (e.g. to tint the studio at night). */
export function roomAmbient(hour: number, kind: WeatherKind): { light: number; tint: string } {
  const l = look(hour, WX[kind] ?? WX.clear);
  return { light: l.eff, tint: css(mix(l.hor, l.zen, 0.4)) };
}

/** Moon phase 0..1 (0 new, 0.5 full) for a date. */
export function moonPhase(ms = Date.now()) {
  const days = (ms - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
  return (((days / 29.530588853) % 1) + 1) % 1;
}

/* ------------------------------------------------------------------------ */
/* scene geometry (per size + seed)                                          */
/* ------------------------------------------------------------------------ */
interface Win {
  x: number;
  y: number;
  w: number;
  h: number;
  th: number; // switches on when lit > th
  c: number; // colour index
  a: number; // layer brightness
}
interface Flicker extends Win {
  front: boolean;
  period: number;
  duty: number;
  phase: number;
  tv: boolean;
}
interface Beacon {
  x: number;
  y: number;
  r: number;
  phase: number;
  steady: boolean;
}
interface Crane {
  x: number; // mast x
  top: number; // mast top y
  base: number;
  jib: number;
  counter: number;
  mastW: number;
  phase: number;
  speed: number;
}
interface Layer {
  shade: Cnv; // grey shading (white = fully lit) + alpha silhouette
  glass?: Cnv; // curtain-wall mask that reflects the sky
  y0: number; // canvas offset
  depth: number; // 0 far … 3 near
}
interface CloudSprite {
  gray: Cnv;
  tinted: Cnv;
  key: string;
}
interface CloudInst {
  sprite: number;
  y: number;
  x0: number;
  speed: number;
  s: number;
  th: number; // cover threshold
  storm: boolean;
}
interface Scene {
  w: number;
  h: number;
  k: number;
  back: Layer[]; // far, mid, near
  front: Layer; // rooftops
  wins: Win[]; // back windows (L0–L2), sorted by colour
  frontWins: Win[];
  flickers: Flicker[];
  beacons: Beacon[];
  cranes: Crane[];
  monas: { x: number; base: number; H: number };
  winBack: Cnv; // lit windows of the back layers (offset bY0)
  winFront: Cnv;
  winKey: string;
  B: Cnv; // baked back skyline (far + mid + near + windows), offset bY0
  bY0: number;
  F: Cnv; // baked rooftops + windows, offset front.y0
  bKey: string;
  tmp: Cnv;
  tmp2: Cnv;
  sprites: CloudSprite[];
  decks: CloudSprite[];
  clouds: CloudInst[];
  stars: { x: number; y: number; r: number; a: number; f: number }[];
  glow: Cnv; // red beacon glow sprite
  rainTiles?: Cnv[]; // built on first rain
  rainHeavy?: Cnv[]; // storm density
  skyC: Cnv; // cached sky gradient + glows
  skyKey: string;
  veilC: Cnv; // cached haze / fog / rain veil
  veilKey: string;
}

const WIN_COLORS = ['#ffd58e', '#ffe6b8', '#fff3dc', '#e9f1ff', '#cfe0ff', '#f6ffe6', '#ffb36b', '#9fc2ff'];
const WIN_RGB = WIN_COLORS.map(hex);

const HORIZON = 0.665; // far skyline base (fraction of h)

function buildScene(w: number, h: number, seed: number): Scene {
  const k = h / 740;
  const R = rng(seed);
  const monas = { x: w * 0.34, base: h * 0.7, H: h * 0.19 };
  const monasHalf = monas.H * 0.22;

  // --- layer specs -------------------------------------------------------
  type Spec = {
    depth: number;
    y0: number;
    topMin: number;
    topMax: number;
    tallP: number;
    tallMin: number;
    wMin: number;
    wMax: number;
    gapMin: number;
    gapMax: number;
    win: [number, number, number, number]; // sx, sy, ww, wh (in k)
    a: number; // window brightness
  };
  const specs: Spec[] = [
    { depth: 0, y0: 0.48, topMin: 0.6, topMax: 0.664, tallP: 0.1, tallMin: 0.55, wMin: 8, wMax: 30, gapMin: -2, gapMax: 3, win: [2.8, 3.1, 1.2, 1.1], a: 0.45 },
    { depth: 1, y0: 0.3, topMin: 0.53, topMax: 0.665, tallP: 0.2, tallMin: 0.4, wMin: 20, wMax: 56, gapMin: -3, gapMax: 16, win: [3.4, 3.8, 1.7, 1.6], a: 0.7 },
    { depth: 2, y0: 0.1, topMin: 0.5, topMax: 0.72, tallP: 0.32, tallMin: 0.32, wMin: 52, wMax: 118, gapMin: 18, gapMax: 90, win: [4.8, 5.4, 2.6, 2.7], a: 0.9 },
  ];

  const layers: Layer[] = [];
  const allWins: Win[][] = [[], [], []];
  const beacons: (Beacon & { depth: number })[] = [];
  const cranes: Crane[] = [];

  for (const sp of specs) {
    const y0 = Math.floor(h * sp.y0);
    const shade = canvas(w, h - y0);
    const g = c2d(shade);
    g.translate(0, -y0);
    const glass = sp.depth > 0 ? canvas(w, h - y0) : undefined;
    const gl = glass ? c2d(glass) : null;
    gl?.translate(0, -y0);
    let x = -R() * 30 * k;
    // a construction site on the near layer (crane), away from Monas
    const siteX = sp.depth === 2 ? w * (R() < 0.5 ? 0.62 + R() * 0.1 : 0.06 + R() * 0.08) : -1e9;
    let siteDone = false;
    let heroDone = 0;
    while (x < w + 30 * k) {
      let bw = lerp(sp.wMin, sp.wMax, Math.pow(R(), 1.25)) * k;
      let top = h * lerp(sp.topMin, sp.topMax, R());
      if (R() < sp.tallP) top = h * lerp(sp.tallMin, sp.topMin, R());
      // near layer: one or two hero towers
      if (sp.depth === 2 && heroDone < 2 && x > w * (heroDone ? 0.45 : 0.12) && R() < 0.5) {
        top = h * lerp(0.19, 0.27, R());
        bw = lerp(64, 92, R()) * k;
        heroDone++;
      }
      // keep the view to Monas open
      const nearMonas = x + bw > monas.x - monasHalf * 1.4 && x < monas.x + monasHalf * 1.4;
      if (nearMonas && sp.depth === 1) top = Math.max(top, monas.base - monas.H * 0.12 + R() * 6 * k);
      if (nearMonas && sp.depth === 2) {
        x = monas.x + monasHalf * 1.4 + R() * 10 * k;
        continue;
      }
      if (sp.depth === 2 && !siteDone && x + bw > siteX) {
        siteDone = true;
        const sw = 46 * k;
        const stop = h * lerp(0.5, 0.56, R());
        paintSite(g, x, sw, stop, h, k, R);
        cranes.push({
          x: x + sw + 7 * k,
          top: h * lerp(0.38, 0.43, R()),
          base: h,
          jib: lerp(90, 120, R()) * k,
          counter: 34 * k,
          mastW: 5 * k,
          phase: R() * Math.PI * 2,
          speed: 0.018 + R() * 0.012,
        });
        x += sw + 24 * k;
        continue;
      }
      const b = paintBuilding(g, gl, sp.depth, x, bw, top, h, k, R);
      // windows
      const [sx, sy, ww, wh] = sp.win;
      // offices light whole floors (cool); apartments scatter warm lamps
      const office = R() < 0.6;
      const occupancy = (office ? 0.55 + R() * 0.4 : 0.3 + R() * 0.45) * (sp.depth === 0 ? 0.55 : 1);
      const bias = R() * 0.35;
      const palette = office ? (R() < 0.6 ? [3, 4, 2] : [5, 2, 3]) : R() < 0.75 ? [0, 1, 0] : [6, 0, 2];
      for (const part of b.parts) {
        const cs = Math.max(2, sx * k);
        const rs = Math.max(2.2, sy * k);
        const cols = Math.floor((part.w - 2 * k) / cs);
        const rows = Math.floor((part.b - part.y - 2 * k) / rs);
        const mx = part.x + (part.w - cols * cs) / 2 + (cs - ww * k) / 2;
        const floorRand: number[] = [];
        for (let r = 0; r < rows; r++) {
          floorRand[r] = R();
          for (let c = 0; c < cols; c++) {
            if (R() > occupancy) continue;
            const wx = mx + c * cs;
            const wy = part.y + 3 * k + r * rs;
            if (wy > part.b - 1) break;
            allWins[sp.depth].push({
              x: wx,
              y: wy,
              w: Math.max(1, ww * k),
              h: Math.max(1, wh * k),
              th: office ? floorRand[r] * 0.8 + R() * 0.2 + bias : R() * 0.85 + bias * 0.6 + 0.1,
              c: palette[(R() * palette.length) | 0],
              a: sp.a,
            });
          }
        }
      }
      if (b.beacon && sp.depth > 0) beacons.push({ ...b.beacon, depth: sp.depth });
      x += bw + lerp(sp.gapMin, sp.gapMax, R()) * k;
    }
    layers.push({ shade, glass, y0, depth: sp.depth });
  }

  // --- occlusion: keep only windows / beacons not hidden by nearer layers --
  const alpha = layers.map((L) => (L.depth === 0 ? null : c2d(L.shade, true).getImageData(0, 0, L.shade.width, L.shade.height)));
  const hidden = (x: number, y: number, depth: number) => {
    for (let d = depth + 1; d <= 2; d++) {
      const A = alpha[d]!;
      const L = layers[d];
      const xi = x | 0;
      const yi = (y - L.y0) | 0;
      if (xi < 0 || yi < 0 || xi >= A.width || yi >= A.height) continue;
      if (A.data[(yi * A.width + xi) * 4 + 3] > 90) return true;
    }
    return false;
  };
  const wins: Win[] = [];
  for (let d = 0; d <= 2; d++) for (const wn of allWins[d]) if (!hidden(wn.x + wn.w / 2, wn.y + wn.h / 2, d)) wins.push(wn);
  const beaconsVis: Beacon[] = beacons.filter((b) => !hidden(b.x, b.y + 1, b.depth));

  // --- the rooftops right in front of the studio --------------------------
  const fy0 = Math.floor(h * 0.78);
  const fshade = canvas(w, h - fy0);
  const fg = c2d(fshade);
  fg.translate(0, -fy0);
  const frontWins: Win[] = [];
  {
    let x = -R() * 40 * k;
    while (x < w + 20 * k) {
      const bw = lerp(70, 170, R()) * k;
      const top = h * lerp(0.85, 0.935, R());
      paintRooftop(fg, x, bw, top, h, k, R);
      const cs = 11 * k;
      const rs = 10 * k;
      const cols = Math.floor((bw - 8 * k) / cs);
      const rows = Math.floor((h - top - 8 * k) / rs);
      const mx = x + (bw - cols * cs) / 2 + 2.5 * k;
      const warm = R() < 0.75;
      const bias = 0.15 + R() * 0.35;
      for (let r = 0; r < rows; r++) {
        const fr = R();
        for (let c = 0; c < cols; c++) {
          if (R() < 0.45) continue;
          frontWins.push({ x: mx + c * cs, y: top + 8 * k + r * rs, w: 6 * k, h: 4.6 * k, th: fr * 0.45 + R() * 0.5 + bias, c: warm ? (R() < 0.75 ? 0 : 6) : 3, a: 0.78 });
        }
      }
      x += bw + lerp(-4, 14, R()) * k;
    }
  }
  const front: Layer = { shade: fshade, y0: fy0, depth: 3 };

  // --- flickering windows + TVs (dynamic; excluded from the bake) ---------
  const flickers: Flicker[] = [];
  const pick = (list: Win[], n: number, tv: boolean, front: boolean) => {
    for (let i = 0; i < n && list.length; i++) {
      const idx = (R() * list.length) | 0;
      const wn = list[idx];
      if (wn.th > 0.9) continue;
      list.splice(idx, 1);
      flickers.push({ ...wn, front, period: tv ? 0.8 + R() * 0.8 : 14 + R() * 70, duty: 0.3 + R() * 0.5, phase: R() * 100, tv });
    }
  };
  pick(wins, Math.round(wins.length * 0.012), false, false);
  pick(frontWins, Math.round(frontWins.length * 0.03), false, true);
  pick(frontWins, 3, true, true);
  wins.sort((a, b) => a.c - b.c);
  frontWins.sort((a, b) => a.c - b.c);

  // --- stars --------------------------------------------------------------
  const stars = Array.from({ length: 34 }, () => ({ x: R() * w, y: R() * h * 0.5, r: (0.7 + R() * 0.9) * Math.max(1, k), a: 0.25 + R() * 0.6, f: 0.6 + R() * 2 }));

  // --- beacon glow sprite -------------------------------------------------
  const gs = Math.ceil(16 * Math.max(1, k));
  const glow = canvas(gs * 2, gs * 2);
  {
    const gg = c2d(glow);
    const rg = gg.createRadialGradient(gs, gs, 0, gs, gs, gs);
    rg.addColorStop(0, 'rgba(255,70,50,0.9)');
    rg.addColorStop(0.15, 'rgba(255,40,30,0.55)');
    rg.addColorStop(0.5, 'rgba(255,30,20,0.12)');
    rg.addColorStop(1, 'rgba(255,30,20,0)');
    gg.fillStyle = rg;
    gg.fillRect(0, 0, gs * 2, gs * 2);
  }

  // --- clouds -------------------------------------------------------------
  // one pre-scaled sprite per cloud, so every frame is a plain blit
  const sprites: CloudSprite[] = [];
  const CR = rng(seed * 3 + 11);
  const decks = [sprite(makeDeck(Math.ceil(w * 1.5), Math.ceil(h * 0.58), k, CR, 0)), sprite(makeDeck(Math.ceil(w * 1.3), Math.ceil(h * 0.5), k, CR, 1))];
  const clouds: CloudInst[] = [];
  const NC = 15;
  for (let i = 0; i < NC; i++) {
    const strat = i % 5 === 3;
    const sc = lerp(0.55, 1.15, CR());
    sprites.push(sprite(strat ? makeStratus(lerp(240, 340, CR()) * k * sc, lerp(20, 30, CR()) * k * sc, CR) : makeCumulus(lerp(150, 240, CR()) * k * sc, lerp(52, 84, CR()) * k * sc, CR)));
    clouds.push({
      sprite: sprites.length - 1,
      y: h * (strat ? lerp(0.04, 0.2, CR()) : lerp(0.08, 0.5, CR())),
      x0: CR() * (w + 300 * k),
      speed: lerp(2.2, 7, CR()) * k,
      s: 1,
      th: i < 3 ? i * 0.03 : lerp(0.12, 0.85, (i - 3) / (NC - 3)),
      storm: false,
    });
  }
  sprites.push(sprite(makeTower(286 * k, 220 * k, CR)));
  clouds.push({ sprite: sprites.length - 1, y: h * 0.12, x0: w * 0.1, speed: 1.4 * k, s: 1, th: 0.6, storm: true });
  // nearer clouds drift faster & sit lower: sort far→near by y
  clouds.sort((a, b) => a.y - b.y);

  return {
    w,
    h,
    k,
    back: layers,
    front,
    wins,
    frontWins,
    flickers,
    beacons: beaconsVis,
    cranes,
    monas,
    winBack: canvas(w, h - layers[2].y0),
    winFront: canvas(w, h - fy0),
    winKey: '',
    B: canvas(w, h - layers[2].y0),
    bY0: layers[2].y0,
    F: canvas(w, h - fy0),
    bKey: '',
    tmp: canvas(w, h),
    tmp2: canvas(w, h),
    skyC: canvas(w, h),
    skyKey: '',
    veilC: canvas(w, Math.ceil(h * 0.74)),
    veilKey: '',
    sprites,
    decks,
    clouds,
    stars,
    glow,
  };
}

/* ---- building painters (grey = how much light the facade gets) --------- */
const grey = (v: number) => {
  const c = q(v * 255);
  return `rgb(${c},${c},${c})`;
};
interface Part {
  x: number;
  y: number;
  w: number;
  b: number; // bottom
}
function paintBuilding(g: CanvasRenderingContext2D, gl: CanvasRenderingContext2D | null, depth: number, x: number, bw: number, top: number, h: number, k: number, R: () => number) {
  const parts: Part[] = [];
  const glassy = !!gl && R() < 0.55;
  const base = depth === 0 ? 0.86 + R() * 0.05 : 0.8 + R() * 0.12;
  let beacon: Beacon | undefined;
  const roll = R();
  const kind =
    depth === 0
      ? roll < 0.72
        ? 'slab'
        : roll < 0.86
          ? 'spire'
          : 'setback'
      : roll < 0.3
        ? 'slab'
        : roll < 0.5
          ? 'setback'
          : roll < 0.62
            ? 'spire'
            : roll < 0.72
              ? 'slant'
              : roll < 0.82
                ? 'crown'
                : roll < 0.92 && depth === 2
                  ? 'round'
                  : 'twin';
  const fill = (v: number) => (g.fillStyle = grey(v));
  const facet = depth > 0 ? 0.32 + R() * 0.2 : 0; // shadow side fraction
  const rect = (px: number, py: number, pw: number, bottom = h, v = base) => {
    fill(v);
    g.fillRect(px, py, pw, bottom - py);
    if (facet) {
      fill(v * 0.78);
      g.fillRect(px + pw * (1 - facet), py, pw * facet, bottom - py);
    }
    parts.push({ x: px, y: py, w: pw, b: bottom });
  };
  const spire = (cx: number, y: number, len: number) => {
    fill(base * 0.9);
    g.fillRect(cx - Math.max(0.7, 1 * k), y - len, Math.max(1.4, 2 * k), len);
    g.fillRect(cx - 2.5 * k, y - len * 0.35, 5 * k, len * 0.35);
    beacon = { x: cx, y: y - len, r: 1.6 * k, phase: R() * 3, steady: R() < 0.3 };
  };
  switch (kind) {
    case 'setback': {
      const tiers = 2 + ((R() * 2) | 0);
      const H = h - top;
      const fr = tiers === 2 ? [0.24, 0] : [0.32, 0.15, 0];
      let px = x;
      let pw = bw;
      let below = h;
      let tx = x;
      let tw = bw;
      for (let i = 0; i < tiers; i++) {
        const ty = top + H * fr[i];
        rect(px, ty, pw, below);
        below = ty;
        tx = px;
        tw = pw;
        const nw = pw * (0.66 + R() * 0.16);
        px += (pw - nw) * (0.3 + R() * 0.4);
        pw = nw;
      }
      if (depth > 0 && R() < 0.5) spire(tx + tw / 2, top, lerp(10, 26, R()) * k);
      else beacon = { x: tx + tw / 2, y: top - 1, r: 1.4 * k, phase: R() * 3, steady: R() < 0.3 };
      break;
    }
    case 'spire': {
      rect(x, top, bw);
      spire(x + bw * (0.3 + R() * 0.4), top, lerp(14, 46, R()) * k);
      break;
    }
    case 'slant': {
      const rise = bw * (0.25 + R() * 0.35);
      rect(x, top + rise, bw);
      fill(base * 1.04);
      g.beginPath();
      const left = R() < 0.5;
      g.moveTo(x, top + rise + 0.5);
      g.lineTo(x, top + (left ? 0 : rise));
      g.lineTo(x + bw, top + (left ? rise : 0));
      g.lineTo(x + bw, top + rise + 0.5);
      g.closePath();
      g.fill();
      beacon = { x: left ? x + 2 * k : x + bw - 2 * k, y: top, r: 1.5 * k, phase: R() * 3, steady: false };
      break;
    }
    case 'crown': {
      rect(x, top, bw);
      const cw = bw * 0.7;
      const cx = x + (bw - cw) / 2;
      const ch = lerp(10, 22, R()) * k;
      fill(base * 0.92);
      g.fillRect(cx, top - ch, 2 * k, ch);
      g.fillRect(cx + cw - 2 * k, top - ch, 2 * k, ch);
      g.fillRect(cx, top - ch, cw, 2.2 * k);
      for (let i = 1; i < 4; i++) g.fillRect(cx + (cw * i) / 4 - 0.6 * k, top - ch, 1.2 * k, ch);
      beacon = { x: cx + cw / 2, y: top - ch - 1, r: 1.5 * k, phase: R() * 3, steady: false };
      break;
    }
    case 'round': {
      // cylindrical glass tower with a domed cap
      const grd = g.createLinearGradient(x, 0, x + bw, 0);
      grd.addColorStop(0, grey(base * 0.84));
      grd.addColorStop(0.35, grey(Math.min(1, base * 1.06)));
      grd.addColorStop(1, grey(base * 0.72));
      g.fillStyle = grd;
      g.fillRect(x, top, bw, h - top);
      g.beginPath();
      g.ellipse(x + bw / 2, top, bw / 2, bw * 0.16, 0, Math.PI, 0);
      g.fill();
      parts.push({ x, y: top, w: bw, b: h });
      spire(x + bw / 2, top - bw * 0.16, lerp(10, 22, R()) * k);
      break;
    }
    case 'twin': {
      const tw = bw * 0.42;
      rect(x, top, tw);
      const top2 = top + lerp(-12, 18, R()) * k;
      rect(x + bw - tw, top2, tw);
      fill(base * 0.9);
      const by = Math.max(top, top2) + (h - top) * 0.3;
      g.fillRect(x + tw, by, bw - 2 * tw, 6 * k);
      beacon = { x: x + tw / 2, y: top - 1, r: 1.5 * k, phase: R() * 3, steady: true };
      break;
    }
    default: {
      rect(x, top, bw);
      if (depth > 0 && R() < 0.55) {
        // rooftop plant room
        const pw = bw * lerp(0.3, 0.55, R());
        const ph = lerp(3, 8, R()) * k;
        fill(base * 0.88);
        g.fillRect(x + (bw - pw) * R(), top - ph, pw, ph);
      }
      if (depth > 0 && R() < 0.25) spire(x + bw * R(), top, lerp(8, 18, R()) * k);
      else if (!beacon) beacon = { x: x + bw / 2, y: top - 1, r: 1.3 * k, phase: R() * 3, steady: R() < 0.4 };
    }
  }
  // facade texture on the nearer layers: floor bands + glass reflection
  if (glassy && gl) {
    for (const p of parts) {
      const grd = gl.createLinearGradient(0, p.y, 0, p.b);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(1, 'rgba(255,255,255,0.3)');
      gl.fillStyle = grd;
      gl.fillRect(p.x, p.y, p.w, p.b - p.y);
      if (facet) {
        gl.globalCompositeOperation = 'destination-out';
        gl.fillStyle = 'rgba(0,0,0,0.5)';
        gl.fillRect(p.x + p.w * (1 - facet), p.y, p.w * facet, p.b - p.y);
        gl.globalCompositeOperation = 'source-over';
      }
    }
  }
  if (depth >= 1 && kind !== 'round') {
    for (const p of parts) {
      g.save();
      g.beginPath();
      g.rect(p.x, p.y, p.w, p.b - p.y);
      g.clip();
      const glass = glassy;
      if (glass) {
        const grd = g.createLinearGradient(0, p.y, 0, p.y + (h - p.y) * 0.7);
        grd.addColorStop(0, 'rgba(255,255,255,0.22)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd;
        g.fillRect(p.x, p.y, p.w, h - p.y);
      }
      const fl = (depth === 2 ? 5.2 : 3.7) * k;
      if (fl >= 2.4) {
        g.fillStyle = `rgba(0,0,0,${depth === 2 ? 0.07 : 0.05})`;
        for (let y = p.y + fl * 0.6; y < h; y += fl) g.fillRect(p.x, y, p.w, Math.max(0.8, 1.1 * k));
      }
      if (depth === 2 && !glass) {
        g.fillStyle = 'rgba(0,0,0,0.05)';
        const cs = 4.6 * k;
        for (let xx = p.x + cs; xx < p.x + p.w - 1; xx += cs) g.fillRect(xx, p.y, Math.max(0.7, 0.9 * k), h - p.y);
      }
      g.restore();
    }
  }
  if (beacon && top > h * 0.5) beacon = undefined; // only tall towers carry warning lights
  return { parts, beacon };
}

function paintSite(g: CanvasRenderingContext2D, x: number, sw: number, top: number, h: number, k: number, R: () => number) {
  // building under construction: clad lower half, open slabs above
  const clad = top + (h - top) * 0.45;
  g.fillStyle = grey(0.84);
  g.fillRect(x, clad, sw, h - clad);
  g.fillStyle = grey(0.7);
  g.fillRect(x + sw * 0.35, top - 8 * k, sw * 0.3, clad - top + 8 * k); // core
  const fl = 6 * k;
  g.fillStyle = grey(0.8);
  for (let y = top; y < clad; y += fl) g.fillRect(x, y, sw, Math.max(1, 1.6 * k));
  for (let i = 0; i <= 4; i++) g.fillRect(x + (sw - 1.6 * k) * (i / 4), top, Math.max(1, 1.6 * k), clad - top);
  // safety netting on a few floors
  g.fillStyle = grey(0.9);
  g.globalAlpha = 0.45;
  g.fillRect(x, top + fl * 2, sw, fl * 2 + R() * fl * 2);
  g.globalAlpha = 1;
}

function paintRooftop(g: CanvasRenderingContext2D, x: number, bw: number, top: number, h: number, k: number, R: () => number) {
  const v = 0.78 + R() * 0.14;
  g.fillStyle = grey(v);
  g.fillRect(x, top, bw, h - top);
  g.fillStyle = grey(v * 1.08);
  g.fillRect(x - 1 * k, top, bw + 2 * k, 2.4 * k); // parapet
  g.fillStyle = 'rgba(0,0,0,0.06)';
  for (let y = top + 6 * k; y < h; y += 8 * k) g.fillRect(x, y + 5 * k, bw, 1.2 * k);
  // clutter: water tanks, AC units, a dish, antennas, a railing
  let cx = x + 6 * k;
  while (cx < x + bw - 16 * k) {
    const r = R();
    g.fillStyle = grey(v * (0.86 + R() * 0.12));
    if (r < 0.28) {
      const tw = lerp(10, 16, R()) * k;
      const th = tw * 0.9;
      g.fillRect(cx + 1.5 * k, top - th * 0.35, 1.4 * k, th * 0.35); // legs
      g.fillRect(cx + tw - 3 * k, top - th * 0.35, 1.4 * k, th * 0.35);
      g.beginPath();
      g.ellipse(cx + tw / 2, top - th * 0.35 - th * 0.5, tw / 2, th * 0.5, 0, 0, Math.PI * 2);
      g.fill();
      cx += tw + lerp(6, 20, R()) * k;
    } else if (r < 0.58) {
      const aw = lerp(8, 14, R()) * k;
      const ah = lerp(5, 8, R()) * k;
      g.fillRect(cx, top - ah, aw, ah);
      cx += aw + lerp(3, 14, R()) * k;
    } else if (r < 0.68) {
      g.fillRect(cx + 3 * k, top - 9 * k, 1.2 * k, 9 * k);
      g.beginPath();
      g.ellipse(cx + 3.5 * k, top - 10 * k, 4.5 * k, 2.4 * k, -0.6, 0, Math.PI * 2);
      g.fill();
      cx += 14 * k;
    } else if (r < 0.78) {
      const ah = lerp(14, 34, R()) * k;
      g.fillRect(cx, top - ah, Math.max(1, 1.2 * k), ah);
      g.fillRect(cx - 3 * k, top - ah * 0.7, 6 * k, Math.max(1, 0.9 * k));
      cx += 10 * k;
    } else {
      const rw = lerp(18, 40, R()) * k;
      g.fillRect(cx, top - 5 * k, rw, Math.max(1, 0.9 * k));
      for (let i = 0; i <= rw; i += 5 * k) g.fillRect(cx + i, top - 5 * k, Math.max(1, 0.9 * k), 5 * k);
      cx += rw + 6 * k;
    }
  }
}

/* ---- cloud sprites (grey, white top → shaded base) ---------------------- */
function sprite(gray: Cnv): CloudSprite {
  return { gray, tinted: canvas(gray.width, gray.height), key: '' };
}

function puff(g: CanvasRenderingContext2D, x: number, y: number, r: number, a = 1, sy = 1) {
  const rg = g.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, `rgba(255,255,255,${a})`);
  rg.addColorStop(0.55, `rgba(255,255,255,${a * 0.85})`);
  rg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rg;
  if (sy !== 1) {
    g.save();
    g.translate(x, y);
    g.scale(1, sy);
    g.translate(-x, -y);
    g.fillRect(x - r, y - r, r * 2, r * 2);
    g.restore();
  } else g.fillRect(x - r, y - r, r * 2, r * 2);
}

function shadeCloud(g: CanvasRenderingContext2D, W: number, H: number, top = 1, bottom = 0.72) {
  g.globalCompositeOperation = 'source-atop';
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, grey(top));
  grd.addColorStop(0.55, grey(lerp(top, bottom, 0.45)));
  grd.addColorStop(1, grey(bottom));
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
}

function makeCumulus(W: number, H: number, R: () => number): Cnv {
  const c = canvas(W, H);
  const g = c2d(c);
  const n = 9 + ((R() * 6) | 0);
  const baseY = H * 0.84;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const bell = Math.sin(Math.PI * u);
    const r = H * (0.2 + 0.36 * bell) * (0.8 + R() * 0.4);
    const x = W * (0.1 + 0.8 * u) + (R() - 0.5) * W * 0.04;
    puff(g, x, baseY - r * 0.55, r);
  }
  for (let i = 0; i < n; i++) {
    const u = 0.2 + 0.6 * R();
    const r = H * (0.14 + 0.16 * R());
    puff(g, W * u, baseY - H * (0.35 + 0.3 * Math.sin(Math.PI * u)) - r * 0.2, r, 0.9);
  }
  // flat base
  g.globalCompositeOperation = 'destination-out';
  const grd = g.createLinearGradient(0, baseY - H * 0.06, 0, H);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = grd;
  g.fillRect(0, baseY - H * 0.06, W, H);
  g.globalCompositeOperation = 'source-over';
  shadeCloud(g, W, H, 1, 0.7);
  return c;
}

function makeStratus(W: number, H: number, R: () => number): Cnv {
  const c = canvas(W, H);
  const g = c2d(c);
  const n = 16;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const r = H * (0.35 + 0.25 * Math.sin(Math.PI * u)) * (0.8 + R() * 0.4);
    puff(g, W * (0.08 + 0.84 * u), H * 0.55, r * 1.6, 0.55, 0.45);
  }
  shadeCloud(g, W, H, 1, 0.85);
  return c;
}

function makeTower(W: number, H: number, R: () => number): Cnv {
  // cumulonimbus with an anvil
  const c = canvas(W, H);
  const g = c2d(c);
  for (let i = 0; i < 26; i++) {
    const v = i / 25;
    const y = H * (0.95 - 0.8 * v);
    const spread = v > 0.75 ? 0.45 : 0.24 - v * 0.08;
    const x = W * (0.5 + (R() - 0.5) * spread);
    const r = H * (v > 0.75 ? 0.1 : 0.17) * (0.8 + R() * 0.4);
    puff(g, x, y, r, 0.95, v > 0.75 ? 0.5 : 1);
  }
  for (let i = 0; i < 10; i++) puff(g, W * (0.1 + R() * 0.8), H * 0.17 + R() * H * 0.05, H * 0.08, 0.7, 0.4);
  shadeCloud(g, W, H, 1, 0.55);
  return c;
}

function makeDeck(W: number, H: number, k: number, R: () => number, variant: number): Cnv {
  // a tileable overcast deck: dense at the top, ragged underside
  const c = canvas(W, H);
  const g = c2d(c);
  const n = Math.round((W / k) * 0.12);
  const draw = (x: number, y: number, r: number, a: number, sy: number) => {
    puff(g, x, y, r, a, sy);
    if (x - r < 0) puff(g, x + W, y, r, a, sy);
    if (x + r > W) puff(g, x - W, y, r, a, sy);
  };
  // guaranteed coverage near the top (uniform across x, so it still tiles)
  const base = g.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, 'rgba(255,255,255,0.92)');
  base.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  base.addColorStop(0.75, 'rgba(255,255,255,0)');
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < n; i++) {
    const y = H * Math.pow(R(), 1.6) * 0.85;
    const r = (lerp(40, 110, R()) + (1 - y / H) * 60) * k;
    draw(R() * W, y, r, 0.65 + R() * 0.3, 0.5);
  }
  // mottling: darker cells and lighter breaks
  g.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < n * 1.2; i++) {
    const x = R() * W;
    const y = R() * H;
    const r = lerp(22, 60, R()) * k;
    const dark = R() < 0.55;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, dark ? `rgba(120,120,120,${0.12 + variant * 0.06})` : 'rgba(255,255,255,0.3)');
    rg.addColorStop(1, dark ? 'rgba(120,120,120,0)' : 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.save();
    g.translate(x, y);
    g.scale(1.8, 0.5);
    g.translate(-x, -y);
    g.fillRect(x - r, y - r, r * 2, r * 2);
    g.restore();
  }
  g.globalCompositeOperation = 'source-over';
  shadeCloud(g, W, H, 0.98, 0.7);
  return c;
}

/* ------------------------------------------------------------------------ */
/* tinting: grey shading × colour, alpha preserved                          */
/* ------------------------------------------------------------------------ */
function tint(dst: Cnv, src: Cnv, top: RGB, bottom: RGB, y0 = 0, hTotal = src.height) {
  const g = c2d(dst);
  g.globalCompositeOperation = 'copy';
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'multiply';
  const grd = g.createLinearGradient(0, -y0, 0, hTotal - y0);
  grd.addColorStop(0, css(top));
  grd.addColorStop(1, css(bottom));
  g.fillStyle = grd;
  g.fillRect(0, 0, dst.width, dst.height);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-over';
}

const lift = (c: RGB, k: number): RGB => [Math.min(255, c[0] / k), Math.min(255, c[1] / k), Math.min(255, c[2] / k)];

/* ------------------------------------------------------------------------ */
/* glass: droplets + rivulets (shared caches per size)                       */
/* ------------------------------------------------------------------------ */
const glassCache = new Map<string, Cnv>();
/** droplet field for a rain level (0 drizzle, 1 rain, 2 storm), one canvas each */
function dropletField(w: number, h: number, level: number): Cnv {
  const id = `${w}x${h}:${level}`;
  let f = glassCache.get(id);
  if (f) return f;
  if (glassCache.size > 5) glassCache.clear();
  const k = h / 740;
  f = canvas(w, h);
  const g = c2d(f);
  for (let layer = 0; layer <= level; layer++) {
    const R = rng(4242 + layer * 97);
    const n = Math.round(((w * h) / (700 * 740)) * [170, 190, 230][layer]);
    for (let i = 0; i < n; i++) {
      const x = R() * w;
      const y = R() * h;
      const r = (layer === 2 ? lerp(0.8, 2.2, R()) : lerp(1.2, 3.8, Math.pow(R(), 2))) * k;
      const sy = 1 + R() * 0.35;
      // refraction: darker rim below, bright core, highlight top-left
      g.fillStyle = 'rgba(20,24,30,0.16)';
      g.beginPath();
      g.ellipse(x, y + r * 0.25, r * 1.05, r * sy * 1.05, 0, 0, Math.PI * 2);
      g.fill();
      const rg = g.createRadialGradient(x, y - r * 0.2, 0, x, y, r * sy);
      rg.addColorStop(0, 'rgba(255,255,255,0.05)');
      rg.addColorStop(0.7, 'rgba(255,255,255,0.12)');
      rg.addColorStop(1, 'rgba(255,255,255,0.32)');
      g.fillStyle = rg;
      g.beginPath();
      g.ellipse(x, y, r, r * sy, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.beginPath();
      g.arc(x - r * 0.35, y - r * 0.4, Math.max(0.5, r * 0.28), 0, Math.PI * 2);
      g.fill();
    }
  }
  glassCache.set(id, f);
  return f;
}

function paintGlass(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, wx: Wx) {
  const rain = Math.max(wx.rain, wx.storm);
  if (wx.fog > 0.5 && rain < 0.05) {
    // a little condensation in the corners
    const a = (wx.fog - 0.5) * 0.5;
    for (const [x, y] of [
      [0, h],
      [w, h],
    ]) {
      const rr = h * 0.45;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, rr);
      rg.addColorStop(0, `rgba(255,255,255,${a})`);
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
  }
  if (rain < 0.05) return;
  const level = rain < 0.5 ? 0 : wx.storm < 0.5 ? 1 : 2;
  if (!softwareRendering()) {
    ctx.globalAlpha = clamp01(rain * 2.4);
    ctx.drawImage(dropletField(w, h, level), 0, 0);
    ctx.globalAlpha = 1;
  }
  // rivulets: stick–slip slides with a wet trail
  const k = h / 740;
  const n = Math.round(lerp(2, 13, rain) * Math.max(0.6, w / 700));
  ctx.lineCap = 'round';
  for (let j = 0; j < n; j++) {
    const v = lerp(14, 40, hash(j * 17 + 1)) * k * (0.6 + rain * 0.6);
    const span = h * 1.5;
    const tt = t + hash(j * 5 + 9) * 100;
    const travel = tt * v + Math.max(0, Math.sin(tt * (0.7 + hash(j) * 0.8))) * 26 * k;
    const y = (travel % span) - h * 0.25;
    const x0 = hash(j * 29 + 3) * w;
    const xAt = (yy: number) => x0 + Math.sin(yy * 0.021 / k + j * 1.7) * 5 * k + Math.sin(yy * 0.07 / k + j) * 1.4 * k;
    const trail = lerp(60, 180, hash(j * 13 + 7)) * k;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const yy = y - trail * (1 - i / 10);
      if (i === 0) ctx.moveTo(xAt(yy), yy);
      else ctx.lineTo(xAt(yy), yy);
    }
    ctx.strokeStyle = 'rgba(20,24,30,0.12)';
    ctx.lineWidth = 2.6 * k;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.3 * k;
    ctx.stroke();
    const r = 3 * k;
    const hx = xAt(y);
    ctx.fillStyle = 'rgba(20,24,30,0.2)';
    ctx.beginPath();
    ctx.ellipse(hx, y + r * 0.3, r * 1.05, r * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(hx, y, r, r * 1.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(hx - r * 0.35, y - r * 0.45, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Droplets & rivulets on the glass for rainy kinds (transparent background;
 *  composite it normally on top of the window, not with multiply). */
export function drawGlass(ctx: CanvasRenderingContext2D, w: number, h: number, s: SkyState) {
  paintGlass(ctx, w, h, s.t, WX[s.kind] ?? WX.clear);
}

/* ------------------------------------------------------------------------ */
/* the sky                                                                   */
/* ------------------------------------------------------------------------ */
const sceneCache = new Map<string, { scene: Scene; users: number }>();

export function createSky(opts: SkyOptions = {}): Sky {
  const seed = opts.seed ?? 2026;
  const low = opts.quality === 'low';
  let scene: Scene | null = null;
  let sceneId = '';
  let wx: Wx | null = null;
  let lastT = -1e9;
  let flashOut = 0;
  let lightOut = 1;
  const boltCache = new Map<number, Path2D>();
  // self-throttle: skip redraws when frames are expensive (software GL, slow CPU)
  let drawnAt = -1e9;
  let drawnKey = '';
  let cost = 0; // smoothed main-thread ms per draw

  const release = () => {
    if (!sceneId) return;
    const e = sceneCache.get(sceneId);
    if (e && --e.users <= 0) sceneCache.delete(sceneId);
    scene = null;
    sceneId = '';
  };

  const ensure = (w: number, h: number) => {
    const id = `${w}x${h}:${seed}`;
    if (id === sceneId && scene) return scene;
    release();
    let e = sceneCache.get(id);
    if (!e) {
      e = { scene: buildScene(w, h, seed), users: 0 };
      sceneCache.set(id, e);
    }
    e.users++;
    sceneId = id;
    scene = e.scene;
    return scene;
  };

  const ease = (target: Wx, t: number) => {
    const dt = t - lastT;
    lastT = t;
    if (!wx || dt < 0 || dt > 2) {
      wx = { ...target };
      return wx;
    }
    const a = 1 - Math.exp(-dt / 0.7);
    for (const f of WX_KEYS) wx[f] += (target[f] - wx[f]) * a;
    return wx;
  };

  const bolt = (S: Scene, st: Strike) => {
    let p = boltCache.get(st.id);
    if (p) return p;
    const R = rng(st.id * 7 + 1);
    const { w, h, k } = S;
    p = new Path2D();
    let x = w * (0.12 + R() * 0.76);
    let y = h * (0.08 + R() * 0.08);
    const end = h * (0.5 + R() * 0.12);
    p.moveTo(x, y);
    const branches: [number, number][] = [];
    while (y < end) {
      x += (R() - 0.5) * 22 * k;
      y += lerp(8, 18, R()) * k;
      p.lineTo(x, y);
      if (R() < 0.18) branches.push([x, y]);
    }
    for (const [bx0, by0] of branches) {
      let bx = bx0;
      let by = by0;
      const dir = R() < 0.5 ? -1 : 1;
      p.moveTo(bx, by);
      const len = 3 + ((R() * 5) | 0);
      for (let i = 0; i < len; i++) {
        bx += dir * lerp(4, 14, R()) * k;
        by += lerp(5, 12, R()) * k;
        p.lineTo(bx, by);
      }
    }
    if (boltCache.size > 4) boltCache.clear();
    boltCache.set(st.id, p);
    return p;
  };

  function draw(ctx: CanvasRenderingContext2D, w: number, h: number, s: SkyState): SkyFrame {
    w = Math.max(2, Math.round(w));
    h = Math.max(2, Math.round(h));
    const flashNow = Math.max(s.flash ?? 0, lightningAt(s.t, wx ? wx.storm : WX[s.kind]?.storm ?? 0));
    const fkey = `${w}x${h}|${s.kind}|${Math.round(s.hour * 60)}`;
    const minGap = softwareRendering() ? 0.5 : cost > 10 ? 0.1 : cost > 5 ? 0.05 : 0;
    if (minGap && fkey === drawnKey && s.t - drawnAt < minGap && s.t >= drawnAt && flashNow < 0.05) {
      flashOut = flashNow;
      LAST_FLASH = flashNow;
      return { flash: flashNow, light: lightOut };
    }
    drawnKey = fkey;
    drawnAt = s.t;
    const t0 = performance.now();
    const out = paint(ctx, w, h, s);
    cost = cost * 0.85 + (performance.now() - t0) * 0.15;
    lightOut = out.light;
    return out;
  }

  function paint(ctx: CanvasRenderingContext2D, w: number, h: number, s: SkyState): SkyFrame {
    const S = ensure(w, h);
    const k = S.k;
    const t = s.t;
    const W = ease(WX[s.kind] ?? WX.clear, t);
    const L = look(s.hour, W);
    // cached layers use a quantised look (1 WIB minute, weather in 1/12 steps)
    const Wq = { ...W };
    for (const f of WX_KEYS) Wq[f] = Math.round(W[f] * 12) / 12;
    const LQ = look(Math.floor(s.hour * 60) / 60, Wq);
    const flash = Math.max(s.flash ?? 0, lightningAt(t, W.storm));
    flashOut = flash;
    LAST_FLASH = flash;

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    /* 1 · sky: gradient + sun/moon glow, cached per WIB minute */
    const hq = Math.floor(s.hour * 60) / 60;
    const hy = h * HORIZON;
    const hr = ((hq % 24) + 24) % 24;
    const p = (hr - 5.85) / (17.95 - 5.85); // sun: 05:50 → 17:55, overhead at noon
    const sunUp = p > -0.08 && p < 1.08;
    const e = Math.sin(Math.PI * clamp01(p));
    const lowSun = 1 - e;
    const sx = w * (0.06 + 0.88 * p);
    const sy = hy + h * 0.02 - e * (hy + h * 0.3);
    const glowA = sunUp ? (0.55 + 0.35 * lowSun) * (1 - Wq.cover * 0.7) * (1 - Wq.fog * 0.3) * smooth(-0.08, 0.02, p) * smooth(1.08, 0.98, p) : 0;
    const qn = clamp01(((hr - 18.3 + 24) % 24) / 11.7); // moon rises ~18:20
    const mx = w * (0.12 + 0.76 * qn);
    const my = hy - Math.sin(Math.PI * qn) * (hy - h * 0.07);
    const moonVis = smooth(0.34, 0.08, LQ.light) * (1 - Wq.cover * 0.85) * (1 - Wq.fog * 0.6);
    const skyId = `${key(LQ.zen)}|${key(LQ.mid)}|${key(LQ.hor)}|${key(LQ.haze)}|${key(LQ.glow)}|${glowA > 0.01 ? `${sx | 0},${sy | 0},${(glowA * 60) | 0}` : ''}|${moonVis > 0.02 ? `${mx | 0},${my | 0},${(moonVis * 40) | 0}` : ''}`;
    if (skyId !== S.skyKey) {
      S.skyKey = skyId;
      const g = c2d(S.skyC);
      vgrad(g, 0, 0, w, h, [
        [0, css(LQ.zen)],
        [0.42, css(LQ.mid)],
        [HORIZON, css(LQ.hor)],
        [1, css(mix(LQ.hor, LQ.haze, 0.5))],
      ]);
      if (glowA > 0.01)
        rglow(g, sx, sy, (160 + 120 * lowSun) * k, [
          [0, css(mix(LQ.glow, [255, 255, 255], 0.5), glowA)],
          [0.25, css(LQ.glow, glowA * 0.45)],
          [1, css(LQ.glow, 0)],
        ]);
      if (moonVis > 0.02)
        rglow(g, mx, my, 63 * k, [
          [0.07, `rgba(220,228,255,${(0.28 * moonVis).toFixed(3)})`],
          [1, 'rgba(220,228,255,0)'],
        ]);
    }
    ctx.drawImage(S.skyC, 0, 0);

    /* 2 · stars, moon, sun discs */
    const starVis = smooth(0.16, 0.03, L.light) * Math.pow(1 - W.cover, 2) * (1 - W.fog);
    if (starVis > 0.02) {
      for (let i = 0; i < S.stars.length; i++) {
        const st = S.stars[i];
        const tw = 0.75 + 0.25 * Math.sin(t * st.f + i * 2.1);
        ctx.fillStyle = `rgba(235,238,255,${(st.a * tw * starVis).toFixed(3)})`;
        ctx.fillRect(st.x, st.y, st.r, st.r);
      }
    }
    if (moonVis > 0.02) drawMoon(ctx, mx, my, 9 * k, moonVis, L);
    const discA = sunUp ? (1 - W.cover * 1.05) * (1 - W.fog * 0.6) * smooth(-0.08, 0.02, p) * smooth(1.08, 0.98, p) : 0;
    if (discA > 0.02 && sy > -12 * k) {
      ctx.fillStyle = css(mix([255, 250, 238], [255, 128, 52], Math.pow(lowSun, 2.2)), clamp01(discA));
      ctx.beginPath();
      ctx.ellipse(sx, sy, 11 * k, 11 * k * (1 - 0.12 * Math.pow(lowSun, 4)), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    /* 3 · clouds */
    retintClouds(S, LQ, Wq);
    for (const c of S.clouds) {
      let a = smooth(c.th, c.th + 0.12, W.cover);
      if (c.storm) a = smooth(0.5, 1, W.storm) * 0.9;
      else a *= 1 - smooth(0.85, 1, W.cover) * 0.4;
      if (a < 0.01) continue;
      const sp = S.sprites[c.sprite];
      const sw = sp.tinted.width;
      const sh = sp.tinted.height;
      const span = w + sw;
      const x = ((((c.x0 + t * c.speed * (1 + W.storm * 1.5)) % span) + span) % span) - sw;
      ctx.globalAlpha = a * (1 - W.fog * 0.85);
      ctx.drawImage(sp.tinted, Math.round(x), Math.round(c.y - sh * 0.5));
    }
    const deckA = smooth(0.42, 0.85, W.cover) * (1 - W.fog * 0.4);
    if (deckA > 0.01) {
      for (let i = 0; i < 2; i++) {
        const d = S.decks[i];
        const a = i === 0 ? deckA : deckA * smooth(0.25, 0.9, Math.max(W.rain, W.dark * 1.4)) * 0.9;
        if (a < 0.01) continue;
        const dw = d.tinted.width;
        const off = Math.round((((t * (i ? 5.5 : 3.2) * k * (1 + W.storm)) % dw) + dw) % dw);
        ctx.globalAlpha = a;
        const y = Math.round(i ? h * 0.06 : -h * 0.02);
        ctx.drawImage(d.tinted, -off, y);
        if (dw - off < w) ctx.drawImage(d.tinted, dw - off, y);
      }
    }
    ctx.globalAlpha = 1;

    /* 4 · aircraft on approach (tiny, blinking at night) */
    drawPlane(ctx, S, t, L, W);

    /* 5 · lightning: sky flash + bolt behind the towers */
    if (flash > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      const fk = flash * (1 - L.light * 0.55);
      vgrad(ctx, 0, 0, w, h, [
        [0, `rgba(170,170,235,${(fk * 0.55).toFixed(3)})`],
        [HORIZON, `rgba(215,205,255,${(fk * 0.75).toFixed(3)})`],
        [1, `rgba(215,205,255,${(fk * 0.75).toFixed(3)})`],
      ]);
      ctx.globalCompositeOperation = 'source-over';
      for (const st of strikesNear(t)) {
        const dt = t - st.t0;
        if (!st.bolt || dt < 0 || dt > 0.55) continue;
        const e = strikeEnvelope(dt, st.power);
        if (e < 0.25) continue;
        const path = bolt(S, st);
        ctx.lineJoin = 'round';
        ctx.strokeStyle = `rgba(200,195,255,${(e * 0.35).toFixed(3)})`;
        ctx.lineWidth = 5 * k;
        ctx.stroke(path);
        ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, e * 1.2).toFixed(3)})`;
        ctx.lineWidth = 1.5 * k;
        ctx.stroke(path);
      }
    }

    /* 6 · skyline (far → near), windows, cranes, beacons */
    composeSkyline(S, LQ, Wq);
    ctx.drawImage(S.B, 0, S.bY0);
    drawCranes(ctx, S, t, LQ, Wq);
    drawFlickers(ctx, S, t, LQ, false);
    drawBeacons(ctx, S, t, L);

    /* 7 · rooftops right outside */
    ctx.drawImage(S.F, 0, S.front.y0);
    drawFlickers(ctx, S, t, LQ, true);

    /* 8 · one veil for haze, drifting fog banks and sheets of rain */
    const fogA = W.fog * 0.6;
    const rainA = W.rain * 0.15;
    if (fogA + rainA > 0.03) {
      const fc = mix(mix(L.haze, L.hor, 0.4), [196, 194, 240], flash * (1 - L.light * 0.55) * 0.7);
      const vy = h - S.veilC.height;
      const phase = Math.round((t * 0.06) / 0.07) * 0.07;
      const vid = `${key(fc)}|${(fogA * 60) | 0}|${(rainA * 60) | 0}|${phase.toFixed(2)}`;
      if (vid !== S.veilKey) {
        S.veilKey = vid;
        const stops: [number, string][] = [];
        for (let i = 0; i <= 14; i++) {
          const u = i / 14;
          const yy = lerp(vy / h, 1, u);
          const env = smooth(0.26, 0.44, yy) * (1 - smooth(0.8, 0.92, yy) * 0.55);
          const bands = 0.78 + 0.22 * Math.sin(yy * 16 + phase) * Math.sin(yy * 7 - phase * 0.6);
          stops.push([u, css(fc, fogA * env * bands + rainA * smooth(0.26, 0.62, yy))]);
        }
        const g = c2d(S.veilC);
        g.clearRect(0, 0, S.veilC.width, S.veilC.height);
        vgrad(g, 0, 0, w, S.veilC.height, stops);
      }
      ctx.drawImage(S.veilC, 0, vy);
    }

    /* 9 · precipitation */
    if (W.rain > 0.02) drawRain(ctx, S, t, W, L, low);
    if (W.snow > 0.02) drawSnow(ctx, S, t, W);

    /* 10 · ambient flash wash */
    if (flash > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(190,190,255,${(flash * 0.16).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
    return { flash, light: L.eff };
  }

  return {
    draw,
    drawGlass(ctx, w, h, s) {
      const W = wx && Math.abs(s.t - lastT) < 2 ? wx : WX[s.kind] ?? WX.clear;
      paintGlass(ctx, Math.round(w), Math.round(h), s.t, W);
    },
    lastFlash: () => flashOut,
    dispose: release,
  };
}

/* ------------------------------------------------------------------------ */
/* cached retints                                                            */
/* ------------------------------------------------------------------------ */
const DEPTH_CONTRAST = [0.24, 0.46, 0.7, 0.92];

function layerColors(L: Look, W: Wx, depth: number): [RGB, RGB] {
  const c = DEPTH_CONTRAST[depth] * (1 - W.fog * (0.95 - depth * 0.1)) * (1 - W.rain * 0.22);
  const top = mix(L.haze, L.city, c);
  const bottom = mix(top, L.haze, 0.32 * (1 - depth / 4) + W.fog * 0.2);
  // shading canvases are drawn with "lit facade" = white; base ≈ 0.85
  return [lift(top, 0.86), lift(bottom, 0.86)];
}

/** paints one grey layer, tinted (and glass-reflective), into S.tmp */
function paintLayer(S: Scene, Ly: Layer, top: RGB, bottom: RGB, rTop: RGB, rBot: RGB, refl: number) {
  tint(S.tmp, Ly.shade, top, bottom, Ly.y0, S.h);
  if (!Ly.glass || refl < 0.01) return;
  // curtain walls mirror the sky: peach at dawn, molten at sunset
  const tg = c2d(S.tmp2);
  const gw = Ly.glass.width;
  const gh = Ly.glass.height;
  tg.globalCompositeOperation = 'copy';
  tg.drawImage(Ly.glass, 0, 0);
  tg.globalCompositeOperation = 'source-in';
  const grd = tg.createLinearGradient(0, -Ly.y0 + S.h * 0.2, 0, S.h - Ly.y0);
  grd.addColorStop(0, css(rTop));
  grd.addColorStop(1, css(rBot));
  tg.fillStyle = grd;
  tg.fillRect(0, 0, gw, gh);
  tg.globalCompositeOperation = 'source-over';
  const lg = c2d(S.tmp);
  lg.globalAlpha = refl;
  lg.globalCompositeOperation = 'source-atop';
  lg.drawImage(S.tmp2, 0, 0, gw, gh, 0, 0, gw, gh);
  lg.globalCompositeOperation = 'source-over';
  lg.globalAlpha = 1;
}

/** Re-bakes the skyline composites when the (quantised) light changes. */
function composeSkyline(S: Scene, L: Look, W: Wx) {
  const lit = Math.round(L.lit * 40) / 40;
  const nightish = L.light < 0.5 ? 1 : 0;
  const winKey = `${lit}|${nightish}`;
  if (winKey !== S.winKey) {
    S.winKey = winKey;
    bakeWindows(S, lit, !!nightish);
  }
  const winA = Math.round(L.win * 20) / 20;
  const rTop = mix(L.mid, L.zen, 0.3);
  const rBot = mix(L.hor, L.glow, 0.3);
  const reflBase = (0.3 + 0.7 * L.light) * (1 - W.fog * 0.7) * (1 - W.rain * 0.3);
  const cols = [...S.back, S.front].map((Ly) => layerColors(L, W, Ly.depth));
  const id = `${winKey}|${winA}|${key(rTop)}${key(rBot)}|${(reflBase * 50).toFixed(0)}|${cols.map(([a, b]) => key(a) + key(b)).join('/')}`;
  if (id === S.bKey) return;
  S.bKey = id;
  const w = S.w;
  const g = c2d(S.B);
  g.clearRect(0, 0, S.B.width, S.B.height);
  S.back.forEach((Ly, i) => {
    const refl = Ly.glass ? (Ly.depth === 2 ? 0.5 : 0.32) * reflBase : 0;
    paintLayer(S, Ly, cols[i][0], cols[i][1], rTop, rBot, refl);
    const lh = Ly.shade.height;
    g.drawImage(S.tmp, 0, 0, w, lh, 0, Ly.y0 - S.bY0, w, lh);
  });
  if (winA > 0.02) {
    g.globalAlpha = winA;
    g.drawImage(S.winBack, 0, 0);
    g.globalAlpha = 1;
  }
  const f = c2d(S.F);
  f.clearRect(0, 0, S.F.width, S.F.height);
  paintLayer(S, S.front, cols[3][0], cols[3][1], rTop, rBot, 0);
  f.drawImage(S.tmp, 0, 0, w, S.F.height, 0, 0, w, S.F.height);
  if (winA > 0.02) {
    f.globalAlpha = Math.min(1, winA * 1.05);
    f.drawImage(S.winFront, 0, 0);
    f.globalAlpha = 1;
  }
}

function retintClouds(S: Scene, L: Look, W: Wx) {
  const lit = lift(L.cloud, 0.9);
  const deck = lift(mix(mix(L.cloud, L.zen, 0.28), L.mid, 0.2), 0.88);
  const deck2 = lift(mix(L.cloud, L.zen, 0.45 + W.dark * 0.2), 0.86);
  const storm = lift(mix(L.cloud, L.zen, 0.35), 0.85);
  S.sprites.forEach((sp, i) => {
    const c = i === S.sprites.length - 1 ? storm : lit;
    const id = key(c);
    if (id !== sp.key) {
      sp.key = id;
      tint(sp.tinted, sp.gray, c, c);
    }
  });
  S.decks.forEach((d, i) => {
    const c = i ? deck2 : deck;
    const id = key(c);
    if (id !== d.key) {
      d.key = id;
      tint(d.tinted, d.gray, c, c);
    }
  });
}

function bakeWindows(S: Scene, lit: number, nightish: boolean) {
  const bake = (cv: Cnv, list: Win[], y0: number) => {
    const g = c2d(cv);
    g.clearRect(0, 0, cv.width, cv.height);
    let cur = -1;
    let curA = -1;
    for (const wn of list) {
      if (wn.th > lit) continue;
      if (wn.c !== cur || wn.a !== curA) {
        cur = wn.c;
        curA = wn.a;
        g.fillStyle = css(WIN_RGB[cur], wn.a);
      }
      g.fillRect(wn.x, wn.y - y0, wn.w, wn.h);
    }
  };
  bake(S.winBack, S.wins, S.bY0);
  bake(S.winFront, S.frontWins, S.front.y0);
}

/* ------------------------------------------------------------------------ */
/* dynamic painters                                                          */
/* ------------------------------------------------------------------------ */
function drawMoon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number, L: Look) {
  const ph = moonPhase();
  const c = Math.cos(ph * Math.PI * 2);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.9); // near the equator the crescent lies on its back
  if (ph > 0.5) ctx.scale(-1, 1);
  ctx.globalAlpha = a;
  ctx.fillStyle = css(mix(L.mid, [255, 255, 255], 0.08));
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f3f0e4';
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
  ctx.ellipse(0, 0, r * Math.abs(c), r, 0, Math.PI / 2, -Math.PI / 2, c > 0);
  ctx.fill();
  ctx.restore();
}

function drawPlane(ctx: CanvasRenderingContext2D, S: Scene, t: number, L: Look, W: Wx) {
  const slot = 70;
  const i = Math.floor(t / slot);
  if (hash(i * 13 + 2) > 0.55 || W.fog > 0.6) return;
  const dur = 46;
  const u = (t - i * slot) / dur;
  if (u < 0 || u > 1) return;
  const { w, h, k } = S;
  const dir = hash(i * 3 + 1) < 0.5 ? 1 : -1;
  const x = dir > 0 ? lerp(-0.05, 1.05, u) * w : lerp(1.05, -0.05, u) * w;
  const y = h * (0.1 + hash(i * 7 + 5) * 0.16) + u * h * 0.05;
  const vis = 1 - W.cover * 0.8;
  if (L.light > 0.35) {
    ctx.fillStyle = `rgba(60,66,76,${(0.55 * vis).toFixed(3)})`;
    ctx.fillRect(x - 3 * k, y, 6 * k, 1.2 * k);
    ctx.fillRect(x - 0.6 * k, y - 1.2 * k, 1.8 * k, 3.2 * k);
  } else {
    const blink = (t * 1.3) % 1 < 0.12;
    ctx.fillStyle = `rgba(255,250,240,${(0.7 * vis).toFixed(3)})`;
    ctx.fillRect(x, y, 1.6 * k, 1.6 * k);
    if (blink) {
      ctx.fillStyle = `rgba(255,70,60,${vis.toFixed(3)})`;
      ctx.fillRect(x - 3 * k * dir, y, 1.8 * k, 1.8 * k);
    }
  }
}

function drawCranes(ctx: CanvasRenderingContext2D, S: Scene, t: number, L: Look, W: Wx) {
  const { k } = S;
  const [top] = layerColors(L, W, 2);
  const col = mix(scale(top, 0.86), mix(hex('#e0aa2e'), L.haze, 0.3), 0.55 * Math.sqrt(L.light));
  ctx.strokeStyle = css(col);
  ctx.fillStyle = css(col);
  ctx.lineWidth = Math.max(0.8, 1 * k);
  for (const c of S.cranes) {
    const th = c.phase + t * c.speed;
    const cj = Math.cos(th);
    const jx = c.jib * cj;
    const cx = -c.counter * cj;
    const y = c.top;
    const m = c.mastW;
    ctx.beginPath();
    // mast lattice
    ctx.moveTo(c.x - m / 2, c.base);
    ctx.lineTo(c.x - m / 2, y);
    ctx.moveTo(c.x + m / 2, c.base);
    ctx.lineTo(c.x + m / 2, y);
    for (let yy = y, i = 0; yy < c.base; yy += m * 1.2, i++) {
      ctx.moveTo(c.x - m / 2, yy);
      ctx.lineTo(c.x + m / 2, yy + m * 1.2);
    }
    // jib + counter-jib
    const jy = y - m * 0.2;
    ctx.moveTo(c.x + cx, jy);
    ctx.lineTo(c.x + jx, jy);
    ctx.moveTo(c.x, jy + m * 0.6);
    ctx.lineTo(c.x + jx * 0.98, jy + m * 0.25);
    // apex + ties
    const ay = y - m * 3.4;
    ctx.moveTo(c.x, jy);
    ctx.lineTo(c.x, ay);
    ctx.lineTo(c.x + jx * 0.7, jy);
    ctx.moveTo(c.x, ay);
    ctx.lineTo(c.x + cx * 0.9, jy);
    // hook
    const tx = c.x + jx * (0.55 + 0.15 * Math.sin(t * 0.03 + c.phase));
    ctx.moveTo(tx, jy);
    ctx.lineTo(tx, jy + (40 + 20 * Math.sin(t * 0.02)) * k);
    ctx.stroke();
    // counterweight + cab
    ctx.fillRect(c.x + cx * 0.9 - 3 * k, jy, 6 * k, m * 1.2);
    ctx.fillRect(c.x - m * 0.9, y, m * 0.9, m * 1.1);
    // jib-tip light at night
    if (L.light < 0.45) {
      const on = (t + c.phase) % 1.8 < 0.9;
      if (on) {
        const gs = S.glow.width;
        ctx.globalAlpha = 0.9 * (1 - L.light * 2);
        ctx.drawImage(S.glow, c.x + jx - gs / 2, jy - gs / 2);
        ctx.drawImage(S.glow, c.x - gs / 2, ay - gs / 2);
        ctx.globalAlpha = 1;
      }
    }
  }
}

function drawFlickers(ctx: CanvasRenderingContext2D, S: Scene, t: number, L: Look, front: boolean) {
  if (L.win < 0.05) return;
  for (const f of S.flickers) {
    if (f.front !== front) continue;
    if (f.th > L.lit + 0.15) continue;
    let a: number;
    if (f.tv) {
      if (L.light > 0.3) continue;
      a = 0.45 + 0.35 * Math.sin(t * 7 + f.phase) * Math.sin(t * 2.3 + f.phase * 3);
      ctx.fillStyle = `rgba(140,170,255,${(a * L.win).toFixed(3)})`;
    } else {
      const u = (((t + f.phase) / f.period) % 1 + 1) % 1;
      a = smooth(0, 0.02, u) * smooth(f.duty, f.duty - 0.02, u);
      if (a < 0.02) continue;
      ctx.fillStyle = css(WIN_RGB[f.c], a * f.a * L.win);
    }
    ctx.fillRect(f.x, f.y, f.w, f.h);
  }
}

function drawBeacons(ctx: CanvasRenderingContext2D, S: Scene, t: number, L: Look) {
  const vis = smooth(0.6, 0.15, L.light);
  if (vis < 0.02) return;
  const gs = S.glow.width;
  for (const b of S.beacons) {
    const u = (t * 0.62 + b.phase) % 1;
    const on = b.steady ? 0.75 : u < 0.45 ? smooth(0, 0.08, u) : smooth(0.6, 0.45, u);
    if (on < 0.03) continue;
    ctx.globalAlpha = on * vis;
    ctx.drawImage(S.glow, b.x - gs / 2, b.y - gs / 2);
    ctx.fillStyle = '#ff5a48';
    ctx.fillRect(b.x - b.r / 2, b.y - b.r / 2, b.r, b.r);
  }
  ctx.globalAlpha = 1;
}

const RAIN_LAYERS = [
  { n: 300, len: 10, wdt: 0.7, v: 820, a: 0.3, tw: 256, th: 311 },
  { n: 150, len: 20, wdt: 1, v: 1250, a: 0.32, tw: 293, th: 347 },
  { n: 46, len: 40, wdt: 1.5, v: 1900, a: 0.34, tw: 389, th: 457 },
];
const RAIN_SLANT = 0.24;

function makeRainTiles(k: number, density: number): Cnv[] {
  const ks = Math.max(0.35, k);
  return RAIN_LAYERS.map((Ly, li) => {
    const TW = Math.round(Ly.tw * ks);
    const TH = Math.round(Ly.th * ks);
    const c = canvas(TW, TH);
    const g = c2d(c);
    const R = rng(777 + li * 31 + density * 1000);
    const n = Math.max(3, Math.round(Ly.n * ((Ly.tw * Ly.th) / (700 * 740)) * density));
    g.lineCap = 'round';
    g.lineWidth = Math.max(0.6, Ly.wdt * k);
    for (let i = 0; i < n; i++) {
      const x = R() * TW;
      const y = R() * TH;
      const l = Ly.len * k * (0.6 + R() * 0.8);
      const a = 0.45 + R() * 0.55;
      const grd = g.createLinearGradient(0, y, 0, y + l);
      grd.addColorStop(0, 'rgba(255,255,255,0)');
      grd.addColorStop(1, `rgba(255,255,255,${a.toFixed(2)})`);
      for (const ox of [-TW, 0, TW])
        for (const oy of [-TH, 0, TH]) {
          const x0 = x + ox;
          const y0 = y + oy;
          if (x0 + RAIN_SLANT * l < -2 || x0 > TW + 2 || y0 + l < -2 || y0 > TH + 2) continue;
          g.save();
          g.translate(0, oy);
          g.strokeStyle = grd;
          g.beginPath();
          g.moveTo(x0, y);
          g.lineTo(x0 + RAIN_SLANT * l, y + l);
          g.stroke();
          g.restore();
        }
    }
    return c;
  });
}

function drawRain(ctx: CanvasRenderingContext2D, S: Scene, t: number, W: Wx, L: Look, low: boolean) {
  const { w, h, k } = S;
  const heavy = W.storm > 0.5 && !low;
  const tiles = heavy ? (S.rainHeavy ??= makeRainTiles(k, 2.3)) : (S.rainTiles ??= makeRainTiles(k, 1.15));
  const amt = W.rain;
  const night = L.light < 0.3 ? 0.85 : 1;
  const gust = Math.sin(t * 0.21) * 6 * k;
  const passes: [number, number, number][] = [
    [0, 1, clamp01(amt * 1.6)],
    [1, 1, smooth(0.2, 0.7, amt)],
    [2, 1, smooth(0.55, 1, amt) * (low ? 0.6 : 1)],
  ];
  passes.forEach(([li, sp, mult], pi) => {
    if (mult < 0.02) return;
    const Ly = RAIN_LAYERS[li];
    const tl = tiles[li];
    const TW = tl.width;
    const TH = tl.height;
    const v = Ly.v * k * (0.75 + amt * 0.25) * sp;
    const oy = Math.round((t * v + pi * TH * 0.37) % TH);
    const ox = Math.round((((t * v + pi * TH * 0.37) * RAIN_SLANT + gust * (li + 1) * 0.5 + pi * TW * 0.5) % TW + TW) % TW);
    ctx.globalAlpha = Ly.a * (0.55 + amt * 0.45) * mult * night;
    // integer-aligned tile blits are far cheaper than a transformed pattern
    for (let y = oy - TH; y < h; y += TH) for (let x = ox - TW; x < w; x += TW) ctx.drawImage(tl, x, y);
  });
  ctx.globalAlpha = 1;
}

function drawSnow(ctx: CanvasRenderingContext2D, S: Scene, t: number, W: Wx) {
  const { w, h, k } = S;
  const area = (w * h) / (700 * 740);
  ctx.fillStyle = `rgba(250,252,255,${(0.85 * W.snow).toFixed(3)})`;
  [0.6, 1, 1.7].forEach((sz, li) => {
    const n = Math.round([220, 110, 40][li] * area * W.snow);
    const v = [26, 44, 70][li] * k;
    for (let i = 0; i < n; i++) {
      const a = hash(i * 11 + li * 777);
      const b = hash(i * 17 + li * 999 + 3);
      const y = ((b * (h + 10) + t * v * (0.8 + a * 0.4)) % (h + 10)) - 5;
      const x = (((a * w + Math.sin(t * 0.8 + i) * 8 * k * sz) % w) + w) % w;
      const r = sz * 1.6 * k;
      ctx.fillRect(x, y, r, r);
    }
  });
}
