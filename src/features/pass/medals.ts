/* ==========================================================================
   Sticker-book medals (ported from the old adelia.cc Medal.tsx and scaled
   from its 16-sticker set to the room's 23): Silver 4 · Jade 7 · Gold 11 ·
   Sapphire 15 · Amethyst 19 · Prism = the whole set (counted from ACHIEVEMENTS, so adding one moves Prism). Pure data, so the game
   store can announce a new medal without importing any UI.
   ========================================================================== */

export interface MedalTier {
  id: 'silver' | 'jade' | 'gold' | 'sapphire' | 'amethyst' | 'prism';
  name: string;
  /** stickers needed; Infinity = the whole set */
  at: number;
  coin: [string, string];
  core: [string, string];
  ribbon?: [string, string];
  glow?: string;
  sparkles?: boolean;
}

/** Plain metal first, then ribbons, then a glow, then sparkles. */
export const MEDALS: MedalTier[] = [
  { id: 'silver', name: 'Silver', at: 4, coin: ['#F4F7FB', '#A7B3C3'], core: ['#CBD3DE', '#8794A7'] },
  { id: 'jade', name: 'Jade', at: 7, coin: ['#BDF5DD', '#2FBF8A'], core: ['#7DE3B9', '#16936A'] },
  { id: 'gold', name: 'Gold', at: 11, coin: ['#FFF1BD', '#F2C230'], core: ['#FFE07A', '#D9A50E'], ribbon: ['#FFF3C9', '#F5D25C'] },
  { id: 'sapphire', name: 'Sapphire', at: 15, coin: ['#C9E6FB', '#5AA9E6'], core: ['#8CC6F2', '#1F5F96'], ribbon: ['#DCEEFC', '#A9D6F5'], glow: '#5AA9E6' },
  { id: 'amethyst', name: 'Amethyst', at: 19, coin: ['#E6DEFA', '#9D86DA'], core: ['#C3B2EE', '#6F57B8'], ribbon: ['#EEE9FA', '#C9BBF0'], glow: '#B3A0EA', sparkles: true },
  { id: 'prism', name: 'Prism', at: Infinity, coin: ['#FFE3F0', '#8FCBF5'], core: ['#FF9DC6', '#C2286F'], ribbon: ['#FFD6E8', '#A9D6F5'], glow: '#FF7EB6', sparkles: true },
];

/** Threshold of a medal for a set of `total` stickers. */
export const medalAt = (m: MedalTier, total: number) => (m.at === Infinity ? total : Math.min(m.at, total - 1));

/** The medal `count` of `total` stickers has earned, or null below the first one. */
export function medalFor(count: number, total: number): MedalTier | null {
  let earned: MedalTier | null = null;
  for (const m of MEDALS) if (count >= medalAt(m, total)) earned = m;
  return earned;
}

/** The next medal and how many more stickers it needs, or null once the set is complete. */
export function nextMedal(count: number, total: number): { medal: MedalTier; need: number } | null {
  const m = MEDALS.find((x) => count < medalAt(x, total));
  return m ? { medal: m, need: medalAt(m, total) - count } : null;
}

/** Where each medal sits along the progress bar, as fractions of the set (Prism is the end). */
export function medalMarks(total: number) {
  return MEDALS.slice(0, -1).map((m) => ({ id: m.id, name: m.name, at: medalAt(m, total) / total, n: medalAt(m, total) }));
}
