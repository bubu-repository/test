import { lazy, Suspense, useEffect, useState } from 'react';
import { useApp, get, set, closeTop, setTime, openOverlay, type PhoneApp, type PanelId } from '@/state';
import { herHour, timeOfDay } from '@/lib/time';
import { Header } from '@/ui/Header';
import { Bento } from '@/bento/Bento';
import { Overlays } from '@/Overlays';
import { enterRoom, leaveRoom } from '@/journey';
import './app.css';

// The room arrives in its own chunk, after the bento has painted (trends §6: the bento is the LCP).
const Room = lazy(() => import('@/room/Room'));

export default function App() {
  const screen = useApp((s) => s.screen);
  const wantRoom = useApp((s) => s.wantRoom);
  const [roomReady, setRoomReady] = useState(screen === 'room');

  // Mount the room once the bento is on screen and the browser is idle.
  useEffect(() => {
    if (roomReady) return;
    const go = () => setRoomReady(true);
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(go, { timeout: 1200 });
    else setTimeout(go, 400);
  }, [roomReady]);

  // Deep links for QA and screenshots: ?time=night, ?open=phone | phone:chat | run:p1 | panel:today | visit:clear | photo
  // ?bake=1 hides the header and HUD (scripts/bake-veil.mjs uses it).
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const t = q.get('time');
    if (t === 'morning' || t === 'dusk' || t === 'night') setTime(t, t);
    if (q.has('bake')) document.documentElement.dataset.bake = '1';
    const open = q.get('open');
    if (!open) return;
    const [kind, arg] = open.split(':');
    const go = () => {
      if (kind === 'phone') openOverlay({ kind: 'phone', app: (arg as PhoneApp) || undefined });
      else if (kind === 'run' && (arg === 'p1' || arg === 'p2' || arg === 'p3')) openOverlay({ kind: 'run', id: arg });
      else if (kind === 'panel' && arg) openOverlay({ kind: 'panel', id: arg as PanelId });
      else if (kind === 'visit') openOverlay({ kind: 'visit', tier: arg === 'perfect' ? 'perfect' : 'clear' });
      else if (kind === 'photo') openOverlay({ kind: 'photo' });
    };
    setTimeout(go, 300);
  }, []);

  // Follow Bekasi time while the page is open (unless the visitor picked a time).
  useEffect(() => {
    const tick = () => {
      if (get().timeOverride) return;
      const t = timeOfDay(herHour());
      if (t !== get().time) setTime(null, t);
    };
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // Browser Back/Forward between / and /room, and Esc for the top layer.
  useEffect(() => {
    const onPop = () => {
      const wantRoom = location.pathname.startsWith('/room');
      const s = get();
      if (s.overlays.length && !location.pathname.startsWith('/room/phone')) {
        set({ overlays: s.overlays.filter((o) => o.kind !== 'phone') });
      }
      if (wantRoom && s.screen === 'bento') enterRoom({ push: false });
      if (!wantRoom && s.screen === 'room') leaveRoom({ push: false });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const s = get();
      if (s.overlays.length) {
        e.preventDefault();
        closeTop();
      }
    };
    addEventListener('popstate', onPop);
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('popstate', onPop);
      removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.screen = screen;
    document.body.classList.toggle('locked', screen === 'room');
  }, [screen]);

  return (
    <div className="world" data-screen={screen}>
      <div className="veil" aria-hidden="true" />
      {(roomReady || wantRoom) && (
        <Suspense fallback={null}>
          <Room />
        </Suspense>
      )}
      <Bento />
      <Header />
      <Overlays />
    </div>
  );
}
