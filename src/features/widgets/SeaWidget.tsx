"use client";

import type { CSSProperties } from "react";
import { SeaSoundToggle } from "../world/Sea";
import { useSea } from "./weather";
import { WidgetTitle } from "./widgets";

function describe(height: number | null) {
  if (height === null) return "Calm, probably";
  if (height < 0.3) return "Glassy";
  if (height < 0.6) return "Calm";
  if (height < 1.2) return "A little choppy";
  if (height < 2) return "Choppy";
  return "Rough";
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/**
 * The sea off Jakarta, live: wave height, the swell period and the water temperature, drawn as a
 * little sea whose waves are as tall and as quick as the real ones. And a button that plays the sea.
 */
export function SeaWidget() {
  const sea = useSea();
  const live = Boolean(sea?.ok);
  const height = live ? sea!.waveHeight : null;
  const period = live ? sea!.wavePeriod : null;
  // Taller, quicker waves when the real sea is rougher; a calm sea when we don't know.
  const amp = Math.min(1.8, Math.max(0.55, 0.5 + (height ?? 0.3) * 1.1));
  const speed = Math.min(16, Math.max(5, (period ?? 6) * 1.4));
  const from = sea?.waveDirection != null ? COMPASS[Math.round(sea.waveDirection / 45) % 8] : null;

  return (
    <div className="seawidget" data-tour="sea" style={{ "--amp": amp, "--speed": `${speed}s` } as CSSProperties}>
      <div className="relative z-[1] flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div>
          <WidgetTitle>The sea, off Jakarta</WidgetTitle>
          <p className="mt-3 text-[clamp(32px,4vw,48px)] leading-none font-bold tracking-[-0.04em]">{describe(height)}</p>
          <p className="mt-2 text-14 text-muted">{live ? "Live from the Java Sea, 30 km north of Bekasi." : "Can't reach the buoys right now, so here's a calm sea."}</p>
        </div>
        <dl className="flex flex-wrap gap-2">
          {[
            { k: "Waves", v: height !== null ? `${height.toFixed(1)} m` : "–" },
            { k: "Every", v: period !== null ? `${Math.round(period)} s` : "–" },
            { k: "Water", v: live && sea!.waterTemperature !== null ? `${sea!.waterTemperature.toFixed(1)}°` : "–" },
            ...(from ? [{ k: "From", v: from }] : []),
          ].map((d) => (
            <div key={d.k} className="seawidget__stat">
              <dt className="type-pixel text-muted">{d.k}</dt>
              <dd className="mt-1 text-20 font-bold tracking-[-0.02em] tabular-nums">{d.v}</dd>
            </div>
          ))}
        </dl>
        <SeaSoundToggle />
      </div>
      <div className="seawidget__water" aria-hidden="true">
        <span className="seawidget__buoy" />
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
