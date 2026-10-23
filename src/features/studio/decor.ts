import { CAPTION, MONO } from "./fonts";
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

// Colours from the room's pastels; its navy ink only ever as a tint.
const NAVY = "#18263A";
const EYE = "#18263A";
const BLUSH = "#FF8FB8";
const RIM = "rgba(255,255,255,.85)";
const SKY = "#D4F3FF";
const SKY_2 = "#BFE8FF";
const AQUA = "#7FE3F7";
const AZURE = "#5CB8F5";
const BLUE = "#1A8FE8";
const GLASS = "#93ECDC";
const SEA = "#22CDB0";
const PINK = "#FF7EB6";
const PINK_SOFT = "#FFD6E8";
const SUN = "#FFE27A";
const PEACH = "#FFB08A";
const LILAC = "#C9B8FF";
const PEARL_LILAC = "#E4DCFF";
const PEARL_PINK = "#FFE0F0";
const PEARL_SUN = "#FFF4C9";

type Stop = readonly [offset: number, color: string, opacity?: number];
const stops = (s: readonly Stop[]) => s.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? "" : ` stop-opacity="${a}"`}/>`).join("");
/** A gradient across a shape's own box: top to bottom unless told otherwise. */
const lin = (id: string, s: readonly Stop[], x1 = 0, y1 = 0, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(s)}</linearGradient>`;
/** Clear jelly: colour pooled at the bottom of the shape, clearing towards the top. */
const pool = (id: string, s: readonly Stop[]) => `<radialGradient id="${id}" cx=".5" cy="1" r="1">${stops(s)}</radialGradient>`;
/**
 * A sticker's gradients, ids prefixed with its own id: its paints, the shading (navy, away from the
 * sun, `shade` at its deepest) and the epoxy highlight (white, fading down).
 */
const defs = (id: string, paints: string[], shade = 0.16) =>
  `<defs>${lin(`${id}-sh`, [[0, NAVY, 0], [0.5, NAVY, 0], [1, NAVY, shade]], 0.9, 0, 0.1, 1)}${lin(`${id}-hi`, [[0, "#FFFFFF", 0.75], [1, "#FFFFFF", 0.1]])}${paints.join("")}</defs>`;

/**
 * A lit body: its paint, the shading, `inner` details (drawn to stay inside it), then a white rim.
 * The rim straddles the edge, so only its inner half shows; its stroke is also what `stickerSrc`
 * restyles into the thick white die-cut edge.
 */
const body = (id: string, d: string, paint: string, inner = "") =>
  `<path d="${d}" fill="${paint}"/><path d="${d}" fill="url(#${id}-sh)"/>${inner}<path d="${d}" fill="none" stroke="${RIM}" stroke-width="2.8" stroke-linejoin="round"/>`;
/** The sun's reflection, top right: a soft white ellipse leaning with the surface, and a hard dot just past its end. */
const gloss = (x: number, y: number, rx: number, ry: number, rot: number, dot = 2) => {
  const k = rx + dot + 1.6;
  const a = (rot * Math.PI) / 180;
  const dotAt = dot ? `<circle cx="${(x + Math.cos(a) * k).toFixed(1)}" cy="${(y + Math.sin(a) * k).toFixed(1)}" r="${dot}" fill="#FFFFFF"/>` : "";
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="#FFFFFF" opacity=".62"/>${dotAt}`;
};
/** Puffy epoxy: a white dome of light across the top of a body. */
const dome = (id: string, cx: number, cy: number, rx: number, ry: number, rot = 0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="url(#${id}-hi)"/>`;
/** A tiny face for the creatures: navy eyes with a glint, a small smile, pink cheeks. */
const face = (x: number, y: number, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="-8.6" cy="4.6" rx="3.6" ry="2.2" fill="${BLUSH}" opacity=".5"/><ellipse cx="8.6" cy="4.6" rx="3.6" ry="2.2" fill="${BLUSH}" opacity=".5"/><circle cx="-5.4" cy="0" r="2.5" fill="${EYE}"/><circle cx="5.4" cy="0" r="2.5" fill="${EYE}"/><circle cx="-4.6" cy="-.9" r=".85" fill="#FFFFFF"/><circle cx="6.2" cy="-.9" r=".85" fill="#FFFFFF"/><path d="M-2 3.3q2 1.9 4 0" stroke="${EYE}" stroke-width="1.4" stroke-linecap="round" fill="none"/></g>`;
const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
/** A soap bubble: pooled colour, a film of holo where it curves away, the sun's reflection. */
const bubble = (cx: number, cy: number, r: number) => {
  const arc = (from: number, to: number, k: number) => {
    const p = (a: number) => `${(cx + Math.cos((a * Math.PI) / 180) * r * k).toFixed(1)} ${(cy + Math.sin((a * Math.PI) / 180) * r * k).toFixed(1)}`;
    return `M${p(from)}A${(r * k).toFixed(1)} ${(r * k).toFixed(1)} 0 0 ${to > from ? 1 : 0} ${p(to)}`;
  };
  const film = `<path d="${arc(170, 100, 0.8)}" stroke="${PINK_SOFT}" stroke-width="${(r * 0.18).toFixed(1)}" stroke-linecap="round" fill="none" opacity=".85"/><path d="${arc(196, 232, 0.8)}" stroke="${PEARL_LILAC}" stroke-width="${(r * 0.14).toFixed(1)}" stroke-linecap="round" fill="none" opacity=".85"/>`;
  return body("bubbles", circle(cx, cy, r), "url(#bubbles-b)", film + gloss(cx + r * 0.4, cy - r * 0.52, r * 0.3, r * 0.12, 40, Math.max(1.4, r * 0.08)));
};

const STAR = "M47.6 20.5Q50 15 52.4 20.5L59.6 37Q60.9 40 64.1 40.3L82.1 42.1Q88 42.6 83.5 46.6L70 58.5Q67.6 60.7 68.3 63.9L72.2 81.5Q73.5 87.4 68.3 84.3L52.8 75.2Q50 73.5 47.2 75.2L31.7 84.3Q26.5 87.4 27.8 81.5L31.7 63.9Q32.4 60.7 30 58.5L16.5 46.6Q12 42.6 17.9 42.1L35.9 40.3Q39.1 40 40.4 37Z";
const HEART = "M50 84C26 68 14 55 14 38c0-11 8-19 18-19 8 0 14 5 18 11 4-6 10-11 18-11 10 0 18 8 18 19 0 17-12 30-36 46Z";
const SPARKLE = "M45 19C51.3 43.5 55.5 47.7 80 54C55.5 60.3 51.3 64.5 45 89C38.7 64.5 34.5 60.3 10 54C34.5 47.7 38.7 43.5 45 19Z";
const SPARKLE_SMALL = "M72 19C74 26.7 75.3 28 83 30C75.3 32 74 33.3 72 41C70 33.3 68.7 32 61 30C68.7 28 70 26.7 72 19Z";
const SCALLOP = "M11 63.3A8.2 8.2 0 0 1 17.9 50.4A8.2 8.2 0 0 1 29 40.8A8.2 8.2 0 0 1 42.7 35.7A8.2 8.2 0 0 1 57.3 35.7A8.2 8.2 0 0 1 71 40.8A8.2 8.2 0 0 1 82.1 50.4A8.2 8.2 0 0 1 89 63.3L60 78l8 2.5a3 3 0 0 1 1.6 4.2L68 87H32l-1.6-2.3a3 3 0 0 1 1.6-4.2l8-2.5Z";
const SCALLOP_RIBS = "M50 80 23.7 55.8M50 80 32.8 47.9M50 80 44 43.6M50 80 56 43.6M50 80 67.2 47.9M50 80 76.3 55.8";
const STARFISH = "M46.3 22.4Q50 15 53.7 22.4L59.9 35Q61.5 38.2 65 38.7L78.9 40.8Q87.1 41.9 81.2 47.7L71.1 57.5Q68.5 60 69.2 63.6L71.5 77.4Q72.9 85.6 65.6 81.7L53.2 75.2Q50 73.5 46.8 75.2L34.4 81.7Q27.1 85.6 28.5 77.4L30.8 63.6Q31.5 60 28.9 57.5L18.8 47.7Q12.9 41.9 21.1 40.8L35 38.7Q38.5 38.2 40.1 35Z";
const CLOUD = "M28 75A13 13 0 1 1 30.02 49.16A17 17 0 0 1 61.71 41.48A14 14 0 0 1 81.94 55.46A11 11 0 0 1 75 75Z";
const BOW_LOOPS = "M50 48C36 30 14 26 14 44s22 18 36 6c14 12 36 12 36-6S64 30 50 48Z";
const BOW_TAILS = "M44 50l-10 34 10-6 6 8 6-8 10 6-10-34Z";
const BELL = "M18 58c0-26 14-40 32-40s32 14 32 40c-5 5-11 5-16 0-5 5-11 5-16 0-5 5-11 5-16 0-5 5-11 5-16 0Z";
const DROP = "M50 12C40 30 24 44 24 62a26 26 0 0 0 52 0c0-18-16-32-26-50Z";
const ANEMONE_FOOT = "M27 71c0-10 10-16 23-16s23 6 23 16c0 8-8 13-23 13s-23-5-23-13Z";
/** The anemone's tentacles, outermost first so the middle ones sit in front. */
const TENTACLES = [-58, 58, -29, 29, 0];

/**
 * Each sticker is drawn in a 100×100 box in the same hand as the achievement stickers: gradients
 * lighter on top (clear jelly pools its colour low), navy-tinted shading, a soft highlight and a hard
 * dot towards the sun at the top right, a thin white rim and never a darker outline; faces only on
 * the creatures. `stickerSrc` cuts the thick white die-cut edge from the rims. Ids are saved in
 * people's work, so they stay put even when the drawing changes.
 */
export const STICKERS: { id: string; name: string; svg: string }[] = [
  {
    id: "star",
    name: "Star",
    svg: defs("star", [lin("star-b", [[0, PEARL_SUN], [0.5, SUN], [1, PEACH]])], 0.08) + body("star", STAR, "url(#star-b)", dome("star", 50, 50, 13, 7.5) + gloss(72, 44.5, 6, 1.8, 12, 1.8)),
  },
  {
    id: "heart",
    name: "Heart",
    svg:
      defs("heart", [lin("heart-b", [[0, PINK_SOFT], [0.42, PINK], [1, PINK]])]) +
      body("heart", HEART, "url(#heart-b)", dome("heart", 32, 31, 11, 6, -14) + dome("heart", 68, 31, 11, 6, 14) + gloss(76, 32, 4, 1.6, 52, 2)),
  },
  {
    id: "sparkle",
    name: "Sparkle",
    svg:
      defs("sparkle", [lin("sparkle-b", [[0, PEARL_SUN], [0.3, PINK_SOFT], [0.62, LILAC], [1, AQUA]], 1, 0, 0, 1), lin("sparkle-p", [[0, PINK_SOFT], [0.42, PINK], [1, PINK]])]) +
      body("sparkle", SPARKLE, "url(#sparkle-b)", `<circle cx="45" cy="54" r="6" fill="#FFFFFF" opacity=".7"/><ellipse cx="50" cy="49" rx="4" ry="1.6" transform="rotate(45 50 49)" fill="#FFFFFF" opacity=".75"/><circle cx="54.2" cy="45.4" r="1.6" fill="#FFFFFF"/>`) +
      body("sparkle", SPARKLE_SMALL, "url(#sparkle-p)", `<circle cx="72.6" cy="29.2" r="1.5" fill="#FFFFFF"/>`),
  },
  {
    id: "bubbles",
    name: "Bubbles",
    svg: defs("bubbles", [pool("bubbles-b", [[0, AZURE], [0.45, AQUA], [0.8, SKY], [1, "#F4FCFF"]])], 0.1) + bubble(40, 58, 26) + bubble(73, 31, 15) + bubble(77, 70, 10),
  },
  {
    id: "shell",
    name: "Shell",
    svg:
      defs("shell", [lin("shell-b", [[0, PINK_SOFT], [0.55, LILAC], [1, LILAC]])]) +
      body(
        "shell",
        SCALLOP,
        "url(#shell-b)",
        `<path d="${SCALLOP_RIBS}" stroke="${NAVY}" stroke-opacity=".08" stroke-width="2.4" stroke-linecap="round" transform="translate(-1.2 .6)"/><path d="${SCALLOP_RIBS}" stroke="#FFFFFF" stroke-opacity=".7" stroke-width="1.4" stroke-linecap="round"/>` +
          dome("shell", 50, 46, 22, 6) +
          gloss(73, 47, 4, 1.6, 40, 1.8),
      ),
  },
  {
    id: "starfish",
    name: "Starfish",
    svg:
      defs("starfish", [pool("starfish-b", [[0, PINK], [0.5, PEACH], [1, PEARL_PINK]])], 0.12) +
      body(
        "starfish",
        STARFISH,
        "url(#starfish-b)",
        `<g fill="#FFFFFF" opacity=".6"><circle cx="50" cy="31" r="1.6"/><circle cx="73" cy="46" r="1.6"/><circle cx="64" cy="72" r="1.6"/><circle cx="36" cy="72" r="1.6"/><circle cx="27" cy="46" r="1.6"/></g>` + gloss(53.4, 28, 4, 1.5, 66, 0) + face(50, 54),
      ),
  },
  {
    id: "fish",
    name: "Jelly fish",
    svg:
      defs("fish", [pool("fish-b", [[0, SEA], [0.5, GLASS], [1, "#F2FFFC"]]), lin("fish-f", [[0, SKY], [0.5, AQUA], [1, AZURE]])], 0.12) +
      body("fish", "M28 52 9 32q7 20 0 40Z", "url(#fish-f)") +
      body("fish", "M41 33Q50 11 70 31Z", "url(#fish-f)") +
      body("fish", "M24 52a31 23 0 1 0 62 0a31 23 0 1 0-62 0Z", "url(#fish-b)", dome("fish", 52, 37, 16, 5.5) + gloss(72, 37, 5, 2, 28, 1.8) + face(68, 52, 0.95)),
  },
  {
    id: "cloud",
    name: "Cloud",
    svg:
      defs("cloud", [lin("cloud-b", [[0, SKY], [0.5, SKY_2], [1, AZURE]])], 0.12) +
      `<g transform="translate(50 56) scale(1.12) translate(-50 -56)">${body("cloud", CLOUD, "url(#cloud-b)", dome("cloud", 48, 41, 10, 5) + gloss(70, 47, 4.5, 1.8, 30, 1.8))}</g>`,
  },
  {
    id: "bow",
    name: "Bow",
    svg:
      defs("bow", [lin("bow-b", [[0, PINK_SOFT], [0.42, PINK], [1, PINK]]), lin("bow-t", [[0, PINK], [1, PINK]])]) +
      body("bow", BOW_TAILS, "url(#bow-t)") +
      body("bow", BOW_LOOPS, "url(#bow-b)", dome("bow", 29, 39, 9, 4, 10) + dome("bow", 71, 39, 9, 4, -10) + gloss(79, 39, 3.4, 1.4, 35, 1.6)) +
      body("bow", circle(50, 48, 7.5), "url(#bow-b)", `<circle cx="52.6" cy="45" r="1.6" fill="#FFFFFF"/>`),
  },
  {
    id: "jelly",
    name: "Jellyfish",
    svg:
      defs("jelly", [pool("jelly-b", [[0, LILAC], [0.55, PEARL_LILAC], [1, "#FAF8FF"]]), lin("jelly-t", [[0, PEARL_LILAC], [1, LILAC]])], 0.12) +
      `<g fill="none" stroke-linecap="round"><path d="M34 60c-2 10 4 18 0 26M50 62c-2 10 3 16 0 25M66 60c2 10-3 16 0 26" stroke="url(#jelly-t)" stroke-width="5.5"/><path d="M34.8 61c-2 10 4 18 0 24M50.8 63c-2 10 3 16 0 23M66.8 61c2 10-3 16 0 24" stroke="#FFFFFF" stroke-opacity=".55" stroke-width="1.4"/></g>` +
      body("jelly", BELL, "url(#jelly-b)", `<ellipse cx="50" cy="56" rx="24" ry="6" fill="${PINK_SOFT}" opacity=".6"/>` + dome("jelly", 48, 28, 18, 7) + gloss(68, 31, 5, 2, 45, 2) + face(50, 43)),
  },
  {
    id: "drop",
    name: "Water drop",
    svg:
      defs("drop", [pool("drop-b", [[0, BLUE], [0.5, AZURE], [1, SKY]])], 0.1) +
      body("drop", DROP, "url(#drop-b)", `<path d="M31 64a19 19 0 0 0 12 17" stroke="#FFFFFF" stroke-opacity=".55" stroke-width="2.4" stroke-linecap="round" fill="none"/>` + gloss(62.5, 44, 6, 2.2, 62, 2.2)),
  },
  {
    id: "flower",
    name: "Sea anemone",
    svg:
      defs("flower", [lin("flower-t", [[0, PEARL_PINK], [0.6, PINK_SOFT], [1, PINK_SOFT]]), lin("flower-b", [[0, PINK_SOFT], [0.42, PINK], [1, PINK]]), pool("flower-f", [[0, PINK], [0.55, PINK_SOFT], [1, PEARL_PINK]])], 0.12) +
      TENTACLES.map(
        (a) =>
          `<g transform="translate(50 64) rotate(${a})">${body("flower", "M-5.5-31a5.5 5.5 0 0 1 11 0V0h-11Z", "url(#flower-t)")}${body("flower", circle(0, -33, 6.8), "url(#flower-b)", `<ellipse cx="0.6" cy="-36.4" rx="3.2" ry="1.4" fill="#FFFFFF" opacity=".62"/><circle cx="3.6" cy="-34.8" r="1.5" fill="#FFFFFF"/>`)}</g>`,
      ).join("") +
      body("flower", ANEMONE_FOOT, "url(#flower-f)", dome("flower", 50, 61, 16, 4.5) + gloss(64, 62, 3.4, 1.4, 25, 1.6) + face(50, 71, 0.9)),
  },
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
export async function drawDecor(target: HTMLCanvasElement, items: Decor[], strokes: Stroke[], stamp: string | null) {
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
      ctx.shadowColor = "rgba(24,38,58,.28)";
      ctx.shadowBlur = s * 0.08;
      ctx.shadowOffsetX = -s * 0.015;
      ctx.shadowOffsetY = s * 0.03;
      ctx.drawImage(img, -s / 2, -s / 2, s, s);
    } else {
      const px = d.size * W;
      ctx.font = `${CAPTION.weight} ${px}px ${CAPTION.family}`;
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

/** The orange date a disposable camera burns into the corner (the one orange in the room: it's the film's). */
export function drawStamp(ctx: CanvasRenderingContext2D, W: number, H: number, text: string) {
  const px = Math.max(14, W * 0.042);
  ctx.save();
  ctx.font = `700 ${px}px ${MONO}`;
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
  out.getContext("2d", { willReadFrequently: true })!.drawImage(c, 0, 0);
  return out;
};
