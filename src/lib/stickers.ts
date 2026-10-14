"use client";

import type { SiteAction } from "./actions";
import { sfx } from "./sound";
import { readJSON, writeJSON } from "./storage";
import { createStore, useStore } from "./store";
import { toast, ui } from "./ui";

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
  /** A multi-step sticker: which counter it watches and how far it has to go. */
  progress?: { counter: string; target: number };
  /** Where "Show me" takes you to earn it. None for the ones that are a hunt. */
  go?: SiteAction;
};

/** In the order the book shows them: what a recruiter came for first, the hunts last. */
export const STICKERS: StickerDef[] = [
  { id: "hello", name: "First hello", hint: "Visit the home page.", emoji: "👋", go: { type: "navigate", href: "/" } },
  { id: "collector", name: "Card collector", hint: "Read all four case studies.", emoji: "🃏", progress: { counter: "cases", target: 4 }, go: { type: "navigate", href: "/work" } },
  { id: "speed", name: "Speed reader", hint: "Finish the 40-second brief.", emoji: "⏱️", go: { type: "open", panel: "brief" } },
  { id: "curious", name: "Curious mind", hint: "Ask Moci a question.", emoji: "💬", go: { type: "open", panel: "agent" } },
  { id: "passenger", name: "Passenger", hint: "Take the guided tour to the end (the ? button).", emoji: "🛸", go: { type: "tour" } },
  { id: "signed", name: "Signed", hint: "Release a creature in the guestbook.", emoji: "✍️", go: { type: "navigate", href: "/guestbook" } },
  { id: "pack", name: "Pack opener", hint: "Tear open today's pack in the Lab.", emoji: "🎴", go: { type: "navigate", href: "/lab#pack" } },
  { id: "rare", name: "Holo rare", hint: "Pull a holo rare from a daily pack. One is guaranteed by your third.", emoji: "🌈", go: { type: "navigate", href: "/lab#pack" } },
  { id: "studio", name: "Maker", hint: "Make something in the Studio and save it.", emoji: "✂️", go: { type: "navigate", href: "/lab#studio" } },
  { id: "shell", name: "Shell native", hint: "Run five commands in the terminal.", emoji: "⌨️", progress: { counter: "terminal", target: 5 }, go: { type: "open", panel: "terminal" } },
  { id: "sampler", name: "Temperature check", hint: "Click the words in the home page's headline to swap them. Five swaps.", emoji: "🎲", progress: { counter: "resamples", target: 5 }, go: { type: "navigate", href: "/" } },
  { id: "dj", name: "Desk DJ", hint: "Play a song on the DAC on her desk.", emoji: "🎧", go: { type: "navigate", href: "/about" } },
  { id: "clouds", name: "Cloud parter", hint: "Brush the clouds aside on her phone in the Lab.", emoji: "☁️", go: { type: "navigate", href: "/lab#widgets" } },
  { id: "lost", name: "Lost & found", hint: "Find a page that doesn't exist.", emoji: "🧭" },
  { id: "wave", name: "Hello neighbour", hint: "Wave at another visitor: More, then Wave, when someone else is here.", emoji: "🌊" },
  { id: "konami", name: "Cheat code", hint: "A classic code, entered anywhere.", emoji: "🎮", secret: true },
];

export type Placement = { id: string; x: number; y: number; r: number };

type StickerState = {
  unlocked: string[];
  counters: Record<string, number>;
  /** route → placed stickers (x, y are page coordinates in px, x relative to viewport width %). */
  placed: Record<string, Placement[]>;
  /** Unlocked while the visitor was reading or had a panel open: announced once they're done. */
  pending: string[];
  /** Unlocked since the book was last opened: marked "New" there. */
  fresh: string[];
  hydrated: boolean;
};

const KEY = "adelia:stickers";

export const stickerStore = createStore<StickerState>({ unlocked: [], counters: {}, placed: {}, pending: [], fresh: [], hydrated: false });

export function hydrateStickers() {
  if (stickerStore.get().hydrated) return;
  const saved = readJSON<Partial<StickerState>>(KEY, {});
  stickerStore.set({
    unlocked: Array.isArray(saved.unlocked) ? saved.unlocked : [],
    counters: saved.counters ?? {},
    placed: saved.placed ?? {},
    pending: Array.isArray(saved.pending) ? saved.pending : [],
    fresh: Array.isArray(saved.fresh) ? saved.fresh : [],
    hydrated: true,
  });
}

function persist() {
  const { unlocked, counters, placed, pending, fresh } = stickerStore.get();
  writeJSON(KEY, { unlocked, counters, placed, pending, fresh });
}

export function unlock(id: string, { silent = false }: { silent?: boolean } = {}) {
  hydrateStickers();
  const state = stickerStore.get();
  if (state.unlocked.includes(id)) return false;
  const def = STICKERS.find((s) => s.id === id);
  if (!def) return false;
  stickerStore.set({ unlocked: [...state.unlocked, id], fresh: [...state.fresh, id] });
  persist();
  if (silent) return true;
  // No confetti while someone is reading a case study or has a panel open: it waits until they're done.
  if (quietTime()) {
    stickerStore.set({ pending: [...stickerStore.get().pending, id] });
    persist();
    return true;
  }
  announce([id]);
  return true;
}

const MODAL = new Set(["brief", "stickers", "terminal", "palette", "shortcuts"]);

function quietTime() {
  if (typeof window === "undefined") return true;
  return /^\/(work\/|colophon)/.test(window.location.pathname) || MODAL.has(ui.get().overlay ?? "");
}

/** The toast for one or more new stickers: the sticker itself, its number in the set, and a way to see it. */
function announce(ids: string[]) {
  const defs = ids.map((id) => STICKERS.find((s) => s.id === id)).filter((d): d is StickerDef => !!d);
  if (!defs.length) return;
  sfx.sparkle();
  const n = stickerStore.get().unlocked.length;
  const see = { label: "See it in the book", run: { type: "open" as const, panel: "stickers" as const } };
  if (defs.length === 1) {
    toast({ title: `Sticker ${n} of ${STICKERS.length}: ${defs[0].name}`, body: "Peel it off in the sticker book and stick it anywhere.", tone: "sun", sticker: defs[0].id, action: see }, 6000);
  } else {
    toast({ title: `While you were reading: ${defs.length} stickers`, body: defs.map((d) => d.name).join(", "), tone: "sun", sticker: defs[0].id, action: see }, 6000);
  }
}

/** Announces stickers held back while reading, once the visitor is somewhere quieter. */
export function flushStickers() {
  const { pending } = stickerStore.get();
  if (!pending.length || quietTime()) return;
  stickerStore.set({ pending: [] });
  persist();
  announce(pending);
}

/** Increments a counter and unlocks `id` once it reaches `target`. */
export function bump(counter: string, target: number, id: string, options?: { silent?: boolean }) {
  hydrateStickers();
  const counters = { ...stickerStore.get().counters };
  counters[counter] = (counters[counter] ?? 0) + 1;
  stickerStore.set({ counters });
  persist();
  if (counters[counter] >= target) unlock(id, options);
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

/** The book has been looked at: nothing is new any more. */
export function clearFresh() {
  if (!stickerStore.get().fresh.length) return;
  stickerStore.set({ fresh: [] });
  persist();
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
