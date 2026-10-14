"use client";

import { useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { applySound, getSound } from "@/lib/preferences";
import { ambience, sfx } from "@/lib/sound";

const serverOff = () => false;

/** Turns the ambient sea on and off (and sound on, if it was off: the press is the permission). */
export function SeaSoundToggle({ className }: { className?: string }) {
  const on = useSyncExternalStore(ambience.subscribe, ambience.isOn, serverOff);
  return (
    <button
      type="button"
      className={className ?? "pill js-only"}
      data-size="sm"
      aria-pressed={on}
      data-sfx="off"
      onClick={() => {
        if (on) return ambience.stop();
        if (!getSound()) applySound(true, { persist: true });
        sfx.plop();
        ambience.start();
      }}
    >
      <span aria-hidden="true">{on ? "〰" : "🌊"}</span> {on ? "Stop the sea" : "Listen to the sea"}
    </button>
  );
}

type Ripple = { id: number; x: number; y: number };

/**
 * The ocean card at the bottom of every page: a strip of summer sky with drifting clouds, the
 * horizon with a little island (palms, a beach umbrella), lines of swell drifting at different
 * speeds, glitter on the water, a paper boat and gulls. Tap the water and it ripples, plops, and the
 * boat sails over. The footer's spec plate floats on it.
 */
export function Sea({ children }: { children: ReactNode }) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [boat, setBoat] = useState(22);
  const [hop, setHop] = useState(0);
  const id = useRef(0);

  const splash = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest(".sea__content, .sea__sky, button, a")) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const ripple = { id: ++id.current, x, y };
    setRipples((list) => [...list.slice(-5), ripple]);
    window.setTimeout(() => setRipples((list) => list.filter((p) => p.id !== ripple.id)), 1300);
    setBoat(Math.max(4, Math.min(90, (x / r.width) * 100 - 3)));
    sfx.plop();
  };

  return (
    <div className="sea" onPointerDown={splash} data-cursor="Splash">
      <div className="sea__sky" aria-hidden="true">
        <div className="sky__clouds sky__clouds--far" />
      </div>
      <span className="sea__gull" aria-hidden="true" style={{ "--y": "-92px", "--t": "26s", "--d": "2s" } as CSSProperties} />
      <span className="sea__gull" aria-hidden="true" style={{ "--y": "-58px", "--t": "34s", "--d": "11s" } as CSSProperties} />
      {/* A little island on the horizon: sand, two palms, a beach umbrella. */}
      <svg className="sea__island" viewBox="0 0 170 76" aria-hidden="true">
        <path d="M6 70 Q 85 40 164 70 Z" fill="#F6DC9A" />
        <path d="M20 70 Q 85 50 150 70 Z" fill="#FBE7B4" />
        <path d="M66 66 C 63 50 60 38 67 24" stroke="#9A6B3F" strokeWidth="3.6" fill="none" strokeLinecap="round" />
        <path d="M104 66 C 106 54 109 44 101 32" stroke="#9A6B3F" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <g className="sea__palm" style={{ transformOrigin: "67px 24px" }}>
          <path d="M67 24 C 56 16 44 18 36 26 C 47 22 57 22 67 24 Z" fill="#4FB772" />
          <path d="M67 24 C 72 12 84 8 94 12 C 84 14 75 18 67 24 Z" fill="#3A965C" />
          <path d="M67 24 C 60 12 62 4 70 0 C 68 9 68 16 67 24 Z" fill="#5FCE8C" />
          <path d="M67 24 C 78 22 88 28 92 36 C 84 30 76 27 67 24 Z" fill="#4FB772" />
          <path d="M67 24 C 58 26 52 32 50 40 C 56 33 61 28 67 24 Z" fill="#3A965C" />
          <circle cx="66" cy="27" r="2.2" fill="#7A4E2A" />
          <circle cx="70" cy="26" r="2" fill="#7A4E2A" />
        </g>
        <g className="sea__palm sea__palm--2" style={{ transformOrigin: "101px 32px" }}>
          <path d="M101 32 C 92 26 82 28 76 34 C 85 31 93 31 101 32 Z" fill="#3A965C" />
          <path d="M101 32 C 106 22 116 20 124 24 C 116 26 108 28 101 32 Z" fill="#4FB772" />
          <path d="M101 32 C 96 22 98 15 104 12 C 102 20 102 26 101 32 Z" fill="#5FCE8C" />
          <path d="M101 32 C 110 31 117 36 120 42 C 114 37 108 34 101 32 Z" fill="#3A965C" />
        </g>
        <path d="M134 66 L 134 50" stroke="#ffffff" strokeWidth="1.6" />
        <path d="M122 51 Q 134 40 146 51 Z" fill="#D8588F" />
        <path d="M128 51 Q 134 42 140 51 Z" fill="#ffffff" />
      </svg>
      <div className="sea__surface" aria-hidden="true">
        <div className="sea__glare" />
        <div className="sea__swell sea__swell--1" />
        <div className="sea__swell sea__swell--2" />
        <div className="sea__swell sea__swell--3" />
        <div className="sea__swell sea__swell--4" />
        {ripples.map((p) => (
          <span key={p.id} className="sea__ripple" style={{ left: p.x, top: p.y }} />
        ))}
      </div>
      <button
        type="button"
        className="sea__boat"
        style={{ left: `${boat}%` }}
        data-hop={hop % 2 ? "a" : hop ? "b" : undefined}
        aria-label="Paper boat. Press to make it hop."
        data-cursor="Ahoy"
        onClick={() => {
          setHop((h) => h + 1);
          sfx.boop();
        }}
      >
        <svg viewBox="0 0 72 48" aria-hidden="true">
          <path d="M36 4v20" stroke="#1D2A4D" strokeOpacity=".5" strokeWidth="1.5" />
          <path d="M37 5l11 4-11 4z" fill="#D8588F" />
          <path d="M14 24 L34 8 L34 24 Z" fill="#FFE3F0" />
          <path d="M38 10 L56 24 L38 24 Z" fill="#E4F0FF" />
          <path d="M4 25 H68 L56 40 H16 Z" fill="#FFFFFF" />
          <path d="M4 25 H68 L56 40 H16 Z" fill="none" stroke="#1D2A4D" strokeOpacity=".18" />
          <path d="M16 40 L36 25 L56 40" fill="none" stroke="#1D2A4D" strokeOpacity=".12" />
        </svg>
      </button>
      <div className="sea__content">{children}</div>
    </div>
  );
}
