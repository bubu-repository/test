import Link from "next/link";
import type { CSSProperties } from "react";

/** A small fish in one colour, drawn facing right. */
function Fish({ body, fin }: { body: string; fin: string }) {
  return (
    <svg viewBox="0 0 40 24" aria-hidden="true" focusable="false">
      <path d="M30 12 39 4v16Z" fill={fin} />
      <ellipse cx="17" cy="12" rx="15" ry="9.5" fill={body} />
      <path d="M13 3.5c3 2.5 3 14.5 0 17" stroke="rgba(255,255,255,.55)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="8" cy="10" r="2.1" fill="#0B1F33" />
      <circle cx="8.6" cy="9.4" r=".7" fill="#FFFFFF" />
      <ellipse cx="20" cy="6.5" rx="6" ry="2" fill="rgba(255,255,255,.35)" />
    </svg>
  );
}

const FISH = [
  { body: "#FF8F7A", fin: "#FF6F5E", y: "26%", dur: "13s", delay: "-2s", size: "22%" },
  { body: "#FFD45E", fin: "#F5B82E", y: "50%", dur: "17s", delay: "-9s", size: "17%" },
  { body: "#5CC8F5", fin: "#1A8FE8", y: "66%", dur: "11s", delay: "-5s", size: "15%" },
];

/**
 * The aquarium on her desk: a glass tank with three fish, weed and rising bubbles. It is the door to
 * the guestbook, where every visitor leaves a sea creature with a note.
 */
export function Aquarium() {
  return (
    <Link href="/guestbook" className="tank" aria-label="The aquarium: open the guestbook and leave a sea creature with a note">
      <span className="tank__glass" aria-hidden="true">
        <span className="tank__water">
          <svg className="tank__weed" viewBox="0 0 60 80" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path d="M14 80C8 62 20 50 12 34S16 10 12 0" stroke="#3DBE4A" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M30 80C36 64 26 52 33 40s-2-20 3-28" stroke="#2FA14A" strokeWidth="4.5" fill="none" strokeLinecap="round" />
            <path d="M46 80c-5-12 4-20-1-32" stroke="#5ED68A" strokeWidth="4" fill="none" strokeLinecap="round" />
          </svg>
          {FISH.map((f, i) => (
            <span key={i} className="tank__fish" style={{ "--y": f.y, "--dur": f.dur, "--delay": f.delay, "--size": f.size } as CSSProperties}>
              <span>
                <Fish body={f.body} fin={f.fin} />
              </span>
            </span>
          ))}
          {[18, 64, 82].map((x, i) => (
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
