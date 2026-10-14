"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { identity } from "@/content/profile";
import { useNow } from "@/lib/hooks";
import { sfx } from "@/lib/sound";
import { formatTime, probableStatus } from "@/lib/time";

/*
 * The small things on her desk, all original and all from the sea: a round seal pup hugging a desk
 * clock, a whale plush and a jellyfish keychain on a ball chain. (Her own references were licensed
 * characters; these keep their shape and softness without borrowing anyone's character.) Each one
 * is a real button, so it answers a tap as well as a hover: the whale squishes, the seal wiggles
 * and tells you the time in Bekasi, the jellyfish swings on its chain.
 */

function calm(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function bekasiTime(date: Date): { h: number; m: number; label: string } {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: identity.timeZone, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(date);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { h, m, label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
}

/** A round white seal pup hugging a desk clock that keeps Bekasi time. Tap her and she says what time it is there. */
export function SealClock() {
  const now = useNow();
  const body = useRef<SVGGElement>(null);
  const [note, setNote] = useState<{ time: string; status: string } | null>(null);
  const [shown, setShown] = useState(0);
  const t = now ? bekasiTime(new Date(now * 1000)) : { h: 10, m: 10, label: "" };
  const minute = t.m * 6;
  const hour = (t.h % 12) * 30 + t.m * 0.5;

  // Each tap keeps the bubble up for another 2.4 s.
  useEffect(() => {
    if (!shown) return;
    const timer = window.setTimeout(() => setShown(0), 2400);
    return () => window.clearTimeout(timer);
  }, [shown]);

  const tap = () => {
    const date = new Date();
    setNote({ time: formatTime(identity.timeZone, date), status: probableStatus(date).label });
    setShown((n) => n + 1);
    sfx.pop();
    if (!calm()) body.current?.animate([{ rotate: "0deg" }, { rotate: "-8deg" }, { rotate: "7deg" }, { rotate: "-4deg" }, { rotate: "2deg" }, { rotate: "0deg" }], { duration: 640, easing: "ease-in-out" });
  };

  return (
    <>
      <button type="button" className="toy toy--seal" data-cursor="Tap" aria-label={t.label ? `Desk clock, a seal pup: ${t.label} in ${identity.city}. Tap to ask what she's up to.` : `Desk clock, a seal pup, on ${identity.city} time. Tap to ask what she's up to.`} onClick={tap}>
        <svg className="seal" viewBox="0 0 120 116" aria-hidden="true" focusable="false">
          <defs>
            {/* Lit from the top right, like everything on the desk. */}
            <radialGradient id="seal-body" cx="62%" cy="30%" r="75%">
              <stop offset="0" stopColor="#FFFFFF" />
              <stop offset=".7" stopColor="#EEF4FA" />
              <stop offset="1" stopColor="#CFDDEB" />
            </radialGradient>
            <radialGradient id="seal-shade">
              <stop offset="0" stopColor="#082850" stopOpacity=".2" />
              <stop offset="1" stopColor="#082850" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="seal-contact">
              <stop offset=".55" stopColor="#082850" stopOpacity=".34" />
              <stop offset="1" stopColor="#082850" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Her shadow stays on the desk when she wiggles: an ambient pool, a little to the left, and a tight contact line. */}
          <ellipse cx="53" cy="109" rx="50" ry="7" fill="url(#seal-shade)" />
          <ellipse cx="58.5" cy="107.6" rx="36" ry="2.6" fill="url(#seal-contact)" />
          <g ref={body} className="seal__body">
            <path d="M60 14c30 0 50 22 50 50 0 30-20 44-50 44S10 94 10 64c0-28 20-50 50-50Z" fill="url(#seal-body)" />
            <ellipse cx="36" cy="58" rx="7" ry="4.5" fill="#FFB4A6" opacity=".55" />
            <ellipse cx="84" cy="58" rx="7" ry="4.5" fill="#FFB4A6" opacity=".55" />
            <circle cx="44" cy="48" r="4.6" fill="#0B1F33" />
            <circle cx="76" cy="48" r="4.6" fill="#0B1F33" />
            <circle cx="45.6" cy="46.4" r="1.5" fill="#FFFFFF" />
            <circle cx="77.6" cy="46.4" r="1.5" fill="#FFFFFF" />
            <ellipse cx="60" cy="55" rx="3.4" ry="2.3" fill="#0B1F33" />
            <path d="M55 60c1.6 2 3.4 2 5 0 1.6 2 3.4 2 5 0" stroke="#0B1F33" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <g fill="#9AAABB">
              <circle cx="50" cy="60" r=".9" />
              <circle cx="47" cy="63" r=".9" />
              <circle cx="70" cy="60" r=".9" />
              <circle cx="73" cy="63" r=".9" />
            </g>
            {/* The clock, held against her tummy. */}
            <circle cx="60" cy="86" r="20" fill="#FFFFFF" stroke="#8FD3FA" strokeWidth="3.4" />
            {Array.from({ length: 12 }, (_, i) => (
              <path key={i} d="M60 69.5v3" stroke={i % 3 === 0 ? "#0A58BE" : "#BFD6EA"} strokeWidth={i % 3 === 0 ? 2 : 1.4} strokeLinecap="round" transform={`rotate(${i * 30} 60 86)`} />
            ))}
            <path d="M60 86V76.5" stroke="#0B1F33" strokeWidth="2.6" strokeLinecap="round" transform={`rotate(${hour} 60 86)`} />
            <path d="M60 86V72" stroke="#1A8FE8" strokeWidth="1.8" strokeLinecap="round" transform={`rotate(${minute} 60 86)`} />
            <circle cx="60" cy="86" r="2" fill="#0B1F33" />
            <ellipse cx="38" cy="90" rx="9" ry="6" fill="url(#seal-body)" transform="rotate(-30 38 90)" />
            <ellipse cx="82" cy="90" rx="9" ry="6" fill="url(#seal-body)" transform="rotate(30 82 90)" />
          </g>
        </svg>
      </button>
      {/* Always in the page, so a screen reader hears it when it fills. */}
      <span className="toy__bubble" aria-live="polite" data-show={shown ? "" : undefined}>
        {note && (
          <>
            <b>
              {note.time} in {identity.city}
            </b>{" "}
            {note.status}
          </>
        )}
      </span>
    </>
  );
}

/** A soft whale plush, with a stitched belly and a little spout. Squeeze it and it squishes and springs back. */
export function WhalePlush() {
  const squeeze = (e: MouseEvent<HTMLButtonElement>) => {
    sfx.boop();
    // Enter has no :active, so a keyboard press squeezes it for a moment by hand.
    if (e.detail === 0) {
      const el = e.currentTarget;
      el.dataset.squeeze = "";
      window.setTimeout(() => delete el.dataset.squeeze, 120);
    }
  };
  return (
    <button type="button" className="toy toy--whale" data-cursor="Squeeze" aria-label="Squeeze the whale plush" onClick={squeeze}>
      <svg className="whale" viewBox="0 0 150 104" aria-hidden="true" focusable="false">
        <defs>
          {/* Same hand as the seal: pale felt, lit from the top right. */}
          <radialGradient id="whale-body" cx="62%" cy="22%" r="82%">
            <stop offset="0" stopColor="#E3F5FF" />
            <stop offset=".55" stopColor="#C4E6FB" />
            <stop offset="1" stopColor="#9BD3F7" />
          </radialGradient>
          <radialGradient id="whale-shade">
            <stop offset="0" stopColor="#082850" stopOpacity=".2" />
            <stop offset="1" stopColor="#082850" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="whale-contact">
            <stop offset=".55" stopColor="#082850" stopOpacity=".32" />
            <stop offset="1" stopColor="#082850" stopOpacity="0" />
          </radialGradient>
          {/* A slightly fuzzy edge, like brushed minky. */}
          <filter id="whale-fuzz" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="4" result="fuzz" />
            <feDisplacementMap in="SourceGraphic" in2="fuzz" scale="1.2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <ellipse cx="62" cy="99" rx="62" ry="6.5" fill="url(#whale-shade)" />
        <ellipse cx="67" cy="96.4" rx="44" ry="2.6" fill="url(#whale-contact)" />
        <g className="whale__body">
          <g filter="url(#whale-fuzz)">
            <path d="M118 62c8-6 12-18 22-22-2 10-4 16-10 22 8 0 12 4 14 10-10 0-18-2-26-6Z" fill="#7CC4F5" />
            <path d="M14 66c0-26 22-40 52-40 32 0 56 16 56 40s-24 30-56 30S14 90 14 66Z" fill="url(#whale-body)" />
            <path d="M22 74c10 12 30 18 48 18s38-4 48-14c-14 4-30 6-48 6S34 82 22 74Z" fill="#F4FBFF" />
          </g>
          <path d="M24 75c14 9 30 13 46 13s32-3 46-11" stroke="rgba(40,120,190,.4)" strokeWidth="1.3" strokeDasharray="3 3" fill="none" />
          <path d="M30 36c16-8 46-10 66-2" stroke="rgba(255,255,255,.8)" strokeWidth="1.3" strokeDasharray="3 3" fill="none" />
          <circle cx="36" cy="60" r="3.4" fill="#0B1F33" />
          <circle cx="37.2" cy="58.8" r="1.1" fill="#FFFFFF" />
          <ellipse cx="32" cy="69" rx="5.5" ry="3.2" fill="#FFB4A6" opacity=".7" />
          <path d="M60 80c4 8 12 10 18 8-4-2-8-6-10-10Z" fill="#8CCBF6" />
          <path d="M50 24c-2-8 2-14 4-18M54 24c2-7 8-10 12-11" stroke="#9BD3F7" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      </svg>
    </button>
  );
}

/** A jellyfish plush on a ball chain, hanging off the monitor and swaying. Poke it and it swings. */
export function JellyKeychain() {
  const poke = (e: MouseEvent<HTMLButtonElement>) => {
    sfx.jingle();
    if (calm()) return;
    // Pushed away from wherever the finger came from (or to the right, from a key).
    const r = e.currentTarget.getBoundingClientRect();
    const dir = e.detail !== 0 && e.clientX > r.left + r.width / 2 ? -1 : 1;
    const swing = [0, 24, -15, 9, -4, 1.5, 0];
    e.currentTarget.animate(
      swing.map((a) => ({ rotate: `${a * dir}deg`, easing: "ease-in-out" })),
      { duration: 1500 },
    );
  };
  return (
    <button type="button" className="toy toy--jelly" data-cursor="Poke" aria-label="Poke the jellyfish keychain" onClick={poke}>
      <svg className="jelly" viewBox="0 0 60 150" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="jelly-dome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#D6F6FF" />
            <stop offset="1" stopColor="#5ED0E6" />
          </linearGradient>
        </defs>
        <path d="M30 0v66" stroke="#B9C6D3" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="0 6.5" />
        <circle cx="30" cy="72" r="5" fill="none" stroke="#B9C6D3" strokeWidth="2.2" />
        <path d="M16 112c0 8 2 18-2 26M25 113c0 10 3 16 0 28M35 113c0 10-3 16 0 28M44 112c0 8-2 18 2 26" stroke="#7FD7FF" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M8 110c0-16 10-30 22-30s22 14 22 30c-4 4-8 4-11 2-3 3-8 3-11 0-3 3-8 3-11 0-3 2-7 2-11-2Z" fill="url(#jelly-dome)" />
        <ellipse cx="38" cy="89" rx="5" ry="3" fill="#FFFFFF" opacity=".6" transform="rotate(20 38 89)" />
        <circle cx="23" cy="100" r="2.2" fill="#0B1F33" />
        <circle cx="37" cy="100" r="2.2" fill="#0B1F33" />
        <ellipse cx="18" cy="105" rx="3.2" ry="2" fill="#FFB4A6" opacity=".75" />
        <ellipse cx="42" cy="105" rx="3.2" ry="2" fill="#FFB4A6" opacity=".75" />
      </svg>
    </button>
  );
}
