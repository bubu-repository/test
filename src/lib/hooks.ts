"use client";

import { useSyncExternalStore } from "react";

/* ---------- A shared one-second clock ---------- */

const clockListeners = new Set<() => void>();
let clockTimer: number | undefined;

function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  if (clockTimer === undefined) {
    clockTimer = window.setInterval(() => {
      for (const l of clockListeners) l();
    }, 1000);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockTimer !== undefined) {
      window.clearInterval(clockTimer);
      clockTimer = undefined;
    }
  };
}

/**
 * Current time in whole seconds (epoch), ticking every second. 0 on the server and during
 * hydration, so prerendered HTML never contains a build-time clock.
 */
export function useNow(): number {
  return useSyncExternalStore(
    subscribeClock,
    () => Math.floor(Date.now() / 1000),
    () => 0,
  );
}

/* ---------- Environment values that never change during a visit ---------- */

const noop = () => () => {};

/** The visitor's IANA time zone, or null on the server. */
export function useVisitorZone(): string | null {
  return useSyncExternalStore(
    noop,
    () => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      } catch {
        return "UTC";
      }
    },
    () => null,
  );
}

function subscribeMedia(query: string) {
  return (listener: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  };
}

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = subscribeMedia(reducedQuery);

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );
}

/* ---------- A localStorage value, kept in sync across tabs ---------- */

const STORAGE_EVENT = "adelia:storage";

function subscribeStorage(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(STORAGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(STORAGE_EVENT, listener);
  };
}

/** Raw string from localStorage (null if missing or blocked). Notify with notifyStorage(). */
export function useStoredString(key: string): string | null {
  return useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
}

export function notifyStorage() {
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

const noopSubscribe = () => () => {};

/** False during prerender and hydration, true afterwards: for values only the browser knows. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
