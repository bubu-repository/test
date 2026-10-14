"use client";

import { useId, type ReactNode } from "react";
import { MociDropShape } from "@/components/SiteAvatar";

/*
 * The dock's app icons as little illustrations, after a set of glossy app icons: a white (or vivid
 * gradient) squircle with one shaded, layered object on it. Each draws in a 48×48 box that fills
 * the tile. Gradient ids come from useId so two copies of an icon never share one.
 */

/** Tile backgrounds, glossy Frutiger Aero: white tiles carry most icons; a few get azure, aqua or grass. */
export const TILE = {
  white: "linear-gradient(180deg, #FFFFFF 0%, #EEF5FB 100%)",
  azure: "linear-gradient(160deg, #8FD3FA 0%, #2B95F0 50%, #0A5FCC 100%)",
  aqua: "linear-gradient(160deg, #D6F6FF 0%, #7FE3F7 45%, #1FB0E0 100%)",
  grass: "linear-gradient(160deg, #E4FBD0 0%, #9BE15D 55%, #3DBE4A 100%)",
  periwinkle: "linear-gradient(160deg, #E8EEFD 0%, #9DB7F5 100%)",
};

function Art({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/** Glyph ink on the white tiles: the site's navy, never graphite. */
const NAVY = "#17375C";

/** Work: a shipped parcel in azure glass, lit from the top right, with white tape and a label. */
export function BoxArt() {
  const id = useId();
  return (
    <Art>
      <defs>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EAF7FF" />
          <stop offset="1" stopColor="#CFEAFF" />
        </linearGradient>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A9DBFB" />
          <stop offset="1" stopColor="#7CC4F5" />
        </linearGradient>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3AA2F2" />
          <stop offset="1" stopColor="#1478D8" />
        </linearGradient>
      </defs>
      <ellipse cx="23" cy="41" rx="12" ry="2.6" fill="rgba(8,40,80,.16)" />
      <path d="M24 9.5 37 17v15.4L24 40 11 32.4V17Z" fill="#5DB4F3" stroke="#5DB4F3" strokeWidth="3.4" strokeLinejoin="round" />
      <path d="M24 9.5 37 17 24 24.6 11 17Z" fill={`url(#${id}t)`} />
      <path d="M11 17 24 24.6V40L11 32.4Z" fill={`url(#${id}l)`} />
      <path d="M24 24.6 37 17v15.4L24 40Z" fill={`url(#${id}r)`} />
      <path d="M26.6 11 31.6 13.9v6.4l-2.5-1.5-2.5 1.5Z" fill="#FFFFFF" />
      <path d="M14.4 27.2 20.2 30.6" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M24 9.5 37 17" stroke="#FFFFFF" strokeOpacity=".8" strokeWidth="1.2" strokeLinecap="round" />
    </Art>
  );
}

/** Lab: a white sparkle shooting across a purple sky, with a soft trail and two tiny stars. */
export function SparkleArt() {
  const id = useId();
  return (
    <Art>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#DDF0FD" />
        </linearGradient>
        <linearGradient id={`${id}tr`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".55" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity=".04" />
        </linearGradient>
      </defs>
      <path d="M19 18.5C30 20 40 25 52 31v13C40 35.5 30 31 20 28Z" fill={`url(#${id}tr)`} />
      <path d="M22 31c10 2.5 19 7.5 28 15l-5 4c-8-8-15-12.5-23-15Z" fill="#FFFFFF" opacity=".12" />
      <path
        d="M33 9.5c1.1 5.6 3.3 7.8 8.8 9.1-5.5 1.3-7.7 3.5-8.8 9.1-1.1-5.6-3.3-7.8-8.8-9.1 5.5-1.3 7.7-3.5 8.8-9.1Z"
        fill={`url(#${id}s)`}
        transform="translate(-14 2)"
        style={{ filter: "drop-shadow(0 1.5px 1.5px rgba(160,20,90,.35))" }}
      />
      <path d="M36 10.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" fill="#FFFFFF" opacity=".85" />
      <path d="M11 35l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6Z" fill="#FFFFFF" opacity=".7" />
    </Art>
  );
}

/** About: her ID card, portrait, with a navy band, a photo well and two printed lines. */
export function IdCardArt() {
  const id = useId();
  return (
    <Art>
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3A4A78" />
          <stop offset="1" stopColor="#1D2A4D" />
        </linearGradient>
      </defs>
      <ellipse cx="24" cy="41.5" rx="10" ry="2.2" fill="rgba(20,24,40,.12)" />
      <path d="M21 6h6v4h-6Z" fill="#C3CAD8" />
      <rect x="13" y="9" width="22" height="30" rx="4" fill="#FFFFFF" stroke="#D5DBE6" strokeWidth="1.2" style={{ filter: "drop-shadow(0 1.5px 1.5px rgba(20,24,40,.15))" }} />
      <path d="M13 13a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4v4H13Z" fill={`url(#${id}b)`} />
      <circle cx="18.5" cy="13" r="1.6" fill="#1A8FE8" />
      <rect x="17" y="21" width="8" height="8" rx="2" fill="#E6ECF5" />
      <circle cx="21" cy="24" r="1.8" fill="#9AA5BA" />
      <path d="M18.2 29c.6-1.8 1.6-2.6 2.8-2.6s2.2.8 2.8 2.6Z" fill="#9AA5BA" />
      <path d="M28 23h4M28 27h3" stroke="#9AA5BA" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17 34h14" stroke="#C3CAD8" strokeWidth="1.8" strokeLinecap="round" />
    </Art>
  );
}

/** Guestbook: a little round fish with a bubble, for the aquarium. */
export function FishArt() {
  return (
    <Art>
      <path d="M33 24l8-6.5v13Z" fill="#FF8F7A" />
      <ellipse cx="22" cy="24" rx="12.5" ry="10" fill="#FFFFFF" style={{ filter: "drop-shadow(0 1.5px 1.5px rgba(30,90,150,.25))" }} />
      <path d="M17 15.5c3 2.6 3 14.4 0 17" stroke="#FFB4A6" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="14.6" cy="22" r="2.1" fill="#0B1F33" />
      <circle cx="15.2" cy="21.4" r=".7" fill="#FFFFFF" />
      <circle cx="35" cy="11.5" r="2.6" fill="none" stroke="#FFFFFF" strokeWidth="1.4" />
      <circle cx="39.5" cy="7" r="1.5" fill="none" stroke="#FFFFFF" strokeWidth="1.2" />
    </Art>
  );
}

/** Copy email: a white paper plane in a blue sky with light rays. */
export function PlaneArt() {
  return (
    <Art>
      <path d="M-2 10 50 30v7L-2 18Z" fill="#FFFFFF" opacity=".14" />
      <path d="M-2 26 42 50H30L-2 33Z" fill="#FFFFFF" opacity=".1" />
      <path d="M38.5 11.5 9.5 22.5l11.6 4.6Z" fill="#FFFFFF" style={{ filter: "drop-shadow(0 1.5px 1.5px rgba(10,60,160,.3))" }} />
      <path d="M38.5 11.5 21.1 27.1l5.7 10.6Z" fill="#E1EEFF" />
      <path d="M21.1 27.1 21.6 34.6l3-3.9Z" fill="#B9D7FF" />
      <path d="M12 39l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6Z" fill="#FFFFFF" opacity=".8" />
      <path d="M39 30l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5Z" fill="#FFFFFF" opacity=".7" />
    </Art>
  );
}

/** Moci: the jelly drop with a face, the same one as the floating button. */
export function MociArt() {
  return (
    <Art>
      <ellipse cx="23" cy="41.5" rx="10" ry="2.2" fill="rgba(8,40,80,.14)" />
      <svg x="5" y="3" width="38" height="38" viewBox="0 0 100 100" overflow="visible">
        <MociDropShape />
      </svg>
    </Art>
  );
}

/** Search: a navy magnifier with a glass lens. */
export function SearchArt() {
  const id = useId();
  return (
    <Art>
      <defs>
        <radialGradient id={`${id}g`} cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#F2FAFF" />
          <stop offset="1" stopColor="#A9D8FF" />
        </radialGradient>
      </defs>
      <ellipse cx="25" cy="41" rx="11" ry="2.3" fill="rgba(20,24,40,.12)" />
      <path d="M29.5 29.5 37 37" stroke={NAVY} strokeWidth="6" strokeLinecap="round" />
      <path d="M31 31 36 36" stroke="rgba(255,255,255,.18)" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="21.5" cy="21.5" r="10" fill={`url(#${id}g)`} stroke={NAVY} strokeWidth="4.2" />
      <path d="M15.8 19.4a6.4 6.4 0 0 1 4.6-4.4" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" />
    </Art>
  );
}



/** Sound: a navy speaker, with blue waves when on and a pink cross when off. */
export function SpeakerArt({ on }: { on: boolean }) {
  return (
    <Art>
      <ellipse cx="22" cy="40.5" rx="11" ry="2.3" fill="rgba(20,24,40,.12)" />
      <path d="M10 19.5h5.5l8-7v23l-8-7H10a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z" fill={NAVY} stroke={NAVY} strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 21h3" stroke="rgba(255,255,255,.3)" strokeWidth="1.3" strokeLinecap="round" />
      {on ? (
        <>
          <path d="M28.5 19a7 7 0 0 1 0 10" stroke="#499FE3" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M33 15a12.5 12.5 0 0 1 0 18" stroke="#499FE3" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7" />
        </>
      ) : (
        <path d="m29 19.5 9 9m0-9-9 9" stroke="#1A8FE8" strokeWidth="3.2" strokeLinecap="round" />
      )}
    </Art>
  );
}

/** More: three navy dots. */
export function MoreArt() {
  return (
    <Art>
      <circle cx="14" cy="24" r="3.4" fill={NAVY} />
      <circle cx="24" cy="24" r="3.4" fill={NAVY} />
      <circle cx="34" cy="24" r="3.4" fill={NAVY} />
    </Art>
  );
}

/** CV: a white page with a blue folded corner, a portrait and lines. */
export function CvArt() {
  return (
    <Art>
      <ellipse cx="24" cy="41.5" rx="11" ry="2.2" fill="rgba(20,24,40,.12)" />
      <path d="M13 8h16l7 7v23a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z" fill="#FFFFFF" stroke="#D5DBE6" strokeWidth="1.2" style={{ filter: "drop-shadow(0 1.5px 1.5px rgba(20,24,40,.15))" }} />
      <path d="M29 8v5a2 2 0 0 0 2 2h5Z" fill="#1A8FE8" />
      <circle cx="18" cy="18" r="3.4" fill="#BFE4FA" />
      <path d="M24 16h7M24 20h5" stroke="#9AA5BA" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 26h17M15 30h17M15 34h11" stroke="#C3CAD8" strokeWidth="2" strokeLinecap="round" />
    </Art>
  );
}

/** The brief: a desk calendar with a blue band (for the More menu). */
export function CalendarArt() {
  return (
    <Art>
      <rect x="9" y="9" width="30" height="30" rx="7" fill="#FFFFFF" stroke="#D5DBE6" strokeWidth="1.2" />
      <path d="M9 16a7 7 0 0 1 7-7h16a7 7 0 0 1 7 7v2H9Z" fill="#1A8FE8" />
      <text x="24" y="34" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1D2A4D" style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}>
        40s
      </text>
    </Art>
  );
}

/** How it works: a round question mark, like a help key. */
export function HelpArt() {
  return (
    <Art>
      <circle cx="24" cy="24" r="13" fill="#FFFFFF" stroke="#1A8FE8" strokeWidth="2.4" />
      <path d="M19.6 20.4c.4-2.6 2.3-4 4.6-4 2.6 0 4.5 1.6 4.5 3.9 0 1.9-1.2 2.9-2.6 3.8-1.2.8-1.9 1.4-1.9 2.9" stroke="#0B1F33" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <circle cx="24.2" cy="31.6" r="1.7" fill="#0B1F33" />
    </Art>
  );
}
