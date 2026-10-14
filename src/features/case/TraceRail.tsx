"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { collect } from "@/lib/stickers";

export type TraceStep = { id: string; label: string };

/**
 * The case study's contents: which section you're reading, how far along you are, and how many
 * minutes are left at a calm reading pace. Also counts the visit for the sticker.
 */
export function TraceRail({ steps, slug }: { steps: TraceStep[]; slug: string }) {
  const [active, setActive] = useState(steps[0]?.id);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    collect("cases", slug, 4, "collector");
    const article = document.getElementById("case-body");
    const words = article?.innerText.split(/\s+/).length ?? 0;
    const sections = steps.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    sections.forEach((s) => io.observe(s));

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!article) return;
        const r = article.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (window.innerHeight * 0.5 - r.top) / r.height));
        setProgress(p);
        setTotal(Math.max(1, Math.round(words / 230)));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [steps, slug]);

  return (
    <>
      {/* Phones: a thin progress bar under the nav */}
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[55] h-1 lg:hidden">
        <div className="h-full origin-left bg-accent" style={{ transform: `scaleX(${progress})` }} />
      </div>

      <nav aria-label="Case study steps" className="sticky top-28 hidden self-start lg:block">
        <p className="type-pixel text-muted">Contents</p>
        <ol className="relative mt-4 space-y-1 border-l-2 border-dashed border-line pl-5">
          <span aria-hidden="true" className="absolute top-0 -left-[2px] w-[2px] bg-accent transition-[height] duration-300" style={{ height: `${progress * 100}%` }} />
          {steps.map((step, i) => {
            const isActive = step.id === active;
            return (
              <li key={step.id} className="relative">
                <span aria-hidden="true" className={cn("absolute top-3 -left-[27px] size-3 rounded-full border-2 border-surface transition-transform", isActive ? "scale-125 bg-accent" : "bg-line")} />
                <a
                  href={`#${step.id}`}
                  aria-current={isActive ? "step" : undefined}
                  className={cn("block rounded-sm px-2 py-1.5 transition-colors", isActive ? "bg-surface font-semibold shadow-sm" : "text-muted hover:text-ink")}
                >
                  <span className="text-14">
                    <span className="mr-2 font-mono text-12 text-muted tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    {step.label}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
        <div className="mt-6 rounded-sm bg-surface p-3 shadow-sm">
          <p className="type-pixel text-muted">Reading time</p>
          <p className="font-display text-24 font-bold tabular-nums">
            {Math.max(0, Math.round((1 - progress) * total))} min
            <span className="text-14 font-semibold text-muted"> left of {total}</span>
          </p>
        </div>
      </nav>
    </>
  );
}
