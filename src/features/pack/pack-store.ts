"use client";

import { readJSON, writeJSON } from "@/lib/storage";
import { createStore } from "@/lib/store";

/**
 * Today's pack for this visitor, kept in localStorage: which day it is, whether it's open, how many
 * of its cards are turned over, and what they've collected so far. A new day brings a new pack.
 */

export type PackState = {
  hydrated: boolean;
  /** The visitor's local date, YYYY-MM-DD. */
  day: string;
  /** A random number made once per visitor, so two people get different packs on the same day. */
  visitor: number;
  opened: boolean;
  /** Which of today's three cards are face up, as bits (card 1 = 1, card 2 = 2, card 3 = 4). */
  turned: number;
  collected: number;
  rares: number;
  /** Packs opened since the last holo: the third one in a row is always holo. */
  sinceHolo: number;
  /** What today's pack turned out to hold, fixed when it was opened. */
  holo: boolean;
  first: boolean;
  /** Every card this visitor has turned over, by collector id ("k7", "a3", "w:rain", "p:catat", "h:catat"). */
  seen: string[];
};

const KEY = "adelia:pack";

export const packStore = createStore<PackState>({ hydrated: false, day: "", visitor: 0, opened: false, turned: 0, collected: 0, rares: 0, sinceHolo: 0, holo: false, first: false, seen: [] });

export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function persist() {
  const { day, visitor, opened, turned, collected, rares, sinceHolo, holo, first, seen } = packStore.get();
  writeJSON(KEY, { day, visitor, opened, turned, collected, rares, sinceHolo, holo, first, seen });
}

/** Reads the saved pack; a new day (or `?pack=fresh`) seals a new one. */
export function hydratePack() {
  const saved = readJSON<Partial<PackState> & { revealed?: number }>(KEY, {});
  const visitor = saved.visitor || Math.floor(Math.random() * 2 ** 31);
  const fresh = new URLSearchParams(window.location.search).get("pack") === "fresh";
  const day = today();
  const sameDay = saved.day === day && !fresh;
  packStore.set({
    hydrated: true,
    day,
    visitor,
    opened: sameDay ? !!saved.opened : false,
    // Older saves counted cards turned; read that as the first n cards.
    turned: sameDay ? (saved.turned ?? (saved.revealed ? (1 << saved.revealed) - 1 : 0)) : 0,
    collected: saved.collected ?? 0,
    rares: saved.rares ?? 0,
    sinceHolo: saved.sinceHolo ?? 0,
    holo: sameDay ? !!saved.holo : false,
    first: sameDay ? !!saved.first : false,
    seen: Array.isArray(saved.seen) ? saved.seen : [],
  });
  persist();
}

export function openPack(holo: boolean, first: boolean) {
  const s = packStore.get();
  if (s.opened) return;
  packStore.set({ opened: true, holo, first, collected: s.collected + 3, rares: s.rares + (holo ? 1 : 0), sinceHolo: holo ? 0 : s.sinceHolo + 1 });
  persist();
}

/** Turns card `i` over (and only that one) and files it in the binder. */
export function reveal(i: number, id: string) {
  packStore.set((s) => ({ turned: s.turned | (1 << i), seen: s.seen.includes(id) ? s.seen : [...s.seen, id] }));
  persist();
}

export const isUp = (turned: number, i: number) => (turned & (1 << i)) !== 0;
export const upCount = (turned: number) => [0, 1, 2].filter((i) => isUp(turned, i)).length;

/** Stable per visitor and day. */
export function packSeed(s: PackState): number {
  let h = 2166136261 ^ s.visitor;
  for (const ch of s.day) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
