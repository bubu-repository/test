import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { closeTop, get, reducedMotion, useApp, type PhoneApp } from '@/state';
import { person } from '@/content/site';
import { useFocusTrap } from '@/ui/Sheet';
import { Call, Chat, Posts, Work } from './apps';
import { IconChat, IconClose } from './icons';
import { APPS, LockClock, Overlap, StatusBar, Wallpaper, chatSeen, markChatSeen, useNow } from './shared';
import './phone.css';

/**
 * Her phone, the overlay (docs/concept.md, "The phone"; choreography from shan 11).
 * Open: the room dims, the phone rises tilted from below and straightens on the wallpaper, then the
 * clock, the overlap widget and the four icons fade in. 680 ms (--duration-phone), interruptible:
 * closing mid-rise plays the same animations backwards from where they are.
 * Desktop: a big device cut off by the bottom edge. Under 600 px: a sheet with its top bezel showing.
 * All controls sit inside the device. Esc closes the top layer: an app, then the phone.
 */

type View = 'home' | PhoneApp;

const root = () => getComputedStyle(document.documentElement);
const msVar = (name: string, fallback: number) => {
  const v = parseFloat(root().getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
};
const easeVar = (name: string, fallback: string) => root().getPropertyValue(name).trim() || fallback;
const settle = (a: Animation) => a.finished.catch(() => undefined);

export default function Phone({ app }: { app?: PhoneApp }) {
  const [view, setView] = useState<View>(app ?? 'home');
  const [unread, setUnread] = useState(() => !chatSeen());
  const now = useNow();
  const id = useId();

  const rootRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLSpanElement>(null);
  const deviceRef = useRef<HTMLDivElement>(null);
  const anims = useRef<Animation[]>([]);
  const closing = useRef(false);
  const viewRef = useRef<View>(view);
  const lastApp = useRef<PhoneApp | null>(app ?? null);
  const navigated = useRef(false);
  const entered = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  const isTop = useApp((s) => s.overlays.at(-1)?.kind === 'phone');

  useFocusTrap(rootRef);
  viewRef.current = view;

  // A second openOverlay({ kind: 'phone', app }) while open switches the app.
  useEffect(() => {
    if (app) setView(app);
  }, [app]);

  useEffect(() => {
    if (view === 'chat' && unread) {
      markChatSeen();
      setUnread(false);
    }
  }, [view, unread]);

  // /room/phone, so the Android back button closes the phone (App's popstate drops the overlay).
  useEffect(() => {
    if (location.pathname === '/room') history.pushState({ phone: true }, '', '/room/phone');
  }, []);

  // The page behind stays put while the phone is up.
  useEffect(() => {
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = 'hidden';
    return () => {
      el.style.overflow = prev;
    };
  }, []);

  // Keyboard focus follows the screen: into an app lands on its back button, home lands on its icon.
  useEffect(() => {
    if (!navigated.current) return;
    const device = deviceRef.current;
    if (!device) return;
    const target =
      view === 'home'
        ? device.querySelector<HTMLElement>(`[data-app="${lastApp.current ?? 'posts'}"]`)
        : device.querySelector<HTMLElement>('[data-phone-back]');
    target?.focus({ preventScroll: true });
  }, [view]);

  // A run opened from the phone sits on top of it. When it closes, focus goes back to the row or
  // button that opened it (Overlays may hide the phone for a frame while the run's chunk loads).
  const lastFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const device = deviceRef.current;
    if (!device) return;
    const onFocus = (e: FocusEvent) => {
      if (e.target instanceof HTMLElement) lastFocus.current = e.target;
    };
    device.addEventListener('focusin', onFocus);
    return () => device.removeEventListener('focusin', onFocus);
  }, []);
  useEffect(() => {
    if (!isTop) {
      // Keep the first capture: a Suspense re-show re-runs the focus trap, which focuses the device.
      const el = lastFocus.current;
      if (!trigger.current && el && el !== deviceRef.current) trigger.current = el;
      return;
    }
    const el = trigger.current;
    trigger.current = null;
    if (el && document.contains(el)) requestAnimationFrame(() => el.focus({ preventScroll: true }));
  }, [isTop]);

  /* ---------- entrance ---------------------------------------------------------------------- */
  // Runs once per phone: StrictMode's second pass and a Suspense re-show must not replay the rise.
  useLayoutEffect(() => {
    const scrim = scrimRef.current;
    const device = deviceRef.current;
    if (!scrim || !device || entered.current) return;
    entered.current = true;
    const list: Animation[] = [];
    if (reducedMotion()) {
      const d = msVar('--duration-quick', 150);
      [scrim, device, tagRef.current].forEach((el) => el && list.push(el.animate({ opacity: [0, 1] }, { duration: d, fill: 'backwards' })));
    } else {
      const total = msVar('--duration-phone', 680);
      const out = easeVar('--ease-smooth-out', 'ease-out');
      const cont = easeVar('--ease-continuity', 'ease-out');
      const move = easeVar('--ease-move', 'ease-in-out');
      const lift = msVar('--distance-base', 8);
      [scrim, tagRef.current].forEach(
        (el) => el && list.push(el.animate({ opacity: [0, 1] }, { duration: msVar('--duration-fast', 250), easing: out, fill: 'backwards' })),
      );
      // Rise tilted, arrive almost level, then straighten (shan 11 frames 2 and 3).
      list.push(
        device.animate(
          [
            { transform: 'translateY(56%) rotate(-9deg)', easing: cont },
            { transform: 'translateY(-0.5%) rotate(-2.4deg)', offset: 0.68, easing: move },
            { transform: 'none' },
          ],
          { duration: total * 0.86, fill: 'backwards' },
        ),
      );
      // Wallpaper first; the screen's content fades in once the phone is nearly level.
      const items = [...device.querySelectorAll<HTMLElement>('[data-rise]')];
      const start = total * 0.56;
      const step = msVar('--duration-stagger', 30);
      const fade = msVar('--duration-quick', 150);
      items.forEach((el, i) =>
        list.push(
          el.animate([{ opacity: 0, transform: `translateY(${lift}px)` }, { opacity: 1, transform: 'none' }], {
            duration: fade,
            delay: start + Math.min(i, 5) * step,
            easing: out,
            fill: 'backwards',
          }),
        ),
      );
    }
    anims.current = list;
  }, []);

  /* ---------- exit -------------------------------------------------------------------------- */
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const done = () => {
      if (location.pathname === '/room/phone') history.back();
      else if (get().overlays.at(-1)?.kind === 'phone') closeTop();
    };
    const scrim = scrimRef.current;
    const device = deviceRef.current;
    const opening = anims.current.some((a) => a.playState === 'running' || a.pending);
    if (opening) {
      // Interrupted mid-rise: run everything backwards from where it is.
      anims.current.forEach((a) => a.reverse());
      Promise.all(anims.current.map(settle)).then(done);
      return;
    }
    if (!scrim || !device) return done();
    let list: Animation[];
    if (reducedMotion()) {
      const d = msVar('--duration-quick', 150);
      list = [scrim, device, tagRef.current].filter((el): el is HTMLElement => !!el).map((el) => el.animate({ opacity: [1, 0] }, { duration: d, fill: 'forwards' }));
    } else {
      const exit = easeVar('--ease-exit', 'ease-in');
      const d = msVar('--duration-slow', 400);
      list = [
        device.animate([{ transform: 'none' }, { transform: 'translateY(62%) rotate(-7deg)' }], { duration: d, easing: exit, fill: 'forwards' }),
        ...[scrim, tagRef.current]
          .filter((el): el is HTMLElement => !!el)
          .map((el) => el.animate({ opacity: [1, 0] }, { duration: msVar('--duration-medium', 350), delay: msVar('--duration-stagger', 30), easing: exit, fill: 'forwards' })),
      ];
    }
    anims.current = list;
    Promise.all(list.map(settle)).then(done);
  }, []);

  const openApp = useCallback((a: PhoneApp) => {
    navigated.current = true;
    lastApp.current = a;
    setView(a);
  }, []);
  const goHome = useCallback(() => {
    navigated.current = true;
    setView('home');
  }, []);

  // Esc closes the top layer: the open app first, then the phone. Capture phase, so App's own Esc
  // handler sees defaultPrevented and leaves the overlay stack alone.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (get().overlays.at(-1)?.kind !== 'phone') return;
      e.preventDefault();
      if (viewRef.current !== 'home') goHome();
      else close();
    };
    addEventListener('keydown', onKey, true);
    return () => removeEventListener('keydown', onKey, true);
  }, [close, goHome]);

  const inApp = view !== 'home';

  return (
    <div className="ph" ref={rootRef} role="dialog" aria-modal="true" aria-labelledby={`${id}-t`}>
      <div className="ph-scrim" ref={scrimRef} onPointerDown={close} />
      <span className="tag ph-tag" ref={tagRef} aria-hidden="true">
        Phone
      </span>
      <h2 className="sr-only" id={`${id}-t`}>
        {person.firstName}'s phone
      </h2>
      <div className="ph-device" ref={deviceRef} tabIndex={-1} data-autofocus>
        <div className="ph-screen">
          <Wallpaper />
          <div className="ph-view" data-view={view} data-in-app={inApp || undefined}>
            <StatusBar now={now} />
            <div className="ph-main">
              {view === 'home' ? (
                <div className="ph-home" key="home" data-enter={navigated.current || undefined}>
                  <button className="ph-x" onClick={close} aria-label="Close the phone (Esc)">
                    <IconClose />
                  </button>
                  <div data-rise>
                    <LockClock now={now} />
                  </div>
                  <div className="ph-stack">
                    <div className="ph-card" data-rise>
                      <Overlap now={now} />
                    </div>
                    {unread && (
                      <button className="ph-card ph-notif" data-rise onClick={() => openApp('chat')}>
                        <IconChat className="ph-notif-ico" />
                        <span className="ph-notif-body">
                          <span className="ph-notif-app">Chat</span>
                          <span className="ph-notif-text">Ask me anything</span>
                        </span>
                      </button>
                    )}
                  </div>
                  <nav className="ph-apps" aria-label="Apps">
                    {APPS.map(({ id: a, name, Icon }) => {
                      const dot = a === 'chat' && unread;
                      return (
                        <button key={a} className="ph-app" data-app={a} data-rise onClick={() => openApp(a)} aria-label={dot ? `${name}, 1 unread` : name}>
                          <span className="ph-icon">
                            <Icon />
                          </span>
                          <span className="ph-app-name" aria-hidden="true">
                            {name}
                          </span>
                          {dot && (
                            <span className="ph-badge" aria-hidden="true">
                              1
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              ) : (
                <div className="ph-appwrap" key={view} data-rise data-enter={navigated.current || undefined}>
                  {view === 'posts' && <Posts onBack={goHome} />}
                  {view === 'chat' && <Chat onBack={goHome} />}
                  {view === 'call' && <Call onBack={goHome} />}
                  {view === 'work' && <Work onBack={goHome} />}
                </div>
              )}
            </div>
            <button className="ph-homebar" onClick={inApp ? goHome : close} aria-label={inApp ? 'Home screen' : 'Put the phone down'}>
              <span />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
