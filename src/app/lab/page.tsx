import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import { PageTransition } from "@/components/PageTransition";
import { PageHeader } from "@/components/PageHeader";
import { labItems } from "@/content/lab";
import { JdMatcher } from "@/features/about/JdMatcher";
import { ModelCard } from "@/features/about/ModelCard";
import { projects } from "@/content/projects";
import { BoosterPacks } from "@/features/work/BoosterPack";
import { Gumball } from "@/features/lab/Gumball";
import { FeatureGrid, SubdomainGrid } from "@/features/lab/LabGrid";
import { TerminalSection } from "@/features/home/TerminalSection";
import { WidgetBoard } from "@/features/widgets/WidgetBoard";

const subs = labItems.filter((l) => l.where === "subdomain").length;
const site = labItems.filter((l) => l.where === "site").length;

export const metadata: Metadata = pageMeta({
  title: "Lab",
  description: `Experiments by Adelia Tiara: ${subs} on their own adelia.cc subdomains (WebGL, AI and type toys) and ${site} interactive features built into this site.`,
  path: "/lab",
});

export default function LabPage() {
  return (
    <PageTransition>
      <PageHeader
        id="lab-title"
        label="The lab"
        title="Experiments, tools and toys."
        lead={`Where I try ideas before they're useful: ${subs} experiments on their own subdomains, two tools for hiring teams, and, further down, the toys.`}
      />

      <section aria-labelledby="subdomains-title" className="container-page pt-12 pb-[clamp(96px,13vw,176px)] md:pt-16">
        <p className="type-eyebrow">*.adelia.cc</p>
        <h2 id="subdomains-title" className="type-title mt-3">
          Experiments on their own subdomains
        </h2>
        <p className="mt-4 max-w-[52ch] text-muted">Standalone pages, no framework, each deployed on its own. Load a preview here or open the real thing.</p>
        <div className="mt-12">
          <SubdomainGrid />
        </div>
      </section>

      <section id="match" aria-labelledby="match-title" className="container-page scroll-mt-24 pb-[clamp(96px,13vw,176px)]">
        <p className="type-eyebrow">For hiring teams</p>
        <h2 id="match-title" className="type-title mt-3">
          Does she fit your role?
        </h2>
        <p className="mt-4 mb-10 max-w-[56ch] text-muted">Paste a job description. The matcher runs in your browser, shows the evidence for every match, and is honest about the gaps.</p>
        <JdMatcher />
      </section>

      <section id="model-card" aria-labelledby="model-title" className="container-page scroll-mt-24 pb-[clamp(96px,13vw,176px)]">
        <p className="type-eyebrow">If I were a model</p>
        <h2 id="model-title" className="type-title mt-3">
          Model card
        </h2>
        <div className="mt-10">
          <ModelCard />
        </div>
      </section>

      <section id="toys" aria-labelledby="toys-title" className="container-page scroll-mt-24 pb-10 text-center">
        <p className="type-eyebrow">Off the clock</p>
        <h2 id="toys-title" className="type-title mt-3">
          The toys
        </h2>
        <p className="mx-auto mt-4 max-w-[52ch] text-muted">Things I built for fun and to practise motion, physics and sound. Nothing here is needed to judge the work.</p>
        <section id="gacha" aria-labelledby="gacha-title" className="mt-12 scroll-mt-24 text-left">
          <h3 id="gacha-title" className="sr-only">
            Gumball machine
          </h3>
          <Gumball />
        </section>
      </section>

      <WidgetBoard />

      <TerminalSection />

      <section id="packs" aria-labelledby="packs-title" className="container-page scroll-mt-24 pb-[clamp(96px,13vw,176px)] text-center">
        <p className="type-eyebrow">Collector&apos;s edition</p>
        <h2 id="packs-title" className="type-title mt-3">
          The work, as trading cards
        </h2>
        <p className="mx-auto mt-4 max-w-[52ch] text-muted">Each product sealed in a booster pack. Tear one open and it flips over as a holographic card that opens the case study.</p>
        <div className="mt-14">
          <BoosterPacks projects={projects.filter((p) => !p.company)} />
        </div>
      </section>

      <section aria-labelledby="features-title" className="container-page pb-[clamp(96px,13vw,176px)]">
        <p className="type-eyebrow">On adelia.cc</p>
        <h2 id="features-title" className="type-title mt-3">
          Built into this site
        </h2>
        <p className="mt-4 mb-10 max-w-[52ch] text-muted">Everything interactive you may have bumped into, with a button that runs it right now.</p>
        <FeatureGrid />
      </section>
    </PageTransition>
  );
}
