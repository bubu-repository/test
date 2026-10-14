import "@fontsource/bagel-fat-one/400.css";
import "@fontsource/rubik-bubbles/400.css";
import "@fontsource/rampart-one/400.css";
import "@fontsource/shrikhand/400.css";
import "@fontsource/gochi-hand/400.css";
import "@fontsource/bungee/400.css";
import "@fontsource/mochiy-pop-one/400.css";

/**
 * The Studio's lettering: eight expressive open fonts (SIL Open Font License), loaded only on the
 * Lab. `size` evens out how big each one looks at the same font size.
 */
export type StudioFont = { id: string; name: string; family: string; weight: number; size: number; note: string };

export const FONTS: StudioFont[] = [
  { id: "bagel", name: "Bagel", family: "Bagel Fat One", weight: 400, size: 1, note: "Puffy" },
  { id: "bubbles", name: "Bubbles", family: "Rubik Bubbles", weight: 400, size: 0.92, note: "Bubble" },
  { id: "mochi", name: "Mochi", family: "Mochiy Pop One", weight: 400, size: 0.9, note: "Kawaii" },
  { id: "rampart", name: "Pop-out", family: "Rampart One", weight: 400, size: 0.95, note: "3D outline" },
  { id: "shrikhand", name: "Retro", family: "Shrikhand", weight: 400, size: 0.95, note: "Seventies script" },
  { id: "gochi", name: "Doodle", family: "Gochi Hand", weight: 400, size: 1.12, note: "Handwritten" },
  { id: "bungee", name: "Sign", family: "Bungee", weight: 400, size: 0.86, note: "Signage" },
  // The site's own pixel face (next/font), found through its CSS variable.
  { id: "pixel", name: "Pixel", family: "--font-pixel-face", weight: 600, size: 1, note: "Pixel" },
];

export const fontById = (id: string) => FONTS.find((f) => f.id === id) ?? FONTS[0];

/** The family as a canvas can use it: a CSS variable (a next/font face) is read from the page. */
export function familyOf(f: StudioFont): string {
  if (!f.family.startsWith("--")) return `"${f.family}"`;
  const value = typeof document === "undefined" ? "" : getComputedStyle(document.body).getPropertyValue(f.family).trim();
  return value || "monospace";
}

export const cssFont = (f: StudioFont, px: number) => `${f.weight} ${Math.round(px * f.size)}px ${familyOf(f)}`;

/** The same, for a style attribute: the CSS variable stays a variable, so server and browser agree. */
export const domFont = (f: StudioFont, px: number) => `${f.weight} ${Math.round(px * f.size)}px ${f.family.startsWith("--") ? `var(${f.family})` : `"${f.family}"`}`;

/** Resolves once the face is ready to draw on a canvas (canvas text doesn't wait for fonts by itself). */
export async function loadFont(f: StudioFont, sample = "Aa"): Promise<void> {
  try {
    await document.fonts.load(cssFont(f, 64), sample);
  } catch {
    // The fallback face draws instead; nothing else to do.
  }
}
