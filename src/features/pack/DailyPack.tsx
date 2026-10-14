"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ADVICE, KIND_WORDS, weatherCard, type WeatherCard } from "@/content/daily";
import { projects } from "@/content/projects";
import { sfx } from "@/lib/sound";
import { unlock } from "@/lib/stickers";
import { useStore } from "@/lib/store";
import { HoloCard } from "../work/HoloCard";
import { describeWeather, useWeather } from "../widgets/weather";
import { hydratePack, openPack, packSeed, packStore, reveal } from "./pack-store";

/**
 * Today's pack: one foil pack a day per visitor. Drag across the strip at the top (or press the
 * key under it) to tear it open; three cards come out face down, and you turn them over one by one.
 * Something kind, advice from the weather in Bekasi right now, and one more: advice, or (about one
 * pack in eight) a holo rare of one of her products that opens its case study. `?pack=fresh`
 * seals a new pack, `?pack=rare` puts a rare in it.
 */

const OWN = projects.filter((p) => !p.company);
const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Card = { kind: "kind"; text: string } | { kind: "weather"; card: WeatherCard } | { kind: "advice"; text: string } | { kind: "rare"; slug: string };

const LABEL = { kind: "Kind words", weather: "Weather · Bekasi", advice: "Advice" } as const;

/** Hours and minutes until the visitor's midnight, refreshed every half minute. */
function useUntilMidnight() {
  const [left, setLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const mins = Math.max(1, Math.round((midnight.getTime() - now.getTime()) / 60_000));
      setLeft(mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`);
    };
    const t = window.setInterval(tick, 30_000);
    const first = window.setTimeout(tick, 0);
    return () => {
      window.clearInterval(t);
      window.clearTimeout(first);
    };
  }, []);
  return left;
}

export function DailyPack() {
  const s = useStore(packStore, (x) => x);
  const weather = useWeather();
  const left = useUntilMidnight();
  const [tearing, setTearing] = useState(false);
  const [tear, setTear] = useState(0);
  const [forceRare, setForceRare] = useState(false);
  const drag = useRef<{ x: number; w: number } | null>(null);

  useEffect(() => {
    hydratePack();
    const rare = new URLSearchParams(window.location.search).get("pack") === "rare";
    if (rare) window.setTimeout(() => setForceRare(true), 0);
  }, []);

  const seed = packSeed(s);
  const rare = forceRare || (seed >>> 11) % 8 === 0;
  const cards: Card[] = [
    { kind: "kind", text: KIND_WORDS[seed % KIND_WORDS.length] },
    { kind: "weather", card: weatherCard(weather, describeWeather) },
    rare ? { kind: "rare", slug: OWN[(seed >>> 3) % OWN.length].slug } : { kind: "advice", text: ADVICE[(seed >>> 5) % ADVICE.length] },
  ];
  const number = String((seed % 899) + 101);
  const date = new Date(`${s.day || "2026-01-01"}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const open = () => {
    if (s.opened || tearing) return;
    sfx.tear();
    unlock("pack");
    if (calm()) {
      openPack(rare);
      return;
    }
    setTearing(true);
    window.setTimeout(() => {
      openPack(rare);
      setTearing(false);
      setTear(0);
      sfx.pop();
    }, 620);
  };

  const flip = (i: number) => {
    if (s.revealed > i) return;
    reveal(i + 1);
    if (cards[i].kind === "rare") {
      sfx.success();
      unlock("rare");
    } else sfx.pop();
  };

  const flipAll = () => {
    cards.forEach((_, i) => window.setTimeout(() => flip(i), calm() ? 0 : i * 260));
  };

  return (
    <div className="daily" data-hydrated={s.hydrated || undefined}>
      <div className="daily__table">
        {!s.opened ? (
          <div className="daily-pack" data-tearing={tearing || undefined} style={{ ["--tear" as string]: tear } as CSSProperties}>
            <button type="button" className="daily-pack__body" onClick={open} aria-label="Tear open today's pack: three cards inside" data-sfx="off">
              <span className="daily-pack__crimp" aria-hidden="true" />
              <span
                className="daily-pack__strip touch-none select-none"
                aria-hidden="true"
                onPointerDown={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  drag.current = { x: e.clientX - r.left, w: r.width };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!drag.current) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  const p = Math.max(0, Math.min(1, (e.clientX - r.left - drag.current.x) / (drag.current.w * 0.55)));
                  if (Math.floor(p * 8) > Math.floor(tear * 8)) sfx.tick();
                  setTear(p);
                  if (p >= 1) {
                    drag.current = null;
                    open();
                  }
                }}
                onPointerUp={() => {
                  drag.current = null;
                  if (!tearing) setTear(0);
                }}
                onPointerCancel={() => {
                  drag.current = null;
                  setTear(0);
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="daily-pack__strip-foil" />
                <span className="daily-pack__strip-label">tear here →</span>
              </span>
              <span className="daily-pack__perf" aria-hidden="true" />
              <span className="daily-pack__face" aria-hidden="true">
                <span className="daily-pack__brand">
                  Adelia <b>TCG</b>
                </span>
                <span className="daily-pack__title">Today&apos;s pack</span>
                <PackArt />
                <span className="daily-pack__meta">
                  <span>{date}</span>
                  <span>3 cards · 1 in 8 holo</span>
                </span>
              </span>
              <span className="daily-pack__crimp daily-pack__crimp--bottom" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <ol className="daily__cards" aria-label="Today's three cards">
            {cards.map((c, i) => {
              const up = s.revealed > i;
              return (
                <li key={i} className="daily__slot" style={{ ["--i" as string]: i } as CSSProperties}>
                  {!up ? (
                    <button type="button" className="dcard dcard--back" onClick={() => flip(i)} aria-label={`Turn over card ${i + 1} of 3`} data-sfx="off">
                      <CardBack />
                    </button>
                  ) : c.kind === "rare" ? (
                    <div className="daily__rare">
                      <HoloCard project={OWN.find((p) => p.slug === c.slug) ?? OWN[0]} total={projects.length} morph={false} level={3} />
                      <span className="daily__burst" aria-hidden="true">
                        {Array.from({ length: 10 }, (_, k) => (
                          <i key={k} style={{ "--a": `${k * 36 + 8}deg`, "--d": `${70 + (k % 3) * 26}px` } as CSSProperties} />
                        ))}
                      </span>
                    </div>
                  ) : (
                    <article className="dcard dcard--front" data-kind={c.kind}>
                      <header className="dcard__top">
                        <span>{LABEL[c.kind]}</span>
                        <Glyph card={c} />
                      </header>
                      <p className="dcard__text">{c.kind === "weather" ? c.card.text : c.text}</p>
                      <footer className="dcard__foot">
                        <span>{c.kind === "weather" ? c.card.line : `No. ${number}-${i + 1}`}</span>
                        <span>{date}</span>
                      </footer>
                    </article>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="daily__actions">
        {!s.opened ? (
          <>
            <button type="button" className="pill" data-variant="magenta" data-size="lg" onClick={open} data-sfx="off">
              Tear it open
            </button>
            <p className="text-14 text-muted">Or drag across the strip at the top of the pack.</p>
          </>
        ) : s.revealed < 3 ? (
          <button type="button" className="pill" data-size="lg" onClick={flipAll} data-sfx="off">
            Turn them all over
          </button>
        ) : (
          <p className="daily__next">
            <strong>Next pack in {left || "a few hours"}.</strong>{" "}
            <span className="text-muted">
              You&apos;ve collected {s.collected} {s.collected === 1 ? "card" : "cards"}
              {s.rares > 0 ? `, ${s.rares} holo ${s.rares === 1 ? "rare" : "rares"}` : ""}.
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

function Glyph({ card }: { card: Card }) {
  const kind = card.kind === "weather" ? card.card.kind : card.kind;
  const common = { width: 34, height: 34, viewBox: "0 0 40 40", "aria-hidden": true } as const;
  switch (kind) {
    case "kind":
      return (
        <svg {...common}>
          <path d="M20 33C10 26 5 21 5 14.5 5 10 8.4 7 12.4 7c3 0 5.6 1.8 7.6 4.5C22 8.8 24.6 7 27.6 7 31.6 7 35 10 35 14.5 35 21 30 26 20 33Z" fill="#FF5FA8" stroke="#C2287A" strokeWidth="2" />
          <path d="M11 13c.6-2 2-3 3.6-3" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </svg>
      );
    case "advice":
      return (
        <svg {...common}>
          <rect x="7" y="6" width="26" height="28" rx="4" fill="#FFE397" stroke="#D99A00" strokeWidth="2" />
          <path d="M12 14h16M12 20h16M12 26h10" stroke="#B07A00" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case "rain":
    case "storm":
      return (
        <svg {...common}>
          <path d="M12 24a6 6 0 0 1-.8-12A8.5 8.5 0 0 1 27 10a6.5 6.5 0 0 1 1.5 14Z" fill="#fff" stroke="#1A8FE8" strokeWidth="2" strokeLinejoin="round" />
          <path d="M14 28l-2 5M21 28l-2 5M28 28l-2 5" stroke="#1A8FE8" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case "cloud":
    case "haze":
    case "unknown":
      return (
        <svg {...common}>
          <circle cx="27" cy="13" r="6" fill="#FFCF3F" />
          <path d="M11 30a7 7 0 0 1-.9-13.9A10 10 0 0 1 29 15a7.5 7.5 0 0 1 1.7 15Z" fill="#fff" stroke="#1A8FE8" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "night":
      return (
        <svg {...common}>
          <path d="M27 30A13 13 0 0 1 16 8a13 13 0 1 0 11 22Z" fill="#FFE397" stroke="#D99A00" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="20" cy="20" r="8" fill="#FFCF3F" stroke="#D99A00" strokeWidth="2" />
          <path d="M20 4v5M20 31v5M4 20h5M31 20h5M8.7 8.7l3.5 3.5M27.8 27.8l3.5 3.5M8.7 31.3l3.5-3.5M27.8 12.2l3.5-3.5" stroke="#FFB800" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
  }
}

/** The printed back of every card. */
function CardBack() {
  return (
    <span className="dcard__back-inner" aria-hidden="true">
      <span className="dcard__back-logo">
        A<b>T</b>
      </span>
      <span className="dcard__back-text">Adelia TCG · Daily</span>
    </span>
  );
}

/** The pack's printed art: a sun over a wave, in foil. */
function PackArt() {
  return (
    <svg className="daily-pack__art" viewBox="0 0 120 90" aria-hidden="true">
      <circle cx="80" cy="34" r="16" fill="#FFE9A6" />
      <circle cx="80" cy="34" r="22" fill="none" stroke="#FFFFFF" strokeOpacity=".6" strokeWidth="2" strokeDasharray="2 5" />
      <path d="M0 62c14-10 26-10 40 0s26 10 40 0 26-10 40 0v28H0Z" fill="#FFFFFF" fillOpacity=".9" />
      <path d="M0 72c14-8 26-8 40 0s26 8 40 0 26-8 40 0" fill="none" stroke="#1A8FE8" strokeOpacity=".5" strokeWidth="3" />
      <path d="M18 30c4-6 10-8 16-6" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
