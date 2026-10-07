"use client";

import { createStore, useStore } from "@/lib/store";

type PaletteState = { query: string; active: number; submitNonce: number };

/** Lives outside the component so the autopilot tour can type into the palette. */
export const paletteStore = createStore<PaletteState>({ query: "", active: 0, submitNonce: 0 });

export function usePalette<S>(selector: (state: PaletteState) => S): S {
  return useStore(paletteStore, selector);
}

/** Runs the active item (what Enter does). */
export function submitPalette() {
  paletteStore.set((s) => ({ submitNonce: s.submitNonce + 1 }));
}
