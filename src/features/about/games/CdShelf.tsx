"use client";

import { useState, type CSSProperties } from "react";
import { games } from "@/content/games";
import { sfx } from "@/lib/sound";

/**
 * The games that shaped her, as CDs in jewel cases on a glass shelf. Pick one: the case lifts, the
 * disc slides out of the top and spins, and the card underneath says what the game taught her
 * about design.
 */
export function CdShelf() {
  const [sel, setSel] = useState(games[0].slug);
  const game = games.find((g) => g.slug === sel) ?? games[0];

  return (
    <div className="cdshelf">
      <ul className="cdshelf__row" aria-label="Games on the shelf">
        {games.map((g, i) => (
          <li key={g.slug} style={{ "--i": i } as CSSProperties}>
            <button
              type="button"
              className="cdcase"
              aria-pressed={sel === g.slug}
              data-spin={sel === g.slug ? "slow" : undefined}
              aria-label={`${g.title} (${g.platform}, ${g.year})`}
              data-cursor="Pull out"
              data-sfx="off"
              onClick={() => {
                if (sel === g.slug) return;
                sfx.click();
                window.setTimeout(() => sfx.whoosh(), 60);
                setSel(g.slug);
              }}
            >
              <span className="cdcase__disc" aria-hidden="true" style={{ "--l1": g.label[0], "--l2": g.label[1] } as CSSProperties}>
                <span className="cdcase__label">
                  <span>{g.glyph}</span>
                </span>
              </span>
              <span className="cdcase__box" aria-hidden="true">
                <span className="cdcase__cover" style={{ background: g.art }}>
                  <span className="cdcase__glyph">{g.glyph}</span>
                  <span className="cdcase__title">{g.title}</span>
                  <span className="cdcase__platform">{g.platform}</span>
                </span>
                <span className="cdcase__hinge" />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="cdshelf__ledge" aria-hidden="true" />

      <article key={game.slug} className="widget cdshelf__detail p-6 md:p-7" aria-live="polite">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-24 leading-tight font-bold tracking-[-0.025em]">{game.title}</h3>
            <p className="mt-1 text-14 text-muted">
              {game.studio} · {game.platform} · {game.year}
            </p>
          </div>
          <span className="chip" data-tone="sky">
            {game.hours} played
          </span>
        </div>
        <p className="mt-5 text-14 font-semibold text-muted">What it taught me</p>
        <p className="mt-1.5 text-18 leading-snug">{game.taught}</p>
        <p className="mt-4 text-14 text-muted">
          <span className="font-semibold">Favourite moment:</span> {game.moment}
        </p>
      </article>
    </div>
  );
}
