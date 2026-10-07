import Link from "next/link";
import { labItems } from "@/content/lab";

/** Home: one line about the toys, and the door to the lab where they all live. */
export function LabTeaser() {
  return (
    <section aria-labelledby="lab-teaser-title" className="container-page pb-[clamp(72px,9vw,128px)]">
      <div className="widget flex flex-col items-start gap-5 p-7 md:flex-row md:items-center md:justify-between md:p-9">
        <div>
          <p className="type-eyebrow">Off the clock</p>
          <h2 id="lab-teaser-title" className="mt-3 text-32 leading-tight font-bold tracking-[-0.03em]">
            {labItems.length} experiments, a terminal and a game.
          </h2>
          <p className="mt-2 max-w-[56ch] text-muted">Where I try ideas before they&apos;re useful: WebGL toys, AI experiments, a shell for this site, and Snake where you play the language model.</p>
        </div>
        <Link href="/lab" className="pill shrink-0" data-size="lg">
          Open the lab
        </Link>
      </div>
    </section>
  );
}
