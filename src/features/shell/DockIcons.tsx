"use client";

import { useId, type ReactNode } from "react";

/*
 * The dock's app icons as little illustrations, after a set of glossy app icons: a white (or vivid
 * gradient) squircle with one shaded, layered object on it. Each draws in a 48×48 box that fills
 * the tile. Gradient ids come from useId so two copies of an icon never share one.
 */

/** Tile backgrounds. White tiles carry most icons; a few get a vivid gradient. */
export const TILE = {
  white: "linear-gradient(180deg, #FFFFFF 0%, #EEF1F6 100%)",
  purple: "linear-gradient(155deg, #C7ADFF 0%, #9D6CFF 46%, #7442F0 100%)",
  blue: "linear-gradient(160deg, #84D4FF 0%, #2C9DFF 50%, #1670EE 100%)",
  lime: "linear-gradient(210deg, #A8F25A 0%, #7EE05C 38%, #CDF3D2 80%, #DCEBFF 100%)",
  navy: "linear-gradient(180deg, #3D4E88 0%, #18234F 100%)",
};

function Art({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

const GRAPHITE = "#2B2D34";

/** Work: a shipped package, a soft graphite box with a white tab and a label slot. */
export function BoxArt() {
  const id = useId();
  return (
    <Art>
      <defs>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7A7E8A" />
          <stop offset="1" stopColor="#555963" />
        </linearGradient>
        <linearGradient id={`${id}l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#474A54" />
          <stop offset="1" stopColor="#30323A" />
        </linearGradient>
      </defs>
      <ellipse cx="24" cy="41" rx="12" ry="2.6" fill="rgba(20,24,40,.16)" />
      <path d="M24 9.5 37 17v15.4L24 40 11 32.4V17Z" fill={GRAPHITE} stroke={GRAPHITE} strokeWidth="3.4" strokeLinejoin="round" />
      <path d="M24 9.5 37 17 24 24.6 11 17Z" fill={`url(#${id}t)`} />
      <path d="M11 17 24 24.6V40L11 32.4Z" fill={`url(#${id}l)`} />
      <path d="M24 24.6 37 17v15.4L24 40Z" fill="#26282E" />
      <path d="M26.6 11 31.6 13.9v6.4l-2.5-1.5-2.5 1.5Z" fill="#F4F6FA" />
      <path d="M14.4 27.2 20.2 30.6" stroke="#F4F6FA" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M24 9.5 37 17" stroke="rgba(255,255,255,.35)" strokeWidth="1" strokeLinecap="round" />
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
          <stop offset="1" stopColor="#E6DCFF" />
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
        style={{ filter: "drop-shadow(0 1.5px 1.5px rgba(70,30,160,.35))" }}
      />
      <path d="M36 10.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" fill="#FFFFFF" opacity=".85" />
      <path d="M11 35l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6Z" fill="#FFFFFF" opacity=".7" />
    </Art>
  );
}

/** About: a smiley face sticker with a blue verified badge stuck on its corner. */
export function SmileyArt() {
  const id = useId();
  const scallop = (cx: number, cy: number, r: number, bump: number) =>
    Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      return <circle key={i} cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r} r={bump} />;
    });
  return (
    <Art>
      <defs>
        <radialGradient id={`${id}y`} cx=".4" cy=".35" r=".75">
          <stop offset="0" stopColor="#FFE680" />
          <stop offset=".7" stopColor="#FFD23F" />
          <stop offset="1" stopColor="#F5B800" />
        </radialGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4DB0FF" />
          <stop offset="1" stopColor="#1673F0" />
        </linearGradient>
      </defs>
      <ellipse cx="22" cy="36" rx="11" ry="2.4" fill="rgba(20,24,40,.12)" />
      <circle cx="21" cy="21.5" r="12.6" fill="#FFFFFF" style={{ filter: "drop-shadow(0 1.5px 2px rgba(20,24,40,.18))" }} />
      <circle cx="21" cy="21.5" r="10.4" fill={`url(#${id}y)`} />
      <ellipse cx="17.6" cy="19.6" rx="1.3" ry="1.9" fill="#2B2B33" />
      <ellipse cx="24.4" cy="19.6" rx="1.3" ry="1.9" fill="#2B2B33" />
      <path d="M16 24.2c2.8 3.4 7.2 3.4 10 0" stroke="#2B2B33" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <g fill="#FFFFFF" style={{ filter: "drop-shadow(0 1.5px 1.5px rgba(20,24,40,.2))" }}>
        <circle cx="33" cy="32" r="7.4" />
        {scallop(33, 32, 6.3, 2.7)}
      </g>
      <g fill={`url(#${id}b)`}>
        <circle cx="33" cy="32" r="5.6" />
        {scallop(33, 32, 5, 1.75)}
      </g>
      <path d="M30.2 32.2l2 2 3.9-4.2" stroke="#FFFFFF" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Art>
  );
}

/** Guestbook: a graphite speech bubble with googly eyes, as a die-cut sticker. */
export function BubbleArt() {
  return (
    <Art>
      <ellipse cx="24" cy="40.5" rx="12" ry="2.4" fill="rgba(20,40,20,.14)" />
      <path d="M15 11h18a8 8 0 0 1 8 8v6.5a8 8 0 0 1-8 8H21.5l-6.5 5.2v-5.4A8 8 0 0 1 7 25.5V19a8 8 0 0 1 8-8Z" fill="#FFFFFF" style={{ filter: "drop-shadow(0 1.5px 2px rgba(20,40,20,.22))" }} />
      <path d="M15.3 13.4h17.4a5.8 5.8 0 0 1 5.8 5.8v6.2a5.8 5.8 0 0 1-5.8 5.8H21l-4.3 3.4v-3.5A5.8 5.8 0 0 1 9.5 25.4v-6.2a5.8 5.8 0 0 1 5.8-5.8Z" fill={GRAPHITE} />
      <path d="M12 16.5c1.2-1.6 2.8-2.3 4.6-2.3" stroke="rgba(255,255,255,.35)" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <circle cx="19" cy="21.6" r="4.4" fill="#FFFFFF" />
      <circle cx="29" cy="21.6" r="4.4" fill="#FFFFFF" />
      <circle cx="20" cy="22.6" r="2.1" fill="#16171B" />
      <circle cx="30" cy="22.6" r="2.1" fill="#16171B" />
      <circle cx="20.6" cy="21.9" r=".6" fill="#FFFFFF" />
      <circle cx="30.6" cy="21.9" r=".6" fill="#FFFFFF" />
      <path d="M22.4 27.4c1 .9 2.2.9 3.2 0" stroke="#FFFFFF" strokeWidth="1.3" fill="none" strokeLinecap="round" />
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

/** Moci, the jelly: sky blue with an iridescent glow, little arms, dark blue eyes and smile. */
export function MociArt() {
  const id = useId();
  return (
    <Art>
      <defs>
        <radialGradient id={`${id}j`} cx=".5" cy=".15" r="1">
          <stop offset="0" stopColor="#E6F7FF" />
          <stop offset=".45" stopColor="#A6DEFA" />
          <stop offset=".85" stopColor="#5EC4F2" />
        </radialGradient>
        <radialGradient id={`${id}p`}>
          <stop offset="0" stopColor="#FFA8D4" stopOpacity=".9" />
          <stop offset="1" stopColor="#FFA8D4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}y`}>
          <stop offset="0" stopColor="#FFEC96" stopOpacity=".95" />
          <stop offset="1" stopColor="#FFEC96" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}m`}>
          <stop offset="0" stopColor="#56ECD6" stopOpacity=".85" />
          <stop offset="1" stopColor="#56ECD6" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}c`}>
          <path d="M24 9.5c8.6 0 13.4 6.6 13.4 15 0 5.6 1.6 9.6 1.6 11.6 0 3-6.6 4.4-15 4.4s-15-1.4-15-4.4c0-2 1.6-6 1.6-11.6 0-8.4 4.8-15 13.4-15Z" />
        </clipPath>
      </defs>
      <ellipse cx="24" cy="41.6" rx="12" ry="2.2" fill="rgba(20,90,160,.16)" />
      <ellipse cx="9.6" cy="29" rx="3.4" ry="5" transform="rotate(40 9.6 29)" fill="#7FD0F5" />
      <ellipse cx="38.4" cy="29" rx="3.4" ry="5" transform="rotate(-40 38.4 29)" fill="#7FD0F5" />
      <g clipPath={`url(#${id}c)`}>
        <rect x="0" y="0" width="48" height="48" fill={`url(#${id}j)`} />
        <ellipse cx="19" cy="20" rx="9" ry="7" fill={`url(#${id}p)`} />
        <ellipse cx="28" cy="23" rx="9" ry="7" fill={`url(#${id}y)`} />
        <ellipse cx="23" cy="31" rx="11" ry="7" fill={`url(#${id}m)`} />
        <path d="M9 34c6 4 24 4 30 0v8H9Z" fill="#3FB2EA" opacity=".35" />
      </g>
      <ellipse cx="17.6" cy="15" rx="3.2" ry="2" transform="rotate(-25 17.6 15)" fill="#FFFFFF" opacity=".95" />
      <rect x="23.1" y="18.6" width="2.1" height="4.4" rx="1.05" fill="#2A64AD" />
      <rect x="30.1" y="18.6" width="2.1" height="4.4" rx="1.05" fill="#2A64AD" />
      <path d="M23.4 26.2c1.8 1.8 5.6 1.8 7.4 0" stroke="#2A64AD" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </Art>
  );
}

/** Search: a graphite magnifier with a glass lens. */
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
      <path d="M29.5 29.5 37 37" stroke={GRAPHITE} strokeWidth="6" strokeLinecap="round" />
      <path d="M31 31 36 36" stroke="rgba(255,255,255,.18)" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="21.5" cy="21.5" r="10" fill={`url(#${id}g)`} stroke={GRAPHITE} strokeWidth="4.2" />
      <path d="M15.8 19.4a6.4 6.4 0 0 1 4.6-4.4" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" />
    </Art>
  );
}

/** Night: a cream crescent moon with craters, and two stars. */
export function MoonArt() {
  const id = useId();
  return (
    <Art>
      <defs>
        <linearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF6D2" />
          <stop offset="1" stopColor="#F2CF6A" />
        </linearGradient>
      </defs>
      <path d="M33.5 30.8A13 13 0 0 1 19.2 11.6a13 13 0 1 0 14.3 19.2Z" fill={`url(#${id}m)`} style={{ filter: "drop-shadow(0 1.5px 2px rgba(0,0,0,.35))" }} />
      <circle cx="17" cy="27" r="1.8" fill="#E4BD55" opacity=".7" />
      <circle cx="22.5" cy="32.5" r="1.2" fill="#E4BD55" opacity=".7" />
      <path d="M34 11l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7Z" fill="#FFFFFF" />
      <path d="M38.5 20l.4 1.1 1.1.4-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4Z" fill="#FFFFFF" opacity=".75" />
    </Art>
  );
}

/** Day (shown at night): a puffy white cloud on blue. */
export function CloudArt() {
  return (
    <Art>
      <path d="M-2 12 50 30v6L-2 18Z" fill="#FFFFFF" opacity=".14" />
      <path d="M14.5 34a6.5 6.5 0 0 1-.9-12.9A9.5 9.5 0 0 1 32 19.4a7.3 7.3 0 0 1 2.2 14.6Z" fill="#FFFFFF" style={{ filter: "drop-shadow(0 2px 2px rgba(10,60,160,.3))" }} />
      <path d="M14 30.5h20" stroke="#DCEBFF" strokeWidth="2.4" strokeLinecap="round" />
    </Art>
  );
}

/** Sound: a graphite speaker, with blue waves when on and a pink cross when off. */
export function SpeakerArt({ on }: { on: boolean }) {
  return (
    <Art>
      <ellipse cx="22" cy="40.5" rx="11" ry="2.3" fill="rgba(20,24,40,.12)" />
      <path d="M10 19.5h5.5l8-7v23l-8-7H10a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z" fill={GRAPHITE} stroke={GRAPHITE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 21h3" stroke="rgba(255,255,255,.3)" strokeWidth="1.3" strokeLinecap="round" />
      {on ? (
        <>
          <path d="M28.5 19a7 7 0 0 1 0 10" stroke="#2C9DFF" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M33 15a12.5 12.5 0 0 1 0 18" stroke="#2C9DFF" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7" />
        </>
      ) : (
        <path d="m29 19.5 9 9m0-9-9 9" stroke="#FF3F86" strokeWidth="3.2" strokeLinecap="round" />
      )}
    </Art>
  );
}

/** More: three graphite dots. */
export function MoreArt() {
  return (
    <Art>
      <circle cx="14" cy="24" r="3.4" fill={GRAPHITE} />
      <circle cx="24" cy="24" r="3.4" fill={GRAPHITE} />
      <circle cx="34" cy="24" r="3.4" fill={GRAPHITE} />
    </Art>
  );
}
