export type NoteColor = "magenta" | "sun" | "lime" | "sky" | "violet" | "mint";

export type Note = {
  id: string;
  name: string;
  message: string;
  color: NoteColor;
  sticker: string;
  createdAt: string;
};

export const NOTE_COLORS: NoteColor[] = ["magenta", "sun", "lime", "sky", "violet", "mint"];
export const NOTE_STICKERS = ["👋", "🍡", "💖", "🌸", "🚀", "☕", "🍬", "🐙", "🌙", "⭐"];
export const NOTE_MAX = 160;
export const NAME_MAX = 24;

/** Notes from the house, so the wall is never empty on a fresh deploy. */
export const SEED_NOTES: Note[] = [
  { id: "seed-1", name: "Moci", message: "First! I live here. Leave a note and I'll keep it safe.", color: "magenta", sticker: "🍡", createdAt: "2026-10-01T02:00:00.000Z" },
  { id: "seed-2", name: "Moci", message: "Tip: press ⌘K and type a question. I answer from the palette too.", color: "sun", sticker: "⭐", createdAt: "2026-10-01T02:01:00.000Z" },
  { id: "seed-3", name: "Moci", message: "There's a secret code somewhere. The terminal knows. `ls -a`", color: "sky", sticker: "🌙", createdAt: "2026-10-01T02:02:00.000Z" },
];
