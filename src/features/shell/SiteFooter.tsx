"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CopyEmail } from "@/components/CopyEmail";
import { DownloadIcon } from "@/components/icons";
import { LiveClock } from "@/components/LiveClock";
import { bio, edition, identity, nav, socials } from "@/content/profile";
import { dispatch } from "@/lib/actions";
import { useNow, useVisitorZone } from "@/lib/hooks";
import { probableStatus, zoneCity } from "@/lib/time";
import { useLive } from "../live/live-store";

function Status() {
  const now = useNow();
  const status = now ? probableStatus(new Date(now * 1000)) : null;
  return <span>{status ? `probably ${status.label.charAt(0).toLowerCase()}${status.label.slice(1)}` : "…"}</span>;
}

function VisitorClock() {
  const zone = useVisitorZone();
  if (!zone || zone === identity.timeZone) return null;
  return (
    <span>
      {zoneCity(zone)} <LiveClock zone="local" className="text-ink tabular-nums" />
    </span>
  );
}

/** Under the case studies and the colophon: a quiet contact strip, so the work ends on the work. */
function CompactFooter() {
  return (
    <footer id="contact" className="footer-bar on-water mt-auto scroll-mt-20">
      <div className="container-page flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-18 font-bold tracking-[-0.02em]">
            {identity.name} · {identity.role}
          </p>
          <p className="mt-1 text-14 text-muted">{bio.availability} Replies within a day.</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 md:flex-nowrap">
          <CopyEmail />
          <a href="/cv.pdf" download="Adelia-Tiara-CV.pdf" className="pill">
            <DownloadIcon width={18} height={18} /> CV
          </a>
          {socials
            .filter((s) => s.href)
            .map((s) => (
              <a key={s.label} href={s.href!} target="_blank" rel="noopener noreferrer" className="link-arrow text-16">
                {s.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ))}
        </div>
      </div>
    </footer>
  );
}

export function SiteFooter() {
  const here = useLive((s) => s.count);
  const path = usePathname();
  if (path.startsWith("/work/") || path === "/colophon") return <CompactFooter />;

  return (
    <footer id="contact" className="deep-sea on-water mt-auto scroll-mt-20">
      {/* Contact: the email is the headline. Copy, CV and the brief right under it. */}
      <div className="container-page pt-16 pb-14 md:pt-24">
        <div className="contact-card">
          <div className="min-w-0">
            <p className="type-eyebrow">Contact</p>
            <p className="mt-5 text-18 font-semibold text-muted">
              {bio.availability} Replies within a day.
            </p>
            <a href={`mailto:${identity.email}`} className="contact-card__email">
              {identity.email}
            </a>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <CopyEmail size="lg" tour variant="light" />
              <a href="/cv.pdf" download="Adelia-Tiara-CV.pdf" className="pill" data-size="lg">
                <DownloadIcon width={18} height={18} /> Download CV
              </a>
              <button type="button" className="link-arrow js-only ml-1 text-16" onClick={() => dispatch({ type: "open", panel: "brief" })}>
                The 40-second brief
              </button>
            </div>
            {socials.some((s) => s.href) && (
              <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-16">
                {socials
                  .filter((s) => s.href)
                  .map((s) => (
                    <a key={s.label} href={s.href!} target="_blank" rel="noopener noreferrer" className="link">
                      {s.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ))}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* The index: where she is, what she does, every page, how it's built. */}
      <div className="site-index">
        <div className="container-page">
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_auto]">
            <div>
              <p className="spec-label">Base</p>
              <p className="mt-2 text-ink">
                {identity.location} · {identity.timeZoneLabel}
              </p>
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                <span>
                  <LiveClock zone={identity.timeZone} className="text-ink tabular-nums" /> there, <Status />
                </span>
                <VisitorClock />
                {here > 1 && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="live-dot" aria-hidden="true" /> {here} here now
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="spec-label">Focus</p>
              <p className="mt-2 text-ink">AI product engineering</p>
              <p className="mt-1">Pipelines, evals, interfaces</p>
            </div>
            <nav aria-label="Footer">
              <p className="spec-label">Index</p>
              <ul className="mt-2 grid grid-cols-2 gap-x-5 gap-y-1">
                <li>
                  <Link href="/" className="hover:text-ink">
                    Home
                  </Link>
                </li>
                {nav.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="hover:text-ink">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div>
              <p className="spec-label">Engineering</p>
              <ul className="mt-2 space-y-1">
                <li>
                  <Link href="/colophon" className="hover:text-ink">
                    How this site is built
                  </Link>
                </li>
                <li>
                  <Link href="/colophon#eval" className="hover:text-ink">
                    Run Moci&apos;s eval
                  </Link>
                </li>
                <li className="js-only">
                  <button type="button" className="hover:text-ink" onClick={() => dispatch({ type: "open", panel: "shortcuts" })}>
                    Keyboard shortcuts
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-dashed border-line pt-4 font-mono text-[10px] tracking-[0.14em] uppercase">
            <span>
              © {edition} {identity.name}
            </span>
            <span>Designed &amp; built in {identity.city}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
