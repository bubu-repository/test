"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { identity } from "@/content/profile";
import { dispatch } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { useNow, useVisitorZone } from "@/lib/hooks";
import { applySound, applyTheme, getSound, getTheme, subscribePreferences } from "@/lib/preferences";
import { sfx } from "@/lib/sound";
import { unlock } from "@/lib/stickers";
import { formatTime, hourIn, zoneCity } from "@/lib/time";
import { ui } from "@/lib/ui";
import { isEditable } from "../shell/KeyboardShortcuts";
import { describeWeather, useWeather } from "../widgets/weather";
import { HeroName } from "./HeroName";
import { ResampleSentence } from "./ResampleSentence";

/** Where the dial can point. Detents sit on the diagonals, like a four-way selector. */
const STOPS = [
  { label: "Work", href: "/work", key: "Open the work", angle: -45 },
  { label: "Lab", href: "/lab", key: "Open the lab", angle: 45 },
  { label: "About", href: "/about", key: "Meet Adelia", angle: 135 },
  { label: "Contact", href: "#contact", key: "Say hello", angle: 225 },
] as const;

const BOOT = ["ADELIA OS 2.6 · AT-26", "checking taste ........ ok", "loading 3 case studies  ok", "waking moci ........... ok", "personality ▓▓▓▓▓▓▓▓▓░ 99%", "just a very slight bit longer…"];

function greeting(hour: number) {
  if (hour < 5) return "Up late? Hi, I'm";
  if (hour < 12) return "Good morning, I'm";
  if (hour < 18) return "Good afternoon, I'm";
  return "Good evening, I'm";
}

/** "14:02 in Bekasi · 09:02 in London", or one clock when the visitor shares the time zone. */
function ScreenStatus() {
  const now = useNow();
  const zone = useVisitorZone();
  const weather = useWeather();
  const date = now ? new Date(now * 1000) : null;
  const w = describeWeather(weather?.code ?? null);
  const same = zone === identity.timeZone;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[11px] tracking-[0.08em] text-screen-muted uppercase">
      <p className="flex items-center gap-2">
        <span className="led" style={{ ["--led-color" as string]: "var(--screen-accent)" }} aria-hidden="true" />
        <span>
          <span className="text-screen-ink tabular-nums">{date ? formatTime(identity.timeZone, date) : "--:--"}</span> in {identity.city}
          {date && zone && !same && (
            <>
              {" · "}
              <span className="text-screen-ink tabular-nums">{formatTime(zone, date)}</span> in {zoneCity(zone)}
            </>
          )}
          {date && same && " · same as you"}
        </span>
      </p>
      <p aria-label={weather?.ok ? `Bekasi weather: ${Math.round(weather.temperature ?? 0)} degrees, ${w.label}` : undefined}>
        {weather?.ok ? `${Math.round(weather.temperature ?? 0)}°C · ${w.label}` : weather ? "Sky offline" : "Reading the sky…"}
      </p>
    </div>
  );
}

function Greeting() {
  const now = useNow();
  const zone = useVisitorZone();
  const text = now && zone ? greeting(hourIn(zone, new Date(now * 1000))) : "Hello, I'm";
  return <p className="font-mono text-[13px] text-screen-muted">{text}</p>;
}

/** The ask line: a terminal prompt that hands the question to Moci. */
function AskLine() {
  const [q, setQ] = useState("");
  return (
    <form
      className="js-only mt-7 flex items-center gap-3 rounded-[12px] border border-white/10 bg-white/[0.04] py-1.5 pr-1.5 pl-4 font-mono text-[14px] focus-within:border-screen-accent/60"
      onSubmit={(e) => {
        e.preventDefault();
        const text = q.trim();
        if (!text) return;
        setQ("");
        sfx.key();
        void dispatch({ type: "ask", question: text });
      }}
    >
      <span aria-hidden="true" className="text-screen-accent">
        &gt;
      </span>
      <label htmlFor="hero-ask" className="sr-only">
        Ask anything about Adelia&apos;s work
      </label>
      <input
        id="hero-ask"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ask anything about my work"
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent py-2 text-screen-ink caret-screen-accent outline-none placeholder:text-screen-muted"
      />
      <button
        type="submit"
        disabled={!q.trim()}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-[8px] bg-white/10 px-3 text-[12px] tracking-[0.08em] text-screen-ink uppercase transition-opacity disabled:opacity-40"
        data-cursor="Ask"
      >
        <span className="max-sm:sr-only">Enter</span>
        <span aria-hidden="true">↵</span>
      </button>
    </form>
  );
}

/** A labelled toggle switch wired to a site preference. */
function Switch({ label, checked, onToggle, tour }: { label: string; checked: boolean; onToggle: (el: HTMLButtonElement) => void; tour?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={(e) => onToggle(e.currentTarget)} className="toggle" data-tour={tour}>
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
      <span className="font-mono text-[10px] font-semibold tracking-[0.14em] uppercase">{label}</span>
    </button>
  );
}

const serverFalse = () => false;

function PreferenceSwitches() {
  const dark = useSyncExternalStore(subscribePreferences, () => getTheme() === "dark", serverFalse);
  const sound = useSyncExternalStore(subscribePreferences, getSound, serverFalse);
  return (
    <>
      <Switch
        label="Night"
        checked={dark}
        onToggle={(el) => {
          const rect = el.getBoundingClientRect();
          const root = document.documentElement;
          root.style.setProperty("--swap-x", `${rect.left + rect.width / 2}px`);
          root.style.setProperty("--swap-y", `${rect.top + rect.height / 2}px`);
          sfx.click();
          applyTheme(getTheme() === "dark" ? "light" : "dark", { persist: true });
          if (!dark) unlock("night");
        }}
      />
      <Switch
        label="Sound"
        checked={sound}
        onToggle={() => {
          applySound(!sound, { persist: true });
          if (!sound) sfx.success();
        }}
      />
    </>
  );
}

/**
 * The destination dial: turn it (drag, arrow keys, or click a label) to pick where to go,
 * then press the magenta key. It snaps to four detents and always takes the short way round.
 */
function Dial({ index, onChange }: { index: number; onChange: (next: number) => void }) {
  const knob = useRef<HTMLDivElement>(null);
  const [turn, setTurn] = useState<number>(STOPS[0].angle);

  const set = (next: number) => {
    const i = (next + STOPS.length) % STOPS.length;
    if (i === index) return;
    const target = STOPS[i].angle;
    // Shortest rotation from the current angle to the new detent.
    const delta = ((((target - turn) % 360) + 540) % 360) - 180;
    setTurn(turn + delta);
    sfx.tick();
    onChange(i);
  };

  const fromPointer = (e: PointerEvent) => {
    const r = knob.current!.getBoundingClientRect();
    const a = (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI + 90;
    let best = 0;
    let bestD = 999;
    STOPS.forEach((s, i) => {
      const d = Math.abs(((((a - s.angle) % 360) + 540) % 360) - 180);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    set(best);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") set(index + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") set(index - 1);
    else if (e.key === "Home") set(0);
    else if (e.key === "End") set(STOPS.length - 1);
    else return;
    e.preventDefault();
  };

  return (
    <div className="relative grid size-[156px] shrink-0 place-items-center" data-tour="dial">
      {STOPS.map((s, i) => (
        <button
          key={s.label}
          type="button"
          tabIndex={-1}
          onClick={() => set(i)}
          className={cn(
            "absolute flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase transition-colors",
            i === 0 && "top-0 left-0",
            i === 1 && "top-0 right-0 flex-row-reverse",
            i === 2 && "right-0 bottom-0 flex-row-reverse",
            i === 3 && "bottom-0 left-0",
            i === index ? "text-ink" : "text-muted hover:text-ink",
          )}
        >
          <span className="led" data-off={i !== index} style={{ ["--led-color" as string]: i === index ? "var(--accent)" : undefined, width: 6, height: 6 }} aria-hidden="true" />
          {s.label}
        </button>
      ))}
      <div
        ref={knob}
        role="slider"
        tabIndex={0}
        aria-label="Destination dial"
        aria-valuemin={0}
        aria-valuemax={STOPS.length - 1}
        aria-valuenow={index}
        aria-valuetext={STOPS[index].label}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) fromPointer(e);
        }}
        className="knob cursor-grab focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent active:cursor-grabbing"
        style={{ ["--knob" as string]: "92px", rotate: `${turn}deg` }}
        data-cursor="Turn"
      >
        <span className="knob__cap" />
      </div>
    </div>
  );
}

/** A square keycap with a printed legend. */
function Keycap({ children, onPress, label, tour }: { children: ReactNode; onPress: () => void; label: string; tour?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        sfx.key();
        onPress();
      }}
      className="pill h-12 w-full min-w-0 rounded-[12px] px-2 font-mono text-[11px] tracking-[0.1em] uppercase"
      data-tour={tour}
    >
      {children}
    </button>
  );
}

/**
 * The hero, as a piece of hardware: the AT-26. An LCD with the name, the clocks and an ask line;
 * a dial to pick a destination; switches for night and sound; keys for the tour, the brief, the CV
 * and the palette; and a power key (or P) that puts the screen to sleep.
 */
export function HeroDevice() {
  const [stop, setStop] = useState(0);
  const [power, setPower] = useState(true);
  const dest = STOPS[stop];

  const togglePower = () => {
    sfx.click();
    setPower((p) => !p);
  };
  const onPowerKey = useEffectEvent(togglePower);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const state = ui.get();
      if (e.key.toLowerCase() !== "p" || !state.keys || state.overlay || state.touring || e.metaKey || e.ctrlKey || e.altKey || isEditable(e.target)) return;
      e.preventDefault();
      onPowerKey();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="device w-full text-ink" data-power={power ? "on" : "off"} data-xr="HeroDevice · an LCD, a dial, switches and keys">
      {/* Top strip: wordmark, model, status LED, speaker grille. */}
      <div className="flex items-center gap-3 px-2 pb-3.5">
        <span className="font-display text-18 font-bold tracking-[-0.03em]">adelia</span>
        <span className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">AT-26</span>
        <span className="ml-auto flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
          <span className="led" data-off={!power} aria-hidden="true" />
          Open to work
        </span>
        <span className="grille hidden h-5 w-16 sm:block" aria-hidden="true" />
      </div>

      {/* The LCD. */}
      <div className="device__screen screen relative">
        <div className="device__boot" aria-hidden="true">
          {BOOT.map((line, i) => (
            <span key={line} className="block whitespace-pre" style={{ ["--i" as string]: i }}>
              {line}
            </span>
          ))}
        </div>
        <div className="device__content px-5 pt-4 pb-5 sm:px-7 sm:pt-5 sm:pb-7" inert={!power}>
          <ScreenStatus />
          <div className="mt-8 sm:mt-10">
            <Greeting />
            <div id="hero-name" className="mt-1">
              <HeroName />
            </div>
            <p className="mt-4 font-mono text-[12px] font-medium tracking-[0.12em] text-screen-accent uppercase">
              {identity.role} · {identity.location}
            </p>
            <div className="mt-4 max-w-[46ch]">
              <ResampleSentence controls="screen" />
            </div>
          </div>
          <AskLine />
        </div>
        {!power && (
          <p className="absolute inset-0 z-[3] grid place-items-center font-mono text-[11px] tracking-[0.16em] text-screen-muted/70 uppercase" aria-live="polite">
            Standby · press power or P
          </p>
        )}
      </div>

      {/* Controls. */}
      <div className="device__controls mt-5 px-1">
        <div className="[grid-area:dial]">
          <Dial index={stop} onChange={setStop} />
        </div>

        <div className="flex flex-wrap items-start gap-x-5 gap-y-3 [grid-area:switches]">
            <PreferenceSwitches />
            <button type="button" aria-pressed={!power} aria-label="Screen power" onClick={togglePower} className="toggle" data-cursor={power ? "Sleep" : "Wake"}>
              <span className="pill size-[24px] min-h-0 p-0" data-shape="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                  <path d="M12 3v8M6.4 6.6a8 8 0 1 0 11.2 0" />
                </svg>
              </span>
              <span className="font-mono text-[10px] font-semibold tracking-[0.14em] uppercase">Power</span>
            </button>
        </div>

        <div className="[grid-area:go]">
          {dest.href.startsWith("#") ? (
            <a href={dest.href} className="pill w-full justify-between px-5" data-variant="magenta" data-size="lg" data-cursor="Go">
              {dest.key}
              <ArrowRightIcon width={20} height={20} className="shrink-0" />
            </a>
          ) : (
            <Link href={dest.href} className="pill w-full justify-between px-5" data-variant="magenta" data-size="lg" data-cursor="Go" data-tour="go">
              {dest.key}
              <ArrowRightIcon width={20} height={20} className="shrink-0" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2.5 [grid-area:keys] sm:w-[148px] sm:grid-cols-2">
          <Keycap label="Take the 40-second tour" onPress={() => void dispatch({ type: "tour" })}>
            Tour
          </Keycap>
          <Keycap label="Open the 40-second brief" onPress={() => void dispatch({ type: "open", panel: "brief" })}>
            Brief
          </Keycap>
          <Keycap label="Download the CV" onPress={() => void dispatch({ type: "download", href: "/cv.pdf", filename: "Adelia-Tiara-CV.pdf" })}>
            CV
          </Keycap>
          <Keycap label="Open the command palette" onPress={() => void dispatch({ type: "open", panel: "palette" })}>
            ⌘K
          </Keycap>
        </div>
      </div>

      {/* Bottom label. */}
      <div className="mt-5 flex items-center gap-3 px-2 font-mono text-[9px] tracking-[0.18em] text-muted uppercase">
        <span className="screw" aria-hidden="true" />
        <span className="truncate">S/N AT-0x24 · Designed &amp; built in Bekasi</span>
        <span className="screw ml-auto" aria-hidden="true" />
      </div>
    </div>
  );
}
