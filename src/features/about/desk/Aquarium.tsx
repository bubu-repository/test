import Link from "next/link";
import { useId, type CSSProperties } from "react";
import type { NoteColor, Species } from "@/content/guestbook";
import { Creature } from "@/features/guestbook/Creature";

/**
 * Three of the guestbook's own creatures live in the tank: a fish crossing back and forth, a
 * jellyfish bobbing in place and a pufferfish pottering along the bottom. `x`/`y` are where each
 * one rests when motion is reduced.
 */
const SWIMMERS: { species: Species; color: NoteColor; seed: number; swim: string; x: string; y: string; dur: string; delay: string }[] = [
  { species: "jellyfish", color: "sky", seed: 1, swim: "bob", x: "64%", y: "6%", dur: "3.8s", delay: "-1.2s" },
  { species: "fish", color: "magenta", seed: 0, swim: "swim", x: "6%", y: "26%", dur: "15s", delay: "-4s" },
  { species: "pufferfish", color: "lime", seed: 2, swim: "potter", x: "30%", y: "56%", dur: "19s", delay: "-6s" },
];

/** Kelp in sea glass: a few blades rooted in the sand. */
function Kelp({ className, blades }: { className: string; blades: { d: string; w: number }[] }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={`tank__kelp ${className}`} viewBox="0 0 60 80" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}k`} x1="0" y1="0" x2="0" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#93ECDC" />
          <stop offset="1" stopColor="#5ED6C9" />
        </linearGradient>
      </defs>
      {blades.map((b) => (
        <path key={b.d} d={b.d} stroke={`url(#${id}k)`} strokeWidth={b.w} fill="none" strokeLinecap="round" />
      ))}
    </svg>
  );
}

/**
 * The aquarium on her desk: a glass tank with three little sea creatures, kelp and rising bubbles.
 * It is the door to the guestbook, where every visitor leaves a sea creature with a note.
 */
export function Aquarium() {
  return (
    <Link href="/guestbook" className="tank" aria-label="The aquarium: open the guestbook and leave a sea creature with a note">
      <span className="tank__glass" aria-hidden="true">
        <span className="tank__water">
          <Kelp
            className="tank__kelp--back"
            blades={[
              { d: "M14 80C8 62 20 50 12 34S16 10 12 2", w: 5 },
              { d: "M30 80C36 64 26 52 33 40s-2-20 3-28", w: 4.5 },
              { d: "M46 80c-5-12 4-20-1-32", w: 4 },
            ]}
          />
          <Kelp
            className="tank__kelp--front"
            blades={[
              { d: "M20 80c6-14-6-24 2-40s-4-22 0-34", w: 6 },
              { d: "M40 80c-4-12 6-20 0-34", w: 5 },
            ]}
          />
          {SWIMMERS.map((s) => (
            <span key={s.species} className={`tank__swimmer tank__swimmer--${s.swim}`} style={{ "--x": s.x, "--y": s.y, "--dur": s.dur, "--delay": s.delay } as CSSProperties}>
              <span>
                <Creature species={s.species} color={s.color} seed={s.seed} className="tank__creature" />
              </span>
            </span>
          ))}
          {[22, 58, 86].map((x, i) => (
            <span key={x} className="tank__bubble" style={{ "--x": `${x}%`, "--d": `${i * -1.3}s` } as CSSProperties} />
          ))}
          <span className="tank__sand" />
        </span>
      </span>
      <span className="tank__lid" aria-hidden="true" />
      <span className="tank__tag">Guestbook</span>
    </Link>
  );
}
