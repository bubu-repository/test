/* The case file is read in two places: inside the room (a tall panel on the
   Wall of Work) and on the plain /work/:slug page. This context carries what
   differs between them: where the scrolling happens, the heading levels, the
   room's sounds, and what "ask", "book" and "open another case" do. */
import { createContext, createElement, useContext, type HTMLAttributes } from 'react';

export interface CaseEnv {
  mode: 'room' | 'page';
  /** the element that scrolls the case (null = the window) */
  scrollRoot: HTMLElement | null;
  /** heading level of the case's name (page: 1, inside the room's dialog: 2) */
  base: 1 | 2;
  /** a soft UI tick (the room has sound; the page doesn't) */
  tick?: () => void;
  /** "Ask Moci about …" */
  onAsk: (question: string) => void;
  /** "Book a chat" */
  onBook: () => void;
  /** open another case (keep reading) */
  onOpen: (slug: string) => void;
  /** a real href for another case, so links can be shared / opened in a new tab */
  hrefFor: (slug: string) => string;
  /** the reader reached the end of a case */
  onRead?: (slug: string) => void;
}

export const CaseCtx = createContext<CaseEnv>({
  mode: 'page',
  scrollRoot: null,
  base: 1,
  onAsk: () => {},
  onBook: () => {},
  onOpen: () => {},
  hrefFor: (slug) => `/work/${slug}`,
});

export const useCase = () => useContext(CaseCtx);

/** A heading `depth` levels below the case's name (0 = the name itself). */
export function H({ depth, ...rest }: { depth: 0 | 1 | 2 | 3 } & HTMLAttributes<HTMLHeadingElement>) {
  const { base } = useCase();
  return createElement(`h${Math.min(6, base + depth)}`, rest);
}

export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * An element's top inside a scroller, from layout offsets (not getBoundingClientRect, which is
 * meaningless while the room's panel is still tipping in with a 3D transform). The scroller has to
 * be positioned so it sits in the offsetParent chain.
 */
export function offsetWithin(el: HTMLElement, root: HTMLElement): number {
  let top = 0;
  let n: HTMLElement | null = el;
  while (n && n !== root) {
    top += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  if (n === root) return top;
  return el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
}

/** Scroll an element into view inside whatever scrolls the case. */
export function scrollToEl(el: HTMLElement | null, root: HTMLElement | null, offset = 12, instant = false) {
  if (!el) return;
  const behavior: ScrollBehavior = instant || reducedMotion() ? 'auto' : 'smooth';
  if (root) {
    root.scrollTo({ top: offsetWithin(el, root) - offset, behavior });
  } else {
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior });
  }
}
