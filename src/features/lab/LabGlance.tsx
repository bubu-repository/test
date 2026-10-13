"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AppIcon } from "@/components/AppIcon";
import { Dialog } from "@/components/Dialog";
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon, CloseIcon } from "@/components/icons";
import { labPreviewPath, labUrl, type LabItem } from "@/content/lab";
import { sfx } from "@/lib/sound";
import { ui } from "@/lib/ui";
import { labGlyph } from "./glyphs";

export type SubdomainItem = Extract<LabItem, { where: "subdomain" }>;

/** The window's transform-origin: the centre of the card that opened it, as CSS. See glanceOrigin. */
export type GlanceOrigin = string;

/** The glance window's inset from the viewport edge; keep in sync with .site-dialog[data-placement="glance"]. */
const GLANCE_MAX_WIDTH = 1400;

/**
 * Where the window grows from: the centre of the card that opened it, measured against where the
 * window will sit (centred, inset from the viewport edge). Call it from the click, with the card's rect.
 */
export function glanceOrigin(card: DOMRect): GlanceOrigin {
  const inset = window.innerWidth < 640 ? 8 : 16;
  const width = Math.min(GLANCE_MAX_WIDTH, window.innerWidth - inset * 2);
  const left = (window.innerWidth - width) / 2;
  return `${Math.round(card.left + card.width / 2 - left)}px ${Math.round(card.top + card.height / 2 - inset)}px`;
}

/**
 * Glance: the experiment opens in a window over the page, nearly as big as the viewport, growing
 * out of the card you pressed (after Zen Browser's glance). Esc or the backdrop closes it, the
 * arrow keys (or the buttons) move to the next experiment, and the real thing is one key away.
 */
export function LabGlance({ items, index, origin, onClose, onChange }: { items: SubdomainItem[]; index: number | null; origin: GlanceOrigin | null; onClose: () => void; onChange: (index: number) => void }) {
  const item = index === null ? null : items[index];
  const open = item !== null;
  // Which experiment's frame has finished loading; a new experiment starts out unloaded.
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);
  const loaded = loadedSlug === item?.slug;
  const closeRef = useRef<HTMLButtonElement>(null);

  // Single-key shortcuts stay quiet while the glance is open; focus starts on Close.
  useEffect(() => {
    if (!open) return;
    ui.set({ overlay: "glance" });
    const raf = requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      cancelAnimationFrame(raf);
      if (ui.get().overlay === "glance") ui.set({ overlay: null });
    };
  }, [open]);

  const step = (delta: number) => {
    if (index === null) return;
    sfx.tick();
    onChange((index + delta + items.length) % items.length);
  };

  return (
    <Dialog open={open} onClose={onClose} labelledBy="glance-title" placement="glance">
      {item && (
        <div
          className="glance"
          style={{ transformOrigin: origin ?? "50% 50%" } as CSSProperties}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              step(-1);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              step(1);
            }
          }}
          data-xr="LabGlance · the experiment in a window over the page"
        >
          <div className="glance__bar">
            <AppIcon tone={item.tone} size={32} className="shrink-0">
              {labGlyph(item.slug)}
            </AppIcon>
            <div className="min-w-0 flex-1">
              <h2 id="glance-title" className="truncate text-16 leading-tight font-bold tracking-[-0.01em]">
                {item.name}
              </h2>
              <p className="truncate font-mono text-12 text-muted">{item.subdomain}.adelia.cc</p>
            </div>

            <div className="glance__nav" role="group" aria-label="Other experiments">
              <button type="button" className="pill" data-variant="ghost" data-shape="icon" data-size="sm" onClick={() => step(-1)} aria-label="Previous experiment">
                <ArrowLeftIcon width={18} height={18} />
              </button>
              <span className="font-mono text-12 text-muted tabular-nums" aria-live="polite">
                {index! + 1} / {items.length}
              </span>
              <button type="button" className="pill" data-variant="ghost" data-shape="icon" data-size="sm" onClick={() => step(1)} aria-label="Next experiment">
                <ArrowRightIcon width={18} height={18} />
              </button>
            </div>

            <a href={labUrl(item.subdomain)} target="_blank" rel="noopener noreferrer" className="pill" data-variant="ink" data-size="sm">
              <span className="max-sm:sr-only">Open in new tab</span>
              <ArrowUpRightIcon width={16} height={16} />
            </a>
            <button ref={closeRef} type="button" className="pill" data-variant="ghost" data-shape="icon" data-size="sm" onClick={onClose} aria-label="Close preview">
              <CloseIcon width={18} height={18} />
            </button>
          </div>

          <div className="glance__stage">
            {!loaded && (
              <div className="glance__loading" aria-hidden="true">
                <span className="glance__shimmer" />
                <p className="font-mono text-12 text-muted">Loading {item.name}…</p>
              </div>
            )}
            <iframe
              key={item.slug}
              src={labPreviewPath(item.subdomain)}
              title={`${item.name}, live`}
              className="glance__frame"
              data-loaded={loaded}
              allow="microphone"
              onLoad={() => setLoadedSlug(item.slug)}
            />
          </div>
        </div>
      )}
    </Dialog>
  );
}
