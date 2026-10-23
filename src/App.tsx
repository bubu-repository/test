import { lazy, Suspense, useEffect, useState } from 'react';
import { useMatch } from './lib/router';
import { getContent } from './lib/api';

const Experience = lazy(() => import('./Experience'));
const Admin = lazy(() => import('./features/admin/AdminApp'));
const LaunchPage = lazy(() => import('./features/launch/LaunchPage'));
// The plain case-study pages: no plate, no 3D, no room bundle.
const WorkPage = lazy(() => import('./features/case/WorkPage'));

/**
 * `/?go=<station>[&work=<slug>][&ask=<question>]`: skip the door and walk straight to an object
 * (the /work pages use it for "Book a chat" → the printer, and "Ask Moci"). The room modules are
 * imported here only when asked, so they still arrive in the room's own chunks.
 */
function useGoIntent(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const q = new URLSearchParams(location.search);
    const go = q.get('go');
    if (!go) return;
    let cancelled = false;
    let off = () => {};
    Promise.all([import('./state/ui'), import('./stage/director'), import('./stage/stations')]).then(([{ useUI }, director, { STATIONS }]) => {
      if (cancelled || go === 'door' || !Object.prototype.hasOwnProperty.call(STATIONS, go)) return;
      const station = go as keyof typeof STATIONS;
      const props: Record<string, unknown> = {};
      const work = q.get('work');
      if (work) props.work = work.slice(0, 40);
      const ask = q.get('ask');
      if (ask) {
        props.ask = ask.slice(0, 300);
        props.nonce = Date.now();
      }
      // a reload shouldn't repeat the walk
      history.replaceState(history.state, '', '/');
      const run = () => {
        if (useUI.getState().phase !== 'room') director.enterImmediately();
        setTimeout(() => !cancelled && director.focus(station, props), 900);
      };
      if (useUI.getState().phase !== 'loading') run();
      else
        off = useUI.subscribe((s) => {
          if (s.phase === 'loading') return;
          off();
          run();
        });
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [active]);
}

export default function App() {
  const { route, slug } = useMatch();
  // When "launch mode" is switched on in the admin, the public site shows the
  // coming-soon page instead of the room (append ?preview=1 to bypass).
  // The /work pages stay readable either way.
  const [launchMode, setLaunchMode] = useState(false);
  useEffect(() => {
    if (route !== 'experience') return;
    const bypass = new URLSearchParams(location.search).has('preview');
    getContent().then((c) => setLaunchMode(!!c.launch.enabled && !bypass));
  }, [route]);

  useEffect(() => {
    document.body.classList.toggle('scrollable', route !== 'experience' || launchMode);
  }, [route, launchMode]);

  useGoIntent(route === 'experience' && !launchMode);

  return (
    <Suspense fallback={null}>
      {route === 'admin' ? (
        <Admin />
      ) : route === 'work' ? (
        <WorkPage slug={slug} />
      ) : route === 'launch' || launchMode ? (
        <LaunchPage />
      ) : (
        <Experience />
      )}
    </Suspense>
  );
}
