/* ==========================================================================
   Adelia OS — window manager (tiny zustand store, local to the computer).
   One window per app; focus raises z; compact screens open apps maximised.
   ========================================================================== */
import { create } from 'zustand';
import { sfx } from '@/audio/engine';
import { calmMotion, hasOnce } from './util';

export type AppId = 'about' | 'archive' | 'cases' | 'terminal' | 'mail' | 'links' | 'settings' | 'trash' | 'sysinfo';

/** default geometry per app (desktop) */
export const SIZES: Record<AppId, [number, number]> = {
  about: [620, 560],
  archive: [680, 460],
  cases: [820, 540],
  terminal: [660, 430],
  mail: [560, 540],
  links: [760, 500],
  settings: [520, 560],
  trash: [460, 340],
  sysinfo: [380, 420],
};

/** Older ids other panels may still pass (openPanel('computer', { app })). */
const ALIASES: Record<string, AppId> = { work: 'cases', ecosystem: 'links', 'model-card': 'about' };
export function appId(id?: string | null): AppId | null {
  if (!id) return null;
  if (id in SIZES) return id as AppId;
  return ALIASES[id] ?? null;
}

export interface Win {
  id: AppId;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  min: boolean;
  max: boolean;
  closing: boolean;
  /** bumps every time the app is (re)opened with props — apps can react */
  nonce: number;
  props: Record<string, unknown>;
}

export const COMPACT_W = 640;

interface OSState {
  wins: Win[];
  focused: AppId | null;
  z: number;
  area: { w: number; h: number };
  compact: boolean;
  menu: string | null;
  trashFull: boolean;
  /** less motion: the system asked for it, or the visitor switched it on in Settings */
  calm: boolean;
  setCalm: (c: boolean) => void;
  setTrashFull: (f: boolean) => void;
  open: (id: AppId, props?: Record<string, unknown>) => void;
  close: (id: AppId) => void;
  minimize: (id: AppId) => void;
  focus: (id: AppId) => void;
  toggleMax: (id: AppId) => void;
  move: (id: AppId, x: number, y: number) => void;
  resize: (id: AppId, w: number, h: number) => void;
  setArea: (w: number, h: number) => void;
  setMenu: (m: string | null) => void;
  reset: () => void;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const useOS = create<OSState>((set, get) => ({
  wins: [],
  focused: null,
  z: 10,
  area: { w: 1000, h: 600 },
  compact: false,
  menu: null,
  trashFull: true,
  calm: false,
  setCalm: (calm) => set({ calm }),
  setTrashFull: (trashFull) => set({ trashFull }),

  open: (id, props = {}) => {
    const s = get();
    const existing = s.wins.find((w) => w.id === id);
    const z = s.z + 1;
    if (existing && !existing.closing) {
      if (existing.min) sfx('pop', { pitch: 4 });
      set({
        z,
        focused: id,
        menu: null,
        wins: s.wins.map((w) => (w.id === id ? { ...w, min: false, z, props: Object.keys(props).length ? props : w.props, nonce: w.nonce + 1 } : w)),
      });
      return;
    }
    const [dw, dh] = SIZES[id];
    const { w: aw, h: ah } = s.area;
    const w = Math.min(dw, aw - 16);
    const h = Math.min(dh, ah - 16);
    const n = s.wins.filter((x) => !x.closing).length % 6;
    // cascade from the left; desktop icons live on the right
    const x = clamp(Math.round(aw * 0.05) + n * 30, 8, Math.max(8, aw - w - 8));
    const y = clamp(14 + n * 26, 8, Math.max(8, ah - h - 8));
    sfx('open');
    set({
      z,
      focused: id,
      menu: null,
      wins: [...s.wins.filter((x) => x.id !== id), { id, x, y, w, h, z, min: false, max: false, closing: false, nonce: 1, props }],
    });
  },

  close: (id) => {
    const s = get();
    if (!s.wins.find((w) => w.id === id && !w.closing)) return;
    sfx('close');
    set({ wins: s.wins.map((w) => (w.id === id ? { ...w, closing: true } : w)) });
    setTimeout(
      () => {
        const st = get();
        const rest = st.wins.filter((w) => w.id !== id);
        const top = [...rest].filter((w) => !w.min && !w.closing).sort((a, b) => b.z - a.z)[0];
        set({ wins: rest, focused: st.focused === id ? (top?.id ?? null) : st.focused });
      },
      s.calm ? 0 : 170,
    );
  },

  minimize: (id) => {
    const s = get();
    sfx('whoosh', { gain: 0.5 });
    const rest = s.wins.filter((w) => w.id !== id && !w.min && !w.closing).sort((a, b) => b.z - a.z);
    set({ wins: s.wins.map((w) => (w.id === id ? { ...w, min: true } : w)), focused: rest[0]?.id ?? null });
  },

  focus: (id) => {
    const s = get();
    if (s.focused === id && s.wins.find((w) => w.id === id)?.z === s.z) return;
    const z = s.z + 1;
    set({ z, focused: id, wins: s.wins.map((w) => (w.id === id ? { ...w, z } : w)) });
  },

  toggleMax: (id) => {
    sfx('switch', { gain: 0.6 });
    set({ wins: get().wins.map((w) => (w.id === id ? { ...w, max: !w.max } : w)) });
  },

  move: (id, x, y) => {
    const { area } = get();
    set({
      wins: get().wins.map((w) => (w.id === id ? { ...w, x: clamp(x, -w.w + 90, area.w - 90), y: clamp(y, 0, area.h - 32) } : w)),
    });
  },

  resize: (id, w, h) => {
    const { area } = get();
    set({
      wins: get().wins.map((win) => (win.id === id ? { ...win, w: clamp(w, 300, area.w - win.x), h: clamp(h, 200, area.h - win.y) } : win)),
    });
  },

  setArea: (w, h) => {
    const compact = w < COMPACT_W;
    // keep windows reachable when the screen shrinks
    set({
      area: { w, h },
      compact,
      wins: get().wins.map((win) => {
        const ww = Math.min(win.w, w - 16);
        const hh = Math.min(win.h, h - 16);
        return { ...win, w: ww, h: hh, x: clamp(win.x, 8, Math.max(8, w - ww - 8)), y: clamp(win.y, 8, Math.max(8, h - hh - 8)) };
      }),
    });
  },

  setMenu: (menu) => set({ menu }),

  reset: () => set({ wins: [], focused: null, z: 10, menu: null, trashFull: !hasOnce('trash-emptied'), calm: calmMotion() }),
}));

export const os = () => useOS.getState();
