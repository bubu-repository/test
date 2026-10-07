"use client";

import { createStore, useStore } from "@/lib/store";

/** The headline temperature (the resampled sentence reads it). */
export const heroStore = createStore({ temperature: 0.7 });

export function useHero<S>(selector: (s: ReturnType<typeof heroStore.get>) => S): S {
  return useStore(heroStore, selector);
}
