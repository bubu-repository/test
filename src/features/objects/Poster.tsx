"use client";

import { useEffect, useRef } from "react";
import { edition, identity } from "@/content/profile";
import { useNow } from "@/lib/hooks";
import { sfx } from "@/lib/sound";
import { formatTime } from "@/lib/time";
import { toast } from "@/lib/ui";
import { useWeather } from "../widgets/weather";

/**
 * The name as a 24:QW poster: condensed Mona Sans caps in raspberry with a white die-cut edge and a
 * hard ink shadow. Letters near the cursor stretch wider along the font's width axis (75 → 100).
 * Decorative: the real heading is on the device screen.
 */
function PosterName() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(pointer: coarse)").matches) return;
    const front = Array.from(root.querySelectorAll<HTMLElement>(".poster-name__fill [data-letter]"));
    const back = Array.from(root.querySelectorAll<HTMLElement>(".poster-name__edge [data-letter]"));
    let raf = 0;
    let px = -9999;
    let py = -9999;
    const paint = () => {
      raf = 0;
      front.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const d = Math.hypot(px - (r.left + r.width / 2), (py - (r.top + r.height / 2)) * 1.4);
        const k = Math.max(0, 1 - d / 220);
        const ease = k * k * (3 - 2 * k);
        const stretch = `${(75 + ease * 25).toFixed(1)}%`;
        el.style.fontStretch = stretch;
        if (back[i]) back[i].style.fontStretch = stretch;
      });
    };
    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const words = identity.name.toUpperCase().split(" ");
  const layer = (kind: "edge" | "fill") => {
    let i = 0;
    return (
      <span className={`poster-name__layer poster-name__${kind}`}>
        {words.map((word) => (
          <span key={word} className="poster-name__word">
            {Array.from(word).map((ch) => {
              const n = i++;
              return (
                <span key={n} data-letter className="poster-name__letter" style={{ ["--i" as string]: n }}>
                  {ch}
                </span>
              );
            })}
          </span>
        ))}
      </span>
    );
  };

  return (
    <span ref={ref} aria-hidden="true" className="poster-name">
      {layer("edge")}
      {layer("fill")}
    </span>
  );
}

/** The live data stack from the 24:QW posters: her time and date, and whether she's open to work. */
function DataStack() {
  const now = useNow();
  const date = now ? new Date(now * 1000) : null;
  const rows = [
    { value: date ? formatTime(identity.timeZone, date, true) : "--:--:--", label: "Time there", hl: "var(--mint)" },
    { value: "Open to roles", label: "Status", hl: "var(--violet)" },
    {
      value: date ? new Intl.DateTimeFormat("en-GB", { timeZone: identity.timeZone, day: "2-digit", month: "2-digit", year: "numeric" }).format(date).replaceAll("/", ".") : "--.--.----",
      label: "Date",
      hl: "var(--lime)",
    },
    { value: "Within a day", label: "Replies", hl: "var(--cyan)" },
  ];
  return (
    <dl className="flex flex-col items-start gap-[3px]">
      {rows.map((row) => (
        <div key={row.label} className="hl-row">
          <dt className="hl-label order-2">{row.label}</dt>
          <dd className="hl order-1" style={{ ["--hl" as string]: row.hl }}>
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The 24:QW poster, printed on a photo of the sky and taped to the mat: a label row, the name as
 * a die-cut sticker, the live data stack and the scalloped email strip (click it to copy).
 */
export function Poster() {
  const weather = useWeather();
  const sky = weather?.ok ? `${Math.round(weather.temperature ?? 0)}°C sky` : "Live sky";

  return (
    <div className="poster w-[272px] select-none" data-xr="Poster · the 24:QW era, printed: the Mona Sans wdth axis follows the cursor">
      <span className="tape" aria-hidden="true" />
      <div className="poster__sky px-3.5 pt-3.5 pb-4">
        <ul className="flex flex-wrap gap-1 font-mono text-[9px] font-semibold tracking-[0.08em] uppercase" aria-label="At a glance">
          <li className="rounded-[4px] bg-[#111] px-1.5 py-1 text-white">adelia.cc ✦ &apos;{edition.slice(2)}</li>
          <li className="rounded-[4px] bg-lime px-1.5 py-1 text-[#111]">Open to work</li>
          <li className="rounded-[4px] bg-white px-1.5 py-1 text-[#111]">
            {identity.city} · {sky}
          </li>
        </ul>
        <div className="mt-5">
          <PosterName />
        </div>
        <div className="mt-4">
          <DataStack />
        </div>
      </div>
      <button
        type="button"
        className="poster__email scallop-top w-full text-left"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(identity.email);
            sfx.success();
            toast({ title: "Email copied", body: identity.email, tone: "magenta" });
          } catch {
            window.location.href = `mailto:${identity.email}`;
          }
        }}
        data-cursor="Copy"
      >
        <span className="flex items-baseline justify-between gap-2 px-3.5 pb-3">
          <span className="font-mono text-[10px] font-semibold tracking-[0.14em] uppercase">Email ›</span>
          <span className="font-mono text-[9px] tracking-[0.1em] uppercase opacity-80">Tap to copy</span>
        </span>
        <span className="block truncate px-3.5 pb-3.5 font-display text-[19px] leading-none font-extrabold tracking-[-0.01em] uppercase [font-stretch:75%]">{identity.email}</span>
      </button>
    </div>
  );
}
