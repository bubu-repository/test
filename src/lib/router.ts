import { useSyncExternalStore } from 'react';

/**
 * Tiny history router.
 *   /                 the room ('experience')   ?go=<station>[&work=…][&ask=…] walks straight to an object
 *   /admin            the dashboard
 *   /launch           the coming-soon page (also /coming-soon, ?view=launch)
 *   /work             the case studies as a plain page
 *   /work/:slug       one case study as a plain page (shareable, fast, no room)
 */
export type Route = 'experience' | 'admin' | 'launch' | 'work';

export interface Match {
  route: Route;
  /** /work/:slug → slug (lower-cased); undefined on /work itself */
  slug?: string;
}

/** A stable string for the current location (useSyncExternalStore needs a comparable snapshot). */
function key(): string {
  const segs = location.pathname
    .replace(/\/+$/, '')
    .split('/')
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });
  if (segs[0]?.toLowerCase() === 'work') return segs[1] ? `work:${segs[1].toLowerCase()}` : 'work';
  const q = new URLSearchParams(location.search).get('view');
  const last = q || segs[segs.length - 1] || '';
  if (last === 'admin') return 'admin';
  if (last === 'launch' || last === 'coming-soon') return 'launch';
  return 'experience';
}

function toMatch(k: string): Match {
  if (k.startsWith('work:')) return { route: 'work', slug: k.slice(5) };
  return { route: k as Route };
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
window.addEventListener('popstate', emit);

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  if (opts.replace) history.replaceState(null, '', path);
  else history.pushState(null, '', path);
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** The current route and its params. */
export function useMatch(): Match {
  const k = useSyncExternalStore(subscribe, key, () => 'experience');
  return toMatch(k);
}

export function useRoute(): Route {
  return useMatch().route;
}

/** Same-tab navigation for a plain left click on an <a href>; modified clicks open as usual. */
export function linkClick(
  e: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; defaultPrevented: boolean; preventDefault: () => void },
  path: string,
) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  navigate(path);
}
