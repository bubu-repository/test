import { CdShelf } from "./CdShelf";
import { MusicPlayer } from "./MusicPlayer";

/** About: off the clock. The songs she codes to on an MP3 player, and the games that shaped her on a CD shelf. */
export function OffTheClock() {
  return (
    <section id="off-the-clock" aria-labelledby="otc-title" className="container-page scroll-mt-24 pb-[clamp(96px,13vw,176px)]">
      <p className="type-eyebrow">Off the clock</p>
      <h2 id="otc-title" className="type-title mt-3">
        What&apos;s on <span className="sticker-text">repeat</span>
      </h2>
      <p className="mt-4 max-w-[54ch] text-muted">
        The songs I code to and the games that taught me the most about design. Turn the wheel, pull a disc off the shelf, or drop your own song on the player.
      </p>
      {/* CONTOH — ganti dengan data asli (games: src/content/games.ts, songs: features/about/music/tracks.ts) */}
      <div className="mt-12 grid items-start gap-12 md:mt-16 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-16">
        <div className="flex justify-center lg:sticky lg:top-28">
          <MusicPlayer />
        </div>
        <CdShelf />
      </div>
    </section>
  );
}
