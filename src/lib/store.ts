"use client";

import { useSyncExternalStore } from "react";

/**
 * A minimal external store. Selectors must return primitives or stable references,
 * because useSyncExternalStore compares snapshots with Object.is.
 */
export type Store<T> = {
  get: () => T;
  initial: T;
  set: (patch: Partial<T> | ((state: T) => Partial<T>)) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    initial,
    get: () => state,
    set(patch) {
      const next = typeof patch === "function" ? patch(state) : patch;
      let changed = false;
      for (const key in next) {
        if (!Object.is(state[key], next[key])) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = { ...state, ...next };
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function useStore<T extends object, S>(store: Store<T>, selector: (state: T) => S): S {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.get()),
    () => selector(store.initial),
  );
}
