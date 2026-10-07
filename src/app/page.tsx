import { LiveClock } from "@/components/LiveClock";
import { identity } from "@/content/profile";
import { HeroAsk, HeroPaths } from "@/features/hero/HeroActions";
import { HeroName } from "@/features/hero/HeroName";
import { ResampleSentence } from "@/features/hero/ResampleSentence";
import { WorkTeaser } from "@/features/home/WorkTeaser";
import { WidgetBoard } from "@/features/widgets/WidgetBoard";

export default function HomePage() {
  return (
    <>
      <section
        id="hero"
        aria-labelledby="hero-name"
        className="container-page flex min-h-[94svh] flex-col items-center justify-center pt-32 pb-20 text-center md:pt-36"
        data-xr="Hero · type, one ask box, two ways in"
      >
        <p className="hero-rise chip min-h-8 gap-2 px-3.5 text-14">
          <span className="live-dot" aria-hidden="true" />
          Available for work
          <span className="text-muted">
            · <LiveClock zone={identity.timeZone} className="tabular-nums" /> in {identity.city}
          </span>
        </p>

        <p className="type-eyebrow hero-rise mt-10" style={{ ["--d" as string]: "60ms" }}>
          {identity.role}
        </p>
        <div id="hero-name" className="mt-3">
          <HeroName />
        </div>

        <div className="hero-rise mt-6 max-w-[44ch]" style={{ ["--d" as string]: "380ms" }}>
          <ResampleSentence controls={false} />
        </div>

        <div className="hero-rise mt-12 w-full max-w-[720px]" style={{ ["--d" as string]: "500ms" }}>
          <HeroAsk />
        </div>

        <div className="hero-rise mt-10 w-full max-w-[720px]" style={{ ["--d" as string]: "620ms" }}>
          <HeroPaths />
        </div>
      </section>

      <WorkTeaser />
      <WidgetBoard />
    </>
  );
}
