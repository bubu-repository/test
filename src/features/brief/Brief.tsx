"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { Dialog } from "@/components/Dialog";
import { CopyIcon, DownloadIcon, PauseIcon, PlayIcon } from "@/components/icons";
import { bio, identity } from "@/content/profile";
import { projects } from "@/content/projects";
import { dispatch } from "@/lib/actions";
import { useVisitorZone } from "@/lib/hooks";
import { formatHour, workingOverlap, zoneCity } from "@/lib/time";
import { Sticker } from "@/components/Sticker";
import { stickerStore, unlock } from "@/lib/stickers";
import { ui, useUI } from "@/lib/ui";

const SECONDS = 40;

/** For recruiters in a hurry: everything that matters on one card, with a timer you can pause. */
export function Brief() {
  const open = useUI((s) => s.overlay === "brief");
  // Mounted fresh every time the brief opens, so initial state is the reset.
  const [left, setLeft] = useState(SECONDS);
  const [paused, setPaused] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const zone = useVisitorZone();
  const titleId = useId();
  // Earned here, so it's celebrated here: a toast would land behind the dialog.
  const [hadSticker] = useState(() => stickerStore.get().unlocked.includes("speed"));
  const earned = left === 0 && !hadSticker;
  const overlap = useMemo(() => {
    if (!zone) return null;
    const o = workingOverlap(zone);
    return o.hours > 0
      ? `${o.hours} working hours overlap with ${zoneCity(zone)} (${o.ranges.map((r) => `${formatHour(r.start)}–${formatHour(r.end)}`).join(", ")} your time)`
      : `No overlap with a 9–18 day in ${zoneCity(zone)}, but she's flexible for calls`;
  }, [zone]);

  useEffect(() => {
    if (!open || paused || left <= 0) return;
    const timer = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [open, paused, left]);

  useEffect(() => {
    if (open && left === 0) unlock("speed", { silent: true });
  }, [open, left]);

  const close = () => ui.set({ overlay: null });
  const progress = left / SECONDS;
  const R = 26;
  const C = 2 * Math.PI * R;

  return (
    <Dialog open={open} onClose={close} labelledBy={titleId} className="max-w-[min(760px,calc(100vw-24px))]">
      <div className="widget max-h-[calc(100dvh-24px)] overflow-y-auto">
        <header className="flex items-center gap-4 rounded-t-card border-b border-line px-5 py-5 md:px-7">
          <div className="relative grid size-16 shrink-0 place-items-center">
            <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden="true">
              <circle cx="32" cy="32" r={R} fill="var(--surface)" stroke="var(--line)" strokeWidth="6" />
              <circle
                cx="32"
                cy="32"
                r={R}
                fill="none"
                stroke={left === 0 ? "var(--lime)" : "var(--accent)"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - progress)}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            {earned ? (
              <Sticker id="speed" size={48} className="brief__sticker relative" />
            ) : (
              <span className="type-pixel relative text-16" aria-hidden="true">
                {left === 0 ? "✓" : left}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="type-pixel text-ink">For recruiters in a hurry</p>
            <h2 id={titleId} className="type-title-2">
              The 40-second version
            </h2>
            {earned && (
              <p className="mt-1.5 text-14 text-muted" role="status">
                Forty seconds, done. The Speed reader sticker is yours.
              </p>
            )}
          </div>
          <button type="button" className="pill" data-shape="icon" data-size="sm" aria-label={paused ? "Resume timer" : "Pause timer"} onClick={() => setPaused((p) => !p)} disabled={left === 0}>
            {paused ? <PlayIcon width={16} height={16} /> : <PauseIcon width={16} height={16} />}
          </button>
        </header>

        <div className="grid gap-5 px-5 py-5 md:grid-cols-2 md:gap-6 md:px-7 md:py-6">
          <section>
            <h3 className="type-headline">Who</h3>
            <p className="mt-2 text-16">
              <strong>{identity.name}</strong>, {identity.role} ({identity.degree}, {identity.cohort.toLowerCase()}) in {identity.location} ({identity.timeZoneLabel}). Fresh graduate. She designs and
              builds AI products people can trust: the interface, the pipeline and the evals. A 6-month AI engineering internship, and three products of her own with real users.
            </p>
          </section>
          <section>
            <h3 className="type-headline">Logistics</h3>
            <ul className="mt-2 space-y-1 text-16">
              <li>{bio.availability}</li>
              <li>{overlap ?? "…"}</li>
              <li>Indonesian and English · replies within 24h</li>
            </ul>
          </section>
          <section className="md:col-span-2">
            <h3 className="type-headline">Proof</h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {projects.map((p) => (
                <li key={p.slug}>
                  <Link href={`/work/${p.slug}`} onClick={close} className="block h-full rounded-sm border border-line bg-surface-2 p-3 transition-colors hover:border-accent">
                    <span className="font-display text-20 font-bold">{p.name}</span>
                    <span className="mt-1 block text-14 text-muted">
                      {p.kind} · {p.context}
                    </span>
                    <span className="mt-2 block text-14 font-semibold">
                      {p.results.metrics[0].value} <span className="font-normal">{p.results.metrics[0].label}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="md:col-span-2">
            <h3 className="type-headline">Strengths</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {["LLM tool use and agents", "Evals with frozen test sets", "Abstention and citations", "TypeScript, Next.js, Python", "Postgres + pgvector", "Field research in Bahasa + English"].map(
                (s) => (
                  <li key={s} className="chip" data-tone="lime">
                    {s}
                  </li>
                ),
              )}
            </ul>
          </section>
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-4 md:px-7">
          <a href="/cv.pdf" download="Adelia-Tiara-CV.pdf" className="pill" data-variant="primary">
            <DownloadIcon width={18} height={18} /> Download CV
          </a>
          <button type="button" className="pill" onClick={() => void dispatch({ type: "copyEmail" })}>
            <CopyIcon width={18} height={18} /> Copy email
          </button>
          <a href={`mailto:${identity.email}?subject=${encodeURIComponent("Hello from your portfolio")}`} className="pill" data-variant="ghost">
            Write an email
          </a>
          <p className="ml-auto text-14 text-muted" role="status">
            {left === 0 ? "Done in 40 seconds. Thanks for reading!" : ""}
          </p>
        </footer>
      </div>
    </Dialog>
  );
}
