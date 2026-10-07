/*
 * Reads the design tokens at runtime and turns them into 0..1 RGB(A) arrays for the shaders.
 * Fallbacks mirror packages/tokens/tokens.css, in case a token cannot be read.
 */

const FALLBACK = {
  light: {
    "--bg": "#FFFFFF",
    "--surface-2": "#F8F9FB",
    "--accent": "#F41B8D",
    "--accent-strong": "#D6087A",
    "--accent-ink": "#C8006E",
    "--ink": "#111111",
    "--surface": "#FFFFFF",
    "--line": "#E7E8EC",
    "--on-accent": "#FFFFFF",
  },
  dark: {
    "--bg": "#0C0C0D",
    "--surface-2": "#19191B",
    "--accent": "#F41B8D",
    "--accent-strong": "#D6087A",
    "--accent-ink": "#FF5FB2",
    "--ink": "#F2F2F2",
    "--surface": "#161618",
    "--line": "#2A2A2E",
    "--on-accent": "#FFFFFF",
  },
};

/** "#F41B8D" | "#fff" | "rgba(15, 18, 48, .07)" → [r, g, b, a] in 0..1, or null. */
export function parseColor(value) {
  if (!value) return null;
  const str = String(value).trim();
  const hex = str.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.replace(/./g, (c) => c + c);
    const n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
  }
  const rgb = str.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (parts.length >= 3 && parts.slice(0, 3).every((v) => Number.isFinite(v))) {
      const a = parts.length > 3 && Number.isFinite(parts[3]) ? parts[3] : 1;
      return [parts[0] / 255, parts[1] / 255, parts[2] / 255, a];
    }
  }
  return null;
}

/** Raw token string for the active theme, with the tokens.css value as a fallback. */
export function tokenString(name) {
  const dark = window.lab && window.lab.theme === "dark";
  const live = window.lab ? window.lab.token(name) : "";
  return live || FALLBACK[dark ? "dark" : "light"][name] || "";
}

function color(name) {
  const dark = window.lab && window.lab.theme === "dark";
  return parseColor(tokenString(name)) || parseColor(FALLBACK[dark ? "dark" : "light"][name]) || [1, 0, 1, 1];
}

export function readPalette() {
  const dark = !!(window.lab && window.lab.theme === "dark");
  return {
    dark,
    ground: color("--surface-2"), // the plain stage the garden grows on
    accent: color("--accent"),
    deep: color("--accent-strong"),
  };
}
