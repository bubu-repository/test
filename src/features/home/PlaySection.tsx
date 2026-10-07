import Link from "next/link";
import { PixelMoci } from "../objects/PixelMoci";
import { ContextWindow } from "../play/ContextWindow";

/** Home: a break between the serious bits. The game runs on a PSP you can pick up and play. */
export function PlaySection() {
  return (
    <section id="play" aria-labelledby="play-title" className="container-page section-y scroll-mt-16" data-xr="PlaySection · a PSP with the game on it">
      <div className="mx-auto max-w-[44rem] text-center">
        <p className="type-eyebrow">Take a break</p>
        <h2 id="play-title" className="type-display mt-3">
          Snake, but you&apos;re an <span className="sticker-text">LLM</span>.
        </h2>
        <p className="type-lead mx-auto mt-5 max-w-[42ch] text-muted">Eat tokens, summarise before your context overflows, and don&apos;t hallucinate into yourself. Arrow keys or the D-pad.</p>
      </div>
      <div className="mx-auto mt-14 max-w-[940px] md:mt-20">
        <ContextWindow variant="handheld" />
        <div className="psp-ground mt-12">
          <PixelMoci />
        </div>
        <p className="mt-6 text-center">
          <Link href="/play" className="link-arrow">
            Play it on its own page
          </Link>
        </p>
      </div>
    </section>
  );
}
