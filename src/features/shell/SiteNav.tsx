"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { Dialog } from "@/components/Dialog";
import { CloseIcon } from "@/components/icons";
import { SoundToggle } from "@/components/SoundToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { identity } from "@/content/profile";
import { dispatch } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { useNow } from "@/lib/hooks";
import { applySound, applyTheme, getSound, getTheme, subscribePreferences } from "@/lib/preferences";
import { sfx } from "@/lib/sound";
import { unlock } from "@/lib/stickers";
import { useLive } from "../live/live-store";
import { BoxArt, BubbleArt, CloudArt, MociArt, MoonArt, MoreArt, PlaneArt, SearchArt, SmileyArt, SparkleArt, SpeakerArt, TILE } from "./DockIcons";

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
  cursor?: string;
} & ({ href: string; onClick?: never; pressed?: never } | { href?: never; onClick: () => void; pressed?: boolean });

function DockItem({ label, caption, bg, fg, ink, active, className, iconClassName, children, tour, cursor, ...rest }: ItemProps) {
  const style = { "--app-bg": bg, "--app-fg": fg ?? "#fff", "--app-ink": ink ?? "#1FB24A" } as CSSProperties;
  const inner = (
    <>
      <span className={cn("app-icon app-icon--art", bg === TILE.white && "app-icon--white", iconClassName)} style={style}>
        {children}
      </span>
      <span className="dock-caption" aria-hidden="true">
        {caption ?? label.split(/ ·| \(/)[0]}
      </span>
      <span className="dock-label" aria-hidden="true">
        {label}
      </span>
      {active && <span className="dock-dot" aria-hidden="true" />}
    </>
  );
  if ("href" in rest && rest.href) {
    return (
      <Link href={rest.href} aria-label={label} aria-current={active ? "page" : undefined} className={cn("dock-item", className)} data-dock-item data-tour={tour} data-cursor={cursor ?? label}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={rest.pressed}
      onClick={rest.onClick}
      className={cn("dock-item js-only", className)}
      data-dock-item
      data-tour={tour}
      data-cursor={cursor ?? label}
    >
      {inner}
    </button>
  );
}

/** A desk calendar icon (a pink band with the weekday over the date), showing today in Bekasi (blank until the clock is known). */
function CalendarGlyph() {
  const now = useNow();
  const date = now ? new Date(now * 1000) : null;
  const day = date ? new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: identity.timeZone }).format(date).toUpperCase() : "";
  const num = date ? new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: identity.timeZone }).format(date) : "";
  return (
    <>
      <span className="text-[calc(8.5px*var(--m,1))] font-bold tracking-[0.06em] text-white">{day || " "}</span>
      <span className="text-[calc(20px*var(--m,1))] leading-none font-semibold tracking-[-0.04em]">{num || " "}</span>
    </>
  );
}

function useCalendarLabel() {
  const now = useNow();
  if (!now) return "Today in Bekasi · the 40-second brief";
  const d = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: identity.timeZone }).format(new Date(now * 1000));
  return `${d} in Bekasi · the 40-second brief`;
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

const serverTheme = () => "light" as const;
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
  const theme = useSyncExternalStore(subscribePreferences, getTheme, serverTheme);
  const sound = useSyncExternalStore(subscribePreferences, getSound, serverSound);
  const count = useLive((s) => s.count);
  const calendarLabel = useCalendarLabel();

  // Magnification, like the macOS dock: icons near the pointer grow, pushing their neighbours aside.
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0;
    let x = 0;
    const items = () => Array.from(dock.querySelectorAll<HTMLElement>("[data-dock-item]"));
    const paint = () => {
      raf = 0;
      for (const el of items()) {
        const r = el.getBoundingClientRect();
        const d = Math.abs(x - (r.left + r.width / 2));
        const k = Math.max(0, 1 - d / 150);
        el.style.setProperty("--m", (1 + 0.42 * k * k).toFixed(3));
      }
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      dock.dataset.magnify = "on";
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      dock.dataset.magnify = "off";
      for (const el of items()) el.style.setProperty("--m", "1");
    };
    dock.addEventListener("pointermove", onMove);
    dock.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
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

  const isDark = theme === "dark";
  const toggleTheme = () => {
    const el = dockRef.current?.querySelector<HTMLElement>('[data-tour="theme"]');
    const rect = el?.getBoundingClientRect();
    const root = document.documentElement;
    if (rect) {
      root.style.setProperty("--swap-x", `${rect.left + rect.width / 2}px`);
      root.style.setProperty("--swap-y", `${rect.top + rect.height / 2}px`);
    }
    sfx.pop();
    applyTheme(isDark ? "light" : "dark", { persist: true });
    if (!isDark) unlock("night");
  };

  return (
    <header ref={headerRef} className="site-header pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-2 pt-3 md:pt-4">
      <nav ref={dockRef} aria-label="Primary" data-xr="Dock · app icons with magnification" className="dock glass-strong pointer-events-auto">
        <DockItem href="/" label="Home" bg={TILE.white} fg="#1D2A4D" active={pathname === "/"} cursor="Home">
          <span className="text-[calc(22px*var(--m,1))] leading-none font-bold tracking-[-0.06em]">
            a<span className="text-accent">.</span>
          </span>
        </DockItem>
        <span className="dock-sep" aria-hidden="true" />
        <DockItem href="/work" label="Work" bg={TILE.white} active={isActive(pathname, "/work")} tour="nav-work">
          <BoxArt />
        </DockItem>
        <DockItem href="/lab" label="Lab" bg={TILE.purple} active={isActive(pathname, "/lab")} tour="nav-lab">
          <SparkleArt />
        </DockItem>
        <DockItem href="/about" label="About" bg={TILE.white} active={isActive(pathname, "/about")} tour="nav-about">
          <SmileyArt />
        </DockItem>
        <DockItem
          href="/guestbook"
          label={count > 1 ? `Guestbook · ${count} here now` : "Guestbook"}
          bg={TILE.lime}
          active={isActive(pathname, "/guestbook")}
          tour="nav-guestbook"
          className="max-sm:hidden"
        >
          <BubbleArt />
        </DockItem>
        <DockItem
          label={calendarLabel}
          caption="Brief"
          bg={TILE.white}
          fg="#1D2A4D"
          iconClassName="app-icon--calendar"
          className="max-md:hidden"
          onClick={() => dispatch({ type: "open", panel: "brief" })}
          cursor="Brief"
        >
          <CalendarGlyph />
        </DockItem>
        <DockItem label="Copy email" caption="Email" bg={TILE.blue} className="max-sm:hidden" onClick={() => dispatch({ type: "copyEmail" })} cursor="Copy">
          <PlaneArt />
        </DockItem>
        <DockItem label="Ask Moci (/)" caption="Moci" bg={TILE.white} onClick={() => dispatch({ type: "open", panel: "agent" })} cursor="Ask">
          <MociArt />
        </DockItem>
        <span className="dock-sep max-sm:hidden" aria-hidden="true" />
        <DockItem label="Search and commands (⌘K)" caption="Search" bg={TILE.white} className="max-sm:hidden" onClick={() => dispatch({ type: "open", panel: "palette" })} cursor="⌘K">
          <SearchArt />
        </DockItem>
        <DockItem label={isDark ? "Day sky" : "Night sky"} caption={isDark ? "Day" : "Night"} bg={isDark ? TILE.blue : TILE.navy} pressed={isDark} className="max-md:hidden" onClick={toggleTheme} tour="theme">
          {isDark ? <CloudArt /> : <MoonArt />}
        </DockItem>
        <DockItem
          label={sound ? "Sound on" : "Sound off"}
          caption="Sound"
          bg={TILE.white}
          pressed={sound}
          className="max-lg:hidden"
          onClick={() => applySound(!sound, { persist: true })}
          cursor={sound ? "Mute" : "Sound"}
        >
          <SpeakerArt on={sound} />
        </DockItem>
        <DockItem label="More" bg={TILE.white} className="md:hidden" pressed={menu} onClick={() => setMenu(true)}>
          <MoreArt />
        </DockItem>
      </nav>

      <Dialog open={menu} onClose={() => setMenu(false)} label="More" placement="top" className="pointer-events-auto">
        <div className="glass-strong rounded-[32px] p-4 shadow-lg">
          <div className="flex items-center justify-between pb-3 pl-2">
            <span className="text-18 font-bold tracking-tight">More</span>
            <button type="button" onClick={() => setMenu(false)} className="pill" data-variant="ghost" data-shape="icon" data-size="sm" aria-label="Close">
              <CloseIcon width={18} height={18} />
            </button>
          </div>
          <ul className="grid grid-cols-4 gap-y-4 text-center text-12 font-medium">
            {[
              { label: "Guestbook", bg: TILE.lime, art: <BubbleArt />, href: "/guestbook" },
              { label: "Copy email", bg: TILE.blue, art: <PlaneArt />, run: () => dispatch({ type: "copyEmail" }) },
              { label: "Search", bg: TILE.white, art: <SearchArt />, run: () => dispatch({ type: "open", panel: "palette" }) },
              { label: "40s brief", bg: TILE.purple, art: <SparkleArt />, run: () => dispatch({ type: "open", panel: "brief" }) },
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
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <ThemeToggle />
            <SoundToggle />
            <button
              type="button"
              className="pill"
              data-size="sm"
              onClick={() => {
                setMenu(false);
                void dispatch({ type: "tour" });
              }}
            >
              Autopilot tour
            </button>
            {count > 0 && (
              <span className="chip">
                <span className="live-dot" aria-hidden="true" /> {count} here now
              </span>
            )}
          </div>
        </div>
      </Dialog>
    </header>
  );
}
