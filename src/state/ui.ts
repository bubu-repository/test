import { create } from 'zustand';
import type { PanelId, StationId } from '@/stage/stations';
import { STATIONS, VIEWPOINTS } from '@/stage/stations';
import { FOCUS } from '@/stage/plate';
import { sideFor } from '@/stage/frame';

/** Every panel lives at an object in the room; opening it walks the camera there first. */
const HOME = Object.fromEntries(Object.values(STATIONS).flatMap((st) => (st.panel ? [[st.panel, st.id]] : []))) as Partial<Record<PanelId, StationId>>;

export type Phase = 'loading' | 'gate' | 'outside' | 'entering' | 'room';
export type Quality = 'high' | 'low';

interface FoundMoment {
  station: StationId;
  /** manifesto chapter written by this find, if any */
  line?: string;
}

interface UIState {
  phase: Phase;
  setPhase: (p: Phase) => void;

  /** asset/scene loading progress 0..1 (Loader) */
  progress: number;
  setProgress: (p: number) => void;

  /** current chapter viewpoint index into VIEWPOINTS (when not focused) */
  view: number;
  setView: (i: number) => void;
  nextView: () => void;
  prevView: () => void;

  /** close-up on a station */
  focus: StationId | null;
  focusStation: (id: StationId) => void;
  /** sheets open on the side away from the focused object */
  sheetSide: 'left' | 'right';
  /** props a clicked part wants passed to its station panel on arrival */
  pendingProps: Record<string, unknown>;
  setPendingProps: (p: Record<string, unknown>) => void;
  /** panel to open when the camera arrives (opened from elsewhere in the room) */
  pendingPanel: PanelId | null;
  clearFocus: () => void;

  /** overlay panel (usually opened after the camera arrives at focus) */
  panel: PanelId | null;
  panelProps: Record<string, unknown>;
  openPanel: (id: PanelId, props?: Record<string, unknown>) => void;
  closePanel: () => void;

  /** "YOU FOUND THE …" moment */
  found: FoundMoment | null;
  showFound: (f: FoundMoment) => void;
  dismissFound: () => void;

  hovered: StationId | null;
  setHovered: (id: StationId | null) => void;

  /** camera is mid-flight; HUD can dim controls */
  cameraBusy: boolean;
  setCameraBusy: (b: boolean) => void;

  quality: Quality;
  setQuality: (q: Quality) => void;
  muted: boolean;
  setMuted: (m: boolean) => void;
  menuOpen: boolean;
  setMenuOpen: (o: boolean) => void;

  /** lightweight shared flags for 3D ⇄ UI (e.g. computerOn, printing, doorOpen) */
  flags: Record<string, unknown>;
  setFlag: (k: string, v: unknown) => void;
}

const storedQuality = (() => {
  try {
    const q = localStorage.getItem('adelia.quality') ?? localStorage.getItem('bubu.quality');
    if (q === 'high' || q === 'low') return q;
  } catch {}
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  return coarse ? 'low' : 'high';
})() as Quality;

const storedMuted = (() => {
  try {
    return (localStorage.getItem('adelia.muted') ?? localStorage.getItem('bubu.muted')) === '1';
  } catch {
    return false;
  }
})();

export const useUI = create<UIState>((set, get) => ({
  phase: 'loading',
  setPhase: (phase) => set({ phase }),

  progress: 0,
  setProgress: (progress) => set({ progress }),

  view: 0,
  setView: (i) => {
    const n = VIEWPOINTS.length;
    const view = ((i % n) + n) % n;
    set({ view, focus: null, panel: null, pendingPanel: null });
  },
  nextView: () => get().setView(get().view + 1),
  prevView: () => get().setView(get().view - 1),

  focus: null,
  focusStation: (id) => {
    if (get().focus === id) return;
    set({ focus: id, panel: null, pendingPanel: null, hovered: null, sheetSide: sideFor(id) });
  },
  sheetSide: 'right',
  pendingProps: {},
  setPendingProps: (pendingProps) => set({ pendingProps }),
  pendingPanel: null,
  clearFocus: () => set({ focus: null, panel: null, panelProps: {}, pendingPanel: null }),

  panel: null,
  panelProps: {},
  openPanel: (panel, panelProps = {}) => {
    const { phase, focus } = get();
    // the House Rules are read wherever you are; from the HUD they live on the Guest Pass
    // a panel shared by two objects (the binder and the board both open the sticker book) stays at the one you clicked
    const home = focus && STATIONS[focus].panel === panel ? focus : (HOME[panel] ?? (panel === 'manifesto' && !focus ? 'pass' : undefined));
    if (phase === 'room' && home && home !== focus && FOCUS[home]) {
      set({ focus: home, panel: null, panelProps: {}, pendingPanel: panel, pendingProps: panelProps, hovered: null, sheetSide: sideFor(home) });
      return;
    }
    set({ panel, panelProps, pendingPanel: null });
  },
  closePanel: () => {
    // Closing a panel that belongs to the focused station also releases focus.
    const { focus, panel } = get();
    if (focus && STATIONS[focus].panel === panel) set({ panel: null, focus: null, panelProps: {} });
    else set({ panel: null, panelProps: {} });
  },

  found: null,
  showFound: (found) => set({ found }),
  dismissFound: () => set({ found: null }),

  hovered: null,
  setHovered: (hovered) => set({ hovered }),

  cameraBusy: false,
  setCameraBusy: (cameraBusy) => set({ cameraBusy }),

  quality: storedQuality,
  setQuality: (quality) => {
    try {
      localStorage.setItem('adelia.quality', quality);
    } catch {}
    set({ quality });
  },
  muted: storedMuted,
  setMuted: (muted) => {
    try {
      localStorage.setItem('adelia.muted', muted ? '1' : '0');
    } catch {}
    set({ muted });
  },
  menuOpen: false,
  setMenuOpen: (menuOpen) => set({ menuOpen }),

  flags: {},
  setFlag: (k, v) => set((s) => ({ flags: { ...s.flags, [k]: v } })),
}));
