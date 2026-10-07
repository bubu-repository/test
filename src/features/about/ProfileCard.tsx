"use client";

import { useEffect, useState } from "react";
import { CopyEmail } from "@/components/CopyEmail";
import { DownloadIcon } from "@/components/icons";
import { LiveClock } from "@/components/LiveClock";
import { identity, socials } from "@/content/profile";

/** Counts this visit once per browser session, then shows today's total (Bekasi day). */
function useViewsToday() {
  const [views, setViews] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    let counted = false;
    try {
      counted = window.sessionStorage.getItem("adelia:viewed") === "1";
      window.sessionStorage.setItem("adelia:viewed", "1");
    } catch {
      // storage blocked: count anyway, it's only a vanity number
    }
    fetch("/api/views", { method: counted ? "GET" : "POST" })
      .then((r) => r.json() as Promise<{ today: number | null }>)
      .then((d) => alive && setViews(d.today))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return views;
}

/** The contact card on /about, like a phone contact: monogram, name, live clock, actions. */
export function ProfileCard() {
  const views = useViewsToday();
  return (
    <aside aria-label="Contact card" className="widget rounded-[36px] p-6 text-center md:p-8" data-xr="ProfileCard · live clock + views counter">
      {/* CONTOH — ganti dengan data asli: swap the monogram for a photo */}
      <span aria-hidden="true" className="mx-auto grid size-28 place-items-center rounded-full bg-ink text-48 font-bold tracking-[-0.04em] text-bg">
        AT
      </span>
      <p className="mt-5 text-24 font-bold tracking-[-0.03em]">{identity.name}</p>
      <p className="text-16 text-muted">{identity.role}</p>
      <p className="mt-3 inline-flex items-center gap-2 rounded-pill bg-surface-2 px-3 py-1.5 text-14">
        <span className="live-dot" aria-hidden="true" /> {identity.location} · <LiveClock zone={identity.timeZone} className="font-semibold tabular-nums" /> WIB
      </p>
      <div className="mt-6 grid gap-2">
        <a href="/cv.pdf" download="Adelia-Tiara-CV.pdf" className="pill w-full" data-variant="magenta">
          <DownloadIcon width={18} height={18} /> Download CV (PDF)
        </a>
        <CopyEmail className="w-full" variant="ink" />
        <a href={`mailto:${identity.email}`} className="link mt-1 text-14 break-all">
          {identity.email}
        </a>
      </div>
      {socials.some((s) => s.href) && (
        <ul className="mt-5 flex justify-center gap-4 text-14">
          {socials
            .filter((s) => s.href)
            .map((s) => (
              <li key={s.label}>
                <a href={s.href!} target="_blank" rel="noopener noreferrer" className="link">
                  {s.label} ↗<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
        </ul>
      )}
      <p className="type-pixel mt-6 text-muted">{views === null ? "Counting visits…" : `${views} ${views === 1 ? "visit" : "visits"} today`}</p>
    </aside>
  );
}
