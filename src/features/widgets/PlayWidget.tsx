import Link from "next/link";
import type { CSSProperties } from "react";
import { PixelMoci } from "../objects/PixelMoci";
import { WidgetTitle } from "./widgets";

/**
 * Take a break: a pocket console with the game's title screen, a snake of tokens crawling across
 * it. Press it to play Context Window on its own page. The 8-bit Moci walks the bottom edge.
 */
export function PlayWidget() {
  return (
    <div className="playwidget" data-tour="play">
      <WidgetTitle aside={<span className="chip" data-tone="mint">Mini-game</span>}>Take a break</WidgetTitle>
      <Link href="/play" className="playwidget__console" aria-label="Play Context Window: Snake, but you're an LLM" data-cursor="Play">
        <span className="playwidget__dpad" aria-hidden="true" />
        <span className="playwidget__screen" aria-hidden="true">
          <span className="playwidget__title">Context Window</span>
          <span className="playwidget__snake">
            {Array.from({ length: 5 }, (_, i) => (
              <i key={i} style={{ "--i": i } as CSSProperties} />
            ))}
          </span>
          <span className="playwidget__token">◆</span>
          <span className="playwidget__start">▶ Start</span>
        </span>
        <span className="playwidget__buttons" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
      </Link>
      <p className="mt-4 text-14 leading-snug text-muted">Snake, but you&apos;re an LLM. Eat tokens, summarise before you overflow.</p>
      <div className="psp-ground playwidget__ground">
        <PixelMoci />
      </div>
    </div>
  );
}
