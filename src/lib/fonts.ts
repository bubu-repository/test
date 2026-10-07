import localFont from "next/font/local";

/*
 * Three families, self-hosted from Fontsource (latin subset; the site is English).
 * Bricolage Grotesque carries everything: its optical-size axis (12–96) gives tight display
 * headlines and open, readable text from one file. Only Bricolage is preloaded.
 */

export const fontSans = localFont({
  src: "../../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2",
  variable: "--font-sans-face",
  weight: "200 800",
  style: "normal",
  display: "swap",
  preload: true,
  declarations: [{ prop: "font-stretch", value: "75% 100%" }],
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
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

export const fontVariables = [fontSans.variable, fontPixel.variable, fontMono.variable].join(" ");
