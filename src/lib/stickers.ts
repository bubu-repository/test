"use client";

import { sfx } from "./sound";
import { readJSON, writeJSON } from "./storage";
import { createStore, useStore } from "./store";
import { toast } from "./ui";

/**
 * Achievements, as collectible die-cut vinyl stickers (each its own illustration, see
 * components/StickerArt). Unlocked stickers can be peeled out of the
 * sticker book and placed anywhere on any page; placements are remembered per route.
 */

export type StickerDef = {
  id: string;
  name: string;
  hint: string;
  emoji: string;
  secret?: boolean;
};

export const STICKERS: StickerDef[] = [
  { id: "hello", name: "First hello", hint: "Visit the home page.", emoji: "👋" },
  { id: "clouds", name: "Cloud parter", hint: "Part the clouds in the home sky with your cursor.", emoji: "☁️" },
  { id: "night", name: "Night owl", hint: "Switch to the night sky.", emoji: "🦉" },
  { id: "pack", name: "Pack opener", hint: "Tear open the booster pack.", emoji: "🎴" },
  { id: "collector", name: "Card collector", hint: "Read all four case studies.", emoji: "🃏" },
  { id: "gacha", name: "Lucky capsule", hint: "Get a capsule from the gumball machine.", emoji: "🍬" },
  { id: "shell", name: "Shell native", hint: "Run five commands in the terminal.", emoji: "⌨️" },
  { id: "speed", name: "Speed reader", hint: "Finish the 40-second brief.", emoji: "⏱️" },
  { id: "passenger", name: "Passenger", hint: "Ride the autopilot tour to the end.", emoji: "🛸" },
  { id: "curious", name: "Curious mind", hint: "Ask Moci a question.", emoji: "💬" },
  { id: "sampler", name: "Temperature check", hint: "Resample the headline five times.", emoji: "🎲" },
  { id: "lost", name: "Lost & found", hint: "Find a page that doesn't exist.", emoji: "🧭" },
  { id: "context", name: "Long context", hint: "Score 20 in Context Window.", emoji: "🐍" },
  { id: "wave", name: "Hello neighbour", hint: "Wave at another visitor.", emoji: "🌊" },
  { id: "signed", name: "Signed", hint: "Leave a note in the guestbook.", emoji: "✍️" },
  { id: "xray", name: "X-ray vision", hint: "See how the page is built.", emoji: "🩻" },
  { id: "konami", name: "Cheat code", hint: "A classic code, entered anywhere.", emoji: "🎮", secret: true },
];

export type Placement = { id: string; x: number; y: number; r: number };

type StickerState = {
  unlocked: string[];
  counters: Record<string, number>;
  /** route → placed stickers (x, y are page coordinates in px, x relative to viewport width %). */
  placed: Record<string, Placement[]>;
  hydrated: boolean;
};

const KEY = "adelia:stickers";

export const stickerStore = createStore<StickerState>({ unlocked: [], counters: {}, placed: {}, hydrated: false });

export function hydrateStickers() {
  if (stickerStore.get().hydrated) return;
  const saved = readJSON<Partial<StickerState>>(KEY, {});
  stickerStore.set({
    unlocked: Array.isArray(saved.unlocked) ? saved.unlocked : [],
    counters: saved.counters ?? {},
    placed: saved.placed ?? {},
    hydrated: true,
  });
}

function persist() {
  const { unlocked, counters, placed } = stickerStore.get();
  writeJSON(KEY, { unlocked, counters, placed });
}

export function unlock(id: string, { silent = false }: { silent?: boolean } = {}) {
  hydrateStickers();
  const state = stickerStore.get();
  if (state.unlocked.includes(id)) return false;
  const def = STICKERS.find((s) => s.id === id);
  if (!def) return false;
  stickerStore.set({ unlocked: [...state.unlocked, id] });
  persist();
  // No confetti while someone is reading a case study or the colophon: the sticker still counts.
  const reading = typeof window !== "undefined" && /^\/(work\/|colophon)/.test(window.location.pathname);
  if (silent || reading) return true;
  sfx.sparkle();
  toast({ title: `Sticker unlocked: ${def.name}`, body: "Open the sticker book to peel it off and stick it anywhere.", tone: "sun", icon: def.emoji });
  return true;
}

/** Increments a counter and unlocks `id` once it reaches `target`. */
export function bump(counter: string, target: number, id: string) {
  hydrateStickers();
  const counters = { ...stickerStore.get().counters };
  counters[counter] = (counters[counter] ?? 0) + 1;
  stickerStore.set({ counters });
  persist();
  if (counters[counter] >= target) unlock(id);
  return counters[counter];
}

/** Records a unique key (e.g. a case study slug) and unlocks once `target` unique keys are seen. */
export function collect(counter: string, key: string, target: number, id: string) {
  hydrateStickers();
  const seenKey = `${counter}:${key}`;
  const counters = { ...stickerStore.get().counters };
  if (!counters[seenKey]) {
    counters[seenKey] = 1;
    counters[counter] = (counters[counter] ?? 0) + 1;
    stickerStore.set({ counters });
    persist();
  }
  if ((counters[counter] ?? 0) >= target) unlock(id);
}

export function placeSticker(route: string, placement: Placement) {
  const placed = { ...stickerStore.get().placed };
  placed[route] = [...(placed[route] ?? []).filter((p) => p.id !== placement.id), placement];
  stickerStore.set({ placed });
  persist();
}

export function removeSticker(route: string, id: string) {
  const placed = { ...stickerStore.get().placed };
  placed[route] = (placed[route] ?? []).filter((p) => p.id !== id);
  stickerStore.set({ placed });
  persist();
}

export function useStickers<S>(selector: (state: StickerState) => S): S {
  return useStore(stickerStore, selector);
}
