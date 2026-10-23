/* ==========================================================================
   The aquarium's data: guestbook notes as creatures, shared by the close-up
   (SeaPanel) and the live tank in the room (TankLive), so a creature you
   release in the panel is swimming in the plate's tank when you close it.
   Talks to the API through getGuestbook()/postGuestbook() in lib/api.ts
   (which fall back to this browser when the API is down).
   ========================================================================== */
import { create } from 'zustand';
import { getGuestbook, postGuestbook, type GuestbookNote } from '@/lib/api';
import { COLOR_LABEL, NOTE_COLORS, SPECIES, SPECIES_LABEL, speciesFor, type NoteColor, type Species } from '@/content/guestbook';
import { EXPRESSIONS, type Expression } from './Creature';

export type Size = 'small' | 'medium' | 'large';
export const SIZES: Size[] = ['small', 'medium', 'large'];
export const SIZE_SCALE: Record<Size, number> = { small: 0.82, medium: 1, large: 1.18 };
export const FACE_LABEL: Record<Expression, string> = { smile: 'Smile', wink: 'Wink', sleepy: 'Sleepy' };
export const SIZE_LABEL: Record<Size, string> = { small: 'Small', medium: 'Medium', large: 'Large' };

/** A guestbook note, read as a creature in the tank. */
export interface SeaNote {
  id: string;
  name: string;
  note: string;
  createdAt: number;
  species: Species;
  color: NoteColor;
  face: Expression;
  size: Size;
  /** an example note from the house (Moci), not a visitor */
  house: boolean;
  seed: number;
}

/** A stable number in [0, 1) from a creature's seed and a salt (all 32 bits mixed, unlike shifting). */
export function rand(seed: number, salt: number): number {
  let h = Math.imul(seed ^ Math.imul(salt + 1, 0x9e3779b9), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Words other clients may store for a creature, mapped onto the tank's own. */
const SHAPE_ALIAS: Record<string, Species> = { jelly: 'jellyfish', puffer: 'pufferfish', blowfish: 'pufferfish', 'little whale': 'whale', horse: 'seahorse' };
const COLOUR_ALIAS: Record<string, NoteColor> = {
  pink: 'magenta',
  blue: 'sky',
  aqua: 'sky',
  baby: 'sky',
  green: 'mint',
  seaglass: 'mint',
  'sea glass': 'mint',
  lilac: 'violet',
  purple: 'violet',
  peach: 'sun',
  orange: 'sun',
  yellow: 'sun',
  pearl: 'lime',
  white: 'lime',
  clear: 'lime',
};

function sizeOf(v: unknown): Size {
  if (typeof v === 'string' && (SIZES as string[]).includes(v)) return v as Size;
  if (typeof v === 'number' && Number.isFinite(v)) return v < 0.92 ? 'small' : v > 1.08 ? 'large' : 'medium';
  return 'medium';
}

/** Any stored note (any client, any age) → a creature that always swims the same way. */
export function toSea(n: GuestbookNote): SeaNote {
  const c = (n.creature ?? {}) as Record<string, unknown>;
  const rawShape = String(c.shape ?? c.species ?? '').toLowerCase();
  const rawColour = String(c.colour ?? c.color ?? '').toLowerCase();
  const species = (SPECIES as string[]).includes(rawShape) ? (rawShape as Species) : SHAPE_ALIAS[rawShape] ?? speciesFor(n.id);
  const color = (NOTE_COLORS as string[]).includes(rawColour) ? (rawColour as NoteColor) : COLOUR_ALIAS[rawColour] ?? 'sky';
  const seed = hash(n.id);
  const face = (EXPRESSIONS as string[]).includes(String(c.face)) ? (c.face as Expression) : EXPRESSIONS[seed % EXPRESSIONS.length];
  return {
    id: n.id,
    name: n.name || 'Anonymous visitor',
    note: n.note,
    createdAt: typeof n.createdAt === 'number' ? n.createdAt : Date.parse(String(n.createdAt)) || 0,
    species,
    color,
    face,
    size: sizeOf(c.size),
    house: !!n.house,
    seed,
  };
}

export function describe(n: Pick<SeaNote, 'color' | 'species'>) {
  return `${COLOR_LABEL[n.color]} ${SPECIES_LABEL[n.species].toLowerCase()}`;
}

export function ago(t: number): string {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} d ago` : new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ---------------------------------------------------------------- mine */
const MINE_KEY = 'adelia.sea.mine';
function readMine(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(MINE_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 10) : [];
  } catch {
    return [];
  }
}
function writeMine(ids: string[]) {
  try {
    localStorage.setItem(MINE_KEY, JSON.stringify(ids));
  } catch {}
}

/* ---------------------------------------------------------------- store */
interface SeaState {
  /** newest first; null until the first load */
  notes: SeaNote[] | null;
  /** ids of the creatures this browser released (so yours is still yours after a reload) */
  mine: string[];
  /** the id of the creature released a moment ago (it drops in from the surface) */
  fresh: string | null;
  loading: boolean;
  load: () => Promise<void>;
  release: (input: { name: string; note: string; species: Species; color: NoteColor; face: Expression; size: Size; sessionId?: string; website?: string }) => Promise<SeaNote>;
}

let inflight: Promise<void> | null = null;

export const useSea = create<SeaState>((set, get) => ({
  notes: null,
  mine: typeof window === 'undefined' ? [] : readMine(),
  fresh: null,
  loading: false,
  load: () => {
    if (inflight) return inflight;
    set({ loading: true });
    inflight = getGuestbook(120)
      .then((list) => {
        const fresh = get().notes?.filter((n) => !list.some((x) => x.id === n.id) && get().mine.includes(n.id)) ?? [];
        // keep a creature you just released even if the list (cached, moderated later) doesn't have it yet
        const next = [...fresh, ...list.map(toSea)].sort((a, b) => b.createdAt - a.createdAt);
        set({ notes: next });
      })
      .catch(() => set({ notes: get().notes ?? [] }))
      .finally(() => {
        inflight = null;
        set({ loading: false });
      });
    return inflight;
  },
  release: async ({ name, note, species, color, face, size, sessionId, website }) => {
    const saved = await postGuestbook({
      name,
      note,
      creature: { shape: species, colour: color, face, size: SIZE_SCALE[size] },
      ...(sessionId ? { sessionId } : {}),
      ...(website ? { website } : {}),
    });
    const sea = toSea(saved);
    const mine = [sea.id, ...get().mine.filter((id) => id !== sea.id)].slice(0, 10);
    writeMine(mine);
    set({ notes: [sea, ...(get().notes ?? []).filter((n) => n.id !== sea.id)], mine, fresh: sea.id });
    return sea;
  },
}));
