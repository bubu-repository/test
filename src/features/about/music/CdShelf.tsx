"use client";

import { useState, type CSSProperties } from "react";
import { games } from "@/content/games";
import { sfx } from "@/lib/sound";
import { useStore } from "@/lib/store";
import { player, playMood, toggle } from "./player-store";
import { tracks } from "./tracks";

/**
 * The games that shaped her, as CDs in jewel cases on a glass shelf. Pick one: the case lifts, the
 * disc slides out of the top and spins (faster while its mood is playing), and the card underneath
 * says what the game taught her about design. "Play its mood" puts a matching song on the player.
 */
export function CdShelf() {
  const [sel, setSel] = useState(games[0].slug);
  const playingGame = useStore(player, (s) => (s.playing ? s.game : null));
  const game = games.find((g) => g.slug === sel) ?? games[0];
  const mood = tracks.find((t) => t.id === game.mood);
  const isPlaying = playingGame === game.slug;

  return (
    <div className="cdshelf" data-xr="CdShelf · CSS jewel cases, a spinning disc and the music engine">
      <ul className="cdshelf__row" aria-label="Games on the shelf">
        {games.map((g, i) => (
          <li key={g.slug} style={{ "--i": i } as CSSProperties}>
            <button
              type="button"
              className="cdcase"
              aria-pressed={sel === g.slug}
              data-spin={playingGame === g.slug ? "fast" : sel === g.slug ? "slow" : undefined}
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
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="pill"
            data-variant="magenta"
            data-sfx="off"
            onClick={() => (isPlaying ? toggle() : mood && playMood(mood.id, game.slug))}
          >
            {isPlaying ? "❚❚ Pause its mood" : "▶ Play its mood"}
          </button>
          {mood && <span className="text-14 text-muted">“{mood.title}” on the player</span>}
        </div>
      </article>
    </div>
  );
}
