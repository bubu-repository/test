"use client";

import { createStore, useStore } from "@/lib/store";
import { ui } from "@/lib/ui";

/**
 * The guided walk ("How this site works"): a few spotlights, one at a time. It only runs when the
 * visitor asks for it, from the help button, the menu, the palette, the agent or the T key.
 */
type TourState = { running: boolean };

export const tourStore = createStore<TourState>({ running: false });

export function useTour<S>(selector: (state: TourState) => S): S {
  return useStore(tourStore, selector);
}

export function startTour() {
  if (tourStore.get().running) return;
  tourStore.set({ running: true });
  ui.set({ touring: true, overlay: null, agentOpen: false });
}

export function stopTour() {
  if (!tourStore.get().running) return;
  tourStore.set({ running: false });
  ui.set({ touring: false });
}
