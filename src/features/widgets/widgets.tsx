"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { SendIcon } from "@/components/icons";
import { MociAvatar } from "@/components/MociAvatar";
import { Sticker } from "@/components/Sticker";
import type { Note } from "@/content/guestbook";
import { labItems } from "@/content/lab";
import { dispatch } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { STICKERS, useStickers } from "@/lib/stickers";
import { useLive, wave } from "../live/live-store";
import { OverlapRing } from "./OverlapRing";

export function WidgetTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="type-pixel text-muted">{children}</h3>
      {aside}
    </div>
  );
}

/* ---------- Overlap ---------- */
export function OverlapWidget() {
  return (
    <div data-tour="overlap">
      <WidgetTitle>Our working hours</WidgetTitle>
      <div className="mt-3">
        <OverlapRing />
      </div>
    </div>
  );
}

/* ---------- Ask Moci ---------- */
export function AskWidget() {
  const [q, setQ] = useState("");
  const ask = (text: string) => text.trim() && dispatch({ type: "ask", question: text.trim() });
  return (
    <>
      <div className="flex items-start gap-3">
        <MociAvatar size={44} />
        <div className="rounded-[6px_20px_20px_20px] bg-surface-2 px-4 py-2.5 text-16">Ask me anything about Adelia&apos;s work. I can also open pages for you.</div>
      </div>
      <form
        className="mt-4 flex items-center gap-2 rounded-pill border border-line bg-surface-2 py-1 pr-1 pl-4 focus-within:border-accent"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
          setQ("");
        }}
      >
        <label className="sr-only" htmlFor="ask-widget">
          Your question for Moci
        </label>
        <input id="ask-widget" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Is she open to work?" className="min-w-0 flex-1 bg-transparent py-2 outline-none placeholder:text-muted" />
        <button type="submit" className="pill" data-variant="magenta" data-shape="icon" data-size="sm" aria-label="Ask">
          <SendIcon width={16} height={16} />
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {["Strongest project?", "What's her stack?", "Show me Catat"].map((s, i) => (
          <button key={s} type="button" onClick={() => ask(s)} className="pill" data-variant={i === 0 ? "sun" : undefined} data-size="sm">
            {s}
          </button>
        ))}
      </div>
    </>
  );
}

/* ---------- Presence ---------- */
export function PresenceWidget() {
  const count = useLive((s) => s.count);
  const peers = useLive((s) => s.peers);
  const status = useLive((s) => s.status);
  const me = useLive((s) => s.me);
  const others = peers.filter((p) => p.id !== me?.id);
  return (
    <>
      <WidgetTitle aside={<span className="live-dot" aria-hidden="true" />}>Here now</WidgetTitle>
      <p className="mt-2 text-48 leading-none font-bold tracking-[-0.04em] tabular-nums">{count}</p>
      <p className="text-14 text-muted">{status === "local" ? `tab${count === 1 ? "" : "s"} open (live server offline)` : count === 1 ? "just you. Hi!" : "people browsing"}</p>
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Who's here">
        {me && (
          <li className="chip">
            <span className="size-2.5 rounded-full" style={{ background: `var(--${me.color})` }} aria-hidden="true" />
            {status === "local" ? "you" : `${me.name} (you)`}
          </li>
        )}
        {others.slice(0, 4).map((p) => (
          <li key={p.id} className="chip">
            <span className="size-2.5 rounded-full" style={{ background: `var(--${p.color})` }} aria-hidden="true" />
            {p.name}
          </li>
        ))}
      </ul>
      <button type="button" className="pill mt-3" data-size="sm" data-variant="sky" onClick={wave} disabled={count < 2}>
        👋 Wave
      </button>
    </>
  );
}

/* ---------- Stickers ---------- */
export function StickersWidget() {
  const unlocked = useStickers((s) => s.unlocked);
  const shown = STICKERS.filter((s) => !s.secret).slice(0, 6);
  return (
    <>
      <WidgetTitle>
        Stickers {unlocked.length}/{STICKERS.length}
      </WidgetTitle>
      <ul className="mt-3 grid grid-cols-3 gap-1.5" aria-label="Sticker collection preview">
        {shown.map((s) => {
          const has = unlocked.includes(s.id);
          return (
            <li key={s.id} className="grid place-items-center" title={has ? s.name : s.hint}>
              <Sticker id={s.id} locked={!has} size={44} />
              <span className="sr-only">{has ? `${s.name}, unlocked` : `Locked: ${s.hint}`}</span>
            </li>
          );
        })}
      </ul>
      <button type="button" className="pill mt-3" data-variant="sun" data-size="sm" onClick={() => dispatch({ type: "open", panel: "stickers" })}>
        Open book
      </button>
    </>
  );
}

/* ---------- Lab ---------- */
export function LabWidget() {
  const subs = labItems.filter((l) => l.where === "subdomain").length;
  const site = labItems.filter((l) => l.where === "site").length;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-4">
        <WidgetTitle>The lab</WidgetTitle>
        <svg aria-hidden="true" viewBox="0 0 100 140" className="-mt-1 w-14 shrink-0">
          <rect x="24" y="96" width="52" height="40" rx="12" fill="var(--accent)" />
          <circle cx="50" cy="52" r="44" fill="color-mix(in srgb, var(--sky) 22%, var(--surface))" stroke="var(--glass-line)" strokeWidth="2" />
          {["--accent", "--sun", "--lime", "--cobalt", "--violet", "--mint", "--pink", "--cyan"].map((c, i) => (
            <circle key={i} cx={28 + (i % 4) * 15} cy={44 + Math.floor(i / 4) * 16 + (i % 2) * 4} r="7" fill={`var(${c})`} />
          ))}
          <circle cx="50" cy="116" r="8" fill="#fff" />
          <ellipse cx="34" cy="28" rx="12" ry="6" fill="#fff" opacity="0.7" />
        </svg>
      </div>
      <p className="mt-4 text-24 leading-tight font-bold tracking-[-0.025em]">
        {subs} experiments on their own subdomains, {site} more built into this site.
      </p>
      <Link href="/lab" className="link-arrow mt-auto pt-5 text-16">
        Turn the gumball knob
      </Link>
    </div>
  );
}

/* ---------- Guestbook ---------- */
const TONE_BG: Record<string, string> = { magenta: "bg-pink", cobalt: "bg-sky", sun: "bg-sun", lime: "bg-lime", violet: "bg-violet", mint: "bg-mint", sky: "bg-sky", ink: "bg-surface-2" };

export function GuestbookWidget() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const nonce = useLive((s) => s.noteNonce);
  useEffect(() => {
    let alive = true;
    fetch("/api/guestbook?limit=2")
      .then((r) => r.json())
      .then((d: { notes: Note[] }) => alive && setNotes(d.notes))
      .catch(() => alive && setNotes([]));
    return () => {
      alive = false;
    };
  }, [nonce]);
  return (
    <>
      <WidgetTitle>Guestbook</WidgetTitle>
      <ul className="mt-3 space-y-2">
        {(notes ?? []).map((n, i) => (
          <li key={n.id} className={cn("sticker rounded-[12px] px-3 py-2 text-14 text-on-fill", TONE_BG[n.color === "magenta" ? "magenta" : n.color])} style={{ rotate: `${i % 2 ? 1.5 : -1.5}deg` }}>
            <span aria-hidden="true">{n.sticker} </span>
            {n.message}
            <span className="mt-0.5 block text-12 font-semibold">— {n.name}</span>
          </li>
        ))}
        {notes === null && <li className="text-14 text-muted">Loading notes…</li>}
      </ul>
      <Link href="/guestbook" className="pill mt-3" data-size="sm">
        Sign it
      </Link>
    </>
  );
}

/* ---------- Terminal ---------- */
export function TerminalWidget() {
  return (
    <div className="flex h-full flex-col">
      <WidgetTitle aside={<kbd>`</kbd>}>Prefer a CLI?</WidgetTitle>
      <div className="type-code mt-3 flex-1 rounded-sm bg-term-bg px-4 py-3 text-14 text-term-ink" aria-hidden="true">
        <p>
          <span className="text-term-accent">visitor@adelia.cc:~$</span> ls work
        </p>
        <p className="text-term-muted">tenderlens.md catat.md lintas.md</p>
        <p>
          <span className="text-term-accent">visitor@adelia.cc:~$</span> sudo hire adelia
        </p>
        <p className="text-term-ok">Permission granted. Excellent decision.</p>
        <p>
          <span className="text-term-accent">visitor@adelia.cc:~$</span> <span className="inline-block h-4 w-2 translate-y-0.5 bg-term-accent motion-safe:animate-[blink_1s_steps(2)_infinite]" />
        </p>
      </div>
      <button type="button" className="pill mt-3 self-start" data-variant="ink" data-size="sm" onClick={() => dispatch({ type: "open", panel: "terminal" })}>
        Open the terminal
      </button>
    </div>
  );
}
