import { CAPTION, MONO as MONO_FAMILY, TITLE } from "./fonts";
import { canvas, rng } from "./source";

/*
 * How a finished piece is laid out (the print the camera ejects): a card, a photo-booth strip, a sheet of 3×4 ID photos, a
 * trading card, or a die-cut sticker. Each draws the art (one canvas, or four for the strip) onto a
 * canvas at print size.
 */

export type LayoutId = "card" | "strip" | "id" | "tcg" | "sticker";
export type BackdropId = "sky" | "sea" | "gingham" | "blue-gingham" | "dots" | "white";

export const LAYOUTS: { id: LayoutId; name: string; note: string }[] = [
  { id: "card", name: "Card", note: "4 × 5, with a caption" },
  { id: "strip", name: "Photo strip", note: "Four frames, photo-booth style" },
  { id: "id", name: "ID photos", note: "Eight 3 × 4 cm on one sheet" },
  { id: "tcg", name: "Trading card", note: "A holo card with your name" },
  { id: "sticker", name: "Sticker", note: "Die-cut, transparent PNG" },
];

export const BACKDROPS: { id: BackdropId; name: string }[] = [
  { id: "sky", name: "Sky" },
  { id: "sea", name: "Aquarium" },
  { id: "gingham", name: "Pink gingham" },
  { id: "blue-gingham", name: "Blue gingham" },
  { id: "dots", name: "Dot grid" },
  { id: "white", name: "White" },
];

/** One piece of art for a frame. `fill` means a plain photo that should cover its frame edge to edge. */
export type Art = { canvas: HTMLCanvasElement; fill: boolean };

export type LayoutOptions = {
  backdrop: BackdropId;
  caption: string;
  /** For the trading card's name bar. */
  title: string;
  /** For the trading card's type line, e.g. "Felt". */
  material: string;
  /** ID photo background: the red or the blue of an Indonesian pas foto. */
  idColor: "red" | "blue";
  date: Date;
  seed: number;
};

export const SIZE: Record<LayoutId, [number, number]> = {
  card: [1080, 1350],
  strip: [600, 1800],
  id: [1800, 1200],
  tcg: [750, 1050],
  sticker: [0, 0],
};

/** The shape a photo is cropped to for this layout (width / height). */
export function photoAspect(layout: LayoutId): number {
  return { card: 4 / 5, strip: 4 / 3, id: 3 / 4, tcg: 4 / 3, sticker: 1 }[layout];
}

export const takes = (layout: LayoutId) => (layout === "strip" ? 4 : 1);

/** Captions and flavour text: the room's rounded face, extra bold (see fonts.ts). */
const HAND = CAPTION.family;
const HAND_W = CAPTION.weight;
const BOLD = TITLE.family;
const MONO = MONO_FAMILY;
/** The room's ink: a deep cool navy, never black. */
const INK = "#18263A";
const INK_RGB = "24,38,58";

const dateLine = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/* ---------- Backdrops ---------- */

export function paintBackdrop(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, id: BackdropId, seed: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const rand = rng(seed + 31);
  if (id === "sky") {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "#5AA9E6");
    g.addColorStop(0.55, "#A9D6F5");
    g.addColorStop(1, "#EAF5FD");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // Soft clouds: clusters of white puffs, brighter on top.
    for (let c = 0; c < 4; c++) {
      const cx = x + w * (0.1 + rand() * 0.8);
      const cy = y + h * (0.55 + rand() * 0.4);
      const s = w * (0.12 + rand() * 0.1);
      for (let k = 0; k < 6; k++) {
        const px = cx + (k - 2.5) * s * 0.5;
        const py = cy - Math.sin((k / 5) * Math.PI) * s * 0.35;
        const r = s * (0.45 + rand() * 0.3);
        const puff = ctx.createRadialGradient(px, py - r * 0.3, r * 0.1, px, py, r);
        puff.addColorStop(0, "rgba(255,255,255,.95)");
        puff.addColorStop(0.7, "rgba(255,255,255,.75)");
        puff.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = puff;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (id === "sea") {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "#BFE6FA");
    g.addColorStop(0.5, "#7CC3EE");
    g.addColorStop(1, "#3F8FCF");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // Caustic light: thin bright wavy lines.
    ctx.strokeStyle = "rgba(255,255,255,.22)";
    ctx.lineWidth = Math.max(2, w * 0.006);
    for (let k = 0; k < 9; k++) {
      ctx.beginPath();
      const oy = y + h * (k / 9) + rand() * 20;
      for (let t = 0; t <= 1.001; t += 0.05) ctx.lineTo(x + w * t, oy + Math.sin(t * 9 + k) * h * 0.02);
      ctx.stroke();
    }
    for (let b = 0; b < 14; b++) {
      const r = w * (0.006 + rand() * 0.018);
      const bx = x + rand() * w;
      const by = y + rand() * h;
      ctx.strokeStyle = "rgba(255,255,255,.6)";
      ctx.lineWidth = Math.max(1.5, r * 0.18);
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (id === "gingham" || id === "blue-gingham") {
    ctx.fillStyle = id === "gingham" ? "#FFF3F8" : "#F3F9FE";
    ctx.fillRect(x, y, w, h);
    const cell = Math.max(18, w / 14);
    ctx.fillStyle = id === "gingham" ? "rgba(255,126,182,.24)" : "rgba(90,169,230,.22)";
    for (let i = 0; i < w / cell + 1; i += 2) ctx.fillRect(x + i * cell, y, cell, h);
    for (let j = 0; j < h / cell + 1; j += 2) ctx.fillRect(x, y + j * cell, w, cell);
  } else if (id === "dots") {
    ctx.fillStyle = "#F6F9FD";
    ctx.fillRect(x, y, w, h);
    const step = Math.max(16, w / 22);
    ctx.fillStyle = `rgba(${INK_RGB},.16)`;
    for (let i = step / 2; i < w; i += step)
      for (let j = step / 2; j < h; j += step) {
        ctx.beginPath();
        ctx.arc(x + i, y + j, Math.max(1.2, step * 0.06), 0, Math.PI * 2);
        ctx.fill();
      }
  } else {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

/** Draws art into a box: a plain photo covers it; anything else sits inside it, centred, with room. */
function place(ctx: CanvasRenderingContext2D, art: Art, x: number, y: number, w: number, h: number, room = 0.9) {
  const c = art.canvas;
  if (art.fill) {
    const s = Math.max(w / c.width, h / c.height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(c, x + (w - c.width * s) / 2, y + (h - c.height * s) / 2, c.width * s, c.height * s);
    ctx.restore();
    return;
  }
  const s = Math.min((w * room) / c.width, (h * room) / c.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(c, x + (w - c.width * s) / 2, y + (h - c.height * s) / 2, c.width * s, c.height * s);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, family: string, max: number, px: number, weight = 400) {
  let size = px;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > max) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/* ---------- The layouts ---------- */

export function compose(layout: LayoutId, arts: Art[], o: LayoutOptions): HTMLCanvasElement {
  if (layout === "sticker") return sticker(arts[0]);
  const [W, H] = SIZE[layout];
  const out = canvas(W, H);
  // A CPU-backed canvas: the print is copied, decorated and encoded later, which would otherwise read it back from the GPU.
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  if (layout === "card") {
    paintBackdrop(ctx, 0, 0, W, H, o.backdrop, o.seed);
    place(ctx, arts[0], W * 0.06, H * 0.05, W * 0.88, H * (o.caption ? 0.74 : 0.86), arts[0].fill ? 1 : 0.94);
    if (o.caption) {
      const light = o.backdrop === "sky" || o.backdrop === "sea";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      fitText(ctx, o.caption, HAND, W * 0.86, 76, HAND_W);
      ctx.lineWidth = 14;
      ctx.lineJoin = "round";
      ctx.strokeStyle = light ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.9)";
      ctx.strokeText(o.caption, W / 2, H * 0.87);
      ctx.fillStyle = INK;
      ctx.fillText(o.caption, W / 2, H * 0.87);
    }
    ctx.font = `600 20px ${MONO}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = o.backdrop === "sky" || o.backdrop === "sea" ? "rgba(255,255,255,.85)" : `rgba(${INK_RGB},.55)`;
    ctx.fillText("MADE AT ADELIA.CC", W * 0.05, H - H * 0.03);
  } else if (layout === "strip") {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);
    const m = 36;
    const fw = W - m * 2;
    const fh = fw * 0.75;
    for (let i = 0; i < 4; i++) {
      const y = m + i * (fh + 22);
      paintBackdrop(ctx, m, y, fw, fh, o.backdrop, o.seed + i);
      place(ctx, arts[i % arts.length], m, y, fw, fh, 0.92);
      ctx.strokeStyle = `rgba(${INK_RGB},.08)`;
      ctx.lineWidth = 2;
      ctx.strokeRect(m + 1, y + 1, fw - 2, fh - 2);
    }
    const footY = m + 4 * (fh + 22) - 22;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = INK;
    fitText(ctx, o.caption || "see you soon", HAND, W - m * 2, 52, HAND_W);
    ctx.fillText(o.caption || "see you soon", W / 2, footY + (H - footY) * 0.42);
    ctx.font = `600 18px ${MONO}`;
    ctx.fillStyle = `rgba(${INK_RGB},.55)`;
    ctx.fillText(`ADELIA.CC · ${dateLine(o.date).toUpperCase()}`, W / 2, footY + (H - footY) * 0.74);
  } else if (layout === "id") {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);
    const pw = 354;
    const ph = 472;
    const gap = 40;
    const x0 = (W - (pw * 4 + gap * 3)) / 2;
    const y0 = (H - (ph * 2 + gap)) / 2 - 20;
    const bg = o.idColor === "red" ? "#C8202F" : "#1F5FD0";
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < 4; c++) {
        const x = x0 + c * (pw + gap);
        const y = y0 + r * (ph + gap);
        ctx.fillStyle = bg;
        ctx.fillRect(x, y, pw, ph);
        place(ctx, arts[0], x, y, pw, ph, 0.86);
      }
    // Where to cut.
    ctx.strokeStyle = `rgba(${INK_RGB},.25)`;
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    for (let c = 0; c <= 4; c++) {
      const x = x0 + c * (pw + gap) - gap / 2;
      ctx.beginPath();
      ctx.moveTo(x, y0 - 30);
      ctx.lineTo(x, y0 + ph * 2 + gap + 30);
      ctx.stroke();
    }
    for (let r = 0; r <= 2; r++) {
      const y = y0 + r * (ph + gap) - gap / 2;
      ctx.beginPath();
      ctx.moveTo(x0 - 30, y);
      ctx.lineTo(x0 + pw * 4 + gap * 3 + 30, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.font = `600 22px ${MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = `rgba(${INK_RGB},.6)`;
    ctx.fillText(`PAS FOTO 3 × 4 CM · ${o.idColor === "red" ? "MERAH" : "BIRU"} · ADELIA.CC STUDIO`, W / 2, H - 46);
  } else if (layout === "tcg") {
    tcg(ctx, W, H, arts[0], o);
  }
  return out;
}

/** A die-cut sticker: the art with a thick white edge around its shape and a soft shadow, on transparent. */
function sticker(art: Art): HTMLCanvasElement {
  const src = art.canvas;
  const W = src.width;
  const H = src.height;
  const edge = Math.max(6, Math.min(W, H) * 0.035);
  const out = canvas(W, H);
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  // The art's silhouette in white, stamped around a circle: a cheap, round dilation.
  const sil = canvas(W, H);
  const sctx = sil.getContext("2d", { willReadFrequently: true })!;
  sctx.drawImage(src, 0, 0);
  sctx.globalCompositeOperation = "source-in";
  sctx.fillStyle = "#FFFFFF";
  sctx.fillRect(0, 0, W, H);
  const white = canvas(W, H);
  const wctx = white.getContext("2d", { willReadFrequently: true })!;
  for (let a = 0; a < 24; a++) {
    const t = (a / 24) * Math.PI * 2;
    wctx.drawImage(sil, Math.cos(t) * edge, Math.sin(t) * edge);
  }
  wctx.drawImage(sil, 0, 0);
  ctx.save();
  // Lit from the window on the right: the shadow falls down and to the left.
  ctx.shadowColor = `rgba(${INK_RGB},.26)`;
  ctx.shadowBlur = edge * 1.6;
  ctx.shadowOffsetX = -edge * 0.3;
  ctx.shadowOffsetY = edge * 0.5;
  ctx.drawImage(white, 0, 0);
  ctx.restore();
  ctx.drawImage(src, 0, 0);
  return out;
}

/** A trading card: foil border, name bar, the art in a window, a type line, flavour text and a set number. */
function tcg(ctx: CanvasRenderingContext2D, W: number, H: number, art: Art, o: LayoutOptions) {
  const r = 38;
  // The foil border: pastel spectrum, with a diagonal shine.
  const foil = ctx.createLinearGradient(0, 0, W, H);
  ["#FFD6E8", "#B5E8FF", "#C9B8FF", "#FFE9A6", "#B9F5D8", "#FFD6E8"].forEach((c, i, a) => foil.addColorStop(i / (a.length - 1), c));
  ctx.fillStyle = foil;
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, r);
  ctx.fill();
  const shine = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, H);
  shine.addColorStop(0.35, "rgba(255,255,255,0)");
  shine.addColorStop(0.5, "rgba(255,255,255,.55)");
  shine.addColorStop(0.65, "rgba(255,255,255,0)");
  ctx.fillStyle = shine;
  ctx.fill();
  // The card face.
  const m = 30;
  const face = ctx.createLinearGradient(0, m, 0, H - m);
  face.addColorStop(0, "#F4FBFF");
  face.addColorStop(1, "#DDF1FD");
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.roundRect(m, m, W - m * 2, H - m * 2, r - 12);
  ctx.fill();
  // Name bar.
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  const name = o.title || "Visitor";
  fitText(ctx, name, BOLD, W * 0.62, 50);
  ctx.fillText(name, m + 26, m + 52);
  ctx.textAlign = "right";
  ctx.font = `700 26px ${MONO}`;
  ctx.fillStyle = "#C2286F";
  ctx.fillText("♥ 26", W - m - 26, m + 54);
  // The window.
  const wx = m + 22;
  const wy = m + 100;
  const ww = W - (m + 22) * 2;
  const wh = ww * 0.75;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(wx, wy, ww, wh, 14);
  ctx.clip();
  paintBackdrop(ctx, wx, wy, ww, wh, o.backdrop, o.seed);
  place(ctx, art, wx, wy, ww, wh, 0.9);
  ctx.restore();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.roundRect(wx, wy, ww, wh, 14);
  ctx.stroke();
  // Type line.
  const ty = wy + wh + 22;
  ctx.fillStyle = "rgba(90,169,230,.16)";
  ctx.beginPath();
  ctx.roundRect(wx, ty, ww, 50, 25);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  ctx.font = `700 24px ${MONO}`;
  ctx.fillText(`HANDMADE · ${o.material.toUpperCase()}`, wx + 22, ty + 26);
  ctx.textAlign = "right";
  ctx.fillText("★ HOLO", wx + ww - 22, ty + 26);
  // Flavour text.
  const flavour = o.caption || `Made by hand in the Studio at adelia.cc on ${dateLine(o.date)}.`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#2E3F57";
  ctx.font = `${HAND_W} 30px ${HAND}`;
  wrap(ctx, flavour, wx + 8, ty + 74, ww - 16, 40, 3);
  // Set number.
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 20px ${MONO}`;
  ctx.fillStyle = `rgba(${INK_RGB},.55)`;
  ctx.textAlign = "left";
  ctx.fillText("ADELIA TCG · STUDIO SET", m + 26, H - m - 22);
  ctx.textAlign = "right";
  ctx.fillText(`${String((o.seed % 99) + 1).padStart(3, "0")}/100`, W - m - 26, H - m - 22);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number, rows: number) {
  const words = text.split(/\s+/);
  let line = "";
  let n = 0;
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max && line) {
      ctx.fillText(line, x, y + n * lh);
      n += 1;
      line = w;
      if (n >= rows) return;
    } else line = next;
  }
  if (line && n < rows) ctx.fillText(line, x, y + n * lh);
}
