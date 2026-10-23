/* ==========================================================================
   Generative sleeve art for the four records of Adelia’s sound system.
   Drawn once per track on a canvas (seeded, so every visit shows the same
   sleeve) and cached as a data URL for the crate, the vinyl label and the
   deck. Titles, sides, moods and BPM come from TRACKS (lib/content.ts); the
   track ids are dside's stable keys, so the art is keyed by id.
   Visual language: the room's clear tech: white and frosted acrylic, ink,
   chrome greys, baby blue and pink as signals.
   ========================================================================== */
import { TRACKS, type TrackId } from '@/lib/content';
import { rng } from '@/audio/player';

const PINK = '#ff7eb6';
const PINK_SOFT = '#ffd6e8';
const BABY = '#a9d6f5';
const BLUE = '#5aa9e6';
const INK = '#161b26';
const SCREEN = '#10141c';
const ICE = '#f7f8fa';

const UI = '"M PLUS Rounded 1c", ui-rounded, system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

const cache = new Map<string, string>();

type G = CanvasRenderingContext2D;

/** Sleeve type: label line, side, title (from TRACKS), sub line. */
function type(g: G, size: number, id: TrackId, n: number, dark: boolean) {
  const t = TRACKS.find((x) => x.id === id)!;
  const s = size / 512;
  g.fillStyle = dark ? 'rgba(238,241,246,0.92)' : INK;
  g.font = `700 ${Math.round(13 * s)}px ${MONO}`;
  g.textBaseline = 'top';
  g.textAlign = 'left';
  g.fillText('ADELIA’S SOUND SYSTEM', 28 * s, 28 * s);
  g.textAlign = 'right';
  g.fillText(t.side, size - 28 * s, 28 * s);
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  // fit the title on one line
  let px = 50;
  g.font = `800 ${Math.round(px * s)}px ${UI}`;
  while (px > 30 && g.measureText(t.title).width > size - 56 * s) {
    px -= 2;
    g.font = `800 ${Math.round(px * s)}px ${UI}`;
  }
  g.fillText(t.title, 26 * s, size - 52 * s);
  g.font = `500 ${Math.round(12 * s)}px ${MONO}`;
  g.fillStyle = dark ? 'rgba(238,241,246,0.62)' : 'rgba(22,27,38,0.62)';
  g.fillText(`${t.mood.toUpperCase()} · ${t.bpm} BPM · AS-00${n}`, 28 * s, size - 28 * s);
}

/** Hairline grid (engineering paper). */
function grid(g: G, n: number, step: number, color: string) {
  g.fillStyle = color;
  for (let x = 0; x < n; x += step) g.fillRect(x, 0, 1, n);
  for (let y = 0; y < n; y += step) g.fillRect(0, y, n, 1);
}

/* A1 · Soft Focus — a soft pink sun out of focus on engineering paper */
function softFocus(g: G, n: number) {
  const r = rng(84);
  g.fillStyle = ICE;
  g.fillRect(0, 0, n, n);
  grid(g, n, n / 24, 'rgba(22,27,38,0.05)');
  // the out-of-focus sun: stacked soft discs
  const cx = n * 0.6;
  const cy = n * 0.42;
  for (let i = 6; i >= 0; i--) {
    const R = n * (0.18 + i * 0.035);
    const grd = g.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
    grd.addColorStop(0, i === 0 ? PINK : 'rgba(255,126,182,0.16)');
    grd.addColorStop(1, 'rgba(255,126,182,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.fill();
  }
  // focus ring + crosshair, like a viewfinder
  g.strokeStyle = 'rgba(22,27,38,0.55)';
  g.lineWidth = n / 300;
  g.beginPath();
  g.arc(cx, cy, n * 0.24, 0, Math.PI * 2);
  g.stroke();
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    g.beginPath();
    g.moveTo(cx + dx * n * 0.27, cy + dy * n * 0.27);
    g.lineTo(cx + dx * n * 0.31, cy + dy * n * 0.31);
    g.stroke();
  }
  // three tape bars (the lo-fi loop)
  g.fillStyle = INK;
  for (let i = 0; i < 3; i++) g.fillRect(n * 0.08, n * (0.2 + i * 0.07), n * (0.14 + r() * 0.12), n * 0.026);
  g.fillStyle = BLUE;
  g.fillRect(n * 0.08, n * 0.41, n * 0.05, n * 0.026);
}

/* A2 · Bekasi Rain — rain on the window glass, drops and streaks */
function bekasiRain(g: G, n: number) {
  const r = rng(72);
  const grd = g.createLinearGradient(0, 0, 0, n);
  grd.addColorStop(0, '#dcecf8');
  grd.addColorStop(1, '#f7f8fa');
  g.fillStyle = grd;
  g.fillRect(0, 0, n, n);
  // window mullions
  g.fillStyle = 'rgba(22,27,38,0.08)';
  g.fillRect(n * 0.5 - n / 300, 0, n / 150, n * 0.78);
  g.fillRect(0, n * 0.39, n, n / 150);
  // streaks
  g.strokeStyle = 'rgba(31,95,150,0.45)';
  g.lineWidth = n / 420;
  for (let i = 0; i < 120; i++) {
    const x = r() * n * 1.2 - n * 0.1;
    const y = r() * n * 0.8;
    const l = n * (0.03 + r() * 0.08);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x - l * 0.12, y + l);
    g.stroke();
  }
  // drops on the glass: clear beads with a highlight
  for (let i = 0; i < 26; i++) {
    const x = r() * n;
    const y = r() * n * 0.74;
    const d = n * (0.008 + r() * 0.02);
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.beginPath();
    g.arc(x, y, d, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(31,95,150,0.35)';
    g.lineWidth = n / 600;
    g.stroke();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(x + d * 0.35, y - d * 0.35, d * 0.28, 0, Math.PI * 2);
    g.fill();
  }
  // pelog cipher row, like a gamelan part
  g.fillStyle = 'rgba(22,27,38,0.55)';
  g.font = `500 ${Math.round(n / 34)}px ${MONO}`;
  g.textAlign = 'center';
  '3 5 6 5 · 3 2 1 2'.split(' ').forEach((c, i, a) => g.fillText(c, n * (0.2 + (i / (a.length - 1)) * 0.6), n * 0.72));
  g.textAlign = 'left';
}

/* B1 · Last Train Home — the commuter line at night: carriage windows and light trails */
function lastTrain(g: G, n: number) {
  const r = rng(96);
  g.fillStyle = SCREEN;
  g.fillRect(0, 0, n, n);
  // the train: a long carriage with lit windows
  const top = n * 0.38;
  const h = n * 0.17;
  g.fillStyle = '#1e2430';
  g.fillRect(-n * 0.05, top, n * 1.1, h);
  g.fillStyle = PINK;
  g.fillRect(-n * 0.05, top + h - n * 0.02, n * 1.1, n * 0.012); // the livery stripe
  for (let x = n * 0.04; x < n; x += n * 0.13) {
    g.fillStyle = r() < 0.2 ? 'rgba(169,214,245,0.25)' : 'rgba(238,241,246,0.85)';
    g.fillRect(x, top + n * 0.03, n * 0.09, n * 0.07);
  }
  // rails
  g.fillStyle = 'rgba(238,241,246,0.2)';
  g.fillRect(0, top + h + n * 0.03, n, n / 200);
  g.fillRect(0, top + h + n * 0.05, n, n / 200);
  // light trails passing
  for (let i = 0; i < 22; i++) {
    const y = top + h + n * 0.08 + r() * n * 0.2;
    const len = n * (0.15 + r() * 0.5);
    const x0 = r() * n - len * 0.3;
    const grd = g.createLinearGradient(x0, 0, x0 + len, 0);
    const c = r() < 0.5 ? BABY : r() < 0.6 ? PINK : '#ffffff';
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, c);
    g.strokeStyle = grd;
    g.lineWidth = n / (180 + r() * 200);
    g.beginPath();
    g.moveTo(x0, y);
    g.lineTo(x0 + len, y - n * 0.003);
    g.stroke();
  }
  // a small moon
  g.fillStyle = PINK_SOFT;
  g.beginPath();
  g.arc(n * 0.8, n * 0.2, n * 0.04, 0, Math.PI * 2);
  g.fill();
}

/* B2 · Gacha Pop — pastel capsules on a pixel grid */
function gachaPop(g: G, n: number) {
  const r = rng(128);
  g.fillStyle = PINK_SOFT;
  g.fillRect(0, 0, n, n);
  grid(g, n, n / 32, 'rgba(188,37,112,0.08)');
  const cols = [PINK, BABY, '#cdb9f2', '#bfeedd', '#ffffff'];
  const R = n * 0.06;
  for (let i = 0; i < 14; i++) {
    const x = n * (0.12 + r() * 0.76);
    const y = n * (0.14 + r() * 0.5);
    const c = cols[i % cols.length];
    g.save();
    g.translate(x, y);
    g.rotate((r() - 0.5) * 1.4);
    // bottom half: clear white
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath();
    g.arc(0, 0, R, 0, Math.PI);
    g.fill();
    // top half: colour
    g.fillStyle = c;
    g.beginPath();
    g.arc(0, 0, R, Math.PI, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(22,27,38,0.35)';
    g.lineWidth = n / 340;
    g.beginPath();
    g.arc(0, 0, R, 0, Math.PI * 2);
    g.moveTo(-R, 0);
    g.lineTo(R, 0);
    g.stroke();
    g.restore();
  }
  // a pixel score bar
  g.fillStyle = INK;
  g.font = `700 ${Math.round(n / 28)}px ${MONO}`;
  g.fillText('1P  CAPSULE 03', n * 0.06, n * 0.76);
  g.textAlign = 'right';
  g.fillText('HI 001500', n * 0.94, n * 0.76);
  g.textAlign = 'left';
}

const ART: Record<TrackId, { draw: (g: G, n: number) => void; dark: boolean }> = {
  'studio-hours': { draw: softFocus, dark: false },
  'jakarta-rain': { draw: bekasiRain, dark: false },
  'senopati-nights': { draw: lastTrain, dark: true },
  'arcade-1996': { draw: gachaPop, dark: false },
};

/** Data URL of a track's sleeve (cached). */
export function cover(id: TrackId, size = 512): string {
  const key = `${id}@${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (!g) return '';
  const a = ART[id];
  // draw at 512 and scale, so every size shares one composition
  g.save();
  g.scale(size / 512, size / 512);
  a.draw(g, 512);
  g.restore();
  type(g, size, id, TRACKS.findIndex((t) => t.id === id) + 1, a.dark);
  const url = c.toDataURL('image/webp', 0.9);
  cache.set(key, url);
  return url;
}

/** Draw after the room's fonts are ready so the sleeve type renders correctly. */
export async function coversReady() {
  try {
    await Promise.all([
      document.fonts.load('800 46px "M PLUS Rounded 1c"'),
      document.fonts.load('700 13px "JetBrains Mono"'),
      document.fonts.load('500 12px "JetBrains Mono"'),
    ]);
  } catch {
    /* fall back to whatever is available */
  }
}
