/**
 * The guestbook is the sea: every visitor leaves a sea creature with a note, and it swims there.
 */

export type NoteColor = "magenta" | "sun" | "lime" | "sky" | "violet" | "mint";

export type Species = "fish" | "jellyfish" | "octopus" | "turtle" | "seahorse" | "pufferfish" | "crab" | "whale";

export type Note = {
  id: string;
  name: string;
  message: string;
  color: NoteColor;
  species: Species;
  createdAt: string;
};

export const NOTE_COLORS: NoteColor[] = ["magenta", "sky", "mint", "violet", "sun", "lime"];
export const SPECIES: Species[] = ["fish", "jellyfish", "octopus", "turtle", "seahorse", "pufferfish", "crab", "whale"];

export const COLOR_LABEL: Record<NoteColor, string> = {
  magenta: "Pink",
  sky: "Aqua",
  mint: "Sea glass",
  violet: "Lilac",
  sun: "Butter",
  lime: "Leaf",
};

export const SPECIES_LABEL: Record<Species, string> = {
  fish: "Fish",
  jellyfish: "Jellyfish",
  octopus: "Octopus",
  turtle: "Turtle",
  seahorse: "Seahorse",
  pufferfish: "Pufferfish",
  crab: "Crab",
  whale: "Little whale",
};

export const NOTE_MAX = 160;
export const NAME_MAX = 24;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Notes left before the sea had creatures get one from their id, so they always come back the same. */
export function speciesFor(id: string): Species {
  return SPECIES[hash(id) % SPECIES.length];
}

/** Reads a stored note (any age) into the current shape, or null if it isn't one. */
export function normalizeNote(raw: unknown): Note | null {
  if (!raw || typeof raw !== "object") return null;
  const n = raw as Partial<Note>;
  if (typeof n.id !== "string" || typeof n.message !== "string") return null;
  return {
    id: n.id,
    name: typeof n.name === "string" && n.name ? n.name : "Anonymous visitor",
    message: n.message,
    color: NOTE_COLORS.includes(n.color as NoteColor) ? (n.color as NoteColor) : "sky",
    species: SPECIES.includes(n.species as Species) ? (n.species as Species) : speciesFor(n.id),
    createdAt: typeof n.createdAt === "string" ? n.createdAt : new Date(0).toISOString(),
  };
}

/** Creatures from the house, so the sea is never empty on a fresh deploy. */
export const SEED_NOTES: Note[] = [
  { id: "seed-1", name: "Moci", message: "First! I live in this sea. Leave a creature and I'll keep it company.", color: "magenta", species: "jellyfish", createdAt: "2026-10-01T02:00:00.000Z" },
  { id: "seed-2", name: "Moci", message: "Tip: press ⌘K and type a question. I answer from the palette too.", color: "sky", species: "whale", createdAt: "2026-10-01T02:01:00.000Z" },
  { id: "seed-3", name: "Moci", message: "There's a secret code somewhere. The terminal knows. `ls -a`", color: "violet", species: "octopus", createdAt: "2026-10-01T02:02:00.000Z" },
];
