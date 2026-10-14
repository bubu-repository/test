"use client";

import Link from "next/link";
import { sfx } from "@/lib/sound";

const TAGS = [
  { label: "Work", href: "/work", tint: "var(--accent)" },
  { label: "Lab", href: "/lab", tint: "var(--violet)" },
  { label: "About", href: "/about", tint: "var(--pink)" },
  { label: "Guestbook", href: "/guestbook", tint: "var(--cyan)" },
  { label: "Studio", href: "/lab#studio", tint: "var(--sky)" },
];

/** A carabiner with acrylic tags, one per page (after Wildy Riftian). It sways a little; hover to fan the tags out (they jingle). */
export function Keychain() {
  return (
    <nav aria-label="Keychain" className="keychain select-none" onPointerEnter={() => sfx.jingle()}>
      <svg className="keychain__biner" viewBox="0 0 120 64" width="120" height="64" aria-hidden="true">
        <defs>
          <linearGradient id="biner-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--metal-from)" />
            <stop offset="1" stopColor="var(--metal-to)" />
          </linearGradient>
        </defs>
        <path d="M14 32c0-12 8-20 20-20h52c12 0 20 8 20 20s-8 20-20 20H34c-12 0-20-8-20-20Z" fill="none" stroke="url(#biner-metal)" strokeWidth="7" />
        <path d="M14 32c0-12 8-20 20-20h52c12 0 20 8 20 20s-8 20-20 20H34c-12 0-20-8-20-20Z" fill="none" stroke="rgba(0,0,0,.25)" strokeWidth="1" />
        <path d="M60 12v16" stroke="url(#biner-metal)" strokeWidth="6" strokeLinecap="round" />
      </svg>
      <ul className="keychain__tags">
        {TAGS.map((t, i) => (
          <li key={t.href} style={{ ["--i" as string]: i, ["--tag" as string]: t.tint }}>
            <Link href={t.href} className="keychain__tag" draggable={false} data-cursor="Go" onMouseEnter={() => sfx.tick()}>
              <span className="keychain__hole" aria-hidden="true" />
              <span className="keychain__label">{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
