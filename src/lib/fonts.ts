import localFont from "next/font/local";

/*
 * Five families, self-hosted from Fontsource (latin subset; the site is English).
 * Mona Sans carries everything: one variable file with weight (200–900) and width (75–125) axes
 * gives sturdy, quiet display headlines and open, readable text. Mona Sans and Nunito are preloaded.
 */

export const fontSans = localFont({
  src: "../../node_modules/@fontsource-variable/mona-sans/files/mona-sans-latin-wdth-normal.woff2",
  variable: "--font-sans-face",
  weight: "200 900",
  style: "normal",
  display: "swap",
  preload: true,
  declarations: [{ prop: "font-stretch", value: "75% 125%" }],
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

// Rounded: no longer used by the interface (it was for game-UI corners); kept, not preloaded.
export const fontRound = localFont({
  src: "../../node_modules/@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2",
  variable: "--font-round-face",
  weight: "200 1000",
  display: "swap",
  preload: false,
  fallback: ["ui-rounded", "system-ui", "sans-serif"],
});

// Bitmap micro-labels and LCD digits: a small nod to the pixel references, never body copy.
export const fontPixel = localFont({
  src: "../../node_modules/@fontsource-variable/pixelify-sans/files/pixelify-sans-latin-wght-normal.woff2",
  variable: "--font-pixel-face",
  weight: "400 700",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: ["ui-monospace", "monospace"],
});

export const fontMono = localFont({
  src: "../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-mono-face",
  weight: "100 800",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

// The product screens in the case studies (Tenderlens, Catat, Lintas) use their own UI face, so
// they read as real apps and not as part of the portfolio.
export const fontUi = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-ui-face",
  weight: "100 900",
  display: "swap",
  preload: false,
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const fontVariables = [fontSans.variable, fontRound.variable, fontPixel.variable, fontMono.variable, fontUi.variable].join(" ");
