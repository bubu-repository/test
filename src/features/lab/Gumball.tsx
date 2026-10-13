"use client";

import { useRef, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { labItems, labUrl, type LabItem } from "@/content/lab";
import { dispatch } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/hooks";
import { sfx } from "@/lib/sound";
import { unlock } from "@/lib/stickers";
import { labGlyph } from "./glyphs";

/** Gumballs inside the globe: fixed positions, so the server and client draw the same machine. */
const BALLS: [number, number, string][] = [
  [92, 176, "var(--accent)"], [120, 190, "var(--sun)"], [150, 184, "var(--cobalt)"], [178, 170, "var(--mint)"], [70, 152, "var(--violet)"],
  [104, 150, "var(--sky)"], [136, 158, "var(--orange)"], [166, 142, "var(--pink)"], [192, 132, "var(--lime)"], [84, 122, "var(--cobalt)"],
  [116, 120, "var(--accent)"], [148, 126, "var(--mint)"], [176, 108, "var(--sun)"], [100, 94, "var(--lime)"], [134, 92, "var(--violet)"],
  [62, 96, "var(--sun)"], [160, 80, "var(--sky)"], [120, 66, "var(--pink)"],
];

type Phase = "idle" | "turning" | "dropping" | "open";

/**
 * The gumball machine: turn the knob, a capsule rolls out with a random experiment inside.
 * Everything inside it can be run straight from the result card.
 */
export function Gumball() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [turns, setTurns] = useState(0);
  const [item, setItem] = useState<LabItem | null>(null);
  const [color, setColor] = useState("var(--accent)");
  const last = useRef<string | null>(null);
  const calm = useReducedMotion();

  const turn = () => {
    if (phase === "turning" || phase === "dropping") return;
    const pool = labItems.filter((l) => l.slug !== last.current);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    last.current = pick.slug;
    sfx.click();
    setTurns((t) => t + 1);
    setItem(pick);
    setColor(BALLS[Math.floor(Math.random() * BALLS.length)][2]);
    setPhase("turning");
    const t1 = calm ? 0 : 700;
    const t2 = calm ? 0 : 1300;
    window.setTimeout(() => {
      setPhase("dropping");
      sfx.coin();
    }, t1);
    window.setTimeout(() => {
      setPhase("open");
      sfx.success();
      unlock("gacha");
    }, t2);
  };

  return (
    <div className="grid items-center gap-10 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:gap-16" data-xr="Gumball · random experiment picker">
      <div className="relative mx-auto w-full max-w-[300px]">
        <svg viewBox="0 0 260 400" className="w-full" aria-hidden="true">
          <defs>
            <radialGradient id="gb-glass" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
              <stop offset="45%" stopColor="#fff" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#dfe8ff" stopOpacity="0.45" />
            </radialGradient>
            <linearGradient id="gb-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF7AB8" />
              <stop offset="100%" stopColor="#BA3A71" />
            </linearGradient>
          </defs>
          {/* globe */}
          <circle cx="130" cy="132" r="112" fill="color-mix(in srgb, var(--surface) 70%, transparent)" stroke="var(--glass-line)" strokeWidth="2" />
          <g className={cn(phase === "turning" && !calm && "animate-[jiggle_0.12s_ease-in-out_6]")} style={{ transformOrigin: "130px 150px" }}>
            {BALLS.map(([x, y, c], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r="15" fill={c} />
                <circle cx={x - 5} cy={y - 5} r="4" fill="#fff" opacity="0.55" />
              </g>
            ))}
          </g>
          <circle cx="130" cy="132" r="112" fill="url(#gb-glass)" />
          <ellipse cx="90" cy="70" rx="30" ry="16" fill="#fff" opacity="0.7" transform="rotate(-30 90 70)" />
          {/* neck + body */}
          <rect x="78" y="236" width="104" height="22" rx="8" fill="#8E2755" />
          <path d="M42 262a14 14 0 0 1 14-14h148a14 14 0 0 1 14 14v112a18 18 0 0 1-18 18H60a18 18 0 0 1-18-18Z" fill="url(#gb-body)" />
          <rect x="62" y="270" width="72" height="26" rx="8" fill="#fff" opacity="0.92" />
          <text x="98" y="288" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1D2A4D" letterSpacing="2">
            LAB
          </text>
          {/* knob */}
          <g style={{ transform: `rotate(${turns * 360}deg)`, transformOrigin: "176px 318px", transition: calm ? "none" : "transform 700ms cubic-bezier(.34,1.3,.64,1)" }}>
            <circle cx="176" cy="318" r="28" fill="#fff" />
            <rect x="171" y="294" width="10" height="48" rx="5" fill="#E8E8EC" />
            <circle cx="176" cy="318" r="7" fill="#D8588F" />
          </g>
          {/* chute */}
          <rect x="70" y="330" width="56" height="40" rx="12" fill="#7A3A66" opacity="0.4" />
          {/* capsule */}
          {(phase === "dropping" || phase === "open") && (
            <g className={calm ? undefined : "gb-capsule"}>
              <circle cx="98" cy="352" r="16" fill={color} />
              <path d="M82 352a16 16 0 0 1 32 0Z" fill="#fff" opacity="0.85" />
            </g>
          )}
        </svg>
        <button type="button" onClick={turn} data-tour="gacha" data-cursor="Turn" className="pill mx-auto mt-4 flex" data-variant="magenta" data-size="lg" disabled={phase === "turning" || phase === "dropping"}>
          {turns === 0 ? "Turn the knob" : "Turn again"}
        </button>
      </div>

      <div aria-live="polite" className="min-h-[260px]">
        {item && phase === "open" ? (
          <div className="widget pop-in p-6 md:p-8">
            <p className="type-pixel text-accent-ink">You got</p>
            <div className="mt-3 flex items-center gap-4">
              <AppIcon tone={item.tone} size={64}>
                {labGlyph(item.slug)}
              </AppIcon>
              <div className="min-w-0">
                <h3 className="text-32 leading-none font-bold tracking-[-0.035em]">{item.name}</h3>
                <p className="mt-1.5 text-14 text-muted">{item.where === "subdomain" ? `${item.subdomain}.adelia.cc` : "Built into this site"}</p>
              </div>
            </div>
            <p className="mt-4 max-w-[52ch]">{item.blurb}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {item.where === "subdomain" ? (
                <a href={labUrl(item.subdomain)} target="_blank" rel="noopener noreferrer" className="pill" data-variant="ink">
                  Open {item.subdomain}.adelia.cc ↗<span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <button type="button" className="pill" data-variant="ink" onClick={() => dispatch(item.action)}>
                  {item.actionLabel}
                </button>
              )}
              <a href={`#lab-${item.slug}`} className="link-arrow text-16">
                Find it below
              </a>
            </div>
          </div>
        ) : (
          <div className="well rounded-[22px] p-8 text-muted">
            <p className="type-pixel">Capsule slot</p>
            <p className="mt-3 max-w-[36ch] text-18">
              {phase === "idle" ? "Can't choose? Turn the knob and a capsule rolls out with a random experiment inside." : "Rolling…"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
