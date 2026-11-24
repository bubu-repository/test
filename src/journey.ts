import { flushSync } from 'react-dom';
import { get, set, subscribe, reducedMotion } from '@/state';

/**
 * Bento → room and back (docs/concept.md, "The transition").
 * - View Transitions where supported: tiles fly to the objects they belong to (shared names).
 * - Otherwise WAAPI: tiles part outward, the veil fades, the room settles from 1.06 to 1.
 * - Reduced motion: a 150 ms cross-fade.
 * Interruptible: a second call while one runs reverses or skips it, input is never blocked.
 */

type Opts = { from?: HTMLElement | null; push?: boolean; focus?: string };

let running: Animation[] = [];
let vtRunning: { skipTransition: () => void } | null = null;
let roomMounted = false;
const roomWaiters: (() => void)[] = [];

export function markRoomMounted() {
  roomMounted = true;
  roomWaiters.splice(0).forEach((r) => r());
}
function whenRoomMounted(): Promise<void> {
  if (roomMounted) return Promise.resolve();
  set({ wantRoom: true });
  return new Promise((r) => roomWaiters.push(r));
}

const isDesktop = () => matchMedia('(min-width: 900px)').matches;
const scale = () => (isDesktop() ? 0.72 : 1);
const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

let bentoScroll = 0;

function stopRunning() {
  vtRunning?.skipTransition();
  vtRunning = null;
  running.forEach((a) => a.cancel());
  running = [];
}

/** Pan the room so the object a tile belongs to is on screen (phones). */
function aimRoom(focus?: string) {
  const scroller = document.querySelector<HTMLElement>('.room-pan');
  if (!scroller) return;
  const target = focus ? scroller.querySelector<HTMLElement>(`[data-obj="${focus}"]`) : null;
  const anchor = target ?? scroller.querySelector<HTMLElement>('[data-anchor="center"]');
  if (!anchor) return;
  const r = anchor.getBoundingClientRect();
  const s = scroller.getBoundingClientRect();
  scroller.scrollLeft += r.left + r.width / 2 - (s.left + s.width / 2);
}

export async function enterRoom(opts: Opts = {}) {
  const { from = null, push = true, focus } = opts;
  if (get().screen === 'room' && !get().moving) return;
  stopRunning();
  if (push && !location.pathname.startsWith('/room')) history.pushState({ screen: 'room' }, '', '/room');
  bentoScroll = scrollY;
  await whenRoomMounted();

  const commit = () => {
    set({ screen: 'room', moving: false });
    aimRoom(focus);
  };

  if (reducedMotion()) {
    commit();
    fade(document.querySelector('.room'), 150);
    return;
  }

  const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void>; skipTransition: () => void } };
  if (doc.startViewTransition) {
    document.documentElement.dataset.vt = 'in';
    const t = doc.startViewTransition(() => flushSync(commit));
    vtRunning = t;
    try {
      await t.finished;
    } finally {
      delete document.documentElement.dataset.vt;
      vtRunning = null;
    }
    return;
  }

  // WAAPI path: the room becomes visible under the veil, then the frost clears.
  set({ moving: true });
  const k = scale();
  const room = document.querySelector<HTMLElement>('.room-stage');
  const veil = document.querySelector<HTMLElement>('.veil');
  document.documentElement.dataset.moving = 'in';
  const tiles = [...document.querySelectorAll<HTMLElement>('.bento .tile')];
  const origin = from?.getBoundingClientRect() ?? { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const ox = origin.left + origin.width / 2;
  const oy = origin.top + origin.height / 2;
  tiles.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const dx = Math.sign(r.left + r.width / 2 - ox) * 16;
    const dy = Math.sign(r.top + r.height / 2 - oy) * 10;
    running.push(
      el.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(.96)`, opacity: 0 }], {
        duration: 240 * k,
        delay: i * 25 * k,
        easing: css('--ease-exit'),
        fill: 'forwards',
      }),
    );
  });
  if (veil) running.push(veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 480 * k, delay: 80 * k, easing: css('--ease-smooth-out'), fill: 'forwards' }));
  if (room) running.push(room.animate([{ transform: 'scale(1.06)' }, { transform: 'none' }], { duration: 560 * k, easing: css('--ease-continuity'), fill: 'forwards' }));
  const mine = running;
  await Promise.all(mine.map((a) => a.finished.catch(() => undefined)));
  if (running !== mine) return; // interrupted
  delete document.documentElement.dataset.moving;
  commit();
  mine.forEach((a) => a.cancel());
  running = [];
}

export async function leaveRoom(opts: Opts = {}) {
  const { push = true } = opts;
  if (get().screen === 'bento' && !get().moving) return;
  stopRunning();
  if (push && location.pathname !== '/') history.pushState({ screen: 'bento' }, '', '/');
  set({ overlays: [] });

  const commit = () => {
    set({ screen: 'bento', moving: false });
    scrollTo({ top: bentoScroll, behavior: 'instant' as ScrollBehavior });
  };

  if (reducedMotion()) {
    commit();
    fade(document.querySelector('.bento'), 150);
    return;
  }

  const doc = document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void>; skipTransition: () => void } };
  if (doc.startViewTransition) {
    document.documentElement.dataset.vt = 'out';
    const t = doc.startViewTransition(() => flushSync(commit));
    vtRunning = t;
    try {
      await t.finished;
    } finally {
      delete document.documentElement.dataset.vt;
      vtRunning = null;
    }
    return;
  }

  const k = scale() * 0.85;
  commit();
  const room = document.querySelector<HTMLElement>('.room');
  const veil = document.querySelector<HTMLElement>('.veil');
  const tiles = [...document.querySelectorAll<HTMLElement>('.bento .tile')];
  if (veil) running.push(veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 * k, easing: css('--ease-smooth-out') }));
  tiles.forEach((el, i) =>
    running.push(
      el.animate([{ transform: 'scale(.96)', opacity: 0 }, { transform: 'none', opacity: 1 }], {
        duration: 300 * k,
        delay: 60 + i * 20 * k,
        easing: css('--ease-smooth-out'),
        fill: 'backwards',
      }),
    ),
  );
  if (room) running.push(room.animate([{ opacity: 1, visibility: 'visible' }, { opacity: 0, visibility: 'visible' }], { duration: 300 * k, easing: css('--ease-exit') }));
}

function fade(el: Element | null, ms: number) {
  el?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: 'linear' });
}

// Keep a reference so tree-shaking never drops the subscription helpers used by callers.
export const _internals = { subscribe };
