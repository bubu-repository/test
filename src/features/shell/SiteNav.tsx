"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { Dialog } from "@/components/Dialog";
import { CloseIcon } from "@/components/icons";
import { Sticker } from "@/components/Sticker";
import { dispatch } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { applySound, getSound, subscribePreferences } from "@/lib/preferences";
import { STICKERS, stickerStore, unlock } from "@/lib/stickers";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/ui";
import { useLive, wave } from "../live/live-store";
import { BoxArt, CalendarArt, CvArt, FishArt, HelpArt, IdCardArt, MociArt, MoreArt, PlaneArt, SearchArt, SparkleArt, SpeakerArt, TILE } from "./DockIcons";

type ItemProps = {
  label: string;
  /** The short word under the icon (defaults to the label up to " ·" or " ("). */
  caption?: string;
  bg: string;
  fg?: string;
  ink?: string;
  active?: boolean;
  className?: string;
  iconClassName?: string;
  children: ReactNode;
  tour?: string;
} & ({ href: string; onClick?: never; pressed?: never } | { href?: never; onClick: () => void; pressed?: boolean });

function DockItem({ label, caption, tip, done: doneText, bg, fg, ink, active, className, iconClassName, children, tour, ...rest }: ItemProps & { tip?: string; done?: string }) {
  // An action confirms right where you clicked it ("Copied ✓"), not only in a toast across the screen.
  const [done, setDone] = useState(false);
  const style = { "--app-bg": bg, "--app-fg": fg ?? "#fff", "--app-ink": ink ?? "#4FB772" } as CSSProperties;
  const inner = (
    <>
      <span className={cn("app-icon app-icon--art", bg === TILE.white && "app-icon--white", iconClassName)} style={style}>
        {children}
      </span>
      <span className="dock-caption" aria-hidden="true">
        {caption ?? label.split(/ ·| \(/)[0]}
      </span>
      {/* The tooltip: shown on hover only when it says more than the caption, and while magnified (when the caption fades under the grown icon). */}
      <span className="dock-label" data-extra={tip ? "" : undefined} aria-hidden="true">
        {done ? doneText : (tip ?? caption ?? label.split(/ ·| \(/)[0])}
      </span>
      {active && <span className="dock-dot" aria-hidden="true" />}
    </>
  );
  if ("href" in rest && rest.href) {
    return (
      <Link href={rest.href} aria-label={label} aria-current={active ? "page" : undefined} className={cn("dock-item", className)} data-dock-item data-tour={tour}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={rest.pressed}
      data-done={done || undefined}
      onClick={() => {
        rest.onClick?.();
        if (!doneText) return;
        setDone(true);
        window.setTimeout(() => setDone(false), 1600);
      }}
      className={cn("dock-item js-only", className)}
      data-dock-item
      data-tour={tour}
    >
      {inner}
    </button>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

const serverSound = () => false;

/**
 * The primary navigation, as a dock: illustrated app icons (a shaded object on a white or vivid
 * tile) that magnify under the cursor, a dot under the current page, labels on hover or focus.
 * Colour lives here as an accent; the page stays white.
 */
export function SiteNav() {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const dockRef = useRef<HTMLElement>(null);
  const sound = useSyncExternalStore(subscribePreferences, getSound, serverSound);
  const count = useLive((s) => s.count);
  const stickerCount = useStore(stickerStore, (s) => s.unlocked.length);

  // Magnification, like the macOS dock: icons near the pointer grow, pushing their neighbours aside.
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0;
    let x = 0;
    // Centres are measured once, at rest, when the pointer comes in: paint() then only writes.
    let rest: { el: HTMLElement; c: number }[] = [];
    const items = () => Array.from(dock.querySelectorAll<HTMLElement>("[data-dock-item]"));
    const measure = () => {
      rest = items().map((el) => {
        const r = el.getBoundingClientRect();
        return { el, c: r.left + r.width / 2 };
      });
    };
    const paint = () => {
      raf = 0;
      for (const { el, c } of rest) {
        const k = Math.max(0, 1 - Math.abs(x - c) / 150);
        el.style.setProperty("--m", (1 + 0.42 * k * k).toFixed(3));
      }
    };
    const onEnter = () => {
      if (dock.dataset.magnify !== "on") measure();
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      if (!rest.length) measure();
      dock.dataset.magnify = "on";
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      dock.dataset.magnify = "off";
      for (const el of items()) el.style.setProperty("--m", "1");
      rest = [];
    };
    dock.addEventListener("pointerenter", onEnter);
    dock.addEventListener("pointermove", onMove);
    dock.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      dock.removeEventListener("pointerenter", onEnter);
      dock.removeEventListener("pointermove", onMove);
      dock.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // Out of the way while reading: the dock slides up on scroll down and comes back on scroll up,
  // on focus, or when the pointer goes near the top edge.
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    let last = window.scrollY;
    let raf = 0;
    const set = (hidden: boolean) => {
      if (hidden && header.contains(document.activeElement)) return;
      header.toggleAttribute("data-hidden", hidden);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        if (y < 140) set(false);
        else if (y > last + 6) set(true);
        else if (y < last - 6) set(false);
        last = y;
      });
    };
    const onMove = (e: PointerEvent) => {
      if (e.clientY < 72) set(false);
    };
    const onFocus = () => set(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    header.addEventListener("focusin", onFocus);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      header.removeEventListener("focusin", onFocus);
    };
  }, []);

  return (
    <header ref={headerRef} className="site-header pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-2 pt-3 md:pt-4">
      <nav ref={dockRef} aria-label="Primary" data-tour="dock" className="dock glass-strong pointer-events-auto">
        <DockItem href="/" label="Home" bg={TILE.white} fg="#0B1F33" active={pathname === "/"}>
          <span className="text-[calc(22px*var(--m,1))] leading-none font-bold tracking-[-0.06em]">
            a<span className="text-accent">.</span>
          </span>
        </DockItem>
        <span className="dock-sep" aria-hidden="true" />
        <DockItem href="/work" label="Work" bg={TILE.white} active={isActive(pathname, "/work")} tour="nav-work">
          <BoxArt />
        </DockItem>
        <DockItem href="/about" label="About" bg={TILE.white} active={isActive(pathname, "/about")} tour="nav-about">
          <IdCardArt />
        </DockItem>
        <DockItem href="/lab" label="Lab" bg={TILE.azure} active={isActive(pathname, "/lab")} tour="nav-lab">
          <SparkleArt />
        </DockItem>
        <span className="dock-sep" aria-hidden="true" />
        <DockItem label="Download the CV" caption="CV" tip="Download CV (PDF)" done="Downloading ✓" bg={TILE.white} onClick={() => dispatch({ type: "download", href: "/cv.pdf", filename: "Adelia-Tiara-CV.pdf" })}>
          <CvArt />
        </DockItem>
        <DockItem label="Copy email" caption="Email" tip="Copy email" done="Copied ✓" bg={TILE.aqua} className="max-sm:hidden" onClick={() => dispatch({ type: "copyEmail" })}>
          <PlaneArt />
        </DockItem>
        <DockItem label="More: guestbook, brief, Moci, stickers, search, how it works, sound" caption="More" bg={TILE.white} pressed={menu} onClick={() => setMenu(true)}>
          <MoreArt />
        </DockItem>
      </nav>

      <Dialog open={menu} onClose={() => setMenu(false)} label="More" placement="top" className="pointer-events-auto">
        <div className="glass-strong rounded-[24px] p-4 shadow-lg">
          <div className="flex items-center justify-between pb-3 pl-2">
            <span className="text-18 font-bold tracking-tight">More</span>
            <button type="button" onClick={() => setMenu(false)} className="pill" data-variant="ghost" data-shape="icon" data-size="sm" aria-label="Close">
              <CloseIcon width={18} height={18} />
            </button>
          </div>
          <ul className="grid grid-cols-4 gap-x-2 gap-y-4 text-center text-12 font-medium">
            {[
              { label: "Guestbook", bg: TILE.aqua, art: <FishArt />, href: "/guestbook" },
              { label: "40s brief", bg: TILE.white, art: <CalendarArt />, run: () => dispatch({ type: "open", panel: "brief" }) },
              { label: "Ask Moci", bg: TILE.white, art: <MociArt />, run: () => dispatch({ type: "open", panel: "agent" }) },
              { label: "Copy email", bg: TILE.aqua, art: <PlaneArt />, run: () => dispatch({ type: "copyEmail" }) },
              { label: "Search", bg: TILE.white, art: <SearchArt />, run: () => dispatch({ type: "open", panel: "palette" }) },
              { label: "How it works", bg: TILE.grass, art: <HelpArt />, run: () => dispatch({ type: "tour" }) },
              { label: sound ? "Sound off" : "Sound on", bg: TILE.white, art: <SpeakerArt on={sound} />, run: () => applySound(!sound, { persist: true }) },
              { label: `Stickers ${stickerCount}/${STICKERS.length}`, bg: TILE.white, art: <Sticker id="hello" size={40} />, run: () => dispatch({ type: "open", panel: "stickers" }) },
            ].map((a) => {
              const icon = (
                <span className={cn("app-icon app-icon--art mx-auto", a.bg === TILE.white && "app-icon--white")} style={{ "--app-bg": a.bg, "--size": "52px" } as CSSProperties}>
                  {a.art}
                </span>
              );
              return (
                <li key={a.label}>
                  {a.href ? (
                    <Link href={a.href} onClick={() => setMenu(false)} className="grid gap-1.5 rounded-[16px] p-1">
                      {icon}
                      {a.label}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="grid w-full gap-1.5 rounded-[16px] p-1"
                      onClick={() => {
                        setMenu(false);
                        void a.run?.();
                      }}
                    >
                      {icon}
                      {a.label}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {count > 1 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <span className="chip">
                <span className="live-dot" aria-hidden="true" /> {count} here now
              </span>
              <button
                type="button"
                className="pill"
                data-size="sm"
                onClick={() => {
                  wave();
                  unlock("wave", { silent: true });
                  setMenu(false);
                  toast({ title: "Wave sent", body: `Everyone else here (${count - 1}) sees it.`, tone: "sky", sticker: "wave" });
                }}
              >
                Wave at them
              </button>
            </div>
          )}
        </div>
      </Dialog>
    </header>
  );
}
