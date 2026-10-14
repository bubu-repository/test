"use client";

import { useEffect } from "react";
import { hydrateStickers, useStickers } from "@/lib/stickers";

/** Whether this visitor has opened the case study before (the same counter the sticker uses). */
function useRead(slug: string) {
  useEffect(hydrateStickers, []);
  return useStickers((s) => !!s.counters[`cases:${slug}`]);
}

/** A small "Read" stamp on a work card you've already opened. Nothing on the ones you haven't. */
export function ReadStamp({ slug }: { slug: string }) {
  const read = useRead(slug);
  if (!read) return null;
  return (
    <span className="read-stamp">
      <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
        <path d="M2.5 6.4 5 8.8l4.6-5.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Read
    </span>
  );
}

/** The card's call to action, which knows when it's a second visit. */
export function ReadCta({ slug }: { slug: string }) {
  const read = useRead(slug);
  return <>{read ? "Read it again" : "Read the case study"}</>;
}
