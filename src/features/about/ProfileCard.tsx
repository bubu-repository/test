"use client";

import { CopyEmail } from "@/components/CopyEmail";
import { DownloadIcon } from "@/components/icons";
import { LiveClock } from "@/components/LiveClock";
import { identity, socials } from "@/content/profile";

/** The contact card on /about, like a phone contact: monogram, name, live clock, actions. */
export function ProfileCard() {
  return (
    <aside aria-label="Contact card" className="widget rounded-[28px] p-6 text-center md:p-8">
      {/* CONTOH — ganti dengan data asli: swap the monogram for a photo */}
      <span aria-hidden="true" className="mx-auto grid size-28 place-items-center rounded-full bg-ink text-48 font-bold tracking-[-0.04em] text-bg">
        AT
      </span>
      <p className="mt-5 text-24 font-bold tracking-[-0.03em]">{identity.name}</p>
      <p className="text-16 text-muted">
        {identity.role} · {identity.cohort}
      </p>
      <p className="mt-3 inline-flex items-center gap-2 rounded-pill bg-surface-2 px-3 py-1.5 text-14">
        <span className="live-dot" aria-hidden="true" /> {identity.location} · <LiveClock zone={identity.timeZone} className="font-semibold tabular-nums" /> WIB
      </p>
      <div className="mt-6 grid gap-2">
        <a href="/cv.pdf" download="Adelia-Tiara-CV.pdf" className="pill w-full" data-variant="primary">
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
    </aside>
  );
}
