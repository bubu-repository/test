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
  revealed: number;
  collected: number;
  rares: number;
};

const KEY = "adelia:pack";

export const packStore = createStore<PackState>({ hydrated: false, day: "", visitor: 0, opened: false, revealed: 0, collected: 0, rares: 0 });

export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function persist() {
  const { day, visitor, opened, revealed, collected, rares } = packStore.get();
  writeJSON(KEY, { day, visitor, opened, revealed, collected, rares });
}

/** Reads the saved pack; a new day (or `?pack=fresh`) seals a new one. */
export function hydratePack() {
  const saved = readJSON<Partial<PackState>>(KEY, {});
  const visitor = saved.visitor || Math.floor(Math.random() * 2 ** 31);
  const fresh = new URLSearchParams(window.location.search).get("pack") === "fresh";
  const day = today();
  const sameDay = saved.day === day && !fresh;
  packStore.set({
    hydrated: true,
    day,
    visitor,
    opened: sameDay ? !!saved.opened : false,
    revealed: sameDay ? (saved.revealed ?? 0) : 0,
    collected: saved.collected ?? 0,
    rares: saved.rares ?? 0,
  });
  persist();
}

export function openPack(rare: boolean) {
  const s = packStore.get();
  if (s.opened) return;
  packStore.set({ opened: true, collected: s.collected + 3, rares: s.rares + (rare ? 1 : 0) });
  persist();
}

export function reveal(n: number) {
  packStore.set((s) => ({ revealed: Math.max(s.revealed, n) }));
  persist();
}

/** Stable per visitor and day. */
export function packSeed(s: PackState): number {
  let h = 2166136261 ^ s.visitor;
  for (const ch of s.day) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
