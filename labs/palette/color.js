/*
 * Colour math for Magenta Machine. No dependencies.
 *
 *   hex ↔ sRGB (0–1, gamma encoded) ↔ linear sRGB ↔ OKLab ↔ OKLCH
 *   gamut mapping: keep L and h, reduce chroma until the colour fits in sRGB
 *   WCAG 2.x relative luminance and contrast ratio
 *
 * OKLab matrices: Björn Ottosson, https://bottosson.github.io/posts/oklab/
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** "#f41b8d", "f41b8d", "#f18" → "#F41B8D", or null when it is not a hex colour. */
export function normalizeHex(input) {
  if (typeof input !== "string") return null;
  let s = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(s)) s = s.replace(/./g, (c) => c + c);
  if (!/^[0-9a-f]{6}$/i.test(s)) return null;
  return "#" + s.toUpperCase();
}

/** "#F41B8D" → [r, g, b] in 0–1, gamma encoded. */
export function hexToRgb(hex) {
  const n = parseInt(normalizeHex(hex).slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** [r, g, b] in 0–1 → "#RRGGBB" (clipped). */
export function rgbToHex(rgb) {
  return (
    "#" +
    rgb
      .map((v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

/** sRGB transfer function, decode: gamma encoded → linear light. */
export const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** sRGB transfer function, encode: linear light → gamma encoded. */
export const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.sign(c) * Math.abs(c) ** (1 / 2.4) - 0.055);

export function linearToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabToLinear([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function oklabToOklch([L, a, b]) {
  const c = Math.hypot(a, b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  // Greys have no meaningful hue.
  return { l: L, c, h: c < 1e-4 ? 0 : h };
}

export function oklchToOklab({ l, c, h }) {
  const rad = (h * Math.PI) / 180;
  return [l, c * Math.cos(rad), c * Math.sin(rad)];
}

export function hexToOklch(hex) {
  return oklabToOklch(linearToOklab(hexToRgb(hex).map(toLinear)));
}

const EPS = 1e-5;
const inGamut = (lin) => lin.every((v) => v >= -EPS && v <= 1 + EPS);

/**
 * Gamut mapping: keep lightness and hue, binary-search the chroma down until the colour
 * fits inside sRGB. Returns the mapped OKLCH plus its linear sRGB.
 */
export function gamutMap({ l, c, h }) {
  const L = clamp(l, 0, 1);
  const C = Math.max(0, c);
  const H = ((h % 360) + 360) % 360;
  let lin = oklabToLinear(oklchToOklab({ l: L, c: C, h: H }));
  if (inGamut(lin)) return { lch: { l: L, c: C, h: H }, lin };
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklabToLinear(oklchToOklab({ l: L, c: mid, h: H })))) lo = mid;
    else hi = mid;
  }
  lin = oklabToLinear(oklchToOklab({ l: L, c: lo, h: H }));
  return { lch: { l: L, c: lo, h: H }, lin };
}

/** OKLCH (any chroma) → in-gamut "#RRGGBB". */
export function oklchToHex(lch) {
  return rgbToHex(gamutMap(lch).lin.map((v) => toGamma(clamp(v, 0, 1))));
}

/** WCAG 2.x relative luminance. */
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio, 1–21. Order does not matter. */
export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** WCAG says never round a ratio up: 4.499 fails AA. */
export const floorRatio = (ratio) => Math.floor(ratio * 100) / 100;

/** "AAA" ≥ 7, "AA" ≥ 4.5, "AA Large" ≥ 3, otherwise "Fail". */
export function grade(ratio) {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}

/** "oklch(63.4% 0.237 358.4)" */
export function formatOklch({ l, c, h }) {
  return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`;
}
