/* ==========================================================================
   The 23 achievements as stickers: which artwork each one wears, how far
   along a multi-step one is, and where "Show me" walks you to earn it.
   Copy (names, hints, bodies, hearts) stays in src/state/achievements.ts.
   ========================================================================== */
import type { AchievementId } from '@/state/achievements';
import { ACHIEVEMENTS } from '@/state/achievements';
import type { Stats } from '@/state/game';
import { CHAPTERS, PRODUCTS, WORK } from '@/lib/content';
import { EXPLORABLE, type StationId } from '@/stage/stations';
import { stationFor } from './lib';

/** Achievement → artwork key in STICKER_ART. */
export const ART: Record<AchievementId, string> = {
  'first-step': 'hello',
  'time-keeper': 'speed',
  'weather-watcher': 'clouds',
  'news-hound': 'news',
  'power-user': 'crt',
  hacker: 'shell',
  gamer: 'handheld',
  'high-score': 'trophy',
  beatmaker: 'synth',
  selector: 'dj',
  curator: 'collector',
  collector: 'jar',
  oracle: 'curious',
  rsvp: 'ticket',
  insider: 'passenger',
  explorer: 'lost',
  'night-owl': 'moon',
  connected: 'wave',
  'card-holder': 'rare',
  operator: 'heartphone',
  signed: 'signed',
  maker: 'studio',
  manifesto: 'rules',
  completionist: 'prism',
};

export const artOf = (id: string) => ART[id as AchievementId] ?? 'hello';

/** Collector number in the book: "07/23". */
export const stickerNo = (id: AchievementId) => {
  const i = ACHIEVEMENTS.findIndex((a) => a.id === id);
  return `${String(i + 1).padStart(2, '0')}/${ACHIEVEMENTS.length}`;
};

/** Where each sticker is earned (none for the hunts and the time-of-day one). */
const HOME: Partial<Record<AchievementId, StationId>> = {
  'first-step': 'door',
  'time-keeper': 'clock',
  'weather-watcher': 'window',
  'news-hound': 'news',
  'power-user': 'computer',
  hacker: 'computer',
  gamer: 'console',
  'high-score': 'console',
  beatmaker: 'synth',
  selector: 'record',
  curator: 'gallery',
  collector: 'shelf',
  oracle: 'quiz',
  rsvp: 'printer',
  insider: 'launch',
  connected: 'button',
  'card-holder': 'pass',
  operator: 'phone',
  signed: 'sea',
  maker: 'studio',
};

interface GameView {
  stats: Stats;
  stamps: Partial<Record<StationId, number>>;
  manifesto: Partial<Record<string, number>>;
  achievements: Partial<Record<AchievementId, number>>;
}

/** "Show me": the station (and panel props) that gets you closer to this sticker, or null. */
export function showMe(id: AchievementId, g: GameView): { station: StationId; props?: Record<string, unknown> } | null {
  switch (id) {
    case 'explorer': {
      const next = EXPLORABLE.find((s) => !g.stamps[s.id]);
      return next ? { station: next.id } : null;
    }
    case 'manifesto': {
      const c = CHAPTERS.find((ch) => !g.manifesto[ch.id]);
      const st = c && stationFor(c.id);
      return st ? { station: st.id } : null;
    }
    case 'curator': {
      const w = WORK.find((x) => !g.stats.galleryViewed.includes(x.id));
      return { station: 'gallery', props: w ? { work: w.id } : undefined };
    }
    case 'collector': {
      const p = PRODUCTS.find((x) => !g.stats.productsViewed.includes(x.id));
      return { station: 'shelf', props: p ? { focus: p.id } : undefined };
    }
    case 'first-step':
    case 'night-owl':
    case 'completionist':
      return null;
    default: {
      const st = HOME[id];
      return st ? { station: st } : null;
    }
  }
}

/** Steps done / needed for the stickers that take more than one go (mirrors the checks in game.ts). */
export function progressOf(id: AchievementId, g: GameView): { done: number; target: number } | null {
  switch (id) {
    case 'news-hound':
      return { done: Math.min(3, g.stats.articlesRead.length), target: 3 };
    case 'curator':
      return { done: WORK.filter((w) => g.stats.galleryViewed.includes(w.id)).length, target: WORK.length };
    case 'collector':
      return { done: PRODUCTS.filter((p) => g.stats.productsViewed.includes(p.id)).length, target: PRODUCTS.length };
    case 'explorer':
      return { done: EXPLORABLE.filter((s) => g.stamps[s.id]).length, target: EXPLORABLE.length };
    case 'manifesto':
      return { done: CHAPTERS.filter((c) => g.manifesto[c.id]).length, target: CHAPTERS.length };
    case 'completionist':
      return { done: ACHIEVEMENTS.filter((a) => a.id !== 'completionist' && g.achievements[a.id]).length, target: ACHIEVEMENTS.length - 1 };
    default:
      return null;
  }
}
