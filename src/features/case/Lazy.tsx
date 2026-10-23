/* ==========================================================================
   Lazy, deferred mockups. The screens module (~20 coded product screens,
   wireframes, the flow player and ~1.7k lines of CSS) is fetched once, and
   each phone only mounts when it comes within ~a screen of the reader, with
   a same-size placeholder until then, so nothing jumps and a cheap phone
   only paints what's near.
   ========================================================================== */
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { useCase } from './env';

const kit = () => import('./screens/kit');
const LScreen = lazy(() => kit().then((m) => ({ default: m.Screen })));
const LWire = lazy(() => kit().then((m) => ({ default: m.Wire })));
const LFlow = lazy(() => kit().then((m) => ({ default: m.FlowPlayer })));

/** Start fetching the screens early (e.g. when a poster is hovered). */
export const preloadScreens = () => void kit();

/** true once the element has come within `margin` of the visible part of the scroller. */
function useNear(margin = '900px') {
  const { scrollRoot, mode } = useCase();
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === 'undefined') return setNear(true);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { root: scrollRoot, rootMargin: `${margin} 0px ${margin} 0px` },
    );
    // in the room, wait for the panel to finish tipping in (its 3D transform skews intersections)
    const tipping = mode === 'room' && !!scrollRoot?.closest<HTMLElement>('.panel')?.getAnimations?.().length;
    const t = setTimeout(() => io.observe(el), tipping ? 820 : 0);
    return () => {
      clearTimeout(t);
      io.disconnect();
    };
  }, [scrollRoot, near, margin, mode]);
  return [ref, near] as const;
}

export function PhonePlaceholder({ className = '' }: { className?: string }) {
  return (
    <div className={`dp dp--ph ${className}`} aria-hidden>
      <div className="dp__frame">
        <div className="dp__screen" />
      </div>
    </div>
  );
}

function Deferred({ className, fallback, children }: { className?: string; fallback: ReactNode; children: ReactNode }) {
  const [ref, near] = useNear();
  return (
    <div ref={ref} className={className}>
      {near ? <Suspense fallback={fallback}>{children}</Suspense> : fallback}
    </div>
  );
}

export function Screen({ id, label, className = '' }: { id: string; label?: string; className?: string }) {
  return (
    <Deferred className={`cf-phone ${className}`} fallback={<PhonePlaceholder />}>
      <LScreen id={id} label={label} />
    </Deferred>
  );
}

export function Wire({ slug, n, label }: { slug: string; n: number; label: string }) {
  return (
    <Deferred className="cf-phone" fallback={<PhonePlaceholder />}>
      <LWire slug={slug} n={n} label={label} />
    </Deferred>
  );
}

export function FlowPlayer({ slug, name }: { slug: string; name: string }) {
  const { tick } = useCase();
  return (
    <Deferred fallback={<div className="cf-flow-ph" aria-hidden />}>
      <LFlow slug={slug} name={name} onTick={tick} />
    </Deferred>
  );
}
