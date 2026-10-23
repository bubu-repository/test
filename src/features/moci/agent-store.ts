/* ==========================================================================
   Moci's conversation. Lives outside the panel (zustand), so it survives
   Moci walking you to another object and you coming back.

   ask(q): tries the online brain (POST /api/agent → server/agent.mjs:
   Claude with the room's tools); any failure (no key, the daily cap, rate
   limit, network, static hosting) answers with the offline brain instead.
   Both are typed out the same way, then the actions run.

   Online answers come back signed; the signature goes back with the history
   so the server only trusts Moci's own earlier words.
   ========================================================================== */
import { create } from 'zustand';
import { submit, track } from '@/lib/api';
import { game } from '@/state/game';
import { ACHIEVEMENT_MAP, type AchievementId } from '@/state/achievements';
import { useUI } from '@/state/ui';
import { once } from '@/features/computer/util';
import { think, type MociAction } from './brain';
import { describeAction, runAction, toolToAction } from './actions';
import { sourceFor } from './knowledge';

export interface ActionChip {
  label: string;
  done: boolean;
}

export interface MociMessage {
  id: string;
  role: 'user' | 'moci';
  /** what's shown (without the "Source:" line) */
  text: string;
  /** exactly what the server signed, sent back as history */
  raw?: string;
  sig?: string;
  source?: string;
  actions: ActionChip[];
  followups: string[];
  brain?: 'online' | 'offline';
  abstained?: boolean;
  pending?: boolean;
}

type Mode = 'ready' | 'online' | 'offline';

interface MociState {
  messages: MociMessage[];
  busy: boolean;
  /** which brain answered last */
  mode: Mode;
  /** the chat, or "How Moci is tested" */
  view: 'chat' | 'evals';
  /** the finished answer, for the screen reader live region */
  announce: string;
  setView: (v: 'chat' | 'evals') => void;
  reset: () => void;
}

export const useMoci = create<MociState>((set) => ({
  messages: [],
  busy: false,
  mode: 'ready',
  view: 'chat',
  announce: '',
  setView: (view) => set({ view }),
  reset: () => set({ messages: [], announce: '', view: 'chat' }),
}));

const get = () => useMoci.getState();
let seq = 0;
const uid = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

function patch(id: string, p: Partial<MociMessage> | ((m: MociMessage) => Partial<MociMessage>)) {
  useMoci.setState((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...(typeof p === 'function' ? p(m) : p) } : m)) }));
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const calm = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** "…\nSource: wall/tenderlens" → body + a source key Moci is allowed to cite (anything else is dropped). */
export function splitSource(text: string): { body: string; source?: string } {
  const m = text.match(/\n?\s*Sources?:\s*`?([^\s`]+)`?\s*$/i);
  if (!m) return { body: text.trim() };
  const key = m[1].replace(/[.,;)]+$/, '');
  return { body: text.slice(0, m.index).trimEnd(), source: sourceFor(key) ? key : undefined };
}

/** Award once per profile; unlock a "curious" sticker too if the sticker book has one. */
function reward(name: string, points: number, label: string) {
  if (!once(`moci-${name}`)) return;
  game().addPoints(points, label);
}
function unlockIfExists(id: string) {
  if ((ACHIEVEMENT_MAP as Record<string, unknown>)[id]) game().unlock(id as AchievementId);
}

interface OnlineAnswer {
  text: string;
  tools?: { name: string; input: unknown }[];
  sig?: string;
}

/**
 * When the server says the online brain can't answer for a while (no API key, today's cap, this
 * visitor's cap), skip it for a few minutes instead of asking again before every offline answer.
 */
let onlineRestUntil = 0;
const REST_REASONS = new Set(['no_key', 'daily_cap', 'visitor_cap', 'no_knowledge']);

/** One answer from the online brain. Throws on anything but a usable answer. */
async function askOnline(history: { role: 'user' | 'assistant'; content: string; sig?: string }[]): Promise<OnlineAnswer> {
  if (Date.now() < onlineRestUntil) throw new Error('online brain resting');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 28_000);
  try {
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ messages: history, station: useUI.getState().focus ?? 'moci' }),
      signal: controller.signal,
    });
    if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) {
      const reason = res.status === 503 ? ((await res.json().catch(() => null)) as { reason?: string } | null)?.reason : undefined;
      if (reason && REST_REASONS.has(reason)) onlineRestUntil = Date.now() + 5 * 60_000;
      // no API at all (static hosting answers 404, or the page itself): stay offline for this visit
      if (res.status === 404 || res.status === 405 || (res.ok && (res.headers.get('content-type') || '').includes('html'))) onlineRestUntil = Date.now() + 60 * 60_000;
      throw new Error(`agent ${res.status}`);
    }
    const json = (await res.json()) as OnlineAnswer;
    if (!json || typeof json.text !== 'string' || !json.text.trim()) throw new Error('empty answer');
    return json;
  } finally {
    clearTimeout(timer);
  }
}

async function typeOut(id: string, text: string) {
  if (calm()) return patch(id, { text });
  let shown = '';
  for (const w of text.split(/(\s+)/)) {
    shown += w;
    patch(id, { text: shown });
    if (w.trim()) await wait(14 + Math.random() * 20);
  }
}

/** Ask Moci. Safe to call from anywhere (other panels can hand Moci a question). */
export async function ask(question: string) {
  const q = question.trim().slice(0, 600);
  if (!q || get().busy) return;

  // Moci's own earlier answers go back with the server's signature; unsigned ones are dropped there.
  const history = get()
    .messages.filter((m) => !m.pending && m.text)
    .slice(-8)
    .map((m) => (m.role === 'user' ? { role: 'user' as const, content: m.text } : { role: 'assistant' as const, content: m.raw ?? m.text, ...(m.sig ? { sig: m.sig } : {}) }));

  const user: MociMessage = { id: uid(), role: 'user', text: q, actions: [], followups: [] };
  const bot: MociMessage = { id: uid(), role: 'moci', text: '', actions: [], followups: [], pending: true };
  useMoci.setState((s) => ({ messages: [...s.messages, user, bot], busy: true, announce: '', view: 'chat' }));
  reward('first-question', 20, 'Asked Moci a question');
  unlockIfExists('oracle'); // "Fit check": asking Moci is the other way to get an answer with evidence

  let body = '';
  let source: string | undefined;
  let actions: MociAction[] = [];
  let followups: string[] = [];
  let brain: 'online' | 'offline' = 'online';
  let abstained = false;
  try {
    const online = await askOnline([...history, { role: 'user', content: q }]);
    ({ body, source } = splitSource(online.text));
    actions = (online.tools ?? []).map((t) => toolToAction(t.name, t.input)).filter((a): a is MociAction => !!a);
    // follow-up suggestions come from the offline brain's intent map: instant and on-topic
    followups = think(q).followups;
    patch(bot.id, { raw: online.text, sig: online.sig, brain: 'online' });
    useMoci.setState({ mode: 'online' });
  } catch {
    const a = think(q);
    brain = 'offline';
    body = a.text;
    source = a.source;
    actions = a.actions;
    followups = a.followups;
    abstained = a.confidence <= 0.2;
    patch(bot.id, { brain: 'offline' });
    useMoci.setState({ mode: 'offline' });
  }
  track('moci', { action: 'ask', brain, abstained, source: source ?? null, tools: actions.map((a) => a.type) });
  // the server logs the questions it answers; offline answers are logged from here (no IP, no contact details)
  if (brain === 'offline') void submit('questions', { question: q, answered: 'offline', abstained, source: source ?? null }).catch(() => {});

  await typeOut(bot.id, body);
  patch(bot.id, { source, abstained, actions: actions.map((a) => ({ label: describeAction(a), done: false })) });
  const label = source ? sourceFor(source)?.label : undefined;
  useMoci.setState({ announce: `Moci: ${body}${label ? ` Source: ${label}.` : ''}` });

  // Actions run after the answer is on screen; a walk waits a beat so the answer can be read.
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    if (a.type === 'evals') {
      useMoci.setState({ view: 'evals' });
    } else {
      if (a.type === 'walk' || a.type === 'book') await wait(calm() ? 400 : 1100);
      await runAction(a);
    }
    patch(bot.id, (m) => ({ actions: m.actions.map((c, j) => (j === i ? { ...c, done: true } : c)) }));
    track('moci', { action: 'tool', tool: a.type, ...(a.type === 'walk' ? { station: a.station } : {}) });
  }
  patch(bot.id, { followups: followups.slice(0, 3), pending: false });
  useMoci.setState({ busy: false });
}

/** A source chip was tapped: walk to that object. */
export function followSource(key: string) {
  const s = sourceFor(key);
  if (!s) return;
  track('moci', { action: 'source', source: key });
  reward('source', 10, 'Followed one of Moci’s sources');
  if (s.station === 'moci') {
    useMoci.setState({ view: s.props?.view === 'evals' ? 'evals' : 'chat' });
    return;
  }
  void runAction({ type: 'walk', station: s.station, props: s.props });
}

/** The eval was run in the browser. */
export function evalRan(passed: number, total: number) {
  track('moci', { action: 'eval', passed, total });
  reward('eval', 30, 'Ran Moci’s eval');
}

/**
 * Open Moci from anywhere in the room (the terminal, the fit check, the 404…), optionally with a
 * question it answers on arrival: openMoci('Is she a fit for a junior AI role?').
 */
export function openMoci(question?: string) {
  useUI.getState().openPanel('moci', question ? { ask: question, nonce: Date.now() } : {});
}
