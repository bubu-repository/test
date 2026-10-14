"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Sticker } from "@/components/Sticker";
import { identity } from "@/content/profile";
import { dispatch } from "@/lib/actions";
import { useNow } from "@/lib/hooks";
import { formatTime } from "@/lib/time";
import { sfx } from "@/lib/sound";
import { BoxArt, CvArt, FishArt, MociArt, TILE } from "../../shell/DockIcons";

function TerminalArt() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="m14 18 7 6-7 6" stroke="#7FD7FF" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M25 31h9" stroke="#E8EEF9" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

type App = { label: string; bg: string; art: ReactNode; href?: string; run?: () => void };

const APPS: App[] = [
  { label: "Work", bg: TILE.white, art: <BoxArt />, href: "/work" },
  { label: "CV", bg: TILE.white, art: <CvArt />, run: () => void dispatch({ type: "download", href: "/cv.pdf", filename: "Adelia-Tiara-CV.pdf" }) },
  { label: "Ask Moci", bg: TILE.white, art: <MociArt />, run: () => void dispatch({ type: "open", panel: "agent" }) },
  { label: "Terminal", bg: "linear-gradient(180deg, #1B2A4A, #0E1630)", art: <TerminalArt />, run: () => void dispatch({ type: "open", panel: "terminal" }) },
  { label: "Guestbook", bg: TILE.aqua, art: <FishArt />, href: "/guestbook" },
];

/** The stickers on her closed lid: where each sits (in % of the lid), its size (in % of the laptop) and its tilt. */
const LID_STICKERS = [
  { id: "hello", x: "31%", y: "34%", s: "12.5cqi", r: "-12deg" },
  { id: "studio", x: "64%", y: "30%", s: "11cqi", r: "9deg" },
  { id: "wave", x: "40%", y: "72%", s: "10cqi", r: "16deg" },
];

/**
 * Her laptop, closed on a gingham desk mat, with stickers on the lid and a post-it that says
 * "open me". Open it and the lid lifts to a small desktop: the work, the CV, Moci, the terminal and
 * the guestbook, each one press away. Esc (or the close key) shuts the lid.
 */
export function DeskLaptop() {
  const [open, setOpen] = useState(false);
  const desktopRef = useRef<HTMLDivElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const now = useNow();

  useEffect(() => {
    if (!open) return;
    // Wait for the lid to lift before moving focus into the desktop.
    const t = window.setTimeout(() => desktopRef.current?.querySelector<HTMLElement>(".dlaptop__app")?.focus({ preventScroll: true }), 260);
    return () => window.clearTimeout(t);
  }, [open]);

  const close = () => {
    setOpen(false);
    sfx.tap();
    window.setTimeout(() => openRef.current?.focus({ preventScroll: true }), 0);
  };

  return (
    <div className="dlaptop" data-open={open || undefined}>
      <span className="dlaptop__mat" aria-hidden="true" />
      <span className="dlaptop__shade" aria-hidden="true" />
      <div className="dlaptop__lid">
        <div
          ref={desktopRef}
          className="dlaptop__screen"
          role="group"
          aria-label="Her laptop's desktop"
          inert={!open}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              close();
            }
          }}
        >
          <div className="dlaptop__bar">
            <button type="button" className="dlaptop__close" aria-label="Close the laptop" onClick={close}>
              <span aria-hidden="true" />
            </button>
            <span className="font-semibold">{identity.firstName.toLowerCase()}</span>
            <span className="ml-auto tabular-nums">{now ? formatTime(identity.timeZone, new Date(now * 1000)) : "--:--"}</span>
          </div>
          <ul className="dlaptop__apps">
            {APPS.map((app, i) => {
              const body = (
                <>
                  <span className="app-icon app-icon--art" style={{ "--app-bg": app.bg } as CSSProperties}>
                    {app.art}
                  </span>
                  <span className="dlaptop__name">{app.label}</span>
                </>
              );
              return (
                <li key={app.label} style={{ "--i": i } as CSSProperties}>
                  {app.href ? (
                    <Link href={app.href} className="dlaptop__app">
                      {body}
                    </Link>
                  ) : (
                    <button type="button" className="dlaptop__app" onClick={app.run}>
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <span className="dlaptop__base" aria-hidden="true" />
      <span className="dlaptop__shell" aria-hidden="true">
        <span className="dlaptop__mark">a.</span>
        {LID_STICKERS.map((st) => (
          <span key={st.id} className="dlaptop__sticker" style={{ "--x": st.x, "--y": st.y, "--s": st.s, "--r": st.r } as CSSProperties}>
            <Sticker id={st.id} size={48} />
          </span>
        ))}
      </span>
      <span className="dlaptop__note" aria-hidden="true">
        open
        <br />
        me
      </span>
      {!open && (
        <button
          ref={openRef}
          type="button"
          className="dlaptop__open"
          aria-label="Open her laptop"
          onClick={() => {
            setOpen(true);
            sfx.tap();
          }}
        >
          <span className="dlaptop__hint">Open</span>
        </button>
      )}
    </div>
  );
}
