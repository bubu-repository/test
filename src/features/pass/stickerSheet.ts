/* ==========================================================================
   The Regular-tier perk: a printable sheet of every sticker you've
   collected, as a PNG (1240×1754, A5 portrait at 210 dpi). Kiss-cut
   look: each sticker with its white die-cut edge on a clear-tech page.
   ========================================================================== */
import { ACHIEVEMENTS, type AchievementId } from '@/state/achievements';
import { identity } from '@/content/profile';
import { stickerURL } from './Sticker';
import { artOf } from './stickers';
import { dotDate } from './lib';

const W = 1240;
const H = 1754;
const INK = '#18263A';
const INK_3 = '#5E708A';

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

export async function renderStickerSheet({ name, achievements }: { name: string; achievements: Partial<Record<AchievementId, number>> }): Promise<Blob> {
  try {
    await Promise.all([
      document.fonts.load('400 84px "Bagel Fat One"'),
      document.fonts.load('700 24px "M PLUS Rounded 1c"'),
      document.fonts.load('500 20px "JetBrains Mono"'),
    ]);
  } catch {
    /* fallbacks */
  }
  const mine = ACHIEVEMENTS.filter((a) => achievements[a.id]);
  const COLS = 4;
  const cell = (W - 160) / COLS; // 270
  const S = 170; // sticker box (6 rows of 4 fit the page)
  const imgs = await Promise.all(mine.map((a) => stickerURL(artOf(a.id), 'holo', 300).then(load)));

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  // hairline grid
  ctx.strokeStyle = 'rgba(24,38,58,0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 31) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 31) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
    ctx.stroke();
  }
  // gingham strip
  for (let x = 0; x < W; x += 14)
    for (let y = 0; y < 28; y += 14) {
      ctx.fillStyle = (x / 14 + y / 14) % 2 ? 'rgba(255,214,232,0.9)' : 'rgba(255,214,232,0.45)';
      ctx.fillRect(x, y, 14, 14);
    }

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK;
  ctx.font = '400 84px "Bagel Fat One", "M PLUS Rounded 1c", sans-serif';
  ctx.fillText('Sticker sheet', 80, 150);
  ctx.font = '700 28px "M PLUS Rounded 1c", sans-serif';
  ctx.fillText(`${name || 'A guest'} · ${mine.length} of ${ACHIEVEMENTS.length} from ${identity.firstName}’s room`, 82, 200);
  ctx.font = '500 18px "JetBrains Mono", monospace';
  ctx.fillStyle = INK_3;
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '3px';
  ctx.fillText(`${identity.domain.toUpperCase()} · PRINT AT 100% · CUT ALONG THE WHITE EDGE · ${dotDate(Date.now())}`, 82, 240);
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px';

  const top = 300;
  const rowH = S + 64;
  mine.forEach((a, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cx = 80 + col * cell + cell / 2;
    const cy = top + row * rowH + S / 2;
    const box = S * 1.14;
    ctx.drawImage(imgs[i], cx - box / 2, cy - box / 2, box, box);
    ctx.fillStyle = INK;
    ctx.font = '700 22px "M PLUS Rounded 1c", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(a.name, cx, cy + S / 2 + 36);
    ctx.textAlign = 'left';
  });
  if (!mine.length) {
    ctx.fillStyle = INK_3;
    ctx.font = '700 28px "M PLUS Rounded 1c", sans-serif';
    ctx.fillText('No stickers yet. Every object in the room hides one.', 82, top + 40);
  }

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));
}
