import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import { PageTransition } from "@/components/PageTransition";
import { PageHeader } from "@/components/PageHeader";
import { projects } from "@/content/projects";
import { BoosterPacks } from "@/features/work/BoosterPack";
import { WorkCards } from "@/features/work/WorkCards";

export const metadata: Metadata = pageMeta({
  title: "Work",
  description: "Three AI products designed by Adelia Tiara: Tenderlens, Catat and Lintas. Each case study shows the research, the design decisions, the rounds that failed, the shipped screens and the results.",
  path: "/work",
});

export default function WorkPage() {
  return (
    <PageTransition>
      <PageHeader
        id="work-title"
        label="Selected work · 2024–2025"
        title={
          <>
            Three AI products, designed for <span className="sticker-text">trust</span>.
          </>
        }
        lead="Each one started as somebody's messy request and shipped to real people. Every case study shows the research, the decisions, the rounds that failed and the numbers."
      />

      <section aria-label="Case studies" className="container-page pb-[clamp(96px,13vw,176px)]">
        {/* CONTOH — ganti dengan data asli */}
        <WorkCards projects={projects} />
      </section>

      <section aria-labelledby="packs-title" className="container-page pb-[clamp(96px,13vw,176px)] text-center">
        <p className="type-eyebrow">Collector&apos;s edition</p>
        <h2 id="packs-title" className="type-title mt-3">
          The same three, as trading cards
        </h2>
        <p className="mx-auto mt-4 max-w-[52ch] text-muted">For fun: each product sealed in a booster pack. Tear one open and it flips over as a holographic card that opens the case study.</p>
        <div className="mt-14">
          <BoosterPacks projects={projects} />
        </div>
      </section>
    </PageTransition>
  );
}
