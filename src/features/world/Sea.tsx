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
 * The sea at the bottom of every page: the horizon, lines of swell drifting at different speeds,
 * the sun's glitter (the moon's at night), a paper boat and gulls. Tap the water and it ripples, plops,
 * and the boat sails over. The footer's spec plate floats on it.
 */
export function Sea({ children }: { children: ReactNode }) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [boat, setBoat] = useState(22);
  const [hop, setHop] = useState(0);
  const id = useRef(0);

  const splash = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest(".sea__content, button, a")) return;
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
    <div className="sea" onPointerDown={splash} data-cursor="Splash" data-xr="Sea · CSS mask swell + Web Audio ambience">
      <span className="sea__gull" aria-hidden="true" style={{ "--y": "-92px", "--t": "26s", "--d": "2s" } as CSSProperties} />
      <span className="sea__gull" aria-hidden="true" style={{ "--y": "-58px", "--t": "34s", "--d": "11s" } as CSSProperties} />
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
          <path d="M37 5l11 4-11 4z" fill="#F41B8D" />
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
