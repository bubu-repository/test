/* ==========================================================================
   Today's pack, per visitor (ported from the old adelia.cc pack-store.ts):
   which day it is, whether it's open, which of its three cards are face
   up, and every card collected so far (the binder). A new day (the
   visitor's local midnight) seals a new pack. Persisted locally.
   `?pack=fresh` seals a new one now; `?pack=rare` puts a holo in it.
   ========================================================================== */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PackState {
  /** the visitor's local date, YYYY-MM-DD */
  day: string;
  /** a random number made once per visitor, so two people get different packs on the same day */
  visitor: number;
  opened: boolean;
  /** which of today's three cards are face up, as bits (card 1 = 1, card 2 = 2, card 3 = 4) */
  turned: number;
  collected: number;
  rares: number;
  /** packs opened since the last holo: the third in a row without one always has one */
  sinceHolo: number;
  /** what today's pack turned out to hold, fixed when it was opened */
  holo: boolean;
  first: boolean;
  /** every card turned over, by collector id ("k7", "a3", "w:rain", "p:catat", "h:catat", "s:explorer") */
  seen: string[];

  /** reads the day; a new day (or ?pack=fresh) seals a new pack */
  hydrate: () => void;
  openPack: (holo: boolean, first: boolean) => void;
  /** turns card `i` over (and only that one) and files it in the binder */
  reveal: (i: number, id: string) => void;
}

export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const usePack = create<PackState>()(
  persist(
    (set, get) => ({
      day: '',
      visitor: 0,
      opened: false,
      turned: 0,
      collected: 0,
      rares: 0,
      sinceHolo: 0,
      holo: false,
      first: false,
      seen: [],

      hydrate: () => {
        const s = get();
        const visitor = s.visitor || Math.floor(Math.random() * 2 ** 31);
        const fresh = typeof location !== 'undefined' && new URLSearchParams(location.search).get('pack') === 'fresh';
        const day = today();
        if (s.day === day && !fresh) {
          if (visitor !== s.visitor) set({ visitor });
          return;
        }
        set({ day, visitor, opened: false, turned: 0, holo: false, first: false });
      },

      openPack: (holo, first) => {
        const s = get();
        if (s.opened) return;
        set({ opened: true, holo, first, collected: s.collected + 3, rares: s.rares + (holo ? 1 : 0), sinceHolo: holo ? 0 : s.sinceHolo + 1 });
      },

      reveal: (i, id) => set((s) => ({ turned: s.turned | (1 << i), seen: s.seen.includes(id) ? s.seen : [...s.seen, id] })),
    }),
    {
      name: 'adelia.pack.v1',
      version: 1,
      partialize: ({ day, visitor, opened, turned, collected, rares, sinceHolo, holo, first, seen }) => ({ day, visitor, opened, turned, collected, rares, sinceHolo, holo, first, seen }),
    },
  ),
);

export const isUp = (turned: number, i: number) => (turned & (1 << i)) !== 0;
export const upCount = (turned: number) => [0, 1, 2].filter((i) => isUp(turned, i)).length;

/** Stable per visitor and day. */
export function packSeed(s: Pick<PackState, 'visitor' | 'day'>): number {
  let h = 2166136261 ^ s.visitor;
  for (const ch of s.day) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
