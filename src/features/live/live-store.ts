"use client";

import { createStore, useStore } from "@/lib/store";

export type Peer = { id: string; name: string; color: string; path: string };
export type Ghost = { id: string; x: number; y: number; t: number };

type LiveState = {
  status: "connecting" | "live" | "local" | "off";
  me: Peer | null;
  peers: Peer[];
  count: number;
  /** Bumped when a guestbook note arrives live. */
  noteNonce: number;
};

export const liveStore = createStore<LiveState>({ status: "connecting", me: null, peers: [], count: 1, noteNonce: 0 });

export function useLive<S>(selector: (state: LiveState) => S): S {
  return useStore(liveStore, selector);
}

/** Sender set by LiveLayer once connected. */
let poster: ((body: Record<string, unknown>) => void) | null = null;

export function setPoster(fn: typeof poster) {
  poster = fn;
}

export function wave() {
  poster?.({ type: "wave", x: 0.5, y: window.scrollY + window.innerHeight / 2 });
}
