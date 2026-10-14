import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import { PageTransition } from "@/components/PageTransition";
import { PageHeader } from "@/components/PageHeader";
import { JdMatcher } from "@/features/about/JdMatcher";
import { ModelCard } from "@/features/about/ModelCard";
import { DailyPack } from "@/features/pack/DailyPack";
import { Studio } from "@/features/studio/Studio";
import { WidgetBoard } from "@/features/widgets/WidgetBoard";

export const metadata: Metadata = pageMeta({
  title: "Lab",
  description:
    "Make something in the Studio: your words or a photo in felt, cross-stitch, jelly, chrome, acrylic and more, laid out as a card, a photo strip, ID photos, a trading card or a sticker. Then open today's booster pack, and check a job description against Adelia's work.",
  path: "/lab",
});

export default function LabPage() {
  return (
    <PageTransition>
      <PageHeader
        id="lab-title"
        label="The lab"
        title="Make something. Take a card."
        lead="A studio that turns your words or a photo into felt, jelly, chrome or a holo sticker, one booster pack a day, and two tools for hiring teams. All of it runs in your browser."
      />

      <section id="studio" aria-labelledby="studio-title" className="container-page scroll-mt-24 pt-4 pb-[clamp(96px,13vw,176px)]">
        <p className="type-eyebrow" data-tour="lab-tools">
          Studio
        </p>
        <h2 id="studio-title" className="type-title mt-3">
          Make it out of something.
        </h2>
        <p className="mt-4 mb-10 max-w-[58ch] text-muted">
          Type a word or take a photo. Pick what it&apos;s made of, lay it out as a card, a photo strip, ID photos, a trading card or a sticker, decorate it, and save it as a PNG or a
          GIF.
        </p>
        <Studio />
      </section>

      <section id="pack" aria-labelledby="pack-title" className="container-page scroll-mt-24 pb-[clamp(96px,13vw,176px)] text-center">
        <p className="type-eyebrow">Once a day</p>
        <h2 id="pack-title" className="type-title mt-3">
          Today&apos;s pack
        </h2>
        <p className="mx-auto mt-4 mb-10 max-w-[52ch] text-muted">
          Three cards: something kind, advice from the weather in Bekasi right now, and one more. About one pack in eight hides a holo rare of one of my products.
        </p>
        <DailyPack />
      </section>

      <WidgetBoard />

      <section id="match" aria-labelledby="match-title" className="container-page scroll-mt-24 pb-[clamp(96px,13vw,176px)]">
        <p className="type-eyebrow">For hiring teams</p>
        <h2 id="match-title" className="type-title mt-3">
          Does she fit your role?
        </h2>
        <p className="mt-4 mb-10 max-w-[56ch] text-muted">Paste a job description. The matcher runs in your browser, shows the evidence for every match, and is honest about the gaps.</p>
        <JdMatcher />
      </section>

      <section id="model-card" aria-labelledby="model-title" className="container-page scroll-mt-24 pb-[clamp(72px,9vw,128px)]">
        <p className="type-eyebrow">If I were a model</p>
        <h2 id="model-title" className="type-title mt-3">
          Model card
        </h2>
        <div className="mt-10">
          <ModelCard />
        </div>
      </section>
    </PageTransition>
  );
}
