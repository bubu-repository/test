"use client";

import { createStore, useStore } from "@/lib/store";
import { toast, ui } from "@/lib/ui";

type TourState = {
  running: boolean;
  caption: string;
  step: number;
  total: number;
};

export const tourStore = createStore<TourState>({ running: false, caption: "", step: 0, total: 0 });

export function useTour<S>(selector: (state: TourState) => S): S {
  return useStore(tourStore, selector);
}

export class TourAborted extends Error {
  constructor() {
    super("tour aborted");
  }
}

let controller: AbortController | null = null;
let runner: ((signal: AbortSignal) => Promise<void>) | null = null;

/** The Tour component registers the script runner when it mounts. */
export function registerTourRunner(fn: ((signal: AbortSignal) => Promise<void>) | null) {
  runner = fn;
}

export function startTour() {
  if (tourStore.get().running || !runner) return;
  controller = new AbortController();
  const { signal } = controller;
  tourStore.set({ running: true, caption: "", step: 0 });
  ui.set({ touring: true });

  // Any real input from the visitor takes the wheel back.
  let armedAt = performance.now() + 600;
  const interrupt = (event: Event) => {
    if (performance.now() < armedAt || !event.isTrusted) return;
    if (event instanceof PointerEvent && event.type === "pointermove" && Math.hypot(event.movementX, event.movementY) < 4) return;
    if (event instanceof KeyboardEvent && ["Shift", "Control", "Alt", "Meta"].includes(event.key)) return;
    stopTour("You have the wheel. Thanks for riding along!");
  };
  const events = ["pointermove", "pointerdown", "wheel", "keydown", "touchstart"] as const;
  for (const name of events) window.addEventListener(name, interrupt, { capture: true, passive: true });
  signal.addEventListener("abort", () => {
    for (const name of events) window.removeEventListener(name, interrupt, { capture: true });
  });

  void runner(signal)
    .catch((error) => {
      if (!(error instanceof TourAborted)) console.error(error);
    })
    .finally(() => {
      armedAt = Infinity;
      if (controller?.signal === signal) controller = null;
      tourStore.set({ running: false, caption: "" });
      ui.set({ touring: false });
    });
}

export function stopTour(message?: string) {
  if (!controller) return;
  controller.abort();
  controller = null;
  if (message) toast({ title: message, tone: "magenta", icon: "🫧" });
}
