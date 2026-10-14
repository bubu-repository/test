"use client";

import { useRef, useState } from "react";
import { bio, identity } from "@/content/profile";
import { dispatch } from "@/lib/actions";
import { sfx } from "@/lib/sound";

/**
 * "Swipe up to reveal", the checker stamp from the reference board, softened to white glass.
 * Drag it up (or press it) and it flies off to show what's underneath: availability, the thing
 * a recruiter wants first.
 */
export function RevealCard({ className }: { className?: string }) {
  const [state, setState] = useState<"idle" | "dragging" | "gone">("idle");
  const [dy, setDy] = useState(0);
  const start = useRef<number | null>(null);

  const reveal = () => {
    sfx.whoosh();
    setState("gone");
    setDy(-420);
  };

  return (
    <div className={className}>
      <div className="reveal" data-revealed={state === "gone"}>
        <div className="reveal__under flex flex-col">
          <p className="type-pixel text-accent-ink">Revealed</p>
          <p className="mt-2 text-32 leading-none font-bold tracking-[-0.035em]">Open to work.</p>
          <p className="mt-3 text-16 leading-snug">{bio.availability}</p>
          <p className="mt-1 text-14 text-muted">Replies within a day · {identity.timeZoneLabel}</p>
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <button type="button" className="pill" data-size="sm" data-variant="magenta" onClick={() => dispatch({ type: "open", panel: "brief" })}>
              Read the 40s brief
            </button>
            <button
              type="button"
              className="pill"
              data-size="sm"
              data-variant="ghost"
              onClick={() => {
                setState("idle");
                setDy(0);
              }}
              aria-label="Put the card back"
            >
              ↺
            </button>
          </div>
        </div>

        <span aria-hidden="true" className="reveal__stack reveal__stack--2 checker" />
        <span aria-hidden="true" className="reveal__stack reveal__stack--1 checker" />
        <button
          type="button"
          data-tour="reveal"
          data-cursor="Swipe up"
          aria-label="Swipe up to reveal Adelia's availability"
          className="reveal__card checker touch-none select-none"
          style={{
            transform: `translateY(${dy}px) rotate(${dy * -0.03}deg)`,
            opacity: state === "gone" ? 0 : 1,
            transition: state === "dragging" ? "none" : "transform 520ms var(--ease-out), opacity 420ms var(--ease-out)",
            pointerEvents: state === "gone" ? "none" : undefined,
          }}
          tabIndex={state === "gone" ? -1 : 0}
          onPointerDown={(e) => {
            start.current = e.clientY;
            e.currentTarget.setPointerCapture(e.pointerId);
            setState("dragging");
          }}
          onPointerMove={(e) => {
            if (start.current === null) return;
            setDy(Math.min(0, e.clientY - start.current));
          }}
          onPointerUp={() => {
            const pulled = dy;
            start.current = null;
            if (pulled < -70) reveal();
            else {
              setState("idle");
              setDy(0);
            }
          }}
          onClick={(e) => {
            // Keyboard and scripted presses reveal straight away; pointer taps too.
            if (e.detail === 0 || Math.abs(dy) < 6) reveal();
          }}
        >
          <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <path id="reveal-circle" d="M100,100 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0" />
            </defs>
            <text className="fill-muted font-pixel" fontSize="13" letterSpacing="3">
              <textPath href="#reveal-circle">SWIPE UP TO REVEAL · SWIPE UP TO REVEAL ·</textPath>
            </text>
          </svg>
          <span className="reveal__glyph" aria-hidden="true">
            a
          </span>
        </button>
      </div>
    </div>
  );
}
