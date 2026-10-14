"use client";

import type { SiteAction } from "./actions";
import { createStore, useStore } from "./store";

/** Overlays that take over the screen. Only one at a time. */
/** "glance" is the lab's live-preview window: it is rendered by the lab page itself and listed here so single-key shortcuts stay quiet while it is open. */
export type Overlay = "palette" | "terminal" | "brief" | "stickers" | "shortcuts" | "glance";

/** Who's visiting: reorders the home widgets and changes what's emphasised. */
export type Lens = "recruiter" | "engineer" | "designer" | "curious";

/**
 * A toast: a dot in its tone, or the sticker itself when it announces one, and an optional action.
 * `icon` is accepted for older callers but not drawn.
 */
export type Toast = {
  id: number;
  title: string;
  body?: string;
  tone?: "accent" | "lime" | "sun" | "sky" | "violet" | "mint";
  icon?: string;
  sticker?: string;
  holo?: boolean;
  action?: { label: string; run: SiteAction };
  leaving?: boolean;
};

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
const timers = new Map<number, { left: number; started: number; handle: number }>();

export function toast(input: Omit<Toast, "id">, ms = 4200) {
  const id = ++toastId;
  ui.set((state) => ({ toasts: [...state.toasts.slice(-3), { ...input, id }] }));
  timers.set(id, { left: ms, started: Date.now(), handle: window.setTimeout(() => dismissToast(id), ms) });
  return id;
}

/** Hover or focus holds a toast; leaving lets its remaining time run out. */
export function holdToast(id: number) {
  const t = timers.get(id);
  if (!t || !t.handle) return;
  window.clearTimeout(t.handle);
  timers.set(id, { left: Math.max(1200, t.left - (Date.now() - t.started)), started: Date.now(), handle: 0 });
}

export function releaseToast(id: number) {
  const t = timers.get(id);
  if (!t || t.handle) return;
  timers.set(id, { ...t, started: Date.now(), handle: window.setTimeout(() => dismissToast(id), t.left) });
}

/** Slides the toast out, then removes it. */
export function dismissToast(id: number) {
  const t = timers.get(id);
  if (t?.handle) window.clearTimeout(t.handle);
  timers.delete(id);
  ui.set((state) => ({ toasts: state.toasts.map((x) => (x.id === id ? { ...x, leaving: true } : x)) }));
  window.setTimeout(() => ui.set((state) => ({ toasts: state.toasts.filter((x) => x.id !== id) })), 180);
}
