import { canvas } from "./source";

/*
 * Free decoration for the Studio: die-cut stickers, words, pen strokes and a date stamp, drawn over
 * the layout. Positions are fractions of the layout (0..1), sizes fractions of its width, so the
 * same decoration lands in the same place at preview size and at export size.
 */

export type DecorSticker = { kind: "sticker"; id: string; art: string; x: number; y: number; size: number; rot: number };
export type DecorText = { kind: "text"; id: string; text: string; color: string; x: number; y: number; size: number; rot: number };
export type Decor = DecorSticker | DecorText;
export type Stroke = { color: string; width: number; points: [number, number][] };

const P = "#FF5FA8";
const PD = "#C2287A";
const B = "#1FB0F0";
const BD = "#0A68D0";
const Y = "#FFCF3F";
const YD = "#D99A00";
const M = "#22CDB0";
const MD = "#0A8A74";
const V = "#9474FF";
const VD = "#5B2DD1";

/** Each sticker is drawn in a 100×100 box, with a thick white die-cut edge from `paint-order`. */
export const STICKERS: { id: string; name: string; svg: string }[] = [
  { id: "star", name: "Star", svg: `<path d="M50 12l11 24 26 3-19 18 5 26-23-13-23 13 5-26-19-18 26-3Z" fill="${Y}" stroke="${YD}" stroke-width="3" stroke-linejoin="round"/><path d="M40 34l6-10" stroke="#fff" stroke-width="4" stroke-linecap="round"/>` },
  { id: "heart", name: "Heart", svg: `<path d="M50 84C26 68 14 55 14 38c0-11 8-19 18-19 8 0 14 5 18 11 4-6 10-11 18-11 10 0 18 8 18 19 0 17-12 30-36 46Z" fill="${P}" stroke="${PD}" stroke-width="3" stroke-linejoin="round"/><path d="M26 34c1-5 4-8 9-8" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/>` },
  { id: "sparkle", name: "Sparkle", svg: `<path d="M50 8c4 22 10 30 34 34-24 4-30 12-34 34-4-22-10-30-34-34 24-4 30-12 34-34Z" fill="#fff" stroke="${BD}" stroke-width="3" stroke-linejoin="round"/><path d="M80 66c2 9 4 12 12 14-8 2-10 5-12 14-2-9-4-12-12-14 8-2 10-5 12-14Z" fill="${P}"/>` },
  { id: "bubbles", name: "Bubbles", svg: `<circle cx="40" cy="58" r="24" fill="#E6F8FF" stroke="${B}" stroke-width="3"/><circle cx="72" cy="30" r="14" fill="#E6F8FF" stroke="${B}" stroke-width="3"/><circle cx="74" cy="72" r="9" fill="#E6F8FF" stroke="${B}" stroke-width="3"/><path d="M28 46a14 14 0 0 1 10-8M66 24a7 7 0 0 1 6-4" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/>` },
  { id: "shell", name: "Shell", svg: `<path d="M50 16c-22 0-36 18-36 36 0 8 4 14 10 18l26 14 26-14c6-4 10-10 10-18 0-18-14-36-36-36Z" fill="#FFD6E7" stroke="${PD}" stroke-width="3" stroke-linejoin="round"/><path d="M50 84V22M50 84 30 26M50 84 70 26M50 84 18 44M50 84 82 44" stroke="${PD}" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>` },
  { id: "starfish", name: "Starfish", svg: `<path d="M50 10c5 0 7 18 11 24s22 3 24 8-14 14-15 21 9 23 5 27-18-9-25-9-21 13-25 9 6-20 5-27-17-16-15-21 20-2 24-8 6-24 11-24Z" fill="#FF9A6B" stroke="#D9562B" stroke-width="3" stroke-linejoin="round"/><circle cx="50" cy="40" r="3" fill="#fff"/><circle cx="62" cy="52" r="3" fill="#fff"/><circle cx="38" cy="52" r="3" fill="#fff"/><circle cx="50" cy="66" r="3" fill="#fff"/>` },
  { id: "fish", name: "Fish", svg: `<path d="M30 50 10 34q6 16 0 32Z" fill="${M}" stroke="${MD}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="56" cy="50" rx="34" ry="24" fill="${M}" stroke="${MD}" stroke-width="3"/><circle cx="74" cy="46" r="4" fill="#123"/><path d="M40 38c4-4 10-6 16-6" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/>` },
  { id: "cloud", name: "Cloud", svg: `<path d="M28 74a16 16 0 0 1-2-31.8A22 22 0 0 1 68 34a17 17 0 0 1 6 40Z" fill="#fff" stroke="${B}" stroke-width="3.5" stroke-linejoin="round"/><path d="M26 64c8 4 36 5 48 0" stroke="#D6ECFF" stroke-width="5" stroke-linecap="round" fill="none"/>` },
  { id: "bow", name: "Bow", svg: `<path d="M50 48C36 30 14 26 14 44s22 18 36 6c14 12 36 12 36-6S64 30 50 48Z" fill="${P}" stroke="${PD}" stroke-width="3" stroke-linejoin="round"/><path d="M44 50l-10 34 10-6 6 8 6-8 10 6-10-34Z" fill="${P}" stroke="${PD}" stroke-width="3" stroke-linejoin="round"/><circle cx="50" cy="48" r="7" fill="#FF8FC4" stroke="${PD}" stroke-width="3"/>` },
  { id: "jelly", name: "Jellyfish", svg: `<path d="M34 60c-2 10 4 18 0 28M50 62c-2 10 3 16 0 26M66 62c2 10-3 16 0 26" stroke="${V}" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M18 58c0-26 14-40 32-40s32 14 32 40c-5 5-11 5-16 0-5 5-11 5-16 0-5 5-11 5-16 0-5 5-11 5-16 0Z" fill="#CDBDFF" stroke="${VD}" stroke-width="3" stroke-linejoin="round"/><circle cx="42" cy="44" r="3" fill="#2B1A66"/><circle cx="58" cy="44" r="3" fill="#2B1A66"/><path d="M46 51q4 3 8 0" stroke="#2B1A66" stroke-width="2.4" stroke-linecap="round" fill="none"/>` },
  { id: "drop", name: "Water drop", svg: `<path d="M50 12C40 30 24 44 24 62a26 26 0 0 0 52 0c0-18-16-32-26-50Z" fill="${B}" stroke="${BD}" stroke-width="3" stroke-linejoin="round"/><path d="M36 60c0-8 4-14 8-18" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none"/>` },
  { id: "flower", name: "Flower", svg: `<g fill="#FFF3A6" stroke="${YD}" stroke-width="3"><circle cx="50" cy="26" r="15"/><circle cx="74" cy="44" r="15"/><circle cx="65" cy="72" r="15"/><circle cx="35" cy="72" r="15"/><circle cx="26" cy="44" r="15"/></g><circle cx="50" cy="52" r="12" fill="${P}" stroke="${PD}" stroke-width="3"/>` },
];

const svgCache = new Map<string, HTMLImageElement>();

/** The sticker as an <img> source: its art with a thick white edge underneath, like a die-cut sticker. */
export function stickerSrc(id: string): string {
  const art = STICKERS.find((s) => s.id === id)?.svg ?? STICKERS[0].svg;
  const edge = art.replace(/fill="[^"]*"/g, 'fill="#fff"').replace(/stroke="[^"]*"/g, 'stroke="#fff"').replace(/stroke-width="[^"]*"/g, 'stroke-width="14"');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 112 112"><g stroke-linejoin="round" stroke-linecap="round">${edge}</g>${art}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function stickerImage(id: string): Promise<HTMLImageElement> {
  const hit = svgCache.get(id);
  if (hit?.complete) return Promise.resolve(hit);
  return new Promise((resolve) => {
    const img = hit ?? new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = stickerSrc(id);
    svgCache.set(id, img);
  });
}

/** Draws every decoration onto a layout canvas (in place). */
export async function drawDecor(target: HTMLCanvasElement, items: Decor[], strokes: Stroke[], stamp: string | null, fontFamily: string) {
  const ctx = target.getContext("2d")!;
  const W = target.width;
  const H = target.height;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of strokes) {
    if (s.points.length < 2) continue;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width * W;
    ctx.beginPath();
    s.points.forEach(([x, y], i) => (i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H)));
    ctx.stroke();
  }
  ctx.restore();
  for (const d of items) {
    ctx.save();
    ctx.translate(d.x * W, d.y * H);
    ctx.rotate((d.rot * Math.PI) / 180);
    if (d.kind === "sticker") {
      const img = await stickerImage(d.art);
      const s = d.size * W;
      ctx.shadowColor = "rgba(8,40,80,.28)";
      ctx.shadowBlur = s * 0.08;
      ctx.shadowOffsetY = s * 0.03;
      ctx.drawImage(img, -s / 2, -s / 2, s, s);
    } else {
      const px = d.size * W;
      ctx.font = `400 ${px}px ${fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = px * 0.22;
      ctx.strokeStyle = "#fff";
      ctx.strokeText(d.text, 0, 0);
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, 0, 0);
    }
    ctx.restore();
  }
  if (stamp) drawStamp(ctx, W, H, stamp);
}

/** The orange date a disposable camera burns into the corner. */
export function drawStamp(ctx: CanvasRenderingContext2D, W: number, H: number, text: string) {
  const px = Math.max(14, W * 0.042);
  ctx.save();
  ctx.font = `700 ${px}px ui-monospace, "JetBrains Mono", monospace`;
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#FF9A2E";
  ctx.shadowColor = "rgba(255,120,20,.85)";
  ctx.shadowBlur = px * 0.5;
  ctx.globalAlpha = 0.92;
  ctx.fillText(text, W - W * 0.05, H - H * 0.035);
  ctx.restore();
}

/** "'26 10 14", the way the camera prints it. */
export function stampText(d = new Date()): string {
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, " ");
  const dd = String(d.getDate()).padStart(2, " ");
  return `'${yy} ${mm} ${dd}`;
}

export const flatten = (c: HTMLCanvasElement) => {
  const out = canvas(c.width, c.height);
  out.getContext("2d")!.drawImage(c, 0, 0);
  return out;
};
