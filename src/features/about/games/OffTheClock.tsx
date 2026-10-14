import { CdShelf } from "./CdShelf";

/** About: off the clock. The games that shaped her, on a CD shelf. (Her songs are on the DAC on her desk.) */
export function OffTheClock() {
  return (
    <section id="off-the-clock" aria-labelledby="otc-title" className="container-page scroll-mt-24 pb-[clamp(96px,13vw,176px)]">
      <p className="type-eyebrow">Off the clock</p>
      <h2 id="otc-title" className="type-title mt-2">
        The games that taught me design
      </h2>
      <p className="mt-4 max-w-[54ch] text-muted">
        Pull a disc off the shelf to see what each one taught me. The songs I code to are on the DAC up on my desk.
      </p>
      {/* CONTOH — ganti dengan data asli (games: src/content/games.ts, songs: src/content/playlist.ts) */}
      <div className="mt-12 md:mt-16">
        <CdShelf />
      </div>
    </section>
  );
}
