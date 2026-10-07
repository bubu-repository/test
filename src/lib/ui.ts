"use client";

import { createStore, useStore } from "./store";

/** Overlays that take over the screen. Only one at a time. */
export type Overlay = "palette" | "terminal" | "brief" | "stickers" | "shortcuts";

/** Who's visiting: reorders the home widgets and changes what's emphasised. */
export type Lens = "recruiter" | "engineer" | "designer" | "curious";

export type Toast = { id: number; title: string; body?: string; tone?: "magenta" | "lime" | "sun" | "sky" | "violet" | "mint"; icon?: string };

type UIState = {
  overlay: Overlay | null;
  agentOpen: boolean;
  touring: boolean;
  lens: Lens | null;
  xray: boolean;
  rave: boolean;
  liveCursors: boolean;
  jiggle: boolean;
  /** Single-key shortcuts (WCAG 2.1.4: they can be turned off). */
  keys: boolean;
  toasts: Toast[];
};

export const ui = createStore<UIState>({
  overlay: null,
  agentOpen: false,
  touring: false,
  lens: null,
  xray: false,
  rave: false,
  liveCursors: true,
  jiggle: false,
  keys: true,
  toasts: [],
});

export function useUI<S>(selector: (state: UIState) => S): S {
  return useStore(ui, selector);
}

export function openOverlay(overlay: Overlay | null) {
  ui.set({ overlay });
}

let toastId = 0;

export function toast(input: Omit<Toast, "id">, ms = 4200) {
  const id = ++toastId;
  ui.set((state) => ({ toasts: [...state.toasts.slice(-3), { ...input, id }] }));
  window.setTimeout(() => dismissToast(id), ms);
  return id;
}

export function dismissToast(id: number) {
  ui.set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
}
