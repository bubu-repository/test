/* ==========================================================================
   Read marks: which case studies this visitor has opened, and which they
   read to the end. Tiny and framework-free (no game store), so the plain
   /work pages can stamp a case without loading the room. The Wall of Work
   shows the stamps as stickers on the posters and folds "opened" into the
   game's galleryViewed (→ the Curator sticker).
   ========================================================================== */
import { useSyncExternalStore } from 'react';

const KEY = 'adelia.reads.v1';

export interface Reads {
  /** slug → first opened (ms) */
  opened: Record<string, number>;
  /** slug → reached the end (ms) */
  read: Record<string, number>;
}

const EMPTY: Reads = { opened: {}, read: {} };

function load(): Reads {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const v = JSON.parse(raw) as Partial<Reads>;
    return { opened: { ...(v.opened ?? {}) }, read: { ...(v.read ?? {}) } };
  } catch {
    return EMPTY;
  }
}

let state: Reads = typeof window === 'undefined' ? EMPTY : load();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function save(next: Reads) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  emit();
}

if (typeof window !== 'undefined') {
  // another tab (say, /work/tenderlens next to the room) stamped a case
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    state = load();
    emit();
  });
}

export const reads = () => state;

/** Returns true the first time this slug is opened. */
export function markOpened(slug: string): boolean {
  if (state.opened[slug]) return false;
  save({ ...state, opened: { ...state.opened, [slug]: Date.now() } });
  return true;
}

/** Returns true the first time this slug is read to the end. */
export function markRead(slug: string): boolean {
  if (state.read[slug]) return false;
  save({ opened: { [slug]: Date.now(), ...state.opened }, read: { ...state.read, [slug]: Date.now() } });
  return true;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useReads(): Reads {
  return useSyncExternalStore(subscribe, reads, () => EMPTY);
}
