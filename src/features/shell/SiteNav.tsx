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

/* ---------- App icon glyphs (white on the icon colour) ---------- */
const G = {
  folder: <path d="M3 7.6A2.6 2.6 0 0 1 5.6 5h3.5l2.1 2.1h7.2A2.6 2.6 0 0 1 21 9.7v7.7a2.6 2.6 0 0 1-2.6 2.6H5.6A2.6 2.6 0 0 1 3 17.4Z" fill="currentColor" />,
  sparkles: (
    <>
      <path d="M10.5 3.5 12.3 8.7 17.5 10.5 12.3 12.3 10.5 17.5 8.7 12.3 3.5 10.5 8.7 8.7Z" fill="currentColor" />
      <path d="M18 14.5 18.8 16.7 21 17.5 18.8 18.3 18 20.5 17.2 18.3 15 17.5 17.2 16.7Z" fill="currentColor" />
    </>
  ),
  heart: <path d="M12 20.2s-7.6-4.6-7.6-10.3A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.6 2.7c0 5.7-7.6 10.3-7.6 10.3Z" fill="currentColor" />,
  bubble: <path d="M5.2 4.5h13.6a2.2 2.2 0 0 1 2.2 2.2v8.4a2.2 2.2 0 0 1-2.2 2.2h-6.1L8 20.8v-3.5H5.2A2.2 2.2 0 0 1 3 15.1V6.7a2.2 2.2 0 0 1 2.2-2.2Z" fill="currentColor" />,
  contact: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2.6" fill="currentColor" />
      <circle cx="12" cy="10.4" r="2.6" fill="var(--app-ink)" />
      <path d="M7.4 16.6c.8-2 2.6-3 4.6-3s3.8 1 4.6 3" stroke="var(--app-ink)" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="5.5" stroke="currentColor" strokeWidth="2.4" fill="none" />
      <path d="m15 15 4.5 4.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  moon: <path d="M19 14.6A7.5 7.5 0 0 1 9.4 5a7.5 7.5 0 1 0 9.6 9.6Z" fill="currentColor" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" fill="currentColor" />
      <path d="M12 2.8v2M12 19.2v2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M2.8 12h2M19.2 12h2M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  soundOn: (
    <>
      <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4Z" fill="currentColor" />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  ),
  soundOff: (
    <>
      <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4Z" fill="currentColor" />
      <path d="m16 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  more: (
    <>
      <circle cx="6" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="18" cy="12" r="1.8" fill="currentColor" />
    </>
  ),
};

/** Icon colours: small and vivid, the most saturated colour in the chrome. Each is a soft top-to-bottom gradient. */
const TINT = {
  work: "linear-gradient(180deg, #6CC4FF, #2F7BFF)",
  lab: "linear-gradient(180deg, #C4A8FF, #8B5CF6)",
  about: "linear-gradient(180deg, #8CE6F5, #12A8CC)",
  guestbook: "linear-gradient(180deg, #8EF0DE, #14B8A6)",
  contact: "linear-gradient(180deg, #C2CAFF, #6D7CF5)",
  moci: "radial-gradient(45% 35% at 32% 26%, rgba(255, 255, 255, 0.95), transparent 70%), radial-gradient(130% 120% at 50% 100%, #4DB3FF 0%, #BFE3FF 55%, #F4FAFF 100%)",
  grey: "linear-gradient(180deg, #F8FBFF, #DCE6F2)",
  night: "linear-gradient(180deg, #3A4A78, #1D2A4D)",
};

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

type ItemProps = {
  label: string;
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

function DockItem({ label, bg, fg, ink, active, className, iconClassName, children, tour, cursor, ...rest }: ItemProps) {
  const style = { "--app-bg": bg, "--app-fg": fg ?? "#fff", "--app-ink": ink ?? "#1FB24A" } as CSSProperties;
  const inner = (
    <>
      <span className={cn("app-icon", iconClassName)} style={style}>
        {children}
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

/** The iOS calendar icon, showing today's date in Bekasi (blank until the clock is known). */
function CalendarGlyph() {
  const now = useNow();
  const date = now ? new Date(now * 1000) : null;
  const day = date ? new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: identity.timeZone }).format(date).toUpperCase() : "";
  const num = date ? new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: identity.timeZone }).format(date) : "";
  return (
    <>
      <span className="text-[calc(9px*var(--m,1))] font-bold tracking-[0.02em] text-[#F21D5B]">{day || " "}</span>
      <span className="text-[calc(21px*var(--m,1))] leading-[0.95] font-medium tracking-[-0.04em]">{num || " "}</span>
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
 * The primary navigation, as a dock: glossy app icons that magnify under the cursor, a dot under
 * the current page, labels on hover or focus. Colour lives here as an accent; the page stays white.
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
    <header className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-2 pt-3 md:pt-4">
      <nav ref={dockRef} aria-label="Primary" data-xr="Dock · app icons with magnification" className="dock glass-strong pointer-events-auto">
        <DockItem href="/" label="Home" bg="var(--surface)" fg="var(--ink)" active={pathname === "/"} cursor="Home">
          <span className="text-[calc(22px*var(--m,1))] leading-none font-bold tracking-[-0.06em]">
            a<span className="text-accent">.</span>
          </span>
        </DockItem>
        <span className="dock-sep" aria-hidden="true" />
        <DockItem href="/work" label="Work" bg={TINT.work} active={isActive(pathname, "/work")} tour="nav-work">
          <Glyph>{G.folder}</Glyph>
        </DockItem>
        <DockItem href="/lab" label="Lab" bg={TINT.lab} active={isActive(pathname, "/lab")} tour="nav-lab">
          <Glyph>{G.sparkles}</Glyph>
        </DockItem>
        <DockItem href="/about" label="About" bg={TINT.about} active={isActive(pathname, "/about")} tour="nav-about">
          <Glyph>{G.heart}</Glyph>
        </DockItem>
        <DockItem href="/guestbook" label={count > 1 ? `Guestbook · ${count} here now` : "Guestbook"} bg={TINT.guestbook} active={isActive(pathname, "/guestbook")} tour="nav-guestbook" className="max-sm:hidden">
          <Glyph>{G.bubble}</Glyph>
        </DockItem>
        <DockItem label={calendarLabel} bg="#fff" fg="#1D1D1F" iconClassName="app-icon--calendar" className="max-md:hidden" onClick={() => dispatch({ type: "open", panel: "brief" })} cursor="Brief">
          <CalendarGlyph />
        </DockItem>
        <DockItem label="Copy email" bg={TINT.contact} className="max-sm:hidden" onClick={() => dispatch({ type: "copyEmail" })} cursor="Copy">
          <Glyph>{G.contact}</Glyph>
        </DockItem>
        <DockItem label="Ask Moci (/)" bg={TINT.moci} onClick={() => dispatch({ type: "open", panel: "agent" })} cursor="Ask">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <ellipse cx="9" cy="12" rx="1.6" ry="2.1" fill="#1D2A4D" />
            <ellipse cx="15" cy="12" rx="1.6" ry="2.1" fill="#1D2A4D" />
            <ellipse cx="7.2" cy="14.6" rx="1.4" ry="0.8" fill="#FF9CC9" opacity="0.8" />
            <ellipse cx="16.8" cy="14.6" rx="1.4" ry="0.8" fill="#FF9CC9" opacity="0.8" />
            <path d="M10.4 16a2.2 2.2 0 0 0 3.2 0" stroke="#1D2A4D" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
        </DockItem>
        <span className="dock-sep max-sm:hidden" aria-hidden="true" />
        <DockItem label="Search and commands (⌘K)" bg={TINT.grey} fg="#3A3A40" className="max-sm:hidden" onClick={() => dispatch({ type: "open", panel: "palette" })} cursor="⌘K">
          <Glyph>{G.search}</Glyph>
        </DockItem>
        <DockItem label={isDark ? "Day sky" : "Night sky"} bg={isDark ? TINT.grey : TINT.night} fg={isDark ? "#3060E6" : "#F5F8FC"} pressed={isDark} className="max-md:hidden" onClick={toggleTheme} tour="theme">
          <Glyph>{isDark ? G.sun : G.moon}</Glyph>
        </DockItem>
        <DockItem label={sound ? "Sound on" : "Sound off"} bg={TINT.grey} fg="#3A3A40" pressed={sound} className="max-lg:hidden" onClick={() => applySound(!sound, { persist: true })} cursor={sound ? "Mute" : "Sound"}>
          <Glyph>{sound ? G.soundOn : G.soundOff}</Glyph>
        </DockItem>
        <DockItem label="More" bg={TINT.grey} fg="#3A3A40" className="md:hidden" pressed={menu} onClick={() => setMenu(true)}>
          <Glyph>{G.more}</Glyph>
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
              { label: "Guestbook", bg: TINT.guestbook, glyph: G.bubble, href: "/guestbook" },
              { label: "Copy email", bg: TINT.contact, glyph: G.contact, run: () => dispatch({ type: "copyEmail" }) },
              { label: "Search", bg: TINT.grey, fg: "#3A3A40", glyph: G.search, run: () => dispatch({ type: "open", panel: "palette" }) },
              { label: "40s brief", bg: "#fff", fg: "#1D1D1F", glyph: G.sparkles, run: () => dispatch({ type: "open", panel: "brief" }) },
            ].map((a) => {
              const icon = (
                <span className="app-icon mx-auto" style={{ "--app-bg": a.bg, "--app-fg": a.fg ?? "#fff", "--app-ink": "#1FB24A", "--size": "52px" } as CSSProperties}>
                  <Glyph>{a.glyph}</Glyph>
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
