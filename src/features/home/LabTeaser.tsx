import Link from "next/link";
import { MOCI_CASES } from "@/features/agent/evals";

/** Home: the site is a product too. A door to how it's built (Moci and its eval), and to the lab. */
export function LabTeaser() {
  return (
    <section aria-labelledby="lab-teaser-title" className="container-page pb-[clamp(72px,9vw,128px)]">
      <div className="widget flex flex-col items-start gap-5 p-7 md:flex-row md:items-center md:justify-between md:p-9">
        <div>
          <p className="type-eyebrow">This site</p>
          <h2 id="lab-teaser-title" className="mt-3 text-32 leading-tight font-bold tracking-[-0.03em]">
            The site is a product too.
          </h2>
          <p className="mt-2 max-w-[60ch] text-muted">
            Moci, its agent, is Claude with tool use when the site has an API key, and a small retrieval brain that cites its sources when it doesn&apos;t. The server checks every tool call
            before it touches your screen. Read how it&apos;s built and run the offline brain&apos;s {MOCI_CASES.length}-question eval in your browser.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Link href="/colophon" className="pill">
            How it&apos;s built
          </Link>
          <Link href="/lab" className="link-arrow text-16" data-tour="lab-tools">
            The lab
          </Link>
        </div>
      </div>
    </section>
  );
}
