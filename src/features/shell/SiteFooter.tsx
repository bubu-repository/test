"use client";

import Link from "next/link";
import { CopyEmail } from "@/components/CopyEmail";
import { DownloadIcon } from "@/components/icons";
import { LiveClock } from "@/components/LiveClock";
import { bio, edition, identity, nav, socials } from "@/content/profile";
import { dispatch } from "@/lib/actions";
import { useNow, useVisitorZone } from "@/lib/hooks";
import { STICKERS, useStickers } from "@/lib/stickers";
import { probableStatus, zoneCity } from "@/lib/time";
import { useUI } from "@/lib/ui";
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

export function SiteFooter() {
  const collected = useStickers((s) => s.unlocked.length);
  const xray = useUI((s) => s.xray);
  const here = useLive((s) => s.count);

  return (
    <footer id="contact" className="mt-auto scroll-mt-20" data-xr="SiteFooter · live clocks + one-click email">
      <div className="container-page py-24 text-center md:py-32">
        <p className="type-eyebrow">Say hello</p>
        <h2 className="type-display mx-auto mt-4 max-w-[15ch]">
          Let&apos;s build something people <span className="sticker-text">actually</span> use.
        </h2>
        <p className="mx-auto mt-5 max-w-[46ch] text-muted">{bio.availability} Replies within a day.</p>
        <p className="mt-6">
          <a href={`mailto:${identity.email}`} className="link text-[clamp(20px,2.2vw,28px)] font-semibold tracking-[-0.015em] break-all">
            {identity.email}
          </a>
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <CopyEmail size="lg" tour />
          <a href="/cv.pdf" download="Adelia-Tiara-CV.pdf" className="pill" data-size="lg">
            <DownloadIcon width={18} height={18} /> Download CV
          </a>
          <button type="button" className="link-arrow js-only ml-1 text-16" onClick={() => dispatch({ type: "open", panel: "brief" })}>
            The 40-second brief
          </button>
        </div>
      </div>

      {/* The spec plate: a printed label panel, like the back of a device. */}
      <div className="container-page pb-10">
        <div className="spec-plate">
          <span className="screw absolute top-3 left-3" aria-hidden="true" />
          <span className="screw absolute top-3 right-3" aria-hidden="true" />
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
              <p className="mt-2 text-ink">AI products, end to end</p>
              <p className="mt-1">Interfaces, agents, evals</p>
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
                {socials
                  .filter((s) => s.href)
                  .map((s) => (
                    <li key={s.label}>
                      <a href={s.href!} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
                        {s.label} ↗<span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
              </ul>
            </nav>
            <div className="js-only">
              <p className="spec-label">System</p>
              <div className="mt-1 -ml-3 flex flex-wrap items-center gap-1 lg:flex-col lg:items-start">
                <button type="button" className="pill" data-variant="ghost" data-size="sm" onClick={() => dispatch({ type: "open", panel: "stickers" })}>
                  Stickers {collected}/{STICKERS.length}
                </button>
                <button type="button" className="pill" data-variant="ghost" data-size="sm" aria-pressed={xray} onClick={() => dispatch({ type: "xray" })}>
                  X-ray {xray ? "on" : "off"}
                </button>
                <button type="button" className="pill" data-variant="ghost" data-size="sm" onClick={() => dispatch({ type: "open", panel: "shortcuts" })}>
                  <kbd aria-hidden="true">?</kbd> Shortcuts
                </button>
              </div>
            </div>
          </div>
          <p className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-dashed border-line pt-4 font-mono text-[10px] tracking-[0.14em] uppercase">
            <span>
              © {edition} {identity.name}
            </span>
            <span>Designed &amp; built in {identity.city}</span>
            <span className="sm:ml-auto">Model AT-26 · Rev. {edition}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
