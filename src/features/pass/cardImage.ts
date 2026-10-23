/* ==========================================================================
   Guest Pass → PNG. Draws the card front on a canvas with the room's web
   fonts (M PLUS Rounded 1c / Bagel Fat One / JetBrains Mono), 20 px per mm
   (1712×1080). Clear acrylic with a pearl sheen; holo foil from Friend up.
   ========================================================================== */
import type { Tier } from '@/state/achievements';

interface CardData {
  name: string;
  memberNo: string;
  tier: Tier;
  points: number;
  since: string;
  /** Friend tier and up */
  holo: boolean;
}

const W = 1712;
const H = 1080;
const INK = '#18263A';
const INK_2 = '#3C4D66';
const INK_3 = '#5E708A';

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function spaced(ctx: CanvasRenderingContext2D, px: number) {
  // letterSpacing is supported in Chromium/Safari; harmless elsewhere
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

const chrome = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#fdfeff');
  g.addColorStop(0.2, '#e3e9f0');
  g.addColorStop(0.4, '#f8fafc');
  g.addColorStop(0.52, '#b3bfcd');
  g.addColorStop(0.7, '#dfe6ee');
  g.addColorStop(0.86, '#f4f7fa');
  g.addColorStop(1, '#c3cdd8');
  return g;
};

/** Moci, her mark (same paths as <Mark/>), in a 64-unit box. */
function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 64, size / 64);
  const body = new Path2D('M32 5.5S11.5 27.6 11.5 40.6a20.5 20.5 0 0 0 41 0C52.5 27.6 32 5.5 32 5.5Z');
  const g = ctx.createLinearGradient(12, 5, 36, 61);
  g.addColorStop(0, '#FFFFFF');
  g.addColorStop(0.6, '#E4F1FB');
  g.addColorStop(1, '#B9DCF5');
  ctx.fillStyle = g;
  ctx.fill(body);
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#161B26';
  ctx.stroke(body);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  ctx.stroke(new Path2D('M20.5 35c1.3-5.6 5.2-11 8-14'));
  ctx.fillStyle = '#161B26';
  ctx.beginPath();
  ctx.arc(25, 42, 2.9, 0, Math.PI * 2);
  ctx.arc(39, 42, 2.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,126,182,0.85)';
  ctx.beginPath();
  ctx.ellipse(19.8, 48, 3.6, 2.3, 0, 0, Math.PI * 2);
  ctx.ellipse(44.2, 48, 3.6, 2.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#161B26';
  ctx.lineWidth = 2.4;
  ctx.stroke(new Path2D('M29.2 47.4c1.7 1.5 3.9 1.5 5.6 0'));
  ctx.restore();
}

export async function renderCardPNG(d: CardData): Promise<Blob> {
  try {
    await Promise.all([
      document.fonts.load('400 150px "Bagel Fat One"'),
      document.fonts.load('800 44px "M PLUS Rounded 1c"'),
      document.fonts.load('700 40px "JetBrains Mono"'),
      document.fonts.load('500 26px "JetBrains Mono"'),
    ]);
  } catch {
    /* draw with fallbacks */
  }
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  // ---- body
  rr(ctx, 0, 0, W, H, 64);
  ctx.save();
  ctx.clip();
  if (d.holo) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    ['#ffd6e8', '#dceefc', '#e3f7ee', '#fff3d9', '#ffd6e8', '#cfe7fb', '#ffe3ef'].forEach((col, i, a) => g.addColorStop(i / (a.length - 1), col));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // diffraction lines
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    for (let x = -H; x < W; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(x + H * 0.7, 0);
      ctx.stroke();
    }
    ctx.restore();
    // rainbow sheen
    const s = ctx.createLinearGradient(0, 0, W, H * 0.6);
    s.addColorStop(0.25, 'rgba(255,255,255,0)');
    s.addColorStop(0.42, 'rgba(255,194,222,0.45)');
    s.addColorStop(0.5, 'rgba(196,228,255,0.55)');
    s.addColorStop(0.58, 'rgba(201,245,226,0.45)');
    s.addColorStop(0.75, 'rgba(255,255,255,0)');
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, W, H);
  } else {
    const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.7, '#f3f7fc');
    g.addColorStop(1, '#e7eef7');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // pearl: two soft pastel pools
    for (const [x, y, r, col] of [
      [W * 0.86, H * 0.12, W * 0.42, 'rgba(255,214,232,0.55)'],
      [W * 0.1, H * 0.95, W * 0.45, 'rgba(201,230,251,0.6)'],
    ] as const) {
      const p = ctx.createRadialGradient(x, y, 0, x, y, r);
      p.addColorStop(0, col);
      p.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = p;
      ctx.fillRect(0, 0, W, H);
    }
    // hairline grid
    ctx.strokeStyle = 'rgba(24,38,58,0.045)';
    ctx.lineWidth = 2;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(W, y + 0.5);
      ctx.stroke();
    }
  }
  // window light from the right
  const sheen = ctx.createLinearGradient(W, 0, W * 0.4, H);
  sheen.addColorStop(0, 'rgba(255,255,255,0.5)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);
  // tier band on the right edge
  ctx.fillStyle = d.tier.color;
  ctx.fillRect(W - 22, 0, 22, H);

  const P = 96;
  ctx.textBaseline = 'alphabetic';

  // ---- mark + wordmark
  drawMark(ctx, P - 8, P - 16, 104);
  ctx.fillStyle = INK;
  ctx.font = '800 50px "M PLUS Rounded 1c", sans-serif';
  spaced(ctx, -0.5);
  ctx.fillText('Adelia’s Room', P + 112, P + 36);
  ctx.font = '500 28px "JetBrains Mono", monospace';
  spaced(ctx, 3);
  ctx.fillStyle = INK_3;
  ctx.fillText('adelia.cc', P + 114, P + 78);
  spaced(ctx, 0);

  // ---- tier chip
  ctx.font = '700 30px "JetBrains Mono", monospace';
  spaced(ctx, 5);
  const label = d.tier.name.toUpperCase();
  const tw = ctx.measureText(label).width;
  const cw = tw + 104;
  const cx0 = W - P - 22 - cw;
  rr(ctx, cx0, P - 2, cw, 66, 33);
  ctx.fillStyle = '#16243a';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx0 + 38, P + 31, 11, 0, Math.PI * 2);
  ctx.fillStyle = d.tier.color;
  ctx.fill();
  ctx.fillStyle = '#eef3fa';
  ctx.fillText(label, cx0 + 64, P + 42);
  spaced(ctx, 0);

  // ---- contact chip
  const kx = P;
  const ky = 330;
  rr(ctx, kx, ky, 170, 128, 22);
  ctx.fillStyle = chrome(ctx, kx, ky, kx + 30, ky + 128);
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,88,112,0.45)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(kx, ky + 44);
  ctx.lineTo(kx + 58, ky + 44);
  ctx.moveTo(kx, ky + 84);
  ctx.lineTo(kx + 58, ky + 84);
  ctx.moveTo(kx + 112, ky + 44);
  ctx.lineTo(kx + 170, ky + 44);
  ctx.moveTo(kx + 112, ky + 84);
  ctx.lineTo(kx + 170, ky + 84);
  ctx.rect(kx + 58, ky + 28, 54, 72);
  ctx.stroke();

  // ---- contactless
  ctx.strokeStyle = 'rgba(24,38,58,0.45)';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(kx + 210, ky + 64, 22 + i * 22, -Math.PI / 3.4, Math.PI / 3.4);
    ctx.stroke();
  }

  // ---- chrome heart
  ctx.save();
  ctx.translate(kx + 330, ky - 6);
  ctx.scale(6.2, 6.2);
  const heart = new Path2D('M12 21s-8.6-5.3-8.6-11.7A4.9 4.9 0 0 1 12 6.2a4.9 4.9 0 0 1 8.6 3.1C20.6 15.7 12 21 12 21Z');
  ctx.shadowColor = 'rgba(24,38,58,0.25)';
  ctx.shadowOffsetX = -6;
  ctx.shadowOffsetY = 8;
  ctx.shadowBlur = 14;
  ctx.fillStyle = chrome(ctx, 0, 6, 0, 21);
  ctx.fill(heart);
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 0.4;
  ctx.strokeStyle = 'rgba(70,88,112,0.5)';
  ctx.stroke(heart);
  ctx.restore();

  // ---- title (felt letters)
  ctx.fillStyle = INK;
  ctx.font = '400 150px "Bagel Fat One", "M PLUS Rounded 1c", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Guest', W - P - 22, 430);
  ctx.fillText('Pass', W - P - 22, 568);
  ctx.textAlign = 'left';

  // ---- name (embossed: lit from the right, shadow to the left)
  const micro = (t: string, x: number, y: number) => {
    ctx.font = '500 26px "JetBrains Mono", monospace';
    spaced(ctx, 6);
    ctx.fillStyle = INK_3;
    ctx.fillText(t.toUpperCase(), x, y);
    spaced(ctx, 0);
  };
  micro('Guest', P, 760);
  const name = (d.name || 'Guest').toUpperCase();
  let size = 70;
  ctx.font = `700 ${size}px "JetBrains Mono", monospace`;
  spaced(ctx, 6);
  while (ctx.measureText(name).width > W - P * 2 - 60 && size > 36) {
    size -= 2;
    ctx.font = `700 ${size}px "JetBrains Mono", monospace`;
  }
  ctx.fillStyle = 'rgba(24,38,58,0.22)';
  ctx.fillText(name, P - 3, 846 + 3);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillText(name, P + 2, 846 - 2);
  ctx.fillStyle = INK_2;
  ctx.fillText(name, P, 846);
  spaced(ctx, 0);

  // ---- numbers row
  const col = (t: string, v: string, x: number) => {
    micro(t, x, 930);
    ctx.font = '700 44px "JetBrains Mono", monospace';
    spaced(ctx, 3);
    ctx.fillStyle = INK;
    ctx.fillText(v, x, 986);
    spaced(ctx, 0);
  };
  col('No.', d.memberNo, P);
  col('Since', d.since, P + 520);
  col('Hearts', `♥ ${d.points.toLocaleString('en-US')}`, P + 780);

  // ---- engraving
  ctx.save();
  ctx.translate(W - 58, H - 96);
  ctx.rotate(-Math.PI / 2);
  ctx.font = '500 20px "JetBrains Mono", monospace';
  spaced(ctx, 5);
  ctx.fillStyle = 'rgba(24,38,58,0.45)';
  ctx.fillText('ADELIA.CC · BEKASI · GUEST PASS · REV 26', 0, 0);
  ctx.restore();

  ctx.restore();
  // ---- polished acrylic rim
  rr(ctx, 2, 2, W - 4, H - 4, 62);
  ctx.strokeStyle = 'rgba(132,150,173,0.45)';
  ctx.lineWidth = 4;
  ctx.stroke();
  rr(ctx, 7, 7, W - 14, H - 14, 58);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 3;
  ctx.stroke();

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
