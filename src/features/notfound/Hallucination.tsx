"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MociAvatar } from "@/components/MociAvatar";
import { siteMap } from "@/content/knowledge";
import { editDistance } from "@/lib/fuzzy";
import { useHydrated, useReducedMotion } from "@/lib/hooks";
import { unlock } from "@/lib/stickers";

function titleFrom(path: string) {
  const last = decodeURIComponent(path.split("/").filter(Boolean).pop() ?? "this page");
  return last
    .replace(/[-_]+/g, " ")
    .replace(/\.\w+$/, "")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 48);
}

/** The confident, completely made-up page Moci writes for a URL that doesn't exist. */
function inventedClaims(title: string) {
  return [
    `${title} is one of Adelia's most celebrated projects, launched in 2019 to critical acclaim.`,
    `It serves over 4 million users across 38 countries and won a Webby for "Best Use of Jelly".`,
    `The entire thing was built in a single weekend, in Rust, on a Nokia 3310.`,
  ];
}

/**
 * The 404 that hallucinates: Moci confidently writes the missing page, then fact-checks every
 * sentence against the site and offers the closest pages that do exist.
 */
export function Hallucination() {
  const realPath = usePathname();
  // The 404 is prerendered once, so the address is only known in the browser.
  const pathname = useHydrated() ? realPath : "/this-page";
  const calm = useReducedMotion();
  const title = titleFrom(pathname);
  const claims = inventedClaims(title);
  const [typed, setTyped] = useState(0);
  const [checked, setChecked] = useState(0);
  const full = claims.join(" ");

  useEffect(() => {
    unlock("lost");
  }, []);

  // Type the invented page out, then strike each claim through, one by one.
  useEffect(() => {
    let i = 0;
    let c = 0;
    const speed = calm ? 0 : 14;
    const typer = window.setInterval(() => {
      i = Math.min(full.length, i + (calm ? full.length : 3));
      setTyped(i);
      if (i >= full.length) {
        window.clearInterval(typer);
        const checker = window.setInterval(() => {
          c += 1;
          setChecked(c);
          if (c >= claims.length) window.clearInterval(checker);
        }, calm ? 0 : 700);
      }
    }, speed);
    return () => window.clearInterval(typer);
  }, [full, calm, claims.length]);

  const target = pathname.toLowerCase();
  const suggestions = [...siteMap]
    .map((s) => ({ ...s, d: editDistance(target, s.path) - (target.includes(s.path.split("/").pop() ?? "~") && s.path !== "/" ? 6 : 0) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3);

  const starts = claims.map((_, n) => claims.slice(0, n).reduce((sum, c) => sum + c.length + 1, 0));
  return (
    <div className="mx-auto w-full max-w-[760px]">
      <div className="flex items-start gap-3">
        <MociAvatar size={34} className="mt-1" mood={checked >= claims.length ? "oops" : "think"} />
        <div className="min-w-0 flex-1">
          <p className="mb-1 flex items-center gap-2 text-12 font-semibold text-muted">
            Moci <span className="chip min-h-5 px-2 text-[11px]">{checked >= claims.length ? "Fact-checked" : typed < full.length ? "Writing…" : "Checking…"}</span>
          </p>
          <article className="widget rounded-[6px_22px_22px_22px] px-5 py-5 md:px-6">
            <h2 className="text-24 font-bold tracking-[-0.02em]">{title}</h2>
            <p className="mt-3 text-18 leading-relaxed">
              {claims.map((claim, n) => {
                const visible = claim.slice(0, Math.max(0, typed - starts[n]));
                if (!visible) return null;
                const struck = checked > n;
                return (
                  <span key={n}>
                    <span className={struck ? "text-muted line-through decoration-accent decoration-2" : undefined}>{visible}</span>
                    {struck && <span className="ml-1 rounded-[6px] bg-accent/10 px-1.5 py-0.5 text-12 font-semibold text-accent-ink no-underline">not true</span>}{" "}
                  </span>
                );
              })}
            </p>
          </article>
        </div>
      </div>

      <div className={checked >= claims.length ? "fade-in mt-8" : "invisible mt-8"} aria-hidden={checked < claims.length}>
        <p className="text-18">
          Okay, I made all of that up. <strong>{pathname}</strong> doesn&apos;t exist. Here&apos;s what does:
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {suggestions.map((s) => (
            <li key={s.path}>
              <Link href={s.path} className="widget block h-full p-4 transition-colors hover:border-ink/20">
                <span className="block font-semibold">{s.title}</span>
                <span className="mt-1 block font-mono text-12 text-muted">{s.path}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
