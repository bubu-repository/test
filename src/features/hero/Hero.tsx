"use client";

import Link from "next/link";
import { ArrowRightIcon, CopyIcon, DownloadIcon } from "@/components/icons";
import { identity } from "@/content/profile";
import { projects } from "@/content/projects";
import { dispatch } from "@/lib/actions";
import { useNow, useVisitorZone } from "@/lib/hooks";
import { formatTime, zoneCity } from "@/lib/time";
import { describeWeather, useWeather } from "../widgets/weather";
import { HeroName } from "./HeroName";
import { ResampleSentence } from "./ResampleSentence";

/** "14:02 in Bekasi · 09:02 in London · 31°C, clear", or one clock when the visitor shares the time zone. */
function Status() {
  const now = useNow();
  const zone = useVisitorZone();
  const weather = useWeather();
  const date = now ? new Date(now * 1000) : null;
  const w = describeWeather(weather?.code ?? null);
  return (
    <p className="hero-status">
      <span className="led" aria-hidden="true" />
      <span>Open to work</span>
      <span aria-hidden="true">·</span>
      <span>
        <span className="tabular-nums">{date ? formatTime(identity.timeZone, date) : "--:--"}</span> in {identity.city}
        {date && zone && zone !== identity.timeZone && (
          <>
            {" · "}
            <span className="tabular-nums">{formatTime(zone, date)}</span> in {zoneCity(zone)}
          </>
        )}
      </span>
      {/* The weather only shows when there is some: no "offline" states on the first screen. */}
      {weather?.ok && (
        <>
          <span aria-hidden="true">·</span>
          <span>
            {Math.round(weather.temperature ?? 0)}°C, {w.label.toLowerCase()}
          </span>
        </>
      )}
    </p>
  );
}

/**
 * The hero: her name in a window of pink paper and sky, one sentence, the way into the work, and
 * the two things recruiters ask for. The four products sit right under the buttons with one
 * number each, so the work is on the first screen on every device.
 */
export function Hero() {
  return (
    <section id="hero" aria-labelledby="hero-name" className="hero" data-xr="Hero · the character, the name and the way in">
      <div className="hero__window" aria-hidden="true">
        <span className="hero__dots" />
        <span className="hero__spark" style={{ ["--x" as string]: "8%", ["--y" as string]: "18%", ["--s" as string]: "18px" }} />
        <span className="hero__spark" style={{ ["--x" as string]: "46%", ["--y" as string]: "9%", ["--s" as string]: "12px" }} />
        <span className="hero__spark" style={{ ["--x" as string]: "92%", ["--y" as string]: "70%", ["--s" as string]: "16px" }} />
        <span className="hero__spark" style={{ ["--x" as string]: "60%", ["--y" as string]: "86%", ["--s" as string]: "10px" }} />
      </div>

      <div className="container-page">
        <div className="hero__copy">
          <Status />
          <div id="hero-name" className="mt-5">
            <HeroName />
          </div>
          <p className="hero__role">
            {identity.role} <span className="text-accent-ink">· {identity.cohort}</span>
          </p>
          <p className="hero__place">{identity.location} · remote or Jakarta</p>
          <div className="mx-auto mt-6 max-w-[40ch]">
            <ResampleSentence controls={false} />
          </div>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/work" className="pill game-button" data-variant="magenta" data-size="lg" data-tour="go">
              Open the work
              <ArrowRightIcon width={20} height={20} />
            </Link>
            <button type="button" className="pill game-button" data-size="lg" onClick={() => void dispatch({ type: "download", href: "/cv.pdf", filename: "Adelia-Tiara-CV.pdf" })}>
              <DownloadIcon width={18} height={18} /> CV
            </button>
            <button type="button" className="pill game-button" data-size="lg" data-variant="ghost" onClick={() => void dispatch({ type: "copyEmail" })}>
              <CopyIcon width={18} height={18} /> Email
            </button>
          </div>

          <ul className="hero-work mx-auto mt-10" aria-label="The work, with one number each">
            {projects.map((p) => (
              <li key={p.slug}>
                <Link href={`/work/${p.slug}`} className="hero-work__item">
                  <span className="font-semibold text-ink">{p.name}</span>
                  <span className="text-12 text-muted">
                    {p.stats[0].label} <b className="font-semibold text-ink tabular-nums">{p.stats[0].value}</b>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
