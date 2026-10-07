import type { ReactNode } from "react";
import { SkyBackdrop } from "../world/SkyBackdrop";
import { HeroScreens } from "./HeroScreens";
import { MociBubble } from "./MociBubble";

/**
 * The hero: one object in a window onto the summer sky, with room to breathe. The AT-26 sits in the
 * middle with Moci in a bubble on its corner; the page around the window stays white and everything
 * else waits further down.
 */
export function HeroStage({ children }: { children: ReactNode }) {
  return (
    <section
      id="hero"
      aria-labelledby="hero-name"
      data-tilt-zone
      className="hero-stage relative flex min-h-[100svh] flex-col items-center justify-center px-4 pt-28 pb-14 sm:px-6 md:pt-32"
      data-xr="HeroStage · one glass device on the sky, tilting toward the pointer"
    >
      <SkyBackdrop />
      <HeroScreens />
      <div className="relative w-full max-w-[600px]" data-tilt>
        {children}
        <MociBubble />
      </div>
      <a href="#work" className="scroll-cue mt-14 md:mt-16">
        <span>Scroll to look around</span>
        <span aria-hidden="true" className="scroll-cue__line" />
      </a>
    </section>
  );
}
