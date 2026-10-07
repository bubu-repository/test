import type { Metadata } from "next";
import { pageMeta } from "@/lib/meta";
import { PageTransition } from "@/components/PageTransition";
import { PageHeader } from "@/components/PageHeader";
import { labItems } from "@/content/lab";
import { Gumball } from "@/features/lab/Gumball";
import { FeatureGrid, SubdomainGrid } from "@/features/lab/LabGrid";

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
        title={
          <>
            Toys, tools and <span className="sticker-text">experiments</span>.
          </>
        }
        lead={`${subs} live on their own subdomains. ${site} more are built into this site, and every one of them runs from a button on this page.`}
      >
        <section id="gacha" aria-labelledby="gacha-title" className="mt-14 scroll-mt-24 text-left">
          <h2 id="gacha-title" className="sr-only">
            Gumball machine
          </h2>
          <Gumball />
        </section>
      </PageHeader>

      <div className="section-y" />

      <section aria-labelledby="subdomains-title" className="container-page pb-[clamp(96px,13vw,176px)]">
        <p className="type-eyebrow">*.adelia.cc</p>
        <h2 id="subdomains-title" className="type-title mt-3">
          On their own subdomains
        </h2>
        <p className="mt-4 max-w-[52ch] text-muted">Standalone pages, no framework, each deployed on its own. Load a preview here or open the real thing.</p>
        <div className="mt-12">
          <SubdomainGrid />
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
