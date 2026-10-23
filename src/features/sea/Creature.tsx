/* ==========================================================================
   The guestbook's jelly creatures (ported from the legacy adelia.cc
   features/guestbook/Creature.tsx). Shared by the Aquarium close-up
   (SeaPanel) and the live tank in the room (TankLive).
   ========================================================================== */
import { useId, type CSSProperties, type ReactNode } from "react";
import type { NoteColor, Species } from "@/content/guestbook";

/*
 * The guestbook's sea creatures, drawn as clear jelly (清透), like jelly mochi: colour pooled low
 * inside, see-through in the middle so the water shows, a white Fresnel rim, light from the surface
 * (a soft highlight and a hard dot, centred, so they hold when the sea flips a creature to swim
 * left), a coloured glow, and a small kawaii face. All original shapes, facing right.
 */

type Jelly = { core: string; mid: string; ink: string; glow: string };

/** Keys are stored in saved notes; only the colours change. */
export const JELLY: Record<NoteColor, Jelly> = {
  magenta: { core: "#FF7EB6", mid: "#FFD6E8", ink: "#C2286F", glow: "rgba(255,126,182,.45)" },
  sky: { core: "#1FB0F0", mid: "#93DCFB", ink: "#0B4C80", glow: "rgba(31,176,240,.45)" },
  mint: { core: "#22CDB0", mid: "#93ECDC", ink: "#0A5E50", glow: "rgba(34,205,176,.45)" },
  violet: { core: "#9474FF", mid: "#CDBDFF", ink: "#43279C", glow: "rgba(148,116,255,.45)" },
  sun: { core: "#FFB08A", mid: "#FFDCCB", ink: "#7A3A1A", glow: "rgba(255,176,138,.45)" },
  lime: { core: "#BFD9FF", mid: "#F2F7FF", ink: "#2A4A7A", glow: "rgba(191,217,255,.55)" },
};

export type Expression = "smile" | "wink" | "sleepy";
export const EXPRESSIONS: Expression[] = ["smile", "wink", "sleepy"];

/** Width per species, relative to a fish (1). */
export const SPECIES_SCALE: Record<Species, number> = {
  fish: 1,
  jellyfish: 0.9,
  octopus: 0.95,
  turtle: 1.15,
  seahorse: 0.75,
  pufferfish: 0.9,
  crab: 0.95,
  whale: 1.45,
};

const EYE = "#0B1F33";

/** Eyes in navy on every creature; the mouth takes the colour's own ink. */
function Face({ x, y, s = 1, kind, ink }: { x: number; y: number; s?: number; kind: Expression; ink: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={ink} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="-13" cy="6" rx="4.2" ry="2.4" fill="#FF8FB8" stroke="none" opacity=".5" />
      <ellipse cx="13" cy="6" rx="4.2" ry="2.4" fill="#FF8FB8" stroke="none" opacity=".5" />
      {kind === "smile" && (
        <>
          <circle cx="-8" cy="0" r="2.6" fill={EYE} stroke="none" />
          <circle cx="8" cy="0" r="2.6" fill={EYE} stroke="none" />
          <path d="M-3.5 5Q0 8.5 3.5 5" strokeWidth="2" />
        </>
      )}
      {kind === "wink" && (
        <>
          <circle cx="-8" cy="0" r="2.6" fill={EYE} stroke="none" />
          <path d="M5.5-3 10 0 5.5 3" stroke={EYE} strokeWidth="2" />
          <path d="M-4.5 4.5Q0 9 4.5 4.5" strokeWidth="2" />
          <ellipse cx="1.6" cy="7.6" rx="2.2" ry="1.8" fill="#FF7A8A" stroke="none" />
        </>
      )}
      {kind === "sleepy" && (
        <>
          <path d="M-11.5 0h7M4.5 0h7" stroke={EYE} strokeWidth="2.4" />
          <path d="M-2.2 6.6 0 3.2l2.2 3.4Z" strokeWidth="1.8" />
        </>
      )}
    </g>
  );
}

type Ellipse = [cx: number, cy: number, rx: number, ry: number];

/**
 * One shape per species: `back` are the soft parts (fins, tentacles, legs), `main` the jelly body
 * that gets the rim, `deco` sits on top. `hi` is the surface light on top of the body, `core` the
 * mochi core low inside it, `face` where the face goes.
 */
function Shape({ species, fill, soft }: { species: Species; fill: string; soft: string }): {
  back: ReactNode;
  main: ReactNode;
  deco?: ReactNode;
  hi: Ellipse;
  core: Ellipse;
  face: [number, number, number];
} {
  switch (species) {
    case "fish":
      return {
        back: (
          <>
            <path d="M28 52 8 34q6 18 0 36Z" fill={soft} />
            <path d="M50 27q11-15 24 0Z" fill={soft} />
          </>
        ),
        main: <ellipse cx="60" cy="52" rx="38" ry="27" fill={fill} />,
        hi: [60, 33, 18, 5.5],
        core: [58, 64, 26, 11],
        face: [76, 50, 1],
      };
    case "jellyfish":
      return {
        back: <path d="M34 62c-2 10 4 18 0 30M50 64c-2 10 3 16 0 28M70 64c2 10-3 16 0 28M86 62c2 10-4 18 0 30" stroke={soft} strokeWidth="5" strokeLinecap="round" fill="none" />,
        main: <path d="M22 60c0-30 18-46 38-46s38 16 38 46c-6 6-14 6-20 0-6 6-12 6-18 0-6 6-12 6-18 0-6 6-14 6-20 0Z" fill={fill} />,
        hi: [60, 24, 17, 5.5],
        core: [60, 54, 28, 9],
        face: [60, 42, 1],
      };
    case "octopus":
      return {
        back: null,
        main: (
          <path
            d="M28 56c0-28 15-44 32-44s32 16 32 44c0 8 4 14 8 22-8 4-16 0-20-8-2 10-6 16-12 18-4-6-6-12-8-18-2 6-4 12-8 18-6-2-10-8-12-18-4 8-12 12-20 8 4-8 8-14 8-22Z"
            fill={fill}
          />
        ),
        hi: [60, 22, 15, 5],
        core: [60, 58, 22, 10],
        face: [60, 44, 1],
      };
    case "turtle":
      return {
        back: (
          <>
            <ellipse cx="34" cy="74" rx="11" ry="6" fill={soft} transform="rotate(-25 34 74)" />
            <ellipse cx="86" cy="74" rx="11" ry="6" fill={soft} transform="rotate(25 86 74)" />
            <ellipse cx="38" cy="40" rx="10" ry="5" fill={soft} transform="rotate(30 38 40)" />
            <circle cx="102" cy="54" r="13" fill={soft} />
          </>
        ),
        main: <path d="M22 62c0-24 18-38 40-38s40 14 40 38c0 6-18 12-40 12S22 68 22 62Z" fill={fill} />,
        deco: <path d="M48 36l14-6 14 6v14l-14 6-14-6Z" stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeLinejoin="round" fill="none" />,
        hi: [62, 31, 19, 4.5],
        core: [62, 60, 30, 8],
        face: [103, 52, 0.62],
      };
    case "seahorse":
      return {
        back: (
          <>
            <path d="M56 84c-10 8-22 4-22-6 0-8 10-10 14-4" stroke={soft} strokeWidth="8" strokeLinecap="round" fill="none" />
            <path d="M44 56q-10 2-12 10 8 0 12-4Z" fill={soft} />
            <path d="M74 26h18a6 6 0 0 1 0 12H76Z" fill={soft} />
          </>
        ),
        // Head and belly as one outline, so the rim follows the whole body.
        main: <path d="M49.96 46.24A20 20 0 1 1 73.02 49.85A17 22 0 1 1 49.96 46.24Z" fill={fill} />,
        hi: [64, 19, 10, 4],
        core: [60, 70, 12, 11],
        face: [64, 32, 0.8],
      };
    case "pufferfish":
      return {
        back: (
          <>
            {Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI * 2;
              const x = 58 + Math.cos(a) * 36;
              const y = 52 + Math.sin(a) * 36;
              return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="4" fill={soft} />;
            })}
            <path d="M24 52 8 40v24Z" fill={soft} />
          </>
        ),
        main: <circle cx="58" cy="52" r="34" fill={fill} />,
        hi: [58, 26, 16, 5],
        core: [58, 64, 24, 12],
        face: [66, 50, 1.05],
      };
    case "crab":
      return {
        back: (
          <>
            <path d="M34 68l-14 10M36 74l-12 14M86 68l14 10M84 74l12 14" stroke={soft} strokeWidth="5" strokeLinecap="round" />
            <path d="M40 50 26 38M80 50l14-12" stroke={soft} strokeWidth="6" strokeLinecap="round" />
            <path d="M14 30a12 12 0 1 1 18 10l-6-8Z" fill={soft} />
            <path d="M106 30a12 12 0 1 0-18 10l6-8Z" fill={soft} />
            <path d="M50 42V28M70 42V28" stroke={soft} strokeWidth="4" strokeLinecap="round" />
            <circle cx="50" cy="26" r="5" fill={soft} />
            <circle cx="70" cy="26" r="5" fill={soft} />
          </>
        ),
        main: <ellipse cx="60" cy="60" rx="34" ry="22" fill={fill} />,
        hi: [60, 45, 15, 4.2],
        core: [60, 68, 22, 8],
        face: [60, 56, 0.95],
      };
    case "whale":
      return {
        back: (
          <>
            <path d="M24 56C14 50 8 40 6 30c8 4 14 8 18 14 2-8 8-14 14-16-2 10-4 18-8 24Z" fill={soft} />
            <path d="M86 14c-2-6 0-10 2-12M92 14c2-6 6-8 10-8" stroke={soft} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          </>
        ),
        main: <path d="M22 60c0-22 24-38 52-38s44 16 44 38-18 30-46 30-50-8-50-30Z" fill={fill} />,
        deco: <path d="M34 72c12 8 26 10 40 10s30-4 38-12" stroke="rgba(255,255,255,.6)" strokeWidth="2.4" strokeDasharray="3 4" strokeLinecap="round" fill="none" />,
        hi: [72, 31, 22, 5.5],
        core: [70, 72, 32, 10],
        face: [92, 54, 0.95],
      };
  }
}

/**
 * A creature. `seed` picks its expression, so the same note always wears the same face.
 * Decorative: the button or figure around it carries the words.
 */
export function Creature({
  species,
  color,
  seed,
  face: faceKind,
  className,
  style,
}: {
  species: Species;
  color: NoteColor;
  seed: number;
  /** the face the visitor picked; otherwise the seed picks one */
  face?: Expression;
  className?: string;
  style?: CSSProperties;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const j = JELLY[color];
  const kind = faceKind ?? EXPRESSIONS[seed % EXPRESSIONS.length];
  const { back, main, deco, hi, core, face } = Shape({ species, fill: `url(#${uid}b)`, soft: `url(#${uid}s)` });
  // The body again, unfilled, to draw its rim with.
  const outline = Shape({ species, fill: "none", soft: "none" }).main;
  return (
    <svg viewBox="0 0 120 100" className={className} style={{ ...style, ["--glow" as string]: j.glow }} aria-hidden="true" focusable="false" overflow="visible">
      <defs>
        {/* The jelly: colour pooled low, see-through in the middle, bright towards the rim. */}
        <radialGradient id={`${uid}b`} cx="50%" cy="74%" r="72%">
          <stop offset="0" stopColor={j.core} stopOpacity=".92" />
          <stop offset=".55" stopColor={j.mid} stopOpacity=".58" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity=".82" />
        </radialGradient>
        <radialGradient id={`${uid}s`} cx="50%" cy="70%" r="80%">
          <stop offset="0" stopColor={j.core} stopOpacity=".85" />
          <stop offset=".6" stopColor={j.mid} stopOpacity=".6" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity=".72" />
        </radialGradient>
        <radialGradient id={`${uid}k`}>
          <stop offset="0" stopColor={j.core} stopOpacity=".42" />
          <stop offset="1" stopColor={j.core} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}h`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".45" />
          <stop offset=".55" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${uid}c`}>
          {back}
          {main}
        </clipPath>
        <clipPath id={`${uid}m`}>{main}</clipPath>
      </defs>
      <g stroke="rgba(255,255,255,.6)" strokeWidth="1">
        {back}
        {main}
      </g>
      {deco}
      {/* Inside the body: a soft mochi core, and a Fresnel rim (the clip hides its outer half). */}
      <g clipPath={`url(#${uid}m)`}>
        <ellipse cx={core[0]} cy={core[1]} rx={core[2]} ry={core[3]} fill={`url(#${uid}k)`} />
        <g fill="none" stroke="#FFFFFF">
          <g strokeOpacity=".38" strokeWidth="6">{outline}</g>
          <g strokeOpacity=".6" strokeWidth="2.2">{outline}</g>
        </g>
      </g>
      {/* Light from the surface: a haze over the top, a soft highlight and a hard dot, centred. */}
      <g clipPath={`url(#${uid}c)`}>
        <rect width="120" height="100" fill={`url(#${uid}h)`} />
        <ellipse cx={hi[0]} cy={hi[1]} rx={hi[2]} ry={hi[3]} fill="#FFFFFF" opacity=".6" />
        <circle cx={hi[0]} cy={hi[1] + hi[3] + 3.4} r="2.2" fill="#FFFFFF" />
      </g>
      <Face x={face[0]} y={face[1]} s={face[2]} kind={kind} ink={j.ink} />
    </svg>
  );
}
