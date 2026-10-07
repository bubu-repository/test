/*
 * Palette logic for Magenta Machine: harmony recipes in OKLCH, and the pairing rules that
 * decide which text colour may sit on which background.
 */
import { contrast, grade, hexToOklch, luminance, oklchToHex } from "./color.js";

export const MAGENTA = "#F41B8D";
/** The two text colours every swatch is tested with, plus a last-resort fallback. */
export const INK = "#0F1230";
export const WHITE = "#FFFFFF";
export const BLACK = "#000000";

export const MODES = [
  { id: "sky", name: "Sky pop" },
  { id: "analogous", name: "Analogous" },
  { id: "complementary", name: "Complementary" },
  { id: "triadic", name: "Triadic" },
  { id: "pastel", name: "Pastel candy" },
  { id: "random", name: "Random" },
];

export const modeName = (id) => (MODES.find((m) => m.id === id) || MODES[0]).name;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
/** Seeds are 0–1. A seed of 0.5 means "no jitter", so the default palette is exact. */
const jit = (seed, range) => (seed - 0.5) * 2 * range;
const lerp = (a, b, t) => a + (b - a) * t;

const PERMUTATIONS = (() => {
  const out = [];
  const permute = (rest, acc) => {
    if (!rest.length) out.push(acc);
    rest.forEach((v, i) => permute([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, v]));
  };
  permute([0, 1, 2, 3], []);
  return out;
})();

/**
 * One swatch for slot 1–4 (slot 0 is always the anchor).
 * @param {string} mode
 * @param {number} slot 1–4
 * @param {{l:number,c:number,h:number}} A the anchor in OKLCH
 * @param {number[]} s three seeds for this slot
 * @param {number} g a seed shared by the whole generation
 * @param {Record<string,string>} brand the site's own colours, read from the tokens
 * @returns {{hex:string, role:string}}
 */
export function deriveSwatch(mode, slot, A, s, g, brand) {
  const [s0, s1, s2] = s;
  const k = slot - 1;
  let lch;
  let role;

  switch (mode) {
    case "analogous": {
      const recipes = [
        () => ({ role: "Mist", l: 0.955 + jit(s0, 0.02), c: 0.02 + 0.035 * s1, h: A.h + jit(s2, 25) }),
        () => ({ role: "Neighbour", l: clamp(A.l + 0.13 + jit(s0, 0.06), 0.55, 0.9), c: A.c * 0.85 * (1 + jit(s1, 0.2)), h: A.h + 32 + jit(s2, 10) }),
        () => ({ role: "Neighbour", l: clamp(A.l - 0.08 + jit(s0, 0.06), 0.4, 0.75), c: A.c * 0.9 * (1 + jit(s1, 0.2)), h: A.h - 32 + jit(s2, 10) }),
        () => ({ role: "Deep", l: 0.24 + jit(s0, 0.04), c: 0.05 + 0.06 * s1, h: A.h + jit(s2, 15) }),
      ];
      ({ role, ...lch } = recipes[k]());
      break;
    }
    case "complementary": {
      const comp = A.h + 180;
      const recipes = [
        () => ({ role: "Tint", l: 0.955 + jit(s0, 0.02), c: 0.025 + 0.03 * s1, h: A.h + jit(s2, 15) }),
        () => ({ role: "Complement", l: clamp(A.l + jit(s0, 0.08), 0.45, 0.85), c: Math.max(A.c, 0.08) * (0.9 + jit(s1, 0.15)), h: comp + jit(s2, 10) }),
        () => ({ role: "Soft complement", l: 0.86 + jit(s0, 0.04), c: 0.07 + 0.05 * s1, h: comp + jit(s2, 20) }),
        () => ({ role: "Deep", l: 0.24 + jit(s0, 0.04), c: 0.06 + 0.05 * s1, h: comp + jit(s2, 25) }),
      ];
      ({ role, ...lch } = recipes[k]());
      break;
    }
    case "triadic": {
      const recipes = [
        () => ({ role: "Triad", l: clamp(A.l + 0.12 + jit(s0, 0.08), 0.5, 0.9), c: Math.max(A.c, 0.08) * (0.8 + jit(s1, 0.15)), h: A.h + 120 + jit(s2, 8) }),
        () => ({ role: "Triad", l: clamp(A.l + jit(s0, 0.08), 0.45, 0.85), c: Math.max(A.c, 0.08) * (0.85 + jit(s1, 0.15)), h: A.h + 240 + jit(s2, 8) }),
        () => ({ role: "Tint", l: 0.955 + jit(s0, 0.02), c: 0.02 + 0.03 * s1, h: A.h + 120 + jit(s2, 30) }),
        () => ({ role: "Deep", l: 0.23 + jit(s0, 0.04), c: 0.05 + 0.05 * s1, h: A.h + 240 + jit(s2, 20) }),
      ];
      ({ role, ...lch } = recipes[k]());
      break;
    }
    case "pastel": {
      if (k < 3) {
        role = "Candy";
        lch = { l: 0.89 + jit(s0, 0.04), c: 0.085 + jit(s1, 0.03), h: A.h + 75 + 95 * k + jit(g, 40) + jit(s2, 18) };
      } else {
        role = "Licorice";
        lch = { l: 0.28 + jit(s0, 0.04), c: 0.08 + jit(s1, 0.03), h: A.h + jit(s2, 40) };
      }
      break;
    }
    case "random": {
      const bins = [
        { role: "Light", l: 0.94, dl: 0.03, c: [0.01, 0.07] },
        { role: "Bright", l: 0.77, dl: 0.08, c: [0.07, 0.2] },
        { role: "Mid", l: 0.56, dl: 0.08, c: [0.08, 0.24] },
        { role: "Dark", l: 0.24, dl: 0.06, c: [0.02, 0.1] },
      ];
      const perm = PERMUTATIONS[Math.floor(g * PERMUTATIONS.length) % PERMUTATIONS.length];
      const bin = bins[perm[k]];
      role = bin.role;
      lch = { l: bin.l + jit(s0, bin.dl), c: lerp(bin.c[0], bin.c[1], s1), h: s2 * 360 };
      break;
    }
    case "sky":
    default: {
      // The site's own sky: sky, sun, lime and midnight, gently jittered around the tokens.
      const bases = [
        { role: "Sky", hex: brand.sky, dl: 0.045, dc: 0.3, dh: 12 },
        { role: "Sun", hex: brand.sun, dl: 0.035, dc: 0.25, dh: 10 },
        { role: "Lime", hex: brand.lime, dl: 0.035, dc: 0.25, dh: 10 },
        { role: "Midnight", hex: brand.midnight, dl: 0.04, dc: 0.5, dh: 20 },
      ];
      const b = bases[k];
      const base = hexToOklch(b.hex);
      role = b.role;
      if (s0 === 0.5 && s1 === 0.5 && s2 === 0.5) return { hex: b.hex, role };
      lch = { l: base.l + jit(s0, b.dl), c: base.c * (1 + jit(s1, b.dc)), h: base.h + jit(s2, b.dh) };
    }
  }

  lch.l = clamp(lch.l, 0.08, 0.985);
  return { hex: oklchToHex(lch), role };
}

/* ---------- Pairing ---------- */

export const passesAA = (ratio) => ratio >= 4.5;

/**
 * The text colour for a background: ink or white, whichever is higher, when it passes AA.
 * In the narrow mid-grey band where neither reaches 4.5:1, pure black always does.
 */
export function textOn(bg) {
  const ink = { name: "Ink", hex: INK, ratio: contrast(INK, bg) };
  const white = { name: "White", hex: WHITE, ratio: contrast(WHITE, bg) };
  const best = ink.ratio >= white.ratio ? ink : white;
  if (passesAA(best.ratio)) return { ...best, ink, white };
  return { name: "Black", hex: BLACK, ratio: contrast(BLACK, bg), fallback: true, ink, white };
}

/** Every ordered pair (text on background) of the palette, skipping a colour on itself. */
export function allPairs(colors) {
  const pairs = [];
  colors.forEach((bg, b) => {
    colors.forEach((fg, t) => {
      if (b === t) return;
      const ratio = contrast(fg, bg);
      pairs.push({ text: t, bg: b, ratio, grade: grade(ratio) });
    });
  });
  return pairs;
}

const chroma = (hex) => hexToOklch(hex).c;

/**
 * Plans a small widget on one palette colour, choosing only pairs that pass:
 * text ≥ 4.5:1 (AA), graphics (button edge, ring) ≥ 3:1 against the card.
 * Palette colours are preferred; ink, white and black are fallbacks.
 */
export function planWidget(colors, bgIndex) {
  const bg = colors[bgIndex];
  const others = colors.map((hex, i) => ({ hex, i, label: `--palette-${i + 1}` })).filter((o) => o.i !== bgIndex && o.hex !== bg);
  const fallbacks = [
    { hex: INK, label: "ink", fallback: true },
    { hex: WHITE, label: "white", fallback: true },
    { hex: BLACK, label: "black", fallback: true },
  ];

  /** Best text for a fill: a passing palette colour if any (highest ratio), else a fallback. */
  const textFor = (fill, exclude = []) => {
    const pool = [...colors.map((hex, i) => ({ hex, i, label: `--palette-${i + 1}` })), ...fallbacks]
      .filter((p) => p.hex !== fill && !exclude.includes(p.hex))
      .map((p) => ({ ...p, ratio: contrast(p.hex, fill) }))
      .filter((p) => passesAA(p.ratio));
    const palette = pool.filter((p) => !p.fallback).sort((a, b) => b.ratio - a.ratio);
    // Fallbacks: the token ink or white first; pure black only when neither passes.
    const fb = pool.filter((p) => p.fallback).sort((a, b) => (a.hex === BLACK) - (b.hex === BLACK) || b.ratio - a.ratio);
    return palette[0] || fb[0];
  };

  const withRatio = others.map((o) => ({ ...o, ratio: contrast(o.hex, bg), chroma: chroma(o.hex) }));
  const textOk = withRatio.filter((o) => passesAA(o.ratio));

  // Title: the most colourful palette colour that passes, so the card has character.
  const title = [...textOk].sort((a, b) => b.chroma - a.chroma)[0] || textFor(bg);
  // Body: the highest-contrast passing colour, for comfortable reading.
  const body = [...textOk].sort((a, b) => b.ratio - a.ratio)[0] || textFor(bg);

  // Button: prefer the anchor, then the most colourful; its edge must reach 3:1 on the card
  // and its label must pass AA on the fill.
  const fills = [...withRatio].sort((a, b) => (a.i === 0 ? -1 : b.i === 0 ? 1 : b.chroma - a.chroma));
  let button = null;
  for (const f of fills) {
    if (f.ratio < 3) continue;
    const label = textFor(f.hex);
    if (label) {
      button = { fill: f, label: { ...label, ratio: contrast(label.hex, f.hex) } };
      break;
    }
  }
  if (!button) {
    // Invert the title pair: it is already known to pass.
    button = { fill: { ...title, ratio: contrast(title.hex, bg) }, label: { hex: bg, i: bgIndex, label: `--palette-${bgIndex + 1}`, ratio: contrast(title.hex, bg) } };
  }

  // Tag: another colourful fill (not the button), with a passing label.
  const tagFill =
    [...withRatio].filter((o) => o.hex !== button.fill.hex).sort((a, b) => b.chroma - a.chroma)[0] || button.fill;
  const tagLabel = textFor(tagFill.hex);
  const tag = { fill: tagFill, label: { ...tagLabel, ratio: contrast(tagLabel.hex, tagFill.hex) } };

  // Ring: a graphic, so 3:1 against the card. Prefer a colour that is not the button.
  const ringPool = withRatio.filter((o) => o.ratio >= 3).sort((a, b) => b.chroma - a.chroma);
  const ring = ringPool.find((o) => o.hex !== button.fill.hex) || ringPool[0] || { ...title, ratio: contrast(title.hex, bg) };

  // App icon: the anchor when it is not the card itself.
  const iconFill = bgIndex !== 0 ? { hex: colors[0], i: 0, label: "--palette-1" } : button.fill;
  const iconOn = textOn(iconFill.hex);

  return {
    bg: { hex: bg, i: bgIndex, label: `--palette-${bgIndex + 1}` },
    title: { ...title, ratio: contrast(title.hex, bg) },
    body: { ...body, ratio: contrast(body.hex, bg) },
    button,
    tag,
    ring,
    icon: { fill: iconFill, on: iconOn },
  };
}

/** Indexes of the lightest and the darkest colour. */
export function extremes(colors) {
  let light = 0;
  let dark = 0;
  colors.forEach((hex, i) => {
    if (luminance(hex) > luminance(colors[light])) light = i;
    if (luminance(hex) < luminance(colors[dark])) dark = i;
  });
  return { light, dark };
}
