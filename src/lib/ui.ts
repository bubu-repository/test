"use client";

import { createStore, useStore } from "./store";

/** Overlays that take over the screen. Only one at a time. */
/** "glance" is the lab's live-preview window: it is rendered by the lab page itself and listed here so single-key shortcuts stay quiet while it is open. */
export type Overlay = "palette" | "terminal" | "brief" | "stickers" | "shortcuts" | "glance";

/** Who's visiting: reorders the home widgets and changes what's emphasised. */
export type Lens = "recruiter" | "engineer" | "designer" | "curious";

/** `icon` is accepted for older callers but no longer drawn: the toast shows a dot in its tone instead. */
export type Toast = { id: number; title: string; body?: string; tone?: "magenta" | "lime" | "sun" | "sky" | "violet" | "mint"; icon?: string };

type UIState = {
  overlay: Overlay | null;
  agentOpen: boolean;
  touring: boolean;
  lens: Lens | null;
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
