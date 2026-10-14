"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRightIcon, CopyIcon, DownloadIcon } from "@/components/icons";
import { identity } from "@/content/profile";
import { projects } from "@/content/projects";
import { dispatch } from "@/lib/actions";
import { useNow, useVisitorZone } from "@/lib/hooks";
import { formatTime, zoneCity } from "@/lib/time";
import { describeWeather, useWeather } from "../widgets/weather";
import { SeaSky } from "../world/SeaSky";
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
      <span className="hero-status__sep" aria-hidden="true">
        ·
      </span>
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
 * The hero: a live window of sky and sea (Frutiger Aero blues). Her name, the role and the way in
 * sit in the sky; the four products float just under the waterline with one number each, so the
 * work is on the first screen on every device. The waterline is wherever the products start.
 */
export function Hero() {
  const seaRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  return (
    <section id="hero" aria-labelledby="hero-name" className="hero" data-xr="Hero · live sky and sea, the name and the way in">
      <div className="hero__window on-water">
        <SeaSky className="hero__canvas" horizonRef={seaRef} textRef={skyRef} />

        <div className="container-page">
          <div className="hero__copy">
            <div ref={skyRef} className="hero__words">
              <Status />
              <div id="hero-name" className="mt-6">
                <HeroName />
              </div>
              <p className="hero__role">
                {identity.role} <span className="hero__cohort">· {identity.cohort}</span>
              </p>
              <p className="hero__place">{identity.location} · remote or Jakarta</p>
              <div className="hero__line">
                <ResampleSentence controls={false} />
              </div>

              <div className="hero__keys">
                <Link href="/work" className="pill" data-variant="light" data-size="lg" data-tour="go">
                  Open the work
                  <ArrowRightIcon width={20} height={20} />
                </Link>
                <button
                  type="button"
                  className="pill"
                  data-size="lg"
                  onClick={() =>
                    void dispatch({
                      type: "download",
                      href: "/cv.pdf",
                      filename: "Adelia-Tiara-CV.pdf",
                    })
                  }
                >
                  <DownloadIcon width={18} height={18} /> CV
                </button>
                <button type="button" className="pill" data-size="lg" onClick={() => void dispatch({ type: "copyEmail" })}>
                  <CopyIcon width={18} height={18} /> Email
                </button>
              </div>
            </div>
          </div>
        </div>

        <div ref={seaRef} className="hero__sea">
          <div className="container-page">
            <ul className="hero-work" aria-label="The work, with one number each">
              {projects.map((p) => (
                <li key={p.slug}>
                  <Link href={`/work/${p.slug}`} className="hero-work__item">
                    <span className="hero-work__name">{p.name}</span>
                    <span className="hero-work__value tabular-nums">{p.stats[0].value}</span>
                    <span className="hero-work__label">{p.stats[0].label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
