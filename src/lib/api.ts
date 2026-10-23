/* ==========================================================================
   Data layer.
   Talks to the bundled Node API (server/index.mjs) at /api. When that API
   is not reachable (static hosting, offline, dev without the server) every
   call transparently falls back to localStorage, so the room and the admin
   dashboard keep working in "local demo mode".
   ========================================================================== */
import { LAUNCH_DEFAULT, NEWS, REDIRECT_DEFAULT, EVENTS, type Article } from './content';

/** `rsvps` keeps its id for stored data; in the room it holds bookings (intro calls, coffee chats). */
export type Collection = 'rsvps' | 'leads' | 'waitlist' | 'quiz' | 'scores' | 'profiles' | 'redemptions' | 'guestbook' | 'questions';

export interface Record_ {
  id: string;
  createdAt: number;
  [k: string]: unknown;
}

export interface SiteContent {
  news: Article[];
  launch: typeof LAUNCH_DEFAULT & { enabled: boolean };
  redirect: typeof REDIRECT_DEFAULT;
  events: typeof EVENTS;
  marquee: string;
}

export const DEFAULT_CONTENT: SiteContent = {
  news: NEWS,
  launch: { ...LAUNCH_DEFAULT, enabled: false },
  redirect: REDIRECT_DEFAULT,
  events: EVENTS,
  marquee: 'Adelia Tiara — AI Product Engineer — Informatics, class of 2026 — Bekasi, Indonesia (WIB) — Open to full-time roles, remote or in the Jakarta area — Write the eval before the prompt.',
};

const LS = 'adelia.db.';
let mode: 'unknown' | 'remote' | 'local' = 'unknown';
let probing: Promise<boolean> | null = null;

export function apiMode() {
  return mode;
}

async function probe(): Promise<boolean> {
  if (mode !== 'unknown') return mode === 'remote';
  if (!probing) {
    probing = fetch('/api/health', { headers: { accept: 'application/json' } })
      .then(async (r) => {
        const ok = r.ok && (r.headers.get('content-type') || '').includes('json') && (await r.json())?.ok === true;
        mode = ok ? 'remote' : 'local';
        return ok;
      })
      .catch(() => {
        mode = 'local';
        return false;
      });
  }
  return probing;
}

function lsRead<T = Record_[]>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(LS + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function lsWrite(key: string, value: unknown) {
  try {
    localStorage.setItem(LS + key, JSON.stringify(value));
  } catch {}
}

const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** An API error: `message` is "<status> <body>", `detail` the server's own words when it sent { error }. */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  constructor(status: number, body: string, detail: string) {
    super(`${status} ${body}`);
    this.status = status;
    this.detail = detail;
  }
}

async function req<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
  const r = await fetch('/api' + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    let detail = '';
    try {
      const j = JSON.parse(text) as { error?: unknown };
      if (typeof j.error === 'string') detail = j.error;
    } catch {}
    throw new ApiError(r.status, text, detail);
  }
  return (await r.json()) as T;
}

/* ---------- public writes ---------- */

export async function submit(collection: Collection, data: Record<string, unknown>): Promise<Record_> {
  const rec: Record_ = { id: rid(), createdAt: Date.now(), ...data };
  if (await probe()) {
    try {
      return await req<Record_>('POST', `/${collection}`, data);
    } catch {
      /* fall through to local */
    }
  }
  const list = lsRead<Record_[]>(collection, []);
  list.unshift(rec);
  lsWrite(collection, list.slice(0, 2000));
  return rec;
}

/** Upsert by key (e.g. profiles by sessionId). */
export async function upsert(collection: Collection, key: string, data: Record<string, unknown>) {
  if (await probe()) {
    try {
      await req('PUT', `/${collection}/${encodeURIComponent(key)}`, data);
      return;
    } catch {}
  }
  const list = lsRead<Record_[]>(collection, []);
  const i = list.findIndex((r) => r.id === key);
  const rec = { ...(i >= 0 ? list[i] : { createdAt: Date.now() }), ...data, id: key, updatedAt: Date.now() } as Record_;
  if (i >= 0) list[i] = rec;
  else list.unshift(rec);
  lsWrite(collection, list);
}

export async function list(collection: 'scores', query?: Record<string, string>): Promise<Record_[]> {
  if (await probe()) {
    try {
      const qs = query ? '?' + new URLSearchParams(query).toString() : '';
      return await req<Record_[]>('GET', `/${collection}${qs}`);
    } catch {}
  }
  let rows = lsRead<Record_[]>(collection, []);
  if (query) rows = rows.filter((r) => Object.entries(query).every(([k, v]) => String(r[k]) === v));
  return rows;
}

/* ---------- guestbook (the aquarium) ---------- */

/** A small creature: `shape` and `colour` are required; up to 6 more short tokens/numbers (size, eyes…). */
export interface Creature {
  shape: string;
  colour: string;
  [k: string]: string | number | boolean;
}

export interface GuestbookNote {
  id: string;
  createdAt: number;
  name: string;
  note: string;
  creature: Creature;
  /** An example note written by the site (Moci), not by a visitor. */
  house?: boolean;
}

export interface GuestbookInput {
  name?: string;
  note: string;
  creature: Creature;
  /** the visitor's session id, so the admin can link a note to a Guest Pass (never shown publicly) */
  sessionId?: string;
  /** honeypot: leave empty */
  website?: string;
}

/** What this browser keeps in local demo mode (the server keeps the same moderation flag). */
type StoredNote = GuestbookNote & { approved?: boolean; sessionId?: string };

/** Same limits as the server (server/guestbook.mjs). */
export const GUESTBOOK_LIMITS = { name: 40, note: 280, list: 120 } as const;

/** Example notes from the house, so the tank is never empty. Written by Moci, clearly not by visitors. */
export const HOUSE_NOTES: GuestbookNote[] = [
  {
    id: 'house-1',
    createdAt: Date.UTC(2026, 9, 1, 2, 0),
    name: 'Moci',
    note: 'Example note from the house: I live in this tank. Release a creature with a note and I’ll keep it company.',
    creature: { shape: 'jellyfish', colour: 'magenta' },
    house: true,
  },
  {
    id: 'house-2',
    createdAt: Date.UTC(2026, 9, 1, 2, 1),
    name: 'Moci',
    note: 'Tip from the house: tap any creature to read its note. Yours swims here too, for everyone who visits.',
    creature: { shape: 'whale', colour: 'sky' },
    house: true,
  },
  {
    id: 'house-3',
    createdAt: Date.UTC(2026, 9, 1, 2, 2),
    name: 'Moci',
    note: 'Hiring for an AI product team? The pink receipt printer books a chat with Adelia.',
    creature: { shape: 'octopus', colour: 'violet' },
    house: true,
  },
];

const LINKISH =
  /\b(?:https?|ftp):\/\/|\bwww\.|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|co|id|cc|ly|app|dev|xyz|info|biz|ru|cn|tk|gg|link|site|online|shop|top|ai|sg|club|live|store|tech|click|vip|page)(?:\/|\b)|<\s*a\b|\[(?:url|link)\b|[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
// eslint-disable-next-line no-control-regex
const GB_CTRL = /[\u0000-\u001F\u007F-\u009F]/g;
const GB_INVISIBLE = /[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;
const gbText = (s: unknown) => (typeof s === 'string' ? s.replace(GB_CTRL, ' ').replace(GB_INVISIBLE, '').replace(/\s+/g, ' ').trim() : '');

/** Client-side check that mirrors the server's rules; '' when the note is fine (the server also refuses a short blocklist). */
export function guestbookProblem(input: GuestbookInput): string {
  const name = gbText(input.name);
  const note = gbText(input.note);
  if (name.length > GUESTBOOK_LIMITS.name) return `Names can be up to ${GUESTBOOK_LIMITS.name} characters.`;
  if (note.length > GUESTBOOK_LIMITS.note) return `Notes can be up to ${GUESTBOOK_LIMITS.note} characters.`;
  if (note.length < 2) return 'Write a little something first.';
  if (LINKISH.test(`${name} ${note}`)) return 'Notes can’t carry links or email addresses. To get in touch, book a chat at the receipt printer.';
  if (!input.creature || typeof input.creature.shape !== 'string' || !input.creature.shape) return 'Pick a shape for your creature.';
  if (typeof input.creature.colour !== 'string' || !input.creature.colour) return 'Pick a colour for your creature.';
  return '';
}

const publicNote = (n: StoredNote): GuestbookNote => ({
  id: n.id,
  createdAt: n.createdAt,
  name: n.name,
  note: n.note,
  creature: n.creature,
  ...(n.house ? { house: true } : {}),
});

function localNotes(): StoredNote[] {
  const stored = lsRead<StoredNote[] | null>('guestbook', null);
  if (Array.isArray(stored)) return stored;
  // first visit in local demo mode: seed the house examples (the admin can delete them)
  lsWrite('guestbook', HOUSE_NOTES);
  return HOUSE_NOTES.slice();
}

/**
 * The newest notes first (at most 120). On the live API these are the approved notes;
 * the house examples are added while fewer than three real notes exist.
 */
export async function getGuestbook(limit: number = GUESTBOOK_LIMITS.list): Promise<GuestbookNote[]> {
  const n = Math.max(1, Math.min(GUESTBOOK_LIMITS.list, Math.floor(limit) || GUESTBOOK_LIMITS.list));
  if (await probe()) {
    try {
      const r = await req<{ notes?: GuestbookNote[] }>('GET', `/guestbook?limit=${n}`);
      const notes = Array.isArray(r.notes) ? r.notes : [];
      return (notes.length < 3 ? [...notes, ...HOUSE_NOTES] : notes).slice(0, n);
    } catch {}
  }
  return localNotes()
    .filter((x) => x.approved !== false)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, n)
    .map(publicNote);
}

/**
 * Release a creature. Resolves with the stored note; rejects with an Error whose message is
 * ready to show (too long, a link, slow down…). Falls back to this browser when the API is down.
 */
export async function postGuestbook(input: GuestbookInput): Promise<GuestbookNote> {
  const problem = guestbookProblem(input);
  if (problem) throw new Error(problem);
  const body: GuestbookInput = { ...input, name: gbText(input.name), note: gbText(input.note) };
  if (await probe()) {
    try {
      return (await req<{ note: GuestbookNote }>('POST', '/guestbook', body)).note;
    } catch (e) {
      // 404/405: an older API without the guestbook route — keep the note in this browser instead
      if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 404 && e.status !== 405) throw new Error(e.detail || 'The aquarium didn’t take that note. Try again?');
      /* network or server trouble: keep it in this browser */
    }
  }
  const note: GuestbookNote = { id: rid(), createdAt: Date.now(), name: body.name || 'Anonymous visitor', note: body.note, creature: { ...input.creature } };
  const stored: StoredNote = { ...note, approved: true, ...(input.sessionId ? { sessionId: input.sessionId } : {}) };
  lsWrite('guestbook', [stored, ...localNotes()].slice(0, 500));
  return note;
}

/* ---------- content ---------- */

let contentCache: SiteContent | null = null;
export async function getContent(): Promise<SiteContent> {
  if (contentCache) return contentCache;
  let remote: Partial<SiteContent> | null = null;
  if (await probe()) {
    try {
      remote = await req<Partial<SiteContent>>('GET', '/content');
    } catch {}
  }
  const local = lsRead<Partial<SiteContent> | null>('content', null);
  contentCache = { ...DEFAULT_CONTENT, ...(local || {}), ...(remote || {}) };
  return contentCache;
}

export async function saveContent(content: SiteContent, token: string) {
  contentCache = content;
  if (await probe()) {
    await req('PUT', '/content', content, token);
    return;
  }
  lsWrite('content', content);
}

/* ---------- analytics ---------- */

let queue: Record<string, unknown>[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function track(type: string, data: Record<string, unknown> = {}) {
  const sessionId = sessionIdRef();
  queue.push({ type, data, sessionId, t: Date.now(), path: location.pathname });
  if (!flushTimer) flushTimer = setTimeout(flush, 2500);
}

async function flush() {
  flushTimer = null;
  const batch = queue;
  queue = [];
  if (!batch.length) return;
  if (await probe()) {
    try {
      await req('POST', '/events', { events: batch });
      return;
    } catch {}
  }
  const list = lsRead<unknown[]>('analytics', []);
  lsWrite('analytics', [...batch.reverse(), ...list].slice(0, 5000));
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (!queue.length) return;
    if (mode === 'remote' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/events', new Blob([JSON.stringify({ events: queue })], { type: 'application/json' }));
      queue = [];
    } else void flush();
  });
}

/** The visitor's persisted game state (zustand persist), tolerant of the store's key being renamed. */
const GAME_KEYS = ['adelia.game.v1'];
interface GameSnapshot {
  sessionId?: string;
  name?: string;
  email?: string;
  points?: number;
  achievements?: Record<string, unknown>;
  stamps?: Record<string, unknown>;
  manifesto?: Record<string, unknown>;
  stats?: { bestScores?: Record<string, number>; quizResult?: unknown };
}
function readGameState(): GameSnapshot | null {
  for (const k of GAME_KEYS) {
    try {
      const raw = localStorage.getItem(k);
      const s = raw ? (JSON.parse(raw) as { state?: GameSnapshot })?.state : null;
      if (s && typeof s === 'object') return s;
    } catch {}
  }
  return null;
}

function sessionIdRef(): string {
  const id = readGameState()?.sessionId;
  return typeof id === 'string' && id ? id : 'anon';
}

/** Mirror the visitor's loyalty profile (debounced). */
let profileTimer: ReturnType<typeof setTimeout> | null = null;
export function syncProfile() {
  if (profileTimer) clearTimeout(profileTimer);
  profileTimer = setTimeout(async () => {
    try {
      const s = readGameState();
      if (!s?.sessionId) return;
      await upsert('profiles', s.sessionId, {
        name: s.name || 'Guest',
        email: s.email || '',
        points: s.points,
        achievements: Object.keys(s.achievements || {}),
        stamps: Object.keys(s.stamps || {}),
        manifesto: Object.keys(s.manifesto || {}),
        bestScores: s.stats?.bestScores || {},
        quizResult: s.stats?.quizResult || null,
      });
    } catch {}
  }, 1500);
}

/* ---------- admin ---------- */

/** Local demo mode only (no API). The live server uses ADMIN_PASSWORD (its local default is the same — set it in production). */
export const LOCAL_ADMIN_PASSWORD = 'adelia-room-local';

export async function adminLogin(password: string): Promise<{ token: string; mode: 'remote' | 'local' }> {
  if (await probe()) {
    const r = await req<{ token: string }>('POST', '/admin/login', { password });
    return { token: r.token, mode: 'remote' };
  }
  if (password !== LOCAL_ADMIN_PASSWORD) throw new Error('Wrong password');
  return { token: 'local', mode: 'local' };
}

export interface AdminData {
  mode: 'remote' | 'local';
  collections: Record<Collection | 'analytics', Record_[]>;
  content: SiteContent;
}

const ADMIN_COLLECTIONS = ['rsvps', 'leads', 'waitlist', 'quiz', 'scores', 'profiles', 'redemptions', 'guestbook', 'questions', 'analytics'] as const;

export async function adminData(token: string): Promise<AdminData> {
  if (await probe()) {
    const r = await req<{ collections: Partial<AdminData['collections']>; content: SiteContent }>('GET', '/admin/data', undefined, token);
    const collections = Object.fromEntries(ADMIN_COLLECTIONS.map((c) => [c, r.collections?.[c] ?? []])) as AdminData['collections'];
    return { mode: 'remote', collections, content: { ...DEFAULT_CONTENT, ...r.content } };
  }
  const collections = Object.fromEntries(
    ADMIN_COLLECTIONS.map((c) => [c, c === 'guestbook' ? (localNotes() as unknown as Record_[]) : lsRead<Record_[]>(c, [])]),
  ) as AdminData['collections'];
  return { mode: 'local', collections, content: await getContent() };
}

export async function adminDelete(token: string, collection: Collection, id: string) {
  if (await probe()) {
    await req('DELETE', `/admin/${collection}/${encodeURIComponent(id)}`, undefined, token);
    return;
  }
  const rows = collection === 'guestbook' ? (localNotes() as unknown as Record_[]) : lsRead<Record_[]>(collection, []);
  lsWrite(
    collection,
    rows.filter((r) => r.id !== id),
  );
}

/** Hide (approved: false) or show a guestbook note without deleting it. */
export async function adminSetNoteApproved(token: string, id: string, approved: boolean) {
  if (await probe()) {
    await req('PATCH', `/admin/guestbook/${encodeURIComponent(id)}`, { approved }, token);
    return;
  }
  lsWrite(
    'guestbook',
    localNotes().map((n) => (n.id === id ? { ...n, approved } : n)),
  );
}

export function toCSV(rows: Record_[]): string {
  if (!rows.length) return '';
  const keys = Array.from(rows.reduce((s, r) => (Object.keys(r).forEach((k) => s.add(k)), s), new Set<string>()));
  const esc = (v: unknown) => {
    let s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    // neutralise spreadsheet formula injection (plain numbers stay as they are)
    if (/^[=+\-@\t\r]/.test(s) && !/^[+-]?\d+(\.\d+)?$/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
}
