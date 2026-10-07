import type { ReactNode } from "react";
import { MociAvatar } from "@/components/MociAvatar";

/**
 * The hero: one object on white with room to breathe. The AT-26 sits in the middle with Moci
 * stuck on its corner like a laptop sticker; everything else waits further down the page.
 */
export function HeroStage({ children }: { children: ReactNode }) {
  return (
    <section id="hero" aria-labelledby="hero-name" className="hero-stage relative flex min-h-[100svh] flex-col items-center justify-center px-4 pt-28 pb-14 sm:px-6 md:pt-32" data-xr="HeroStage · one device on white">
      <div className="relative w-full max-w-[600px]">
        {children}
        <span className="sticker absolute -top-7 -right-7 hidden size-[84px] rotate-[8deg] place-items-center rounded-full bg-accent-soft sm:grid" title="Moci, my agent. Ask it anything." aria-hidden="true">
          <MociAvatar size={46} />
        </span>
      </div>
      <a href="#work" className="scroll-cue mt-14 md:mt-16">
        <span>Scroll to look around</span>
        <span aria-hidden="true" className="scroll-cue__line" />
      </a>
    </section>
  );
}
