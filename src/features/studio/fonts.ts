import '@fontsource/bagel-fat-one/latin-400.css';
import '@fontsource/bagel-fat-one/latin-ext-400.css';
import '@fontsource/m-plus-rounded-1c/latin-800.css';
import '@fontsource/m-plus-rounded-1c/latin-ext-800.css';
import '@fontsource/m-plus-rounded-1c/latin-900.css';
import '@fontsource/m-plus-rounded-1c/latin-ext-900.css';
import '@fontsource/doto/latin-900.css';
import '@fontsource/doto/latin-ext-900.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import '@fontsource/jetbrains-mono/latin-700.css';
import '@fontsource/jetbrains-mono/latin-800.css';

/**
 * The Studio's lettering: the room's own open faces (SIL Open Font License), loaded with the
 * Studio only. `size` evens out how big each one looks at the same font size.
 */
export type StudioFont = { id: string; name: string; family: string; weight: number; size: number; note: string };

export const FONTS: StudioFont[] = [
  { id: 'bagel', name: 'Puffy', family: 'Bagel Fat One', weight: 400, size: 1, note: 'Fat felt letters' },
  { id: 'rounded', name: 'Round', family: 'M PLUS Rounded 1c', weight: 900, size: 1.02, note: 'Soft and round' },
  { id: 'dots', name: 'LED', family: 'Doto', weight: 900, size: 1.08, note: 'Dot-matrix lights' },
  { id: 'mono', name: 'Typed', family: 'JetBrains Mono', weight: 800, size: 0.9, note: 'Typewriter' },
];

export const fontById = (id: string) => FONTS.find((f) => f.id === id) ?? FONTS[0];

/** Captions, words and the trading card's flavour text: the room's rounded face, extra bold. */
export const CAPTION = { family: '"M PLUS Rounded 1c", "Arial Rounded MT Bold", system-ui, sans-serif', weight: 800 };
export const TITLE = { family: '"Bagel Fat One", "Arial Rounded MT Bold", system-ui, sans-serif', weight: 400 };
export const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';

export const familyOf = (f: StudioFont) => `"${f.family}"`;
export const cssFont = (f: StudioFont, px: number) => `${f.weight} ${Math.round(px * f.size)}px ${familyOf(f)}`;
export const domFont = cssFont;

/** Resolves once the face is ready to draw on a canvas (canvas text doesn't wait for fonts by itself). */
export async function loadFont(f: StudioFont, sample = 'Aa'): Promise<void> {
  try {
    await document.fonts.load(cssFont(f, 64), sample);
  } catch {
    // The fallback face draws instead; nothing else to do.
  }
}

let shared: Promise<unknown> | null = null;
/** The faces the layouts draw with (captions, the card's name, the small mono labels), loaded once. */
export function loadLayoutFonts(): Promise<unknown> {
  shared ??= Promise.all([
    document.fonts.load(`${CAPTION.weight} 40px ${CAPTION.family}`, 'Aa'),
    document.fonts.load(`${TITLE.weight} 40px ${TITLE.family}`, 'Aa'),
    document.fonts.load(`600 20px ${MONO}`, 'A1'),
    document.fonts.load(`700 20px ${MONO}`, 'A1'),
  ]).catch(() => {});
  return shared;
}
