"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ADVICE, KIND_WORDS, weatherCard, type WeatherCard } from "@/content/daily";
import { projects } from "@/content/projects";
import { sfx } from "@/lib/sound";
import { unlock } from "@/lib/stickers";
import { useStore } from "@/lib/store";
import { HoloCard } from "../work/HoloCard";
import { describeWeather, useWeather } from "../widgets/weather";
import { hydratePack, isUp, openPack, packSeed, packStore, reveal, upCount } from "./pack-store";

/**
 * Today's pack: one foil pack a day per visitor. Drag across the strip at the top (or press the
 * key under it) to tear it open; three cards come out face down, and you turn them over one by one.
 * Something kind, advice from the weather in Bekasi right now, and one more: advice, or one of her
 * products as a trading card that opens its case study. The first pack always has a product card;
 * about one pack in eight has a product in holo foil, and the third pack in a row without one
 * always does. Every card has a collector number and goes into the visitor's binder.
 * `?pack=fresh` seals a new pack, `?pack=rare` puts a holo in it.
 */

const OWN = projects.filter((p) => !p.company);
const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Card = { id: string; no: string } & ({ kind: "kind"; text: string } | { kind: "weather"; card: WeatherCard } | { kind: "advice"; text: string } | { kind: "product"; slug: string; foil: boolean });

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
  const [dragging, setDragging] = useState(false);
  const [forceRare, setForceRare] = useState(false);
  const drag = useRef<{ start: number; w: number } | null>(null);
  const slots = useRef<(HTMLLIElement | null)[]>([]);
  const listRef = useRef<HTMLOListElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hydratePack();
    const rare = new URLSearchParams(window.location.search).get("pack") === "rare";
    if (rare) window.setTimeout(() => setForceRare(true), 0);
  }, []);

  const seed = packSeed(s);
  // Decided while the pack is sealed, and kept with it once it's open (opening changes the counts).
  const first = s.opened ? s.first : s.collected === 0;
  const foil = s.opened ? s.holo : forceRare || (seed >>> 11) % 8 === 0 || s.sinceHolo >= 2;
  const k = seed % KIND_WORDS.length;
  const a = (seed >>> 5) % ADVICE.length;
  const w = weatherCard(weather, describeWeather);
  const product = OWN[(seed >>> 3) % OWN.length];
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const cards: Card[] = [
    { id: `k${k}`, no: `K${pad2(k + 1)}/${KIND_WORDS.length}`, kind: "kind", text: KIND_WORDS[k] },
    { id: `w:${w.kind}`, no: `W · ${w.kind}`, kind: "weather", card: w },
    foil || first
      ? { id: `${foil ? "h" : "p"}:${product.slug}`, no: `P${pad2(OWN.indexOf(product) + 1)}/${pad2(OWN.length)}${foil ? " ★" : ""}`, kind: "product", slug: product.slug, foil }
      : { id: `a${a}`, no: `A${pad2(a + 1)}/${ADVICE.length}`, kind: "advice", text: ADVICE[a] },
  ];
  const date = new Date(`${s.day || "2026-01-01"}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const open = () => {
    if (s.opened || tearing) return;
    sfx.tear();
    unlock("pack");
    const focusFirst = () => requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(".dcard--back")?.focus({ preventScroll: true }));
    if (calm()) {
      openPack(foil, first);
      focusFirst();
      return;
    }
    setTearing(true);
    window.setTimeout(() => {
      openPack(foil, first);
      setTearing(false);
      setTear(0);
      sfx.pop();
      focusFirst();
    }, 620);
  };

  const flip = (i: number) => {
    if (isUp(packStore.get().turned, i)) return;
    const c = cards[i];
    reveal(i, c.id);
    // Keyboard: the next face-down card, or the line under the cards once all three are up.
    requestAnimationFrame(() => {
      const next = listRef.current?.querySelector<HTMLElement>(".dcard--back:not([data-up] *)") ?? nextRef.current;
      next?.focus({ preventScroll: true });
    });
    // On phones the cards sit in a row you swipe: bring the one turning over to the middle.
    slots.current[i]?.scrollIntoView({ inline: "center", block: "nearest", behavior: calm() ? "auto" : "smooth" });
    if (c.kind === "product" && c.foil) {
      sfx.success();
      unlock("rare");
    } else sfx.pop();
  };

  // "Turn them all over" turns the everyday cards; a product card is always yours to turn.
  const last = cards.findIndex((c) => c.kind === "product");
  const everyday = cards.map((_, i) => i).filter((i) => i !== last && !isUp(s.turned, i));
  const flipAll = () => {
    everyday.forEach((i, n) => window.setTimeout(() => flip(i), calm() ? 0 : n * 260));
  };

  const binder = {
    kind: s.seen.filter((id) => /^k\d/.test(id)).length,
    advice: s.seen.filter((id) => /^a\d/.test(id)).length,
    products: new Set(s.seen.filter((id) => /^[ph]:/.test(id)).map((id) => id.slice(2))).size,
    holo: s.seen.filter((id) => id.startsWith("h:")).length,
  };

  return (
    <div className="daily" data-hydrated={s.hydrated || undefined}>
      <div className="daily__table">
        {!s.opened ? (
          <div className="daily-pack" data-tearing={tearing || undefined} data-dragging={dragging || undefined} style={{ ["--tear" as string]: tearing ? 1 : tear } as CSSProperties}>
            <button type="button" className="daily-pack__body" onClick={open} aria-label="Tear open today's pack: three cards inside" data-sfx="off">
              {/* The top of the pack: the heat seal and the strip. What's torn lifts away as a flap. */}
              <span className="daily-pack__top">
                <span className="daily-pack__crimp" aria-hidden="true" />
                <span
                  className="daily-pack__strip touch-none select-none"
                  aria-hidden="true"
                  onPointerDown={(e) => {
                    // Measured from where the finger starts, against the strip's width at that moment.
                    drag.current = { start: e.clientX, w: e.currentTarget.getBoundingClientRect().width };
                    setDragging(true);
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (!drag.current) return;
                    const p = Math.max(0, Math.min(1, (e.clientX - drag.current.start) / (drag.current.w * 0.5)));
                    if (Math.floor(p * 8) > Math.floor(tear * 8)) sfx.tick();
                    if (p >= 0.6 && tear < 0.6) navigator.vibrate?.(8);
                    setTear(p);
                    if (p >= 1) {
                      drag.current = null;
                      setDragging(false);
                      open();
                    }
                  }}
                  onPointerUp={() => {
                    const torn = tear >= 0.6;
                    drag.current = null;
                    setDragging(false);
                    if (torn) open();
                    else if (!tearing) setTear(0);
                  }}
                  onPointerCancel={() => {
                    drag.current = null;
                    setDragging(false);
                    setTear(0);
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="daily-pack__strip-foil" />
                  <span className="daily-pack__strip-label">tear here →</span>
                </span>
              </span>
              <span className="daily-pack__flap" aria-hidden="true">
                <span className="daily-pack__crimp" />
                <span className="daily-pack__strip">
                  <span className="daily-pack__strip-foil" />
                  <span className="daily-pack__strip-label">tear here →</span>
                </span>
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
                  <span>{first ? "3 cards · 1 product" : "3 cards · 1 in 8 holo"}</span>
                </span>
              </span>
              <span className="daily-pack__crimp daily-pack__crimp--bottom" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <ol ref={listRef} className="daily__cards" aria-label="Today's three cards">
            {cards.map((c, i) => {
              const up = isUp(s.turned, i);
              const p = c.kind === "product" ? (OWN.find((x) => x.slug === c.slug) ?? OWN[0]) : null;
              return (
                <li
                  key={i}
                  ref={(el) => {
                    slots.current[i] = el;
                  }}
                  className="daily__slot"
                  style={{ ["--i" as string]: i } as CSSProperties}
                >
                  {c.kind !== "product" ? (
                    <div className="dcard-flip" data-up={up || undefined}>
                      <button type="button" className="dcard dcard--back" onClick={() => flip(i)} aria-label={`Turn over card ${i + 1} of 3`} aria-hidden={up || undefined} tabIndex={up ? -1 : undefined} data-sfx="off">
                        <CardBack />
                      </button>
                      <article className="dcard dcard--front" data-kind={c.kind} aria-hidden={!up || undefined}>
                        <header className="dcard__top">
                          <span>{LABEL[c.kind]}</span>
                          <Glyph card={c} />
                        </header>
                        <p className="dcard__text">{c.kind === "weather" ? c.card.text : c.text}</p>
                        <footer className="dcard__foot">
                          <span>{c.kind === "weather" ? c.card.line : c.no}</span>
                          <span>{date}</span>
                        </footer>
                      </article>
                    </div>
                  ) : !up ? (
                    <button
                      type="button"
                      className="dcard dcard--back"
                      onClick={() => flip(i)}
                      aria-label={c.foil ? `Turn over card ${i + 1} of 3. Something glints.` : `Turn over card ${i + 1} of 3: one of her products`}
                      data-glint={c.foil || undefined}
                      data-sfx="off"
                    >
                      <CardBack />
                    </button>
                  ) : p ? (
                    <div className="daily__rare" data-foil={c.foil || undefined}>
                      <HoloCard project={p} total={OWN.length} morph={false} level={3} finish={c.foil ? "holo" : undefined} rarityLabel={c.foil ? "Holo rare, pack foil" : first ? "Starter" : undefined} />
                      {c.foil && (
                        <span className="daily__burst" aria-hidden="true">
                          {Array.from({ length: 10 }, (_, k) => (
                            <i key={k} style={{ "--a": `${k * 36 + 8}deg`, "--d": `${70 + (k % 3) * 26}px` } as CSSProperties} />
                          ))}
                        </span>
                      )}
                      <p className="daily__under">
                        <Link href={`/work/${p.slug}`} className="link-arrow text-14">
                          Read the case study
                        </Link>
                        <span className="daily__no">
                          {c.no}
                          {c.foil ? " · holo foil" : first ? " · starter" : ""}
                        </span>
                      </p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="daily__actions">
        {!s.opened ? (
          <>
            <button type="button" className="pill" data-variant="primary" onClick={open} data-sfx="off">
              Tear it open
            </button>
            <p className="text-14 text-muted">Or drag across the strip at the top of the pack.</p>
          </>
        ) : upCount(s.turned) < 3 ? (
          everyday.length > 0 ? (
            <button type="button" className="pill" onClick={flipAll} data-sfx="off">
              {last >= 0 ? "Turn over the everyday cards" : "Turn them all over"}
            </button>
          ) : (
            <p className="text-16 font-semibold">{cards[last]?.kind === "product" && cards[last].foil ? "The last one glints. Turn it yourself." : "The last one is one of her products. Turn it over."}</p>
          )
        ) : (
          <div className="daily__next" ref={nextRef} tabIndex={-1}>
            <p>
              <strong>Next pack in {left || "a few hours"}.</strong>
            </p>
            <p className="daily__binder">
              Your binder: kind words {binder.kind}/{KIND_WORDS.length} · advice {binder.advice}/{ADVICE.length} · products {binder.products}/{OWN.length}
              {binder.holo > 0 ? ` (${binder.holo} in holo)` : ""}
            </p>
          </div>
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
          <path d="M20 33C10 26 5 21 5 14.5 5 10 8.4 7 12.4 7c3 0 5.6 1.8 7.6 4.5C22 8.8 24.6 7 27.6 7 31.6 7 35 10 35 14.5 35 21 30 26 20 33Z" fill="#FF7EB6" stroke="#C2286F" strokeWidth="2" />
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
