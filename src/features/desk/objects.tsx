"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { MociAvatar } from "@/components/MociAvatar";
import { projects } from "@/content/projects";
import { dispatch } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sound";

/* ---------- The capsule (24:QW): a red pill of glossy keys, plus the blue pill to the work ---------- */

const Donut = () => (
  <svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true">
    <g fill="#fff">
      <circle cx="16" cy="16" r="10" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <circle key={i} cx={(16 + Math.cos(a) * 9.5).toFixed(2)} cy={(16 + Math.sin(a) * 9.5).toFixed(2)} r="4.6" />;
      })}
    </g>
    <circle cx="16" cy="16" r="4.6" fill="var(--pink)" />
  </svg>
);
const Bolt = () => (
  <svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true">
    <path d="M18.5 2 5.5 18.5h8.5L12 30l14.5-17.5h-9L18.5 2Z" fill="#fff" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);
const Clover = () => (
  <svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true">
    <g fill="#fff">
      <circle cx="11" cy="11" r="6" />
      <circle cx="21" cy="11" r="6" />
      <circle cx="11" cy="21" r="6" />
      <circle cx="21" cy="21" r="6" />
    </g>
    <circle cx="16" cy="16" r="3.2" fill="var(--mint)" />
  </svg>
);

export function Capsule() {
  const keys = [
    { label: "Lab", hint: "Open the lab", bg: "var(--pink)", Icon: Donut, href: "/lab" },
    { label: "Tour", hint: "Start the autopilot tour", bg: "var(--sun)", Icon: Bolt, action: () => dispatch({ type: "tour" }) },
    { label: "Ask", hint: "Ask Moci, Adelia's agent", bg: "var(--mint)", Icon: Clover, action: () => dispatch({ type: "open", panel: "agent" }) },
  ];
  return (
    <div className="flex flex-col items-start gap-1.5" data-xr="Capsule · the 24:QW keys, moulded">
      <div className="capsule">
        {keys.map(({ label, hint, bg, Icon, href, action }) =>
          href ? (
            <Link key={label} href={href} className="key" style={{ ["--key-bg" as string]: bg }} aria-label={hint} data-cursor={label} draggable={false} onClick={() => sfx.pop()}>
              <Icon />
            </Link>
          ) : (
            <button
              key={label}
              type="button"
              className="key js-only"
              style={{ ["--key-bg" as string]: bg }}
              aria-label={hint}
              data-cursor={label}
              onClick={() => {
                sfx.pop();
                void action?.();
              }}
            >
              <Icon />
            </button>
          ),
        )}
        <Link href="/work" className="capsule__go" data-cursor="Open" draggable={false}>
          See the work <span aria-hidden="true">›</span>
        </Link>
      </div>
      <p className="flex gap-[14px] pl-[10px] font-mono text-[9px] font-semibold tracking-[0.12em] text-white uppercase" aria-hidden="true">
        {keys.map((k) => (
          <span key={k.label} className="w-[48px] text-center">
            {k.label}
          </span>
        ))}
      </p>
    </div>
  );
}

/* ---------- The keychain: a carabiner with acrylic tags, one per page ---------- */

const TAGS = [
  { label: "Work", href: "/work", tint: "var(--accent)" },
  { label: "Lab", href: "/lab", tint: "var(--violet)" },
  { label: "About", href: "/about", tint: "var(--sky)" },
  { label: "Guestbook", href: "/guestbook", tint: "var(--sun)" },
  { label: "Play", href: "/play", tint: "var(--lime)" },
];

export function Keychain() {
  return (
    <nav aria-label="Keychain" className="keychain select-none" data-xr="Keychain · acrylic tags as navigation (after Wildy Riftian)">
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

/* ---------- A sealed booster pack, small enough to sit on the desk ---------- */

export function MiniPack() {
  return (
    <Link href="/work?pack=fresh" className="mini-pack block select-none" draggable={false} aria-label={`A sealed booster pack of ${projects.length} project cards. Open it on the work page.`} data-cursor="Tear">
      <span className="pack__foil mini-pack__foil grid place-items-center">
        <span className="relative z-10 flex flex-col items-center gap-1.5 px-2 text-center">
          <MociAvatar size={34} />
          <span className="text-[19px] leading-[0.92] font-bold tracking-[-0.04em] text-on-fill">
            Selected
            <br />
            Work
          </span>
          <span className="rounded-pill bg-white/80 px-1.5 py-0.5 font-mono text-[7px] font-semibold tracking-[0.1em] text-on-fill uppercase">Series 2026 · {projects.length}</span>
        </span>
      </span>
    </Link>
  );
}

/* ---------- Jelly candies: the glossy orbs, now lying on the desk, leaning from the cursor ---------- */

const CANDIES = [
  { l: "calc(50% + 150px)", t: 1206, size: 58, depth: 14, magenta: true },
  { l: "calc(50% + 352px)", t: 940, size: 36, depth: 22 },
  { l: "calc(50% + 40px)", t: 1150, size: 28, depth: 30, magenta: true },
];

export function JellyCandies() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(pointer: coarse)").matches) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const onMove = (e: PointerEvent) => {
      x = e.clientX / window.innerWidth - 0.5;
      y = e.clientY / window.innerHeight - 0.5;
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          el.style.setProperty("--px", x.toFixed(3));
          el.style.setProperty("--py", y.toFixed(3));
        });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 hidden xl:block" data-xr="JellyCandies · CSS glossy spheres, pointer parallax">
      {CANDIES.map((c, i) => (
        <span
          key={i}
          className={cn("jelly-orb", c.magenta && "jelly-orb--magenta")}
          style={{
            left: c.l,
            top: c.t,
            width: c.size,
            height: c.size,
            translate: `calc(var(--px, 0) * ${-c.depth}px) calc(var(--py, 0) * ${-c.depth}px)`,
          }}
        />
      ))}
    </div>
  );
}

/* ---------- A label-maker strip ---------- */

export function DymoLabel({ children, className, tilt = -2 }: { children: string; className?: string; tilt?: number }) {
  return (
    <span className={cn("dymo", className)} style={{ rotate: `${tilt}deg` }} aria-hidden="true">
      {children}
    </span>
  );
}
