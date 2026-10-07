"use client";

import { identity } from "@/content/profile";
import { useNow, useVisitorZone } from "@/lib/hooks";
import { formatHour, hourIn, workingOverlap, zoneCity } from "@/lib/time";

const R_OUT = 84;
const R_IN = 62;

function arc(r: number, startH: number, endH: number) {
  const toXY = (h: number) => {
    const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
    return [100 + Math.cos(a) * r, 100 + Math.sin(a) * r];
  };
  let span = endH - startH;
  if (span <= 0) span += 24;
  const [x1, y1] = toXY(startH);
  const [x2, y2] = toXY(startH + span);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${span > 12 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/**
 * A 24-hour ring in the visitor's local time: Adelia's working day (magenta, outer),
 * the visitor's 9–18 (violet, inner) and where they overlap (lime).
 */
export function OverlapRing() {
  const zone = useVisitorZone();
  const now = useNow();
  // Recomputed once a minute is plenty; the clock ticks every second, the ring per minute.
  const minute = Math.floor(now / 60);
  const state = zone && minute ? { zone, o: workingOverlap(zone, new Date(minute * 60_000)), now: hourIn(zone, new Date(minute * 60_000)) } : null;

  const same = state && state.zone === identity.timeZone;
  const hours = state?.o.hours ?? 0;
  const needle = state ? (state.now / 24) * 360 : 0;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <svg viewBox="0 0 200 200" className="w-32 shrink-0" role="img" aria-label={state ? `${hours} hours of working-day overlap between Bekasi and ${zoneCity(state.zone)}` : "Working-hours overlap ring"}>
        <circle cx="100" cy="100" r={R_OUT} fill="none" stroke="var(--surface-2)" strokeWidth="18" />
        <circle cx="100" cy="100" r={R_IN} fill="none" stroke="var(--surface-2)" strokeWidth="12" />
        {Array.from({ length: 24 }, (_, h) => {
          const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
          const r1 = h % 6 === 0 ? 34 : 38;
          // Rounded: Math.cos/sin can differ in the last digit between the server and the browser.
          const p = (v: number) => (100 + v).toFixed(2);
          return <line key={h} x1={p(Math.cos(a) * r1)} y1={p(Math.sin(a) * r1)} x2={p(Math.cos(a) * 42)} y2={p(Math.sin(a) * 42)} stroke="var(--muted)" strokeWidth={h % 6 === 0 ? 2 : 1} opacity={0.6} />;
        })}
        {state && (
          <>
            <path d={arc(R_OUT, state.o.hersInYours.start, state.o.hersInYours.end)} fill="none" stroke="var(--accent)" strokeWidth="18" strokeLinecap="round" />
            <path d={arc(R_IN, 9, 18)} fill="none" stroke="var(--violet)" strokeWidth="12" strokeLinecap="round" />
            {state.o.ranges.map((r, i) => (
              <path key={i} d={arc(R_OUT, r.start, r.end)} fill="none" stroke="var(--lime)" strokeWidth="8" strokeLinecap="round" />
            ))}
            <g style={{ transform: `rotate(${needle}deg)`, transformOrigin: "100px 100px" }}>
              <line x1="100" y1="100" x2="100" y2="22" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
            </g>
            <circle cx="100" cy="100" r="5" fill="var(--ink)" />
          </>
        )}
        <text x="100" y="128" textAnchor="middle" className="fill-ink font-pixel" fontSize="11">
          {same ? "SAME TZ" : "OVERLAP"}
        </text>
        <text x="100" y="88" textAnchor="middle" className="fill-ink font-display" fontSize="30" fontWeight="700" letterSpacing="-1">
          {state ? `${hours}h` : "–"}
        </text>
      </svg>
      <div className="min-w-[10rem] flex-1 text-14">
        <p className="font-semibold">{state ? (hours > 0 ? `We share ${hours} working hours` : "No overlap, but async works") : "Finding your time zone…"}</p>
        {state && (
          <ul className="mt-2 space-y-1.5">
            <li className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              Adelia: {formatHour(state.o.hersInYours.start)}–{formatHour(state.o.hersInYours.end)} your time
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full bg-violet" aria-hidden="true" />
              You ({zoneCity(state.zone)}): 09:00–18:00
            </li>
            {state.o.ranges.length > 0 && (
              <li className="flex items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-full bg-lime" aria-hidden="true" />
                Overlap: {state.o.ranges.map((r) => `${formatHour(r.start)}–${formatHour(r.end)}`).join(", ")}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
