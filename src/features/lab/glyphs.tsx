/** One short glyph per lab item, drawn white inside its app icon. */
const GLYPHS: Record<string, string> = {
  bloom: "✿",
  tokens: "¶",
  swarm: "⁂",
  type: "Aa",
  palette: "◐",
  autopilot: "➤",
  moci: "ᵔᴥᵔ",
  "palette-k": "⌘",
  terminal: ">_",
  resample: "⟳",
  "live-sky": "☁",
  badge: "ID",
  booster: "◆",
  gacha: "●",
  stickers: "★",
  widgets: "▦",
  overlap: "◷",
  live: "➶",
  guestbook: "✎",
  "context-window": "∿",
  hallucination: "?",
  brief: "40",
  jd: "JD",
  xray: "◎",
  "at-26": "◉",
  poster: "QW",
  lockscreen: "▯",
  "pixel-moci": "▚",
  "find-time": "◔",
  keycaps: "⌥",
  psp: "✕",
  laptop: ">_",
  dock: "▭",
  "case-chat": "❝",
  ticker: "⏱",
  sound: "♪",
  sea: "〰",
  "sea-widget": "≈",
  sky: "☁",
  desk: "♫",
  "cd-shelf": "◎",
  secret: "↑↑",
};

/** The glyph as text (for places that print it, like the palette's keys). */
export const labGlyphText = (slug: string) => GLYPHS[slug] ?? "•";

export function labGlyph(slug: string) {
  const g = GLYPHS[slug] ?? "•";
  return (
    <span className="relative z-[1] leading-none font-bold tracking-[-0.04em]" style={{ fontSize: `calc(var(--size) * ${g.length > 2 ? 0.26 : g.length > 1 ? 0.36 : 0.46})` }}>
      {g}
    </span>
  );
}
