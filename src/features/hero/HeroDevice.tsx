"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState, type ReactNode } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { identity } from "@/content/profile";
import { dispatch } from "@/lib/actions";
import { useNow, useVisitorZone } from "@/lib/hooks";
import { sfx } from "@/lib/sound";
import { formatTime, zoneCity } from "@/lib/time";
import { ui } from "@/lib/ui";
import { isEditable } from "../shell/KeyboardShortcuts";
import { describeWeather, useWeather } from "../widgets/weather";
import { HeroName } from "./HeroName";
import { ResampleSentence } from "./ResampleSentence";

/** Where the main key goes. */
const STOPS = [{ label: "Work", href: "/work", key: "Open the work" }] as const;

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
      {/* The weather only shows when there is some: no "offline" states on the first screen. */}
      {weather?.ok && (
        <p aria-label={`Bekasi weather: ${Math.round(weather.temperature ?? 0)} degrees, ${w.label}`}>
          {Math.round(weather.temperature ?? 0)}°C · {w.label}
        </p>
      )}
    </div>
  );
}

function Greeting() {
  return <p className="font-mono text-[13px] text-screen-muted">Hi, I&apos;m</p>;
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
 * The hero, as a piece of hardware: the AT-26. An LCD with the name, the role, the clocks and the
 * sentence (each underlined word can be resampled); one key into the work, and two for the CV and
 * the email. The power key is still there for the curious: press P.
 */
export function HeroDevice() {
  const [power, setPower] = useState(true);
  const dest = STOPS[0];

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
    <div className="device w-full text-ink" data-power={power ? "on" : "off"} data-xr="HeroDevice · an LCD and three keys">
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
        <div className="device__content px-5 pt-4 pb-5 sm:px-7 sm:pt-5 sm:pb-7" inert={!power}>
          <ScreenStatus />
          <div className="mt-8 sm:mt-10">
            <Greeting />
            <div id="hero-name" className="mt-1">
              <HeroName />
            </div>
            <p className="mt-3 text-[clamp(20px,2vw,24px)] leading-tight font-semibold tracking-[-0.02em] text-screen-ink">
              {identity.role} <span className="text-screen-accent">· {identity.cohort}</span>
            </p>
            <p className="mt-1.5 font-mono text-[11px] font-medium tracking-[0.12em] text-screen-muted uppercase">{identity.location} · remote or Jakarta</p>
            <div className="mt-4 max-w-[46ch]">
              <ResampleSentence controls={false} />
            </div>
          </div>
        </div>
        {!power && (
          <p className="absolute inset-0 z-[3] grid place-items-center font-mono text-[11px] tracking-[0.16em] text-screen-muted/70 uppercase" aria-live="polite">
            Standby · press power or P
          </p>
        )}
      </div>

      {/* Controls: one way in, and the two things recruiters ask for. */}
      <div className="device__controls mt-5 px-1">
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

        <div className="grid grid-cols-2 gap-2.5 [grid-area:keys]">
          <Keycap label="Download the CV" onPress={() => void dispatch({ type: "download", href: "/cv.pdf", filename: "Adelia-Tiara-CV.pdf" })}>
            CV
          </Keycap>
          <Keycap label="Copy her email address" onPress={() => void dispatch({ type: "copyEmail" })}>
            Email
          </Keycap>
        </div>
      </div>

      {/* Bottom label. */}
      <div className="mt-5 flex items-center gap-3 px-2 font-mono text-[9px] tracking-[0.18em] text-muted uppercase">
        <span className="screw" aria-hidden="true" />
        <span className="truncate">
          <span className="max-sm:hidden">S/N AT-0x24 · </span>Designed &amp; built in Bekasi
        </span>
        <span className="screw ml-auto" aria-hidden="true" />
      </div>
    </div>
  );
}
