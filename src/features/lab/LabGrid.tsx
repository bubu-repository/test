"use client";

import { useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { labItems, labPreviewPath, labUrl, type LabItem, type LabTag } from "@/content/lab";
import { dispatch } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sound";
import { labGlyph } from "./glyphs";

const subdomains = labItems.filter((l): l is Extract<LabItem, { where: "subdomain" }> => l.where === "subdomain");
const features = labItems.filter((l): l is Extract<LabItem, { where: "site" }> => l.where === "site");
const TAGS: LabTag[] = ["AI", "WebGL", "Realtime", "Game", "Physics", "Data", "Type", "Tool", "Sound"];

/** One experiment on its own subdomain. The live preview loads only when asked for. */
function SubdomainCard({ item }: { item: Extract<LabItem, { where: "subdomain" }> }) {
  const [preview, setPreview] = useState(false);
  return (
    <li id={`lab-${item.slug}`} className="widget scroll-mt-28 overflow-hidden rounded-[32px] p-2.5">
      <div className="relative aspect-[16/10] overflow-hidden rounded-[24px] bg-surface-2">
        {preview ? (
          <iframe src={labPreviewPath(item.subdomain)} title={`${item.name}, live preview`} className="absolute inset-0 h-full w-full border-0" loading="lazy" />
        ) : (
          <button type="button" onClick={() => {
              sfx.pop();
              setPreview(true);
            }} className="group absolute inset-0 grid place-items-center" aria-label={`Load a live preview of ${item.name}`} data-cursor="Preview">
            <span aria-hidden="true" className="absolute inset-0 opacity-70" style={{ background: `radial-gradient(70% 90% at 30% 20%, color-mix(in srgb, var(--${item.tone}) 26%, transparent), transparent 70%), radial-gradient(60% 80% at 80% 90%, color-mix(in srgb, var(--violet) 16%, transparent), transparent 70%)` }} />
            <span className="relative grid justify-items-center gap-4">
              <AppIcon tone={item.tone} size={88} className="transition-transform duration-300 group-hover:scale-105">
                {labGlyph(item.slug)}
              </AppIcon>
              <span className="glass rounded-pill px-3.5 py-1.5 text-14 font-semibold">▶ Live preview</span>
            </span>
          </button>
        )}
      </div>
      <div className="px-3.5 pt-5 pb-4 md:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-24 font-bold tracking-[-0.03em]">{item.name}</h3>
          <span className="font-mono text-12 text-muted">{item.subdomain}.adelia.cc</span>
        </div>
        <p className="mt-2 text-16 text-muted">{item.blurb}</p>
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Built with">
          {item.tech.map((t) => (
            <li key={t} className="chip">
              {t}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <a href={labUrl(item.subdomain)} target="_blank" rel="noopener noreferrer" className="pill" data-variant="ink" data-size="sm">
            Open it ↗<span className="sr-only"> {item.name} (opens in a new tab)</span>
          </a>
          {preview && (
            <button type="button" className="link-arrow text-14" onClick={() => setPreview(false)}>
              Close preview
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export function SubdomainGrid() {
  return (
    <ul className="grid gap-6 md:grid-cols-2" aria-label="Experiments on their own subdomains">
      {subdomains.map((item) => (
        <SubdomainCard key={item.slug} item={item} />
      ))}
    </ul>
  );
}

/** The features built into this site, filterable by tag, each with a button that runs it here. */
export function FeatureGrid() {
  const [tag, setTag] = useState<LabTag | null>(null);
  const shown = tag ? features.filter((f) => f.tags.includes(tag)) : features;

  return (
    <>
      <div role="group" aria-label="Filter by tag" className="flex flex-wrap gap-2">
        {[null, ...TAGS].map((t) => {
          const on = tag === t;
          const count = t ? features.filter((f) => f.tags.includes(t)).length : features.length;
          if (!count) return null;
          return (
            <button
              key={t ?? "all"}
              type="button"
              aria-pressed={on}
              onClick={() => {
                sfx.tick();
                setTag(t);
              }}
              className="pill"
              data-size="sm"
              data-variant={on ? "ink" : undefined}
            >
              {t ?? "Everything"} <span className={cn("tabular-nums", on ? "opacity-70" : "text-muted")}>{count}</span>
            </button>
          );
        })}
      </div>
      <p className="sr-only" aria-live="polite">
        {shown.length} features shown
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Features built into this site">
        {shown.map((item) => (
          <li key={item.slug} id={`lab-${item.slug}`} className="widget flex scroll-mt-28 flex-col p-6">
            <div className="flex items-start justify-between gap-3">
              <AppIcon tone={item.tone} size={48}>
                {labGlyph(item.slug)}
              </AppIcon>
              <span className="flex flex-wrap justify-end gap-1">
                {item.tags.map((t) => (
                  <span key={t} className="chip">
                    {t}
                  </span>
                ))}
              </span>
            </div>
            <h3 className="mt-5 text-20 font-bold tracking-[-0.02em]">{item.name}</h3>
            <p className="mt-1.5 text-14 leading-relaxed text-muted">{item.blurb}</p>
            <button type="button" className="link-arrow js-only mt-auto self-start pt-5 text-16" onClick={() => dispatch(item.action)}>
              {item.actionLabel}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
