"use client";

import { useEffect, useRef } from "react";

/** Ask the toy box to open (the tour does this before it plays with the gumball machine). */
export const openToyBox = () => window.dispatchEvent(new Event("adelia:toybox"));

/**
 * The toys, closed by default so the work comes first. It opens itself when the address points at
 * something inside it (/lab#packs from the feature list, a link from another page), or when asked.
 */
export function ToyBox({ count, children }: { count: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const reveal = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (!target || !box.contains(target) || target === box) return;
      box.open = true;
      requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
    };
    const open = () => {
      box.open = true;
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    window.addEventListener("adelia:toybox", open);
    return () => {
      window.removeEventListener("hashchange", reveal);
      window.removeEventListener("adelia:toybox", open);
    };
  }, []);

  return (
    <details ref={ref} id="toys" className="toybox scroll-mt-24">
      <summary className="toybox__summary container-page">
        <span>
          <span className="type-eyebrow block">Off the clock</span>
          <span className="type-title mt-3 block">The toys</span>
          <span className="mt-3 block max-w-[52ch] text-16 text-muted">
            {count} things I built for fun, to practise motion, physics and sound. Nothing here is needed to judge the work, so it stays closed.
          </span>
        </span>
        <span className="toybox__toggle pill" aria-hidden="true">
          <span className="toybox__open">Open the box</span>
          <span className="toybox__close">Close it</span>
        </span>
      </summary>
      <div className="pt-12">{children}</div>
    </details>
  );
}
