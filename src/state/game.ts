/* ==========================================================================
   Game state — hearts (♥, the points), stickers (achievements), station
   stamps, the House Rules (5 collectible lines) and per-feature stats.
   Persisted locally and mirrored to the API (profiles) so the admin
   dashboard can see it. Sticker-book medals are announced from here.
   ========================================================================== */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChapterId } from '@/lib/content';
import { CHAPTERS, PRODUCTS, WORK } from '@/lib/content';
import type { StationId } from '@/stage/stations';
import { EXPLORABLE, STATIONS } from '@/stage/stations';
import { ACHIEVEMENTS, ACHIEVEMENT_MAP, type AchievementId, tierFor } from './achievements';
import { toast } from './toasts';
import { sfx } from '@/audio/engine';
import { track, syncProfile } from '@/lib/api';
import { medalFor } from '@/features/pass/medals';

export interface Stats {
  articlesRead: string[];
  productsViewed: string[];
  galleryViewed: string[];
  notesPlayed: number;
  patternsMade: number;
  gamesPlayed: number;
  bestScores: Record<string, number>;
  quizResult?: string;
  rsvp?: string; // event id
  waitlist?: boolean;
  tracksPlayed: string[];
  redeemed: string[];
  terminalCommands: number;
  dialed: string[];
  /** today's pack (features/pack) */
  packsOpened: number;
  holoPulls: number;
}

export interface LedgerEntry {
  t: number;
  label: string;
  pts: number;
}

interface GameState {
  sessionId: string;
  name: string;
  email: string;
  createdAt: number;
  points: number;
  achievements: Partial<Record<AchievementId, number>>;
  stamps: Partial<Record<StationId, number>>;
  manifesto: Partial<Record<ChapterId, number>>;
  stats: Stats;
  ledger: LedgerEntry[];
  /** stickers unlocked after this were not seen in the sticker book yet ("New") */
  bookSeenAt: number;
  /** stickers unlocked after this have not landed on the gingham board yet */
  boardSeenAt: number;

  addPoints: (pts: number, label: string, quiet?: boolean) => void;
  unlock: (id: AchievementId) => boolean;
  has: (id: AchievementId) => boolean;
  /** first visit to a station → stamp + points (+ manifesto line). returns true if new */
  stamp: (id: StationId) => boolean;
  writeLine: (chapter: ChapterId) => boolean;
  /** update stats; achievement checks run afterwards */
  updateStats: (fn: (s: Stats) => Partial<Stats>) => void;
  setProfile: (p: { name?: string; email?: string }) => void;
  /** the sticker book was opened: nothing is new any more */
  markBookSeen: () => void;
  /** stickers up to time `t` have landed on the board */
  markBoardSeen: (t: number) => void;
  reset: () => void;
}

const uid = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 18);

const freshStats = (): Stats => ({
  articlesRead: [],
  productsViewed: [],
  galleryViewed: [],
  notesPlayed: 0,
  patternsMade: 0,
  gamesPlayed: 0,
  bestScores: {},
  tracksPlayed: [],
  redeemed: [],
  terminalCommands: 0,
  dialed: [],
  packsOpened: 0,
  holoPulls: 0,
});

const fresh = () => ({
  sessionId: uid(),
  name: '',
  email: '',
  createdAt: Date.now(),
  points: 0,
  achievements: {},
  stamps: {},
  manifesto: {},
  stats: freshStats(),
  ledger: [] as LedgerEntry[],
  bookSeenAt: 0,
  boardSeenAt: 0,
});

/* The store used to be saved as 'bubu.game.v1': carry a visitor's progress over once. */
const STORE_KEY = 'adelia.game.v1';
try {
  const old = localStorage.getItem('bubu.game.v1');
  if (old && !localStorage.getItem(STORE_KEY)) localStorage.setItem(STORE_KEY, old);
  if (old) localStorage.removeItem('bubu.game.v1');
} catch {}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...fresh(),

      addPoints: (pts, label, quiet = false) => {
        if (!pts) return;
        const before = tierFor(get().points);
        const points = get().points + pts;
        set({ points, ledger: [{ t: Date.now(), label, pts }, ...get().ledger].slice(0, 80) });
        if (!quiet) toast({ kind: 'points', title: `+${pts}`, body: label, points: pts });
        const after = tierFor(points);
        if (after.id !== before.id) {
          setTimeout(() => {
            sfx('tier');
            toast({ kind: 'tier', title: `New tier · ${after.name}`, body: after.perk });
          }, 900);
          track('tier', { tier: after.id, points });
        }
        syncProfile();
      },

      unlock: (id) => {
        if (get().achievements[id]) return false;
        const a = ACHIEVEMENT_MAP[id];
        if (!a) return false;
        const total = ACHIEVEMENTS.length;
        const medalBefore = medalFor(Object.keys(get().achievements).length, total);
        set({ achievements: { ...get().achievements, [id]: Date.now() } });
        sfx('achievement');
        toast({ kind: 'achievement', title: a.name, body: a.body, points: a.points, glyph: a.glyph });
        get().addPoints(a.points, `Sticker · ${a.name}`, true);
        track('achievement', { id });
        const count = Object.keys(get().achievements).length;
        const medal = medalFor(count, total);
        if (medal && medal.id !== medalBefore?.id) {
          setTimeout(() => {
            sfx('tier');
            toast({ kind: 'tier', title: `${medal.name} medal`, body: `${count} of ${total} stickers in your book.` });
          }, 1600);
          track('medal', { medal: medal.id, count });
        }
        // meta-achievement
        const others = ACHIEVEMENTS.filter((x) => x.id !== 'completionist');
        if (others.every((x) => get().achievements[x.id])) setTimeout(() => get().unlock('completionist'), 1200);
        return true;
      },

      has: (id) => !!get().achievements[id],

      stamp: (id) => {
        if (get().stamps[id]) return false;
        set({ stamps: { ...get().stamps, [id]: Date.now() } });
        const st = STATIONS[id];
        get().addPoints(st.points, `Found ${st.name.replace(/^The /, 'the ')}`);
        track('stamp', { station: id });
        if (EXPLORABLE.every((s) => get().stamps[s.id])) setTimeout(() => get().unlock('explorer'), 1500);
        return true;
      },

      writeLine: (chapter) => {
        if (get().manifesto[chapter]) return false;
        set({ manifesto: { ...get().manifesto, [chapter]: Date.now() } });
        track('manifesto', { chapter });
        if (CHAPTERS.every((c) => get().manifesto[c.id])) setTimeout(() => get().unlock('manifesto'), 2200);
        return true;
      },

      updateStats: (fn) => {
        const stats = { ...get().stats, ...fn(get().stats) };
        set({ stats });
        // derived achievements
        const g = get();
        if (stats.articlesRead.length >= 3) g.unlock('news-hound');
        if (WORK.every((w) => stats.galleryViewed.includes(w.id))) g.unlock('curator');
        if (PRODUCTS.every((p) => stats.productsViewed.includes(p.id))) g.unlock('collector');
        if (stats.gamesPlayed >= 1) g.unlock('gamer');
        if (stats.patternsMade >= 1) g.unlock('beatmaker');
        if (stats.quizResult) g.unlock('oracle');
        if (stats.rsvp) g.unlock('rsvp');
        if (stats.waitlist) g.unlock('insider');
        syncProfile();
      },

      setProfile: (p) => {
        set({ name: p.name ?? get().name, email: p.email ?? get().email });
        syncProfile();
      },

      markBookSeen: () => set({ bookSeenAt: Date.now() }),
      markBoardSeen: (t) => {
        if (t > get().boardSeenAt) set({ boardSeenAt: t });
      },

      reset: () => set(fresh()),
    }),
    {
      name: STORE_KEY,
      version: 1,
      merge: (persisted, current) => {
        const p = (persisted || {}) as Partial<GameState>;
        return { ...current, ...p, stats: { ...freshStats(), ...(p.stats || {}) } };
      },
    },
  ),
);

export const game = () => useGame.getState();
