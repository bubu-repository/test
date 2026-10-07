import Link from "next/link";
import { DownloadIcon } from "@/components/icons";
import { bio, principles } from "@/content/profile";

/** Home: how she works, in four rules, then the short background and the CV. */
export function HowIWork() {
  return (
    <section id="how" aria-labelledby="how-title" className="container-page section-y scroll-mt-16" data-xr="HowIWork · principles from content/profile.ts">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        <div>
          <p className="type-eyebrow">How I work</p>
          <h2 id="how-title" className="type-display mt-3">
            Four rules I design by.
          </h2>
          <p className="mt-6 max-w-[48ch] text-18 leading-relaxed text-muted">{bio.team}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/about" className="pill" data-variant="magenta">
              More about me
            </Link>
            <a href="/cv.pdf" download="Adelia-Tiara-CV.pdf" className="pill">
              <DownloadIcon width={18} height={18} /> CV (PDF)
            </a>
            <Link href="/styleguide" className="link-arrow ml-1 text-16">
              The design system behind this site
            </Link>
          </div>
        </div>
        {/* CONTOH — ganti dengan data asli */}
        <ol className="grid gap-3 sm:grid-cols-2">
          {principles.map((p, i) => (
            <li key={p.title} className="widget p-6">
              <p className="font-mono text-12 font-semibold text-accent-ink">0{i + 1}</p>
              <h3 className="mt-3 text-24 leading-tight font-bold tracking-[-0.025em]">{p.title}</h3>
              <p className="mt-2 text-16 text-muted">{p.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
