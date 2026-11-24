import { useSyncExternalStore } from 'react';
import type { TimeOfDay } from '@/lib/time';

/**
 * The whole app state in one tiny store (no library). Components read it with `useApp(selector)`
 * and change it with `set` or the helpers below.
 */

export type ObjectId =
  | 'figure'
  | 'phone'
  | 'frame-p1'
  | 'frame-p2'
  | 'frame-p3'
  | 'desk'
  | 'today'
  | 'window'
  | 'mirror'
  | 'shelf'
  | 'sofa'
  | 'keycap';

/** What is open on top of the bento or the room. Last item is on top. */
export type Overlay =
  | { kind: 'phone'; app?: PhoneApp }
  | { kind: 'run'; id: 'p1' | 'p2' | 'p3' }
  | { kind: 'panel'; id: PanelId }
  | { kind: 'photo' }
  | { kind: 'visit'; tier: 'clear' | 'perfect' };

export type PhoneApp = 'posts' | 'chat' | 'call' | 'work';
export type PanelId = 'about' | 'skills' | 'today' | 'window' | 'mirror' | 'archive' | 'egg' | 'list';

export type Finish = 'clear' | 'frost' | 'smoke';
export type Glass = 'clear' | 'frost' | 'tinted';

export type AppState = {
  screen: 'bento' | 'room';
  /** true while the bento/room transition runs (inputs stay live: it is interruptible) */
  moving: boolean;
  overlays: Overlay[];
  /** objects the visitor has opened (persisted in sessionStorage) */
  found: ObjectId[];
  /** visit tiers already stamped, so each fires once */
  stamped: ('clear' | 'perfect')[];
  time: TimeOfDay;
  /** null = follow Bekasi time; otherwise the visitor picked one */
  timeOverride: TimeOfDay | null;
  finish: Finish;
  glass: Glass;
  showLabels: boolean;
  /** set by journey.ts when the room must mount now (the visitor tapped Enter before idle) */
  wantRoom: boolean;
};

const STORE_KEY = 'adelia.cc/v3';

function load(): Partial<AppState> {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const saved = load();
const initialTime = (document.documentElement.dataset.time as TimeOfDay) || 'morning';

let state: AppState = {
  screen: location.pathname.startsWith('/room') ? 'room' : 'bento',
  moving: false,
  overlays: [],
  found: saved.found ?? [],
  stamped: saved.stamped ?? [],
  time: saved.timeOverride ?? initialTime,
  timeOverride: saved.timeOverride ?? null,
  finish: saved.finish ?? 'clear',
  glass: saved.glass ?? 'frost',
  showLabels: false,
  wantRoom: false,
};

const listeners = new Set<() => void>();

export function get(): AppState {
  return state;
}

export function set(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const next = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...next };
  try {
    const { found, stamped, timeOverride, finish, glass } = state;
    sessionStorage.setItem(STORE_KEY, JSON.stringify({ found, stamped, timeOverride, finish, glass }));
  } catch {
    /* private mode: the visit just isn't remembered */
  }
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useApp<T>(select: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => select(state));
}

/* ---------- helpers --------------------------------------------------------------------------- */

export function openOverlay(o: Overlay) {
  set((s) => ({ overlays: [...s.overlays.filter((x) => x.kind !== o.kind || o.kind === 'panel'), o] }));
}

export function closeTop() {
  set((s) => ({ overlays: s.overlays.slice(0, -1) }));
}

export function closeAll() {
  set({ overlays: [] });
}

export function markFound(id: ObjectId) {
  if (state.found.includes(id)) return;
  set((s) => ({ found: [...s.found, id] }));
}

/** The essentials for CLEAR: the work, the skills and the status (docs/concept.md, Visit run). */
export const ESSENTIALS: ObjectId[] = ['frame-p1', 'frame-p2', 'frame-p3', 'desk', 'today'];
export const ALL_OBJECTS: ObjectId[] = ['figure', 'phone', 'frame-p1', 'frame-p2', 'frame-p3', 'desk', 'today', 'window', 'mirror', 'shelf', 'sofa', 'keycap'];

export function setTime(t: TimeOfDay | null, fallback: TimeOfDay) {
  const time = t ?? fallback;
  document.documentElement.dataset.time = time;
  set({ time, timeOverride: t });
}

export function setGlass(glass: Glass) {
  document.documentElement.dataset.glass = glass;
  set({ glass });
}

export function setFinish(finish: Finish) {
  set({ finish });
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
